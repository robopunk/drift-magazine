# Phase 3: Production & Monetization Gate — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-27
**Phase:** 03-production-monetization-gate
**Areas discussed:** Draft-only enforcement, Deployment strategy, Runbook scope & format, Monetization gate criteria

---

## Draft-only enforcement

| Option | Description | Selected |
|--------|-------------|----------|
| Fix in agent code | Change agent.py to always set is_draft=true | ✓ |
| Fix in agent + DB constraint | Agent sets is_draft=true AND Postgres trigger rejects false on inserts | |
| You decide | Claude picks safest approach | |

**User's choice:** Fix in agent code only
**Notes:** CONCERNS.md flagged this as critical — agent currently writes is_draft=false contradicting the editorial design principle.

---

## Admin approval workflow

| Option | Description | Selected |
|--------|-------------|----------|
| CLI only | Keep approval via python agent.py --approve, admin UI read-only | |
| Both CLI and admin UI | Admin UI gets approve/reject buttons | ✓ |

**User's choice:** Both CLI and admin UI

---

## Admin authentication

| Option | Description | Selected |
|--------|-------------|----------|
| Simple password gate | ADMIN_PASSWORD env var, checked via middleware | |
| Supabase Auth | Full auth with email/password login, RLS policies | ✓ |
| You decide | Claude picks for single-operator model | |

**User's choice:** Supabase Auth
**Notes:** Production-grade; required given admin UI will have write access to signals.

---

## Deployment strategy

| Option | Description | Selected |
|--------|-------------|----------|
| GitHub Actions | Scheduled workflow, free, logs in Actions tab, no server | ✓ |
| Local cron | Keep current machine-based cron | |
| Cloud Run / Railway | Serverless container, small cost | |
| You decide | Claude picks for €0 budget | |

**User's choice:** GitHub Actions
**Notes:** workflow_dispatch trigger also required for manual on-demand runs.

---

## Failure monitoring

| Option | Description | Selected |
|--------|-------------|----------|
| GitHub Actions + email | Default GitHub failure email + agent_runs table logging | ✓ |
| Supabase webhook alert | Real-time webhook to Slack/email on failed status | |
| You decide | Claude picks simplest reliable option | |

**User's choice:** GitHub Actions + email

---

## Runbook scope

| Option | Description | Selected |
|--------|-------------|----------|
| Firecrawl troubleshooting only | Rate limits, retry, fallback, paywalled pages | |
| Full ops guide | Firecrawl + agent failure recovery + manual approval + log inspection + Supabase | ✓ |
| You decide | Claude covers what's necessary for solo operator | |

**User's choice:** Full ops guide

---

## Runbook location

| Option | Description | Selected |
|--------|-------------|----------|
| docs/RUNBOOK.md | Alongside docs/setup.md | ✓ |
| docs/operations/ folder | Separate operations directory | |
| You decide | Claude picks simplest location | |

**User's choice:** docs/RUNBOOK.md

---

## Runbook includes GitHub Actions setup

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, include it | Day-1 setup + ongoing troubleshooting in one doc | ✓ |
| No, ops-only | Setup stays in docs/setup.md | |
| You decide | Claude decides | |

**User's choice:** Yes, include it

---

## Monetization gate criteria

| Option | Description | Selected |
|--------|-------------|----------|
| Ads live + 2 clean runs | Carbon/EthicalAds integrated AND 2 consecutive clean runs | |
| Ads generating revenue | Ads live AND first payout received | |
| You define the criteria | User specifies exact gate | ✓ |

**User's choice:** User defined
**User's criteria (verbatim):** "Ads shall only be added once we have the page matured to the level we can go public with. Right now we only need placeholders for ads in a strategic good place on the page so that those are not intrusive but still are there and attractive from a monetization perspective."

**Interpretation captured in CONTEXT.md:**
- Gate = public launch readiness (qualitative, Stefano's judgment)
- Phase 3 scope includes: ad slot placeholders in strategic locations (landing page below grid, company page sidebar, below timeline canvas)
- Placeholders look intentional and professional — attractive to advertisers when page goes public
- Scaling to company #2 deferred until public launch conditions met

---

## Claude's Discretion

- Test coverage strategy for Supabase Auth implementation
- Exact GitHub Actions YAML structure
- RLS policy details for admin write access
- Whether to cross-reference docs/setup.md from RUNBOOK.md

## Deferred Ideas

- Real ad network integration — after public launch
- Paywall / Stripe — future phase
- Email alerts on objective ground-line crossing — future phase
- New company intake — after monetization gate met
