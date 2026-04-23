"use client";

import { useRef, useState } from "react";

import type {
  DialogueDataPart,
  DialogueState,
  SubmitDialogueInput,
} from "@/types/dialogue";

export interface UseDialogueResult extends DialogueState {
  isLoading: boolean;
  submit: (input: SubmitDialogueInput) => Promise<void>;
  stop: () => void;
  reset: () => void;
}

const initialState: DialogueState = {
  status: "idle",
  title: null,
  speakers: [],
  sections: [],
};

export function useDialogue(): UseDialogueResult {
  const [state, setState] = useState<DialogueState>(initialState);
  const abortControllerRef = useRef<AbortController | null>(null);

  async function submit(input: SubmitDialogueInput) {
    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setState({ ...initialState, status: "submitting" });

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/dialogue`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
        signal: abortController.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Dialogue request failed with status ${response.status}.`);
      }

      for await (const part of readSseParts(response.body)) {
        setState((current) => applyDialoguePart(current, part));
      }
    } catch (error) {
      if (abortController.signal.aborted) {
        setState((current) => ({ ...current, status: "aborted" }));
        return;
      }

      setState((current) => ({
        ...current,
        status: "error",
        error: error instanceof Error ? error : new Error(String(error)),
      }));
    }
  }

  function stop() {
    abortControllerRef.current?.abort();
  }

  function reset() {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setState(initialState);
  }

  return {
    ...state,
    isLoading:
      state.status === "submitting" ||
      state.status === "awaitingTitle" ||
      state.status === "streamingDialogue",
    submit,
    stop,
    reset,
  };
}

export function applyDialoguePart(
  state: DialogueState,
  part: DialogueDataPart,
): DialogueState {
  switch (part.type) {
    case "data-status":
      return { ...state, status: part.data.status };
    case "data-title":
      return { ...state, title: part.data.title };
    case "data-speakers":
      return { ...state, speakers: part.data.speakers };
    case "data-section":
      return {
        ...state,
        sections: [
          ...state.sections.filter((section) => section.id !== part.id),
          {
            id: part.id,
            chunkIndex: part.data.chunkIndex,
            heading: part.data.heading,
            subsections: [],
            status: "streaming",
          },
        ],
      };
    case "data-subsection":
      return {
        ...state,
        sections: state.sections.map((section) =>
          section.id === part.data.sectionId
            ? {
                ...section,
                subsections: [
                  ...section.subsections.filter(
                    (subsection) => subsection.id !== part.id,
                  ),
                  {
                    id: part.id,
                    heading: part.data.heading,
                    turns: [],
                    status: "streaming",
                  },
                ],
              }
            : section,
        ),
      };
    case "data-turn-start":
      return {
        ...state,
        sections: state.sections.map((section) => ({
          ...section,
          subsections: section.subsections.map((subsection) =>
            subsection.id === part.data.subsectionId
              ? {
                  ...subsection,
                  turns: [
                    ...subsection.turns.filter((turn) => turn.id !== part.id),
                    {
                      id: part.id,
                      speakerId: part.data.speakerId,
                      text: "",
                      status: "streaming",
                    },
                  ],
                }
              : subsection,
          ),
        })),
      };
    case "data-turn-delta":
      return {
        ...state,
        sections: state.sections.map((section) => ({
          ...section,
          subsections: section.subsections.map((subsection) => ({
            ...subsection,
            turns: subsection.turns.map((turn) =>
              turn.id === part.id ? { ...turn, text: turn.text + part.data.delta } : turn,
            ),
          })),
        })),
      };
    case "data-turn-end":
      return markTurnCompleted(state, part.id);
    case "data-turn-reset":
      return removeTurn(state, part.id);
    case "data-subsection-end":
      return markSubsectionCompleted(state, part.id);
    case "data-section-end":
      return {
        ...state,
        sections: state.sections.map((section) =>
          section.id === part.id ? { ...section, status: "completed" } : section,
        ),
      };
    case "data-section-reset":
      return {
        ...state,
        sections: state.sections.filter((section) => section.id !== part.id),
      };
    case "data-error":
      return { ...state, status: "error", error: new Error(part.data.message) };
  }
}

function removeTurn(state: DialogueState, turnId: string): DialogueState {
  return {
    ...state,
    sections: state.sections.map((section) => ({
      ...section,
      subsections: section.subsections.map((subsection) => ({
        ...subsection,
        turns: subsection.turns.filter((turn) => turn.id !== turnId),
      })),
    })),
  };
}

async function* readSseParts(
  body: ReadableStream<Uint8Array>,
): AsyncIterable<DialogueDataPart> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const dataLine = frame
        .split("\n")
        .find((line) => line.startsWith("data:"));
      if (!dataLine) {
        continue;
      }

      const data = dataLine.slice(5).trim();
      if (data === "[DONE]") {
        return;
      }
      yield JSON.parse(data) as DialogueDataPart;
    }
  }
}

function markTurnCompleted(state: DialogueState, turnId: string): DialogueState {
  return {
    ...state,
    sections: state.sections.map((section) => ({
      ...section,
      subsections: section.subsections.map((subsection) => ({
        ...subsection,
        turns: subsection.turns.map((turn) =>
          turn.id === turnId ? { ...turn, status: "completed" } : turn,
        ),
      })),
    })),
  };
}

function markSubsectionCompleted(
  state: DialogueState,
  subsectionId: string,
): DialogueState {
  return {
    ...state,
    sections: state.sections.map((section) => ({
      ...section,
      subsections: section.subsections.map((subsection) =>
        subsection.id === subsectionId
          ? { ...subsection, status: "completed" }
          : subsection,
      ),
    })),
  };
}

function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8787";
}
