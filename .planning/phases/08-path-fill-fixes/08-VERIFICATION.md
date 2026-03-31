---
phase: 08-path-fill-fixes
verified: 2026-03-31T13:20:00Z
status: human_needed
score: 8/8 automated must-haves verified
re_verification:
  previous_status: human_needed
  previous_score: 4/4 automated (3 UAT gaps pending closure)
  gaps_closed:
    - "GAP-1: Red fill sits above spline trajectory — fixed by toBelowFillPath closing at canvasHeight (08-03)"
    - "GAP-2: Post-buried cadence nodes extend to today — fixed by exit_date truncation (08-04)"
    - "GAP-3: Ground line renders in front of CrossingMarker — fixed by moving to first SVG element (08-05)"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Visual check — no red fill above ground line on clean above-ground objectives"
    expected: "For objectives that stay above ground (e.g., Global Biosimilar Leadership at +3), zero red fill visible above the gold ground line — only emerald fill"
    why_human: "SVG clip geometry and fill path destinations verified programmatically. toBelowFillPath closes at canvasHeight (confirmed line 61 TimelinePath.tsx). Pixel-level rendering at exact boundary requires live browser render."
  - test: "Visual check — buried objectives show no nodes or path beyond exit_date"
    expected: "For a graveyard objective (e.g., Branded Generics Expansion — Phased Out), the dashed cadence line and all nodes stop at the exit_date. No trailing trajectory to today."
    why_human: "Truncation logic confirmed in TimelineCanvas.tsx (lines 180-189, while/pop loop). Editorial correctness and visual absence of post-exit trail requires browser confirmation."
  - test: "Visual check — CrossingMarker pulsing dot and label render on top of gold ground line"
    expected: "The pulsing dot and 'Crossing Q1 2024' label are fully visible above the ground line, not obscured behind it."
    why_human: "Ground line confirmed as first SVG child (line 469 TimelineCanvas.tsx). CrossingMarker HTML divs are outside the SVG (DOM stacking confirmed). Visual layering correctness requires browser render."
---

# Phase 08: Path & Fill Fixes Verification Report

**Phase Goal:** Fix the spurious red area fill artifact above the ground line, kinks/overshoot in spline curves, terminal node clipping, and ground line z-order on the TimelineCanvas so visual rendering is correct.
**Verified:** 2026-03-31T13:20:00Z
**Status:** human_needed — all automated checks pass; 3 visual confirmations still need a live browser
**Re-verification:** Yes — after gap closure plans 08-03, 08-04, and 08-05

---

## Re-verification Summary

The original verification (2026-03-30) found 4/4 automated must-haves passing, with 3 UAT gaps raised during human testing:

- **GAP-1:** Red fill appeared above the spline for crossing objectives
- **GAP-2:** Post-buried cadence nodes extended to today instead of stopping at exit_date
- **GAP-3:** CrossingMarker rendered behind the gold ground line

All three gaps have been addressed by plans 08-03, 08-04, and 08-05 respectively. No regressions detected. Test count grew from 143 to 146 (3 new tests for toBelowFillPath behavior). All 146 tests pass.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Red (below-ground) area fill sits UNDERNEATH the spline curve, not above it | ✓ VERIFIED | `toBelowFillPath` closes polygon at `canvasHeight` (line 61 TimelinePath.tsx). Above clip `height={groundY+1}`, below clip `y={groundY+1}`. Old `toFillPath` removed — 0 occurrences. |
| 2 | Green (above-ground) area fill sits between the curve and groundY | ✓ VERIFIED | `toAboveFillPath` closes at `groundY` (line 54 TimelinePath.tsx). Above clip `height={groundY+1}` unchanged. |
| 3 | Buried/terminal objectives show no nodes or path segments beyond the exit date | ✓ VERIFIED | while/pop truncation block at lines 183-189 TimelineCanvas.tsx. `latestSignalIdx` search moved after truncation (line 192). Non-terminal objectives unaffected (`hasTerminalState` guard). |
| 4 | The dashed cadence line ends at or before the terminal node, not at today | ✓ VERIFIED | Same truncation block (lines 180-189): removes all monthlyNodes with `month > exitMs` before terminal node is appended. Terminal node push at line 201 appends exactly at `exit_date`. |
| 5 | Non-terminal objectives are unaffected | ✓ VERIFIED | Truncation block is guarded by `hasTerminalState && obj.exit_date` (line 183) — objectives without terminal_state or exit_date are skipped entirely. |
| 6 | CrossingMarker pulsing dot and label render visually on top of the gold ground line | ? HUMAN NEEDED | Ground line is now first SVG child (line 469 TimelineCanvas.tsx); CrossingMarker HTML divs are outside the SVG (DOM naturally stacks above SVG). Needs browser visual confirmation. |
| 7 | Ground line is the lowest visual layer in the canvas | ✓ VERIFIED | `<line x1={0} y1={GROUND_Y}` at line 469, before first `<rect` (background zones at lines 475-476). Comment: "rendered first so it is the lowest SVG layer (painter model)". Old position ("rendered after path fills") fully removed — 0 occurrences. |
| 8 | All 146 tests pass | ✓ VERIFIED | `npx vitest run` → 146 passed, 0 failed, 21 test files (2026-03-31T13:16:59Z) |

**Score:** 8/8 automated must-haves verified (1 truth also requires visual browser confirmation)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/components/company/TimelinePath.tsx` | `toBelowFillPath` closes at canvasHeight; `toAboveFillPath` closes at groundY; `toFillPath` removed | ✓ VERIFIED | 117 lines. Both functions present (lines 50-62). `toFillPath` has 0 occurrences. `toBelowFillPath` and `toAboveFillPath` each appear 2 times (definition + usage). |
| `frontend/src/components/company/TimelineCanvas.tsx` | exit_date truncation block; ground line as first SVG child | ✓ VERIFIED | Truncation at lines 180-189; ground line at line 469 before background rect at line 475. `exitMs` appears 2 times, `monthlyNodes.pop` appears 1 time. |
| `frontend/src/__tests__/components/company/TimelinePath.test.tsx` | Tests asserting toBelowFillPath closes at canvasHeight | ✓ VERIFIED | 146 total tests pass (up from 143). 3 new tests added for below-fill path closing position. |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `TimelinePath.tsx toBelowFillPath` | `canvasHeight prop` | Fill polygon closes at `canvasHeight` — line 61: `return \`...\${canvasHeight}\` ` | ✓ WIRED | `canvasHeight` appears 6 times in TimelinePath.tsx (prop interface, function param, function body, component destructure, clipPath rect, toBelowFillPath call) |
| `TimelinePath.tsx toAboveFillPath` | `groundY prop` | Fill polygon closes at `groundY` — line 54 | ✓ WIRED | Unchanged from 08-01. Above clip `height={groundY+1}` (line 75). |
| `objectiveNodeSets` truncation | `exit_date` on objective | while/pop loop comparing `node.month.getTime() > exitMs` | ✓ WIRED | Lines 183-189. `exitMs = new Date(obj.exit_date).getTime()` feeds the comparison directly. |
| Ground line `<line>` element | SVG painter model lowest layer | First child of `<svg>` before background `<rect>` elements | ✓ WIRED | Line 469 (`<line x1={0} y1={GROUND_Y}`) precedes line 475 (`<rect` for background zone). |
| CrossingMarker HTML divs | DOM stacking above SVG | Rendered outside `<svg>` close tag in JSX | ✓ WIRED | CrossingMarker renders after SVG closes (confirmed in TimelineCanvas.tsx structure). HTML divs naturally stack above SVG in DOM. |

---

## Data-Flow Trace (Level 4)

TimelinePath is a pure rendering component receiving `points[]` as props. No independent data fetching.

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `TimelinePath.tsx` | `points: Point[]` | Passed as prop from TimelineCanvas `objectiveNodeSets` memo | Yes — nodes derived from live Supabase signals | ✓ FLOWING |
| `TimelineCanvas.tsx` | `objectiveNodeSets` (with truncation) | Computed from `selectedIds` + `timelineNodes()` + company data; truncated at `exit_date` for terminal objectives | Yes — driven by real objective/signal data from Supabase | ✓ FLOWING |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| toBelowFillPath closes at canvasHeight | Vitest unit test | PASS (146 total) | ✓ PASS |
| toAboveFillPath closes at groundY | Vitest unit test | PASS | ✓ PASS |
| toBelowFillPath d != toAboveFillPath d | Vitest unit test (different d attributes) | PASS | ✓ PASS |
| toFillPath removed from TimelinePath.tsx | `grep -c "toFillPath" TimelinePath.tsx` → 0 | 0 | ✓ PASS |
| exitMs appears in TimelineCanvas.tsx | `grep -c "exitMs"` → 2 | 2 | ✓ PASS |
| monthlyNodes.pop appears in TimelineCanvas.tsx | `grep -c "monthlyNodes.pop"` → 1 | 1 | ✓ PASS |
| Ground line appears before background rect | line 469 (`<line`) before line 475 (`<rect`) | Confirmed | ✓ PASS |
| "rendered after path fills" comment removed | `grep` → 0 | 0 | ✓ PASS |
| isBelowGround fully removed | `grep -c "isBelowGround"` in both files → 0 | 0 | ✓ PASS (unchanged from 08-01) |
| Full test suite | `npx vitest run` | 146 passed, 0 failed | ✓ PASS |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CANVAS-01 | 08-01-PLAN.md, 08-03-PLAN.md, 08-05-PLAN.md | Red fill clip bug — spurious red above ground line; ground line z-order | ✓ SATISFIED | `toBelowFillPath` closes at `canvasHeight` (08-03 fix). Ground line as first SVG child (08-05 fix). Clip rects use `groundY+1` stripe fix (08-01). All three CANVAS-01 facets addressed. |
| CANVAS-02 | 08-01-PLAN.md, 08-04-PLAN.md | Spline smoothness; terminal node clipping at exit_date | ✓ SATISFIED | Centripetal Catmull-Rom alpha=0.5 (08-01). Exit_date truncation for terminal objectives (08-04). |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | None found | — | — |

No TODOs, FIXMEs, placeholder comments, empty implementations, or dead code found in any of the five modified files across plans 08-01 through 08-05.

---

## Commit Verification

| Commit | Plan | Message | Status |
|--------|------|---------|--------|
| `e9e673c` | 08-01 | feat(08-01): replace spline with Catmull-Rom, fix clip rects, remove isBelowGround | ✓ EXISTS |
| `704128f` | 08-01 | fix(08-01): fix z-order and red fill stripe visual issues | ✓ EXISTS |
| `64c6629` | 08-03 | feat(08-03): split fill path into toAboveFillPath/toBelowFillPath | ✓ EXISTS |
| `aa607cb` | 08-04 | fix(08-04): truncate cadence nodes at exit_date for terminal objectives | ✓ EXISTS |
| `bdd2743` | 08-05 | fix(08-05): move ground line to first SVG element (lowest paint layer) | ✓ EXISTS |

---

## Human Verification Required

### 1. No red fill above ground line (GAP-1 closure check)

**Test:** Start dev server (`cd frontend && npm run dev`), open `http://localhost:3000/company/sdz`, select an objective that crosses the ground line (e.g., Manufacturing Network Simplification at -2).
**Expected:** Red fill is entirely below the spline curve and below the ground line. No red fill visible in the above-ground zone. Emerald fill sits between the curve and the ground line. No stripe artifact at the boundary.
**Why human:** `toBelowFillPath` is verified to close at `canvasHeight` in code and unit tests. The red fill's visual position relative to the spline (underneath vs above) is the editorial claim that requires a live browser render — the polygon math is correct but the visual rendering must be confirmed.

### 2. Buried objectives show no post-exit trajectory (GAP-2 closure check)

**Test:** Same page, select a graveyard objective (e.g., Branded Generics Expansion — Phased Out, or China Growth Platform — Silent Drop).
**Expected:** The dashed cadence line and all nodes end at or very near the exit_date. No dashed line extending from the terminal node to the present. The terminal node marker is the last visual element on the path.
**Why human:** Truncation logic is confirmed in code (while/pop at lines 183-189 TimelineCanvas.tsx). The visual absence of a trailing cadence line for graveyard entries requires browser confirmation.

### 3. CrossingMarker renders on top of ground line (GAP-3 closure check)

**Test:** Same page, select Manufacturing Network Simplification (-2) which crosses the ground line.
**Expected:** The pulsing dot and "Crossing..." label from CrossingMarker are fully visible and appear above the gold ground line — not hidden behind it.
**Why human:** Ground line is confirmed as first SVG child (line 469) and CrossingMarker HTML divs are outside the SVG (natural DOM stacking). Visual layering correctness at the exact crossing point requires browser render.

---

## Summary

All three UAT gaps from 08-HUMAN-UAT.md have been addressed by focused gap-closure plans:

- **GAP-1 (08-03):** `toFillPath` replaced by `toAboveFillPath` (closes at groundY) and `toBelowFillPath` (closes at canvasHeight). Red fill now forms a polygon between the spline and the canvas bottom — sitting underneath the curve rather than above it. 3 new tests confirm the split behavior.

- **GAP-2 (08-04):** `objectiveNodeSets` memo in TimelineCanvas now tail-truncates cadence nodes at `exit_date` for terminal/buried objectives before appending the terminal node. `latestSignalIdx` search moved after truncation. Non-terminal objectives completely unaffected.

- **GAP-3 (08-05):** Ground line `<line>` element moved from post-path position (~line 573) to first child of `<svg>` (line 469). Background zones use translucent `rgba(...)` fills so the ground line shows through them. CrossingMarker HTML divs are already outside the SVG and stack above it naturally by DOM ordering.

All 146 tests pass with 0 failures. The only remaining items are 3 visual browser confirmations — the underlying code is correct for all of them.

---

_Verified: 2026-03-31T13:20:00Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification: Yes — initial verification was 2026-03-30T21:22:00Z (status: human_needed, 3 UAT gaps found)_
