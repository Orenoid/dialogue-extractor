"use client";

import { DialogueDocument } from "@/components/dialogue/dialogue-document";
import { SourceForm } from "@/components/dialogue/source-form";
import { useDialogue } from "@/hooks/use-dialogue";
import type { DialogueStatus } from "@/types/dialogue";

const statusCopy: Record<DialogueStatus, string> = {
  idle: "",
  submitting: "正在提交链接...",
  awaitingTitle: "正在生成标题...",
  streamingDialogue: "正在生成正文...",
  completed: "生成完成",
  error: "生成失败",
  aborted: "已终止生成",
};

export function DialogueWorkspace() {
  const dialogue = useDialogue();
  const hasContent = Boolean(dialogue.title || dialogue.sections.length > 0);
  const statusText = statusCopy[dialogue.status];

  return (
    <main className="min-h-screen bg-white px-4 py-14 text-[#252336] md:px-10 lg:px-24">
      <div className="w-full">
        <header>
          <h1 className="font-mono text-2xl font-normal leading-none tracking-normal max-md:text-xl">
            Dialogue Extractor
          </h1>

          <div className="mt-9 space-y-2.5">
            <SourceForm
              isLoading={dialogue.isLoading}
              onSubmit={dialogue.submit}
              onStop={dialogue.stop}
            />

            {statusText ? (
              <p
                className="flex min-h-5 items-center gap-2 text-sm text-[#686a73]"
                aria-live="polite"
              >
                <StatusIcon status={dialogue.status} isLoading={dialogue.isLoading} />
                <span>
                  {dialogue.error
                    ? `${statusText}: ${dialogue.error.message}`
                    : statusText}
                </span>
              </p>
            ) : null}
          </div>

          {hasContent ? (
            <h2 className="mt-8 max-w-5xl text-3xl font-semibold leading-tight tracking-normal text-[#252336] max-md:text-2xl">
              {dialogue.title ?? "正在生成标题..."}
            </h2>
          ) : null}
        </header>

        {hasContent ? (
          <DialogueDocument
            speakers={dialogue.speakers}
            sections={dialogue.sections}
          />
        ) : null}
      </div>
    </main>
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
