import { ChatOpenAI } from "@langchain/openai";
import { Hono } from "hono";

import { createDialogueStreamResponse } from "../dialogue/stream-response";
import type { DialogueWorkflowInput } from "../dialogue/types";
import { runDialogueWorkflow } from "../dialogue/workflow";

const apiRoutes = new Hono<{ Bindings: Env }>();

apiRoutes.post("/dialogue", async (c) => {
	if (!c.env.OPENAI_API_KEY) {
		return c.json({ error: "OPENAI_API_KEY is not configured." }, 500);
	}

	const input = (await c.req.json()) as DialogueWorkflowInput;
	const model = new ChatOpenAI({
		model: "gpt-4.1-mini",
		apiKey: c.env.OPENAI_API_KEY,
		streaming: true,
	});

	return createDialogueStreamResponse(
		runDialogueWorkflow(input, {
			model,
			maxSectionRetries: 2,
			transcriptAccess: {
				youtubeCookie: c.env.YOUTUBE_COOKIE,
			},
		}),
	);
});

apiRoutes.get("/notes", (c) =>
	c.json({
		message: "Podcast note pipeline scaffold is ready.",
		stack: ["Cloudflare Workers", "AI SDK", "Vitest"],
	}),
);

export { apiRoutes };
