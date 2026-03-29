# Correlation Pass & Autonomous Lifecycle — Implementation Handoff

**Created:** 2026-03-24 18:30
**Status:** Ready for implementation

---

## Context Summary

Drift is a strategic accountability research platform that tracks what companies publicly commit to and monitors how that language changes over time. The backend agent (`backend/agent.py`) runs monthly research via Claude API with web search, classifying signals per objective.

Two gaps were identified and designed:

1. **No automated graveyard promotion.** Objectives like "Manufacturing Network Simplification" (momentum -2, signal trajectory: stated > softened > softened > reframed > absent) show clear graveyard trajectories but `is_in_graveyard` is never updated automatically.

2. **No silent achievement detection.** The system assumes silence = drift, but companies can silently achieve objectives too. A passing reference like "our modernised network" in an unrelated context is evidence of silent achievement.

**Solution:** A correlation pass — a single additional Claude API call (no web search) after each monthly research run that receives all objectives + full signal history and makes autonomous lifecycle decisions.

**Additional change:** The entire agent shifts from draft-based (human approval required) to fully autonomous execution.

---

## Files

- **Spec:** `docs/specs/2026-03-24-correlation-pass-autonomous-lifecycle.md`
- **Plan:** `docs/specs/2026-03-24-correlation-pass-plan.md`
- **Primary file to modify:** `backend/agent.py`
- **Minor schema fix:** `backend/seed.sql`

---

## Prompt for New Context Window

Copy and paste the following into a new Claude Code session:

---

```
Implement the correlation pass and autonomous lifecycle feature for the Drift research agent. Everything is documented and committed:

- Spec: docs/specs/2026-03-24-correlation-pass-autonomous-lifecycle.md
- Implementation plan: docs/specs/2026-03-24-correlation-pass-plan.md

The plan has 9 tasks with detailed code. Execute them in order using the subagent-driven-development or executing-plans skill. The primary file to modify is backend/agent.py, with a minor enum fix in backend/seed.sql.

Key points:
- Switch from draft-based to fully autonomous execution (no human-in-the-loop)
- Add a correlation pass (single Claude API call, no web search) after monthly research
- The correlation pass cross-references objectives, detects silent achievements, promotes to graveyard, adjusts momentum scores
- Achieved objectives are NOT graveyard entries — graveyard is for failures only
- Add --correlate CLI flag for standalone re-evaluation
- Rename PromiseTrack to Drift in all prompts

Read the plan file first, then execute task by task. Commit after each task.
```

---

## Task Summary (9 tasks)

| # | Task | Files |
|---|------|-------|
| 1 | Switch to autonomous execution — signal saving | `agent.py` |
| 2 | Add `get_signals_for_company` DB helper | `agent.py` |
| 3 | Build the correlation pass prompt | `agent.py` |
| 4 | Implement `run_correlation_pass` | `agent.py` |
| 5 | Integrate correlation pass into `run_monthly` | `agent.py` |
| 6 | Add `--correlate` CLI flag | `agent.py` |
| 7 | Update `seed.sql` signal classification enum | `seed.sql` |
| 8 | Cleanup — branding and constants | `agent.py` |
| 9 | End-to-end verification | `agent.py` |

## Design Decisions (for reference)

- **Approach B chosen:** Single correlation pass after monthly research (vs. rule-based or two-layer)
- **Cost:** ~$0.02-0.05 per company per run for the correlation pass
- **Achieved != graveyard:** Silent achievements get `status: achieved`, `is_in_graveyard: false`
- **Error handling:** Correlation failures don't roll back monthly signals; `--correlate` flag for manual retry
- **JSON parse:** One retry on malformed JSON, then skip
- **Token tracking:** Accumulates across retries for accurate cost reporting
