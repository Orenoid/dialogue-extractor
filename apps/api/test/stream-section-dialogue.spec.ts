import { describe, expect, it } from "vitest";

import {
	SectionDialogueValidationError,
	streamSectionDialogue,
} from "../src/dialogue/nodes/stream-section-dialogue";
import type { DialogueModel, GraphEvent } from "../src/dialogue/types";

describe("streamSectionDialogue", () => {
	it("emits section events from turn-granularity structured output", async () => {
		const events: GraphEvent[] = [];
		const model = createStructuredModel({
			section_dialogue_plan: [
				{
					heading: "技术革命",
					subsections: [
						{
							heading: "收入增长",
							turns: [
								{ speakerId: "speaker-host", intent: "询问 AI 公司收入增长是否很快" },
								{ speakerId: "speaker-guest", intent: "解释收入增长速度前所未有" },
							],
						},
					],
				},
			],
			streams: [
				["这波 AI 公司", "增长速度真的很快吗？"],
				["是的，它们的收入增长速度", "几乎是前所未有的。"],
			],
		});

		await streamSectionDialogue({
			model,
			chunk: { chunkIndex: 0, text: "source text" },
			speakers: [
				{ id: "speaker-host", name: "Jen" },
				{ id: "speaker-guest", name: "Mark" },
			],
			emit: (event) => events.push(event),
		});

		expect(events.map((event) => event.type)).toEqual([
			"section.started",
			"subsection.started",
			"turn.started",
			"turn.delta",
			"turn.delta",
			"turn.completed",
			"turn.started",
			"turn.delta",
			"turn.delta",
			"turn.completed",
			"subsection.completed",
			"section.completed",
		]);
		expect(collectTurnText(events, "section-0-subsection-1-turn-1")).toBe(
			"这波 AI 公司增长速度真的很快吗？",
		);
	});

	it("rejects unknown speakers in the section plan", async () => {
		const model = createStructuredModel({
			section_dialogue_plan: [
				{
					heading: "技术革命",
					subsections: [
						{
							heading: "收入增长",
							turns: [
								{ speakerId: "bad", intent: "发言" },
								{ speakerId: "speaker-host", intent: "回应" },
							],
						},
					],
				},
			],
		});

		await expect(
			streamSectionDialogue({
				model,
				chunk: { chunkIndex: 0, text: "source text" },
				speakers: [{ id: "speaker-host", name: "Jen" }],
				emit: () => {},
			}),
		).rejects.toBeInstanceOf(SectionDialogueValidationError);
	});

	it("rejects non-substantive generated turns", async () => {
		const model = createStructuredModel({
			section_dialogue_plan: [
				{
					heading: "技术革命",
					subsections: [
						{
							heading: "收入增长",
							turns: [
								{ speakerId: "speaker-host", intent: "询问" },
								{ speakerId: "speaker-host", intent: "补充" },
							],
						},
					],
				},
			],
			streams: [["Jen"]],
		});

		await expect(
			streamSectionDialogue({
				model,
				chunk: { chunkIndex: 0, text: "source text" },
				speakers: [{ id: "speaker-host", name: "Jen" }],
				emit: () => {},
			}),
		).rejects.toBeInstanceOf(SectionDialogueValidationError);
	});
});

function createStructuredModel(
	outputs: Record<string, unknown[]>,
): DialogueModel {
	return {
		async invoke() {
			return "";
		},
		async *stream() {
			const queue = outputs.streams ?? [];
			const output = queue.shift();
			if (!output) {
				throw new Error("No stream output queued.");
			}
			if (Array.isArray(output)) {
				for (const chunk of output) {
					yield chunk;
				}
				return;
			}
			yield output;
		},
		withStructuredOutput(_schema: unknown, config?: { name?: string }) {
			const name = config?.name ?? "default";
			return {
				async invoke() {
					const queue = outputs[name] ?? [];
					const output = queue.shift();
					if (!output) {
						throw new Error(`No structured output queued for ${name}.`);
					}
					return output;
				},
			};
		},
	};
}

function collectTurnText(events: GraphEvent[], turnId: string): string {
	return events
		.filter((event) => event.type === "turn.delta" && event.turnId === turnId)
		.map((event) => event.delta)
		.join("");
}
