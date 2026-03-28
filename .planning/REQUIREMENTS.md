# v4.1 Production Readiness — Requirements

**Milestone:** v4.1 | **Version:** 1.0 | **Last Updated:** 2026-03-27

---

## Active Requirements

### Environment Setup

- [x] **ENV-01**: All backend env vars configured (ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY, FIRECRAWL_API_KEY)
- [x] **ENV-02**: Frontend env vars set (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
- [x] **ENV-03**: GitHub Secrets configured for CI/CD (same 4 backend vars)

### Supabase Verification

- [x] **DB-01**: Backend agent can connect to live Supabase and authenticate
- [x] **DB-02**: Agent can write signals to signals table and read objectives
- [x] **DB-03**: Frontend can fetch companies, objectives, and signals from live DB
- [x] **DB-04**: RLS policies enforced (only service key can write, anon can read)

### Frontend Deployment

- [x] **DEPLOY-01**: Frontend deployed to Vercel with production env vars
- [x] **DEPLOY-02**: Deployed site is accessible at production URL
- [x] **DEPLOY-03**: All pages load and render data from live Supabase

### Authentication

- [x] **AUTH-01**: Supabase Auth gate on `/admin` works in production
- [x] **AUTH-02**: Admin user can log in with email/password
- [x] **AUTH-03**: Unauthenticated users see 403 on `/admin`

### Automation & Operations

- [x] **SCHED-01**: GitHub Actions workflow can authenticate and run agent
- [x] **SCHED-02**: Agent completes first run without errors (signals drafted)
- [x] **SCHED-03**: Agent completes second run without errors (consistent execution)
- [x] **OPS-01**: Operator can monitor agent runs via GitHub Actions UI
- [x] **OPS-02**: Failure alerts work (email notification on workflow failure)

### End-to-End Validation

- [ ] **E2E-01**: Signal flows from agent → Supabase → frontend display
- [ ] **E2E-02**: Confidence badges display correctly on live site
- [ ] **E2E-03**: Company page shows all Sandoz data (6 objectives, 51+ signals)

---

## Future Requirements

(Deferred to v4.2+ — out of scope for v4.1)

- **Payment Integration** — Stripe subscription gating for premium features
- **Mobile Responsive Polish** — Enhanced mobile UX and breakpoints
- **Email Alerts** — Subscriber digest when objectives cross ground line
- **API / Data Export** — CSV/JSON export for premium subscribers
- **Additional Companies** — Roche, Volkswagen, BP (after v4.1 gate clears)

---

## Out of Scope

None specified for v4.1.

---

## Traceability

| REQ-ID | Phase | Plan |
|--------|-------|------|
| ENV-01 | Phase 4 | TBD |
| ENV-02 | Phase 4 | TBD |
| ENV-03 | Phase 4 | TBD |
| AUTH-01 | Phase 4 | TBD |
| AUTH-02 | Phase 4 | TBD |
| AUTH-03 | Phase 4 | TBD |
| DB-01 | Phase 5 | TBD |
| DB-02 | Phase 5 | TBD |
| DB-03 | Phase 5 | TBD |
| DB-04 | Phase 5 | TBD |
| DEPLOY-01 | Phase 5 | TBD |
| DEPLOY-02 | Phase 5 | TBD |
| DEPLOY-03 | Phase 5 | TBD |
| SCHED-01 | Phase 6 | 06-01 |
| SCHED-02 | Phase 6 | 06-01 |
| SCHED-03 | Phase 6 | 06-02 |
| OPS-01 | Phase 6 | 06-01 |
| OPS-02 | Phase 6 | 06-02 |
| E2E-01 | Phase 6 | TBD |
| E2E-02 | Phase 6 | TBD |
| E2E-03 | Phase 6 | TBD |

---

## Success Criteria

**v4.1 is complete when:**
1. All 21 requirements are satisfied ✓
2. 2 clean agent runs complete without errors ✓
3. Live Supabase data flows end-to-end ✓
4. Frontend deployed to Vercel and accessible ✓
5. GitHub Actions automation activated ✓
6. Monetization gate condition #3 cleared (agent stability verified) ✓
7. Ready for company #2 intake ✓
