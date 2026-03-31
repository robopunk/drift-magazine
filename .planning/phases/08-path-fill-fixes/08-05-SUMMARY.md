---
phase: 08-path-fill-fixes
plan: 05
subsystem: frontend/timeline
tags: [timeline, svg-layer-order, crossing-marker, ground-line, painter-model]
requires: [08-04]
provides: [ground-line-lowest-svg-layer]
affects: [TimelineCanvas]
tech-stack-added: []
tech-stack-patterns: [SVG painter model — first child = lowest layer]
key-files-created: []
key-files-modified:
  - frontend/src/components/company/TimelineCanvas.tsx
decisions:
  - "Ground line rendered as first SVG child — background zones (translucent rgba) paint over it visually, paths/nodes/CrossingMarkers stack above naturally"
metrics:
  duration: "5 minutes"
  completed_date: "2026-03-31"
  tasks_completed: 1
  tasks_total: 1
  files_changed: 1
requirements_closed: [CANVAS-01]
---

# Phase 08 Plan 05: Ground Line Layer Order Fix Summary

**One-liner:** Ground line moved to first SVG child so CrossingMarker pulsing dots render visually on top via the SVG painter model.

---

## What Was Done

Moved the gold ground line `<line>` element from its previous position (after path fills, ~line 573) to the first child of the `<svg>` element. In SVG's painter model, later elements paint over earlier ones — by rendering the ground line first, all fills, paths, nodes, and background zones paint above it. CrossingMarker HTML `<div>` elements are rendered outside the SVG in the DOM, so they already stack above the entire SVG naturally.

The background zones use `rgba(...)` fill values (translucent), so the ground line remains visible through them as expected.

---

## Tasks

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Move ground line to first SVG element | bdd2743 | TimelineCanvas.tsx |

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Acceptance Criteria Verified

- Ground line `<line x1={0} y1={GROUND_Y}` appears BEFORE the first `<rect` (background zone) inside the SVG — confirmed at line 468-476
- Old ground line block (with comment "rendered after path fills") fully removed — no matches for "rendered after path fills" in file
- All 146 tests pass (0 failures)

---

## Known Stubs

None.

---

## Self-Check: PASSED

- File modified: `frontend/src/components/company/TimelineCanvas.tsx` — confirmed exists
- Commit bdd2743 — confirmed in git log
- Tests: 146 passed, 0 failed
