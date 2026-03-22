import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimelineNode } from "@/components/company/TimelineNode";

describe("TimelineNode", () => {
  it("renders signal node with emoji", () => {
    render(
      <TimelineNode type="signal" emoji="🚀" colour="#059669" x={100} y={50} label="Test" />
    );
    expect(screen.getByText("🚀")).toBeInTheDocument();
  });

  it("renders origin node larger than signal node", () => {
    const { container: originContainer } = render(
      <TimelineNode type="origin" emoji="🎯" colour="#059669" x={100} y={50} label="Test" />
    );
    const { container: signalContainer } = render(
      <TimelineNode type="signal" emoji="🚀" colour="#059669" x={200} y={50} label="Test" />
    );
    const originEl = originContainer.firstElementChild as HTMLElement;
    const signalEl = signalContainer.firstElementChild as HTMLElement;
    expect(parseInt(originEl.style.width)).toBeGreaterThan(parseInt(signalEl.style.width));
  });

  it("renders cadence node as plain dot without emoji", () => {
    const { container } = render(
      <TimelineNode type="cadence" colour="#999" x={100} y={50} label="Test" />
    );
    const dot = container.firstElementChild as HTMLElement;
    expect(dot.textContent).toBe("");
    expect(parseInt(dot.style.width)).toBe(8);
  });

  it("renders stale node with exclamation mark", () => {
    render(
      <TimelineNode type="stale" colour="#f59e0b" x={100} y={50} label="Test" monthsSinceLastSignal={7} />
    );
    expect(screen.getByText("!")).toBeInTheDocument();
    expect(screen.getByLabelText("No update for 7 months")).toBeInTheDocument();
  });

  it("calls onHover on interactive nodes", async () => {
    const onHover = vi.fn();
    render(
      <TimelineNode type="signal" emoji="🚀" colour="#059669" x={100} y={50} label="Test" onHover={onHover} />
    );
    await userEvent.hover(screen.getByText("🚀"));
    expect(onHover).toHaveBeenCalled();
  });

  it("does not fire hover on cadence nodes", () => {
    const { container } = render(
      <TimelineNode type="cadence" colour="#999" x={100} y={50} label="Test" />
    );
    const dot = container.firstElementChild as HTMLElement;
    expect(dot.getAttribute("onmouseenter")).toBeNull();
  });
});
