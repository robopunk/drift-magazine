# Phase 1.3 — Node System Design

**Created:** 2026-03-25
**Status:** Approved
**Scope:** Migrate `TimelineNode` from DOM-based divs to pure SVG elements; implement visual specs for all 6 node types with always-visible labels for informational nodes and silent rhythm nodes.

---

## Architecture

`TimelineNode` is rewritten as a pure SVG component returning a `<g>` element. All nodes render inside the `<svg>` body in `TimelineCanvas`, eliminating the current DOM+SVG hybrid where div nodes float above the canvas via absolute positioning with coordinate sync hacks.

**Why SVG-only:** Tick lines and labels are SVG elements that must share the same coordinate space as the path. DOM-based nodes required mirroring canvas scroll/pan state into CSS transforms — fragile and drift-prone. SVG `<g>` elements are first-class members of the canvas.

### Component signature

```tsx
interface TimelineNodeProps {
  type: 'origin' | 'signal' | 'latest' | 'cadence' | 'stale' | 'fiscal-year-end';
  x: number;
  y: number;
  colour: string;
  label?: string;         // stage emoji + text e.g. "FLY +3" — signal/latest only
  dateLabel?: string;     // e.g. "Oct 2023" — origin only
  stackIndex: number;     // 0-based index of objective among visible objectives
  onClick?: () => void;
  onHover?: () => void;
  onLeave?: () => void;
}
```

Returns a `<g>` element, rendered inside `<svg>` in `TimelineCanvas`.

---

## Node visual specs

| Type | Dot | Ring | Tick style | Tick height (even stack) | Tick height (odd stack) | Label |
|---|---|---|---|---|---|---|
| origin | 5px filled, objective colour | 9px, 20% opacity | dashed `2,3`, `var(--border)`, 50% opacity | 24px | 40px | dateLabel in 8px mono, `var(--muted-foreground)` |
| signal | 3px filled, objective colour | 6px, 30% opacity | dashed `2,3`, `var(--border)`, 50% opacity | 20px | 36px | label (emoji + stage) in 9px mono, `var(--muted-foreground)` |
| latest | 3px filled, objective colour | 6px, 30% opacity | solid, `var(--foreground)`, 95% opacity | 20px | 36px | label (emoji + stage) in 9.5px mono bold, `var(--foreground)` |
| cadence | 2px filled, `var(--border)` | none | none | — | — | none |
| stale | no fill; stroke circle 4.5px, `#f59e0b` 1.5px | none | none | — | — | none; `!` glyph centred in the ring |
| fiscal-year-end | 3.5px filled, `#f59e0b`, 85% opacity | none | none | — | — | none (unless it is also a signal — then treat as signal node) |

**Informational nodes** (origin, signal, latest, fiscal-year-end with signal): always-visible tick + label above node.
**Rhythm nodes** (cadence, stale, bare fiscal-year-end): dot on line only, no tick, no label.

---

## Label stagger

When multiple objectives are shown, labels from nearby nodes on different objectives can collide. A `stackIndex` prop (0-based position among currently visible objectives) drives alternating tick heights:

- **Even stackIndex (0, 2, …):** shorter tick (24px for origin, 20px for signal/latest)
- **Odd stackIndex (1, 3, …):** taller tick (40px for origin, 36px for signal/latest)

This gives ~16px vertical separation between label rows without requiring runtime collision detection. Sufficient for 2–3 simultaneous objectives; users can toggle objectives if more are displayed.

---

## TimelineCanvas changes

1. Move the node render block inside `<svg>` (currently rendered as sibling divs via absolute positioning).
2. Pass `stackIndex` — the index of the objective in the `visibleObjectives` array.
3. Remove `title` attributes from all nodes (already spec'd in roadmap); `aria-label` remains.
4. Remove the DOM wrapper layer that currently positions node divs above the canvas.

---

## Test plan

Rewrite all 7 existing `TimelineNode.test.tsx` tests from DOM assertions (`style.width`, `style.borderColor`) to SVG assertions:

1. **Origin node** — renders `<circle>` with correct `r` and `fill`, renders tick line with `stroke-dasharray="2,3"`, renders date label text
2. **Signal node** — renders smaller circle + dashed tick + stage label text
3. **Latest signal node** — renders solid tick (no dasharray), bold label
4. **Cadence node** — renders 2px dot only, no `<line>` or label `<text>` in output
5. **Stale node** — renders outline circle + `!` text, no tick
6. **Fiscal-year-end node** — renders amber dot, no tick
7. **stackIndex stagger** — even index produces shorter tick height than odd index

All tests use `@testing-library/react` with SVG element queries (`querySelector('circle')`, `querySelector('line')`, `getByText`).

---

## Files changed

| File | Change |
|---|---|
| `frontend/src/components/company/TimelineNode.tsx` | Full rewrite — SVG `<g>` output, all 6 node types |
| `frontend/src/__tests__/components/company/TimelineNode.test.tsx` | Full rewrite — SVG assertions |
| `frontend/src/components/company/TimelineCanvas.tsx` | Move node render inside `<svg>`, add `stackIndex`, remove DOM wrapper |

No schema changes. No new dependencies.
