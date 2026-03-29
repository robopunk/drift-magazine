---
phase: 07-canvas-geometry-foundation
plan: "01"
subsystem: frontend/timeline-canvas
tags: [canvas, geometry, padding, constants, timeline]
dependency_graph:
  requires: []
  provides: [CANVAS-03-geometry-foundation]
  affects: [TimelineCanvas, TimelinePath, TimelineNode, CrossingMarker, DeadlineFlag]
tech_stack:
  added: []
  patterns: [constant-cascade, derived-geometry]
key_files:
  created: []
  modified:
    - frontend/src/components/company/TimelineCanvas.tsx
decisions:
  - "PADDING_Y increased 30→60: top axis labels at y=46/56, well clear of SVG top boundary"
  - "CANVAS_HEIGHT increased 620→650: STAGE_HEIGHT preserved at 68.75px, GROUND_Y shifts 305→335"
  - "HORIZONTAL_PADDING = 40: one MONTH_WIDTH per side added to canvasWidth and all x-positions"
metrics:
  duration: "~10 minutes"
  completed: "2026-03-29"
  tasks_completed: 1
  tasks_total: 2
  files_changed: 1
---

# Phase 07 Plan 01: Canvas Geometry Constants — Summary

**One-liner:** Increased PADDING_Y (30→60), CANVAS_HEIGHT (620→650), and added HORIZONTAL_PADDING=40 to eliminate content clipping at all four canvas edges while preserving STAGE_HEIGHT at exactly 68.75px.

---

## What Was Built

Updated the 5-constant geometry chain in `TimelineCanvas.tsx` so every element renders fully within canvas bounds:

| Constant | Before | After | Effect |
|---|---|---|---|
| `PADDING_Y` | 30 | 60 | Top axis labels now at y=46/56 (was y=16/26, partially clipped) |
| `CANVAS_HEIGHT` | 620 | 650 | Canvas grows taller; STAGE_HEIGHT preserved at 68.75px |
| `HORIZONTAL_PADDING` | — | 40 | New constant; one full month-width of clearance on each side |
| `STAGE_HEIGHT` | 68.75 | **68.75** | Unchanged — formula auto-cascades: (650-60-40)/8 = 68.75 |
| `GROUND_Y` | 305 | **335** | Auto-cascades: 60 + 4×68.75 = 335 |
| Container height | 664 | **694** | Auto-cascades: CANVAS_HEIGHT + 44 |

### X-position updates

All six x-position calculations now include `+ HORIZONTAL_PADDING`:
- Monthly node positions (`node.x`)
- Terminal node position (`terminalX`)
- Month axis tick/label positions (`monthLabels`)
- Today marker (`todayX`)
- Deadline flag positions (`x`)
- Canvas width (`canvasWidth` includes `HORIZONTAL_PADDING * 2`)

---

## Cascade Verification

- `STAGE_HEIGHT = (650 - 60 - 40) / 8 = 68.75` (unchanged)
- `GROUND_Y = 60 + 4 * 68.75 = 335` (shifted down 30px from 305)
- Container height = 650 + 44 = 694
- Top axis label y = 60 - 14 = 46 (was 16, now safely inside SVG)
- Top axis sublabel y = 60 - 4 = 56 (was 26, now safely inside SVG)

---

## Commits

| Task | Commit | Description |
|---|---|---|
| Task 1 | `82d32b3` | feat(07-01): update canvas geometry constants for edge-clipping fix |

---

## Deviations from Plan

None — plan executed exactly as written. All six x-position patterns identified and updated.

---

## Known Stubs

None — this plan modifies constants only, no UI data stubs introduced.

---

## Checkpoint Status

**Task 2 (checkpoint:human-verify):** Awaiting visual verification.

The dev server can be started with:
```bash
cd frontend && npm run dev
```
Then navigate to `http://localhost:3000/company/sdz` and verify:
1. Top axis labels (Orbit +4, Fly +3 etc.) fully visible with clearance above
2. Left and right edge nodes/labels not clipped
3. Ground line visible at correct vertical position (GROUND_Y = 335)
4. Stage rows evenly spaced (8 rows, 68.75px each)
5. Below-ground zone extends correctly

---

## Self-Check

- [x] `frontend/src/components/company/TimelineCanvas.tsx` modified
- [x] Commit `82d32b3` exists
- [x] PADDING_Y = 60 verified via grep
- [x] CANVAS_HEIGHT = 650 verified via grep
- [x] HORIZONTAL_PADDING = 40 verified via grep
- [x] `HORIZONTAL_PADDING * 2` in canvasWidth verified via grep
- [x] All 5 x-position calculations updated (nodes, terminal, labels, today, deadlines)

## Self-Check: PASSED
