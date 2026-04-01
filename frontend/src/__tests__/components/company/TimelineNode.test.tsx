import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimelineNode } from "@/components/company/TimelineNode";

describe("TimelineNode", () => {
  it("origin node renders filled circle, outer ring, and dashed tick with date label", () => {
    const { container } = render(
      <TimelineNode type="origin" x={80} y={80} colour="#059669" dateLabel="Oct 2023" tickHeight={20} />
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

  it("signal node renders smaller circle, dashed tick, and no label text", () => {
    const { container } = render(
      <TimelineNode type="signal" x={220} y={60} colour="#16a34a" label="🦅 FLY +3" tickHeight={20} />
    );
    const circles = container.querySelectorAll("circle");
    expect(circles).toHaveLength(2);
    // inner filled circle — r=2.5
    expect(circles[1].getAttribute("r")).toBe("2.5");
    // dashed tick
    const tick = container.querySelector("line");
    expect(tick!.getAttribute("stroke-dasharray")).toBe("2,3");
    // signal nodes render NO label (D-B1)
    expect(container.querySelector("text")).toBeNull();
  });

  it("latest signal node renders solid tick (no stroke-dasharray) and label", () => {
    const { container } = render(
      <TimelineNode type="latest" x={340} y={90} colour="#ca8a04" label="🚶 WALK +1" tickHeight={20} />
    );
    const circles = container.querySelectorAll("circle");
    const tick = container.querySelector("line");
    expect(tick).not.toBeNull();
    expect(tick!.getAttribute("stroke-dasharray")).toBeNull();
    // latest node retains label (D-B2)
    expect(screen.getByText("🚶 WALK +1")).toBeInTheDocument();
    // latest label fontSize=11
    const labelText = screen.getByText("🚶 WALK +1");
    expect(labelText.getAttribute("font-size")).toBe("11");
    // outer halo r=8, inner r=4
    expect(circles[0].getAttribute("r")).toBe("8");
    expect(circles[1].getAttribute("r")).toBe("4");
  });

  it("cadence node renders 2px dot only — no tick line, no label text", () => {
    const { container } = render(
      <TimelineNode type="cadence" x={150} y={80} colour="#475569" tickHeight={20} />
    );
    const circles = container.querySelectorAll("circle");
    expect(circles).toHaveLength(1);
    expect(circles[0].getAttribute("r")).toBe("2");
    expect(container.querySelector("line")).toBeNull();
    expect(container.querySelector("text")).toBeNull();
  });

  it("stale node renders outline circle with ! glyph and aria-label — no tick", () => {
    const { container } = render(
      <TimelineNode type="stale" x={530} y={175} colour="#f59e0b" tickHeight={20} monthsSinceLastSignal={7} />
    );
    const circle = container.querySelector("circle")!;
    expect(circle.getAttribute("fill")).toBe("none");
    expect(circle.getAttribute("stroke")).toBe("var(--exit-phased)");
    expect(screen.getByText("!")).toBeInTheDocument();
    expect(container.querySelector("line")).toBeNull();
    expect(screen.getByLabelText("No update for 7 months")).toBeInTheDocument();
    // radius updated to r=5
    expect(circle.getAttribute("r")).toBe("5");
  });

  it("fiscal-year-end node renders 3.5px amber dot — no tick", () => {
    const { container } = render(
      <TimelineNode type="fiscal-year-end" x={290} y={82} colour="#f59e0b" tickHeight={20} />
    );
    const circle = container.querySelector("circle")!;
    expect(circle.getAttribute("r")).toBe("3.5");
    expect(circle.getAttribute("fill")).toBe("var(--exit-phased)");
    expect(container.querySelector("line")).toBeNull();
  });

  it("terminal-proved node renders 12px circle, outer ring, solid tick, use icon, and PROVED label", () => {
    const { container } = render(
      <TimelineNode type="terminal-proved" x={400} y={60} colour="#059669" label="PROVED" tickHeight={20} />
    );
    const circles = container.querySelectorAll("circle");
    expect(circles).toHaveLength(2);
    // inner filled circle at 6px radius
    expect(circles[1].getAttribute("r")).toBe("6");
    expect(circles[1].getAttribute("fill")).toBe("#059669");
    // outer ring at 10px
    expect(circles[0].getAttribute("r")).toBe("10");
    // solid tick (no dash)
    const tick = container.querySelector("line");
    expect(tick).not.toBeNull();
    expect(tick!.getAttribute("stroke-dasharray")).toBeNull();
    // PROVED label
    expect(screen.getByText("PROVED")).toBeInTheDocument();
    // SVG use element with icon-proved href (emoji replaced by SVG symbol)
    expect(container.querySelector('use[href="#icon-proved"]')).not.toBeNull();
  });

  it("terminal-buried node renders 12px circle, outer ring, solid tick, use icon, and exit manner label", () => {
    const { container } = render(
      <TimelineNode type="terminal-buried" x={400} y={300} colour="#78716c" label="SILENT DROP" tickHeight={20} />
    );
    const circles = container.querySelectorAll("circle");
    expect(circles).toHaveLength(2);
    expect(circles[1].getAttribute("r")).toBe("6");
    expect(circles[1].getAttribute("fill")).toBe("#78716c");
    expect(circles[0].getAttribute("r")).toBe("10");
    const tick = container.querySelector("line");
    expect(tick).not.toBeNull();
    expect(tick!.getAttribute("stroke-dasharray")).toBeNull();
    expect(screen.getByText("SILENT DROP")).toBeInTheDocument();
    // SVG use element with icon-buried href (emoji replaced by SVG symbol)
    expect(container.querySelector('use[href="#icon-buried"]')).not.toBeNull();
  });

  it("larger tickHeight produces taller tick than smaller tickHeight (lower y2 in SVG coords)", () => {
    const { container: shortContainer } = render(
      <TimelineNode type="latest" x={100} y={100} colour="#059669" label="🦅 FLY +3" tickHeight={20} />
    );
    const { container: tallContainer } = render(
      <TimelineNode type="latest" x={100} y={100} colour="#059669" label="🦅 FLY +3" tickHeight={56} />
    );
    const shortTick = shortContainer.querySelector("line")!;
    const tallTick = tallContainer.querySelector("line")!;
    const shortY2 = parseFloat(shortTick.getAttribute("y2")!);
    const tallY2 = parseFloat(tallTick.getAttribute("y2")!);
    expect(tallY2).toBeLessThan(shortY2);
  });
});
