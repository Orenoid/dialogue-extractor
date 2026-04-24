import type { Meta, StoryObj } from "@storybook/nextjs";

import { DialogueStatusNotice } from "./dialogue-status-notice";

const meta = {
  title: "Dialogue/DialogueStatusNotice",
  component: DialogueStatusNotice,
  args: {
    status: "submitting",
    isLoading: true,
  },
} satisfies Meta<typeof DialogueStatusNotice>;

export default meta;

type Story = StoryObj<typeof meta>;

export const IdleHidden: Story = {
  name: "Idle",
  args: {
    status: "idle",
    isLoading: false,
  },
};

export const Submitting: Story = {};

export const AwaitingTitle: Story = {
  args: {
    status: "awaitingTitle",
    isLoading: true,
  },
};

export const StreamingDialogue: Story = {
  args: {
    status: "streamingDialogue",
    isLoading: true,
  },
};

export const Completed: Story = {
  args: {
    status: "completed",
    isLoading: false,
  },
};

export const Error: Story = {
  args: {
    status: "error",
    isLoading: false,
    errorMessage: "API 请求超时，请重试。",
  },
};

export const Aborted: Story = {
  args: {
    status: "aborted",
    isLoading: false,
  },
};
