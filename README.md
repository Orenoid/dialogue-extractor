# podcast-note

`podcast-note` 是一个面向长内容的对话笔记生成项目。

## 架构设计

项目是一个 `pnpm` workspace + `Turborepo` monorepo，主要分成两部分：

- `apps/web`: Next.js 前端，负责提交源内容、消费 SSE 流、维护生成状态并渲染 dialogue document。
- `apps/api`: Cloudflare Workers 风格的后端，负责拉取源文本、调用模型、执行 dialogue workflow，并把内部事件转换成前端可消费的数据流。

整体上，系统采用“后端工作流产生日志事件，前端按事件增量还原最终文档”的设计。这样可以避免等待整篇内容生成完成后再一次性返回，也让前端可以天然支持中断、重试和渐进展示。

## `useDialogue` Hook 设计

`useDialogue` 是前端状态层的核心。它参考了 AI SDK `useChat` 的设计思路：一个 hook 对外暴露少量状态和动作，组件层不直接处理请求细节。

```ts
const {
  status,      // 当前生成状态
  title,       // 生成出的文章标题
  speakers,    // 识别出的说话人列表
  sections,    // 当前已生成的 section/subsection/turn 树
  error,       // 失败时的错误对象
  isLoading,   // 是否仍在生成中
  submit,      // 发起一次新的生成请求
  stop,        // 中断当前生成
  reset,       // 清空本地状态
} = useDialogue();
```

它的简洁性在于：请求发起、SSE 解析、增量状态合并和中断控制都封装在 hook 内部，UI 层只需要根据 `status`、`title`、`sections` 这些状态去做渲染逻辑即可，例如当后端完成标题提取/翻译时，title 就会自动从 null 变为 string，并映射到 UI 上。

## Workflow Graph

```text
+-------------+
|   START     |
+------+------+
       |
       v
+------------------+
|   fetchSource    |
+------+-----------+
       |
       +-------------------+-------------------+
       |                   |                   |
       v                   v                   v
+--------------+   +---------------+   +-----------------+
| generateTitle|   |identifySpeakers|  | chunkTranscript |
+------+-------+   +--------+------+   +--------+--------+
       |                   |                   |
       |                   +---------+---------+
       |                             |
       |                             v
       |                 +-----------------------+
       |                 | for each chunk in seq |
       |                 +-----------+-----------+
       |                             |
       |                             v
       |                 +-----------------------+
       |                 | streamSectionDialogue |
       |                 +-----------+-----------+
       |                             |
       |                  valid      | invalid
       |                             v
       |                 +-----------------------+
       |                 |     section.reset     |
       |                 +-----------+-----------+
       |                             |
       |                             v
       |                 +-----------------------+
       |                 | retry same chunk      |
       |                 +-----------------------+
       |
       +-----------------------------+
                                     |
                                     v
                         +-----------------------+
                         | wait title task done  |
                         +-----------+-----------+
                                     |
                                     v
                         +-----------------------+
                         | GraphEvent stream     |
                         | unified event bus     |
                         +-----------+-----------+
                                     |
                                     v
                         +-----------------------+
                         | createDialogue        |
                         | StreamResponse        |
                         +-----------+-----------+
                                     |
                                     v
                         +-----------------------+
                         | SSE to frontend       |
                         | data: {...}           |
                         +-----------+-----------+
                                     |
                                     v
                               +-----------+
                               |    END    |
                               +-----------+
```

后端采用 workflow + agent 节点的设计，通过一个稳定的工作流，并行+串行相结合，使用 agent 提取结构化信息，最终聚合转换为 sse event 推送给前端

## 输入源抽象层

虽然目前只支持了 Youtube 视频，但在输入源上做了一层抽象，未来还可以接入 bilibili、纯文本文章等其他输入源

```ts
export interface SourceFetcher {
	metadata(): Record<string, unknown>;
	transcript(): string;
}
```