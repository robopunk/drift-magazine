---
phase: 08-path-fill-fixes
plan: 04
subsystem: frontend/timeline
tags: [timeline, graveyard, node-truncation, editorial-correctness]
requires: []
provides: [terminal-node-truncation]
affects: [TimelineCanvas, objectiveNodeSets memo]
tech-stack-added: []
tech-stack-patterns: [while/pop tail-truncation on sorted node array]
key-files-created: []
key-files-modified:
  - frontend/src/components/company/TimelineCanvas.tsx
decisions:
  - "while/pop loop chosen over Array.filter for tail truncation — O(k) removals on chronologically sorted array, avoids full array allocation"
  - "hasTerminalState moved before truncation block — single declaration, reused by both truncation guard and terminal node push"
  - "latestSignalIdx search moved after truncation — must reflect post-truncation length to avoid pointing at a removed node"
metrics:
  duration: 3 minutes
  completed: "2026-03-31"
  tasks_completed: 1
  files_changed: 1
---

# Phase 08 Plan 04: Terminal Node Truncation Summary

**One-liner:** Tail-truncation of cadence nodes at `exit_date` using while/pop so buried objectives show no post-exit trajectory.

---

## What Was Built

The `objectiveNodeSets` memo in `TimelineCanvas.tsx` previously generated monthly cadence nodes from the first signal all the way to today — even for objectives with a terminal state (buried, phased out, etc.). The dashed cadence line for graveyard entries extended from their `exit_date` to the present, which is editorially incorrect: a buried objective has no trajectory beyond its exit.

### Fix applied

Inside `objectiveNodeSets`, immediately after x/y position computation and before `latestSignalIdx` search, a tail-truncation block was added:

```typescript
// Truncate cadence nodes at exit_date for terminal objectives
// so the path does not extend beyond the terminal event
const hasTerminalState = obj.terminal_state || (obj.is_in_graveyard === true);
if (hasTerminalState && obj.exit_date) {
  const exitMs = new Date(obj.exit_date).getTime();
  while (monthlyNodes.length > 0 && monthlyNodes[monthlyNodes.length - 1].month.getTime() > exitMs) {
    monthlyNodes.pop();
  }
}
```

The code order in `objectiveNodeSets` is now:
1. `generateMonthlyNodes` — generates all nodes from first signal to today
2. Window filter — removes nodes before `windowStartMs`
3. x/y position computation
4. **Truncation at `exit_date`** (new)
5. `latestSignalIdx` search (moved after truncation)
6. Terminal node push — appends the marker at `exit_date` position

Non-terminal objectives are completely unaffected: `hasTerminalState` is false, so the truncation block is skipped.

---

## Verification

- `grep -c "exitMs"` → 2 (declaration + comparison)
- `grep -c "monthlyNodes.pop"` → 1
- `npx vitest run` → 146 tests passed, 0 failures

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Known Stubs

None.

---

## Self-Check: PASSED

- `frontend/src/components/company/TimelineCanvas.tsx` — modified, exists
- Commit `aa607cb` — verified in git log
