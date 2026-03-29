# Timeline Viewport-Fit & Readability Improvements

**Date:** 2026-03-21
**Status:** Draft
**Scope:** TimelineCanvas, TimelineLegend, TimelineTooltip, TimelineNode

---

## Problem

1. The timeline canvas has a hardcoded height (480px + 60px toolbar), which doesn't fill the viewport — users must scroll vertically to see the full +4 to -4 momentum scale.
2. Unselected legend items use `opacity: 0.45`, making them nearly invisible on light backgrounds.
3. Buried items in the legend have `line-through` text decoration, reducing readability.
4. Tooltip shows a redundant status caption that repeats information already conveyed by the emoji and stage label.
5. Timeline nodes have a browser-native `title` tooltip that duplicates the custom tooltip.

## Solution

### 1. Viewport-height canvas

Replace the hardcoded `CANVAS_HEIGHT = 480` with a dynamic height derived from `calc(100vh - 170px)`.

**Offset breakdown:**
- Masthead: 56px (`h-14`, sticky `top-0`)
- TabBar: ~45px (`py-3` + border, sticky `top-14`)
- Wrapper `py-8` top padding: 32px
- Wrapper `py-8` bottom padding: 32px
- Total: ~165px → use `calc(100vh - 170px)` with comfortable margin

**Minimum height:** Apply `min-h-[400px]` to prevent collapse on short viewports.

**Implementation:**
- Remove the `CANVAS_HEIGHT` constant from `TimelineCanvas.tsx`
- Remove the hardcoded `style={{ height: CANVAS_HEIGHT + 60 }}` on the container
- Set the container height via CSS: `h-[calc(100vh-170px)] min-h-[400px]`
- Extend the existing `ResizeObserver` (currently measuring width) to also track the canvas area height
- Add a `canvasHeight` state variable (alongside existing `canvasWidth`)
- Convert module-level constants to dynamic derived values:
  - `GROUND_Y` → `groundY = canvasHeight / 2` (via `useMemo`)
  - `STAGE_HEIGHT` → `stageHeight = (canvasHeight - PADDING_Y * 2) / 8` (via `useMemo`)
- Update `scoreToY` callback to depend on `canvasHeight` (currently has `[]` deps — needs `stageHeight` in deps)
- Replace all direct references to `CANVAS_HEIGHT` and `GROUND_Y` in SVG markup and the `crossings` memo with dynamic values

**Files changed:** `TimelineCanvas.tsx`

### 2. Legend sidebar 50/50 split

Replace the current single scrollable list with two equal-height sections.

**Current structure:**
```
<div class="flex-1 overflow-y-auto">  ← single scroll area
  Objectives heading
  ...alive items...
  ---divider---
  Buried heading
  ...buried items...
</div>
<footer>X of 3 selected</footer>
```

**New structure:**
```
<div class="flex-1 overflow-y-auto">  ← Objectives section (50%)
  Objectives heading
  ...alive items...
</div>
<div class="border-t" />
<div class="flex-1 overflow-y-auto">  ← Buried section (50%)
  Buried heading
  ...buried items...
</div>
<footer>X of 3 selected</footer>
```

Both sections use `flex: 1` and `overflow-y: auto` for independent scrolling.

**Edge case — empty Buried section:** When `buried.length === 0`, skip the 50/50 split entirely — Objectives section fills the full available height (matching current behavior). The split only activates when both sections have items.

**Files changed:** `TimelineLegend.tsx`

### 3. Increase unselected item opacity

Change opacity from `0.45` to `0.65` for unselected (and disabled) legend items.

**Current:** `opacity-45` base, `hover:opacity-70` on hover
**New:** `opacity-65` base, `hover:opacity-85` on hover (maintain visible interactive affordance)

**Files changed:** `TimelineLegend.tsx`

### 4. Remove strikethrough from buried items

Remove the `line-through` class from buried objective titles in the legend. The exit manner label (SILENT DROP, MORPHED, etc.) already distinguishes buried items.

**Current:** `className={... ${isBuried ? "line-through" : ""}}`
**New:** Remove the conditional entirely

**Files changed:** `TimelineLegend.tsx`

### 5. Remove status caption from tooltip

Remove the italic editorial caption line from `TimelineTooltip`. The emoji + stage badge already convey the status. The signal excerpt and source remain.

**Current line to remove:**
```tsx
<p className="font-serif italic text-xs text-muted-foreground mb-2">{stageInfo.caption}</p>
```

**Files changed:** `TimelineTooltip.tsx`

### 6. Convert native title to aria-label on timeline nodes

Replace `title={label}` with `aria-label={label}` on the `TimelineNode` component. The custom tooltip already provides visual information on hover, but `aria-label` preserves screen reader accessibility.

**Files changed:** `TimelineNode.tsx`

---

## Files Modified (summary)

| File | Changes |
|---|---|
| `TimelineCanvas.tsx` | Dynamic height via `calc(100vh-170px)`, derive canvas dimensions from measured height |
| `TimelineLegend.tsx` | 50/50 split layout, opacity 0.45→0.65, remove strikethrough |
| `TimelineTooltip.tsx` | Remove caption line |
| `TimelineNode.tsx` | Convert `title` to `aria-label` |

## Testing

- Verify full +4 to -4 scale is visible without vertical scroll on standard viewports (1080p, 1440p)
- Verify legend Objectives and Buried sections scroll independently
- Verify unselected items are readable in both light and dark mode
- Verify buried items display without strikethrough
- Verify tooltip shows emoji + stage badge + signal excerpt (no caption)
- Verify no browser-native tooltip on node hover, but `aria-label` is present
- Verify timeline remains usable on short viewports (min-height kicks in, page scrolls if needed)
- Run existing test suite (`vitest`)
