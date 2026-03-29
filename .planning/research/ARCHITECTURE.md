# Architecture Patterns — Drift v4.2 Timeline UI Overhaul

**Domain:** SVG timeline canvas — clipPath fills, node stacking, tooltip portals, edge padding
**Researched:** 2026-03-29
**Confidence:** HIGH (all findings grounded in actual source files read)

---

## Existing Component Map

| File | Role | Key State/Props |
|------|------|-----------------|
| `TimelineCanvas.tsx` | Orchestrator. Owns all layout constants, node computation, tooltip state. Renders scrollable `<div>` wrapping a single `<svg>`. | `tooltip: TooltipState | null`, `hoveredId`, `selectedIds`, `objectiveNodeSets` |
| `TimelinePath.tsx` | Renders spline stroke + area fill using `clipPath` split. Stateless. | `points`, `groundY`, `id` |
| `TimelineNode.tsx` | Renders one SVG `<g>` per node (6 types). Stateless. | `type`, `x`, `y`, `stackIndex` |
| `TimelineTooltip.tsx` | Portal tooltip rendered into `document.body`. Uses `useLayoutEffect` to measure and reposition. | `viewportX`, `viewportY` (viewport coordinates from `getBoundingClientRect`) |
| `CrossingMarker.tsx` | Inline SVG element, rendered as a child of the main `<div>` wrapper (not inside `<svg>`). | `x`, `y` |
| `DeadlineFlag.tsx` | Inline SVG `<g>` inside main `<svg>`. | `x` |

### Layout Constants (TimelineCanvas.tsx lines 47-52)

```
PADDING_Y        = 30
CANVAS_HEIGHT    = 620
AXIS_LABEL_HEIGHT = 40
STAGE_HEIGHT     = (620 - 30 - 40) / 8  = 68.75
GROUND_Y         = 30 + 4 * 68.75       = 305
MONTH_WIDTH      = 40
LABEL_COL_WIDTH  = 60
```

Scores range -4 to +4 (8 stages). `scoreToY(score) = PADDING_Y + (4 - score) * STAGE_HEIGHT`. Ground line is `score=0`, which maps to `y=305`.

---

## Bug Diagnosis

### CANVAS-01 — clipPath Area-Fill: Red Zone Starts at Wrong Point

**File:** `TimelinePath.tsx` lines 42–64

**Root cause (confirmed by reading code):**

The `belowId` clipPath rect is defined as:
```
<rect x={0} y={groundY} width={10000} height={10000} />
```

This rect starts at exactly `y = groundY`. In SVG, a `clipPath` clips to the region *inside* the clip shape, inclusive of the boundary edge. The `fillPath` polygon closes with:
```
L ${last.x} ${groundY}  L ${first.x} ${groundY}  Z
```

The polygon's baseline is the line `y = groundY`. This line is the top edge of the `belowId` clip rect. Because SVG clip regions are geometrically closed (the boundary itself is included), the horizontal closing segment of the fill polygon — which sits precisely at `y = groundY` — falls inside the `belowId` clip. The result: a 1-pixel red strip at the ground line even when the entire spline is above ground.

A secondary issue: when the objective path crosses below `groundY` mid-spline, the `fillPath` function (lines 26–31) builds the polygon by going from the last point down to `groundY` and back to the first point. This creates a fill polygon that correctly closes at ground level — but that polygon's area below the ground line is not zero when the spline dips below. The `belowId` clip only clips what it sees from `y=groundY` downward, so the red fill correctly appears below, but the transition point (where red fill begins) is determined by where the polygon intersects `groundY` — which, for the bezier spline, is a precise mathematical point that the rectangular clip approximates correctly. The "red zone starts at wrong point" symptom is therefore the boundary-inclusive bug, not a polygon geometry error.

**Fix architecture:**

Offset the `belowId` clip rect's `y` by `+1` pixel:
```
<rect x={0} y={groundY + 1} width={10000} height={10000} />
```

This excludes the exact ground line pixel from the below-ground fill. The above clip rect can stay at `height={groundY}` because it already stops before the boundary.

**Alternatively (cleaner, preferred):** Replace the rectangular clip approach with two separate `fillPath` polygons that explicitly split at `groundY`. This eliminates all boundary ambiguity:

- **Above fill polygon:** Trace the spline, but clamp any point below `groundY` to `groundY`. Close down to `groundY`, then back along the ground line. This creates a fill polygon that never extends below `groundY` — no clip needed.
- **Below fill polygon:** Mirror approach — clamp above-ground portions of the spline to `groundY`, then close up to `groundY`.

The "split spline" approach requires computing intersections where the spline crosses `groundY`. Since the spline is a cubic bezier, intersection finding requires numerical methods. The simpler production fix is the `+1` pixel offset.

**Verdict: Use the +1px offset for the boundary fix. The polygon-split approach is a future refactor.**

---

### TOOLTIP-01 — Tooltip Edge Clipping

**File:** `TimelineTooltip.tsx` lines 37–56 and `TimelineCanvas.tsx` lines 591–594

**Current positioning pipeline:**

1. Node `onHover` fires with the `React.MouseEvent<SVGGElement>`.
2. `rect.right` and `rect.top` from `getBoundingClientRect()` are stored as `viewportX` / `viewportY`.
3. `TimelineTooltip` receives these as props and uses `useLayoutEffect` to measure the tooltip's own height, then computes `left` and `top`.
4. The tooltip renders via `createPortal` into `document.body` with `position: fixed`.

**Identified gaps:**

1. **Left-edge clip:** The flip logic (`left = viewportX - TOOLTIP_WIDTH - 16`) handles right-edge overflow but there is no left-edge guard. If a node is near the left of the viewport, the flip could put the tooltip at a negative `left`.
2. **Top-edge measured height:** `rect.height` in the `useLayoutEffect` is read before the tooltip is fully painted. The initial render uses `left: -9999, top: -9999` to keep it off-screen (correct pattern), but the first layout pass sets opacity 0 only, so `getBoundingClientRect()` returns the real height. This is correct and the existing approach is sound.
3. **`viewportX` source:** Using `rect.right` as the anchor means the tooltip appears to the right of the node's bounding box right edge. For nodes near the right edge of the *scroll container* (not just the viewport), this correctly uses viewport coordinates — the scrollable `<div>` doesn't affect `getBoundingClientRect()`. This is fine.
4. **Root cause of clipping:** The `scrollRef` div has `overflow-x: auto`. The SVG inside it can extend `canvasWidth` wide. When the user scrolls to the right, nodes near the left edge of the visible area have `rect.right` values that are small (near the left side of the viewport). The flip condition `left + TOOLTIP_WIDTH > window.innerWidth - EDGE_MARGIN` correctly evaluates in viewport space. The actual clipping symptom is likely that the tooltip is rendered in `document.body` at `position: fixed` but the *parent scroll container* has `overflow: hidden` on the canvas wrapper div (line 345: `overflow-hidden`). The outer `<div>` with `overflow-hidden` does not clip `position: fixed` children because fixed elements escape all containing blocks. **The clipping is therefore not a CSS overflow issue.** It is a positioning calculation issue when nodes are at canvas extremes.

**Fix architecture:**

Add a left-edge guard to `TimelineTooltip.tsx`:
```typescript
if (left < EDGE_MARGIN) {
  left = EDGE_MARGIN;
}
```

This should be added after the right-edge flip check (line 48) and before the top-edge clamp. The full corrected sequence:

```
1. Prefer: right of node (viewportX + 16)
2. If right overflows: flip left (viewportX - TOOLTIP_WIDTH - 16)
3. Clamp left: max(EDGE_MARGIN, left)
4. Clamp top: max(MIN_TOP, min(window.innerHeight - EDGE_MARGIN - rect.height, top))
```

No new components needed. The existing portal pattern (`createPortal` into `document.body` with `position: fixed`) is architecturally correct for SVG canvas tooltips — it is the right solution because SVG does not support HTML overflow naturally.

---

### NODE-02 — Node Overlap / Smart Stacking

**File:** `TimelineNode.tsx` lines 36–37, `TimelineCanvas.tsx` lines 551–639

**Current stacking implementation:**

`TimelineNode` receives `stackIndex` (the 0-based index of the objective among visible objectives). It uses `stackIndex % 2` to alternate tick heights:
- Even: `originTickH = 24`, `signalTickH = 20`
- Odd: `originTickH = 40`, `signalTickH = 36`

This is a simple binary alternation. For 3 objectives (max allowed: `selectedIds.size >= 3` check on line 327), this produces:
- Objective 0: short ticks
- Objective 1: tall ticks
- Objective 2: short ticks (same as 0 — collides)

The current approach has no collision detection at all. Labels at the same `x` position (same month) for two objectives at similar `y` positions will overlap regardless of tick height, because `label` text is anchored at `x` (center) with no horizontal offset.

**Fix architecture:**

**Option A: Multi-level tick stagger (minimum viable, no geometry).**
Replace binary alternation with a 3-level system keyed on `stackIndex % 3`:
- Level 0: `signalTickH = 20`
- Level 1: `signalTickH = 36`
- Level 2: `signalTickH = 52`

This guarantees that with 3 objectives at the same x-position, labels are vertically separated. No coordinate geometry required. Implement by extending the tick-height logic in `TimelineNode.tsx`.

**Option B: Collision-aware x-offset (correct but complex).**
Compute, in `TimelineCanvas`, for each `(objectiveIndex, nodeIndex)` pair, whether any other objective has a node within N pixels in x and M pixels in y. If so, shift the label text x by ±offset. This requires a `O(n²)` pass over all rendered nodes, performed in `objectiveNodeSets` memo. Pass a `labelXOffset` prop to `TimelineNode`.

**Verdict: Implement Option A for v4.2 (3-level stagger). Option B is the correct long-term solution and should be flagged as a v4.3 candidate.**

The 3-level stagger requires changes only in `TimelineNode.tsx` (tick height constants) — no prop interface changes needed since `stackIndex` is already passed.

---

### CANVAS-03 — Edge Padding / ViewBox

**File:** `TimelineCanvas.tsx` lines 123, 407–408

**Current state:**

- `canvasWidth = Math.max(totalMonths * MONTH_WIDTH, 800)` — no left or right padding added.
- SVG is `width={canvasWidth}`. First node `x = (originOffset + 0) * MONTH_WIDTH + MONTH_WIDTH / 2` — which is `MONTH_WIDTH/2 = 20` pixels from the left edge. This is minimal but acceptable.
- Right edge: last node is at approximately `(totalMonths - 1) * MONTH_WIDTH + 20`. The canvas extends to `totalMonths * MONTH_WIDTH`, giving 20px right padding. Tight but acceptable for the node circle. Tick labels (`textAnchor="middle"`) extend beyond the circle, potentially clipping.
- Top edge: `PADDING_Y = 30` is the top of background zones. Top axis labels are rendered at `y={PADDING_Y - 14}` (line 488) and `y={PADDING_Y - 4}` (line 496) — these are at y=16 and y=26, both within the 30px padding. Fine.
- Bottom edge: Axis labels render at `y={CANVAS_HEIGHT - AXIS_LABEL_HEIGHT + 18}` = `y=598` and `y=608`. Canvas height is 620. Fine.

**Root cause of clipping:** Node tick labels are the primary overflow source. A signal node with `signalTickH = 36` renders its label at `y = node.y - 36 - 4 = node.y - 40`. For a node at the top stage (orbit, score=4), `node.y = scoreToY(4) = 30`. Label would be at `y = -10` — clipped by the SVG viewport.

**Fix architecture:**

Two changes required:

1. **Increase `PADDING_Y`** from 30 to 60. This pushes all content down, giving labels at top scores room to render. `GROUND_Y` recalculates automatically since it's derived from `PADDING_Y`.

   Cascading recalculations (all in `TimelineCanvas.tsx`):
   - `GROUND_Y = 60 + 4 * STAGE_HEIGHT` — moves down by 30px
   - `CANVAS_HEIGHT` may need to increase by the same 30px (from 620 to 650) to avoid shrinking the below-ground zone
   - All other constants derive from these two — they cascade correctly

2. **Add horizontal padding to `canvasWidth`:**
   ```typescript
   const CANVAS_PADDING_X = 40;
   const canvasWidth = Math.max(totalMonths * MONTH_WIDTH + CANVAS_PADDING_X * 2, 800);
   ```
   And offset all x-coordinates by `CANVAS_PADDING_X`:
   ```typescript
   node.x = (originOffset + i) * MONTH_WIDTH + MONTH_WIDTH / 2 + CANVAS_PADDING_X;
   ```
   This requires updating the `originOffset` calculation in `objectiveNodeSets` memo, and similarly for `todayX`, `deadlineFlags` x-calculation, and `monthLabels` x-calculation — all in `TimelineCanvas.tsx`.

   Alternatively, use SVG `viewBox` with negative origin:
   ```
   viewBox={`-${CANVAS_PADDING_X} 0 ${canvasWidth + CANVAS_PADDING_X * 2} ${CANVAS_HEIGHT}`}
   ```
   This avoids changing any coordinate calculations but adds a viewBox attribute to the SVG element. Note: the SVG `width` must still match the scroll container's expected width, so `width={canvasWidth + CANVAS_PADDING_X * 2}` must be set.

**Verdict: Use the viewBox negative-origin approach for horizontal padding — zero coordinate changes required. Use PADDING_Y increase for vertical padding.**

---

## Component Boundaries — What Changes vs What Stays

| Component | Change Type | What Changes |
|-----------|-------------|--------------|
| `TimelinePath.tsx` | **Modify** | `belowId` clipPath rect: `y={groundY + 1}` instead of `y={groundY}` |
| `TimelineNode.tsx` | **Modify** | Replace binary tick stagger with 3-level stagger; increase node/icon sizes for NODE-01/NODE-03 |
| `TimelineTooltip.tsx` | **Modify** | Add left-edge guard in `useLayoutEffect` position calculation |
| `TimelineCanvas.tsx` | **Modify** | `PADDING_Y` 30→60, `CANVAS_HEIGHT` 620→650, viewBox negative origin for horizontal padding |
| `CrossingMarker.tsx` | No change needed | Not involved in any of the 4 bugs |
| `DeadlineFlag.tsx` | No change needed | Not involved |
| `TimelineLegend.tsx` | No change needed | Not involved |

No new components required for the bugs listed in v4.2. All fixes are targeted modifications to existing files.

---

## Data Flow — Tooltip Coordinate Pipeline (Annotated)

```
TimelineCanvas (SVG, inside scrollRef div)
  └── TimelineNode <g>
        └── onMouseEnter fires
              └── getBoundingClientRect() on the <g> element
                    → rect.right, rect.top (viewport coordinates, scroll-independent)
              └── setTooltip({ viewportX: rect.right, viewportY: rect.top, ... })

TimelineCanvas (render)
  └── tooltipData computed from tooltip state
  └── <TimelineTooltip viewportX={...} viewportY={...} ... />
        └── createPortal(tooltip, document.body)
              └── <div style={{ position: "fixed", left: ..., top: ... }}>
                    └── useLayoutEffect measures own height → sets position state
                    └── re-render with correct position
```

The portal correctly escapes the SVG/scroll container hierarchy. The coordinates are in viewport space throughout. The only gap is the missing left-edge guard in `TimelineTooltip`.

---

## Build Order Recommendation

Dependencies between the fixes determine safe build order:

1. **`TimelineCanvas.tsx` — PADDING_Y + CANVAS_HEIGHT + viewBox** (CANVAS-03)
   Must come first. Changes layout constants that affect `GROUND_Y`. If `TimelinePath.tsx` is fixed before this, the `groundY + 1` offset is correct but tested against the wrong `GROUND_Y` value.

2. **`TimelinePath.tsx` — clipPath boundary fix** (CANVAS-01)
   Depends on correct `GROUND_Y` from step 1. Isolated change — no prop interface modification.

3. **`TimelineNode.tsx` — tick stagger + icon sizes** (NODE-01, NODE-02, NODE-03)
   Independent of steps 1–2. Can be parallelized with step 2 but logically cleaner after canvas geometry is settled, since larger icons may expose remaining edge-padding issues.

4. **`TimelineTooltip.tsx` — left-edge guard** (TOOLTIP-01)
   Fully independent. Can be done at any point. Zero risk of breaking other components.

**Safe parallel track:** Steps 2, 3, and 4 can be implemented simultaneously by different developers. Step 1 must land first.

---

## Patterns to Follow

### SVG clipPath Boundary Rule
In SVG, clip regions are geometrically closed — the boundary line is included in the clip. When splitting fills at a horizontal line `y = groundY`, the `below` clip rect must start at `y = groundY + 1` (or `groundY + epsilon`) to avoid the boundary being included in both clips simultaneously.

### Fixed-Position Portal for SVG Tooltips
This is the correct pattern for interactive SVG canvases. SVG's foreign object support is limited and browser-inconsistent. `createPortal` into `document.body` with `position: fixed` and viewport coordinates from `getBoundingClientRect()` is the industry-standard approach. The existing `TimelineTooltip` architecture is sound.

### Coordinate System Consistency
All node x/y coordinates live in SVG space. Tooltip coordinates are converted to viewport space at the hover event boundary (in `onHover` callbacks in `TimelineCanvas`). These two coordinate systems must never be mixed — the current code correctly observes this boundary.

### Constants as Module-Level Named Values
All layout constants (`PADDING_Y`, `CANVAS_HEIGHT`, etc.) are defined at module scope in `TimelineCanvas.tsx`. Derived values (`GROUND_Y`, `STAGE_HEIGHT`) compute from them. This pattern is correct and must be preserved — avoid hardcoding derived values like `305` anywhere.

---

## Anti-Patterns to Avoid

### Anti-Pattern: Polygon-Split Bezier Intersection
Computing exact bezier/horizontal-line intersections to build above/below fill polygons is mathematically correct but operationally fragile. It requires numerical root-finding (Newton-Raphson or bisection) for cubic bezier curves. The `+1px` clip offset achieves the same visual result with zero risk.

### Anti-Pattern: Coordinate Transform in Tooltip
Do not convert SVG coordinates to viewport coordinates inside `TimelineTooltip`. That component must remain a pure viewport-space consumer. The conversion boundary is in `TimelineCanvas.onHover`.

### Anti-Pattern: Percentage-Based Widths for SVG
The scroll container uses `flex-1` which gives a fluid width. The SVG inside uses absolute pixel width (`width={canvasWidth}`). Do not use `width="100%"` on the inner SVG — it would collapse the scrollable canvas to the container width and break horizontal scrolling.

---

## Confidence Assessment

| Area | Confidence | Basis |
|------|------------|-------|
| ClipPath bug root cause | HIGH | Direct code inspection of `TimelinePath.tsx` lines 42–47; SVG clip geometry is specified behavior |
| ClipPath fix approach | HIGH | `+1px` offset is a standard SVG boundary technique; no library dependency |
| Tooltip coordinate system | HIGH | `getBoundingClientRect()` returns viewport coordinates regardless of scroll — MDN-specified behavior |
| Tooltip left-edge gap | HIGH | Missing guard confirmed by reading `useLayoutEffect` in `TimelineTooltip.tsx` lines 42–55 |
| Node stacking analysis | HIGH | Tick height logic read from `TimelineNode.tsx` lines 36–37; 3-objective collision confirmed by math |
| PADDING_Y top-clip analysis | HIGH | `scoreToY(4) = 30 = PADDING_Y` confirmed by formula; label offset `-40` confirmed from `signalTickH` |
| ViewBox approach for horizontal padding | HIGH | SVG viewBox with negative x-origin is a standard SVG technique; no browser compatibility concerns in modern browsers |

---

## Open Questions / Gaps

- **ZONE-01 (graveyard zone visual weight):** Not analyzed here. Likely involves changes to the background `<rect>` fills in `TimelineCanvas.tsx` (lines 410–411) — opacity, color variable, or pattern fill. Needs separate investigation.
- **CANVAS-02 (path smoothness):** The current `toSmoothPath` cubic bezier uses fixed 0.4/0.6 control point fractions. For paths where consecutive points have very different y-values, this produces overshooting. A Catmull-Rom or cardinal spline would produce better visual continuity. This is a `TimelinePath.tsx` concern but is a separate fix from the clipPath bug.
- **NODE-03 (content node sizing):** The "content-bearing nodes sized for legibility" requirement implies variable node radii based on label length. The current `TimelineNode.tsx` uses fixed radii (r=9, r=5 etc). Dynamic sizing would require measuring text or using SVG `<foreignObject>` for HTML labels. This is the highest-complexity item in v4.2 and may need its own research pass.
