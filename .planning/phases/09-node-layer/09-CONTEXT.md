# Phase 9: Node Layer — Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Upgrade `TimelineNode.tsx` so node markers are legible at default zoom and don't visually collide when multiple objectives share the same x-position. This phase modifies `TimelineNode.tsx` and its call site in `TimelineCanvas.tsx` — no canvas geometry changes (locked in Phase 7), no path/fill changes (locked in Phase 8), no tooltip redesign (Phase 10).

</domain>

<decisions>
## Implementation Decisions

### A — Icon/Emoji Rendering Approach
- **D-A1:** Replace `terminal-proved` and `terminal-buried` emoji (`🏆` `⚰️`) with crisp, custom SVG symbols defined via `<symbol>` in a `<defs>` block and referenced via `<use>`. These nodes carry editorial weight and must render identically across OS/browser. Symbol designs should be minimal geometric marks — not decorative.
- **D-A2:** For `signal` and `latest` node stage emoji (e.g. `🦅`, `🚶`), keep SVG `<text>` but increase fontSize from 12 → 18–20px. Apply `dominantBaseline="central"` and tune per-type vertical alignment to correct baseline drift at larger sizes.
- **D-A3:** `stale` (!) and `fiscal-year-end` nodes are purely data indicators — no emoji involved; size/style improvements at Claude's Discretion.

### B — Label Visibility Strategy
- **D-B1:** Remove stage labels from `signal` nodes entirely — they render as dot-only markers (no text).
- **D-B2:** `latest` node (most recent signal per objective) shows the full stage label (`🦅 FLY +3`) at fontSize=11 using IBM Plex Mono. This is the only label that needs to be read at a glance.
- **D-B3:** `terminal-proved` and `terminal-buried` nodes retain their exit label (e.g. "PROVED", "SILENT DROP") — these are editorial markers and must remain visible.
- **D-B4:** `origin` nodes retain their date label (e.g. "Oct 2023") — context for when the commitment was first stated.
- **D-B5:** No label background rects in this phase — try without first. If contrast is insufficient after visual review, add in Phase 10.

### C — Collision / Stagger Strategy
- **D-C1:** Replace the current objective-index-based even/odd stagger with **proximity-bucket stagger**. Bucket nodes by `Math.round(x / 5)` (5px precision). Within each bucket, assign increasing tick heights in render order: 20, 32, 44, 56px. Objective index is irrelevant — only x-position proximity matters.
- **D-C2:** Apply proximity bucketing to both `origin` tick heights and `signal/latest` tick heights independently (they have different base heights).
- **D-C3:** `cadence` and `fiscal-year-end` nodes have no ticks — exempt from bucketing.

### D — Animation
- **D-D1:** Add a slow CSS `@keyframes` breathing pulse to the `latest` node per objective only. Target: `transform: scale(1.0) → scale(1.08) → scale(1.0)` with `opacity: 0.9 → 1.0 → 0.9`. Duration: ~2.5s, ease-in-out, infinite. Signals "live data" without distraction.
- **D-D2:** Implement via `animateTransform` SVG element or a CSS class on the wrapping `<g>` — whichever is cleaner with the existing SVG rendering model. No Framer Motion or GSAP for this phase.
- **D-D3:** No entry/mount animation in Phase 9. GSAP-based cinematic node entry sequence is noted as a future enhancement (deferred).

### Node Sizing Baseline (Claude's Discretion)
- Terminal nodes: outer halo r=10, inner r=6 — retain, already the best-sized
- Origin nodes: outer halo r=9, inner r=5 — retain
- Latest nodes: outer halo r=8, inner r=4 — slight increase from current r=6/r=3
- Signal nodes: outer halo r=5, inner r=2.5 — slight reduction to de-emphasise vs latest
- Cadence: r=2 dot — retain (intentionally invisible; marks time cadence only)
- Stale: r=5 circle — slight increase from r=4.5

### NotebookLM Research Integration
The following principles from the NotebookLM architectural research inform this phase:
- **Tactile depth over flat design** — node halos (outer/inner circle pairs) create the layered depth. Retain and refine.
- **Calm UI** — label noise reduction (B1) follows this directly: reduce visual noise, prioritize long-term readability.
- **GSAP for complex SVG** — acknowledged but deferred. Phase 9 uses CSS animation only (D2).
- **CSS design tokens** — no hardcoded hex values; use `var(--foreground)`, `var(--border)`, `var(--muted-foreground)` and the objective colour prop throughout.
- **WCAG 2.2 AA** — label text on SVG background must maintain ≥4.5:1 contrast. IBM Plex Mono labels use `var(--foreground)` or the objective `colour` — verify both pass in light and dark mode.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Source files (files to modify in this phase)
- `frontend/src/components/company/TimelineNode.tsx` — all node type renderers; primary file for this phase
- `frontend/src/components/company/TimelineCanvas.tsx` — call site; `stackIndex` logic lives here; proximity-bucket stagger computed here and passed down

### Phase 7 & 8 geometry baseline (do not change)
- `.planning/phases/07-canvas-geometry-foundation/07-CONTEXT.md` — locked constants (GROUND_Y=335, CANVAS_HEIGHT=650, HORIZONTAL_PADDING=40)
- `.planning/phases/08-path-fill-fixes/08-CONTEXT.md` — locked path/fill architecture; deferred note about icon style confirmed as Phase 9 scope

### Project planning
- `.planning/REQUIREMENTS.md` — NODE-01, NODE-02, NODE-03 acceptance criteria
- `.planning/ROADMAP.md` §Phase 9 — success criteria and dependency notes

### Brand & design
- `docs/specs/2026-03-19-drift-v2-design.md` — canonical v2 design spec; typography, colour tokens, motion rules
- `brand/brand-language.html` — momentum stage definitions and emoji assignments (authoritative source for which emoji maps to which stage)

</canonical_refs>

<code_context>
## Existing Code Insights

### Current Node Types (TimelineNode.tsx)
Six types rendered via conditional branches:
1. `cadence` — `<circle r=2>` dot, no interaction, no label
2. `stale` — `<circle r=4.5>` with `!` text at fontSize=7, amber colour
3. `fiscal-year-end` — `<circle r=3.5>` amber dot
4. `terminal-proved` / `terminal-buried` — outer r=10 + inner r=6 + emoji text at fontSize=12 + stage label
5. `origin` — outer r=9 + inner r=5 + dashed tick + date label at fontSize=8
6. `signal` / `latest` — outer r=6 + inner r=3 + solid/dashed tick + stage label at fontSize=9/9.5

### Stagger Pattern (TimelineCanvas.tsx line 622)
`stackIndex={objIdx}` — passed as 0-based objective index. In TimelineNode: `originTickH = stackIndex % 2 === 0 ? 24 : 40`. Replace this with proximity-bucket logic computed in TimelineCanvas before passing down.

### Integration Points
- `TimelineCanvas.tsx` line 580–670 — the node rendering loop; `stackIndex` computed here and passed to each `TimelineNode`
- `colourMap` — Map<objectiveId, hex> — source of the `colour` prop per objective
- `scoreToStage()` + `getStage()` — used to derive `stageInfo.emoji` and `stageInfo.label` for the stage label string
- `EXIT_MANNER_LABELS_CANVAS` — maps exit_manner to canvas display label for terminal nodes
- `latestSignalIdx` — already computed per objectiveNodeSet; identifies which signal node gets the `latest` effectiveType

### CSS Variables in Use (do not break)
- `var(--foreground)` — latest node tick and label
- `var(--border)` — signal node tick
- `var(--muted-foreground)` — signal/origin labels
- `var(--font-ibm-plex-mono)` — all label text

</code_context>

<specifics>
## Specific Ideas

- **SVG symbol design for terminal nodes:** Think minimal — `terminal-proved` could be a simple upward chevron or star outline; `terminal-buried` could be a downward-pointing filled triangle or simple X. Match editorial weight, not emoji expressiveness. Reference `brand/brand-language.html` for graveyard exit classification system.
- **Pulse animation target:** Apply pulse to the outer halo circle of `latest` nodes (the semi-transparent ring), not the inner filled circle. This creates a soft breathing effect that draws the eye without moving the data marker itself.

</specifics>

<deferred>
## Deferred Ideas

- **GSAP cinematic node entry sequence** — nodes stagger in from bottom after path draws. Requires GSAP dependency (~30KB). High visual impact but out of Phase 9 scope. Candidate for v4.3 or a dedicated animation phase.
- **Label background rects** — pill-shaped semi-transparent rect behind stage labels for contrast. Try without first (Phase 9). Add in Phase 10 if legibility falls short after visual review.
- **Hover-only labels** — hiding labels entirely until hover (Phase 10 tooltip redesign owns this interaction model).

</deferred>

---

*Phase: 09-node-layer*
*Context gathered: 2026-04-01*
