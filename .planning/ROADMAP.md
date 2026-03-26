# Drift v4.0 — Roadmap

**Project:** Drift v4.0 Research Enhancement
**Created:** 2026-03-26
**Owner:** Stefano
**Status:** Planning

---

## Phase Breakdown

### Phase 1: Firecrawl Integration & Testing
**Duration:** 5 days (Week 1)
**Goal:** Integrate Firecrawl SDK into agent, verify data extraction works reliably

#### Deliverables
- [ ] Firecrawl SDK installed in `backend/agent.py`
- [ ] Agent can fetch IR page URLs and return clean markdown
- [ ] Database schema updated (`signals.source_content` column)
- [ ] Error handling & fallback logic implemented
- [ ] 2+ successful manual test runs on Sandoz
- [ ] Cost tracking in `agent_runs` table

#### Success Criteria
- Firecrawl API integrated without breaking existing agent
- Agent runs successfully on Sandoz (no crashes)
- Markdown output is clean and parseable
- Cost per run ≤€2.00

#### Risks
- Firecrawl API rate limits or latency
- Paywalled IR pages cause failures
- Schema migration requires downtime

---

### Phase 2: Quality Measurement & Refinement
**Duration:** 5 days (Week 2)
**Goal:** Measure confidence improvement, refine signal detection logic

#### Deliverables
- [ ] Baseline confidence scores measured (pre-Firecrawl signals)
- [ ] Signal detection logic updated for Firecrawl markdown
- [ ] Timestamp/table extraction implemented
- [ ] Agent runs on 2–3 companies (Sandoz, Roche, Volkswagen)
- [ ] Confidence scores calculated for new signals
- [ ] Quality report generated (improvement %, false negatives, etc.)

#### Success Criteria
- Average confidence ≥8.0/10 (from 6.5)
- False negative rate <5% (from ~15%)
- No regression in signal accuracy
- All test cases passing

#### Risks
- Signal detection changes introduce false positives
- Confidence scoring algorithm needs calibration
- Measurement methodology disagreement

---

### Phase 3: Production Rollout & Documentation
**Duration:** 5 days (Week 3)
**Goal:** Deploy to production, document runbook, estimate costs

#### Deliverables
- [ ] Agent.py production-ready (all tests passing)
- [ ] Runbook for Firecrawl troubleshooting written
- [ ] Cost estimation for year 1 (extrapolated from test runs)
- [ ] Edge cases documented (paywalls, dynamic content, etc.)
- [ ] Operations team trained on agent monitoring
- [ ] Deployment to production environment

#### Success Criteria
- Zero regressions in existing agent functionality
- Firecrawl integration in production for 2+ weeks
- No critical errors or cost overruns
- Documentation complete and reviewed

#### Risks
- Production deployment introduces unforeseen issues
- Firecrawl cost is higher than estimated
- Operations team needs additional training

---

## Milestones & Timeline

```
Week 1 (Mar 24-30)    │ Phase 1: Integration & Testing
                      │ - Firecrawl SDK setup
                      │ - Manual test runs
                      │ - Schema updates
                      │
Week 2 (Mar 31-Apr 6) │ Phase 2: Quality Measurement
                      │ - Baseline measurements
                      │ - Signal logic refinement
                      │ - Multi-company testing
                      │
Week 3 (Apr 7-13)     │ Phase 3: Production Rollout
                      │ - Final testing & QA
                      │ - Documentation
                      │ - Production deployment
                      │
Apr 14+               │ v4.0.0 Stable Release
                      │ - Firecrawl fully integrated
                      │ - Improved signal quality
                      │ - Ready for scale-up
```

---

## Success Metrics (Overall)

| Metric | Baseline | Target | Deadline |
|--------|----------|--------|----------|
| Avg Signal Confidence | 6.5/10 | 8.0/10 | Phase 2 complete |
| False Negative Rate | ~15% | <5% | Phase 2 complete |
| Firecrawl Success Rate | N/A | >90% | Phase 1 complete |
| Agent Runtime | ~5 min | ≤10 min | Phase 1 complete |
| Cost per Run | ~€0.50 | <€2.00 | Phase 1 complete |
| Test Coverage | 85% | 95%+ | Phase 3 complete |

---

## Risks & Contingencies

### Risk 1: Firecrawl API Latency / Cost Overrun
**Probability:** Medium
**Impact:** Timeline slip or budget impact
**Mitigation:**
- Monitor API usage during Phase 1
- Set cost alerts with Firecrawl account
- Implement request caching to reduce API calls
- Budget 50% contingency

**Contingency:** If cost exceeds €300, prioritize only high-value companies (Sandoz, Roche) and skip others.

---

### Risk 2: Paywalled IR Pages
**Probability:** High
**Impact:** Reduced coverage (some signals missed)
**Mitigation:**
- Test with known paywalled pages early
- Implement robust fallback to Claude web search
- Document which companies have paywall issues
- Explore wayback.org as alternative source

**Contingency:** Accept lower coverage for paywalled companies; focus on public-content companies.

---

### Risk 3: Signal Quality Doesn't Improve
**Probability:** Low
**Impact:** Project ROI questioned
**Mitigation:**
- Start with comprehensive baseline measurement
- Run A/B testing (Firecrawl vs. web search on same signals)
- Collaborate with Stefano on editorial judgment
- Adjust signal detection logic iteratively

**Contingency:** Revert to web-search-only and invest time in Claude prompt engineering instead.

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
- ✅ Firecrawl API account (sign-up required, ~1 day)
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
| 1.0 | 2026-03-26 | Initial roadmap created |

---

## Approval & Sign-Off

- **Project Owner:** Stefano (pending approval)
- **Technical Lead:** Claude Code
- **Status:** Ready for Phase 1 planning
- **Date:** 2026-03-26
