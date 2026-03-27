---
phase: 03-production-monetization-gate
plan: 01
subsystem: infra
tags: [github-actions, python, pytest, tdd, draft-enforcement, ci-cd]

# Dependency graph
requires:
  - phase: 02-quality-measurement-maturity
    provides: agent.py with Firecrawl integration and signal detection logic
provides:
  - Unconditional is_draft=True enforcement in save_signal (D-01 compliance)
  - GitHub Actions workflow for bi-weekly agent scheduling (D-06, D-07, D-08)
  - Three new unit tests verifying draft enforcement under all input conditions
affects:
  - 03-02-admin-auth
  - 03-03-runbook-monetization

# Tech tracking
tech-stack:
  added: [github-actions]
  patterns: [tdd-red-green, unconditional-draft-enforcement, cron-scheduling]

key-files:
  created:
    - .github/workflows/agent-run.yml
  modified:
    - backend/agent.py
    - backend/tests/test_agent.py

key-decisions:
  - "save_signal unconditionally sets is_draft=True — no conditional check, caller cannot override"
  - "Cron: 1st and 15th of month at 06:00 UTC — bi-weekly per D-06"
  - "workflow_dispatch with optional company_id enables on-demand runs per D-08"
  - "GitHub's built-in failure email used for alerting (no external service needed) per D-07"

patterns-established:
  - "Draft enforcement: always overwrite, never check — prevents accidental publishing"
  - "TDD: write RED test first, commit, then fix and commit GREEN"

requirements-completed: [D-01, D-02, D-06, D-07, D-08]

# Metrics
duration: 15min
completed: 2026-03-27
---

# Phase 3 Plan 01: Draft Enforcement Fix and GitHub Actions Workflow Summary

**save_signal unconditional is_draft=True bug fix with TDD and GitHub Actions bi-weekly cron workflow for production agent scheduling**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-27T16:00:00Z
- **Completed:** 2026-03-27T16:13:37Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Fixed critical is_draft enforcement bug: save_signal now unconditionally sets is_draft=True, closing the path for callers to publish signals without human review
- Added 3 new TDD-verified unit tests (total: 26 tests, all passing) covering override-False, absent-key, and preserve-True scenarios
- Created .github/workflows/agent-run.yml with bi-weekly cron (1st/15th at 06:00 UTC), manual dispatch with optional company_id, all 4 required secrets, pip caching, and 30-minute timeout

## Task Commits

Each task was committed atomically:

1. **Task 1a (TDD RED): is_draft enforcement tests** - `c636f02` (test)
2. **Task 1b (TDD GREEN): fix save_signal unconditional enforcement** - `d7b27a6` (feat)
3. **Task 2: GitHub Actions workflow** - `aabd235` (feat)

_Note: Task 1 used TDD with separate RED (test) and GREEN (fix) commits._

## Files Created/Modified

- `backend/agent.py` — save_signal: removed conditional `if "is_draft" not in signal` guard, now always sets `signal["is_draft"] = True`
- `backend/tests/test_agent.py` — Added 3 new tests: test_save_signal_always_sets_draft, test_save_signal_sets_draft_when_absent, test_save_signal_preserves_draft_true
- `.github/workflows/agent-run.yml` — New file: bi-weekly cron + workflow_dispatch, Python 3.11, pip cache, 30-min timeout, 4 secrets

## Decisions Made

- Used unconditional assignment (`signal["is_draft"] = True`) rather than conditional guard — eliminates any possibility of caller bypassing draft enforcement
- GitHub built-in email notification used for failure alerting (no Slack/PagerDuty integration needed — keeps zero external dependencies per budget constraint)
- workflow_dispatch `company_id` input marked `required: false` — preserves full-fleet default run while allowing targeted re-runs

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — worktree required `git merge master` to pull in the phase 3 plan commit (4de1e3e) that was committed on master after the worktree was initialized. Resolved by merging before execution.

## User Setup Required

**GitHub Secrets must be configured before the workflow will run.** Add these four secrets to the repository's Settings > Secrets and variables > Actions:

| Secret | Value |
|--------|-------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key (`sk-ant-...`) |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Your Supabase service role key |
| `FIRECRAWL_API_KEY` | Your Firecrawl API key |

Once set, the workflow will trigger automatically on the 1st and 15th of each month at 06:00 UTC, or can be triggered manually via Actions > Drift Agent — Bi-weekly Research Run > Run workflow.

## Next Phase Readiness

- Phase 3 Plan 02 (admin auth) can proceed — agent.py draft enforcement is hardened
- Phase 3 Plan 03 (runbook + monetization gate) can proceed after Plan 02
- GitHub Actions workflow is in place and ready for first production run once secrets are configured

## Self-Check: PASSED

- FOUND: backend/agent.py (save_signal unconditional enforcement)
- FOUND: backend/tests/test_agent.py (3 new D-01 tests, 26 total passing)
- FOUND: .github/workflows/agent-run.yml (cron + workflow_dispatch)
- FOUND: .planning/phases/03-production-monetization-gate/03-01-SUMMARY.md
- FOUND commits: c636f02 (RED tests), d7b27a6 (GREEN fix), aabd235 (GitHub Actions)

---
*Phase: 03-production-monetization-gate*
*Completed: 2026-03-27*
