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
    onStop();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-4xl gap-5 max-sm:gap-3"
    >
      <input
        id="source-url"
        type="url"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        disabled={isLoading}
        className="h-14 min-w-0 flex-1 border-2 border-[#252336] bg-white px-4 font-mono text-xl leading-none text-[#252336] outline-none transition placeholder:text-[#8b8995] disabled:cursor-not-allowed disabled:border-[#d2d0da] disabled:bg-[#f6f6f8] disabled:text-[#777583] max-md:h-12 max-md:px-3 max-md:text-base"
        placeholder="请输入 Youtube 视频链接"
      />
      {isLoading ? (
        <Button
          type="button"
          className="h-14 w-14 shrink-0 max-md:h-12 max-md:w-12"
          aria-label="终止生成"
          onClick={handleStop}
          onMouseDown={handleStop}
        >
          <span className="h-4 w-4 rounded-[2px] bg-current" />
        </Button>
      ) : (
        <Button
          className="h-14 w-28 shrink-0 text-base max-md:h-12 max-md:w-20 max-md:text-sm"
          disabled={url.trim().length === 0}
        >
          提交
        </Button>
      )}
    </form>
  );
}
