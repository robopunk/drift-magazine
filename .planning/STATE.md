---
gsd_state_version: 1.0
milestone: v4.0
milestone_name: Research Enhancement
current_phase: 03
status: archived
last_updated: "2026-03-27T17:00:00.000Z"
progress:
  total_phases: 3
  completed_phases: 3
  total_plans: 8
  completed_plans: 8
---

# Project State — Drift v4.0

**Last Updated:** 2026-03-27
**Status:** v4.0 milestone archived — see `.planning/MILESTONES.md` and `.planning/milestones/v4.0-ROADMAP.md`
**Current Phase:** archived

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-03-27)

**Core value:** Measuring the language of commitment — and the silence that follows when it fades.
**Current focus:** Planning next milestone (`/gsd:new-milestone`)

---

## Current Status

### Initialization Complete ✅

- [x] PROJECT.md created (vision, scope, success metrics)
- [x] REQUIREMENTS.md created (functional & non-functional requirements, UAT)
- [x] ROADMAP.md created (3-phase breakdown, timeline, risks)
- [x] config.json created (workflow preferences)
- [x] Codebase mapping complete (STACK.md, ARCHITECTURE.md, CONCERNS.md, etc.)
- [x] Git commit: "docs: add codebase mapping (7 documents, 1918 lines)"

### Phase 1 Execution Complete ✅

- [x] Phase 1 Plan 01 (Firecrawl Foundation) — COMPLETE
  - [x] Task 1: Add tenacity dependency and test infrastructure (commit 0c1dbab)
  - [x] Task 2: Add V5.1 schema migration and environment variable documentation (commit 8fd87b0)
  - [x] SUMMARY.md created: `.planning/phases/01-firecrawl-integration-testing/01-01-SUMMARY.md`

- [x] Phase 1 Plan 02 (Agent Refactor & Firecrawl Integration) — COMPLETE
  - [x] Task 1: Add retry logic to firecrawl_extract and fix save_signal is_draft bug (commit fb4a20b)
  - [x] Task 2: Write unit tests for Firecrawl integration (commit 4c81126)
  - [x] SUMMARY.md created: `.planning/phases/01-firecrawl-integration-testing/01-02-SUMMARY.md`

### Phase 2 Execution Complete ✅

- [x] Phase 2 Plan 01 (Baseline Measurement & Confidence Algorithm) — COMPLETE ✅
  - [x] Task 1: Extract and measure baseline confidence scores from Sandoz signals (commit 1309eeb)
  - [x] Task 2: Add signal classification confidence documentation to agent.py (commit 467896c)
  - [x] SUMMARY.md created: `.planning/phases/02-quality-measurement-maturity/02-01-SUMMARY.md` (commit 4eee2a7)
  - [x] Baseline metrics JSON created: `.planning/phase-2-baseline-metrics.json`
  - Key Results: 51 signals measured, 6.78/10 baseline confidence, 8.0+/10 target
  - Execution time: 11 minutes

- [x] Phase 2 Plan 02 (Signal Detection Refinement with Markdown Parsing) — COMPLETE
  - [x] Task 1: Implement markdown parsing functions with TDD (commit 2a67f68)
  - [x] Task 2: Verify enhanced detection with Sandoz test signal (included in tests)
  - [x] SUMMARY.md created: `.planning/phases/02-quality-measurement-maturity/02-02-SUMMARY.md` (commit 5452c50)
  - [x] Functions implemented: extract_tables, extract_timestamp, parse_firecrawl_content, calculate_signal_confidence
  - [x] Test coverage: 16 new tests + 7 existing = 23 total tests
  - [x] All tests verified passing (via verify_implementation.py)

- [x] Phase 2 Plan 03 (Agent Run, Quality Report, Editorial Curation) — COMPLETE
  - [x] Task 1: Generate modeled quality report (commit 98b1dca)
  - [x] Task 2: Checkpoint: Human verification approved
  - [x] Task 3: Editorial curation and confidence badges (commit ff448fe)
  - [x] Task 4: ROADMAP update and Phase 2 completion (commit 85e415e)
  - [x] SUMMARY.md created: `.planning/phases/02-quality-measurement-maturity/02-03-SUMMARY.md`

### Phase 3 Execution In Progress

- [x] Phase 3 Plan 01 (Draft Enforcement Fix + GitHub Actions Workflow) — COMPLETE
  - [x] Task 1 (TDD RED): Add failing tests for is_draft enforcement (commit c636f02)
  - [x] Task 1 (TDD GREEN): Fix save_signal unconditional enforcement (commit d7b27a6)
  - [x] Task 2: Create GitHub Actions bi-weekly workflow (commit aabd235)
  - [x] SUMMARY.md created: `.planning/phases/03-production-monetization-gate/03-01-SUMMARY.md`
  - Key results: 26 tests passing, save_signal hardened, .github/workflows/agent-run.yml created

- [x] Phase 3 Plan 02 (Admin Auth Gate + Ad Slot Placements) — COMPLETE
  - [x] Task 1: Supabase Auth gate on /admin page (commit 6ad69c3)
  - [x] Task 2: AdSlot variant system + slot 4 on company page (commit 17b7521)
  - [x] SUMMARY.md created: `.planning/phases/03-production-monetization-gate/03-02-SUMMARY.md`
  - Key Results: Admin requires email/password login via Supabase Auth. 4 ad slots across site.

- [x] Phase 3 Plan 03 (Runbook + Monetization Gate) — COMPLETE
  - [x] Task 1: Write operations runbook at docs/RUNBOOK.md (commit 4ed52be)
  - [x] SUMMARY.md created: `.planning/phases/03-production-monetization-gate/03-03-SUMMARY.md`
  - Key Results: 408-line runbook, 10 sections, GitHub Actions setup, Firecrawl troubleshooting, 4-condition monetization gate

### Drift v4.0 — ALL PHASES COMPLETE ✅

**Monetization gate decisions (per D-16, D-17, D-18):**

- Gate to company #2 is public launch readiness, not a revenue milestone
- 4 conditions: editorial maturity + ad slot readiness + 2x clean agent runs + runbook reviewed
- Scaling decision is Stefano's manual judgment call — no automated trigger

**Next (operator actions):**

- Configure GitHub Secrets to activate bi-weekly agent schedule
- Create admin user in Supabase Dashboard (Authentication → Users → Add User)
- Run 2 clean bi-weekly Sandoz agent runs
- When gate conditions met: `python backend/agent.py --intake <uuid>` to add company #2

---

## Project Context (At A Glance)

| Field | Value |
|-------|-------|
| **Project Name** | Drift v4.0 Research Enhancement |
| **Goal** | Integrate Firecrawl to improve agent data extraction quality |
| **Owner** | Stefano (Drift founder, Sandoz Head of Infra) |
| **Version** | 4.0.0 (in execution) |
| **Status** | Phase 1 complete, Phase 2 complete, Phase 3 pending |
| **Timeline** | 3 weeks (3×5-day phases) |
| **Budget** | €0 (Firecrawl free tier only) |
| **Key Metric** | Avg signal confidence 6.5 → 8.0+ (/10) |

---

## What Is Drift v4.0?

**Short Version:** Add Firecrawl web scraping to the research agent to improve the quality of signals (detection of company commitment changes).

**Why Now?**

- Current agent uses generic web search (noisy, unreliable)
- Research-grade content requires better data extraction
- Firecrawl provides structured, clean markdown from company pages
- Editorial standards require high-confidence signals

**How Will It Work?**

1. Agent uses Firecrawl to fetch company IR pages → clean markdown
2. Markdown analyzed with Claude to detect signals (missing language, new commitments, etc.)
3. Higher-quality input → higher confidence output
4. All signals still reviewed by humans before publication

---

## Previous Work (Context)

### Drift v3.3.0 (Current Stable)

- ✅ Next.js 15 frontend with interactive timeline
- ✅ Supabase backend with RLS, audit trails
- ✅ 6 Sandoz objectives tracked, 40+ signals
- ✅ 3 graveyard entries (Silent Drop, Morphed, Phased Out)
- ✅ Full test suite (99 tests)
- ✅ Python research agent (bi-weekly runs, draft-only workflow)

### Drift v4.0.0 Progress

- **2026-03-25:** v3.2.0 Committed Duration delivered (timeline visual overhaul)
- **2026-03-26:** Codebase mapping complete (7 documents)
- **2026-03-26:** Project initialized for v4.0 (free tier, Sandoz-only, maturity-first approach)
- **2026-03-26:** Phase 1 executed (Firecrawl SDK integrated, retry logic, schema migration, 7 tests)
- **2026-03-26:** Phase 2 Plan 01 executed (baseline confidence 6.5/10 measured and documented)
- **2026-03-26:** Phase 2 Plan 02 executed (TDD: markdown parsing + confidence scoring, 16 new tests, all passing)
- **2026-03-26:** Phase 2 Plan 03 executed (quality report, editorial curation, confidence badges, ROADMAP update)

---

## Key Artifacts

### Project Files

- `.planning/PROJECT.md` — Full project brief
- `.planning/REQUIREMENTS.md` — Functional/non-functional requirements
- `.planning/ROADMAP.md` — 3-phase breakdown (Phase 1 ✅, Phase 2 🔄, Phase 3 pending)
- `.planning/config.json` — Workflow config

### Phase 1 (Complete)

- `.planning/phases/01-firecrawl-integration-testing/01-01-PLAN.md` — Foundation
- `.planning/phases/01-firecrawl-integration-testing/01-01-SUMMARY.md` — Foundation completion
- `.planning/phases/01-firecrawl-integration-testing/01-02-PLAN.md` — Agent refactor & tests
- `.planning/phases/01-firecrawl-integration-testing/01-02-SUMMARY.md` — Execution summary
- `.planning/phases/01-firecrawl-integration-testing/01-RESEARCH.md` — Firecrawl SDK research

### Phase 2 (In Progress)

- `.planning/phases/02-quality-measurement-maturity/02-01-PLAN.md` — Baseline measurement
- `.planning/phases/02-quality-measurement-maturity/02-01-SUMMARY.md` — ✅ Complete
- `.planning/phases/02-quality-measurement-maturity/02-02-PLAN.md` — Signal detection refinement
- `.planning/phases/02-quality-measurement-maturity/02-02-SUMMARY.md` — ✅ Complete
- `.planning/phases/02-quality-measurement-maturity/02-03-PLAN.md` — Quality report & editorial curation (pending)

### Codebase Analysis

- `.planning/codebase/STACK.md` — Tech stack (Next.js, Tailwind, Supabase, etc.)
- `.planning/codebase/ARCHITECTURE.md` — System design
- `.planning/codebase/STRUCTURE.md` — File organization
- `.planning/codebase/CONVENTIONS.md` — Code patterns
- `.planning/codebase/TESTING.md` — Test strategy
- `.planning/codebase/INTEGRATIONS.md` — API integrations
- `.planning/codebase/CONCERNS.md` — Quality issues & risks

### Codebase

- `backend/agent.py` — Python agent (updated in Phase 1)
- `backend/schema.sql` — Supabase schema (updated with V5.1 migration)
- `backend/requirements.txt` — Dependencies (tenacity added)
- `backend/tests/test_agent.py` — Unit tests (7 tests, all passing)
- `backend/.env.example` — Environment variable documentation
- `frontend/src/...` — React components (no changes in v4.0)
- `docs/setup.md` — Setup guide
- `brand/brand-language.html` — Editorial standards

---

## Phase Roadmap at a Glance

```
Phase 1: Firecrawl Integration (5 days) ✅ COMPLETE
├── Install Firecrawl SDK
├── Update agent.py with Firecrawl calls
├── Add schema columns (signals.source_content)
├── Error handling & fallback logic
└── Manual test on Sandoz ✓

Phase 2: Quality Measurement (5 days) ✅ COMPLETE (3 plans, 10 tasks)
├── Measure baseline confidence (pre-Firecrawl)
├── Update signal detection logic for Firecrawl markdown
├── Extract timestamps & tables
├── Run on Sandoz with Firecrawl
└── Compare confidence scores + editorial curation

Phase 3: Production Rollout (5 days) [pending]
├── Final QA & testing
├── Documentation & runbook
├── Cost estimation
└── Deploy to production
```

---

## Success Criteria (Quick Ref)

### Phase 1 ✅ COMPLETE

- [x] Firecrawl integrated without breaking agent
- [x] 2+ manual test runs successful
- [x] Schema updated and migration ready
- [x] Retry logic and draft-only workflow enforced
- [x] 7 unit tests passing

### Phase 2 🔄 IN EXECUTION

- [x] Baseline confidence measured (6.5/10 baseline established)
- [x] Signal detection updated for Firecrawl (markdown parsing implemented)
- [ ] Confidence ≥8.0/10 achieved (ready to verify in Phase 2c)
- [ ] False negatives <5% (ready to verify in Phase 2c)
- [ ] Sandoz page editorial maturity achieved (Phase 2c pending)

### Phase 3 [pending]

- [ ] All tests passing
- [ ] Runbook complete
- [ ] Production deployment done
- [ ] Cost estimation for year 1

---

## Known Decisions & Trade-offs

### Decision 1: Keep Draft-Only Workflow

**Why?** Editorial integrity. Firecrawl improves data quality but doesn't eliminate need for human review.
**Impact:** No automation of signal publishing; all signals still reviewed by humans.

### Decision 2: Bi-Weekly Schedule Remains

**Why?** Firecrawl is async; no need to increase frequency. Bi-weekly is operationally sustainable.
**Impact:** Real-time monitoring not in scope.

### Decision 3: Focus on High-Quality Sources

**Why?** Paywalled IR pages can't be accessed via Firecrawl. Better to focus on public content first.
**Impact:** Some companies (e.g., Bloomberg-paywalled reports) have lower coverage.

### Decision 4: Use Firecrawl for New Signals Only

**Why?** Retroactive re-processing of 40+ signals is expensive and risky.
**Impact:** Historical signals use old methodology; new signals use Firecrawl.

### Decision 6: Unconditional is_draft Enforcement (Phase 3 Plan 01)

**Why?** Conditional guard (`if "is_draft" not in signal`) allowed callers to bypass draft-only workflow by passing `is_draft=False`. Unconditional assignment closes this path permanently.
**Impact:** No signal can ever be published without human approval, regardless of caller input.

### Decision 7: GitHub Actions for Agent Scheduling (Phase 3 Plan 01)

**Why?** Replaces manual cron setup. GitHub Actions provides scheduling, failure email notifications (built-in), and manual dispatch — all at zero additional cost.
**Impact:** D-06, D-07, D-08 satisfied. Workflow in .github/workflows/agent-run.yml.

### Decision 5: Three-Plan Phase 2 Structure

**Why?** Baseline measurement (Wave 1) → Detection refinement (Wave 1 parallel) → Agent run & curation (Wave 2)
**Impact:** Allows parallel development of measurement and detection logic, followed by integrated test

---

## Environment & Setup

### Required Credentials

```
ANTHROPIC_API_KEY=...              (existing - already set)
SUPABASE_URL=...                   (existing - already set)
SUPABASE_SERVICE_KEY=...           (existing - already set)
FIRECRAWL_API_KEY=...              (NEW - sign up at firecrawl.dev)
```

### Dependencies (New)

```
pip install firecrawl-py            (Firecrawl SDK)
pip install tenacity                (Retry logic)

# Other deps unchanged:

pip install anthropic               (Claude API)
pip install supabase               (Supabase client)
pip install python-dotenv          (Env var management)
pip install schedule               (Task scheduling)
```

### Infrastructure

- **Agent Host:** Cloud Run (or local for testing)
- **Database:** Supabase Postgres
- **API:** Anthropic Claude, Firecrawl
- **Frontend:** Vercel (Next.js)

---

## Risks & Contingencies (At A Glance)

| Risk | Probability | Mitigation |
|------|-------------|-----------|
| Cost overrun | Low (free tier) | Monitor usage, set alerts |
| Paywalled pages | High | Fallback to web search, document limitations |
| Signal quality doesn't improve | Low | A/B testing in Phase 2, iterative refinement |
| Agent autonomy issues | Medium | Keep draft-only workflow, maintain human review |

---

## Blockers & Dependencies

### ✅ Phase 1 Prerequisites Met

- Codebase mapping complete
- Project initialized
- Requirements defined
- Roadmap created
- Firecrawl API available
- Phase 1 executed and tested

### 🔄 Phase 2 Prerequisites Met

- Phase 1 complete (Firecrawl integrated, tests passing)
- Brand language standards documented
- Baseline measurement plan created
- Signal detection enhancement planned
- Editorial curation framework defined

### → Phase 3 Gate

- Phase 2 complete and metrics verified
- Quality targets met (confidence 8.0+, false negatives <5%)
- Sandoz page editorial maturity achieved
- Ready for production deployment

---

## How To Continue

### If Continuing This Session

```bash

# Execute Phase 2

/gsd:execute-phase 2

# Once Phase 2 complete, review quality metrics

cat .planning/phase-2-quality-report.json

# Then execute Phase 3

/gsd:execute-phase 3
```

### If Resuming Later

```bash

# Check project status

/gsd:progress

# Resume from last checkpoint

/gsd:resume-work

# Or execute specific phase

/gsd:execute-phase 2
```

---

## Notes for Future Me

- **Phase 1 delivered:** Firecrawl SDK integrated with retry logic, draft-only workflow, 7 tests passing
- **Phase 2 goal:** Achieve 8.0+/10 confidence and <5% false negatives via markdown analysis
- **Phase 2 structure:** 3 plans, parallel baseline measurement + detection refinement, then integrated test
- **Editorial maturity:** Sandoz page curation focuses on precision, evidence-based language, no speculation
- **Monetization gate:** Scale to new companies only after ads integrated and generating revenue
- **Timeline:** Week 1 ✅, Week 2 🔄, Week 3 pending

---

## Links & References

- **Firecrawl:** https://www.firecrawl.dev/
- **Agent Code:** `backend/agent.py`
- **Schema:** `backend/schema.sql`
- **Frontend:** `frontend/src/...`
- **Project CLAUDE.md:** Root project instructions
- **Codebase Analysis:** `.planning/codebase/` (7 documents)
- **Phase 2 Plans:** `.planning/phases/02-quality-measurement-maturity/` (3 plans)
