import { z } from "zod";

import type { DialogueModel, NormalizedTranscript, TranscriptChunk } from "../types";
import { modelOutputToText, parseJsonObject } from "./model-utils";

const ChunksSchema = z.object({
	breakpoints: z.array(z.string().min(12)).min(3).max(10),
});

export async function chunkTranscript(
	model: DialogueModel,
	transcript: NormalizedTranscript,
): Promise<TranscriptChunk[]> {
	const chunkingSample = transcript.text.slice(0, 18000);
	const response = await model.invoke(`Split the transcript into text chunks suitable for a Chinese article generated from a dialogue.

Return strict JSON only:
{
  "breakpoints": [
    "exact source phrase where a new major section starts",
    "another exact source phrase where the next major section starts"
  ]
}

Rules:
- Each chunk should map to exactly one first-level article section.
- Each chunk should cover one coherent topic.
- Each chunk should later support one section heading.
- Each chunk should later support one to four subsection headings.
- Each subsection should later support one to two Q&A rounds.
- Preserve source order.
- Return exact source phrases from the transcript, not headings or summaries.
- Each breakpoint phrase must be copied verbatim from the transcript.
- Each breakpoint phrase marks the start of a new chunk.
- Do not include a breakpoint for the first chunk.
- Prefer 5 to 8 total chunks, which means 4 to 7 breakpoints.
- Keep each breakpoint short, around 12 to 24 words.

Transcript:
${chunkingSample}`);

	const output = modelOutputToText(response);
	const breakpoints = parseBreakpoints(output);
	const chunks = splitTranscriptByBreakpoints(transcript.text, breakpoints);
	return chunks.map((text, chunkIndex) => ({ chunkIndex, text }));
}

function parseBreakpoints(output: string): string[] {
	try {
		return ChunksSchema.parse(parseJsonObject(output)).breakpoints;
	} catch {
		const candidates = output
			.split("\n")
			.map((line) =>
				line
					.trim()
					.replace(/^[-*]\s*/, "")
					.replace(/^\d+[.)]\s*/, "")
					.replace(/^["“]|["”]$/g, "")
					.trim(),
			)
			.filter((line) => line.split(/\s+/).length >= 5)
			.filter((line) => !line.toLowerCase().startsWith("breakpoint"));

		if (candidates.length < 3) {
			throw new Error("Model did not return enough usable chunk breakpoints.");
		}

		return candidates.slice(0, 10);
	}
}

function splitTranscriptByBreakpoints(text: string, breakpoints: string[]): string[] {
	const normalizedText = normalizeWhitespace(text);
	const offsets = breakpoints
		.map((breakpoint) => findBreakpointOffset(normalizedText, normalizeWhitespace(breakpoint)))
		.filter((offset): offset is number => offset !== null)
		.filter((offset, index, all) => offset > 0 && all.indexOf(offset) === index)
		.sort((left, right) => left - right);

	if (offsets.length < 2) {
		return splitTranscriptByLength(normalizedText, 6);
	}

	const chunks: string[] = [];
	let start = 0;
	for (const offset of offsets) {
		chunks.push(normalizedText.slice(start, offset).trim());
		start = offset;
	}
	chunks.push(normalizedText.slice(start).trim());

	return chunks.filter((chunk) => chunk.length > 0);
}

function findBreakpointOffset(text: string, breakpoint: string): number | null {
	const direct = text.indexOf(breakpoint);
	if (direct !== -1) {
		return direct;
	}

	const words = breakpoint.split(" ").filter(Boolean);
	for (let size = Math.min(words.length, 10); size >= 5; size -= 1) {
		const phrase = words.slice(0, size).join(" ");
		const offset = text.indexOf(phrase);
		if (offset !== -1) {
			return offset;
		}
	}

	return null;
}

function splitTranscriptByLength(text: string, count: number): string[] {
	const words = text.split(" ").filter(Boolean);
	const chunkSize = Math.ceil(words.length / count);
	const chunks: string[] = [];

	for (let index = 0; index < words.length; index += chunkSize) {
		chunks.push(words.slice(index, index + chunkSize).join(" "));
	}

	return chunks;
}

function normalizeWhitespace(text: string): string {
	return text.replace(/\s+/g, " ").trim();
}
