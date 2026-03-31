---
status: failed
phase: 08-path-fill-fixes
source: [08-VERIFICATION.md]
started: 2026-03-30T21:20:00Z
updated: 2026-03-31T10:00:00Z
---

## Current Test

Human UAT completed 2026-03-31. 3 findings raised — gap closure plans required before phase can close.

## Tests

### 1. No red fill above ground line
expected: For above-ground objectives (e.g., Global Biosimilar Leadership at +3), zero red fill visible above the gold ground line — only emerald fill.
result: [FAIL] Red fill appears above the spline trajectory for crossing objectives. Root cause: fill polygon closes at groundY for both fills; red clip (y > groundY) reveals area between curve and groundY which is ABOVE the below-ground portion of the curve. Fix: red fill path must close at canvasHeight so fill always sits underneath the line.

### 2. Clean split at ground line
expected: For Manufacturing Network Simplification (-2), emerald fill stops at the ground line and red fill begins there — no stripe, no gap, clean boundary.
result: [PASS] Split is clean.

### 3. Smooth curves
expected: Path curves are smooth and continuous across multi-point sequences. No visible kinks at steep momentum transitions.
result: [PASS] Curves are smooth.

### 4. 2-point straight lines
expected: Objectives with only 2 signal nodes render as clean straight lines (not curves).
result: [PASS] Straight lines render correctly.

## Additional Findings (raised during UAT)

### F-A: Post-buried trajectory continues to today
Observed: For buried/terminal objectives (e.g., Branded Generics Expansion — Phased Out), the dashed cadence line continues from the terminal node all the way to today. This is confusing — a buried objective has no trajectory beyond its exit date.
Expected: Path and nodes end at or shortly after the terminal node (exit_date). Nodes generated after exit_date should be suppressed.
Root cause: generateMonthlyNodes runs to `now` regardless of exit_date; objectiveNodeSets does not truncate nodes at exit_date before appending the terminal node.

### F-B: Ground line renders in front of crossing marker
Observed: The crossing marker (pulsing dot + "Crossing Q1 2024" label) appears behind the gold ground line.
Expected: Ground line is the lowest visible layer — all plotted elements (fills, paths, nodes, crossing markers) render on top of it.
Root cause: Ground line was moved in 08-01 to render after path fills (painter model fix). It now also covers the CrossingMarker HTML divs. Fix: move ground line to render first in the SVG (before gridlines, paths, everything).

## Summary

total: 4
passed: 3
issues: 3
pending: 0
skipped: 0
blocked: 0

## Gaps

- GAP-1: Red fill sits above spline trajectory for crossing objectives (fill path closes at groundY not canvasHeight)
- GAP-2: Post-buried cadence nodes extend to today — should terminate at exit_date
- GAP-3: Ground line renders in front of crossing marker — must be lowest SVG layer
