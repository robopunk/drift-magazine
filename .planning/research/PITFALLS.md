# Domain Pitfalls: SVG Timeline UI Overhaul

**Domain:** Custom SVG timeline — bezier splines, clipPath fills, node stacking, tooltip portals, emoji/icon nodes
**Researched:** 2026-03-29
**Codebase files analysed:** `TimelinePath.tsx`, `TimelineNode.tsx`, `TimelineCanvas.tsx`

---

## Critical Pitfalls

Mistakes that cause visual regressions, broken fills, or silent cross-browser failures.

---

### Pitfall 1: clipPath rects with hardcoded magic numbers do not track SVG dimensions

**What goes wrong:**
`TimelinePath.tsx` uses `width={10000}` and `height={10000}` in both `<rect>` clip regions. These constants are larger than any expected canvas, which works today but breaks in two ways:
1. If the canvas ever shrinks or is rendered in a context narrower than expected, the clip boundary is invisible but the fill leaks visually in browsers that evaluate clip geometry against the local coordinate system differently (especially Safari).
2. More critically, the `height={groundY}` for the above-ground clip and `y={groundY}` for the below-ground clip are computed from `GROUND_Y`, a module-level constant derived from `CANVAS_HEIGHT`. If `CANVAS_HEIGHT` changes (e.g., a responsive resize), the hardcoded rects are not updated because they are passed as `groundY` prop and baked at render time. Any future attempt to make the canvas height dynamic will silently break both fills.

**Why it happens:**
Defensive oversizing (10000 pixels) is a common quick fix for SVG clipping when exact bounds are unknown. It works until the coordinate system changes.

**Consequences:**
- Below-ground red fill appears above the ground line (the CANVAS-01 bug).
- Above-ground fill fails to clip and spills into the graveyard zone.
- Both fills break simultaneously if `CANVAS_HEIGHT` is adjusted.

**Prevention:**
- Replace the hardcoded `10000` width with `canvasWidth` passed as a prop to `TimelinePath`.
- Replace the hardcoded below-ground height with `CANVAS_HEIGHT - groundY` rather than a fixed large number.
- Document that `groundY` is the single source of truth and must come from the same computation as `scoreToY(0)`.

**Detection:**
- Visually: the red fill extends above the ground line or the emerald fill bleeds into the graveyard zone.
- In DevTools: inspect the `<clipPath>` rect — if its `height` does not equal `groundY`, the above-ground clip is wrong.

**Phase:** CANVAS-01 (area-fill clip bug fix)

---

### Pitfall 2: A single fill path that crosses the ground line cannot be split by a simple rect clip

**What goes wrong:**
`toFillPath()` generates one closed cubic bezier spline that closes back to the ground line at both ends. When the spline dips below and comes back above the ground line — which happens when a trajectory recovers — the single fill shape self-intersects relative to the clip boundary. The rect clip correctly hides the portion of the fill on the wrong side, but the SVG fill rule (`nonzero` by default) computes winding order across the whole closed path. This means portions of the fill near the crossing point may render with wrong opacity or wrong fill region depending on the browser's winding evaluation.

**Why it happens:**
The closed path `spline + L last.x groundY + L first.x groundY + Z` is geometrically correct only when the spline stays fully on one side of the ground line. When the spline crosses, the "triangle" between the crossing point, the baseline, and the node creates ambiguous winding. The clip rect hides the wrong side but does not fix the underlying path winding.

**Consequences:**
- Near crossings, the fill appears correctly in Chrome but may render with wrong winding in Safari or Firefox.
- The `CrossingMarker` component highlights crossing points — these are exactly where the fill bug manifests.

**Prevention:**
- For paths that cross the ground line, compute the crossing x-coordinate by linear interpolation between adjacent nodes (binary search or iterative bisection on the spline), then split the fill path into two separate closed paths at that point: one above, one below.
- Each sub-path closes cleanly to the ground line with no winding ambiguity.
- This is the correct approach used by D3-area and Recharts for multi-region area fills.

**Detection:**
- Test with a trajectory that starts above, dips below, and rises again.
- Inspect both Safari and Firefox — Chrome is most forgiving of winding errors.

**Phase:** CANVAS-01, ZONE-01

---

### Pitfall 3: Duplicate clipPath IDs across multiple rendered objectives cause fill stealing

**What goes wrong:**
`TimelinePath` generates `id={aboveId}` as `above-${id}` and `below-${id}`. This is correct as long as `id` (the objective ID from Supabase) is unique per render. However, if two objectives share the same ID (e.g., during test fixtures, Storybook, or if a bug duplicates objectives in `visibleObjectives`), the second `<defs>` block overwrites the first in the DOM. Both paths then reference the same clip region, and one objective's fill is clipped by the other's ground line.

**Why it happens:**
SVG `id` attributes are globally unique per document. React does not warn about duplicate SVG IDs. The bug is silent and hard to spot in production because it only manifests with two specific objectives selected simultaneously.

**Consequences:**
- One objective's fill is clipped using another objective's `groundY`.
- If objectives have different ground lines (which they currently don't — all share `GROUND_Y`), this becomes catastrophic when a per-objective ground line is introduced.

**Prevention:**
- Keep the current `above-${id}` pattern but add a stable render-key assertion in tests: verify that all `clipPath` `id` attributes in a given SVG render are unique.
- If Storybook or test fixtures use fake IDs, use `crypto.randomUUID()` or a stable hash of objective title + index.

**Detection:**
- Select two objectives. Open DevTools and search for duplicate `id` values in the SVG defs.

**Phase:** CANVAS-01 (defensive fix), any phase that adds Storybook stories

---

### Pitfall 4: Tooltip position uses `getBoundingClientRect()` on SVG elements, which is broken in Safari for CSS-transformed parents

**What goes wrong:**
In `TimelineCanvas.tsx` (lines 593–595), the tooltip anchor is set from `e.currentTarget.getBoundingClientRect()` — specifically `rect.right` and `rect.top`. This works correctly in Chrome. In Firefox and Safari, `getBoundingClientRect()` on SVG child elements does not correctly account for CSS `transform` applied to an ancestor element (confirmed bug: Mozilla Bugzilla #1066435, WebKit bug #42815). The scrollable div (`scrollRef`) uses `overflow-x: auto`, which is not a CSS transform, so the basic scroll case is handled. But if any parent applies a CSS `transform` (e.g., a Framer Motion animation on the company page, the `<g opacity={...}>` transition, or a zoom interaction), the bounding rect calculation becomes incorrect by the transform offset.

**Why it happens:**
The current implementation also reads `rect.right` (not `rect.left` or center), which means the tooltip appears to the right of the node. If the node is near the right edge of the visible scroll area, the tooltip will be clipped by the outer container. Additionally, the tooltip is rendered outside the SVG (`{tooltipData && <TimelineTooltip {...tooltipData} />}`) as a sibling div — not a portal — meaning it is still subject to the parent's `overflow: hidden` boundary.

**Consequences:**
- Tooltip appears at wrong position on Safari when any parent has a CSS transform.
- Tooltip is clipped when a node is near the right edge of the scroll container.
- Tooltip disappears entirely when the node is scrolled out of view but hover briefly fires during rapid scroll.

**Prevention:**
- Convert `TimelineTooltip` to a true React portal (`ReactDOM.createPortal(..., document.body)`) so it escapes all overflow contexts.
- Instead of `getBoundingClientRect()` on the SVG child, use `getBoundingClientRect()` on the outermost scroll container (`scrollRef.current.getBoundingClientRect()`) and add the node's SVG-coordinate offset manually: `nodeX - scrollRef.current.scrollLeft + containerRect.left`. This avoids the SVG transform bug entirely.
- Clamp the final viewport position so the tooltip never extends beyond `window.innerWidth`.

**Detection:**
- Test in Safari: hover a node; see if tooltip position matches the node.
- Test with a node positioned in the last 200px of the canvas width.
- Wrap the canvas in a Framer Motion `<motion.div>` with `initial={{ opacity: 0 }}` — tooltip position should be unaffected.

**Phase:** TOOLTIP-01

---

### Pitfall 5: SVG `<text>` emoji rendering is rasterized at the declared font size, not the display size

**What goes wrong:**
`TimelineNode.tsx` renders emojis as SVG `<text>` elements with `fontSize={12}` (terminal nodes, lines 118–123) and `fontSize={7}` (stale nodes, lines 56–63). Browsers rasterize emoji glyphs from the system font at the specified `fontSize` in CSS pixels. At small sizes (7–12px), the rasterization resolution is low. When the user zooms the browser (not panzoom, but native browser zoom), the emoji is scaled up from a 12px raster, producing blurry output. The "emoji too small" complaint (NODE-01) is a direct consequence: increasing `fontSize` in the SVG text element will make the glyph sharper, but it also shifts the text baseline and affects surrounding geometry (tick lines, label positions).

**Why it happens:**
SVG `<text>` emoji is rendered using the OS emoji font, which is a raster font at small sizes (Apple Color Emoji, Segoe UI Emoji). Unlike vector SVG paths, the glyph cannot scale infinitely.

**Consequences:**
- Enlarging `fontSize` without adjusting `y`, `dominantBaseline`, and surrounding circle radii breaks visual alignment.
- The `r={10}` outer circle and `r={6}` inner circle on terminal nodes were sized for `fontSize={12}`. Increasing to `fontSize={18}` or higher makes the emoji overflow the circle unless radii are also scaled.
- The alternating tick height stagger (`originTickH`, `signalTickH`) was calibrated for current node sizes. Larger nodes reduce the available vertical gap between the spline and the tick top, potentially causing label-to-label collisions.

**Prevention:**
- For terminal and key nodes, replace SVG `<text>` emoji with inline SVG paths or `<image>` references to SVG emoji assets (Twemoji/Noto Emoji SVG). SVG paths scale without rasterization.
- If keeping `<text>` emoji, increase `fontSize` to 18–22px and proportionally scale all surrounding geometry (circle radii, tick offsets, label `y` positions) in the same PR.
- Do not change font size in isolation — treat the node as a geometric unit with fixed proportions.

**Detection:**
- Open the live site, zoom the browser to 200% — emoji nodes should remain crisp. If blurry, the font size is the bottleneck.
- Check that terminal node circles visually contain the emoji at the new size before shipping.

**Phase:** NODE-01

---

## Moderate Pitfalls

---

### Pitfall 6: Alternating tick-height stagger is a binary solution that fails with 3 objectives at close x-positions

**What goes wrong:**
`TimelineNode.tsx` uses `stackIndex % 2` to alternate tick heights between 24/40px (origin) and 20/36px (signal). With two objectives selected, this works: objective 0 gets short ticks, objective 1 gets tall ticks. With three objectives selected (the maximum allowed by `toggleObjective`), objectives 0 and 2 both get short ticks. If objectives 0 and 2 have signals at the same month, their labels share the same tick height and x-position, producing a direct overlap. The stagger does not account for x-distance between nodes of the same stack height.

**Why it happens:**
`stackIndex` is the objective's position in `visibleObjectives`, which is constant for a session. It does not respond to the actual x-gap between co-occurring nodes.

**Consequences:**
- Two labels at the same x and same tick height are rendered on top of each other, making both unreadable.
- This is most likely with cadence-filled monthly nodes that all share the same `x` bucket.

**Prevention:**
- Compute label positions in a post-processing pass: after all node x/y are resolved, run a greedy left-to-right sweep that checks bounding boxes (estimated as `fontSize * label.length * 0.6` wide by `fontSize * 1.2` tall) and bumps conflicting labels to the next available tick height slot.
- Only run the collision pass for `signal` and `latest` nodes — cadence nodes have no labels.
- Limit the collision pass to nodes within the same 2-month x-window to keep it O(n) in practice.

**Detection:**
- Select 3 objectives and find a month where all three have signal nodes. Labels will stack.

**Phase:** NODE-02

---

### Pitfall 7: Canvas edge padding is not applied uniformly — nodes at the leftmost and rightmost months render partially outside the SVG

**What goes wrong:**
`canvasWidth = totalMonths * MONTH_WIDTH` places the first node at `x = MONTH_WIDTH / 2 = 20`. Node circles with `r={10}` on terminal nodes render from `x = 10`, which is within bounds. However, tick lines extend upward and labels extend left/right of center. The label text for an origin node at month 0 is `textAnchor="middle"`, so it extends 50% of its width to the left of `x = 20`. For a label like "Oct 2023" (~7 characters at `fontSize={8}`), the label extends approximately `28px` to the left of center, meaning it starts near `x = -8` — outside the SVG viewport and clipped by `overflow: hidden` on the scroll container.

**Why it happens:**
The `minDate` computation adds a `+2` month buffer to `totalMonths` (line 119 of `TimelineCanvas.tsx`), but the left edge has no dedicated padding column. `LABEL_COL_WIDTH = 60` is a fixed label column, not a data padding column.

**Consequences:**
- Origin node date labels are clipped on the left edge.
- Terminal node labels are clipped on the right edge when the exit date falls near the last computed month.

**Prevention:**
- Add an explicit `LEFT_PADDING = 1` month and `RIGHT_PADDING = 2` month offset to `canvasWidth` and shift all x-coordinates by `LEFT_PADDING * MONTH_WIDTH`.
- Alternatively, shift the origin of the global month offset by one month backward so the first data point lands at month index 1, not 0.

**Detection:**
- Inspect origin node date labels at the leftmost visible position. Check if the text is cut off.

**Phase:** CANVAS-03 (edge overflow fix)

---

### Pitfall 8: Graveyard zone visual weight change requires coordinated CSS variable and SVG fill update

**What goes wrong:**
The graveyard background is a `<rect>` using `fill="var(--timeline-zone-below)"`. The red fill from `TimelinePath` uses `fill="var(--destructive)"`. These are two independent colour sources. If ZONE-01 increases graveyard visual weight by darkening `--timeline-zone-below` or increasing its opacity, the path fill `var(--destructive)` at `fillOpacity={0.08}` may become visually lost or redundant — the background and the path fill compete. Changing one without the other creates visual incoherence.

**Why it happens:**
The zone background and the path fill serve the same editorial signal (below-ground = bad) but use different variables with no coupling contract.

**Prevention:**
- Treat the graveyard zone as a single visual system: define both `--timeline-zone-below` and the below-ground path fill opacity together in one design decision. Do not adjust one in isolation.
- Add a CSS comment linking the two values so future maintainers know they are coupled.

**Detection:**
- After any change to `--timeline-zone-below`, visually verify the path fill is still legible against the background.

**Phase:** ZONE-01

---

## Minor Pitfalls

---

### Pitfall 9: The `isBelowGround` prop on `TimelinePath` is computed but never used

**What goes wrong:**
`TimelineCanvas.tsx` passes `isBelowGround={objective.momentum_score <= 0}` to `TimelinePath`, but the `TimelinePath` component does not use this prop in its render logic. The fill split between above/below is handled entirely by the clipPath rects. The prop is dead code today, but any future developer reading the prop might assume it controls fill colour, leading to incorrect assumptions about behaviour.

**Why it happens:**
The prop was likely added during an earlier design iteration where path rendering differed based on overall objective state, then the implementation changed to use clipPaths.

**Prevention:**
- Either remove the prop (and update the interface + call site) or document why it is passed but unused with a `// TODO` comment explaining the intended future use.

**Phase:** Any refactor phase — low urgency, high confusion risk.

---

### Pitfall 10: Tooltip fires on `rect.right` which jumps when SVG is scrolled

**What goes wrong:**
`rect.right` from `getBoundingClientRect()` is a viewport-relative x-coordinate. When the user hovers over a node, then scrolls the timeline horizontally, `rect.right` does not update (the tooltip has already set its position state). The tooltip stays anchored to the original viewport position while the node scrolls away. For slow hover transitions this is acceptable; for click-to-open tooltips or sticky tooltips this becomes confusing.

**Why it happens:**
`setTooltip` fires once on `mouseenter` with a snapshot of the viewport position. No scroll listener updates the position after the initial fire.

**Prevention:**
- If tooltips are to remain visible during scroll (e.g., click-pinned), attach a `scroll` listener on `scrollRef` that calls `setTooltip(null)` on any scroll event.
- For hover-only tooltips the current behaviour is acceptable if the tooltip disappears on `mouseleave` before the user has time to scroll.

**Phase:** TOOLTIP-01

---

## Phase-Specific Warnings

| Phase / Requirement | Likely Pitfall | Mitigation |
|---------------------|---------------|------------|
| CANVAS-01 (clip bug) | Hardcoded `10000` clip rects do not track `canvasWidth` | Pass `canvasWidth` as prop to `TimelinePath`; replace magic constants |
| CANVAS-01 (clip bug) | Single fill path crossing ground line has winding ambiguity | Split fill path at crossing points; use two separate closed paths |
| CANVAS-01 (clip bug) | Duplicate clipPath IDs if two objectives have same Supabase ID | Assert unique IDs in tests |
| CANVAS-03 (edge overflow) | First/last nodes render labels outside SVG viewport | Add left/right month buffer to `canvasWidth` and offset x origin |
| NODE-01 (icon quality) | Increasing emoji `fontSize` breaks surrounding geometry | Scale circle radii and tick offsets proportionally in same change |
| NODE-01 (icon quality) | Text emoji rasterizes at declared size; blurry at browser zoom | Replace with inline SVG paths or `<image>` SVG emoji (Twemoji) |
| NODE-02 (declutter) | Binary `stackIndex % 2` stagger fails for 3 objectives at same x | Add post-processing label bounding-box collision sweep |
| NODE-02 (declutter) | Label collision pass must not regress cadence node performance | Only run pass on `signal`/`latest` node types |
| TOOLTIP-01 (positioning) | `getBoundingClientRect()` broken on SVG in Safari with CSS transforms | Use container rect + SVG coordinate offset instead |
| TOOLTIP-01 (clipping) | Tooltip div is not a portal — clipped by scroll container | Move `TimelineTooltip` to `ReactDOM.createPortal(...)` |
| ZONE-01 (graveyard weight) | Background zone and path fill are visually coupled but coded independently | Change both in same PR; document coupling with comments |

---

## Regression Risks per Change

These are the specific regression risks that the requirements writer should flag per task:

### Changing `TimelinePath` clipPath rects
**Regression risk:** HIGH
- Both emerald and red fills are affected simultaneously.
- A mistake breaks the most prominent visual element on the page.
- Test: render an objective that crosses the ground line; verify emerald fill stops exactly at groundY and red fill starts exactly at groundY in Chrome, Firefox, and Safari.

### Splitting fill path at crossing point
**Regression risk:** HIGH
- Touches `toFillPath()` and `toSmoothPath()` which are called once per objective per render.
- Any error in crossing x-interpolation causes a visual gap or spike at the crossing.
- The `CrossingMarker` component renders at crossing points — the split point must exactly match the `CrossingMarker` x-coordinate.
- Test: compare crossing x from the path split with `crossings` array x-values; they must agree within 1px.

### Moving `TimelineTooltip` to a portal
**Regression risk:** MEDIUM
- The tooltip currently sits inside the `TimelineCanvas` return tree. Moving it to `document.body` means it is no longer affected by the canvas `opacity` transitions on hover. The tooltip will not fade out when the canvas dims an objective.
- A portal tooltip also escapes any theme/CSS variable scoping if the theme class is only applied to the canvas container. Verify `var(--foreground)` and other CSS variables resolve correctly at `document.body`.
- Test: hover a node, then hover a different objective in the legend (which triggers the dim transition). Tooltip should dismiss cleanly.

### Increasing emoji/icon font size in `TimelineNode`
**Regression risk:** MEDIUM
- The 99 existing Vitest + RTL tests cover rendering and interaction but do not cover visual geometry. A size increase that breaks label positioning will not be caught by tests.
- The terminal node circles (`r={10}`, `r={6}`) must be enlarged to contain the larger emoji. The tick line starts at `y - 10` for terminal nodes — if `r` increases to 14, the tick should start at `y - 14`.
- The stale node `r={4.5}` and the `!` text at `fontSize={7}` are calibrated as a pair. Changing one without the other breaks the visual unit.
- Test: snapshot-test the rendered SVG output of each node type at the new sizes.

### Adding label collision detection pass
**Regression risk:** LOW-MEDIUM
- The pass runs after node x/y are resolved. Any bug in the pass only affects label y-offset, not the spline path or fills.
- Risk: the collision pass uses estimated text widths. Monospace fonts (IBM Plex Mono is used) have known character widths; estimate as `charWidth = fontSize * 0.6`. For 9px font, that is 5.4px/char. A 12-char label ("🦅 FLY +3") is ~65px wide. This estimate is accurate to within ~10% for IBM Plex Mono.
- Test: render 3 overlapping objectives and assert no two labels share the same `y` coordinate within 1px.

---

## Sources

- Mozilla Bugzilla #1066435: [getBoundingClientRect() doesn't take CSS transform into account for SVG elements](https://bugzilla.mozilla.org/show_bug.cgi?id=1066435)
- WebKit bug #42815: [getBoundingClientRect Broken for SVG Elements](https://bugs.webkit.org/show_bug.cgi?id=42815)
- Sara Soueidan: [Clipping in CSS and SVG](https://www.sarasoueidan.com/blog/css-svg-clipping/) — clipPath units and coordinate systems
- CSS-Tricks: [Scaling SVG Clipping Paths for CSS Use](https://css-tricks.com/scaling-svg-clipping-paths-css-use/) — clipPathUnits and responsive clips
- React SVG ID collision: [Fix duplicate SVG ID collision in React](https://www.antonball.dev/blog/2020-06-15-svg-id-collision/) — MEDIUM confidence (pattern is well-established)
- Medium: [This One Layout Mistake Is Silently Breaking Your Tooltip](https://medium.com/@canozcannn/this-one-layout-mistake-is-silently-breaking-your-tooltip-f59541ff1726) — overflow + portal interaction
- react-native-svg issue #2783: [Unicode Emojis rendered at fixed size causing blurry rendering](https://github.com/software-mansion/react-native-svg/issues/2783) — emoji rasterization at small font sizes
- Observable: [Preventing Label Overlaps in D3](https://observablehq.com/@stuartathompson/preventing-label-overlaps-in-d3) — bounding box collision detection approach

---

*All findings verified against actual source code in `TimelinePath.tsx`, `TimelineNode.tsx`, and `TimelineCanvas.tsx`. Confidence: HIGH for code-derived pitfalls; MEDIUM for browser-specific behaviour claims; LOW confidence items are not included.*
