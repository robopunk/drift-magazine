-- ============================================================
-- DRIFT · COMPLETE SCHEMA + SANDOZ SEED DATA
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ── ENUMS ───────────────────────────────────────────────────

create type sector_type as enum (
  'pharma', 'tech', 'energy', 'consumer', 'finance',
  'industrials', 'healthcare', 'real_estate', 'telecom', 'other'
);

create type objective_status as enum (
  'active', 'watch', 'drifting', 'achieved', 'dropped', 'morphed'
);

create type signal_classification as enum (
  'stated', 'reinforced', 'softened', 'reframed', 'absent',
  'achieved', 'retired_transparent', 'retired_silent', 'year_end_review'
);

create type exit_manner as enum (
  'silent', 'phased', 'morphed', 'transparent', 'achieved'
);

create type transparency_score as enum (
  'very_low', 'low', 'medium', 'high'
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
  name                  text not null,
  ticker                text,
  exchange              varchar(10),
  isin                  text,
  sector                sector_type not null,
  hq_country            text,
  stock_exchange        text,
  initiative_name       text not null,
  initiative_subtitle   text,
  initiative_start_date date,
  initiative_horizon    text,
  initiative_desc       text,
  logo_initials         text,
  accent_color          text default 'green',
  ir_page_url           text,
  additional_sources    text[],
  tracking_active       boolean default true,
  research_frequency    text default 'monthly',
  overall_commitment_score   integer,
  active_objective_count     integer default 0,
  graveyard_count            integer default 0,
  last_research_run          timestamptz,
  last_signal_date           date,
  intake_context        text,
  search_keywords       text[]
);

create index idx_companies_sector on companies(sector);
create index idx_companies_active on companies(tracking_active);


-- ── OBJECTIVES ──────────────────────────────────────────────

create table objectives (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz default now(),
  updated_at            timestamptz default now(),
  company_id            uuid not null references companies(id) on delete cascade,
  display_number        text,
  title                 text not null,
  subtitle              text,
  original_quote        text,
  status                objective_status not null default 'active',
  first_stated_date     date,
  first_stated_source   text,
  last_confirmed_date   date,
  status_changed_at     timestamptz,
  exit_date             date,
  exit_manner           exit_manner,
  exit_source           text,
  transparency_score    transparency_score,
  verdict_text          text,
  successor_objective_id uuid references objectives(id),
  momentum_score        integer,
  evidence_count        integer default 0,
  is_in_graveyard       boolean default false,
  display_order         integer default 0
);

create index idx_objectives_company on objectives(company_id);
create index idx_objectives_status on objectives(status);
create index idx_objectives_graveyard on objectives(is_in_graveyard);


-- ── SIGNALS ─────────────────────────────────────────────────

create table signals (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz default now(),
  objective_id          uuid not null references objectives(id) on delete cascade,
  company_id            uuid not null references companies(id) on delete cascade,
  signal_date           date not null,
  source_type           source_type not null,
  source_name           text not null,
  source_url            text,
  source_page           text,
  classification        signal_classification not null,
  confidence            integer,
  is_draft              boolean default false,
  excerpt               text,
  context               text,
  agent_reasoning       text,
  detected_by           text default 'agent',
  reviewed_by           text,
  reviewed_at           timestamptz
);

create index idx_signals_objective on signals(objective_id);
create index idx_signals_company on signals(company_id);
create index idx_signals_date on signals(signal_date desc);
create index idx_signals_draft on signals(is_draft) where is_draft = true;


-- ── AGENT RUNS ──────────────────────────────────────────────

create table agent_runs (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz default now(),
  completed_at          timestamptz,
  company_id            uuid not null references companies(id) on delete cascade,
  triggered_by          text default 'schedule',
  status                agent_run_status not null default 'running',
  sources_searched      integer default 0,
  documents_read        integer default 0,
  signals_proposed      integer default 0,
  signals_approved      integer default 0,
  input_tokens          integer,
  output_tokens         integer,
  estimated_cost_usd    numeric(8,4),
  run_summary           text,
  error_message         text,
  raw_log               jsonb
);

create index idx_agent_runs_company on agent_runs(company_id);
create index idx_agent_runs_status on agent_runs(status);
create index idx_agent_runs_created on agent_runs(created_at desc);


-- ── COMPANY SEARCHES ────────────────────────────────────────

create table company_searches (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid not null references companies(id) on delete cascade,
  search_query          text not null,
  source_hint           text,
  is_active             boolean default true
);


-- ── TRIGGERS ────────────────────────────────────────────────

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
  c.tracking_active,
  json_agg(
    json_build_object('status', o.status, 'title', o.title, 'is_graveyard', o.is_in_graveyard)
    order by o.display_order
  ) filter (where o.id is not null) as objectives_summary
from companies c
left join objectives o on o.company_id = c.id
where c.tracking_active = true
group by c.id;

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


-- ── ROW LEVEL SECURITY ─────────────────────────────────────

alter table companies enable row level security;
alter table objectives enable row level security;
alter table signals enable row level security;
alter table agent_runs enable row level security;

create policy "Public can read companies"
  on companies for select using (tracking_active = true);

create policy "Public can read objectives"
  on objectives for select using (true);

create policy "Public can read approved signals"
  on signals for select using (is_draft = false);

create policy "Service role full access to companies"
  on companies for all using (auth.role() = 'service_role');

create policy "Service role full access to objectives"
  on objectives for all using (auth.role() = 'service_role');

create policy "Service role full access to signals"
  on signals for all using (auth.role() = 'service_role');

create policy "Service role full access to agent_runs"
  on agent_runs for all using (auth.role() = 'service_role');


-- ── SEED DATA: SANDOZ ──────────────────────────────────────

do $$
declare
  sandoz_id uuid;
  obj1_id uuid; obj2_id uuid; obj3_id uuid;
  obj4_id uuid; obj5_id uuid; obj6_id uuid;
  grav1_id uuid; grav2_id uuid; grav3_id uuid;
begin

-- Company
insert into companies (
  name, ticker, exchange, sector, hq_country, stock_exchange,
  initiative_name, initiative_subtitle,
  initiative_start_date, initiative_horizon,
  initiative_desc, logo_initials, accent_color,
  ir_page_url, search_keywords, intake_context,
  overall_commitment_score, last_signal_date
) values (
  'Sandoz AG', 'SDZ', 'SIX', 'pharma', 'Switzerland', 'SIX',
  'The Golden Decade', 'of Biosimilars & Generics',
  '2024-01-01', '2024-2033',
  'Spun off from Novartis in October 2023. Self-declared strategic window 2024-2033 to capitalise on expiring originator patents and become the global leader in off-patent medicines.',
  'SDZ', 'green',
  'https://ir.sandoz.com',
  array['Sandoz biosimilar strategy', 'Sandoz Golden Decade', 'Sandoz annual report'],
  'Track all references to the Golden Decade strategic narrative.',
  88, '2026-02-14'
) returning id into sandoz_id;

-- ── Active Objectives ──

-- OBJ 01: Global Biosimilar Leadership
insert into objectives (company_id, display_number, title, subtitle, original_quote, status, first_stated_date, first_stated_source, last_confirmed_date, momentum_score, evidence_count, display_order)
values (sandoz_id, 'OBJ 01', 'Global Biosimilar Leadership', 'Become the undisputed global leader in biosimilars by revenue and pipeline breadth',
  'We intend to be the global leader in biosimilars and generics.', 'active', '2023-10-04', 'Sandoz Spin-off Prospectus', '2026-02-14', 3, 4, 1)
returning id into obj1_id;

-- OBJ 02: US Biosimilar Penetration
insert into objectives (company_id, display_number, title, subtitle, original_quote, status, first_stated_date, first_stated_source, last_confirmed_date, momentum_score, evidence_count, display_order)
values (sandoz_id, 'OBJ 02', 'US Biosimilar Penetration', 'Establish significant US market share via Hyrimoz and follow-on launches',
  'The US represents our single largest growth opportunity in biosimilars.', 'active', '2023-10-04', 'Sandoz Spin-off Prospectus', '2026-02-14', 3, 3, 2)
returning id into obj2_id;

-- OBJ 03: Emerging Markets Volume Growth
insert into objectives (company_id, display_number, title, subtitle, original_quote, status, first_stated_date, first_stated_source, last_confirmed_date, momentum_score, evidence_count, display_order)
values (sandoz_id, 'OBJ 03', 'Emerging Markets Volume Growth', 'Drive volume growth across key emerging markets including Asia-Pacific and Latin America',
  'Emerging markets will be a key growth engine for our generics portfolio.', 'watch', '2023-10-04', 'Sandoz Spin-off Prospectus', '2025-10-22', -1, 4, 3)
returning id into obj3_id;

-- OBJ 04: Next-Wave Biosimilar Pipeline
insert into objectives (company_id, display_number, title, subtitle, original_quote, status, first_stated_date, first_stated_source, last_confirmed_date, momentum_score, evidence_count, display_order)
values (sandoz_id, 'OBJ 04', 'Next-Wave Biosimilar Pipeline', 'Advance immunology, oncology, and ophthalmology biosimilar candidates through development',
  'Our pipeline targets the next wave of patent expiries in immunology, oncology, and ophthalmology.', 'active', '2023-10-04', 'Sandoz Spin-off Prospectus', '2026-02-14', 3, 3, 4)
returning id into obj4_id;

-- OBJ 05: Manufacturing Network Simplification
insert into objectives (company_id, display_number, title, subtitle, original_quote, status, first_stated_date, first_stated_source, last_confirmed_date, momentum_score, evidence_count, display_order)
values (sandoz_id, 'OBJ 05', 'Manufacturing Network Simplification', 'Consolidate and modernise the inherited Novartis manufacturing footprint',
  'We will simplify our manufacturing network to improve efficiency and reduce complexity.', 'drifting', '2024-03-07', 'FY2023 Annual Report', '2025-07-24', -2, 4, 5)
returning id into obj5_id;

-- OBJ 06: Margin Expansion to 24-26%
insert into objectives (company_id, display_number, title, subtitle, original_quote, status, first_stated_date, first_stated_source, last_confirmed_date, momentum_score, evidence_count, display_order)
values (sandoz_id, 'OBJ 06', 'Margin Expansion to 24-26%', 'Achieve core EBITDA margin of 24-26% by 2028',
  'We target a core EBITDA margin of 24 to 26 percent by 2028.', 'active', '2024-03-07', 'FY2023 Annual Report', '2026-02-14', 3, 4, 6)
returning id into obj6_id;

-- ── Graveyard Entries ──

-- GRAV 01: China Growth Platform (Silent Drop)
insert into objectives (company_id, display_number, title, subtitle, original_quote, status, first_stated_date, last_confirmed_date, exit_date, exit_manner, transparency_score, verdict_text, momentum_score, is_in_graveyard, display_order)
values (sandoz_id, 'OBJ-X1', 'China Growth Platform', 'Establish a standalone China growth platform for generics',
  'China represents a significant long-term opportunity for our generics business.', 'dropped', '2023-10-04', '2024-03-07', '2024-06-30', 'silent', 'very_low',
  'Mentioned in the spin-off prospectus and Q4 2023 call. By H1 2024, all China-specific language had been removed from investor materials. No announcement was made. The objective appears to have been quietly shelved following regulatory and market access challenges.',
  -4, true, 101)
returning id into grav1_id;

-- GRAV 02: Explicit 2025 Revenue Target (Morphed)
insert into objectives (company_id, display_number, title, subtitle, original_quote, status, first_stated_date, last_confirmed_date, exit_date, exit_manner, transparency_score, verdict_text, momentum_score, is_in_graveyard, display_order)
values (sandoz_id, 'OBJ-X2', 'Explicit 2025 Revenue Target', 'Achieve specific 2025 revenue target disclosed at spin-off',
  'We expect net sales in the range of USD 9.5 to 10 billion by 2025.', 'morphed', '2023-10-04', '2024-07-25', '2024-10-24', 'morphed', 'low',
  'The explicit USD 9.5-10B 2025 target was stated in the prospectus and repeated at Investor Day 2024. By Q3 2024, the language shifted to "mid-to-high single digit revenue CAGR" without acknowledging the original figure. The hard number was replaced with a softer growth-rate framing.',
  -4, true, 102)
returning id into grav2_id;

-- GRAV 03: Branded Generics Expansion (MENA) (Phased Out)
insert into objectives (company_id, display_number, title, subtitle, original_quote, status, first_stated_date, last_confirmed_date, exit_date, exit_manner, transparency_score, verdict_text, successor_objective_id, momentum_score, is_in_graveyard, display_order)
values (sandoz_id, 'OBJ-X3', 'Branded Generics Expansion (MENA)', 'Expand branded generics portfolio across Middle East and North Africa',
  'We see meaningful growth potential in branded generics across the MENA region.', 'morphed', '2023-10-04', '2024-03-07', '2024-10-24', 'phased', 'medium',
  'MENA-specific branded generics language appeared in early disclosures but was gradually absorbed into the broader Emerging Markets narrative (OBJ 03). By Q3 2024, MENA was referenced only as a sub-region within emerging markets, with no standalone KPIs or targets. The objective was not dropped but diluted into a larger bucket.',
  obj3_id, -4, true, 103)
returning id into grav3_id;

-- ── Signals for OBJ 01: Global Biosimilar Leadership ──

insert into signals (objective_id, company_id, signal_date, source_type, source_name, classification, confidence, excerpt, is_draft) values
(obj1_id, sandoz_id, '2023-10-04', 'prospectus', 'Spin-off Prospectus', 'stated', 9, 'We intend to be the global leader in biosimilars and generics, capitalising on the USD 200 billion patent expiry opportunity over the next decade.', false),
(obj1_id, sandoz_id, '2024-03-07', 'annual_report', 'FY2023 Annual Report', 'reinforced', 9, 'Sandoz maintained its position as the global number one in biosimilars by revenue, with a portfolio of 10 marketed molecules.', false),
(obj1_id, sandoz_id, '2024-07-25', 'earnings_call', 'H1 2024 Earnings Call', 'reinforced', 8, 'We continue to strengthen our global leadership in biosimilars. Our market share expanded in all key regions in the first half.', false),
(obj1_id, sandoz_id, '2024-10-24', 'earnings_call', 'Q3 2024 Earnings Call', 'reinforced', 8, 'Our biosimilar business grew double digits, further consolidating our number one global position.', false),
(obj1_id, sandoz_id, '2025-02-13', 'annual_report', 'FY2024 Annual Report', 'reinforced', 9, 'For the full year, Sandoz biosimilar revenues reached a new record, growing 15% year-on-year to USD 2.4 billion.', false),
(obj1_id, sandoz_id, '2025-07-24', 'earnings_call', 'H1 2025 Earnings Call', 'reinforced', 8, 'Our biosimilar franchise continues to deliver strong growth. We see biosimilars as the core engine of the Golden Decade strategy.', false),
(obj1_id, sandoz_id, '2025-10-22', 'earnings_call', 'Q3 2025 Earnings Call', 'reinforced', 8, 'We are tracking ahead of our original biosimilar revenue trajectory. Multiple new launches planned for 2026.', false),
(obj1_id, sandoz_id, '2026-02-14', 'annual_report', 'FY2025 Annual Report', 'reinforced', 9, 'Sandoz delivered biosimilar revenue of USD 2.9 billion, up 21% year-on-year, cementing global market leadership.', false);

-- ── Signals for OBJ 02: US Biosimilar Penetration ──

insert into signals (objective_id, company_id, signal_date, source_type, source_name, classification, confidence, excerpt, is_draft) values
(obj2_id, sandoz_id, '2023-10-04', 'prospectus', 'Spin-off Prospectus', 'stated', 9, 'The US represents our single largest growth opportunity in biosimilars, led by Hyrimoz (adalimumab biosimilar).', false),
(obj2_id, sandoz_id, '2024-03-07', 'annual_report', 'FY2023 Annual Report', 'reinforced', 8, 'Hyrimoz achieved strong initial uptake in the US interchangeable biosimilar market following its January 2024 launch.', false),
(obj2_id, sandoz_id, '2024-10-24', 'earnings_call', 'Q3 2024 Earnings Call', 'reinforced', 8, 'US biosimilar revenues more than doubled year-on-year, driven by continued Hyrimoz adoption and formulary wins.', false),
(obj2_id, sandoz_id, '2025-02-13', 'annual_report', 'FY2024 Annual Report', 'reinforced', 9, 'US biosimilar revenue reached USD 680 million in 2024, a transformational year for our American franchise.', false),
(obj2_id, sandoz_id, '2025-10-22', 'earnings_call', 'Q3 2025 Earnings Call', 'reinforced', 8, 'The US biosimilar market is developing faster than expected. We now have three marketed biosimilar products and a strong contracting position.', false),
(obj2_id, sandoz_id, '2026-02-14', 'annual_report', 'FY2025 Annual Report', 'reinforced', 9, 'US biosimilar revenue exceeded USD 1 billion for the first time, representing 35% of total biosimilar sales.', false);

-- ── Signals for OBJ 03: Emerging Markets Volume Growth ──

insert into signals (objective_id, company_id, signal_date, source_type, source_name, classification, confidence, excerpt, is_draft) values
(obj3_id, sandoz_id, '2023-10-04', 'prospectus', 'Spin-off Prospectus', 'stated', 8, 'Emerging markets will be a key growth engine for our generics portfolio, with particular focus on Asia-Pacific and Latin America.', false),
(obj3_id, sandoz_id, '2024-03-07', 'annual_report', 'FY2023 Annual Report', 'reinforced', 7, 'Emerging market generics volumes grew mid-single digits, in line with our expectations for the ramp-up phase.', false),
(obj3_id, sandoz_id, '2024-10-24', 'earnings_call', 'Q3 2024 Earnings Call', 'softened', 6, 'Emerging markets performance was mixed. We continue to see opportunities but acknowledge pricing pressure in several key markets.', false),
(obj3_id, sandoz_id, '2025-02-13', 'annual_report', 'FY2024 Annual Report', 'softened', 6, 'Our emerging markets business delivered flat volume growth, reflecting competitive dynamics and regulatory delays in certain territories.', false),
(obj3_id, sandoz_id, '2025-07-24', 'earnings_call', 'H1 2025 Earnings Call', 'softened', 5, 'We are recalibrating our emerging markets approach. Growth will be more selective, focusing on markets where we have structural advantages.', false),
(obj3_id, sandoz_id, '2025-10-22', 'earnings_call', 'Q3 2025 Earnings Call', 'reframed', 5, 'Our international markets strategy now emphasises profitability over volume. We are prioritising fewer, higher-value markets.', false);

-- ── Signals for OBJ 04: Next-Wave Biosimilar Pipeline ──

insert into signals (objective_id, company_id, signal_date, source_type, source_name, classification, confidence, excerpt, is_draft) values
(obj4_id, sandoz_id, '2023-10-04', 'prospectus', 'Spin-off Prospectus', 'stated', 9, 'Our pipeline targets the next wave of patent expiries in immunology, oncology, and ophthalmology.', false),
(obj4_id, sandoz_id, '2024-03-07', 'annual_report', 'FY2023 Annual Report', 'reinforced', 8, 'Our biosimilar pipeline now includes over 15 molecules in development, targeting approximately USD 80 billion in originator revenues.', false),
(obj4_id, sandoz_id, '2024-07-25', 'investor_day', 'Investor Day 2024', 'reinforced', 9, 'We unveiled three new pipeline candidates in ophthalmology and advanced our lead oncology biosimilar into Phase III trials.', false),
(obj4_id, sandoz_id, '2025-02-13', 'annual_report', 'FY2024 Annual Report', 'reinforced', 9, 'Pipeline momentum continued with two additional Phase III readouts expected in 2025 and regulatory submissions planned for our first ophthalmology biosimilar.', false),
(obj4_id, sandoz_id, '2025-10-22', 'earnings_call', 'Q3 2025 Earnings Call', 'reinforced', 8, 'Our oncology biosimilar achieved positive Phase III results. We now have 8 molecules in late-stage development.', false),
(obj4_id, sandoz_id, '2026-02-14', 'annual_report', 'FY2025 Annual Report', 'reinforced', 9, 'The pipeline delivered two regulatory approvals and three additional Phase III initiations, the most productive year in our biosimilar R&D history.', false);

-- ── Signals for OBJ 05: Manufacturing Network Simplification ──

insert into signals (objective_id, company_id, signal_date, source_type, source_name, classification, confidence, excerpt, is_draft) values
(obj5_id, sandoz_id, '2024-03-07', 'annual_report', 'FY2023 Annual Report', 'stated', 8, 'We will simplify our manufacturing network to improve efficiency and reduce complexity, targeting a 20% reduction in production sites by 2027.', false),
(obj5_id, sandoz_id, '2024-10-24', 'earnings_call', 'Q3 2024 Earnings Call', 'softened', 6, 'The manufacturing simplification programme is progressing, though the timeline has been extended to account for regulatory transfer requirements.', false),
(obj5_id, sandoz_id, '2025-02-13', 'annual_report', 'FY2024 Annual Report', 'softened', 5, 'We completed two site consolidations in 2024. The broader network simplification continues, with a revised completion target of 2028.', false),
(obj5_id, sandoz_id, '2025-07-24', 'earnings_call', 'H1 2025 Earnings Call', 'reframed', 5, 'Our manufacturing strategy is evolving. Rather than pure site reduction, we are now focused on capability specialisation and flexible capacity.', false),
(obj5_id, sandoz_id, '2025-10-22', 'earnings_call', 'Q3 2025 Earnings Call', 'absent', 4, 'Manufacturing network simplification was not mentioned in prepared remarks or Q&A.', false);

-- ── Signals for OBJ 06: Margin Expansion to 24-26% ──

insert into signals (objective_id, company_id, signal_date, source_type, source_name, classification, confidence, excerpt, is_draft) values
(obj6_id, sandoz_id, '2024-03-07', 'annual_report', 'FY2023 Annual Report', 'stated', 9, 'We target a core EBITDA margin of 24 to 26 percent by 2028, up from approximately 21% at separation.', false),
(obj6_id, sandoz_id, '2024-07-25', 'earnings_call', 'H1 2024 Earnings Call', 'reinforced', 8, 'H1 core EBITDA margin improved 120 basis points year-on-year to 22.3%, on track for our 2028 target.', false),
(obj6_id, sandoz_id, '2024-10-24', 'earnings_call', 'Q3 2024 Earnings Call', 'reinforced', 8, 'Margin expansion continued in Q3, with core EBITDA margin reaching 22.8%. We remain confident in reaching the 24-26% range by 2028.', false),
(obj6_id, sandoz_id, '2025-02-13', 'annual_report', 'FY2024 Annual Report', 'reinforced', 9, 'Full-year core EBITDA margin reached 23.1%, a 210bps improvement from separation. The path to 24-26% by 2028 is clear.', false),
(obj6_id, sandoz_id, '2025-10-22', 'earnings_call', 'Q3 2025 Earnings Call', 'reinforced', 8, 'Year-to-date core EBITDA margin of 24.0%. We are now at the lower end of our 2028 target range, two years ahead of schedule.', false),
(obj6_id, sandoz_id, '2026-02-14', 'annual_report', 'FY2025 Annual Report', 'reinforced', 9, 'Core EBITDA margin reached 24.4% for the full year, within our target range. We now expect to reach the upper end by 2027.', false);

-- ── Signals for Graveyard entries ──

-- China Growth Platform signals
insert into signals (objective_id, company_id, signal_date, source_type, source_name, classification, confidence, excerpt, is_draft) values
(grav1_id, sandoz_id, '2023-10-04', 'prospectus', 'Spin-off Prospectus', 'stated', 7, 'China represents a significant long-term opportunity for our generics business. We plan to establish a dedicated China growth platform.', false),
(grav1_id, sandoz_id, '2024-03-07', 'annual_report', 'FY2023 Annual Report', 'softened', 5, 'We continue to evaluate the China opportunity within the broader context of our international portfolio strategy.', false),
(grav1_id, sandoz_id, '2024-07-25', 'earnings_call', 'H1 2024 Earnings Call', 'absent', 3, 'China growth platform not mentioned in prepared remarks or analyst Q&A.', false),
(grav1_id, sandoz_id, '2024-10-24', 'earnings_call', 'Q3 2024 Earnings Call', 'retired_silent', 2, 'No mention of China-specific growth initiatives. International strategy discussion focused exclusively on developed markets and select emerging markets.', false);

-- Explicit 2025 Revenue Target signals
insert into signals (objective_id, company_id, signal_date, source_type, source_name, classification, confidence, excerpt, is_draft) values
(grav2_id, sandoz_id, '2023-10-04', 'prospectus', 'Spin-off Prospectus', 'stated', 9, 'We expect net sales in the range of USD 9.5 to 10 billion by 2025.', false),
(grav2_id, sandoz_id, '2024-03-07', 'annual_report', 'FY2023 Annual Report', 'reinforced', 8, 'We reiterate our expectation for net sales in the range of USD 9.5 to 10 billion by 2025.', false),
(grav2_id, sandoz_id, '2024-07-25', 'investor_day', 'Investor Day 2024', 'softened', 6, 'We expect mid-to-high single digit revenue CAGR through 2028, reflecting our confidence in the long-term growth trajectory.', false),
(grav2_id, sandoz_id, '2024-10-24', 'earnings_call', 'Q3 2024 Earnings Call', 'reframed', 5, 'Our focus is on sustainable growth. We are delivering mid-to-high single digit revenue CAGR, consistent with our updated guidance framework.', false);

-- Branded Generics Expansion (MENA) signals
insert into signals (objective_id, company_id, signal_date, source_type, source_name, classification, confidence, excerpt, is_draft) values
(grav3_id, sandoz_id, '2023-10-04', 'prospectus', 'Spin-off Prospectus', 'stated', 7, 'We see meaningful growth potential in branded generics across the MENA region.', false),
(grav3_id, sandoz_id, '2024-03-07', 'annual_report', 'FY2023 Annual Report', 'softened', 6, 'Our MENA operations continue to contribute within the broader emerging markets segment.', false),
(grav3_id, sandoz_id, '2024-10-24', 'earnings_call', 'Q3 2024 Earnings Call', 'retired_transparent', 5, 'MENA growth is now managed as part of our integrated emerging markets strategy. We no longer report it as a standalone initiative.', false);

end;
$$;
