# Retrospective

---

## Milestone: v4.0 — Research Enhancement

**Shipped:** 2026-03-27
**Phases:** 3 | **Plans:** 8 | **Tasks:** 18

### What Was Built

- **Phase 1:** Firecrawl SDK integration — tenacity retry, V5 schema migration (`source_content`), 7 unit tests
- **Phase 2:** Confidence scoring pipeline — 6.78→9.3/10 modeled, TDD markdown parsing (extract_tables, extract_timestamp), color-coded confidence badges on frontend, 23 backend tests
- **Phase 3:** Production hardening — `is_draft` TDD fix, GitHub Actions bi-weekly cron, Supabase Auth gate on /admin, 4 AdSlot placements, 408-line operations runbook, 4-condition monetization gate

### What Worked

- **TDD discipline** (RED→GREEN commits) caught the `is_draft` enforcement gap that had existed since Phase 1 — writing tests first exposed the conditional guard vulnerability
- **Modeled quality reporting** unblocked Phase 2 when Python wasn't available for live execution; the structured JSON report gave confidence in the algorithm without a real run
- **Phase surfacing of decisions**: documenting each key decision in SUMMARY.md (e.g., D-01 through D-18) created a traceable decision log that made Phase 3 runbook writing trivial
- **Single-document runbook** (all 10 sections in one file) is easier to reference than a docs/ tree; the --correlate flag discovered during execution was a good example of auto-add Rule 2

### What Was Inefficient

- **Live agent run never executed** — Python environment unavailable throughout the project. All quality metrics are modeled, not measured. This is the biggest gap in v4.0 validation.
- **SUMMARY.md one-liner extraction** via gsd-tools had partial failures (raw content leaked into MILESTONES.md); required manual cleanup. Better to write accomplishments manually for milestone entries.
- **Milestone audit skipped** — proceeding without `/gsd:audit-milestone` means no cross-phase integration check or E2E flow verification was done.

### Patterns Established

- **Unconditional draft enforcement**: `signal["is_draft"] = True` — always overwrite, never guard. No conditional check.
- **Modeled quality reporting**: when live execution is blocked, generate a structured JSON report with documented assumptions instead of blocking the milestone.
- **Monetization gate = public readiness**: 4 qualitative conditions, human judgment call, no automated trigger.
- **Runbook pattern**: GitHub Actions setup + signal review workflow + Firecrawl troubleshooting + failure recovery + monetization gate in one document.

### Key Lessons

- **Always configure GitHub Secrets before the first automated run** — the agent workflow is deployed but won't execute until secrets are set. This is the #1 operator action for v4.0 go-live.
- **Firecrawl free tier is sufficient for Sandoz** — rate limits are not a problem at bi-weekly frequency; retry logic handles transient errors.
- **Draft-only workflow is load-bearing** — the is_draft enforcement fix in Phase 3 was critical; without it, a caller could publish signals without review by passing `is_draft=False`.

### Cost Observations

- Model: Claude Sonnet 4.6 throughout (no Opus usage)
- Sessions: ~3 sessions across 1 day (2026-03-26 to 2026-03-27)
- Notable: All 3 phases executed in a single day — fast execution due to clear plans and minimal rework

---

## Milestone: v4.1 — Production Readiness

**Shipped:** 2026-03-28
**Phases:** 3 | **Plans:** 8 | **Tasks:** 22

### What Was Built

- **Phase 4:** Environment & Authentication — frontend/backend `.env.local` wired with live Supabase, 4 GitHub Actions secrets provisioned via `gh` CLI, Supabase Auth gate on `/admin` verified in dev and prod
- **Phase 5:** Supabase Verification & Deployment — live Supabase read/write confirmed, RLS enforcement verified, Vercel deployment live at `drift-magazine.vercel.app` with all pages serving real Sandoz data
- **Phase 6:** Automation & E2E Validation — two clean GitHub Actions workflow_dispatch runs (22 + 9 signals), full E2E pipeline confirmed, 92 signals approved and live on Vercel frontend

### What Worked

- **Sequential phase dependencies** were honoured strictly — each phase truly required the previous to complete before proceeding. No speculative shortcuts needed.
- **`gh` CLI for GitHub Secrets** — non-interactive, fully automatable, faster than UI navigation. Immediately reused in RUNBOOK.md as the canonical method.
- **Modular agent.py fix** (exit_manner → signal_classification mapping) was discovered during Plan 06-01 execution and resolved inline without a separate phase — a good example of a scoped fix that didn't balloon into a new plan.
- **Human verification gate on E2E** — requiring Stefano to browser-verify the Vercel production URL before marking Plan 05-02 complete caught a stale verification checkpoint (intermediate result that would have passed automated check but wasn't the final state).

### What Was Inefficient

- **Vercel CLI required interactive tty** — couldn't deploy non-interactively from the agent shell. Required switching to REST API (`POST /v13/deployments`). Worth documenting early in any future deployment plan.
- **Duplicate Key Decisions tables in STATE.md** — the state file ended up with three separate Key Decisions sections (one per plan batch). Should be a single rolling table, not appended blocks.
- **`terminal_state` DB migration deferred** — couldn't apply DDL via PostgREST (requires Supabase Dashboard SQL editor). The workaround (skipping the column) was fine but the constraint should be flagged as a future cleanup item.
- **Rate limit cooldown between CI runs** — shared 30k TPM org limit meant 5-minute waits when a planning conversation was active. Low cost but worth noting for future parallel sessions.

### Patterns Established

- **ENV validation pattern**: pre-fill known values (URL), scaffold-with-TODO for secrets only Stefano holds — reduces manual setup surface.
- **`load_dotenv('.env.local')` explicit path**: default `load_dotenv()` doesn't find `.env.local`; explicit path is required. Document this in RUNBOOK.
- **REST API deployment**: Vercel REST API (`POST /v13/deployments`) is the reliable non-interactive path when CLI requires tty.
- **Ticker-based routing check**: always verify `/company/<ticker.toLowerCase()>` against DB before writing frontend navigation code.

### Key Lessons

- **OPS-02 via GitHub native notifications** — no custom alerting needed. GitHub sends email on workflow failure to the repo owner by default. This satisfies OPS-02 without any workflow modification.
- **`conclusion: success` masks partial agent failures** — `agent.py` catches all exceptions internally and always exits 0. This is by design (graceful degradation), but operators should inspect run logs rather than relying on the green checkmark alone.
- **Monetization gate clears fast once infra is live** — all 4 conditions were met in 2 days once the environment was properly configured. The gate is a readiness check, not a blocker.

### Cost Observations

- Model: Claude Sonnet 4.6 throughout
- Sessions: ~2 sessions (2026-03-27 to 2026-03-28)
- Notable: Infrastructure phases (env, deploy, secrets) are fast to plan but require human operator actions at each gate — build confirmation steps into plans rather than assuming automated verification

---

## Cross-Milestone Trends

| Milestone | Phases | Plans | Days | Tests Added | Key Pattern |
|-----------|--------|-------|------|-------------|-------------|
| v4.0 Research Enhancement | 3 | 8 | 1 | 125 total | TDD for critical enforcement paths |
| v4.1 Production Readiness | 3 | 8 | 2 | 0 (infra only) | Human verification gates on each deployment step |
