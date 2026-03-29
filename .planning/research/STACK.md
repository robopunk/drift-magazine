# Technology Stack — Drift v4.2 Timeline UI Overhaul

**Project:** Drift — Interactive SVG Timeline Canvas
**Researched:** 2026-03-29
**Scope:** SVG rendering techniques and minimal library additions for the 8 CANVAS/NODE/TOOLTIP/ZONE requirements. Existing stack (Next.js 16, React 19, Tailwind CSS 4, Framer Motion 12, TypeScript 5) is fixed — this document only covers what must change or be added.

---

## Environment Facts (Confirmed by Reading Source Files)

| Fact | Value | Source |
|------|-------|--------|
| Framework | Next.js 16.2.0 + Turbopack (default bundler) | `package.json` |
| React | 19.2.4 | `package.json` |
| Module system | `"type": "module"` (ESM native) | `package.json` |
| Timeline components | `"use client"` directive — all client components | Confirmed in all 4 source files |
| Existing SVG approach | Pure React JSX SVG — no library wrapping | `TimelinePath.tsx`, `TimelineNode.tsx` |
| Tooltip | `createPortal` into `document.body`, `position: fixed` | `TimelineTooltip.tsx` |
| No d3 currently | Zero d3 dependencies in `package.json` | `package.json` |

---

## Decision: No New UI Libraries Required

Every fix in CANVAS-01, CANVAS-03, TOOLTIP-01, NODE-01, NODE-02, NODE-03, ZONE-01 can be implemented with:
1. **Pure SVG techniques** — no library needed
2. **One optional addition** — `d3-shape` for path smoothness only (CANVAS-02)

The tooltip (TOOLTIP-01) already uses the correct architecture (`createPortal` + `position: fixed`). Floating UI would add value but is not required for the specific bug identified (missing left-edge guard).

---

## Recommended Stack Changes

### CANVAS-02 Only: Add d3-shape

**Add:** `d3-shape@3.2.0`
**Peer dependency:** `d3-path@^3.1.0` (must also install)

```bash
npm install d3-shape d3-path
```

**Why d3-shape specifically:**
The current `toSmoothPath` in `TimelinePath.tsx` uses a fixed 0.4/0.6 horizontal control point fraction for all cubic bezier segments. This ignores the y-distance between consecutive points and produces S-shaped overshoots when adjacent scores differ by 2+ stages (e.g., a jump from score -1 to score +3). The visual result is a spline that swings past its target points before correcting.

`d3-shape` provides `curveMonotoneX`, which implements the Steffen monotone cubic interpolation algorithm. It guarantees:
- No spurious oscillations between data points
- Continuous first-order derivatives (visually smooth)
- Local extrema only at actual data points — no overshooting
- Passes through all data points exactly

This is the production-proven solution used in Observable, Recharts, Nivo, and Vega. It directly addresses the visual kinks and overshoots in CANVAS-02.

**Confidence:** HIGH — confirmed in official D3 documentation and source code

**Why not Catmull-Rom (`curveCatmullRom`):** Catmull-Rom at alpha=0.5 (centripetal) minimizes but does not eliminate overshoot. MonotoneX provides a mathematical guarantee. For a timeline showing momentum scores across discrete monthly steps, monotonicity preservation is the correct property — a trajectory that scores +3 in October should not visually dip to +2.7 between October and November.

**Why not just fix the bezier control points manually:** The fix would require computing tangents from neighboring points (a reimplementation of Catmull-Rom). This is exactly what d3-shape already does correctly. Reinventing it introduces maintenance burden with no benefit.

**ESM/Next.js 16 compatibility:** `d3-shape` is ESM-only (`"type": "module"` in its package.json). The Drift frontend is also `"type": "module"`. With Next.js 16's stable Turbopack as default bundler, ESM packages import cleanly in `"use client"` components. No `transpilePackages` configuration is needed. Confirmed: d3-shape has no peer dependencies other than `d3-path` (also ESM, same ecosystem). **Confidence: MEDIUM** — no ESM errors reported with Next.js 16 + Turbopack in search results; the project's own `"type": "module"` flag removes the historically problematic require/ESM mismatch.

**Risk:** LOW. d3-shape is a pure computation library. It generates SVG path `d` strings; it never touches the DOM. It will not affect SSR, hydration, or React rendering. Usage stays entirely inside `toSmoothPath()` in `TimelinePath.tsx`.

---

### All Other Issues: Pure SVG Techniques (No Library)

The table below documents every required technique. Each is native SVG/React/browser — no additional dependencies.

---

## SVG Techniques by Issue

### CANVAS-01 — clipPath Boundary Fix (Area Fill Red Zone)

**Technique: clipPath rect y-offset by +1**

**Root cause (confirmed by code):** In `TimelinePath.tsx`, the `belowId` clipPath rect is:
```
<rect x={0} y={groundY} width={10000} height={10000} />
```
SVG clip regions are geometrically closed. The boundary line `y = groundY` is included in the `belowId` clip region. The fill polygon's baseline segment (closing `L ${last.x} ${groundY}`) falls exactly on this boundary, so the below-ground fill renders a 1-pixel red strip at the ground line even when the spline never goes below ground.

**Fix:** Change `y={groundY}` to `y={groundY + 1}` in the `belowId` clipPath rect. This is a 1-character change in `TimelinePath.tsx` line 46.

**Why this works:** Shifting the clip region's top edge 1px downward excludes the exact ground line from the red fill. The above-ground clip rect (`height={groundY}`) already stops at `y = groundY` — it does not reach `groundY + 1` — so there is no 1px gap in the emerald fill.

**What NOT to do:** Do not attempt to compute exact bezier/line intersections to split the fill polygon at `groundY`. Cubic bezier intersection requires numerical root-finding (Newton-Raphson or bisection), introduces floating-point edge cases, and produces the same visual result as the 1px offset. This is a valid future refactor but not the right fix for v4.2.

**Confidence:** HIGH — SVG clip geometry is specified by the SVG 1.1/2.0 spec. Boundary-inclusive behavior is standard.

---

### CANVAS-02 — Path Smoothness (Spline Overshoot)

**Technique: Replace manual bezier with d3-shape curveMonotoneX**

**Integration approach for `TimelinePath.tsx`:**

```typescript
import { line, curveMonotoneX } from "d3-shape";

function toSmoothPath(points: Point[]): string {
  if (points.length < 2) return "";
  const generator = line<Point>()
    .x((p) => p.x)
    .y((p) => p.y)
    .curve(curveMonotoneX);
  return generator(points) ?? "";
}
```

The `d3-shape` `line()` generator produces a complete SVG `d` string directly. It replaces the existing manual loop in `toSmoothPath` entirely. The `fillPath` function calls `toSmoothPath` as its base — it adds the groundY-closing segments on top, so those closing segments remain unchanged.

**Important:** `curveMonotoneX` assumes x-monotonic data (x values never decrease). The timeline's data points are always left-to-right (monthly nodes in chronological order), so this assumption holds. Confidence: HIGH.

**d3-path dependency:** `d3-shape` internally uses `d3-path` to build the SVG path string. Both must be installed. `d3-path` is a transitive dependency — it installs automatically with `npm install d3-shape`.

**Bundle size impact:** `d3-shape@3.2.0` is approximately 10 KB minified+gzipped. `d3-path` is approximately 2.5 KB. Total addition: ~12.5 KB — negligible for a client-side visualization component.

**Confidence:** HIGH (d3-shape curveMonotoneX algorithm and behavior confirmed in D3 official documentation; bundle size from GitHub repo size data)

---

### CANVAS-03 — Edge Overflow / Padding

**Technique 1: SVG viewBox with negative x-origin (horizontal padding)**

In `TimelineCanvas.tsx`, the inner `<svg>` currently has `width={canvasWidth}`. The first node appears at `x = MONTH_WIDTH / 2 = 20`, which is tight. Node circles with radius 9-10 have their left edge at `x = 10` — marginally within bounds.

**Fix:** Add a horizontal padding constant and use a negative-origin viewBox:

```typescript
const CANVAS_PADDING_X = 40;
// SVG element:
<svg
  viewBox={`-${CANVAS_PADDING_X} 0 ${canvasWidth + CANVAS_PADDING_X * 2} ${CANVAS_HEIGHT}`}
  width={canvasWidth + CANVAS_PADDING_X * 2}
  height={CANVAS_HEIGHT}
>
```

The scroll container must also account for the wider width:
```typescript
<div style={{ width: canvasWidth + CANVAS_PADDING_X * 2, height: CANVAS_HEIGHT }}>
```

This approach uses zero coordinate changes — all `node.x`, `todayX`, `monthLabels.x`, and `deadlineFlags.x` calculations remain untouched. The viewBox negative origin translates the visible area.

**Why viewBox over coordinate shifting:** There are 5 separate x-coordinate calculation sites in `TimelineCanvas.tsx` (node positions, today marker, deadline flags, month labels, cross markers). Shifting all of them risks arithmetic errors. viewBox achieves the same result with a single attribute change plus the width correction.

**Technique 2: Increase PADDING_Y for vertical overflow (NODE tick label clip)**

Node tick labels render at `y = node.y - tickHeight - 4`. For the highest-score nodes (`score = +4`), `node.y = scoreToY(4) = PADDING_Y`. A `signalTickH` of 36 renders the label at `y = PADDING_Y - 40`. With `PADDING_Y = 30`, this is `y = -10` — outside the SVG viewport.

**Fix:** Increase `PADDING_Y` from 30 to 60 and `CANVAS_HEIGHT` from 620 to 650.

Derived values recalculate correctly:
- `STAGE_HEIGHT = (650 - 60 - 40) / 8 = 68.75` (unchanged — same as before because the ratio is preserved)
- `GROUND_Y = 60 + 4 * 68.75 = 335` (was 305 — moves down 30px)

The 30px increase in `CANVAS_HEIGHT` and `PADDING_Y` moves the entire content zone downward by 30px. With the new 3-level tick stagger (max height 52px, label offset 4px = 56px total), the minimum clearance for a +4 node becomes `60 - 56 = 4px` — just enough. If the 3-level stagger proves insufficient, bump `PADDING_Y` to 72.

**Confidence:** HIGH — arithmetic confirmed against existing constants in `TimelineCanvas.tsx` lines 47-52.

---

### TOOLTIP-01 — Tooltip Positioning / Left-Edge Clip

**Technique: Left-edge guard in existing useLayoutEffect**

The existing `TimelineTooltip.tsx` architecture is already correct: `createPortal` into `document.body`, `position: fixed`, viewport coordinates from `getBoundingClientRect()`. This is the production-standard pattern for SVG canvas tooltips.

The only missing piece is a left-edge clamp. The current positioning logic handles:
- Right overflow: flips tooltip to left of node
- Bottom overflow: moves tooltip up

It does not handle:
- Left overflow: flip to right of node (when the flip itself underflows)

**Fix:** Add after the existing flip check in `useLayoutEffect`:

```typescript
// After right-edge flip (existing lines 45-47):
if (left + TOOLTIP_WIDTH > window.innerWidth - EDGE_MARGIN) {
  left = viewportX - TOOLTIP_WIDTH - 16;
}
// Add: left-edge clamp
if (left < EDGE_MARGIN) {
  left = EDGE_MARGIN;
}
```

**Why not Floating UI:** Floating UI (`@floating-ui/react`) provides automatic flip, shift, and collision detection. It would cleanly solve this. However, it adds ~20 KB and introduces a new dependency for a 3-line fix. The existing portal pattern already has the correct architecture. Adding Floating UI is a valid v4.3 upgrade if tooltip complexity grows (e.g., sub-menus, compound popovers), but is not warranted for a missing edge guard.

**Confidence:** HIGH — fix is arithmetic; Floating UI assessment is MEDIUM (based on official docs + WebSearch)

---

### NODE-01 / NODE-03 — Node Icon Quality and Content Node Sizing

**Technique 1: Larger SVG geometry (no library)**

The current node radii:
- `origin`: outer r=9, inner r=5
- `signal/latest`: outer r=6, inner r=3
- `terminal-proved/buried`: outer r=10, inner r=6
- `stale`: r=4.5

These are small at normal zoom. Increasing by 30-50% improves visual clarity without any library.

Recommended increases (for legibility at normal zoom):
- `origin`: outer r=12, inner r=7
- `signal`: outer r=8, inner r=4
- `latest`: outer r=10, inner r=5
- `terminal`: outer r=14, inner r=8
- `stale`: r=6

**Technique 2: Replace emoji in SVG `<text>` with SVG `<use>` + `<symbol>` (icon quality)**

Current pattern in `TimelineNode.tsx` for terminal nodes:
```tsx
<text x={x} y={tickTopY - 4} fontSize={12} textAnchor="middle">
  {emoji}  {/* "🏆" or "⚰️" */}
</text>
```

Emoji rendered as SVG text elements are rasterized by the browser at the requested `fontSize`. At `fontSize={12}`, they render at 12px — small and potentially fuzzy depending on platform font rendering (especially on Windows with ClearType).

**Better approach:** Use SVG path icons instead of emoji characters. Define `<symbol>` elements in `<defs>` for each icon type (trophy, coffin/cross, warning). Reference them with `<use href="#icon-id">`. SVG paths scale cleanly at any size.

This is the approach used by all major charting libraries (Recharts, Victory, Nivo) for node icons.

**For v4.2 scope:** A minimal approach is to increase `fontSize` from 12 to 18-20px on the emoji text nodes. This retains the emoji characters but renders them at a size where platform rendering quality is acceptable. Full SVG symbol icons are a v4.3 improvement.

**Technique 3: Dynamic node width for content-bearing nodes (NODE-03)**

Nodes that carry labels (signal, latest, terminal, origin) currently use a fixed-radius circle. For legibility, the label text width should inform the node's visual indicator size.

The SVG `getBBox()` method can measure text width client-side, but it requires a rendered DOM node. A simpler approach: use SVG `<rect>` as a background behind the text label, sized to the approximate character width.

Approximate formula for IBM Plex Mono at 9px:
```
characterWidth ≈ 5.5px per character
rectWidth = labelText.length * 5.5 + 8  (4px horizontal padding each side)
```

This avoids DOM measurement and provides consistent sizing. Accuracy is sufficient for label backgrounds — exact pixel-perfect measurement is not needed.

**Confidence:** HIGH for radii increase and fontSize increase. MEDIUM for dynamic rect width (character-width approximation is empirical, not computed from font metrics).

---

### NODE-02 — Node Declutter / Smart Stacking

**Technique: 3-Level Tick Stagger (No Library)**

**Why no d3-force for this:** D3 force simulation (`d3-force`) applies iterative physics to resolve overlaps. It is the correct tool for arbitrary 2D node collision. However, the timeline has a specific constraint: all nodes for a given objective are on a single spline in chronological left-to-right order. The only overlap problem is between different objectives' nodes at the same x-position (same month) or adjacent months.

The current binary alternation (`stackIndex % 2`) works for 2 objectives but fails for 3 (objective 0 and 2 get the same tick height). The fix is a 3-level system since the max selected objectives is 3 (enforced by `selectedIds.size >= 3` in `TimelineCanvas.tsx` line 327).

**Implementation in `TimelineNode.tsx`:**

Replace:
```typescript
const originTickH = stackIndex % 2 === 0 ? 24 : 40;
const signalTickH = stackIndex % 2 === 0 ? 20 : 36;
```

With:
```typescript
const TICK_HEIGHTS = [
  { origin: 24, signal: 20 },
  { origin: 40, signal: 36 },
  { origin: 56, signal: 52 },
];
const tickLevel = TICK_HEIGHTS[stackIndex % 3];
const originTickH = tickLevel.origin;
const signalTickH = tickLevel.signal;
```

The 3 levels (20, 36, 52px signal tick) guarantee vertical separation between all 3 objectives' labels at any x position. With the increased `PADDING_Y` = 60, the maximum tick height of 52px + 4px label offset = 56px fits within the top padding for nodes at +4 score (60px clearance - 56px = 4px margin — just enough).

**Why not x-offset labels:** Horizontal label offset requires computing whether two labels' x-ranges overlap — an O(n²) pass over all rendered nodes. For 3 objectives × ~30 nodes each = 90 nodes, O(n²) = 8,100 comparisons per render. This is fine performance-wise but adds significant implementation complexity for marginal gain over the 3-level stagger. Flag for v4.3.

**Confidence:** HIGH — math confirmed against existing `selectedIds` limit in `TimelineCanvas.tsx` and current tick height values in `TimelineNode.tsx`.

---

### ZONE-01 — Graveyard Zone Visual Weight

**Technique: SVG Pattern Fill + Increased Opacity**

The current below-ground zone in `TimelineCanvas.tsx`:
```tsx
<rect x={0} y={GROUND_Y} width={canvasWidth} height={...} fill="var(--timeline-zone-below)" />
```

This is a solid fill with a CSS variable. "Stronger editorial visual weight" can be achieved by two independent improvements:

**Option A: Increase fill opacity.** Change the CSS variable `--timeline-zone-below` to a higher opacity. This is the simplest change and requires only a CSS variable update — no SVG code change.

**Option B: Add a diagonal stripe pattern fill.** Define a `<pattern>` element in `<defs>`:

```tsx
<defs>
  <pattern id="graveyard-hatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(-45 0 0)">
    <line x1="0" y1="0" x2="0" y2="8" stroke="var(--destructive)" strokeWidth="1" strokeOpacity="0.12" />
  </pattern>
</defs>
```

Apply as a second layer behind the solid fill:
```tsx
<rect fill="var(--timeline-zone-below)" ... />
<rect fill="url(#graveyard-hatch)" ... />
```

The stripe pattern adds texture without replacing the solid color — it sits on top at low opacity. This creates an editorial "danger zone" aesthetic that communicates "below ground = bad territory" beyond what a flat tint conveys.

**Option C: LinearGradient from ground line downward.** Add a `<linearGradient>` that goes from `var(--destructive)` at opacity 0.05 at the top to opacity 0.18 at the bottom. The gradient creates a sense of depth/weight increasing as objectives sink deeper.

**Verdict: Use Option A + Option B together.** Increase the base fill opacity AND add the stripe overlay. This is the editorial-weight signal without requiring new component logic. All in `TimelineCanvas.tsx` `<defs>` block.

**Confidence:** HIGH — SVG `<pattern>` and `<linearGradient>` are baseline SVG 1.1 features with universal browser support in the target baseline (Chrome 111+, confirmed in Next.js 16 browser requirements).

---

## Library Addition Summary

| Library | Version | Why | Where Used | Install |
|---------|---------|-----|------------|---------|
| `d3-shape` | `^3.2.0` | MonotoneX spline — eliminates overshoot in CANVAS-02 | `TimelinePath.tsx` — `toSmoothPath()` only | `npm install d3-shape` |
| `d3-path` | `^3.1.0` | Peer dependency of d3-shape (auto-installs) | Transitive | Auto |

**No other new dependencies required.**

---

## What NOT to Add

| Library | Reason to Skip |
|---------|---------------|
| `@floating-ui/react` | TOOLTIP-01 fix is a 3-line code change. Floating UI adds ~20 KB for a missing left-edge guard. Re-evaluate if tooltip complexity grows in v4.3. |
| `d3-force` | NODE-02 overlap is fully solved by 3-level stagger given max 3 objectives. d3-force is correct for general node graphs; not warranted here. |
| `react-svg-patterns` | SVG `<pattern>` is built into the SVG spec. A wrapper library adds no value for one diagonal stripe. |
| Full `d3` bundle | Only `d3-shape` path generation is needed. Importing `d3` adds ~500 KB of unused code including DOM manipulation, scales, and force simulation. |
| `react-tooltip` | Existing portal tooltip is architecturally correct. A tooltip library would replace working code, not fix a bug. |

---

## Alternatives Considered

| Issue | Recommended | Alternative | Why Not |
|-------|-------------|-------------|---------|
| CANVAS-02 path smoothness | `d3-shape` curveMonotoneX | Manual Catmull-Rom implementation | Reimplementation of existing library; maintenance burden |
| CANVAS-02 path smoothness | `d3-shape` curveMonotoneX | `curveCatmullRom` (alpha=0.5) | Does not guarantee no-overshoot; monotoneX is stricter |
| CANVAS-01 clip fix | `y={groundY + 1}` offset | Polygon split at bezier/line intersection | Requires numerical root-finding; same visual result; overkill for v4.2 |
| CANVAS-03 horizontal padding | SVG viewBox negative origin | Shift all x-coordinate calculations | 5 calculation sites must all change; higher error risk |
| NODE-01 icons | Larger fontSize + radius | SVG symbols with path icons | Correct approach but high implementation cost; v4.3 |
| NODE-02 overlap | 3-level tick stagger | x-offset collision detection | O(n²) geometry, significant complexity; v4.3 |
| TOOLTIP-01 positioning | Left-edge guard (3 lines) | Floating UI library | 20 KB dependency for a 3-line fix |
| ZONE-01 visual weight | Pattern fill + opacity increase | CSS backdrop-filter blur | Blur on SVG rects has inconsistent cross-browser support |

---

## Installation

```bash
# From the frontend/ directory
npm install d3-shape d3-path
```

No `next.config.ts` changes needed. The frontend is `"type": "module"` and Next.js 16 uses Turbopack with ESM-first resolution. d3-shape and d3-path are both ESM-only (`"type": "module"`) — this is a compatible match.

**Caveat:** If Turbopack reports a module resolution error for d3-shape (unlikely given Next.js 16 ESM stability), add to `next.config.ts`:
```typescript
const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["d3-shape", "d3-path"],
};
```
This is the documented fallback for ESM packages in Next.js. It is not expected to be needed given the project's own ESM configuration.

---

## Sources

- D3 shape curve types: [https://d3js.org/d3-shape/curve](https://d3js.org/d3-shape/curve) — HIGH confidence
- d3-shape GitHub (version, deps): [https://github.com/d3/d3-shape](https://github.com/d3/d3-shape) — HIGH confidence
- curveMonotoneX implementation: [https://github.com/d3/d3-shape/blob/main/src/curve/monotone.js](https://github.com/d3/d3-shape/blob/main/src/curve/monotone.js) — HIGH confidence
- SVG clipPath spec (boundary-inclusive): [https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/clipPath](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/clipPath) — HIGH confidence
- SVG pattern element: [https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/pattern](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/pattern) — HIGH confidence
- React Portal for SVG tooltips: [https://dev.to/hexshift/rendering-tooltips-with-react-portals-without-breaking-layout-2970](https://dev.to/hexshift/rendering-tooltips-with-react-portals-without-breaking-layout-2970) — MEDIUM confidence
- Next.js 16 release notes (Turbopack stable, ESM): [https://nextjs.org/blog/next-16](https://nextjs.org/blog/next-16) — HIGH confidence
- transpilePackages documentation: [https://nextjs.org/docs/app/api-reference/config/next-config-js/transpilePackages](https://nextjs.org/docs/app/api-reference/config/next-config-js/transpilePackages) — HIGH confidence
- Source files read: `TimelinePath.tsx`, `TimelineNode.tsx`, `TimelineCanvas.tsx`, `TimelineTooltip.tsx`, `package.json`, `next.config.ts`
