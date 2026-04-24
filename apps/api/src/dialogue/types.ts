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

export interface NormalizedTranscript {
	sourceType: DialogueSource["kind"];
	sourceTitle?: string;
	language?: string;
	text: string;
}

export interface TranscriptChunk {
	chunkIndex: number;
	text: string;
}

export type FrontendDialogueEvent =
	| {
			type: "data-status";
			data: { status: "awaitingTitle" | "streamingDialogue" | "completed" };
	  }
	| {
			type: "data-title";
			id: "title";
			data: { title: string };
	  }
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
	| {
			type: "data-turn-delta";
			id: string;
			data: { delta: string };
	  }
	| {
			type: "data-turn-end";
			id: string;
	  }
	| {
			type: "data-turn-reset";
			id: string;
	  }
	| {
			type: "data-subsection-end";
			id: string;
	  }
	| {
			type: "data-section-end";
			id: string;
	  }
	| {
			type: "data-section-reset";
			id: string;
	  }
	| {
			type: "data-error";
			data: { message: string };
	  };

export type GraphEvent =
	| { type: "status.changed"; status: "awaitingTitle" | "streamingDialogue" | "completed" }
	| { type: "title.generated"; title: string }
	| { type: "speakers.generated"; speakers: DialogueSpeaker[] }
	| { type: "section.started"; sectionId: string; chunkIndex: number; heading: string }
	| { type: "subsection.started"; subsectionId: string; sectionId: string; heading: string }
	| { type: "turn.started"; turnId: string; subsectionId: string; speakerId: string }
	| { type: "turn.delta"; turnId: string; delta: string }
	| { type: "turn.completed"; turnId: string }
	| { type: "turn.discarded"; turnId: string }
	| { type: "subsection.completed"; subsectionId: string }
	| { type: "section.completed"; sectionId: string }
	| { type: "section.reset"; sectionId: string }
	| { type: "run.completed" };

export interface DialogueModel {
	invoke(input: string): Promise<unknown>;
	stream(input: string): Promise<AsyncIterable<unknown>> | AsyncIterable<unknown>;
	withStructuredOutput?<T extends Record<string, unknown>>(
		schema: unknown,
		config?: unknown,
	): {
		invoke(input: string): Promise<T>;
	};
}

export interface DialogueWorkflowInput {
	source: DialogueSource;
	targetLanguage?: "zh-CN";
}

export interface DialogueWorkflowDeps {
	model: DialogueModel;
	maxSectionRetries?: number;
	transcriptAccess?: {
		youtubeCookie?: string;
	};
}
