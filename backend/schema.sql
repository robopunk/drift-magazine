-- ============================================================
-- PROMISETRACK · SUPABASE SCHEMA
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ── ENUMS ───────────────────────────────────────────────────

create type sector_type as enum (
  'pharma', 'tech', 'energy', 'consumer', 'finance',
  'industrials', 'healthcare', 'real_estate', 'telecom', 'other'
);

create type objective_status as enum (
  'active',       -- Clearly alive and referenced
  'watch',        -- Language softening, needs monitoring
  'drifting',     -- Measurable language shift detected
  'achieved',     -- Explicitly completed / claimed achieved
  'dropped',      -- Confirmed gone (in graveyard)
  'morphed'       -- Transformed into successor objective
);

create type signal_classification as enum (
  'stated',       -- First time stated
  'reinforced',   -- Explicitly reaffirmed, often with progress
  'softened',     -- Language weakened (less specific, hedged)
  'reframed',     -- Same intent, significantly different language
  'absent',       -- Expected mention absent from disclosure
  'achieved',     -- Claimed completed
  'retired_transparent',  -- Officially retired with explanation
  'retired_silent',       -- Disappeared without announcement
  'year_end_review',      -- Fiscal year-end editorial review
  'deadline_shifted'      -- Company moved its committed deadline
);

create type exit_manner as enum (
  'silent',       -- Vanished from communications without notice
  'phased',       -- Gradual reduction in language weight over time
  'morphed',      -- Transformed into a new successor objective
  'transparent',  -- Explicitly retired with public explanation
  'achieved',     -- Completed and retired as accomplished
  'resurrected'   -- Revived after period of burial
);

-- Migration for existing databases:
-- ALTER TYPE exit_manner ADD VALUE 'resurrected';
-- ALTER TYPE signal_classification ADD VALUE 'year_end_review';
-- ALTER TABLE companies ADD COLUMN fiscal_year_end_month integer DEFAULT 12 CHECK (fiscal_year_end_month BETWEEN 1 AND 12);

create type terminal_state as enum ('proved', 'buried');

create type transparency_score as enum (
  'very_low',     -- No communication of change
  'low',          -- Minimal / indirect acknowledgment
  'medium',       -- Partial explanation given
  'high'          -- Full explicit communication of exit
);

create type source_type as enum (
  'annual_report', 'interim_results', 'earnings_call',
  'investor_day', 'press_release', 'sec_filing', 'prospectus',
  'conference_presentation', 'regulatory_filing', 'other'
);

create type agent_run_status as enum (
  'running', 'completed', 'failed', 'pending_review'
);


-- ── COMPANIES ───────────────────────────────────────────────

create table companies (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz default now(),
  updated_at            timestamptz default now(),

  -- Identity
  name                  text not null,
  ticker                text,
  exchange              varchar(10),
  isin                  text,
  sector                sector_type not null,
  hq_country            text,
  stock_exchange        text,

  -- Initiative
  initiative_name       text not null,          -- "The Golden Decade"
  initiative_subtitle   text,                   -- "of Biosimilars & Generics"
  initiative_start_date date,
  initiative_horizon    text,                   -- "2024–2033"
  initiative_desc       text,                   -- Editorial summary

  -- Display
  logo_initials         text,                   -- "SDZ", "BP" etc.
  accent_color          text default 'green',   -- green|amber|blue|gold|red

  -- Tracking config
  ir_page_url           text,                   -- Investor relations URL
  additional_sources    text[],                 -- Extra URLs to monitor
  tracking_active       boolean default true,
  research_frequency    text default 'monthly', -- monthly|quarterly

  -- Computed/cached (refreshed by agent)
  overall_commitment_score   integer,           -- 0-100
  active_objective_count     integer default 0,
  proved_count               integer default 0,
  graveyard_count            integer default 0,
  last_research_run          timestamptz,
  last_signal_date           date,

  -- Agent intake context (provided when company is added)
  intake_context        text,                   -- "Focus on the Golden Decade narrative..."
  search_keywords       text[],                 -- Extra search terms for agent

  -- Fiscal calendar
  fiscal_year_end_month integer default 12 check (fiscal_year_end_month between 1 and 12)
);

create index idx_companies_sector on companies(sector);
create index idx_companies_active on companies(tracking_active);


-- ── OBJECTIVES ──────────────────────────────────────────────

create table objectives (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz default now(),
  updated_at            timestamptz default now(),

  company_id            uuid not null references companies(id) on delete cascade,

  -- Identity
  display_number        text,                   -- "OBJ 01", "OBJ-X" for graveyard
  title                 text not null,
  subtitle              text,
  original_quote        text,                   -- Exact words from first disclosure

  -- Status
  status                objective_status not null default 'active',
  first_stated_date     date,
  first_stated_source   text,
  last_confirmed_date   date,
  status_changed_at     timestamptz,

  -- Graveyard fields (populated when status = dropped or morphed)
  exit_date             date,
  exit_manner           exit_manner,
  exit_source           text,
  transparency_score    transparency_score,
  verdict_text          text,                   -- Editorial verdict
  successor_objective_id uuid references objectives(id),  -- For morphed

  -- Display / scoring
  momentum_score        integer,                -- 1-5
  evidence_count        integer default 0,
  terminal_state        terminal_state,           -- null = active, 'proved' = delivered, 'buried' = graveyard

  -- Commitment window
  committed_from        date,
  committed_until       date,
  commitment_type       text not null default 'evergreen'
                        check (commitment_type in ('annual', 'multi_year', 'evergreen')),

  -- Sort order on page
  display_order         integer default 0
);

create index idx_objectives_company on objectives(company_id);
create index idx_objectives_status on objectives(status);
create index idx_objectives_terminal on objectives(terminal_state);


-- ── SIGNALS ─────────────────────────────────────────────────
-- The core time-series. Every observation of an objective's language
-- across a disclosure is recorded as a signal.

create table signals (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz default now(),

  objective_id          uuid not null references objectives(id) on delete cascade,
  company_id            uuid not null references companies(id) on delete cascade,

  -- When and where
  signal_date           date not null,
  source_type           source_type not null,
  source_name           text not null,          -- "FY2025 Annual Report"
  source_url            text,
  source_page           text,                   -- "p. 42" or "Q3 transcript line 847"

  -- The classification
  classification        signal_classification not null,
  confidence            integer,                -- 1-10, agent's self-reported confidence
  is_draft              boolean default false,  -- True until human-reviewed

  -- Content
  excerpt               text,                   -- Relevant quoted/paraphrased text
  context               text,                   -- Surrounding context or analyst Q&A
  agent_reasoning       text,                   -- Why the agent classified it this way

  -- Metadata
  detected_by           text default 'agent',   -- 'agent' | 'human'
  reviewed_by           text,
  reviewed_at           timestamptz
);

create index idx_signals_objective on signals(objective_id);
create index idx_signals_company on signals(company_id);
create index idx_signals_date on signals(signal_date desc);
create index idx_signals_draft on signals(is_draft) where is_draft = true;


-- ── AGENT RUNS ──────────────────────────────────────────────
-- Full audit trail of every research run

create table agent_runs (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz default now(),
  completed_at          timestamptz,

  company_id            uuid not null references companies(id) on delete cascade,
  triggered_by          text default 'schedule',  -- 'schedule' | 'manual' | 'intake'

  status                agent_run_status not null default 'running',

  -- What the agent did
  sources_searched      integer default 0,
  documents_read        integer default 0,
  signals_proposed      integer default 0,
  signals_approved      integer default 0,

  -- Costs
  input_tokens          integer,
  output_tokens         integer,
  estimated_cost_usd    numeric(8,4),

  -- Output
  run_summary           text,                   -- Agent's own summary of findings
  error_message         text,
  raw_log               jsonb                   -- Full structured log for debugging
);

create index idx_agent_runs_company on agent_runs(company_id);
create index idx_agent_runs_status on agent_runs(status);
create index idx_agent_runs_created on agent_runs(created_at desc);


-- ── NAMED SEARCHES ──────────────────────────────────────────
-- Saved search queries per company that the agent uses each run

create table company_searches (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid not null references companies(id) on delete cascade,
  search_query          text not null,
  source_hint           text,                   -- "Always check ir.sandoz.com/reports"
  is_active             boolean default true
);


-- ── TRIGGERS: keep updated_at current ───────────────────────

create or replace function set_updated_at()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_companies_updated
  before update on companies
  for each row execute function set_updated_at();

create trigger trg_objectives_updated
  before update on objectives
  for each row execute function set_updated_at();


-- ── TRIGGER: keep cached counts in sync ─────────────────────

create or replace function refresh_company_counts()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  update companies set
    active_objective_count = (
      select count(*) from objectives
      where company_id = coalesce(new.company_id, old.company_id)
        and terminal_state is null
    ),
    proved_count = (
      select count(*) from objectives
      where company_id = coalesce(new.company_id, old.company_id)
        and terminal_state = 'proved'
    ),
    graveyard_count = (
      select count(*) from objectives
      where company_id = coalesce(new.company_id, old.company_id)
        and terminal_state = 'buried'
    )
  where id = coalesce(new.company_id, old.company_id);
  return coalesce(new, old);
end;
$$;

create trigger trg_objective_counts
  after insert or update or delete on objectives
  for each row execute function refresh_company_counts();


-- ── FUNCTION: auto-escalate overdue objectives ─────────────────
-- Called daily via pg_cron or Supabase scheduled function.
-- Moves active objectives past their committed_until to 'watch' status
-- and inserts an 'absent' signal noting the expiry.

create or replace function escalate_overdue_objectives()
returns void language plpgsql
set search_path = ''
as $$
declare
  obj record;
begin
  for obj in
    select id, company_id, title, committed_until
    from objectives
    where committed_until < current_date
      and status = 'active'
      and terminal_state is null
      and commitment_type != 'evergreen'
  loop
    -- Escalate status
    update objectives set status = 'watch', status_changed_at = now()
    where id = obj.id;

    -- Insert system signal
    insert into signals (
      objective_id, company_id, signal_date, source_type, source_name,
      classification, confidence, excerpt, agent_reasoning, detected_by, is_draft
    ) values (
      obj.id, obj.company_id, current_date, 'other', 'System — Deadline Escalation',
      'absent', 10,
      'Committed window expired (' || obj.committed_until || ') with no update from company. Status auto-escalated to watch.',
      'Automatic escalation: objective was active past its committed_until date with no deadline_shifted signal.',
      'system', false
    );
  end loop;
end;
$$;


-- ── VIEWS ───────────────────────────────────────────────────

-- Company summary for the landing page grid
create view v_company_summary with (security_invoker = true) as
select
  c.id,
  c.name,
  c.ticker,
  c.sector,
  c.initiative_name,
  c.initiative_subtitle,
  c.logo_initials,
  c.accent_color,
  c.overall_commitment_score,
  c.active_objective_count,
  c.proved_count,
  c.graveyard_count,
  c.last_signal_date,
  c.last_research_run,
  json_agg(
    json_build_object(
      'status', o.status,
      'title', o.title,
      'terminal_state', o.terminal_state,
      'committed_until', o.committed_until,
      'commitment_type', o.commitment_type
    )
    order by o.display_order
  ) filter (where o.id is not null) as objectives_summary
from companies c
left join objectives o on o.company_id = c.id
where c.tracking_active = true
group by c.id;

-- Latest signal per objective (for the signal bar)
create view v_latest_signals with (security_invoker = true) as
select distinct on (s.objective_id)
  s.*,
  o.title as objective_title,
  o.status as objective_status,
  c.name as company_name
from signals s
join objectives o on o.id = s.objective_id
join companies c on c.id = s.company_id
where s.is_draft = false
order by s.objective_id, s.signal_date desc;

-- Draft signals pending human review
create view v_pending_review with (security_invoker = true) as
select
  s.*,
  o.title as objective_title,
  o.status as objective_status,
  c.name as company_name
from signals s
join objectives o on o.id = s.objective_id
join companies c on c.id = s.company_id
where s.is_draft = true
order by s.created_at desc;


-- ── ROW LEVEL SECURITY ───────────────────────────────────────
-- Enable RLS. Public can read; only service role can write.
-- (Adjust policies based on your auth setup)

alter table companies enable row level security;
alter table objectives enable row level security;
alter table signals enable row level security;
alter table agent_runs enable row level security;
alter table company_searches enable row level security;

-- Public read access for published data
create policy "Public can read companies"
  on companies for select using (tracking_active = true);

create policy "Public can read objectives"
  on objectives for select using (true);

create policy "Public can read approved signals"
  on signals for select using (is_draft = false);

-- Service role has full access (used by the agent)
create policy "Service role full access to companies"
  on companies for all using (auth.role() = 'service_role');

create policy "Service role full access to objectives"
  on objectives for all using (auth.role() = 'service_role');

create policy "Service role full access to signals"
  on signals for all using (auth.role() = 'service_role');

create policy "Service role full access to agent_runs"
  on agent_runs for all using (auth.role() = 'service_role');

create policy "Service role full access to company_searches"
  on company_searches for all using (auth.role() = 'service_role');


-- ── SEED: SANDOZ ────────────────────────────────────────────
-- Pre-populate with the company we've already built UI for

insert into companies (
  name, ticker, exchange, sector, hq_country, stock_exchange,
  initiative_name, initiative_subtitle,
  initiative_start_date, initiative_horizon,
  initiative_desc, logo_initials, accent_color,
  ir_page_url, search_keywords, intake_context,
  overall_commitment_score
) values (
  'Sandoz AG', 'SDZ', 'SIX', 'pharma', 'Switzerland', 'SIX',
  'The Golden Decade', 'of Biosimilars & Generics',
  '2024-01-01', '2024–2033',
  'Spun off from Novartis in October 2023. Self-declared strategic window 2024–2033 to capitalise on expiring originator patents and become the global leader in off-patent medicines.',
  'SDZ', 'green',
  'https://ir.sandoz.com',
  array['Sandoz biosimilar strategy', 'Sandoz Golden Decade', 'Sandoz annual report', 'Sandoz investor day', 'Sandoz earnings call'],
  'Research-grade: 6 active objectives tracked, 51+ signals analyzed, 3 graveyard entries classified. Confidence baseline improved from 6.78 to 9.3/10 via Firecrawl markdown analysis. Editorial maturity achieved Q1 2026. Track all references to the Golden Decade strategic narrative. Key objectives: global biosimilar leadership, US market penetration (Hyrimoz as flagship), emerging markets volume growth, next-wave pipeline (immunology/oncology/ophthalmology), manufacturing network simplification, margin expansion to 24-26% EBITDA.',
  88
) returning id \gset

-- Seed objectives for Sandoz
-- (In production these would be created via the admin UI or agent intake)


-- ── V2 MIGRATIONS ────────────────────────────────────────────
-- Run these against existing installations to bring them up to v2 schema

alter table companies add column if not exists exchange varchar(10);


-- ── V3 MIGRATIONS: Terminal State ──────────────────────────────
-- Run these against existing installations to bring them up to v3 schema

-- Step 1: Create the new enum
-- CREATE TYPE terminal_state AS ENUM ('proved', 'buried');

-- Step 2: Add the new column
-- ALTER TABLE objectives ADD COLUMN terminal_state terminal_state;

-- Step 3: Migrate existing data
-- UPDATE objectives SET terminal_state = 'buried' WHERE is_in_graveyard = true;

-- Step 4: Drop old column and index
-- ALTER TABLE objectives DROP COLUMN is_in_graveyard;
-- DROP INDEX IF EXISTS idx_objectives_graveyard;

-- Step 5: Add new indexes
-- CREATE INDEX idx_objectives_terminal ON objectives(terminal_state);

-- Step 6: Add proved_count to companies
-- ALTER TABLE companies ADD COLUMN proved_count integer DEFAULT 0;


-- ── V4 MIGRATIONS: Commitment Windows ───────────────────────────
-- Run these against existing installations to bring them up to v4 schema

-- Step 1: Add commitment columns
-- ALTER TABLE objectives ADD COLUMN committed_from date;
-- ALTER TABLE objectives ADD COLUMN committed_until date;
-- ALTER TABLE objectives ADD COLUMN commitment_type text NOT NULL DEFAULT 'evergreen'
--   CHECK (commitment_type IN ('annual', 'multi_year', 'evergreen'));

-- Step 2: Add new signal classification
-- ALTER TYPE signal_classification ADD VALUE 'deadline_shifted';

-- Step 3: Create escalation function (copy from above)

-- Step 4: Update v_company_summary view (copy from above)

-- Step 5: Seed Sandoz commitment windows
-- UPDATE objectives SET commitment_type = 'multi_year', committed_from = '2023-10-01', committed_until = '2028-12-31'
--   WHERE title = 'Global Biosimilar Leadership';
-- UPDATE objectives SET commitment_type = 'annual', committed_from = '2024-01-01', committed_until = '2025-12-31'
--   WHERE title = 'US Biosimilar Penetration';
-- UPDATE objectives SET commitment_type = 'annual', committed_from = '2024-01-01', committed_until = '2025-12-31'
--   WHERE title LIKE 'Emerging Markets%';
-- UPDATE objectives SET commitment_type = 'multi_year', committed_from = '2023-10-01', committed_until = '2027-12-31'
--   WHERE title LIKE 'Next-Wave%';
-- UPDATE objectives SET commitment_type = 'multi_year', committed_from = '2023-10-01', committed_until = '2026-12-31'
--   WHERE title LIKE 'Manufacturing%';
-- UPDATE objectives SET commitment_type = 'annual', committed_from = '2024-01-01', committed_until = '2025-12-31'
--   WHERE title LIKE 'Margin Expansion%';

-- ── V5 MIGRATION: ACCOUNTABILITY GRADING ────────────────────
-- Run once against existing DBs (already applied to live DB 2026-03-26):
-- ALTER TABLE companies ADD COLUMN IF NOT EXISTS accountability_tier text
--   CHECK (accountability_tier IN ('Exemplary','Solid','Watchlist','Drifting','Compromised'));
-- [Then create compute_accountability_score() and triggers — see docs/superpowers/plans/2026-03-26-performance-grading.md]

-- ── V5.1 MIGRATION: Firecrawl Source Content ──────────────────────────────
-- Run once against existing databases.
-- Stores the Firecrawl markdown snapshot for audit trail and human verification.
-- Safe for Supabase Postgres 15: nullable column addition is zero downtime.

ALTER TABLE signals ADD COLUMN IF NOT EXISTS source_content text;
