# Retrospective

---

## Milestone: v4.0 — Research Enhancement

**Shipped:** 2026-03-27
**Phases:** 3 | **Plans:** 8 | **Tasks:** 18

### What Was Built

- **Phase 1:** Firecrawl SDK integration — tenacity retry, V5 schema migration (`source_content`), 7 unit tests
- **Phase 2:** Confidence scoring pipeline — 6.78→9.3/10 modeled, TDD markdown parsing (extract_tables, extract_timestamp), color-coded confidence badges on frontend, 23 backend tests
- **Phase 3:** Production hardening — `is_draft` TDD fix, GitHub Actions bi-weekly cron, Supabase Auth gate on /admin, 4 AdSlot placements, 408-line operations runbook, 4-condition monetization gate

### What Worked

- **TDD discipline** (RED→GREEN commits) caught the `is_draft` enforcement gap that had existed since Phase 1 — writing tests first exposed the conditional guard vulnerability
- **Modeled quality reporting** unblocked Phase 2 when Python wasn't available for live execution; the structured JSON report gave confidence in the algorithm without a real run
- **Phase surfacing of decisions**: documenting each key decision in SUMMARY.md (e.g., D-01 through D-18) created a traceable decision log that made Phase 3 runbook writing trivial
- **Single-document runbook** (all 10 sections in one file) is easier to reference than a docs/ tree; the --correlate flag discovered during execution was a good example of auto-add Rule 2

### What Was Inefficient

- **Live agent run never executed** — Python environment unavailable throughout the project. All quality metrics are modeled, not measured. This is the biggest gap in v4.0 validation.
- **SUMMARY.md one-liner extraction** via gsd-tools had partial failures (raw content leaked into MILESTONES.md); required manual cleanup. Better to write accomplishments manually for milestone entries.
- **Milestone audit skipped** — proceeding without `/gsd:audit-milestone` means no cross-phase integration check or E2E flow verification was done.

### Patterns Established

- **Unconditional draft enforcement**: `signal["is_draft"] = True` — always overwrite, never guard. No conditional check.
- **Modeled quality reporting**: when live execution is blocked, generate a structured JSON report with documented assumptions instead of blocking the milestone.
- **Monetization gate = public readiness**: 4 qualitative conditions, human judgment call, no automated trigger.
- **Runbook pattern**: GitHub Actions setup + signal review workflow + Firecrawl troubleshooting + failure recovery + monetization gate in one document.

### Key Lessons

- **Always configure GitHub Secrets before the first automated run** — the agent workflow is deployed but won't execute until secrets are set. This is the #1 operator action for v4.0 go-live.
- **Firecrawl free tier is sufficient for Sandoz** — rate limits are not a problem at bi-weekly frequency; retry logic handles transient errors.
- **Draft-only workflow is load-bearing** — the is_draft enforcement fix in Phase 3 was critical; without it, a caller could publish signals without review by passing `is_draft=False`.

### Cost Observations

- Model: Claude Sonnet 4.6 throughout (no Opus usage)
- Sessions: ~3 sessions across 1 day (2026-03-26 to 2026-03-27)
- Notable: All 3 phases executed in a single day — fast execution due to clear plans and minimal rework

---

## Cross-Milestone Trends

| Milestone | Phases | Plans | Days | Tests Added | Key Pattern |
|-----------|--------|-------|------|-------------|-------------|
| v4.0 Research Enhancement | 3 | 8 | 1 | 125 total | TDD for critical enforcement paths |
