import { Hono } from "hono";
import { cors } from "hono/cors";

import { apiRoutes } from "./routes/api";
import { healthRoutes } from "./routes/health";

const app = new Hono<{ Bindings: Env }>();

app.use(
	"*",
	cors({
		origin: "*",
		allowHeaders: ["Content-Type"],
		allowMethods: ["GET", "POST", "OPTIONS"],
	}),
);

app.route("/", healthRoutes);
app.route("/api", apiRoutes);

app.notFound((c) => c.text("Not Found", 404));

app.onError((error, c) => {
	console.error(error);
	return c.json(
		{
			error:
				error instanceof Error ? error.message : "Internal Server Error",
		},
		500,
	);
});

export default app;
