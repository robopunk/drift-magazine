# Drift — Setup Guide

## Prerequisites

- **Node.js 18+** and npm
- **Python 3.11+** (for the research agent)
- A **Supabase** project ([supabase.com](https://supabase.com))

---

## Step 1 — Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Choose a region close to you (Frankfurt for CH)
3. Set a strong database password — save it
4. Once the project is ready, go to **SQL Editor**
5. Paste the entire contents of `backend/schema.sql` and click **Run**

---

## Step 2 — Get your API keys

In Supabase: **Settings → API**

- **Project URL** — looks like `https://abcdefgh.supabase.co`
- **anon / public key** — for the frontend (read operations)
- **service_role key** — for the agent (write operations) — **keep this secret**

---

## Step 3 — Frontend setup

```bash
cd frontend
npm install
```

Create a `.env.local` file in the `frontend/` directory:

```
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

Start the dev server:

```bash
npm run dev
```

The app runs at `http://localhost:3000`. Without Supabase credentials, pages render with empty data (no crash).

---

## Step 4 — Agent setup

Create a `.env` file in the `backend/` directory:

```
ANTHROPIC_API_KEY=sk-ant-api03-...
SUPABASE_URL=https://abcdefgh.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs...
FIRECRAWL_API_KEY=fc-...   # Optional. Get from firecrawl.dev. Enables full-doc extraction.
```

Install Python dependencies:

```bash
pip install anthropic supabase python-dotenv schedule
```

---

## Step 5 — Add your first company

### Option A: Admin UI
Open `http://localhost:3000/admin` in your browser and use the Add Company form.

### Option B: CLI
```bash
cd backend
python agent.py --intake <company-uuid>
```

The agent will:
1. Search for founding documents (prospectus, investor day, annual report)
2. Read them and identify all stated strategic objectives
3. Propose initial signals (draft, pending your review)

Takes 2-5 minutes. Costs ~$1-3 depending on document volume.

---

## Step 6 — Review draft signals

Either in the terminal:
```bash
python agent.py --review
python agent.py --approve <signal-id>
python agent.py --reject  <signal-id>
```

Or in the Admin UI → **Review Queue** (approve/reject with one click).

Once approved, signals are live and the company page will reflect them.

---

## Step 7 — Set up the bi-weekly schedule

On a Linux/Mac server or a cloud VM, add a cron job:

```bash
crontab -e
```

Add this line (runs at 8am every other Monday):
```
0 8 */14 * * cd /path/to/drift/backend && python agent.py >> logs/agent.log 2>&1
```

Or use a managed scheduler like:
- **GitHub Actions** (free, scheduled workflows)
- **Railway** or **Render** (simple cron jobs)
- **Supabase Edge Functions** with pg_cron (all in one place)

---

## Workflow summary

```
Add company (Admin UI or CLI)
        ↓
python agent.py --intake <id>      ← one-time, run manually
        ↓
Agent proposes objectives + signals
        ↓
Review and approve in Admin UI     ← 5-10 min per company
        ↓
Company goes live on the site
        ↓
python agent.py                    ← runs bi-weekly automatically
        ↓
Agent proposes new signals
        ↓
Review (should be 2-5 signals per company per run)
        ↓
Approved signals update the site
```

---

## Cost estimates

| Action | Time | Cost |
|---|---|---|
| Intake (new company) | 2-5 min | $1-3 |
| Bi-weekly run (existing) | 1-3 min | $0.50-1.50 |
| 10 companies / run | ~15 min | ~$8-15 |
| 50 companies / run | ~60 min | ~$40-75 |

Costs are for Claude Opus. Using Claude Sonnet reduces cost by ~80%.

---

## The human-in-the-loop principle

The agent never publishes directly. Every signal is a draft until you approve it.
This is intentional — the agent can misread context, and strategic accountability
research requires editorial judgment.
