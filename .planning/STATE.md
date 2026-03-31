---
gsd_state_version: 1.0
milestone: v4.2
milestone_name: Timeline UI Overhaul
status: executing
last_updated: "2026-03-31T11:14:52.369Z"
last_activity: 2026-03-31
progress:
  total_phases: 4
  completed_phases: 2
  total_plans: 5
  completed_plans: 6
---

# Project State — Drift v4.1

**Last Updated:** 2026-03-28
**Status:** Ready to execute
**Phase:** 8

## Current Position

Phase: 08 (path-fill-fixes) — EXECUTING
Plan: 4 of 4
Status: Ready to execute
Last activity: 2026-03-31

---

## Progress Bar

```
[█████████░] 87%
Phase 4: [x] Environment & Authentication (complete)
Phase 5: [x] Supabase Verification & Deployment (complete — all 5 SC verified, production live)
Phase 6: [2/3] Automation & End-to-End Validation — 06-02 complete
```

7 of 8 plans complete across phases 4–6

---

## Accumulated Context (From v4.0)

### What v4.0 Shipped

- Firecrawl free-tier SDK integrated with tenacity retry logic
- Confidence scoring: 6.78/10 baseline → 9.3/10 modeled (+37%)
- TDD-driven `is_draft` unconditional enforcement (no bypass paths)
- GitHub Actions bi-weekly cron + manual dispatch
- Supabase Auth gate on `/admin`
- 4 AdSlot placements (ready for ad network)
- 408-line operations runbook with monetization gate logic
- 125 tests total (99 frontend, 26 backend)

### Known Gaps (v4.0 — the reason v4.1 exists)

- No live Supabase connection verified end-to-end
- No live agent run executed (Python environment unavailable during dev)
- No cross-phase integration check or E2E flow verification
- No Vercel deployment with production env vars
- ~~GitHub Actions workflow created but secrets not configured~~ ✅ Fixed in 04-02

### v4.0 Monetization Gate (4 Conditions)

1. ✅ Editorial maturity — Sandoz page meets research-grade standards
2. ✅ Ad slot readiness — 4 slots placed, ready for network integration
3. ✅ Agent stability — **v4.1 goal**: 2 clean bi-weekly runs (SCHED-02, SCHED-03) — CLEARED
4. ✅ Runbook reviewed — ops runbook complete and documented

---

## v4.1 Milestone Goal

**Verify live Supabase connection end-to-end, deploy to production, and activate autonomous agent scheduling.**

This milestone satisfies monetization gate condition #3 and unblocks company #2 intake.

---

## Key Decisions

| Decision | Outcome |
|----------|---------|
| Phase numbering continues from v4.0 | Phases 4, 5, 6 (not restarting at 1) |
| ENV + AUTH grouped in Phase 4 | Both require operator configuration before any live testing can occur |
| DB verification + Vercel deploy grouped in Phase 5 | Frontend deployment depends on confirmed DB connectivity |
| Automation + E2E grouped in Phase 6 | Two clean runs require deployed infrastructure from Phases 4–5 |
| frontend/.env.local sourced from Vercel CLI root .env.local | Same Supabase project, real production values already available |
| backend/.env.local pre-fills SUPABASE_URL | Project URL known from Vercel; reduces manual setup — secrets still need Stefano |
| GitHub secrets set via gh CLI, not UI | Token had repo scope; gh secret set is non-interactive and fully automatable |
| Client-side auth gate on /admin returns HTTP 200 | Expected — React renders login form when no session; admin data never visible without session |
| Email/password auth needs no redirect URL config | Supabase redirect URLs only required for OAuth/magic links; not needed for current implementation |
| agent.py uses load_dotenv('.env.local') explicitly | Default load_dotenv() searches for .env not .env.local; explicit path required for production secrets |
| RLS test reads anon key from frontend/.env.local | DRY — frontend already has NEXT_PUBLIC_SUPABASE_ANON_KEY; no need to duplicate in backend env |

---

## Key Decisions

| Decision | Outcome |
|----------|---------|
| Phase numbering continues from v4.0 | Phases 4, 5, 6 (not restarting at 1) |
| ENV + AUTH grouped in Phase 4 | Both require operator configuration before any live testing can occur |
| DB verification + Vercel deploy grouped in Phase 5 | Frontend deployment depends on confirmed DB connectivity |
| Automation + E2E grouped in Phase 6 | Two clean runs require deployed infrastructure from Phases 4–5 |
| frontend/.env.local sourced from Vercel CLI root .env.local | Same Supabase project, real production values already available |
| backend/.env.local pre-fills SUPABASE_URL | Project URL known from Vercel; reduces manual setup — secrets still need Stefano |
| GitHub secrets set via gh CLI, not UI | Token had repo scope; gh secret set is non-interactive and fully automatable |
| Client-side auth gate on /admin returns HTTP 200 | Expected — React renders login form when no session; admin data never visible without session |
| Email/password auth needs no redirect URL config | Supabase redirect URLs only required for OAuth/magic links; not needed for current implementation |
| agent.py uses load_dotenv('.env.local') explicitly | Default load_dotenv() searches for .env not .env.local; explicit path required for production secrets |
| RLS test reads anon key from frontend/.env.local | DRY — frontend already has NEXT_PUBLIC_SUPABASE_ANON_KEY; no need to duplicate in backend env |
| Real Vercel project is drift-magazine (prj_4mhRuVEqV0XgZnboF5FtvjP1nmqW) | frontend/.vercel/project.json had stale prj_58iBlp9GBdp6VXyTOj6MvrzScb5o — verified via API list |
| Company URL is /company/sdz not /company/sandoz | Ticker-based routing (ticker=SDZ in DB); CompanyCard links to /company/${ticker.toLowerCase()} |
| Vercel deployment via REST API not CLI | CLI required interactive tty link; REST API POST /v13/deployments achieves same result |

## Key Decisions (06-01)

| Decision | Outcome |
|----------|---------|
| exit_manner 'morphed' → signal_classification 'reframed' | 'morphed' not in signal_classification enum; nearest semantic match is reframed |
| exit_manner 'phased' → 'softened', 'resurrected' → 'stated' | Full EXIT_MANNER_TO_CLASSIFICATION mapping added to agent.py |
| GitHub Actions conclusion=success masks agent partial failures | Agent's run_all_due() catches exceptions and continues; exit code always 0 even on error |
| terminal_state column migration deferred to 06-02 | Cannot apply DDL via PostgREST; requires Supabase Dashboard SQL editor — operator action |
| Rate limit cooldown required between CI runs | Shared 30k TPM org limit; 5-minute wait needed when planning conversation is active |

## Key Decisions (06-02)

| Decision | Outcome |
|----------|---------|
| OPS-02 satisfied by GitHub native email-on-failure | No agent-run.yml modification required (per D-01, D-02); robopunk is admin owner |
| Rate limit during correlation pass is acceptable | 9 signals written before correlation step; graceful degradation by design; conclusion=success |

## Known Blockers

- **git push mmap error**: `fatal: mmap failed: Invalid argument` on Windows due to corrupted .claude/worktrees worktree index. Workaround: use GitHub Contents API. Separate cleanup needed.

## Key Decisions (07-01)

| Decision | Outcome |
|----------|---------|
| PADDING_Y 30→60 | Top axis labels at y=46/56, safely inside SVG boundary (was y=16/26, clipped) |
| CANVAS_HEIGHT 620→650 | Canvas grows taller; STAGE_HEIGHT preserved at exactly 68.75px |
| HORIZONTAL_PADDING = 40 (1 MONTH_WIDTH per side) | Nodes/labels at first/last date positions no longer clip at left/right SVG edge |
| canvasWidth includes HORIZONTAL_PADDING * 2 | All x-positions offset by HORIZONTAL_PADDING for consistent positioning |

## Key Decisions (08-01)

| Decision | Outcome |
|----------|---------|
| Centripetal Catmull-Rom alpha=0.5 | Prevents overshoot at sharp momentum transitions vs uniform Catmull-Rom |
| 2-point paths as straight lines | D-04: cleaner visual for single-segment paths; no cubic Bezier |
| Below clip at groundY+1 (not groundY-1) | Eliminates horizontal stripe artifact from fill path closing line at groundY |
| canvasWidth/canvasHeight props replace 10000 | D-02: clip rects sized to actual canvas, not unbounded magic values |
| isBelowGround prop removed | D-05: dead code — not used by fill/clip dual-zone architecture |
| Ground line rendered after path fills in SVG DOM | SVG painter model: fills sit behind ground line, nodes sit above it |

## Key Decisions (08-02 — outside GSD plan, retroactively documented)

Work performed outside the GSD plan framework during human UAT review. Documented in [08-02-SUMMARY.md](phases/08-path-fill-fixes/08-02-SUMMARY.md).

| Decision | Outcome |
|----------|---------|
| Fill opacity 8%→18%/22% | Fills were near-invisible at 8%; 18%/22% matches FinanceCharts readability |
| Sparse Y-axis: 5 of 9 scores (+4,+2,0,-2,-4) | Reduces clutter; provides sufficient orientation without crowding label column |
| Year-only vertical gridlines | Monthly gridlines competed visually with paths; annual cadence is sufficient |
| Top axis removed; bottom axis quarterly | Duplicate labels added noise; quarterly cadence (Jan/Apr/Jul/Oct + year) provides time navigation |
| Time range pills (6M/1Y/2Y/All) replace date range text | User-controlled windowing is more useful than a static date range display |
| windowedMinDate drives all x-position memos | Single source of truth for canvas start — objectiveNodeSets, monthLabels, todayX, deadlineFlags all consistent |
| Filter nodes to windowStartMs before positioning | Nodes before the window got negative x positions, causing paths to extend off-screen left with no scroll; filtering eliminates the clip illusion |
| Zone CSS vars changed from near-white hex to rgba | Previous #f8fdf9/#fefcf8 values were imperceptible; rgba(34,197,94,0.04)/rgba(239,68,68,0.04) match dark mode pattern |
| WATCH·0 ground line label at x=6 | FinanceCharts-style inline annotation; connects score (0) to stage name (Watch) |

## Key Decisions (08-03)

| Decision | Outcome |
|----------|---------|
| toBelowFillPath closes at canvasHeight (not groundY) | Red fill polygon closes at canvas bottom so the area sits underneath the spline curve for crossing objectives |
| toAboveFillPath preserves groundY closing for green fill | No behavioral change to above-ground fill — only below-ground fill path is split |
| Single toFillPath removed entirely | No shared fill path between zones; each fill function is semantically distinct |

## Key Decisions (08-05)

| Decision | Outcome |
|----------|---------|
| Ground line rendered as first SVG child | Background zones (translucent rgba) paint over it visually; paths/nodes/CrossingMarkers stack above naturally via SVG painter model |

## Next Step

Phase 08 complete (08-01 structural fixes, 08-02 FinanceCharts visual redesign, 08-03 below-fill path fix, 08-04 terminal node truncation, 08-05 ground line layer order fix). 146 tests passing. All CANVAS-01 requirements addressed.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260331-u4d | Fix 3 security vulnerabilities: CI command injection, prompt injection, pin requirements | 2026-03-31 | c45c29a | [260331-u4d-fix-3-security-vulnerabilities-ci-comman](.planning/quick/260331-u4d-fix-3-security-vulnerabilities-ci-comman/) |
