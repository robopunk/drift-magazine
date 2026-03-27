# Phase 3: Production & Monetization Gate - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 3 delivers production readiness for the Firecrawl-enhanced Drift agent. Scope covers:
1. Fixing the draft-only enforcement bug in agent.py
2. Supabase Auth protecting the /admin route with approve/reject UI
3. GitHub Actions workflow for bi-weekly agent scheduling
4. Full operations runbook (setup + troubleshooting) at docs/RUNBOOK.md
5. Ad slot placeholders on landing page and company pages (strategic, non-intrusive)
6. Documented monetization gate criteria for scaling to additional companies

This phase does NOT include: real ad network integration, new company intake, paywall/Stripe, email alerts, or retroactive signal reprocessing.

</domain>

<decisions>
## Implementation Decisions

### Draft-Only Enforcement
- **D-01:** Fix `agent.py` to always set `is_draft=true` on all new signal inserts. No exceptions.
- **D-02:** The fix is in agent code only (no DB trigger constraint). Simple, targeted change.
- **D-03:** Admin UI (`/admin`) gets functional approve/reject buttons alongside the existing CLI workflow.

### Admin Authentication
- **D-04:** `/admin` route protected via Supabase Auth (email/password login). RLS policies on signals table enforce write access for authenticated admin users only.
- **D-05:** Both CLI (`python agent.py --approve`) and admin UI support signal approval. They are complementary, not exclusive.

### Deployment — Agent Host
- **D-06:** Agent moves to GitHub Actions with a scheduled workflow (bi-weekly cron). Secrets (`ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_KEY`, `FIRECRAWL_API_KEY`) stored in GitHub repository secrets.
- **D-07:** Failure alerting via GitHub's built-in email notification on workflow failure. Agent run status also written to `agent_runs` table as always.
- **D-08:** Manual trigger via `workflow_dispatch` in the GitHub Actions YAML so Stefano can run on demand.

### Runbook
- **D-09:** Runbook lives at `docs/RUNBOOK.md`.
- **D-10:** Scope is a full ops guide: GitHub Actions setup (day-1), secrets configuration, Firecrawl troubleshooting (rate limits, paywalled pages, fallback behavior), agent failure recovery, manual signal approval steps, log inspection, Supabase query basics.
- **D-11:** GitHub Actions setup instructions are included in the runbook (not delegated to docs/setup.md). One doc covers all operational needs.

### Ad Slot Placeholders
- **D-12:** Add placeholder ad slots in 3 locations: (a) landing page below the company grid, (b) company page sidebar alongside objective cards, (c) below the timeline canvas on company pages.
- **D-13:** Additional placements at Claude's discretion — identify any other high-visibility, non-intrusive positions based on existing layout.
- **D-14:** Placeholders rendered as styled empty containers with a subtle border and an "Advertisement" label. They look intentional and professional, not broken.
- **D-15:** Ad slots are built as a reusable `<AdSlot>` component (already exists in `frontend/src/components/landing/AdSlot.tsx` — verify and extend if needed).

### Monetization Gate (Scale Criteria)
- **D-16:** The gate to adding company #2 is **public launch readiness**, not a revenue milestone.
- **D-17:** Conditions for scaling:
  1. The Drift page is mature enough to show to the public (editorial quality, design polish, no obvious rough edges)
  2. Ad slot placeholders are in place and look professional
  3. At least 2 consecutive clean bi-weekly agent runs on Sandoz with no critical errors
  4. Runbook complete and reviewed
- **D-18:** Scaling decision is made by Stefano. No automated trigger.

### Claude's Discretion
- Test coverage strategy for the Supabase Auth implementation (unit vs integration)
- Exact GitHub Actions YAML structure (job names, Python version, dependency caching)
- RLS policy details for admin write access (which tables, which operations)
- Whether to update docs/setup.md to reference RUNBOOK.md

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Standards
- `.planning/REQUIREMENTS.md` — NFR3 (reliability), NFR4 (security/API key handling), NFR5 (maintainability/runbook)
- `.planning/ROADMAP.md` — Phase 3 deliverables and success criteria
- `CLAUDE.md` — Brand principles, editorial standards, draft-only workflow requirement

### Codebase
- `.planning/codebase/CONCERNS.md` — Critical: agent publishes is_draft=false (fix target), admin auth missing, agent testing minimal
- `.planning/codebase/INTEGRATIONS.md` — Current deployment setup, Supabase auth state, GitHub Actions / Vercel hosting
- `.planning/codebase/TESTING.md` — Frontend test patterns (Vitest + RTL), mock patterns

### Existing Implementation
- `backend/agent.py` — Signal insertion logic (is_draft fix target, ~lines 520–550)
- `frontend/src/app/admin/page.tsx` — Admin UI (approve/reject buttons target, auth gate target)
- `frontend/src/components/landing/AdSlot.tsx` — Existing ad slot component (verify and extend)
- `docs/setup.md` — Existing setup guide (runbook complements this)

### Design System
- `docs/specs/2026-03-19-drift-v2-design.md` — Canonical v2 design tokens, component patterns (for ad slot styling)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AdSlot` component (`frontend/src/components/landing/AdSlot.tsx`): already exists — verify its current state before creating new slots
- `frontend/src/lib/supabase.ts`: Supabase client wrapper — extend for auth client
- `backend/agent.py` `get_clients()` function: initialization pattern for new secrets

### Established Patterns
- All agent inserts use `supabase.table(...).insert({...}).execute()` — is_draft fix is a one-line change per insert call
- Admin page uses direct Supabase calls without auth guards — add Supabase Auth middleware at route level
- Tailwind CSS variables for all colors — ad slot placeholders must use CSS variables, never hardcoded hex

### Integration Points
- GitHub Actions needs: `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `FIRECRAWL_API_KEY` as repository secrets
- Supabase Auth requires: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` already in frontend env — auth client uses same vars
- Ad slots integrate into existing page layouts: `frontend/src/app/page.tsx` (landing) and `frontend/src/app/company/[ticker]/page.tsx` (company)

</code_context>

<specifics>
## Specific Ideas

- Ad slots should be **non-intrusive but strategically placed** — Stefano's priority is that they look intentional and attractive to potential advertisers when the page goes public, not that they generate revenue immediately
- The public launch readiness gate is qualitative (Stefano's judgment), not a hard metric — document it as such in the runbook
- GitHub Actions `workflow_dispatch` trigger is important: Stefano needs to be able to run the agent manually without SSH access

</specifics>

<deferred>
## Deferred Ideas

- Real ad network integration (Carbon Ads / EthicalAds) — after public launch
- Paywall / Stripe subscription gate — future phase
- Email alerts on objective crossing ground line — future phase
- New company intake (company #2) — after monetization gate conditions met
- Frontend Supabase integration tests — noted as a gap in CONCERNS.md but not in Phase 3 scope

</deferred>

---

*Phase: 03-production-monetization-gate*
*Context gathered: 2026-03-27*
