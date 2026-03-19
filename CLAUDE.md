# Drift — Claude Code Project Context

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
- Use the `frontend-design` skill for all UI decisions
- Use UI/UX Pro Max for design system generation
- Use 21st.dev for component inspiration if specified by the user
- No generic AI aesthetics
- Bold, distinctive design choices
- Performance-optimized (Core Web Vitals)

## Current state — what exists

### Frontend (HTML/CSS/JS — no framework yet)

| File | Status | Description |
|---|---|---|
| `frontend/sandoz.html` | ✅ MVP complete | Full company page — Sandoz AG, The Golden Decade. Timeline centrepiece, 6 objective cards, graveyard with 3 entries. THE reference implementation. |
| `frontend/index.html` | ✅ Complete | Landing page — company browse grid, search, sector filters, sort, how-it-works strip, manifesto, ad placements |
| `frontend/admin.html` | ✅ Complete | Dark admin UI — dashboard, add company form, review queue, agent run history. Connects to Supabase via anon key. |
| `frontend/timeline-concept.html` | ✅ Complete | Standalone concept demo — the momentum scale showcase and above/below-ground timeline metaphor |
| `frontend/_archive-v1.html` | 🗄 Archive | Earlier iteration of the Sandoz page (PromiseTrack branding, pre-Drift). Keep for reference only. |

### Backend

| File | Status | Description |
|---|---|---|
| `backend/schema.sql` | ✅ Complete | Full Supabase/Postgres schema — companies, objectives, signals, agent_runs tables, views, RLS policies, triggers, Sandoz seed data |
| `backend/agent.py` | ✅ Complete | Python research agent — monthly runs, intake for new companies, uses Claude API with web search, writes draft signals to Supabase for human review |

### Brand

| File | Status | Description |
|---|---|---|
| `brand/brand-language.html` | ✅ Complete | Full editorial standards doc — voice rules, classification system, momentum scale, graveyard exits, naming conventions, worked examples |
| `brand/colour-palette.html` | ✅ Complete | Interactive visual style guide — all tokens, swatches, dark/light contexts, CSS token block |
| `brand/SKILL.md` | ✅ Complete | Claude skill file — paste into your skills directory so Claude Code always applies Drift brand tokens |

### Docs

| File | Description |
|---|---|
| `docs/setup.md` | Step-by-step guide from zero to first company live (Supabase setup, agent install, cron) |
| `docs/revenue-model.html` | Interactive financial projection — adjustable sliders, 4 revenue streams, P&L chart, breakeven analysis |

---

## The core design concept

### The ground line metaphor
The horizontal timeline is the product's visual centrepiece. A **gold ground line** divides the canvas:
- **Above** = alive. Objectives float above the line according to momentum — the higher, the stronger.
- **Below** = buried. Objectives that drift through the line are entering graveyard territory.
- The **crossing event** (downward) is the editorial moment — this is when alerts fire, signals are logged, stories are written.

### The Momentum Scale — 9 stages
```
+4  Orbit   — exceeded, redefined upward       #6EE7B7
+3  Fly     — ahead of schedule, reinforced     #86EFAC
+2  Run     — on track, strong momentum         #BBF7D0
+1  Walk    — active, progressing steadily      #FDE68A
 0  Watch   — standing still, no signal         #FCD34D  ← GROUND LINE
-1  Crawl   — slowing, language softening       #FCA5A5
-2  Drag    — significant drift, reframing      #F87171
-3  Sink    — entering graveyard territory      #EF4444
-4  Buried  — confirmed off record              #991B1B
```
Each stage has an animated SVG character icon (rocket, bird, running/walking/standing figure, crawling/dragging figure, figure waist-deep, hand reaching from ground). These icons are implemented inline in `sandoz.html` — reuse them exactly.

---

## Brand & Design System

### Typography (never substitute)
- **Playfair Display** — display, headlines, brand wordmark "Drift" (always italic for the wordmark)
- **Source Serif 4** — body copy, editorial prose
- **JetBrains Mono** — all labels, classifications, dates, scores, metadata

### Colour tokens (Caffeine dark — primary)
```css
--bg:           #111111;   /* page base — espresso dark */
--bg-deep:      #0d0d0d;   /* masthead, footer, drawers — deepest surface */
--surface:      #191919;   /* cards, panels */
--surface2:     #222222;   /* hover, active cards */
--surface3:     #2a2a2a;   /* tertiary elements */
--ink:          #eeeeee;   /* primary text — light on dark */
--ink-light:    #cccccc;   /* secondary text */
--ink-muted:    #999999;   /* captions */
--ink-faint:    #666666;   /* labels, metadata */
--ink-ghost:    #444444;   /* disabled */
--parchment:    #eeeeee;   /* alias for primary light text */
--gold:         #ffe0c2;   /* crema — ground line + brand mark ONLY */
--gold-light:   #ffe0c2;   /* crema on all contexts */
--gold-pale:    #393028;   /* crema tint backgrounds */
--rule:         #2a2520;   /* section dividers, card borders */
--border:       rgba(255,224,194,.12);
--border2:      rgba(255,224,194,.22);
/* Status — semantic only, never decorative */
--status-active-bg:  #0f2b1f;   /* On Record — dark green */
--status-active:     #4ade80;   /* On Record text */
--status-drift-bg:   #2a1a05;   /* Under Watch / Drifting — dark amber */
--status-drift:      #f59e0b;   /* Watch text */
--status-dropped-bg: #1e0a0a;   /* Off Record — dark red */
--status-dropped:    #f87171;   /* Dropped text */
--status-morphed-bg: #0a1e2e;   /* Morphed — dark blue */
--status-morphed:    #60a5fa;   /* Morphed text */
```
All pages now use the Caffeine dark palette. The admin UI shares the same token set.
See `brand/colour-palette.html` for the complete token reference and `brand/SKILL.md` for the full specification.

### Critical design rules
1. Crema (`--gold`) belongs to the ground line and brand wordmark only — not a general accent
2. Status colours carry editorial meaning — never use them decoratively
3. Momentum spectrum is sequential — never reorder or skip stages
4. Graveyard exit badge colours are exclusive to graveyard entries
5. Dark espresso backgrounds (`#111111`), light neutral text (`#eeeeee`) — never warm/parchment backgrounds
6. Ink text is layered: ink → ink-light → ink-muted → ink-faint → ink-ghost
7. No font-size below 0.6rem anywhere — minimum 0.875rem for body, 0.65rem for labels
8. No grain/noise overlays — backgrounds are clean for readability
9. Masthead + footer use `var(--bg-deep)` bg with `2px solid var(--gold)` border — never `var(--ink)` as background
10. Cards use `var(--surface)` on `var(--bg)` with solid `var(--rule)` borders
11. `var(--parchment)` is an alias for `--ink` (#eeeeee) — both are light text on dark
12. Logo is always `Drift.` — Playfair Display italic, 1.8rem, period in `var(--gold-light)`, linked to `/`

### Motion & animation rules
- All animations use `cubic-bezier(.23,1,.32,1)` — fast-start, gentle-settle (not bouncy)
- Page-load: stagger above-the-fold elements in reading order (100–150ms increments)
- Below-the-fold: use IntersectionObserver + `.reveal` / `.visible` class pattern, one-shot (no re-hiding)
- Card grids: stagger child reveals at 50ms increments via `.reveal-children`
- Hover: cards lift 2–3px with shadow elevation only — no bounces, no 3D, no colour transitions on backgrounds
- See `brand/SKILL.md` → "Motion & Animation" for full patterns and code

### Anti-slop rules (avoid generic AI aesthetics)
- Never use Inter, Roboto, Arial, system-ui — Playfair Display + Source Serif 4 + JetBrains Mono only
- No purple/violet gradients, no blue-grey backgrounds, no frosted glass navbars
- No floating shapes, blobs, or decorative SVGs — only editorial SVGs (momentum icons)
- No gradient hero backgrounds — use solid dark surfaces with typography-led composition
- Dark shadows: `rgba(0,0,0,...)` — appropriate for dark theme
- See `brand/SKILL.md` → "Anti-Slop Rules" for the complete checklist

---

## Data model (Supabase/Postgres)

### Core tables
```
companies       id, name, ticker, sector, initiative_name, initiative_subtitle,
                ir_page_url, intake_context, search_keywords,
                overall_commitment_score, tracking_active, last_research_run

objectives      id, company_id, display_number, title, subtitle, original_quote,
                status (on_record|watch|drifting|achieved|dropped|morphed),
                first_stated_date, last_confirmed_date, exit_date,
                exit_manner, transparency_score, verdict_text,
                successor_objective_id, momentum_score, is_in_graveyard

signals         id, objective_id, company_id, signal_date, source_type,
                source_name, source_url, classification
                (stated|reinforced|softened|reframed|absent|achieved|
                 retired_transparent|retired_silent),
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
python agent.py                        # Run all companies due (monthly schedule)
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
- [ ] **Connect frontend to Supabase** — replace hardcoded Sandoz data in `sandoz.html` with live DB queries. The data model is ready; the HTML needs a JS data layer.
- [ ] **Add 2–3 more companies** — run agent intake on Roche, Volkswagen, or BP (high-interest, high graveyard potential). Test the full pipeline end-to-end.
- [ ] **Domain** — check availability of `drift.io`, `ondrift.com`, `thedrift.co`, `stated.io`

### Medium priority
- [ ] **Visual polish on momentum icons** — the SVG characters work but need refinement. The concept is right; the execution needs a second pass.
- [ ] **Paywall layer** — gate evidence drawers and graveyard full records behind Stripe subscription (€29/mo). Free: card summaries only.
- [ ] **Email alerts** — when an objective crosses the ground line (Watch → Crawl), send a signal digest to subscribers.
- [ ] **Mobile timeline** — the horizontal timeline needs a vertical fallback for screens < 768px.

### Future
- [ ] **Company search landing page connected to company pages** — `index.html` → `sandoz.html` link is live; need dynamic routing for all companies
- [ ] **Cross-company patterns** — sector-level analysis: which sectors have highest silent drop rates
- [ ] **API / data export** — CSV/JSON export for premium subscribers

---

## Development conventions

### File naming
- Company pages: `/{ticker-lowercase}.html` e.g. `/sdz.html`, `/bp.html`
- All new pages follow the design system in `sandoz.html` — not `_archive-v1.html`

### When building new UI
1. Always read `brand/SKILL.md` before writing any CSS
2. Use the token names from the CSS variables — never hardcode hex values directly
3. Typography: Playfair Display + Source Serif 4 + JetBrains Mono. Nothing else.
4. Status colours are classifications — check the brand language doc before applying them

### Code style
- Vanilla HTML/CSS/JS for now — no framework until scale justifies it
- All JS is inline in the HTML file — one file per page is the current pattern
- Responsive breakpoints: 1100px (tablet), 768px (mobile), 480px (small mobile)
- Always include safe-area inset support for notched phones

### The editorial standard
Every classification written must follow the voice rules in `brand/brand-language.html`:
- Fact-based, not judgmental
- Evidenced, not inferred
- Precise, not sensational
- "The objective has been absent from investor communications for three consecutive periods" — YES
- "The company quietly buried its promise" — NO

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

This project was developed in a Claude.ai conversation starting March 2026. Stefano (Head of Infrastructure & Technology Operations at Sandoz, based in Switzerland) is the founder. The project began as "PromiseTrack" and was renamed "Drift" during brand development. All design decisions, editorial standards, and the data architecture were established in that session — this CLAUDE.md is the handoff document.

The Sandoz data in `sandoz.html` is research-grade content based on public disclosures. It is the editorial benchmark for all future company pages.
