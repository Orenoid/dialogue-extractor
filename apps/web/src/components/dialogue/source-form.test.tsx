import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { SourceForm } from "./source-form";

describe("SourceForm", () => {
  it("renders the mock transcript note below the input", () => {
    render(
      <SourceForm isLoading={false} onSubmit={vi.fn()} onStop={() => undefined} />,
    );

    expect(
      screen.getByText("由于部署后测试过程中触发了 Youtube 的风控，短时间内未能找到解决方案。"),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "该 Youtube 视频" }),
    ).toHaveAttribute("href", "https://www.youtube.com/watch?v=xRh2sVcNXQ8");
  });

  it("submits the trimmed youtube url", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <SourceForm isLoading={false} onSubmit={onSubmit} onStop={() => undefined} />,
    );

    await user.type(
      screen.getByRole("textbox"),
      " https://www.youtube.com/watch?v=abc123 ",
    );
    await user.click(screen.getByRole("button", { name: "提交" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      source: { kind: "youtube", url: "https://www.youtube.com/watch?v=abc123" },
      targetLanguage: "zh-CN",
    });
  });

  it("stops generation without triggering a follow-up submit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onStop = vi.fn();

    function Harness() {
      const [isLoading, setIsLoading] = useState(false);

      return (
        <SourceForm
          isLoading={isLoading}
          onSubmit={async (input) => {
            onSubmit(input);
            setIsLoading(true);
          }}
          onStop={() => {
            onStop();
            setIsLoading(false);
          }}
        />
      );
    }

    render(<Harness />);

    await user.type(screen.getByRole("textbox"), "https://www.youtube.com/watch?v=abc123");
    await user.click(screen.getByRole("button", { name: "提交" }));
    await user.click(screen.getByRole("button", { name: "终止生成" }));

    expect(onStop).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "提交" })).toBeVisible();
  });
});
