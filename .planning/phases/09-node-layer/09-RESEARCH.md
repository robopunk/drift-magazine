# Phase 9: Node Layer — Research

**Researched:** 2026-04-01
**Domain:** SVG node rendering, CSS animation, proximity-bucketed stagger, WCAG contrast
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**A — Icon/Emoji Rendering Approach**
- D-A1: Replace `terminal-proved` and `terminal-buried` emoji (`🏆` `⚰️`) with crisp, custom SVG symbols defined via `<symbol>` in a `<defs>` block and referenced via `<use>`. Symbol designs are minimal geometric marks — not decorative.
- D-A2: For `signal` and `latest` node stage emoji, keep SVG `<text>` but increase fontSize from 12 → 18–20px. Apply `dominantBaseline="central"` and tune per-type `dy` to correct baseline drift.
- D-A3: `stale` and `fiscal-year-end` nodes are purely data indicators — no emoji. Size/style at Claude's Discretion.

**B — Label Visibility**
- D-B1: Remove stage labels from `signal` nodes entirely — dot-only markers.
- D-B2: `latest` node shows full stage label (`🦅 FLY +3`) at fontSize=11, IBM Plex Mono. Only label that must be read at a glance.
- D-B3: `terminal-proved` / `terminal-buried` nodes retain exit label (PROVED / SILENT DROP).
- D-B4: `origin` nodes retain date label (Oct 2023).
- D-B5: No label background rects in this phase — try without first.

**C — Collision / Stagger**
- D-C1: Replace `stackIndex % 2` even/odd stagger with proximity-bucket stagger. Bucket nodes by `Math.round(x / 5)`. Within each bucket, assign tick heights 20, 32, 44, 56px in render order.
- D-C2: Apply proximity bucketing to origin ticks and signal/latest ticks independently.
- D-C3: `cadence` and `fiscal-year-end` nodes are exempt from bucketing (no ticks).

**D — Animation**
- D-D1: CSS `@keyframes` breathing pulse on `latest` node outer halo only. `scale(1.0)→scale(1.08)→scale(1.0)` / `opacity 0.9→1.0→0.9`. Duration 2.5s, ease-in-out, infinite.
- D-D2: Implement via `animateTransform` SVG element or CSS class on wrapping `<g>`. No Framer Motion or GSAP.
- D-D3: No entry/mount animation in Phase 9.

**Node Sizing Baseline (locked)**
- terminal: outer r=10, inner r=6
- origin: outer r=9, inner r=5
- latest: outer r=8, inner r=4 (increase from r=6/r=3)
- signal: outer r=5, inner r=2.5 (reduction from r=6/r=3)
- cadence: r=2
- stale: r=5 (increase from r=4.5)

### Claude's Discretion

- `stale` and `fiscal-year-end` node size/style improvements
- Whether to use CSS class or `animateTransform` for the pulse animation
- Per-emoji `dy` correction values for baseline drift at fontSize 18–20px
- SVG symbol designs for terminal nodes (minimal geometric marks)

### Deferred Ideas (OUT OF SCOPE)

- GSAP cinematic node entry sequence
- Label background pill rects (Phase 10 if contrast insufficient)
- Hover-only label visibility (Phase 10)
- Tooltip redesign (Phase 10)
- Canvas geometry changes (locked Phase 7)
- Path/fill changes (locked Phase 8)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NODE-01 | Node icons enlarged and visually polished (better quality, not emoji-small) | D-A1/D-A2 cover emoji replacement and fontSize increase; sizing baseline defines all radii proportionally |
| NODE-02 | Node decluttering — overlapping labels and ticks handled via smart stacking | D-C1/D-C2 proximity-bucket stagger with 4 height levels; bucket logic computed in TimelineCanvas before render |
| NODE-03 | Content-bearing nodes sized for legibility at normal zoom | D-B2 latest label at fontSize=11; D-B4 origin date at fontSize=8; radii scaled proportionally to icon sizes |
</phase_requirements>

---

## Summary

Phase 9 is a surgical upgrade to `TimelineNode.tsx` and its call site in `TimelineCanvas.tsx`. All decisions are pre-locked in CONTEXT.md. The planner's job is to sequence concrete implementation tasks from a fully-specified contract — no design ambiguity remains.

The three work streams are independent and can be planned as separate tasks: (1) icon/emoji upgrade — replace terminal emoji text with SVG symbols, increase signal/latest emoji fontSize; (2) label declutter — remove labels from signal nodes, bump latest label size; (3) collision stagger — replace `stackIndex % 2` with proximity-bucket logic computed upstream in TimelineCanvas, pass `tickHeight` prop replacing `stackIndex` for tick computation; (4) animation — add `@keyframes node-pulse` to globals.css and apply to latest node outer halos.

One verified constraint not in CONTEXT.md: `var(--muted-foreground)` (#6b7280) on dark mode canvas (#0f172a) produces a 3.69:1 contrast ratio, which fails WCAG AA (4.5:1). Origin date labels and signal labels that use this token must be escalated to `var(--foreground)` in dark mode, or the token value overridden. This is a concrete implementation decision the planner must address.

**Primary recommendation:** Implement in four tasks: (1) SVG symbol defs + terminal node icon swap, (2) signal/latest emoji + radius + label changes, (3) proximity-bucket stagger in TimelineCanvas, (4) pulse animation + CSS token hardcode fixes. Run the existing `TimelineNode.test.tsx` suite after each task — expect test failures on radius assertions and emoji presence; update tests as part of the same commit.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vitest | existing | Test runner | Already in project; `TimelineNode.test.tsx` has 9 tests that will need updating |
| React Testing Library | existing | DOM assertions | Already in project |
| TypeScript + React | existing | Component language | Project standard |

No new dependencies are introduced in this phase. All implementation is within existing SVG/CSS/TypeScript.

**Installation:** none required.

---

## Architecture Patterns

### Recommended File Targets

```
frontend/src/
  app/
    globals.css                    Add @keyframes node-pulse
  components/company/
    TimelineNode.tsx               Primary: all node type renderers
    TimelineCanvas.tsx             Secondary: defs block, stagger computation, stackIndex → tickHeight
  __tests__/components/company/
    TimelineNode.test.tsx          Update: radius assertions, emoji presence, stagger prop rename
```

### Pattern 1: SVG `<symbol>` + `<use>` for terminal icons

**What:** Define `<symbol id="icon-proved">` and `<symbol id="icon-buried">` in a single `<defs>` block inside the `<svg>` root element of TimelineCanvas. Reference them in TimelineNode via `<use href="#icon-proved">`.

**When to use:** Any SVG icon that must render identically across OS/browser and must scale without rasterization. Terminal nodes carry graveyard editorial weight — they cannot blur on browser zoom.

**Where to define:** In `TimelineCanvas.tsx` inside the outermost `<svg>` element, before any path or node groups. Not inside TimelineNode (component renders in a foreign `<g>` and cannot guarantee a local `<defs>` will be hoisted).

**Example (from UI-SPEC.md):**
```xml
<defs>
  <symbol id="icon-proved" viewBox="0 0 12 12">
    <polyline
      points="2,8 6,4 10,8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </symbol>
  <symbol id="icon-buried" viewBox="0 0 12 12">
    <polygon
      points="6,9 2,3 10,3"
      fill="currentColor"
      stroke="none"
    />
  </symbol>
</defs>
```

Usage in TimelineNode:
```xml
<use
  href="#icon-proved"
  x={x - 4}
  y={y - 4}
  width={8}
  height={8}
  color="var(--primary-foreground)"
/>
```

**Critical:** Use `color` attribute (not `fill`) on `<use>` to drive `currentColor` inheritance into symbol paths. `fill="currentColor"` inside the symbol picks up the `color` value from the `<use>` element.

### Pattern 2: Proximity-Bucket Stagger

**What:** Group all rendered nodes by `Math.round(x / 5)` (bucket key). Within each bucket, assign increasing tick heights in render order.

**Where to compute:** In `TimelineCanvas.tsx` in the node rendering loop, before passing props to `<TimelineNode>`. This is the call site that has access to all objectives' node positions simultaneously.

**Current implementation (TimelineCanvas.tsx line 622):**
```typescript
stackIndex={objIdx}
```
This will be replaced. `objIdx` is the objective's position in the map loop — it does not respond to x-proximity.

**Replacement pattern:**
```typescript
// Computed BEFORE the objectiveNodeSets.map render loop
// Two independent bucket maps: one for origin ticks, one for signal/latest ticks
const originBucketCounters = new Map<number, number>();
const signalBucketCounters = new Map<number, number>();
const TICK_HEIGHTS = [20, 32, 44, 56];

// Within the render loop, for each node:
const bucketKey = Math.round(node.x / 5);
const isOriginType = node.type === "origin" || node.type === "terminal-proved" || node.type === "terminal-buried";
const bucketMap = isOriginType ? originBucketCounters : signalBucketCounters;
const rank = bucketMap.get(bucketKey) ?? 0;
bucketMap.set(bucketKey, rank + 1);
const tickHeight = TICK_HEIGHTS[Math.min(rank, TICK_HEIGHTS.length - 1)];
```

**Prop change:** `stackIndex: number` → `tickHeight: number` in `TimelineNodeProps`. The stagger computation moves entirely out of `TimelineNode` into `TimelineCanvas`.

**Note on `terminal-proved`/`terminal-buried`:** These use `originTickH` in the current implementation. They should join the origin bucket for independent stagger assignment since they carry upward ticks like origin nodes.

### Pattern 3: CSS Animation on SVG Element

**What:** Apply `@keyframes node-pulse` via CSS class on the outer halo `<circle>` of `latest` nodes.

**Critical constraint:** CSS `transform` on SVG elements requires `transform-box: fill-box` and `transform-origin: center` to scale around the circle's own centre. Without `transform-box: fill-box`, `transform-origin: center` is relative to the SVG viewport, not the element — the halo will visually jump to the origin.

**Globals.css addition:**
```css
@keyframes node-pulse {
  0%   { transform: scale(1.0); opacity: 0.9; }
  50%  { transform: scale(1.08); opacity: 1.0; }
  100% { transform: scale(1.0); opacity: 0.9; }
}

.node-pulse {
  animation: node-pulse 2.5s ease-in-out infinite;
  transform-box: fill-box;
  transform-origin: center;
}
```

**Fallback:** If `transform-box: fill-box` is unreliable in the target rendering context (old Safari/Firefox on SVG), use SVG native `<animateTransform>` instead:
```xml
<animateTransform
  attributeName="transform"
  type="scale"
  values="1;1.08;1"
  dur="2.5s"
  repeatCount="indefinite"
  additive="sum"
/>
```
`additive="sum"` preserves the existing `translate(cx, cy)` transform context.

### Anti-Patterns to Avoid

- **Defining `<defs>` inside `TimelineNode`:** SVG `<defs>` inside a child `<g>` are valid per spec, but `href="#icon-proved"` inside the same component only works if the `<defs>` is in the same or ancestor SVG context. Since TimelineNode renders into the parent SVG, the defs must live in `TimelineCanvas.tsx`'s SVG root.
- **Using `fill` attribute on `<use>` for currentColor inheritance:** `fill` on `<use>` overrides descendant `fill` but does NOT feed `currentColor`. Use `color` attribute instead.
- **Changing stagger computation inside `TimelineNode`:** The node component only has its own `x` — it cannot see sibling nodes. Bucket computation requires seeing all nodes at once, which only `TimelineCanvas` has.
- **Leaving `stackIndex % 2` logic in TimelineNode after the prop rename:** Remove the `originTickH` / `signalTickH` computation block entirely; replace with direct use of the incoming `tickHeight` prop.
- **Applying pulse animation to the inner circle:** The inner circle is the data marker. Animating it creates the impression the data itself is uncertain. The outer halo is the correct target — it's the decorative layer.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-browser SVG icon consistency | Custom emoji rasterization workarounds | SVG `<symbol>` + `<use>` | Twemoji/Noto full SVG sets are 10MB+; symbols are 4 lines each |
| CSS animation on SVG | Framer Motion `motion.circle` | `@keyframes` + `transform-box: fill-box` | Framer Motion for SVG requires `motion` wrappers and re-renders on every frame; CSS animation is GPU-composited and zero JS overhead |
| Collision detection for labels | Bounding-box overlap sweep | Proximity-bucket stagger (CONTEXT D-C1) | With max 3 objectives and 4 height levels, bucket stagger is O(n) and covers all real-world cases |

**Key insight:** The SVG rendering model for this phase is entirely static geometry with one CSS animation. No layout engine, no measurement, no JS animation loop is needed.

---

## Common Pitfalls

### Pitfall 1: CSS `transform-origin` on SVG circles without `transform-box: fill-box`

**What goes wrong:** `transform-origin: center` on an SVG element defaults to the SVG viewport centre (0, 0 by default in some browsers), not the element's own bounding box centre. Applying `scale(1.08)` causes the halo to drift toward or away from the viewport origin instead of scaling in place.

**Why it happens:** CSS transforms on SVG have historically used the SVG coordinate system, not the element's local box. `transform-box: fill-box` changes the reference box to the element's own geometry.

**How to avoid:** Always pair `animation` on an SVG element with `transform-box: fill-box; transform-origin: center` in the same CSS rule. Or use the SVG-native `<animateTransform additive="sum">` fallback.

**Warning signs:** Pulse animation causes the halo to visibly jump or orbit — not scale in place.

### Pitfall 2: Emoji fontSize increase breaks surrounding geometry without proportional radius scaling

**What goes wrong (documented in existing PITFALLS.md):** Increasing `fontSize` from 12→18 on signal/latest nodes without updating `r`, tick start offsets (`y - r`), and label positions produces emoji that overflows the inner circle and ticks that start at the wrong point.

**How to avoid:** Treat each node type as a geometric unit. Update `r`, `fontSize`, tick `y1` (= `y - r`), and label position in the same atomic change. The UI-SPEC.md already specifies all target values — follow them without partial application.

**Warning signs:** Emoji glyph visually bleeds outside the inner circle at the new fontSize; tick line starts in the wrong position relative to the circle edge.

### Pitfall 3: `tickHeight` prop rename breaks existing tests

**What goes wrong:** `TimelineNode.test.tsx` has 9 tests. One test ("odd stackIndex produces taller tick") tests the current `stackIndex` stagger logic directly. After the rename, it passes `stackIndex` which TimelineNode will no longer use for tick computation — the test will continue to compile but test nothing meaningful (or fail if the prop is removed).

**How to avoid:** Update `TimelineNode.test.tsx` in the same PR as the prop change. Replace the `stackIndex` stagger test with a `tickHeight` prop test: pass `tickHeight={20}` and `tickHeight={56}`, assert the tick's `y2` attribute changes accordingly.

**Additionally:** The test currently asserts `circles[1].getAttribute("r")` to be "3" (signal) and "5" (origin). These assertions will fail after the radius changes (signal inner r=2.5, origin inner r=5 unchanged). Update radius assertions for signal/latest nodes.

**And:** The terminal node tests assert `screen.getByText("🏆")` and `screen.getByText("⚰️")`. After D-A1, these emoji are replaced by `<use>` elements — no text node. Remove those `getByText` assertions; add `querySelector('use[href="#icon-proved"]')` assertion instead.

### Pitfall 4: `var(--muted-foreground)` fails WCAG AA in dark mode

**What goes wrong:** Origin node date labels use `var(--muted-foreground)` (#6b7280). Contrast ratio against dark canvas (#0f172a) is **3.69:1** — below the WCAG AA threshold of 4.5:1 for normal text.

**Verified contrast ratios:**
- `#6b7280` on `#f0f8ff` (light): **4.51:1** — passes AA (barely)
- `#6b7280` on `#0f172a` (dark): **3.69:1** — fails AA
- `#374151` on `#f0f8ff` (light foreground): **9.61:1** — passes AAA
- `#d1d5db` on `#0f172a` (dark foreground): **12.12:1** — passes AAA

**How to avoid:** Origin date labels and any other labels using `var(--muted-foreground)` must use `var(--foreground)` in dark mode. Options: (a) set the dark mode `--muted-foreground` token to a lighter value that passes 4.5:1 (e.g., #9ca3af = 5.74:1 on #0f172a), or (b) conditionally apply `fill="var(--foreground)"` in dark mode for date labels. Option (a) is cleaner — one globals.css change fixes all uses of the token. **Planner must include this as an explicit task.**

**Warning signs:** In dark mode, origin date labels are near-invisible against the deep navy canvas.

### Pitfall 5: Bucket counter reset between render passes

**What goes wrong:** If `originBucketCounters` and `signalBucketCounters` are declared inside the `objectiveNodeSets.map` callback, they reset per objective instead of accumulating across all objectives. This means two objectives with nodes at the same x-position will both get rank=0, both get tick height 20px, and their labels will still collide.

**How to avoid:** Declare the bucket maps *outside* the `.map()` call, before the entire `objectiveNodeSets.map(...)` render block begins. They must accumulate across the entire node population, not per objective.

---

## Code Examples

### Proximity-bucket stagger computation (TimelineCanvas.tsx)

```typescript
// Source: CONTEXT D-C1, D-C2 — computed before objectiveNodeSets.map render loop
const TICK_HEIGHTS = [20, 32, 44, 56] as const;
const originBuckets = new Map<number, number>();
const signalBuckets = new Map<number, number>();

// Pre-pass: assign tickHeight to each node
// (build a Map<nodeIdentifier, tickHeight> keyed by objective.id + node index)
const nodeTickHeights = new Map<string, number>();

for (const { objective, nodes } of objectiveNodeSets) {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const isOriginFamily =
      node.type === "origin" ||
      node.type === "terminal-proved" ||
      node.type === "terminal-buried";
    const bucketMap = isOriginFamily ? originBuckets : signalBuckets;
    const bucketKey = Math.round(node.x / 5);
    const rank = bucketMap.get(bucketKey) ?? 0;
    bucketMap.set(bucketKey, rank + 1);
    nodeTickHeights.set(
      `${objective.id}-${i}`,
      TICK_HEIGHTS[Math.min(rank, TICK_HEIGHTS.length - 1)]
    );
  }
}

// Then in the render loop:
// tickHeight={nodeTickHeights.get(`${objective.id}-${i}`) ?? 20}
```

### `node-pulse` keyframes + class (globals.css)

```css
/* Source: CONTEXT D-D1 — applied to outer halo <circle> of latest nodes */
@keyframes node-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.9;
  }
  50% {
    transform: scale(1.08);
    opacity: 1;
  }
}

.node-pulse {
  animation: node-pulse 2.5s ease-in-out infinite;
  transform-box: fill-box;
  transform-origin: center;
}
```

### Terminal node icon swap (TimelineNode.tsx)

```tsx
// Source: CONTEXT D-A1, UI-SPEC.md SVG Symbol Definitions
// BEFORE (remove):
<text x={x} y={tickTopY - 4} fontSize={12} textAnchor="middle">
  {emoji}
</text>

// AFTER:
<use
  href={isProved ? "#icon-proved" : "#icon-buried"}
  x={x - 4}
  y={y - 4}
  width={8}
  height={8}
  color="var(--primary-foreground)"
/>
```

### Updated TimelineNode props interface

```typescript
// Source: CONTEXT D-C1, UI-SPEC.md
interface TimelineNodeProps {
  type: TimelineNodeType;
  x: number;
  y: number;
  colour: string;
  label?: string;
  dateLabel?: string;
  tickHeight: number;   // replaces stackIndex — tick height pre-computed by caller
  monthsSinceLastSignal?: number;
  onHover?: (e: React.MouseEvent<SVGGElement>) => void;
  onLeave?: () => void;
  onClick?: () => void;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `transform-origin` on SVG without `transform-box` | `transform-box: fill-box` required | CSS Transforms Level 2 (widely supported 2022+) | CSS animations on SVG elements now reliable in modern browsers |
| `animateTransform` SVG-native | CSS animation preferred for simplicity | Evergreen browsers | CSS is cleaner; `animateTransform` remains valid fallback |
| SVG emoji `<text>` | SVG `<symbol>` + `<use>` for precision icons | Established best practice | Symbols scale infinitely; emoji rasterize at declared size |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (existing) |
| Config file | `frontend/vitest.config.ts` |
| Quick run command | `cd frontend && npx vitest run src/__tests__/components/company/TimelineNode.test.tsx` |
| Full suite command | `cd frontend && npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NODE-01 | Terminal nodes use `<use>` not emoji text | unit | `npx vitest run src/__tests__/components/company/TimelineNode.test.tsx` | ✅ (needs update) |
| NODE-01 | signal/latest emoji fontSize 18–20 rendered in SVG | unit | same | ✅ (needs new assertion) |
| NODE-01 | latest outer halo r=8, inner r=4 | unit | same | ✅ (needs updated assertion) |
| NODE-02 | tickHeight=56 produces lower y2 than tickHeight=20 | unit | same | ✅ (replace stackIndex stagger test) |
| NODE-03 | latest label fontSize=11 in text element | unit | same | ✅ (needs new assertion) |
| NODE-03 | signal nodes render NO label text | unit | same | ✅ (needs updated assertion — currently expects label) |

### Sampling Rate

- **Per task commit:** `cd frontend && npx vitest run src/__tests__/components/company/TimelineNode.test.tsx`
- **Per wave merge:** `cd frontend && npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

No new test files required. Existing `TimelineNode.test.tsx` needs assertion updates, not new file creation. The planner must include test updates as part of the implementation tasks — not as a separate wave.

Specific assertions that will break and must be fixed:
- `circles[1].getAttribute("r")` = "3" (signal inner) — will fail; new value is "2.5"
- `screen.getByText("🏆")` on terminal-proved — will fail; emoji removed
- `screen.getByText("⚰️")` on terminal-buried — will fail; emoji removed
- `screen.getByText("🦅 FLY +3")` on signal node — will fail; signal labels removed (D-B1)
- Stagger test using `stackIndex={0}` / `stackIndex={1}` — prop renamed; test needs rewrite with `tickHeight`

---

## Environment Availability

Step 2.6: SKIPPED — this phase is purely code/SVG/CSS changes. No external tools, services, runtimes beyond Node.js (already verified as project dependency).

---

## Project Constraints (from CLAUDE.md)

Directives the planner must verify compliance with:

| Directive | Compliance in Phase 9 |
|-----------|----------------------|
| Never hardcode hex values — use CSS variables | Must fix existing `#f59e0b` hardcodes in stale and fiscal-year-end nodes; replace with `var(--exit-phased)` |
| Typography: DM Sans + Lora + IBM Plex Mono only | All SVG labels use `var(--font-ibm-plex-mono)` — compliant |
| Status colours carry editorial meaning — never decorative | `colour` prop drives node fill from `colourMap`; no direct momentum token classes in TimelineNode — compliant |
| Tailwind utility classes mapped to CSS variables — never hardcode hex | SVG does not use Tailwind classes; CSS variables are the correct mechanism in SVG context — compliant |
| No Framer Motion for this phase | D-D2 explicitly bans Framer Motion — compliant |
| WCAG 2.2 AA | `var(--muted-foreground)` in dark mode fails (3.69:1). Must fix — see Pitfall 4 |

---

## Open Questions

1. **`--muted-foreground` dark mode token value**
   - What we know: Current value #6b7280 fails WCAG AA on dark canvas (3.69:1). Fixing to #9ca3af yields 5.74:1 and passes AA.
   - What's unclear: Whether `--muted-foreground` is used for non-SVG elements where a lighter value would affect other components.
   - Recommendation: Check all usages of `var(--muted-foreground)` in non-timeline components before changing the token. If safe, change the dark mode value in globals.css. If not, scope the fix to SVG `fill` attributes in TimelineNode by using a conditional or a dedicated `--timeline-label-muted` token.

2. **`<use>` `href` vs `xlink:href` browser support**
   - What we know: `href` on `<use>` is the SVG 2.0 standard. `xlink:href` is deprecated but still needed for SVG 1.1 environments (legacy Safari < 13).
   - What's unclear: Production browser targets for Drift.
   - Recommendation: Use `href` only (SVG 2.0). If Safari < 13 support is needed, add `xlinkHref` as well. Given Next.js 15 baseline, modern browsers are the target — `href` is sufficient. Confidence: MEDIUM.

---

## Sources

### Primary (HIGH confidence)

- Source code: `TimelineNode.tsx` — current implementation, all node types, exact line numbers
- Source code: `TimelineCanvas.tsx` lines 580–680 — render loop, `stackIndex` usage, `objectiveNodeSets` structure
- Source code: `globals.css` — all CSS variable values, existing `@keyframes shake` as pattern reference
- Source code: `TimelineNode.test.tsx` — 9 existing tests, exact assertion patterns that will break
- CONTEXT.md — all locked decisions (D-A1 through D-D3, sizing baseline)
- UI-SPEC.md — complete node-by-node visual contract, SVG symbol definitions, stagger table, animation contract
- Verified contrast calculation (computed 2026-04-01): `#6b7280` on `#0f172a` = 3.69:1 (FAILS AA)

### Secondary (MEDIUM confidence)

- MDN Web Docs knowledge: `transform-box: fill-box` required for CSS transforms on SVG elements
- SVG 2.0 spec pattern: `color` attribute on `<use>` drives `currentColor` into symbol paths
- PITFALLS.md — prior research into NODE-01/NODE-02 pitfalls; verified against current source code

### Tertiary (LOW confidence)

- `<animateTransform additive="sum">` as pulse animation fallback — standard SVG 1.1 approach, not independently verified against this codebase's rendering context

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all changes are in existing files
- Architecture: HIGH — all decisions pre-locked; implementation patterns verified against existing code
- Pitfalls: HIGH — Pitfalls 1–5 all verified against actual source code or computed values
- Test impact: HIGH — specific failing assertions identified; no ambiguity about what breaks

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable SVG/CSS domain)
