import { fetchTranscript } from "youtube-transcript-plus";

import type { DialogueSource, NormalizedTranscript } from "../types";

const YOUTUBE_TRANSCRIPT_LANGUAGE = "en";
const YOUTUBE_FETCH_USER_AGENT =
	"Mozilla/5.0 (compatible; PodcastNote/1.0; +https://example.com)";

export async function fetchSource(source: DialogueSource): Promise<NormalizedTranscript> {
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

	const transcript = await fetchTranscript(source.url, {
		lang: YOUTUBE_TRANSCRIPT_LANGUAGE,
		userAgent: YOUTUBE_FETCH_USER_AGENT,
		videoDetails: true,
		retries: 2,
	});
	const text = transcript.segments.map((segment) => segment.text.trim()).filter(Boolean).join("\n");

	if (!text) {
		throw new Error("No transcript text was returned for this YouTube video.");
	}

	return {
		sourceType: source.kind,
		sourceTitle: transcript.videoDetails.title,
		language: transcript.segments[0]?.lang ?? YOUTUBE_TRANSCRIPT_LANGUAGE,
		text,
	};
}
