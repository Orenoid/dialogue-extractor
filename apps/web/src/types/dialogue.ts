export type DialogueSource =
  | { kind: "youtube"; url: string }
  | { kind: "bilibili"; url: string }
  | { kind: "article"; url?: string; title?: string; content: string };

export type DialogueStatus =
  | "idle"
  | "submitting"
  | "awaitingTitle"
  | "streamingDialogue"
  | "completed"
  | "error"
  | "aborted";

export interface DialogueSpeaker {
  id: string;
  name: string;
}

export interface DialogueTurn {
  id: string;
  speakerId: string;
  text: string;
  status: "streaming" | "completed";
}

export interface DialogueSubsection {
  id: string;
  heading: string;
  turns: DialogueTurn[];
  status: "streaming" | "completed";
}

export interface DialogueSection {
  id: string;
  chunkIndex: number;
  heading: string;
  subsections: DialogueSubsection[];
  status: "streaming" | "completed";
}

export interface DialogueState {
  status: DialogueStatus;
  title: string | null;
  speakers: DialogueSpeaker[];
  sections: DialogueSection[];
  error?: Error;
}

export interface SubmitDialogueInput {
  source: DialogueSource;
  targetLanguage?: "zh-CN";
}

export type DialogueDataPart =
  | {
      type: "data-status";
      data: { status: "awaitingTitle" | "streamingDialogue" | "completed" };
    }
  | { type: "data-title"; id: "title"; data: { title: string } }
  | {
      type: "data-speakers";
      id: "speakers";
      data: { speakers: DialogueSpeaker[] };
    }
  | {
      type: "data-section";
      id: string;
      data: { chunkIndex: number; heading: string };
    }
  | {
      type: "data-subsection";
      id: string;
      data: { sectionId: string; heading: string };
    }
  | {
      type: "data-turn-start";
      id: string;
      data: { subsectionId: string; speakerId: string };
    }
  | { type: "data-turn-delta"; id: string; data: { delta: string } }
  | { type: "data-turn-end"; id: string }
  | { type: "data-turn-reset"; id: string }
  | { type: "data-subsection-end"; id: string }
  | { type: "data-section-end"; id: string }
  | { type: "data-section-reset"; id: string }
  | { type: "data-error"; data: { message: string } };
