---
phase: 08-path-fill-fixes
verified: 2026-03-30T21:22:00Z
status: human_needed
score: 4/4 automated must-haves verified
human_verification:
  - test: "Visual check — no red above ground line on clean above-ground objectives"
    expected: "For objectives that stay above ground (e.g., Global Biosimilar Leadership at +3), zero red fill visible above the gold ground line"
    why_human: "SVG clip geometry verified programmatically but pixel-level rendering correctness on an actual browser cannot be confirmed without visual inspection"
  - test: "Visual check — clean fill split at ground line for crossing objectives"
    expected: "For Manufacturing Network Simplification (-2), emerald fill stops at ground line and red fill begins at ground line with no visible gap or stripe artifact"
    why_human: "The stripe fix (groundY+1 for below clip start) was verified in code but the absence of the artifact requires a live browser render"
  - test: "Visual check — smooth Catmull-Rom curves, no kinks at steep transitions"
    expected: "Path curves look natural and continuous; no visible kinking at steep momentum transitions (e.g., +3 to -1)"
    why_human: "Algorithm correctness verified by unit tests; visual smoothness quality requires human judgment on browser render"
  - test: "Visual check — 2-point paths render as clean straight lines"
    expected: "Any objective with only 2 signal nodes renders as a clean straight line, not a curve"
    why_human: "M...L output confirmed by unit test; visual rendering confirmation requires browser"
---

# Phase 08: Path & Fill Fixes Verification Report

**Phase Goal:** Fix the spurious red area fill artifact above the ground line and kinks/overshoot in spline curves on the TimelineCanvas, so the visual rendering is correct.
**Verified:** 2026-03-30T21:22:00Z
**Status:** human_needed — all automated checks pass, visual rendering requires human sign-off
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Red (below-ground) area fill starts exactly at the ground line — no red visible above it on clean above-ground trajectories | ? HUMAN NEEDED | Below clip rect uses `y={groundY + 1}` (line 70 TimelinePath.tsx). Code is correct; pixel render needs browser confirm |
| 2 | Emerald (above-ground) area fill stops exactly at the ground line — no missing fill gap or double-fill at the boundary | ? HUMAN NEEDED | Above clip rect uses `height={groundY + 1}` (line 67 TimelinePath.tsx). Code correct; needs visual confirm |
| 3 | Path curve is smooth and continuous with no visible kinks or overshoot at steep momentum transitions | ? HUMAN NEEDED | Centripetal Catmull-Rom (alpha=0.5) implemented at lines 19-46 TimelinePath.tsx. Algorithm verified by unit test; smoothness quality needs human judgment |
| 4 | isBelowGround prop is fully removed from TimelinePath interface, component, and TimelineCanvas call site | ✓ VERIFIED | `grep -c "isBelowGround"` returns 0 in both TimelinePath.tsx and TimelineCanvas.tsx |

**Score:** 4/4 automated must-haves verified (all truths have correct code; 3 of 4 also require visual browser confirmation)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/components/company/TimelinePath.tsx` | Catmull-Rom spline, fixed clipPath rects, canvasWidth/canvasHeight props | ✓ VERIFIED | File exists, 108 lines, contains `catmullRom` logic (`alpha = 0.5`), exports `toSmoothPath`, uses `canvasWidth`/`canvasHeight` |
| `frontend/src/components/company/TimelineCanvas.tsx` | Updated TimelinePath call site without isBelowGround, with canvasWidth/canvasHeight | ✓ VERIFIED | `canvasWidth={canvasWidth}` at line 533, `canvasHeight={CANVAS_HEIGHT}` at line 534, zero `isBelowGround` occurrences |
| `frontend/src/__tests__/components/company/TimelinePath.test.tsx` | Updated tests matching new interface (no isBelowGround, has canvasWidth/canvasHeight) | ✓ VERIFIED | `defaultProps` contains `canvasWidth: 800` and `canvasHeight: 650`, zero `isBelowGround` occurrences, 14 tests all passing |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `TimelineCanvas.tsx` | `TimelinePath.tsx` | JSX props: points, colour, groundY, id, canvasWidth, canvasHeight | ✓ WIRED | `<TimelinePath ... canvasWidth={canvasWidth} canvasHeight={CANVAS_HEIGHT}` confirmed at lines 528-535 |
| TimelinePath above clipPath rect | groundY boundary | `height={groundY + 1}` for 1px overlap | ✓ WIRED | Line 67: `height={groundY + 1}` confirmed |
| TimelinePath below clipPath rect | groundY boundary | `y={groundY + 1}` (corrected from plan's `groundY - 1` — intentional fix) | ✓ WIRED | Line 70: `y={groundY + 1}` confirmed. Plan specified `y={groundY - 1}` but this was corrected in commit 704128f — the `groundY-1` value created a stripe artifact. `groundY+1` is the correct implementation. Test asserts `"101"` (100+1) for groundY=100, confirming intentional design. |

**Note on planned vs actual below-clip offset:** The PLAN specified `y={groundY - 1}`. The executed implementation changed this to `y={groundY + 1}` after visual verification revealed `groundY-1` allowed the fill path's horizontal closing line to produce a thin horizontal stripe artifact. This is a documented intentional deviation (commit 704128f), not a gap. The test was updated accordingly.

---

## Data-Flow Trace (Level 4)

TimelinePath is a pure rendering component — it receives `points[]` as props from TimelineCanvas and renders SVG. No independent data fetching.

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `TimelinePath.tsx` | `points: Point[]` | Passed as prop from TimelineCanvas node computation | Yes — nodes derived from live Supabase signals via `objectiveNodeSets` | ✓ FLOWING |
| `TimelineCanvas.tsx` | `objectiveNodeSets` | Computed from `selectedIds` + `timelineNodes()` + live company data | Yes — driven by real objective/signal data from Supabase | ✓ FLOWING |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| toSmoothPath returns empty for 0 points | Vitest unit test | PASS | ✓ PASS |
| toSmoothPath returns empty for 1 point | Vitest unit test | PASS | ✓ PASS |
| toSmoothPath returns straight line for 2 points | Vitest unit test — `"M 10 50 L 100 120"` | PASS | ✓ PASS |
| toSmoothPath returns M+C for 3+ points (Catmull-Rom) | Vitest unit test | PASS | ✓ PASS |
| Above clip rect height = groundY + 1 | Vitest unit test — attr `"101"` | PASS | ✓ PASS |
| Below clip rect y = groundY + 1 (stripe fix) | Vitest unit test — attr `"101"` | PASS | ✓ PASS |
| Clip widths use canvasWidth not magic 10000 | Vitest unit test — attr `"800"` | PASS | ✓ PASS |
| Below clip height uses canvasHeight not magic 10000 | Vitest unit test — attr `"650"` | PASS | ✓ PASS |
| Full test suite (143 tests, 21 files) | `npx vitest run` | 143 passed, 0 failed | ✓ PASS |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CANVAS-01 | 08-01-PLAN.md | Red fill clip bug — spurious red above ground line | ✓ SATISFIED | Above clip `height={groundY+1}`, below clip `y={groundY+1}` eliminates stripe; ground line z-ordered after fills in SVG DOM (lines 540-544 TimelineCanvas.tsx) |
| CANVAS-02 | 08-01-PLAN.md | Spline smoothness — kinks/overshoot at steep transitions | ✓ SATISFIED | Centripetal Catmull-Rom alpha=0.5 replaces horizontal Bezier; 2-point straight-line case prevents unnecessary curve on short segments |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | None found | — | — |

No TODOs, FIXMEs, placeholder comments, magic `10000` values, `isBelowGround` dead code, or empty implementations found in any of the three modified files.

---

## Commit Verification

| Commit | Message | Status |
|--------|---------|--------|
| `e9e673c` | feat(08-01): replace spline with Catmull-Rom, fix clip rects, remove isBelowGround | ✓ EXISTS in git log |
| `704128f` | fix(08-01): fix z-order and red fill stripe visual issues | ✓ EXISTS in git log |

---

## Human Verification Required

### 1. No red fill above ground line

**Test:** Start dev server (`cd frontend && npm run dev`), open `http://localhost:3000/company/sdz`, select an objective that stays above ground (e.g., Global Biosimilar Leadership at +3).
**Expected:** Zero red fill visible above the gold ground line — only emerald fill.
**Why human:** SVG clip geometry is code-correct but pixel-level rendering at the exact boundary requires a live browser render to confirm no sub-pixel red bleed.

### 2. Clean fill split at ground line for crossing objectives

**Test:** Same page, select Manufacturing Network Simplification (-2) which crosses the ground line.
**Expected:** Emerald fill stops cleanly at ground line; red fill begins cleanly at ground line. No visible stripe, gap, or overlap artifact.
**Why human:** The stripe fix (below clip `y=groundY+1`) is verified in code and unit test, but the absence of the visual artifact requires browser confirmation.

### 3. Smooth Catmull-Rom curves — no kinks

**Test:** Same page, select an objective with a steep momentum transition (e.g., a sequence going from +3 to -1 in one step).
**Expected:** The curve is smooth and continuous through the transition. No visible kink or sharp corner where momentum changes steeply.
**Why human:** Algorithm correctness and C-segment output is unit tested; subjective smoothness quality is a visual judgment.

### 4. 2-point paths render as clean straight lines

**Test:** If any objective renders with exactly 2 signal nodes visible, confirm it displays as a clean straight line.
**Expected:** Clean straight line (not a curve), consistent with `M x0 y0 L x1 y1` output.
**Why human:** Unit test confirms the string output; rendered appearance in browser requires visual confirmation.

---

## Summary

Phase 08 automated verification is complete with all checks passing. The implementation correctly:

1. Replaces the horizontal Bezier spline with centripetal Catmull-Rom (alpha=0.5) — smooth curves without overshoot
2. Applies a straight-line special case for 2-point paths
3. Fixes the above clip rect to use `height={groundY + 1}` (1px overlap)
4. Fixes the below clip rect to use `y={groundY + 1}` (not `groundY - 1` as originally planned — corrected after visual iteration to eliminate the horizontal stripe artifact)
5. Replaces magic `10000` clip dimensions with actual `canvasWidth`/`canvasHeight` props
6. Removes the dead `isBelowGround` prop from both files
7. Moves the ground line to render after path fills in the SVG DOM (painter model z-order fix)
8. Updates all 14 tests to match the new interface; full 143-test suite passes with zero regressions

The only items requiring human sign-off are the four visual rendering checks that need a live browser render — the underlying code is correct.

---

_Verified: 2026-03-30T21:22:00Z_
_Verifier: Claude (gsd-verifier)_
