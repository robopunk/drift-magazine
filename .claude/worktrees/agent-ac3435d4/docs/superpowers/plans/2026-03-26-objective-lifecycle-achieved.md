# Objective Lifecycle: Proved — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce "Proved" as a positive terminal state for objectives, parallel to the existing "Buried" graveyard system, with a unified `terminal_state` enum replacing the `is_in_graveyard` boolean.

**Architecture:** Replace `is_in_graveyard: boolean` with `terminal_state: 'proved' | 'buried' | null` across schema, types, and all components. Add a new ProvedCard component and Proved tab. Make both terminal states selectable on the timeline canvas with distinctive terminal node markers. Legend reorders to: Proved → Objectives → Buried.

**Tech Stack:** Next.js 15 + TypeScript + Tailwind CSS, Vitest + React Testing Library, Supabase/Postgres

**Spec:** `docs/superpowers/specs/2026-03-26-objective-lifecycle-achieved-design.md`

**IMPORTANT:** This is a Next.js 15 project with breaking changes from earlier versions. Before writing any code that touches Next.js APIs, read the relevant guide in `frontend/node_modules/next/dist/docs/` per the instruction in `frontend/AGENTS.md`.

**Out of scope for this plan:** `backend/agent.py` changes (proved transition logic). The agent automation from spec section 8 will be addressed in a separate follow-up task once the schema and frontend are in place.

---

## File Structure

### New files
| File | Responsibility |
|---|---|
| `frontend/src/components/company/ProvedCard.tsx` | Card component for proved objectives (parallels BuriedCard) |
| `frontend/src/__tests__/components/company/ProvedCard.test.tsx` | Tests for ProvedCard |

### Modified files
| File | Changes |
|---|---|
| `frontend/src/lib/types.ts` | Replace `is_in_graveyard: boolean` with `terminal_state`, add `proved_count` to CompanySummary |
| `frontend/src/components/company/TabBar.tsx` | Add `proved` tab (5 tabs total), emerald badge styling |
| `frontend/src/components/company/TimelineLegend.tsx` | 3 sections (Proved → Objectives → Buried), enable selection for terminal objectives |
| `frontend/src/components/company/TimelineNode.tsx` | Add `terminal-proved` and `terminal-buried` node types |
| `frontend/src/components/company/TimelinePath.tsx` | No changes needed (spline naturally ends at last point) |
| `frontend/src/components/company/BuriedCard.tsx` | No changes needed (receives pre-filtered objectives) |
| `frontend/src/app/company/[ticker]/page.tsx` | Filter by `terminal_state`, pass `provedObjectives` prop |
| `frontend/src/app/company/[ticker]/client.tsx` | Add Proved tab rendering, update props and filters |
| `frontend/src/components/landing/CompanyCard.tsx` | Update `buried_count` reference |
| `backend/schema.sql` | Add `terminal_state` enum, migration, update views/triggers |
| `frontend/src/__tests__/components/company/TabBar.test.tsx` | Test 5 tabs, proved badge styling |
| `frontend/src/__tests__/components/company/TimelineLegend.test.tsx` | Test 3 sections, proved selectable |
| `frontend/src/__tests__/components/company/TimelineNode.test.tsx` | Test terminal node types |
| `frontend/src/__tests__/components/company/BuriedCard.test.tsx` | Update mock: `is_in_graveyard` → `terminal_state` |
| `frontend/src/__tests__/components/company/ObjectiveCard.test.tsx` | Update mock: `is_in_graveyard` → `terminal_state` |
| `frontend/src/__tests__/components/company/EvidenceTable.test.tsx` | Update mock: `is_in_graveyard` → `terminal_state` |
| `frontend/src/__tests__/components/company/TimelineCanvas.test.tsx` | Update mock: `is_in_graveyard` → `terminal_state` |
| `frontend/src/__tests__/components/landing/CompanyCard.test.tsx` | Update mock: add `proved_count` |

---

## Task 1: Update types.ts — Replace `is_in_graveyard` with `terminal_state`

**Files:**
- Modify: `frontend/src/lib/types.ts:16,56-73,104-110`

- [ ] **Step 1: Add `TerminalState` type and `terminal-proved`/`terminal-buried` to `TimelineNodeType`**

In `frontend/src/lib/types.ts`, add the new type after line 14 and update `TimelineNodeType`:

```typescript
export type TerminalState = "proved" | "buried";

export type TimelineNodeType = "origin" | "signal" | "latest" | "cadence" | "stale" | "fiscal-year-end" | "terminal-proved" | "terminal-buried";
```

- [ ] **Step 2: Replace `is_in_graveyard` with `terminal_state` in the `Objective` interface**

Replace line 72 in the `Objective` interface:

```typescript
// Remove:
//   is_in_graveyard: boolean;
// Add:
  terminal_state: TerminalState | null;
```

- [ ] **Step 3: Update `CompanySummary` to include `proved_count`**

Update the `CompanySummary` interface:

```typescript
export interface CompanySummary extends Company {
  objectives: Objective[];
  active_count: number;
  drifting_count: number;
  proved_count: number;
  buried_count: number;
  editorial_verdict: string | null;
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/types.ts
git commit -m "refactor(types): replace is_in_graveyard with terminal_state enum"
```

---

## Task 2: Update TabBar — Add Proved tab

**Files:**
- Modify: `frontend/src/components/company/TabBar.tsx`
- Modify: `frontend/src/__tests__/components/company/TabBar.test.tsx`

- [ ] **Step 1: Write failing tests for the 5-tab system**

Replace the full content of `frontend/src/__tests__/components/company/TabBar.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TabBar } from "@/components/company/TabBar";

describe("TabBar", () => {
  const counts = { objectives: 6, proved: 1, buried: 3, evidence: 42 };

  it("renders all five tab labels", () => {
    render(<TabBar activeTab="timeline" onTabChange={() => {}} counts={counts} />);
    expect(screen.getByText("Timeline")).toBeInTheDocument();
    expect(screen.getByText(/Objectives/)).toBeInTheDocument();
    expect(screen.getByText(/Proved/)).toBeInTheDocument();
    expect(screen.getByText(/Buried/)).toBeInTheDocument();
    expect(screen.getByText(/Evidence/)).toBeInTheDocument();
  });

  it("shows counts next to tab labels", () => {
    render(<TabBar activeTab="timeline" onTabChange={() => {}} counts={counts} />);
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("calls onTabChange when clicking a tab", async () => {
    const onTabChange = vi.fn();
    render(<TabBar activeTab="timeline" onTabChange={onTabChange} counts={counts} />);
    await userEvent.click(screen.getByText(/Proved/));
    expect(onTabChange).toHaveBeenCalledWith("proved");
  });

  it("uses top-16 sticky offset to clear the taller masthead", () => {
    const { container } = render(<TabBar activeTab="timeline" onTabChange={() => {}} counts={counts} />);
    const stickyEl = container.querySelector(".sticky");
    expect(stickyEl).toHaveClass("top-16");
  });

  it("marks active tab with green underline class", () => {
    render(<TabBar activeTab="proved" onTabChange={() => {}} counts={counts} />);
    const provedTab = screen.getByText(/Proved/).closest("button");
    expect(provedTab?.className).toContain("border-primary");
  });

  it("styles proved count badge with emerald tint when count > 0", () => {
    render(<TabBar activeTab="timeline" onTabChange={() => {}} counts={counts} />);
    const provedBadge = screen.getByText("1");
    expect(provedBadge.className).toContain("text-primary");
  });

  it("styles buried count badge with destructive tint when count > 0", () => {
    render(<TabBar activeTab="timeline" onTabChange={() => {}} counts={counts} />);
    const buriedBadge = screen.getByText("3");
    expect(buriedBadge.className).toContain("text-destructive");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npx vitest run src/__tests__/components/company/TabBar.test.tsx
```

Expected: FAIL — `proved` tab doesn't exist, counts prop shape mismatch.

- [ ] **Step 3: Update TabBar component**

Replace the full content of `frontend/src/components/company/TabBar.tsx`:

```typescript
"use client";

export type TabId = "timeline" | "objectives" | "proved" | "buried" | "evidence";

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  counts: {
    objectives: number;
    proved: number;
    buried: number;
    evidence: number;
  };
}

const TABS: { id: TabId; label: string; countKey?: keyof TabBarProps["counts"] }[] = [
  { id: "timeline", label: "Timeline" },
  { id: "objectives", label: "Objectives", countKey: "objectives" },
  { id: "proved", label: "Proved", countKey: "proved" },
  { id: "buried", label: "Buried", countKey: "buried" },
  { id: "evidence", label: "Evidence", countKey: "evidence" },
];

export function TabBar({ activeTab, onTabChange, counts }: TabBarProps) {
  return (
    <div className="border-b border-border sticky top-16 z-40 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-0">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = tab.countKey ? counts[tab.countKey] : undefined;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-4 py-3 text-sm font-sans font-medium border-b-2 transition-colors ${
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {count != null && (
                <span
                  className={`ml-1.5 text-xs font-mono px-1.5 py-0.5 rounded-full ${
                    tab.id === "proved" && count > 0
                      ? "bg-primary/10 text-primary"
                      : tab.id === "buried" && count > 0
                      ? "bg-destructive/10 text-destructive"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend && npx vitest run src/__tests__/components/company/TabBar.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/company/TabBar.tsx frontend/src/__tests__/components/company/TabBar.test.tsx
git commit -m "feat(TabBar): add Proved tab with emerald badge styling"
```

---

## Task 3: Create ProvedCard component

**Files:**
- Create: `frontend/src/components/company/ProvedCard.tsx`
- Create: `frontend/src/__tests__/components/company/ProvedCard.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `frontend/src/__tests__/components/company/ProvedCard.test.tsx`:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProvedCard } from "@/components/company/ProvedCard";
import type { Objective } from "@/lib/types";

const mockProved: Objective = {
  id: "obj-p1", company_id: "c-1", display_number: 1,
  title: "Global Biosimilar Leadership", subtitle: null, original_quote: null,
  status: "achieved", first_stated_date: "2023-10-04", last_confirmed_date: "2026-03-15",
  exit_date: "2026-03-15", exit_manner: "achieved", transparency_score: "high",
  verdict_text: "Sandoz delivered on its founding promise: #1 global biosimilar company by revenue.",
  successor_objective_id: null, momentum_score: 3, terminal_state: "proved",
};

describe("ProvedCard", () => {
  it("renders the title", () => {
    render(<ProvedCard objective={mockProved} />);
    expect(screen.getByText("Global Biosimilar Leadership")).toBeInTheDocument();
  });

  it("shows PROVED badge", () => {
    render(<ProvedCard objective={mockProved} />);
    expect(screen.getByText(/PROVED/)).toBeInTheDocument();
  });

  it("shows trophy emoji", () => {
    render(<ProvedCard objective={mockProved} />);
    expect(screen.getByText("🏆")).toBeInTheDocument();
  });

  it("shows transparency score", () => {
    render(<ProvedCard objective={mockProved} />);
    expect(screen.getByText(/High/)).toBeInTheDocument();
  });

  it("shows verdict text", () => {
    render(<ProvedCard objective={mockProved} />);
    expect(screen.getByText(/Sandoz delivered/)).toBeInTheDocument();
  });

  it("shows final momentum score", () => {
    render(<ProvedCard objective={mockProved} />);
    expect(screen.getByText("+3")).toBeInTheDocument();
  });

  it("shows date range with duration", () => {
    render(<ProvedCard objective={mockProved} />);
    // Should show something like "Oct 2023 → Mar 2026 · 29 months"
    expect(screen.getByText(/Oct 2023/)).toBeInTheDocument();
    expect(screen.getByText(/months/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npx vitest run src/__tests__/components/company/ProvedCard.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create ProvedCard component**

Create `frontend/src/components/company/ProvedCard.tsx`:

```typescript
import type { Objective, TransparencyScore } from "@/lib/types";
import { getStage, scoreToStage } from "@/lib/momentum";

interface ProvedCardProps { objective: Objective; }

const TRANSPARENCY_LABELS: Record<TransparencyScore, string> = {
  very_low: "Very Low", low: "Low", medium: "Medium", high: "High",
};

const TRANSPARENCY_WIDTH: Record<TransparencyScore, string> = {
  very_low: "15%", low: "35%", medium: "60%", high: "90%",
};

function computeDurationMonths(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date(dateStr));
}

export function ProvedCard({ objective }: ProvedCardProps) {
  const stage = getStage(scoreToStage(objective.momentum_score));
  const dateRange = [objective.first_stated_date, objective.exit_date].filter(Boolean);
  const duration = objective.first_stated_date && objective.exit_date
    ? computeDurationMonths(objective.first_stated_date, objective.exit_date)
    : null;

  const dateLabel = dateRange.length > 0
    ? dateRange.map((d) => formatDate(d!)).join(" → ")
      + (duration !== null ? ` · ${duration} months` : "")
    : null;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="h-[3px]" style={{ backgroundColor: "#059669" }} />
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <span
              className="inline-block font-mono text-xs uppercase tracking-wider px-2 py-0.5 rounded mb-2"
              style={{ backgroundColor: "rgba(5,150,105,0.15)", color: "#059669" }}
            >
              PROVED
            </span>
            <h3 className="font-serif font-bold text-base text-card-foreground">{objective.title}</h3>
          </div>
          <span className="text-xl shrink-0 ml-2">🏆</span>
        </div>
        {dateLabel && (
          <p className="font-mono text-xs text-muted-foreground mt-1">{dateLabel}</p>
        )}
        {objective.verdict_text && (
          <p className="font-sans text-sm text-card-foreground mt-3 leading-relaxed">{objective.verdict_text}</p>
        )}
        <div className="flex items-center justify-between mt-3">
          <span className="font-mono text-[0.65rem] text-muted-foreground uppercase tracking-wider">Final momentum</span>
          <span className="font-serif text-lg font-bold" style={{ color: stage.colour }}>
            {objective.momentum_score >= 0 ? "+" : ""}{objective.momentum_score}
          </span>
        </div>
        <div className="mt-3 p-2 rounded" style={{ backgroundColor: "rgba(5,150,105,0.06)" }}>
          <p className="font-serif italic text-xs text-muted-foreground">{stage.caption}</p>
        </div>
        {objective.transparency_score && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[0.65rem] text-muted-foreground uppercase tracking-wider">Transparency</span>
              <span className="font-mono text-xs text-muted-foreground">{TRANSPARENCY_LABELS[objective.transparency_score]}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: TRANSPARENCY_WIDTH[objective.transparency_score], backgroundColor: "#059669" }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend && npx vitest run src/__tests__/components/company/ProvedCard.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/company/ProvedCard.tsx frontend/src/__tests__/components/company/ProvedCard.test.tsx
git commit -m "feat(ProvedCard): add proved objective card component with trophy, duration, final momentum"
```

---

## Task 4: Update TimelineLegend — Three sections, terminal objectives selectable

**Files:**
- Modify: `frontend/src/components/company/TimelineLegend.tsx`
- Modify: `frontend/src/__tests__/components/company/TimelineLegend.test.tsx`

- [ ] **Step 1: Write failing tests for the 3-section legend**

Replace the full content of `frontend/src/__tests__/components/company/TimelineLegend.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimelineLegend } from "@/components/company/TimelineLegend";
import type { Objective } from "@/lib/types";

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
    momentum_score: 2,
    terminal_state: null,
    ...overrides,
  };
}

const objectives: Objective[] = [
  makeObjective({ id: "a", title: "Revenue Growth", display_number: 1, momentum_score: 3 }),
  makeObjective({ id: "b", title: "Market Penetration", display_number: 2, momentum_score: 2 }),
  makeObjective({ id: "c", title: "Pipeline Expansion", display_number: 3, momentum_score: 1 }),
  makeObjective({ id: "d", title: "Cost Reduction", display_number: 4, momentum_score: -1 }),
];

const colours = new Map([
  ["a", "#059669"],
  ["b", "#3b82f6"],
  ["c", "#8b5cf6"],
  ["d", "#ec4899"],
]);

describe("TimelineLegend", () => {
  it("renders objective titles (not OBJ IDs)", () => {
    render(
      <TimelineLegend
        objectives={objectives}
        selectedIds={new Set(["a"])}
        onToggleSelection={vi.fn()}
        onHoverObjective={vi.fn()}
        colours={colours}
        hasSignals={() => true}
      />
    );
    expect(screen.getByText("Revenue Growth")).toBeInTheDocument();
    expect(screen.queryByText(/OBJ/)).toBeNull();
  });

  it("calls onToggleSelection when checkbox clicked", async () => {
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
    await userEvent.click(screen.getByText("Market Penetration"));
    expect(toggle).toHaveBeenCalledWith("b");
  });

  it("shows N of X selected counter", () => {
    render(
      <TimelineLegend
        objectives={objectives}
        selectedIds={new Set(["a", "b"])}
        onToggleSelection={vi.fn()}
        onHoverObjective={vi.fn()}
        colours={colours}
        hasSignals={() => true}
      />
    );
    expect(screen.getByText("2 of 4 selected")).toBeInTheDocument();
  });

  it("disables unchecked items when 3 are selected (max enforcement)", async () => {
    const toggle = vi.fn();
    render(
      <TimelineLegend
        objectives={objectives}
        selectedIds={new Set(["a", "b", "c"])}
        onToggleSelection={toggle}
        onHoverObjective={vi.fn()}
        colours={colours}
        hasSignals={() => true}
      />
    );
    const costBtn = screen.getByText("Cost Reduction").closest("button")!;
    expect(costBtn).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(costBtn);
    expect(toggle).not.toHaveBeenCalled();
  });

  it("still calls toggle for selected items when at limit (allows deselection)", async () => {
    const toggle = vi.fn();
    render(
      <TimelineLegend
        objectives={objectives}
        selectedIds={new Set(["a", "b", "c"])}
        onToggleSelection={toggle}
        onHoverObjective={vi.fn()}
        colours={colours}
        hasSignals={() => true}
      />
    );
    await userEvent.click(screen.getByText("Revenue Growth"));
    expect(toggle).toHaveBeenCalledWith("a");
  });

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

  it("renders Proved section header for proved objectives", () => {
    const withProved = [
      ...objectives,
      makeObjective({ id: "p", title: "Biosimilar Leadership", display_number: 1, terminal_state: "proved", momentum_score: 3, exit_manner: "achieved" }),
    ];
    const coloursWithProved = new Map([...colours, ["p", "#059669"]]);
    render(
      <TimelineLegend
        objectives={withProved}
        selectedIds={new Set(["a"])}
        onToggleSelection={vi.fn()}
        onHoverObjective={vi.fn()}
        colours={coloursWithProved}
        hasSignals={() => true}
      />
    );
    expect(screen.getByText("Proved")).toBeInTheDocument();
    expect(screen.getByText("Biosimilar Leadership")).toBeInTheDocument();
    expect(screen.getByText("PROVED")).toBeInTheDocument();
  });

  it("renders buried section with exit manner label for graveyard objectives", () => {
    const withBuried = [
      ...objectives,
      makeObjective({ id: "e", title: "China Growth", display_number: 5, terminal_state: "buried", momentum_score: -4, exit_manner: "silent" }),
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
  });

  it("allows selecting proved objectives for timeline display", async () => {
    const toggle = vi.fn();
    const withProved = [
      makeObjective({ id: "p", title: "Biosimilar Leadership", display_number: 1, terminal_state: "proved", momentum_score: 3, exit_manner: "achieved" }),
    ];
    render(
      <TimelineLegend
        objectives={withProved}
        selectedIds={new Set()}
        onToggleSelection={toggle}
        onHoverObjective={vi.fn()}
        colours={new Map([["p", "#059669"]])}
        hasSignals={() => true}
      />
    );
    await userEvent.click(screen.getByText("Biosimilar Leadership"));
    expect(toggle).toHaveBeenCalledWith("p");
  });

  it("allows selecting buried objectives for timeline display", async () => {
    const toggle = vi.fn();
    const withBuried = [
      makeObjective({ id: "e", title: "China Growth", display_number: 5, terminal_state: "buried", momentum_score: -4, exit_manner: "silent" }),
    ];
    render(
      <TimelineLegend
        objectives={withBuried}
        selectedIds={new Set()}
        onToggleSelection={toggle}
        onHoverObjective={vi.fn()}
        colours={new Map([["e", "#78716c"]])}
        hasSignals={() => true}
      />
    );
    await userEvent.click(screen.getByText("China Growth"));
    expect(toggle).toHaveBeenCalledWith("e");
  });

  it("renders sections in order: Proved → Objectives → Buried", () => {
    const allTypes = [
      makeObjective({ id: "p", title: "Proved Obj", display_number: 1, terminal_state: "proved", momentum_score: 3 }),
      makeObjective({ id: "a", title: "Active Obj", display_number: 2, momentum_score: 2 }),
      makeObjective({ id: "e", title: "Buried Obj", display_number: 3, terminal_state: "buried", momentum_score: -4, exit_manner: "silent" }),
    ];
    const { container } = render(
      <TimelineLegend
        objectives={allTypes}
        selectedIds={new Set()}
        onToggleSelection={vi.fn()}
        onHoverObjective={vi.fn()}
        colours={new Map([["p", "#059669"], ["a", "#3b82f6"], ["e", "#78716c"]])}
        hasSignals={() => true}
      />
    );
    const headers = container.querySelectorAll("h3");
    const headerTexts = Array.from(headers).map((h) => h.textContent?.trim());
    expect(headerTexts).toEqual(["Proved", "Objectives", "Buried"]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npx vitest run src/__tests__/components/company/TimelineLegend.test.tsx
```

Expected: FAIL — tests reference `terminal_state` but component still uses `is_in_graveyard`.

- [ ] **Step 3: Update TimelineLegend component**

Replace the full content of `frontend/src/components/company/TimelineLegend.tsx`:

```typescript
"use client";

import { useState } from "react";
import type { Objective } from "@/lib/types";
import { getStage, scoreToStage } from "@/lib/momentum";
import { TimelineLegendTooltip } from "./TimelineLegendTooltip";

interface TimelineLegendProps {
  objectives: Objective[];
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onHoverObjective: (id: string | null) => void;
  colours: Map<string, string>;
  hasSignals: (id: string) => boolean;
}

const EXIT_MANNER_LABELS: Record<string, string> = {
  silent: "SILENT DROP",
  phased: "PHASED OUT",
  morphed: "MORPHED",
  transparent: "TRANSPARENT EXIT",
  achieved: "ACHIEVED",
  resurrected: "RESURRECTED",
};

export function TimelineLegend({ objectives, selectedIds, onToggleSelection, onHoverObjective, colours, hasSignals }: TimelineLegendProps) {
  const proved = objectives.filter((o) => o.terminal_state === "proved");
  const alive = objectives.filter((o) => o.terminal_state === null);
  const buried = objectives.filter((o) => o.terminal_state === "buried");
  const atLimit = selectedIds.size >= 3;
  const [legendTooltip, setLegendTooltip] = useState<{ objective: Objective; rect: DOMRect } | null>(null);

  function renderItem(obj: Objective) {
    const stage = getStage(scoreToStage(obj.momentum_score));
    const colour = colours.get(obj.id) ?? stage.colour;
    const isSelected = selectedIds.has(obj.id);
    const hasData = hasSignals(obj.id);
    const isDisabled = (!isSelected && atLimit) || !hasData;
    const isProved = obj.terminal_state === "proved";
    const isBuried = obj.terminal_state === "buried";

    return (
      <button
        key={obj.id}
        className={`w-full text-left px-2.5 py-2 rounded-md text-xs transition-all ${
          !hasData ? "opacity-40 cursor-not-allowed" : ""
        } ${
          isSelected
            ? "border border-current"
            : isDisabled
            ? "opacity-60 cursor-not-allowed border border-transparent"
            : "opacity-60 hover:opacity-80 border border-transparent"
        }`}
        style={
          isSelected
            ? {
                borderColor: colour,
                backgroundColor: `color-mix(in srgb, ${colour} 6%, transparent)`,
              }
            : undefined
        }
        onClick={() => {
          if (isDisabled) return;
          onToggleSelection(obj.id);
        }}
        onMouseEnter={(e) => {
          if (selectedIds.has(obj.id)) onHoverObjective(obj.id);
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          setLegendTooltip({ objective: obj, rect });
        }}
        onMouseLeave={() => {
          onHoverObjective(null);
          setLegendTooltip(null);
        }}
        aria-disabled={isDisabled}
      >
        <div className="flex items-start gap-2">
          <span
            className="mt-0.5 shrink-0 w-[14px] h-[14px] rounded-sm border-2 flex items-center justify-center"
            style={{
              borderColor: colour,
              backgroundColor: isSelected ? colour : "transparent",
            }}
          >
            {isSelected && (
              <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="2,6 5,9 10,3" />
              </svg>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-serif text-[12.5px] leading-tight text-card-foreground">
              {obj.title}
            </p>
            <p className="font-mono text-[9.5px] uppercase tracking-wider mt-0.5" style={{ color: colour }}>
              {isProved
                ? "PROVED"
                : isBuried && obj.exit_manner
                ? (
                    <>
                      {EXIT_MANNER_LABELS[obj.exit_manner] ?? obj.exit_manner.toUpperCase()}
                      {obj.exit_manner === "resurrected" && (
                        <span className="ml-1 text-[9px]" title="Resurrected">&#x2191;</span>
                      )}
                    </>
                  )
                : `${stage.label} (${stage.score > 0 ? "+" : ""}${stage.score})`}
            </p>
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="w-[210px] shrink-0 border-r border-border flex flex-col">
      <div className="flex-1 overflow-y-auto py-2 px-1.5">
        {proved.length > 0 && (
          <>
            <h3 className="font-mono text-[9px] uppercase tracking-[1.5px] text-muted-foreground px-2 mb-2">
              Proved
            </h3>
            {proved.map(renderItem)}
            <div className="border-t border-border my-3 mx-2" />
          </>
        )}
        <h3 className="font-mono text-[9px] uppercase tracking-[1.5px] text-muted-foreground px-2 mb-2">
          Objectives
        </h3>
        {alive.map(renderItem)}
        {buried.length > 0 && (
          <>
            <div className="border-t border-border my-3 mx-2" />
            <h3 className="font-mono text-[9px] uppercase tracking-[1.5px] text-muted-foreground px-2 mb-2">
              Buried
            </h3>
            {buried.map(renderItem)}
          </>
        )}
      </div>
      <div className="border-t border-border px-2 py-2 text-center">
        <span className="font-mono text-[9px] text-muted-foreground">
          {selectedIds.size} of {objectives.filter((o) => hasSignals(o.id)).length} selected
        </span>
      </div>
      {legendTooltip && (
        <TimelineLegendTooltip
          objective={legendTooltip.objective}
          anchorRect={legendTooltip.rect}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend && npx vitest run src/__tests__/components/company/TimelineLegend.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/company/TimelineLegend.tsx frontend/src/__tests__/components/company/TimelineLegend.test.tsx
git commit -m "feat(TimelineLegend): three sections (Proved/Objectives/Buried), terminal objectives selectable"
```

---

## Task 5: Update TimelineNode — Add terminal node types

**Files:**
- Modify: `frontend/src/components/company/TimelineNode.tsx`
- Modify: `frontend/src/__tests__/components/company/TimelineNode.test.tsx`

- [ ] **Step 1: Write failing tests for terminal nodes**

Add the following tests to the end of the `describe` block in `frontend/src/__tests__/components/company/TimelineNode.test.tsx`:

```typescript
  it("terminal-proved node renders 12px circle, outer ring, solid tick, and PROVED label", () => {
    const { container } = render(
      <TimelineNode type="terminal-proved" x={400} y={60} colour="#059669" label="PROVED" stackIndex={0} />
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
    // trophy emoji
    expect(screen.getByText("🏆")).toBeInTheDocument();
  });

  it("terminal-buried node renders 12px circle, outer ring, solid tick, and exit manner label", () => {
    const { container } = render(
      <TimelineNode type="terminal-buried" x={400} y={300} colour="#78716c" label="SILENT DROP" stackIndex={0} />
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
    expect(screen.getByText("⚰️")).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npx vitest run src/__tests__/components/company/TimelineNode.test.tsx
```

Expected: FAIL — `terminal-proved` and `terminal-buried` types not handled.

- [ ] **Step 3: Add terminal node rendering to TimelineNode**

In `frontend/src/components/company/TimelineNode.tsx`, add the following block after the `fiscal-year-end` handler (after line 76) and before the `origin` handler:

```typescript
  if (type === "terminal-proved" || type === "terminal-buried") {
    const isProved = type === "terminal-proved";
    const emoji = isProved ? "🏆" : "⚰️";
    const tickTopY = y - originTickH;
    return (
      <g
        aria-label={label}
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
        onClick={onClick}
        style={onClick ? { cursor: "pointer" } : undefined}
      >
        <circle cx={x} cy={y} r={10} fill={colour} fillOpacity={0.20} />
        <circle cx={x} cy={y} r={6} fill={colour} />
        <line
          x1={x}
          y1={y - 10}
          x2={x}
          y2={tickTopY}
          stroke="var(--foreground)"
          strokeWidth={1.5}
          opacity={0.95}
        />
        {label && (
          <text
            x={x}
            y={tickTopY - 14}
            fontSize={9}
            fill={colour}
            textAnchor="middle"
            fontFamily="var(--font-ibm-plex-mono)"
            fontWeight="bold"
          >
            {label}
          </text>
        )}
        <text
          x={x}
          y={tickTopY - 4}
          fontSize={12}
          textAnchor="middle"
        >
          {emoji}
        </text>
      </g>
    );
  }
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend && npx vitest run src/__tests__/components/company/TimelineNode.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/company/TimelineNode.tsx frontend/src/__tests__/components/company/TimelineNode.test.tsx
git commit -m "feat(TimelineNode): add terminal-proved and terminal-buried node types with emoji markers"
```

---

## Task 6: Update TimelineCanvas — Support terminal objectives and terminal nodes

**Files:**
- Modify: `frontend/src/components/company/TimelineCanvas.tsx`

- [ ] **Step 1: Update node generation to add terminal nodes for proved/buried objectives**

In `frontend/src/components/company/TimelineCanvas.tsx`, within the `objectiveNodeSets` useMemo (around line 123-153), after the `latestSignalIdx` calculation, add logic to append a terminal node when the objective has an `exit_date` and `terminal_state`:

Find this block (approximately lines 142-151):

```typescript
      // Find latest signal node for emphasis
      let latestSignalIdx = -1;
      for (let i = monthlyNodes.length - 1; i >= 0; i--) {
        if (monthlyNodes[i].type === "origin" || monthlyNodes[i].type === "signal") {
          latestSignalIdx = i;
          break;
        }
      }

      return { objective: obj, nodes: monthlyNodes, latestSignalIdx };
```

Replace with:

```typescript
      // Find latest signal node for emphasis
      let latestSignalIdx = -1;
      for (let i = monthlyNodes.length - 1; i >= 0; i--) {
        if (monthlyNodes[i].type === "origin" || monthlyNodes[i].type === "signal") {
          latestSignalIdx = i;
          break;
        }
      }

      // Add terminal node for proved/buried objectives
      if (obj.terminal_state && obj.exit_date) {
        const exitDate = new Date(obj.exit_date);
        const globalOrigin = new Date(minDate);
        const globalOriginMonth = new Date(globalOrigin.getFullYear(), globalOrigin.getMonth(), 1);
        const exitMonthOffset = (exitDate.getFullYear() - globalOriginMonth.getFullYear()) * 12 +
          (exitDate.getMonth() - globalOriginMonth.getMonth());
        const terminalX = exitMonthOffset * MONTH_WIDTH + MONTH_WIDTH / 2;
        const terminalY = scoreToY(obj.momentum_score);
        const terminalType = obj.terminal_state === "proved" ? "terminal-proved" : "terminal-buried";

        monthlyNodes.push({
          type: terminalType,
          month: exitDate,
          x: terminalX,
          y: terminalY,
          score: obj.momentum_score,
        });
      }

      return { objective: obj, nodes: monthlyNodes, latestSignalIdx };
```

- [ ] **Step 2: Update the node rendering to handle terminal node labels**

In the SVG nodes rendering section (around line 498), update the `stageLabel` computation to handle terminal types:

Find:
```typescript
                        const stageLabel =
                          node.type !== "cadence" && node.type !== "stale" && node.type !== "origin"
                            ? `${stageInfo.emoji} ${stageInfo.label.toUpperCase()} ${node.score >= 0 ? "+" : ""}${node.score}`
                            : undefined;
```

Replace with:
```typescript
                        const stageLabel =
                          node.type === "terminal-proved"
                            ? "PROVED"
                            : node.type === "terminal-buried"
                            ? (obj.exit_manner ? EXIT_MANNER_LABELS_CANVAS[obj.exit_manner] : "BURIED")
                            : node.type !== "cadence" && node.type !== "stale" && node.type !== "origin"
                            ? `${stageInfo.emoji} ${stageInfo.label.toUpperCase()} ${node.score >= 0 ? "+" : ""}${node.score}`
                            : undefined;
```

And add the following constant near the top of the file (after the `OBJECTIVE_COLOURS` array):

```typescript
const EXIT_MANNER_LABELS_CANVAS: Record<string, string> = {
  silent: "SILENT DROP",
  phased: "PHASED OUT",
  morphed: "MORPHED",
  transparent: "TRANSPARENT EXIT",
  achieved: "ACHIEVED",
  resurrected: "RESURRECTED",
};
```

- [ ] **Step 3: Update the `effectiveType` logic to not override terminal types**

Find:
```typescript
                        const effectiveType =
                          node.type === "signal" && i === latestSignalIdx ? "latest" : node.type;
```

Replace with:
```typescript
                        const effectiveType =
                          node.type === "terminal-proved" || node.type === "terminal-buried"
                            ? node.type
                            : node.type === "signal" && i === latestSignalIdx ? "latest" : node.type;
```

- [ ] **Step 4: Run the full test suite to check nothing is broken**

```bash
cd frontend && npx vitest run
```

Expected: Some tests will fail due to `is_in_graveyard` references in mock data — that's expected and will be fixed in Task 7.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/company/TimelineCanvas.tsx
git commit -m "feat(TimelineCanvas): support terminal objectives with proved/buried endpoint nodes"
```

---

## Task 7: Update company page — Add Proved tab routing and provedObjectives prop

**Files:**
- Modify: `frontend/src/app/company/[ticker]/page.tsx`
- Modify: `frontend/src/app/company/[ticker]/client.tsx`

- [ ] **Step 1: Update server component (`page.tsx`) filtering**

Replace lines 50-51 in `frontend/src/app/company/[ticker]/page.tsx`:

```typescript
// Remove:
//   const buried = objectives.filter((o) => o.is_in_graveyard);
//   const active = objectives.filter((o) => !o.is_in_graveyard);
// Replace with:
  const proved = objectives.filter((o) => o.terminal_state === "proved");
  const buried = objectives.filter((o) => o.terminal_state === "buried");
  const active = objectives.filter((o) => o.terminal_state === null);
```

Update the JSX to pass the new prop (lines 56-62):

```typescript
      <CompanyPageClient
        company={company}
        objectives={objectives}
        activeObjectives={active}
        provedObjectives={proved}
        buriedObjectives={buried}
        signals={signals}
      />
```

- [ ] **Step 2: Update client component (`client.tsx`) with Proved tab**

Replace the full content of `frontend/src/app/company/[ticker]/client.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { Company, Objective, Signal } from "@/lib/types";
import { TabBar, type TabId } from "@/components/company/TabBar";
import { AdSlot } from "@/components/landing/AdSlot";
import { TimelineCanvas } from "@/components/company/TimelineCanvas";
import { MobileObjectiveList } from "@/components/mobile/MobileObjectiveList";
import { ObjectiveCard } from "@/components/company/ObjectiveCard";
import { ProvedCard } from "@/components/company/ProvedCard";
import { BuriedCard } from "@/components/company/BuriedCard";
import { EvidenceTable } from "@/components/company/EvidenceTable";

interface CompanyPageClientProps {
  company: Company;
  objectives: Objective[];
  activeObjectives: Objective[];
  provedObjectives: Objective[];
  buriedObjectives: Objective[];
  signals: Signal[];
}

export function CompanyPageClient({
  company,
  objectives,
  activeObjectives,
  provedObjectives,
  buriedObjectives,
  signals,
}: CompanyPageClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = (searchParams.get("tab") as TabId) || "timeline";
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  function handleTabChange(tab: TabId) {
    setActiveTab(tab);
    const url =
      tab === "timeline"
        ? `/company/${company.ticker.toLowerCase()}`
        : `/company/${company.ticker.toLowerCase()}?tab=${tab}`;
    router.replace(url, { scroll: false });
  }

  return (
    <>
      <TabBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        counts={{
          objectives: activeObjectives.length,
          proved: provedObjectives.length,
          buried: buriedObjectives.length,
          evidence: signals.length,
        }}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "timeline" && (
          <>
            <div className="hidden md:block">
              <TimelineCanvas
                objectives={objectives}
                signals={signals}
                onNavigateToEvidence={() => handleTabChange("evidence")}
              />
            </div>
            <div className="block md:hidden">
              <MobileObjectiveList objectives={objectives} />
            </div>
          </>
        )}
        {activeTab === "objectives" && (
          activeObjectives.length === 0 ? (
            <p className="text-center py-20 text-muted-foreground font-sans">No objectives tracked yet for {company.name}.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeObjectives.map((obj) => (
                <ObjectiveCard key={obj.id} objective={obj} signals={signals.filter((s) => s.objective_id === obj.id)} />
              ))}
            </div>
          )
        )}
        {activeTab === "proved" && (
          provedObjectives.length === 0 ? (
            <div className="text-center py-20">
              <p className="font-serif text-lg text-foreground">No proved objectives yet.</p>
              <p className="font-sans text-sm text-muted-foreground mt-1">Objectives are marked as proved when companies deliver on their commitments.</p>
            </div>
          ) : (
            <>
              <div className="mb-6 p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🏆</span>
                  <h2 className="font-serif font-bold text-lg text-foreground">Proved</h2>
                </div>
                <p className="font-serif italic text-sm text-muted-foreground">Objectives that companies committed to publicly — and delivered.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {provedObjectives.map((obj) => (<ProvedCard key={obj.id} objective={obj} />))}
              </div>
            </>
          )
        )}
        {activeTab === "buried" && (
          buriedObjectives.length === 0 ? (
            <div className="text-center py-20">
              <p className="font-serif text-lg text-foreground">No buried objectives.</p>
              <p className="font-sans text-sm text-muted-foreground mt-1">All commitments remain on record.</p>
            </div>
          ) : (
            <>
              <div className="mb-6 p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{"\u26B0\uFE0F"}</span>
                  <h2 className="font-serif font-bold text-lg text-foreground">The Buried</h2>
                </div>
                <p className="font-serif italic text-sm text-muted-foreground">Objectives that companies stated publicly and then quietly dropped, reframed, or allowed to disappear without announcement.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {buriedObjectives.map((obj) => (<BuriedCard key={obj.id} objective={obj} />))}
              </div>
            </>
          )
        )}
        {activeTab === "evidence" && (<EvidenceTable signals={signals} objectives={objectives} />)}
      </div>
      <AdSlot slot={3} className="max-w-7xl mx-auto px-4 mb-8" />
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/company/[ticker]/page.tsx frontend/src/app/company/[ticker]/client.tsx
git commit -m "feat(company page): add Proved tab with ProvedCard grid, update filtering to use terminal_state"
```

---

## Task 8: Update all test mocks — Replace `is_in_graveyard` with `terminal_state`

**Files:**
- Modify: `frontend/src/__tests__/components/company/BuriedCard.test.tsx`
- Modify: `frontend/src/__tests__/components/company/ObjectiveCard.test.tsx`
- Modify: `frontend/src/__tests__/components/company/EvidenceTable.test.tsx`
- Modify: `frontend/src/__tests__/components/company/TimelineCanvas.test.tsx`
- Modify: `frontend/src/__tests__/components/landing/CompanyCard.test.tsx`

- [ ] **Step 1: Update BuriedCard test mock**

In `frontend/src/__tests__/components/company/BuriedCard.test.tsx`, line 12, replace:

```typescript
// Remove:
//   successor_objective_id: null, momentum_score: -4, is_in_graveyard: true,
// Replace with:
  successor_objective_id: null, momentum_score: -4, terminal_state: "buried" as const,
```

- [ ] **Step 2: Update ObjectiveCard test mock**

In `frontend/src/__tests__/components/company/ObjectiveCard.test.tsx`, line 13, replace:

```typescript
// Remove:
//   momentum_score: 3, is_in_graveyard: false,
// Replace with:
  momentum_score: 3, terminal_state: null,
```

- [ ] **Step 3: Update EvidenceTable test mock**

In `frontend/src/__tests__/components/company/EvidenceTable.test.tsx`, line 12, replace:

```typescript
// Remove:
//   verdict_text: null, successor_objective_id: null, momentum_score: 3, is_in_graveyard: false,
// Replace with:
  verdict_text: null, successor_objective_id: null, momentum_score: 3, terminal_state: null,
```

- [ ] **Step 4: Update TimelineCanvas test mock**

In `frontend/src/__tests__/components/company/TimelineCanvas.test.tsx`, line 29, replace:

```typescript
// Remove:
//   is_in_graveyard: false,
// Replace with:
  terminal_state: null,
```

- [ ] **Step 5: Update CompanyCard test mock**

In `frontend/src/__tests__/components/landing/CompanyCard.test.tsx`, line 23, add `proved_count`:

```typescript
// Find the line with buried_count: 3 and add proved_count before it:
  proved_count: 0,
  buried_count: 3,
```

- [ ] **Step 6: Run full test suite**

```bash
cd frontend && npx vitest run
```

Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add frontend/src/__tests__/
git commit -m "test: update all test mocks from is_in_graveyard to terminal_state"
```

---

## Task 9: Update CompanyCard and CompanySummary landing page references

**Files:**
- Modify: `frontend/src/components/landing/CompanyCard.tsx:48-49`

- [ ] **Step 1: Check if CompanyCard needs changes**

The CompanyCard uses `company.buried_count` which still exists in the new CompanySummary interface. No code change needed — the field name stays the same. The only addition is `proved_count` to the type, which was done in Task 1.

If you want to show proved count on the landing cards (optional — spec says this is out of scope), skip this. The existing `buried_count` reference will continue to work.

- [ ] **Step 2: Verify CompanyCard still compiles**

```bash
cd frontend && npx vitest run src/__tests__/components/landing/CompanyCard.test.tsx
```

Expected: PASS

- [ ] **Step 3: Commit (if any changes were made)**

No commit needed if no changes were made.

---

## Task 10: Update backend schema

**Files:**
- Modify: `backend/schema.sql`

- [ ] **Step 1: Add `terminal_state` enum and migration comments to schema.sql**

At the bottom of `backend/schema.sql`, add the following migration block:

```sql
-- ── V3 MIGRATIONS: Terminal State ──────────────────────────────
-- Run these against existing installations to bring them up to v3 schema

-- Step 1: Create the new enum
-- CREATE TYPE terminal_state AS ENUM ('proved', 'buried');

-- Step 2: Add the new column
-- ALTER TABLE objectives ADD COLUMN terminal_state terminal_state;

-- Step 3: Migrate existing data
-- UPDATE objectives SET terminal_state = 'buried' WHERE is_in_graveyard = true;

-- Step 4: Drop old column and index
-- ALTER TABLE objectives DROP COLUMN is_in_graveyard;
-- DROP INDEX IF EXISTS idx_objectives_graveyard;

-- Step 5: Add new indexes
-- CREATE INDEX idx_objectives_terminal ON objectives(terminal_state);

-- Step 6: Add proved_count to companies
-- ALTER TABLE companies ADD COLUMN proved_count integer DEFAULT 0;
```

- [ ] **Step 2: Update the objectives table definition in the canonical schema**

In the objectives table (around line 154), replace:

```sql
-- Remove:
--   is_in_graveyard       boolean default false,
-- Replace with:
  terminal_state        terminal_state,           -- null = active, 'proved' = delivered, 'buried' = graveyard
```

- [ ] **Step 3: Update the index (around line 162)**

Replace:

```sql
-- Remove:
-- create index idx_objectives_graveyard on objectives(is_in_graveyard);
-- Replace with:
create index idx_objectives_terminal on objectives(terminal_state);
```

- [ ] **Step 4: Add the `terminal_state` enum to the enums section (after `transparency_score`)**

```sql
create type terminal_state as enum ('proved', 'buried');
```

- [ ] **Step 5: Update the companies table to include `proved_count`**

In the companies table (around line 105), add after `graveyard_count`:

```sql
  proved_count               integer default 0,
```

- [ ] **Step 6: Update the `refresh_company_counts` trigger**

Replace the trigger function body (lines 273-291):

```sql
create or replace function refresh_company_counts()
returns trigger language plpgsql as $$
begin
  update companies set
    active_objective_count = (
      select count(*) from objectives
      where company_id = coalesce(new.company_id, old.company_id)
        and terminal_state is null
    ),
    proved_count = (
      select count(*) from objectives
      where company_id = coalesce(new.company_id, old.company_id)
        and terminal_state = 'proved'
    ),
    graveyard_count = (
      select count(*) from objectives
      where company_id = coalesce(new.company_id, old.company_id)
        and terminal_state = 'buried'
    )
  where id = coalesce(new.company_id, old.company_id);
  return coalesce(new, old);
end;
$$;
```

- [ ] **Step 7: Update the `v_company_summary` view**

Replace the view definition (lines 301-324):

```sql
create view v_company_summary as
select
  c.id,
  c.name,
  c.ticker,
  c.sector,
  c.initiative_name,
  c.initiative_subtitle,
  c.logo_initials,
  c.accent_color,
  c.overall_commitment_score,
  c.active_objective_count,
  c.proved_count,
  c.graveyard_count,
  c.last_signal_date,
  c.last_research_run,
  json_agg(
    json_build_object('status', o.status, 'title', o.title, 'terminal_state', o.terminal_state)
    order by o.display_order
  ) filter (where o.id is not null) as objectives_summary
from companies c
left join objectives o on o.company_id = c.id
where c.tracking_active = true
group by c.id;
```

- [ ] **Step 8: Commit**

```bash
git add backend/schema.sql
git commit -m "refactor(schema): replace is_in_graveyard with terminal_state enum, add proved_count"
```

---

## Task 11: Update roadmap and changelog

**Files:**
- Modify: `2026-03-25-2121-drift-visual-and-intelligence-roadmap.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Update roadmap Phase 2 statuses**

In `2026-03-25-2121-drift-visual-and-intelligence-roadmap.md`, update the Sub-project 2 table:

```markdown
| Phase | Scope | Status |
|---|---|---|
| 2.0 | Brainstorm + spec session (Sonnet) | ✅ Delivered |
| 2.1 | Schema — `terminal_state` enum, migration, views/triggers | ✅ Delivered |
| 2.2 | Frontend — ProvedCard, Proved tab, legend 3-section, TabBar 5-tab | ✅ Delivered |
| 2.3 | Timeline — terminal node types (proved + buried) on canvas | ✅ Delivered |
```

Add a delivery log entry:

```markdown
| 2026-03-26 | 2.0-2.3 | Proved lifecycle: terminal_state enum, ProvedCard, 5-tab system, 3-section legend, terminal nodes |
```

- [ ] **Step 2: Update CHANGELOG.md**

Add a new version entry at the top:

```markdown
## v3.1.0 — Objective Lifecycle: Proved (2026-03-26)

### Added
- **Proved terminal state** — new positive lifecycle endpoint for objectives companies delivered on
- **ProvedCard component** — emerald-themed card with trophy emoji, duration, final momentum, transparency bar
- **Proved tab** — dedicated company page tab for proved objectives
- **Terminal nodes on timeline** — 🏆 proved and ⚰️ buried endpoints plotted on spline with full signal history
- **Legend 3-section layout** — Proved → Objectives → Buried ordering, all sections selectable

### Changed
- **`terminal_state` enum** replaces `is_in_graveyard` boolean — unified `proved | buried | null` model
- **TabBar** — 5 tabs (Timeline, Objectives, Proved, Buried, Evidence) with emerald/destructive badge tinting
- **TimelineLegend** — buried objectives now selectable for timeline canvas (previously disabled)
- **Schema** — `terminal_state` column, updated views/triggers, `proved_count` on companies table
```

- [ ] **Step 3: Commit**

```bash
git add 2026-03-25-2121-drift-visual-and-intelligence-roadmap.md CHANGELOG.md
git commit -m "docs: update roadmap and changelog for v3.1.0 Proved lifecycle"
```

---

## Task 12: Run full test suite and verify

- [ ] **Step 1: Run all tests**

```bash
cd frontend && npx vitest run
```

Expected: ALL PASS

- [ ] **Step 2: Run the build to check for TypeScript errors**

```bash
cd frontend && npx next build
```

Expected: Build succeeds with no type errors.

- [ ] **Step 3: If any tests fail or build errors occur, fix them and commit the fix**

```bash
git add -A && git commit -m "fix: resolve test/build issues from terminal_state migration"
```
