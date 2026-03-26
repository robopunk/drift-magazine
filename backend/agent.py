#!/usr/bin/env python3
"""
Drift Research Agent
====================
Fully autonomous research agent. Runs monthly (or on-demand) for each
tracked company. Uses Claude with web search to find new disclosures,
classifies language against each tracked objective, then runs a
correlation pass to cross-reference objectives, detect silent
achievements, promote to graveyard, and adjust momentum scores.
All signals are published directly — no human-in-the-loop.

Usage:
  python agent.py                        # Run all companies due for research
  python agent.py --company-id <uuid>   # Run a specific company
  python agent.py --intake <uuid>       # Full intake run (new company setup)
  python agent.py --correlate <uuid>    # Run correlation pass only
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

try:
    from firecrawl import FirecrawlApp
    _FIRECRAWL_AVAILABLE = True
except ImportError:
    _FIRECRAWL_AVAILABLE = False

load_dotenv()

# ── FIRECRAWL HELPERS ────────────────────────────────────────────────────────

def firecrawl_extract(url: str, api_key: str, max_chars: int = 30_000) -> Optional[str]:
    """Scrape a URL with Firecrawl and return clean markdown, or None on any error."""
    if not _FIRECRAWL_AVAILABLE or not api_key:
        return None
    try:
        app = FirecrawlApp(api_key=api_key)
        result = app.scrape_url(url, params={"formats": ["markdown"]})
        content = result.get("markdown") or result.get("content") or ""
        if not content:
            return None
        return content[:max_chars]
    except Exception as e:
        print(f"  ⚠ Firecrawl extract failed for {url}: {e}")
        return None


def prefetch_company_docs(company: dict, api_key: Optional[str]) -> str:
    """Scrape company IR page + additional_sources via Firecrawl.
    Returns a formatted block to prepend to the agent prompt.
    Returns empty string if api_key is None or no URLs configured."""
    if not api_key:
        return ""

    urls: list[str] = []
    if company.get("ir_page_url"):
        urls.append(company["ir_page_url"])
    urls.extend(company.get("additional_sources") or [])

    if not urls:
        return ""

    sections = []
    for url in urls:
        content = firecrawl_extract(url, api_key)
        if content:
            sections.append(f"[Source: {url}]\n\n{content}")

    if not sections:
        return ""

    divider = "=" * 60
    return (
        f"\n\nPRE-FETCHED DOCUMENTS (full text extracted before your search):\n"
        f"{divider}\n"
        + "\n\n---\n\n".join(sections)
        + f"\n{divider}\n"
        "Use these as primary sources. Then use web_search for any additional recent disclosures.\n"
    )

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
    "year_end_review",
    "deadline_shifted",
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


def get_signals_for_company(db: Client, company_id: str) -> list[dict]:
    """Return all published signals for a company, ordered chronologically."""
    result = (
        db.table("signals")
        .select("*, objectives!inner(title)")
        .eq("company_id", company_id)
        .eq("is_draft", False)
        .order("signal_date")
        .execute()
    )
    return result.data


# ── AGENT CORE ──────────────────────────────────────────────────────────────

def build_intake_prompt(company: dict) -> str:
    """
    For a brand-new company, ask the agent to:
    1. Research the company's stated strategic initiative
    2. Identify all publicly stated objectives
    3. Return structured JSON with company metadata + initial objectives + first signals
    """
    return textwrap.dedent(f"""
        You are a strategic accountability researcher for Drift.
        Drift tracks what companies publicly commit to — and whether they follow through.

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

        5. For each objective, determine the committed delivery window:
           - ANNUAL: Tied to the company's fiscal year ending month {company.get('fiscal_year_end_month', 12)}.
             Set committed_from to the fiscal year start, committed_until to the fiscal year end.
           - MULTI_YEAR: The company stated an explicit future target date (e.g., "by 2027", "within 3 years").
             Set committed_from to first_stated_date, committed_until to the stated target.
           - EVERGREEN: No stated deadline — ongoing priority. Set both dates to null.

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
              "terminal_state": "null|proved|buried",
              "commitment_type": "annual|multi_year|evergreen",
              "committed_from": "YYYY-MM-DD or null if evergreen",
              "committed_until": "YYYY-MM-DD or null if evergreen",
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
        f"  - [{o['status'].upper()}] {o['title']} "
        f"(last confirmed: {o.get('last_confirmed_date', 'unknown')}, "
        f"commitment: {o.get('commitment_type', 'evergreen')}, "
        f"deadline: {o.get('committed_until', 'none')})"
        for o in objectives
    ])

    return textwrap.dedent(f"""
        You are a strategic accountability researcher for Drift.
        Drift tracks what companies publicly commit to — and whether they follow through.

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

        5. COMMITMENT WINDOW AWARENESS:
           For each objective with a committed window (commitment_type != 'evergreen'):
           - Has the company confirmed the original timeline is still on track?
           - Has the company extended or shortened the deadline?
             If so, classify as "deadline_shifted" and include old and new dates in excerpt.
           - Has the deadline passed with no acknowledgment? Note this.

        CLASSIFICATION GUIDE:
        - "reinforced"         → Explicitly reaffirmed, often with progress metrics or new specifics
        - "softened"           → Language hedged, scope reduced, timeline extended without explanation
        - "reframed"           → Same intent but significantly different terminology — watch this
        - "absent"             → Expected in this disclosure type but not mentioned at all
        - "achieved"           → Company explicitly claims this objective has been met
        - "retired_transparent"→ Company explicitly states they are ending this objective with explanation
        - "retired_silent"     → Confirmation it has been silently dropped (requires multiple absences)
        - "deadline_shifted"   → Company has moved its committed deadline (extended or shortened)

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


def build_correlation_prompt(company: dict, objectives: list[dict], signals: list[dict]) -> str:
    """
    Build the prompt for the correlation & lifecycle pass.
    Receives all objectives and their full signal history.
    Returns structured JSON with objective updates and cross-references.
    """
    # Build objective summaries
    obj_lines = []
    for o in objectives:
        status_tag = "PROVED" if o.get("terminal_state") == "proved" else "BURIED" if o.get("terminal_state") == "buried" else o.get("status", "active").upper()
        obj_lines.append(
            f"  [{status_tag}] {o['title']} (id: {o['id']})\n"
            f"    Subtitle: {o.get('subtitle', 'N/A')}\n"
            f"    Original quote: \"{o.get('original_quote', 'N/A')}\"\n"
            f"    Momentum: {o.get('momentum_score', 0)} | Status: {o.get('status')} | Terminal: {o.get('terminal_state', 'none')}\n"
            f"    Commitment: {o.get('commitment_type', 'evergreen')} | Deadline: {o.get('committed_until', 'none')}\n"
            f"    Exit manner: {o.get('exit_manner', 'N/A')} | Verdict: {o.get('verdict_text', 'None')}"
        )
    obj_block = "\n".join(obj_lines)

    # Build signal history grouped by objective
    sig_by_obj = {}
    for s in signals:
        obj_title = s.get("objectives", {}).get("title", "Unknown")
        oid = s["objective_id"]
        if oid not in sig_by_obj:
            sig_by_obj[oid] = {"title": obj_title, "signals": []}
        excerpt = (s.get("excerpt") or "")[:150]
        sig_by_obj[oid]["signals"].append(
            f"    {s['signal_date']} | {s['classification'].upper()} (conf: {s.get('confidence', '?')}) | {excerpt}"
        )

    sig_lines = []
    for oid, data in sig_by_obj.items():
        sig_lines.append(f"  {data['title']}:")
        sig_lines.extend(data["signals"])
    sig_block = "\n".join(sig_lines)

    return textwrap.dedent(f"""
        You are a strategic accountability analyst for Drift.
        Drift tracks what companies publicly commit to — and monitors how that language changes,
        weakens, or disappears over time.

        COMPANY: {company['name']}
        INITIATIVE: {company['initiative_name']} {company.get('initiative_subtitle', '')}
        TODAY: {date.today().isoformat()}

        ALL TRACKED OBJECTIVES:
        {obj_block}

        COMPLETE SIGNAL HISTORY (chronological per objective):
        {sig_block}

        YOUR TASK — CORRELATION & LIFECYCLE PASS:

        Perform three sequential analyses:

        PASS 1 — CROSS-REFERENCE SCAN:
        For each signal excerpt, check whether the language implicitly references the outcome
        of a DIFFERENT objective. Examples:
        - "Our modernised manufacturing network" in a margin discussion = evidence that a
          manufacturing simplification objective may have been silently completed
        - "Following the successful integration of our MENA operations" = evidence that a
          graveyard entry may actually have been achieved
        Flag all cross-references you find.

        PASS 2 — LIFECYCLE EVALUATION:
        For each NON-GRAVEYARD objective, evaluate the full signal trajectory and decide:

        Graveyard promotion rules:
        - 3+ consecutive softened/reframed/absent signals = graveyard candidate (exit_manner: "silent" or "phased")
        - Cross-reference evidence of silent completion = status: "achieved", exit_manner: "achieved", terminal_state: "proved"
        - Explicit "achieved" classification in own signals = status: "achieved", exit_manner: "achieved", terminal_state: "proved"
        - "retired_transparent" signal = terminal_state: "buried", exit_manner: "transparent"
        - "retired_silent" confirmed = terminal_state: "buried", exit_manner: "silent"
        - Morphed into successor = terminal_state: "buried", exit_manner: "morphed", set successor_objective_id to the UUID of the successor objective

        CRITICAL: Achieved objectives are NOT graveyard entries. The graveyard is exclusively
        for failures (silent drops, phased outs, morphs). A silently achieved objective is a
        SUCCESS — it gets status "achieved" and terminal_state: "proved".

        Momentum score guidelines (evaluate holistically, not as rigid formulas):
        - Recent "reinforced" with high confidence: push up (+1 per strong reinforcement, cap at +4)
        - "softened": pull down by 1
        - "reframed": pull down by 1
        - "absent": pull down by 2 (silence is loud)
        - "achieved": set to +4 (Orbit)
        - "retired_silent": set to -4 (Buried)
        - "retired_transparent": set to -4
        Consider recency, confidence, and context. One strong reinforcement after two softenings
        may warrant a higher score than arithmetic suggests.

        COMMITMENT WINDOW CONTEXT:
        When evaluating momentum, consider the commitment window:
        - An objective approaching its deadline with strong signals deserves credit
        - An objective past its deadline with no acknowledgment is more concerning than one still within window
        - Deadline shifts (extensions) without explanation should be flagged

        PASS 3 — VERDICT WRITING:
        For any objective transitioning to graveyard, write a verdict_text paragraph (2-4 sentences).
        Editorial voice: fact-based, evidenced, precise, not sensational. Economist x Vanity Fair tone.
        For achieved objectives (including silent achievements), write a verdict noting how it was
        communicated (or not).

        For existing graveyard entries: do NOT re-evaluate for promotion, but DO include them in
        cross-reference scanning (their signals may contain evidence relevant to active objectives).

        RETURN FORMAT — respond with ONLY valid JSON, no markdown, no preamble:

        {{{{
          "objective_updates": [
            {{{{
              "objective_id": "<uuid>",
              "proposed_momentum_score": 3,
              "momentum_reasoning": "Brief explanation of trajectory assessment",
              "proposed_status": "active|watch|drifting|achieved|dropped|morphed|null (null = no change)",
              "terminal_state": "proved|buried|null",
              "exit_manner": "silent|phased|morphed|transparent|achieved|null",
              "exit_date": "YYYY-MM-DD or null",
              "transparency_score": "very_low|low|medium|high|null",
              "verdict_text": "Editorial verdict paragraph or null",
              "successor_objective_id": "<uuid of successor if morphed, null otherwise>"
            }}}}
          ],
          "correlation_signals": [
            {{{{
              "source_objective_id": "<uuid of objective where language was found>",
              "target_objective_id": "<uuid of objective being referenced>",
              "signal_date": "YYYY-MM-DD",
              "excerpt": "The specific language that references the other objective",
              "interpretation": "Description of what this cross-reference suggests"
            }}}}
          ],
          "updated_commitment_score": 78,
          "correlation_summary": "1-2 sentence summary of findings"
        }}}}

        Include an objective_updates entry for EVERY non-graveyard objective, even if no changes
        are proposed (set proposed_status to null, keep proposed_momentum_score as your assessment).
        Only include correlation_signals if you actually found cross-references.
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

        firecrawl_key = os.environ.get("FIRECRAWL_API_KEY")
        firecrawl_context = prefetch_company_docs(company, firecrawl_key)
        if firecrawl_context:
            prompt = prompt + firecrawl_context
            url_count = (1 if company.get("ir_page_url") else 0) + len(company.get("additional_sources") or [])
            print(f"  → Pre-fetched {url_count} document(s) via Firecrawl")

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

        # Save new signals (autonomous — published directly)
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
                obj_update["terminal_state"] = "buried"
                obj_update["exit_date"] = date.today().isoformat()
            elif prop["proposed_status"] == "achieved":
                obj_update["terminal_state"] = "proved"
                obj_update["exit_date"] = date.today().isoformat()
            db.table("objectives").update(obj_update).eq("id", prop["objective_id"]).execute()

        # ── Correlation & Lifecycle Pass ──────────────────────────
        score = result.get("updated_commitment_score")
        corr_result = run_correlation_pass(claude, db, company_id, run_id)

        # ── Final agent run update ────────────────────────────────
        monthly_cost = round(
            (response.usage.input_tokens * 0.000003) +
            (response.usage.output_tokens * 0.000015), 4
        )
        total_cost = monthly_cost + corr_result.get("correlation_cost", 0)
        combined_summary = result.get("run_summary", "")
        if corr_result.get("summary"):
            combined_summary += " | Correlation: " + corr_result["summary"]

        mark_company_researched(db, company_id, corr_result.get("updated_commitment_score") or score)
        update_agent_run(db, run_id,
            status="completed",
            sources_searched=len(result.get("sources_found", [])),
            signals_proposed=len(new_signals) + len(status_proposals),
            run_summary=combined_summary,
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
            estimated_cost_usd=total_cost,
        )

        print(f"  ✓ {len(new_signals)} new signals, {len(status_proposals)} status proposals")
        print(f"  → {combined_summary}")
        if total_cost:
            print(f"  → Total run cost: ~${total_cost}")

    except Exception as e:
        update_agent_run(db, run_id, status="failed", error_message=str(e))
        print(f"  ✗ Monthly run failed: {e}")
        raise


def run_correlation_pass(claude: anthropic.Anthropic, db: Client, company_id: str, run_id: str) -> dict:
    """
    Correlation & lifecycle pass: cross-references objectives, detects silent
    achievements, promotes to graveyard, adjusts momentum. Fully autonomous.
    """
    company = get_company(db, company_id)
    objectives = get_objectives(db, company_id)
    signals = get_signals_for_company(db, company_id)

    if not objectives:
        print("  ⚠ No objectives — skipping correlation pass.")
        return {}

    print("  → Running correlation pass…")
    prompt = build_correlation_prompt(company, objectives, signals)

    try:
        total_input_tokens = 0
        total_output_tokens = 0

        response = claude.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            messages=[{"role": "user", "content": prompt}],
        )
        total_input_tokens += response.usage.input_tokens
        total_output_tokens += response.usage.output_tokens

        result_text = ""
        for block in response.content:
            if hasattr(block, "text"):
                result_text += block.text

        # Parse with one retry on failure
        try:
            result = json.loads(result_text)
        except json.JSONDecodeError:
            print("  ⚠ Correlation pass returned invalid JSON. Retrying…")
            response = claude.messages.create(
                model=MODEL,
                max_tokens=MAX_TOKENS,
                messages=[
                    {"role": "user", "content": prompt},
                    {"role": "assistant", "content": result_text},
                    {"role": "user", "content": "Your response was not valid JSON. Please respond with ONLY valid JSON, no markdown fences, no preamble."},
                ],
            )
            total_input_tokens += response.usage.input_tokens
            total_output_tokens += response.usage.output_tokens
            result_text = ""
            for block in response.content:
                if hasattr(block, "text"):
                    result_text += block.text
            try:
                result = json.loads(result_text)
            except json.JSONDecodeError:
                print("  ✗ Correlation pass JSON parse failed after retry. Skipping.")
                return {}

        # Apply objective updates
        updates_applied = 0
        for update in result.get("objective_updates", []):
            obj_id = update.get("objective_id")
            if not obj_id:
                continue

            obj_patch = {}
            if update.get("proposed_momentum_score") is not None:
                obj_patch["momentum_score"] = update["proposed_momentum_score"]
            if update.get("proposed_status"):
                obj_patch["status"] = update["proposed_status"]
            if update.get("terminal_state"):
                obj_patch["terminal_state"] = update["terminal_state"]
            if update.get("exit_manner"):
                obj_patch["exit_manner"] = update["exit_manner"]
            if update.get("exit_date"):
                obj_patch["exit_date"] = update["exit_date"]
            if update.get("transparency_score"):
                obj_patch["transparency_score"] = update["transparency_score"]
            if update.get("verdict_text"):
                obj_patch["verdict_text"] = update["verdict_text"]
            if update.get("successor_objective_id"):
                obj_patch["successor_objective_id"] = update["successor_objective_id"]

            if obj_patch:
                db.table("objectives").update(obj_patch).eq("id", obj_id).execute()
                updates_applied += 1

        # Save correlation signals
        corr_signals = result.get("correlation_signals", [])
        for cs in corr_signals:
            target_id = cs.get("target_objective_id")
            if not target_id:
                continue
            save_signal(db, {
                "objective_id":     target_id,
                "company_id":       company_id,
                "signal_date":      cs.get("signal_date", date.today().isoformat()),
                "source_type":      "other",
                "source_name":      "Correlation Pass — Cross-reference",
                "classification":   "achieved" if "achievement" in cs.get("interpretation", "").lower() else "softened",
                "confidence":       6,
                "excerpt":          cs.get("excerpt", ""),
                "agent_reasoning":  f"[CROSS-REF from {cs.get('source_objective_id', '?')[:8]}] {cs.get('interpretation', '')}",
            })

        # Update company commitment score
        new_score = result.get("updated_commitment_score")
        if new_score is not None:
            db.table("companies").update({"overall_commitment_score": new_score}).eq("id", company_id).execute()

        # Append correlation stats to agent run
        corr_tokens = total_input_tokens + total_output_tokens
        corr_cost = round(
            (total_input_tokens * 0.000003) +
            (total_output_tokens * 0.000015), 4
        )

        print(f"  ✓ Correlation: {updates_applied} objectives updated, {len(corr_signals)} cross-references")
        print(f"  → {result.get('correlation_summary', '')}")
        print(f"  → Correlation cost: ~${corr_cost}")

        return {
            "updates_applied": updates_applied,
            "cross_references": len(corr_signals),
            "correlation_tokens": corr_tokens,
            "correlation_cost": corr_cost,
            "summary": result.get("correlation_summary", ""),
        }

    except Exception as e:
        print(f"  ✗ Correlation pass failed: {e}")
        print("  → Monthly signals were saved. Run --correlate to retry.")
        return {}


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
    parser = argparse.ArgumentParser(description="Drift Research Agent")
    parser.add_argument("--company-id",  help="Run monthly research for a specific company UUID")
    parser.add_argument("--intake",      help="Run intake for a specific company UUID")
    parser.add_argument("--review",      action="store_true", help="Show all draft signals pending review")
    parser.add_argument("--approve",     help="Approve a draft signal by UUID")
    parser.add_argument("--reject",      help="Reject (delete) a draft signal by UUID")
    parser.add_argument("--correlate",  help="Run correlation pass for a specific company UUID")
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

    elif args.correlate:
        run_id = create_agent_run(db, args.correlate, triggered_by="manual_correlate")
        corr_result = run_correlation_pass(claude, db, args.correlate, run_id)
        update_agent_run(db, run_id, status="completed",
            run_summary=corr_result.get("summary", ""),
            estimated_cost_usd=corr_result.get("correlation_cost", 0))

    elif args.company_id:
        run_monthly(claude, db, args.company_id)

    else:
        # Default: run all companies due for research
        run_all_due(claude, db)


if __name__ == "__main__":
    main()
