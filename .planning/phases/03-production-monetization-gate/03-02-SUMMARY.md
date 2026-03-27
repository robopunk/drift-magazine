---
phase: 03-production-monetization-gate
plan: "02"
subsystem: frontend
tags: [auth, admin, supabase, ads, monetization]
dependency_graph:
  requires: []
  provides: [admin-auth-gate, ad-slot-placements]
  affects: [frontend/src/app/admin/page.tsx, frontend/src/components/landing/AdSlot.tsx, frontend/src/app/company/[ticker]/client.tsx]
tech_stack:
  added: []
  patterns: [supabase-auth, auth-gate, ad-slots]
key_files:
  created: []
  modified:
    - frontend/src/app/admin/page.tsx
    - frontend/src/components/landing/AdSlot.tsx
    - frontend/src/app/company/[ticker]/client.tsx
decisions:
  - "Use getSession on mount + onAuthStateChange listener for robust session handling"
  - "Load admin data only after session confirmed to prevent unauthorized data exposure"
  - "AdSlot slot type widened to number for forward compatibility beyond slot 6"
metrics:
  duration: "2 minutes"
  completed_date: "2026-03-27"
  tasks_completed: 2
  files_modified: 3
requirements:
  - D-03
  - D-04
  - D-05
  - D-12
  - D-13
  - D-14
  - D-15
---

# Phase 03 Plan 02: Admin Auth Gate and Ad Slot Placements Summary

**One-liner:** Supabase Auth email/password gate on /admin with session-aware approve/reject, plus Advertisement-labelled ad slots with variant system across 4 site locations.

---

## What Was Built

### Task 1: Admin Auth Gate (commit 6ad69c3)

The `/admin` page was previously publicly accessible — anyone with the URL could view and approve draft signals. This is now fully gated behind Supabase Auth.

**How it works:**
1. On mount, `supabase.auth.getSession()` checks for an existing session
2. If no session: a clean login form is shown (email + password, styled per brand tokens)
3. On successful `signInWithPassword`, session state is set and admin data loads
4. If login fails, the error message appears inline below the form
5. `onAuthStateChange` listener keeps the session in sync across tabs
6. "Sign Out" button in the admin header calls `supabase.auth.signOut()`
7. `approveSignal` now includes `reviewed_at` (ISO timestamp) and `reviewed_by` (user email or "admin-ui") to match `agent.py`'s `approve_signal` behavior

**Security note:** Data loading (`loadData()`) is called only when session is confirmed — draft signals are never fetched or rendered for unauthenticated visitors.

### Task 2: AdSlot Component Extension + Placements (commit 17b7521)

The `AdSlot` component was extended with a `variant` prop and the label was updated from "Sponsored" to "Advertisement" (D-14).

**Updated component interface:**
- `slot: number` — widened from `1 | 2 | 3` union for forward compatibility
- `variant?: "sidebar" | "banner" | "inline"` — controls padding/width
- `data-ad-slot` attribute retained for future ad network integration

**Variant styles:**
- `sidebar` — `p-4` (default, matches existing slots 1 and 2 on landing)
- `banner` — `p-6 w-full` (full-width below page content)
- `inline` — `p-3` (compact, for future use)

**Placement summary (4 total):**
| Slot | Location | Variant | Requirement |
|------|----------|---------|-------------|
| 1 | Landing page sidebar above SignalFeed | sidebar | D-13 |
| 2 | Landing page sidebar below SignalFeed | sidebar | D-13 |
| 3 | Company page below all tab content | banner | D-12 |
| 4 | Company page objectives tab sidebar | sidebar | D-12 |

Slot 4 is new — placed in a flex sidebar alongside the objective cards grid on the objectives tab, visible at `lg` breakpoint and above. Slot 3 was updated from default to `variant="banner"` to reflect its full-width context.

---

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | PASS — no errors |
| `signInWithPassword` present in admin | PASS |
| `getSession` present in admin | PASS |
| `signOut` present in admin | PASS |
| `reviewed_at` in approveSignal | PASS |
| `reviewed_by` in approveSignal | PASS |
| "Admin Login" heading present | PASS |
| Session null → no draft signals rendered | PASS |
| "Advertisement" label in AdSlot | PASS |
| `variant` prop present | PASS |
| `slot: number` type | PASS |
| `slot={4}` in company client | PASS |
| `variant="banner"` on slot 3 | PASS |
| `variant="sidebar"` on slot 4 | PASS |
| Total AdSlot placements >= 4 | PASS (exactly 4) |

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Known Stubs

None. The admin auth gate is fully functional (Supabase Auth real calls). Ad slots are intentional UI placeholders — they are structurally complete for ad network integration (Carbon Ads / EthicalAds) and display correctly. The "Advertisement" label is the intended production appearance for placeholder ad slots pre-network-integration.

---

## Self-Check: PASSED

- `frontend/src/app/admin/page.tsx` — modified, contains `signInWithPassword`, `getSession`, `signOut`, `reviewed_at`, `reviewed_by`, `Admin Login`
- `frontend/src/components/landing/AdSlot.tsx` — modified, contains `Advertisement`, `variant`, `slot: number`
- `frontend/src/app/company/[ticker]/client.tsx` — modified, contains `slot={4}`, `variant="banner"`, `variant="sidebar"`
- Commit `6ad69c3` — feat(03-02): add Supabase Auth gate to admin page
- Commit `17b7521` — feat(03-02): extend AdSlot component and add slot 4 on company objectives tab
