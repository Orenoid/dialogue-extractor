import type { DialogueModel, NormalizedTranscript } from "../types";
import { modelOutputToText } from "./model-utils";

export async function generateTitle(
	model: DialogueModel,
	transcript: NormalizedTranscript,
): Promise<string> {
	const sourceTitle = transcript.sourceTitle
		? `原始标题：${transcript.sourceTitle}\n\n`
		: "";
	const excerpt = transcript.text.slice(0, 6000);
	const response = await model.invoke(`你是中文科技访谈编辑。请基于下面信息，为文章生成一个中文标题。

要求：
- 只输出标题本身。
- 不要引号。
- 不要解释。
- 标题要像正式中文文章标题。

${sourceTitle}字幕摘录：
${excerpt}`);

	return modelOutputToText(response).trim().replace(/^["“]|["”]$/g, "");
}
