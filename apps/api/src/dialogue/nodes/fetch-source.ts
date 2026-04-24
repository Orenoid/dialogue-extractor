import type { DialogueSource, NormalizedTranscript } from "../types";
import { ArticleSourceFetcher } from "./fetch-source/article-source-fetcher";
import type { SourceFetcher } from "./fetch-source/source-fetcher";
import { YoutubeSourceFetcher } from "./fetch-source/youtube-source-fetcher";

export async function fetchSource(
	source: DialogueSource,
	_access?: { youtubeCookie?: string },
): Promise<NormalizedTranscript> {
	const fetcher = createSourceFetcher(source);
	const metadata = fetcher.metadata();

	return {
		sourceType: source.kind,
		sourceTitle: readStringMetadata(metadata, "sourceTitle"),
		language: readStringMetadata(metadata, "language"),
		text: fetcher.transcript(),
	};
}

function createSourceFetcher(source: DialogueSource): SourceFetcher {
	if (source.kind === "article") {
		return new ArticleSourceFetcher(source);
	}

	if (source.kind === "youtube") {
		return new YoutubeSourceFetcher(source);
	}

	throw new Error(`Unsupported source type: ${source.kind}`);
}

function readStringMetadata(
	metadata: Record<string, unknown>,
	key: string,
): string | undefined {
	const value = metadata[key];
	return typeof value === "string" ? value : undefined;
}
