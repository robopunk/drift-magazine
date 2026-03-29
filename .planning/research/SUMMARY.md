# Project Research Summary

**Project:** Drift v4.2 — Timeline UI Overhaul
**Domain:** Interactive SVG timeline canvas — editorial data visualization
**Researched:** 2026-03-29
**Confidence:** HIGH

---

## Executive Summary

The Drift v4.2 milestone addresses seven discrete bugs and UX deficiencies in a custom React/SVG timeline canvas (Next.js 16, React 19, TypeScript 5, Tailwind 4, Framer Motion 12). Every root cause has been identified by direct code inspection — this is a targeted repair and polish pass, not a rewrite. The existing architecture is sound: the component decomposition, the portal-based tooltip, and the clipPath split-fill approach are all industry-standard patterns. The bugs are precise, well-bounded implementation gaps, not structural problems.

The recommended approach is surgical: one small library addition (`d3-shape` for monotone spline interpolation), plus pure-SVG and pure-JavaScript fixes for the remaining six issues. No new components are required. The highest-risk work is the clipPath boundary fix (CANVAS-01) and the graveyard zone visual system (ZONE-01), both of which touch the most prominent visual element on the canvas. The safest build order is: canvas geometry constants first, then path/fill fixes, then node layer, then tooltip — each phase is testable in isolation.

The primary risk across all phases is cascading geometry: several constants (`PADDING_Y`, `CANVAS_HEIGHT`, `GROUND_Y`, `STAGE_HEIGHT`) derive from each other, and node sizes, tick heights, and label positions are all calibrated against those constants. Changing one without tracking its downstream effects is the single most likely source of regression. The mitigation is strict phase ordering — canvas layout constants must land first and be verified before any node or path work proceeds.

---

## Key Findings

### Stack Additions

The existing stack requires one addition and zero removals.

**Add:**
- `d3-shape@^3.2.0` + `d3-path@^3.1.0` (auto peer dep) — monotone cubic spline interpolation for CANVAS-02. The `curveMonotoneX` algorithm guarantees no overshoot between data points, which the current manual 0.4/0.6 bezier control-point approach cannot guarantee. Used exclusively inside `toSmoothPath()` in `TimelinePath.tsx`. Bundle impact: ~12.5 KB gzipped. ESM-compatible with Next.js 16 + Turbopack — no `transpilePackages` config needed.

**Do not add:**
- `@floating-ui/react` — TOOLTIP-01 is a missing 3-line left-edge guard, not a structural tooltip problem. Floating UI adds 20 KB for a fix that is 3 lines of arithmetic. Re-evaluate at v4.3 if tooltip complexity grows.
- `d3-force` — NODE-02 overlap is fully resolved by a 3-level tick stagger. Force simulation is for free-floating nodes; the timeline's x-positions are fixed by date.
- `textures.js` — ZONE-01 can be solved with a hand-coded 8-line SVG `<pattern>` in `<defs>`. A library adds no value for one diagonal stripe.
- Full `d3` bundle — only the path generator is needed. Full D3 adds ~500 KB of unused code.

See `STACK.md` for full rationale and alternatives considered.

---

### Feature Table Stakes vs Differentiators

**Must have for v4.2 (table stakes — absence signals broken product):**
- Tooltips that never clip at any canvas edge — standard in all charting libraries; missing = broken
- Nodes that do not visually pile up at the same x-position — unreadable at 3 objectives
- Clear visual distinction between above-ground and below-ground zones — ground line is the core editorial concept; weak treatment undermines credibility
- Legible node markers at default zoom — emoji at 12px is below minimum legibility threshold
- No canvas edge clipping of labels or node circles — content cut off = broken

**Should have for v4.2 (differentiators that raise editorial quality):**
- Diagonal hatch texture in the graveyard zone — communicates "danger territory" beyond a flat tint; reads in dark mode and print
- Stage-color border ring on all node types at all sizes — conveys momentum classification at a glance
- IBM Plex Mono tooltip metadata layout — matches Drift typography; editorial, not generic

**Defer to v4.3:**
- Zoom-adaptive LOD visibility (hide intermediate nodes at low zoom) — only matters when data density increases beyond current Sandoz-only dataset
- Full SVG symbol icon replacement for emoji — correct long-term fix but requires designing 9 icons; out of scope for a polish pass
- Keyboard/click accessibility for tooltips — important but not blocking editorial launch
- x-offset label collision detection — O(n²) geometry pass; 3-level stagger is sufficient for the 3-objective maximum

See `FEATURES.md` for dependency graph and phase-specific warnings.

---

### Architecture Approach

The component map is stable and requires no structural changes. All 7 fixes are targeted modifications to 4 existing files: `TimelineCanvas.tsx` (layout constants, viewBox), `TimelinePath.tsx` (clipPath boundary), `TimelineNode.tsx` (tick stagger, icon sizes), and `TimelineTooltip.tsx` (left-edge guard). Two components (`CrossingMarker.tsx`, `DeadlineFlag.tsx`) are untouched.

**The key architectural constraints to preserve:**
1. `TimelineCanvas.tsx` is the single source of truth for all layout constants. Derived values (`GROUND_Y`, `STAGE_HEIGHT`) must always compute from `PADDING_Y` and `CANVAS_HEIGHT` — never hardcode derived values.
2. The SVG/viewport coordinate boundary lives in `TimelineCanvas.onHover`. `TimelineTooltip` must remain a pure viewport-space consumer. SVG coordinates must never enter the tooltip component.
3. The portal tooltip (`createPortal` into `document.body`, `position: fixed`) is architecturally correct — it escapes all SVG and scroll container overflow contexts. The fix is arithmetic (a missing edge guard), not a structural change.
4. All clipPath IDs must remain unique per SVG document. The `above-${id}` / `below-${id}` pattern is correct but must be protected against duplicate IDs in test fixtures and Storybook.

See `ARCHITECTURE.md` for component boundary table, data flow diagrams, and anti-patterns to avoid.

---

### Critical Pitfalls

**Top 5 — with prevention strategies:**

1. **Cascading geometry break when changing layout constants** — `PADDING_Y`, `CANVAS_HEIGHT`, `GROUND_Y`, and `STAGE_HEIGHT` all derive from each other. Node sizes, tick heights, and label y-positions are calibrated against these constants. Change `PADDING_Y` and verify all downstream values cascade correctly before proceeding to path or node work. Prevention: change layout constants in a dedicated commit, run visual regression, then proceed.

2. **clipPath boundary includes the exact ground line** — SVG clip regions are geometrically closed: the boundary edge (`y = groundY`) is included in both the above and below clip rects simultaneously. The current bug (red strip at ground line on clean trajectories) is a direct consequence. Prevention: always offset the below-ground clip rect by `y={groundY + 1}`, never `y={groundY}`.

3. **Single fill path crossing the ground line creates winding ambiguity** — The `toFillPath()` closed polygon has undefined winding when the spline crosses `groundY`. Chrome is forgiving; Safari and Firefox may render incorrect fill regions near crossing points. Prevention: for v4.2, the `+1px` clip offset mitigates the boundary case. For v4.3, split the fill path into two closed paths at the crossing x-coordinate. The `CrossingMarker` x-position and the split point must agree within 1px.

4. **Emoji font size cannot be changed in isolation** — SVG `<text>` emoji at `fontSize={12}` is rasterized at 12px. Increasing to 18-22px for legibility also shifts the text baseline and makes the emoji overflow the containing circle radii (`r=10`, `r=6`). Circle radii, tick offsets, and label y-positions must all scale proportionally in the same change. Prevention: treat each node type as a geometric unit — never change `fontSize` without updating `r` and tick geometry.

5. **`getBoundingClientRect()` on SVG elements is broken in Safari with CSS-transformed parents** — If any parent element carries a CSS `transform` (e.g., Framer Motion animation), the bounding rect values are offset by the transform delta in Safari (WebKit bug #42815). Prevention: for the current scroll-only case this is not triggered, but if any pan/zoom or page-level transform is added, switch to `scrollRef.current.getBoundingClientRect() + node SVG offset` instead of measuring the SVG child element directly.

See `PITFALLS.md` for 5 additional moderate/minor pitfalls, regression risks per change, and detection instructions.

---

## Implications for Roadmap

The dependency graph is clear and determines the only safe build order. All 7 items can be completed in 3 phases.

### Phase 1: Canvas Geometry Foundation
**Rationale:** `PADDING_Y`, `CANVAS_HEIGHT`, and the viewBox horizontal padding affect every other component. This must land and be visually verified before any path, node, or tooltip work. Changing layout constants after node sizes are tuned will re-break label positions.
**Delivers:** Correct canvas dimensions, no edge clipping of any element, correct `GROUND_Y` for all downstream work.
**Addresses:** CANVAS-03 (edge overflow / padding)
**Files:** `TimelineCanvas.tsx` only — `PADDING_Y` 30→60, `CANVAS_HEIGHT` 620→650, viewBox negative origin for horizontal padding
**Avoids:** Cascading geometry pitfall (Pitfall 1); label clip pitfall (Pitfall 7)
**Research flag:** Standard SVG patterns — no additional research needed.

### Phase 2: Path and Fill Fixes
**Rationale:** Depends on correct `GROUND_Y` from Phase 1. The clipPath boundary fix is validated against the actual ground line value. The spline overshoot fix (d3-shape) is independent of geometry constants but logically cleaner after the canvas is settled.
**Delivers:** Correct above/below fill split with no spurious red strip; smooth monotone spline with no overshoot between data points.
**Addresses:** CANVAS-01 (clipPath boundary), CANVAS-02 (spline smoothness)
**Files:** `TimelinePath.tsx` — `y={groundY + 1}` in belowId clip rect; replace `toSmoothPath()` with d3-shape `curveMonotoneX`
**Stack addition:** `npm install d3-shape d3-path` — must happen before this phase
**Avoids:** ClipPath boundary pitfall (Pitfall 2); winding ambiguity pitfall (Pitfall 3)
**Research flag:** Standard — d3-shape integration is well-documented. The clipPath fix is a 1-character change with HIGH-confidence rationale.

### Phase 3: Node Layer
**Rationale:** Node sizes, tick heights, and label positions are independent of path fills but depend on the correct `PADDING_Y` from Phase 1 (tick labels at top scores need the expanded 60px clearance). Implement together to avoid multiple geometry recalibrations.
**Delivers:** Legible nodes at default zoom; no label overlap at 3 objectives; content-bearing nodes sized for legibility; stronger editorial icon treatment.
**Addresses:** NODE-01 (icon quality / minimum size), NODE-02 (declutter / 3-level stagger), NODE-03 (content node sizing)
**Files:** `TimelineNode.tsx` — radius increases, 3-level tick stagger (`stackIndex % 3`), emoji fontSize increase with proportional geometry scaling
**Avoids:** Emoji font size isolation pitfall (Pitfall 5); binary stagger failure at 3 objectives (Pitfall 6)
**Research flag:** Node sizing values are empirical — a quick visual review pass after implementation is warranted before shipping. No library research needed.

### Phase 4: Tooltip and Zone Polish
**Rationale:** Fully independent of Phases 1-3. Both changes are low-risk and can be done in parallel with Phase 3 if bandwidth allows, but are grouped here as a clean final phase.
**Delivers:** Tooltip never clips at left edge; graveyard zone with editorial visual weight (diagonal hatch + opacity).
**Addresses:** TOOLTIP-01 (left-edge clip), ZONE-01 (graveyard visual weight)
**Files:** `TimelineTooltip.tsx` — left-edge guard (3 lines in `useLayoutEffect`); `TimelineCanvas.tsx` — SVG `<pattern>` in `<defs>` for diagonal hatch, applied as second rect layer on the below-ground zone
**Avoids:** Stale tooltip position during scroll (Pitfall 10); graveyard zone CSS variable coupling pitfall (Pitfall 8) — change path fill opacity and zone background in the same commit
**Research flag:** Standard — tooltip arithmetic and SVG pattern fills are fully documented browser-native features.

---

### Phase Ordering Rationale

- Phase 1 must come first because `GROUND_Y` is a derived constant used in both Phase 2 (clipPath rect) and Phase 3 (tick height clearance). Fixing those against the wrong `GROUND_Y` means re-fixing them after Phase 1 lands.
- Phases 2 and 3 can be parallelized by different developers once Phase 1 is merged and verified.
- Phase 4 is fully independent and can be started at any time — it touches no shared geometry.
- The `npm install d3-shape d3-path` step must precede Phase 2 but has no other dependencies.

### Research Flags

Phases with standard patterns (no additional research needed):
- **Phase 1** — SVG viewBox and CSS layout constants; well-documented
- **Phase 2** — d3-shape curveMonotoneX is officially documented; clipPath offset is a 1-character fix with spec-backed rationale
- **Phase 3** — Node geometry is empirical tuning; no library research needed
- **Phase 4** — Tooltip arithmetic and SVG `<pattern>` are browser-native

No phase in this milestone requires `/gsd:research-phase` during planning. All root causes are identified and all fixes are specified to implementation detail.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All findings grounded in actual `package.json` and source file reads; d3-shape recommendation backed by official D3 docs and source inspection |
| Features | HIGH | Table stakes derived from direct code inspection; differentiators from FT Visual Vocabulary, Floating UI official docs, textures.js official site |
| Architecture | HIGH | Every bug root cause confirmed by reading the actual lines of code; fix approaches verified against SVG spec and MDN |
| Pitfalls | HIGH (code-derived), MEDIUM (browser-specific) | Pitfalls 1-7 confirmed by code inspection; Safari `getBoundingClientRect` claim backed by documented browser bugs (Bugzilla #1066435, WebKit #42815) |

**Overall confidence:** HIGH

### Gaps to Address

- **ZONE-01 hatch opacity tuning** — The exact stroke opacity and base fill opacity for the graveyard diagonal hatch are not specified. The research identifies the pattern (SVG `<pattern>` with `var(--destructive)` stroke at low opacity over a semi-transparent red base) but exact values need a visual review pass. Suggested starting values from STACK.md: `strokeOpacity="0.12"`, base fill at `rgba(185, 28, 28, 0.08)`.

- **NODE-03 dynamic node width** — Content-bearing node label background rect sizing uses an empirical character-width approximation (`5.5px per character` for IBM Plex Mono at 9px). This is accurate to within ~10% for monospace fonts but should be verified against actual rendered output during Phase 3 implementation.

- **CANVAS-01 cross-browser winding** — The `+1px` clipPath offset resolves the boundary inclusion bug in all browsers. However, the deeper winding ambiguity when trajectories cross the ground line (Pitfall 2) is deferred. During Phase 2 testing, verify emerald/red fill rendering in Safari and Firefox, not just Chrome. If winding artifacts appear at crossing points, the polygon-split approach becomes a v4.2 blocker, not a v4.3 deferral.

- **Dead prop cleanup** — `TimelinePath` receives `isBelowGround` prop that is never used (Pitfall 9). This is not a bug but should be cleaned up in Phase 2 to avoid future developer confusion.

---

## Sources

### Primary (HIGH confidence)
- D3 shape curve types: https://d3js.org/d3-shape/curve
- d3-shape GitHub (version, ESM, deps): https://github.com/d3/d3-shape
- curveMonotoneX implementation: https://github.com/d3/d3-shape/blob/main/src/curve/monotone.js
- SVG clipPath spec (boundary-inclusive geometry): https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/clipPath
- SVG pattern element: https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/pattern
- Next.js 16 release notes (Turbopack stable, ESM): https://nextjs.org/blog/next-16
- transpilePackages docs: https://nextjs.org/docs/app/api-reference/config/next-config-js/transpilePackages
- Floating UI virtual elements: https://floating-ui.com/docs/virtual-elements
- Floating UI tooltip pattern: https://floating-ui.com/docs/tooltip
- Textures.js (MIT, SVG pattern fills): https://riccardoscalco.it/textures/
- Mozilla Bugzilla #1066435 (getBoundingClientRect + SVG + CSS transform): https://bugzilla.mozilla.org/show_bug.cgi?id=1066435
- WebKit bug #42815 (getBoundingClientRect broken for SVG): https://bugs.webkit.org/show_bug.cgi?id=42815
- Source files read: `TimelinePath.tsx`, `TimelineNode.tsx`, `TimelineCanvas.tsx`, `TimelineTooltip.tsx`, `package.json`, `next.config.ts`

### Secondary (MEDIUM confidence)
- React Portal for SVG tooltips (dev.to): https://dev.to/hexshift/rendering-tooltips-with-react-portals-without-breaking-layout-2970
- Everything I know about tooltip positioning (Floating UI author): https://dev.to/atomiks/everything-i-know-about-positioning-poppers-tooltips-dropdowns-in-uis-3nkl
- Pixel-perfect SVG icon sizing: https://iconvectors.io/tutorials/make-pixel-perfect-svg-icons.html
- Fix duplicate SVG ID collision in React: https://www.antonball.dev/blog/2020-06-15-svg-id-collision/
- FT Visual Vocabulary (chart type guidance): https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary
- Observable: Preventing Label Overlaps in D3 (@stuartathompson): https://observablehq.com/@stuartathompson/preventing-label-overlaps-in-d3

### Tertiary (LOW confidence)
- Multilevel temporal event sequence overview (academic, not directly applicable): https://arxiv.org/pdf/2108.03043

---

*Research completed: 2026-03-29*
*Ready for roadmap: yes*
