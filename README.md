# podcast-note

`podcast-note` 是一个面向长内容的对话笔记生成项目。

## 在线 Demo
[点击访问](https://podcast-note-web.dialoguelm.workers.dev/) （部署于 cloudfare worker，国内可能无法直接访问）
> 由于部署到 cloudfare worker 多次测试后触发了 IP 风控，时间有限没办法搭代理解决。  
> 所以临时在代码中将原先获取 youtube subtitle 的第三方库方案，改成了固定使用 [固定视频](https://www.youtube.com/watch?v=xRh2sVcNXQ8) 的字幕作为 mock 数据，除此之外的标题、正文等内容依然是通过 AI 接口实时生成的，非静态数据。

## 架构设计

项目是一个 `pnpm` workspace + `Turborepo` monorepo，主要分成两部分：

- `apps/web`: Next.js 前端，负责提交源内容、消费 SSE 流、维护生成状态并渲染 dialogue document。
- `apps/api`: Cloudflare Workers 风格的后端，负责拉取源文本、调用模型、执行 dialogue workflow，并把内部事件转换成前端可消费的数据流。

## `useDialogue` Hook 设计

`useDialogue` 是前端状态层的核心。它参考了 AI SDK `useChat` 的设计思路：一个 hook 对外暴露少量状态和动作，组件层不直接处理请求细节。

```ts
const {
  status,      // 当前生成状态
  title,       // 生成出的文章标题
  speakers,    // 识别出的说话人列表
  sections,    // 当前已生成的正文部分（heading 结构、对话内容等）
  error,       // 失败时的错误对象
  isLoading,   // 是否仍在生成中
  submit,      // 提交视频
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