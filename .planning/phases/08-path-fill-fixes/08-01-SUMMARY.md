---
phase: "08"
plan: "01"
subsystem: frontend/timeline
tags: [timeline, canvas, spline, clip-path, svg, tdd, z-order, visual-fix]
dependency_graph:
  requires: [07-01]
  provides: [CANVAS-01, CANVAS-02]
  affects: [frontend/src/components/company/TimelinePath.tsx, frontend/src/components/company/TimelineCanvas.tsx]
tech_stack:
  added: []
  patterns: [centripetal-catmull-rom-alpha-0.5, svg-clip-path, svg-painter-model-z-order]
key_files:
  created: []
  modified:
    - frontend/src/components/company/TimelinePath.tsx
    - frontend/src/components/company/TimelineCanvas.tsx
    - frontend/src/__tests__/components/company/TimelinePath.test.tsx
decisions:
  - "Centripetal Catmull-Rom alpha=0.5 chosen for smooth curves without overshoot at steep momentum transitions"
  - "2-point paths render as straight lines (M...L) rather than cubic bezier — prevents unnecessary curve on short segments"
  - "Above clip rect height=groundY+1 covers the ground line pixel; below clip starts at groundY+1 to exclude closing line stripe"
  - "canvasWidth/canvasHeight replace magic 10000 values — clip rects sized to actual SVG"
  - "isBelowGround prop removed entirely — unused dead code after fill/clip architecture"
  - "Ground line rendered after path fills in SVG DOM (painter model) so fills sit behind ground line, nodes sit above"
metrics:
  duration: "~45 minutes total (includes post-verify fix iteration)"
  completed: "2026-03-30"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 3
---

# Phase 08 Plan 01: Path & Fill Fixes Summary

**One-liner:** Centripetal Catmull-Rom spline replaces horizontal Bezier; SVG clip rects corrected to actual canvas dimensions with boundary offset fix; ground line z-ordered after fills via SVG painter model; below-ground clip offset changed from groundY-1 to groundY+1 to eliminate horizontal stripe artifact.

---

## What Was Built

### Task 1 — Replace spline algorithm, fix clip rects, update interface (commit: e9e673c)

**TimelinePath.tsx changes:**
- Replaced horizontal Bezier (`cpx1/cpx2 at 40%/60%`) with centripetal Catmull-Rom (alpha=0.5). Smooth, continuous curves that follow data point geometry without kinking at steep momentum transitions.
- Added special case: 2-point paths render as `M x0 y0 L x1 y1` (straight line), per D-04.
- Above clip rect: `height={groundY + 1}` — covers the ground line pixel.
- Below clip rect: `y={groundY - 1}` initially (later corrected in Task 2 fix).
- Replaced `width={10000}` / `height={10000}` magic values with `width={canvasWidth}` / `height={canvasHeight}`.
- Removed `isBelowGround: boolean` from interface (D-05).
- Added `canvasWidth: number` and `canvasHeight: number` to interface (D-02).
- Exported `toSmoothPath` for testability.

**TimelineCanvas.tsx changes:**
- Removed `const isBelowGround = objective.momentum_score <= 0;` line.
- Updated `<TimelinePath>` call to pass `canvasWidth={canvasWidth}` and `canvasHeight={CANVAS_HEIGHT}`.

**Tests (TimelinePath.test.tsx):**
- Removed `isBelowGround` from `defaultProps`. Added `canvasWidth: 800` and `canvasHeight: 650`.
- Added 4 `toSmoothPath` unit tests (0 pts, 1 pt, 2 pts, 3+ pts).
- Added 4 clip rect attribute assertion tests.
- Total: 14 tests passing. Full suite: 143 tests across 21 files — zero regressions.

### Task 2 — Visual verification + fix iteration (commit: 704128f)

Human visual inspection found two rendering issues:

**Fix 1 — Ground line z-order:** The gold ground line appeared in front of path curves and fills. Moved the ground line `<line>` element and "GROUND LINE" text label to render AFTER all TimelinePath components (fills/strokes) but BEFORE TimelineNode components, using the SVG painter model (later DOM elements render on top). Non-ground stage lines remain in the STAGES.map() loop; the ground line now has its own dedicated render block.

**Fix 2 — Red fill horizontal stripe:** The below-ground fill clip rect previously started at `y=groundY-1`. This placed the fill path's horizontal closing line at `y=groundY` (which spans the full canvas width) inside the clip region, creating a thin horizontal stripe across the canvas width, making the red fill appear split. Fixed by changing below clip start to `y=groundY+1` — the closing line at groundY is now 1px outside the clip, eliminating the stripe. Updated test expectation from `"99"` to `"101"`.

---

## Commits

| Commit | Message | Files |
|--------|---------|-------|
| e9e673c | feat(08-01): replace spline, fix clip rects, remove isBelowGround | TimelinePath.tsx, TimelineCanvas.tsx, TimelinePath.test.tsx |
| 704128f | fix(08-01): fix z-order and red fill stripe visual issues | TimelinePath.tsx, TimelineCanvas.tsx, TimelinePath.test.tsx |

---

## Decisions Made

| Decision | Outcome |
|----------|---------|
| Centripetal Catmull-Rom alpha=0.5 | Prevents overshoot at sharp transitions vs uniform Catmull-Rom |
| 2-point straight line case | D-04 spec: cleaner visual for single-segment paths |
| Below clip at groundY+1 (not groundY-1) | Eliminates horizontal stripe artifact from fill path closing line |
| Ground line rendered after paths in SVG DOM | SVG painter model: fills behind ground line, nodes above it |
| canvasWidth/canvasHeight props | D-02 spec: canvas-aware clipping instead of unbounded 10000 |
| isBelowGround removed | D-05 spec: no longer used after fill/clip architecture matured |

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed below-ground clip creating horizontal stripe artifact**
- **Found during:** Task 2 visual verification iteration
- **Issue:** Below clip rect at `y=groundY-1` allowed the fill path's horizontal closing line at `y=groundY` to be visible across the full canvas width, making the red fill appear split
- **Fix:** Changed below clip from `y={groundY - 1}` to `y={groundY + 1}`; updated test from `"99"` to `"101"`
- **Files modified:** TimelinePath.tsx, TimelinePath.test.tsx
- **Commit:** 704128f

**2. [Rule 1 - Bug] Fixed ground line z-order appearing over path fills**
- **Found during:** Task 2 visual verification iteration
- **Issue:** Gold ground line appeared in front of path curves and fills visually
- **Fix:** Moved ground line `<line>` and label text to render after TimelinePath fills in the SVG DOM, before TimelineNode elements
- **Files modified:** TimelineCanvas.tsx
- **Commit:** 704128f

---

## Known Stubs

None — all data flows through to rendering. No placeholders or TODO items in modified files.

---

## Self-Check: PASSED

- [x] `frontend/src/components/company/TimelinePath.tsx` — exists, modified (below clip at groundY+1)
- [x] `frontend/src/components/company/TimelineCanvas.tsx` — exists, modified (ground line after paths)
- [x] `frontend/src/__tests__/components/company/TimelinePath.test.tsx` — exists, modified (y=101 assertion)
- [x] Commit `e9e673c` — confirmed in git log
- [x] Commit `704128f` — confirmed in git log
- [x] All 143 tests pass
