# Timeline Redesign Spec

**Date:** 2026-03-21
**Status:** Draft
**Author:** Stefano + Claude
**Scope:** TimelineCanvas, TimelineLegend, TimelineTooltip, TimelineNode components

---

## Problem Statement

The current timeline has four UX issues:

1. **Cryptic labels** — sidebar shows `OBJ 01`, `OBJ-X1` as the primary identifier instead of the objective title
2. **Tooltip clipping** — the hover tooltip renders inside the panzoom container (`overflow: hidden`), causing it to be cut off at container edges
3. **Visual clutter** — all objectives are plotted simultaneously at low opacity (0.3), making the canvas noisy and hard to read
4. **No selection control** — hover/lock interaction exists but has no limit; no concept of default-visible objectives

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Sidebar style | Minimal checklist — title-first, checkbox toggle | Removes noise, leads with what readers care about |
| Selection limit | Hard cap at 3, minimum 1 | Keeps canvas readable; prevents empty state |
| Default selection | Revenue-impacting objectives pre-selected on load | Financial/market objectives are highest reader interest |
| Tooltip rendering | React portal to `document.body` | Eliminates clipping entirely |
| Unselected objectives | Completely hidden from canvas | Clean canvas with only 1-3 trajectories |
| Buried objectives | Selectable, count toward 3 limit | Readers may want to inspect graveyard trajectories |

---

## 1. Sidebar Redesign (TimelineLegend)

### Layout per objective item

```
[checkbox] Title (Lora 12.5px)
           STAGE (+/-N) (IBM Plex Mono 9.5px, coloured)
```

- **No OBJ identifiers** — remove `OBJ 01` / `OBJ-X1` entirely
- **Title-first** — `obj.title` in Lora serif, primary text colour
- **Momentum badge below** — stage name + score in IBM Plex Mono, coloured to match the objective's assigned colour
- **Checkbox** — 14-15px square, rounded corners. When checked: filled with objective colour + checkmark. When unchecked: border only.
- **Selected items** — subtle coloured background tint using `color-mix(in srgb, <obj-color> 6%, transparent)`, coloured border
- **Unselected items** — `opacity: 0.45`, no border

### Sections

- **Objectives** heading (IBM Plex Mono, 9px uppercase, tracking 1.5px)
- Active objectives listed
- Divider (1px solid border colour)
- **Buried** heading (same style)
- Buried objectives listed with strikethrough title + exit manner as stage text (e.g., `SILENT DROP`, `MORPHED`, `PHASED OUT`)

### Footer

- `"N of 3 selected"` counter in IBM Plex Mono 9px, centred, above a top border

### Selection logic

- **On page load:** identify revenue-impacting objectives (those with financial targets or clear market share implications). Pre-select up to 3.
- **Hard limit of 3:** when 3 are selected, remaining unchecked items show disabled state (reduced opacity, cursor: not-allowed, checkbox not clickable)
- **Minimum 1:** the last remaining selected checkbox cannot be unchecked
- **Buried objectives** are selectable and count toward the 3 limit

### Determining revenue-impacting objectives

For the initial implementation, use a heuristic: objectives whose title contains financial keywords (margin, revenue, penetration, market share, growth, target, CAGR, %). This can be refined later with a database flag if needed.

---

## 2. Canvas Changes (TimelineCanvas)

### Only selected objectives render

- Remove the current `getOpacity()` system that shows all objectives at varying opacity
- Only objectives in the selected set produce `<TimelinePath>` and `<TimelineNode>` elements
- Selected objectives render at full opacity (no 0.3 default)
- This produces a clean canvas with 1-3 visible trajectories maximum

### Compact stage spacing

- Reduce the vertical gap between momentum stages to ~44px per level
- All 9 stages (Orbit +4 to Buried -4) should be visible without vertical scrolling
- The canvas sits within a bounded card container — not full-viewport
- Ground line remains the visual centre, solid `var(--primary)`, 2px

### Stage lines

- Subtle solid lines (1px, `var(--border)` or a lighter variant) instead of dashed for non-ground stages
- Stage emoji labels on the left edge with numeric score beside them (IBM Plex Mono 8px, `var(--muted-foreground)`)

### Background zones

- Define two new CSS variables in `globals.css`:
  - `--timeline-zone-above`: subtle green tint for the "alive" zone (light: `#f8fdf9`, dark: `rgba(34,197,94,0.03)`)
  - `--timeline-zone-below`: subtle warm tint for the "drifting" zone (light: `#fefcf8`, dark: `rgba(245,158,11,0.03)`)
- These are very subtle — just enough to give spatial meaning

### Canvas height

- Target `CANVAS_HEIGHT = 480` (9 stages, ~44px per interval, plus padding)
- This ensures all stages are visible without scrolling while keeping the canvas compact

### Nodes

- Slightly smaller: radius 13px (down from current ~18px effective)
- Same emoji-in-circle design, white fill, coloured stroke matching objective colour

### Date labels

- Quarterly labels along the bottom edge (IBM Plex Mono 10px, light grey)

### Existing features unchanged

- Ground line with `GROUND LINE` label
- Crossing markers (only rendered for selected objectives)
- Panzoom zoom/pan functionality
- Today marker (dashed vertical line)
- Toolbar with zoom controls and status count

---

## 3. Tooltip Fix (TimelineTooltip)

### Current problem

The tooltip is rendered as an absolutely positioned `<div>` inside the panzoom container, which has `overflow: hidden`. When a node is near the container edge, the tooltip is clipped.

### Solution: React Portal

- Render the tooltip via `createPortal(tooltipElement, document.body)`
- Position using `getBoundingClientRect()` on the hovered node to get viewport coordinates
- Use `position: fixed` on the tooltip element
- Apply the same visual design: card background, border, rounded corners, shadow

### Flip logic

- **Horizontal:** if tooltip's right edge would exceed `window.innerWidth - 16px`, position to the left of the node instead
- **Vertical:** if tooltip's bottom edge would exceed `window.innerHeight - 16px`, shift up. Clamp top to minimum 8px.

### Tooltip content (unchanged)

- Objective title (Lora serif, bold)
- Momentum stage badge (IBM Plex Mono, coloured background tint)
- Stage caption (Lora italic)
- Divider
- Latest signal excerpt (Lora italic)
- Source name + date (IBM Plex Mono)

---

## 4. State Management

### State ownership

All selection state lives in `TimelineCanvas` (consistent with the existing pattern where it owns `hoveredId` and `lockedIds`). `TimelineCanvas` passes `selectedIds` and `onToggleSelection` down to `TimelineLegend` as props.

The existing `lockedIds` state and `toggleLock` handler are **removed entirely**. The `hoveredId` state is **retained solely for tooltip display** — it no longer affects path/node opacity.

### Selected objectives state

```typescript
const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
  // Compute default selection: top 3 by absolute momentum score,
  // breaking ties by signal count. Fallback: first 3 objectives.
  return getDefaultSelection(objectives, signals);
});
```

### Default selection heuristic

Select the top 3 objectives by absolute momentum score (highest first), breaking ties by signal count. This is data-driven and degrades gracefully across companies without keyword fragility.

### Toggle handler

```typescript
function toggleObjective(id: string) {
  setSelectedIds(prev => {
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
```

### Filtering rendered content

```typescript
const visibleObjectives = objectives.filter(o => selectedIds.has(o.id));
// Only visibleObjectives produce TimelinePath, TimelineNode, and CrossingMarker elements
```

### New TimelineLegend props interface

```typescript
interface TimelineLegendProps {
  objectives: Objective[];
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  colours: Map<string, string>;
}
```

---

## 5. Files Changed

| File | Change |
|---|---|
| `frontend/src/components/company/TimelineLegend.tsx` | Full rewrite — new checkbox-based selector with title-first layout, selection logic, disabled state |
| `frontend/src/components/company/TimelineCanvas.tsx` | Add `selectedIds` state, filter rendered objectives, adjust canvas height/spacing, remove old opacity system |
| `frontend/src/components/company/TimelineTooltip.tsx` | Wrap in `createPortal(_, document.body)`, switch to `position: fixed`, add viewport-aware flip logic |
| `frontend/src/components/company/TimelineNode.tsx` | Reduce node radius to 13px |
| `frontend/src/components/company/TimelinePath.tsx` | Remove `opacity` prop (always full opacity now), keep `isBelowGround` for dashed styling |
| `frontend/src/app/globals.css` | Add `--timeline-zone-above` and `--timeline-zone-below` CSS variables |
| `frontend/src/lib/momentum.ts` | No changes expected |
| `frontend/src/lib/types.ts` | No changes expected |

---

## 6. What This Does NOT Change

- The momentum scale (9 stages, scoring, emojis, colours)
- The data model or Supabase schema
- The ground line metaphor
- Other tabs (Objectives, Buried, Evidence)
- The panzoom interaction model
- The crossing marker system
- Dark mode / light mode toggle behaviour (both themes continue to work via CSS variables)

---

## 7. Test Plan

| Component | Tests |
|---|---|
| `TimelineLegend` | Checkbox selection toggles `selectedIds`; max 3 enforcement (4th click ignored); min 1 enforcement (last checkbox not uncheckable); disabled state renders when 3 selected; buried items show strikethrough + exit manner |
| `TimelineCanvas` | Only selected objectives produce path/node/crossing elements; default selection computed on mount; counter shows correct `N of 3` |
| `TimelineTooltip` | Renders via portal (exists in `document.body`, not inside canvas container); flip logic positions correctly near edges |

---

## Visual Reference

Approved mockup: `.superpowers/brainstorm/602-1774089795/timeline-redesign-v5.html`
