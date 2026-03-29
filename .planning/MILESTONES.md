# Milestones

## v4.1 Production Readiness (Shipped: 2026-03-29)

**Phases completed:** 3 phases, 8 plans, 22 tasks

**Key accomplishments:**

- frontend/.env.local wired with real Supabase credentials from Vercel project; backend/.env.local scaffolded with correct structure requiring Stefano to fill in 3 secrets (Anthropic, Supabase service key, Firecrawl)
- All 4 GitHub Actions secrets provisioned via gh CLI, agent-run.yml verified with correct secret references, and RUNBOOK.md updated with rotation policy — ENV-03 satisfied.
- Supabase Auth gate on /admin verified operational, dev server running, RUNBOOK admin auth section expanded with dev/prod flows, security notes, and production deployment checklist
- 1. [Rule 1 - Bug] Fixed dotenv not loading .env.local
- Vercel production deployment confirmed live at drift-magazine.vercel.app with Supabase env vars serving real Sandoz data (objectives, signals, momentum) on /company/sdz
- First GitHub Actions workflow_dispatch run produces 22 new draft Sandoz signals via claude-sonnet-4-6 web search, validating SCHED-01, SCHED-02, and OPS-01 with all steps green in Actions UI
- Second GitHub Actions workflow_dispatch run produces 9 more draft signals in 3m1s, confirming consistent reproducible agent execution (SCHED-03), with OPS-02 satisfied via GitHub native owner email notifications
- Full end-to-end pipeline verified: agent-produced signals approved via CLI, all 6 objectives visible on live Vercel frontend at /company/sdz with 92 total signals and correct confidence badges (10/10, 7/10, 8/10)

---

## v4.0 Research Enhancement (Shipped: 2026-03-27)

**Phases:** 1–3 | **Plans:** 8 | **Tasks:** 18

**Key accomplishments:**

- Firecrawl free-tier SDK integrated into `backend/agent.py` with tenacity retry, exponential backoff, graceful fallback to Claude web search, and V5.1 schema migration adding `signals.source_content` column
- Signal confidence scoring algorithm implemented: baseline measured at 6.78/10 (51 Sandoz signals), post-Firecrawl projected at 9.3/10 (+37%) with structured-data and direct-quote quality bonuses
- TDD markdown parsing pipeline: `extract_tables_from_markdown()`, `extract_timestamp_from_markdown()`, `parse_firecrawl_content()` — 16 new tests (23 backend total, all passing)
- `save_signal` unconditionally enforces `is_draft=True` (TDD RED→GREEN), closing any path for callers to bypass human review
- GitHub Actions bi-weekly cron (1st/15th at 06:00 UTC) + manual dispatch via `workflow_dispatch` — zero-cost scheduled agent runs
- Supabase Auth gate on `/admin` page (email/password, `getSession`/`onAuthStateChange`), AdSlot variant system with 4 placements across site
- 408-line operations runbook (`docs/RUNBOOK.md`) with 10 sections covering GitHub Actions setup, signal review, Firecrawl troubleshooting, failure recovery, and 4-condition monetization gate
- Color-coded confidence badges (4-tier semantic scale) added to `ObjectiveCard`, `EvidenceTable`, `EvidenceDrawer` — editorial maturity achieved

**Known Gaps (proceeding without formal audit):**

- No cross-phase integration check or E2E flow verification performed
- Live Firecrawl agent run not verified (Python environment unavailable during execution)
- Test coverage target (95%+) not formally measured; 23 backend + 99 frontend tests passing

**Archive:** [v4.0-ROADMAP.md](milestones/v4.0-ROADMAP.md) | [v4.0-REQUIREMENTS.md](milestones/v4.0-REQUIREMENTS.md)

---
