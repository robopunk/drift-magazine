# Drift — Roadmap

## Milestones

- ✅ **v4.0 Research Enhancement** — Phases 1–3 (shipped 2026-03-27) → [archive](milestones/v4.0-ROADMAP.md)
- ✅ **v4.1 Production Readiness** — Phases 4–6 (shipped 2026-03-28) → [archive](milestones/v4.1-ROADMAP.md)
- 🔄 **v4.2 Timeline UI Overhaul** — Phases 7–10 (in progress)

## Phases

<details>
<summary>✅ v4.0 Research Enhancement (Phases 1–3) — SHIPPED 2026-03-27</summary>

- [x] Phase 1: Firecrawl Integration & Testing (2/2 plans) — completed 2026-03-26
- [x] Phase 2: Quality Measurement & Page Maturity (3/3 plans) — completed 2026-03-26
- [x] Phase 3: Production & Monetization Gate (3/3 plans) — completed 2026-03-27

Full details: [milestones/v4.0-ROADMAP.md](milestones/v4.0-ROADMAP.md)

</details>

<details>
<summary>✅ v4.1 Production Readiness (Phases 4–6) — SHIPPED 2026-03-28</summary>

- [x] Phase 4: Environment & Authentication (3/3 plans) — completed 2026-03-27
- [x] Phase 5: Supabase Verification & Deployment (2/2 plans) — completed 2026-03-28
- [x] Phase 6: Automation & End-to-End Validation (3/3 plans) — completed 2026-03-28

Full details: [milestones/v4.1-ROADMAP.md](milestones/v4.1-ROADMAP.md)

</details>

### v4.2 Timeline UI Overhaul (Phases 7–10)

- [x] **Phase 7: Canvas Geometry Foundation** — Correct canvas dimensions, padding, and viewBox so no content is ever clipped
- [ ] **Phase 8: Path & Fill Fixes** — Clip bug and spline smoothness corrected against the verified canvas geometry (gap closure in progress)
- [ ] **Phase 9: Node Layer** — Legible, decluttered node markers with correct sizing and stagger logic
- [ ] **Phase 10: Tooltip & Zone Polish** — Tooltip edge guard and graveyard hatch pattern applied

---

## Phase Details

### Phase 7: Canvas Geometry Foundation
**Goal**: The canvas has correct padding and dimensions so every element is fully visible with no edge clipping
**Depends on**: Nothing (first phase of this milestone)
**Requirements**: CANVAS-03
**Success Criteria** (what must be TRUE):
  1. User scrolls to the leftmost and rightmost points of the timeline and sees no node, label, or tick cut off by the canvas edge
  2. User sees the top score labels (at the top of the momentum axis) fully visible with clearance above them
  3. User sees the ground line and below-ground zone extend to the correct vertical position after the canvas height increase
**Plans**: 1 plan
Plans:
- [x] 07-01-PLAN.md — Update canvas geometry constants (PADDING_Y, CANVAS_HEIGHT, HORIZONTAL_PADDING) and visual verification
**UI hint**: yes

### Phase 8: Path & Fill Fixes
**Goal**: The timeline path is smooth and the area fill correctly splits at the ground line with no spurious red strip
**Depends on**: Phase 7
**Requirements**: CANVAS-01, CANVAS-02
**Success Criteria** (what must be TRUE):
  1. User sees the red (below-ground) area fill starting exactly at the ground line — no red visible above it on clean above-ground trajectories
  2. User sees the emerald (above-ground) area fill stopping exactly at the ground line — no missing fill gap or double-fill at the boundary
  3. User sees a smooth, continuous path curve with no visible kinks or overshoot at steep momentum transitions
**Plans**: 5 plans (08-02 performed outside GSD framework; 08-03 to 08-05 are gap closure from UAT)
Plans:
- [x] 08-01-PLAN.md — Catmull-Rom spline, clip rect 1px overlap fix, canvas dimension props, remove isBelowGround dead code
- [x] 08-02-SUMMARY.md (no PLAN) — FinanceCharts visual redesign: fill opacity, sparse axis, year gridlines, quarterly X-axis, time range pills (6M/1Y/2Y/All) with windowed node filtering. Bug fix: nodes before window start were positioned at negative x, causing paths to appear clipped with no scroll.
- [x] 08-03-PLAN.md — GAP-1: Split fill path so red fill closes at canvasHeight (sits under curve, not above)
- [ ] 08-04-PLAN.md — GAP-2: Truncate post-exit nodes for terminal objectives (stop cadence line at exit_date)
- [ ] 08-05-PLAN.md — GAP-3: Move ground line to first SVG element (lowest layer, crossing markers on top)
**UI hint**: yes

### Phase 9: Node Layer
**Goal**: Node markers are legible at default zoom and do not visually collide when multiple objectives share the same x-position
**Depends on**: Phase 7
**Requirements**: NODE-01, NODE-02, NODE-03
**Success Criteria** (what must be TRUE):
  1. User reads node emoji/icon markers clearly at default zoom — markers are noticeably larger than before and not cramped inside their containing circles
  2. User sees three objectives at the same date rendered with staggered tick heights — labels do not overlap each other
  3. User reads the stage label and date on content-bearing nodes without zooming or squinting at default browser zoom
  4. User sees node circle radii proportional to the larger icon size — no icon overflowing its containing circle
**Plans**: TBD
**UI hint**: yes

### Phase 10: Tooltip & Zone Polish
**Goal**: Tooltips are always fully visible and the graveyard zone is visually authoritative
**Depends on**: Phase 7
**Requirements**: TOOLTIP-01, ZONE-01
**Success Criteria** (what must be TRUE):
  1. User hovers a signal node near the left edge of the canvas and sees the full tooltip — it shifts right rather than clipping off-screen
  2. User hovers a signal node near the right edge and sees the full tooltip without any portion hidden
  3. User sees the below-ground (graveyard) zone with a diagonal hatch pattern — visually distinct from the flat colour wash of the above-ground zone
  4. User perceives the graveyard zone as carrying stronger editorial weight than the above-ground region
**Plans**: TBD
**UI hint**: yes

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Firecrawl Integration & Testing | v4.0 | 2/2 | Complete | 2026-03-26 |
| 2. Quality Measurement & Page Maturity | v4.0 | 3/3 | Complete | 2026-03-26 |
| 3. Production & Monetization Gate | v4.0 | 3/3 | Complete | 2026-03-27 |
| 4. Environment & Authentication | v4.1 | 3/3 | Complete | 2026-03-27 |
| 5. Supabase Verification & Deployment | v4.1 | 2/2 | Complete | 2026-03-28 |
| 6. Automation & End-to-End Validation | v4.1 | 3/3 | Complete | 2026-03-28 |
| 7. Canvas Geometry Foundation | v4.2 | 1/1 | Complete | 2026-03-29 |
| 8. Path & Fill Fixes | v4.2 | 3/4 | In Progress|  |
| 9. Node Layer | v4.2 | 0/? | Not started | - |
| 10. Tooltip & Zone Polish | v4.2 | 0/? | Not started | - |
