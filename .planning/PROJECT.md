# Drift v4.0 — Research Agent Quality & Firecrawl Integration

**Project Name:** Drift v4.0 Research Enhancement
**Version:** 4.0.0 (in planning)
**Owner:** Stefano (Drift founder, Sandoz Head of Infra)
**Status:** Initiating — GSD new-project phase
**Created:** 2026-03-26

---

## Executive Summary

The Drift research agent currently uses basic web search and Claude API for signal detection. This project upgrades the agent's data extraction pipeline with **Firecrawl**, enabling:

1. **Consistent data quality** — Firecrawl extracts structured text/tables/metadata from company pages reliably
2. **Better content analysis** — Higher fidelity source material → more precise signal classification
3. **Editorial confidence** — Reduced noise, higher accuracy in momentum and graveyard classifications

**Success metric:** Agent signals achieve ≥8/10 confidence on average (currently ~6-7), with no regression in false negatives.

---

## Current State (v3.3.0)

### What Works
- ✅ Next.js 15 frontend with interactive timeline, momentum scale, graveyard
- ✅ 6 active Sandoz objectives tracked with 40+ signals
- ✅ 3 graveyard entries (Silent Drop, Morphed, Phased Out)
- ✅ Supabase backend with RLS, audit trails
- ✅ Python agent runs bi-weekly, outputs draft signals for human review
- ✅ Admin UI for signal review/approval
- ✅ Full test suite (99 tests)

### Pain Points
- ⚠️ Agent uses generic web search — hits paywalls, spam, off-topic content
- ⚠️ Signal extraction is LLM-first (no structured data extraction)
- ⚠️ Low confidence in edge cases (absence signals, reframing detection)
- ⚠️ Manual researcher effort needed to verify/correct agent output
- ⚠️ Inconsistent quality across different company pages (some are PDF-heavy, others have dynamic content)

---

## Vision: Firecrawl Integration

**Firecrawl** is a modern web scraping API that extracts clean, structured content from web pages:
- **Handles dynamic content** — JavaScript-rendered pages, SPAs
- **Markdown output** — Preserves structure without HTML noise
- **Metadata extraction** — Title, published date, author, etc.
- **Table parsing** — Converts tables to structured markdown
- **Pricing:** Pay-per-page, ~$0.01-0.05 per page with bulk discounts

### Integration Points
1. **Agent intake step** — When researching a new company, use Firecrawl to extract IR page structure
2. **Signal research** — Before classifying a signal, fetch clean page content via Firecrawl
3. **Evidence gathering** — Store Firecrawl markdown snapshot alongside signal for audit trail

### Quality Improvements Expected
- **Better text analysis** — Firecrawl markdown is cleaner → fewer false positives
- **Timestamp extraction** — Firecrawl captures publication dates → better signal dating
- **Table understanding** — Quarterly results, targets, KPIs extracted as structured data
- **Wayback Machine integration** — Can fetch historical versions to detect changes/removals

---

## Scope & Constraints

### In Scope
- Integrate Firecrawl API into `agent.py`
- Update signal detection logic to use Firecrawl output
- Measure confidence improvement (baseline → post-Firecrawl)
- Test with 2–3 companies (Sandoz, Roche, Volkswagen)
- Update agent_runs table schema to track Firecrawl usage

### Out of Scope
- Paywall/login-required pages (Firecrawl can't handle these)
- Real-time monitoring (still bi-weekly schedule)
- New company intake (focus on existing tracked companies first)
- Graveyard retroactive updates (apply logic to new signals only)

---

## Dependencies & Prerequisites

### External Services
- **Firecrawl API** — requires account & API key (€ cost per request)
- **Claude API** — already integrated, no changes needed
- **Supabase** — existing backend, add `firecrawl_usage` tracking column

### Tech Stack
- Python 3.11+ (already used)
- New: `firecrawl` Python SDK (pip install firecrawl-py)
- Existing: `anthropic`, `supabase`, `schedule`

### Environment Variables
```
FIRECRAWL_API_KEY=...        # New
ANTHROPIC_API_KEY=...         # Existing
SUPABASE_URL=...              # Existing
SUPABASE_SERVICE_KEY=...      # Existing
```

---

## Acceptance Criteria

### Phase 1: Integration & Testing
- [ ] Firecrawl SDK integrated into agent.py
- [ ] Agent can fetch and parse company IR pages via Firecrawl
- [ ] Firecrawl markdown stored in signals table (new column)
- [ ] Agent runs on Sandoz without errors
- [ ] 2+ agent runs complete with Firecrawl data collection

### Phase 2: Quality Measurement
- [ ] Baseline confidence measured (pre-Firecrawl signals)
- [ ] Post-Firecrawl signals classified with new logic
- [ ] Confidence scores compared; improvement ≥10% without regression
- [ ] False negative rate does not increase

### Phase 3: Rollout & Validation
- [ ] Agent.py ready for production bi-weekly runs
- [ ] Firecrawl cost estimation for 1-year operation (<€500)
- [ ] Edge cases documented (paywalls, dynamic content, missing IR pages)
- [ ] Astronomer/operations team can run agent without manual intervention

---

## Success Metrics

| Metric | Current | Target | Priority |
|--------|---------|--------|----------|
| Avg signal confidence | 6.5/10 | 8.0/10 | 🔴 Critical |
| False negative rate | ~15% | <5% | 🔴 Critical |
| Firecrawl success rate | N/A | >90% | 🟡 High |
| Agent runtime | ~5 min/company | ≤10 min/company | 🟡 High |
| Cost per agent run | ~$0.50 | <$2.00 | 🟡 High |

---

## Timeline & Milestones

**Estimated duration:** 2–3 weeks (phased rollout)

- **Week 1:** Firecrawl integration, basic testing
- **Week 2:** Quality measurement, refinement
- **Week 3:** Production validation, documentation

---

## Known Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Firecrawl API rate limits | Medium | Agent slowdown | Implement retry logic, caching |
| Paywalled IR pages | High | Partial coverage | Fall back to Claude web search |
| Cost overrun | Medium | Budget impact | Monitor usage, set spend limits |
| Markdown parsing errors | Medium | Signal classification errors | Add validation, test edge cases |
| Agent autonomy without review | High | Published errors | Maintain draft-only workflow |

---

## Handoff & Next Steps

1. ✅ Codebase analysis complete (7 CONCERNS.md identified Firecrawl as key optimization)
2. → **Next:** Run `/gsd:plan-phase 1` to create detailed integration plan
3. → Then: Execute phase 1 (Firecrawl SDK integration)
4. → Then: Measure and iterate

---

## Reference Links

- **Firecrawl Docs:** https://www.firecrawl.dev/
- **Drift CLAUDE.md:** Project instructions (brand, tech stack, editorial standards)
- **Agent code:** `backend/agent.py`
- **Supabase schema:** `backend/schema.sql`
- **Current concerns:** `.planning/codebase/CONCERNS.md` (test gaps, security, performance)
