# Timeline Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the timeline UX with a checkbox-based objective selector (max 3), title-first sidebar, portal-based tooltip, and compact canvas layout.

**Architecture:** Selection state (`selectedIds`) lives in `TimelineCanvas` and flows down to `TimelineLegend` as props. Only selected objectives render paths/nodes/crossings. The tooltip renders via React portal to `document.body` with viewport-aware flip logic. Default selection uses top-3-by-absolute-momentum heuristic.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, @panzoom/panzoom, Vitest + React Testing Library

**Spec:** `docs/specs/2026-03-21-timeline-redesign.md`

**Spec note:** The spec has an internal inconsistency — Section 1 describes default selection via keyword matching ("revenue", "margin", etc.) while Section 4 describes it as top-3-by-absolute-momentum. This plan follows Section 4's data-driven heuristic as it is more robust and the spec explicitly states Section 1's approach "can be refined later."

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `frontend/src/components/company/TimelineLegend.tsx` | Rewrite | Checkbox-based objective selector with title-first layout, sections, footer counter |
| `frontend/src/components/company/TimelineCanvas.tsx` | Modify | Add `selectedIds` state, remove `lockedIds`/`getOpacity`, filter rendering, adjust canvas constants |
| `frontend/src/components/company/TimelineTooltip.tsx` | Rewrite | Portal-based tooltip with `position: fixed` and viewport-aware flip logic |
| `frontend/src/components/company/TimelineNode.tsx` | Modify | Reduce node size from 36px to 26px diameter |
| `frontend/src/components/company/TimelinePath.tsx` | Modify | Remove `opacity` prop, always render at full opacity |
| `frontend/src/app/globals.css` | Modify | Add `--timeline-zone-above` and `--timeline-zone-below` CSS variables |
| `frontend/src/__tests__/components/company/TimelineLegend.test.tsx` | Create | Tests for selection logic, max/min enforcement, disabled state, buried items |
| `frontend/src/__tests__/components/company/TimelineTooltip.test.tsx` | Create | Tests for portal rendering and flip logic |
| `frontend/src/__tests__/components/company/TimelineCanvas.test.tsx` | Create | Tests for default selection, filtering, counter display |

---

### Task 1: Add CSS Variables for Timeline Background Zones

**Files:**
- Modify: `frontend/src/app/globals.css:5-52` (`:root` block) and `:52-71` (`.dark` block)

- [ ] **Step 1: Add zone variables to `:root`**

In `globals.css`, add these two variables at the end of the `:root` block (after `--forced-dark-accent`):

```css
/* Timeline background zones */
--timeline-zone-above: #f8fdf9;
--timeline-zone-below: #fefcf8;
```

- [ ] **Step 2: Add zone variables to `.dark`**

In the `.dark` block, add after `--destructive-foreground`:

```css
--timeline-zone-above: rgba(34, 197, 94, 0.03);
--timeline-zone-below: rgba(245, 158, 11, 0.03);
```

- [ ] **Step 3: Verify CSS loads**

Run: `cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend" && npx next lint --quiet 2>&1 | head -5`
Expected: No errors related to globals.css

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/globals.css
git commit -m "feat(timeline): add CSS variables for background zones

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Simplify TimelinePath (Remove Opacity Prop)

**Files:**
- Modify: `frontend/src/components/company/TimelinePath.tsx`

- [ ] **Step 1: Remove `opacity` from props interface and usage**

Replace the full file content with:

```tsx
"use client";

interface Point { x: number; y: number; }

interface TimelinePathProps {
  points: Point[];
  colour: string;
  isBelowGround: boolean;
}

function toSmoothPath(points: Point[]): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx1 = prev.x + (curr.x - prev.x) * 0.4;
    const cpx2 = prev.x + (curr.x - prev.x) * 0.6;
    d += ` C ${cpx1} ${prev.y}, ${cpx2} ${curr.y}, ${curr.x} ${curr.y}`;
  }
  return d;
}

export function TimelinePath({ points, colour, isBelowGround }: TimelinePathProps) {
  if (points.length < 2) return null;
  return (
    <path
      d={toSmoothPath(points)}
      fill="none"
      stroke={colour}
      strokeWidth={isBelowGround ? 1.5 : 2.5}
      strokeDasharray={isBelowGround ? "6 4" : "none"}
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/company/TimelinePath.tsx
git commit -m "refactor(timeline): remove opacity prop from TimelinePath

Selected objectives now always render at full opacity.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Reduce TimelineNode Size

**Files:**
- Modify: `frontend/src/components/company/TimelineNode.tsx`
- Test: `frontend/src/__tests__/components/company/TimelineNode.test.tsx` (existing, verify still passes)

- [ ] **Step 1: Update node dimensions**

Change the class on the outer `<div>` from `w-9 h-9` to `w-[26px] h-[26px]`, and the emoji text size from `text-[1.1rem]` to `text-[0.85rem]`:

In `TimelineNode.tsx` line 17, replace:
```
className="absolute flex items-center justify-center w-9 h-9 rounded-full bg-card border-2 cursor-pointer hover:scale-[1.3] hover:shadow-lg transition-all duration-200 select-none"
```
with:
```
className="absolute flex items-center justify-center w-[26px] h-[26px] rounded-full bg-card border-2 cursor-pointer hover:scale-[1.3] hover:shadow-lg transition-all duration-200 select-none"
```

In line 29, replace `text-[1.1rem]` with `text-[0.85rem]`.

- [ ] **Step 2: Run existing tests**

Run: `cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend" && npx vitest run src/__tests__/components/company/TimelineNode.test.tsx`
Expected: 3 tests pass (renders emoji, calls onHover, calls onClick)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/company/TimelineNode.tsx
git commit -m "style(timeline): reduce node size from 36px to 26px diameter

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Rewrite TimelineTooltip with React Portal

**Files:**
- Rewrite: `frontend/src/components/company/TimelineTooltip.tsx`
- Create: `frontend/src/__tests__/components/company/TimelineTooltip.test.tsx`

- [ ] **Step 1: Write failing tests for portal rendering and flip logic**

Create `frontend/src/__tests__/components/company/TimelineTooltip.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TimelineTooltip } from "@/components/company/TimelineTooltip";

// Mock getBoundingClientRect isn't needed since we pass viewport coords directly

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
    // Signal text is wrapped in quotes
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
    // Position tooltip near the right edge of the viewport
    Object.defineProperty(window, "innerWidth", { value: 400, writable: true });
    render(<TimelineTooltip {...baseProps} viewportX={350} viewportY={100} />);
    const tooltip = document.body.querySelector("[data-tooltip]") as HTMLElement;
    // Tooltip should flip: left should be less than viewportX (positioned to the left)
    const left = parseFloat(tooltip.style.left);
    expect(left).toBeLessThan(350);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend" && npx vitest run src/__tests__/components/company/TimelineTooltip.test.tsx`
Expected: FAIL (component doesn't accept `viewportX`/`viewportY` props yet, no `data-tooltip` attribute, no portal)

- [ ] **Step 3: Rewrite TimelineTooltip with portal and flip logic**

Replace `frontend/src/components/company/TimelineTooltip.tsx` with:

```tsx
"use client";

import { useRef, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { MomentumStage } from "@/lib/types";
import { getStage } from "@/lib/momentum";

interface TimelineTooltipProps {
  objectiveName: string;
  stage: MomentumStage;
  latestSignalText: string | null;
  latestSignalSource: string | null;
  latestSignalDate: string | null;
  viewportX: number;
  viewportY: number;
}

const TOOLTIP_WIDTH = 288;
const EDGE_MARGIN = 16;
const MIN_TOP = 8;

export function TimelineTooltip({
  objectiveName,
  stage,
  latestSignalText,
  latestSignalSource,
  latestSignalDate,
  viewportX,
  viewportY,
}: TimelineTooltipProps) {
  const stageInfo = getStage(stage);
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: viewportX + 16, top: viewportY - 20 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    let left = viewportX + 16;
    let top = viewportY - 20;

    // Horizontal flip: if right edge exceeds viewport
    if (left + TOOLTIP_WIDTH > window.innerWidth - EDGE_MARGIN) {
      left = viewportX - TOOLTIP_WIDTH - 16;
    }

    // Vertical clamp: if bottom edge exceeds viewport
    if (top + rect.height > window.innerHeight - EDGE_MARGIN) {
      top = window.innerHeight - EDGE_MARGIN - rect.height;
    }

    // Clamp top to minimum
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
      style={{ position: "fixed", left: position.left, top: position.top }}
    >
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
      <p className="font-serif italic text-xs text-muted-foreground mb-2">{stageInfo.caption}</p>
      {latestSignalText && (
        <div className="border-t border-border pt-2 mt-2">
          <p className="font-serif italic text-xs text-card-foreground line-clamp-3">&ldquo;{latestSignalText}&rdquo;</p>
          <p className="font-mono text-[0.65rem] text-muted-foreground mt-1">
            {latestSignalSource} {latestSignalDate && `\u00b7 ${latestSignalDate}`}
          </p>
        </div>
      )}
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(tooltip, document.body);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend" && npx vitest run src/__tests__/components/company/TimelineTooltip.test.tsx`
Expected: 6 tests pass

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/company/TimelineTooltip.tsx frontend/src/__tests__/components/company/TimelineTooltip.test.tsx
git commit -m "feat(timeline): rewrite tooltip with React portal and flip logic

Renders via createPortal to document.body with position: fixed.
Viewport-aware horizontal flip and vertical clamp prevent clipping.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 5: Rewrite TimelineLegend with Checkbox Selector

**Files:**
- Rewrite: `frontend/src/components/company/TimelineLegend.tsx`
- Create: `frontend/src/__tests__/components/company/TimelineLegend.test.tsx`

- [ ] **Step 1: Write failing tests for selection logic**

Create `frontend/src/__tests__/components/company/TimelineLegend.test.tsx`:

```tsx
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
    is_in_graveyard: false,
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
        colours={colours}
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
        colours={colours}
      />
    );
    // Click on the unchecked "Market Penetration" item
    await userEvent.click(screen.getByText("Market Penetration"));
    expect(toggle).toHaveBeenCalledWith("b");
  });

  it("shows N of 3 selected counter", () => {
    render(
      <TimelineLegend
        objectives={objectives}
        selectedIds={new Set(["a", "b"])}
        onToggleSelection={vi.fn()}
        colours={colours}
      />
    );
    expect(screen.getByText("2 of 3 selected")).toBeInTheDocument();
  });

  it("disables unchecked items when 3 are selected (max enforcement)", async () => {
    const toggle = vi.fn();
    render(
      <TimelineLegend
        objectives={objectives}
        selectedIds={new Set(["a", "b", "c"])}
        onToggleSelection={toggle}
        colours={colours}
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
        colours={colours}
      />
    );
    await userEvent.click(screen.getByText("Revenue Growth"));
    expect(toggle).toHaveBeenCalledWith("a");
  });

  it("renders buried section with strikethrough for graveyard objectives", () => {
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
        colours={coloursWithBuried}
      />
    );
    expect(screen.getByText("Buried")).toBeInTheDocument();
    expect(screen.getByText("China Growth")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend" && npx vitest run src/__tests__/components/company/TimelineLegend.test.tsx`
Expected: FAIL (current component doesn't accept `selectedIds`/`onToggleSelection` props)

- [ ] **Step 3: Rewrite TimelineLegend**

Replace `frontend/src/components/company/TimelineLegend.tsx` with:

```tsx
"use client";

import type { Objective } from "@/lib/types";
import { getStage, scoreToStage } from "@/lib/momentum";

interface TimelineLegendProps {
  objectives: Objective[];
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  colours: Map<string, string>;
}

const EXIT_MANNER_LABELS: Record<string, string> = {
  silent: "SILENT DROP",
  phased: "PHASED OUT",
  morphed: "MORPHED",
  transparent: "TRANSPARENT EXIT",
  achieved: "ACHIEVED",
};

export function TimelineLegend({ objectives, selectedIds, onToggleSelection, colours }: TimelineLegendProps) {
  const alive = objectives.filter((o) => !o.is_in_graveyard);
  const buried = objectives.filter((o) => o.is_in_graveyard);
  const atLimit = selectedIds.size >= 3;

  function renderItem(obj: Objective) {
    const stage = getStage(scoreToStage(obj.momentum_score));
    const colour = colours.get(obj.id) ?? stage.colour;
    const isSelected = selectedIds.has(obj.id);
    const isDisabled = !isSelected && atLimit;
    const isBuried = obj.is_in_graveyard;

    return (
      <button
        key={obj.id}
        className={`w-full text-left px-2.5 py-2 rounded-md text-xs transition-all ${
          isSelected
            ? "border border-current"
            : isDisabled
            ? "opacity-45 cursor-not-allowed border border-transparent"
            : "opacity-45 hover:opacity-70 border border-transparent"
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
            <p className={`font-serif text-[12.5px] leading-tight text-card-foreground ${isBuried ? "line-through" : ""}`}>
              {obj.title}
            </p>
            <p className="font-mono text-[9.5px] uppercase tracking-wider mt-0.5" style={{ color: colour }}>
              {isBuried && obj.exit_manner
                ? EXIT_MANNER_LABELS[obj.exit_manner] ?? obj.exit_manner.toUpperCase()
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
          {selectedIds.size} of 3 selected
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend" && npx vitest run src/__tests__/components/company/TimelineLegend.test.tsx`
Expected: 6 tests pass

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/company/TimelineLegend.tsx frontend/src/__tests__/components/company/TimelineLegend.test.tsx
git commit -m "feat(timeline): rewrite legend with checkbox selector and title-first layout

- Title-first display, no OBJ IDs
- Checkbox toggle with coloured fill when selected
- Buried section with strikethrough + exit manner labels
- 'N of 3 selected' footer counter

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 6: Update TimelineCanvas (Selection State, Filtering, Compact Layout)

This is the main integration task. It modifies `TimelineCanvas` to:
- Add `selectedIds` state with default selection heuristic
- Remove `lockedIds`, `getOpacity`, `toggleLock`
- Filter rendered objectives to only selected ones
- Adjust canvas constants for compact layout (480px height, ~44px stage gaps)
- Add background zone rectangles
- Update toolbar counter to show "N of 3 selected"
- Pass new props to `TimelineLegend` and `TimelineTooltip`
- Pass viewport coordinates (via `getBoundingClientRect`) to tooltip

**Files:**
- Modify: `frontend/src/components/company/TimelineCanvas.tsx`
- Create: `frontend/src/__tests__/components/company/TimelineCanvas.test.tsx`

- [ ] **Step 1: Write failing test for default selection heuristic**

Create `frontend/src/__tests__/components/company/TimelineCanvas.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimelineCanvas } from "@/components/company/TimelineCanvas";
import type { Objective, Signal } from "@/lib/types";

// Mock panzoom
vi.mock("@panzoom/panzoom", () => ({
  default: () => ({
    zoomWithWheel: vi.fn(),
    zoom: vi.fn(),
    getScale: () => 1,
    reset: vi.fn(),
    destroy: vi.fn(),
  }),
}));

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
    makeObjective({ id: "d", title: "Cost Cutting", display_number: 4, momentum_score: -1 }),
    makeObjective({ id: "e", title: "Expansion", display_number: 5, momentum_score: 0 }),
  ];

  const signals: Signal[] = [
    makeSignal("a", "2025-06-01", "reinforced"),
    makeSignal("b", "2025-06-01", "softened"),
    makeSignal("c", "2025-06-01", "stated"),
    makeSignal("d", "2025-06-01", "absent"),
    makeSignal("e", "2025-06-01", "stated"),
  ];

  it("renders the selection counter", () => {
    render(<TimelineCanvas objectives={objectives} signals={signals} onNavigateToEvidence={vi.fn()} />);
    // Default selection is top 3 by absolute momentum: a(3), b(|-2|=2), c(1) or d(|-1|=1)
    expect(screen.getByText("3 of 3 selected")).toBeInTheDocument();
  });

  it("renders objective titles in legend (not OBJ IDs)", () => {
    render(<TimelineCanvas objectives={objectives} signals={signals} onNavigateToEvidence={vi.fn()} />);
    expect(screen.getByText("Revenue Growth")).toBeInTheDocument();
    expect(screen.queryByText(/OBJ 01/)).toBeNull();
  });

  it("shows empty state when no objectives", () => {
    render(<TimelineCanvas objectives={[]} signals={[]} onNavigateToEvidence={vi.fn()} />);
    expect(screen.getByText(/No objectives tracked yet/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend" && npx vitest run src/__tests__/components/company/TimelineCanvas.test.tsx`
Expected: FAIL (no "3 of 3 selected" text, legend still shows OBJ IDs)

- [ ] **Step 3: Implement the full TimelineCanvas rewrite**

Replace `frontend/src/components/company/TimelineCanvas.tsx` with the following. Key changes are annotated:

```tsx
"use client";

import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import Panzoom, { type PanzoomObject } from "@panzoom/panzoom";
import type { Objective, Signal } from "@/lib/types";
import { STAGES, getStage, scoreToStage, formatQuarter, computeRunningMomentum } from "@/lib/momentum";
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

interface TooltipState { objectiveId: string; viewportX: number; viewportY: number; }

const PADDING_X = 60;
const PADDING_Y = 30;
const CANVAS_HEIGHT = 480;
const GROUND_Y = CANVAS_HEIGHT / 2;
const STAGE_HEIGHT = (CANVAS_HEIGHT - PADDING_Y * 2) / 8; // ~52px per stage (spec says ~44px but 480px height takes priority)

/** Select top 3 objectives by absolute momentum score, breaking ties by signal count */
function getDefaultSelection(objectives: Objective[], signals: Signal[]): Set<string> {
  const signalCounts = new Map<string, number>();
  for (const s of signals) {
    signalCounts.set(s.objective_id, (signalCounts.get(s.objective_id) ?? 0) + 1);
  }

  const sorted = [...objectives].sort((a, b) => {
    const absDiff = Math.abs(b.momentum_score) - Math.abs(a.momentum_score);
    if (absDiff !== 0) return absDiff;
    return (signalCounts.get(b.id) ?? 0) - (signalCounts.get(a.id) ?? 0);
  });

  return new Set(sorted.slice(0, 3).map((o) => o.id));
}

export function TimelineCanvas({ objectives, signals, onNavigateToEvidence }: TimelineCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const panzoomRef = useRef<PanzoomObject | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(800);

  // Selection state: replaces old lockedIds
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() =>
    getDefaultSelection(objectives, signals)
  );

  const colourMap = useMemo(() => {
    const map = new Map<string, string>();
    objectives.forEach((obj, i) => { map.set(obj.id, OBJECTIVE_COLOURS[i % OBJECTIVE_COLOURS.length]); });
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

  const [now] = useState(() => Date.now());
  const { minDate, maxDate } = useMemo(() => {
    const dates = signals.map((s) => new Date(s.signal_date).getTime());
    if (dates.length === 0) return { minDate: now - 86400000 * 365, maxDate: now };
    return { minDate: Math.min(...dates), maxDate: Math.max(...dates, now) };
  }, [signals, now]);

  const dateToX = useCallback((date: string): number => {
    const t = new Date(date).getTime();
    const range = maxDate - minDate || 1;
    return PADDING_X + ((t - minDate) / range) * (canvasWidth - PADDING_X * 2);
  }, [minDate, maxDate, canvasWidth]);

  const scoreToY = useCallback((score: number): number => {
    return PADDING_Y + (4 - score) * STAGE_HEIGHT;
  }, []);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const parent = el.parentElement;
    const instance = Panzoom(el, { maxScale: 5, minScale: 0.5, contain: "outside" });
    parent?.addEventListener("wheel", instance.zoomWithWheel);
    panzoomRef.current = instance;
    return () => {
      parent?.removeEventListener("wheel", instance.zoomWithWheel);
      instance.destroy();
    };
  }, []);

  useEffect(() => {
    const el = canvasRef.current?.parentElement;
    if (!el) return;
    const observer = new ResizeObserver((entries) => { setCanvasWidth(entries[0].contentRect.width - 210); });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function handleZoom(delta: number) {
    if (!panzoomRef.current) return;
    panzoomRef.current.zoom(panzoomRef.current.getScale() + delta, { animate: true });
  }

  function handleReset() { panzoomRef.current?.reset({ animate: true }); }

  function toggleObjective(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= 1) return prev; // enforce minimum 1
        next.delete(id);
      } else {
        if (next.size >= 3) return prev; // enforce maximum 3
        next.add(id);
      }
      return next;
    });
  }

  // Only compute nodes for selected objectives
  const visibleObjectives = useMemo(
    () => objectives.filter((o) => selectedIds.has(o.id)),
    [objectives, selectedIds]
  );

  const objectiveNodes = useMemo(() => {
    return visibleObjectives.map((obj) => {
      const objSignals = signalsByObjective.get(obj.id) || [];
      const runningScores = computeRunningMomentum(objSignals.map((s) => s.classification));
      const points = objSignals.map((s, i) => ({
        x: dateToX(s.signal_date),
        y: scoreToY(runningScores[i]),
        signal: s,
        score: runningScores[i],
      }));
      return { objective: obj, points };
    });
  }, [visibleObjectives, signalsByObjective, dateToX, scoreToY]);

  const crossings = useMemo(() => {
    return visibleObjectives
      .filter((o) => o.momentum_score < 0 && o.last_confirmed_date)
      .map((o) => ({ objective: o, x: dateToX(o.last_confirmed_date!), y: GROUND_Y }));
  }, [visibleObjectives, dateToX]);

  const todayX = dateToX(new Date().toISOString());

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
    };
  }, [tooltip, objectives, signalsByObjective]);

  if (objectives.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground font-sans">
        No objectives tracked yet. Objectives are added after the first agent intake run.
      </div>
    );
  }

  return (
    <div className="flex border border-border rounded-lg overflow-hidden bg-card" style={{ height: CANVAS_HEIGHT + 60 }}>
      <TimelineLegend
        objectives={objectives}
        selectedIds={selectedIds}
        onToggleSelection={toggleObjective}
        colours={colourMap}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border text-xs font-mono text-muted-foreground">
          <span>{selectedIds.size} of 3 selected</span>
          <div className="flex gap-2">
            <button onClick={() => handleZoom(0.2)} className="px-2 py-1 border border-border rounded hover:bg-muted">+</button>
            <button onClick={() => handleZoom(-0.2)} className="px-2 py-1 border border-border rounded hover:bg-muted">&minus;</button>
            <button onClick={handleReset} className="px-2 py-1 border border-border rounded hover:bg-muted">Reset</button>
          </div>
        </div>
        <div className="relative flex-1 overflow-hidden">
          <div ref={canvasRef} className="relative" style={{ width: canvasWidth, height: CANVAS_HEIGHT }}>
            <svg className="absolute inset-0" width={canvasWidth} height={CANVAS_HEIGHT}>
              {/* Background zones */}
              <rect x={PADDING_X} y={PADDING_Y} width={canvasWidth - PADDING_X * 2} height={GROUND_Y - PADDING_Y} fill="var(--timeline-zone-above)" />
              <rect x={PADDING_X} y={GROUND_Y} width={canvasWidth - PADDING_X * 2} height={CANVAS_HEIGHT - PADDING_Y - GROUND_Y} fill="var(--timeline-zone-below)" />

              {/* Stage lines */}
              {STAGES.map((stage) => {
                const y = scoreToY(stage.score);
                const isGround = stage.score === 0;
                return (
                  <g key={stage.name}>
                    {!isGround && (
                      <line x1={PADDING_X} y1={y} x2={canvasWidth - PADDING_X} y2={y} stroke="var(--border)" strokeWidth={1} />
                    )}
                    <text x={8} y={y + 4} fontSize={10} fill="var(--muted-foreground)" fontFamily="var(--font-ibm-plex-mono)">
                      {stage.emoji}
                    </text>
                    <text x={28} y={y + 4} fontSize={8} fill="var(--muted-foreground)" fontFamily="var(--font-ibm-plex-mono)">
                      {stage.score > 0 ? "+" : ""}{stage.score}
                    </text>
                  </g>
                );
              })}

              {/* Ground line */}
              <line x1={PADDING_X} y1={GROUND_Y} x2={canvasWidth - PADDING_X} y2={GROUND_Y} stroke="var(--primary)" strokeWidth={2} />
              <text x={canvasWidth - PADDING_X + 4} y={GROUND_Y + 4} fontSize={9} fill="var(--primary)" fontFamily="var(--font-ibm-plex-mono)">GROUND LINE</text>

              {/* Today marker */}
              <line x1={todayX} y1={PADDING_Y} x2={todayX} y2={CANVAS_HEIGHT - PADDING_Y} stroke="var(--primary)" strokeWidth={1} strokeDasharray="6 3" opacity={0.5} />

              {/* Paths for selected objectives only */}
              {objectiveNodes.map(({ objective, points }) => (
                <TimelinePath key={objective.id} points={points} colour={colourMap.get(objective.id) ?? "#999"} isBelowGround={objective.momentum_score < 0} />
              ))}
            </svg>

            {/* Nodes for selected objectives only */}
            {objectiveNodes.map(({ objective, points }) => {
              return points.map((pt, i) => {
                const stage = scoreToStage(pt.score);
                const stageInfo = getStage(stage);
                return (
                  <TimelineNode
                    key={`${objective.id}-${i}`}
                    emoji={stageInfo.emoji}
                    colour={colourMap.get(objective.id) ?? stageInfo.colour}
                    x={pt.x} y={pt.y}
                    label={objective.title}
                    onHover={(e: React.MouseEvent) => {
                      setHoveredId(objective.id);
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setTooltip({ objectiveId: objective.id, viewportX: rect.right, viewportY: rect.top });
                    }}
                    onLeave={() => { setHoveredId(null); setTooltip(null); }}
                    onClick={() => { if (pt.signal) onNavigateToEvidence(); }}
                  />
                );
              });
            })}

            {/* Crossing markers for selected objectives only */}
            {crossings.map(({ objective, x, y }) => (
              <CrossingMarker key={`cross-${objective.id}`} x={x} y={y} label={`Crossing ${formatQuarter(objective.last_confirmed_date!)}`} editorialNote={`${objective.title} crossed the ground line.`} />
            ))}
          </div>
        </div>
      </div>
      {tooltipData && <TimelineTooltip {...tooltipData} />}
    </div>
  );
}
```

**Important:** The tooltip is now rendered **outside** the panzoom overflow container, as the last child of the root `<div>`. It uses the portal to render into `document.body`.

- [ ] **Step 4: Update TimelineNode to accept MouseEvent in onHover**

In `frontend/src/components/company/TimelineNode.tsx`, change the `onHover` prop type and handler:

```tsx
"use client";

interface TimelineNodeProps {
  emoji: string;
  colour: string;
  x: number;
  y: number;
  label: string;
  onHover: (e: React.MouseEvent) => void;
  onLeave: () => void;
  onClick: () => void;
}

export function TimelineNode({ emoji, colour, x, y, label, onHover, onLeave, onClick }: TimelineNodeProps) {
  return (
    <div
      className="absolute flex items-center justify-center w-[26px] h-[26px] rounded-full bg-card border-2 cursor-pointer hover:scale-[1.3] hover:shadow-lg transition-all duration-200 select-none"
      style={{
        left: x,
        top: y,
        borderColor: colour,
        transform: "translate(-50%, -50%)",
      }}
      title={label}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      <span className="text-[0.85rem] leading-none">{emoji}</span>
    </div>
  );
}
```

- [ ] **Step 5: Update TimelineNode test for new onHover signature**

In `frontend/src/__tests__/components/company/TimelineNode.test.tsx`, update the `onHover` mock. The existing test creates `onHover: vi.fn()` which will still work since `vi.fn()` accepts any arguments.

No changes needed to the test file — `vi.fn()` already accepts any arguments.

- [ ] **Step 6: Run all tests**

Run: `cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend" && npx vitest run`
Expected: All tests pass (TimelineNode, TimelineLegend, TimelineTooltip, TimelineCanvas, and all existing tests)

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/company/TimelineCanvas.tsx frontend/src/components/company/TimelineNode.tsx frontend/src/__tests__/components/company/TimelineCanvas.test.tsx
git commit -m "feat(timeline): selection state, compact layout, background zones

- Add selectedIds state with top-3-by-absolute-momentum default
- Remove lockedIds and getOpacity system
- Filter paths/nodes/crossings to selected objectives only
- Compact canvas: 480px height
- Background zone tints for above/below ground
- Tooltip receives viewport coordinates via getBoundingClientRect
- Stage lines now solid (not dashed), with numeric score labels

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 7: Full Integration Test

**Files:** None (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend" && npx vitest run`
Expected: All tests pass with no failures

- [ ] **Step 2: Run the linter**

Run: `cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend" && npx next lint`
Expected: No errors

- [ ] **Step 3: Run the build**

Run: `cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend" && npx next build`
Expected: Build completes successfully with no type errors

- [ ] **Step 4: Manual smoke test**

Start dev server: `cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend" && npx next dev`

Verify in browser at `http://localhost:3000/company/san`:
1. Sidebar shows objective titles (not OBJ IDs) with checkboxes
2. Up to 3 objectives pre-selected (highest absolute momentum)
3. Clicking a 4th checkbox does nothing when 3 are selected
4. Last checkbox cannot be unchecked
5. Only selected objectives show paths/nodes on canvas
6. Tooltip appears on node hover, not clipped by container
7. Tooltip flips correctly near edges
8. "N of 3 selected" counter updates in toolbar and sidebar footer
9. Buried section shows with strikethrough titles and exit manner labels
10. Background zones visible (subtle green above, subtle warm below ground)
11. Dark mode toggle still works correctly
