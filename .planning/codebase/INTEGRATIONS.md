# External Integrations

**Analysis Date:** 2026-03-26

## APIs & External Services

**Claude API (Research Agent):**
- **Service:** Anthropic Claude API
- **What it's used for:** Autonomous research agent — bi-weekly runs analyze company disclosures, classify language against tracked objectives, detect silent achievement, and generate draft signals
- **SDK/Client:** `anthropic>=0.40.0` Python library
- **Auth:** Environment variable `ANTHROPIC_API_KEY` (sk-ant-...)
- **Location in code:** `backend/agent.py` lines 134–135, initialized via `get_clients()` function
- **Tools Used:**
  - `web_search_20250305` — Web search tool for discovering company disclosures
  - Claude's text analysis — Classification of language changes (stated, reinforced, softened, reframed, absent, achieved, retired_transparent, retired_silent)

**Firecrawl (Document Extraction):**
- **Service:** Firecrawl.dev — Web scraping and markdown extraction
- **What it's used for:** Optional pre-fetching of company investor relations pages and additional source documents before agent research begins
- **SDK/Client:** `firecrawl-py>=1.0.0` Python library
- **Auth:** Environment variable `FIRECRAWL_API_KEY` (fc-...)
- **Location in code:** `backend/agent.py` lines 41–63 (`firecrawl_extract()` function), 66–97 (`prefetch_company_docs()` function)
- **Graceful Degradation:** If `FIRECRAWL_API_KEY` is not set or Firecrawl import fails, the agent continues without pre-fetching (lines 40–44)
- **Usage:** Converts company IR pages to markdown, prepended to agent prompt as "PRE-FETCHED DOCUMENTS" section (lines 90–97)

## Data Storage

**Supabase (Postgres 14+):**
- **Type:** Fully managed Postgres database + auth + real-time + storage
- **Connection:**
  - Frontend: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (read-only anon key)
  - Backend: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (write-access service role key)
- **Client Libraries:**
  - Frontend: `@supabase/supabase-js ^2.99.3` — JavaScript SDK
  - Backend: `supabase ^2.0.0` — Python SDK
- **Location in code:**
  - Frontend wrapper: `frontend/src/lib/supabase.ts` — creates `supabase` client instance
  - Backend: `backend/agent.py` lines 37, 135 — `create_client(SUPABASE_URL, SUPABASE_KEY)`
- **Schema:** `backend/schema.sql` — Complete schema definition:
  - Tables: `companies`, `objectives`, `signals`, `agent_runs`
  - Views: `v_company_summary` (landing page grid data), `v_latest_signals`, `v_pending_review`
  - Enums: `sector_type`, `objective_status`, `signal_classification`, `exit_manner`, `source_type`, `transparency_score`, `agent_run_status`, `terminal_state`
  - RLS Policies: Anon key restricted to read-only; service key has full write access
  - Triggers: Auto-update `updated_at` timestamps, recompute aggregate scores
- **Key Operations:**
  - `companies.select()` — Fetch tracked companies with objectives
  - `objectives.update()` — Update momentum scores, status, graveyard fields
  - `signals.insert()` — Agent writes draft signals
  - `agent_runs.insert/update()` — Track research execution, costs, status
  - `v_pending_review.select()` — Fetch draft signals awaiting human approval

**No additional file storage** — All company documents referenced via URLs (ir_page_url, additional_sources), not stored in Supabase

**No caching layer configured** — Supabase provides its own query caching; client-side caching via React state

## Authentication & Identity

**Auth Provider:** None configured

**Current State:**
- Frontend uses anon key (read-only access) — no user login required
- Backend agent uses service role key (write access) — no user authentication
- Admin UI (`frontend/src/app/admin/page.tsx`) is unprotected — intended for self-hosted single-user deployment
- Future: Paywall via Stripe will require user sign-up (planned, not yet implemented)

## Monitoring & Observability

**Error Tracking:** Not detected

**Logs:**
- **Agent logs:** Directed to `logs/agent.log` via cron job redirect (docs/setup.md line 119)
  - Format: Printed to stdout/stderr, captured to log file
  - Content: Research run status, Firecrawl errors, API costs, signal proposals
- **Frontend logs:** Browser console only — no centralized logging
- **No Sentry, LogRocket, or external monitoring detected**

**Agent Run Tracking:**
- `agent_runs` table — tracks job execution, status (running, completed, failed, pending_review), cost estimates, signal counts
- Accessible via `python backend/agent.py --review` to inspect pending signals

## CI/CD & Deployment

**Hosting:**
- **Frontend:** Vercel (inferred from `.vercel/` directory and `VERCEL_OIDC_TOKEN` in `.env.local`)
  - Build: `npm run build` (Next.js 16 standalone output)
  - Deploy: Automatic on git push to main
- **Backend Agent:** Self-hosted or cloud-scheduled
  - Options: Linux/Mac cron, GitHub Actions, Railway, Render, Supabase Edge Functions
  - Trigger: `python backend/agent.py` (runs all companies due)

**Build Pipeline:**
- Frontend: `next build` → `output: "standalone"` (server artifacts + node_modules)
- No Docker detected; Docker setup delegated to deployment platform

**Environment Configuration:**
- Frontend: `.env.local` with `NEXT_PUBLIC_*` variables (safe for browser)
- Backend: `.env` with secrets (`ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_KEY`, optional `FIRECRAWL_API_KEY`)
- Secrets never committed — `.env` and `.env.local` in `.gitignore`

## Webhooks & Callbacks

**Incoming:** None configured

**Outgoing:** None configured

**Future consideration:** Email alerts when objectives cross the ground line (planned feature)

## Developer Experience Integration

**TypeScript:** Full type safety across frontend; Python types for agent
- Frontend types: `frontend/src/lib/types.ts` — `Company`, `Objective`, `Signal`, `CompanySummary` interfaces
- Backend types: Implicit via table schemas (no TypeScript in agent)

**Package Managers:**
- `npm install` — Frontend dependencies
- `pip install` — Backend dependencies (requirements.txt)

**Environment Setup:**
- `.env.example` — Template provided
- `docs/setup.md` — Step-by-step guide for Supabase, frontend, agent, cron scheduling

## API Surface for External Integrations

**Frontend Public API:** None — read-only Supabase access via anon key

**Backend Research Agent API:**
- CLI commands:
  ```bash
  python agent.py                    # Run all companies due
  python agent.py --company-id <id>  # Run specific company
  python agent.py --intake <id>      # Full intake (new company)
  python agent.py --correlate <id>   # Correlation pass only
  python agent.py --review           # List draft signals
  python agent.py --approve <sig-id> # Publish signal
  python agent.py --reject <sig-id>  # Delete draft signal
  ```
- No HTTP API — CLI-based, intended for self-hosted use

**Future API Expansion (planned):**
- Premium subscriptions will gate evidence drawers, graveyard records, CSV/JSON exports
- Stripe integration for payment processing (revenue model in `docs/revenue-model.html`)

## Integration Points Summary

| Integration | Type | Required | Location | Purpose |
|---|---|---|---|---|
| **Supabase** | Database | Yes | Frontend + Backend | Data storage, real-time, RLS |
| **Claude API** | AI/LLM | Yes (Agent) | `backend/agent.py` | Research, classification |
| **Firecrawl** | Web Scraping | Optional | `backend/agent.py` | Document extraction |
| **Vercel** | Deployment | Current | Frontend | Hosting + CI/CD |
| **Google Fonts** | Typography | Yes | `frontend/src/app/layout.tsx` | DM Sans, Lora, IBM Plex Mono |
| **Framer Motion** | Animation | Yes | Multiple components | Page/drawer transitions |
| **Next.js / Tailwind** | Framework | Yes | Frontend | UI rendering, styling |

---

*Integration audit: 2026-03-26*
