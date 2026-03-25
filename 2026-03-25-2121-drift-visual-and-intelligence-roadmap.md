# Drift — Visual & Intelligence Roadmap

**Created:** 2026-03-25 21:21
**Status:** Active
**Model strategy:** Sonnet for brainstorm/plan sessions · Opus for execution

---

## How to use this roadmap

1. **Consent gate:** Never start a phase without the user explicitly saying _"proceed with Phase X.X"_
2. **After delivery:** Update the phase status in this file to `✅ Delivered` and commit the change
3. **Brainstorm phases (X.0):** Run in Sonnet. Output is a spec doc + implementation plan before any code is written
4. **Execution phases:** Run in Opus. Follow the implementation plan produced in the brainstorm phase

---

## Sub-project 1 — Visual Overhaul

> **Scope:** Timeline canvas visual quality, masthead logo, path rendering, node system, axis labels
> **Design decisions locked:**
> - Path: organic natural spline + subtle area fill below the curve
> - Nodes: bold filled markers sitting ON the spline line; vertical dashed tick + stage label float above
> - Logo: 3px green top rule + 36px italic Lora left-aligned wordmark, `h-16` masthead
> - Axis: month labels rendered at top AND bottom of the stage grid

| Phase | Scope | Files | Status |
|---|---|---|---|
| 1.1 | Masthead — green top rule, 36px Lora logo, h-16 height | `Masthead.tsx` | ✅ Delivered |
| 1.2 | Path — organic spline, area fill, dashed below-ground style | `TimelinePath.tsx` | ✅ Delivered |
| 1.3 | Nodes — bold markers on line, vertical tick + stage label above | `TimelineNode.tsx`, `TimelineCanvas.tsx` | ⬜ Pending |
| 1.4 | Axis — duplicate month labels to top of stage grid | `TimelineCanvas.tsx` | ⬜ Pending |

### Phase 1.1 — Masthead detail

- Add a `3px` solid `var(--primary)` bar above the sticky masthead container (separate `div`, not a border)
- Increase logo from `text-xl` → `text-4xl` (36px), Lora italic, period in `var(--primary)`
- Increase masthead height from `h-14` (56px) → `h-16` (64px)
- Nav links: keep small-caps mono style, no other changes
- No tagline in masthead — tagline lives on the hero only
- Sticky offset for TabBar (`top-16`) must be updated to match new masthead height

### Phase 1.2 — Path rendering detail

- Replace current `polyline` / straight-segment rendering in `TimelinePath.tsx` with a cubic bezier spline
- Control points: each segment curves smoothly through its midpoint — no sharp corners
- Area fill: subtle `fill-opacity: 0.08` zone between the spline and the ground line (`y = GROUND_Y`)
- Above ground: fill in `var(--primary)` (emerald)
- Below ground: fill in a muted red/slate to reinforce graveyard territory
- Below-ground path stroke: switch to dashed (`stroke-dasharray`) when trajectory crosses below ground line
- Stroke width: 2.5px (up from 2px)

### Phase 1.3 — Node system detail

- **Origin node:** 10px filled circle in objective colour, concentric outer ring (18px, 20% opacity). Node sits exactly on the spline. Vertical dashed tick rises 24px above node. `Oct 2023` date label at tick top in `font-mono` 8px.
- **Signal node:** 6px filled circle in objective colour, pulse ring (12px, 30% opacity). Vertical dashed tick rises 20px above. Stage emoji + label (`FLY +3`) at tick top, 9px mono.
- **Latest signal node:** same as signal but tick is solid (not dashed) and label is bolder — visual emphasis on current position
- **Cadence/stale nodes:** 3px dot, no tick, no label — present on the line but visually quiet
- **Fiscal year-end node:** amber dot on line, no tick unless it carries a signal
- Tick lines: `stroke-dasharray="2,3"`, `var(--border)` colour, 50% opacity
- Remove all `title` attributes (native browser tooltips); `aria-label` already handles accessibility

### Phase 1.4 — Dual axis labels detail

- Existing month labels render at the bottom (already implemented in v3.2)
- Mirror the same `monthLabels` memo to render a second set at the top of the stage grid: `y = PADDING_Y - 14`
- January labels: bold + year text, same as bottom
- Regular months: muted, 50% opacity, same as bottom
- No new data or memos required — reuse existing `monthLabels` array

---

## Sub-project 2 — Objective Lifecycle: Achieved

> **Scope:** A new objective status (`achieved`) with its own section in the legend, company page tab, and timeline visual treatment. Parallel to the existing `buried` / Graveyard system.

| Phase | Scope | Status |
|---|---|---|
| 2.0 | Brainstorm + spec session (Sonnet) | ⬜ Pending |
| 2.1 | Schema — `achieved` status, exit fields, migration | ⬜ Pending |
| 2.2 | Frontend — Achieved section in legend + company page tab | ⬜ Pending |
| 2.3 | Timeline — visual treatment for achieved endpoint on canvas | ⬜ Pending |

**Intent for 2.0 brainstorm:** How does an objective become achieved? What evidence is required? How is it displayed differently from buried (which is a failure/silence) vs achieved (which is a success)? What does the achieved endpoint look like on the spline — a star, a checkmark burst, a bold terminus? What metadata does an achieved objective carry (date achieved, final score, transparency rating)?

---

## Sub-project 3 — Committed Duration & Time-aware Tracking

> **Scope:** Objectives tracked against the window the company committed to — not just open-ended momentum. Annual vs. multi-year commitments treated differently. Fairer to companies, more informative to readers.

| Phase | Scope | Status |
|---|---|---|
| 3.0 | Brainstorm + spec session (Sonnet) | ⬜ Pending |
| 3.1 | Schema — `committed_until`, `target_date`, `commitment_type` fields | ⬜ Pending |
| 3.2 | Agent — fiscal-year-aware classification, multi-year window logic | ⬜ Pending |
| 3.3 | Frontend — committed window overlay on timeline, fairness indicators | ⬜ Pending |

**Intent for 3.0 brainstorm:** How do we represent a fiscal-year commitment vs a multi-year one? What does "overdue" look like vs "still within window"? How does the agent determine commitment type from source text? What does the timeline canvas show to indicate the committed window (a shaded zone? a deadline marker?)?

---

## Sub-project 4 — Performance Grading

> **Scope:** A grade derived from how well a company tracks against its committed objectives over time. Surfaces on company header and landing cards. Rewards transparency and delivery; penalises silent drops and drift.

| Phase | Scope | Status |
|---|---|---|
| 4.0 | Brainstorm + spec session (Sonnet) | ⬜ Pending |
| 4.1 | Grading algorithm — inputs, weighting, scale | ⬜ Pending |
| 4.2 | Frontend — grade display on company header and landing card | ⬜ Pending |

**Intent for 4.0 brainstorm:** What inputs go into the grade (momentum trajectory, silence periods, graveyard exits, transparency scores, achieved count)? What scale (A–F? 0–100? Drift-specific labels)? How does it update as new signals come in? How is it explained to the reader without feeling arbitrary?

---

## Delivery log

| Date | Phase | Notes |
|---|---|---|
| 2026-03-25 | 1.1 | Masthead green rule, 36px logo, h-16, TabBar offset fix |
| 2026-03-25 | 1.2 | Area fill (clipPath split), emerald above / red below, dashed stroke below ground |
