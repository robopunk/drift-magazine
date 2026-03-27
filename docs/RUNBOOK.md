# Drift Operations Runbook

**Last updated:** 2026-03-27
**Companion document:** `docs/setup.md` (initial project setup)

---

## 1. Overview

This is the complete operational reference for running, monitoring, and troubleshooting the Drift research agent in production.

- **What:** Day-to-day operations guide — agent runs, signal review, failure recovery, troubleshooting
- **Who:** Stefano (sole operator)
- **Scope:** Everything needed to operate Drift once it is set up. Initial project setup (Supabase schema, frontend env, Python deps) is in `docs/setup.md`.

The agent runs bi-weekly via **GitHub Actions**. All signals are drafts until approved by a human. No signal is ever published automatically.

---

## 2. GitHub Actions Setup (Day 1)

This section covers one-time setup required before the first automated agent run.

### Step 1: Add repository secrets

Navigate to: **Repository → Settings → Secrets and variables → Actions → New repository secret**

Add these four secrets:

| Secret name | Where to get it |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic Console → API Keys → Create new key |
| `SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL |
| `SUPABASE_SERVICE_KEY` | Supabase Dashboard → Settings → API → `service_role` key (NOT the `anon` key) |
| `FIRECRAWL_API_KEY` | Firecrawl Dashboard → API Keys (optional — agent degrades gracefully without it) |

**Security note:** The `service_role` key has full database access and bypasses RLS. Never expose it in frontend code or commit it to the repo.

### Step 2: Verify the workflow file

Confirm this file exists in the repository:

```
.github/workflows/agent-run.yml
```

If it is missing, the workflow will not run. The file is committed to the repository as of Phase 3 Plan 01.

### Step 3: Enable failure email notifications

GitHub Actions sends failure notifications by default to the repository owner. To confirm:

- **GitHub → Settings → Notifications → Actions** — verify "Send notifications for failed workflow runs" is enabled.

Email is sent to the account email when a workflow run fails. No external alerting service is needed.

### Schedule

The workflow runs automatically on the **1st and 15th of each month at 06:00 UTC** (cron: `0 6 1,15 * *`).

---

## 2a. GitHub Secrets — Reference & Rotation Policy

### What secrets are stored

The agent workflow reads 4 secrets from GitHub Actions. All are encrypted at rest and automatically masked in workflow logs (never appears as plaintext).

| Secret name | Purpose | Where to retrieve |
|---|---|---|
| `ANTHROPIC_API_KEY` | Anthropic Claude API authentication | [console.anthropic.com](https://console.anthropic.com) → API Keys |
| `SUPABASE_URL` | Supabase project endpoint | Supabase Dashboard → Settings → API → Project URL |
| `SUPABASE_SERVICE_KEY` | Full DB access, bypasses RLS | Supabase Dashboard → Settings → API → `service_role` key |
| `FIRECRAWL_API_KEY` | Structured web scraping | [firecrawl.dev](https://www.firecrawl.dev) → API Keys (optional) |

**Warning:** `SUPABASE_SERVICE_KEY` bypasses Row Level Security. Never use it in frontend code or expose it publicly.

### How to rotate / update a secret

1. Go to **Repository → Settings → Secrets and variables → Actions**
2. Click the secret name you want to update
3. Paste the new value in the "Value" field
4. Click **"Update secret"**

The updated value is available immediately to any new workflow runs. In-progress runs are not affected.

### How to add a new secret

1. Go to **Repository → Settings → Secrets and variables → Actions**
2. Click **"New repository secret"**
3. Enter the exact secret name (case-sensitive) and value
4. Click **"Add secret"**

### Precedence

GitHub secrets override local `.env.local` values when running in GitHub Actions. Local `.env.local` is used for local development only and is never committed to the repository.

### Security properties

- Secrets are encrypted at rest using GitHub's secure storage
- Each secret is accessible only to workflows in this repository
- Secret values are masked in all workflow log output
- Committing changes to workflow YAML that reference secrets does NOT expose the secret values
- To revoke a secret: delete it from the Secrets UI — it will no longer be available to new workflow runs

### Current status (as of Phase 4 Plan 02 — 2026-03-27)

All 4 secrets have been configured via `gh secret set`. Verify current state:

```bash
gh secret list
# Expected output: ANTHROPIC_API_KEY, FIRECRAWL_API_KEY, SUPABASE_SERVICE_KEY, SUPABASE_URL
```

---

## 3. Manual Agent Trigger

### Via GitHub Actions UI (recommended)

1. Go to the repository → **Actions** tab
2. Select **"Drift Agent — Bi-weekly Research Run"**
3. Click **"Run workflow"** (top right of the workflow list)
4. Optional: enter a specific `company_id` (UUID) to run for one company only
5. Leave `company_id` blank to run all tracked companies

### Via CLI (requires local `.env` setup)

```bash
cd /path/to/drift

# Run all companies due for research
python backend/agent.py

# Run one company by UUID
python backend/agent.py --company-id <company-uuid>

# Run intake for a new company (first-time setup, takes 2-5 min, costs ~$1-3)
python backend/agent.py --intake <company-uuid>

# Run correlation pass only (cross-reference objectives, update momentum)
python backend/agent.py --correlate <company-uuid>

# Override model (e.g. use Sonnet for lower cost)
python backend/agent.py --model claude-sonnet-4-6
```

**Local `.env` file** (in `backend/` directory):

```
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
FIRECRAWL_API_KEY=fc-...
```

---

## 4. Signal Review Workflow

Every signal the agent proposes is a **draft**. Nothing goes live until you approve it. This is a core design principle — the agent reads and classifies, the human verifies.

Two complementary review methods:

### Admin UI (recommended for first review)

1. Navigate to `/admin` in a browser (locally: `http://localhost:3000/admin`)
2. Log in with your Supabase Auth email and password
3. Review each draft signal:
   - Read the excerpt and agent reasoning
   - Check the classification (e.g., `REINFORCED`, `SOFTENED`, `ABSENT`)
   - Check the confidence score (1–10)
4. Click **Approve** to publish or **Reject** to delete
5. Approved signals appear on public company pages immediately
6. Click **Sign Out** when done

**Admin user setup:** Create the admin user at Supabase Dashboard → Authentication → Users → "Add User". Enter your email and password. One user is sufficient.

### CLI (faster for bulk review)

```bash
# List all draft signals pending review
python backend/agent.py --review

# Approve a signal (publishes immediately)
python backend/agent.py --approve <signal-id>

# Reject (delete) a signal
python backend/agent.py --reject  <signal-id>
```

The `--review` output shows the full signal UUID. You only need to type the first few characters — but use the full UUID to avoid ambiguity.

### Expected volume

Per bi-weekly run, expect 2–5 draft signals per company. A Sandoz-only run typically produces 3–8 signals. Review takes 5–15 minutes.

---

## 5. Firecrawl Troubleshooting

Firecrawl is used to pre-fetch company IR pages as clean markdown before Claude analyzes them. The agent degrades gracefully if Firecrawl is unavailable.

### Rate Limits (Free Tier)

- Free tier: approximately 500 credits/month
- Each page scrape = 1 credit
- If Firecrawl rate-limits a request: the agent retries with exponential backoff (3 retries via the `tenacity` library)
- If all retries fail: agent continues using Claude web search only (no Firecrawl data)
- This is non-fatal — the run completes, signals are generated, quality may be slightly lower

**Monitoring:** Check the `agent_runs` table `run_summary` column for any messages mentioning Firecrawl failures.

### Paywalled Pages

Some investor relations pages require login (Bloomberg Terminal, Refinitiv, etc.). Firecrawl cannot access paywalled content.

- Agent automatically falls back to Claude web search for paywalled pages
- Documented limitation: coverage is lower for companies whose primary IR content is behind paywalls
- Sandoz IR pages are publicly accessible — no paywall issue expected

### Firecrawl API Errors

- If `FIRECRAWL_API_KEY` is not set: agent operates fully on Claude web search. No error.
- If the Firecrawl API returns 5xx errors: agent continues with web search fallback. No error.
- If you want to disable Firecrawl temporarily: remove or clear the `FIRECRAWL_API_KEY` secret from GitHub Actions (Settings → Secrets) or from your local `.env`.

### Verifying Firecrawl Is Working

After a run, check a signal's `source_content` column in Supabase. If Firecrawl ran successfully, the field will contain clean markdown from the company's IR page:

```sql
SELECT id, source_name, source_content IS NOT NULL AS has_firecrawl_content
FROM signals
ORDER BY created_at DESC
LIMIT 10;
```

---

## 6. Agent Failure Recovery

### Check GitHub Actions logs first

Go to Actions → click the failed run → click the **"research-run"** job → expand the **"Run research agent"** step.

### Common failure patterns

| Error message | Cause | Fix |
|---|---|---|
| `ANTHROPIC_API_KEY invalid` or `401` | Key expired or incorrect | Regenerate at Anthropic Console → update GitHub secret |
| `SUPABASE_SERVICE_KEY invalid` | Key rotated or incorrect | Regenerate at Supabase Dashboard → Settings → API → update GitHub secret |
| `Timeout after 30 minutes` | Agent processing too slowly | Re-run with `--company-id <id>` to isolate the slow company |
| `Rate limit exceeded` (Anthropic) | Too many API calls | Wait ~1 hour for rate limit reset, then re-trigger manually |
| `JSONDecodeError` in correlation pass | Claude returned invalid JSON (rare) | Agent has a built-in retry. If still failing, run `--correlate <company-id>` manually |
| `No objectives found` | Company exists but no intake was run | Run `python backend/agent.py --intake <company-id>` |

### Check the database for failure details

Even on failure, the agent writes a status record to `agent_runs`:

```sql
SELECT id, status, run_summary, error_message, created_at
FROM agent_runs
ORDER BY created_at DESC
LIMIT 5;
```

`status` values: `completed`, `failed`, `running`

If `status = 'running'` persists after the GitHub Actions job finished, the agent crashed without cleanup. Safe to ignore the orphaned record — it will not affect future runs.

### Re-running after fixing secrets

After updating a GitHub secret, re-trigger the workflow manually:
Actions → Drift Agent — Bi-weekly Research Run → Run workflow.

---

## 7. Log Inspection

### GitHub Actions (primary)

- Actions tab → click workflow run → click **"research-run"** job → expand each step
- Output is human-readable: company names, signal counts, cost estimates
- Download raw logs: click the gear icon top-right → "Download log archive"

### Local runs

Redirect output to a file for later inspection:

```bash
python backend/agent.py 2>&1 | tee backend/logs/agent.log
```

Create the `logs/` directory first if it does not exist.

### Database (detailed history)

The `agent_runs` table stores structured run data:

```sql
-- Recent agent runs with full stats
SELECT
  id,
  status,
  signals_proposed,
  signals_approved,
  estimated_cost_usd,
  run_summary,
  created_at
FROM agent_runs
ORDER BY created_at DESC
LIMIT 10;
```

---

## 8. Supabase Query Basics

Useful queries for operational monitoring. Run in Supabase Dashboard → SQL Editor.

```sql
-- Count draft signals pending review
SELECT COUNT(*) FROM signals WHERE is_draft = true;

-- All pending signals with company and objective context
SELECT
  s.id,
  c.name AS company,
  o.title AS objective,
  s.classification,
  s.confidence,
  s.signal_date,
  s.created_at
FROM signals s
JOIN objectives o ON s.objective_id = o.id
JOIN companies c ON s.company_id = c.id
WHERE s.is_draft = true
ORDER BY s.created_at DESC;

-- Recent agent runs with status
SELECT id, status, signals_proposed, signals_approved, estimated_cost_usd, created_at
FROM agent_runs
ORDER BY created_at DESC
LIMIT 10;

-- Check when each company was last researched
SELECT name, ticker, last_research_run, tracking_active
FROM companies
WHERE tracking_active = true
ORDER BY last_research_run ASC NULLS FIRST;

-- Signals by classification for a company
SELECT classification, COUNT(*) AS count
FROM signals
WHERE company_id = '<company-uuid>' AND is_draft = false
GROUP BY classification
ORDER BY count DESC;

-- Check average confidence score (target: 8.0+/10)
SELECT
  ROUND(AVG(confidence), 2) AS avg_confidence,
  COUNT(*) AS total_signals
FROM signals
WHERE is_draft = false;
```

---

## 9. Admin Authentication

The `/admin` route is protected by Supabase Auth (email/password). No unauthenticated visitor can view or act on draft signals. The page renders a login form when no session exists — the session check runs client-side via `supabase.auth.getSession()`.

### Create the admin user

1. Go to Supabase Dashboard → **Authentication** → **Users**
2. Click **"Add User"** → **"Create new user"**
3. Fill in:
   - **Email:** Your email address (e.g., `stefano@yourdomain.com`)
   - **Password:** Strong password (minimum 12 characters recommended)
   - **Auto Confirm user:** Check this box — the account is immediately active, no email verification required
4. Click **"Create User"**

The user appears in the Users list with status "Confirmed". This is the email/password you will use to log in.

**One user is sufficient.** The admin page is for Stefano's use only. There is no multi-user or role-based access — any confirmed Supabase Auth user can log in.

### Log in (development)

1. Start the frontend dev server: `cd frontend && npm run dev`
2. Navigate to `http://localhost:3000/admin`
3. The login form appears (the page never shows admin content without an active session)
4. Enter the email and password you created above
5. Click **"Sign In"**

On successful login, the review queue loads. The session persists across browser tabs and reloads (stored in browser `localStorage`) until you sign out or the session expires.

### Log in (production)

Same flow as development, using the production URL:

1. Navigate to `https://yourdomain.com/admin` (replace with your Vercel deployment URL)
2. Enter your Supabase email and password
3. Click **"Sign In"**

### Sign out

Click **"Sign Out"** in the admin page header. The session token is cleared from browser storage. Navigating back to `/admin` shows the login form again.

### Verify the auth gate is working

After logging out, navigate to `/admin` — you should see the login form, not the admin dashboard. The HTTP response code is 200 (expected — the auth check is client-side; the page shell always loads, but the React component renders the login form rather than the dashboard for unauthenticated users).

### Reset a forgotten password

Option 1 — set directly in Dashboard (no email required):
1. Go to Supabase Dashboard → **Authentication** → **Users**
2. Find the user row
3. Click the three-dot menu → **"Reset password"** → set a new password directly

Option 2 — email reset link:
1. Go to Supabase Dashboard → **Authentication** → **Users**
2. Click the user row
3. Click **"Send password reset email"** — user receives a link to set a new password

### Production deployment checklist

When deploying to Vercel for the first time, verify these authentication-related settings:

**1. Frontend environment variables** — Add to Vercel project settings (Settings → Environment Variables):
- `NEXT_PUBLIC_SUPABASE_URL` — same value as in `frontend/.env.local`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — same value as in `frontend/.env.local`

**2. Admin user** — The Supabase user is project-wide and works across development and production. If already created for local testing, no further action needed.

**3. Auth redirect URLs** — For email/password auth (current implementation), no redirect URL configuration is required. If you add OAuth or magic links in the future, add your production domain to Supabase Dashboard → **Authentication** → **URL Configuration** → **Redirect URLs**:
- `https://yourdomain.com/auth/callback`
- `http://localhost:3000/auth/callback` (for local development)

### Security notes

- Passwords are stored encrypted in Supabase Auth (bcrypt) — never in the application database
- Sessions are stored in browser `localStorage` as encrypted JWTs
- Unauthenticated users see only the login form — admin data (draft signals, agent runs) is never rendered without a valid session
- The Supabase `anon` key used in the frontend cannot read draft signals directly — RLS policies require authentication for sensitive operations
- The `service_role` key (used by the backend agent) must never appear in frontend code or be committed to the repository

---

## 10. Monetization Gate — Scaling Criteria

The gate to adding company #2 is **public launch readiness**, not a revenue milestone.

Per D-16, D-17, D-18: Stefano makes this call manually when he judges the platform is ready for public visibility.

### Conditions — ALL four must be met

**1. Editorial maturity**
The Drift site is mature enough to show publicly. The Sandoz company page has no rough edges: all 6 objectives have evidence, graveyard entries are classified correctly, all signals reflect research-grade editorial quality (confidence 8.0+/10 average).

**2. Ad slot readiness**
Ad slot placeholders are in place on the landing page (slots 1 and 2) and company page (slots 3 and 4). They look professional and intentional — suitable to show to potential ad network partners.

**3. Agent stability**
At least 2 consecutive clean bi-weekly agent runs on Sandoz with no critical errors.

Verify:
```sql
SELECT status, created_at
FROM agent_runs
ORDER BY created_at DESC
LIMIT 2;
```
Both rows should show `status = 'completed'`.

**4. Runbook reviewed**
This runbook has been read and understood. You are reading it now.

---

### Decision process

This is a qualitative judgment call made by Stefano. There is no automated trigger. When the four conditions above are met, Stefano decides when to proceed.

### Steps to onboard company #2

```bash
# Step 1: Add the company to Supabase (via Admin UI or direct SQL)
# Step 2: Run intake (takes 2-5 min, costs ~$1-3)
python backend/agent.py --intake <new-company-uuid>

# Step 3: Review and approve the proposed objectives and initial signals
python backend/agent.py --review
python backend/agent.py --approve <signal-id>
# (or use the Admin UI)
```

Suggested candidates: Roche (pharma), Volkswagen (automotive ESG), or BP (energy transition commitments).

### After the gate — revenue path

1. Add 1–2 companies and run for 2 weeks to verify agent stability at scale
2. Integrate Carbon Ads or EthicalAds (B2B CPM ~€12; ad slots are already placed)
3. Consider direct sponsorships (~€350/mo) at Month 3
4. Consider Stripe premium subscriptions (~€29/mo) at Month 6 once traffic warrants it

See `docs/revenue-model.html` for the interactive financial projection.

---

*Companion document: `docs/setup.md` (initial project setup — Supabase schema, frontend env, Python dependencies)*
*Canonical design spec: `docs/specs/2026-03-19-drift-v2-design.md`*
