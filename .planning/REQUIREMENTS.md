# Drift v4.0 — Requirements & Acceptance Criteria

**Project:** Drift v4.0 Research Enhancement
**Date:** 2026-03-26
**Owner:** Stefano
**Status:** Planning

---

## Overview

Integrate **Firecrawl** into the Drift research agent to improve data extraction quality and signal confidence. The agent currently uses generic web search; Firecrawl will provide structured, clean page content → higher-quality signal classification.

---

## Functional Requirements

### FR1: Firecrawl API Integration
- **ID:** FR1
- **Description:** Agent must be able to call Firecrawl API to fetch clean markdown from company IR pages
- **Acceptance Criteria:**
  - Firecrawl SDK installed and configured in `backend/agent.py`
  - Agent can fetch IR page URLs via Firecrawl
  - Markdown output stored in database
  - Errors gracefully handled (retry, fallback to web search)
- **Priority:** 🔴 Critical
- **Dependencies:** None

### FR2: Signal Classification with Firecrawl Data
- **ID:** FR2
- **Description:** Agent must improve signal detection by analyzing Firecrawl markdown instead of raw search results
- **Acceptance Criteria:**
  - Signal detection logic updated to parse Firecrawl markdown
  - Timestamps extracted from Firecrawl metadata (published date, modified date)
  - Tables parsed as structured data (targets, KPIs, etc.)
  - Confidence scoring reflects data quality
- **Priority:** 🔴 Critical
- **Dependencies:** FR1

### FR3: Audit Trail & Provenance
- **ID:** FR3
- **Description:** All signals must include the Firecrawl markdown snapshot for human verification
- **Acceptance Criteria:**
  - `signals` table has `source_content` column (stores Firecrawl markdown)
  - Admin UI displays markdown snippet alongside signal
  - Signals table tracks Firecrawl usage (boolean flag or JSON metadata)
  - Version history preserved for retroactive review
- **Priority:** 🟡 High
- **Dependencies:** FR1, FR2

### FR4: Cost Tracking & Controls
- **ID:** FR4
- **Description:** Track Firecrawl API usage to prevent budget overruns
- **Acceptance Criteria:**
  - `agent_runs` table tracks Firecrawl requests and cost per run
  - Environment variable `FIRECRAWL_API_KEY` secured (never logged)
  - Monthly cost estimate available (via query or script)
  - Cost per run stays <€2.00
- **Priority:** 🟡 High
- **Dependencies:** FR1

### FR5: Fallback & Error Handling
- **ID:** FR5
- **Description:** Agent gracefully handles Firecrawl failures (API down, paywalled pages, timeouts)
- **Acceptance Criteria:**
  - Firecrawl errors logged with context
  - Automatic retry logic with exponential backoff
  - Fallback to Claude web search if Firecrawl fails
  - Agent run completes even if some pages fail
- **Priority:** 🟡 High
- **Dependencies:** FR1

---

## Non-Functional Requirements

### NFR1: Quality Improvement
- **ID:** NFR1
- **Description:** Signal quality must improve measurably without regression
- **Acceptance Criteria:**
  - Average confidence score increases from 6.5 → 8.0+ (23% improvement)
  - False negative rate decreases from ~15% → <5%
  - No increase in false positives
- **Priority:** 🔴 Critical

### NFR2: Performance
- **ID:** NFR2
- **Description:** Agent runtime must not degrade significantly
- **Acceptance Criteria:**
  - Agent runtime per company ≤10 minutes (currently ~5 min, acceptable overhead ~100%)
  - Firecrawl requests timeout at 30 seconds
  - No memory leaks or connection pooling issues
- **Priority:** 🟡 High

### NFR3: Reliability
- **ID:** NFR3
- **Description:** Agent must operate autonomously without human intervention
- **Acceptance Criteria:**
  - 100% successful agent runs (no crashes)
  - Firecrawl success rate >90% (tolerate some paywalled/error pages)
  - All errors logged with actionable context
- **Priority:** 🟡 High

### NFR4: Security & Privacy
- **ID:** NFR4
- **Description:** API keys and sensitive data must be protected
- **Acceptance Criteria:**
  - FIRECRAWL_API_KEY never logged or exposed
  - Environment variables managed via .env (never committed)
  - Supabase RLS policies enforced (no data leakage)
  - Agent runs logged in audit_runs table
- **Priority:** 🔴 Critical

### NFR5: Maintainability
- **ID:** NFR5
- **Description:** Code must be documented and testable
- **Acceptance Criteria:**
  - Agent code includes docstrings for Firecrawl integration
  - Test suite covers Firecrawl integration (mock API)
  - Runbook for troubleshooting common errors
- **Priority:** 🟡 High

---

## Out of Scope (Explicitly)

- **Paywall handling:** Firecrawl cannot access paid content (e.g., Bloomberg, paywalled PDF reports). Fallback to Claude web search.
- **Real-time monitoring:** Still bi-weekly schedule. No real-time signal detection.
- **Retroactive signal updates:** Apply Firecrawl logic to *new* signals only. Don't re-process historical signals.
- **New company intake:** Focus on existing tracked companies (Sandoz, etc.) first.
- **UI changes:** Signal display format unchanged. Firecrawl integration is backend-only.

---

## Acceptance Tests (UAT)

### Test 1: Agent Can Fetch IR Page via Firecrawl
```
Given: Agent runs on Sandoz
When: Agent researches latest signals
Then: Agent successfully fetches Sandoz IR page via Firecrawl
And: Markdown is clean and contains expected sections (ESG, Commitments, etc.)
And: Firecrawl metadata (URL, timestamp, status) stored in agent_runs
```

### Test 2: Signal Confidence Improves
```
Given: Baseline signals created (pre-Firecrawl, confidence 6.5/10)
When: Agent re-runs with Firecrawl integration
Then: New signals have average confidence ≥8.0/10
And: No regression in false negatives (<5% instead of 15%)
```

### Test 3: Fallback Works When Firecrawl Fails
```
Given: A company page is paywalled or returns 404
When: Agent attempts to fetch via Firecrawl
Then: Firecrawl fails gracefully with logged error
And: Agent falls back to Claude web search
And: Agent run completes successfully
```

### Test 4: Cost Stays Within Budget
```
Given: Monthly Firecrawl budget = €500
When: Agent runs bi-weekly for 1 month
Then: Total Firecrawl cost ≤€100 (well under budget)
And: Cost per company run ≤€2.00
```

### Test 5: Audit Trail is Complete
```
Given: A signal is approved by human review
When: Admin looks at signal details
Then: Firecrawl markdown snapshot is visible
And: Source URL and fetch timestamp recorded
And: Can trace signal back to original page content
```

---

## Success Metrics

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Avg Signal Confidence | 6.5/10 | 8.0/10 | Score in signals table |
| False Negative Rate | ~15% | <5% | Manual review of missed signals |
| Firecrawl Success Rate | N/A | >90% | Successful fetches / total attempts |
| Agent Runtime/Company | ~5 min | ≤10 min | Duration in agent_runs |
| Cost per Run | ~€0.50 | <€2.00 | Cost tracking in agent_runs |
| Test Coverage | ~85% | 95%+ | Coverage report |

---

## Constraints & Assumptions

### Constraints
- Budget: €500 for Firecrawl over 1 year
- Timeline: 2–3 weeks to delivery
- Team: Stefano + Claude (no additional engineers)
- Infrastructure: Supabase, Python, existing CI/CD

### Assumptions
- Firecrawl API is stable and reliable (>99.5% uptime)
- Company IR pages are publicly accessible (no auth required)
- Firecrawl can handle dynamic content (JavaScript-rendered pages)
- Claude Opus is sufficient for signal classification (no specialized models needed)
- Agent runs remain bi-weekly (no need to increase frequency)

---

## Dependencies & Integration Points

### External
- **Firecrawl API:** https://www.firecrawl.dev/ (new)
- **Anthropic Claude API:** Already integrated (no changes)
- **Supabase Postgres:** Already integrated (schema updates only)

### Internal
- `backend/agent.py` — add Firecrawl integration
- `backend/schema.sql` — add columns for Firecrawl metadata
- Frontend `admin` page — display Firecrawl source content
- Test suite — add Firecrawl mock tests

---

## Phasing & Roadmap

This project will be broken into **3 phases:**

1. **Phase 1: Firecrawl Integration & Testing** (Week 1)
   - Install SDK, integrate into agent
   - Test with Sandoz manually
   - Verify data quality

2. **Phase 2: Quality Measurement & Refinement** (Week 2)
   - Run agent with Firecrawl on 2–3 companies
   - Measure confidence improvement
   - Adjust signal detection logic if needed

3. **Phase 3: Production Rollout & Documentation** (Week 3)
   - Production deployment
   - Runbook and troubleshooting guide
   - Cost estimation for year 1

---

## Sign-Off & Approval

- **Project Owner:** Stefano (sign-off pending)
- **Technical Lead:** Claude Code
- **Approval Date:** 2026-03-26
- **Last Updated:** 2026-03-26
