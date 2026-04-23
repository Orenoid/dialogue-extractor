"use client";

import { DialogueDocument } from "@/components/dialogue/dialogue-document";
import { DialogueEmptyState } from "@/components/dialogue/dialogue-empty-state";
import { DialogueStatusBadge } from "@/components/dialogue/dialogue-status";
import { SourceForm } from "@/components/dialogue/source-form";
import { useDialogue } from "@/hooks/use-dialogue";

export function DialogueWorkspace() {
  const dialogue = useDialogue();
  const hasContent = Boolean(dialogue.title || dialogue.sections.length > 0);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_10%_0%,rgba(245,158,11,0.18),transparent_32%),radial-gradient(circle_at_90%_10%,rgba(15,118,110,0.13),transparent_28%),linear-gradient(180deg,#fff8e7_0%,#f5efe2_100%)] px-5 py-8 text-stone-950 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-5 lg:sticky lg:top-8 lg:self-start">
          <div className="rounded-[1.75rem] border border-stone-200 bg-white/65 p-6 backdrop-blur">
            <DialogueStatusBadge status={dialogue.status} />
            <h1 className="mt-6 text-4xl font-semibold leading-none tracking-[-0.05em]">
              访谈转中文对话文章
            </h1>
            <p className="mt-4 text-sm leading-7 text-stone-600">
              输入视频来源，后端会基于字幕生成两层标题结构和流式对话正文。
            </p>
          </div>

          <SourceForm
            isLoading={dialogue.isLoading}
            onSubmit={dialogue.submit}
            onStop={dialogue.stop}
            onReset={dialogue.reset}
          />

          {dialogue.error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
              {dialogue.error.message}
            </div>
          ) : null}
        </aside>

        <section>
          {hasContent ? (
            <DialogueDocument
              title={dialogue.title}
              speakers={dialogue.speakers}
              sections={dialogue.sections}
            />
          ) : (
            <DialogueEmptyState />
          )}
        </section>
      </div>
    </main>
  );
}
