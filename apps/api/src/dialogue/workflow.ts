import { Annotation, END, START, StateGraph, type LangGraphRunnableConfig } from "@langchain/langgraph";

import type {
	DialogueSpeaker,
	DialogueWorkflowDeps,
	DialogueWorkflowInput,
	GraphEvent,
	NormalizedTranscript,
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

const DialogueState = Annotation.Root({
	source: Annotation<DialogueWorkflowInput["source"]>,
	targetLanguage: Annotation<"zh-CN" | undefined>,
	transcript: Annotation<NormalizedTranscript | undefined>,
	title: Annotation<string | undefined>,
	speakers: Annotation<DialogueSpeaker[] | undefined>,
	chunks: Annotation<TranscriptChunk[] | undefined>,
});

type DialogueStateValue = typeof DialogueState.State;
type DialogueStateUpdate = Partial<DialogueStateValue>;

export async function* runDialogueWorkflow(
	input: DialogueWorkflowInput,
	deps: DialogueWorkflowDeps,
): AsyncIterable<GraphEvent> {
	const graph = createDialogueGraph(deps);
	const stream = await graph.stream(input, { streamMode: "custom" });

	for await (const event of stream) {
		yield event as GraphEvent;
	}
}

function createDialogueGraph(deps: DialogueWorkflowDeps) {
	return new StateGraph(DialogueState)
		.addNode("fetchSource", async (state): Promise<DialogueStateUpdate> => {
			const transcript = await fetchSource(state.source);
			return { transcript };
		})
		.addNode(
			"generateTitle",
			async (
				state: DialogueStateValue,
				config: LangGraphRunnableConfig,
			): Promise<DialogueStateUpdate> => {
				if (!state.transcript) {
					throw new Error("Transcript is required before title generation.");
				}
				emit(config, { type: "status.changed", status: "awaitingTitle" });
				const title = await generateTitle(deps.model, state.transcript);
				emit(config, { type: "title.generated", title });
				return { title };
			},
		)
		.addNode(
			"identifySpeakers",
			async (
				state: DialogueStateValue,
				config: LangGraphRunnableConfig,
			): Promise<DialogueStateUpdate> => {
				if (!state.transcript) {
					throw new Error("Transcript is required before speaker identification.");
				}
				const speakers = await identifySpeakers(deps.model, state.transcript);
				emit(config, { type: "speakers.generated", speakers });
				return { speakers };
			},
		)
		.addNode("chunkTranscript", async (state): Promise<DialogueStateUpdate> => {
			if (!state.transcript) {
				throw new Error("Transcript is required before chunking.");
			}
			const chunks = await chunkTranscript(deps.model, state.transcript);
			return { chunks };
		})
		.addNode(
			"streamSections",
			async (
				state: DialogueStateValue,
				config: LangGraphRunnableConfig,
			): Promise<DialogueStateUpdate> => {
				if (!state.chunks || !state.speakers) {
					throw new Error("Chunks and speakers are required before section streaming.");
				}

				emit(config, { type: "status.changed", status: "streamingDialogue" });
				for (const chunk of state.chunks) {
					await streamChunkWithRetry({
						chunk,
						speakers: state.speakers,
						deps,
						config,
					});
				}
				emit(config, { type: "run.completed" });
				return {};
			},
		)
		.addEdge(START, "fetchSource")
		.addEdge("fetchSource", "generateTitle")
		.addEdge("generateTitle", "identifySpeakers")
		.addEdge("identifySpeakers", "chunkTranscript")
		.addEdge("chunkTranscript", "streamSections")
		.addEdge("streamSections", END)
		.compile();
}

async function streamChunkWithRetry(params: {
	chunk: TranscriptChunk;
	speakers: DialogueSpeaker[];
	deps: DialogueWorkflowDeps;
	config: LangGraphRunnableConfig;
}): Promise<void> {
	const maxRetries = params.deps.maxSectionRetries ?? 2;
	let retryReason: string | undefined;

	for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
		if (attempt > 0) {
			emit(params.config, {
				type: "section.reset",
				sectionId: `section-${params.chunk.chunkIndex}`,
			});
		}

		try {
			await streamSectionDialogue({
				model: params.deps.model,
				chunk: params.chunk,
				speakers: params.speakers,
				retryReason,
				emit: (event) => emit(params.config, event),
			});
			return;
		} catch (error) {
			if (!(error instanceof SectionDialogueValidationError) || attempt >= maxRetries) {
				throw error;
			}
			retryReason = `${error.code}: ${error.message}`;
		}
	}
}

function emit(config: LangGraphRunnableConfig, event: GraphEvent): void {
	config.writer?.(event);
}
