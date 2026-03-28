# Phase 5: Supabase Verification & Deployment — VERIFICATION

**Date:** 2026-03-28
**Status:** Partial — backend checks complete, deployment pending (Plan 02)

---

## Success Criteria Evidence

### SC-1: Agent connects to live Supabase without authentication errors (DB-01)

**Status:** PASS

**Evidence:** `python agent.py --review` output (after fix: load_dotenv('.env.local') and UTF-8 stdout):

```
  ✓ No signals pending review.
Exit code: 0
```

After Task 3 write path verification, the `--review` command returned 9 draft signals:

```
============================================================
  PENDING REVIEW — 9 draft signals
============================================================
  ID:         3f82a88b…  Company: Sandoz AG  Class: RETIRED_SILENT  (confidence: 8/10)
  ID:         e1e02b0b…  Company: Sandoz AG  Class: RETIRED_SILENT  (confidence: 8/10)
  ID:         d4b563f6…  Company: Sandoz AG  Class: REINFORCED      (confidence: 10/10)
  ID:         2f1baf8c…  Company: Sandoz AG  Class: REFRAMED        (confidence: 7/10)
  ID:         7d19aa47…  Company: Sandoz AG  Class: REINFORCED      (confidence: 10/10)
  ID:         4ce6cb76…  Company: Sandoz AG  Class: REINFORCED      (confidence: 10/10)
  ID:         f79ea1a9…  Company: Sandoz AG  Class: REINFORCED      (confidence: 10/10)
  ID:         b6288b37…  Company: Sandoz AG  Class: REINFORCED      (confidence: 10/10)
  ID:         922dcabd…  Company: Sandoz AG  Class: REINFORCED      (confidence: 10/10)
Exit code: 0
```

Supabase URL: myaxttyhhzpdugikdmue.supabase.co
Service key auth: confirmed (no AuthenticationError, no 401)

---

### SC-2: Agent writes draft signal and reads objectives (DB-02)

**Status:** PASS

**Evidence:** `python agent.py --company-id d61925bb-bf72-490a-a96b-a9a9ba89496f` run output:

```
============================================================
  MONTHLY: Sandoz AG — The Golden Decade
  9 objectives tracked | Last run: None
============================================================
  [WARN] Firecrawl extract failed for https://ir.sandoz.com: 'Firecrawl' object has no attribute 'scrape_url'
  → Calling Claude with web search…
  [DEBUG] stop_reason=end_turn result_text_len=28121 ...
  Signal 'reinforced' calculated confidence: 10/10
  Signal 'reinforced' calculated confidence: 10/10
  Signal 'reinforced' calculated confidence: 10/10
  Signal 'reinforced' calculated confidence: 10/10
  Signal 'reinforced' calculated confidence: 10/10
  Signal 'reframed' calculated confidence: 7/10
  Signal 'reinforced' calculated confidence: 10/10
  Signal 'retired_silent' calculated confidence: 8/10
  Signal 'retired_silent' calculated confidence: 8/10
  Status change signal confidence: 6/10
```

Objectives read: 9 (confirmed — prompt included all objective IDs)
Anthropic API: confirmed valid (claude-sonnet-4-6 called successfully with web_search tool)
Draft signals created: 9 (is_draft=true in signals table)

**Draft signals in DB (verified):**
```
Draft signals count: 9
- b6288b37 | reinforced    | conf 10 | 2026-03-10
- f79ea1a9 | reinforced    | conf 10 | 2026-02-25
- 4ce6cb76 | reinforced    | conf 10 | 2026-02-25
- 7d19aa47 | reinforced    | conf 10 | 2026-02-25
- 2f1baf8c | reframed      | conf  7 | 2026-02-25
- d4b563f6 | reinforced    | conf 10 | 2026-02-25
- e1e02b0b | retired_silent| conf  8 | 2026-02-25
- 922dcabd | reinforced    | conf 10 | 2026-02-25
- 3f82a88b | retired_silent| conf  8 | 2026-02-25
```

Agent run record in agent_runs table: YES — run_id 98f44447, status=pending_review, signals_proposed=9

**Note:** Run partially failed due to classification null-guard bug in status_change_proposals
(fixed in this plan). The write path (signal inserts) completed successfully. A null value
for exit_manner in the status_change_proposal caused the final update to fail, but all 9
draft signals were written before that step.

---

### SC-3: RLS enforced — anon key cannot write signals (DB-04)

**Status:** PASS

**Evidence:** `pytest tests/test_rls.py -v` output:

```
============================= test session starts =============================
platform win32 -- Python 3.11.9, pytest-9.0.2, pluggy-1.6.0 -- C:\Users\stefa\AppData\Local\Programs\Python\Python311\python.exe
cachedir: .pytest_cache
rootdir: C:\Users\stefa\OneDrive\AIWorkspace\content\drift magazine\backend
configfile: pytest.ini
plugins: anyio-4.23.0
collecting ... collected 1 item

tests/test_rls.py::test_anon_cannot_insert_signal PASSED                 [100%]

============================== 1 passed, 2 warnings in 2.74s ========================
Exit code: 0
```

RLS policy confirmed: anon role blocked from inserting into signals table.
Policy source: `backend/schema.sql` — "Service role full access to signals" (INSERT policy
only for service_role; no INSERT policy for anon).

---

### SC-4: Vercel site loads live data (DB-03, DEPLOY-01, DEPLOY-02, DEPLOY-03)

**Status:** PENDING — Plan 02

---

### SC-5: All pages render without errors on production URL

**Status:** PENDING — Plan 02

---

## Backend Environment

- SUPABASE_URL: myaxttyhhzpdugikdmue.supabase.co — real (confirmed connected)
- SUPABASE_SERVICE_KEY: real (service role key, full DB access confirmed)
- ANTHROPIC_API_KEY: real (claude-sonnet-4-6 called successfully)
- FIRECRAWL_API_KEY: not set — agent falls back to Claude web search (working)

## Bug Fixes Applied During Plan 01

1. **load_dotenv('.env.local')** — agent.py used `load_dotenv()` without specifying filename,
   causing it to look for `.env` instead of the actual `.env.local` file. Fixed to explicitly
   load `.env.local` first, then fall back to `.env`.

2. **Windows UTF-8 stdout** — Python on Windows uses cp1252 by default; Unicode checkmark
   and arrow characters in agent output caused UnicodeEncodeError. Fixed by wrapping
   sys.stdout/stderr with UTF-8 TextIOWrapper when encoding is non-UTF-8.

3. **_extract_json() helper** — Claude's web_search responses include prose analysis before
   and after the JSON object. `json.loads()` of the full text failed. Added `_extract_json()`
   using `json.JSONDecoder.raw_decode()` to locate and parse exactly the first complete JSON
   object, ignoring surrounding prose.

4. **status_change_proposals null classification** — `prop.get("exit_manner", "absent")`
   returned None when exit_manner was explicitly null in the JSON (Python default only fires
   for missing keys). Changed to `prop.get("exit_manner") or "absent"`.

## Blockers Encountered

- **Anthropic org rate limit (30k TPM):** The shared API key used by both this execution
  session and agent.py runs has a 30,000 input tokens per minute org limit. When this plan's
  conversation and agent attempts ran concurrently, the limit was repeatedly hit. Workaround:
  5-8 minute cooldowns between attempts. The successful run completed during a quiet window.

- **Firecrawl SDK incompatibility:** `FirecrawlApp` SDK does not expose `scrape_url` method
  in the installed version. Agent falls back to Claude web search — no impact on functionality.
  Deferred to maintenance backlog.
