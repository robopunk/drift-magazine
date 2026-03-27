---
phase: 03-production-monetization-gate
plan: "03"
subsystem: infra
tags: [runbook, operations, firecrawl, github-actions, monetization, admin-auth]

# Dependency graph
requires:
  - phase: 03-production-monetization-gate/03-01
    provides: GitHub Actions workflow (agent-run.yml) and hardened is_draft enforcement
  - phase: 03-production-monetization-gate/03-02
    provides: Admin auth gate (Supabase Auth on /admin) and 4 ad slot placements
provides:
  - Complete operations runbook at docs/RUNBOOK.md (D-09, D-10, D-11)
  - Monetization gate criteria with 4 explicit conditions (D-16, D-17)
  - Scaling decision documented as Stefano's manual judgment call (D-18)
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: [ops-runbook, monetization-gate-criteria]

key-files:
  created:
    - docs/RUNBOOK.md
  modified: []

key-decisions:
  - "Monetization gate is public launch readiness, not a revenue milestone (D-16)"
  - "Four explicit gate conditions: editorial maturity, ad slot readiness, 2x clean agent runs, runbook reviewed"
  - "Scaling decision is Stefano's manual call — no automated trigger (D-18)"
  - "Runbook includes GitHub Actions setup inline, not delegated to docs/setup.md (D-11)"
  - "Included --correlate CLI flag (not in plan spec) — discovered in agent.py, added for completeness"

patterns-established:
  - "Runbook pattern: GitHub Actions setup + signal review + Firecrawl troubleshooting + failure recovery + monetization gate in one document"
  - "Monetization gate: qualitative readiness conditions, human decision, no automated trigger"

requirements-completed: [D-09, D-10, D-11, D-16, D-17, D-18]

# Metrics
duration: 8min
completed: 2026-03-27
---

# Phase 3 Plan 03: Operations Runbook and Monetization Gate Summary

**10-section ops runbook at docs/RUNBOOK.md covering GitHub Actions setup, signal review, Firecrawl troubleshooting, failure recovery, and a 4-condition monetization gate for scaling beyond Sandoz**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-27T16:18:31Z
- **Completed:** 2026-03-27T16:26:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created `docs/RUNBOOK.md` (408 lines, 10 sections) — complete operational reference for Drift production operations
- Documented GitHub Actions setup with exact secret names, sources, and security notes (D-11)
- Documented Firecrawl troubleshooting: rate limits, paywalled pages, graceful fallback behavior, and Supabase verification query (D-10)
- Documented monetization gate with 4 explicit, named conditions and the Supabase SQL to verify agent stability (D-16, D-17)
- Documented that scaling to company #2 is Stefano's manual judgment call — no automated trigger (D-18)

## Task Commits

Each task was committed atomically:

1. **Task 1: Write operations runbook at docs/RUNBOOK.md** - `4ed52be` (feat)

## Files Created/Modified

- `docs/RUNBOOK.md` — Complete 10-section operations runbook:
  - Section 1: Overview and companion doc reference
  - Section 2: GitHub Actions Setup (4 secrets, schedule, failure emails)
  - Section 3: Manual Agent Trigger (UI and CLI, including --correlate flag)
  - Section 4: Signal Review Workflow (Admin UI and CLI, expected volumes)
  - Section 5: Firecrawl Troubleshooting (rate limits, paywalls, API errors, verification query)
  - Section 6: Agent Failure Recovery (common errors table, DB check, re-run steps)
  - Section 7: Log Inspection (GitHub Actions, local, database)
  - Section 8: Supabase Query Basics (6 operational queries)
  - Section 9: Admin Authentication Setup (user creation, login, lockout recovery)
  - Section 10: Monetization Gate (4 conditions, decision process, onboarding steps, revenue path)

## Decisions Made

- Included `--correlate` CLI flag in Section 3 even though not in the plan spec — found in `agent.py` `main()` entrypoint. Completeness without it would leave a gap for operators.
- Kept monetization gate Section 10 as entirely qualitative — D-18 explicitly requires Stefano's manual judgment. The SQL verification query is a helper tool, not an automated gate.
- Added revenue path notes in Section 10 referencing `docs/revenue-model.html` — contextually appropriate given the monetization gate topic, not scope creep.

## Deviations from Plan

### Auto-added Content (Rule 2 — Missing Critical Functionality)

**1. [Rule 2 - Missing] Added --correlate CLI command to Section 3**
- **Found during:** Reading agent.py CLI entrypoint (lines 1308–1358)
- **Issue:** Plan spec listed --review, --approve, --reject, --company-id, --intake, and --model but omitted --correlate. The correlation pass is a distinct agent operation that operators need to know about (e.g. after a monthly run failure, `--correlate` lets you re-run the correlation pass without re-running the full research).
- **Fix:** Added `--correlate <company-uuid>` to the CLI commands table in Section 3 with a brief description.
- **Files modified:** docs/RUNBOOK.md
- **Committed in:** 4ed52be (Task 1 commit)

---

**Total deviations:** 1 auto-added (missing critical functionality)
**Impact on plan:** Minor addition. Improves completeness without scope creep. All plan acceptance criteria still pass.

## Known Stubs

None. The runbook is a documentation artifact — no stubs, placeholders, or TODO items.

## Issues Encountered

None.

## User Setup Required

**GitHub Secrets must be configured before the first automated agent run.** The runbook (Section 2) provides the exact steps. Summary:

| Secret | Source |
|--------|--------|
| `ANTHROPIC_API_KEY` | Anthropic Console → API Keys |
| `SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL |
| `SUPABASE_SERVICE_KEY` | Supabase Dashboard → Settings → API → service_role key |
| `FIRECRAWL_API_KEY` | Firecrawl Dashboard → API Keys (optional) |

**Admin user must be created** before the /admin page can be used. Steps in Section 9.

## Next Phase Readiness

Phase 3 is now complete. All three plans delivered:

- **03-01:** is_draft enforcement hardened + GitHub Actions workflow created
- **03-02:** Admin auth gate + 4 ad slot placements
- **03-03:** Operations runbook + monetization gate criteria

Drift v4.0 is production-ready. The Sandoz agent runs bi-weekly on GitHub Actions, all signals require human approval, admin is protected, ads are ready for network integration, and the runbook covers all operational needs.

**Next actions (Stefano's judgment calls):**
1. Configure GitHub Secrets to activate the bi-weekly agent schedule
2. Create admin user in Supabase Dashboard
3. Run 2 clean bi-weekly runs on Sandoz to satisfy the agent stability gate condition
4. When all 4 monetization gate conditions are met: add company #2 via `python backend/agent.py --intake <uuid>`

## Self-Check: PASSED

- FOUND: `docs/RUNBOOK.md` (408 lines, 10 sections)
- FOUND: Commit `4ed52be` — feat(03-03): create operations runbook with monetization gate
- FOUND: All acceptance criteria patterns verified (wc -l, grep checks all passed)

---
*Phase: 03-production-monetization-gate*
*Completed: 2026-03-27*
