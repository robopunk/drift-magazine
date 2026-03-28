# Phase 6: Automation & End-to-End Validation - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 6 activates autonomous agent scheduling and validates the full signal pipeline end-to-end.
Scope covers:
1. Verifying the GitHub Actions workflow authenticates and runs the agent correctly (SCHED-01)
2. Triggering two clean agent runs — producing draft signals each time (SCHED-02, SCHED-03)
3. Verifying operator monitoring via GitHub Actions UI (OPS-01)
4. Confirming failure notifications work via GitHub native email (OPS-02)
5. Approving draft signals and verifying they appear on the live Vercel frontend (E2E-01, E2E-02, E2E-03)

This phase does NOT include: custom domain setup, paywall/Stripe integration, email subscriber alerts,
company #2 intake, or any frontend feature work.

</domain>

<decisions>
## Implementation Decisions

### Failure Notifications (OPS-02)

- **D-01:** Rely on GitHub's native email-on-failure notifications (account Settings → Notifications → Actions). Zero-config, no workflow step needed. No changes to `agent-run.yml` are required for OPS-02.
- **D-02:** VERIFICATION.md will satisfy OPS-02 by documenting that the GitHub account notification setting is enabled (prose confirmation — no code change).

### Claude's Discretion

- How to trigger the two clean runs: manual via `workflow_dispatch` (both today) is recommended — faster than waiting for the April 1st scheduled cron, and still validates SCHED-01/02/03
- Draft signal approval approach: use `py agent.py --approve <id>` (CLI, bulk) or the admin UI — planner's choice based on what's faster and verifiable
- E2E signal count verification (E2E-03: 51+ signals): automated curl grep or human browser check — planner's choice, consistent with Phase 5 Task 2 pattern (human verify)
- Whether to add a `--no-confirm` / `--approve-all` CLI flag for bulk approval (if it doesn't exist) — planner decides based on current agent.py capabilities

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Workflow & Scheduling
- `.github/workflows/agent-run.yml` — existing workflow file (bi-weekly cron + workflow_dispatch, all 4 secrets already wired)
- `backend/agent.py` — the research agent (--review, --approve, --reject, --company-id flags)

### Requirements
- `.planning/REQUIREMENTS.md` §SCHED-01..03, OPS-01..02, E2E-01..03 — all Phase 6 acceptance criteria
- `.planning/ROADMAP.md` §Phase 6 — success criteria and phase goal

### Prior Phase Context
- `.planning/phases/05-supabase-verification-deployment/VERIFICATION.md` — Phase 5 evidence baseline (agent confirmed working, Vercel live at drift-magazine.vercel.app, Sandoz ticker is SDZ)
- `.planning/phases/05-supabase-verification-deployment/05-CONTEXT.md` — Phase 5 decisions (env var strategy, verification order, hard-blocker policy)

### Brand & Editorial
- `brand/brand-language.html` — editorial voice and classification standards (relevant if any signal review or approval involves editorial judgment calls)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `.github/workflows/agent-run.yml` — workflow exists and is complete; the 4 secrets (ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY, FIRECRAWL_API_KEY) are already set in the GitHub repo (confirmed 2026-03-27)
- `backend/agent.py` — CLI flags available: `--review`, `--approve <id>`, `--reject <id>`, `--company-id <id>`, `--intake <id>`
- `gh` CLI — authenticated as `robopunk` with access to `robopunk/drift-magazine` (available for triggering workflow_dispatch)

### Established Patterns
- Human approval before publish — all signals are drafted first; this is intentional editorial design, not a bug to fix
- Phase 5 verification pattern — used `py agent.py --review` + human browser check for the final E2E confirmation; Phase 6 should follow the same pattern

### Integration Points
- GitHub Actions → Supabase: the workflow injects SUPABASE_URL + SUPABASE_SERVICE_KEY as env vars; agent.py reads these directly
- Agent → Vercel frontend: signals appear on the live site only after human approval; the E2E test must include the approval step
- `gh workflow run agent-run.yml` — triggers workflow_dispatch from CLI (requires `robopunk` auth)

</code_context>

<specifics>
## Specific Ideas

- No specific UI or visual preferences stated — this is an ops/automation phase
- No custom notification channel requested — GitHub native email is the chosen approach

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 06-automation-end-to-end-validation*
*Context gathered: 2026-03-28*
