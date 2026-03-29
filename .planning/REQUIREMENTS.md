# Drift v4.2 — Requirements

**Milestone:** v4.2 Timeline UI Overhaul
**Status:** Active
**Last updated:** 2026-03-29

---

## v4.2 Requirements

### Canvas Geometry

- [ ] **CANVAS-01**: User sees the below-ground area fill anchored exactly at the ground line — no red zone appearing above it
- [ ] **CANVAS-02**: User sees a smooth, continuous timeline path with no overshoot or kinks on steep momentum transitions
- [ ] **CANVAS-03**: User sees all nodes, labels, and ticks fully visible — nothing clipped at any canvas edge

### Node Layer

- [ ] **NODE-01**: User sees node icons and emoji markers at a legible size (18–22px font, proportional radii — not the current 7–12px)
- [ ] **NODE-02**: User sees stacked labels when three or more objectives share the same x-position — no text collisions
- [ ] **NODE-03**: User reads node content (stage label, date) clearly at default zoom level

### Tooltip

- [ ] **TOOLTIP-01**: User sees the signal tooltip in full — never clipped at the left or right canvas edge

### Graveyard Zone

- [ ] **ZONE-01**: User sees the below-ground territory with a diagonal hatch SVG pattern — visually distinct from above-ground colour wash

---

## Future Requirements (Deferred)

- **Company #2 intake** — agent intake for Roche, Volkswagen, or BP
- **Paywall layer** — Stripe subscription gating for evidence drawers + graveyard records
- **Email alerts** — subscriber digest on ground-line crossing
- **Mobile responsive polish** — enhanced mobile breakpoints and UX
- **Zoom-adaptive LOD** — hide low-priority nodes at wide zoom, reveal on zoom-in

---

## Out of Scope

| Item | Reason |
|------|--------|
| New backend changes | Pure frontend milestone |
| New company data | Monetisation work deferred to v4.3 |
| Paywall / Stripe | Separate milestone |
| Real-time agent monitoring | Bi-weekly schedule is operationally sufficient |
| Floating UI library | Existing portal architecture sufficient; left-edge guard is a 3-line fix |
| textures.js library | SVG `<pattern>` hand-coded in 8 lines — no dependency needed |

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| CANVAS-01 | Phase 8 | Pending |
| CANVAS-02 | Phase 8 | Pending |
| CANVAS-03 | Phase 7 | Pending |
| NODE-01 | Phase 9 | Pending |
| NODE-02 | Phase 9 | Pending |
| NODE-03 | Phase 9 | Pending |
| TOOLTIP-01 | Phase 10 | Pending |
| ZONE-01 | Phase 10 | Pending |
