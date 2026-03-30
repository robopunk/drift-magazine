# Phase 8: Path & Fill Fixes - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix `TimelinePath.tsx` so the area fill splits cleanly at the ground line with no spurious red strip, and the spline curve reads as smooth with no kinks or overshoot. This phase modifies `TimelinePath.tsx` only — no new components, no canvas geometry changes (those are locked in Phase 7).

</domain>

<decisions>
## Implementation Decisions

### Fill Split Technique
- **D-01:** Keep the existing clipPath approach but **overlap the clip rects by 1px** to suppress the anti-aliasing artifact: `aboveId` rect height = `groundY + 1`, `belowId` rect `y` = `groundY - 1`. This is the minimal fix — no structural change to the fill path logic.
- **D-02:** Replace the `width={10000}` and `height={10000}` magic numbers in both clip rects with actual canvas dimensions. Add `canvasWidth` and `canvasHeight` as props to `TimelinePath` (passed from `TimelineCanvas`). Prevents potential right-edge artifacts.

### Spline Algorithm
- **D-03:** Replace the current horizontal cubic Bezier (`toSmoothPath`) with **Catmull-Rom spline** so curves respect neighboring points and produce more natural-looking trajectories across multi-point sequences.
- **D-04:** With exactly **2 points** (single-segment path), Catmull-Rom cannot compute tangents from neighbors — draw a **straight line** for 2-point paths instead of any curve. Simpler and more honest for sparse data.

### isBelowGround Prop
- **D-05:** **Remove the `isBelowGround` prop entirely** from both `TimelinePath` (interface + component) and `TimelineCanvas` (call site). It is dead code — the component determines above/below via clipPath already.

### Claude's Discretion
- Exact Catmull-Rom implementation variant (alpha=0.5 centripetal Catmull-Rom is recommended for uniform appearance)
- Whether to add a `toSmoothPath` helper unit test or inline the verification
- Exact canvasHeight value to pass (can read from CANVAS_HEIGHT constant in TimelineCanvas or derive from PADDING_Y + 8 * STAGE_HEIGHT + AXIS_LABEL_HEIGHT)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Source files (files to modify in this phase)
- `frontend/src/components/company/TimelinePath.tsx` — current fill/clip/spline implementation; sole file to modify
- `frontend/src/components/company/TimelineCanvas.tsx` — call site for TimelinePath; remove isBelowGround prop here; source of canvasWidth/canvasHeight values

### Phase 7 geometry baseline
- `.planning/phases/07-canvas-geometry-foundation/07-CONTEXT.md` — locked canvas constants (GROUND_Y=335, CANVAS_HEIGHT=650, HORIZONTAL_PADDING=40); do not change these
- `.planning/STATE.md` §Key Decisions (07-01) — Phase 7 constant decisions as confirmed

### Project planning
- `.planning/REQUIREMENTS.md` — CANVAS-01, CANVAS-02 acceptance criteria (both addressed in this phase)
- `.planning/ROADMAP.md` §Phase 8 — success criteria and dependency notes

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `toSmoothPath(points)` — current horizontal Bezier function (lines 13–24); replace with Catmull-Rom; keep function name so call sites in `toFillPath` and the stroke paths don't need updating
- `toFillPath(points, groundY)` — constructs fill polygon closed to groundY; keep as-is (logic is correct, only the closure target changes with D-01 clip rect fix)
- `clipPath id={aboveId}` / `clipPath id={belowId}` — rect-based clip regions; update height/y values per D-01, add canvasWidth/canvasHeight per D-02

### Established Patterns
- Component is a pure SVG `<g>` — no hooks, no state; all fixes are pure geometry changes
- Props flow: `TimelineCanvas` computes `GROUND_Y`, `colour`, `points` and passes down — `TimelinePath` renders only
- `isBelowGround` is computed in TimelineCanvas as `objective.momentum_score <= 0` (line 533) and passed but unused — remove from both sides

### Integration Points
- `TimelineCanvas.tsx` line 537 is the only call site for `TimelinePath` — update to remove `isBelowGround` and add `canvasWidth`/`canvasHeight` props
- No other component imports or uses `TimelinePath` directly

</code_context>

<specifics>
## Specific Ideas

No specific visual references — decisions above fully define the expected behaviour.

</specifics>

<deferred>
## Deferred Ideas

- **Icon style and size of nodes** — raised during discuss-phase but belongs in Phase 9 (Node Layer), which is dedicated to node marker styling, sizing, and stagger logic. Captured here so Phase 9 discuss-phase surfaces it.

</deferred>

---

*Phase: 08-path-fill-fixes*
*Context gathered: 2026-03-30*
