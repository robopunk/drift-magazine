# Drift — Claude Code Project Context

## Project management

This project uses **GSD (Get Shit Done)** for all planning and execution. Always use GSD workflows:
- `/gsd:new-milestone` — start a new milestone
- `/gsd:plan-phase` — plan a phase before building
- `/gsd:execute-phase` — execute a planned phase
- `/gsd:discuss-phase` — gather context before planning

Planning artifacts live in `.planning/` at the project root (`content/drift magazine/.planning/`).

## What this project is

**Drift** is a strategic accountability research platform. It tracks what major companies publicly commit to — and monitors how that language changes, weakens, or disappears over time. The editorial core concept: most tools measure outcomes; Drift measures the *language of commitment* and the silence that follows when commitment fades.

The product's most distinctive feature is the **Graveyard** — a record of objectives that companies stated publicly and then quietly dropped, reframed, or allowed to disappear without announcement. Each graveyard entry is classified by *how* it ended: Silent Drop, Phased Out, Morphed, or Transparent Exit.

**Brand name:** Drift  
**Working tagline:** What companies commit to. What the record shows. What disappeared.  
**Brand personality:** Strategic intelligence — McKinsey precision meets investigative journalism. Never sensational, always evidenced, quietly authoritative.

---

## Website Creation

### Tech Stack
- Next.js 15 + TypeScript + Tailwind CSS
- Framer Motion for animations

### Design Rules
- Use the AskUserQuestion tool to interview the user about their website design vision before making UI decisions
- Use the GSD tool to plan, build and document work
- Use `ui-ux-pro-max` for all UI decisions and design system generation; use `frontend-design` as a fallback only if `ui-ux-pro-max` is unavailable
- Use 21st.dev for component inspiration if specified by the user
- No generic AI aesthetics
- Bold, distinctive design choices
- Performance-optimized (Core Web Vitals)

## Current state — what exists

### Frontend (Next.js 15 + TypeScript + Tailwind CSS)

| Path | Description |
|---|---|
| `frontend/src/app/` | App Router pages: landing, company/[ticker], about, admin, 404 |
| `frontend/src/components/` | React components: layout (Masthead, Footer, ThemeToggle), landing (Hero, CompanyGrid, SearchBar, SignalFeed), company (TimelineCanvas, TimelineNode, TimelinePath, TimelineLegend, TimelineLegendTooltip, TimelineTooltip, CrossingMarker, ObjectiveCard, BuriedCard, EvidenceTable, TabBar), mobile, ui |
| `frontend/src/lib/` | Shared utilities: types.ts, momentum.ts, timeline-nodes.ts, theme.ts, search.ts, supabase.ts |
| `frontend/src/__tests__/` | 17 test files, 99 tests (Vitest + React Testing Library) |

### v1 Archive

| Path | Description |
|---|---|
| `v1-archive/` | Original vanilla HTML/CSS/JS files (sandoz.html, index.html, admin.html, timeline-concept.html, _archive-v1.html). Reference only. |

### Backend

| File | Status | Description |
|---|---|---|
| `backend/schema.sql` | ✅ Complete | Full Supabase/Postgres schema — companies (with exchange + fiscal_year_end_month fields), objectives, signals (with year_end_review classification), agent_runs tables, views, RLS policies, triggers, Sandoz seed data |
| `backend/agent.py` | ✅ Complete | Python research agent — bi-weekly runs, intake for new companies, uses Claude API with web search, writes draft signals to Supabase for human review |

### Brand

| File | Status | Description |
|---|---|---|
| `brand/brand-language.html` | ✅ Complete | Full editorial standards doc — voice rules, classification system, momentum scale, graveyard exits, naming conventions, worked examples |
| `brand/colour-palette.html` | ⚠️ v1 reference | Interactive visual style guide — v1 caffeine dark tokens. See `docs/specs/2026-03-19-drift-v2-design.md` for current v2 palette. |

### Docs

| File | Description |
|---|---|
| `docs/setup.md` | Setup guide: Supabase, Next.js frontend, agent install, bi-weekly cron |
| `docs/revenue-model.html` | Interactive financial projection — adjustable sliders, 4 revenue streams, P&L chart, breakeven analysis |
| `docs/specs/2026-03-19-drift-v2-design.md` | Complete v2 design specification — canonical reference for palette, typography, components, editorial voice |
| `CHANGELOG.md` | Version history |

---

## The core design concept

### The ground line metaphor
The horizontal timeline is the product's visual centrepiece. A **gold ground line** divides the canvas:
- **Above** = alive. Objectives float above the line according to momentum — the higher, the stronger.
- **Below** = buried. Objectives that drift through the line are entering graveyard territory.
- The **crossing event** (downward) is the editorial moment — this is when alerts fire, signals are logged, stories are written.

### The Momentum Scale — 9 stages
```
+4  Orbit   — exceeded, redefined upward       #059669
+3  Fly     — ahead of schedule, reinforced     #16a34a
+2  Run     — on track, strong momentum         #65a30d
+1  Walk    — active, progressing steadily      #ca8a04
 0  Watch   — standing still, no signal         #d97706  ← GROUND LINE
-1  Crawl   — slowing, language softening       #ea580c
-2  Drag    — significant drift, reframing      #dc2626
-3  Sink    — entering graveyard territory      #b91c1c
-4  Buried  — confirmed off record              #78716c
```
Each stage has an emoji node on the interactive timeline canvas. Stages are defined in `frontend/src/lib/momentum.ts` with Boardroom Allegory captions.

---

## Brand & Design System

> **Canonical reference:** `docs/specs/2026-03-19-drift-v2-design.md`

### Typography (never substitute)
- **DM Sans** (`font-sans`) — UI labels, navigation, metadata
- **Lora** (`font-serif`) — headlines, editorial prose, body copy
- **IBM Plex Mono** (`font-mono`) — data labels, classifications, dates, scores

### Colour palette — Emerald + Slate

**Light mode** (primary): `#f0f8ff` background, `#374151` foreground, `#22c55e` primary
**Dark mode** (toggle): `#0f172a` background, `#d1d5db` foreground, `#34d399` primary

All CSS variables are defined in `frontend/src/app/globals.css`. Tailwind mappings in `frontend/tailwind.config.ts`.

### Critical design rules
1. Status colours carry editorial meaning — never use them decoratively
2. Momentum spectrum is sequential — never reorder or skip stages
3. Graveyard exit badge colours are exclusive to graveyard entries
4. Masthead and footer use forced dark surface tokens (`--forced-dark-*`)
5. Use Tailwind utility classes mapped to CSS variables — never hardcode hex values
6. Logo is always `Drift.` — Lora italic, period in primary colour, linked to `/`

### Motion & animation rules
- Framer Motion for page transitions (`PageTransition` wrapper) and drawer animations
- Card hover: subtle shadow elevation, no bounces or 3D transforms
- Stagger animations on card grids via Framer Motion's staggerChildren

### Anti-slop rules (avoid generic AI aesthetics)
- Never use Inter, Roboto, Arial, system-ui — DM Sans + Lora + IBM Plex Mono only
- No purple/violet gradients, no frosted glass navbars
- No floating shapes, blobs, or decorative SVGs — only editorial emoji nodes
- No gradient hero backgrounds — use solid surfaces with typography-led composition

---

## Data model (Supabase/Postgres)

### Core tables
```
companies       id, name, ticker, exchange, sector, initiative_name, initiative_subtitle,
                ir_page_url, intake_context, search_keywords,
                fiscal_year_end_month (1-12, default 12),
                overall_commitment_score, tracking_active, last_research_run

objectives      id, company_id, display_number, title, subtitle, original_quote,
                status (on_record|watch|drifting|achieved|dropped|morphed),
                first_stated_date, last_confirmed_date, exit_date,
                exit_manner, transparency_score, verdict_text,
                successor_objective_id, momentum_score, is_in_graveyard

signals         id, objective_id, company_id, signal_date, source_type,
                source_name, source_url, classification
                (stated|reinforced|softened|reframed|absent|achieved|
                 retired_transparent|retired_silent|year_end_review),
                confidence (1-10), excerpt, agent_reasoning,
                is_draft, reviewed_by, reviewed_at

agent_runs      id, company_id, triggered_by, status, signals_proposed,
                signals_approved, estimated_cost_usd, run_summary, raw_log
```

### Key views
- `v_company_summary` — landing page grid data with objectives JSON
- `v_latest_signals` — most recent signal per objective
- `v_pending_review` — draft signals awaiting human approval

---

## The research agent

**File:** `backend/agent.py`  
**Language:** Python 3.11+  
**Dependencies:** `anthropic`, `supabase`, `python-dotenv`, `schedule`

### Environment variables required
```
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
```

### Key commands
```bash
python agent.py                        # Run all companies due (bi-weekly schedule)
python agent.py --intake <company-id>  # Full intake for new company (2-5 min, ~$2)
python agent.py --company-id <id>      # Run one company on demand
python agent.py --review               # Show all draft signals pending review
python agent.py --approve <signal-id>  # Publish a signal
python agent.py --reject  <signal-id>  # Delete a draft signal
```

### Agent design principle
The agent **never publishes directly**. Every signal is a draft until a human approves it in the admin UI or via CLI. This is intentional — strategic accountability research requires editorial judgment. The agent does the reading and classification; the human does the verification.

---

## What's been built — editorial content (Sandoz)

### 6 active objectives tracked
1. **Global Biosimilar Leadership** — Fly (+3) · 11 signals · 4 evidence entries
2. **US Biosimilar Penetration** — Fly (+3) · 9 signals · 3 evidence entries
3. **Emerging Markets Volume Growth** — Crawl (−1) · 7 signals · 4 evidence entries ⚠️ Watch
4. **Next-Wave Biosimilar Pipeline** — Fly (+3) · 11 signals · 3 evidence entries
5. **Manufacturing Network Simplification** — Drag (−2) · 5 signals · 4 evidence entries ⚠️ Drifting
6. **Margin Expansion to 24–26%** — Fly (+3) · 8 signals · 4 evidence entries

### 3 graveyard entries
1. **China Growth Platform** — Silent Drop · Transparency: Very Low · Oct 2023 → Q2 2024
2. **Explicit 2025 Revenue Target** — Morphed → "mid-to-high single digit CAGR" · Transparency: Low
3. **Branded Generics Expansion (MENA)** — Phased Out · Transparency: Medium · → absorbed into OBJ 03

---

## Immediate next priorities (suggested)

### High priority
- [ ] **Connect to live Supabase** — set env vars, verify data flows through to all pages
- [ ] **Add 2-3 more companies** — run agent intake on Roche, Volkswagen, or BP. Test the full pipeline end-to-end.
- [ ] **Domain** — check availability of `drift.io`, `ondrift.com`, `thedrift.co`, `stated.io`
- [ ] **Deploy** — Vercel deployment with Supabase env vars

### Medium priority
- [ ] **Paywall layer** — gate evidence drawers and graveyard full records behind Stripe subscription
- [ ] **Email alerts** — when an objective crosses the ground line, send a signal digest to subscribers
- [ ] **Responsive polish** — responsive breakpoints, mobile UX refinement

### Future
- [ ] **Cross-company patterns** — sector-level analysis: which sectors have highest silent drop rates
- [ ] **API / data export** — CSV/JSON export for premium subscribers
- [ ] **SEO** — dynamic OG images, structured data, sitemap

---

## Development conventions

### Tech stack
- **Next.js 15+** with App Router, TypeScript, Tailwind CSS
- **Framer Motion** for animations
- **@panzoom/panzoom** for interactive timeline canvas
- **Vitest + React Testing Library** for tests
- **Supabase** for Postgres backend

### File structure
```
frontend/src/
  app/                    App Router pages
    company/[ticker]/     Dynamic company pages (server + client components)
  components/
    layout/               Masthead, Footer, ThemeToggle, PageTransition
    landing/              Hero, SearchBar, CompanyCard, CompanyGrid, SignalFeed, AdSlot
    company/              TimelineCanvas, ObjectiveCard, BuriedCard, EvidenceTable, TabBar
    mobile/               MobileObjectiveList
    ui/                   Skeleton, Toast
  lib/                    types.ts, momentum.ts, theme.ts, search.ts, supabase.ts
  __tests__/              Test files mirroring component structure
```

### When building new UI
1. Read the v2 design spec (`docs/specs/2026-03-19-drift-v2-design.md`) for canonical tokens
2. Use Tailwind utility classes mapped to CSS variables — never hardcode hex values
3. Typography: DM Sans + Lora + IBM Plex Mono. Nothing else.
4. Status colours are classifications — check the brand language doc before applying them

### The editorial standard
Every classification written must follow the voice rules in `brand/brand-language.html`:
- Fact-based, not judgmental
- Evidenced, not inferred
- Precise, not sensational
- Economist x Vanity Fair voice: analytical clarity with narrative flair and dry wit

---

## Revenue model (reference)

Four streams, in activation order:
1. **Display ads** (Day 1) — Carbon Ads / EthicalAds. B2B CPM ~€12. ~€200/mo at 8k visitors.
2. **Direct sponsorship** (Month 3) — €350/mo per sponsor. Target: pharma data providers, IR tools.
3. **Premium subscriptions** (Month 6) — €29/mo. Gate: evidence drawers, graveyard records, exports.
4. **Research reports** (Month 6) — €199/report. 2–3/month. Generated from DB + editorial polish.

Breakeven at current assumptions: Month 7–8. Pre-breakeven cash outlay: ~€400–600.
See `docs/revenue-model.html` for the interactive projection.

---

## Session context

This project was developed in Claude.ai and Claude Code starting March 2026. Stefano (Head of Infrastructure & Technology Operations at Sandoz, based in Switzerland) is the founder. The project began as "PromiseTrack" and was renamed "Drift" during brand development.

- **v1.0.0** (2026-03-19): Original vanilla HTML/CSS/JS implementation with caffeine dark palette
- **v2.0.0** (2026-03-20): Complete Next.js redesign with emerald+slate palette, interactive timeline, tabbed company pages
- **v3.0.0** (2026-03-25): Visual overhaul — masthead redesign, organic spline paths with area fill, 6-type SVG node system, dual axis labels. See `docs/2026-03-25-2121-drift-visual-and-intelligence-roadmap.md` for full roadmap. Next up: Sub-project 2 (Objective Lifecycle: Achieved)

The Sandoz data (seeded in `backend/schema.sql`) is research-grade content based on public disclosures. It is the editorial benchmark for all future company pages.
