"use client";

import { DialogueDocument } from "@/components/dialogue/dialogue-document";
import { DialogueStatusNotice } from "@/components/dialogue/dialogue-status-notice";
import { SourceForm } from "@/components/dialogue/source-form";
import { useDialogue } from "@/hooks/use-dialogue";

export default function Home() {
  const {
    error,
    isLoading,
    sections,
    speakers,
    status,
    stop,
    submit,
    title,
  } = useDialogue();
  const hasContent = Boolean(title || sections.length > 0);

  return (
    <main className="min-h-screen bg-white px-4 py-14 text-[#252336] md:px-10 lg:px-24">
      <div className="w-full">
        <header>
          <h1 className="font-mono text-2xl font-normal leading-none tracking-normal max-md:text-xl">
            Dialogue Extractor
          </h1>

          <div className="mt-9 space-y-2.5">
            <SourceForm
              isLoading={isLoading}
              onSubmit={submit}
              onStop={stop}
            />
            <DialogueStatusNotice
              status={status}
              isLoading={isLoading}
              errorMessage={error?.message}
            />
          </div>

          {hasContent ? (
            <h2 className="mt-8 max-w-5xl text-3xl font-semibold leading-tight tracking-normal text-[#252336] max-md:text-2xl">
              {title ?? "正在生成标题..."}
            </h2>
          ) : null}
        </header>

        {hasContent ? (
          <DialogueDocument speakers={speakers} sections={sections} />
        ) : null}
      </div>
    </main>
  );
}
