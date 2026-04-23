export function modelOutputToText(output: unknown): string {
	if (typeof output === "string") {
		return output;
	}

	if (isMessageLike(output)) {
		return contentToText(output.content);
	}

	return contentToText(output);
}

export function contentToText(content: unknown): string {
	if (typeof content === "string") {
		return content;
	}

	if (Array.isArray(content)) {
		return content
			.map((part) => {
				if (typeof part === "string") {
					return part;
				}
				if (part && typeof part === "object" && "text" in part) {
					return String(part.text ?? "");
				}
				return "";
			})
			.join("");
	}

	if (content == null) {
		return "";
	}

	return String(content);
}

export function parseJsonObject<T>(text: string): T {
	const trimmed = text.trim();
	const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
	const candidate = fenced ? fenced[1] : trimmed;
	const start = candidate.indexOf("{");
	const end = candidate.lastIndexOf("}");

	if (start === -1 || end === -1 || end <= start) {
		throw new Error("Model did not return a JSON object.");
	}

	return JSON.parse(candidate.slice(start, end + 1)) as T;
}

function isMessageLike(value: unknown): value is { content: unknown } {
	return Boolean(value && typeof value === "object" && "content" in value);
}
