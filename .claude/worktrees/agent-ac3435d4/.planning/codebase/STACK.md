# Technology Stack

**Analysis Date:** 2026-03-26

## Languages

**Primary:**
- **TypeScript** 5+ — Frontend: React components, pages, utilities, type definitions
- **Python** 3.11+ — Backend: Research agent, CLI tools, Supabase integration

**Runtime:**
- **Node.js** 18+ — Frontend development and Next.js server runtime

## Runtime & Package Management

**Environment:**
- **Next.js** 16.2.0 — Full-stack React framework with App Router
- **Node.js** 18+ (inferred from Next.js 16 requirement)

**Package Manager:**
- **npm** — Node package management
- **pip** — Python package management

## Frameworks & Libraries

**Frontend Core:**
- **React** 19.2.4 — UI component library
- **Next.js** 16.2.0 — App Router, server-side rendering, static generation
- **Tailwind CSS** 4 — Utility-first CSS framework
- **TypeScript** 5 — Static typing for React/Next.js code

**Animation & Interaction:**
- **Framer Motion** 12.38.0 — Page transitions, drawer animations, component motion
  - Used in: `PageTransition` (page-level animations), `EvidenceDrawer` (slide-in animations), staggered card grids

**State & Data:**
- **@supabase/supabase-js** 2.99.3 — Postgres database client, real-time subscriptions
  - Wrapping client: `frontend/src/lib/supabase.ts`

**Typography:**
- **Google Fonts** (via `next/font/google`) — DM Sans (UI labels), Lora (editorial prose), IBM Plex Mono (data labels)

## Backend Stack

**Python Runtime:**
- **Python** 3.11+ — Research agent, CLI

**Python Dependencies:**
- **anthropic** >=0.40.0 — Claude API client, web search tool integration
- **supabase** >=2.0.0 — Postgres database client (write access via service key)
- **python-dotenv** >=1.0.0 — Environment variable loading
- **schedule** >=1.2.0 — Bi-weekly cron scheduling (local or cloud)
- **requests** >=2.31.0 — HTTP client (backup for web requests)
- **firecrawl-py** >=1.0.0 — Optional document extraction service (IR pages, PDFs)

**Database:**
- **Supabase** (Postgres 14+) — Primary data store
  - Schema: `backend/schema.sql` — complete schema with enums, tables, views, RLS policies, triggers
  - Client library: `supabase` Python SDK (service role key for agent writes)
  - Tables: `companies`, `objectives`, `signals`, `agent_runs`, plus views and triggers

## Build & Development Tools

**Frontend Build:**
- **next** 16.2.0 — Build tool (handles TypeScript, Tailwind compilation)
- **@tailwindcss/postcss** 4 — PostCSS plugin for Tailwind CSS 4

**Testing:**
- **Vitest** 4.1.0 — Unit test runner (Vite-based, ESM-native)
  - Config: `frontend/vitest.config.ts`
  - Test setup: `frontend/src/test-setup.ts` — imports `@testing-library/jest-dom/vitest`
  - Run: `npm run test` (single run), `npm run test:watch` (watch mode)

**Testing Libraries:**
- **@testing-library/react** 16.3.2 — React component testing (RTL)
- **@testing-library/user-event** 14.6.1 — User interaction simulation
- **@testing-library/jest-dom** 6.9.1 — DOM matchers and utilities
- **@vitejs/plugin-react** 6.0.1 — Vitest React plugin (JSX transform)
- **jsdom** 29.0.1 — DOM implementation for Node.js tests

**Linting & Formatting:**
- **ESLint** 9 — Code quality checks (core ESLint)
- **eslint-config-next** 16.2.0 — Next.js-specific ESLint rules
- No `.eslintrc` file detected — relies on Next.js defaults

**TypeScript:**
- **@types/react** 19 — React type definitions
- **@types/react-dom** 19 — React DOM type definitions
- **@types/node** 20 — Node.js type definitions

**Configuration:**
- `frontend/tsconfig.json` — TypeScript compiler options: ES2017 target, path alias `@/*` → `./src/*`
- `frontend/tailwind.config.ts` — Tailwind CSS v4 dark mode, CSS variable color mappings
- `frontend/vitest.config.ts` — Vitest globals, jsdom environment, path alias
- `frontend/next.config.ts` — `output: "standalone"` for deployments
- `frontend/package.json` — type: "module" (ESM)

## Database Schema & ORM

**Database:**
- **Supabase (Postgres 14+)** — No ORM used; direct SQL queries via `supabase-js` client

**Schema Highlights:**
- Enums: `sector_type`, `objective_status`, `signal_classification`, `exit_manner`, `source_type`, `transparency_score`, `agent_run_status`
- Core tables: `companies`, `objectives`, `signals`, `agent_runs`
- Views: `v_company_summary` (landing page data), `v_latest_signals`, `v_pending_review`
- RLS policies (Row-Level Security) — anon key has read-only access
- Triggers — auto-update timestamps, recompute `overall_commitment_score`

**Agent Integration:**
- Python agent writes via Supabase service role key (`SUPABASE_SERVICE_KEY`)
- Queries: `supabase.table('signals').insert()`, `.update()`, `.select()`
- No ORM — direct table/SQL operations

## External Integrations

**Claude API (research agent):**
- **Model:** `claude-opus-4-1-20250805` (default; configurable to `claude-sonnet-4-20250514` for cost reduction)
- **Tools:** `web_search_20250305` — web search within agent prompts
- **Client:** `anthropic>=0.40.0` library

**Document Extraction (optional):**
- **Firecrawl** — Optional service for scraping company IR pages to markdown
  - Environment variable: `FIRECRAWL_API_KEY` (optional, gracefully disabled if not set)
  - Function: `firecrawl_extract()`, `prefetch_company_docs()` in `backend/agent.py`
  - Fallback: Agent uses web_search if Firecrawl unavailable

**Deployment:**
- **Vercel** — Frontend hosting (inferred from `.vercel/` directory and OIDC token in env)
  - Standalone build output (`next.config.ts`: `output: "standalone"`)

## Configuration Files

**Frontend:**
- `.env.example` — Template for `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `.env.local` — Active environment (git-ignored)
- `tsconfig.json` — TypeScript strict mode, path aliases
- `tailwind.config.ts` — CSS variable-driven theming, dark mode class-based
- `next.config.ts` — Standalone output for production
- `vitest.config.ts` — Test environment setup

**Backend:**
- `.env` file (git-ignored) required with:
  - `ANTHROPIC_API_KEY` — Claude API access
  - `SUPABASE_URL` — Postgres connection
  - `SUPABASE_SERVICE_KEY` — Write-access database key
  - `FIRECRAWL_API_KEY` — Optional document extraction

**Git:**
- `.gitignore` — Excludes node_modules, .env, .next, build artifacts

## Platform Requirements

**Development:**
- Node.js 18+
- Python 3.11+
- npm

**Production:**
- Vercel (frontend) or any Node.js 18+ server supporting App Router
- Supabase project (Postgres 14+)
- Python 3.11+ environment for agent (cron server, GitHub Actions, or cloud function platform)

**Cost Drivers:**
- **Claude API:** ~$0.50–1.50 per bi-weekly company run (Opus); ~$0.10–0.30 (Sonnet)
- **Firecrawl:** Optional; costs vary by document volume
- **Supabase:** Database storage, read/write ops, bandwidth
- **Vercel:** Hobby tier free; Pro tier ~$20/month for analytics, edge functions

## Deployment & CI/CD

**Hosting:**
- **Frontend:** Vercel (Next.js native deployment)
- **Agent:** Self-hosted cron (Linux/Mac server), GitHub Actions, Railway, Render, or Supabase Edge Functions

**Agent Scheduling:**
- Cron job (bi-weekly, runs `python backend/agent.py`)
- CLI-triggered intake (`python backend/agent.py --intake <company-id>`)
- Manual approval via Admin UI (`frontend/src/app/admin/page.tsx`)

---

*Stack analysis: 2026-03-26*
