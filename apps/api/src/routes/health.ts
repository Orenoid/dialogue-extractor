import { Hono } from "hono";

const healthRoutes = new Hono<{ Bindings: Env }>();

healthRoutes.get("/health", (c) =>
	c.json({
		ok: true,
		runtime: "cloudflare-worker",
		hasOpenAIKey: Boolean(c.env.OPENAI_API_KEY),
	}),
);

export { healthRoutes };
