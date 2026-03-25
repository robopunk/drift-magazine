# Phase 1.2 — Path Rendering Design

**Created:** 2026-03-25
**Status:** Approved
**Roadmap phase:** 1.2 — Path: organic spline, area fill, dashed below-ground style
**Files affected:** `frontend/src/components/company/TimelinePath.tsx`
**Dependent files (read-only context):** `frontend/src/components/company/TimelineCanvas.tsx`

---

## Overview

Replace the current `TimelinePath` rendering with a visually layered SVG that conveys ground-line semantics: emerald area fill above the ground line, muted red fill below, and a dashed stroke for below-ground trajectory segments. The spline itself already uses cubic beziers (`toSmoothPath`); this phase adds the fill layer and ground-crossing visual treatment.

---

## Design decisions

### Area fill approach — SVG clipPath split (Option A)

One path element. Two `<clipPath>` rectangles anchored to `groundY`. Each fill zone clips the same closed polygon:

- **Above-ground zone:** `clipPath` rect from `y=0` to `y=groundY`. Fill: `var(--primary)`, `fill-opacity="0.08"`.
- **Below-ground zone:** `clipPath` rect from `y=groundY` to `y=canvasHeight`. Fill: `var(--destructive)`, `fill-opacity="0.08"`.

The fill polygon is the spline path closed back along the ground line (forward along the spline, then `L rightX groundY L leftX groundY Z`).

The stroke reuses the same clip technique: solid above, dashed below.

**Why Option A over segment-split (B):** Avoids the mathematical complexity of computing exact cubic bezier intersections at `GROUND_Y`. The visual result is identical — the clip rectangles handle the zone split purely presentationally.

**Why Option A over simple fill (C):** Preserves the editorial signal. A below-ground fill in muted red makes the graveyard territory legible at a glance, consistent with the roadmap spec.

### No new fill colour tokens needed

`var(--primary)` (emerald, `#22c55e` light / `#34d399` dark) and `var(--destructive)` (red, `#dc2626`) are already defined in `globals.css`. No token changes required.

---

## Component interface changes

### `TimelinePath` props

```tsx
interface TimelinePathProps {
  points: Point[];
  colour: string;
  isBelowGround: boolean;  // retained — drives dashed stroke fallback if groundY absent
  groundY: number;         // NEW — y-coordinate of the ground line
  id: string;              // NEW — unique identifier for namespacing clipPath IDs
}
```

`groundY` is passed from `TimelineCanvas` where `GROUND_Y` is already a module-level constant.
`id` is the objective's UUID from Supabase — already available at the callsite.

### `TimelineCanvas` callsite change

```tsx
<TimelinePath
  points={points}
  colour={colour}
  isBelowGround={isBelowGround}
  groundY={GROUND_Y}
  id={objective.id}
/>
```

---

## SVG structure inside `TimelinePath`

```tsx
<g>
  {/* clipPath definitions */}
  <defs>
    <clipPath id={`above-${id}`}>
      <rect x={minX} y={0} width={width} height={groundY} />
    </clipPath>
    <clipPath id={`below-${id}`}>
      <rect x={minX} y={groundY} width={width} height={canvasHeight - groundY} />
    </clipPath>
  </defs>

  {/* Fill — above ground (emerald) */}
  <path
    d={fillPath}
    fill="var(--primary)"
    fillOpacity={0.08}
    stroke="none"
    clipPath={`url(#above-${id})`}
  />

  {/* Fill — below ground (destructive/red) */}
  <path
    d={fillPath}
    fill="var(--destructive)"
    fillOpacity={0.08}
    stroke="none"
    clipPath={`url(#below-${id})`}
  />

  {/* Stroke — solid above ground */}
  <path
    d={splinePath}
    fill="none"
    stroke={colour}
    strokeWidth={2.5}
    clipPath={`url(#above-${id})`}
  />

  {/* Stroke — dashed below ground */}
  <path
    d={splinePath}
    fill="none"
    stroke={colour}
    strokeWidth={2}
    strokeDasharray="6 4"
    clipPath={`url(#below-${id})`}
  />
</g>
```

### Fill polygon construction

```
fillPath = splinePath + ` L ${lastX} ${groundY} L ${firstX} ${groundY} Z`
```

Where `firstX` = x of first point, `lastX` = x of last point.

### ClipPath rectangle dimensions

`minX` and `width` should span the full SVG canvas (0 to canvas width) to avoid edge-clipping artefacts. `canvasHeight` is the SVG `height` prop — not a new constant, already passed through or derivable from the SVG container.

In practice: `minX=0`, `width=10000` (or the actual canvas width if available) — overshooting is harmless with SVG clipping.

---

## Tests

New file: `frontend/src/__tests__/components/company/TimelinePath.test.tsx`

Test scenarios:
1. Renders without crashing with minimal props
2. Renders a `<path>` element with `strokeDasharray` for below-ground stroke
3. Renders a `<path>` element with solid stroke (no `strokeDasharray`) for above-ground
4. Renders two `<clipPath>` elements with IDs derived from the `id` prop
5. Fill paths use `fill="var(--primary)"` and `fill="var(--destructive)"`
6. `strokeWidth` of 2.5 is applied to the above-ground stroke

---

## Scope boundaries

- **In scope:** `TimelinePath.tsx` — SVG fill and stroke rendering only
- **In scope:** `TimelineCanvas.tsx` — pass `groundY` and `id` to `TimelinePath`
- **Out of scope:** Node rendering (Phase 1.3), axis labels (Phase 1.4), crossing markers, tooltips
- **Out of scope:** Mathematical bezier intersection splitting — clipPath handles this visually

---

## Acceptance criteria

1. All existing tests continue to pass (86+ tests, no regressions)
2. New `TimelinePath` tests pass (6 tests)
3. Area fill renders between spline and ground line — emerald above, red below
4. Below-ground stroke is dashed; above-ground stroke is solid at 2.5px
5. `TimelineCanvas` passes `groundY={GROUND_Y}` and `id={objective.id}` without TypeScript errors
6. No hardcoded hex colour values — only CSS variables
