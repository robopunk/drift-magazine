# Project State — Drift v4.0

**Last Updated:** 2026-03-26T21:15:00Z
**Status:** Initialized, ready for Phase 1 planning
**Current Phase:** Pre-Phase (project setup complete)

---

## Current Status

### Initialization Complete ✅
- [x] PROJECT.md created (vision, scope, success metrics)
- [x] REQUIREMENTS.md created (functional & non-functional requirements, UAT)
- [x] ROADMAP.md created (3-phase breakdown, timeline, risks)
- [x] config.json created (workflow preferences)
- [x] Codebase mapping complete (STACK.md, ARCHITECTURE.md, CONCERNS.md, etc.)
- [x] Git commit: "docs: add codebase mapping (7 documents, 1918 lines)"

### Ready For
- → Phase 1 planning (`/gsd:plan-phase 1`)
- → Phase 1 execution (Firecrawl integration)

---

## Project Context (At A Glance)

| Field | Value |
|-------|-------|
| **Project Name** | Drift v4.0 Research Enhancement |
| **Goal** | Integrate Firecrawl to improve agent data extraction quality |
| **Owner** | Stefano (Drift founder, Sandoz Head of Infra) |
| **Version** | 4.0.0 (in planning) |
| **Status** | Planning phase |
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

### Recent Work
- **2026-03-25:** v3.2.0 Committed Duration delivered (timeline visual overhaul)
- **2026-03-26:** Codebase mapping complete (7 documents)
- **2026-03-26:** Project initialized for v4.0 (€500 budget assumption)
- **2026-03-26:** Project revised for free tier, Sandoz-only, maturity-first approach

---

## Key Artifacts

### Project Files
- `.planning/PROJECT.md` — Full project brief
- `.planning/REQUIREMENTS.md` — Functional/non-functional requirements
- `.planning/ROADMAP.md` — 3-phase breakdown
- `.planning/config.json` — Workflow config

### Codebase Analysis
- `.planning/codebase/STACK.md` — Tech stack (Next.js, Tailwind, Supabase, etc.)
- `.planning/codebase/ARCHITECTURE.md` — System design
- `.planning/codebase/STRUCTURE.md` — File organization
- `.planning/codebase/CONVENTIONS.md` — Code patterns
- `.planning/codebase/TESTING.md` — Test strategy
- `.planning/codebase/INTEGRATIONS.md` — API integrations
- `.planning/codebase/CONCERNS.md` — Quality issues & risks

### Codebase
- `backend/agent.py` — Python agent (will be updated in Phase 1)
- `backend/schema.sql` — Supabase schema (will be updated)
- `frontend/src/...` — React components (no changes in v4.0)
- `docs/setup.md` — Setup guide

---

## Phase Roadmap at a Glance

```
Phase 1: Firecrawl Integration (5 days)
├── Install Firecrawl SDK
├── Update agent.py with Firecrawl calls
├── Add schema columns (signals.source_content, agent_runs.firecrawl_cost)
├── Error handling & fallback logic
└── Manual test on Sandoz ✓

Phase 2: Quality Measurement (5 days)
├── Measure baseline confidence (pre-Firecrawl)
├── Update signal detection logic for Firecrawl markdown
├── Extract timestamps & tables
├── Run on 2–3 companies
└── Compare confidence scores ✓

Phase 3: Production Rollout (5 days)
├── Final QA & testing
├── Documentation & runbook
├── Cost estimation
└── Deploy to production ✓
```

---

## Success Criteria (Quick Ref)

### Phase 1 ✓ Phase 1 Done When...
- Firecrawl integrated without breaking agent
- 2+ manual test runs successful
- Schema updated and migrated
- Cost tracking in place

### Phase 2 ✓ Phase 2 Done When...
- Baseline confidence measured
- Signal detection updated for Firecrawl
- Confidence ≥8.0/10 achieved
- False negatives <5%

### Phase 3 ✓ Phase 3 Done When...
- All tests passing
- Runbook complete
- Production deployment done
- Cost estimation for year 1

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

---

## Environment & Setup

### Required Credentials
```
FIRECRAWL_API_KEY=...              (NEW - sign up at firecrawl.dev)
ANTHROPIC_API_KEY=...              (existing - already set)
SUPABASE_URL=...                   (existing - already set)
SUPABASE_SERVICE_KEY=...           (existing - already set)
```

### Dependencies (New)
```
pip install firecrawl-py            (Firecrawl SDK)
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
| Cost overrun | Medium | Monitor usage, set alerts, budget contingency |
| Paywalled pages | High | Fallback to web search, document limitations |
| Signal quality doesn't improve | Low | A/B testing, iterative refinement |
| Agent autonomy issues | Medium | Keep draft-only workflow, maintain human review |

---

## Blockers & Dependencies

### ✅ Prerequisites Met
- Codebase mapping complete
- Project initialized
- Requirements defined
- Roadmap created
- Firecrawl API available

### → Next Gate
- Phase 1 plan creation (`/gsd:plan-phase 1`)
- Once approved → Phase 1 execution begins

---

## How To Continue

### If Continuing This Session
```bash
# Create Phase 1 detailed plan
/gsd:plan-phase 1

# Once plan is approved, execute
/gsd:execute-phase 1
```

### If Resuming Later
```bash
# Check project status
/gsd:progress

# Resume from last checkpoint
/gsd:resume-work
```

---

## Notes for Future Me

- **Free tier rate limits are the main constraint** — implement batching & retry logic in Phase 1
- **Signal quality is measurable** — can A/B test Firecrawl vs. web search side-by-side
- **Keep agent autonomy conservative** — draft-only workflow reduces risk
- **Page maturity is a success metric** — editorial polish and research-grade quality required for Sandoz
- **Monetization gate is critical** — scale to new companies only after ads integrated and generating revenue
- **Scaling is intentionally deferred** — focus on Sandoz research quality first, then revenue, then expand

---

## Links & References

- **Firecrawl:** https://www.firecrawl.dev/
- **Agent Code:** `backend/agent.py`
- **Schema:** `backend/schema.sql`
- **Frontend:** `frontend/src/...`
- **Project CLAUDE.md:** Root project instructions
- **Codebase Analysis:** `.planning/codebase/` (7 documents)
