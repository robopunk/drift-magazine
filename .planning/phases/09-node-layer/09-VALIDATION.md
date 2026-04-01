---
phase: 9
slug: node-layer
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (existing) |
| **Config file** | `frontend/vitest.config.ts` |
| **Quick run command** | `cd frontend && npx vitest run src/__tests__/components/company/TimelineNode.test.tsx` |
| **Full suite command** | `cd frontend && npx vitest run` |
| **Estimated runtime** | ~15 seconds (quick) / ~60 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npx vitest run src/__tests__/components/company/TimelineNode.test.tsx`
- **After every plan wave:** Run `cd frontend && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 9-01-01 | 01 | 1 | NODE-01 | unit | `cd frontend && npx vitest run src/__tests__/components/company/TimelineNode.test.tsx` | ✅ | ⬜ pending |
| 9-01-02 | 01 | 1 | NODE-01 | unit | `cd frontend && npx vitest run src/__tests__/components/company/TimelineNode.test.tsx` | ✅ | ⬜ pending |
| 9-01-03 | 01 | 1 | NODE-02 | unit | `cd frontend && npx vitest run src/__tests__/components/company/TimelineNode.test.tsx` | ✅ | ⬜ pending |
| 9-01-04 | 01 | 1 | NODE-03 | unit | `cd frontend && npx vitest run src/__tests__/components/company/TimelineNode.test.tsx` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

No new test files required. Existing `frontend/src/__tests__/components/company/TimelineNode.test.tsx` infrastructure covers all phase requirements. Test assertions need updates — bundled with implementation tasks.

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Node markers visually legible at default zoom | NODE-01 | Perceptual legibility cannot be asserted programmatically | Open `/company/NOVN` at 100% zoom; confirm emoji icons are clearly readable, not cramped |
| Three same-date nodes have staggered tick heights with no label overlap | NODE-02 | Visual overlap requires human judgement | Render Sandoz timeline; find objectives sharing a date; confirm labels are visually separated |
| Stage label + date readable without squinting | NODE-03 | Font rendering is browser/OS dependent | Check at 100% zoom, dark and light mode |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
