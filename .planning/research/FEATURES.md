# Feature Landscape — Drift v4.2 Timeline UI Overhaul

**Domain:** Interactive SVG timeline — strategic accountability / data journalism
**Researched:** 2026-03-29
**Scope:** UX patterns for node density management, SVG tooltip positioning, danger zone visual marking, and icon/marker quality
**Downstream consumer:** Requirements writer

---

## Context: What Already Exists

The timeline already has: cubic bezier splines, dual-color area fill (emerald above, red below ground line), 6 node types mapped to momentum classifications, pan/zoom, signal tooltips, legend with objective isolation. The problems being addressed are clutter at high node density, tooltip clipping, insufficient visual weight in the graveyard zone, and low-quality emoji markers.

---

## Table Stakes

Features users expect from an editorial data visualization. Missing = platform feels unfinished or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Tooltips that never clip at canvas edges | Standard in every charting library (Highcharts, Recharts, Vega-Lite) | Low–Med | Must handle left/right/top/bottom edges and transform context |
| Nodes that don't visually pile up | Overlapping nodes = unreadable; expected from Bloomberg, FT-quality charts | Med | Vertical jitter or stacking — see NODE-02 in active requirements |
| Clear visual distinction between above-ground and below-ground territory | Ground-line metaphor is the core editorial concept of Drift; weak treatment undermines credibility | Med | SVG pattern fill + increased contrast |
| Legible node markers at default zoom | Minimum 24px effective touch target; emoji at 1.1rem (≈17px) is sub-standard | Low | Enlarge circles, enforce minimum rendered size |
| No canvas edge clipping | Content cut off at left/right/top/bottom = broken | Low | Padding applied to SVG viewBox or coordinate transform |
| Consistent marker shapes across zoom levels | SVG scales without blur; DOM emoji degrade at fractional scales | Med | Use SVG symbols instead of raw emoji where possible |

---

## Differentiators

Features that distinguish Drift's timeline from generic data viz. Not universally expected, but materially raise quality and match the editorial brand.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Textures.js diagonal hatching in graveyard zone | Immediately signals "danger territory" without relying solely on color — reads in dark mode and print | Low | textures.js is MIT-licensed, 2KB gzipped, zero dependencies |
| Zoom-adaptive node visibility (LOD) | At full zoom: all nodes; at wide view: only major classification nodes visible | Med | D3-zoom `k` value drives a cutoff threshold — hides "absent"/"softened" intermediate nodes |
| Floating UI virtual element tooltips | Portal-rendered HTML tooltip anchored to SVG coordinate — zero clipping, correct in all overflow contexts | Med | `@floating-ui/react` virtual element pattern; 30k+ stars, adopted by major design systems |
| Collision-resolution vertical stacking for dense nodes | Nodes on the same or adjacent x-positions stack vertically (±offset) instead of overlapping | Med | Bounding-box collision check on render; no force simulation needed for linear timelines |
| Ground-crossing pulse ring | Animated ring on the exact coordinate where the trajectory crosses y=0 | Low | CSS keyframe `scale` + opacity pulse; already specced in design doc as "pulsing red dot" |
| Stage-color border ring on node | Node circle border colored to the stage (emerald → red → stone) — conveys momentum at a glance without reading label | Low | Already partially in design spec; needs to be enforced at all sizes |
| IBM Plex Mono tooltip metadata | Classifications, dates, confidence scores in monospace — matches Drift typography system, looks editorial not generic | Low | Already in brand spec; just needs to be applied consistently in tooltip layout |

---

## Anti-Features

Patterns that look useful but cause problems in this specific context.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Force simulation for node separation | D3 `forceCollide` causes jitter and animation on every render; overkill for a linear timeline where x-positions are fixed | Deterministic bounding-box collision check — run once on data change, not continuously |
| SVG `<foreignObject>` for tooltip HTML | Cross-browser inconsistent, breaks in Safari, overflow still clips to SVG bounds | Portal a `<div>` outside the SVG; use Floating UI virtual element anchored to canvas coordinates |
| Rendering raw emoji as node markers at small sizes | Emoji render at system font metrics; fractional pixel sizes cause blur, platform inconsistency (Apple vs Windows emoji differ visually) | SVG circle + SVG path icon, or emoji rendered inside fixed-size containers with `font-size` clamped to a whole-number px value |
| Full opacity graveyard fill (solid dark red block) | Occludes path lines and nodes underneath; editorially heavy-handed | Semi-transparent diagonal hatch (textures.js `lines().orientation("diagonal")`) over a low-opacity red base |
| Tooltip on hover only (no keyboard/click fallback) | Hover-only tooltips are inaccessible and fail on trackpad | Click-to-pin tooltip + hover-to-preview; keyboard: focus node → Space/Enter to open |
| Infinite zoom range | Below ~0.5x scale, nodes collapse to unreadable dots; above ~4x, the canvas is mostly empty space | `d3-zoom` `scaleExtent([0.6, 4])` — already specced in design doc |
| "Show all labels" at all times | With 6 objectives × ~15 signals each = 90 labels — instantly unreadable | Labels only on hover/focus, or only on terminal nodes (first, last, crossing events) |

---

## Feature Dependencies

```
Floating UI virtual element tooltip
  ← requires: node click/hover event emits SVG coordinate (clientX, clientY)
  ← requires: tooltip rendered as portal div outside SVG element

Zoom-adaptive LOD visibility
  ← requires: d3-zoom transform observable (k value)
  ← requires: nodes classified into "always show" vs "hide at low zoom" tiers

Vertical stacking / collision resolution
  ← requires: all nodes for an objective computed before rendering
  ← requires: stacking applied per x-bucket (quarter bucket width)

Graveyard hatching (textures.js)
  ← requires: textures.js installed (npm install textures)
  ← requires: SVG <defs> pattern registered before rendering ground zone

Crossing pulse ring
  ← requires: crossing coordinates already computed (design spec has this)
  ← requires: CSS animation isolated so it doesn't re-trigger on pan/zoom
```

---

## MVP Recommendation

Prioritize these for v4.2 (the active milestone):

1. **Floating UI virtual element tooltip** — resolves TOOLTIP-01; highest user-visible bug with lowest implementation complexity given the library exists
2. **Node minimum size enforcement + stage-color border** — resolves NODE-01; low-effort, high-quality-signal improvement
3. **Bounding-box collision vertical stacking** — resolves NODE-02; deterministic, no dependencies
4. **Graveyard diagonal hatch (textures.js)** — resolves ZONE-01; textures.js is a one-line install and provides the exact SVG `<defs>` pattern needed
5. **Canvas edge padding** — resolves CANVAS-03; CSS/viewBox padding, trivial

Defer to v4.3:

- **Zoom-adaptive LOD visibility** — valuable but adds state management complexity; only matters when more companies/objectives are added and density increases beyond current Sandoz-only data set
- **Keyboard accessibility for tooltips** — important but not blocking the editorial launch; deferred pending mobile/accessibility pass

---

## Research Notes by Area

### 1. Node Density and Overlap (NODE-02)

**Recommended pattern: Deterministic bounding-box collision with vertical offset stacking.**

The standard D3 approach (`forceCollide`) is designed for freely floating nodes in a force graph, not for timeline nodes whose x-position is fixed by date. It introduces continuous animation and jitter that is inappropriate for editorial data.

The correct pattern for fixed-axis timelines:

1. Compute each node's x position from the time scale.
2. Group nodes into x-buckets (e.g., per quarter width in pixels).
3. Within each bucket, sort by y position.
4. Apply incremental y-offsets (e.g., ±18px, ±36px) to eliminate overlaps.
5. Run this once on data change, not in a render loop.

Stuart Thompson's Observable notebook (`@stuartathompson/preventing-label-overlaps-in-d3`) documents the bounding-box collision detection approach: compare each label's `getBoundingClientRect()` against others; hide lower-priority ones or offset them. The `dedupe-always-show` class pattern is directly applicable — always show crossing events and terminal nodes; offset or hide intermediate duplicates.

**Zoom-adaptive LOD (defer):** D3-zoom exposes `transform.k` (the current scale). Using this value to conditionally hide node labels (show only at k > 1.5) and collapse intermediate nodes (show only "stated", "achieved", "absent" at k < 1) is a medium-complexity feature that pays off at higher data density. Not needed for current Sandoz-only data (6 objectives, ~15 signals each).

**Confidence: HIGH** — D3 official docs + Observable examples confirm the technique.

---

### 2. Tooltip Positioning on SVG Canvas (TOOLTIP-01)

**Recommended pattern: Floating UI virtual element, portal-rendered HTML div.**

The root cause of SVG tooltip clipping is that tooltip `<g>` elements inside the SVG are bounded by the SVG's `overflow` property. Solutions within the SVG (shifting coordinates, checking edge proximity) work but require manual math that breaks when the canvas is panned or zoomed.

The industry-standard solution (Highcharts, Vega, Recharts all use variants of this) is to render the tooltip as a DOM element outside the SVG and position it using viewport coordinates.

Floating UI (30k+ GitHub stars, used by Radix UI, shadcn/ui, Mantine) provides the exact primitive needed:

```typescript
// On node hover, create a virtual reference from SVG coordinates
const virtualEl = {
  getBoundingClientRect() {
    return {
      width: 0, height: 0,
      x: clientX, y: clientY,
      top: clientY, left: clientX,
      right: clientX, bottom: clientY,
    };
  },
};
```

The `flip()` and `shift()` middleware handle all four edges automatically. This pattern works correctly through pan/zoom transforms because it uses `clientX`/`clientY` (viewport coordinates) not SVG-local coordinates.

**Implementation note:** The tooltip div must be a portal child of `document.body` (or the Next.js root), not inside the SVG element or its React subtree.

**Package:** `@floating-ui/react` — install alongside existing stack. Zero conflict with Framer Motion.

**Confidence: HIGH** — Floating UI official docs confirm virtual element support. Pattern verified against browser compatibility notes (works in all modern browsers).

---

### 3. Graveyard Zone Visual Weight (ZONE-01)

**Recommended pattern: SVG diagonal-line hatch (textures.js) + increased red tint base.**

Current approach (solid red area fill at reduced opacity) creates a gradient-like wash that lacks editorial authority. The ground-crossing is Drift's core investigative signal — it needs to feel like crossing a real threshold.

Data journalism reference (FT Visual Vocabulary, Bloomberg risk visualizations): danger zones in financial and accountability charts use **textured fills** — diagonal hatching, crosshatch, or stipple — to communicate "this territory is qualitatively different," not just quantitatively lower.

**Textures.js** (`riccardoscalco.it/textures`) provides SVG `<pattern>` fills via a fluent API:

```javascript
const graveyard = textures
  .lines()
  .orientation("diagonal")
  .size(8)          // pattern cell size in px
  .strokeWidth(1.5) // line weight
  .stroke("#b91c1c") // Drift "Sink" red
  .background("rgba(185, 28, 28, 0.08)"); // very low opacity red base
```

This produces a `<defs>` SVG pattern that can be applied as a `fill` to the existing below-ground clip path region. The diagonal lines give "graveyard texture" weight without occluding the trajectory paths above it.

**Alternative (no dependency):** A hand-coded SVG `<pattern>` with two diagonal `<line>` elements achieves the same result without adding a library. At ~8 lines of SVG, this may be preferable to a dependency if the team wants to avoid textures.js.

**Confidence: HIGH** — textures.js is actively maintained, MIT licensed, documented at official site. SVG pattern fills are a browser-native feature with full cross-browser support.

---

### 4. Icon/Marker Quality (NODE-01)

**Recommended pattern: Fixed-size SVG circle container + emoji rendered at a clamped whole-number font-size, minimum 20px effective render size.**

The current implementation uses DOM div nodes with emoji at ~1.1rem (≈17–18px). Problems:

- At fractional zoom levels, emoji render at non-integer pixel sizes → blur on non-retina displays
- Emoji glyphs differ visually between Apple, Windows, and Android (the "🐌" crawl emoji looks very different platform-to-platform)
- At 17px, emoji are below the 20px minimum legibility threshold for dense visualization contexts

**Industry standard** (confirmed by SVGenius technical guide, iconvectors.io pixel-perfect guide): Design SVG icon containers on a 24×24 grid. Render at 24px, 32px, or 40px. Fit strokes to pixel bounds.

**Recommended sizing for Drift nodes:**
- Default state: 32px circle diameter (16px radius), emoji at 18px inside
- Hover/active state: 40px circle (scales from 32 via CSS transform: scale(1.25))
- Terminal nodes (first, last, crossing): 36px default, 44px hover
- All sizes should be explicit integers, not `1.1rem` or `1.3em`

**Node visual hierarchy (3 tiers):**
1. **Always show, full size:** Ground-crossing nodes, terminal (first/last) nodes, Buried nodes
2. **Show at default zoom:** All classification nodes
3. **Show only on hover/focus:** Duplicate-quarter intermediate nodes (when two signals land in same quarter)

**Color-ring convention:** The node circle `stroke` should match the stage color from `momentum.ts` (Orbit=#059669 through Buried=#78716c). This is already in the design spec; it needs to be enforced at all sizes and not override when dimmed.

**On emoji platform inconsistency:** If platform consistency matters editorially, the option is to replace emoji with SVG path icons (one path per stage). This is a larger effort (design 9 icons) but produces pixel-identical rendering cross-platform. Defer unless brand review flags the inconsistency as a problem.

**Confidence: MEDIUM** — sizing recommendations from SVGenius guide and pixel-perfect SVG tutorials; platform emoji inconsistency is well-documented but impact depends on audience OS mix.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Floating UI integration | The tooltip is currently inside the SVG; migrating to a portal div means rethinking React component ownership — who manages `isOpen`, `position`, `content` | Lift tooltip state to `TimelineCanvas` parent; pass down via context or props |
| Collision stacking with pan/zoom | If node y-offsets are computed in SVG-local coordinates, panning will desync them from grid lines | Compute offsets in data-space (momentum score units), not pixel-space |
| textures.js with Next.js | textures.js uses D3 internally; confirm it doesn't conflict with existing D3 version or Next.js SSR | Import textures.js inside `useEffect` or mark as `'use client'`; the SVG patterns are client-only |
| Emoji size at zoom | CSS `transform: scale()` on DOM nodes doesn't change the font-size of emoji inside them — they can appear over-large when zoomed in | Use `font-size: calc(18px / var(--zoom-k))` or compute size reactively from zoom transform |
| Tooltip during pan | If tooltip is pinned open during a pan gesture, the virtual element's `getBoundingClientRect` returns stale coordinates | On pan start, close any pinned tooltip; re-open on pointer-up |

---

## Sources

- D3 Collide Force: [https://d3js.org/d3-force/collide](https://d3js.org/d3-force/collide)
- D3 Label Overlap Prevention (Stuart Thompson): [https://observablehq.com/@stuartathompson/preventing-label-overlaps-in-d3](https://observablehq.com/@stuartathompson/preventing-label-overlaps-in-d3)
- d3fc-label-layout (greedy + simulated annealing label placement): [https://github.com/ColinEberhardt/d3fc-label-layout](https://github.com/ColinEberhardt/d3fc-label-layout)
- Floating UI virtual elements: [https://floating-ui.com/docs/virtual-elements](https://floating-ui.com/docs/virtual-elements) — HIGH confidence (official docs)
- Floating UI tooltip pattern: [https://floating-ui.com/docs/tooltip](https://floating-ui.com/docs/tooltip) — HIGH confidence
- Textures.js SVG pattern fills: [https://riccardoscalco.it/textures/](https://riccardoscalco.it/textures/) — HIGH confidence (official site, MIT licensed)
- FT Visual Vocabulary (chart type guidance): [https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary](https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary) — MEDIUM confidence (design guidance, not implementation)
- Pixel-perfect SVG icon sizing: [https://iconvectors.io/tutorials/make-pixel-perfect-svg-icons.html](https://iconvectors.io/tutorials/make-pixel-perfect-svg-icons.html) — MEDIUM confidence
- SVG timeline node design: [https://svgenius.design/blog/creating-animated-svg-timelines-and-process-flows-a-practical-guide-for-frontend-developers-and-designers](https://svgenius.design/blog/creating-animated-svg-timelines-and-process-flows-a-practical-guide-for-frontend-developers-and-designers) — MEDIUM confidence
- Tooltip positioning strategies (atomiks/Floating UI): [https://dev.to/atomiks/everything-i-know-about-positioning-poppers-tooltips-popovers-dropdowns-in-uis-3nkl](https://dev.to/atomiks/everything-i-know-about-positioning-poppers-tooltips-popovers-dropdowns-in-uis-3nkl) — HIGH confidence (written by Floating UI author)
- D3 zoom and pan: [https://d3js.org/d3-zoom](https://d3js.org/d3-zoom) — HIGH confidence
- Multilevel temporal event sequence overview (academic): [https://arxiv.org/pdf/2108.03043](https://arxiv.org/pdf/2108.03043) — LOW confidence (academic, not directly applicable to Drift's linear timeline)
