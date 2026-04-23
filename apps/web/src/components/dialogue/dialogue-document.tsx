import type { DialogueSection, DialogueSpeaker } from "@/types/dialogue";

interface DialogueDocumentProps {
  title: string | null;
  speakers: DialogueSpeaker[];
  sections: DialogueSection[];
}

export function DialogueDocument({
  title,
  speakers,
  sections,
}: DialogueDocumentProps) {
  const speakerNameById = new Map(speakers.map((speaker) => [speaker.id, speaker.name]));

  return (
    <article className="rounded-[2rem] border border-stone-200 bg-[#fffdf7]/95 px-6 py-8 shadow-[0_30px_100px_rgba(59,43,24,0.13)] md:px-12 md:py-12">
      <header className="mb-10 border-b border-stone-200 pb-8">
        <p className="text-sm uppercase tracking-[0.35em] text-stone-400">
          Podcast Note
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-[-0.04em] text-stone-950 md:text-6xl">
          {title ?? "正在生成标题..."}
        </h1>
      </header>

      <div className="space-y-12">
        {sections.map((section) => (
          <section key={section.id} className="scroll-mt-8">
            <div className="mb-6 flex items-start gap-4">
              <span className="mt-1 rounded-full bg-stone-900 px-3 py-1 text-xs font-medium text-stone-50">
                {String(section.chunkIndex + 1).padStart(2, "0")}
              </span>
              <h2 className="text-2xl font-semibold leading-tight tracking-[-0.02em] text-stone-900 md:text-3xl">
                {section.heading}
              </h2>
            </div>

            <div className="space-y-8 border-l border-stone-200 pl-5 md:pl-8">
              {section.subsections.map((subsection) => (
                <div key={subsection.id} className="space-y-4">
                  <h3 className="text-xl font-semibold leading-snug text-stone-800">
                    {subsection.heading}
                  </h3>
                  <div className="space-y-4">
                    {subsection.turns.map((turn) => (
                      <p
                        key={turn.id}
                        className="rounded-2xl bg-white/70 p-4 text-[15px] leading-8 text-stone-700 shadow-sm"
                      >
                        <span className="mr-2 font-semibold text-stone-950">
                          {speakerNameById.get(turn.speakerId) ?? turn.speakerId}:
                        </span>
                        {turn.text}
                        {turn.status === "streaming" ? (
                          <span className="ml-1 inline-block h-4 w-1 animate-pulse rounded-full bg-stone-500 align-middle" />
                        ) : null}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
