import type { DialogueModel, NormalizedTranscript } from "../types";
import { modelOutputToText } from "./model-utils";

export async function generateTitle(
	model: DialogueModel,
	transcript: NormalizedTranscript,
): Promise<string> {
	const response = await model.invoke(`你是中文科技访谈编辑。请基于下面英文字幕，为文章生成一个中文标题。

要求：
- 只输出标题本身。
- 不要引号。
- 不要解释。
- 标题要像正式中文文章标题。

字幕：
${transcript.text.slice(0, 12000)}`);

	return modelOutputToText(response).trim().replace(/^["“]|["”]$/g, "");
}
