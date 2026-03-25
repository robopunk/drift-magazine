# Phase 1.4 — Dual Axis Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mirror the existing bottom month-label row to the top of the stage grid so the reader can orient to the timeline without scrolling to the bottom axis.

**Architecture:** `TimelineCanvas.tsx` already computes a `monthLabels` memo used for the bottom axis. This plan adds a second render pass over that same array, positioning labels at `y = PADDING_Y - 14` (16px, inside the existing 30px top padding). No new state, memos, or data is required.

**Tech Stack:** React, TypeScript, SVG, Vitest + React Testing Library

---

## File map

| File | Change |
|---|---|
| `frontend/src/__tests__/components/company/TimelineCanvas.test.tsx` | Add 1 new test asserting top-axis labels are rendered |
| `frontend/src/components/company/TimelineCanvas.tsx:398–427` | Add top-axis label block immediately after existing bottom-axis block |

---

## Task 1: Add failing test, implement top axis labels, verify

**Files:**
- Modify: `frontend/src/__tests__/components/company/TimelineCanvas.test.tsx`
- Modify: `frontend/src/components/company/TimelineCanvas.tsx`

### Step 1: Add a failing test for the top axis

Open `frontend/src/__tests__/components/company/TimelineCanvas.test.tsx`.

Add this test inside the existing `describe("TimelineCanvas", ...)` block, after the last `it(...)`:

```tsx
it("renders month labels at both top and bottom of the stage grid", () => {
  render(
    <TimelineCanvas objectives={objectives} signals={signals} onNavigateToEvidence={vi.fn()} />
  );
  // signals are at 2025-06-01 so "Jun" appears in the axis labels
  const junLabels = screen.getAllByText("Jun");
  // One at bottom (existing) + one at top (new) = 2
  expect(junLabels.length).toBeGreaterThanOrEqual(2);
});
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
cd frontend && npx vitest run src/__tests__/components/company/TimelineCanvas.test.tsx 2>&1
```

Expected: the new test FAILS — `getAllByText("Jun")` returns 1 element, not ≥ 2.

- [ ] **Step 3: Add the top axis label block to TimelineCanvas.tsx**

Open `frontend/src/components/company/TimelineCanvas.tsx`.

Find the existing bottom axis block (around line 398):

```tsx
                {/* Monthly axis labels */}
                {monthLabels.map(({ x, label, isJanuary, year }, i) => (
                  <g key={`month-${i}`}>
                    <text
                      x={x}
                      y={CANVAS_HEIGHT - AXIS_LABEL_HEIGHT + 18}
```

Add the following block **immediately after the closing `})}` of that block** (before `{/* Today marker */}`):

```tsx
                {/* Top axis labels — mirror of bottom */}
                {monthLabels.map(({ x, label, isJanuary, year }, i) => (
                  <g key={`month-top-${i}`}>
                    <text
                      x={x}
                      y={PADDING_Y - 14}
                      fontSize={9}
                      fill={isJanuary ? "var(--foreground)" : "var(--muted-foreground)"}
                      fontFamily="var(--font-ibm-plex-mono)"
                      textAnchor="middle"
                      fontWeight={isJanuary ? 600 : 400}
                      opacity={isJanuary ? 1 : 0.5}
                    >
                      {label}
                    </text>
                    {isJanuary && (
                      <text
                        x={x}
                        y={PADDING_Y - 4}
                        fontSize={9}
                        fill="var(--primary)"
                        fontFamily="var(--font-ibm-plex-mono)"
                        textAnchor="middle"
                        fontWeight={500}
                      >
                        {year}
                      </text>
                    )}
                  </g>
                ))}
```

`PADDING_Y` is already in scope (`const PADDING_Y = 30`), so month labels render at y=16 and January year labels at y=26 — both within the 30px top padding zone above the stage grid.

- [ ] **Step 4: Run the new test and confirm it passes**

```bash
cd frontend && npx vitest run src/__tests__/components/company/TimelineCanvas.test.tsx 2>&1
```

Expected: all tests in that file PASS.

- [ ] **Step 5: Run full test suite and confirm no regressions**

```bash
cd frontend && npx vitest run 2>&1
```

Expected: all tests pass.

- [ ] **Step 6: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/company/TimelineCanvas.tsx \
        frontend/src/__tests__/components/company/TimelineCanvas.test.tsx
git commit -m "feat(TimelineCanvas): add top axis month labels mirroring bottom axis"
```

---

## Task 2: Update roadmap and push

**Files:**
- Modify: `2026-03-25-2121-drift-visual-and-intelligence-roadmap.md`

- [ ] **Step 1: Mark Phase 1.4 delivered**

In `2026-03-25-2121-drift-visual-and-intelligence-roadmap.md`, find:

```markdown
| 1.4 | Axis — duplicate month labels to top of stage grid | `TimelineCanvas.tsx` | ⬜ Pending |
```

Change to:

```markdown
| 1.4 | Axis — duplicate month labels to top of stage grid | `TimelineCanvas.tsx` | ✅ Delivered |
```

Also append to the Delivery log table:

```markdown
| 2026-03-25 | 1.4 | Top axis month labels, mirrors bottom row, reuses monthLabels memo |
```

- [ ] **Step 2: Commit and push**

```bash
git add "2026-03-25-2121-drift-visual-and-intelligence-roadmap.md"
git commit -m "docs(roadmap): mark Phase 1.4 delivered"
git push
```
