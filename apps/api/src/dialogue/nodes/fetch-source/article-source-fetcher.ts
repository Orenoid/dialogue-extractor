import type { DialogueSource } from "../../types";
import type { SourceFetcher } from "./source-fetcher";

type ArticleSource = Extract<DialogueSource, { kind: "article" }>;

export class ArticleSourceFetcher implements SourceFetcher {
	constructor(private readonly source: ArticleSource) {}

	metadata(): Record<string, unknown> {
		return {
			sourceTitle: this.source.title,
			language: "unknown",
			url: this.source.url,
		};
	}

	transcript(): string {
		return this.source.content;
	}
}
