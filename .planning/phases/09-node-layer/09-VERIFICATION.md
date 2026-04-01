---
phase: 09-node-layer
verified: 2026-04-01T14:20:00Z
status: human_needed
score: 6/6 must-haves verified
human_verification:
  - test: "Open /company/sdz at 100% browser zoom in light mode. Confirm terminal nodes (rightmost nodes on graveyard objectives) display geometric icons — upward chevron for PROVED, downward triangle for buried — not emoji."
    expected: "Clean geometric SVG marks inside the node circle, visually distinct from emoji rendering."
    why_human: "SVG use[href] references symbols defined in the parent SVG. JSDOM tests confirm the use element exists and href resolves, but pixel-level rendering fidelity and icon legibility require a real browser."
  - test: "On the same page, confirm signal nodes along each objective path are dot-only — no stage label text beside them. Only the rightmost (latest) node per objective shows a label."
    expected: "All intermediate signal nodes: two concentric circles and a tick only. The latest node: circles, tick, emoji at fontSize=18 centered inside, and stage label above at fontSize=11."
    why_human: "Text suppression is code-verified, but visual clutter from label spacing and tick density at high signal density needs perceptual confirmation."
  - test: "Confirm the latest node outer halo has a visible breathing pulse animation (slow scale oscillation, ~2.5s cycle)."
    expected: "A subtle scale oscillation (1.0 to 1.08 and back) at the outer halo ring — not distracting, not absent."
    why_human: "CSS keyframe animation on an SVG element with transform-box: fill-box requires a live browser. JSDOM does not execute CSS animations."
  - test: "Find two or more objectives that share the same date column on the Sandoz timeline. Confirm their tick lines extend to different heights and labels do not overlap."
    expected: "Ticks staggered at 20/32/44/56px intervals. No label text occupies the same vertical band as another label at the same x-position."
    why_human: "Proximity-bucket stagger is code-verified, but visual label collision depends on actual rendered font metrics and node y-positions — requires human spatial judgement."
  - test: "Toggle to dark mode. Confirm origin node date labels (e.g. 'Oct 2023') are clearly readable against the dark canvas — not faint or near-invisible."
    expected: "Date labels in IBM Plex Mono at var(--muted-foreground) are legible at normal viewing distance. No strain required."
    why_human: "WCAG fix (--muted-foreground: #9ca3af in .dark block) is code-verified at 5.74:1, but perceived legibility in the actual rendered canvas alongside competing visual elements requires human confirmation."
---

# Phase 9: Node Layer Verification Report

**Phase Goal:** Node markers are legible at default zoom and do not visually collide when multiple objectives share the same x-position
**Verified:** 2026-04-01T14:20:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from 09-01-PLAN.md must_haves)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Terminal nodes render crisp SVG symbols instead of emoji text | VERIFIED | `TimelineNode.tsx` line 87-94: `<use href={isProved ? "#icon-proved" : "#icon-buried"} .../>`. No emoji text. No `🏆` or `⚰️` in file. |
| 2 | Latest node has a breathing pulse animation on its outer halo | VERIFIED | `TimelineNode.tsx` line 171-172: `className={isLatest ? "node-pulse" : undefined}` on outer halo circle. `globals.css` lines 99-115: `@keyframes node-pulse` + `.node-pulse { animation: node-pulse 2.5s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }` |
| 3 | Signal nodes are dot-only markers with no label text | VERIFIED | `TimelineNode.tsx` lines 174-185: emoji text only renders for `{isLatest && label && ...}`. Lines 196-208: stage label text only renders for `{isLatest && label && ...}`. Signal nodes (isLatest=false) get zero text elements. Test 2 asserts `container.querySelector("text")` is null — passes. |
| 4 | Latest node shows stage label at fontSize=11 in IBM Plex Mono | VERIFIED | `TimelineNode.tsx` line 201: `fontSize={11}`. Line 204: `fontFamily="var(--font-ibm-plex-mono)"`. Test 3 asserts `labelText.getAttribute("font-size")` is `"11"` — passes. |
| 5 | Nodes at the same x-position have staggered tick heights that prevent label overlap | VERIFIED | `TimelineCanvas.tsx` lines 382-409: proximity-bucket stagger computation — `TICK_HEIGHTS = [20, 32, 44, 56]`, `originBuckets` + `signalBuckets` Maps keyed by `Math.round(x/5)`. Line 670: `tickHeight={nodeTickHeights.get(...) ?? 20}` passed to each node. Test 9 (stagger test) asserts tickHeight=56 produces lower y2 than tickHeight=20 — passes. |
| 6 | Origin date labels are legible in both light and dark mode | VERIFIED (automated portion) | `globals.css` line 72: dark mode block contains `--muted-foreground: #9ca3af` (5.74:1 contrast ratio on `#0f172a`, passes WCAG AA). Light mode retains `#6b7280` (4.51:1, passes AA). `TimelineNode.tsx` line 149: origin date label uses `fill="var(--muted-foreground)"`. |

**Score:** 6/6 truths verified (automated)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/components/company/TimelineNode.tsx` | All 6 node type renderers with tickHeight prop and SVG icon support | VERIFIED | 212 lines. Contains `tickHeight: number` prop, `<use href="#icon-proved/#icon-buried">`, `className={isLatest ? "node-pulse" : undefined}`, `r={isLatest ? 8 : 5}` / `r={isLatest ? 4 : 2.5}`, `fontSize={11}` label. No `stackIndex`, no `#f59e0b`, no emoji for terminal nodes. |
| `frontend/src/components/company/TimelineCanvas.tsx` | SVG symbol defs block and proximity-bucket stagger computation | VERIFIED | Contains `<defs>` with `<symbol id="icon-proved" viewBox="0 0 12 12">` (upward chevron polyline) and `<symbol id="icon-buried" viewBox="0 0 12 12">` (downward triangle polygon). Contains `const TICK_HEIGHTS = [20, 32, 44, 56] as const`, `originBuckets`, `signalBuckets`, `nodeTickHeights` maps. `tickHeight={nodeTickHeights.get(...) ?? 20}` replaces removed `stackIndex={objIdx}`. |
| `frontend/src/app/globals.css` | node-pulse keyframes and WCAG-compliant dark mode muted-foreground | VERIFIED | `@keyframes node-pulse` present at lines 99-109. `.node-pulse` class at lines 111-115 with `transform-box: fill-box; transform-origin: center`. Dark mode `--muted-foreground: #9ca3af` at line 72 (was `#6b7280`). |
| `frontend/src/__tests__/components/company/TimelineNode.test.tsx` | Updated test assertions for new radii, props, SVG symbols | VERIFIED | 144 lines. Contains `tickHeight={20}` in all 9 render calls. No `stackIndex`. Signal test asserts `container.querySelector("text")` is null. Latest test asserts outer halo `r="8"`, inner `r="4"`, label `font-size="11"`. Terminal tests assert `use[href="#icon-proved"]` / `use[href="#icon-buried"]`. Stagger test uses `tickHeight={20}` vs `tickHeight={56}`. Stale test asserts `stroke="var(--exit-phased)"`. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `TimelineCanvas.tsx` | `TimelineNode.tsx` | `tickHeight` prop replaces `stackIndex` | VERIFIED | `stackIndex={objIdx}` fully removed. `tickHeight={nodeTickHeights.get(...) ?? 20}` present at line 670. Bucket computation precedes the render loop. |
| `TimelineCanvas.tsx` | `TimelineNode.tsx` | SVG symbol defs referenced via `use href` | VERIFIED | `<defs>` with `icon-proved` + `icon-buried` symbols present inside the parent SVG. `TimelineNode.tsx` uses `<use href="#icon-proved/#icon-buried">`. Parent-child SVG scope satisfied. |
| `globals.css` | `TimelineNode.tsx` | `node-pulse` CSS class on latest node outer halo | VERIFIED | `.node-pulse` defined in `globals.css`. `className={isLatest ? "node-pulse" : undefined}` applied to the outer halo `<circle>` in `TimelineNode.tsx`. |

---

### Data-Flow Trace (Level 4)

Not applicable. Phase 9 is a pure visual/component layer upgrade — no data fetching, no state from API. Nodes receive pre-computed props from `TimelineCanvas.tsx` which itself receives `objectives` and `signals` as props from the server component layer (unchanged by this phase).

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 9 TimelineNode unit tests pass | `npx vitest run src/__tests__/components/company/TimelineNode.test.tsx` | 9/9 passed, 2.23s | PASS |
| Full 146-test suite passes with no regressions | `npx vitest run` | 146/146 passed, 7.31s | PASS |
| No `stackIndex` prop usage in any source file | `grep "stackIndex={" src/` | 0 matches | PASS |
| No hardcoded `#f59e0b` in TimelineNode.tsx | `grep "#f59e0b" TimelineNode.tsx` | 0 matches | PASS |
| `node-pulse` keyframes appear 3 times in globals.css | `grep -c "node-pulse" globals.css` | 3 | PASS |
| Dark mode WCAG fix present | `grep "#9ca3af" globals.css` | Match in `.dark` block | PASS |
| `icon-proved` symbol defined in TimelineCanvas | `grep -c "icon-proved" TimelineCanvas.tsx` | 1 | PASS |

---

### Requirements Coverage

NODE-01/02/03 are defined in `.planning/PROJECT.md` (v4.2 requirements tracking) — no separate v4.2 REQUIREMENTS.md file exists. All three are marked `[x]` in PROJECT.md after Plan 09-01.

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| NODE-01 | 09-01-PLAN.md | Node icons enlarged and visually polished (not emoji-small) | VERIFIED (automated) | Terminal nodes use `<use href="#icon-proved/#icon-buried">` SVG symbols. Latest nodes enlarged to r=8/4 with fontSize=18 emoji inside circle. Unit tests assert use elements and radii. Visual rendering: human_needed. |
| NODE-02 | 09-01-PLAN.md | Node decluttering — overlapping labels/ticks handled via smart stacking | VERIFIED (automated) | Proximity-bucket stagger with `TICK_HEIGHTS=[20,32,44,56]`. Signal nodes have zero label text. Stagger test passes. Visual non-overlap: human_needed. |
| NODE-03 | 09-01-PLAN.md | Content-bearing nodes sized for legibility at normal zoom | VERIFIED (automated) | Latest nodes r=8/4 (up from r=6/3), fontSize=11 label, WCAG AA dark mode contrast. Perceptual legibility: human_needed. |

No orphaned requirements detected. All three NODE-IDs from both plan frontmatters map to the same phase. 09-02-PLAN.md repeats the same requirement IDs as a visual confirmation gate — structurally correct.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `TimelineCanvas.tsx` | 383 | Comment: `// Per CONTEXT D-C1, D-C2 — replaces stackIndex-based even/odd stagger` contains `stackIndex` | Info | Comment only — no functional `stackIndex` prop usage anywhere. Not a stub. |

No stubs, no `TODO/FIXME`, no hardcoded empty returns, no disconnected data flows found in modified files.

---

### Human Verification Required

The three NODE requirements are perceptual — legibility, collision avoidance, and animation quality cannot be confirmed programmatically. Plan 09-02 was designed specifically as a human visual checkpoint for these.

**Status from 09-02-SUMMARY.md:** Human reviewer confirmed approval on 2026-04-01 (metrics: duration_seconds=60, tasks_completed=1/1). The summary records: "User visually confirms NODE-01, NODE-02, NODE-03 requirements — all checks pass."

However, verification policy requires flagging these for the record since they are perceptual claims documented in a SUMMARY, not an independent verification artifact.

#### 1. Terminal Node Icon Quality (NODE-01)

**Test:** Open `/company/sdz` at 100% browser zoom. Locate objectives in the graveyard section. Confirm terminal nodes show geometric icons (upward chevron, downward triangle) — not emoji or blank circles.
**Expected:** Clean crisp geometric marks inside the node circle, visually distinct from emoji rendering at the node's display size.
**Why human:** SVG symbol rendering fidelity, icon centering, and visual crispness at the display scale require a real browser — JSDOM confirms the use element exists but not what it looks like.

#### 2. Signal Node Declutter and Stagger (NODE-02)

**Test:** On the same page, scan the full Sandoz timeline. Confirm (a) intermediate signal nodes have no text labels and (b) at any column where two or more objectives share a date, tick lines extend to visibly different heights.
**Expected:** Only the latest (rightmost) node per objective shows a label. Tick heights at shared dates are staggered, labels do not overlap.
**Why human:** Visual overlap depends on rendered font metrics and actual screen coordinates — not computable from source alone.

#### 3. Latest Node Pulse Animation (NODE-01)

**Test:** Watch a latest node for ~5 seconds. Confirm the outer halo ring gently scales up and back in a ~2.5s cycle.
**Expected:** Subtle breathing oscillation, not distracting. Animation visible in both light and dark mode.
**Why human:** CSS keyframe animation on SVG with `transform-box: fill-box` does not execute in JSDOM.

#### 4. Dark Mode Date Label Legibility (NODE-03)

**Test:** Toggle dark mode. Read origin node date labels (e.g., "Oct 2023") at normal viewing distance without zooming.
**Expected:** Labels clearly legible. The WCAG AA upgrade to `#9ca3af` (5.74:1) on `#0f172a` should be perceptibly better than the previous `#6b7280` (3.69:1).
**Why human:** Perceived contrast in context (surrounding paths, fills, grid) differs from isolated contrast ratio calculation.

---

### Gaps Summary

No gaps. All automated must-haves pass. Human visual approval is documented in 09-02-SUMMARY.md. The `human_needed` status reflects verification protocol — perceptual requirements are flagged for the record even when human approval has already been recorded by the executing agent.

---

_Verified: 2026-04-01T14:20:00Z_
_Verifier: Claude (gsd-verifier)_
