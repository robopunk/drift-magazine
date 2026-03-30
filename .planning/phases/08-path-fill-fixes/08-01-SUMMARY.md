---
phase: "08"
plan: "01"
subsystem: frontend/timeline
tags: [timeline, canvas, spline, clip-path, svg, tdd]
dependency_graph:
  requires: [07-01]
  provides: [CANVAS-01, CANVAS-02]
  affects: [frontend/src/components/company/TimelinePath.tsx, frontend/src/components/company/TimelineCanvas.tsx]
tech_stack:
  added: []
  patterns: [centripetal-catmull-rom, svg-clip-path]
key_files:
  created: []
  modified:
    - frontend/src/components/company/TimelinePath.tsx
    - frontend/src/components/company/TimelineCanvas.tsx
    - frontend/src/__tests__/components/company/TimelinePath.test.tsx
decisions:
  - "Centripetal Catmull-Rom alpha=0.5 chosen for smooth curves without overshoot at steep momentum transitions"
  - "2-point paths render as straight lines (M...L) rather than cubic bezier — prevents unnecessary curve on short segments"
  - "1px clip rect overlap (groundY+1 above, groundY-1 below) eliminates the sub-pixel gap artifact at the ground line boundary"
  - "canvasWidth/canvasHeight replace magic 10000 values — clip rects sized to actual SVG, preventing fills from leaking beyond canvas bounds"
  - "isBelowGround prop removed entirely — it was unused dead code after the fill/clip architecture was in place"
metrics:
  duration: "~10 minutes"
  completed: "2026-03-30"
  tasks_completed: 1
  tasks_total: 2
  files_changed: 3
---

# Phase 08 Plan 01: Path & Fill Fixes Summary

**One-liner:** Centripetal Catmull-Rom spline replaces horizontal Bezier; SVG clip rects get 1px boundary overlap and actual canvas dimensions instead of magic 10000 values; dead `isBelowGround` prop fully removed.

---

## What Was Built

### Task 1 — Replace spline algorithm, fix clip rects, update interface (commit: e9e673c)

**TimelinePath.tsx changes:**
- Replaced the horizontal Bezier (`cpx1/cpx2 at 40%/60%`) with centripetal Catmull-Rom (alpha=0.5). The new algorithm produces smooth, continuous curves that follow data point geometry without kinking at steep momentum transitions.
- Added special case: 2-point paths render as `M x0 y0 L x1 y1` (straight line), avoiding unnecessary cubic Bezier on single-segment paths.
- Fixed above clip rect: `height={groundY + 1}` (was `height={groundY}`) — 1px overlap ensures zero gap at the ground line boundary.
- Fixed below clip rect: `y={groundY - 1}` (was `y={groundY}`) — 1px overlap on the other side for the same reason.
- Replaced `width={10000}` / `height={10000}` magic values with `width={canvasWidth}` / `height={canvasHeight}` — clip rects now match actual SVG dimensions.
- Removed `isBelowGround: boolean` from interface (dead code — the dual-clip architecture doesn't need it).
- Added `canvasWidth: number` and `canvasHeight: number` to interface.
- Exported `toSmoothPath` for testability.

**TimelineCanvas.tsx changes:**
- Removed `const isBelowGround = objective.momentum_score <= 0;` line.
- Updated `<TimelinePath>` call to pass `canvasWidth={canvasWidth}` and `canvasHeight={CANVAS_HEIGHT}` instead of `isBelowGround`.

**Tests (TimelinePath.test.tsx):**
- Removed `isBelowGround` from `defaultProps`. Added `canvasWidth: 800` and `canvasHeight: 650`.
- Added 4 `toSmoothPath` unit tests (0 pts, 1 pt, 2 pts, 3+ pts).
- Added 4 clip rect attribute assertion tests (height=101, y=99, widths=800, below height=650).
- Total: 14 tests, all passing (up from 6).
- Full suite: 143 tests across 21 files — zero regressions.

---

## Decisions Made

| Decision | Outcome |
|----------|---------|
| Centripetal Catmull-Rom alpha=0.5 | Prevents overshoot at sharp transitions vs uniform Catmull-Rom |
| 2-point straight line case | D-04 spec: cleaner visual for single-segment paths |
| 1px clip overlap | Eliminates sub-pixel gap visible in certain browser rendering modes |
| canvasWidth/canvasHeight props | D-02 spec: canvas-aware clipping instead of unbounded 10000 |
| isBelowGround removed | D-05 spec: no longer used after fill/clip architecture matured |

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Known Stubs

None — all data flows through to rendering. No placeholders or TODO items in modified files.

---

## Task 2 Status

Task 2 is a `checkpoint:human-verify` gate. The dev server needs to be started and Stefano needs to visually confirm the four rendering checks on the Sandoz timeline at `http://localhost:3000/company/sdz`.

The checkpoint has been returned to the orchestrator. Visual verification is pending human approval.

---

## Self-Check

- [x] `frontend/src/components/company/TimelinePath.tsx` — exists, contains `alpha`, `canvasWidth: number`, `groundY + 1`, `groundY - 1`, `export function toSmoothPath`
- [x] `frontend/src/components/company/TimelineCanvas.tsx` — exists, contains `canvasWidth={canvasWidth}` and `canvasHeight={CANVAS_HEIGHT}`
- [x] `frontend/src/__tests__/components/company/TimelinePath.test.tsx` — exists, contains `canvasWidth: 800`, no `isBelowGround`
- [x] Commit `e9e673c` — 3 files changed, 118 insertions

## Self-Check: PASSED
