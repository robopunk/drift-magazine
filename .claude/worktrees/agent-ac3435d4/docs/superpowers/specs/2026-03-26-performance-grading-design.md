# Performance Grading — Sub-project 4 Design

**Created:** 2026-03-26
**Status:** Approved
**Roadmap:** Sub-project 4 (Phases 4.0–4.2)
**Scope:** A 0–100 accountability score and 5-tier label for each company, derived from objective momentum, delivery record, and transparency. Surfaces on the company header and landing cards.

---

## Editorial Intent

The grade answers the question readers actually have: *is this company getting better or worse at following through?* It is trajectory-focused — a company actively recovering earns that back quickly. Historical silent drops leave a mark, but they do not permanently cap the score. The grade is a signal, not a verdict.

---

## Score Formula

**Range:** 0–100, integer. Stored in the existing `overall_commitment_score` column on `companies`.

### Base: Momentum Average (0–100)

Normalise each active objective's `momentum_score` from [-4, +4] to [0, 100]:

```
normalised = (momentum_score + 4) / 8 * 100
```

Compute a weighted average across all active objectives:
- Objectives with a signal in the **last 90 days**: weight = 2
- Objectives with no signal in the last 90 days: weight = 1

This is the base score. If there are no active objectives, base = 50 (neutral).

### Adjustments

| Condition | Adjustment | Cap |
|---|---|---|
| Proved objective (`terminal_state = 'proved'`) | +5 each | +20 max |
| Active objective with no signal > 180 days (stale) | −5 each | −20 max |
| Buried with silent or phased exit | −10 each | −30 max |
| Buried with transparent or morphed exit | −3 each | no cap |

Final score clamped to [0, 100].

### Design rationale

- **Trajectory focus:** Recent signals (90-day window) carry 2× weight. A company turning around sees results within the next research cycle.
- **Delivery credit:** Proved objectives add points — delivery is rewarded, not just momentum language.
- **Silence costs:** Stale active objectives and silent graveyard exits both penalise. Silence is data.
- **Transparency relief:** A company that exits an objective publicly is penalised less than one that drops it silently. Honesty is factored in.

---

## Tier Labels

Stored in new `accountability_tier` column on `companies` (text, nullable, constrained).

| Score | Label |
|---|---|
| 80–100 | Exemplary |
| 60–79 | Solid |
| 40–59 | Watchlist |
| 20–39 | Drifting |
| 0–19 | Compromised |

---

## Schema Changes

### `companies` table

```sql
-- Repurpose existing column (already integer, nullable):
-- overall_commitment_score now stores the 0-100 accountability score

-- New column:
ALTER TABLE companies
  ADD COLUMN accountability_tier text
  CHECK (accountability_tier IN ('Exemplary', 'Solid', 'Watchlist', 'Drifting', 'Compromised'));
```

### `compute_accountability_score(p_company_id uuid)` Postgres function

Pure SQL `VOID` function — updates the `companies` row directly as a side effect. Called by trigger and by agent.

Logic:
1. Compute normalised momentum per active objective, with 90-day recency weighting
2. Sum adjustments (proved bonus, stale penalty, graveyard penalties)
3. Clamp result to [0, 100]
4. Derive tier label from score
5. `UPDATE companies SET overall_commitment_score = ..., accountability_tier = ... WHERE id = p_company_id`

### Trigger: `trg_recompute_accountability`

Fires `AFTER INSERT OR UPDATE` on `objectives` and `signals` tables. Calls `compute_accountability_score(company_id)` for the affected company. Score is always current — no manual refresh needed.

### Agent update

After each `intake_run()` or `update_run()`, call:
```python
db.rpc("compute_accountability_score", {"p_company_id": company_id}).execute()
```

This is a belt-and-suspenders call — the trigger handles it automatically, but an explicit post-run call ensures freshness after bulk signal writes.

---

## Frontend Changes

### `types.ts`

Add `accountability_tier` to `Company` interface:

```typescript
accountability_tier: 'Exemplary' | 'Solid' | 'Watchlist' | 'Drifting' | 'Compromised' | null;
```

### Tier colour mapping (new utility)

```typescript
// lib/accountability.ts
export const TIER_COLOURS = {
  Exemplary:   '#16a34a',
  Solid:       '#65a30d',
  Watchlist:   '#d97706',
  Drifting:    '#ea580c',
  Compromised: '#dc2626',
} as const;
```

### `CompanyHeader.tsx` — grade block (top-right)

Replace the current `overall_commitment_score` display:

```
Current:   "72"  (Lora serif 4xl)
           "/ 100"  (mono xs)

New:       "SOLID"  (IBM Plex Mono, ~1rem, coloured, uppercase, letter-spaced)
           "72 / 100"  (IBM Plex Mono xs, muted-foreground)
           "Accountability"  (IBM Plex Mono 8px label, muted)
```

Tier label is the editorial headline. Number is secondary metadata below it. Both right-aligned.

### `CompanyCard.tsx` — landing card

Replace the thin progress bar and emoji:

```
Current:   Emoji (top-right) + thin green progress bar (bottom)

New:       Top-right: tier label ("SOLID", coloured mono) + score ("72", smaller)
           Remove progress bar
```

The card becomes cleaner — one signal in the top-right corner, not two competing displays.

---

## Data Flow Summary

```
signals/objectives change
        ↓
Postgres trigger fires
        ↓
compute_accountability_score() updates companies row
        ↓
Frontend reads updated score + tier on next page load
```

Agent explicitly calls the function post-run as a redundancy.

---

## What the Grade Does Not Do

- **Not a prediction.** It measures the record, not the future.
- **Not a comparison across sectors.** A pharma company with 3 long-horizon objectives should not be compared to a tech company with 12 short-cycle ones. Future work may add sector-adjusted grades.
- **Not final.** The score recomputes continuously. A company that improves its behaviour sees that reflected immediately.

---

## Test Plan

### Backend (Postgres function)

1. **All active, recent signals:** Score near high end (all 2× weighted)
2. **All active, stale signals:** Stale penalties applied, score pulled down
3. **Mix of proved + buried silent:** Proved bonus partially offsets silent exit penalty
4. **No active objectives:** Base = 50, adjustments only
5. **Tier boundary conditions:** Score exactly 80, 60, 40, 20 — confirm correct tier assigned

### Frontend (React Testing Library)

1. **`CompanyHeader`:** Renders tier label in correct colour; renders score as secondary
2. **`CompanyHeader`:** Renders nothing when `accountability_tier` is null
3. **`CompanyCard`:** Renders tier label top-right; no progress bar rendered
4. **`CompanyCard`:** Tier label absent when `accountability_tier` is null

---

## Roadmap Status Update

| Phase | Scope | Status |
|---|---|---|
| 4.0 | Brainstorm + spec (this document) | ✅ Delivered |
| 4.1 | Schema — `accountability_tier` column, `compute_accountability_score()` function, trigger | ⬜ Pending |
| 4.2 | Frontend — `CompanyHeader` + `CompanyCard` grade display | ⬜ Pending |
