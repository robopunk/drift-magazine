# Firecrawl Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Augment the Drift research agent so that known company IR pages and additional sources are scraped in full via Firecrawl before each Claude research call, giving Claude full document text instead of search snippets.

**Architecture:** `web_search_20250305` continues to discover URLs during generation. Before each agent run, a new `prefetch_company_docs()` helper scrapes the company's `ir_page_url` and `additional_sources` via Firecrawl and prepends the full markdown to the Claude prompt. Firecrawl is optional — if `FIRECRAWL_API_KEY` is unset the agent behaves exactly as before.

**Tech Stack:** Python 3.11+, `firecrawl-py>=1.0.0`, existing `backend/agent.py`

---

## File Map

| Action | File | Change |
|---|---|---|
| Modify | `backend/requirements.txt` | Add `firecrawl-py>=1.0.0` |
| Modify | `backend/agent.py` | Add imports, two new functions, two call sites |
| Modify | `docs/setup.md` | Document `FIRECRAWL_API_KEY` env var |

No new files. No frontend changes.

---

### Task 1: Add dependency and environment variable

**Files:**
- Modify: `backend/requirements.txt`
- Modify: `docs/setup.md`

- [ ] **Step 1: Add firecrawl-py to requirements**

Open `backend/requirements.txt`. Add after the existing entries:

```
firecrawl-py>=1.0.0
```

Full file should read:
```
anthropic>=0.40.0
supabase>=2.0.0
python-dotenv>=1.0.0
schedule>=1.2.0
requests>=2.31.0
firecrawl-py>=1.0.0
```

- [ ] **Step 2: Document the env var in setup.md**

Find the environment variables section in `docs/setup.md` and add `FIRECRAWL_API_KEY` alongside the existing vars. Add this text in the relevant section:

```
FIRECRAWL_API_KEY=fc-...   # Optional. Get from firecrawl.dev. Enables full-doc extraction.
```

If `FIRECRAWL_API_KEY` is absent, the agent skips enrichment and works as before.

- [ ] **Step 3: Commit**

```bash
git add backend/requirements.txt docs/setup.md
git commit -m "chore: add firecrawl-py dependency and document FIRECRAWL_API_KEY"
```

---

### Task 2: `firecrawl_extract()` — low-level scrape helper

**Files:**
- Modify: `backend/agent.py` (after the imports block, before `# ── CONFIG`)

- [ ] **Step 1: Write the failing test (inline verification)**

In a scratch Python REPL (not committed), verify this interface manually first:
```python
# Expected: returns a string or None, never raises
result = firecrawl_extract("https://example.com", api_key="bad-key")
assert result is None or isinstance(result, str)
```

- [ ] **Step 2: Add the import and function to agent.py**

In `backend/agent.py`, after line 38 (`from dotenv import load_dotenv`), add:

```python
try:
    from firecrawl import FirecrawlApp
    _FIRECRAWL_AVAILABLE = True
except ImportError:
    _FIRECRAWL_AVAILABLE = False
```

Then, after the `load_dotenv()` call (line 40) and before `# ── CONFIG`, add:

```python
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
```

- [ ] **Step 3: Verify the function is reachable**

```bash
cd backend
python -c "from agent import firecrawl_extract; print('ok')"
```
Expected output: `ok`

- [ ] **Step 4: Commit**

```bash
git add backend/agent.py
git commit -m "feat(agent): add firecrawl_extract helper with graceful fallback"
```

---

### Task 3: `prefetch_company_docs()` — IR page pre-fetcher

**Files:**
- Modify: `backend/agent.py` (immediately after `firecrawl_extract`)

- [ ] **Step 1: Add the function**

Immediately after `firecrawl_extract`, add:

```python
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
```

- [ ] **Step 2: Smoke test with no API key**

```bash
cd backend
python -c "
from agent import prefetch_company_docs
company = {'ir_page_url': 'https://example.com', 'additional_sources': []}
result = prefetch_company_docs(company, None)
assert result == '', f'Expected empty string, got: {result!r}'
print('ok — no api key returns empty string')
"
```
Expected: `ok — no api key returns empty string`

- [ ] **Step 3: Smoke test with no URLs configured**

```bash
cd backend
python -c "
from agent import prefetch_company_docs
company = {'ir_page_url': None, 'additional_sources': None}
result = prefetch_company_docs(company, 'fc-fake-key')
assert result == '', f'Expected empty string, got: {result!r}'
print('ok — no urls returns empty string')
"
```
Expected: `ok — no urls returns empty string`

- [ ] **Step 4: Commit**

```bash
git add backend/agent.py
git commit -m "feat(agent): add prefetch_company_docs to pre-load IR pages via Firecrawl"
```

---

### Task 4: Inject into `run_intake()`

**Files:**
- Modify: `backend/agent.py` — `run_intake()` function (~line 528)

- [ ] **Step 1: Locate the injection point**

In `run_intake()`, find:
```python
        prompt = build_intake_prompt(company)

        print("  → Calling Claude with web search…")
```

- [ ] **Step 2: Add the prefetch call between prompt build and Claude call**

Replace those two lines with:
```python
        prompt = build_intake_prompt(company)

        firecrawl_key = os.environ.get("FIRECRAWL_API_KEY")
        firecrawl_context = prefetch_company_docs(company, firecrawl_key)
        if firecrawl_context:
            prompt = prompt + firecrawl_context
            url_count = (1 if company.get("ir_page_url") else 0) + len(company.get("additional_sources") or [])
            print(f"  → Pre-fetched {url_count} document(s) via Firecrawl")

        print("  → Calling Claude with web search…")
```

- [ ] **Step 3: Verify import — os is already imported**

```bash
cd backend
python -c "import ast, sys; ast.parse(open('agent.py').read()); print('syntax ok')"
```
Expected: `syntax ok`

- [ ] **Step 4: Commit**

```bash
git add backend/agent.py
git commit -m "feat(agent): inject Firecrawl pre-fetch into run_intake"
```

---

### Task 5: Inject into `run_monthly()`

**Files:**
- Modify: `backend/agent.py` — `run_monthly()` function (~line 594)

- [ ] **Step 1: Locate the injection point**

In `run_monthly()`, find:
```python
        obj_id_map = "\n".join([f"  {o['title']}: {o['id']}" for o in objectives])
        full_prompt = prompt + f"\n\nOBJECTIVE ID REFERENCE:\n{obj_id_map}"

        print("  → Calling Claude with web search…")
```

- [ ] **Step 2: Add the prefetch call**

Replace those three lines with:
```python
        obj_id_map = "\n".join([f"  {o['title']}: {o['id']}" for o in objectives])
        full_prompt = prompt + f"\n\nOBJECTIVE ID REFERENCE:\n{obj_id_map}"

        firecrawl_key = os.environ.get("FIRECRAWL_API_KEY")
        firecrawl_context = prefetch_company_docs(company, firecrawl_key)
        if firecrawl_context:
            full_prompt = full_prompt + firecrawl_context
            url_count = (1 if company.get("ir_page_url") else 0) + len(company.get("additional_sources") or [])
            print(f"  → Pre-fetched {url_count} document(s) via Firecrawl")

        print("  → Calling Claude with web search…")
```

- [ ] **Step 3: Final syntax check**

```bash
cd backend
python -c "import ast; ast.parse(open('agent.py').read()); print('syntax ok')"
```
Expected: `syntax ok`

- [ ] **Step 4: Dry-run without API key to confirm graceful degradation**

```bash
cd backend
python -c "
import os
os.environ.setdefault('ANTHROPIC_API_KEY', 'fake')
os.environ.setdefault('SUPABASE_URL', 'https://fake.supabase.co')
os.environ.setdefault('SUPABASE_SERVICE_KEY', 'fake')
# Just import — don't run. Confirm no crash.
import agent
print('import ok — FIRECRAWL_API_KEY not set, agent degrades gracefully')
"
```
Expected: `import ok — FIRECRAWL_API_KEY not set, agent degrades gracefully`

- [ ] **Step 5: Commit**

```bash
git add backend/agent.py
git commit -m "feat(agent): inject Firecrawl pre-fetch into run_monthly"
```
