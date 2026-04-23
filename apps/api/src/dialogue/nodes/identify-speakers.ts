import { z } from "zod";

import type { DialogueModel, DialogueSpeaker, NormalizedTranscript } from "../types";
import { modelOutputToText, parseJsonObject } from "./model-utils";

const SpeakersSchema = z.object({
	speakers: z.array(
		z.object({
			id: z.string().min(1),
			name: z.string().min(1),
		}),
	).min(1),
});

export async function identifySpeakers(
	model: DialogueModel,
	transcript: NormalizedTranscript,
): Promise<DialogueSpeaker[]> {
	const response = await model.invoke(`Identify the main speakers in this transcript.

Return strict JSON only:
{
  "speakers": [
    { "id": "speaker-host", "name": "Jen" },
    { "id": "speaker-guest", "name": "Mark" }
  ]
}

Rules:
- Use stable lowercase kebab-case ids.
- Only include id and name.
- If uncertain, use speaker-host and speaker-guest.

Transcript excerpt:
${transcript.text.slice(0, 14000)}`);

	const parsed = SpeakersSchema.parse(parseJsonObject(modelOutputToText(response)));
	return parsed.speakers;
}
