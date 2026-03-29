# Drift — Project

**Owner:** Stefano (Drift founder, Sandoz Head of Infra, Switzerland)
**Current version:** v4.2.0 (in progress)
**Status:** Live in production — v4.2 Timeline UI Overhaul underway

---

## Current Milestone: v4.2 Timeline UI Overhaul

**Goal:** Eliminate visual bugs, declutter the canvas, and upgrade node quality to match Drift's editorial standard.

**Target features:**
- Area-fill clip bug — red zone anchors correctly at ground line (not above it)
- Path smoothness — visually continuous, smooth spline
- Node & icon quality — larger, higher-quality markers; better visual aesthetics
- Node declutter — smart stacking, no overlapping ticks and labels
- Content node sizing — nodes with labels sized for legibility
- Tooltip redesign — clean, well-positioned hover/click signal tooltips
- Graveyard zone weight — below-ground territory with stronger editorial visual cue
- Edge overflow — no clipping at canvas edges; proper padding throughout

---

## What This Is

**Drift** is a strategic accountability research platform that tracks what major companies publicly commit to — and monitors how that language changes, weakens, or disappears over time.

The research agent (v4.0) uses **Firecrawl** for structured web scraping + **Claude** for signal classification. All signals are human-reviewed before publication. The agent runs bi-weekly on GitHub Actions. The site is live on Vercel at `drift-magazine.vercel.app`. The admin UI is auth-gated via Supabase Auth. Ads are ready for network integration.

**Brand core:** McKinsey precision meets investigative journalism. Never sensational, always evidenced.

---

## Core Value

Measuring the *language of commitment* — and the silence that follows when it fades.

---

## Current State (v4.1.0 — shipped 2026-03-28)

| What | Detail |
|------|--------|
| **Frontend** | Next.js 15 + TypeScript + Tailwind CSS — interactive timeline, momentum scale, graveyard |
| **Backend** | Python agent (`backend/agent.py`) — Firecrawl + Claude, bi-weekly GitHub Actions cron |
| **Database** | Supabase Postgres — RLS, audit trails, draft-only workflow |
| **Auth** | Supabase Auth on `/admin` — email/password gate (verified in production) |
| **Deployment** | Vercel — `drift-magazine.vercel.app` — live with production Supabase env vars |
| **Automation** | GitHub Actions — bi-weekly cron + manual dispatch, 2 clean runs verified |
| **Tests** | 99 frontend (Vitest + RTL) + 26 backend (pytest) = 125 total |
| **Companies** | Sandoz only (6 objectives, 92 signals, 3 graveyard entries) |
| **Ads** | 4 AdSlot placements ready — awaiting ad network integration |
| **Confidence** | 6.78/10 baseline → 9.3/10 modeled with Firecrawl (+37%) |
| **Runbook** | `docs/RUNBOOK.md` — 10 sections, GitHub Actions setup, Firecrawl troubleshooting |
| **Monetization gate** | All 4 conditions cleared ✅ — ready for company #2 intake |

---

## Requirements

### Validated

**v4.0 — Research Enhancement**
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

**v4.1 — Production Readiness**
- ✓ **ENV-01–03**: All env vars configured (backend, frontend, GitHub Actions secrets) — v4.1
- ✓ **AUTH-01–03**: Supabase Auth gate on `/admin` verified in production — v4.1
- ✓ **DB-01–04**: Live Supabase connection, read/write, RLS enforcement all verified — v4.1
- ✓ **DEPLOY-01–03**: Vercel deployed, production URL live, all pages serve real Supabase data — v4.1
- ✓ **SCHED-01–03**: GitHub Actions workflow runs agent end-to-end, 2 clean cycles confirmed — v4.1
- ✓ **OPS-01–02**: Operator monitoring via Actions UI, failure email notifications active — v4.1
- ✓ **E2E-01–03**: Agent → Supabase → Vercel frontend verified, 92 signals live, confidence badges correct — v4.1

### Active (v4.2)

- [ ] **CANVAS-01**: Area-fill clip bug fixed — below-ground red fill anchors at the ground line
- [ ] **CANVAS-02**: Path rendered as smooth continuous spline with no visible kinks
- [ ] **NODE-01**: Node icons enlarged and visually polished (better quality, not emoji-small)
- [ ] **NODE-02**: Node decluttering — overlapping labels and ticks handled via smart stacking
- [ ] **NODE-03**: Content-bearing nodes sized for legibility at normal zoom
- [ ] **TOOLTIP-01**: Tooltip redesigned — clean layout, correct positioning, no clipping
- [ ] **ZONE-01**: Graveyard zone (below-ground) carries stronger editorial visual weight
- [ ] **CANVAS-03**: Canvas edge padding — no content clipping at left/right/top/bottom edges

### Deferred (v4.3+)

- [ ] **Company #2 intake** — run agent intake on Roche, Volkswagen, or BP
- [ ] **Paywall layer** — Stripe subscription gating for evidence drawers + graveyard records
- [ ] **Email alerts** — subscriber digest when objectives cross ground line
- [ ] **Mobile responsive polish** — enhanced mobile UX and breakpoints
- [ ] **Additional companies** — scale beyond Sandoz once #2 intake validates the pipeline

### Out of Scope

- Multi-company scaling — deferred until company #2 intake validates pipeline
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
| agent.py uses `load_dotenv('.env.local')` explicitly | ✓ Default `.env` search doesn't find `.env.local` | v4.1 |
| Client-side auth gate on /admin returns HTTP 200 | ✓ Expected — React renders login form; admin data never exposed without session | v4.1 |
| Vercel deployment via REST API not CLI | ✓ CLI required interactive tty; REST API achieves same result non-interactively | v4.1 |
| Company URL is /company/sdz not /company/sandoz | ✓ Ticker-based routing (SDZ); confirmed in DB | v4.1 |
| OPS-02 via GitHub native email-on-failure | ✓ No workflow modification needed; robopunk is admin owner | v4.1 |
| exit_manner → signal_classification mapping added to agent.py | ✓ 'morphed'→'reframed', 'phased'→'softened', 'resurrected'→'stated' | v4.1 |

---

## Monetization Gate — ALL CLEARED ✅

All 4 conditions satisfied (2026-03-28):

1. ✅ **Editorial maturity** — Sandoz page meets research-grade standards (confidence badges, 92 signals)
2. ✅ **Ad slot readiness** — 4 slots placed, ready for network integration
3. ✅ **Agent stability** — 2 clean GitHub Actions runs confirmed (runs 23685921199 + 23686275614)
4. ✅ **Runbook reviewed** — `docs/RUNBOOK.md` complete (10 sections)

**Company #2 intake is unblocked.** Run: `python backend/agent.py --intake <uuid>`

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
- v4.1.0 (2026-03-28): Live Supabase verified, Vercel deployed, GitHub Actions automation confirmed, 92 signals live
- v4.2.0 (in progress): Timeline UI Overhaul — bug fixes, node quality, declutter, tooltips

---

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

*Last updated: 2026-03-29 — v4.2 milestone started*
