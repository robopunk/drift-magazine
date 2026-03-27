# Drift — Sub-project 2: Objective Lifecycle — Proved

**Created:** 2026-03-26
**Status:** Approved
**Approach:** Unified terminal state system (Approach B)

---

## Overview

Drift tracks what companies commit to and what happens to those commitments. Currently, the only terminal state is **buried** — objectives that were dropped, morphed, or silently abandoned. This sub-project introduces **proved** — the positive terminal state for objectives that companies delivered on.

**Editorial identity:**
- **Name:** "Proved"
- **Emoji:** 🏆
- **Tagline:** *"Objectives that companies committed to publicly — and delivered."*
- **Voice:** Factual recognition, not celebration. "They said it. They did it. The record confirms."

This creates a three-state lifecycle: **Active → Proved** (success) or **Active → Buried** (failure/silence).

---

## 1. Schema & Data Model

### New enum

```sql
CREATE TYPE terminal_state AS ENUM ('proved', 'buried');
```

### Objectives table changes

**Remove:**
- `is_in_graveyard boolean DEFAULT false`

**Add:**
- `terminal_state terminal_state` (nullable — `NULL` means active/alive)

**Unchanged fields** (apply to both terminal states):
- `exit_date` — when the terminal event occurred
- `exit_manner` — how it ended (enum already includes `achieved`)
- `exit_source` — source URL for the terminal evidence
- `transparency_score` — how clearly the company communicated it
- `verdict_text` — editorial summary
- `successor_objective_id` — relevant for `morphed` exit manner

### Migration

```sql
-- Step 1: Add new column
ALTER TABLE objectives ADD COLUMN terminal_state terminal_state;

-- Step 2: Migrate existing data
UPDATE objectives SET terminal_state = 'buried' WHERE is_in_graveyard = true;

-- Step 3: Drop old column
ALTER TABLE objectives DROP COLUMN is_in_graveyard;
```

### View updates

**`v_company_summary`:**
- Replace `graveyard_count` with two fields: `proved_count` and `buried_count`
- `proved_count = COUNT(*) WHERE terminal_state = 'proved'`
- `buried_count = COUNT(*) WHERE terminal_state = 'buried'`

**`refresh_company_counts` trigger:**
- `active_objective_count = COUNT(*) WHERE terminal_state IS NULL`
- `proved_count = COUNT(*) WHERE terminal_state = 'proved'`
- `buried_count = COUNT(*) WHERE terminal_state = 'buried'`

**All views and queries:**
- `WHERE is_in_graveyard = true` → `WHERE terminal_state = 'buried'`
- `WHERE is_in_graveyard = false` → `WHERE terminal_state IS NULL`
- New: `WHERE terminal_state = 'proved'`

---

## 2. Frontend Types

### `types.ts` changes

```typescript
// Replace:
//   is_in_graveyard: boolean;
// With:
terminal_state: 'proved' | 'buried' | null;
```

All component filter logic updates accordingly:
- `o.is_in_graveyard` → `o.terminal_state === 'buried'`
- `!o.is_in_graveyard` → `o.terminal_state === null`
- New: `o.terminal_state === 'proved'`

---

## 3. Tab System

### TabBar — 5 tabs

| Order | Tab ID | Label | Count key | Filter |
|---|---|---|---|---|
| 1 | `timeline` | Timeline | — | (canvas view) |
| 2 | `objectives` | Objectives | `objectives` | `terminal_state IS NULL` |
| 3 | `proved` | Proved | `proved` | `terminal_state = 'proved'` |
| 4 | `buried` | Buried | `buried` | `terminal_state = 'buried'` |
| 5 | `evidence` | Evidence | `evidence` | (all signals) |

### Count badge styling

- **Proved count:** emerald tint background (`bg-primary/10`) — positive signal
- **Buried count:** destructive tint background (`bg-destructive/10`) — existing behaviour
- **Objectives/Evidence:** muted background — existing behaviour

### Routing

- `/company/[ticker]?tab=proved` — Proved tab
- All other routes unchanged

---

## 4. ProvedCard Component

New component: `frontend/src/components/company/ProvedCard.tsx`

Parallels `BuriedCard.tsx` with success-oriented editorial tone.

### Structure (top to bottom)

1. **Top colour bar** — 3px height, emerald (`#059669`), full width
2. **Badge row** — left: `🏆 PROVED` in emerald mono uppercase, 15% opacity emerald background. Right: `OBJ ##` in muted mono.
3. **Title** — Lora serif, font-bold, text-base
4. **Date line** — mono, muted: `{first_stated_date} → {exit_date} · {duration} months`
5. **Verdict text** — Lora serif, muted, 1.5 line-height. Editorial summary of the achievement.
6. **Final momentum** — row with "FINAL MOMENTUM" label (mono, muted, uppercase) and large serif numeral in stage colour (e.g., `+3` in green)
7. **Transparency bar** — label "Transparency: {level}" in mono, 2px bar with emerald fill. Width by level: very_low 15%, low 35%, medium 60%, high 90%.
8. **Boardroom Allegory caption** — italic Lora in muted box with 6% emerald background. Caption from final momentum stage.

### Differences from BuriedCard

| Element | ProvedCard | BuriedCard |
|---|---|---|
| Top bar colour | Always emerald `#059669` | Exit manner colour |
| Badge | `🏆 PROVED` (always emerald) | Exit manner label (semantic colour) |
| Date format | Includes calculated duration | Date range only |
| Final momentum | Shown prominently | Not shown |
| Transparency bar | Emerald fill | Exit manner colour fill |
| Caption background | Emerald tint | Stone/grey tint |

---

## 5. Proved Tab Content

### Layout

Located in company page client component, rendered when `activeTab === 'proved'`.

**Structure:**
- **Header block:** 🏆 emoji + "Proved" title (Lora serif, text-2xl) + subtitle paragraph: *"Objectives that companies committed to publicly — and delivered."*
- **Card grid:** `grid grid-cols-1 md:grid-cols-2 gap-6` of `<ProvedCard>` components
- **Empty state:** "No proved objectives yet" — muted text, centred

Same pattern as the existing Buried tab content.

---

## 6. Legend

### Three sections (top to bottom)

1. **"Proved"** — 🏆 section header
   - Lists proved objectives
   - Each shows: objective colour dot + title + "PROVED" label in emerald mono
   - **Selectable** for timeline canvas (checkbox enabled)

2. **"Objectives"** — existing section header
   - Lists active objectives (unchanged)
   - Shows momentum stage label
   - Selectable (existing behaviour)

3. **"Buried"** — ⚰️ section header
   - Lists buried objectives
   - Shows exit manner label
   - **Now selectable** for timeline canvas (behaviour change — currently disabled)

Separators between each section. Max 3 simultaneous selections applies across all sections.

---

## 7. Timeline Canvas

### Terminal objectives on the canvas

When a proved or buried objective is selected in the legend, its full signal history is plotted on the spline — same as active objectives. The trajectory leading to the terminal state is the editorial story.

### Terminal node types

**Proved terminal node (🏆):**
- 12px filled circle in emerald (`#059669`)
- Concentric outer ring (20px, 20% opacity) — same pattern as origin node but larger
- Positioned at `exit_date` on the x-axis, at the objective's final momentum y-position
- Vertical **solid** tick (not dashed) rising 24px above node
- "PROVED" label at tick top in emerald mono 9px
- 🏆 emoji rendered as SVG text element centred on the node position (replaces the filled circle — the emoji IS the node marker)

**Buried terminal node (⚰️):**
- 12px filled circle in stone (`#78716c`)
- Concentric outer ring (20px, 20% opacity)
- Positioned at `exit_date` on the x-axis
- Vertical **solid** tick rising 24px above node
- Exit manner label at tick top in stone mono 9px
- ⚰️ emoji rendered as SVG text element centred on the node position (replaces the filled circle — the emoji IS the node marker)

Both use solid ticks (not dashed) to mark finality — visual distinction from signal nodes.

### Spline behaviour at terminal

- The spline **ends** at the terminal node. No data points after `exit_date` are plotted.
- Area fill stops at the terminal node's x-position (clipPath right edge aligns with terminal).
- The terminal node sits ON the spline endpoint, same as all other nodes.

---

## 8. Agent Automation

Per project requirement: fully autonomous, no human-in-the-loop for data transitions.

### Proved transition

1. Agent detects evidence that an objective has been achieved (earnings call confirmation, published metrics, third-party verification)
2. Agent produces a signal with `classification = 'achieved'`
3. Agent sets on the objective:
   - `terminal_state = 'proved'`
   - `exit_date = signal_date`
   - `exit_manner = 'achieved'`
   - `verdict_text` = auto-generated editorial summary
   - `transparency_score` = assessed from how explicitly the company communicated the achievement
4. No human review gate — transition is immediate

### Symmetry with buried

The agent already handles buried transitions via `retired_silent` / `retired_transparent` / `absent` signals. Proved follows the same pattern:

| Signal classification | Terminal state | Exit manner |
|---|---|---|
| `achieved` | `proved` | `achieved` |
| `retired_silent` | `buried` | `silent` |
| `retired_transparent` | `buried` | `transparent` |

### Reversal (resurrection)

If a subsequent signal contradicts the achievement (company retracts claim, restates metrics), the agent can:
1. Set `terminal_state = NULL` to return the objective to active
2. Clear exit fields or update `exit_manner = 'resurrected'`
3. Log a signal explaining the reversal

Same mechanism already exists for buried → resurrected.

---

## 9. Files affected

### New files
| File | Purpose |
|---|---|
| `frontend/src/components/company/ProvedCard.tsx` | Proved objective card component |

### Modified files
| File | Changes |
|---|---|
| `backend/schema.sql` | New `terminal_state` enum, column migration, view/trigger updates |
| `frontend/src/lib/types.ts` | `is_in_graveyard` → `terminal_state` |
| `frontend/src/components/company/TabBar.tsx` | 5 tabs, proved count badge styling |
| `frontend/src/components/company/TimelineLegend.tsx` | 3 sections, proved/buried selectable |
| `frontend/src/components/company/TimelineCanvas.tsx` | Terminal objective support |
| `frontend/src/components/company/TimelineNode.tsx` | Terminal node types (proved + buried) |
| `frontend/src/components/company/TimelinePath.tsx` | Spline termination at exit_date |
| `frontend/src/components/company/BuriedCard.tsx` | Filter: `is_in_graveyard` → `terminal_state === 'buried'` |
| `frontend/src/app/company/[ticker]/page.tsx` | Filter logic, proved objectives prop |
| `frontend/src/app/company/[ticker]/client.tsx` | Proved tab routing, ProvedCard grid, updated filters |
| `backend/agent.py` | Proved transition logic on `achieved` classification |

### Test files to update
All existing tests that reference `is_in_graveyard` need updating to use `terminal_state`. New tests needed for ProvedCard and proved tab rendering.

---

## 10. What is NOT in scope

- Momentum scale changes (no new stages)
- Colour palette changes
- Typography changes
- Masthead or footer changes
- Landing page changes (company cards don't show proved count yet — future enhancement)
- Search or filtering by terminal state
- Cross-company proved/buried analytics
