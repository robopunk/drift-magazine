# Phase 5: Supabase Verification & Deployment - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 5 delivers a fully connected, publicly accessible Drift site. Scope covers:
1. Verifying the backend Python agent connects to live Supabase and can read/write (DB-01, DB-02)
2. Verifying the frontend reads live Supabase data (DB-03)
3. Verifying RLS enforcement — anon key cannot write; only service key can (DB-04)
4. Deploying the frontend to Vercel at a production URL (DEPLOY-01, DEPLOY-02, DEPLOY-03)

This phase does NOT include: custom domain setup, Phase 6 automation/E2E validation, new tests beyond the RLS pytest case, or any new features.

</domain>

<decisions>
## Implementation Decisions

### Verification Approach

- **D-01:** DB-01 (agent connects) — run `python agent.py --review` as the first check. This is read-only: connects to Supabase and lists objectives. Minimal risk, no data written.
- **D-02:** DB-02 (agent can write signals) — run `python agent.py --company-id <sandoz-id>` (a real research pass). This writes draft signals to the live DB. Confirms the full write path works.
- **D-03:** DB-03 (frontend reads live data) — dev server smoke test: run `next dev` locally with real env vars, open `localhost:3000/company/sandoz`, confirm all 6 objectives and graveyard data are visible. No new code needed.
- **D-04:** DB-04 (RLS enforcement) — add one new pytest test case to the existing backend suite. The test attempts a signal insert using the anon key and asserts a 403/error response. This is the only new automated test in this phase.

### Vercel Project Setup

- **D-05:** The Vercel project is already linked (Vercel CLI was run in Phase 4; root `.env.local` was pulled from the Vercel project). Check for `.vercel/` directory to confirm before re-linking.
- **D-06:** Frontend root directory in Vercel is `frontend/`. This must be set in Vercel project settings (or confirmed already set from the existing link).
- **D-07:** Production environment variables are added via Vercel CLI: `vercel env add NEXT_PUBLIC_SUPABASE_URL` and `vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY`. Values sourced from `frontend/.env.local`.
- **D-08:** Target URL is the auto-generated Vercel subdomain (`*.vercel.app`). Custom domain is deferred to a future phase.

### Verification Order

- **D-09:** Local verification before deployment — verify DB-01 through DB-04 against live Supabase locally first, then deploy to Vercel, then confirm the production URL loads correctly. This order catches DB issues before they surface on the production URL.
- **D-10:** Hard-blocker policy — if any local verification step fails (missing env var, schema mismatch, RLS misconfiguration), stop and fix before proceeding to the next step. Do not deploy with known failures.

### Success Evidence

- **D-11:** Phase completion is documented in a GSD `VERIFICATION.md` in the phase directory. It maps each of the 5 ROADMAP.md success criteria to observed evidence (command output, URL, pass/fail).
- **D-12:** One new pytest test is written for DB-04 (RLS enforcement). All other verification is manual.

### Claude's Discretion

- The exact pytest structure for the RLS test (fixture vs standalone, whether to reuse existing conftest)
- Whether `backend/tests/` exists and the test file naming convention
- Whether to also check `frontend/.vercel/` vs `root/.vercel/` for the existing Vercel link
- Exact Vercel CLI commands for checking project link status before re-linking

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements
- `.planning/REQUIREMENTS.md` — DB-01 through DB-04, DEPLOY-01 through DEPLOY-03 (the phase requirement IDs)
- `.planning/ROADMAP.md` — Phase 5 success criteria (5 items, including production URL render check)

### Backend
- `backend/agent.py` — Agent CLI entry point (`--review`, `--company-id` flags); connection/auth logic
- `backend/schema.sql` — RLS policies defined here; reference for anon vs service role permissions
- `backend/.env.local` — Backend secrets (gitignored; already scaffolded in Phase 4)

### Frontend
- `frontend/src/lib/supabase.ts` — Supabase client (has `?? "placeholder"` fallbacks — verify these resolve to real values with env vars loaded)
- `frontend/.env.local` — Frontend env vars (real Supabase credentials from Phase 4)

### Operations
- `docs/RUNBOOK.md` — Section 9 (production deployment checklist), Section 8 (Supabase query basics)
- `.planning/phases/04-environment-authentication/04-01-SUMMARY.md` — Phase 4 outcomes; confirms which keys are real vs placeholder

### Project Standards
- `CLAUDE.md` — Brand principles; draft-only workflow (is_draft=true on all agent inserts)
- `.planning/phases/03-production-monetization-gate/03-CONTEXT.md` — D-06 (agent on GitHub Actions, secrets in repo); D-04 (Supabase Auth on /admin)

</canonical_refs>

<specifics>
## Specific Ideas

- Supabase project URL: `myaxttyhhzpdugikdmue.supabase.co` (from Phase 4 — pre-filled in backend/.env.local)
- Phase 4 noted that `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_KEY`, and `FIRECRAWL_API_KEY` in `backend/.env.local` may still be placeholder values — verify these are real before running agent
- The `--review` command (`python agent.py --review`) is the safest first connection check; it reads objectives and lists draft signals without making any writes
- Vercel root directory for this project is `frontend/` — must be confirmed/set before `vercel --prod` deploy
- The frontend `supabase.ts` has fallback strings (`"https://placeholder.supabase.co"`) — these are fine as development defaults but must not appear in production logs

</specifics>

<deferred>
## Deferred Ideas

- Custom domain (drift.io, ondrift.com) — after production Vercel URL is confirmed working
- Phase 6 automation and E2E validation (SCHED-01 through E2E-03) — next phase
- Additional companies intake — after monetization gate clears (requires 2 clean agent runs)

</deferred>

---

*Phase: 05-supabase-verification-deployment*
*Context gathered: 2026-03-27 via /gsd:discuss-phase*
