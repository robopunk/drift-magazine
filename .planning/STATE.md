# Project State — Drift v4.0

**Last Updated:** 2026-03-26T23:50:00Z
**Status:** Phase 1 complete ✅, Phase 2 planning complete 🔄
**Current Phase:** Phase 2 — Quality Measurement & Page Maturity (ready for execution)

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

### Phase 2 Planning Complete 🔄
- [x] Phase 2 Plan 01 (Baseline Measurement & Confidence Algorithm) — PLANNED
  - [x] Task 1: Extract and measure baseline confidence scores from Sandoz signals
  - [x] Task 2: Add signal classification confidence documentation to agent.py
  - [x] PLAN.md created: `.planning/phases/02-quality-measurement-maturity/02-01-PLAN.md`

- [x] Phase 2 Plan 02 (Signal Detection Refinement with Markdown Parsing) — PLANNED
  - [x] Task 1: Implement markdown parsing functions with TDD (extract tables, timestamps, parse Firecrawl)
  - [x] Task 2: Verify enhanced detection with Sandoz test signal
  - [x] PLAN.md created: `.planning/phases/02-quality-measurement-maturity/02-02-PLAN.md`

- [x] Phase 2 Plan 03 (Agent Run, Quality Report, Editorial Curation) — PLANNED
  - [x] Task 1: Run agent on Sandoz with Firecrawl integration and generate quality metrics
  - [x] Task 2: Checkpoint: Human verification of quality metrics (blocking)
  - [x] Task 3: Editorial curation and polish for Sandoz page
  - [x] Task 4: Verify editorial compliance and update ROADMAP progress
  - [x] PLAN.md created: `.planning/phases/02-quality-measurement-maturity/02-03-PLAN.md`

### Ready For
- → Phase 2 Execution (3 plans, 7 total tasks)
- → Command: `/gsd:execute-phase 2`

---

## Project Context (At A Glance)

| Field | Value |
|-------|-------|
| **Project Name** | Drift v4.0 Research Enhancement |
| **Goal** | Integrate Firecrawl to improve agent data extraction quality |
| **Owner** | Stefano (Drift founder, Sandoz Head of Infra) |
| **Version** | 4.0.0 (in execution) |
| **Status** | Phase 1 ✅ complete, Phase 2 🔄 planned, Phase 3 pending |
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
- **2026-03-26:** Phase 2 planned (3 plans: baseline measurement, signal detection, quality report & curation)

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

### Phase 2 (Planned)
- `.planning/phases/02-quality-measurement-maturity/02-01-PLAN.md` — Baseline measurement
- `.planning/phases/02-quality-measurement-maturity/02-02-PLAN.md` — Signal detection refinement
- `.planning/phases/02-quality-measurement-maturity/02-03-PLAN.md` — Quality report & editorial curation

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

Phase 2: Quality Measurement (5 days) 🔄 PLANNED (3 plans)
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

### Phase 2 🔄 PLANNED (ready for execution)
- [ ] Baseline confidence measured (6.5/10 target)
- [ ] Signal detection updated for Firecrawl
- [ ] Confidence ≥8.0/10 achieved
- [ ] False negatives <5%
- [ ] Sandoz page editorial maturity achieved

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
