export type SectorType =
  | "pharma" | "tech" | "energy" | "consumer" | "finance"
  | "industrials" | "healthcare" | "real_estate" | "telecom" | "other";

export type ObjectiveStatus =
  | "on_record" | "watch" | "drifting" | "achieved" | "dropped" | "morphed";

export type SignalClassification =
  | "stated" | "reinforced" | "softened" | "reframed"
  | "absent" | "achieved" | "retired_transparent" | "retired_silent"
  | "year_end_review";

export type ExitManner =
  | "silent" | "phased" | "morphed" | "transparent" | "achieved" | "resurrected";

export type TimelineNodeType = "origin" | "signal" | "cadence" | "stale" | "fiscal-year-end";

export interface TimelineMonthNode {
  type: TimelineNodeType;
  month: Date;
  x: number;
  y: number;
  score: number;
  signal?: Signal;
  monthsSinceLastSignal?: number;
  isFiscalYearEnd?: boolean;
}

export type TransparencyScore = "very_low" | "low" | "medium" | "high";

export type SourceType =
  | "annual_report" | "interim_results" | "earnings_call"
  | "investor_day" | "press_release" | "sec_filing" | "prospectus"
  | "conference_presentation" | "regulatory_filing" | "other";

export type MomentumStage =
  | "orbit" | "fly" | "run" | "walk" | "watch"
  | "crawl" | "drag" | "sink" | "buried";

export interface Company {
  id: string;
  name: string;
  ticker: string;
  exchange: string | null;
  sector: SectorType;
  initiative_name: string | null;
  initiative_subtitle: string | null;
  ir_page_url: string | null;
  overall_commitment_score: number | null;
  tracking_active: boolean;
  fiscal_year_end_month: number;
  last_research_run: string | null;
  created_at: string;
}

export interface Objective {
  id: string;
  company_id: string;
  display_number: number;
  title: string;
  subtitle: string | null;
  original_quote: string | null;
  status: ObjectiveStatus;
  first_stated_date: string | null;
  last_confirmed_date: string | null;
  exit_date: string | null;
  exit_manner: ExitManner | null;
  transparency_score: TransparencyScore | null;
  verdict_text: string | null;
  successor_objective_id: string | null;
  momentum_score: number;
  is_in_graveyard: boolean;
}

export interface Signal {
  id: string;
  objective_id: string;
  company_id: string;
  signal_date: string;
  source_type: SourceType;
  source_name: string | null;
  source_url: string | null;
  classification: SignalClassification;
  confidence: number;
  excerpt: string | null;
  agent_reasoning: string | null;
  is_draft: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export interface AgentRun {
  id: string;
  company_id: string;
  triggered_by: string;
  status: string;
  signals_proposed: number;
  signals_approved: number;
  estimated_cost_usd: number | null;
  run_summary: string | null;
  created_at: string;
}

export interface CompanySummary extends Company {
  objectives: Objective[];
  active_count: number;
  drifting_count: number;
  buried_count: number;
  editorial_verdict: string | null;
}
