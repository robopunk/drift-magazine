# Drift v4.0 — Roadmap

**Project:** Drift v4.0 Research Enhancement
**Created:** 2026-03-26
**Owner:** Stefano
**Status:** Planning

---

## Phase Breakdown

### Phase 1: Firecrawl Integration & Testing
**Duration:** 5 days (Week 1)
**Goal:** Integrate Firecrawl **free tier** SDK into agent, verify data extraction works reliably for Sandoz

#### Deliverables
- [ ] Firecrawl free tier SDK installed in `backend/agent.py`
- [ ] Agent can fetch Sandoz IR page and return clean markdown
- [ ] Database schema updated (`signals.source_content` column)
- [ ] Rate limit handling & fallback logic implemented
- [ ] 2+ successful manual test runs on Sandoz
- [ ] Free tier rate limits documented (request batching, retry strategy)

#### Success Criteria
- Firecrawl SDK integrated without breaking existing agent
- Agent runs successfully on Sandoz (no crashes)
- Markdown output is clean and parseable
- Rate limit handling prevents agent failures
- Firecrawl success rate >90%

#### Risks
- Firecrawl free tier rate limits (1-5 req/min) too restrictive
- Sandoz IR page may have dynamic content Firecrawl can't handle
- Schema migration requires downtime

---

### Phase 2: Quality Measurement & Page Maturity
**Duration:** 5 days (Week 2)
**Goal:** Measure confidence improvement, refine signal detection logic, mature Sandoz page editorial quality

#### Deliverables
- [ ] Baseline confidence scores measured (pre-Firecrawl signals)
- [ ] Signal detection logic updated for Firecrawl markdown
- [ ] Timestamp/table extraction implemented
- [ ] Agent runs on Sandoz with Firecrawl
- [ ] Confidence scores calculated for new signals
- [ ] Quality report generated (improvement %, false negatives, etc.)
- [ ] Editorial content curation and polish for Sandoz page
- [ ] Objectives/signals reviewed for editorial standards (brand/language.html compliance)

#### Success Criteria
- Average confidence ≥8.0/10 (from 6.5)
- False negative rate <5% (from ~15%)
- No regression in signal accuracy
- Sandoz page achieves research-grade maturity (editorial standards)
- All test cases passing

#### Risks
- Signal detection changes introduce false positives
- Confidence scoring algorithm needs calibration
- Page editorial curation more time-intensive than estimated

---

### Phase 3: Production & Monetization Gate
**Duration:** 5 days (Week 3)
**Goal:** Deploy to production, document runbook, set monetization gate for scaling

#### Deliverables
- [ ] Agent.py production-ready (all tests passing)
- [ ] Runbook for Firecrawl troubleshooting written (free tier rate limits, retry strategy)
- [ ] Edge cases documented (paywalled pages, dynamic content, fallback logic)
- [ ] Operations team trained on agent monitoring
- [ ] Deployment to production environment
- [ ] **Monetization gate documented:** Criteria for scaling to additional companies (ads integration required)

#### Success Criteria
- Zero regressions in existing agent functionality
- Firecrawl free tier integration in production for 2+ weeks
- No critical errors or rate limit issues
- Documentation complete and reviewed
- Monetization gate clearly defined and approved

#### Risks
- Production deployment introduces unforeseen issues
- Free tier rate limits prevent bi-weekly execution
- Scaling criteria unclear or difficult to achieve

---

## Milestones & Timeline

```
Week 1 (Mar 24-30)    │ Phase 1: Integration & Testing
                      │ - Firecrawl free tier SDK setup
                      │ - Manual Sandoz test runs
                      │ - Rate limit handling
                      │ - Schema updates
                      │
Week 2 (Mar 31-Apr 6) │ Phase 2: Quality & Maturity
                      │ - Baseline measurements (Sandoz)
                      │ - Signal logic refinement
                      │ - Editorial content curation
                      │
Week 3 (Apr 7-13)     │ Phase 3: Production & Gate
                      │ - Final testing & QA
                      │ - Documentation
                      │ - Production deployment
                      │ - Monetization gate setup
                      │
Apr 14+               │ v4.0.0 Stable (Sandoz)
                      │ - Firecrawl fully integrated
                      │ - Improved signal quality
                      │ - Awaiting monetization for scale
```

---

## Success Metrics (Overall)

| Metric | Baseline | Target | Deadline |
|--------|----------|--------|----------|
| Avg Signal Confidence (Sandoz) | 6.5/10 | 8.0/10 | Phase 2 complete |
| False Negative Rate (Sandoz) | ~15% | <5% | Phase 2 complete |
| Firecrawl Success Rate (free tier) | N/A | >90% | Phase 1 complete |
| Agent Runtime (Sandoz) | ~5 min | ≤10 min | Phase 1 complete |
| Page Maturity (Sandoz) | Basic | Research-grade | Phase 2 complete |
| Test Coverage | 85% | 95%+ | Phase 3 complete |

---

## Risks & Contingencies

### Risk 1: Free Tier Rate Limits Too Restrictive
**Probability:** Medium
**Impact:** Agent cannot execute bi-weekly schedule
**Mitigation:**
- Test rate limits during Phase 1
- Implement request batching and intelligent caching
- Stagger requests across multiple time windows
- Document rate limit behavior

**Contingency:** If free tier insufficient, evaluate Firecrawl paid tier post-monetization (after ads revenue available).

---

### Risk 2: Paywalled IR Pages
**Probability:** High
**Impact:** Reduced coverage (some signals missed)
**Mitigation:**
- Test with known paywalled pages early
- Implement robust fallback to Claude web search
- Document which companies have paywall issues
- Explore wayback.org as alternative source

**Contingency:** If Sandoz page is paywalled, revert to web search; focus on other companies with public IR pages post-monetization.

---

### Risk 3: Page Maturity Work Exceeds Scope
**Probability:** Medium
**Impact:** Timeline slip, Phase 2 overruns
**Mitigation:**
- Define "research-grade maturity" clearly in Phase 1 kickoff
- Focus editorial work on brand/language standards (CLAUDE.md)
- Timebox editorial curation to Phase 2 (avoid scope creep)
- Prioritize high-impact improvements only

**Contingency:** Move non-critical editorial polish to Phase 4 (post-monetization); deliver Phase 3 with core maturity only.

---

### Risk 4: Agent Autonomy Without Review
**Probability:** Medium
**Impact:** Published errors, editorial credibility
**Mitigation:**
- **Maintain draft-only workflow** (no automatic publishing)
- Firecrawl integration does NOT change approval process
- All signals reviewed by human before publication
- Agent act as research assistant, not publisher

**Contingency:** If errors occur, add human review step before publication (already in place).

---

## Dependencies & Blockers

### External Dependencies
- ✅ Firecrawl free tier account (sign-up at firecrawl.dev, ~1 hour)
- ✅ Claude API (already available)
- ✅ Supabase (already running)

### Internal Dependencies
- ✅ Codebase analysis (STACK.md, ARCHITECTURE.md, CONCERNS.md) — **COMPLETE**
- ✅ Project initialization (PROJECT.md, REQUIREMENTS.md) — **IN PROGRESS**
- → Phase 1 plan (PLAN.md for Phase 1)
- → Phase 1 execution

### Blockers
- None identified at this stage. All prerequisites met.

---

## Resource Allocation

| Resource | Allocation | Notes |
|----------|------------|-------|
| Stefano (Product Owner) | 10% (decisions, review) | Available for sign-off |
| Claude Code (Engineer) | 100% (implementation) | Dedicated to this project |
| Testing | Integrated (95%+ coverage) | No separate QA |
| Operations | 5% (monitoring) | Existing Sandoz setup |

---

## Next Steps

1. ✅ Project initialization complete (PROJECT.md, REQUIREMENTS.md, ROADMAP.md)
2. → **Next:** Run `/gsd:plan-phase 1` to create detailed Phase 1 plan
3. → Then: Execute Phase 1 (Firecrawl integration)
4. → Then: Measure, refine, deploy

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-26 | Initial roadmap created (paid API, multi-company) |
| 1.1 | 2026-03-26 | Revised for free tier, Sandoz-only, maturity-first gate |

---

## Approval & Sign-Off

- **Project Owner:** Stefano (pending approval)
- **Technical Lead:** Claude Code
- **Status:** Ready for Phase 1 planning
- **Date:** 2026-03-26
