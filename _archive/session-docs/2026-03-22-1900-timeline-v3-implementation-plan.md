# Timeline v3 Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the interactive timeline canvas with a monthly cadence node model, improved layout, connected hover highlighting, and horizontal scroll replacing panzoom.

**Architecture:** Incremental refactor of the existing TimelineCanvas component tree. The core change is a new `generateMonthlyNodes()` function that produces typed nodes (origin, signal, cadence, stale) from raw signals, with linear interpolation between signal nodes. The panzoom library is removed in favour of native horizontal overflow scroll with pinned stage labels. Hover state is extended to drive opacity dimming across all objective groups.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Vitest + React Testing Library

**Spec:** `docs/specs/2026-03-22-timeline-v3-redesign.md`

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `frontend/src/lib/types.ts` | Shared TypeScript types | Add `"resurrected"` to ExitManner, add `TimelineNodeType` and `TimelineMonthNode` |
| `frontend/src/lib/timeline-nodes.ts` | **New** — Monthly node generation + interpolation | Pure function: signals in → `TimelineMonthNode[]` out |
| `frontend/src/components/company/TimelineNode.tsx` | Render a single node | Refactor to support 4 node types with different sizes/styles/interactivity |
| `frontend/src/components/company/TimelinePath.tsx` | SVG trajectory path | Minor — receives interpolated points, no logic change |
| `frontend/src/components/company/TimelineLegend.tsx` | Objective selector sidebar | Polish: contrast, strikethrough removal, section headers, hover callback |
| `frontend/src/components/company/TimelineTooltip.tsx` | Portal tooltip | Add stale warning tooltip variant |
| `frontend/src/components/company/CrossingMarker.tsx` | Ground-line crossing indicator | Add upward crossing support for resurrected |
| `frontend/src/components/company/TimelineCanvas.tsx` | Canvas orchestrator | Major: new layout, scroll model, node generation, hover dimming |
| `frontend/src/__tests__/lib/timeline-nodes.test.ts` | **New** — Unit tests for node generation | Core logic tests: interpolation, stale detection, edge cases |
| `frontend/src/__tests__/components/company/TimelineNode.test.tsx` | Node tests | Update for new multi-type interface |
| `frontend/src/__tests__/components/company/TimelineLegend.test.tsx` | Legend tests | Update strikethrough assertion |
| `frontend/src/__tests__/components/company/TimelineCanvas.test.tsx` | Canvas integration tests | Update for new layout, controls, scroll |
| `backend/schema.sql` | Database schema | Add `resurrected` to exit_manner enum |
| `frontend/package.json` | Dependencies | Remove `@panzoom/panzoom` |

---

## Task 1: Data Model — Types & Schema

**Files:**
- Modify: `frontend/src/lib/types.ts`
- Modify: `backend/schema.sql`

- [ ] **Step 1: Add `resurrected` to ExitManner type**

In `frontend/src/lib/types.ts`, change line 12-13:

```typescript
export type ExitManner =
  | "silent" | "phased" | "morphed" | "transparent" | "achieved" | "resurrected";
```

- [ ] **Step 2: Add TimelineNodeType and TimelineMonthNode to types.ts**

Append after the `ExitManner` type (after line 13):

```typescript
export type TimelineNodeType = "origin" | "signal" | "cadence" | "stale";

export interface TimelineMonthNode {
  type: TimelineNodeType;
  month: Date;
  x: number;
  y: number;
  score: number;
  signal?: Signal;
  monthsSinceLastSignal?: number;
}
```

- [ ] **Step 3: Add `resurrected` to SQL enum**

In `backend/schema.sql`, change the exit_manner enum (lines 36-42) to:

```sql
create type exit_manner as enum (
  'silent',       -- Vanished from communications without notice
  'phased',       -- Gradual reduction in language weight over time
  'morphed',      -- Transformed into a new successor objective
  'transparent',  -- Explicitly retired with public explanation
  'achieved',     -- Completed and retired as accomplished
  'resurrected'   -- Revived after period of burial
);
```

Also add the migration statement as a comment below:

```sql
-- Migration for existing databases:
-- ALTER TYPE exit_manner ADD VALUE 'resurrected';
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/types.ts backend/schema.sql
git commit -m "feat(types): add resurrected exit type and TimelineMonthNode interface"
```

---

## Task 2: Monthly Node Generation — Core Logic

This is the most important piece. A pure function that converts raw signals into typed monthly nodes with interpolation. Extracted into its own file so it can be tested in isolation.

**Files:**
- Create: `frontend/src/lib/timeline-nodes.ts`
- Create: `frontend/src/__tests__/lib/timeline-nodes.test.ts`

- [ ] **Step 1: Write failing tests for `generateMonthlyNodes`**

Create `frontend/src/__tests__/lib/timeline-nodes.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { generateMonthlyNodes } from "@/lib/timeline-nodes";
import type { Signal } from "@/lib/types";

function makeSignal(date: string, classification: string): Signal {
  return {
    id: `sig-${date}`,
    objective_id: "obj-1",
    company_id: "c1",
    signal_date: date,
    source_type: "annual_report",
    source_name: "Annual Report",
    source_url: null,
    classification: classification as Signal["classification"],
    confidence: 8,
    excerpt: "Test excerpt",
    agent_reasoning: null,
    is_draft: false,
    reviewed_by: null,
    reviewed_at: null,
  };
}

describe("generateMonthlyNodes", () => {
  it("returns empty array for no signals", () => {
    const nodes = generateMonthlyNodes([], new Date("2025-06-01"));
    expect(nodes).toEqual([]);
  });

  it("marks the first signal as origin", () => {
    const signals = [makeSignal("2025-01-15", "stated")];
    const nodes = generateMonthlyNodes(signals, new Date("2025-03-01"));
    expect(nodes[0].type).toBe("origin");
    expect(nodes[0].signal).toBeDefined();
  });

  it("creates cadence nodes for months without signals", () => {
    const signals = [
      makeSignal("2025-01-15", "stated"),
      makeSignal("2025-04-10", "reinforced"),
    ];
    const nodes = generateMonthlyNodes(signals, new Date("2025-05-01"));
    // Jan = origin, Feb = cadence, Mar = cadence, Apr = signal, May = cadence (current)
    expect(nodes).toHaveLength(5);
    expect(nodes[0].type).toBe("origin");
    expect(nodes[1].type).toBe("cadence");
    expect(nodes[2].type).toBe("cadence");
    expect(nodes[3].type).toBe("signal");
    expect(nodes[4].type).toBe("cadence");
  });

  it("interpolates cadence nodes between signals at different scores", () => {
    const signals = [
      makeSignal("2025-01-15", "stated"),   // score: +1
      makeSignal("2025-04-10", "reinforced"), // score: +1.5 → clamped running
    ];
    const nodes = generateMonthlyNodes(signals, new Date("2025-04-30"));
    // Feb and Mar should be interpolated between Jan score and Apr score
    const janScore = nodes[0].score;
    const aprScore = nodes[3].score;
    const febScore = nodes[1].score;
    const marScore = nodes[2].score;
    // Interpolation: Feb is 1/3 of the way, Mar is 2/3
    expect(febScore).toBeCloseTo(janScore + (aprScore - janScore) * (1 / 3), 1);
    expect(marScore).toBeCloseTo(janScore + (aprScore - janScore) * (2 / 3), 1);
  });

  it("keeps cadence nodes flat after last signal", () => {
    const signals = [makeSignal("2025-01-15", "stated")];
    const nodes = generateMonthlyNodes(signals, new Date("2025-04-01"));
    // Jan = origin, Feb = cadence, Mar = cadence, Apr = cadence
    const originScore = nodes[0].score;
    expect(nodes[1].score).toBe(originScore);
    expect(nodes[2].score).toBe(originScore);
    expect(nodes[3].score).toBe(originScore);
  });

  it("uses last signal when multiple exist in one month", () => {
    const signals = [
      makeSignal("2025-01-05", "stated"),
      makeSignal("2025-01-20", "reinforced"),
    ];
    const nodes = generateMonthlyNodes(signals, new Date("2025-02-01"));
    // Jan should be origin but use the running score after both signals
    expect(nodes[0].type).toBe("origin");
    expect(nodes[0].signal?.signal_date).toBe("2025-01-20");
  });

  it("marks stale warning after 6 months without signal", () => {
    const signals = [makeSignal("2025-01-15", "stated")];
    const nodes = generateMonthlyNodes(signals, new Date("2025-09-01"));
    // Jul (month 7) = first stale warning (6 months after Jan)
    const julNode = nodes[6]; // index 6 = July
    expect(julNode.type).toBe("stale");
    expect(julNode.monthsSinceLastSignal).toBe(6);
  });

  it("single signal followed by 12 months of cadence/stale stays flat", () => {
    const signals = [makeSignal("2025-01-15", "stated")];
    const nodes = generateMonthlyNodes(signals, new Date("2026-01-15"));
    const originScore = nodes[0].score;
    for (let i = 1; i < nodes.length; i++) {
      expect(nodes[i].score).toBe(originScore);
    }
  });

  it("stale appears at month 6 even when node would be cadence at month 9", () => {
    const signals = [makeSignal("2025-01-15", "stated")];
    const nodes = generateMonthlyNodes(signals, new Date("2025-12-01"));
    // Months 1-5 after origin = cadence, month 6+ = stale
    expect(nodes[5].type).toBe("cadence"); // Jun (5 months gap)
    expect(nodes[6].type).toBe("stale");   // Jul (6 months gap)
    expect(nodes[6].monthsSinceLastSignal).toBe(6);
    expect(nodes[9].type).toBe("stale");   // Oct (9 months gap)
    expect(nodes[9].monthsSinceLastSignal).toBe(9);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/__tests__/timeline-nodes.test.ts`
Expected: FAIL — `generateMonthlyNodes` does not exist yet.

- [ ] **Step 3: Implement `generateMonthlyNodes`**

Create `frontend/src/lib/timeline-nodes.ts`:

```typescript
import type { Signal, TimelineMonthNode } from "./types";
import { computeRunningMomentum } from "./momentum";

/**
 * Generate typed monthly nodes from a chronologically sorted signal list.
 * Produces one node per month from the first signal's month to `endDate`.
 * Interpolates cadence node scores between adjacent signals.
 */
export function generateMonthlyNodes(
  signals: Signal[],
  endDate: Date
): TimelineMonthNode[] {
  if (signals.length === 0) return [];

  // Sort signals chronologically
  const sorted = [...signals].sort(
    (a, b) => new Date(a.signal_date).getTime() - new Date(b.signal_date).getTime()
  );

  // Compute running momentum for each signal
  const runningScores = computeRunningMomentum(sorted.map((s) => s.classification));

  // Build a map: "YYYY-MM" → { signal, score } (last signal in month wins)
  const signalsByMonth = new Map<string, { signal: Signal; score: number }>();
  sorted.forEach((sig, i) => {
    const key = monthKey(new Date(sig.signal_date));
    signalsByMonth.set(key, { signal: sig, score: runningScores[i] });
  });

  // Generate month range
  const startMonth = toMonthStart(new Date(sorted[0].signal_date));
  const endMonth = toMonthStart(endDate);
  const months: Date[] = [];
  const cursor = new Date(startMonth);
  while (cursor <= endMonth) {
    months.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  // First pass: assign types and raw scores (signals get their score, others get NaN)
  const nodes: TimelineMonthNode[] = [];
  let lastSignalIndex = -1;
  const signalIndices: number[] = []; // indices into `nodes` where signals live

  for (let i = 0; i < months.length; i++) {
    const key = monthKey(months[i]);
    const entry = signalsByMonth.get(key);
    const monthsSinceLastSignal = lastSignalIndex >= 0 ? i - lastSignalIndex : 0;

    if (entry) {
      const isFirst = signalIndices.length === 0;
      nodes.push({
        type: isFirst ? "origin" : "signal",
        month: months[i],
        x: 0, // computed later by caller
        y: 0, // computed later by caller
        score: entry.score,
        signal: entry.signal,
      });
      lastSignalIndex = i;
      signalIndices.push(i);
    } else if (monthsSinceLastSignal >= 6) {
      nodes.push({
        type: "stale",
        month: months[i],
        x: 0,
        y: 0,
        score: NaN, // interpolated below
        monthsSinceLastSignal,
      });
    } else {
      nodes.push({
        type: "cadence",
        month: months[i],
        x: 0,
        y: 0,
        score: NaN, // interpolated below
      });
    }
  }

  // Second pass: interpolate scores for cadence and stale nodes
  for (let i = 0; i < nodes.length; i++) {
    if (!isNaN(nodes[i].score)) continue; // signal/origin — already has score

    // Find previous and next signal nodes
    const prevSignalIdx = findPrevSignal(nodes, i);
    const nextSignalIdx = findNextSignal(nodes, i);

    if (prevSignalIdx === -1) {
      // Before first signal — shouldn't happen (first month is always origin)
      nodes[i].score = 0;
    } else if (nextSignalIdx === -1) {
      // After last signal — flat at last known score
      nodes[i].score = nodes[prevSignalIdx].score;
    } else {
      // Between two signals — linear interpolation
      const prevScore = nodes[prevSignalIdx].score;
      const nextScore = nodes[nextSignalIdx].score;
      const span = nextSignalIdx - prevSignalIdx;
      const position = i - prevSignalIdx;
      nodes[i].score = prevScore + (nextScore - prevScore) * (position / span);
    }
  }

  return nodes;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function toMonthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function findPrevSignal(nodes: TimelineMonthNode[], fromIndex: number): number {
  for (let i = fromIndex - 1; i >= 0; i--) {
    if (nodes[i].type === "origin" || nodes[i].type === "signal") return i;
  }
  return -1;
}

function findNextSignal(nodes: TimelineMonthNode[], fromIndex: number): number {
  for (let i = fromIndex + 1; i < nodes.length; i++) {
    if (nodes[i].type === "origin" || nodes[i].type === "signal") return i;
  }
  return -1;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/__tests__/timeline-nodes.test.ts`
Expected: All 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/timeline-nodes.ts frontend/src/__tests__/lib/timeline-nodes.test.ts
git commit -m "feat(timeline): add monthly node generation with interpolation and stale detection"
```

---

## Task 3: TimelineNode — Multi-Type Support

Refactor `TimelineNode` to render four distinct node types with different sizes, styles, and interactivity.

**Files:**
- Modify: `frontend/src/components/company/TimelineNode.tsx`

- [ ] **Step 1: Rewrite TimelineNode to support all 4 types**

Replace the entire contents of `frontend/src/components/company/TimelineNode.tsx`:

```typescript
"use client";

import type { TimelineNodeType } from "@/lib/types";

interface TimelineNodeProps {
  type: TimelineNodeType;
  emoji?: string;
  colour: string;
  x: number;
  y: number;
  label: string;
  isLatestSignal?: boolean;
  monthsSinceLastSignal?: number;
  onHover?: (e: React.MouseEvent) => void;
  onLeave?: () => void;
  onClick?: () => void;
}

const SIZE: Record<TimelineNodeType, number> = {
  origin: 32,
  signal: 24,
  cadence: 8,
  stale: 12,
};

const LATEST_SCALE = 1.25;

export function TimelineNode({
  type,
  emoji,
  colour,
  x,
  y,
  label,
  isLatestSignal,
  monthsSinceLastSignal,
  onHover,
  onLeave,
  onClick,
}: TimelineNodeProps) {
  const baseSize = SIZE[type];
  const size = isLatestSignal ? baseSize * LATEST_SCALE : baseSize;

  // Cadence node: plain grey dot, no interactivity
  if (type === "cadence") {
    return (
      <div
        className="absolute rounded-full"
        style={{
          left: x,
          top: y,
          width: size,
          height: size,
          backgroundColor: "var(--timeline-cadence-dot)",
          transform: "translate(-50%, -50%)",
        }}
      />
    );
  }

  // Stale warning node: amber bordered dot with "!"
  if (type === "stale") {
    return (
      <div
        className="absolute flex items-center justify-center rounded-full bg-card cursor-pointer hover:scale-110 transition-transform duration-200"
        style={{
          left: x,
          top: y,
          width: size,
          height: size,
          border: "1.5px solid #f59e0b",
          transform: "translate(-50%, -50%)",
        }}
        aria-label={`No update for ${monthsSinceLastSignal ?? "?"} months`}
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
      >
        <span className="text-[8px] font-bold text-amber-500 leading-none select-none">!</span>
      </div>
    );
  }

  // Origin and Signal nodes: interactive with emoji
  const strokeWidth = type === "origin" ? 2.5 : 2;

  return (
    <div
      className="absolute flex items-center justify-center rounded-full bg-card cursor-pointer hover:scale-[1.3] hover:shadow-lg transition-all duration-200 select-none"
      style={{
        left: x,
        top: y,
        width: size,
        height: size,
        border: `${strokeWidth}px solid ${colour}`,
        transform: "translate(-50%, -50%)",
        filter: isLatestSignal ? `drop-shadow(0 0 4px ${colour})` : undefined,
      }}
      aria-label={label}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      <span
        className="leading-none select-none"
        style={{ fontSize: type === "origin" ? "1rem" : "0.85rem" }}
      >
        {emoji}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Update TimelineNode tests**

Update `frontend/src/__tests__/components/company/TimelineNode.test.tsx` to match the new interface:

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimelineNode } from "@/components/company/TimelineNode";

describe("TimelineNode", () => {
  it("renders signal node with emoji", () => {
    render(
      <TimelineNode type="signal" emoji="\u{1F680}" colour="#059669" x={100} y={50} label="Test" />
    );
    expect(screen.getByText("\u{1F680}")).toBeInTheDocument();
  });

  it("renders origin node larger than signal node", () => {
    const { container: originContainer } = render(
      <TimelineNode type="origin" emoji="\u{1F3AF}" colour="#059669" x={100} y={50} label="Test" />
    );
    const { container: signalContainer } = render(
      <TimelineNode type="signal" emoji="\u{1F680}" colour="#059669" x={200} y={50} label="Test" />
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
      <TimelineNode type="signal" emoji="\u{1F680}" colour="#059669" x={100} y={50} label="Test" onHover={onHover} />
    );
    await userEvent.hover(screen.getByText("\u{1F680}"));
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
```

- [ ] **Step 3: Add cadence dot CSS variable to globals.css**

In `frontend/src/app/globals.css`, add to the `:root` / light mode variables:

```css
--timeline-cadence-dot: #d1d5db;
```

And in the dark mode section:

```css
--timeline-cadence-dot: #4b5563;
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/company/TimelineNode.tsx frontend/src/__tests__/components/company/TimelineNode.test.tsx frontend/src/app/globals.css
git commit -m "feat(timeline): refactor TimelineNode to support origin, signal, cadence, and stale types"
```

---

## Task 4: TimelineTooltip — Stale Warning Variant

**Files:**
- Modify: `frontend/src/components/company/TimelineTooltip.tsx`

- [ ] **Step 1: Add stale tooltip support**

The existing `TimelineTooltip` handles signal data. Add support for a stale variant. In `TimelineTooltip.tsx`:

**a) Add to the `TimelineTooltipProps` interface:**

```typescript
  staleInfo?: {
    lastSignalDate: string;
    monthsSilent: number;
  } | null;
```

**b) Add `staleInfo` to the destructured function parameters** (line 28). Update the function signature to:

```typescript
export function TimelineTooltip({
  objectiveName,
  stage,
  latestSignalText,
  latestSignalSource,
  latestSignalDate,
  viewportX,
  viewportY,
  staleInfo,
}: TimelineTooltipProps) {
```

**c) Before the existing `latestSignalText` rendering block, add a stale info block:**

```typescript
      {staleInfo && (
        <div className="border-t border-border pt-2 mt-2">
          <p className="font-mono text-xs text-amber-500">
            No update for {staleInfo.monthsSilent} months
          </p>
          <p className="font-mono text-[0.65rem] text-muted-foreground mt-1">
            Last signal: {staleInfo.lastSignalDate}
          </p>
        </div>
      )}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/company/TimelineTooltip.tsx
git commit -m "feat(timeline): add stale warning tooltip variant"
```

---

## Task 5: TimelineLegend — Polish & Hover

**Files:**
- Modify: `frontend/src/components/company/TimelineLegend.tsx`
- Modify: `frontend/src/__tests__/components/company/TimelineLegend.test.tsx`

- [ ] **Step 1: Update TimelineLegend**

Apply these changes to `frontend/src/components/company/TimelineLegend.tsx`:

**a) Add `resurrected` to EXIT_MANNER_LABELS:**

```typescript
const EXIT_MANNER_LABELS: Record<string, string> = {
  silent: "SILENT DROP",
  phased: "PHASED OUT",
  morphed: "MORPHED",
  transparent: "TRANSPARENT EXIT",
  achieved: "ACHIEVED",
  resurrected: "RESURRECTED",
};
```

**b) Add `onHoverObjective` prop to the interface:**

```typescript
interface TimelineLegendProps {
  objectives: Objective[];
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onHoverObjective: (id: string | null) => void;
  colours: Map<string, string>;
  hasSignals: (id: string) => boolean;
}
```

**c) Remove strikethrough from buried items.** In `renderItem`, change:

```typescript
<p className={`font-serif text-[12.5px] leading-tight text-card-foreground ${isBuried ? "line-through" : ""}`}>
```

to:

```typescript
<p className="font-serif text-[12.5px] leading-tight text-card-foreground">
```

**d) Change opacity values.** Replace all instances of `opacity-45` with `opacity-60`. Replace `hover:opacity-70` with `hover:opacity-80`. The relevant section in the `className`:

```typescript
: "opacity-60 hover:opacity-80 border border-transparent"
```

And the disabled state:

```typescript
? "opacity-60 cursor-not-allowed border border-transparent"
```

**e) Add hover handlers to the button element:**

```typescript
onMouseEnter={() => {
  if (selectedIds.has(obj.id)) onHoverObjective(obj.id);
}}
onMouseLeave={() => onHoverObjective(null)}
```

**f) Disable checkbox for objectives without signals.** In `renderItem`, add:

```typescript
const hasData = hasSignals(obj.id);
```

And make the button disabled when `!hasData`:

```typescript
const isDisabled = (!isSelected && atLimit) || !hasData;
```

Add visual styling when `!hasData`:

```typescript
className={`... ${!hasData ? "opacity-40 cursor-not-allowed" : ""}`}
```

**g) Add resurrected arrow badge.** After the exit manner label for buried items, add:

```typescript
{obj.exit_manner === "resurrected" && (
  <span className="ml-1 text-[9px]" title="Resurrected">&#x2191;</span>
)}
```

- [ ] **Step 2: Update TimelineLegend test**

In `frontend/src/__tests__/components/company/TimelineLegend.test.tsx`:

**a) Update all `<TimelineLegend>` renders to include the new props:**

Add to each render call:

```typescript
onHoverObjective={vi.fn()}
hasSignals={() => true}
```

**b) Remove or update the strikethrough assertion.** The test "renders buried section with strikethrough for graveyard objectives" — update its name and assertion. The title should no longer have `line-through`. Update the test to verify the buried section renders with the exit manner label instead:

```typescript
it("renders buried section with exit manner label for graveyard objectives", () => {
  const withBuried = [
    ...objectives,
    makeObjective({ id: "e", title: "China Growth", display_number: 5, is_in_graveyard: true, momentum_score: -4, exit_manner: "silent" }),
  ];
  const coloursWithBuried = new Map([...colours, ["e", "#78716c"]]);
  render(
    <TimelineLegend
      objectives={withBuried}
      selectedIds={new Set(["a"])}
      onToggleSelection={vi.fn()}
      onHoverObjective={vi.fn()}
      colours={coloursWithBuried}
      hasSignals={() => true}
    />
  );
  expect(screen.getByText("Buried")).toBeInTheDocument();
  expect(screen.getByText("China Growth")).toBeInTheDocument();
  expect(screen.getByText("SILENT DROP")).toBeInTheDocument();
  // Verify no strikethrough
  const title = screen.getByText("China Growth");
  expect(title.className).not.toContain("line-through");
});
```

- [ ] **Step 3: Run tests**

Run: `cd frontend && npx vitest run src/__tests__/components/company/TimelineLegend.test.tsx`
Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/company/TimelineLegend.tsx frontend/src/__tests__/components/company/TimelineLegend.test.tsx
git commit -m "feat(timeline): legend polish — contrast, strikethrough removal, hover, resurrected badge"
```

---

## Task 6: CrossingMarker — Upward Crossing Support

**Files:**
- Modify: `frontend/src/components/company/CrossingMarker.tsx`

- [ ] **Step 1: Add direction prop to CrossingMarker**

Update the interface and component:

```typescript
interface CrossingMarkerProps {
  x: number;
  y: number;
  label: string;
  editorialNote: string;
  direction?: "down" | "up";
}

export function CrossingMarker({ x, y, label, editorialNote, direction = "down" }: CrossingMarkerProps) {
  const isUp = direction === "up";
  return (
    <div className="absolute group cursor-pointer" style={{ left: x, top: y, transform: "translate(-50%, -50%)" }}>
      <div className="relative w-4 h-4">
        <div className={`absolute inset-0 rounded-full animate-ping opacity-40 ${isUp ? "bg-emerald-500" : "bg-destructive"}`} />
        <div className={`absolute inset-0.5 rounded-full ${isUp ? "bg-emerald-500" : "bg-destructive"}`} />
      </div>
      <span className={`absolute left-5 top-1/2 -translate-y-1/2 whitespace-nowrap font-mono text-[0.65rem] ${isUp ? "text-emerald-500" : "text-destructive"}`}>
        {label}
      </span>
      <div className="hidden group-hover:block absolute left-5 top-6 w-48 bg-card border border-border rounded p-2 shadow-lg z-40">
        <p className="font-serif italic text-xs text-card-foreground">{editorialNote}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/company/CrossingMarker.tsx
git commit -m "feat(timeline): support upward crossing markers for resurrected objectives"
```

---

## Task 7: TimelineCanvas — Major Refactor

This is the largest task. It brings together all the previous changes: new layout, node generation, horizontal scroll, hover dimming.

**Files:**
- Modify: `frontend/src/components/company/TimelineCanvas.tsx`
- Modify: `frontend/src/__tests__/components/company/TimelineCanvas.test.tsx`
- Modify: `frontend/package.json`

- [ ] **Step 1: Remove panzoom dependency**

Run: `cd frontend && npm uninstall @panzoom/panzoom`

- [ ] **Step 2: Rewrite TimelineCanvas.tsx**

Replace the entire contents of `frontend/src/components/company/TimelineCanvas.tsx`. Key changes:
- New constants: `CANVAS_HEIGHT = 560`, `STAGE_HEIGHT = 62.5`, `GROUND_Y = 280`, `MONTH_WIDTH = 40`
- Remove all panzoom imports, refs, useEffects, zoom handlers
- Add `generateMonthlyNodes` import from `@/lib/timeline-nodes`
- Split layout into fixed left column (stage labels) + scrollable right area
- Compute canvas width as `totalMonths * MONTH_WIDTH` (min = container width)
- Generate monthly nodes per visible objective using `generateMonthlyNodes`
- Compute x/y on the generated nodes: `x = monthIndex * MONTH_WIDTH`, `y = scoreToY(score)`
- Add `hoveredId` state driving opacity dimming: each objective group gets `opacity` style based on hover
- Add `onHoverObjective` callback passed to legend
- Add `hasSignals` callback passed to legend
- SVG: add stage name to labels, vertical quarter gridlines, "Today" label
- Toolbar: remove zoom buttons, add date range label
- Auto-scroll to recent months via `scrollRef.current.scrollLeft` in useEffect
- Add `tabindex="0"` and keyboard arrow handler on scroll container

Full implementation:

```typescript
"use client";

import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import type { Objective, Signal } from "@/lib/types";
import { STAGES, getStage, scoreToStage, formatQuarter, computeRunningMomentum } from "@/lib/momentum";
import { generateMonthlyNodes } from "@/lib/timeline-nodes";
import { TimelineLegend } from "./TimelineLegend";
import { TimelineNode } from "./TimelineNode";
import { TimelinePath } from "./TimelinePath";
import { TimelineTooltip } from "./TimelineTooltip";
import { CrossingMarker } from "./CrossingMarker";

interface TimelineCanvasProps {
  objectives: Objective[];
  signals: Signal[];
  onNavigateToEvidence: () => void;
}

const OBJECTIVE_COLOURS = [
  "#059669", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b",
  "#14b8a6", "#6366f1", "#ef4444", "#84cc16", "#06b6d4",
];

interface TooltipState {
  objectiveId: string;
  viewportX: number;
  viewportY: number;
  staleInfo?: { lastSignalDate: string; monthsSilent: number } | null;
}

const PADDING_Y = 30;
const CANVAS_HEIGHT = 560;
const GROUND_Y = CANVAS_HEIGHT / 2;
const STAGE_HEIGHT = (CANVAS_HEIGHT - PADDING_Y * 2) / 8;
const MONTH_WIDTH = 40;
const LABEL_COL_WIDTH = 60;

function getDefaultSelection(objectives: Objective[], signals: Signal[]): Set<string> {
  const signalCounts = new Map<string, number>();
  for (const s of signals) {
    signalCounts.set(s.objective_id, (signalCounts.get(s.objective_id) ?? 0) + 1);
  }
  const withSignals = objectives.filter((o) => (signalCounts.get(o.id) ?? 0) > 0);
  const active = withSignals.filter((o) => !o.is_in_graveyard);
  const pool = active.length >= 3 ? active : withSignals.length >= 3 ? withSignals : objectives;

  const sorted = [...pool].sort((a, b) => {
    const absDiff = Math.abs(b.momentum_score) - Math.abs(a.momentum_score);
    if (absDiff !== 0) return absDiff;
    return (signalCounts.get(b.id) ?? 0) - (signalCounts.get(a.id) ?? 0);
  });

  return new Set(sorted.slice(0, 3).map((o) => o.id));
}

function scoreToY(score: number): number {
  return PADDING_Y + (4 - score) * STAGE_HEIGHT;
}

function formatDateRange(signals: Signal[]): string {
  if (signals.length === 0) return "";
  const dates = signals.map((s) => new Date(s.signal_date));
  const min = new Date(Math.min(...dates.map((d) => d.getTime())));
  const max = new Date(Math.max(...dates.map((d) => d.getTime())));
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  return `${fmt(min)} \u2014 ${fmt(max)}`;
}

export function TimelineCanvas({ objectives, signals, onNavigateToEvidence }: TimelineCanvasProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() =>
    getDefaultSelection(objectives, signals)
  );

  const colourMap = useMemo(() => {
    const map = new Map<string, string>();
    objectives.forEach((obj, i) => {
      map.set(obj.id, OBJECTIVE_COLOURS[i % OBJECTIVE_COLOURS.length]);
    });
    return map;
  }, [objectives]);

  const signalsByObjective = useMemo(() => {
    const map = new Map<string, Signal[]>();
    for (const s of signals) {
      const list = map.get(s.objective_id) || [];
      list.push(s);
      map.set(s.objective_id, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => new Date(a.signal_date).getTime() - new Date(b.signal_date).getTime());
    }
    return map;
  }, [signals]);

  const hasSignals = useCallback(
    (id: string) => (signalsByObjective.get(id)?.length ?? 0) > 0,
    [signalsByObjective]
  );

  // Compute date range across all signals
  const { minDate, maxDate, totalMonths } = useMemo(() => {
    const dates = signals.map((s) => new Date(s.signal_date).getTime());
    if (dates.length === 0) return { minDate: Date.now(), maxDate: Date.now(), totalMonths: 12 };
    const min = Math.min(...dates);
    const max = Math.max(...dates, Date.now());
    const minD = new Date(min);
    const maxD = new Date(max);
    const months = (maxD.getFullYear() - minD.getFullYear()) * 12 + (maxD.getMonth() - minD.getMonth()) + 2; // +2 for padding
    return { minDate: min, maxDate: max, totalMonths: Math.max(months, 12) };
  }, [signals]);

  const canvasWidth = Math.max(totalMonths * MONTH_WIDTH, 800);

  // Generate monthly nodes for visible objectives
  const visibleObjectives = useMemo(
    () => objectives.filter((o) => selectedIds.has(o.id)),
    [objectives, selectedIds]
  );

  const now = useMemo(() => new Date(), []);

  const objectiveNodeSets = useMemo(() => {
    return visibleObjectives.map((obj) => {
      const objSignals = signalsByObjective.get(obj.id) || [];
      const monthlyNodes = generateMonthlyNodes(objSignals, now);

      // Compute x and y for each node
      if (monthlyNodes.length > 0) {
        const originMonth = monthlyNodes[0].month;
        const globalOrigin = new Date(minDate);
        const globalOriginMonth = new Date(globalOrigin.getFullYear(), globalOrigin.getMonth(), 1);
        const originOffset = (originMonth.getFullYear() - globalOriginMonth.getFullYear()) * 12 +
          (originMonth.getMonth() - globalOriginMonth.getMonth());

        monthlyNodes.forEach((node, i) => {
          node.x = (originOffset + i) * MONTH_WIDTH + MONTH_WIDTH / 2;
          node.y = scoreToY(node.score);
        });
      }

      // Find latest signal node for emphasis
      let latestSignalIdx = -1;
      for (let i = monthlyNodes.length - 1; i >= 0; i--) {
        if (monthlyNodes[i].type === "origin" || monthlyNodes[i].type === "signal") {
          latestSignalIdx = i;
          break;
        }
      }

      return { objective: obj, nodes: monthlyNodes, latestSignalIdx };
    });
  }, [visibleObjectives, signalsByObjective, now, minDate]);

  // Crossings: detect ground-line crossings (both down and up)
  const crossings = useMemo(() => {
    const result: { objective: Objective; x: number; y: number; direction: "down" | "up" }[] = [];
    for (const { objective, nodes } of objectiveNodeSets) {
      for (let i = 1; i < nodes.length; i++) {
        const prev = nodes[i - 1];
        const curr = nodes[i];
        if (prev.score > 0 && curr.score <= 0) {
          result.push({ objective, x: curr.x, y: GROUND_Y, direction: "down" });
        } else if (prev.score <= 0 && curr.score > 0 && objective.exit_manner === "resurrected") {
          result.push({ objective, x: curr.x, y: GROUND_Y, direction: "up" });
        }
      }
    }
    return result;
  }, [objectiveNodeSets]);

  // Quarter gridlines for the scrollable area
  const quarterLabels = useMemo(() => {
    const labels: { x: number; label: string }[] = [];
    const start = new Date(minDate);
    const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);
    const qMonth = Math.ceil((start.getMonth() + 1) / 3) * 3;
    const d = new Date(start.getFullYear(), qMonth, 1);
    while (d.getTime() <= maxDate + 86400000 * 60) {
      const monthsFromStart =
        (d.getFullYear() - startMonth.getFullYear()) * 12 + (d.getMonth() - startMonth.getMonth());
      const x = monthsFromStart * MONTH_WIDTH + MONTH_WIDTH / 2;
      labels.push({ x, label: formatQuarter(d.toISOString()) });
      d.setMonth(d.getMonth() + 3);
    }
    return labels;
  }, [minDate, maxDate]);

  // Today marker
  const todayX = useMemo(() => {
    const today = new Date();
    const start = new Date(minDate);
    const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);
    const monthsFromStart =
      (today.getFullYear() - startMonth.getFullYear()) * 12 + (today.getMonth() - startMonth.getMonth());
    const dayFraction = today.getDate() / 30;
    return (monthsFromStart + dayFraction) * MONTH_WIDTH;
  }, [minDate]);

  // Tooltip data
  const tooltipData = useMemo(() => {
    if (!tooltip) return null;
    const obj = objectives.find((o) => o.id === tooltip.objectiveId);
    if (!obj) return null;
    const signalList = signalsByObjective.get(obj.id);
    const latest = signalList?.[signalList.length - 1];
    return {
      objectiveName: obj.title,
      stage: scoreToStage(obj.momentum_score),
      latestSignalText: latest?.excerpt ?? null,
      latestSignalSource: latest?.source_name ?? null,
      latestSignalDate: latest?.signal_date ?? null,
      viewportX: tooltip.viewportX,
      viewportY: tooltip.viewportY,
      staleInfo: tooltip.staleInfo ?? null,
    };
  }, [tooltip, objectives, signalsByObjective]);

  // Auto-scroll to recent on mount
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Scroll to show the rightmost content (most recent)
    el.scrollLeft = el.scrollWidth - el.clientWidth;
  }, [canvasWidth]);

  // Keyboard navigation for horizontal scroll
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    if (e.key === "ArrowRight") {
      el.scrollLeft += MONTH_WIDTH * 3;
      e.preventDefault();
    } else if (e.key === "ArrowLeft") {
      el.scrollLeft -= MONTH_WIDTH * 3;
      e.preventDefault();
    }
  }, []);

  function toggleObjective(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= 1) return prev;
        next.delete(id);
      } else {
        if (next.size >= 3) return prev;
        next.add(id);
      }
      return next;
    });
  }

  if (objectives.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground font-sans">
        No objectives tracked yet. Objectives are added after the first agent intake run.
      </div>
    );
  }

  const dateRangeLabel = formatDateRange(signals);

  return (
    <div className="flex border border-border rounded-lg overflow-hidden bg-card" style={{ height: CANVAS_HEIGHT + 44, minHeight: 500 }}>
      <TimelineLegend
        objectives={objectives}
        selectedIds={selectedIds}
        onToggleSelection={toggleObjective}
        onHoverObjective={setHoveredId}
        colours={colourMap}
        hasSignals={hasSignals}
      />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border text-xs font-mono text-muted-foreground" style={{ height: 44 }}>
          <span>{selectedIds.size} of 3 selected</span>
          {dateRangeLabel && <span>{dateRangeLabel}</span>}
        </div>
        {/* Canvas area: fixed labels + scrollable data */}
        <div className="flex flex-1 min-h-0">
          {/* Fixed stage label column */}
          <div className="flex-none relative" style={{ width: LABEL_COL_WIDTH }}>
            <svg width={LABEL_COL_WIDTH} height={CANVAS_HEIGHT}>
              {STAGES.map((stage) => {
                const y = scoreToY(stage.score);
                const isGround = stage.score === 0;
                return (
                  <g key={stage.name}>
                    <text
                      x={4}
                      y={y + 4}
                      fontSize={9}
                      fill={isGround ? "var(--primary)" : "var(--muted-foreground)"}
                      fontFamily="var(--font-ibm-plex-mono)"
                    >
                      {stage.emoji} {stage.score > 0 ? "+" : ""}{stage.score}
                    </text>
                    <text
                      x={4}
                      y={y + 14}
                      fontSize={8}
                      fill={isGround ? "var(--primary)" : "var(--muted-foreground)"}
                      fontFamily="var(--font-ibm-plex-mono)"
                      opacity={0.7}
                    >
                      {stage.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          {/* Scrollable data area */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-x-auto overflow-y-hidden"
            tabIndex={0}
            onKeyDown={handleKeyDown}
          >
            <div className="relative" style={{ width: canvasWidth, height: CANVAS_HEIGHT }}>
              <svg className="absolute inset-0" width={canvasWidth} height={CANVAS_HEIGHT}>
                {/* Background zones */}
                <rect x={0} y={PADDING_Y} width={canvasWidth} height={GROUND_Y - PADDING_Y} fill="var(--timeline-zone-above)" />
                <rect x={0} y={GROUND_Y} width={canvasWidth} height={CANVAS_HEIGHT - PADDING_Y - GROUND_Y} fill="var(--timeline-zone-below)" />

                {/* Stage lines */}
                {STAGES.map((stage) => {
                  const y = scoreToY(stage.score);
                  const isGround = stage.score === 0;
                  return (
                    <g key={stage.name}>
                      {isGround ? (
                        <line x1={0} y1={y} x2={canvasWidth} y2={y} stroke="var(--primary)" strokeWidth={2} />
                      ) : (
                        <line x1={0} y1={y} x2={canvasWidth} y2={y} stroke="var(--border)" strokeWidth={0.5} />
                      )}
                    </g>
                  );
                })}

                {/* Ground line label */}
                <text x={canvasWidth - 8} y={GROUND_Y - 6} fontSize={9} fill="var(--primary)" fontFamily="var(--font-ibm-plex-mono)" textAnchor="end">
                  GROUND LINE
                </text>

                {/* Vertical quarter gridlines */}
                {quarterLabels.map(({ x, label }) => (
                  <g key={label}>
                    <line x1={x} y1={PADDING_Y} x2={x} y2={CANVAS_HEIGHT - PADDING_Y} stroke="var(--border)" strokeWidth={0.5} strokeDasharray="4 4" />
                    <text x={x} y={CANVAS_HEIGHT - 8} fontSize={9} fill="var(--muted-foreground)" fontFamily="var(--font-ibm-plex-mono)" textAnchor="middle" opacity={0.6}>
                      {label}
                    </text>
                  </g>
                ))}

                {/* Today marker */}
                <line x1={todayX} y1={PADDING_Y} x2={todayX} y2={CANVAS_HEIGHT - PADDING_Y} stroke="var(--primary)" strokeWidth={1} strokeDasharray="6 3" opacity={0.5} />
                <text x={todayX} y={PADDING_Y - 4} fontSize={8} fill="var(--primary)" fontFamily="var(--font-ibm-plex-mono)" textAnchor="middle" opacity={0.7}>
                  Today
                </text>

                {/* Paths for selected objectives */}
                {objectiveNodeSets.map(({ objective, nodes }) => {
                  const colour = colourMap.get(objective.id) ?? "#999";
                  const points = nodes.map((n) => ({ x: n.x, y: n.y }));
                  const isBelowGround = objective.momentum_score <= 0;
                  const dimmed = hoveredId !== null && hoveredId !== objective.id;
                  return (
                    <g key={objective.id} opacity={dimmed ? 0.25 : 1} style={{ transition: "opacity 200ms" }}>
                      <TimelinePath points={points} colour={colour} isBelowGround={isBelowGround} />
                    </g>
                  );
                })}
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
                      const stageInfo = getStage(scoreToStage(node.score));
                      return (
                        <TimelineNode
                          key={`${objective.id}-${i}`}
                          type={node.type}
                          emoji={node.type === "origin" ? "\u{1F3AF}" : stageInfo.emoji}
                          colour={colour}
                          x={node.x}
                          y={node.y}
                          label={objective.title}
                          isLatestSignal={i === latestSignalIdx}
                          monthsSinceLastSignal={node.monthsSinceLastSignal}
                          onHover={
                            node.type === "cadence"
                              ? undefined
                              : (e: React.MouseEvent) => {
                                  setHoveredId(objective.id);
                                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                  setTooltip({
                                    objectiveId: objective.id,
                                    viewportX: rect.right,
                                    viewportY: rect.top,
                                    staleInfo:
                                      node.type === "stale"
                                        ? {
                                            lastSignalDate: (() => {
                                              const objSignals = signalsByObjective.get(objective.id);
                                              return objSignals?.[objSignals.length - 1]?.signal_date ?? "Unknown";
                                            })(),
                                            monthsSilent: node.monthsSinceLastSignal ?? 0,
                                          }
                                        : null,
                                  });
                                }
                          }
                          onLeave={
                            node.type === "cadence"
                              ? undefined
                              : () => {
                                  setHoveredId(null);
                                  setTooltip(null);
                                }
                          }
                          onClick={
                            node.type === "origin" || node.type === "signal"
                              ? () => onNavigateToEvidence()
                              : undefined
                          }
                        />
                      );
                    })}
                  </div>
                );
              })}

              {/* Crossing markers */}
              {crossings.map(({ objective, x, y, direction }) => (
                <CrossingMarker
                  key={`cross-${objective.id}-${x}`}
                  x={x}
                  y={y}
                  label={`${direction === "up" ? "Resurrected" : "Crossing"} ${formatQuarter(new Date(objective.last_confirmed_date ?? Date.now()).toISOString())}`}
                  editorialNote={
                    direction === "up"
                      ? `${objective.title} has been resurrected after burial.`
                      : `${objective.title} crossed the ground line.`
                  }
                  direction={direction}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      {tooltipData && <TimelineTooltip {...tooltipData} />}
    </div>
  );
}
```

- [ ] **Step 3: Update TimelineCanvas tests**

Replace `frontend/src/__tests__/components/company/TimelineCanvas.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TimelineCanvas } from "@/components/company/TimelineCanvas";
import type { Objective, Signal } from "@/lib/types";

// Mock ResizeObserver
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", MockResizeObserver);

function makeObjective(overrides: Partial<Objective> & { id: string; title: string }): Objective {
  return {
    company_id: "c1",
    display_number: 1,
    subtitle: null,
    original_quote: null,
    status: "on_record",
    first_stated_date: null,
    last_confirmed_date: null,
    exit_date: null,
    exit_manner: null,
    transparency_score: null,
    verdict_text: null,
    successor_objective_id: null,
    momentum_score: 0,
    is_in_graveyard: false,
    ...overrides,
  };
}

function makeSignal(objectiveId: string, date: string, classification: string): Signal {
  return {
    id: `sig-${objectiveId}-${date}`,
    objective_id: objectiveId,
    company_id: "c1",
    signal_date: date,
    source_type: "annual_report",
    source_name: "Annual Report",
    source_url: null,
    classification: classification as Signal["classification"],
    confidence: 8,
    excerpt: "Test excerpt",
    agent_reasoning: null,
    is_draft: false,
    reviewed_by: null,
    reviewed_at: null,
  };
}

describe("TimelineCanvas", () => {
  const objectives: Objective[] = [
    makeObjective({ id: "a", title: "Revenue Growth", display_number: 1, momentum_score: 3 }),
    makeObjective({ id: "b", title: "Market Share", display_number: 2, momentum_score: -2 }),
    makeObjective({ id: "c", title: "Pipeline", display_number: 3, momentum_score: 1 }),
  ];

  const signals: Signal[] = [
    makeSignal("a", "2025-06-01", "reinforced"),
    makeSignal("b", "2025-06-01", "softened"),
    makeSignal("c", "2025-06-01", "stated"),
  ];

  it("renders the selection counter", () => {
    render(<TimelineCanvas objectives={objectives} signals={signals} onNavigateToEvidence={vi.fn()} />);
    const matches = screen.getAllByText("3 of 3 selected");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("renders date range in toolbar", () => {
    render(<TimelineCanvas objectives={objectives} signals={signals} onNavigateToEvidence={vi.fn()} />);
    expect(screen.getByText(/Jun 2025/)).toBeInTheDocument();
  });

  it("does not render zoom controls", () => {
    render(<TimelineCanvas objectives={objectives} signals={signals} onNavigateToEvidence={vi.fn()} />);
    expect(screen.queryByText("Reset")).not.toBeInTheDocument();
    expect(screen.queryByText("+")).not.toBeInTheDocument();
  });

  it("renders objective titles in legend", () => {
    render(<TimelineCanvas objectives={objectives} signals={signals} onNavigateToEvidence={vi.fn()} />);
    expect(screen.getByText("Revenue Growth")).toBeInTheDocument();
  });

  it("shows empty state when no objectives", () => {
    render(<TimelineCanvas objectives={[]} signals={[]} onNavigateToEvidence={vi.fn()} />);
    expect(screen.getByText(/No objectives tracked yet/)).toBeInTheDocument();
  });

  it("renders stage names in labels", () => {
    render(<TimelineCanvas objectives={objectives} signals={signals} onNavigateToEvidence={vi.fn()} />);
    expect(screen.getByText("Orbit")).toBeInTheDocument();
    expect(screen.getByText("Watch")).toBeInTheDocument();
    expect(screen.getByText("Buried")).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run all tests**

Run: `cd frontend && npx vitest run`
Expected: All tests PASS, including timeline-nodes, TimelineLegend, and TimelineCanvas.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/company/TimelineCanvas.tsx frontend/src/__tests__/components/company/TimelineCanvas.test.tsx frontend/package.json frontend/package-lock.json
git commit -m "feat(timeline): v3 redesign — monthly cadence nodes, horizontal scroll, connected hover, layout upgrade"
```

---

## Task 8: Smoke Test & Verification

**Files:** None (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `cd frontend && npx vitest run`
Expected: All tests pass with no failures.

- [ ] **Step 2: Run the dev server and visually verify**

Run: `cd frontend && npm run dev`

Open the company page (e.g., `/company/SDZ`) in the browser and verify:
- Canvas is 560px tall with visible stage labels including names (Orbit, Fly, etc.)
- Monthly cadence dots appear as small grey dots between signal nodes
- Signal nodes have emojis, origin node has target emoji and is larger
- Horizontal scroll works — scroll right to see recent, left for history
- Hovering a node dims other trajectories
- Hovering a legend item dims other trajectories on canvas
- No zoom controls are visible
- Date range appears in toolbar
- Vertical quarter gridlines are visible
- Today marker shows with "Today" label

- [ ] **Step 3: Commit any final adjustments**

If any visual tweaks are needed, make them and commit:

```bash
git add frontend/src/
git commit -m "fix(timeline): visual adjustments from smoke test"
```
