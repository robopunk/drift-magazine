# Correlation Pass & Autonomous Lifecycle Management

**Date:** 2026-03-24
**Status:** Approved
**Scope:** `backend/agent.py`, `backend/seed.sql` (schema), `frontend/src/lib/types.ts`

---

## Problem Statement

Two gaps in the current agent pipeline:

1. **No automated graveyard promotion.** The `is_in_graveyard` flag on objectives is set manually at intake and never updated. Objectives like "Manufacturing Network Simplification" (momentum -2, last signal: `absent`) show clear graveyard trajectories in their signal history but remain classified as active. There is no logic that evaluates signal patterns and promotes objectives to graveyard status.

2. **No silent achievement detection.** The system assumes silence equals drift. But companies can also silently achieve objectives — hitting a target or completing a programme without explicitly announcing it. A passing reference like "our modernised network" in an unrelated context is evidence of silent achievement, but the agent has no mechanism to cross-reference language across objectives.

Both gaps exist because the agent processes each objective in isolation during the monthly research pass. No step exists that looks at the full picture across all objectives and their complete signal histories.

---

## Design Decision

**Approach B: Correlation Pass** — a single dedicated Claude API call at the end of each company's monthly research run. This call receives all objectives and their full signal histories, performs cross-objective semantic correlation, and makes autonomous lifecycle decisions (graveyard promotion, silent achievement detection, momentum adjustment).

**Why this approach:**
- Sees the complete picture across all objectives — required for cross-reference detection
- Single additional API call per company per run (~$0.02-0.05 with Sonnet)
- No web search needed — reasons over data already in the DB
- Higher accuracy than rule-based pattern matching or per-document enrichment

---

## Autonomous Execution Model

**Breaking change:** The agent no longer operates in draft mode. All signals and lifecycle transitions are published immediately.

### Current flow (draft-based)
1. Monthly research → new signals saved as `is_draft: true`
2. Status change proposals saved as special draft signals
3. Human reviews via `--review` / `--approve` / `--reject`

### New flow (autonomous)
1. Monthly research → new signals saved as `is_draft: false`
2. Status change proposals applied directly to objectives table
3. Correlation pass runs → objective updates written directly
4. Agent run marked as `completed` (not `pending_review`)

### Functions affected

**`save_draft_signal()`** → rename to `save_signal()`. Default `is_draft: False`.

**`run_monthly()`** → after saving signals and applying status proposals, call `run_correlation_pass()`. Status changes applied directly to objectives table via `save_objective()`.

**`run_intake()`** → signals saved as published. No draft queue.

**CLI commands** `--review`, `--approve`, `--reject` → remain as manual override tools for corrections, but are no longer part of the primary flow.

**`update_agent_run()`** → terminal status changes from `pending_review` to `completed`.

---

## Correlation Pass Design

### Function signature

```python
def run_correlation_pass(
    claude: anthropic.Anthropic,
    db: Client,
    company_id: str,
    run_id: str,
) -> dict:
```

### Execution point

Called at the end of `run_monthly()`, after all new signals have been saved and status proposals applied. Also callable standalone via new CLI flag `--correlate <company-id>` for manual re-evaluation.

### Input context

The correlation pass receives a structured prompt containing:

**1. All objectives** (active + graveyard) with full metadata:
- `id`, `title`, `subtitle`, `original_quote`
- `status`, `momentum_score`, `is_in_graveyard`
- `exit_manner`, `exit_date`, `transparency_score`, `verdict_text`

**2. Full signal history per objective**, chronologically ordered. Per signal, condensed to:
- `signal_date`, `classification`, `confidence`, `excerpt` (truncated to ~150 chars)

This keeps context manageable. For Sandoz-scale companies (~50 signals across 9 objectives): ~3-4K tokens.

### DB helper

New function `get_signals_for_company(db, company_id)` — returns all published signals (`is_draft = false`) for all objectives of a company, ordered by `signal_date ASC`.

### Three-pass prompt structure

The LLM is instructed to perform three sequential analyses:

**Pass 1 — Cross-reference scan:**
For each signal excerpt, check whether the language implicitly references the outcome of a *different* objective. Examples:
- "Our modernised manufacturing network" in a margin discussion → evidence that Manufacturing Simplification may have been silently completed
- "Following the successful integration of our MENA operations" → evidence that a graveyard entry may actually have been achieved

Flag cross-references with: source objective, target objective, specific language, and interpretation.

**Pass 2 — Lifecycle evaluation:**
For each non-graveyard objective, evaluate the full signal trajectory:

| Pattern | Action |
|---|---|
| 3+ consecutive softened/reframed/absent signals | Graveyard candidate: `exit_manner: silent` or `phased` |
| Cross-reference evidence of silent completion | `status: achieved`, `exit_manner: achieved`, `is_in_graveyard: false` |
| Explicit `achieved` classification in own signals | `status: achieved`, `exit_manner: achieved`, `is_in_graveyard: false` |
| `retired_transparent` signal | `is_in_graveyard: true`, `exit_manner: transparent` |
| `retired_silent` confirmed | `is_in_graveyard: true`, `exit_manner: silent` |
| Objective morphed into successor | `is_in_graveyard: true`, `exit_manner: morphed`, link `successor_objective_id` |

**Critical rule: Achieved objectives are NOT graveyard entries.** The graveyard is exclusively for failures (silent drops, phased outs, morphs). A silently achieved objective is a success — it gets `status: 'achieved'` and `is_in_graveyard: false`.

**Pass 3 — Verdict writing:**
For any objective transitioning to graveyard, generate `verdict_text` — a 2-4 sentence editorial paragraph in Drift voice: fact-based, evidenced, precise, not sensational. Economist x Vanity Fair tone.

For achieved objectives (including silent achievements), generate a `verdict_text` noting the achievement and how it was communicated (or not).

### Momentum score evaluation

The correlation pass also recalculates momentum scores for all objectives. Guidelines provided to the LLM (not rigid formulas — the model evaluates holistically):

| Signal pattern | Momentum effect |
|---|---|
| Recent `reinforced` (high confidence) | Push up (+1 per strong reinforcement, cap +4) |
| `softened` | Pull down by 1 |
| `reframed` | Pull down by 1 |
| `absent` | Pull down by 2 (silence is loud) |
| `achieved` | Set to +4 (Orbit) |
| `retired_silent` | Set to -4 (Buried) |
| `retired_transparent` | Set to -4 |

The LLM considers recency, confidence, and context. One strong reinforcement after two softenings may warrant a higher score than arithmetic suggests.

Output includes `proposed_momentum_score` and `momentum_reasoning` per objective.

### Output format

```json
{
  "objective_updates": [
    {
      "objective_id": "<uuid>",
      "proposed_momentum_score": -4,
      "momentum_reasoning": "Last 3 signals: softened, reframed, absent. No mention in 2 consecutive disclosure cycles.",
      "proposed_status": "dropped",
      "is_in_graveyard": true,
      "exit_manner": "silent",
      "exit_date": "2025-10-22",
      "transparency_score": "very_low",
      "verdict_text": "Manufacturing Network Simplification was stated in the FY2023 Annual Report with a target of 20% site reduction by 2027. The timeline was extended to 2028 in the FY2024 report, then reframed as 'capability specialisation' in H1 2025. By Q3 2025, the objective had disappeared from prepared remarks entirely. No explanation was provided."
    },
    {
      "objective_id": "<uuid>",
      "proposed_momentum_score": 3,
      "momentum_reasoning": "Consistent reinforcement across all disclosure cycles. Strong quantitative evidence.",
      "proposed_status": null,
      "is_in_graveyard": false
    }
  ],
  "correlation_signals": [
    {
      "source_objective_title": "Margin Expansion to 24-26%",
      "target_objective_title": "Manufacturing Network Simplification",
      "signal_date": "2026-02-14",
      "excerpt": "Passing reference to 'optimised production footprint' in margin discussion suggests partial completion of manufacturing simplification, though the objective was never formally closed.",
      "interpretation": "possible_silent_achievement | partial_completion | unrelated"
    }
  ],
  "updated_commitment_score": 78,
  "correlation_summary": "1 objective promoted to graveyard (Manufacturing Network Simplification — silent drop). 1 cross-reference detected between Margin Expansion and Manufacturing contexts."
}
```

### DB writes

After receiving the correlation pass output:

1. **Objective updates:** For each entry in `objective_updates`, update the objectives table:
   - `momentum_score`, `status`, `is_in_graveyard`, `exit_manner`, `exit_date`, `transparency_score`, `verdict_text`
   - Only write fields that are non-null in the output

2. **Correlation signals:** For each cross-reference found, save a published signal:
   - `objective_id` = target objective
   - `source_type` = `other`
   - `source_name` = `Correlation Pass — Cross-reference`
   - `classification` = derived from interpretation (`achieved` if silent achievement, `softened` if partial, etc.)
   - `agent_reasoning` = the full interpretation text

3. **Company update:** Write `updated_commitment_score` to companies table.

4. **Agent run update:** Append correlation stats to the run record (correlation pass token usage, number of updates applied).

---

## Updated Agent Execution Flow

```
run_monthly(claude, db, company_id):
  1. Build monthly prompt
  2. Call Claude with web search → get new signals + status proposals
  3. Save signals directly (is_draft: false)
  4. Apply status change proposals directly to objectives table
  5. Load full signal history (including signals just saved)
  6. run_correlation_pass(claude, db, company_id, run_id)
     a. Build correlation prompt with all objectives + signal history
     b. Call Claude (no web search) → get objective updates + cross-references
     c. Apply objective updates to DB
     d. Save correlation signals
     e. Update company commitment score
  7. Update agent_run record with combined stats (status: completed)
```

---

## Schema Changes

### `seed.sql` / migrations

No new tables needed. Existing schema supports all fields. Changes:

1. **`signal_classification` enum** — add `year_end_review` value if not present (already in `schema.sql` but not in `seed.sql`)

No other enum changes needed. The `resurrected` exit_manner value (commented out in `schema.sql`) is not used by any correlation pass pattern and should remain commented out until a use case arises.

### Error handling

- If the correlation pass API call fails (after monthly signals are already published), log the error but do **not** roll back already-saved signals. The `--correlate` CLI flag allows manual recovery.
- JSON parse failures from the correlation pass should retry once, then log and skip. Monthly signals remain valid regardless.

### `frontend/src/lib/types.ts`

No changes needed — `ExitManner` already includes `'achieved'` and `'resurrected'`. `SignalClassification` already includes `'year_end_review'`.

---

## Cost Estimate

Per company per run (monthly cycle):

| Step | API calls | Est. cost |
|---|---|---|
| Monthly research (existing) | 1 (with web search) | $0.03-0.08 |
| Correlation pass (new) | 1 (no web search) | $0.02-0.05 |
| **Total** | **2** | **$0.05-0.13** |

For 10 tracked companies: ~$0.50-1.30/month. Negligible.

---

## CLI Changes

New flag: `--correlate <company-id>` — run the correlation pass independently for a company (useful for re-evaluating after manual data corrections).

Existing flags `--review`, `--approve`, `--reject` remain functional but are no longer part of the standard flow.

---

## Test Scenarios

The correlation pass should correctly handle these cases from the Sandoz seed data:

1. **Manufacturing Network Simplification** — signal trajectory (stated → softened → softened → reframed → absent) should trigger graveyard promotion with `exit_manner: silent`, `transparency_score: very_low`

2. **Margin Expansion to 24-26%** — signals show the target was reached ("24.4% for the full year, within our target range"). Should be evaluated for `status: achieved` with `exit_manner: achieved`, `is_in_graveyard: false`

3. **Cross-reference between Manufacturing and Margin** — if margin expansion signals reference manufacturing efficiency gains, the correlation pass should flag this as a potential partial silent achievement of Manufacturing Simplification

4. **Graveyard entries should not be re-evaluated for promotion** — China Growth Platform, Explicit 2025 Revenue Target, and Branded Generics (MENA) are already in graveyard. The correlation pass should skip lifecycle evaluation for these but still include them in cross-reference scanning.
