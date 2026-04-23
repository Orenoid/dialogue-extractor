import { describe, expect, it } from "vitest";

import { applyDialoguePart } from "@/hooks/use-dialogue";
import type { DialogueState } from "@/types/dialogue";

const initialState: DialogueState = {
  status: "idle",
  title: null,
  speakers: [],
  sections: [],
};

describe("applyDialoguePart", () => {
  it("aggregates streamed dialogue events", () => {
    let state = initialState;

    state = applyDialoguePart(state, {
      type: "data-title",
      id: "title",
      data: { title: "对话安德森" },
    });
    state = applyDialoguePart(state, {
      type: "data-speakers",
      id: "speakers",
      data: { speakers: [{ id: "speaker-host", name: "Jen" }] },
    });
    state = applyDialoguePart(state, {
      type: "data-section",
      id: "section-0",
      data: { chunkIndex: 0, heading: "技术革命" },
    });
    state = applyDialoguePart(state, {
      type: "data-subsection",
      id: "section-0-subsection-1",
      data: { sectionId: "section-0", heading: "AI 收入增长" },
    });
    state = applyDialoguePart(state, {
      type: "data-turn-start",
      id: "section-0-subsection-1-turn-1",
      data: { subsectionId: "section-0-subsection-1", speakerId: "speaker-host" },
    });
    state = applyDialoguePart(state, {
      type: "data-turn-delta",
      id: "section-0-subsection-1-turn-1",
      data: { delta: "你好" },
    });
    state = applyDialoguePart(state, {
      type: "data-turn-delta",
      id: "section-0-subsection-1-turn-1",
      data: { delta: "，世界" },
    });
    state = applyDialoguePart(state, {
      type: "data-turn-end",
      id: "section-0-subsection-1-turn-1",
    });

    expect(state.title).toBe("对话安德森");
    expect(state.sections[0].subsections[0].turns[0]).toMatchObject({
      speakerId: "speaker-host",
      text: "你好，世界",
      status: "completed",
    });
  });

  it("removes a section on reset", () => {
    let state = applyDialoguePart(initialState, {
      type: "data-section",
      id: "section-0",
      data: { chunkIndex: 0, heading: "技术革命" },
    });

    state = applyDialoguePart(state, { type: "data-section-reset", id: "section-0" });

    expect(state.sections).toEqual([]);
  });

  it("removes a temporary turn on reset", () => {
    let state = initialState;
    state = applyDialoguePart(state, {
      type: "data-section",
      id: "section-0",
      data: { chunkIndex: 0, heading: "技术革命" },
    });
    state = applyDialoguePart(state, {
      type: "data-subsection",
      id: "section-0-subsection-1",
      data: { sectionId: "section-0", heading: "收入增长" },
    });
    state = applyDialoguePart(state, {
      type: "data-turn-start",
      id: "section-0-subsection-1-turn-1",
      data: { subsectionId: "section-0-subsection-1", speakerId: "speaker-host" },
    });

    state = applyDialoguePart(state, {
      type: "data-turn-reset",
      id: "section-0-subsection-1-turn-1",
    });

    expect(state.sections[0].subsections[0].turns).toEqual([]);
  });
});
