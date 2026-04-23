import { render, screen } from "@testing-library/react";

import { Button } from "./button";

describe("Button", () => {
  it("renders its label", () => {
    render(<Button>Generate notes</Button>);

    expect(screen.getByRole("button", { name: "Generate notes" })).toBeVisible();
  });
});
