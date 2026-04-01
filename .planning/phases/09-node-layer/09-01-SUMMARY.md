---
phase: 09-node-layer
plan: 01
subsystem: frontend/timeline-nodes
tags: [svg, animation, wcag, stagger, node-layer]
dependency_graph:
  requires: []
  provides: [NODE-01, NODE-02, NODE-03]
  affects: [frontend/src/components/company/TimelineNode.tsx, frontend/src/components/company/TimelineCanvas.tsx, frontend/src/app/globals.css]
tech_stack:
  added: []
  patterns: [SVG symbol/use pattern, proximity-bucket stagger, CSS SVG animation with transform-box fill-box]
key_files:
  created: []
  modified:
    - frontend/src/components/company/TimelineNode.tsx
    - frontend/src/components/company/TimelineCanvas.tsx
    - frontend/src/app/globals.css
    - frontend/src/__tests__/components/company/TimelineNode.test.tsx
decisions:
  - "tickHeight prop replaces stackIndex: proximity-bucket computation in Canvas, not Node"
  - "CSS node-pulse class with transform-box fill-box on SVG outer halo of latest nodes"
  - "SVG symbol defs in TimelineCanvas parent svg, referenced via use href in TimelineNode"
  - "Dark mode --muted-foreground changed from #6b7280 to #9ca3af for WCAG AA compliance (5.74:1)"
metrics:
  duration_seconds: 304
  completed_date: "2026-04-01"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 4
---

# Phase 9 Plan 1: Node Layer Upgrade Summary

**One-liner:** SVG symbol terminal icons, proximity-bucket stagger, pulse animation, and WCAG-fixed dark mode replacing emoji text and stackIndex stagger in TimelineNode.

---

## Tasks Completed

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | TimelineNode.tsx — icon swap, sizing, labels, animation; globals.css WCAG fix | ec31ea8 | Done |
| 2 | TimelineCanvas.tsx — SVG symbol defs and proximity-bucket stagger computation | aac90ad | Done |
| 3 | TimelineNode.test.tsx — updated assertions for radii, props, SVG symbols | a672a44 | Done |

---

## What Was Built

### TimelineNode.tsx
- Replaced `stackIndex: number` prop with `tickHeight: number` (pre-computed by Canvas)
- Terminal nodes (`terminal-proved`, `terminal-buried`): emoji `<text>` removed; replaced with `<use href="#icon-proved|#icon-buried">` referencing SVG symbols defined in TimelineCanvas
- Signal nodes: now dot-only markers with no label text (D-B1)
- Latest nodes: outer halo r=8 / inner r=4 with `className="node-pulse"` breathing animation on outer halo; stage label at fontSize=11 IBM Plex Mono (D-B2); emoji rendered at fontSize=18 with `dominantBaseline="central"` (D-A2)
- Signal nodes: outer halo r=5 / inner r=2.5 (de-emphasised vs latest)
- Stale nodes: r=5, `var(--exit-phased)` replacing hardcoded `#f59e0b`
- Fiscal-year-end nodes: `var(--exit-phased)` replacing hardcoded `#f59e0b`

### TimelineCanvas.tsx
- Added `<defs>` block as first child of SVG root: `#icon-proved` (upward chevron polyline) and `#icon-buried` (downward-pointing filled triangle polygon)
- Proximity-bucket stagger computation: `TICK_HEIGHTS = [20, 32, 44, 56]`, `originBuckets` and `signalBuckets` maps keyed by `Math.round(x / 5)`, building `nodeTickHeights` map keyed by `${objective.id}-${i}`
- Passes `tickHeight={nodeTickHeights.get(...)  ?? 20}` to each `TimelineNode` replacing `stackIndex={objIdx}`
- cadence, fiscal-year-end, and stale nodes exempt from bucketing (no ticks)

### globals.css
- Added `@keyframes node-pulse` (scale 1 → 1.08 → 1, opacity 0.9 → 1.0 → 0.9, 2.5s ease-in-out infinite)
- Added `.node-pulse` class with `transform-box: fill-box; transform-origin: center` for correct SVG transform origin
- Fixed WCAG AA failure: dark mode `--muted-foreground` changed from `#6b7280` (3.69:1, fails AA) to `#9ca3af` (5.74:1, passes AA)

### TimelineNode.test.tsx
- All 9 tests updated: `stackIndex` → `tickHeight={20}` in all render calls
- Signal test: asserts `container.querySelector("text")` is null (dot-only)
- Latest test: asserts outer halo r=8, inner r=4, label fontSize=11
- Terminal-proved: asserts `use[href="#icon-proved"]` not null; no emoji text
- Terminal-buried: asserts `use[href="#icon-buried"]` not null; no emoji text
- Stale: asserts stroke/fill `var(--exit-phased)`, r=5
- Fiscal: asserts fill `var(--exit-phased)`
- Stagger test: rewritten using `tickHeight={20}` vs `tickHeight={56}` on `type="latest"` nodes

---

## Verification Results

1. `npx vitest run src/__tests__/components/company/TimelineNode.test.tsx` — 9/9 passed
2. `npx vitest run` — 146/146 passed (no regressions)
3. `grep -c "stackIndex" TimelineNode.tsx` → 0
4. `grep -c "#f59e0b" TimelineNode.tsx` → 0
5. `grep -c "icon-proved" TimelineCanvas.tsx` → 1
6. `grep -c "node-pulse" globals.css` → 3
7. `grep "#9ca3af" globals.css` → match in dark mode block

---

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| tickHeight prop replaces stackIndex | Proximity-bucket computation belongs in Canvas (knows all node x-positions); Node should receive pre-computed value |
| CSS node-pulse class with transform-box fill-box | SVG CSS animation requires fill-box to anchor transform-origin at element center, not SVG viewport origin |
| SVG symbol defs once in Canvas parent svg | Symbols defined once, referenced many times via use href; eliminates per-node duplication |
| Dark mode --muted-foreground: #9ca3af | #6b7280 on #0f172a fails WCAG AA (3.69:1); #9ca3af achieves 5.74:1 (passes AA per RESEARCH.md Pitfall 4) |

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Known Stubs

None. All changes are structural/visual; no data stubs introduced.

---

## Self-Check: PASSED

Files exist:
- frontend/src/components/company/TimelineNode.tsx: FOUND
- frontend/src/components/company/TimelineCanvas.tsx: FOUND
- frontend/src/app/globals.css: FOUND
- frontend/src/__tests__/components/company/TimelineNode.test.tsx: FOUND

Commits exist:
- ec31ea8: FOUND (feat(09-01): upgrade TimelineNode)
- aac90ad: FOUND (feat(09-01): add SVG symbol defs)
- a672a44: FOUND (test(09-01): update TimelineNode tests)
