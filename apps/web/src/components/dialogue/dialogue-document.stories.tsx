import type { Meta, StoryObj } from "@storybook/nextjs";

import type { DialogueSection, DialogueSpeaker } from "@/types/dialogue";

import { DialogueDocument } from "./dialogue-document";

const speakers: DialogueSpeaker[] = [
  { id: "host", name: "主持人" },
  { id: "guest", name: "嘉宾" },
  { id: "narrator", name: "旁白" },
];

const singleSectionSections: DialogueSection[] = [
  {
    id: "section-intro",
    chunkIndex: 0,
    heading: "开场与背景",
    status: "completed",
    subsections: [
      {
        id: "subsection-context",
        heading: "为什么开始做这个项目",
        status: "completed",
        turns: [
          {
            id: "turn-1",
            speakerId: "host",
            text: "今天我们想聊的是，为什么一个看上去很小的需求，往往会牵出整个工作流的问题。",
            status: "completed",
          },
          {
            id: "turn-2",
            speakerId: "guest",
            text: "因为需求只是表层，真正决定复杂度的通常是协作方式、反馈速度和系统边界。",
            status: "completed",
          },
        ],
      },
    ],
  },
];

const fullDocumentSections: DialogueSection[] = [
  ...singleSectionSections,
  {
    id: "section-method",
    chunkIndex: 1,
    heading: "方法与取舍",
    status: "completed",
    subsections: [
      {
        id: "subsection-loop",
        heading: "先把反馈回路缩短",
        status: "completed",
        turns: [
          {
            id: "turn-3",
            speakerId: "guest",
            text: "我们先不追求一次把架构做漂亮，而是先确保每个环节都可以被快速验证。",
            status: "completed",
          },
          {
            id: "turn-4",
            speakerId: "host",
            text: "也就是说，优先把从输入到结果的那条主路径跑通，再去处理抽象和复用。",
            status: "completed",
          },
        ],
      },
      {
        id: "subsection-tradeoff",
        heading: "什么时候值得抽组件",
        status: "completed",
        turns: [
          {
            id: "turn-5",
            speakerId: "guest",
            text: "当一段 UI 已经脱离当前页面语义，或者确实需要独立测试和复用时，再抽离更合适。",
            status: "completed",
          },
          {
            id: "turn-6",
            speakerId: "narrator",
            text: "团队最终决定把真正复用的部分留下，把只服务于入口页的壳层移回页面本身。",
            status: "completed",
          },
        ],
      },
    ],
  },
  {
    id: "section-close",
    chunkIndex: 2,
    heading: "结论",
    status: "completed",
    subsections: [
      {
        id: "subsection-summary",
        heading: "把复杂度放在真正需要的地方",
        status: "completed",
        turns: [
          {
            id: "turn-7",
            speakerId: "host",
            text: "如果一个抽象既不提升复用，也不减少认知负担，那它很可能只是多了一层跳转。",
            status: "completed",
          },
          {
            id: "turn-8",
            speakerId: "guest",
            text: "更好的做法通常是把公共部分抽出来，把页面特有的编排留在页面层。",
            status: "completed",
          },
        ],
      },
    ],
  },
];

const streamingSections: DialogueSection[] = [
  {
    id: "section-live",
    chunkIndex: 0,
    heading: "正在生成中的章节",
    status: "streaming",
    subsections: [
      {
        id: "subsection-live",
        heading: "流式输出片段",
        status: "streaming",
        turns: [
          {
            id: "turn-9",
            speakerId: "host",
            text: "如果现在是流式生成阶段，界面应该让人明显感觉到内容还没有结束",
            status: "streaming",
          },
          {
            id: "turn-10",
            speakerId: "guest",
            text: "所以最后一段文本后面会保留一个正在闪动的光标，提示还在继续输出。",
            status: "completed",
          },
        ],
      },
    ],
  },
];

const meta = {
  title: "Dialogue/DialogueDocument",
  component: DialogueDocument,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    speakers,
    sections: fullDocumentSections,
  },
  render: (args) => (
    <main className="min-h-screen bg-white px-4 py-14 text-[#252336] md:px-10 lg:px-24">
      <DialogueDocument {...args} />
    </main>
  ),
} satisfies Meta<typeof DialogueDocument>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FullDocument: Story = {};

export const SingleSection: Story = {
  args: {
    sections: singleSectionSections,
  },
};

export const Streaming: Story = {
  args: {
    sections: streamingSections,
  },
};
