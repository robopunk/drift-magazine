import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimelineNode } from "@/components/company/TimelineNode";

describe("TimelineNode", () => {
  it("origin node renders filled circle, outer ring, and dashed tick with date label", () => {
    const { container } = render(
      <TimelineNode type="origin" x={80} y={80} colour="#059669" dateLabel="Oct 2023" stackIndex={0} />
    );
    const circles = container.querySelectorAll("circle");
    expect(circles).toHaveLength(2);
    // inner filled circle
    expect(circles[1].getAttribute("r")).toBe("5");
    expect(circles[1].getAttribute("fill")).toBe("#059669");
    // dashed tick
    const tick = container.querySelector("line");
    expect(tick).not.toBeNull();
    expect(tick!.getAttribute("stroke-dasharray")).toBe("2,3");
    // date label text
    expect(screen.getByText("Oct 2023")).toBeInTheDocument();
  });

  it("signal node renders smaller circle, pulse ring, dashed tick, and stage label", () => {
    const { container } = render(
      <TimelineNode type="signal" x={220} y={60} colour="#16a34a" label="🦅 FLY +3" stackIndex={0} />
    );
    const circles = container.querySelectorAll("circle");
    expect(circles).toHaveLength(2);
    // inner filled circle
    expect(circles[1].getAttribute("r")).toBe("3");
    // dashed tick
    const tick = container.querySelector("line");
    expect(tick!.getAttribute("stroke-dasharray")).toBe("2,3");
    // stage label text
    expect(screen.getByText("🦅 FLY +3")).toBeInTheDocument();
  });

  it("latest signal node renders solid tick (no stroke-dasharray) and label", () => {
    const { container } = render(
      <TimelineNode type="latest" x={340} y={90} colour="#ca8a04" label="🚶 WALK +1" stackIndex={0} />
    );
    const tick = container.querySelector("line");
    expect(tick).not.toBeNull();
    expect(tick!.getAttribute("stroke-dasharray")).toBeNull();
    expect(screen.getByText("🚶 WALK +1")).toBeInTheDocument();
  });

  it("cadence node renders 2px dot only — no tick line, no label text", () => {
    const { container } = render(
      <TimelineNode type="cadence" x={150} y={80} colour="#475569" stackIndex={0} />
    );
    const circles = container.querySelectorAll("circle");
    expect(circles).toHaveLength(1);
    expect(circles[0].getAttribute("r")).toBe("2");
    expect(container.querySelector("line")).toBeNull();
    expect(container.querySelector("text")).toBeNull();
  });

  it("stale node renders outline circle with ! glyph and aria-label — no tick", () => {
    const { container } = render(
      <TimelineNode type="stale" x={530} y={175} colour="#f59e0b" stackIndex={0} monthsSinceLastSignal={7} />
    );
    const circle = container.querySelector("circle")!;
    expect(circle.getAttribute("fill")).toBe("none");
    expect(circle.getAttribute("stroke")).toBe("#f59e0b");
    expect(screen.getByText("!")).toBeInTheDocument();
    expect(container.querySelector("line")).toBeNull();
    expect(screen.getByLabelText("No update for 7 months")).toBeInTheDocument();
  });

  it("fiscal-year-end node renders 3.5px amber dot — no tick", () => {
    const { container } = render(
      <TimelineNode type="fiscal-year-end" x={290} y={82} colour="#f59e0b" stackIndex={0} />
    );
    const circle = container.querySelector("circle")!;
    expect(circle.getAttribute("r")).toBe("3.5");
    expect(circle.getAttribute("fill")).toBe("#f59e0b");
    expect(container.querySelector("line")).toBeNull();
  });

  it("odd stackIndex produces taller tick than even stackIndex (lower y2 in SVG coords)", () => {
    const { container: evenContainer } = render(
      <TimelineNode type="signal" x={100} y={100} colour="#059669" label="🦅 FLY +3" stackIndex={0} />
    );
    const { container: oddContainer } = render(
      <TimelineNode type="signal" x={100} y={100} colour="#059669" label="🦅 FLY +3" stackIndex={1} />
    );
    const evenTick = evenContainer.querySelector("line")!;
    const oddTick = oddContainer.querySelector("line")!;
    const evenY2 = parseFloat(evenTick.getAttribute("y2")!);
    const oddY2 = parseFloat(oddTick.getAttribute("y2")!);
    // Odd stack = taller tick = lower y2 value (further up in SVG space, y grows downward)
    expect(oddY2).toBeLessThan(evenY2);
  });
});
