import type { DialogueStatus } from "@/types/dialogue";

interface DialogueStatusNoticeProps {
  status: DialogueStatus;
  isLoading: boolean;
  errorMessage?: string;
}

const statusCopy: Record<DialogueStatus, string> = {
  idle: "",
  submitting: "正在提交链接...",
  awaitingTitle: "正在生成标题...",
  streamingDialogue: "正在生成正文...",
  completed: "生成完成",
  error: "生成失败",
  aborted: "已终止生成",
};

export function DialogueStatusNotice({
  status,
  isLoading,
  errorMessage,
}: DialogueStatusNoticeProps) {
  const statusText = statusCopy[status];

  if (!statusText) {
    return null;
  }

  return (
    <p
      className="flex min-h-5 items-center gap-2 text-sm text-[#686a73]"
      aria-live="polite"
    >
      <StatusIcon status={status} isLoading={isLoading} />
      <span>
        {errorMessage ? `${statusText}: ${errorMessage}` : statusText}
      </span>
    </p>
  );
}

function StatusIcon({
  status,
  isLoading,
}: {
  status: DialogueStatus;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <span
        className="h-4 w-4 animate-spin rounded-full border-2 border-[#d6d4dc] border-t-[#252336]"
        aria-hidden="true"
      />
    );
  }

  if (status === "completed") {
    return <span aria-hidden="true">✓</span>;
  }

  if (status === "error" || status === "aborted") {
    return <span aria-hidden="true">!</span>;
  }

  return null;
}
