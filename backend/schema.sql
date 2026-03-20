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
  'retired_silent'        -- Disappeared without announcement
);

create type exit_manner as enum (
  'silent',       -- Vanished from communications without notice
  'phased',       -- Gradual reduction in language weight over time
  'morphed',      -- Transformed into a new successor objective
  'transparent',  -- Explicitly retired with public explanation
  'achieved'      -- Completed and retired as accomplished
);

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
  graveyard_count            integer default 0,
  last_research_run          timestamptz,
  last_signal_date           date,

  -- Agent intake context (provided when company is added)
  intake_context        text,                   -- "Focus on the Golden Decade narrative..."
  search_keywords       text[]                  -- Extra search terms for agent
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
  is_in_graveyard       boolean default false,

  -- Sort order on page
  display_order         integer default 0
);

create index idx_objectives_company on objectives(company_id);
create index idx_objectives_status on objectives(status);
create index idx_objectives_graveyard on objectives(is_in_graveyard);


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
returns trigger language plpgsql as $$
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
returns trigger language plpgsql as $$
begin
  update companies set
    active_objective_count = (
      select count(*) from objectives
      where company_id = coalesce(new.company_id, old.company_id)
        and status not in ('dropped','morphed')
        and is_in_graveyard = false
    ),
    graveyard_count = (
      select count(*) from objectives
      where company_id = coalesce(new.company_id, old.company_id)
        and is_in_graveyard = true
    )
  where id = coalesce(new.company_id, old.company_id);
  return coalesce(new, old);
end;
$$;

create trigger trg_objective_counts
  after insert or update or delete on objectives
  for each row execute function refresh_company_counts();


-- ── VIEWS ───────────────────────────────────────────────────

-- Company summary for the landing page grid
create view v_company_summary as
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
  c.graveyard_count,
  c.last_signal_date,
  c.last_research_run,
  -- Aggregate pip data for the card
  json_agg(
    json_build_object('status', o.status, 'title', o.title, 'is_graveyard', o.is_in_graveyard)
    order by o.display_order
  ) filter (where o.id is not null) as objectives_summary
from companies c
left join objectives o on o.company_id = c.id
where c.tracking_active = true
group by c.id;

-- Latest signal per objective (for the signal bar)
create view v_latest_signals as
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
create view v_pending_review as
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
  'Track all references to the Golden Decade strategic narrative. Key objectives: global biosimilar leadership, US market penetration (Hyrimoz as flagship), emerging markets volume growth, next-wave pipeline (immunology/oncology/ophthalmology), manufacturing network simplification, margin expansion to 24-26% EBITDA.',
  88
) returning id \gset

-- Seed objectives for Sandoz
-- (In production these would be created via the admin UI or agent intake)


-- ── V2 MIGRATIONS ────────────────────────────────────────────
-- Run these against existing installations to bring them up to v2 schema

alter table companies add column if not exists exchange varchar(10);
