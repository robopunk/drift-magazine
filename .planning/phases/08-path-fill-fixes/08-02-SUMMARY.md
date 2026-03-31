---
phase: "08"
plan: "02"
subsystem: frontend/timeline
tags: [timeline, canvas, design, financecharts, visual-polish, fill-opacity, axis, gridlines, time-range]
dependency_graph:
  requires: [08-01]
  provides: [CANVAS-DESIGN-01]
  affects:
    - frontend/src/components/company/TimelinePath.tsx
    - frontend/src/components/company/TimelineCanvas.tsx
    - frontend/src/app/globals.css
    - frontend/src/__tests__/components/company/TimelineCanvas.test.tsx
tech_stack:
  added: []
  patterns: [sparse-axis, time-range-windowing, quarterly-x-axis, year-only-gridlines]
key_files:
  created: []
  modified:
    - frontend/src/components/company/TimelinePath.tsx
    - frontend/src/components/company/TimelineCanvas.tsx
    - frontend/src/app/globals.css
    - frontend/src/__tests__/components/company/TimelineCanvas.test.tsx
decisions:
  - "Fill opacity increased from 8% to 18% (above) / 22% (below) — fills must be readable at a glance like FinanceCharts, not imperceptible"
  - "Sparse Y-axis: 5 of 9 scores shown (+4, +2, 0, -2, -4), right-aligned with score + label stacked — removes clutter while preserving orientation"
  - "Year-only vertical gridlines — monthly/quarterly vertical lines were too dense; annual cadence is sufficient structural scaffolding"
  - "Quarterly X-axis cadence bottom-only — top axis removed entirely; quarter starts + year boundaries provide enough time navigation"
  - "Dashed horizontal gridlines at sparse scores only (not ground) — 0.5px strokeWidth, 4-6 dasharray, 0.4 opacity; clean not distracting"
  - "Time range pills (6M/1Y/2Y/All) replace date range text in toolbar — user-controlled windowing, windowed dates drive all x-position calculations"
  - "Ground line label changed to 'WATCH · 0' positioned at x=6 left-anchored — FinanceCharts style inline annotation rather than external label"
  - "Zone background CSS variables changed from near-white hex (#f8fdf9, #fefcf8) to rgba values matching globals.css pattern"
metrics:
  duration: "~60 minutes (includes design analysis, spec, implementation, test fixes)"
  completed: "2026-03-31"
  tasks_completed: 1
  tasks_total: 1
  files_changed: 4
---

# Phase 08 Plan 02: FinanceCharts Visual Design Alignment Summary

**One-liner:** Applied FinanceCharts-inspired design language to the TimelineCanvas — readable area fills, sparse right-aligned Y-axis, year-only vertical gridlines, quarterly X-axis cadence, and time range pills (6M/1Y/2Y/All) — while preserving Drift's unique centered ground-line architecture.

---

## Background

After Phase 08-01 completed the structural SVG fixes (Catmull-Rom spline, clip rects, z-order), the user shared a FinanceCharts NVDA chart screenshot as a visual reference. The intent was to apply that financial chart aesthetic — clean, readable fills; sparse axis labels; minimal gridlines — to Drift's timeline, which has one critical architectural difference: the ground line is at score 0 in the **center** of the canvas (not the bottom like FinanceCharts).

A design spec was produced from visual analysis of the screenshot, then implemented in a single pass with 4 test failures fixed inline.

---

## What Was Built

### TimelinePath.tsx — Fill Opacity

- **Above-ground fill:** `fillOpacity` increased from `0.08` → `0.18` (emerald, `var(--primary)`)
- **Below-ground fill:** `fillOpacity` increased from `0.08` → `0.22` (red, `var(--destructive)`)

The fills were previously near-invisible (8%). The new values make the above/below distinction readable at a glance — the single biggest perceptual change.

### TimelineCanvas.tsx — Visual Chrome Redesign

Eight changes applied:

**1. Sparse Y-axis (right-aligned)**
- Added constant: `const SPARSE_AXIS_SCORES = [4, 2, 0, -2, -4]`
- Reduced `LABEL_COL_WIDTH` from `60` → `52`
- Y-axis now shows 5 of 9 scores, rendered right-aligned with score on top and stage label below (stacked, 9px/8px font)
- Ground score (0) rendered bold with `fontWeight={600}`

**2. Dashed horizontal gridlines at sparse scores**
- Gridlines only at `SPARSE_AXIS_SCORES` excluding 0 (ground line is its own element)
- `strokeWidth={0.5}`, `strokeDasharray="4 6"`, `opacity={0.4}` — structural but unobtrusive

**3. Year-only vertical gridlines**
- Replaced per-month gridline loop with `monthLabels.filter(({ isJanuary }) => isJanuary)`
- `strokeWidth={0.5}`, `opacity={0.35}` — annual structure only

**4. Quarterly X-axis, bottom only**
- Top axis block removed entirely
- Bottom axis renders labels at `isJanuary || isQuarterStart` (i % 3 === 0)
- Non-quarter months silently skipped

**5. Ground line label**
- Changed from stage name text to `"WATCH · 0"`
- Positioned `x={6}`, `textAnchor="start"`, `opacity={0.8}` — left-anchored inline annotation

**6. Time range pills**
- Added state: `const [timeRange, setTimeRange] = useState<"6M" | "1Y" | "2Y" | "All">("All")`
- Added `windowedMinDate` useMemo: clamps `minDate` to N months back based on `timeRange`
- Added `windowedTotalMonths` useMemo: recomputes total canvas months from windowed start
- All `minDate` / `totalMonths` references in `objectiveNodeSets`, `monthLabels`, `todayX`, `deadlineFlags` updated to use `windowedMinDate` / `windowedTotalMonths`
- Toolbar replaced with pill buttons (6M/1Y/2Y/All), active pill styled with `bg-primary text-primary-foreground`

**7. Ground line strokeWidth**
- Increased from `1` → `1.5` — more visible editorial baseline

**8. Canvas scroll cursor**
- `data-timeline-scroll` attribute preserved; `cursor: grab` style retained

### globals.css — Zone Background Variables

- `--timeline-zone-above`: `#f8fdf9` → `rgba(34, 197, 94, 0.04)`
- `--timeline-zone-below`: `#fefcf8` → `rgba(239, 68, 68, 0.04)`

The previous hex values were near-white and imperceptible. The rgba values match the pattern used in `.dark` and make the zone tinting consistent with CSS variable intent.

### TimelineCanvas.test.tsx — 4 Test Fixes

| Old test name | New test name | What changed |
|---|---|---|
| `"renders monthly vertical gridlines"` | `"renders year-boundary vertical gridlines"` | Checks `svg line` elements exist (not `data-gridline` attr) |
| `"renders January gridlines with stronger opacity"` | `"renders stage gridlines only at sparse axis scores"` | Asserts `line[data-gridline="month"]` count is 0 |
| `"renders month labels at both top and bottom of the stage grid"` | `"renders month labels on the bottom axis"` | Expects ≥1 "Jun" instead of ≥2 (top axis removed) |
| `"renders date range in toolbar"` | `"renders time range pills in toolbar"` | Checks "6M", "1Y", "All" pill text instead of `/Jun 2025/` date range |

Final suite: **143 tests, 21 files, 0 failures**.

---

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Fill opacity 18%/22% (not 8%) | 8% fills were invisible in practice; 18-22% matches FinanceCharts readability without competing with the stroke |
| Sparse axis: 5 of 9 scores | Full 9-score axis clutters a narrow label column; 5 even-spaced scores provide sufficient Y orientation |
| Year-only vertical gridlines | Monthly gridlines created a dense grid that visually competed with the paths; annual cadence is sufficient |
| Top axis removed | Bottom-only axis matches FinanceCharts convention; duplicate labels at top/bottom added noise |
| Time range pills not zoom | Windowing (slicing the date range) is editorially more useful than zoom (scaling the same range) |
| windowedMinDate drives all x-positions | Single source of truth — all 4 memos that compute x positions now derive from windowedMinDate for consistency |
| `WATCH · 0` ground label | FinanceCharts uses inline baseline annotation style; this connects the score (0) to the stage name (Watch) |

---

## Deviations from Plan

This plan was not pre-planned via GSD. The work emerged from a user-provided design reference during the Phase 08 session, post-execution of 08-01. There is no PLAN.md counterpart — this SUMMARY documents the work retroactively.

All changes were intentional and validated by the passing test suite. No regressions were introduced.

---

## Known Stubs

None. All time range options (6M/1Y/2Y/All) are fully wired to windowed date computations that drive canvas geometry.

---

## Self-Check: PASSED

- [x] `frontend/src/components/company/TimelinePath.tsx` — fill opacity 0.18 / 0.22
- [x] `frontend/src/components/company/TimelineCanvas.tsx` — sparse axis, pills, windowed dates, year gridlines, quarterly axis
- [x] `frontend/src/app/globals.css` — zone rgba variables
- [x] `frontend/src/__tests__/components/company/TimelineCanvas.test.tsx` — 4 tests updated
- [x] All 143 tests pass
