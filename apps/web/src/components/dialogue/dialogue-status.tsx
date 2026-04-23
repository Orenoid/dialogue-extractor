import type { DialogueStatus } from "@/types/dialogue";

const statusCopy: Record<DialogueStatus, string> = {
  idle: "等待输入",
  submitting: "正在提交",
  awaitingTitle: "正在生成标题",
  streamingDialogue: "正在生成正文",
  completed: "生成完成",
  error: "生成失败",
  aborted: "已停止",
};

export function DialogueStatusBadge({ status }: { status: DialogueStatus }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-stone-300/70 bg-white/70 px-3 py-1 text-sm text-stone-700 shadow-sm">
      <span className="h-2 w-2 rounded-full bg-emerald-500 data-[state=idle]:bg-stone-400 data-[state=error]:bg-red-500" data-state={status} />
      {statusCopy[status]}
    </span>
  );
}
