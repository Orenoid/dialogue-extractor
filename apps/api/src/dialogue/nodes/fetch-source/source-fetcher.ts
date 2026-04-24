export interface SourceFetcher {
	metadata(): Record<string, unknown>;
	transcript(): string;
}
