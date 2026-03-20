import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimelineNode } from "@/components/company/TimelineNode";

describe("TimelineNode", () => {
  const props = {
    emoji: "\u{1F680}",
    colour: "#059669",
    x: 100,
    y: 50,
    label: "Global Biosimilar Leadership",
    onHover: vi.fn(),
    onLeave: vi.fn(),
    onClick: vi.fn(),
  };

  it("renders the emoji", () => {
    render(<TimelineNode {...props} />);
    expect(screen.getByText("\u{1F680}")).toBeInTheDocument();
  });

  it("calls onHover on mouseenter", async () => {
    render(<TimelineNode {...props} />);
    await userEvent.hover(screen.getByText("\u{1F680}"));
    expect(props.onHover).toHaveBeenCalled();
  });

  it("calls onClick on click", async () => {
    render(<TimelineNode {...props} />);
    await userEvent.click(screen.getByText("\u{1F680}"));
    expect(props.onClick).toHaveBeenCalled();
  });
});
