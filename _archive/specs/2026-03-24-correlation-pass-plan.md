# Correlation Pass & Autonomous Lifecycle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an automated correlation pass to the Drift research agent that cross-references objectives, detects silent achievements, promotes objectives to graveyard, and adjusts momentum scores — all fully autonomous with no human-in-the-loop.

**Architecture:** After the existing monthly research call (which finds new signals via web search), a second Claude API call runs without web search. It receives all objectives + full signal history for the company and returns lifecycle decisions (graveyard promotions, achievement detections, momentum adjustments) as structured JSON. These are written directly to the DB. The entire pipeline also shifts from draft-based to autonomous execution.

**Tech Stack:** Python 3.11+, Anthropic SDK, Supabase client, Vitest (frontend tests)

**Spec:** `docs/specs/2026-03-24-correlation-pass-autonomous-lifecycle.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `backend/agent.py` | Modify | Core agent: new correlation pass function, autonomous execution, new CLI flag |
| `backend/seed.sql` | Modify | Add `year_end_review` to `signal_classification` enum if missing |
| `frontend/src/lib/types.ts` | No change | Already has all needed types |

All changes are in a single file (`agent.py`) plus a minor schema fix. No new files needed.

---

### Task 1: Switch to Autonomous Execution — Signal Saving

**Files:**
- Modify: `backend/agent.py:120-122` (`save_draft_signal` function)
- Modify: `backend/agent.py:447-466` (`run_monthly` signal saving + status proposals)

- [ ] **Step 1: Rename `save_draft_signal` to `save_signal` and default to published**

In `backend/agent.py`, rename the function and change default:

```python
def save_signal(db: Client, signal: dict) -> str:
    """Save a signal directly as published (autonomous mode)."""
    if "is_draft" not in signal:
        signal["is_draft"] = False
    result = db.table("signals").insert(signal).execute()
    return result.data[0]["id"]
```

Update all call sites of `save_draft_signal` to use `save_signal`:
- `run_intake()` at line ~385: `save_signal(db, sig)` (was `save_draft_signal`)
- `run_monthly()` at line ~451: `save_signal(db, sig)` (was `save_draft_signal`)
- `run_monthly()` status proposals at line ~456: `save_signal(db, ...)` (was `save_draft_signal`)

- [ ] **Step 2: Apply status change proposals directly in `run_monthly`**

In `run_monthly()`, after saving status proposal signals, apply the status change directly to the objectives table. Replace the current status proposal block (lines ~454-466) with:

```python
        # Apply status changes directly (autonomous mode)
        status_proposals = result.get("status_change_proposals", [])
        for prop in status_proposals:
            # Save the signal record
            save_signal(db, {
                "objective_id":     prop["objective_id"],
                "company_id":       company_id,
                "signal_date":      date.today().isoformat(),
                "source_type":      "other",
                "source_name":      "Agent Status Change",
                "classification":   prop.get("exit_manner", "absent"),
                "confidence":       7,
                "excerpt":          prop["rationale"],
                "agent_reasoning":  f"[STATUS CHANGE: {prop['proposed_status']}] {prop['rationale']}",
            })
            # Apply to objective
            obj_update = {"status": prop["proposed_status"]}
            if prop.get("exit_manner"):
                obj_update["exit_manner"] = prop["exit_manner"]
            if prop.get("transparency_score"):
                obj_update["transparency_score"] = prop["transparency_score"]
            if prop["proposed_status"] in ("dropped", "morphed"):
                obj_update["is_in_graveyard"] = True
                obj_update["exit_date"] = date.today().isoformat()
            db.table("objectives").update(obj_update).eq("id", prop["objective_id"]).execute()
```

- [ ] **Step 3: Change agent run terminal status from `pending_review` to `completed`**

In `run_monthly()` around line ~470, change:
```python
        update_agent_run(db, run_id,
            status="completed",  # was "pending_review"
```

In `run_intake()` around line ~391, change:
```python
        update_agent_run(db, run_id,
            status="completed",  # was "pending_review"
```

- [ ] **Step 4: Verify the changes by reading through the modified functions**

Read `run_monthly()` and `run_intake()` end-to-end to confirm all `save_draft_signal` references are gone and status proposals are applied directly.

- [ ] **Step 5: Commit**

```bash
git add backend/agent.py
git commit -m "feat(agent): switch to autonomous execution — no more draft signals"
```

---

### Task 2: Add `get_signals_for_company` DB Helper

**Files:**
- Modify: `backend/agent.py` (add new function after existing DB helpers, around line ~158)

- [ ] **Step 1: Add the helper function**

Insert after `mark_company_researched()`:

```python
def get_signals_for_company(db: Client, company_id: str) -> list[dict]:
    """Return all published signals for a company, ordered chronologically."""
    result = (
        db.table("signals")
        .select("*, objectives!inner(title)")
        .eq("company_id", company_id)
        .eq("is_draft", False)
        .order("signal_date")
        .execute()
    )
    return result.data
```

- [ ] **Step 2: Commit**

```bash
git add backend/agent.py
git commit -m "feat(agent): add get_signals_for_company helper"
```

---

### Task 3: Build the Correlation Pass Prompt

**Files:**
- Modify: `backend/agent.py` (add new function after `build_monthly_prompt`, around line ~338)

- [ ] **Step 1: Add `build_correlation_prompt` function**

```python
def build_correlation_prompt(company: dict, objectives: list[dict], signals: list[dict]) -> str:
    """
    Build the prompt for the correlation & lifecycle pass.
    Receives all objectives and their full signal history.
    Returns structured JSON with objective updates and cross-references.
    """
    # Build objective summaries
    obj_lines = []
    for o in objectives:
        status_tag = "GRAVEYARD" if o.get("is_in_graveyard") else o.get("status", "active").upper()
        obj_lines.append(
            f"  [{status_tag}] {o['title']} (id: {o['id']})\n"
            f"    Subtitle: {o.get('subtitle', 'N/A')}\n"
            f"    Original quote: \"{o.get('original_quote', 'N/A')}\"\n"
            f"    Momentum: {o.get('momentum_score', 0)} | Status: {o.get('status')} | Graveyard: {o.get('is_in_graveyard', False)}\n"
            f"    Exit manner: {o.get('exit_manner', 'N/A')} | Verdict: {o.get('verdict_text', 'None')}"
        )
    obj_block = "\n".join(obj_lines)

    # Build signal history grouped by objective
    sig_by_obj = {}
    for s in signals:
        obj_title = s.get("objectives", {}).get("title", "Unknown")
        oid = s["objective_id"]
        if oid not in sig_by_obj:
            sig_by_obj[oid] = {"title": obj_title, "signals": []}
        excerpt = (s.get("excerpt") or "")[:150]
        sig_by_obj[oid]["signals"].append(
            f"    {s['signal_date']} | {s['classification'].upper()} (conf: {s.get('confidence', '?')}) | {excerpt}"
        )

    sig_lines = []
    for oid, data in sig_by_obj.items():
        sig_lines.append(f"  {data['title']}:")
        sig_lines.extend(data["signals"])
    sig_block = "\n".join(sig_lines)

    return textwrap.dedent(f"""
        You are a strategic accountability analyst for Drift.
        Drift tracks what companies publicly commit to — and monitors how that language changes,
        weakens, or disappears over time.

        COMPANY: {company['name']}
        INITIATIVE: {company['initiative_name']} {company.get('initiative_subtitle', '')}
        TODAY: {date.today().isoformat()}

        ALL TRACKED OBJECTIVES:
        {obj_block}

        COMPLETE SIGNAL HISTORY (chronological per objective):
        {sig_block}

        YOUR TASK — CORRELATION & LIFECYCLE PASS:

        Perform three sequential analyses:

        PASS 1 — CROSS-REFERENCE SCAN:
        For each signal excerpt, check whether the language implicitly references the outcome
        of a DIFFERENT objective. Examples:
        - "Our modernised manufacturing network" in a margin discussion = evidence that a
          manufacturing simplification objective may have been silently completed
        - "Following the successful integration of our MENA operations" = evidence that a
          graveyard entry may actually have been achieved
        Flag all cross-references you find.

        PASS 2 — LIFECYCLE EVALUATION:
        For each NON-GRAVEYARD objective, evaluate the full signal trajectory and decide:

        Graveyard promotion rules:
        - 3+ consecutive softened/reframed/absent signals = graveyard candidate (exit_manner: "silent" or "phased")
        - Cross-reference evidence of silent completion = status: "achieved", exit_manner: "achieved", is_in_graveyard: FALSE
        - Explicit "achieved" classification in own signals = status: "achieved", exit_manner: "achieved", is_in_graveyard: FALSE
        - "retired_transparent" signal = is_in_graveyard: true, exit_manner: "transparent"
        - "retired_silent" confirmed = is_in_graveyard: true, exit_manner: "silent"
        - Morphed into successor = is_in_graveyard: true, exit_manner: "morphed", set successor_objective_id to the UUID of the successor objective

        CRITICAL: Achieved objectives are NOT graveyard entries. The graveyard is exclusively
        for failures (silent drops, phased outs, morphs). A silently achieved objective is a
        SUCCESS — it gets status "achieved" and is_in_graveyard: false.

        Momentum score guidelines (evaluate holistically, not as rigid formulas):
        - Recent "reinforced" with high confidence: push up (+1 per strong reinforcement, cap at +4)
        - "softened": pull down by 1
        - "reframed": pull down by 1
        - "absent": pull down by 2 (silence is loud)
        - "achieved": set to +4 (Orbit)
        - "retired_silent": set to -4 (Buried)
        - "retired_transparent": set to -4
        Consider recency, confidence, and context. One strong reinforcement after two softenings
        may warrant a higher score than arithmetic suggests.

        PASS 3 — VERDICT WRITING:
        For any objective transitioning to graveyard, write a verdict_text paragraph (2-4 sentences).
        Editorial voice: fact-based, evidenced, precise, not sensational. Economist x Vanity Fair tone.
        For achieved objectives (including silent achievements), write a verdict noting how it was
        communicated (or not).

        For existing graveyard entries: do NOT re-evaluate for promotion, but DO include them in
        cross-reference scanning (their signals may contain evidence relevant to active objectives).

        RETURN FORMAT — respond with ONLY valid JSON, no markdown, no preamble:

        {{
          "objective_updates": [
            {{
              "objective_id": "<uuid>",
              "proposed_momentum_score": 3,
              "momentum_reasoning": "Brief explanation of trajectory assessment",
              "proposed_status": "active|watch|drifting|achieved|dropped|morphed|null (null = no change)",
              "is_in_graveyard": false,
              "exit_manner": "silent|phased|morphed|transparent|achieved|null",
              "exit_date": "YYYY-MM-DD or null",
              "transparency_score": "very_low|low|medium|high|null",
              "verdict_text": "Editorial verdict paragraph or null",
              "successor_objective_id": "<uuid of successor if morphed, null otherwise>"
            }}
          ],
          "correlation_signals": [
            {{
              "source_objective_id": "<uuid of objective where language was found>",
              "target_objective_id": "<uuid of objective being referenced>",
              "signal_date": "YYYY-MM-DD",
              "excerpt": "The specific language that references the other objective",
              "interpretation": "Description of what this cross-reference suggests"
            }}
          ],
          "updated_commitment_score": 78,
          "correlation_summary": "1-2 sentence summary of findings"
        }}

        Include an objective_updates entry for EVERY non-graveyard objective, even if no changes
        are proposed (set proposed_status to null, keep proposed_momentum_score as your assessment).
        Only include correlation_signals if you actually found cross-references.
    """).strip()
```

- [ ] **Step 2: Commit**

```bash
git add backend/agent.py
git commit -m "feat(agent): add correlation pass prompt builder"
```

---

### Task 4: Implement `run_correlation_pass`

**Files:**
- Modify: `backend/agent.py` (add new function after `run_monthly`, around line ~493)

- [ ] **Step 1: Add `run_correlation_pass` function**

```python
def run_correlation_pass(claude: anthropic.Anthropic, db: Client, company_id: str, run_id: str) -> dict:
    """
    Correlation & lifecycle pass: cross-references objectives, detects silent
    achievements, promotes to graveyard, adjusts momentum. Fully autonomous.
    """
    company = get_company(db, company_id)
    objectives = get_objectives(db, company_id)
    signals = get_signals_for_company(db, company_id)

    if not objectives:
        print("  ⚠ No objectives — skipping correlation pass.")
        return {}

    print("  → Running correlation pass…")
    prompt = build_correlation_prompt(company, objectives, signals)

    try:
        total_input_tokens = 0
        total_output_tokens = 0

        response = claude.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            messages=[{"role": "user", "content": prompt}],
        )
        total_input_tokens += response.usage.input_tokens
        total_output_tokens += response.usage.output_tokens

        result_text = ""
        for block in response.content:
            if hasattr(block, "text"):
                result_text += block.text

        # Parse with one retry on failure
        try:
            result = json.loads(result_text)
        except json.JSONDecodeError:
            print("  ⚠ Correlation pass returned invalid JSON. Retrying…")
            response = claude.messages.create(
                model=MODEL,
                max_tokens=MAX_TOKENS,
                messages=[
                    {"role": "user", "content": prompt},
                    {"role": "assistant", "content": result_text},
                    {"role": "user", "content": "Your response was not valid JSON. Please respond with ONLY valid JSON, no markdown fences, no preamble."},
                ],
            )
            total_input_tokens += response.usage.input_tokens
            total_output_tokens += response.usage.output_tokens
            result_text = ""
            for block in response.content:
                if hasattr(block, "text"):
                    result_text += block.text
            try:
                result = json.loads(result_text)
            except json.JSONDecodeError:
                print("  ✗ Correlation pass JSON parse failed after retry. Skipping.")
                return {}

        # Apply objective updates
        updates_applied = 0
        for update in result.get("objective_updates", []):
            obj_id = update.get("objective_id")
            if not obj_id:
                continue

            obj_patch = {}
            if update.get("proposed_momentum_score") is not None:
                obj_patch["momentum_score"] = update["proposed_momentum_score"]
            if update.get("proposed_status"):
                obj_patch["status"] = update["proposed_status"]
            if update.get("is_in_graveyard") is not None:
                obj_patch["is_in_graveyard"] = update["is_in_graveyard"]
            if update.get("exit_manner"):
                obj_patch["exit_manner"] = update["exit_manner"]
            if update.get("exit_date"):
                obj_patch["exit_date"] = update["exit_date"]
            if update.get("transparency_score"):
                obj_patch["transparency_score"] = update["transparency_score"]
            if update.get("verdict_text"):
                obj_patch["verdict_text"] = update["verdict_text"]
            if update.get("successor_objective_id"):
                obj_patch["successor_objective_id"] = update["successor_objective_id"]

            if obj_patch:
                db.table("objectives").update(obj_patch).eq("id", obj_id).execute()
                updates_applied += 1

        # Save correlation signals
        corr_signals = result.get("correlation_signals", [])
        for cs in corr_signals:
            target_id = cs.get("target_objective_id")
            if not target_id:
                continue
            save_signal(db, {
                "objective_id":     target_id,
                "company_id":       company_id,
                "signal_date":      cs.get("signal_date", date.today().isoformat()),
                "source_type":      "other",
                "source_name":      "Correlation Pass — Cross-reference",
                "classification":   "achieved" if "achievement" in cs.get("interpretation", "").lower() else "softened",
                "confidence":       6,
                "excerpt":          cs.get("excerpt", ""),
                "agent_reasoning":  f"[CROSS-REF from {cs.get('source_objective_id', '?')[:8]}] {cs.get('interpretation', '')}",
            })

        # Update company commitment score
        new_score = result.get("updated_commitment_score")
        if new_score is not None:
            db.table("companies").update({"overall_commitment_score": new_score}).eq("id", company_id).execute()

        # Append correlation stats to agent run
        corr_tokens = total_input_tokens + total_output_tokens
        corr_cost = round(
            (total_input_tokens * 0.000003) +
            (total_output_tokens * 0.000015), 4
        )

        print(f"  ✓ Correlation: {updates_applied} objectives updated, {len(corr_signals)} cross-references")
        print(f"  → {result.get('correlation_summary', '')}")
        print(f"  → Correlation cost: ~${corr_cost}")

        return {
            "updates_applied": updates_applied,
            "cross_references": len(corr_signals),
            "correlation_tokens": corr_tokens,
            "correlation_cost": corr_cost,
            "summary": result.get("correlation_summary", ""),
        }

    except Exception as e:
        print(f"  ✗ Correlation pass failed: {e}")
        print("  → Monthly signals were saved. Run --correlate to retry.")
        return {}
```

- [ ] **Step 2: Commit**

```bash
git add backend/agent.py
git commit -m "feat(agent): implement run_correlation_pass with cross-reference detection"
```

---

### Task 5: Integrate Correlation Pass into `run_monthly`

**Files:**
- Modify: `backend/agent.py` — the `run_monthly` function (around line ~480-492)

- [ ] **Step 1: Replace the end of `run_monthly` with correlation pass integration**

Remove everything in `run_monthly()` from after the status proposals loop through the end of the try block (the existing `mark_company_researched`, `update_agent_run`, and print statements). Replace with:

```python
        # ── Correlation & Lifecycle Pass ──────────────────────────
        corr_result = run_correlation_pass(claude, db, company_id, run_id)

        # ── Final agent run update ────────────────────────────────
        monthly_cost = round(
            (response.usage.input_tokens * 0.000003) +
            (response.usage.output_tokens * 0.000015), 4
        )
        total_cost = monthly_cost + corr_result.get("correlation_cost", 0)
        combined_summary = result.get("run_summary", "")
        if corr_result.get("summary"):
            combined_summary += " | Correlation: " + corr_result["summary"]

        mark_company_researched(db, company_id, corr_result.get("updated_commitment_score") or score)
        update_agent_run(db, run_id,
            status="completed",
            sources_searched=len(result.get("sources_found", [])),
            signals_proposed=len(new_signals) + len(status_proposals),
            run_summary=combined_summary,
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
            estimated_cost_usd=total_cost,
        )

        print(f"  ✓ {len(new_signals)} new signals, {len(status_proposals)} status proposals")
        print(f"  → {combined_summary}")
        if total_cost:
            print(f"  → Total run cost: ~${total_cost}")
```

- [ ] **Step 2: Verify by reading the complete `run_monthly` function**

Read `run_monthly()` end-to-end to confirm:
- Signals saved with `is_draft: False`
- Status proposals applied directly
- Correlation pass runs after signals saved
- Single `update_agent_run` at the end with `status="completed"`

- [ ] **Step 3: Commit**

```bash
git add backend/agent.py
git commit -m "feat(agent): integrate correlation pass into monthly run flow"
```

---

### Task 6: Add `--correlate` CLI Flag

**Files:**
- Modify: `backend/agent.py` — the `main()` function (lines ~546-582)

- [ ] **Step 1: Add CLI argument and handler**

In the argparse section, add:
```python
    parser.add_argument("--correlate",  help="Run correlation pass for a specific company UUID")
```

In the dispatch section, add before the `elif args.company_id:` block:
```python
    elif args.correlate:
        run_id = create_agent_run(db, args.correlate, triggered_by="manual_correlate")
        corr_result = run_correlation_pass(claude, db, args.correlate, run_id)
        update_agent_run(db, run_id, status="completed",
            run_summary=corr_result.get("summary", ""),
            estimated_cost_usd=corr_result.get("correlation_cost", 0))
```

- [ ] **Step 2: Commit**

```bash
git add backend/agent.py
git commit -m "feat(agent): add --correlate CLI flag for standalone correlation pass"
```

---

### Task 7: Update `seed.sql` Signal Classification Enum

**Files:**
- Modify: `backend/seed.sql` (lines ~20-23)

- [ ] **Step 1: Add `year_end_review` to enum if missing**

Check current enum in `seed.sql` line ~20-23:
```sql
create type signal_classification as enum (
  'stated', 'reinforced', 'softened', 'reframed', 'absent',
  'achieved', 'retired_transparent', 'retired_silent'
);
```

Update to:
```sql
create type signal_classification as enum (
  'stated', 'reinforced', 'softened', 'reframed', 'absent',
  'achieved', 'retired_transparent', 'retired_silent', 'year_end_review'
);
```

- [ ] **Step 2: Commit**

```bash
git add backend/seed.sql
git commit -m "fix(schema): add year_end_review to signal_classification enum"
```

---

### Task 8: Cleanup — Branding and Constants

**Files:**
- Modify: `backend/agent.py`

- [ ] **Step 1: Update `SIGNAL_CLASSES` constant to include `year_end_review`**

Around line ~51-60, add `"year_end_review"` to the list:
```python
SIGNAL_CLASSES = [
    "stated",
    "reinforced",
    "softened",
    "reframed",
    "absent",
    "achieved",
    "retired_transparent",
    "retired_silent",
    "year_end_review",
]
```

- [ ] **Step 2: Update module docstring to reflect autonomous model**

Replace the module docstring (lines ~1-22) — change "writes draft signals back to Supabase for human review" to reflect autonomous execution. Update usage examples to include `--correlate`.

- [ ] **Step 3: Rename "PromiseTrack" to "Drift" in existing prompts**

In `build_intake_prompt` and `build_monthly_prompt`, replace:
- `"You are a strategic accountability researcher for PromiseTrack."` → `"You are a strategic accountability researcher for Drift."`
- `"PromiseTrack tracks what companies publicly commit to"` → `"Drift tracks what companies publicly commit to"`

Use find-and-replace across the file.

- [ ] **Step 4: Commit**

```bash
git add backend/agent.py
git commit -m "chore(agent): rename PromiseTrack to Drift, update docstring and constants"
```

---

### Task 9: End-to-End Verification

- [ ] **Step 1: Read through the complete `agent.py` file**

Read the entire file to verify:
1. No remaining references to `save_draft_signal`
2. `save_signal` defaults to `is_draft: False`
3. `run_monthly` flow: research → save signals → apply status proposals → correlation pass → update agent run
4. `run_correlation_pass` handles JSON parse errors gracefully
5. `--correlate` CLI flag works
6. No broken imports or undefined references

- [ ] **Step 2: Verify the correlation prompt includes all required elements**

Check that `build_correlation_prompt`:
- Includes all objectives (active + graveyard)
- Includes full signal history with excerpts
- Has the three-pass instruction (cross-reference, lifecycle, verdict)
- Has the "achieved != graveyard" rule
- Has momentum guidelines
- Specifies JSON output format

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add backend/agent.py
git commit -m "fix(agent): address issues found during verification"
```

- [ ] **Step 4: Summary commit**

If all looks good and no fixes were needed, skip this step. Otherwise commit the full working state:

```bash
git add -A
git commit -m "feat(agent): correlation pass & autonomous lifecycle — complete implementation"
```
