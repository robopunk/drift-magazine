# Timeline v3 Redesign — Design Specification

**Date:** 2026-03-22
**Status:** Approved
**Scope:** Timeline canvas layout, node model, trajectory rendering, legend polish, hover interaction, scroll model, data model additions

---

## 1. Overview

Redesign the interactive timeline canvas to improve layout, visual quality, interaction model, and information density. The core change is introducing a monthly cadence node model that distinguishes between substantiated signal updates and quiet months, replacing the current approach where every signal gets equal visual weight.

### Out of Scope (Backlog)
- Resurrected objectives as standalone spin-off trajectories
- Toolbar enrichment (company name, above/crossing/below stats)
- Path gradient/width variation

---

## 2. Canvas Layout

> **Note:** This spec supersedes the viewport-fit approach from `2026-03-21-1715-timeline-viewport-fit-design.md`, which was implemented and reverted (commit `446b39a`). A fixed, generous height is simpler and avoids the ResizeObserver timing issues that caused the revert. The previous spec's legend 50/50 split is also replaced by a single scrollable area with section headers.

### Dimensions
- **Canvas height:** 560px (up from 480px)
- **Toolbar height:** 44px
- **Total container height:** 604px
- **Min-height floor:** 500px
- **Stage height:** (560 - 60px padding) / 8 = 62.5px per stage (up from 52.5px)
- **Ground line Y:** 280px (vertical center of canvas, verified: `PADDING_Y + 4 * STAGE_HEIGHT = 30 + 4 * 62.5 = 280`)
- **Padding:** PADDING_X = 60px, PADDING_Y = 30px (unchanged)

### Legend Sidebar
- Width: 210px (unchanged)
- Position: left side (unchanged)
- See Section 5 for polish changes

### Canvas Width
- Computed dynamically: each month = 40px column width
- A 2-year objective = ~960px wide
- A 4-year objective = ~1920px wide
- Minimum canvas width = container width (no horizontal scroll needed for short timespans)

---

## 3. Node Model

Four distinct node types replace the current uniform emoji node approach.

### 3.1 Origin Node
- **Size:** 32px diameter
- **Visual:** White fill, objective colour border (2.5px stroke), target emoji
- **Interactive:** Yes — hover shows initial commitment quote (first signal's excerpt)
- **When:** First signal for each objective
- **Purpose:** Marks the moment a company declares or an objective is first identified

### 3.2 Signal Node
- **Size:** 24px diameter
- **Visual:** White fill, objective colour border (2px stroke), stage-appropriate emoji
- **Interactive:** Yes — hover shows source, excerpt, date via portal tooltip
- **When:** Any signal with substantiated data from trusted sources
- **Purpose:** Real updates that drive trajectory changes

### 3.3 Cadence Node
- **Size:** 8px diameter
- **Visual:** Solid grey fill (`#d1d5db` light mode, `#4b5563` dark mode — or use `var(--muted-foreground)` at reduced opacity), no border, no emoji
- **Interactive:** No — no hover, no click
- **When:** Monthly placeholder where no signal update exists
- **Purpose:** Visual rhythm showing time passing, position interpolated between signals

### 3.4 Stale Warning Node
- **Size:** 12px diameter
- **Visual:** White fill, amber border (#f59e0b, 1.5px stroke), "!" text centred
- **Interactive:** Yes — hover shows "No update since [last signal date] — [N] months silent"
- **When:** After 6 months (2 financial quarters) without a signal
- **Purpose:** Visual alert that an objective is going quiet

### 3.5 Latest Node Emphasis
- The most recent **Signal or Origin node** for each selected objective renders 25% larger than its base size (e.g., Signal: 24px → 30px, Origin: 32px → 40px)
- Subtle outer glow effect matching the objective's assigned colour (CSS `filter: drop-shadow(0 0 4px ${colour})`)
- If the most recent month is a Cadence or Stale node, the emphasis applies to the most recent Signal node instead — passive dots should not draw attention
- Provides clear "where things stand now" anchor point

---

## 4. Trajectory Rendering

### 4.1 Monthly Grid Generation
For each objective, generate a node at every month boundary between the origin date and the current date (or burial date if buried). Each month gets exactly one node:
- If a signal exists in that month → Signal Node (or Origin Node for the first)
- If 6+ months have passed since last signal → Stale Warning Node
- Otherwise → Cadence Node

**Edge case — no signals:** If an objective exists in the data but has zero signals, it is omitted from the timeline canvas. Its legend entry remains visible but is non-interactive (greyed out, checkbox disabled).

**Multiple signals in one month:** The node uses the last signal's score for its Y position. The tooltip for that node shows the last signal's content. Other signals in the same month are accessible via the Evidence tab, not the timeline.

### 4.2 Interpolation Rules
1. **Between two signal nodes:** All cadence dots between them are linearly interpolated from the previous signal's momentum score to the next signal's momentum score. This shows gradual drift rather than sudden jumps.
2. **After the last signal:** Trajectory stays flat at the last known momentum score. Cadence dots continue at that level.
3. **When a new signal arrives:** All cadence dots between the previous signal and the new one are re-plotted along the interpolated slope.
4. **Multiple signals in one month:** Use the last signal in that month for the node's score.

### 4.3 Path Rendering
- **Above ground (score > 0):** 2.5px solid stroke in objective colour
- **Below ground (score <= 0):** 1.5px dashed stroke (6px dash, 4px gap) in objective colour
- Path connects all nodes continuously (origin, signal, cadence, stale)
- No path breaks — even buried/resurrected objectives maintain a continuous line

### 4.4 Burial Threshold
- **9 months (3 financial quarters)** without any signal → objective transitions to buried status
- Trajectory line switches to dashed and reduces opacity
- This is an editorial threshold applied during agent processing, not a real-time UI calculation

### 4.5 Resurrected Exit Type
- New graveyard exit type: `resurrected`
- Represents an objective that was buried and later revived (new signals appear after burial)
- Visually: objective crosses the ground line upward — the inverse of burial
- Trajectory continues on the original line (no break), showing the full lifecycle including the buried gap
- Added to existing exit types: `silent`, `phased`, `morphed`, `transparent`, `achieved`, `resurrected`
- **Upward crossing trigger:** An upward crossing marker is placed at the month where the first signal after a burial gap returns the objective's running momentum score above 0

---

## 5. Grid & Stage Labels

### Horizontal Stage Lines
- Each non-ground stage: 0.5px line in border colour (unchanged visual weight)
- Ground line: 2px solid primary green with "GROUND LINE" label at right edge (unchanged)

### Stage Labels (Enhanced)
- Left edge (within 60px PADDING_X): emoji + score + stage name
- Format: `🚀 +4 Orbit` instead of current `🚀 +4`
- Font: IBM Plex Mono, 9px, muted-foreground colour
- Ground line label in primary green

### Vertical Quarter Gridlines (New)
- Dashed vertical lines at each quarter boundary
- 0.5px stroke, border colour, `4 4` dash pattern
- Quarter labels at bottom edge: `Q1 2024`, `Q2 2025`, etc.
- Font: IBM Plex Mono, 9px, muted-foreground, centre-aligned under gridline

### Today Marker
- Dashed vertical line in primary green (unchanged)
- Add "Today" label at top of the line (new)

---

## 6. Legend Sidebar Polish

### Contrast Improvements
- Unselected items: opacity `0.45` → `0.6`
- Unselected items hover: opacity `0.70` → `0.8`
- Buried item titles: remove strikethrough (exit manner badge is sufficient context)
- Update TimelineLegend test that currently asserts strikethrough

### Section Headers
- Two labelled sections: "OBJECTIVES" and "BURIED"
- Headers: IBM Plex Mono, 9px, uppercase, muted colour
- Both sections in a single scrollable area (no 50/50 split)
- Buried section only renders if graveyard entries exist

### Resurrected Indicator
- Buried items with `exit_manner: 'resurrected'` display an upward arrow badge alongside exit label

---

## 7. Hover Interaction — Connected Highlighting

### Node Hover (Canvas)
- Hovering a signal or origin node:
  - That objective's full trajectory (path + all nodes) stays at full opacity
  - All other objectives' paths and nodes dim to `0.25` opacity
  - Tooltip appears via portal (existing mechanism)
  - 200ms CSS transition for dim/brighten
- Hovering a cadence dot: no tooltip, but participates in the dimming group (its parent trajectory stays bright)
- Hovering a stale warning dot: small tooltip with staleness info, same dim/brighten behaviour

### Legend Hover
- Hovering a legend item triggers the same canvas dimming — highlights that objective's trajectory
- Only affects canvas if the objective is currently selected (checkbox on)
- Same 200ms transition

### Mouse Leave
- All paths and nodes return to full opacity over 200ms

### Implementation
- Existing `hoveredId` state drives opacity via inline styles or CSS custom properties on path/node groups
- Each objective's SVG paths and DOM nodes are wrapped in a group that responds to the hovered state

---

## 8. Horizontal Scroll (Replacing Panzoom)

### Remove
- `@panzoom/panzoom` dependency from package.json
- Zoom +/- and Reset buttons from toolbar
- Scroll-wheel zoom handler
- Panzoom initialisation in useEffect

### Replace With
- `overflow-x: auto` on the canvas container div
- Canvas inner width: `months × 40px` (computed from date range)
- Native horizontal scrollbar at bottom, styled to match design
- Vertical axis is fixed — stage labels pinned to left edge, never scroll horizontally

### Stage Label Pinning
Stage labels stay visible while the data area scrolls. DOM structure:

```
<div class="flex" style="height: 560px">
  <!-- Fixed left column: stage labels (60px wide) -->
  <div class="flex-none w-[60px] relative">
    <svg width="60" height="560">
      <!-- Stage emoji + score + name labels, ground line label -->
    </svg>
  </div>
  <!-- Scrollable right area: data canvas -->
  <div class="flex-1 overflow-x-auto">
    <div style="width: {months * 40}px; height: 560px; position: relative;">
      <svg><!-- gridlines, paths, zones --></svg>
      <!-- DOM nodes (origin, signal, cadence, stale) -->
    </div>
  </div>
</div>
```

- The fixed column and scrollable area share the same vertical coordinate system (both 560px tall, same PADDING_Y)
- Horizontal stage lines extend from the fixed column into the scrollable area (drawn in both SVGs, or the scrollable SVG draws full-width lines starting from x=0)
- Ground line spans the full scrollable width

### Toolbar Update
- Remove: zoom controls (+, -, Reset)
- Keep: "N of 3 selected" counter
- Add: date range label (e.g., "Oct 2023 — Jun 2025")

### Initial Scroll Position
- On mount, auto-scroll to show the most recent 12-18 months
- User sees current state first, scrolls left to explore history
- Implemented via `scrollLeft` assignment in a useEffect after first render

### Accessibility
- Scrollable container: `tabindex="0"` for keyboard focus, responds to left/right arrow keys
- Stale warning nodes: `aria-label="No update for [N] months"` (the "!" is visual only)
- Origin and Signal nodes: `aria-label` with objective name and stage (replacing the current `title` attribute)

---

## 9. Data Model Changes

### Schema Additions

**objectives table — exit_manner enum:**
The existing schema uses a Postgres enum type `exit_manner` with values: `silent`, `phased`, `morphed`, `transparent`, `achieved`. Add `resurrected`:
```sql
ALTER TYPE exit_manner ADD VALUE 'resurrected';
```

### TypeScript Type Updates

**types.ts — ExitManner type:**
Add `'resurrected'` to the existing union (keeping all current values):
```typescript
export type ExitManner =
  | "silent" | "phased" | "morphed" | "transparent" | "achieved" | "resurrected";
```

### Node Data Structure

Add a new interface for the generated monthly timeline nodes:
```typescript
type TimelineNodeType = 'origin' | 'signal' | 'cadence' | 'stale';

interface TimelineMonthNode {
  type: TimelineNodeType;
  month: Date;               // first day of the month
  x: number;                 // computed X position
  y: number;                 // computed Y position (interpolated score → Y)
  score: number;             // momentum score at this month
  signal?: Signal;           // present for origin and signal nodes
  monthsSinceLastSignal?: number; // present for stale nodes
}
```

This is the core data structure that `TimelineCanvas` generates from raw signals and passes to rendering components.

**momentum.ts:**
- No changes to the STAGES array or scoring functions
- The monthly node generation and interpolation logic lives in TimelineCanvas, not in the shared utility

---

## 10. Test Impact

### Tests to Update
- `TimelineLegend.test.tsx`: Remove assertion that buried items have strikethrough
- `TimelineCanvas.test.tsx`: Update for new container height, removal of zoom controls, addition of date range label

### New Tests Needed
- Node type rendering: origin, signal, cadence, stale warning nodes render with correct sizes and styles
- Interpolation: cadence dots between two signals at different scores are positioned along linear interpolation
- Interpolation edge case: two signals in the same month (no interpolation, last signal wins)
- Interpolation edge case: single signal followed by 12 months of cadence dots (flat line)
- Stale detection: nodes after 6-month gap render as stale warning type
- Stale + burial: stale node appears at month 6 even when burial triggers at month 9
- Zero signals: objective with no signals is omitted from canvas, legend entry is greyed/disabled
- Hover dimming: hovering a node dims other objective groups
- Legend hover: hovering legend item triggers canvas dimming
- Horizontal scroll: canvas width matches month count x 40px
- Initial scroll position: scrollLeft is set to show recent months on mount

---

## 11. File Impact Summary

| File | Change Type |
|---|---|
| `frontend/src/components/company/TimelineCanvas.tsx` | Major refactor — layout, node model, scroll, hover |
| `frontend/src/components/company/TimelineNode.tsx` | Refactor — support 4 node types with different sizes/styles |
| `frontend/src/components/company/TimelinePath.tsx` | Minor — path connects interpolated points |
| `frontend/src/components/company/TimelineLegend.tsx` | Polish — contrast, sections, strikethrough removal |
| `frontend/src/components/company/CrossingMarker.tsx` | Minor — support upward crossing for resurrected |
| `frontend/src/components/company/TimelineTooltip.tsx` | Minor — stale warning tooltip content |
| `frontend/src/lib/types.ts` | Add `'resurrected'` to exit_manner type |
| `frontend/src/lib/momentum.ts` | No changes |
| `frontend/src/__tests__/TimelineLegend.test.tsx` | Update strikethrough assertion |
| `frontend/src/__tests__/TimelineCanvas.test.tsx` | Update for new layout/controls |
| `frontend/package.json` | Remove `@panzoom/panzoom` dependency |
| `backend/schema.sql` | Add `resurrected` to exit_manner enum |
