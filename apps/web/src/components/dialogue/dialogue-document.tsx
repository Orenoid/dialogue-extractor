import type { DialogueSection, DialogueSpeaker } from "@/types/dialogue";

interface DialogueDocumentProps {
  speakers: DialogueSpeaker[];
  sections: DialogueSection[];
}

export function DialogueDocument({
  speakers,
  sections,
}: DialogueDocumentProps) {
  const speakerNameById = new Map(
    speakers.map((speaker) => [speaker.id, speaker.name]),
  );

  return (
    <div className="mt-7 grid max-w-[1760px] gap-12 lg:grid-cols-[360px_minmax(0,1fr)]">
      {/* vertical navigation */}
      <nav className="self-start lg:sticky lg:top-8">
        <ol className="space-y-3 text-lg leading-[1.65] text-[#686a73]">
          {sections.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="block text-[#3367e8] transition hover:text-[#1747bf]"
              >
                {section.heading}
              </a>
              {section.subsections.length > 0 ? (
                <ol className="mt-1.5 space-y-1.5 pl-5">
                  {section.subsections.map((subsection) => (
                    <li key={subsection.id}>
                      <a
                        href={`#${subsection.id}`}
                        className="block transition hover:text-[#252336]"
                      >
                        {subsection.heading}
                      </a>
                    </li>
                  ))}
                </ol>
              ) : null}
            </li>
          ))}
        </ol>
      </nav>
      {/* main content */}
      <article className="max-w-[1280px] text-[#252336]">
        <div className="space-y-10">
          {sections.map((section) => (
            <section id={section.id} key={section.id} className="scroll-mt-8">
              <h2 className="mb-6 text-3xl font-semibold leading-tight tracking-normal">
                {section.heading}
              </h2>

              <div className="space-y-8">
                {section.subsections.map((subsection) => (
                  <section
                    id={subsection.id}
                    key={subsection.id}
                    className="scroll-mt-8 space-y-3"
                  >
                    <h3 className="text-2xl font-semibold leading-snug tracking-normal">
                      {subsection.heading}
                    </h3>
                    <div className="space-y-4 text-xl leading-[1.75] max-md:text-lg">
                      {subsection.turns.map((turn) => (
                        <p key={turn.id} className="text-[#252336]">
                          <span className="mr-2 font-semibold underline decoration-2 underline-offset-4">
                            {speakerNameById.get(turn.speakerId) ??
                              turn.speakerId}
                            :
                          </span>
                          {turn.text}
                          {turn.status === "streaming" ? (
                            <span className="ml-1 inline-block h-5 w-1 animate-pulse bg-[#252336] align-middle" />
                          ) : null}
                        </p>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
