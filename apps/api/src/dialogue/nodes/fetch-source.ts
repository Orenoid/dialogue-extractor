import type { DialogueSource, NormalizedTranscript } from "../types";
import {
	MOCK_YOUTUBE_SOURCE_TITLE,
	MOCK_YOUTUBE_TRANSCRIPT,
} from "../mock-youtube-transcript";

export async function fetchSource(
	source: DialogueSource,
	_access?: { youtubeCookie?: string },
): Promise<NormalizedTranscript> {
	if (source.kind === "article") {
		return {
			sourceType: source.kind,
			sourceTitle: source.title,
			language: "unknown",
			text: source.content,
		};
	}

	if (source.kind !== "youtube") {
		throw new Error(`Unsupported source type: ${source.kind}`);
	}

	return {
		sourceType: source.kind,
		sourceTitle: MOCK_YOUTUBE_SOURCE_TITLE,
		language: "en",
		text: MOCK_YOUTUBE_TRANSCRIPT,
	};
}
