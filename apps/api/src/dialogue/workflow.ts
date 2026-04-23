import type {
	DialogueSpeaker,
	DialogueWorkflowDeps,
	DialogueWorkflowInput,
	GraphEvent,
	TranscriptChunk,
} from "./types";
import { chunkTranscript } from "./nodes/chunk-transcript";
import { fetchSource } from "./nodes/fetch-source";
import { generateTitle } from "./nodes/generate-title";
import { identifySpeakers } from "./nodes/identify-speakers";
import {
	SectionDialogueValidationError,
	streamSectionDialogue,
} from "./nodes/stream-section-dialogue";

type TaskResult<T> = { ok: true; value: T } | { ok: false; error: unknown };

export async function* runDialogueWorkflow(
	input: DialogueWorkflowInput,
	deps: DialogueWorkflowDeps,
): AsyncIterable<GraphEvent> {
	const queue = new AsyncEventQueue<GraphEvent>();

	void runDialogueWorkflowTasks(input, deps, (event) => queue.push(event)).then(
		() => queue.close(),
		(error) => queue.fail(error),
	);

	for await (const event of queue) {
		yield event;
	}
}

async function runDialogueWorkflowTasks(
	input: DialogueWorkflowInput,
	deps: DialogueWorkflowDeps,
	emit: (event: GraphEvent) => void,
): Promise<void> {
	const transcript = await fetchSource(input.source);
	emit({ type: "status.changed", status: "awaitingTitle" });

	const titleTask = captureTask(
		(async () => {
			const title = await generateTitle(deps.model, transcript);
			emit({ type: "title.generated", title });
			return title;
		})(),
	);

	const speakersTask = (async () => {
		const speakers = await identifySpeakers(deps.model, transcript);
		emit({ type: "speakers.generated", speakers });
		return speakers;
	})();
	const chunksTask = chunkTranscript(deps.model, transcript);

	const [speakers, chunks] = await Promise.all([speakersTask, chunksTask]);

	emit({ type: "status.changed", status: "streamingDialogue" });
	for (const chunk of chunks) {
		await streamChunkWithRetry({
			chunk,
			speakers,
			deps,
			emit,
		});
	}

	const titleResult = await titleTask;
	if (!titleResult.ok) {
		throw titleResult.error;
	}

	emit({ type: "run.completed" });
}

async function streamChunkWithRetry(params: {
	chunk: TranscriptChunk;
	speakers: DialogueSpeaker[];
	deps: DialogueWorkflowDeps;
	emit: (event: GraphEvent) => void;
}): Promise<void> {
	const maxRetries = params.deps.maxSectionRetries ?? 2;
	let retryReason: string | undefined;

	for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
		try {
			await streamSectionDialogue({
				model: params.deps.model,
				chunk: params.chunk,
				speakers: params.speakers,
				retryReason,
				emit: params.emit,
			});
			return;
		} catch (error) {
			if (!(error instanceof SectionDialogueValidationError)) {
				throw error;
			}

			params.emit({
				type: "section.reset",
				sectionId: `section-${params.chunk.chunkIndex}`,
			});

			if (attempt >= maxRetries) {
				throw error;
			}

			retryReason = `${error.code}: ${error.message}`;
		}
	}
}

async function captureTask<T>(task: Promise<T>): Promise<TaskResult<T>> {
	try {
		return { ok: true, value: await task };
	} catch (error) {
		return { ok: false, error };
	}
}

class AsyncEventQueue<T> implements AsyncIterable<T>, AsyncIterator<T> {
	private readonly values: T[] = [];
	private readonly waiters: Array<{
		resolve: (result: IteratorResult<T>) => void;
		reject: (error: unknown) => void;
	}> = [];
	private closed = false;
	private error: unknown;

	push(value: T): void {
		if (this.closed) {
			return;
		}

		const waiter = this.waiters.shift();
		if (waiter) {
			waiter.resolve({ value, done: false });
			return;
		}

		this.values.push(value);
	}

	close(): void {
		if (this.closed) {
			return;
		}

		this.closed = true;
		for (const waiter of this.waiters.splice(0)) {
			waiter.resolve({ value: undefined, done: true });
		}
	}

	fail(error: unknown): void {
		if (this.closed) {
			return;
		}

		this.error = error;
		this.closed = true;
		for (const waiter of this.waiters.splice(0)) {
			waiter.reject(error);
		}
	}

	next(): Promise<IteratorResult<T>> {
		const value = this.values.shift();
		if (value !== undefined) {
			return Promise.resolve({ value, done: false });
		}

		if (this.error) {
			return Promise.reject(this.error);
		}

		if (this.closed) {
			return Promise.resolve({ value: undefined, done: true });
		}

		return new Promise((resolve, reject) => {
			this.waiters.push({ resolve, reject });
		});
	}

	[Symbol.asyncIterator](): AsyncIterator<T> {
		return this;
	}
}
