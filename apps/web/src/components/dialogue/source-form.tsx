"use client";

import { FormEvent, MouseEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import type { SubmitDialogueInput } from "@/types/dialogue";

interface SourceFormProps {
  isLoading: boolean;
  onSubmit: (input: SubmitDialogueInput) => Promise<void>;
  onStop: () => void;
}

export function SourceForm({ isLoading, onSubmit, onStop }: SourceFormProps) {
  const [url, setUrl] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedUrl = url.trim();

    if (!trimmedUrl || isLoading) {
      return;
    }

    await onSubmit({
      source: { kind: "youtube", url: trimmedUrl },
      targetLanguage: "zh-CN",
    });
  }

  function handleStop(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    onStop();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-4xl items-start gap-5 max-sm:gap-3"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <input
          id="source-url"
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          disabled={isLoading}
          aria-describedby="source-url-note"
          className="h-14 min-w-0 w-full border-2 border-[#252336] bg-white px-4 font-mono text-xl leading-none text-[#252336] outline-none transition placeholder:text-[#8b8995] disabled:cursor-not-allowed disabled:border-[#d2d0da] disabled:bg-[#f6f6f8] disabled:text-[#777583] max-md:h-12 max-md:px-3 max-md:text-base"
          placeholder="请输入 Youtube 视频链接"
        />
        <div
          id="source-url-note"
          className="space-y-1 text-xs leading-5 text-[#8b8995] max-md:text-[11px]"
        >
          <p>由于部署后测试过程中触发了 Youtube 的风控，短时间内未能找到解决方案。</p>
          <p>
            因此目前代码临时改成了固定使用{" "}
            <a
              href="https://www.youtube.com/watch?v=xRh2sVcNXQ8"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 transition hover:text-[#5f5c6b]"
            >
              该 Youtube 视频
            </a>{" "}
            的字幕作为 mock 数据。除了字幕提取部分，其他产物依然是调用 AI
            接口实时生成的。
          </p>
        </div>
      </div>
      {isLoading ? (
        <Button
          key="stop"
          type="button"
          className="h-14 w-14 shrink-0 self-start max-md:h-12 max-md:w-12"
          aria-label="终止生成"
          onClick={handleStop}
        >
          <span className="h-4 w-4 rounded-[2px] bg-current" />
        </Button>
      ) : (
        <Button
          key="submit"
          type="submit"
          className="h-14 w-28 shrink-0 self-start text-base max-md:h-12 max-md:w-20 max-md:text-sm"
          disabled={url.trim().length === 0}
        >
          提交
        </Button>
      )}
    </form>
  );
}
