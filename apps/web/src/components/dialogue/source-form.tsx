"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import type { SubmitDialogueInput } from "@/types/dialogue";

interface SourceFormProps {
  isLoading: boolean;
  onSubmit: (input: SubmitDialogueInput) => Promise<void>;
  onStop: () => void;
  onReset: () => void;
}

export function SourceForm({
  isLoading,
  onSubmit,
  onStop,
  onReset,
}: SourceFormProps) {
  const [url, setUrl] = useState(
    "https://www.youtube.com/watch?v=xRh2sVcNXQ8",
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({ source: { kind: "youtube", url }, targetLanguage: "zh-CN" });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[1.75rem] border border-stone-200 bg-[#fffaf0]/90 p-5 shadow-[0_24px_80px_rgba(69,52,31,0.12)]"
    >
      <label className="text-sm font-medium text-stone-800" htmlFor="source-url">
        YouTube 视频链接
      </label>
      <textarea
        id="source-url"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        className="mt-3 min-h-28 w-full resize-none rounded-2xl border border-stone-200 bg-white/80 p-4 text-sm leading-6 text-stone-800 outline-none ring-stone-900/10 transition focus:ring-4"
        placeholder="输入带字幕的 YouTube 链接"
      />
      <div className="mt-4 grid gap-3">
        <Button className="h-11 rounded-full" disabled={isLoading || url.trim().length === 0}>
          {isLoading ? "生成中..." : "生成中文对话文章"}
        </Button>
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            className="rounded-full bg-white/60"
            disabled={!isLoading}
            onClick={onStop}
          >
            停止
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="rounded-full"
            onClick={onReset}
          >
            重置
          </Button>
        </div>
      </div>
      <p className="mt-4 text-xs leading-5 text-stone-500">
        当前版本使用本地 mock 字幕，链接字段保留用于后续接入字幕 API。
      </p>
    </form>
  );
}
