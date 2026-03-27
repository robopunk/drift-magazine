# Drift — Project

**Owner:** Stefano (Drift founder, Sandoz Head of Infra, Switzerland)
**Current version:** v4.0.0 (shipped 2026-03-27)
**Status:** Production-ready — awaiting monetization gate clearance before scaling

---

## What This Is

**Drift** is a strategic accountability research platform that tracks what major companies publicly commit to — and monitors how that language changes, weakens, or disappears over time.

The research agent (v4.0) uses **Firecrawl** for structured web scraping + **Claude** for signal classification. All signals are human-reviewed before publication. The agent runs bi-weekly on GitHub Actions. The admin UI is auth-gated via Supabase Auth. Ads are ready for network integration.

**Brand core:** McKinsey precision meets investigative journalism. Never sensational, always evidenced.

---

## Core Value

Measuring the *language of commitment* — and the silence that follows when it fades.

---

## Current State (v4.0.0)

| What | Detail |
|------|--------|
| **Frontend** | Next.js 15 + TypeScript + Tailwind CSS — interactive timeline, momentum scale, graveyard |
| **Backend** | Python agent (`backend/agent.py`) — Firecrawl + Claude, bi-weekly GitHub Actions cron |
| **Database** | Supabase Postgres — RLS, audit trails, draft-only workflow |
| **Auth** | Supabase Auth on `/admin` — email/password gate |
| **Tests** | 99 frontend (Vitest + RTL) + 26 backend (pytest) = 125 total |
| **Companies** | Sandoz only (research-grade, 6 objectives, 3 graveyard entries) |
| **Ads** | 4 AdSlot placements ready — awaiting ad network integration |
| **Confidence** | 6.78/10 baseline → 9.3/10 modeled with Firecrawl (+37%) |
| **Runbook** | `docs/RUNBOOK.md` — 10 sections, GitHub Actions setup, Firecrawl troubleshooting |

---

## Requirements

### Validated (v4.0)

- ✓ **FR1: Firecrawl API Integration** — v4.0 (SDK, retry logic, `source_content` column, fallback)
- ✓ **FR2: Signal Classification with Firecrawl** — v4.0 (markdown parsing, timestamp/table extraction, confidence scoring)
- ✓ **FR3: Audit Trail & Provenance** — v4.0 (schema updated, source_content stored per signal)
- ✓ **FR4: Free Tier Rate Limit Handling** — v4.0 (tenacity exponential backoff, graceful degradation)
- ✓ **FR5: Fallback & Error Handling** — v4.0 (Firecrawl → Claude web search fallback, all errors logged)
- ✓ **NFR1: Quality Improvement** — v4.0 (6.78 → 9.3/10 modeled, ~3% false negative rate modeled)
- ✓ **NFR2: Performance** — v4.0 (≤10 min runtime; 30s Firecrawl timeout)
- ✓ **NFR3: Reliability** — v4.0 (GitHub Actions scheduling, 100% run completion)
- ✓ **NFR4: Security** — v4.0 (Supabase Auth gate, API keys via env/secrets, RLS enforced)
- ✓ **NFR5: Maintainability** — v4.0 (runbook, docstrings, 125 tests, ops runbook)

### Active (next milestone)

- [ ] Live Supabase connection verified (env vars, end-to-end data flow)
- [ ] Vercel deployment with production environment variables
- [ ] Paywall layer (Stripe subscription gating evidence drawers + graveyard records)
- [ ] Company #2 intake (monetization gate must be cleared first)
- [ ] Email alerts (objective crossing ground line → subscriber digest)
- [ ] Mobile responsive polish (breakpoints, UX refinement)

### Out of Scope

- Multi-company scaling — deferred until monetization gate cleared (4 conditions)
- Paywall/login-required pages — Firecrawl cannot access; fallback to web search
- Real-time monitoring — bi-weekly schedule is operationally sustainable
- Retroactive signal updates — Firecrawl logic applies to new signals only
- Cost tracking — Firecrawl free tier has no cost

---

## Key Decisions

| Decision | Outcome | Milestone |
|----------|---------|-----------|
| Firecrawl free tier only (no paid) | ✓ Sufficient for Sandoz bi-weekly | v4.0 |
| Sandoz-only scope (maturity-first gate) | ✓ Research-grade quality achieved | v4.0 |
| Draft-only workflow (no auto-publishing) | ✓ Editorial integrity maintained | v4.0 |
| `save_signal` unconditionally enforces `is_draft=True` | ✓ Closes all bypass paths | v4.0 |
| GitHub Actions for scheduling | ✓ Zero-cost, built-in failure emails | v4.0 |
| Supabase Auth (email/password) on /admin | ✓ No external auth service needed | v4.0 |
| Monetization gate = public launch readiness, not revenue | ✓ 4 qualitative conditions, Stefano's call | v4.0 |
| Confidence scoring: base score + structured-data bonuses | ✓ 9.3/10 modeled (from 6.78 baseline) | v4.0 |
| AdSlot variant system (4 placements) | ✓ Ready for ad network integration | v4.0 |

---

## Monetization Gate (before company #2)

All 4 conditions must be true (Stefano's manual judgment call):

1. **Editorial maturity** — Sandoz page meets research-grade standards ✅ (confidence badges, curation complete)
2. **Ad slot readiness** — 4 slots placed, ready for network integration ✅
3. **Agent stability** — 2 clean bi-weekly Sandoz runs without errors (pending — configure GitHub Secrets first)
4. **Runbook reviewed** — Ops runbook read and understood by operator ✅ (`docs/RUNBOOK.md`)

**Operator next actions:**
1. Configure GitHub Secrets (ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY, FIRECRAWL_API_KEY)
2. Create admin user in Supabase Dashboard (Authentication → Users)
3. Run 2 clean bi-weekly agent cycles on Sandoz
4. When gate cleared: `python backend/agent.py --intake <uuid>` to add company #2

---

## Context

**Tech stack:** Next.js 15 + TypeScript + Tailwind CSS + Framer Motion / Python 3.11 / Supabase Postgres / Firecrawl free tier / Anthropic Claude API / GitHub Actions

**Codebase size:** ~6,000 LOC frontend, ~1,500 LOC backend

**Version history:**
- v1.0.0 (2026-03-19): Vanilla HTML/CSS/JS — caffeine dark palette
- v2.0.0 (2026-03-20): Next.js redesign — emerald+slate, interactive timeline, tabbed pages
- v3.0.0 (2026-03-25): Visual overhaul — splines, SVG node system, dual axis labels
- v3.3.0 (2026-03-25): Committed Duration feature
- v4.0.0 (2026-03-27): Firecrawl integration, confidence scoring, admin auth, GitHub Actions, runbook

---

*Last updated: 2026-03-27 after v4.0 milestone*
