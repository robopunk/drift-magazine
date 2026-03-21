import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TimelineTooltip } from "@/components/company/TimelineTooltip";

describe("TimelineTooltip", () => {
  const baseProps = {
    objectiveName: "Global Biosimilar Leadership",
    stage: "fly" as const,
    latestSignalText: "Revenue exceeded expectations",
    latestSignalSource: "Annual Report",
    latestSignalDate: "2026-01-15",
    viewportX: 200,
    viewportY: 300,
  };

  it("renders via portal into document.body", () => {
    const { container } = render(<TimelineTooltip {...baseProps} />);
    // The tooltip should NOT be inside the render container
    expect(container.querySelector("[data-tooltip]")).toBeNull();
    // It should be in document.body
    const tooltip = document.body.querySelector("[data-tooltip]");
    expect(tooltip).not.toBeNull();
  });

  it("displays the objective name", () => {
    render(<TimelineTooltip {...baseProps} />);
    expect(screen.getByText("Global Biosimilar Leadership")).toBeInTheDocument();
  });

  it("displays latest signal text when provided", () => {
    render(<TimelineTooltip {...baseProps} />);
    expect(screen.getByText(/Revenue exceeded expectations/)).toBeInTheDocument();
  });

  it("renders without signal text when null", () => {
    render(<TimelineTooltip {...baseProps} latestSignalText={null} latestSignalSource={null} latestSignalDate={null} />);
    expect(screen.getByText("Global Biosimilar Leadership")).toBeInTheDocument();
    expect(screen.queryByText(/Revenue/)).toBeNull();
  });

  it("uses position: fixed styling", () => {
    render(<TimelineTooltip {...baseProps} />);
    const tooltip = document.body.querySelector("[data-tooltip]") as HTMLElement;
    expect(tooltip.style.position).toBe("fixed");
  });

  it("flips tooltip to the left when near right viewport edge", () => {
    Object.defineProperty(window, "innerWidth", { value: 400, writable: true });
    render(<TimelineTooltip {...baseProps} viewportX={350} viewportY={100} />);
    const tooltip = document.body.querySelector("[data-tooltip]") as HTMLElement;
    const left = parseFloat(tooltip.style.left);
    expect(left).toBeLessThan(350);
  });
});
