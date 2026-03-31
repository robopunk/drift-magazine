---
phase: 08-path-fill-fixes
plan: "03"
subsystem: frontend/timeline
tags: [bug-fix, fill-path, timeline, tdd]
dependency_graph:
  requires: [08-01-SUMMARY.md]
  provides: [CANVAS-01 — below-ground red fill anchors at canvas bottom]
  affects: [frontend/src/components/company/TimelinePath.tsx]
tech_stack:
  added: []
  patterns: [split fill path functions, TDD red-green]
key_files:
  created: []
  modified:
    - frontend/src/components/company/TimelinePath.tsx
    - frontend/src/__tests__/components/company/TimelinePath.test.tsx
decisions:
  - toBelowFillPath closes at canvasHeight so the red fill area sits underneath the spline curve, not above it
  - toAboveFillPath preserves existing groundY closing behavior for green fill (unchanged)
  - Single toFillPath removed entirely — no shared fill path between the two zones
metrics:
  duration: "~5 minutes"
  completed: "2026-03-31T11:09:00Z"
  tasks_completed: 1
  tasks_total: 1
  files_modified: 2
  tests_before: 143
  tests_after: 146
---

# Phase 08 Plan 03: Below-Ground Fill Path Fix Summary

**One-liner:** Split `toFillPath` into `toAboveFillPath` (closes at groundY) and `toBelowFillPath` (closes at canvasHeight) so the red area fill sits underneath the spline curve for crossing objectives.

## What Was Built

The red (below-ground) area fill in `TimelinePath.tsx` was using the same fill polygon as the green (above-ground) fill — both closed at `groundY`. For crossing objectives like Manufacturing Network Simplification (momentum -2), this caused the red fill to appear **above** the curve rather than below it, because the polygon closed at the ground line instead of the canvas bottom.

**Fix:** Replace the single `toFillPath` function with two semantically distinct functions:

- `toAboveFillPath(points, groundY)` — closes the polygon at `groundY` (green fill sits between the curve and the ground line, unchanged)
- `toBelowFillPath(points, canvasHeight)` — closes the polygon at `canvasHeight` (red fill sits between the curve and the canvas bottom)

The JSX was updated to use `aboveFillPath` for the emerald `var(--primary)` fill element and `belowFillPath` for the destructive `var(--destructive)` fill element.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Split fill path into above/below functions, update tests | 64c6629 | TimelinePath.tsx, TimelinePath.test.tsx |

## Verification

```
grep -c "toBelowFillPath" frontend/src/components/company/TimelinePath.tsx  → 2
grep -c "toAboveFillPath" frontend/src/components/company/TimelinePath.tsx  → 2
grep -c "canvasHeight" frontend/src/components/company/TimelinePath.tsx     → 6
grep -c "toFillPath" frontend/src/components/company/TimelinePath.tsx       → 0  (removed)
All tests: 146 passed (21 test files)
```

## Deviations from Plan

None — plan executed exactly as written. TDD flow followed: RED (2 new tests failed) → GREEN (implementation passes all 146 tests).

## Known Stubs

None.

## Self-Check: PASSED

- `frontend/src/components/company/TimelinePath.tsx` — FOUND (modified)
- `frontend/src/__tests__/components/company/TimelinePath.test.tsx` — FOUND (modified)
- Commit 64c6629 — FOUND
