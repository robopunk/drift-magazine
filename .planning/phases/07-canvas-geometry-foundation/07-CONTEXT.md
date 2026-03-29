# Phase 7: Canvas Geometry Foundation - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix the layout constants in `TimelineCanvas.tsx` so no content (nodes, labels, ticks) clips at canvas edges. This phase changes numerical constants and the cascade of derived values only — no new components, no new interactions, no visual redesign.

</domain>

<decisions>
## Implementation Decisions

### Canvas Height Strategy
- **D-01:** Increase `PADDING_Y` from 30 → 60px to eliminate top-edge clipping of axis labels and node content near the top of the momentum axis.
- **D-02:** Increase `CANVAS_HEIGHT` from 620 → 650px (canvas grows taller, not compressed). `STAGE_HEIGHT` must remain at 68.75px — stage spacing unchanged.
- **D-03:** The outer container formula (`height: CANVAS_HEIGHT + 44`) must stay in sync with the new `CANVAS_HEIGHT`. This is a cascade effect, not a separate change.

### Horizontal Edge Clearance
- **D-04 (Claude's Discretion):** Add horizontal padding to `canvasWidth` so nodes and labels near the first/last date positions are not clipped at the left or right SVG edge. The implementation approach (HORIZONTAL_PADDING constant, viewBox offset, or extra months) is left to the planner.

### Cascade Consistency
- **D-05:** After changing `PADDING_Y` and `CANVAS_HEIGHT`, verify all derived values cascade correctly:
  - `STAGE_HEIGHT = (650 - 60 - 40) / 8 = 68.75px` (same as before)
  - `GROUND_Y = 60 + 4 × 68.75 = 335px` (was 305px — must update all hardcoded uses)
  - The fixed left label column SVG (`height={CANVAS_HEIGHT}`) must also use the new value.

### Claude's Discretion
- Horizontal padding implementation approach (constant, viewBox, or month buffer)
- Whether to add a named constant (e.g., `HORIZONTAL_PADDING`) or inline the value
- Exact px value for horizontal padding (suggest ≥ 40px / 1 MONTH_WIDTH per side)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements fully captured in decisions above.

### Source file (single file modified in this phase)
- `frontend/src/components/company/TimelineCanvas.tsx` — all layout constants defined here; sole file to modify in Phase 7

### Project planning
- `.planning/REQUIREMENTS.md` — CANVAS-03 acceptance criteria
- `.planning/ROADMAP.md` §Phase 7 — success criteria and dependency notes
- `.planning/STATE.md` §Critical Pitfalls — cascade geometry pitfall, clipPath boundary note

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PADDING_Y`, `CANVAS_HEIGHT`, `AXIS_LABEL_HEIGHT`, `STAGE_HEIGHT`, `GROUND_Y`, `MONTH_WIDTH` — all defined as module-level constants (lines 46–52); change them once and all downstream uses update automatically via the formula chain.

### Established Patterns
- All layout values derive from the 5-constant chain: `PADDING_Y` → `STAGE_HEIGHT` → `GROUND_Y`; changing `PADDING_Y` and `CANVAS_HEIGHT` cascades to all dependent geometry automatically.
- Outer container height: `CANVAS_HEIGHT + 44` (line 345) — the 44px is the toolbar, must stay hardcoded but must reference the new `CANVAS_HEIGHT`.
- Fixed left label SVG: `height={CANVAS_HEIGHT}` (line 364) — derives from the constant, no separate change needed.
- Top axis labels render at `y = PADDING_Y - 14` and `y = PADDING_Y - 4` (lines 484, 497) — with PADDING_Y=60 these become y=46 and y=56, well clear of the SVG boundary.

### Integration Points
- `TimelineNode`, `TimelinePath`, `TimelineTooltip`, `CrossingMarker`, `DeadlineFlag` all receive computed `x`, `y` values derived from `scoreToY()` and `GROUND_Y` — they are unaffected by Phase 7 constant changes as long as values cascade correctly.
- Phase 8 (`TimelinePath`) and Phase 9 (`TimelineNode`) depend on Phase 7 being merged and visually verified before they proceed.

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond the decisions above — open to standard constant-update approach.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 07-canvas-geometry-foundation*
*Context gathered: 2026-03-29*
