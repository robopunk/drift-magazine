#!/usr/bin/env python3
"""
PromiseTrack Research Agent
===========================
Runs monthly (or on-demand) for each tracked company.
Uses Claude with web search to find new disclosures, reads them,
classifies language against each tracked objective, and writes
draft signals back to Supabase for human review.

Usage:
  python agent.py                        # Run all companies due for research
  python agent.py --company-id <uuid>   # Run a specific company
  python agent.py --intake <uuid>       # Full intake run (new company setup)
  python agent.py --review              # Print all draft signals pending review
  python agent.py --approve <signal-id> # Approve a draft signal
  python agent.py --reject  <signal-id> # Reject a draft signal

Environment variables required (.env):
  ANTHROPIC_API_KEY=sk-...
  SUPABASE_URL=https://xxxx.supabase.co
  SUPABASE_SERVICE_KEY=eyJ...           # Service role key (not anon key)
"""

import os
import sys
import json
import time
import argparse
import textwrap
from datetime import datetime, date, timedelta
from typing import Optional

import anthropic
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# ── CONFIG ──────────────────────────────────────────────────────────────────

ANTHROPIC_API_KEY  = os.environ["ANTHROPIC_API_KEY"]
SUPABASE_URL       = os.environ["SUPABASE_URL"]
SUPABASE_KEY       = os.environ["SUPABASE_SERVICE_KEY"]

DEFAULT_MODEL      = "claude-sonnet-4-6"
INTAKE_MODEL       = "claude-sonnet-4-6"   # Override via --model flag
MAX_TOKENS         = 8000
RESEARCH_INTERVAL  = 30   # days between automatic runs

# Classification taxonomy the agent uses
SIGNAL_CLASSES = [
    "stated",
    "reinforced",
    "softened",
    "reframed",
    "absent",
    "achieved",
    "retired_transparent",
    "retired_silent",
]

MODEL              = DEFAULT_MODEL     # Active model — set by CLI or defaults

EXIT_MANNERS = ["silent", "phased", "morphed", "transparent", "achieved"]

TRANSPARENCY_SCORES = ["very_low", "low", "medium", "high"]


# ── CLIENTS ─────────────────────────────────────────────────────────────────

def get_clients() -> tuple[anthropic.Anthropic, Client]:
    claude  = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    return claude, supabase


# ── DATABASE HELPERS ────────────────────────────────────────────────────────

def get_companies_due(db: Client) -> list[dict]:
    """Return all active companies due for a research run."""
    cutoff = (date.today() - timedelta(days=RESEARCH_INTERVAL)).isoformat()
    result = db.table("companies").select("*").eq("tracking_active", True).or_(
        f"last_research_run.lt.{cutoff},last_research_run.is.null"
    ).execute()
    return result.data


def get_company(db: Client, company_id: str) -> dict:
    result = db.table("companies").select("*").eq("id", company_id).single().execute()
    return result.data


def get_objectives(db: Client, company_id: str) -> list[dict]:
    result = (
        db.table("objectives")
        .select("*")
        .eq("company_id", company_id)
        .order("display_order")
        .execute()
    )
    return result.data


def create_agent_run(db: Client, company_id: str, triggered_by: str = "schedule") -> str:
    result = db.table("agent_runs").insert({
        "company_id":   company_id,
        "triggered_by": triggered_by,
        "status":       "running",
    }).execute()
    return result.data[0]["id"]


def update_agent_run(db: Client, run_id: str, **kwargs):
    db.table("agent_runs").update({
        **kwargs,
        "completed_at": datetime.utcnow().isoformat(),
    }).eq("id", run_id).execute()


def save_signal(db: Client, signal: dict) -> str:
    """Save a signal directly as published (autonomous mode)."""
    if "is_draft" not in signal:
        signal["is_draft"] = False
    result = db.table("signals").insert(signal).execute()
    return result.data[0]["id"]


def save_objective(db: Client, obj: dict) -> str:
    """Insert or update an objective."""
    if "id" in obj and obj["id"]:
        db.table("objectives").update(obj).eq("id", obj["id"]).execute()
        return obj["id"]
    result = db.table("objectives").insert(obj).execute()
    return result.data[0]["id"]


def get_pending_signals(db: Client) -> list[dict]:
    result = db.table("v_pending_review").select("*").execute()
    return result.data


def approve_signal(db: Client, signal_id: str):
    db.table("signals").update({
        "is_draft":    False,
        "reviewed_at": datetime.utcnow().isoformat(),
        "reviewed_by": "human",
    }).eq("id", signal_id).execute()
    print(f"✓ Signal {signal_id[:8]}… approved.")


def reject_signal(db: Client, signal_id: str):
    db.table("signals").delete().eq("id", signal_id).execute()
    print(f"✗ Signal {signal_id[:8]}… rejected and deleted.")


def mark_company_researched(db: Client, company_id: str, score: Optional[int] = None):
    update = {"last_research_run": datetime.utcnow().isoformat()}
    if score is not None:
        update["overall_commitment_score"] = score
    db.table("companies").update(update).eq("id", company_id).execute()


# ── AGENT CORE ──────────────────────────────────────────────────────────────

def build_intake_prompt(company: dict) -> str:
    """
    For a brand-new company, ask the agent to:
    1. Research the company's stated strategic initiative
    2. Identify all publicly stated objectives
    3. Return structured JSON with company metadata + initial objectives + first signals
    """
    return textwrap.dedent(f"""
        You are a strategic accountability researcher for PromiseTrack.
        PromiseTrack tracks what companies publicly commit to — and whether they follow through.

        A new company has been added for tracking:

        Company: {company['name']}
        Initiative: {company['initiative_name']} {company.get('initiative_subtitle', '')}
        Sector: {company['sector']}
        Context provided by operator: {company.get('intake_context', 'None')}
        IR page: {company.get('ir_page_url', 'Not provided')}

        YOUR TASK — INTAKE RESEARCH:

        1. Search for the company's founding strategic documents for this initiative:
           - If listed recently: IPO/spin-off prospectus, listing-day investor presentation
           - Capital Markets Day or Investor Day presentations
           - The most recent Annual Report
           - The most recent earnings call transcript

        2. Identify every distinct strategic OBJECTIVE the company has publicly committed to
           in the context of this initiative. An objective must be:
           - Explicitly stated in a named public document
           - Specific enough to be tracked over time (not a generic "grow revenue" statement)
           - Attributed to a named source with a date

        3. For each objective, record the FIRST signal (the original statement).

        4. Identify any objectives that may ALREADY have been dropped, softened, or morphed
           since first stated — if the initiative is more than 6 months old.

        RETURN FORMAT — respond with ONLY valid JSON, no markdown, no preamble:

        {{
          "company_update": {{
            "initiative_desc": "One paragraph editorial summary of the initiative",
            "ir_page_url": "confirmed or corrected URL",
            "search_keywords": ["keyword1", "keyword2"]
          }},
          "objectives": [
            {{
              "display_number": "OBJ 01",
              "title": "Short title (max 8 words)",
              "subtitle": "One sentence description",
              "original_quote": "Exact words from the source document",
              "status": "active|watch|drifting|achieved|dropped|morphed",
              "first_stated_date": "YYYY-MM-DD",
              "first_stated_source": "Source name e.g. Spin-off Prospectus",
              "is_in_graveyard": false,
              "display_order": 1,
              "signals": [
                {{
                  "signal_date": "YYYY-MM-DD",
                  "source_type": "prospectus|annual_report|earnings_call|investor_day|press_release|other",
                  "source_name": "Full source name",
                  "source_url": "URL if found",
                  "classification": "stated",
                  "confidence": 9,
                  "excerpt": "Relevant passage in your own words (not verbatim copyright text)",
                  "agent_reasoning": "Why you classified it this way"
                }}
              ]
            }}
          ],
          "run_summary": "2-3 sentence summary of what you found",
          "estimated_commitment_score": 75
        }}

        Search thoroughly. Use web_search to find primary sources. Read actual documents with fetch where possible.
        Classify conservatively — only mark something as 'drifting' or 'dropped' if you have clear evidence.
    """).strip()


def build_monthly_prompt(company: dict, objectives: list[dict]) -> str:
    """
    For an existing company, ask the agent to find new disclosures since
    the last run and classify any language changes per objective.
    """
    last_run = company.get("last_research_run", "never")
    obj_summary = "\n".join([
        f"  - [{o['status'].upper()}] {o['title']} (last confirmed: {o.get('last_confirmed_date', 'unknown')})"
        for o in objectives
    ])

    return textwrap.dedent(f"""
        You are a strategic accountability researcher for PromiseTrack.
        PromiseTrack tracks what companies publicly commit to — and whether they follow through.

        COMPANY: {company['name']}
        INITIATIVE: {company['initiative_name']} {company.get('initiative_subtitle', '')}
        LAST RESEARCH RUN: {last_run}
        TODAY: {date.today().isoformat()}

        CURRENTLY TRACKED OBJECTIVES:
        {obj_summary}

        CONTEXT: {company.get('intake_context', '')}

        YOUR TASK — MONTHLY RESEARCH UPDATE:

        1. Search for all new public disclosures since the last research run:
           - Earnings calls / results announcements
           - Annual or interim reports released in this period
           - Investor day presentations
           - Major press releases or regulatory filings

        2. For each disclosure found, read it and assess each tracked objective:
           - Is the objective mentioned? How prominently?
           - Has the language changed (more specific? more hedged? different framing?)
           - Are there any numeric targets — were they reaffirmed, changed, or dropped?
           - Is the objective conspicuously absent from a document where you'd expect it?

        3. Propose ONLY genuinely new signals — do not re-log signals from before {last_run}.
           If nothing has changed for an objective, do not generate a signal for it.

        4. Flag any objective that may now be a GRAVEYARD CANDIDATE (status change to dropped/morphed).
           This requires strong evidence — not just one absence.

        CLASSIFICATION GUIDE:
        - "reinforced"         → Explicitly reaffirmed, often with progress metrics or new specifics
        - "softened"           → Language hedged, scope reduced, timeline extended without explanation
        - "reframed"           → Same intent but significantly different terminology — watch this
        - "absent"             → Expected in this disclosure type but not mentioned at all
        - "achieved"           → Company explicitly claims this objective has been met
        - "retired_transparent"→ Company explicitly states they are ending this objective with explanation
        - "retired_silent"     → Confirmation it has been silently dropped (requires multiple absences)

        RETURN FORMAT — respond with ONLY valid JSON, no markdown, no preamble:

        {{
          "new_signals": [
            {{
              "objective_id": "<uuid from objectives list above — include this field>",
              "signal_date": "YYYY-MM-DD",
              "source_type": "annual_report|earnings_call|investor_day|press_release|other",
              "source_name": "Full source name e.g. FY2025 Annual Report",
              "source_url": "URL if found, null if not",
              "classification": "reinforced|softened|reframed|absent|achieved|retired_transparent|retired_silent",
              "confidence": 8,
              "excerpt": "Key passage in your own words (paraphrase, do not reproduce copyright text verbatim)",
              "context": "Surrounding context or any analyst Q&A relevant to this signal",
              "agent_reasoning": "Why you classified it this way — be specific"
            }}
          ],
          "status_change_proposals": [
            {{
              "objective_id": "<uuid>",
              "proposed_status": "watch|drifting|achieved|dropped|morphed",
              "rationale": "Evidence-based rationale for this status change",
              "exit_manner": "silent|phased|morphed|transparent|achieved (if dropped/morphed)",
              "transparency_score": "very_low|low|medium|high (if dropped/morphed)",
              "successor_objective_title": "Title of successor if morphed, null otherwise"
            }}
          ],
          "sources_found": [
            {{
              "name": "FY2025 Annual Report",
              "type": "annual_report",
              "date": "2026-03-01",
              "url": "https://..."
            }}
          ],
          "run_summary": "2-3 sentence summary of what changed this period",
          "updated_commitment_score": 82
        }}

        Be precise and conservative. A weak mention does not warrant 'reinforced'.
        A single absence does not warrant 'absent'. Multiple absences across multiple
        disclosure types is the bar for 'retired_silent'.
    """).strip()


# ── AGENT RUNNER ────────────────────────────────────────────────────────────

def run_intake(claude: anthropic.Anthropic, db: Client, company_id: str):
    """Full intake research run for a newly added company."""
    company = get_company(db, company_id)
    print(f"\n{'='*60}")
    print(f"  INTAKE: {company['name']} — {company['initiative_name']}")
    print(f"{'='*60}")

    run_id = create_agent_run(db, company_id, triggered_by="intake")

    try:
        prompt = build_intake_prompt(company)

        print("  → Calling Claude with web search…")
        response = claude.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            tools=[{"type": "web_search_20250305", "name": "web_search"}],
            messages=[{"role": "user", "content": prompt}],
        )

        # Extract text content (may follow tool use blocks)
        result_text = ""
        for block in response.content:
            if hasattr(block, "text"):
                result_text += block.text

        result = json.loads(result_text)

        # Update company metadata
        if "company_update" in result:
            db.table("companies").update(result["company_update"]).eq("id", company_id).execute()

        # Insert objectives + their initial signals
        total_signals = 0
        for obj_data in result.get("objectives", []):
            signals = obj_data.pop("signals", [])
            obj_data["company_id"] = company_id
            obj_id = save_objective(db, obj_data)

            for sig in signals:
                sig["objective_id"] = obj_id
                sig["company_id"]   = company_id
                save_signal(db, sig)
                total_signals += 1

        score = result.get("estimated_commitment_score")
        mark_company_researched(db, company_id, score)
        update_agent_run(db, run_id,
            status="completed",
            signals_proposed=total_signals,
            documents_read=len(result.get("sources_found", [])),
            run_summary=result.get("run_summary", ""),
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
        )

        print(f"  ✓ Intake complete: {len(result['objectives'])} objectives, {total_signals} draft signals")
        print(f"  → Summary: {result.get('run_summary', '')}")
        print(f"  → Run 'python agent.py --review' to review draft signals")

    except Exception as e:
        update_agent_run(db, run_id, status="failed", error_message=str(e))
        print(f"  ✗ Intake failed: {e}")
        raise


def run_monthly(claude: anthropic.Anthropic, db: Client, company_id: str):
    """Monthly update research run for an existing company."""
    company    = get_company(db, company_id)
    objectives = get_objectives(db, company_id)

    if not objectives:
        print(f"  ⚠ {company['name']}: No objectives found — run intake first.")
        return

    print(f"\n{'='*60}")
    print(f"  MONTHLY: {company['name']} — {company['initiative_name']}")
    print(f"  {len(objectives)} objectives tracked | Last run: {company.get('last_research_run','never')}")
    print(f"{'='*60}")

    run_id = create_agent_run(db, company_id, triggered_by="schedule")

    try:
        prompt = build_monthly_prompt(company, objectives)

        # Include objective IDs in the prompt context so agent can reference them
        obj_id_map = "\n".join([f"  {o['title']}: {o['id']}" for o in objectives])
        full_prompt = prompt + f"\n\nOBJECTIVE ID REFERENCE:\n{obj_id_map}"

        print("  → Calling Claude with web search…")
        response = claude.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            tools=[{"type": "web_search_20250305", "name": "web_search"}],
            messages=[{"role": "user", "content": full_prompt}],
        )

        result_text = ""
        for block in response.content:
            if hasattr(block, "text"):
                result_text += block.text

        result = json.loads(result_text)

        # Save new draft signals
        new_signals = result.get("new_signals", [])
        for sig in new_signals:
            sig["company_id"] = company_id
            save_signal(db, sig)

        # Apply status changes directly (autonomous mode)
        status_proposals = result.get("status_change_proposals", [])
        for prop in status_proposals:
            # Save the signal record
            save_signal(db, {
                "objective_id":     prop["objective_id"],
                "company_id":       company_id,
                "signal_date":      date.today().isoformat(),
                "source_type":      "other",
                "source_name":      "Agent Status Change",
                "classification":   prop.get("exit_manner", "absent"),
                "confidence":       7,
                "excerpt":          prop["rationale"],
                "agent_reasoning":  f"[STATUS CHANGE: {prop['proposed_status']}] {prop['rationale']}",
            })
            # Apply to objective
            obj_update = {"status": prop["proposed_status"]}
            if prop.get("exit_manner"):
                obj_update["exit_manner"] = prop["exit_manner"]
            if prop.get("transparency_score"):
                obj_update["transparency_score"] = prop["transparency_score"]
            if prop["proposed_status"] in ("dropped", "morphed"):
                obj_update["is_in_graveyard"] = True
                obj_update["exit_date"] = date.today().isoformat()
            db.table("objectives").update(obj_update).eq("id", prop["objective_id"]).execute()

        score = result.get("updated_commitment_score")
        mark_company_researched(db, company_id, score)
        update_agent_run(db, run_id,
            status="completed",
            sources_searched=len(result.get("sources_found", [])),
            signals_proposed=len(new_signals) + len(status_proposals),
            run_summary=result.get("run_summary", ""),
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
            estimated_cost_usd=round(
                (response.usage.input_tokens * 0.000003) +
                (response.usage.output_tokens * 0.000015), 4
            ),
        )

        print(f"  ✓ {len(new_signals)} new signals, {len(status_proposals)} status proposals")
        print(f"  → Summary: {result.get('run_summary', '')}")
        if score:
            print(f"  → Updated commitment score: {score}/100")
        print(f"  → Run 'python agent.py --review' to review")

    except Exception as e:
        update_agent_run(db, run_id, status="failed", error_message=str(e))
        print(f"  ✗ Monthly run failed: {e}")
        raise


def print_review_queue(db: Client):
    """Print all draft signals pending human review."""
    pending = get_pending_signals(db)
    if not pending:
        print("\n  ✓ No signals pending review.")
        return

    print(f"\n{'='*60}")
    print(f"  PENDING REVIEW — {len(pending)} draft signals")
    print(f"{'='*60}\n")

    for sig in pending:
        print(f"  ID:         {sig['id'][:8]}…")
        print(f"  Company:    {sig['company_name']}")
        print(f"  Objective:  {sig['objective_title']}")
        print(f"  Date:       {sig['signal_date']}")
        print(f"  Source:     {sig['source_name']}")
        print(f"  Class:      {sig['classification'].upper()}  (confidence: {sig.get('confidence','?')}/10)")
        print(f"  Excerpt:    {textwrap.fill(sig.get('excerpt',''), 56, subsequent_indent='              ')}")
        print(f"  Reasoning:  {textwrap.fill(sig.get('agent_reasoning',''), 56, subsequent_indent='              ')}")
        print()
        print(f"  Approve: python agent.py --approve {sig['id']}")
        print(f"  Reject:  python agent.py --reject  {sig['id']}")
        print(f"  {'─'*54}")


# ── SCHEDULER ───────────────────────────────────────────────────────────────

def run_all_due(claude: anthropic.Anthropic, db: Client):
    """Run monthly research for all companies due for an update."""
    companies = get_companies_due(db)
    if not companies:
        print("\n  ✓ No companies due for research. All up to date.")
        return

    print(f"\n  {len(companies)} company/companies due for research.")
    for company in companies:
        try:
            objectives = get_objectives(db, company["id"])
            if objectives:
                run_monthly(claude, db, company["id"])
            else:
                print(f"  ⚠ {company['name']}: No objectives — skipping (run intake first)")
            time.sleep(3)  # Avoid rate limits between companies
        except Exception as e:
            print(f"  ✗ Failed for {company['name']}: {e}")
            continue


# ── ENTRYPOINT ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="PromiseTrack Research Agent")
    parser.add_argument("--company-id",  help="Run monthly research for a specific company UUID")
    parser.add_argument("--intake",      help="Run intake for a specific company UUID")
    parser.add_argument("--review",      action="store_true", help="Show all draft signals pending review")
    parser.add_argument("--approve",     help="Approve a draft signal by UUID")
    parser.add_argument("--reject",      help="Reject (delete) a draft signal by UUID")
    parser.add_argument("--model",       help="Override model (e.g. claude-opus-4-6, claude-sonnet-4-6)")
    args = parser.parse_args()

    # Apply model override if provided
    global MODEL
    if args.model:
        MODEL = args.model
        print(f"  → Model override: {MODEL}")

    claude, db = get_clients()

    if args.review:
        print_review_queue(db)

    elif args.approve:
        approve_signal(db, args.approve)

    elif args.reject:
        reject_signal(db, args.reject)

    elif args.intake:
        MODEL = args.model or INTAKE_MODEL
        run_intake(claude, db, args.intake)

    elif args.company_id:
        run_monthly(claude, db, args.company_id)

    else:
        # Default: run all companies due for research
        run_all_due(claude, db)


if __name__ == "__main__":
    main()
