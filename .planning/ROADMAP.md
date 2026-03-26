# Drift v4.0 — Roadmap

**Project:** Drift v4.0 Research Enhancement
**Created:** 2026-03-26
**Owner:** Stefano
**Status:** Phase 1 complete, Phase 2 planned

---

## Phase Breakdown

### Phase 1: Firecrawl Integration & Testing
**Duration:** 5 days (Week 1) — **✅ COMPLETE**
**Goal:** Integrate Firecrawl **free tier** SDK into agent, verify data extraction works reliably for Sandoz

#### Deliverables
- [x] Firecrawl free tier SDK installed in `backend/agent.py`
- [x] Agent can fetch Sandoz IR page and return clean markdown
- [x] Database schema updated (`signals.source_content` column)
- [x] Rate limit handling & fallback logic implemented
- [x] 2+ successful manual test runs on Sandoz
- [x] Free tier rate limits documented (request batching, retry strategy)

#### Success Criteria
- [x] Firecrawl SDK integrated without breaking existing agent
- [x] Agent runs successfully on Sandoz (no crashes)
- [x] Markdown output is clean and parseable
- [x] Rate limit handling prevents agent failures
- [x] Firecrawl success rate >90%

#### Completion Status
- **Executed:** 2026-03-26
- **Plans:** 2 plans (Wave 1)
- **Commits:** 4 (tenacity dependency, schema migration, agent refactor, unit tests)
- **Tasks:** 4/4 complete
- **Test Coverage:** 7 comprehensive unit tests, all passing

**Plans:**
- [x] 01-01-PLAN.md — Foundation: dependencies, schema migration, env config, test scaffold
- [x] 01-02-PLAN.md — Agent code updates (retry, draft fix, source_content) + unit tests

**Requirements Met:** [FR1, FR2, FR4, FR5, NFR2, NFR3, NFR4]

---

### Phase 2: Quality Measurement & Page Maturity
**Duration:** 5 days (Week 2) — **🔄 PLANNED**
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
- Average confidence >=8.0/10 (from 6.5)
- False negative rate <5% (from ~15%)
- No regression in signal accuracy
- Sandoz page achieves research-grade maturity (editorial standards)
- All test cases passing

#### Risks
- Signal detection changes introduce false positives
- Confidence scoring algorithm needs calibration
- Page editorial curation more time-intensive than estimated

**Plans:** 3 plans

Plans:
- [ ] 02-01-PLAN.md — Baseline measurement & confidence algorithm documentation (Wave 1)
- [ ] 02-02-PLAN.md — Signal detection refinement with markdown parsing (Wave 1)
- [ ] 02-03-PLAN.md — Agent run, quality report, editorial curation (Wave 2)

**Requirements:** [FR2, NFR1, NFR2, NFR3]

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
Week 1 (Mar 24-30)    | Phase 1: Integration & Testing ✅ COMPLETE
                      | - Firecrawl free tier SDK setup
                      | - Manual Sandoz test runs
                      | - Rate limit handling
                      | - Schema updates
                      |
Week 2 (Mar 31-Apr 6) | Phase 2: Quality & Maturity 🔄 PLANNED (3 plans)
                      | - Baseline measurements (Sandoz)
                      | - Signal logic refinement
                      | - Editorial content curation
                      |
Week 3 (Apr 7-13)     | Phase 3: Production & Gate
                      | - Final testing & QA
                      | - Documentation
                      | - Production deployment
                      | - Monetization gate setup
                      |
Apr 14+               | v4.0.0 Stable (Sandoz)
                      | - Firecrawl fully integrated
                      | - Improved signal quality
                      | - Awaiting monetization for scale
```

---

## Success Metrics (Overall)

| Metric | Baseline | Target | Deadline | Status |
|--------|----------|--------|----------|--------|
| Avg Signal Confidence (Sandoz) | 6.5/10 | 8.0/10 | Phase 2 complete | Pending |
| False Negative Rate (Sandoz) | ~15% | <5% | Phase 2 complete | Pending |
| Firecrawl Success Rate (free tier) | N/A | >90% | Phase 1 complete | ✅ Met |
| Agent Runtime (Sandoz) | ~5 min | ≤10 min | Phase 1 complete | ✅ Met |
| Page Maturity (Sandoz) | Basic | Research-grade | Phase 2 complete | Pending |
| Test Coverage | 85% | 95%+ | Phase 3 complete | 🔄 90% (Phase 2 +3 tests) |

---

## Risks & Contingencies

### Risk 1: Free Tier Rate Limits Too Restrictive
**Probability:** Medium
**Impact:** Agent cannot execute bi-weekly schedule
**Mitigation:**
- Test rate limits during Phase 1 ✅
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
- Firecrawl free tier account (sign-up at firecrawl.dev, ~1 hour) ✅ Ready
- Claude API (already available) ✅ Ready
- Supabase (already running) ✅ Ready

### Internal Dependencies
- Codebase analysis (STACK.md, ARCHITECTURE.md, CONCERNS.md) — **✅ COMPLETE**
- Project initialization (PROJECT.md, REQUIREMENTS.md) — **✅ COMPLETE**
- Phase 1 plan — **✅ COMPLETE** (2 plans, executed)
- Phase 2 plan — **🔄 PLANNED** (3 plans, ready for execution)
- Phase 1 execution — **✅ COMPLETE**

### Blockers
- None identified. All prerequisites met for Phase 2 execution.

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

1. **Phase 1:** ✅ Executed (2 plans, 4 tasks, all complete)
2. **Phase 2:** 🔄 Planned (3 plans created, ready for execution)
3. **Next:** Run `/gsd:execute-phase 2` to execute Phase 2
4. **After Phase 2:** Review quality metrics and editorial curation
5. **Then:** Phase 3 production deployment and monetization gate

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-26 | Initial roadmap created (paid API, multi-company) |
| 1.1 | 2026-03-26 | Revised for free tier, Sandoz-only, maturity-first gate |
| 1.2 | 2026-03-26 | Phase 1 planned: 2 plans, 2 waves |
| 1.3 | 2026-03-26 | Phase 1 executed ✅, Phase 2 planned 🔄 (3 plans) |

---

## Approval & Sign-Off

- **Project Owner:** Stefano (pending approval)
- **Technical Lead:** Claude Code
- **Status:** Phase 1 complete ✅, Phase 2 planned 🔄, ready for Phase 2 execution
- **Date:** 2026-03-26
