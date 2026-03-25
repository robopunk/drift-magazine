# Phase 1.2 — Path Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add area fill and ground-line visual split to `TimelinePath` using SVG `clipPath` — emerald fill above `GROUND_Y`, muted red below, dashed stroke below.

**Architecture:** Single path element rendered four times (two fills, two strokes) clipped by two `<clipPath>` rectangles anchored at `groundY`. No bezier intersection math — all zone splitting is purely presentational via SVG clipping. Two new required props: `groundY: number` and `id: string`. Caller (`TimelineCanvas`) passes `GROUND_Y` constant and `objective.id`.

**Tech Stack:** React (SVG), TypeScript, Vitest + React Testing Library

---

## File map

| File | Action | What changes |
|---|---|---|
| `frontend/src/components/company/TimelinePath.tsx` | Modify | New props (`groundY`, `id`), new `toFillPath` helper, new SVG `<g>` structure with `<defs>`, 4 path elements |
| `frontend/src/components/company/TimelineCanvas.tsx` | Modify (line 443) | Add `groundY={GROUND_Y}` and `id={objective.id}` to `<TimelinePath>` callsite |
| `frontend/src/__tests__/components/company/TimelinePath.test.tsx` | Create | 6 tests covering props, fill colors, stroke style |

---

## Task 1: Write failing tests for TimelinePath

**Files:**
- Create: `frontend/src/__tests__/components/company/TimelinePath.test.tsx`

- [ ] **Step 1: Create the test file**

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { TimelinePath } from "@/components/company/TimelinePath";

const points = [
  { x: 10, y: 50 },
  { x: 100, y: 120 },
  { x: 200, y: 40 },
];

const defaultProps = {
  points,
  colour: "#22c55e",
  isBelowGround: false,
  groundY: 100,
  id: "obj-abc123",
};

describe("TimelinePath", () => {
  it("renders without crashing with required props", () => {
    const { container } = render(
      <svg>
        <TimelinePath {...defaultProps} />
      </svg>
    );
    expect(container.querySelector("g")).toBeInTheDocument();
  });

  it("renders two clipPath elements with IDs derived from the id prop", () => {
    const { container } = render(
      <svg>
        <TimelinePath {...defaultProps} />
      </svg>
    );
    const clipPaths = container.querySelectorAll("clipPath");
    expect(clipPaths).toHaveLength(2);
    expect(clipPaths[0]).toHaveAttribute("id", "above-obj-abc123");
    expect(clipPaths[1]).toHaveAttribute("id", "below-obj-abc123");
  });

  it("renders a fill path with var(--primary) for above-ground zone", () => {
    const { container } = render(
      <svg>
        <TimelinePath {...defaultProps} />
      </svg>
    );
    const paths = Array.from(container.querySelectorAll("path"));
    const primaryFill = paths.find((p) => p.getAttribute("fill") === "var(--primary)");
    expect(primaryFill).toBeDefined();
  });

  it("renders a fill path with var(--destructive) for below-ground zone", () => {
    const { container } = render(
      <svg>
        <TimelinePath {...defaultProps} />
      </svg>
    );
    const paths = Array.from(container.querySelectorAll("path"));
    const destructiveFill = paths.find((p) => p.getAttribute("fill") === "var(--destructive)");
    expect(destructiveFill).toBeDefined();
  });

  it("renders an above-ground stroke at strokeWidth 2.5 with no dasharray", () => {
    const { container } = render(
      <svg>
        <TimelinePath {...defaultProps} />
      </svg>
    );
    const paths = Array.from(container.querySelectorAll("path"));
    const aboveStroke = paths.find(
      (p) => p.getAttribute("fill") === "none" && p.getAttribute("stroke-width") === "2.5"
    );
    expect(aboveStroke).toBeDefined();
    expect(aboveStroke!.getAttribute("stroke-dasharray")).toBeNull();
  });

  it("renders a below-ground stroke with stroke-dasharray '6 4'", () => {
    const { container } = render(
      <svg>
        <TimelinePath {...defaultProps} />
      </svg>
    );
    const paths = Array.from(container.querySelectorAll("path"));
    const belowStroke = paths.find((p) => p.getAttribute("stroke-dasharray") === "6 4");
    expect(belowStroke).toBeDefined();
  });
});
```

- [ ] **Step 2: Run the new tests to confirm they fail**

```bash
cd "c:\Users\stefa\OneDrive\AIWorkspace\content\drift magazine\frontend" && npx vitest run src/__tests__/components/company/TimelinePath.test.tsx
```

Expected: FAIL — TypeScript will error on `groundY` and `id` being unknown props. All 6 tests should fail or error.

---

## Task 2: Implement TimelinePath

**Files:**
- Modify: `frontend/src/components/company/TimelinePath.tsx`

- [ ] **Step 1: Replace the entire file with the new implementation**

```tsx
"use client";

interface Point { x: number; y: number; }

interface TimelinePathProps {
  points: Point[];
  colour: string;
  isBelowGround: boolean;
  groundY: number;
  id: string;
}

function toSmoothPath(points: Point[]): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx1 = prev.x + (curr.x - prev.x) * 0.4;
    const cpx2 = prev.x + (curr.x - prev.x) * 0.6;
    d += ` C ${cpx1} ${prev.y}, ${cpx2} ${curr.y}, ${curr.x} ${curr.y}`;
  }
  return d;
}

function toFillPath(points: Point[], groundY: number): string {
  const spline = toSmoothPath(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${spline} L ${last.x} ${groundY} L ${first.x} ${groundY} Z`;
}

export function TimelinePath({ points, colour, groundY, id }: TimelinePathProps) {
  if (points.length < 2) return null;
  const splinePath = toSmoothPath(points);
  const fillPath = toFillPath(points, groundY);
  const aboveId = `above-${id}`;
  const belowId = `below-${id}`;
  return (
    <g>
      <defs>
        <clipPath id={aboveId}>
          <rect x={0} y={0} width={10000} height={groundY} />
        </clipPath>
        <clipPath id={belowId}>
          <rect x={0} y={groundY} width={10000} height={10000} />
        </clipPath>
      </defs>
      {/* Fill — above ground (emerald) */}
      <path
        d={fillPath}
        fill="var(--primary)"
        fillOpacity={0.08}
        stroke="none"
        clipPath={`url(#${aboveId})`}
      />
      {/* Fill — below ground (destructive red) */}
      <path
        d={fillPath}
        fill="var(--destructive)"
        fillOpacity={0.08}
        stroke="none"
        clipPath={`url(#${belowId})`}
      />
      {/* Stroke — solid above ground */}
      <path
        d={splinePath}
        fill="none"
        stroke={colour}
        strokeWidth={2.5}
        clipPath={`url(#${aboveId})`}
      />
      {/* Stroke — dashed below ground */}
      <path
        d={splinePath}
        fill="none"
        stroke={colour}
        strokeWidth={2}
        strokeDasharray="6 4"
        clipPath={`url(#${belowId})`}
      />
    </g>
  );
}
```

- [ ] **Step 2: Run the TimelinePath tests to confirm they pass**

```bash
cd "c:\Users\stefa\OneDrive\AIWorkspace\content\drift magazine\frontend" && npx vitest run src/__tests__/components/company/TimelinePath.test.tsx
```

Expected: All 6 tests PASS.

Note: TypeScript may show errors in `TimelineCanvas.tsx` because `groundY` and `id` are now required. This is expected — fix in Task 3.

---

## Task 3: Update TimelineCanvas callsite and verify full suite

**Files:**
- Modify: `frontend/src/components/company/TimelineCanvas.tsx` (line 443)

- [ ] **Step 1: Update the TimelinePath call in TimelineCanvas**

Locate line 443 in `TimelineCanvas.tsx`:
```tsx
<TimelinePath points={points} colour={colour} isBelowGround={isBelowGround} />
```

Replace with:
```tsx
<TimelinePath points={points} colour={colour} isBelowGround={isBelowGround} groundY={GROUND_Y} id={objective.id} />
```

`GROUND_Y` is already defined at line 40 of the same file. `objective.id` is available from the `objectiveNodeSets.map` destructuring at line 436.

- [ ] **Step 2: Run the full test suite**

```bash
cd "c:\Users\stefa\OneDrive\AIWorkspace\content\drift magazine\frontend" && npx vitest run
```

Expected: All tests pass (92 existing + 6 new = 98 total). Zero TypeScript errors.

- [ ] **Step 3: Commit**

```bash
cd "c:\Users\stefa\OneDrive\AIWorkspace\content\drift magazine" && git add frontend/src/components/company/TimelinePath.tsx frontend/src/components/company/TimelineCanvas.tsx "frontend/src/__tests__/components/company/TimelinePath.test.tsx" && git commit -m "$(cat <<'EOF'
feat(timeline): add area fill and ground-line visual split to TimelinePath

SVG clipPath approach: emerald fill above GROUND_Y, muted red below,
dashed stroke in below-ground zone. Closes Phase 1.2 of visual roadmap.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 4: Update roadmap — mark Phase 1.2 as delivered**

In `2026-03-25-2121-drift-visual-and-intelligence-roadmap.md`, change:
```
| 1.2 | Path — organic spline, area fill, dashed below-ground style | `TimelinePath.tsx` | ⬜ Pending |
```
to:
```
| 1.2 | Path — organic spline, area fill, dashed below-ground style | `TimelinePath.tsx` | ✅ Delivered |
```

Also append to the delivery log:
```
| 2026-03-25 | 1.2 | Area fill (clipPath split), emerald above / red below, dashed stroke below ground |
```

- [ ] **Step 5: Commit roadmap update**

```bash
cd "c:\Users\stefa\OneDrive\AIWorkspace\content\drift magazine" && git add "2026-03-25-2121-drift-visual-and-intelligence-roadmap.md" && git commit -m "$(cat <<'EOF'
docs: mark Phase 1.2 as delivered in visual roadmap

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```
