import { ChatOpenAI } from "@langchain/openai";

import { createDialogueStreamResponse } from "./dialogue/stream-response";
import type { DialogueWorkflowInput } from "./dialogue/types";
import { runDialogueWorkflow } from "./dialogue/workflow";

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const { pathname } = new URL(request.url);

		if (request.method === "OPTIONS") {
			return new Response(null, {
				status: 204,
				headers: corsHeaders(),
			});
		}

		if (pathname === "/health") {
			return Response.json({
				ok: true,
				runtime: "cloudflare-worker",
				hasOpenAIKey: Boolean(env.OPENAI_API_KEY),
			});
		}

		if (pathname === "/api/dialogue" && request.method === "POST") {
			if (!env.OPENAI_API_KEY) {
				return Response.json(
					{ error: "OPENAI_API_KEY is not configured." },
					{ status: 500, headers: corsHeaders() },
				);
			}

			const input = (await request.json()) as DialogueWorkflowInput;
			const model = new ChatOpenAI({
				model: "gpt-4.1-mini",
				apiKey: env.OPENAI_API_KEY,
				streaming: true,
			});

			return createDialogueStreamResponse(
				runDialogueWorkflow(input, {
					model,
					maxSectionRetries: 2,
				}),
			);
		}

		if (pathname === "/api/notes") {
			return Response.json({
				message: "Podcast note pipeline scaffold is ready.",
				stack: ["Cloudflare Workers", "AI SDK", "Vitest"],
			});
		}

		return new Response("Not Found", { status: 404 });
	},
};

function corsHeaders(): HeadersInit {
	return {
		"access-control-allow-origin": "*",
		"access-control-allow-headers": "content-type",
		"access-control-allow-methods": "GET, POST, OPTIONS",
	};
}
