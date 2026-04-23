import { describe, expect, it } from "vitest";

import type { DialogueModel, GraphEvent } from "../src/dialogue/types";
import { runDialogueWorkflow } from "../src/dialogue/workflow";

describe("runDialogueWorkflow", () => {
	it("starts section streaming without waiting for slow title generation", async () => {
		const events: GraphEvent[] = [];
		const model = createWorkflowModel();

		for await (const event of runDialogueWorkflow(
			{
				source: {
					kind: "article",
					title: "Original episode title",
					content: transcript,
				},
			},
			{ model, maxSectionRetries: 0 },
		)) {
			events.push(event);
		}

		const sectionStartedIndex = events.findIndex((event) => event.type === "section.started");
		const titleGeneratedIndex = events.findIndex((event) => event.type === "title.generated");
		const completedIndex = events.findIndex((event) => event.type === "run.completed");

		expect(sectionStartedIndex).toBeGreaterThan(-1);
		expect(titleGeneratedIndex).toBeGreaterThan(-1);
		expect(completedIndex).toBeGreaterThan(-1);
		expect(sectionStartedIndex).toBeLessThan(titleGeneratedIndex);
		expect(completedIndex).toBeGreaterThan(titleGeneratedIndex);
	});
});

const transcript = [
	"Intro opening words about AI markets and the broader context before the first topic.",
	"First breakpoint phrase opens the revenue discussion with details.",
	"Revenue is accelerating across several companies and the speakers compare growth rates.",
	"Second breakpoint phrase starts the model discussion with examples.",
	"They discuss model quality, training tradeoffs, and product implications for users.",
	"Third breakpoint phrase introduces deployment concerns and tradeoffs.",
	"The closing discussion covers reliability, costs, and what teams should watch next.",
].join(" ");

function createWorkflowModel(): DialogueModel {
	return {
		async invoke(input: string) {
			if (input.includes("为文章生成一个中文标题")) {
				await delay(50);
				return "慢标题";
			}

			if (input.includes("Identify the main speakers")) {
				return JSON.stringify({
					speakers: [
						{ id: "speaker-host", name: "Jen" },
						{ id: "speaker-guest", name: "Mark" },
					],
				});
			}

			if (input.includes("Split the transcript")) {
				return JSON.stringify({
					breakpoints: [
						"First breakpoint phrase opens the revenue discussion with details.",
						"Second breakpoint phrase starts the model discussion with examples.",
						"Third breakpoint phrase introduces deployment concerns and tradeoffs.",
					],
				});
			}

			throw new Error(`Unexpected invoke input: ${input.slice(0, 80)}`);
		},
		async *stream() {
			yield "这是一段会被流式返回的中文对话内容。";
		},
		withStructuredOutput(_schema: unknown, config?: { name?: string }) {
			return {
				async invoke() {
					if (config?.name !== "section_dialogue_plan") {
						throw new Error(`Unexpected structured output: ${config?.name}`);
					}

					return {
						heading: "技术革命",
						subsections: [
							{
								heading: "收入增长",
								turns: [
									{ speakerId: "speaker-host", intent: "询问增长情况" },
									{ speakerId: "speaker-guest", intent: "解释增长情况" },
								],
							},
						],
					};
				},
			};
		},
	};
}

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}
