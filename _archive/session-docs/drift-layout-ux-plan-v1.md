# Sandoz Company Page — Layout & UX Fixes

## Context
The Sandoz company page (`frontend/sandoz.html`) needs layout restructuring, terminology updates, and several UX fixes. The page currently shows Timeline → Objectives → Graveyard stacked vertically. The user wants a new layout with Objectives and Buried side by side, plus several fixes to tooltips, centering, naming, and styling.

---

## Changes (all in `frontend/sandoz.html`)

### 1. Layout restructure — Objectives + Buried side by side
**Current order:** Timeline → Active Objectives (3-col) → Graveyard (3-col), all stacked full-width.
**New order:** Timeline (full width) → [Active Objectives | Buried] side by side, each single-column.

**CSS changes:**
- Add a new `.split-section` wrapper with `display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; max-width:1200px; margin:0 auto; padding:0 1.75rem; align-items:start;`
- `.cards-section` loses its own `max-width`/`margin:auto`/`padding` (now inside the split wrapper)
- `.cards-grid` changes from `repeat(3,1fr)` → `1fr` (single column)
- `.graveyard` wrapper loses `margin-top` (now inside split layout)
- `.gy-stones` changes from `repeat(3,1fr)` → `1fr`
- Add section headers inside each half (each gets its own `rule-inner` heading)
- Responsive: at `≤768px`, `.split-section` goes to `grid-template-columns:1fr` (stack)

**HTML changes:**
- Wrap the Objectives section-rule + `.cards-section` and the Buried section-rule + `.graveyard` inside a single `.split-section` div
- Remove the separate section-rule divs that are currently outside — move them inside each half
- Evidence drawers need adjustment: when a card is clicked, the drawer should span the full width of the objectives column (already works with `grid-column:1/-1` since grid is now 1-col)

### 2. Timeline "Today" indicator
**In `renderTimeline()` JS function (~line 1853):**
- After rendering the time axis, add a vertical "today" marker line
- Calculate x-position: `dateToX(new Date().toISOString().slice(0,10))`
- Render as a vertical dashed line from top to bottom of canvas with label "TODAY" at the top
- CSS: thin dashed line in `var(--gold)` at ~30% opacity, label in JetBrains Mono `.65rem`

### 3. Fix tooltip clipping for high-status nodes (Fly+)
**Problem:** Nodes at Fly (+3) or Orbit (+4) are positioned near the top of the canvas. Tooltips appear *above* the node (`bottom: calc(100% + 14px)`), which pushes them above the canvas top edge. The `.tl-scroll-wrap` has `overflow-y:visible` but the `.tl-section` or parent elements may clip.

**Fix:**
- In the JS node rendering (~line 1944), add logic: if node `stage >= 3` (Fly or Orbit), add the `.flip` class to show tooltip *below* the node instead of above
- Current logic only flips for `isBelow` (negative stages). Extend: `const tipFlip = (isBelow || pt.stage >= 3) ? 'flip' : '';`
- Also ensure `.tl-section` has `overflow:visible` explicitly
- Add `padding-top:60px` to `.tl-section` to give headroom for any remaining edge cases

### 4. Text fix: "alive" → "active"
**Line 1245:** Change `Above the line — alive. Below it — buried.` → `Above the line — active. Below it — buried.`

### 5. Rename "Graveyard" → "Buried"
All user-facing text changes:

| Location | Line | Old | New |
|---|---|---|---|
| Nav link | ~1185 | `>Graveyard</a>` | `>Buried</a>` |
| Mobile nav | ~1195 | `>Graveyard</a>` | `>Buried</a>` |
| Section rule header | ~1266 | `Objective Graveyard · 3 entries` | `Buried · 3 entries` |
| Inner title | ~1272 | `Graveyard · Sandoz AG` | `Buried · Sandoz AG` |
| Footnote | ~1279 | `Here lie commitments that did not survive...` | Keep text, it still works |
| Anchor IDs | ~1185, 1195, 1266 | `#graveyard` | `#buried` |
| Narrative text | ~1234 | `graveyard` | `buried` (in editorial prose) |

JS variable names (`graveyardData`, `mappedGraveyard`, `liveGraveyard`) — keep as-is (internal, not user-facing).

### 6. Center timeline section
**Problem:** `.tl-section` has no `max-width` or centering. The `.tl-header` is centered (max-width:1200px, margin:0 auto) but the scroll-wrap and canvas are not.

**Fix:**
- Add `max-width:1200px; margin:0 auto; padding:0 1.75rem;` to `.tl-scroll-wrap` (or a wrapping div) to match the rest of the page's content alignment
- The canvas itself (1400px) will overflow and scroll — that's correct behavior, but the scroll container should start aligned with the page content

### 7. Buried section — remove grid background, match page style
**Problem:** `.gy-field` has a distinct background gradient (`#1a1510` → `#151008`) and a `::before` pseudo-element with a repeating grid pattern, plus a `::after` fog overlay.

**Fix:**
- Remove the `background` gradient from `.gy-field` — use `background:var(--bg)` (or remove, inheriting from body)
- Remove `.gy-field::before` (the soil grid pattern) entirely
- Remove `.gy-field::after` (the fog gradient) entirely
- Remove the `border-top` and `border-bottom` from `.gy-field`
- Keep the gravestone card styling (`.stone-shape` with its gradient) — those are individual card styles, not section background
- The section should now look like the objectives section: clean dark background, cards on surface

---

## Files modified
- `frontend/sandoz.html` — all changes are in this single file (CSS + HTML + JS)

## Verification
1. Open `frontend/sandoz.html` in browser
2. Verify layout: Timeline full-width on top, Active Objectives and Buried side by side below
3. Verify "today" marker visible on timeline at correct position
4. Hover nodes at Fly/Orbit status — tooltip should show fully, not clipped
5. Verify metaphor text reads "active" not "alive"
6. Verify all "Graveyard" labels now say "Buried"
7. Verify timeline section is centered with page content
8. Verify Buried section has clean dark background (no grid, no gradient)
9. Resize to 768px — verify sections stack vertically
10. Click objective cards — verify evidence drawers open correctly in the new single-column layout
