# Firecrawl Integration Design

**Created:** 2026-03-26
**Status:** Approved
**Scope:** Augment the Drift research agent with Firecrawl to extract full document content from IR pages, annual reports, earnings call transcripts, and press releases — complementing Claude's built-in `web_search` tool.

---

## Context

The research agent (`backend/agent.py`) currently uses Claude's built-in `web_search_20250305` tool to find and summarise public disclosures. This tool returns search snippets and partial page previews. For strategic accountability research, full document context matters: a commitment buried in paragraph 14 of an annual report will be missed by a snippet.

Firecrawl is a dedicated web scraping API that returns clean markdown from any URL. It handles JavaScript-rendered pages, PDFs, and structured IR sites.

---

## Architecture

### Mode: Complement (not replace)

`web_search` continues to discover URLs. After search results come back, Firecrawl extracts full content from each URL before passing it to Claude. Claude reads documents, not snippets.

```
web_search(query) → [urls + snippets]
        ↓
enrich_search_results(results) → [urls + full_markdown]
        ↓
Claude prompt (now reads full documents)
```

If `FIRECRAWL_API_KEY` is unset, `enrich_search_results()` is a no-op and the agent falls back to snippet mode silently.

---

## New Functions in `agent.py`

### `firecrawl_extract(url: str, api_key: str, max_chars: int = 30_000) -> str | None`

Calls `FirecrawlApp.scrape_url(url, params={"formats": ["markdown"]})`.

- Returns markdown string, truncated to `max_chars` to guard against token blowout on large PDFs
- Returns `None` on any error: rate limit, timeout, unsupported format, HTTP error
- Logs a warning on failure (does not raise)

### `enrich_search_results(results: list[dict], api_key: str | None) -> list[dict]`

Takes the parsed results list from a `web_search` tool call — each dict has at minimum a `url` key and a `text` or `snippet` key (the structure Claude's `web_search_20250305` tool returns in its content blocks). For each result that contains a URL:

1. Calls `firecrawl_extract(url, api_key)`
2. If extraction succeeds: replaces the `text`/`snippet` field with the full markdown
3. If extraction fails: leaves original snippet intact

Returns the enriched results list. No results are ever dropped — only enriched or left unchanged.

---

## Integration Points

Both research paths call `enrich_search_results()` after collecting `web_search` outputs, before building the Claude prompt:

| Run type | Where called |
|---|---|
| `intake_run()` | After initial company research search results |
| `update_run()` | After monthly update search results |

---

## Source Coverage

All source types targeted: IR pages, annual/interim reports (HTML + PDF), earnings call transcripts, press releases, investor day materials, SEC/regulatory filings.

Firecrawl handles JavaScript-rendered pages and PDFs natively. No source-specific configuration required.

---

## Environment

```
FIRECRAWL_API_KEY=fc-...
```

Added to:
- `backend/.env` (local)
- `docs/setup.md` (setup guide)
- Vercel env vars (production)

If unset: agent runs in snippet-only mode. All existing behaviour preserved.

---

## Token Guard

`max_chars=30_000` default per document (~7,500 tokens). This protects against:
- Large PDF reports (200+ pages)
- Verbose transcript HTML
- Token budget overflow in Claude's context window

The limit is configurable per call if specific sources warrant a higher limit.

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Firecrawl API key missing | Skip enrichment entirely, use snippets |
| Rate limit (429) | Return `None`, use snippet fallback |
| Timeout | Return `None`, use snippet fallback |
| Unsupported URL (e.g. login-gated) | Return `None`, use snippet fallback |
| Partial content (truncated) | Use truncated markdown — still better than snippet |

No agent run should ever fail because Firecrawl is unavailable.

---

## Dependencies

```
firecrawl-py>=1.0.0
```

Added to `backend/requirements.txt`.

---

## Test Plan

1. **`firecrawl_extract` — success path:** Mock `FirecrawlApp.scrape_url` returning markdown. Assert return value equals markdown, truncated to `max_chars`.
2. **`firecrawl_extract` — failure path:** Mock raising an exception. Assert returns `None`, does not raise.
3. **`enrich_search_results` — with key:** Mock `firecrawl_extract` returning content. Assert snippet fields are replaced.
4. **`enrich_search_results` — without key:** Pass `api_key=None`. Assert results unchanged (no Firecrawl calls made).
5. **`enrich_search_results` — partial failure:** Mock some URLs succeeding, some failing. Assert successful ones enriched, failed ones retain original snippet.
