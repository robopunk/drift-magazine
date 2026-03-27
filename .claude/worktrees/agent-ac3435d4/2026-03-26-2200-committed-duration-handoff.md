# Committed Duration & Time-aware Tracking — Implementation Handoff

**Created:** 2026-03-26 22:00
**Phase:** Sub-project 3 (Phases 3.1–3.3)
**Spec:** `docs/superpowers/specs/2026-03-26-committed-duration-design.md`
**Plan:** `docs/superpowers/plans/2026-03-26-committed-duration-plan.md`

---

## Prompt for fresh Opus context window

Copy everything below the line into a new Claude Code session (Opus):

---

You are implementing Phase 3 of the Drift project — **Committed Duration & Time-aware Tracking**. This adds commitment windows to objectives so they are tracked against the time period the company committed to, not just open-ended momentum.

**Read these files first, in this order:**

1. `CLAUDE.md` — project context, brand rules, data model, conventions
2. `2026-03-25-2121-drift-visual-and-intelligence-roadmap.md` — master roadmap (Sub-project 3 is yours)
3. `docs/superpowers/specs/2026-03-26-committed-duration-design.md` — full design spec (approved)
4. `docs/superpowers/plans/2026-03-26-committed-duration-plan.md` — step-by-step implementation plan

**Then execute the plan task by task.** The plan has 9 tasks with exact file paths, code blocks, test commands, and commit messages. Follow them precisely:

- **Task 1:** Schema — commitment fields, deadline_shifted enum, escalation function, view update
- **Task 2:** Agent — update all three prompts (intake, monthly, correlation), fix is_in_graveyard refs
- **Task 3:** TypeScript types — add commitment fields to Objective, deadline_shifted to SignalClassification
- **Task 4:** DeadlineFlag component — new SVG component with tests (TDD)
- **Task 5:** TimelineCanvas — integrate DeadlineFlag, compute deadline positions
- **Task 6:** ObjectiveCard — deadline badge pill with overdue/approaching/within states
- **Task 7:** TimelineLegend — add deadline flag key to footer
- **Task 8:** Test mocks — add commitment_type defaults to all mock Objective objects across test suite
- **Task 9:** Final verification — run full test suite + build, update roadmap

**Rules:**
- TDD: write test first, verify it fails, implement, verify it passes
- Commit after each task (commit messages are in the plan)
- Run `cd frontend && npx vitest run` after each frontend task to catch regressions
- Follow existing code patterns — Tailwind utilities, CSS variables, font-mono/font-serif conventions
- Never hardcode hex values for status colours — use the design system tokens
- The plan references exact line numbers — these are approximate. Read the actual file to find the right insertion point.

Proceed with Task 1.
