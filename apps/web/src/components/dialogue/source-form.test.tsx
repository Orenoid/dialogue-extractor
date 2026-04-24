import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { SourceForm } from "./source-form";

describe("SourceForm", () => {
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
