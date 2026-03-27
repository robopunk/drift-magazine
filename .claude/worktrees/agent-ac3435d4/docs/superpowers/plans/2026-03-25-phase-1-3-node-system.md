# Phase 1.3 — Node System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `TimelineNode` from DOM `<div>` elements to pure SVG `<g>` elements, implementing 6 node types with always-visible labels for informational nodes and silent rhythm nodes.

**Architecture:** `TimelineNode` returns an SVG `<g>` element. All nodes render inside the `<svg>` body in `TimelineCanvas`, eliminating the DOM+SVG hybrid. A new `stackIndex` prop drives alternating tick heights to prevent label collision when multiple objectives are shown.

**Tech Stack:** React, TypeScript, SVG, Vitest + React Testing Library

---

## File map

| File | Change |
|---|---|
| `frontend/src/lib/types.ts` | Add `"latest"` to `TimelineNodeType` union |
| `frontend/src/__tests__/components/company/TimelineNode.test.tsx` | Full rewrite — SVG assertions replacing DOM assertions |
| `frontend/src/components/company/TimelineNode.tsx` | Full rewrite — SVG `<g>` output, 6 node types |
| `frontend/src/components/company/TimelineCanvas.tsx` | Move node render inside `<svg>`, add `stackIndex`, drive `"latest"` type |

---

## Task 1: Add "latest" to TimelineNodeType

**Files:**
- Modify: `frontend/src/lib/types.ts:16`

- [ ] **Step 1: Update the type union**

Open `frontend/src/lib/types.ts`. Find line 16:

```ts
export type TimelineNodeType = "origin" | "signal" | "cadence" | "stale" | "fiscal-year-end";
```

Change to:

```ts
export type TimelineNodeType = "origin" | "signal" | "latest" | "cadence" | "stale" | "fiscal-year-end";
```

- [ ] **Step 2: Verify TypeScript still compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors (no code yet uses `"latest"` so no exhaustiveness checks break).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/types.ts
git commit -m "feat(types): add 'latest' to TimelineNodeType"
```

---

## Task 2: Rewrite TimelineNode tests (failing first)

**Files:**
- Modify: `frontend/src/__tests__/components/company/TimelineNode.test.tsx`

- [ ] **Step 1: Replace the entire test file with SVG-based tests**

```tsx
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
```

- [ ] **Step 2: Run tests and confirm all 7 new tests fail**

```bash
cd frontend && npx vitest run src/__tests__/components/company/TimelineNode.test.tsx
```

Expected: 7 FAIL (the current DOM-based component returns `<div>` elements, not SVG circles or lines).

---

## Task 3: Rewrite TimelineNode.tsx as SVG component

**Files:**
- Modify: `frontend/src/components/company/TimelineNode.tsx`

- [ ] **Step 1: Replace the entire component file**

```tsx
"use client";

import type { TimelineNodeType } from "@/lib/types";

interface TimelineNodeProps {
  type: TimelineNodeType;
  x: number;
  y: number;
  colour: string;
  /** Stage emoji + text shown above signal/latest nodes. e.g. "🦅 FLY +3" */
  label?: string;
  /** Formatted date shown above origin nodes. e.g. "Oct 2023" */
  dateLabel?: string;
  /** 0-based index of this objective among visible objectives. Drives tick height stagger. */
  stackIndex: number;
  monthsSinceLastSignal?: number;
  onHover?: (e: React.MouseEvent<SVGGElement>) => void;
  onLeave?: () => void;
  onClick?: () => void;
}

export function TimelineNode({
  type,
  x,
  y,
  colour,
  label,
  dateLabel,
  stackIndex,
  monthsSinceLastSignal,
  onHover,
  onLeave,
  onClick,
}: TimelineNodeProps) {
  // Even stackIndex = shorter tick; odd = taller (alternating prevents label collision)
  const originTickH = stackIndex % 2 === 0 ? 24 : 40;
  const signalTickH = stackIndex % 2 === 0 ? 20 : 36;

  if (type === "cadence") {
    return (
      <g>
        <circle cx={x} cy={y} r={2} fill="var(--border)" />
      </g>
    );
  }

  if (type === "stale") {
    return (
      <g
        aria-label={`No update for ${monthsSinceLastSignal ?? "?"} months`}
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
      >
        <circle cx={x} cy={y} r={4.5} fill="none" stroke="#f59e0b" strokeWidth={1.5} />
        <text
          x={x}
          y={y}
          fontSize={7}
          fill="#f59e0b"
          textAnchor="middle"
          dominantBaseline="central"
          fontWeight="bold"
        >
          !
        </text>
      </g>
    );
  }

  if (type === "fiscal-year-end") {
    return (
      <g onMouseEnter={onHover} onMouseLeave={onLeave}>
        <circle cx={x} cy={y} r={3.5} fill="#f59e0b" opacity={0.85} />
      </g>
    );
  }

  if (type === "origin") {
    const tickTopY = y - originTickH;
    return (
      <g
        aria-label={dateLabel}
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
        onClick={onClick}
        style={onClick ? { cursor: "pointer" } : undefined}
      >
        <circle cx={x} cy={y} r={9} fill={colour} fillOpacity={0.20} />
        <circle cx={x} cy={y} r={5} fill={colour} />
        <line
          x1={x}
          y1={y - 9}
          x2={x}
          y2={tickTopY}
          stroke="var(--border)"
          strokeWidth={1}
          strokeDasharray="2,3"
          opacity={0.5}
        />
        {dateLabel && (
          <text
            x={x}
            y={tickTopY - 4}
            fontSize={8}
            fill="var(--muted-foreground)"
            textAnchor="middle"
            fontFamily="var(--font-ibm-plex-mono)"
          >
            {dateLabel}
          </text>
        )}
      </g>
    );
  }

  // signal or latest
  const isLatest = type === "latest";
  const tickTopY = y - signalTickH;

  return (
    <g
      aria-label={label}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
      style={onClick ? { cursor: "pointer" } : undefined}
    >
      <circle cx={x} cy={y} r={6} fill={colour} fillOpacity={0.30} />
      <circle cx={x} cy={y} r={3} fill={colour} />
      <line
        x1={x}
        y1={y - 6}
        x2={x}
        y2={tickTopY}
        stroke={isLatest ? "var(--foreground)" : "var(--border)"}
        strokeWidth={isLatest ? 1.5 : 1}
        {...(!isLatest && { strokeDasharray: "2,3" })}
        opacity={isLatest ? 0.95 : 0.5}
      />
      {label && (
        <text
          x={x}
          y={tickTopY - 4}
          fontSize={isLatest ? 9.5 : 9}
          fill={isLatest ? "var(--foreground)" : "var(--muted-foreground)"}
          textAnchor="middle"
          fontFamily="var(--font-ibm-plex-mono)"
          fontWeight={isLatest ? "bold" : undefined}
        >
          {label}
        </text>
      )}
    </g>
  );
}
```

- [ ] **Step 2: Run the 7 TimelineNode tests and confirm they all pass**

```bash
cd frontend && npx vitest run src/__tests__/components/company/TimelineNode.test.tsx
```

Expected: 7 PASS.

- [ ] **Step 3: Run the full test suite and confirm no regressions**

```bash
cd frontend && npx vitest run
```

Expected: all tests pass (the canvas tests may fail — that is expected and will be fixed in Task 4 if so; check and note which ones fail).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/company/TimelineNode.tsx frontend/src/__tests__/components/company/TimelineNode.test.tsx
git commit -m "feat(TimelineNode): migrate to SVG <g> elements with tick labels and stackIndex stagger"
```

---

## Task 4: Update TimelineCanvas to render nodes inside SVG

**Files:**
- Modify: `frontend/src/components/company/TimelineCanvas.tsx:449-519`

The current code renders nodes as DOM `<div>` elements *outside* the `<svg>` tag (lines 449–519). This task moves that block inside `<svg>`, updates prop names to match the new `TimelineNode` interface, and computes `stackIndex`.

- [ ] **Step 1: Locate the two blocks to merge**

In `TimelineCanvas.tsx`, find:

```tsx
              </svg>

              {/* DOM nodes for selected objectives */}
              {objectiveNodeSets.map(({ objective, nodes, latestSignalIdx }) => {
                const colour = colourMap.get(objective.id) ?? "#999";
                const dimmed = hoveredId !== null && hoveredId !== objective.id;
                return (
                  <div
                    key={objective.id}
                    style={{ opacity: dimmed ? 0.25 : 1, transition: "opacity 200ms" }}
                  >
                    {nodes.map((node, i) => {
                      ...
                      return (
                        <TimelineNode
                          ...
                          emoji={...}
                          isLatestSignal={i === latestSignalIdx}
                          ...
                        />
                      );
                    })}
                  </div>
                );
              })}
```

- [ ] **Step 2: Replace the DOM node block**

Remove the entire `{/* DOM nodes for selected objectives */}` block (everything from `</svg>` to the matching closing `})}` after the div). Then reopen `<svg>` before it and replace with:

The paths block already ends with `</svg>`. Re-open the `<svg>` is not the right approach — instead, move the node render block *inside* the existing `<svg>`.

Locate the exact closing `</svg>` tag that ends the paths block (currently line 447). Move all node rendering before that `</svg>`. The result should look like:

```tsx
                {/* Paths for selected objectives */}
                {objectiveNodeSets.map(({ objective, nodes }) => {
                  const colour = colourMap.get(objective.id) ?? "#999";
                  const points = nodes.map((n) => ({ x: n.x, y: n.y }));
                  const isBelowGround = objective.momentum_score <= 0;
                  const dimmed = hoveredId !== null && hoveredId !== objective.id;
                  return (
                    <g key={objective.id} opacity={dimmed ? 0.25 : 1} style={{ transition: "opacity 200ms" }}>
                      <TimelinePath points={points} colour={colour} isBelowGround={isBelowGround} groundY={GROUND_Y} id={objective.id} />
                    </g>
                  );
                })}

                {/* SVG nodes for selected objectives */}
                {objectiveNodeSets.map(({ objective, nodes, latestSignalIdx }, objIdx) => {
                  const colour = colourMap.get(objective.id) ?? "#999";
                  const dimmed = hoveredId !== null && hoveredId !== objective.id;
                  return (
                    <g
                      key={objective.id}
                      opacity={dimmed ? 0.25 : 1}
                      style={{ transition: "opacity 200ms" }}
                    >
                      {nodes.map((node, i) => {
                        const stageInfo = getStage(scoreToStage(node.score));
                        const nodeColour =
                          node.type === "fiscal-year-end" && !node.isFiscalYearEnd
                            ? "#f59e0b"
                            : colour;
                        const effectiveType =
                          node.type === "signal" && i === latestSignalIdx ? "latest" : node.type;
                        const stageLabel =
                          node.type !== "cadence" && node.type !== "stale" && node.type !== "origin"
                            ? `${stageInfo.emoji} ${stageInfo.label.toUpperCase()} ${node.score >= 0 ? "+" : ""}${node.score}`
                            : undefined;
                        const dateLabel =
                          node.type === "origin" && objective.first_stated_date
                            ? new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(
                                new Date(objective.first_stated_date)
                              )
                            : undefined;
                        return (
                          <TimelineNode
                            key={`${objective.id}-${i}`}
                            type={effectiveType}
                            x={node.x}
                            y={node.y}
                            colour={nodeColour}
                            label={stageLabel}
                            dateLabel={dateLabel}
                            stackIndex={objIdx}
                            monthsSinceLastSignal={node.monthsSinceLastSignal}
                            onHover={
                              node.type === "cadence" ||
                              (node.type === "fiscal-year-end" && !node.signal)
                                ? undefined
                                : (e: React.MouseEvent<SVGGElement>) => {
                                    setHoveredId(objective.id);
                                    const rect = (e.currentTarget as Element).getBoundingClientRect();
                                    setTooltip({
                                      objectiveId: objective.id,
                                      viewportX: rect.right,
                                      viewportY: rect.top,
                                      signal:
                                        node.type === "signal" ? node.signal : undefined,
                                      originalQuote:
                                        node.type === "origin"
                                          ? objective.original_quote ?? undefined
                                          : undefined,
                                      firstStatedDate:
                                        node.type === "origin"
                                          ? objective.first_stated_date ?? undefined
                                          : undefined,
                                      nodeScore: node.score,
                                      staleInfo:
                                        node.type === "stale"
                                          ? {
                                              lastSignalDate: (() => {
                                                const objSignals = signalsByObjective.get(objective.id);
                                                return (
                                                  objSignals?.[objSignals.length - 1]?.signal_date ??
                                                  "Unknown"
                                                );
                                              })(),
                                              monthsSilent: node.monthsSinceLastSignal ?? 0,
                                            }
                                          : null,
                                    });
                                  }
                            }
                            onLeave={
                              node.type === "cadence" ||
                              (node.type === "fiscal-year-end" && !node.signal)
                                ? undefined
                                : () => {
                                    setHoveredId(null);
                                    setTooltip(null);
                                  }
                            }
                            onClick={
                              effectiveType === "origin" || effectiveType === "signal" || effectiveType === "latest"
                                ? () => onNavigateToEvidence()
                                : undefined
                            }
                          />
                        );
                      })}
                    </g>
                  );
                })}

              </svg>
```

Note: the old `DOM nodes` block that was outside `</svg>` is gone entirely. The `</svg>` tag now comes after this new block.

- [ ] **Step 3: Verify TypeScript compiles with no errors**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Run the full test suite**

```bash
cd frontend && npx vitest run
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/company/TimelineCanvas.tsx
git commit -m "feat(TimelineCanvas): move nodes inside SVG, add stackIndex, drive latest type"
```

---

## Task 5: Update roadmap doc and push

**Files:**
- Modify: `2026-03-25-2121-drift-visual-and-intelligence-roadmap.md`

- [ ] **Step 1: Update Phase 1.3 status to Delivered**

In `2026-03-25-2121-drift-visual-and-intelligence-roadmap.md`, find:

```markdown
| 1.3 | Nodes — bold markers on line, vertical tick + stage label above | `TimelineNode.tsx`, `TimelineCanvas.tsx` | ⬜ Pending |
```

Change to:

```markdown
| 1.3 | Nodes — bold markers on line, vertical tick + stage label above | `TimelineNode.tsx`, `TimelineCanvas.tsx` | ✅ Delivered |
```

Also append to the Delivery log table:

```markdown
| 2026-03-25 | 1.3 | SVG node migration, 6 types, stackIndex tick stagger, always-visible labels |
```

- [ ] **Step 2: Commit and push**

```bash
git add "2026-03-25-2121-drift-visual-and-intelligence-roadmap.md"
git commit -m "docs(roadmap): mark Phase 1.3 delivered"
git push
```
