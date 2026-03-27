# Milestones

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
