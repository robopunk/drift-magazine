# Codebase Concerns

**Analysis Date:** 2026-03-26

## Critical Security Issues

### Admin Dashboard Has No Authentication

**Issue:** `/admin` page is publicly accessible with no login requirement
- Files: `frontend/src/app/admin/page.tsx`
- Impact: Any visitor can approve/reject signals, delete agent run data, inspect draft signals
- Current state: Admin functions directly call Supabase with anon key (no guard checks)
- Fix approach: Implement Supabase Auth with role-based access control (RLS policies on signals table for admin operations) OR add session-based middleware checking

**Related:** `frontend/src/app/admin/page.tsx` line 13–28 directly modifies signals without permission checks

---

### Agent Autonomously Publishes All Signals Without Human Review

**Issue:** `backend/agent.py` publishes signals directly to database as `is_draft=false`. Per CLAUDE.md, the agent "never publishes directly," but implementation shows direct writes.
- Files: `backend/agent.py` (lines ~520–550, signal insertion)
- Impact: Incorrect classifications or misinterpretations reach public-facing UI without editorial verification
- Current design contradiction: CLAUDE.md states "The agent **never publishes directly**. Every signal is a draft until a human approves it" but actual code shows `is_draft=false` writes
- Fix approach: Change agent to set `is_draft=true` for all new signals; depend on admin approval workflow

---

### No Input Validation on Ticker Search

**Issue:** Ticker parameter in company page is case-insensitive but no input sanitization
- Files: `frontend/src/app/company/[ticker]/page.tsx` line 15 (`.ilike()` query)
- Impact: Low risk (Supabase parameterized queries prevent SQL injection), but no bounds checking on ticker length
- Recommendation: Validate ticker length (max 10 chars) and character set (alphanumeric only) before query

---

## Fragile Component Architecture

### TimelineCanvas is 677 Lines — Exceeds Safe Complexity

**Issue:** Single component handles state management, canvas rendering, event handling, and tooltip logic
- Files: `frontend/src/components/company/TimelineCanvas.tsx` (677 lines)
- Why fragile: Complex coordinate math, ResizeObserver integration, drag state, tooltip positioning all mixed
- Safe modification: Extract tooltip state/positioning to separate hook; extract coordinate transforms to separate module; break event handlers into smaller functions
- Test coverage: 99 tests total across frontend, but TimelineCanvas tests are limited to rendering and interaction edges

---

### Date Parsing Lacks Error Handling

**Issue:** Multiple components parse date strings without validation
- Files:
  - `frontend/src/components/company/TimelineCanvas.tsx` line 64–66: `new Date(s.signal_date)` without try/catch
  - `frontend/src/components/company/ObjectiveCard.tsx`: `new Date()` calls on `committed_until` and `committed_from` fields
  - `frontend/src/components/company/ProvedCard.tsx`: Parses dates from objective fields
- Impact: Invalid or null dates in database → NaN values → silent computation failures
- Fix approach: Create `parseSignalDate(dateString: string | null): Date | null` utility in `src/lib/timeline-nodes.ts` with validation; use throughout codebase

---

## Test Coverage Gaps

### No Integration Tests for Supabase Queries

**Issue:** Frontend tests mock data in-memory; no tests verify actual Supabase schema queries work
- Current tests: 99 unit/component tests (Vitest + React Testing Library) in `frontend/src/__tests__/`
- What's missing:
  - Query result shape validation (does Supabase return what TypeScript expects?)
  - RLS policy enforcement (admin operations should fail without auth)
  - Edge cases: empty company, no signals, all buried objectives
- Risk: Deploy to production with schema mismatch or query error
- Fix approach: Add integration test suite using `vitest-mock-supabase` or live test database; test landing page data flow, company page query, admin operations

---

### Agent Testing Minimal — No Mock Anthropic API Tests

**Issue:** `backend/agent.py` (1009 lines) has no test suite
- What's tested: Manual CLI invocation (`python agent.py --company-id <id>`)
- What's not tested:
  - Signal classification logic (does Claude response parsing match schema?)
  - Correlation pass algorithm (does momentum calculation match frontend?)
  - Firecrawl failure gracefully falls back
  - Malformed Claude responses (missing required fields)
  - Token cost estimation accuracy
- Impact: Agent may crash silently or produce invalid signals in production
- Fix approach: Create `backend/tests/test_agent.py` with mocked Anthropic + Supabase clients; test signal generation, correlation logic, error handling

---

### Admin Operations Untested

**Issue:** Signal approval/rejection (`frontend/src/app/admin/page.tsx` lines 22–30) has no tests
- What's missing: Tests for `approveSignal()` and `rejectSignal()` mutation behavior
- Impact: Admin dashboard could silently fail on invalid signal IDs
- Fix approach: Add admin tests to `frontend/src/__tests__/app/admin.test.tsx`

---

## Data Validation Gaps

### Terminal State Inconsistency

**Issue:** Objectives can have both `terminal_state = "buried"` AND `is_in_graveyard = true`, or neither
- Files:
  - Schema: `backend/schema.sql` (both columns exist)
  - Frontend: `frontend/src/app/company/[ticker]/page.tsx` line 51–56 checks both
- Impact: State machine not enforced at database level; multiple valid states create confusion
- Current workaround: Frontend filters with union condition: `terminal_state === "buried" || is_in_graveyard === true`
- Fix approach: Migrate `is_in_graveyard` to derive from `terminal_state` in a database view; drop the redundant column in next migration

---

### Objective Commitment Windows Not Validated

**Issue:** `committed_from` and `committed_until` dates are nullable and not checked for ordering
- Files: `frontend/src/lib/types.ts` lines 77–78
- Impact: UI could display `committed_until` before `committed_from`; badge logic in `ObjectiveCard` assumes valid ranges
- Fix approach: Add database constraint `CHECK(committed_from IS NULL OR committed_until IS NULL OR committed_from <= committed_until)` in schema migration

---

### Momentum Score Bounds Not Enforced at Write

**Issue:** Momentum score can exceed [-4, 4] bounds if agent calculates wrong delta
- Files: `backend/agent.py` (signal delta calculation), `frontend/src/lib/momentum.ts` (scoreToStage clamps to bounds)
- Impact: Frontend clamps silently, hiding agent bugs; clamped values don't match actual score in database
- Fix approach: Add database constraint `CHECK(momentum_score BETWEEN -4 AND 4)` in schema; validate in agent before insert

---

## Missing Features / Incomplete Implementation

### Email Alerts Not Implemented

**Issue:** CLAUDE.md lists "Email alerts when objective crosses ground line" as future but UI has no subscription form
- Impact: Cannot capture email addresses for future marketing
- Fix approach: Add email subscription form to landing page sidebar; store in `subscribers` table (future)

---

### Paywall / Premium Features Not Enforced

**Issue:** Evidence drawer and graveyard records should be gated behind Stripe subscription per CLAUDE.md
- Files: `frontend/src/components/company/EvidenceDrawer.tsx`, `frontend/src/components/company/BuriedCard.tsx`
- Current state: All features publicly accessible
- Fix approach: Create `src/lib/auth.ts` with `isSubscriber()` check; gate EvidenceDrawer and Buried card rendering

---

### Admin Company CRUD Not Implemented

**Issue:** Admin page shows signal management but not company management
- Files: `frontend/src/app/admin/page.tsx` (no company add/edit forms)
- Impact: Adding new companies requires manual SQL or agent intake CLI
- Fix approach: Add CompanyForm component to admin page; allow add/edit/delete with validation

---

### Fiscal Year End Month Not Surfaced in Admin UI

**Issue:** Companies have `fiscal_year_end_month` field (used for timeline markers), but no UI to set it
- Files: `frontend/src/app/admin/page.tsx` (no fiscal_year form input)
- Impact: All companies default to December; timeline markers incorrect for non-Dec fiscal years
- Fix approach: Add number input (1–12) to company form in admin page

---

## Type Safety & API Contract Issues

### CompanySummary Type Not Aligned with Schema

**Issue:** `CompanySummary` type in `types.ts` may not match actual `v_company_summary` view columns
- Files: `frontend/src/lib/types.ts` (define CompanySummary), `backend/schema.sql` (define view)
- Impact: Frontend assumes view returns certain fields; schema change breaks without TypeScript error
- Fix approach: Generate TypeScript types from Supabase schema using `supabase gen types` command; commit generated types

---

### Signal Classification Enum Drift

**Issue:** `SignalClassification` union in `types.ts` may diverge from `signal_classification` enum in schema
- Files:
  - `frontend/src/lib/types.ts` line 8–11
  - `backend/schema.sql` (signal_classification enum definition)
- Risk: Agent sends classification not in union; frontend type checking passes but Supabase rejects insert
- Fix approach: Add pre-commit hook to verify enum values match; or auto-generate types from schema

---

### AgentRun Type Incomplete

**Issue:** `AgentRun` interface in `types.ts` missing fields present in schema
- Files: `frontend/src/lib/types.ts` lines 99–106 (partial definition)
- Impact: Admin page can't display all run metadata (e.g., `error_message`, `run_summary`, `raw_log`)
- Fix approach: Complete AgentRun type definition; add error_message display to admin table

---

## Performance & Scaling Concerns

### Unbound Signal Queries

**Issue:** Landing page and company pages fetch all signals without pagination
- Files:
  - `frontend/src/app/page.tsx` line 27: `.limit(8)` but no cursor-based pagination
  - `frontend/src/app/company/[ticker]/page.tsx` line 29–35: No limit on signals fetch
- Impact: Company with 10,000+ signals loads entire history into memory
- Scaling: At 100 companies × 50 signals/company = 5000 rows per page load
- Fix approach: Implement cursor-based pagination for signals; add `.limit(100)` to company signals query; lazy-load older signals on scroll

---

### TimelineCanvas Rerenders on Every Signal Change

**Issue:** `useMemo` on `signalsByObjective` (line 93) recalculates when signals array changes, but no optimization for partial updates
- Files: `frontend/src/components/company/TimelineCanvas.tsx` line 93–101
- Impact: Single new signal approval → full canvas rerender → timeline nodes recalculate
- Fix approach: Track signal addition/removal separately; use `useTransition` for deferred updates

---

### No Database Indexes on Frequently Queried Columns

**Issue:** Schema defines tables but indexes not documented
- Files: `backend/schema.sql`
- Typical queries: `company_id`, `signal_date`, `is_draft`
- Risk: O(N) full table scans as data grows
- Fix approach: Add indexes: `CREATE INDEX ON signals(company_id, is_draft) WHERE NOT is_draft;` for landing page query

---

## Error Handling Gaps

### Silent Failures on Supabase Errors

**Issue:** Frontend catches Supabase errors but only logs to console
- Files:
  - `frontend/src/app/page.tsx` line 14–16: Error logged but user sees empty state
  - `frontend/src/app/company/[ticker]/page.tsx`: No error handling; notFound() on null but not on query error
- Impact: User can't distinguish "no data" from "database is down"
- Fix approach: Use Toast component to show user-facing error messages; add error boundary

---

### Agent Doesn't Retry Failed Requests

**Issue:** If Claude API call fails mid-correlation, agent exits without partial commit
- Files: `backend/agent.py` (main loop, no retry logic)
- Impact: Hour-long research run is wasted on transient API error
- Fix approach: Add exponential backoff retry logic for API calls; implement partial commit for signals already classified

---

### Missing Error Message Context

**Issue:** Admin page shows `run.status` but not `run.error_message` when status='failed'
- Files: `frontend/src/app/admin/page.tsx` line 75–81 (run table, no error_message column)
- Impact: Admin can't debug why agent run failed
- Fix approach: Add error_message display in admin run details

---

## Documentation & Maintainability

### Agent Prompt Not Documented

**Issue:** Claude prompt for signal classification is embedded in `backend/agent.py` but no markdown specification
- Files: `backend/agent.py` (prompt string, ~50 lines)
- Impact: Hard to audit what agent is instructed to do; changes not tracked in git history cleanly
- Fix approach: Extract prompt to `backend/prompts/signal_classification.md`; load from file in agent

---

### No Runbook for Production Troubleshooting

**Issue:** `docs/setup.md` covers initial setup but not operational troubleshooting
- What's missing:
  - How to debug slow timeline renders
  - How to investigate failed agent run
  - How to manually approve signal if admin UI breaks
  - How to clear draft signals if corrupt
- Fix approach: Create `docs/RUNBOOK.md` with troubleshooting procedures

---

## Dependency Concerns

### @panzoom/panzoom Not Listed

**Issue:** TimelineCanvas uses `@panzoom/panzoom` but not in `frontend/package.json`
- Files: `frontend/src/components/company/TimelineCanvas.tsx` (panzoom usage likely)
- Impact: Build would fail; also unclear if library is pinned or breaks on minor version update
- Fix approach: Verify `package.json` has `@panzoom/panzoom` with pinned version; add to docs

---

### No TypeScript Strict Mode Enforcement

**Issue:** `frontend/tsconfig.json` may not have `strict: true`
- Impact: Type safety gaps (implicit any, null checks optional)
- Fix approach: Enable strict mode; fix type errors; add to linter pre-commit

---

### Python Dependencies Not Pinned

**Issue:** `docs/setup.md` lists `pip install anthropic supabase python-dotenv schedule` without versions
- Impact: Agent behavior may differ across machines running different package versions
- Fix approach: Create `backend/requirements.txt` with pinned versions; use `pip install -r requirements.txt`

---

## Accessibility & UX Issues

### Timeline Canvas Not Keyboard Accessible

**Issue:** TimelineCanvas uses mouse drag for panning; no keyboard navigation
- Files: `frontend/src/components/company/TimelineCanvas.tsx` (event handlers for mouse only)
- Impact: Keyboard-only users can't navigate timeline
- Fix approach: Add arrow key handlers for pan; add ARIA labels to legend checkboxes

---

### Momentum Stage Emojis Not Described

**Issue:** Emoji nodes on timeline have no alt text or fallback description
- Files: `frontend/src/components/company/TimelineNode.tsx` (renders emoji)
- Impact: Screen reader users see "🌙" without context
- Fix approach: Add `aria-label={stageLabel}` to emoji containers

---

## Risk Areas

### Agent Silent Achievements Detection

**Issue:** Agent detects "silent achievements" by absence of recent signals; threshold not documented
- Files: `backend/agent.py` (correlation pass logic)
- Risk: False positives (e.g., investor reporting cycle gap) marked as achievement
- Fix approach: Document detection algorithm in prompt; add confidence score to achievement signals; require human review

---

### Graveyard Exit Classification Ambiguity

**Issue:** Schema defines 4 exit manners (silent, phased, morphed, transparent); agent chooses based on signal pattern but rules not explicit
- Files: `backend/agent.py` (exit manner assignment logic)
- Impact: Two humans reviewing same exit would classify differently
- Fix approach: Document exit manner decision tree in `brand/brand-language.html`; add explicit rubric to agent prompt

---

### Fiscal Year End Month Affects Momentum Calculation

**Issue:** Agent uses `fiscal_year_end_month` for `year_end_review` classification, but timezone-aware date parsing not confirmed
- Files: `backend/agent.py` (year_end_review signal generation)
- Risk: Companies in different timezones could have FY end classified off-by-one day
- Fix approach: Normalize all date parsing to UTC; document in agent

---

## Technical Debt Summary

| Area | Severity | Impact | Effort |
|------|----------|--------|--------|
| Admin auth missing | **Critical** | Public access to data mutation | Medium |
| Agent publishes without review | **Critical** | Incorrect data reaches production | Medium |
| TimelineCanvas complexity | **High** | Maintenance burden, hidden bugs | High |
| Date parsing unsafe | **High** | Silent failures on edge cases | Low |
| Supabase integration tests missing | **High** | Schema/API contract drift | Medium |
| Unbound signal queries | **High** | Scaling bottleneck at 10k+ signals | Medium |
| No input validation | **Medium** | Low SQL injection risk, but poor UX | Low |
| Type generation not automated | **Medium** | Enum/field drift risk | Low |
| Error handling silent | **Medium** | Undebuggable production issues | Low |
| No email/premium features | **Low** | Blocks revenue stream | High |

---

*Concerns audit: 2026-03-26*
