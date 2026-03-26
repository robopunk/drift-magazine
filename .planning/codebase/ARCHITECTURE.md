# Architecture

**Analysis Date:** 2026-03-26

## Pattern Overview

**Overall:** Tiered full-stack application with server-side data fetching, client-side interactivity, and fully autonomous backend research pipeline.

**Key Characteristics:**
- Next.js 15 App Router with server and client component separation
- Supabase (PostgreSQL) as single source of truth for all domain data
- Python research agent runs autonomously on schedule with no human-in-the-loop
- Signal-driven momentum tracking: each objective's state is computed from chronological signal classification history
- Dual terminal states for objectives: "proved" (delivered) and "buried" (graveyard)

## Layers

**Presentation Layer (Frontend):**
- Purpose: Render company pages, interactive timelines, objective grids, and signal evidence. Handle theme switching and navigation state.
- Location: `frontend/src/app/` (pages), `frontend/src/components/` (React components)
- Contains: App Router pages, layout components, interactive canvases, UI primitives
- Depends on: Supabase client library, Framer Motion for animations, React Testing Library for tests
- Used by: End users via browser; admin users via `/admin` page

**Business Logic Layer (Frontend Library):**
- Purpose: Momentum scoring algorithm, signal classification, timeline node generation, search utilities, type definitions
- Location: `frontend/src/lib/`
- Contains:
  - `momentum.ts` — momentum stages definition (9-stage scale from Orbit +4 to Buried -4), delta mapping, running score computation
  - `timeline-nodes.ts` — generates monthly nodes with fiscal year markers, stale signal detection
  - `types.ts` — TypeScript interfaces for Company, Objective, Signal, AgentRun, and all enums
  - `theme.ts` — light/dark mode toggle with cookie persistence
  - `search.ts` — company name/ticker search
  - `supabase.ts` — initialized Supabase client
  - `accountability.ts` — accountability tier colour mapping
  - `classifications.ts` — signal classification metadata
- Depends on: None (pure functions and type definitions)
- Used by: All components, pages, tests

**Data Persistence Layer (Supabase PostgreSQL):**
- Purpose: Central schema for companies, objectives, signals, agent runs, and all audit trails
- Location: `backend/schema.sql`
- Contains:
  - `companies` — tracked entities with sector, exchange, initiative metadata, fiscal calendar, last research timestamp
  - `objectives` — 1:N per company, display number, title, commitment windows (committed_from, committed_until), momentum score, terminal state (proved/buried)
  - `signals` — 1:N per objective, signal_date, classification (stated|reinforced|softened|reframed|absent|achieved|retired_transparent|retired_silent|year_end_review|deadline_shifted), confidence, is_draft flag, agent_reasoning
  - `agent_runs` — audit trail: triggered_by, status, input/output tokens, estimated_cost_usd, run_summary, raw_log (JSONB)
  - `company_searches` — saved search queries per company for agent to use each run
  - Views: `v_company_summary`, `v_latest_signals`, `v_pending_review`
  - Triggers: `trg_companies_updated`, `trg_objectives_updated` (keep updated_at current), `refresh_company_counts` (cache active/proved/graveyard counts)
  - RLS policies: Ready for future implementation but not yet enforced
- Depends on: PostgreSQL 14+, UUID gen_random_uuid extension
- Used by: Frontend (via Supabase JS client), Agent (via Supabase Python client with service role key)

**Research Agent (Backend):**
- Purpose: Fully autonomous research pipeline. Discovers new disclosures, classifies signals, runs correlation pass to detect terminal states, publishes directly to Supabase.
- Location: `backend/agent.py`
- Contains:
  - Bi-weekly scheduled runs (one per tracked company)
  - Intake workflow for new companies (2–5 min, ~$2 cost per company)
  - Web search via Anthropic Claude API (web_search tool)
  - Optional Firecrawl integration to pre-fetch company IR pages
  - Signal generation: proposes signals with classification, confidence, excerpt, agent_reasoning
  - Correlation pass: cross-references objectives, detects silent achievements, promotes objectives to "proved" or buried state
  - Signal lifecycle: all signals published directly as non-draft (is_draft=false) — **no human review required**
  - Error handling: exceptions logged to agent_runs.error_message; no partial commits on failure
- Environment: Python 3.11+, requires ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY
- Used by: Cron scheduler (bi-weekly), manual triggers via CLI args

## Data Flow

**Synchronous Server-to-Client (page load):**

1. User navigates to `/company/[ticker]`
2. Server component `frontend/src/app/company/[ticker]/page.tsx` calls:
   - `getCompanyByTicker(ticker)` → queries `companies` table via Supabase client
   - `getObjectives(companyId)` → queries `objectives` table, ordered by momentum_score desc
   - `getSignals(companyId)` → queries `signals` table, eq(is_draft, false), ordered by signal_date desc
3. Server component filters objectives into active, proved, buried sets
4. Data passed to client component `CompanyPageClient` which renders tabs: Timeline, Objectives, Proved, Buried, Evidence
5. TimelineCanvas receives objectives + signals; computes running momentum from signal classifications (via momentum.ts)

**Asynchronous Agent Research (backend):**

1. Cron triggers `python agent.py` for company due for research
2. Agent fetches company row, objectives, previous signals from Supabase
3. Agent constructs prompt with company context + previous objectives + search keywords
4. Optional: Firecrawl pre-fetches company IR page to markdown
5. Claude API processes prompt, uses web_search tool to discover new disclosures
6. Agent classifies each discovery against each objective → generates Signal object
7. Agent runs correlation pass:
   - Cross-references signals across objectives
   - Detects silent achievements (objective not mentioned in recent disclosures) → confidence drop
   - Promotes objectives: if momentum_score crosses -3 → terminal_state='buried', is_in_graveyard=true
   - Promotes objectives: if clearly achieved → terminal_state='proved'
8. Agent writes all signals to `signals` table with is_draft=false
9. Agent logs run metadata to `agent_runs` table (status='completed', cost_usd calculated)
10. Frontend picks up new signals on next page load

**State Management (Momentum):**

- Objective state is **computed** from signal sequence, never stored as a single value
- Algorithm in `frontend/src/lib/momentum.ts`:
  - Each signal has classification (stated, reinforced, softened, reframed, absent, achieved, retired_transparent, retired_silent, year_end_review, deadline_shifted)
  - Each classification maps to delta: +1.5 (achieved), +0.5 (reinforced), +1 (stated), -1 (softened), -1.5 (reframed), -2 (absent/retired_transparent), -3 (retired_silent)
  - Sort signals by signal_date chronologically
  - Compute running sum of deltas, clamped to [-4, 4]
  - Current momentum_score = running sum at latest signal
  - Score maps to stage name via scoreToStage() — determines emoji, colour, caption, label
- Page renders latest score; timeline canvas renders all intermediate scores as nodes
- Terminal states override: if objective.terminal_state='proved' or 'buried', it's final regardless of score

## Key Abstractions

**Momentum Stage (9-level scale):**
- Purpose: Encapsulates the editorial interpretation of objective health. Each stage has emoji, colour, caption, score.
- Examples: `frontend/src/lib/momentum.ts` STAGES array
- Pattern: Enum-like definition with lookup maps; scoreToStage() function converts numeric score to stage name

**Signal Classification:**
- Purpose: Agent's classification of a disclosure mention relative to an objective
- Types: stated, reinforced, softened, reframed, absent, achieved, retired_transparent, retired_silent, year_end_review, deadline_shifted
- Pattern: Enum in schema.sql and TypeScript types.ts; mapped to delta in momentum.ts for score computation

**Objective Terminal State:**
- Purpose: Final disposition of an objective once it exits the active tracking zone
- States: null (active), "proved" (delivered), "buried" (graveyard)
- Pattern: Checked on server during objective filtering (page.tsx) and on client during tab selection (client.tsx)

**Timeline Node:**
- Purpose: Single point on the interactive timeline canvas representing a signal, fiscal year-end marker, cadence check, or stale detection
- Examples: `frontend/src/lib/timeline-nodes.ts` generateMonthlyNodes()
- Pattern: Composite of date, x/y coordinates, momentum score, associated signal, metadata (isFiscalYearEnd, monthsSinceLastSignal)

## Entry Points

**Landing Page:**
- Location: `frontend/src/app/page.tsx`
- Triggers: User navigates to `/`
- Responsibilities: Fetch all active companies from `v_company_summary` view, fetch 8 latest signals from `v_latest_signals` view, render CompanyGrid + SignalFeed sidebar

**Company Page (Server):**
- Location: `frontend/src/app/company/[ticker]/page.tsx`
- Triggers: User navigates to `/company/[ticker]`
- Responsibilities: Fetch company by ticker (case-insensitive), fetch objectives (ordered by momentum desc), fetch all signals. Partition objectives into active/proved/buried. Pass to CompanyPageClient.

**Company Page (Client):**
- Location: `frontend/src/app/company/[ticker]/client.tsx`
- Triggers: Server component renders CompanyPageClient after data fetch
- Responsibilities: Manage tab state (timeline|objectives|proved|buried|evidence) via URL params. Render appropriate component per tab. Handle tab switching with router.replace().

**Admin Page:**
- Location: `frontend/src/app/admin/page.tsx`
- Triggers: User navigates to `/admin`
- Responsibilities: Display pending review signals, allow approval/rejection (future: full company CRUD)

**About Page:**
- Location: `frontend/src/app/about/page.tsx`
- Triggers: User navigates to `/about`
- Responsibilities: Static editorial content about Drift methodology

## Error Handling

**Strategy:** Graceful degradation with console logging for debugging.

**Patterns:**
- Frontend pages catch Supabase query errors, log to console, return empty arrays or null fallback
  - Example: `frontend/src/app/page.tsx` getCompanies() catches error, returns []
- TimelineCanvas handles edge cases: no signals → render empty state, invalid date → skip node
- Agent catches exceptions in main loop, logs to agent_runs.error_message, continues to next company
- Supabase RLS policies prevent unauthorized writes (not yet enforced; ready for production)

## Cross-Cutting Concerns

**Logging:**
- Frontend: console.error() for Supabase failures only
- Agent: stdout prints with status prefixes (✅, ⚠️, ❌); full logs written to agent_runs.raw_log as JSONB

**Validation:**
- Frontend: TypeScript ensures type safety; no runtime validation (Supabase handles DB constraints)
- Agent: Claude API response validated for required fields (objective_id, classification, etc.); defaults fallback on missing fields
- Database: schema enforces enums, NOT NULL, foreign keys, check constraints (e.g., fiscal_year_end_month BETWEEN 1 AND 12)

**Authentication:**
- Frontend: Supabase anon key (read-only for pages; admin endpoints can use service role)
- Agent: Supabase service role key (full write access; no row-level filtering needed)
- Admin: Currently no auth; future: add Supabase Auth integration

**Fiscal Year Handling:**
- Companies table: `fiscal_year_end_month` (1–12, default 12)
- TimelineCanvas: optional `fiscalYearEndMonth` prop; timeline-nodes.ts marks fiscal year-end months with special node type
- Agent: uses fiscal_year_end_month when formatting year-end review classifications

---

*Architecture analysis: 2026-03-26*
