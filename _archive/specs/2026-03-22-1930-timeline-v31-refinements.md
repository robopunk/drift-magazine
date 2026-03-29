# Timeline v3.1 Refinements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship 5 targeted refinements to the Timeline Canvas — signal-specific tooltips, fiscal year-end diamond nodes, monthly axis labels, legend hover tooltips, and zero selection state.

**Architecture:** All changes are scoped to the existing timeline component family (`TimelineCanvas`, `TimelineNode`, `TimelineTooltip`, `TimelineLegend`, `timeline-nodes.ts`, `types.ts`). One new component (`TimelineLegendTooltip`) is created. Backend changes are limited to adding one enum value and one column.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Vitest + React Testing Library, Supabase/Postgres

**Spec:** `docs/specs/2026-03-22-timeline-refinements-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `frontend/src/lib/types.ts` | Add `fiscal-year-end` to `TimelineNodeType`, `year_end_review` to `SignalClassification`, `fiscal_year_end_month` to `Company`, `isFiscalYearEnd` to `TimelineMonthNode` |
| Modify | `frontend/src/lib/timeline-nodes.ts` | Accept `fiscalYearEndMonth` param, insert FY-end nodes in second pass |
| Modify | `frontend/src/components/company/TimelineTooltip.tsx` | Signal-specific props, remove caption, render per-node content |
| Modify | `frontend/src/components/company/TimelineNode.tsx` | Diamond rendering for `fiscal-year-end` type |
| Modify | `frontend/src/components/company/TimelineLegend.tsx` | Remove min-1 guard + shake, add hover tooltip state, update footer |
| Modify | `frontend/src/components/company/TimelineCanvas.tsx` | Monthly axis labels, pass signal to tooltip, zero selection state, FY-end node generation |
| Create | `frontend/src/components/company/TimelineLegendTooltip.tsx` | Portal tooltip for legend hover (subtitle + quote) |
| Modify | `backend/schema.sql` | Add `year_end_review` to enum, add `fiscal_year_end_month` column |
| Modify | `frontend/src/__tests__/lib/timeline-nodes.test.ts` | FY-end node generation tests |
| Modify | `frontend/src/__tests__/components/company/TimelineTooltip.test.tsx` | Signal-specific tooltip tests |
| Modify | `frontend/src/__tests__/components/company/TimelineNode.test.tsx` | Diamond node rendering test |
| Modify | `frontend/src/__tests__/components/company/TimelineLegend.test.tsx` | Zero selection + hover tooltip tests |

---

## Task 1: Types — Extend type definitions

**Files:**
- Modify: `frontend/src/lib/types.ts:8-11` (SignalClassification)
- Modify: `frontend/src/lib/types.ts:15` (TimelineNodeType)
- Modify: `frontend/src/lib/types.ts:17-25` (TimelineMonthNode)
- Modify: `frontend/src/lib/types.ts:38-51` (Company)

- [ ] **Step 1: Add `year_end_review` to `SignalClassification`**

In `frontend/src/lib/types.ts`, change:
```typescript
export type SignalClassification =
  | "stated" | "reinforced" | "softened" | "reframed"
  | "absent" | "achieved" | "retired_transparent" | "retired_silent";
```
To:
```typescript
export type SignalClassification =
  | "stated" | "reinforced" | "softened" | "reframed"
  | "absent" | "achieved" | "retired_transparent" | "retired_silent"
  | "year_end_review";
```

- [ ] **Step 2: Add `fiscal-year-end` to `TimelineNodeType`**

Change:
```typescript
export type TimelineNodeType = "origin" | "signal" | "cadence" | "stale";
```
To:
```typescript
export type TimelineNodeType = "origin" | "signal" | "cadence" | "stale" | "fiscal-year-end";
```

- [ ] **Step 3: Add `isFiscalYearEnd` to `TimelineMonthNode`**

Add optional field to the interface:
```typescript
export interface TimelineMonthNode {
  type: TimelineNodeType;
  month: Date;
  x: number;
  y: number;
  score: number;
  signal?: Signal;
  monthsSinceLastSignal?: number;
  isFiscalYearEnd?: boolean;
}
```

- [ ] **Step 4: Add `fiscal_year_end_month` to `Company`**

Add after `tracking_active`:
```typescript
export interface Company {
  // ... existing fields ...
  tracking_active: boolean;
  fiscal_year_end_month: number;  // 1-12, default 12
  last_research_run: string | null;
  created_at: string;
}
```

- [ ] **Step 5: Verify build compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: Compilation errors in files that reference the SIZE record in TimelineNode.tsx (missing `fiscal-year-end` key). This is expected and will be fixed in Task 4.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/types.ts
git commit -m "feat(types): extend types for timeline v3.1 — FY-end node, year_end_review signal"
```

---

## Task 2: Signal-Specific Node Tooltips

**Files:**
- Modify: `frontend/src/components/company/TimelineTooltip.tsx`
- Modify: `frontend/src/components/company/TimelineCanvas.tsx:24-29` (TooltipState)
- Modify: `frontend/src/components/company/TimelineCanvas.tsx:204-221` (tooltipData)
- Modify: `frontend/src/components/company/TimelineCanvas.tsx:390-424` (node hover handlers)
- Modify: `frontend/src/__tests__/components/company/TimelineTooltip.test.tsx`

- [ ] **Step 1: Write failing tests for signal-specific tooltip**

Replace the contents of `frontend/src/__tests__/components/company/TimelineTooltip.test.tsx`:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TimelineTooltip } from "@/components/company/TimelineTooltip";
import type { Signal } from "@/lib/types";

function makeSignal(overrides?: Partial<Signal>): Signal {
  return {
    id: "sig-1",
    objective_id: "obj-1",
    company_id: "c1",
    signal_date: "2025-06-15",
    source_type: "earnings_call",
    source_name: "Q2 Earnings Call",
    source_url: null,
    classification: "reinforced",
    confidence: 8,
    excerpt: "Revenue exceeded expectations in biosimilars",
    agent_reasoning: null,
    is_draft: false,
    reviewed_by: null,
    reviewed_at: null,
    ...overrides,
  };
}

describe("TimelineTooltip", () => {
  it("renders via portal into document.body", () => {
    const { container } = render(
      <TimelineTooltip
        objectiveName="Global Biosimilar Leadership"
        stage="fly"
        signal={makeSignal()}
        viewportX={200}
        viewportY={300}
      />
    );
    expect(container.querySelector("[data-tooltip]")).toBeNull();
    expect(document.body.querySelector("[data-tooltip]")).not.toBeNull();
  });

  it("displays signal-specific excerpt and source", () => {
    render(
      <TimelineTooltip
        objectiveName="Global Biosimilar Leadership"
        stage="fly"
        signal={makeSignal()}
        viewportX={200}
        viewportY={300}
      />
    );
    expect(screen.getByText(/Revenue exceeded expectations/)).toBeInTheDocument();
    expect(screen.getByText(/Q2 Earnings Call/)).toBeInTheDocument();
    expect(screen.getByText(/2025-06-15/)).toBeInTheDocument();
  });

  it("displays signal classification badge", () => {
    render(
      <TimelineTooltip
        objectiveName="Test"
        stage="run"
        signal={makeSignal({ classification: "softened" })}
        viewportX={200}
        viewportY={300}
      />
    );
    expect(screen.getByText(/SOFTENED/i)).toBeInTheDocument();
  });

  it("renders origin tooltip with original quote instead of signal", () => {
    render(
      <TimelineTooltip
        objectiveName="Global Biosimilar Leadership"
        stage="fly"
        originalQuote="We aim to be the undisputed global leader"
        firstStatedDate="2023-10-04"
        viewportX={200}
        viewportY={300}
      />
    );
    expect(screen.getByText(/We aim to be the undisputed global leader/)).toBeInTheDocument();
    expect(screen.getByText(/2023-10-04/)).toBeInTheDocument();
  });

  it("renders stale info when provided", () => {
    render(
      <TimelineTooltip
        objectiveName="Test"
        stage="watch"
        staleInfo={{ lastSignalDate: "2025-01-15", monthsSilent: 8 }}
        viewportX={200}
        viewportY={300}
      />
    );
    expect(screen.getByText(/8 months/)).toBeInTheDocument();
  });

  it("does not render Boardroom Allegory captions", () => {
    render(
      <TimelineTooltip
        objectiveName="Test"
        stage="drag"
        signal={makeSignal()}
        viewportX={200}
        viewportY={300}
      />
    );
    expect(screen.queryByText(/like a painting no one has moved/)).toBeNull();
  });

  it("uses position: fixed styling", () => {
    render(
      <TimelineTooltip
        objectiveName="Test"
        stage="fly"
        signal={makeSignal()}
        viewportX={200}
        viewportY={300}
      />
    );
    const tooltip = document.body.querySelector("[data-tooltip]") as HTMLElement;
    expect(tooltip.style.position).toBe("fixed");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/__tests__/components/company/TimelineTooltip.test.tsx`
Expected: FAIL — props don't match current component signature

- [ ] **Step 3: Rewrite TimelineTooltip with signal-specific props**

Replace `frontend/src/components/company/TimelineTooltip.tsx`:

```tsx
"use client";

import { useRef, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { MomentumStage, Signal } from "@/lib/types";
import { getStage } from "@/lib/momentum";

interface TimelineTooltipProps {
  objectiveName: string;
  stage: MomentumStage;
  signal?: Signal;
  originalQuote?: string;
  firstStatedDate?: string;
  viewportX: number;
  viewportY: number;
  staleInfo?: { lastSignalDate: string; monthsSilent: number } | null;
}

const TOOLTIP_WIDTH = 288;
const EDGE_MARGIN = 16;
const MIN_TOP = 8;

export function TimelineTooltip({
  objectiveName,
  stage,
  signal,
  originalQuote,
  firstStatedDate,
  viewportX,
  viewportY,
  staleInfo,
}: TimelineTooltipProps) {
  const stageInfo = getStage(stage);
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    let left = viewportX + 16;
    let top = viewportY - 20;

    if (left + TOOLTIP_WIDTH > window.innerWidth - EDGE_MARGIN) {
      left = viewportX - TOOLTIP_WIDTH - 16;
    }
    if (top + rect.height > window.innerHeight - EDGE_MARGIN) {
      top = window.innerHeight - EDGE_MARGIN - rect.height;
    }
    if (top < MIN_TOP) {
      top = MIN_TOP;
    }

    setPosition({ left, top });
  }, [viewportX, viewportY]);

  const tooltip = (
    <div
      ref={ref}
      data-tooltip
      className="z-[9999] w-72 bg-card border border-border rounded-lg shadow-xl p-3 pointer-events-none"
      style={{ position: "fixed", left: position?.left ?? -9999, top: position?.top ?? -9999, opacity: position ? 1 : 0 }}
    >
      {/* Header: name + momentum badge */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">{stageInfo.emoji}</span>
        <span className="font-serif font-bold text-sm text-card-foreground truncate">{objectiveName}</span>
      </div>
      <span
        className="inline-block font-mono text-xs uppercase tracking-wider px-1.5 py-0.5 rounded mb-2"
        style={{ backgroundColor: stageInfo.colour + "20", color: stageInfo.colour }}
      >
        {stageInfo.label} ({stageInfo.score > 0 ? "+" : ""}{stageInfo.score})
      </span>

      {/* Stale warning */}
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

      {/* Origin node: original quote */}
      {originalQuote && (
        <div className="border-t border-border pt-2 mt-2">
          <p className="font-serif italic text-xs text-card-foreground line-clamp-3">&ldquo;{originalQuote}&rdquo;</p>
          {firstStatedDate && (
            <p className="font-mono text-[0.65rem] text-muted-foreground mt-1">
              First stated: {firstStatedDate}
            </p>
          )}
        </div>
      )}

      {/* Signal node: specific signal data */}
      {signal && (
        <div className="border-t border-border pt-2 mt-2">
          <span
            className="inline-block font-mono text-[0.6rem] uppercase tracking-wider px-1 py-0.5 rounded mb-1.5"
            style={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}
          >
            {signal.classification.replace(/_/g, " ")}
          </span>
          {signal.excerpt && (
            <p className="font-serif italic text-xs text-card-foreground line-clamp-3">&ldquo;{signal.excerpt}&rdquo;</p>
          )}
          <p className="font-mono text-[0.65rem] text-muted-foreground mt-1">
            {signal.source_name} {signal.signal_date && `\u00b7 ${signal.signal_date}`}
          </p>
        </div>
      )}
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(tooltip, document.body);
}
```

- [ ] **Step 4: Update TooltipState and tooltipData in TimelineCanvas**

In `frontend/src/components/company/TimelineCanvas.tsx`, update the `TooltipState` interface (around line 24):

```typescript
interface TooltipState {
  objectiveId: string;
  viewportX: number;
  viewportY: number;
  signal?: Signal;
  originalQuote?: string;
  firstStatedDate?: string;
  nodeScore?: number;
  staleInfo?: { lastSignalDate: string; monthsSilent: number } | null;
}
```

Update the `tooltipData` memo (around line 205) to use signal-specific data:

```typescript
const tooltipData = useMemo(() => {
  if (!tooltip) return null;
  const obj = objectives.find((o) => o.id === tooltip.objectiveId);
  if (!obj) return null;
  const stage = scoreToStage(tooltip.nodeScore ?? obj.momentum_score);
  return {
    objectiveName: obj.title,
    stage,
    signal: tooltip.signal,
    originalQuote: tooltip.originalQuote,
    firstStatedDate: tooltip.firstStatedDate,
    viewportX: tooltip.viewportX,
    viewportY: tooltip.viewportY,
    staleInfo: tooltip.staleInfo ?? null,
  };
}, [tooltip, objectives]);
```

Update the node hover handler (around line 403) to pass node-specific data:

```typescript
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
          signal: node.type === "signal" ? node.signal : undefined,
          originalQuote: node.type === "origin" ? objective.original_quote ?? undefined : undefined,
          firstStatedDate: node.type === "origin" ? objective.first_stated_date ?? undefined : undefined,
          nodeScore: node.score,
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
```

Also remove the `signalsByObjective` dependency from `tooltipData` memo (it's no longer needed there).

- [ ] **Step 5: Run tooltip tests**

Run: `cd frontend && npx vitest run src/__tests__/components/company/TimelineTooltip.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/company/TimelineTooltip.tsx frontend/src/components/company/TimelineCanvas.tsx frontend/src/__tests__/components/company/TimelineTooltip.test.tsx
git commit -m "feat(timeline): signal-specific node tooltips — each node shows its own signal data"
```

---

## Task 3: Monthly Axis Labels

**Files:**
- Modify: `frontend/src/components/company/TimelineCanvas.tsx:177-191` (replace quarterLabels)
- Modify: `frontend/src/components/company/TimelineCanvas.tsx:352-359` (replace gridline rendering)

- [ ] **Step 1: Replace `quarterLabels` memo with `monthLabels`**

In `frontend/src/components/company/TimelineCanvas.tsx`, replace the `quarterLabels` memo (around line 177):

```typescript
const monthLabels = useMemo(() => {
  const labels: { x: number; label: string; isJanuary: boolean; year: number }[] = [];
  const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const start = new Date(minDate);
  const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);
  for (let i = 0; i < totalMonths; i++) {
    const d = new Date(startMonth);
    d.setMonth(d.getMonth() + i);
    labels.push({
      x: i * MONTH_WIDTH + MONTH_WIDTH / 2,
      label: MONTH_ABBR[d.getMonth()],
      isJanuary: d.getMonth() === 0,
      year: d.getFullYear(),
    });
  }
  return labels;
}, [minDate, totalMonths]);
```

- [ ] **Step 2: Replace quarterly gridline rendering with month labels**

Replace the `{/* Vertical quarter gridlines */}` block (around line 352) with:

```tsx
{/* Monthly axis labels */}
{monthLabels.map(({ x, label, isJanuary, year }, i) => (
  <g key={`month-${i}`}>
    <text
      x={x}
      y={CANVAS_HEIGHT - 12}
      fontSize={9}
      fill={isJanuary ? "var(--foreground)" : "var(--muted-foreground)"}
      fontFamily="var(--font-ibm-plex-mono)"
      textAnchor="middle"
      fontWeight={isJanuary ? 600 : 400}
      opacity={isJanuary ? 1 : 0.5}
    >
      {label}
    </text>
    {isJanuary && (
      <text
        x={x}
        y={CANVAS_HEIGHT - 2}
        fontSize={9}
        fill="var(--primary)"
        fontFamily="var(--font-ibm-plex-mono)"
        textAnchor="middle"
        fontWeight={500}
      >
        {year}
      </text>
    )}
  </g>
))}
```

- [ ] **Step 3: Remove `formatQuarter` import**

In the imports at the top of `TimelineCanvas.tsx`, remove `formatQuarter` from the momentum import. Note: `formatQuarter` is still used in the `CrossingMarker` labels (line 452), so check whether it's still needed there. If it is, keep the import. If the crossing marker can use a different format, update it.

Read lines 447-460 of `TimelineCanvas.tsx` to check `formatQuarter` usage in crossing markers before removing the import.

- [ ] **Step 4: Verify the app compiles and renders**

Run: `cd frontend && npx tsc --noEmit`
Expected: Clean compilation (aside from any pre-existing `fiscal-year-end` SIZE key issue from Task 1)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/company/TimelineCanvas.tsx
git commit -m "feat(timeline): monthly axis labels replace quarterly gridlines"
```

---

## Task 4: Fiscal Year-End Diamond Node

**Files:**
- Modify: `frontend/src/lib/timeline-nodes.ts`
- Modify: `frontend/src/components/company/TimelineNode.tsx:19-24` (SIZE record)
- Modify: `frontend/src/components/company/TimelineCanvas.tsx` (pass fiscalYearEndMonth)
- Modify: `frontend/src/__tests__/lib/timeline-nodes.test.ts`
- Modify: `frontend/src/__tests__/components/company/TimelineNode.test.tsx`

- [ ] **Step 1: Write failing tests for FY-end node generation**

Add to `frontend/src/__tests__/lib/timeline-nodes.test.ts`:

```typescript
describe("fiscal year-end nodes", () => {
  it("inserts fiscal-year-end node at the matching month", () => {
    const signals = [
      makeSignal("2025-01-15", "stated"),
      makeSignal("2025-06-10", "reinforced"),
    ];
    const nodes = generateMonthlyNodes(signals, new Date("2026-02-01"), 12);
    // December 2025 should be fiscal-year-end
    const fyNode = nodes.find(
      (n) => n.type === "fiscal-year-end" && n.month.getMonth() === 11
    );
    expect(fyNode).toBeDefined();
  });

  it("does not insert fiscal-year-end node outside signal range", () => {
    const signals = [
      makeSignal("2025-03-15", "stated"),
      makeSignal("2025-06-10", "reinforced"),
    ];
    // End before December — no FY-end node for month 12
    const nodes = generateMonthlyNodes(signals, new Date("2025-09-01"), 12);
    const fyNodes = nodes.filter((n) => n.type === "fiscal-year-end");
    expect(fyNodes).toHaveLength(0);
  });

  it("promotes signal node at FY-end month with isFiscalYearEnd flag", () => {
    const signals = [
      makeSignal("2025-01-15", "stated"),
      makeSignal("2025-12-10", "reinforced"),
    ];
    const nodes = generateMonthlyNodes(signals, new Date("2026-02-01"), 12);
    const decNode = nodes.find((n) => n.month.getMonth() === 11 && n.month.getFullYear() === 2025);
    expect(decNode?.type).toBe("signal"); // stays signal
    expect(decNode?.isFiscalYearEnd).toBe(true);
  });

  it("uses custom fiscal year-end month", () => {
    const signals = [
      makeSignal("2025-01-15", "stated"),
      makeSignal("2025-06-10", "reinforced"),
    ];
    // FY-end in March (month 3)
    const nodes = generateMonthlyNodes(signals, new Date("2025-09-01"), 3);
    const marchNode = nodes.find(
      (n) => n.type === "fiscal-year-end" && n.month.getMonth() === 2
    );
    expect(marchNode).toBeDefined();
  });

  it("backward compat: omitting fiscalYearEndMonth produces no FY-end nodes", () => {
    const signals = [makeSignal("2025-01-15", "stated")];
    const nodes = generateMonthlyNodes(signals, new Date("2026-03-01"));
    const fyNodes = nodes.filter((n) => n.type === "fiscal-year-end");
    expect(fyNodes).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/__tests__/lib/timeline-nodes.test.ts`
Expected: FAIL — `generateMonthlyNodes` doesn't accept 3rd param

- [ ] **Step 3: Update `generateMonthlyNodes` to accept `fiscalYearEndMonth`**

In `frontend/src/lib/timeline-nodes.ts`, update the function signature and add a FY-end insertion pass after the interpolation loop:

```typescript
export function generateMonthlyNodes(
  signals: Signal[],
  endDate: Date,
  fiscalYearEndMonth?: number  // 1-12, optional
): TimelineMonthNode[] {
```

After the interpolation loop (after line 103, before `return nodes;`), add:

```typescript
  // Third pass: insert or flag fiscal year-end nodes
  if (fiscalYearEndMonth != null && fiscalYearEndMonth >= 1 && fiscalYearEndMonth <= 12) {
    const fyMonthIndex = fiscalYearEndMonth - 1; // JS month (0-11)
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].month.getMonth() !== fyMonthIndex) continue;
      if (nodes[i].type === "origin" || nodes[i].type === "signal") {
        // Promote: keep type but flag as FY-end
        nodes[i].isFiscalYearEnd = true;
      } else {
        // Replace cadence/stale with fiscal-year-end node
        nodes[i] = {
          ...nodes[i],
          type: "fiscal-year-end",
        };
      }
    }
  }

  return nodes;
```

- [ ] **Step 4: Run timeline-nodes tests**

Run: `cd frontend && npx vitest run src/__tests__/lib/timeline-nodes.test.ts`
Expected: PASS

- [ ] **Step 5: Write failing test for diamond node rendering**

Add to `frontend/src/__tests__/components/company/TimelineNode.test.tsx`:

```typescript
it("renders fiscal-year-end node as a rotated diamond", () => {
  const { container } = render(
    <TimelineNode type="fiscal-year-end" colour="#f59e0b" x={100} y={50} label="FY End" />
  );
  const node = container.firstElementChild as HTMLElement;
  expect(node.style.transform).toContain("rotate(45deg)");
  expect(node.style.borderColor).toBe("#f59e0b");
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/__tests__/components/company/TimelineNode.test.tsx`
Expected: FAIL — no `fiscal-year-end` in SIZE record

- [ ] **Step 7: Add diamond rendering to TimelineNode**

In `frontend/src/components/company/TimelineNode.tsx`:

Update the SIZE record:
```typescript
const SIZE: Record<TimelineNodeType, number> = {
  origin: 32,
  signal: 24,
  cadence: 8,
  stale: 12,
  "fiscal-year-end": 14,
};
```

Add a new block after the stale node block (after line 81, before the origin/signal block):

```tsx
// Fiscal year-end node: amber diamond
if (type === "fiscal-year-end") {
  return (
    <div
      className="absolute flex items-center justify-center bg-card cursor-pointer hover:scale-110 transition-transform duration-200"
      style={{
        left: x,
        top: y,
        width: size,
        height: size,
        border: `2px solid ${colour}`,
        transform: "translate(-50%, -50%) rotate(45deg)",
      }}
      aria-label={label}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    />
  );
}
```

- [ ] **Step 8: Run TimelineNode tests**

Run: `cd frontend && npx vitest run src/__tests__/components/company/TimelineNode.test.tsx`
Expected: PASS

- [ ] **Step 9: Wire FY-end month into TimelineCanvas**

In `frontend/src/components/company/TimelineCanvas.tsx`, update the `generateMonthlyNodes` call inside `objectiveNodeSets` memo (around line 130):

```typescript
const monthlyNodes = generateMonthlyNodes(
  objSignals,
  now,
  // Pass fiscal_year_end_month from the first objective's company data
  // For now, default to 12 if not available on the company object
  12
);
```

Note: When the `Company` interface is populated with `fiscal_year_end_month` from Supabase, this should be passed from the company page props. For now, hardcode 12 (Sandoz's fiscal year-end). The company page that renders `TimelineCanvas` will need to pass the company's `fiscal_year_end_month` as a prop. Add `fiscalYearEndMonth?: number` to `TimelineCanvasProps` and use it:

```typescript
interface TimelineCanvasProps {
  objectives: Objective[];
  signals: Signal[];
  onNavigateToEvidence: () => void;
  fiscalYearEndMonth?: number;
}
```

Then in the memo:
```typescript
const monthlyNodes = generateMonthlyNodes(objSignals, now, fiscalYearEndMonth);
```

Also handle the FY-end node in the rendering loop — set its colour to amber (`#f59e0b`) and allow hover if it has a signal:

In the node rendering map (around line 390), add handling for `fiscal-year-end`:
```typescript
const nodeColour = node.type === "fiscal-year-end" && !node.isFiscalYearEnd
  ? "#f59e0b"
  : colour;
```

For the `onHover` handler, fiscal-year-end nodes with a signal should show tooltip; without signal, no tooltip:
```typescript
onHover={
  node.type === "cadence" || (node.type === "fiscal-year-end" && !node.signal)
    ? undefined
    : (e: React.MouseEvent) => { /* existing handler */ }
}
```

- [ ] **Step 10: Verify build compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: Clean compilation

- [ ] **Step 11: Commit**

```bash
git add frontend/src/lib/timeline-nodes.ts frontend/src/components/company/TimelineNode.tsx frontend/src/components/company/TimelineCanvas.tsx frontend/src/__tests__/lib/timeline-nodes.test.ts frontend/src/__tests__/components/company/TimelineNode.test.tsx
git commit -m "feat(timeline): fiscal year-end diamond nodes with amber stroke"
```

---

## Task 5: Legend Hover Tooltip

**Files:**
- Create: `frontend/src/components/company/TimelineLegendTooltip.tsx`
- Modify: `frontend/src/components/company/TimelineLegend.tsx`
- Modify: `frontend/src/__tests__/components/company/TimelineLegend.test.tsx`

- [ ] **Step 1: Write failing test for legend hover tooltip**

Add to `frontend/src/__tests__/components/company/TimelineLegend.test.tsx`:

```typescript
it("shows tooltip with subtitle and quote on hover", async () => {
  const objWithQuote = [
    makeObjective({
      id: "a",
      title: "Revenue Growth",
      display_number: 1,
      momentum_score: 3,
      subtitle: "Become the global leader in biosimilars",
      original_quote: "We aim to be the undisputed global leader",
      first_stated_date: "2023-10-04",
    }),
  ];
  render(
    <TimelineLegend
      objectives={objWithQuote}
      selectedIds={new Set(["a"])}
      onToggleSelection={vi.fn()}
      onHoverObjective={vi.fn()}
      colours={colours}
      hasSignals={() => true}
    />
  );
  await userEvent.hover(screen.getByText("Revenue Growth"));
  expect(screen.getByText("Become the global leader in biosimilars")).toBeInTheDocument();
  expect(screen.getByText(/We aim to be the undisputed global leader/)).toBeInTheDocument();
  expect(screen.getByText(/2023-10-04/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/__tests__/components/company/TimelineLegend.test.tsx`
Expected: FAIL — no tooltip content rendered on hover

- [ ] **Step 3: Create `TimelineLegendTooltip` component**

Create `frontend/src/components/company/TimelineLegendTooltip.tsx`:

```tsx
"use client";

import { useRef, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Objective } from "@/lib/types";

interface TimelineLegendTooltipProps {
  objective: Objective;
  anchorRect: DOMRect;
}

const TOOLTIP_WIDTH = 280;
const EDGE_MARGIN = 16;

export function TimelineLegendTooltip({ objective, anchorRect }: TimelineLegendTooltipProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    let left = anchorRect.right + 8;
    let top = anchorRect.top + anchorRect.height / 2 - rect.height / 2;

    // Horizontal: flip left if clipped
    if (left + TOOLTIP_WIDTH > window.innerWidth - EDGE_MARGIN) {
      left = anchorRect.left - TOOLTIP_WIDTH - 8;
    }
    // Vertical: clamp
    if (top + rect.height > window.innerHeight - EDGE_MARGIN) {
      top = window.innerHeight - EDGE_MARGIN - rect.height;
    }
    if (top < EDGE_MARGIN) {
      top = EDGE_MARGIN;
    }

    setPosition({ left, top });
  }, [anchorRect]);

  const tooltip = (
    <div
      ref={ref}
      data-legend-tooltip
      className="z-[9999] bg-card border border-border rounded-lg shadow-xl p-3 pointer-events-none"
      style={{
        position: "fixed",
        width: TOOLTIP_WIDTH,
        left: position?.left ?? -9999,
        top: position?.top ?? -9999,
        opacity: position ? 1 : 0,
      }}
    >
      {objective.subtitle && (
        <p className="font-serif text-[13px] font-medium text-card-foreground mb-1.5">
          {objective.subtitle}
        </p>
      )}
      {objective.original_quote && (
        <p className="font-serif italic text-xs text-card-foreground opacity-65 leading-relaxed">
          &ldquo;{objective.original_quote}&rdquo;
        </p>
      )}
      {objective.first_stated_date && (
        <p className="font-mono text-[10px] text-muted-foreground opacity-40 mt-2">
          First stated: {objective.first_stated_date}
        </p>
      )}
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(tooltip, document.body);
}
```

- [ ] **Step 4: Add hover state to TimelineLegend**

In `frontend/src/components/company/TimelineLegend.tsx`:

Add import at top:
```typescript
import { TimelineLegendTooltip } from "./TimelineLegendTooltip";
```

Add state inside the component (after existing state declarations):
```typescript
const [legendTooltip, setLegendTooltip] = useState<{ objective: Objective; rect: DOMRect } | null>(null);
```

Update the `onMouseEnter` handler on the button in `renderItem` to set tooltip state for ALL objectives (not just selected ones):
```typescript
onMouseEnter={(e) => {
  if (selectedIds.has(obj.id)) onHoverObjective(obj.id);
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  setLegendTooltip({ objective: obj, rect });
}}
onMouseLeave={() => {
  onHoverObjective(null);
  setLegendTooltip(null);
}}
```

Add tooltip rendering before the closing `</div>` of the component return:
```tsx
{legendTooltip && (
  <TimelineLegendTooltip
    objective={legendTooltip.objective}
    anchorRect={legendTooltip.rect}
  />
)}
```

- [ ] **Step 5: Run legend tests**

Run: `cd frontend && npx vitest run src/__tests__/components/company/TimelineLegend.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/company/TimelineLegendTooltip.tsx frontend/src/components/company/TimelineLegend.tsx frontend/src/__tests__/components/company/TimelineLegend.test.tsx
git commit -m "feat(timeline): legend hover tooltip shows subtitle and original quote"
```

---

## Task 6: Zero Selection State

**Files:**
- Modify: `frontend/src/components/company/TimelineLegend.tsx`
- Modify: `frontend/src/components/company/TimelineCanvas.tsx`
- Modify: `frontend/src/__tests__/components/company/TimelineLegend.test.tsx`

- [ ] **Step 1: Write failing tests for zero selection**

Add to `frontend/src/__tests__/components/company/TimelineLegend.test.tsx`:

```typescript
it("allows deselecting the last objective (no min-1 constraint)", async () => {
  const toggle = vi.fn();
  render(
    <TimelineLegend
      objectives={objectives}
      selectedIds={new Set(["a"])}
      onToggleSelection={toggle}
      onHoverObjective={vi.fn()}
      colours={colours}
      hasSignals={() => true}
    />
  );
  await userEvent.click(screen.getByText("Revenue Growth"));
  expect(toggle).toHaveBeenCalledWith("a");
});

it("shows dynamic count in footer", () => {
  const hasSignals = (id: string) => id !== "d"; // 3 of 4 have signals
  render(
    <TimelineLegend
      objectives={objectives}
      selectedIds={new Set(["a", "b"])}
      onToggleSelection={vi.fn()}
      onHoverObjective={vi.fn()}
      colours={colours}
      hasSignals={hasSignals}
    />
  );
  expect(screen.getByText("2 of 3 selected")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/__tests__/components/company/TimelineLegend.test.tsx`
Expected: FAIL — min-1 guard blocks deselection; footer hardcodes "of 3"

- [ ] **Step 3: Remove min-1 guard and shake animation from TimelineLegend**

In `frontend/src/components/company/TimelineLegend.tsx`:

Remove these lines:
```typescript
const isLastSelected = selectedIds.size <= 1;
const [shakingId, setShakingId] = useState<string | null>(null);
```

In `renderItem`, remove the shake animation class from the button className:
```typescript
// Remove: shakingId === obj.id ? "animate-[shake_0.3s_ease-in-out]" : ""
```

In the `onClick` handler, remove the shake guard:
```typescript
// Remove this block:
// if (isSelected && isLastSelected) {
//   setShakingId(obj.id);
//   setTimeout(() => setShakingId(null), 300);
//   return;
// }
```

The onClick should simply be:
```typescript
onClick={() => {
  if (isDisabled) return;
  onToggleSelection(obj.id);
}}
```

- [ ] **Step 4: Update footer to use dynamic count**

In the footer section of `TimelineLegend.tsx`, change:
```tsx
<span className="font-mono text-[9px] text-muted-foreground">
  {selectedIds.size} of 3 selected
</span>
```
To:
```tsx
<span className="font-mono text-[9px] text-muted-foreground">
  {selectedIds.size} of {objectives.filter((o) => hasSignals(o.id)).length} selected
</span>
```

- [ ] **Step 5: Remove min-1 guard from TimelineCanvas `toggleObjective`**

In `frontend/src/components/company/TimelineCanvas.tsx`, in the `toggleObjective` function (around line 244):

Change:
```typescript
function toggleObjective(id: string) {
  setSelectedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) {
      if (next.size <= 1) return prev;  // Remove this line
      next.delete(id);
    } else {
      if (next.size >= 3) return prev;  // Keep this line — max-3 stays
      next.add(id);
    }
    return next;
  });
}
```

- [ ] **Step 6: Add empty state overlay to TimelineCanvas**

In `TimelineCanvas.tsx`, inside the scrollable data area, after the SVG and DOM node rendering but inside the `relative` div, add an empty state overlay when nothing is selected:

```tsx
{/* Empty state overlay */}
{visibleObjectives.length === 0 && (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
    <p className="font-serif italic text-sm text-muted-foreground opacity-40">
      Select an objective to view its trajectory
    </p>
  </div>
)}
```

Place this after the crossing markers block (around line 460) and before the closing `</div>` of the scrollable area.

- [ ] **Step 7: Update existing tests**

The existing test `"shows N of 3 selected counter"` in `TimelineLegend.test.tsx` needs updating since it expects hardcoded "of 3". With `hasSignals` returning true for all, all 4 objectives have signals, so the footer will show "of 4":

Update the test assertion:
```typescript
// Was: expect(screen.getByText("2 of 3 selected")).toBeInTheDocument();
expect(screen.getByText("2 of 4 selected")).toBeInTheDocument();
```

- [ ] **Step 8: Run all timeline tests**

Run: `cd frontend && npx vitest run src/__tests__/components/company/TimelineLegend.test.tsx src/__tests__/components/company/TimelineCanvas.test.tsx`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add frontend/src/components/company/TimelineLegend.tsx frontend/src/components/company/TimelineCanvas.tsx frontend/src/__tests__/components/company/TimelineLegend.test.tsx
git commit -m "feat(timeline): zero selection state — remove min-1 constraint, add empty state prompt"
```

---

## Task 7: Database Schema Update

**Files:**
- Modify: `backend/schema.sql`

- [ ] **Step 1: Add `year_end_review` to signal_classification enum**

In `backend/schema.sql`, update the `signal_classification` enum (line 25):

```sql
create type signal_classification as enum (
  'stated',
  'reinforced',
  'softened',
  'reframed',
  'absent',
  'achieved',
  'retired_transparent',
  'retired_silent',
  'year_end_review'
);
```

- [ ] **Step 2: Add `fiscal_year_end_month` column to companies table**

In the `companies` table definition, add after the `search_keywords` field:

```sql
  -- Fiscal calendar
  fiscal_year_end_month integer default 12 check (fiscal_year_end_month between 1 and 12)
```

- [ ] **Step 3: Add migration comment for existing databases**

After the existing migration comment for `exit_manner`, add:

```sql
-- Migration for existing databases:
-- ALTER TYPE signal_classification ADD VALUE 'year_end_review';
-- ALTER TABLE companies ADD COLUMN fiscal_year_end_month integer DEFAULT 12 CHECK (fiscal_year_end_month BETWEEN 1 AND 12);
```

- [ ] **Step 4: Commit**

```bash
git add backend/schema.sql
git commit -m "feat(schema): add year_end_review signal type and fiscal_year_end_month column"
```

---

## Task 8: Full Test Suite + Final Verification

- [ ] **Step 1: Run the full test suite**

Run: `cd frontend && npx vitest run`
Expected: All tests pass

- [ ] **Step 2: Run TypeScript type checking**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run build**

Run: `cd frontend && npm run build`
Expected: Build succeeds

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address test/build issues from timeline v3.1 refinements"
```
