import {
	fetchTranscript,
	YoutubeTranscriptNotAvailableError,
	YoutubeTranscriptTooManyRequestError,
} from "youtube-transcript-plus";

import type { DialogueSource, NormalizedTranscript } from "../types";

const YOUTUBE_FETCH_USER_AGENT =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36";
const YOUTUBE_ACCEPT_LANGUAGE = "en-US,en;q=0.9";

interface TranscriptAccessConfig {
	youtubeCookie?: string;
}

export async function fetchSource(
	source: DialogueSource,
	access?: TranscriptAccessConfig,
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

	const transcript = await fetchYouTubeTranscript(source.url, access);
	const text = transcript.segments.map((segment) => segment.text.trim()).filter(Boolean).join("\n");

	if (!text) {
		throw new Error("No transcript text was returned for this YouTube video.");
	}

	return {
		sourceType: source.kind,
		sourceTitle: transcript.videoDetails.title,
		language: transcript.segments[0]?.lang,
		text,
	};
}

async function fetchYouTubeTranscript(
	url: string,
	access?: TranscriptAccessConfig,
) {
	const config = buildTranscriptConfig(access);

	try {
		return await fetchTranscript(url, config);
	} catch (error) {
		if (error instanceof YoutubeTranscriptTooManyRequestError) {
			throw new Error(
				"YouTube temporarily rate-limited transcript access from this environment. Wait a few minutes or route requests through a different network.",
			);
		}

		if (error instanceof YoutubeTranscriptNotAvailableError) {
			const diagnosis = await diagnoseYouTubeAccess(url, access);
			if (diagnosis === "bot-check") {
				throw new Error(
					"YouTube is asking this runtime to sign in before exposing captions. Add a YOUTUBE_COOKIE secret from a signed-in browser session, or retry from a different network.",
				);
			}
		}

		throw error;
	}
}

function buildTranscriptConfig(access?: TranscriptAccessConfig) {
	return {
		userAgent: YOUTUBE_FETCH_USER_AGENT,
		videoDetails: true as const,
		retries: 2,
		videoFetch: ({ url, lang, userAgent, signal }: FetchStageParams) =>
			youtubeFetch(url, {
				headers: buildYoutubeHeaders({
					lang,
					userAgent,
					cookie: access?.youtubeCookie,
				}),
				signal,
			}),
		playerFetch: ({
			url,
			method,
			body,
			headers,
			lang,
			userAgent,
			signal,
		}: FetchStageParams) =>
			youtubeFetch(url, {
				method,
				body,
				headers: buildYoutubeHeaders({
					lang,
					userAgent,
					cookie: access?.youtubeCookie,
					extraHeaders: headers,
				}),
				signal,
			}),
		transcriptFetch: ({ url, lang, userAgent, signal }: FetchStageParams) =>
			youtubeFetch(url, {
				headers: buildYoutubeHeaders({
					lang,
					userAgent,
					cookie: access?.youtubeCookie,
				}),
				signal,
			}),
	};
}

function buildYoutubeHeaders(params: {
	lang?: string;
	userAgent?: string;
	cookie?: string;
	extraHeaders?: HeadersInit;
}): Headers {
	const headers = new Headers(params.extraHeaders);
	headers.set("accept-language", params.lang ?? YOUTUBE_ACCEPT_LANGUAGE);
	headers.set("user-agent", params.userAgent ?? YOUTUBE_FETCH_USER_AGENT);
	headers.set("accept", "*/*");
	headers.set("origin", "https://www.youtube.com");
	headers.set("referer", "https://www.youtube.com/");

	if (params.cookie) {
		headers.set("cookie", params.cookie);
	}

	return headers;
}

async function youtubeFetch(url: string, init: RequestInit): Promise<Response> {
	return fetch(url, init);
}

async function diagnoseYouTubeAccess(
	url: string,
	access?: TranscriptAccessConfig,
): Promise<"bot-check" | "unknown"> {
	const videoId = extractVideoId(url);
	if (!videoId) {
		return "unknown";
	}

	const watchResponse = await youtubeFetch(`https://www.youtube.com/watch?v=${videoId}`, {
		headers: buildYoutubeHeaders({
			cookie: access?.youtubeCookie,
		}),
	});
	const watchBody = await watchResponse.text();
	const apiKeyMatch =
		watchBody.match(/"INNERTUBE_API_KEY":"([^"]+)"/) ??
		watchBody.match(/INNERTUBE_API_KEY\\":\\"([^\\"]+)\\"/);

	if (!apiKeyMatch?.[1]) {
		return "unknown";
	}

	const playerResponse = await youtubeFetch(
		`https://www.youtube.com/youtubei/v1/player?key=${apiKeyMatch[1]}`,
		{
			method: "POST",
			headers: buildYoutubeHeaders({
				cookie: access?.youtubeCookie,
				extraHeaders: { "content-type": "application/json" },
			}),
			body: JSON.stringify({
				context: {
					client: {
						clientName: "WEB",
						clientVersion: "2.20250424.01.00",
					},
				},
				videoId,
			}),
		},
	);
	const playerJson = (await playerResponse.json()) as {
		playabilityStatus?: { status?: string; reason?: string };
	};
	const reason = playerJson.playabilityStatus?.reason ?? "";

	return reason.includes("confirm you") && reason.includes("not a bot")
		? "bot-check"
		: "unknown";
}

function extractVideoId(url: string): string | null {
	try {
		const parsed = new URL(url);
		if (parsed.hostname.includes("youtu.be")) {
			return parsed.pathname.slice(1) || null;
		}

		if (parsed.hostname.includes("youtube.com")) {
			return parsed.searchParams.get("v");
		}
	} catch {
		return /^[A-Za-z0-9_-]{11}$/.test(url) ? url : null;
	}

	return null;
}

interface FetchStageParams {
	url: string;
	method?: string;
	body?: BodyInit | null;
	headers?: HeadersInit;
	lang?: string;
	userAgent?: string;
	signal?: AbortSignal;
}
