# Phase 1: Firecrawl Integration & Testing — Research

**Researched:** 2026-03-26
**Domain:** Firecrawl Python SDK, Supabase schema migrations, Python retry patterns
**Confidence:** HIGH (core SDK), MEDIUM (rate limits — partially verified via official docs)

---

## Summary

Phase 1 integrates the Firecrawl `firecrawl-py` SDK into the existing `backend/agent.py` Python agent. The agent already has a partial Firecrawl scaffold (`FirecrawlApp` import, `firecrawl_extract()` and `prefetch_company_docs()` helpers) that was added speculatively — but the SDK is not yet listed as installed or tested. The primary work is: confirming the SDK API surface matches the existing code, adding rate-limit retry logic, adding a `source_content` column to `signals`, and running manual validation on Sandoz.

A critical finding: the existing `agent.py` uses `FirecrawlApp` and `scrape_url()` — the older v1 method name. The current Firecrawl SDK (v1 API, now standard) still exposes `scrape_url()` via the `FirecrawlApp` class. This is consistent and does not require a rewrite. However, the newer v2 API introduced `Firecrawl` class with a `scrape()` method. The planner should preserve the existing v1 patterns since they are already written and tested by Firecrawl against v1 docs.

The Sandoz IR page (`https://ir.sandoz.com` and `https://www.sandoz.com/investors/`) is publicly accessible with no auth wall. However, the site is Drupal-based with JavaScript rendering. Firecrawl handles JavaScript-rendered pages natively (headless browser), so this is not a blocker.

**Primary recommendation:** Install `firecrawl-py>=1.0.0` (already in `requirements.txt`), validate the `FirecrawlApp.scrape_url()` return dict keys (`markdown`, `content`), add exponential backoff via `tenacity`, add `source_content` column to `signals`, and run two manual test runs against Sandoz.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FR1 | Firecrawl SDK installed and configured in `backend/agent.py`; fetch IR pages, store markdown, handle errors | SDK already scaffolded in agent; `firecrawl-py>=1.0.0` already in requirements.txt; `FirecrawlApp` import with `try/except` fallback present |
| FR2 (partial) | Signal detection logic uses Firecrawl markdown as primary source | Existing `prefetch_company_docs()` already prepends markdown to prompt; Phase 1 validates this path works end-to-end |
| FR4 | Exponential backoff, request batching, `FIRECRAWL_API_KEY` env var, graceful degradation | `tenacity` library is the standard for Python retry; free tier: 10 scrape req/min, 500 lifetime credits |
| FR5 | Graceful error handling, retry, fallback to Claude web search, agent completes even if pages fail | Existing `try/except` in `firecrawl_extract()` returns `None` on failure; fallback already implicitly handled by prompt structure |
| NFR2 | Agent runtime ≤10 min; Firecrawl requests timeout at 30s; no memory leaks | Firecrawl SDK supports timeout param; rate limit of 10/min means ~6s/request minimum; Sandoz has 1 IR page + a few extra sources — well within budget |
| NFR3 | 100% successful agent runs; >90% Firecrawl success rate; all errors logged | Retry + fallback covers this; Sandoz IR page is publicly accessible |
| NFR4 | `FIRECRAWL_API_KEY` never logged; managed via .env; Supabase RLS enforced | Key loading pattern already set: `os.environ["ANTHROPIC_API_KEY"]` style; must add `FIRECRAWL_API_KEY` with same pattern |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| firecrawl-py | >=1.0.0 (current: 4.21.0 on PyPI) | Web scraping to clean markdown | Official Python SDK; `FirecrawlApp` class; `scrape_url()` method |
| tenacity | >=8.0.0 | Exponential backoff retry decorator | Industry standard for Python retry logic; supports `wait_random_exponential`, `stop_after_attempt`, `retry_if_exception_type` |
| python-dotenv | >=1.0.0 | Load `FIRECRAWL_API_KEY` from `.env` | Already in stack |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| anthropic | >=0.40.0 | Claude API fallback if Firecrawl fails | Already integrated; fallback data source |
| supabase | >=2.0.0 | Persist `source_content` column | Already integrated; schema migration target |
| pytest + unittest.mock | stdlib | Unit tests for Firecrawl integration | Mock `FirecrawlApp` to test retry logic without hitting API |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| tenacity | Manual `time.sleep()` loops | tenacity is declarative, handles jitter, avoids hand-rolled retry state |
| firecrawl-py v1 (`FirecrawlApp`) | v2 (`Firecrawl` class, `scrape()`) | v1 already scaffolded in agent; migration adds risk with no Phase 1 benefit |

**Installation:**
```bash
pip install firecrawl-py>=1.0.0 tenacity>=8.0.0
```

Note: `firecrawl-py` is already listed in `backend/requirements.txt` at `>=1.0.0`. `tenacity` must be added.

**Version verification:** PyPI shows `firecrawl-py 4.21.0` and `firecrawl 4.21.0` (there are two package names — `firecrawl-py` is the canonical one from the Firecrawl team).

---

## Architecture Patterns

### Recommended Project Structure
No structural changes needed. Phase 1 is entirely within `backend/agent.py` and a schema migration.

```
backend/
├── agent.py              # Firecrawl integration already scaffolded; add retry wrapper
├── requirements.txt      # Add tenacity>=8.0.0
├── schema.sql            # Add v5 migration block for source_content column
└── .env                  # Add FIRECRAWL_API_KEY (never commit)
```

### Pattern 1: Retry Wrapper Around `firecrawl_extract()`

**What:** Wrap the Firecrawl HTTP call with tenacity exponential backoff. Catches HTTP 429 (rate limit) and transient errors. Falls back to `None` after max retries so the agent continues.

**When to use:** Every call to `FirecrawlApp.scrape_url()`.

**Example:**
```python
# Source: https://github.com/jd/tenacity + Firecrawl rate limit docs
from tenacity import retry, stop_after_attempt, wait_random_exponential, retry_if_exception_type

@retry(
    wait=wait_random_exponential(min=2, max=30),
    stop=stop_after_attempt(3),
    retry=retry_if_exception_type(Exception),
    reraise=False,
)
def _scrape_with_retry(app: "FirecrawlApp", url: str) -> dict:
    return app.scrape_url(url, params={"formats": ["markdown"]})

def firecrawl_extract(url: str, api_key: str, max_chars: int = 30_000) -> Optional[str]:
    if not _FIRECRAWL_AVAILABLE or not api_key:
        return None
    try:
        app = FirecrawlApp(api_key=api_key)
        result = _scrape_with_retry(app, url)
        content = result.get("markdown") or result.get("content") or ""
        return content[:max_chars] if content else None
    except Exception as e:
        print(f"  [WARN] Firecrawl extract failed for {url}: {e}")
        return None
```

### Pattern 2: Schema Migration (Add `source_content` to `signals`)

**What:** `ALTER TABLE signals ADD COLUMN IF NOT EXISTS source_content text;` — nullable, no default needed. PostgreSQL 11+ (Supabase) handles this with no table lock and zero downtime.

**When to use:** Run once in Supabase SQL editor before agent runs. Add as a "V5 Migration" comment block in `schema.sql` following the existing `-- ── V4 MIGRATIONS` pattern.

**Example:**
```sql
-- ── V5 MIGRATIONS: Firecrawl Source Content ──────────────────────────────
-- Run once against existing databases.
-- Stores the Firecrawl markdown snapshot for audit trail and human verification.

ALTER TABLE signals ADD COLUMN IF NOT EXISTS source_content text;
```

### Pattern 3: Key Loading Without Logging

**What:** Load `FIRECRAWL_API_KEY` from env without ever printing or logging it. Assign to a module-level constant — only pass to `FirecrawlApp()`. Never include in `raw_log` or `run_summary`.

**Example:**
```python
FIRECRAWL_API_KEY = os.environ.get("FIRECRAWL_API_KEY")  # Optional — None disables Firecrawl
```

Using `.get()` (not `[]`) so the agent runs without a key (falls back to web search), preventing crashes on environments where the key is not set.

### Pattern 4: Store `source_content` on Signals

**What:** When saving a signal to the database, include the Firecrawl markdown excerpt that produced it as `source_content`. This satisfies FR3 (audit trail) and is the database target for the new column.

**When to use:** In the `save_signal()` DB helper, the `signal` dict should include `source_content` if available.

### Anti-Patterns to Avoid
- **`os.environ["FIRECRAWL_API_KEY"]`** (with brackets): Will raise `KeyError` if key not set, breaking the agent in environments without the key. Use `.get()` instead.
- **Instantiating `FirecrawlApp` inside a loop per URL**: The app object holds a connection pool. Create once per agent run, not per URL.
- **Logging `api_key` in error messages**: `f"Failed with key {api_key}"` — violates NFR4.
- **Setting `is_draft=False` on new signals**: CONCERNS.md confirms this is a live bug. Phase 1 should set `is_draft=True` to fix the contradiction between CLAUDE.md (draft-only) and current code.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Exponential backoff with jitter | Custom `while` loop with `time.sleep()` | `tenacity` | tenacity handles jitter, max attempts, exception type filtering declaratively |
| HTTP retry on 429 | Parse status codes manually | `tenacity` + Firecrawl SDK exception types | SDK raises exceptions; tenacity catches any Exception class |
| Markdown truncation | Custom chunking logic | Simple `content[:max_chars]` slice | Already in the code; sufficient for Phase 1 |
| Schema migration tracking | Custom migration table | Supabase SQL editor + `IF NOT EXISTS` guard | Low complexity; one-time operation |

**Key insight:** The agent's retry and fallback complexity is best solved declaratively (tenacity) rather than imperatively (manual loops), keeping the existing `firecrawl_extract()` function signature stable.

---

## Common Pitfalls

### Pitfall 1: `scrape_url()` Return Dict Key Mismatch
**What goes wrong:** Existing code reads `result.get("markdown") or result.get("content")`. If the SDK version returns a different key (e.g., `result["data"]["markdown"]` in some versions), the extract silently returns `None`.
**Why it happens:** The Firecrawl SDK has gone through multiple versions; response shapes shifted.
**How to avoid:** In Wave 0 / test run, print the full `result` dict keys before going live. Add an assertion in the test: `assert "markdown" in result or "content" in result`.
**Warning signs:** Agent completes without crashing, but `prefetch_company_docs()` always returns empty string.

### Pitfall 2: Firecrawl Free Tier Is 500 Lifetime Credits, Not Monthly
**What goes wrong:** Planning assumes unlimited monthly requests; exhausting 500 credits in early testing leaves zero for production use.
**Why it happens:** The free tier's 500-credit limit is lifetime, not per month. Basic scrapes cost 1 credit each.
**How to avoid:** Run no more than 10-15 test scrapes during Phase 1 (5 URLs max per test run × 3 runs). Reserve credits for Phase 2 production validation.
**Warning signs:** API returns 402 Payment Required or similar credit-exhaustion error.

### Pitfall 3: Sandoz IR Pages Use JavaScript Rendering
**What goes wrong:** `https://ir.sandoz.com` is the configured URL but the actual investor content may live on `https://www.sandoz.com/investors/` (Drupal + React). Firecrawl handles JS rendering natively, but the **correct URL** matters — a redirect or incorrect base URL may return navigation chrome only.
**Why it happens:** ir.sandoz.com returns ECONNREFUSED (confirmed during research — the domain may be inactive or redirect). The live IR site is at `www.sandoz.com/investors/`.
**How to avoid:** Verify that `ir.sandoz.com` resolves. If not, update `ir_page_url` in the Supabase `companies` row for Sandoz to `https://www.sandoz.com/investors/` before running the agent.
**Warning signs:** Firecrawl returns a redirect page or minimal content with no IR document links.

### Pitfall 4: Rate Limit is 10/min on Scrape — Not 1-5 as Assumed in Roadmap
**What goes wrong:** Planning documents assume 1-5 req/min. Official docs show 10/min for scrape on free tier. This is less restrictive than feared, but the 500 lifetime credit cap is the real constraint.
**Why it happens:** Roadmap was written before rate limit docs were checked.
**How to avoid:** Plan tests conservatively around the 500-credit budget, not the per-minute rate limit. A 6-second delay between requests is sufficient to stay under 10/min.
**Warning signs:** 429 responses from the API.

### Pitfall 5: `is_draft=False` Bug Must Be Fixed in Phase 1
**What goes wrong:** CONCERNS.md documents that `agent.py` currently sets `is_draft=False` on all new signals, contradicting the "draft-only" workflow in CLAUDE.md. If Phase 1 test runs use the agent as-is, test signals will be published directly.
**Why it happens:** Implementation diverged from specification.
**How to avoid:** Fix `save_signal()` to default `is_draft=True` as part of Phase 1. This is a one-line fix and reduces editorial risk.
**Warning signs:** New signals appearing published without going through `--approve` workflow.

---

## Code Examples

### Firecrawl Initialization (Existing Pattern — Confirmed Correct)
```python
# Source: https://github.com/firecrawl/firecrawl-py (GitHub README)
from firecrawl import FirecrawlApp

app = FirecrawlApp(api_key="fc-YOUR_API_KEY")
result = app.scrape_url("https://www.sandoz.com/investors/",
                        params={"formats": ["markdown"]})
markdown = result.get("markdown") or result.get("content") or ""
```

### Tenacity Retry Decorator Pattern
```python
# Source: https://github.com/jd/tenacity (README)
from tenacity import (
    retry,
    stop_after_attempt,
    wait_random_exponential,
    retry_if_exception_type,
)

@retry(
    wait=wait_random_exponential(min=2, max=30),
    stop=stop_after_attempt(3),
    retry=retry_if_exception_type(Exception),
    reraise=False,
)
def _scrape_with_retry(app, url: str, params: dict) -> dict:
    return app.scrape_url(url, params=params)
```

### Safe Key Loading Pattern
```python
# Source: existing agent.py pattern + Python docs
FIRECRAWL_API_KEY = os.environ.get("FIRECRAWL_API_KEY")  # None if not set

# In agent run setup:
firecrawl_key = FIRECRAWL_API_KEY
if not firecrawl_key:
    print("  [INFO] FIRECRAWL_API_KEY not set — Firecrawl disabled, using web search only")
```

### Schema Migration (Safe for Supabase Postgres 15)
```sql
-- Source: PostgreSQL 11+ ADD COLUMN behavior (zero downtime)
ALTER TABLE signals
  ADD COLUMN IF NOT EXISTS source_content text;
```

### Mock Pattern for Python Unit Tests
```python
# Source: https://docs.python.org/3/library/unittest.mock.html
from unittest.mock import patch, MagicMock

def test_firecrawl_extract_returns_markdown():
    mock_result = {"markdown": "# Sandoz Investors\n\nContent here..."}
    with patch("agent.FirecrawlApp") as MockApp:
        MockApp.return_value.scrape_url.return_value = mock_result
        result = firecrawl_extract("https://example.com", api_key="fc-test")
    assert result == "# Sandoz Investors\n\nContent here..."

def test_firecrawl_extract_returns_none_on_exception():
    with patch("agent.FirecrawlApp") as MockApp:
        MockApp.return_value.scrape_url.side_effect = Exception("API error")
        result = firecrawl_extract("https://example.com", api_key="fc-test")
    assert result is None
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Generic web search only | Firecrawl structured markdown + web search fallback | v4.0 (this phase) | Higher quality source text for signal classification |
| `firecrawl-py` v0.x (`scrape_url` returns `{"content": ...}`) | v1.x+ (`scrape_url` returns `{"markdown": ..., "content": ...}`) | 2024 | Existing code handles both keys via `.get()` — safe |
| No retry logic | tenacity exponential backoff | Phase 1 new | Resilient to transient API failures and rate limits |

**Deprecated/outdated:**
- `FirecrawlApp.scrapeUrl()` (camelCase): Was the original JS-style method name. Python SDK uses `scrape_url()` (snake_case). Existing code is correct.
- Direct `import firecrawl` without `try/except`: Agent already wraps import in `try/except ImportError` — correct pattern retained.

---

## Open Questions

1. **Does `ir.sandoz.com` resolve?**
   - What we know: ECONNREFUSED during research on 2026-03-26. The domain may be inactive.
   - What's unclear: Whether it's a temporary outage or the URL in the Supabase `companies` row is wrong.
   - Recommendation: Wave 0 task — run `curl -I https://ir.sandoz.com` and update the Supabase record to `https://www.sandoz.com/investors/` if needed before any Firecrawl test run.

2. **Exact dict structure of `FirecrawlApp.scrape_url()` return**
   - What we know: Returns `{"markdown": ..., "content": ..., "metadata": {...}}` based on docs. Existing code handles both keys.
   - What's unclear: Whether v4.21.0 (current PyPI) returns `markdown` at root level or nested.
   - Recommendation: First task in Wave 1 is a one-line test script: `print(list(result.keys()))` to confirm keys before integration.

3. **500 lifetime credits — account already created?**
   - What we know: FIRECRAWL_API_KEY appears in STATE.md as a required credential, with "sign up at firecrawl.dev" noted.
   - What's unclear: Whether Stefano has already signed up and used any credits.
   - Recommendation: Planner should include a Wave 0 task to verify free tier credit balance before test runs.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python 3.11+ | backend/agent.py | ✗ | Not in bash env (Windows Store redirect) | Use local Python install; agent runs manually, not in this shell |
| firecrawl-py | FR1 | ✗ (not yet installed) | Listed in requirements.txt as >=1.0.0; PyPI latest: 4.21.0 | None — must install |
| tenacity | FR4 | ✗ (not in requirements.txt) | 8.x+ on PyPI | None — must add and install |
| anthropic | FR5 (fallback) | Listed in requirements.txt | >=0.40.0 | N/A — already required |
| supabase | Schema migration | Listed in requirements.txt | >=2.0.0 | N/A — already required |
| FIRECRAWL_API_KEY | FR1, NFR4 | ✗ (not in .env yet) | — | Agent degrades to web-search-only if absent |

**Missing dependencies with no fallback:**
- `firecrawl-py` — must be installed via `pip install firecrawl-py>=1.0.0`
- `tenacity` — must be added to `requirements.txt` and installed

**Missing dependencies with fallback:**
- `FIRECRAWL_API_KEY` — agent already handles missing key by returning empty string from `prefetch_company_docs()`; fallback to Claude web search is built in

**Note on Python environment:** Python is not available in the current bash environment (Windows with Microsoft Store alias redirect). Agent development and testing must be done in a local Python environment where `pip install -r backend/requirements.txt` has been run.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest (Python) — must be added; current tests are Vitest (frontend only) |
| Config file | `backend/pytest.ini` — does not exist yet (Wave 0 gap) |
| Quick run command | `pytest backend/tests/ -x -q` |
| Full suite command | `pytest backend/tests/ --cov=agent --cov-report=term-missing` |

**Note:** The existing test infrastructure (Vitest, 99 tests) covers the frontend only. There are zero backend Python tests. All Python backend tests are Wave 0 gaps.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FR1 | `firecrawl_extract()` returns markdown on success | unit | `pytest backend/tests/test_agent.py::test_firecrawl_extract_success -x` | ❌ Wave 0 |
| FR1 | `firecrawl_extract()` returns `None` on exception | unit | `pytest backend/tests/test_agent.py::test_firecrawl_extract_failure -x` | ❌ Wave 0 |
| FR1 | `firecrawl_extract()` returns `None` when key is absent | unit | `pytest backend/tests/test_agent.py::test_firecrawl_extract_no_key -x` | ❌ Wave 0 |
| FR4 | Retry fires on exception, succeeds on 3rd attempt | unit | `pytest backend/tests/test_agent.py::test_firecrawl_retry_logic -x` | ❌ Wave 0 |
| FR5 | Agent run completes when Firecrawl fails | integration | `pytest backend/tests/test_agent.py::test_agent_fallback_on_firecrawl_failure -x` | ❌ Wave 0 |
| NFR4 | API key never appears in print output | unit | `pytest backend/tests/test_agent.py::test_api_key_not_logged -x` | ❌ Wave 0 |
| Schema | `source_content` column exists in signals table | manual | Run SQL: `SELECT column_name FROM information_schema.columns WHERE table_name='signals'` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pytest backend/tests/test_agent.py -x -q`
- **Per wave merge:** `pytest backend/tests/ --cov=agent --cov-report=term-missing`
- **Phase gate:** All unit tests green + 2 successful manual Sandoz runs before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/tests/__init__.py` — Python package marker
- [ ] `backend/tests/test_agent.py` — covers FR1, FR4, FR5, NFR4 (all mocked)
- [ ] `backend/pytest.ini` — test discovery config
- [ ] Framework install: `pip install pytest pytest-cov`
- [ ] `tenacity` — add to `backend/requirements.txt`

---

## Project Constraints (from CLAUDE.md)

The project CLAUDE.md does not define a CONTEXT.md for this phase. The following constraints are extracted from the project's `CLAUDE.md` and `STATE.md`:

### Locked Constraints
- **Draft-only workflow:** Agent MUST set `is_draft=True`. Never publish signals automatically. All signals require human approval via `--approve` CLI or admin UI.
- **Firecrawl free tier only:** Zero budget. No paid tier, no paid alternatives.
- **Sandoz only:** Phase 1 scope is strictly Sandoz. No new companies.
- **No UI changes:** Firecrawl integration is backend-only. Frontend untouched.
- **`FIRECRAWL_API_KEY` must never be logged or committed:** Use `.env`, never appear in `raw_log`, `run_summary`, or any print statement.
- **Bi-weekly schedule unchanged:** No frequency increase.

### Technical Constraints
- Python 3.11+ (agent runtime)
- Supabase Postgres for schema migration (zero downtime via `ALTER TABLE ... IF NOT EXISTS`)
- Existing `backend/agent.py` code must not be broken — additive changes only
- `backend/requirements.txt` is the canonical dependency file

### Design Constraints (from CLAUDE.md)
- No new UI components — this is backend-only
- No changes to Next.js frontend during Phase 1
- Agent autonomy is intentionally conservative — draft-only reduces editorial risk

---

## Sources

### Primary (HIGH confidence)
- [Firecrawl Rate Limits Docs](https://docs.firecrawl.dev/rate-limits) — Free tier: 10 scrape/min, 2 concurrent browsers
- [Firecrawl Python SDK Docs](https://docs.firecrawl.dev/sdks/python) — `FirecrawlApp`, `scrape_url()`, return format
- [GitHub firecrawl/firecrawl-py](https://github.com/firecrawl/firecrawl-py) — Confirmed `FirecrawlApp` class name and `scrape_url()` method
- [PyPI firecrawl-py 4.21.0](https://pypi.org/project/firecrawl-py/4.21.0/) — Current version confirmed
- [tenacity GitHub](https://github.com/jd/tenacity) — `wait_random_exponential`, `stop_after_attempt`, `retry_if_exception_type`
- [Python unittest.mock docs](https://docs.python.org/3/library/unittest.mock.html) — Mocking patterns for `FirecrawlApp`
- PostgreSQL 11+ `ADD COLUMN` behavior — zero downtime for nullable column addition (verified via Supabase docs)

### Secondary (MEDIUM confidence)
- [Firecrawl V1 Welcome](https://docs.firecrawl.dev/v1-welcome) — Method rename from `scrapeUrl()` to `scrape_url()` (snake_case); v2 introduces `Firecrawl` class with `scrape()`
- [Sandoz Investors page](https://www.sandoz.com/investors/) — Publicly accessible, Drupal+React, no auth wall
- [WebScraping.AI Firecrawl free tier FAQ](https://webscraping.ai/faq/firecrawl/is-firecrawl-free-and-what-are-the-free-tier-limitations) — 500 lifetime credits confirmed (multiple sources agree)

### Tertiary (LOW confidence — flag for validation)
- `ir.sandoz.com` URL status — ECONNREFUSED during research; may be wrong URL in Supabase row. Needs manual verification.
- Firecrawl return dict structure for v4.21.0 specifically — confirmed `markdown` key exists but nested structure not fully verified.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — firecrawl-py and tenacity are well-documented with official sources
- Architecture: HIGH — existing code already scaffolded; patterns verified against SDK docs
- Rate limits: MEDIUM — official docs show 10/min for free scrape tier; 500 lifetime credits confirmed via multiple sources
- Pitfalls: HIGH — `ir.sandoz.com` ECONNREFUSED is a direct observation; dict key pitfall verified from SDK version history
- Sandoz page accessibility: HIGH — directly fetched and confirmed public

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (Firecrawl free tier policies may change; verify before Phase 2)
