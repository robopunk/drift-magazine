---
gsd_state_version: 1.0
milestone: v4.2
milestone_name: Timeline UI Overhaul
status: roadmap_approved
last_updated: "2026-03-29T00:00:00.000Z"
last_activity: 2026-03-29
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# Project State — Drift v4.2

**Last Updated:** 2026-03-29
**Status:** Roadmap defined — ready to plan Phase 7
**Phase:** 7 (not started)

## Current Position

Phase: 7 — Canvas Geometry Foundation
Plan: —
Status: Roadmap defined, awaiting `/gsd:plan-phase 7`
Last activity: 2026-03-29 — Roadmap created for v4.2

---

## Progress Bar

```
[          ] 0%
Phase 7: [ ] Canvas Geometry Foundation
Phase 8: [ ] Path & Fill Fixes
Phase 9: [ ] Node Layer
Phase 10: [ ] Tooltip & Zone Polish
```

0 of 4 phases started — v4.2 roadmap defined

---

## v4.2 Milestone Goal

**Eliminate visual bugs, declutter the canvas, and upgrade node quality to match Drift's editorial standard.**

Eight targeted frontend fixes across four phases. No backend changes. No new components required.

---

## Phase Overview

| Phase | Goal | Requirements | Status |
|-------|------|--------------|--------|
| 7 — Canvas Geometry Foundation | Correct padding/dimensions, no edge clipping | CANVAS-03 | Not started |
| 8 — Path & Fill Fixes | Clip bug fixed, smooth spline | CANVAS-01, CANVAS-02 | Not started |
| 9 — Node Layer | Legible nodes, no label collisions, correct sizing | NODE-01, NODE-02, NODE-03 | Not started |
| 10 — Tooltip & Zone Polish | Tooltip edge guard, graveyard hatch | TOOLTIP-01, ZONE-01 | Not started |

---

## Accumulated Context

### What v4.1 Shipped

- Live Supabase connection verified end-to-end (92 signals, 6 objectives, confidence badges)
- Vercel deployed at drift-magazine.vercel.app with production env vars
- GitHub Actions bi-weekly cron confirmed — 2 clean runs
- All 4 monetization gate conditions cleared
- Company #2 intake unblocked

### v4.2 Architecture Context

- All fixes are targeted modifications to 4 existing files: `TimelineCanvas.tsx`, `TimelinePath.tsx`, `TimelineNode.tsx`, `TimelineTooltip.tsx`
- One stack addition required before Phase 8: `npm install d3-shape d3-path`
- `TimelineCanvas.tsx` is the single source of truth for all layout constants — Phase 7 must land and be visually verified before Phase 8 or 9 work proceeds
- Portal tooltip (`createPortal` into `document.body`, `position: fixed`) is architecturally correct — TOOLTIP-01 is a 3-line arithmetic fix, not a structural change
- `@floating-ui/react` not needed — left-edge guard is 3 lines of arithmetic
- `textures.js` not needed — SVG `<pattern>` hand-coded in 8 lines covers ZONE-01
- Phases 8 and 9 can be parallelized once Phase 7 is merged and verified
- Phase 10 is fully independent — can begin at any time

### Critical Pitfalls to Track

1. **Cascading geometry** — `PADDING_Y`, `CANVAS_HEIGHT`, `GROUND_Y`, `STAGE_HEIGHT` all derive from each other. Change Phase 7 constants in a dedicated commit and verify all downstream values cascade before proceeding.
2. **clipPath boundary** — The below-ground clip rect must use `y={groundY + 1}`, never `y={groundY}`. SVG clip regions include the boundary edge.
3. **Emoji font size isolation** — Never change `fontSize` on node emoji without updating `r` (circle radius) and tick geometry proportionally.
4. **Dead prop cleanup** — `TimelinePath` receives `isBelowGround` prop that is never used. Clean up in Phase 8.

### Known Blockers

- **git push mmap error**: `fatal: mmap failed: Invalid argument` on Windows due to corrupted .claude/worktrees worktree index. Workaround: use GitHub Contents API.

---

## Key Decisions

| Decision | Outcome |
|----------|---------|
| Phase numbering continues from v4.1 | Phases 7–10 (not restarting at 1) |
| Canvas geometry constants isolated in Phase 7 | Changing PADDING_Y/CANVAS_HEIGHT after node sizing is tuned causes regression |
| d3-shape for spline interpolation | curveMonotoneX guarantees no overshoot; existing manual bezier approach cannot |
| No @floating-ui/react | TOOLTIP-01 is a 3-line guard — 20 KB library adds no value |
| No textures.js | ZONE-01 solved with 8-line SVG pattern — no dependency needed |
| Phase 10 fully independent | Can start at any time — touches no shared geometry constants |

---

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-29)

**Core value:** Measuring the *language of commitment* — and the silence that follows when it fades.
**Current focus:** v4.2 Timeline UI Overhaul — 4 phases, 8 requirements, pure frontend fixes

## Next Step

Run `/gsd:plan-phase 7` to plan Phase 7: Canvas Geometry Foundation.
