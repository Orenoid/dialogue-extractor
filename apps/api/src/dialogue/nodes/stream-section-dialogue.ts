import { z } from "zod";

import type {
	DialogueModel,
	DialogueSpeaker,
	GraphEvent,
	TranscriptChunk,
} from "../types";
import { modelOutputToText } from "./model-utils";

type ValidationErrorCode =
	| "structured_output_unavailable"
	| "invalid_structure"
	| "empty_heading"
	| "unknown_speaker"
	| "empty_turn"
	| "too_many_subsections"
	| "too_many_turns"
	| "incomplete_section";

export class SectionDialogueValidationError extends Error {
	readonly code: ValidationErrorCode;
	readonly retryable = true;

	constructor(code: ValidationErrorCode, message: string) {
		super(message);
		this.name = "SectionDialogueValidationError";
		this.code = code;
	}
}

const SectionPlanSchema = z.object({
	heading: z.string().min(1),
	subsections: z
		.array(
			z.object({
				heading: z.string().min(1),
				turns: z
					.array(
						z.object({
							speakerId: z.string().min(1),
							intent: z.string().min(1),
						}),
					)
					.min(2)
					.max(4),
			}),
		)
		.min(1)
		.max(4),
});

type SectionPlan = z.infer<typeof SectionPlanSchema>;
type TurnOutput = { speakerId: string; text: string };

interface StructuredModel<T extends Record<string, unknown>> {
	invoke(input: string): Promise<T>;
}

interface StructuredOutputModel extends DialogueModel {
	withStructuredOutput?<T extends Record<string, unknown>>(
		schema: unknown,
		config?: { name?: string; method?: "jsonSchema"; strict?: boolean },
	): StructuredModel<T>;
}

type RequiredStructuredOutputModel = DialogueModel & {
	withStructuredOutput<T extends Record<string, unknown>>(
		schema: unknown,
		config?: { name?: string; method?: "jsonSchema"; strict?: boolean },
	): StructuredModel<T>;
};

export async function streamSectionDialogue(params: {
	model: DialogueModel;
	chunk: TranscriptChunk;
	speakers: DialogueSpeaker[];
	retryReason?: string;
	emit: (event: GraphEvent) => void;
}): Promise<void> {
	const structuredModel = params.model as StructuredOutputModel;
	if (!structuredModel.withStructuredOutput) {
		throw new SectionDialogueValidationError(
			"structured_output_unavailable",
			"Dialogue model must support withStructuredOutput for section generation.",
		);
	}
	const model = structuredModel as RequiredStructuredOutputModel;

	const speakerIds = new Set(params.speakers.map((speaker) => speaker.id));
	const sectionId = `section-${params.chunk.chunkIndex}`;
	const plan = await generateSectionPlan(model, params);
	validateSectionPlan(plan, speakerIds);

	params.emit({
		type: "section.started",
		sectionId,
		chunkIndex: params.chunk.chunkIndex,
		heading: plan.heading.trim(),
	});

	for (const [subsectionIndex, subsection] of plan.subsections.entries()) {
		const subsectionId = `${sectionId}-subsection-${subsectionIndex + 1}`;
		params.emit({
			type: "subsection.started",
			subsectionId,
			sectionId,
			heading: subsection.heading.trim(),
		});

		const completedTurns: Array<{ speakerId: string; text: string }> = [];
		for (const [turnIndex, plannedTurn] of subsection.turns.entries()) {
			const turnId = `${subsectionId}-turn-${turnIndex + 1}`;
			params.emit({
				type: "turn.started",
				turnId,
				subsectionId,
				speakerId: plannedTurn.speakerId,
			});
			const text = await streamTurnText(
				model,
				{
					...params,
					sectionHeading: plan.heading,
					subsectionHeading: subsection.heading,
					plannedTurn,
					completedTurns,
				},
				(delta) => {
					params.emit({
						type: "turn.delta",
						turnId,
						delta,
					});
				},
			);
			const turn = { speakerId: plannedTurn.speakerId, text };
			validateTurn(turn, speakerIds);

			params.emit({ type: "turn.completed", turnId });
			completedTurns.push({ speakerId: turn.speakerId, text: turn.text.trim() });
		}

		params.emit({
			type: "subsection.completed",
			subsectionId,
		});
	}

	params.emit({ type: "section.completed", sectionId });
}

async function generateSectionPlan(
	model: RequiredStructuredOutputModel,
	params: {
		chunk: TranscriptChunk;
		speakers: DialogueSpeaker[];
		retryReason?: string;
	},
): Promise<SectionPlan> {
	const structured = model.withStructuredOutput<SectionPlan>(SectionPlanSchema, {
		name: "section_dialogue_plan",
		method: "jsonSchema",
		strict: true,
	});
	const raw = await structured.invoke(buildPlanPrompt(params));
	return SectionPlanSchema.parse(raw);
}

async function streamTurnText(
	model: DialogueModel,
	params: {
		chunk: TranscriptChunk;
		speakers: DialogueSpeaker[];
		sectionHeading: string;
		subsectionHeading: string;
		plannedTurn: { speakerId: string; intent: string };
		completedTurns: Array<{ speakerId: string; text: string }>;
	},
	emitDelta: (delta: string) => void,
): Promise<string> {
	const stream = await model.stream(buildTurnPrompt(params));
	let text = "";

	for await (const chunk of stream) {
		const delta = modelOutputToText(chunk);
		if (!delta) {
			continue;
		}

		text += delta;
		emitDelta(delta);
	}

	return text.trim();
}

function validateSectionPlan(plan: SectionPlan, speakerIds: Set<string>): void {
	if (plan.heading.trim().length === 0) {
		throw new SectionDialogueValidationError("empty_heading", "Section heading cannot be empty.");
	}

	if (plan.subsections.length < 1) {
		throw new SectionDialogueValidationError(
			"incomplete_section",
			"Section must contain at least one subsection.",
		);
	}

	if (plan.subsections.length > 4) {
		throw new SectionDialogueValidationError(
			"too_many_subsections",
			"Each section can contain at most four subsections.",
		);
	}

	for (const subsection of plan.subsections) {
		if (subsection.heading.trim().length === 0) {
			throw new SectionDialogueValidationError(
				"empty_heading",
				"Subsection heading cannot be empty.",
			);
		}

		if (subsection.turns.length < 2) {
			throw new SectionDialogueValidationError(
				"incomplete_section",
				"Each subsection must contain at least two turns.",
			);
		}

		if (subsection.turns.length > 4) {
			throw new SectionDialogueValidationError(
				"too_many_turns",
				"Each subsection can contain at most four turns.",
			);
		}

		for (const turn of subsection.turns) {
			if (!speakerIds.has(turn.speakerId)) {
				throw new SectionDialogueValidationError(
					"unknown_speaker",
					`Unknown speakerId "${turn.speakerId}".`,
				);
			}
		}
	}
}

function validateTurn(turn: TurnOutput, speakerIds: Set<string>): void {
	if (!speakerIds.has(turn.speakerId)) {
		throw new SectionDialogueValidationError(
			"unknown_speaker",
			`Unknown speakerId "${turn.speakerId}".`,
		);
	}

	const text = turn.text.trim();
	if (text.length < 8) {
		throw new SectionDialogueValidationError(
			"empty_turn",
			"Turn text must contain substantive dialogue content.",
		);
	}
}

function buildPlanPrompt(params: {
	chunk: TranscriptChunk;
	speakers: DialogueSpeaker[];
	retryReason?: string;
}): string {
	const retry = params.retryReason
		? `\nPrevious structured output was invalid:\n${params.retryReason}\nRegenerate a corrected section plan from the beginning.\n`
		: "";

	return `你是中文科技访谈编辑。请先为下面英文访谈 chunk 规划一个中文对话体文章 section。

${retry}
Allowed speaker IDs:
${params.speakers.map((speaker) => `- ${speaker.id}: ${speaker.name}`).join("\n")}

Planning rules:
- One chunk maps to exactly one section.
- The section heading should summarize the whole chunk as a concise H1.
- Create 1 to 4 subsections. Each subsection heading should be a concise H2.
- Each subsection must contain 2 to 4 planned turns.
- Each planned turn must specify one allowed speakerId and a short intent describing what that turn should say.
- Use only facts and ideas from the chunk.
- Do not write the final dialogue text in the plan; only write turn intents.

Chunk:
${params.chunk.text}`;
}

function buildTurnPrompt(params: {
	chunk: TranscriptChunk;
	speakers: DialogueSpeaker[];
	sectionHeading: string;
	subsectionHeading: string;
	plannedTurn: { speakerId: string; intent: string };
	completedTurns: Array<{ speakerId: string; text: string }>;
}): string {
	const previousTurns =
		params.completedTurns.length > 0
			? params.completedTurns
					.map((turn) => `${turn.speakerId}: ${turn.text}`)
					.join("\n")
			: "(none)";

	return `你是中文科技访谈编辑。请根据 section plan 生成当前这一轮中文对话文本。

Allowed speaker IDs:
${params.speakers.map((speaker) => `- ${speaker.id}: ${speaker.name}`).join("\n")}

Section heading: ${params.sectionHeading}
Subsection heading: ${params.subsectionHeading}
Current planned turn:
- speakerId: ${params.plannedTurn.speakerId}
- intent: ${params.plannedTurn.intent}

Previous turns in this subsection:
${previousTurns}

Rules:
- Only output the fluent Chinese dialogue text for this single turn.
- Do not output JSON, markdown, explanations, or a speaker label.
- Do not include speaker names such as "Jen:" or "Mark:" in text.
- Preserve the source meaning and do not invent facts.
- Make this turn coherent with previous turns and concise enough for a readable article.

Source chunk:
${params.chunk.text}`;
}
