# Timeline Refinements v3.1 — Design Specification

**Date:** 2026-03-22
**Status:** Draft
**Scope:** 5 targeted refinements to the existing Timeline Canvas component

---

## 1. Signal-Specific Node Tooltips

### Problem
Every signal/origin node currently shows the same tooltip content: the objective title, current momentum badge, the Boardroom Allegory caption for that stage, and the *latest* signal excerpt (repeated on every node). This means hovering three different nodes on the same trajectory shows identical information — defeating the purpose of a chronological signal timeline.

### Design

**Each node must show the signal data for *that specific month*.**

**Origin nodes** display:
- Objective title + momentum badge (current stage, e.g. "Fly (+3)")
- Original commitment quote from `objective.original_quote` (italic, serif)
- First stated date from `objective.first_stated_date`

**Signal nodes** display:
- Objective title + momentum badge for the node's computed score (not the objective's current score)
- Signal excerpt from `node.signal.excerpt` (italic, serif, 3-line clamp)
- Source name + signal date: `{source_name} . {signal_date}`
- Signal classification badge (e.g. "REINFORCED", "SOFTENED")

**Stale nodes** remain unchanged — they already show stale-specific content (months silent, last signal date).

**Cadence nodes** remain non-interactive (no tooltip).

### Removals
- Remove Boardroom Allegory captions from tooltip display. The `stageInfo.caption` line in `TimelineTooltip.tsx:83` is deleted. The captions remain in `momentum.ts` for potential future use elsewhere but are no longer rendered in tooltips.
- Remove the `latestSignalText` / `latestSignalSource` / `latestSignalDate` props from `TimelineTooltip`. Replace with signal-specific data.

### Data flow changes

**`TimelineCanvas.tsx`** — The `TooltipState` interface gains an optional `signal` field. When a signal/origin node triggers hover, the node's own `signal` object is passed through. The `tooltipData` memo reads from this signal instead of always fetching the latest.

**`TimelineTooltip.tsx`** — Props change to:
```typescript
interface TimelineTooltipProps {
  objectiveName: string;
  stage: MomentumStage;        // computed from node.score, not obj.momentum_score
  originalQuote?: string;       // only for origin nodes
  firstStatedDate?: string;     // only for origin nodes
  signal?: Signal;              // the specific signal for this node
  viewportX: number;
  viewportY: number;
  staleInfo?: { lastSignalDate: string; monthsSilent: number } | null;
}
```

### Files changed
- `frontend/src/components/company/TimelineTooltip.tsx` — new props, remove caption, render signal-specific content
- `frontend/src/components/company/TimelineCanvas.tsx` — pass node-level signal + score to tooltip state

---

## 2. Fiscal Year-End Node

### Problem
A company's fiscal year-end is a major editorial moment — annual reports, full-year results, strategic reviews. The timeline currently has no way to mark this point in time.

### Design

**New node type: `"fiscal-year-end"`**

- Shape: diamond (rotated 45-degree square), 20px, amber stroke (`#f59e0b`), white fill
- Appears once per fiscal year on the trajectory, at the month matching the company's `fiscal_year_end_month`
- Only placed on months that fall within the objective's signal date range
- Non-interactive by default (no tooltip) unless a signal with classification `year_end_review` exists for that month — in which case it shows a tooltip with the editorial summary

### Node generation

In `timeline-nodes.ts`, after the main node generation loop, a second pass inserts `fiscal-year-end` nodes. For each month in the range:
- If the month matches `fiscal_year_end_month` (1-12)
- And no signal/origin node already occupies that month
- Insert a `fiscal-year-end` node with the interpolated score at that position

If a signal node already exists at the FY-end month, that node is promoted: it keeps its `signal` type but gets a visual diamond treatment via a new `isFiscalYearEnd` flag on `TimelineMonthNode`.

### Database changes

**`companies` table** — new column:
```sql
ALTER TABLE companies ADD COLUMN fiscal_year_end_month integer DEFAULT 12
  CHECK (fiscal_year_end_month BETWEEN 1 AND 12);
```

**`SignalClassification` type** — add `year_end_review`:
```sql
-- In the signal classification enum/check constraint
ALTER ... ADD 'year_end_review';
```

### Type changes

```typescript
// types.ts
export type TimelineNodeType = "origin" | "signal" | "cadence" | "stale" | "fiscal-year-end";

export type SignalClassification =
  | "stated" | "reinforced" | "softened" | "reframed"
  | "absent" | "achieved" | "retired_transparent" | "retired_silent"
  | "year_end_review";

export interface Company {
  // ... existing fields ...
  fiscal_year_end_month: number;   // 1-12, default 12
}

export interface TimelineMonthNode {
  // ... existing fields ...
  isFiscalYearEnd?: boolean;       // true when a signal node coincides with FY-end
}
```

### Rendering

`TimelineNode.tsx` renders `fiscal-year-end` type as a rotated square:
```
transform: rotate(45deg)
width: 14px, height: 14px (20px diagonal)
border: 2px solid #f59e0b
background: white (or var(--card))
```

### Tooltip (conditional)

FY-end nodes show a tooltip only if they carry a signal (either a dedicated `year_end_review` signal or a promoted signal node at that month):
- Header: "Fiscal Year-End FY{year}" (e.g. "Fiscal Year-End FY24")
- Body: signal excerpt
- Source + date

### Data-fetching layer

The `v_company_summary` view (or equivalent Supabase query) must include `fiscal_year_end_month` so the value reaches the frontend. No special handling is needed in `supabase.ts` beyond including the column — it will be picked up automatically once the `Company` interface is updated.

### Files changed
- `frontend/src/lib/types.ts` — extend `TimelineNodeType`, `SignalClassification`, `Company`, `TimelineMonthNode`
- `frontend/src/lib/timeline-nodes.ts` — FY-end node insertion pass, accept `fiscalYearEndMonth` param
- `frontend/src/components/company/TimelineNode.tsx` — diamond rendering
- `frontend/src/components/company/TimelineCanvas.tsx` — pass `fiscalYearEndMonth` to node generation
- `backend/schema.sql` — add column, update classification check constraint, update `v_company_summary` view

---

## 3. Monthly Axis Labels

### Problem
The current bottom axis shows quarterly gridlines (Q1 2024, Q2 2024...) with dashed vertical lines. At monthly granularity, quarter labels are too coarse and the vertical lines add visual noise.

### Design

**Replace quarterly gridlines and labels with monthly abbreviations along the bottom axis.**

Layout:
- Each month column (40px wide) gets a 3-letter abbreviation centered at the bottom: `Oct`, `Nov`, `Dec`, `Jan`, `Feb`...
- January is emphasised: bolder weight (`font-weight: 600`), slightly brighter colour, with the year displayed below in primary green (`#22c55e` / `var(--primary)`) at 9px
- All other months: `opacity: 0.5`, normal weight
- Remove all quarterly vertical dashed gridlines
- Remove the `quarterLabels` memo and `formatQuarter` usage in `TimelineCanvas.tsx`
- The horizontal stage lines and today marker remain

### Rendering

In the scrollable SVG area of `TimelineCanvas.tsx`, replace the quarterly gridline `<g>` block with month labels:

```tsx
{monthLabels.map(({ x, label, isJanuary, year }) => (
  <g key={`${year}-${label}`}>
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

### Data

New `monthLabels` memo replaces `quarterLabels`:
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

### Files changed
- `frontend/src/components/company/TimelineCanvas.tsx` — replace `quarterLabels` with `monthLabels`, remove quarterly gridline rendering

---

## 4. Legend Hover Tooltip

### Problem
The sidebar legend shows objective titles and momentum badges, but there's no way to see what an objective is actually about without selecting it and finding a signal node to hover.

### Design

**Hover any objective row in the legend to see a tooltip with its subtitle and original quote.**

Tooltip content:
- Objective subtitle (`objective.subtitle`) — serif, 13px, medium weight
- Original quote (`objective.original_quote`) — serif italic, 12px, 0.65 opacity
- First stated date (`objective.first_stated_date`) — mono, 10px, 0.4 opacity

Tooltip positioning:
- Portal-based (same pattern as `TimelineTooltip`)
- Positioned to the right of the legend panel, overlapping the canvas area
- Left edge aligned to the legend's right border (~210px from container left)
- Vertically centred on the hovered row

### Behaviour
- Tooltip appears on `mouseEnter` of any legend row, regardless of selection state
- Tooltip disappears on `mouseLeave`
- This is independent of the existing `onHoverObjective` callback (which dims non-hovered trajectories). The legend hover tooltip shows for all objectives; the trajectory dimming only activates for selected objectives.

### Implementation

New component: `TimelineLegendTooltip.tsx` — minimal portal tooltip, receives objective data + position.

`TimelineLegend.tsx` changes:
- Track `hoveredObjective: Objective | null` and `hoverRect: DOMRect | null` in local state
- On `mouseEnter`: set both states
- On `mouseLeave`: clear both
- Render `TimelineLegendTooltip` when `hoveredObjective` is set

### Files changed
- `frontend/src/components/company/TimelineLegendTooltip.tsx` — new file, portal tooltip
- `frontend/src/components/company/TimelineLegend.tsx` — hover state, render tooltip

---

## 5. Zero Selection State

### Problem
Currently, at least one objective must remain selected (min-1 constraint). Clicking the last selected objective triggers a shake animation. There is no way to see a "clean" canvas.

### Design

**Allow deselecting all objectives. Empty canvas shows grid + centered prompt.**

### Constraint removal

In `TimelineLegend.tsx`:
- Remove the `isLastSelected` guard and shake animation logic
- Remove the `shakingId` state and `animate-[shake_...]` class

In `TimelineCanvas.tsx`:
- Remove the `if (next.size <= 1) return prev;` guard in `toggleObjective`
- The max-3 selection limit (`if (next.size >= 3) return prev;`) remains unchanged

### Empty state rendering

When `selectedIds.size === 0`, the scrollable canvas area renders:
- Background zones (above/below ground) remain
- Horizontal stage lines remain
- Ground line remains
- No trajectories, no nodes, no crossings
- Centered text overlay:
  ```
  font-family: Lora (serif)
  font-style: italic
  font-size: 14px
  opacity: 0.4
  text: "Select an objective to view its trajectory"
  ```
- Month labels at the bottom still render

### Footer update

The footer text in `TimelineLegend.tsx` changes from hardcoded "X of 3 selected" to:
```
{selectedIds.size} of {objectives.filter(o => hasSignals(o.id)).length} selected
```
This reflects the actual number of selectable objectives, not a hardcoded 3.

### Default selection unchanged

`getDefaultSelection` still returns up to 3 objectives on initial load. The zero state only occurs when the user manually deselects all.

### Files changed
- `frontend/src/components/company/TimelineLegend.tsx` — remove min-1 guard, shake animation, update footer
- `frontend/src/components/company/TimelineCanvas.tsx` — remove min-1 guard in `toggleObjective`, add empty state overlay

---

## Non-goals

These items are explicitly out of scope for this iteration:

- Tooltip animations or transitions
- Mobile/touch tooltip behaviour
- Adding new signal data or running the agent
- Changes to the Evidence tab or Graveyard cards
- Any changes to the landing page or other pages
