# Drift — Roadmap

## Milestones

- ✅ **v4.0 Research Enhancement** — Phases 1–3 (shipped 2026-03-27) → [archive](milestones/v4.0-ROADMAP.md)
- 🚧 **v4.1 Production Readiness** — Phases 4–6 (in progress)

## Phases

<details>
<summary>✅ v4.0 Research Enhancement (Phases 1–3) — SHIPPED 2026-03-27</summary>

- [x] Phase 1: Firecrawl Integration & Testing (2/2 plans) — completed 2026-03-26
- [x] Phase 2: Quality Measurement & Page Maturity (3/3 plans) — completed 2026-03-26
- [x] Phase 3: Production & Monetization Gate (3/3 plans) — completed 2026-03-27

Full details: [milestones/v4.0-ROADMAP.md](milestones/v4.0-ROADMAP.md)

</details>

---

### 🚧 v4.1 Production Readiness (In Progress)

**Milestone Goal:** Verify live Supabase connection end-to-end, deploy to Vercel, activate GitHub Actions automation, and clear monetization gate condition #3 (2 clean agent runs). Unblocks company #2 intake.

- [x] **Phase 4: Environment & Authentication** — Configure all env vars, verify auth gate works in production (completed 2026-03-27)
- [x] **Phase 5: Supabase Verification & Deployment** — Confirm live DB read/write, deploy frontend to Vercel (completed 2026-03-28)
- [ ] **Phase 6: Automation & End-to-End Validation** — Activate GitHub Actions scheduling, run 2 clean agent cycles, verify full data flow

## Phase Details

### Phase 4: Environment & Authentication
**Goal**: All environment variables are configured and the admin auth gate works in production
**Depends on**: Phase 3 (v4.0 complete)
**Requirements**: ENV-01, ENV-02, ENV-03, AUTH-01, AUTH-02, AUTH-03
**Success Criteria** (what must be TRUE):
  1. Backend agent starts without a missing-env-var error (ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY, FIRECRAWL_API_KEY all present)
  2. Frontend application loads without Supabase configuration errors (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY set)
  3. GitHub repository has all 4 backend secrets stored and accessible to Actions workflows
  4. Admin user can log in to `/admin` with email and password on the production deployment
  5. An unauthenticated request to `/admin` is blocked and returns a 403 or redirect
**Plans**: TBD

### Phase 5: Supabase Verification & Deployment
**Goal**: Live Supabase data flows correctly through the backend and frontend, and the site is deployed at a production URL
**Depends on**: Phase 4
**Requirements**: DB-01, DB-02, DB-03, DB-04, DEPLOY-01, DEPLOY-02, DEPLOY-03
**Success Criteria** (what must be TRUE):
  1. Running `python backend/agent.py` connects to live Supabase without authentication errors
  2. Agent can write a draft signal to the signals table and read objectives from the live database
  3. RLS is enforced: the anon key cannot write to signals; only the service key can
  4. The deployed Vercel site loads company and objective data from live Supabase (not mock/static data)
  5. All pages (landing, company/sandoz, about, admin) render without runtime errors on the production URL
**Plans**: TBD
**UI hint**: yes

### Phase 6: Automation & End-to-End Validation
**Goal**: GitHub Actions runs the agent autonomously on schedule, two clean cycles complete, and signal data flows end-to-end from agent to the live site
**Depends on**: Phase 5
**Requirements**: SCHED-01, SCHED-02, SCHED-03, OPS-01, OPS-02, E2E-01, E2E-02, E2E-03
**Success Criteria** (what must be TRUE):
  1. GitHub Actions workflow authenticates and runs `agent.py` to completion using repository secrets
  2. First agent run completes without errors and produces at least one draft signal in Supabase
  3. Second agent run completes without errors (consistent, reproducible execution — monetization gate condition #3 cleared)
  4. Operator can view run logs, step output, and pass/fail status in the GitHub Actions UI
  5. A failure in the workflow triggers an email notification to the repository owner
  6. Draft signals created by the agent appear on the live Vercel frontend after approval (confidence badges correct, Sandoz page shows 6 objectives and 51+ signals)
**Plans:** 3 plans
Plans:
- [x] 06-01-PLAN.md — First workflow_dispatch run + verify draft signals + operator monitoring (SCHED-01, SCHED-02, OPS-01 verified; 22 new signals; run 23685921199)
- [ ] 06-02-PLAN.md — Second workflow_dispatch run + OPS-02 email notification documentation
- [ ] 06-03-PLAN.md — Approve all draft signals + E2E frontend verification + human check

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Firecrawl Integration & Testing | v4.0 | 2/2 | Complete | 2026-03-26 |
| 2. Quality Measurement & Page Maturity | v4.0 | 3/3 | Complete | 2026-03-26 |
| 3. Production & Monetization Gate | v4.0 | 3/3 | Complete | 2026-03-27 |
| 4. Environment & Authentication | v4.1 | 3/3 | Complete   | 2026-03-27 |
| 5. Supabase Verification & Deployment | v4.1 | 2/2 | Complete   | 2026-03-28 |
| 6. Automation & End-to-End Validation | v4.1 | 1/3 | Executing | - |
