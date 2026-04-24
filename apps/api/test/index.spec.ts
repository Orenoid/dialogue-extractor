import {
	env,
	createExecutionContext,
	waitOnExecutionContext,
	SELF,
} from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../src/index";

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe("podcast note worker", () => {
	it("returns health metadata (unit style)", async () => {
		const request = new IncomingRequest("http://example.com/health");
		// Create an empty context to pass to `worker.fetch()`.
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		// Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
		await waitOnExecutionContext(ctx);
		expect(await response.json()).toEqual({
			ok: true,
			runtime: "cloudflare-worker",
			hasOpenAIKey: Boolean(env.OPENAI_API_KEY),
		});
	});

	it("handles CORS preflight for dialogue requests", async () => {
		const request = new IncomingRequest("http://example.com/api/dialogue", {
			method: "OPTIONS",
			headers: {
				origin: "https://example.com",
				"access-control-request-method": "POST",
			},
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(204);
		expect(response.headers.get("access-control-allow-origin")).toBe("*");
		expect(response.headers.get("access-control-allow-methods")).toContain("POST");
	});

	it("returns note scaffold metadata (integration style)", async () => {
		const response = await SELF.fetch("https://example.com/api/notes");
		expect(await response.json()).toMatchInlineSnapshot(`
			{
			  "message": "Podcast note pipeline scaffold is ready.",
			  "stack": [
			    "Cloudflare Workers",
			    "AI SDK",
			    "Vitest",
			  ],
			}
		`);
	});
});
