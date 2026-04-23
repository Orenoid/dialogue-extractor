import { MOCK_TRANSCRIPT } from "../mock-transcript";
import type { DialogueSource, NormalizedTranscript } from "../types";

export async function fetchSource(source: DialogueSource): Promise<NormalizedTranscript> {
	if (source.kind === "article") {
		return {
			sourceType: source.kind,
			sourceTitle: source.title,
			language: "unknown",
			text: source.content,
		};
	}

	return {
		sourceType: source.kind,
		sourceTitle: "Marc Andreessen's 2026 Outlook AI Timelines, US vs. China, and The Price",
		language: "en",
		text: MOCK_TRANSCRIPT,
	};
}
