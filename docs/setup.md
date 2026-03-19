# PromiseTrack — Data Layer Setup

## What you have

| File | Purpose |
|---|---|
| `schema.sql` | Full Supabase database schema — run this once |
| `agent.py` | Research agent — runs monthly, uses Claude + web search |
| `admin.html` | Browser-based admin UI — add companies, review signals |
| `promisetrack-landing.html` | Public landing page |
| `strategic-promise-tracker.html` | Company detail page (Sandoz prototype) |

---

## Step 1 — Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Choose a region close to you (Frankfurt for CH)
3. Set a strong database password — save it
4. Once the project is ready, go to **SQL Editor**
5. Paste the entire contents of `schema.sql` and click **Run**

---

## Step 2 — Get your API keys

In Supabase: **Settings → API**

- **Project URL** — looks like `https://abcdefgh.supabase.co`
- **anon / public key** — for the admin UI (read operations)
- **service_role key** — for the agent (write operations) — **keep this secret**

---

## Step 3 — Create a `.env` file

In the same folder as `agent.py`:

```
ANTHROPIC_API_KEY=sk-ant-api03-...
SUPABASE_URL=https://abcdefgh.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs...
```

---

## Step 4 — Install Python dependencies

```bash
pip install anthropic supabase python-dotenv schedule
```

---

## Step 5 — Open the Admin UI

Open `admin.html` in your browser.
Go to **Settings** and paste in:
- Your Supabase project URL
- Your **anon** key (not service key — this is safe to use in the browser)

Click **Test Connection** — it should go green.

---

## Step 6 — Add your first company

In the Admin UI → **Add Company**

Fill in:
- **Company Name**: e.g. Roche Holding
- **Sector**: Pharma
- **Initiative Name**: e.g. Personalised Healthcare at Scale
- **Research Context**: This is the most important field.
  Tell the agent what to look for. Be specific about objective names,
  metrics, and any known language you want it to track.
- **IR URL**: The investor relations page

Click **Save Company** — you'll get a company UUID in the log.

---

## Step 7 — Run Intake (first research run)

In your terminal:

```bash
python agent.py --intake <company-uuid>
```

The agent will:
1. Search for founding documents (prospectus, investor day, annual report)
2. Read them and identify all stated strategic objectives
3. Propose initial signals (draft, pending your review)

Takes 2–5 minutes. Costs ~$1–3 depending on document volume.

---

## Step 8 — Review draft signals

Either in the terminal:
```bash
python agent.py --review
python agent.py --approve <signal-id>
python agent.py --reject  <signal-id>
```

Or in the Admin UI → **Review Queue** (approve/reject with one click).

Once approved, signals are live and the company page will reflect them.

---

## Step 9 — Set up the monthly schedule

On a Linux/Mac server or a cloud VM, add a cron job:

```bash
crontab -e
```

Add this line (runs at 8am on the 1st of each month):
```
0 8 1 * * cd /path/to/promisetrack && python agent.py >> logs/agent.log 2>&1
```

Or use a managed scheduler like:
- **GitHub Actions** (free, scheduled workflows)
- **Railway** or **Render** (simple cron jobs)
- **Supabase Edge Functions** with pg_cron (all in one place)

---

## Workflow for adding companies at scale

```
You add company in Admin UI
        ↓
python agent.py --intake <id>      ← one-time, you run manually
        ↓
Agent proposes objectives + signals
        ↓
You review and approve in Admin UI  ← 5–10 min per company
        ↓
Company goes live on the public site
        ↓
python agent.py                     ← runs monthly automatically
        ↓
Agent proposes new signals
        ↓
You review (should be 2–5 signals per company per month)
        ↓
Approved signals update the public page
```

---

## Cost estimates

| Action | Time | Cost |
|---|---|---|
| Intake (new company) | 2–5 min | $1–3 |
| Monthly run (existing) | 1–3 min | $0.50–1.50 |
| 10 companies / month | ~15 min | ~$8–15 |
| 50 companies / month | ~60 min | ~$40–75 |

Costs are for Claude Opus. Using Claude Sonnet reduces cost by ~80%
at some quality tradeoff — set `MODEL = "claude-sonnet-4-20250514"` in `agent.py`.

---

## The human-in-the-loop principle

The agent never publishes directly. Every signal is a draft until you approve it.
This is intentional — the agent can misread context, and strategic accountability
research requires editorial judgment.

Expect to spend 15–30 minutes per month reviewing signals across all companies.
High-confidence signals (9–10/10) are rarely wrong. Lower-confidence signals (6–7/10)
often need a second read of the source.
