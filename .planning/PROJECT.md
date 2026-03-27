# Drift v4.0 — Research Agent Quality & Firecrawl Integration

**Project Name:** Drift v4.0 Research Enhancement
**Version:** 4.0.0 (complete)
**Owner:** Stefano (Drift founder, Sandoz Head of Infra)
**Status:** All 3 phases complete — production-ready
**Created:** 2026-03-26

---

## Executive Summary

The Drift research agent currently uses basic web search and Claude API for signal detection. This project upgrades the agent's data extraction pipeline with **Firecrawl**, enabling:

1. **Consistent data quality** — Firecrawl extracts structured text/tables/metadata from company pages reliably
2. **Better content analysis** — Higher fidelity source material → more precise signal classification
3. **Editorial confidence** — Reduced noise, higher accuracy in momentum and graveyard classifications

**Success metric:** Agent signals achieve ≥8/10 confidence on average (currently ~6-7), with no regression in false negatives.

---

## Current State (v4.0.0)

### What Works
- ✅ Next.js 15 frontend with interactive timeline, momentum scale, graveyard
- ✅ 6 active Sandoz objectives tracked with 40+ signals
- ✅ 3 graveyard entries (Silent Drop, Morphed, Phased Out)
- ✅ Supabase backend with RLS, audit trails
- ✅ Python agent runs bi-weekly, outputs draft signals for human review
- ✅ Firecrawl integration for structured data extraction (Phase 1)
- ✅ Signal quality measurement and confidence scoring (Phase 2)
- ✅ Admin UI auth-gated with Supabase Auth email/password (Phase 3)
- ✅ GitHub Actions workflow for bi-weekly agent scheduling (Phase 3)
- ✅ 4 ad slot placements across landing and company pages (Phase 3)
- ✅ Operations runbook with monetization gate criteria (Phase 3)
- ✅ Full test suite (99 frontend + 26 backend tests)

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
- **Pricing:** Free tier (rate-limited, ~1-5 req/min); paid plans available for scale

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
- Integrate Firecrawl **free tier** into `agent.py`
- Update signal detection logic to use Firecrawl output
- Measure confidence improvement (baseline → post-Firecrawl)
- Test with **Sandoz only** (mature single company first)
- Improve page maturity: content curation, editorial polish, signal quality

### Out of Scope
- Multi-company scaling (defer until post-monetization)
- Paywall/login-required pages (Firecrawl can't handle these)
- Real-time monitoring (still bi-weekly schedule)
- Graveyard retroactive updates (apply logic to new signals only)
- Cost tracking (free tier = no cost monitoring needed)

---

## Dependencies & Prerequisites

### External Services
- **Firecrawl API** — free tier account (sign-up at firecrawl.dev)
- **Claude API** — already integrated, no changes needed
- **Supabase** — existing backend, minimal schema changes

### Tech Stack
- Python 3.11+ (already used)
- New: `firecrawl` Python SDK (pip install firecrawl-py)
- Existing: `anthropic`, `supabase`, `schedule`

### Environment Variables
```
FIRECRAWL_API_KEY=...         # Free tier key (optional if using unauthenticated free access)
ANTHROPIC_API_KEY=...         # Existing
SUPABASE_URL=...              # Existing
SUPABASE_SERVICE_KEY=...      # Existing
```

---

## Acceptance Criteria

### Phase 1: Integration & Testing
- [ ] Firecrawl free tier SDK integrated into agent.py
- [ ] Agent can fetch and parse Sandoz IR page via Firecrawl
- [ ] Firecrawl markdown stored in signals table (new column)
- [ ] Agent runs on Sandoz without errors or rate limit issues
- [ ] 2+ successful agent runs with Firecrawl data collection

### Phase 2: Quality Measurement & Page Maturity
- [ ] Baseline confidence measured (pre-Firecrawl signals)
- [ ] Post-Firecrawl signals classified with new logic
- [ ] Confidence scores compared; improvement ≥10% without regression
- [ ] False negative rate does not increase
- [ ] Page content curation and editorial polish

### Phase 3: Production & Monetization Gate
- [ ] Agent.py ready for production bi-weekly runs
- [ ] Edge cases documented (paywalls, dynamic content, missing IR pages)
- [ ] Integration tests passing (>95% coverage)
- [ ] **Monetization gate set:** Ads integrated and generating revenue before scaling to new companies

---

## Success Metrics

| Metric | Current | Target | Priority |
|--------|---------|--------|----------|
| Avg signal confidence | 6.5/10 | 8.0/10 | 🔴 Critical |
| False negative rate | ~15% | <5% | 🔴 Critical |
| Firecrawl success rate (free tier) | N/A | >90% | 🟡 High |
| Agent runtime (Sandoz) | ~5 min | ≤10 min | 🟡 High |
| Page maturity | Basic | Research-grade | 🔴 Critical |

---

## Timeline & Milestones

**Estimated duration:** 2–3 weeks (Sandoz focus)

- **Week 1:** Firecrawl integration, Sandoz testing
- **Week 2:** Quality measurement, page maturity work, editorial polish
- **Week 3:** Production validation, documentation, monetization gate

---

## Known Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Firecrawl free tier rate limits | Medium | Agent slowdown | Implement retry logic, request batching |
| Paywalled Sandoz IR pages | Low | Reduced coverage | Fall back to Claude web search |
| Markdown parsing errors | Medium | Signal classification errors | Add validation, test edge cases |
| Agent autonomy without review | High | Published errors | Maintain draft-only workflow |
| Page maturity not improving | Medium | Project scope creep | Focus on editorial standards from CLAUDE.md |

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
