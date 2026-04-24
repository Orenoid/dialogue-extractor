import type { FrontendDialogueEvent, GraphEvent } from "./types";

export function graphEventToFrontendEvent(event: GraphEvent): FrontendDialogueEvent {
	switch (event.type) {
		case "status.changed":
			return { type: "data-status", data: { status: event.status } };
		case "title.generated":
			return { type: "data-title", id: "title", data: { title: event.title } };
		case "speakers.generated":
			return { type: "data-speakers", id: "speakers", data: { speakers: event.speakers } };
		case "section.started":
			return {
				type: "data-section",
				id: event.sectionId,
				data: { chunkIndex: event.chunkIndex, heading: event.heading },
			};
		case "subsection.started":
			return {
				type: "data-subsection",
				id: event.subsectionId,
				data: { sectionId: event.sectionId, heading: event.heading },
			};
		case "turn.started":
			return {
				type: "data-turn-start",
				id: event.turnId,
				data: { subsectionId: event.subsectionId, speakerId: event.speakerId },
			};
		case "turn.delta":
			return { type: "data-turn-delta", id: event.turnId, data: { delta: event.delta } };
		case "turn.completed":
			return { type: "data-turn-end", id: event.turnId };
		case "turn.discarded":
			return { type: "data-turn-reset", id: event.turnId };
		case "subsection.completed":
			return { type: "data-subsection-end", id: event.subsectionId };
		case "section.completed":
			return { type: "data-section-end", id: event.sectionId };
		case "section.reset":
			return { type: "data-section-reset", id: event.sectionId };
		case "run.completed":
			return { type: "data-status", data: { status: "completed" } };
	}
}

export function createDialogueStreamResponse(
	stream: AsyncIterable<GraphEvent>,
): Response {
	const encoder = new TextEncoder();

	const body = new ReadableStream<Uint8Array>({
		async start(controller) {
			try {
				for await (const graphEvent of stream) {
					const event = graphEventToFrontendEvent(graphEvent);
					controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
				}
				controller.enqueue(encoder.encode("data: [DONE]\n\n"));
				controller.close();
			} catch (error) {
				const message = error instanceof Error ? error.message : "Unknown dialogue stream error";
				const event: FrontendDialogueEvent = {
					type: "data-error",
					data: { message },
				};
				controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
				controller.enqueue(encoder.encode("data: [DONE]\n\n"));
				controller.close();
			}
		},
	});

	return new Response(body, {
		headers: {
			"content-type": "text/event-stream; charset=utf-8",
			"cache-control": "no-cache, no-transform",
			connection: "keep-alive",
		},
	});
}
