# Phase 8: Path & Fill Fixes - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-30
**Phase:** 08-path-fill-fixes
**Areas discussed:** Fill split technique, Spline character at steep transitions, isBelowGround prop fate

---

## Fill Split Technique

| Option | Description | Selected |
|--------|-------------|----------|
| Overlap clip rects | Extend aboveId rect height by +1px and belowId rect starts -1px earlier. One-liner fix, zero structural change. | ✓ |
| Geometric split — two separate polygons | Compute where the spline crosses groundY, produce one closed polygon for above and one for below. No clipPath needed. Correct at crossing points but significantly more code. | |
| You decide | Leave the approach entirely to the planner. | |

**User's choice:** Overlap clip rects (Recommended)
**Notes:** Minimal change preferred. Structural rewrite not warranted for a 1px anti-aliasing artifact.

---

### Clip rect dimensions sub-question

| Option | Description | Selected |
|--------|-------------|----------|
| Fix clip rect dimensions too | Pass canvasWidth and canvasHeight as props so clip rects are properly bounded. | ✓ |
| Leave the 10000 magic number | Not causing visible bugs — fix only the 1px red strip. | |

**User's choice:** Fix clip rect dimensions too (Recommended)

---

## Spline Character at Steep Transitions

| Option | Description | Selected |
|--------|-------------|----------|
| Keep current Bezier, just verify it | 0.4/0.6 horizontal cubic Bezier mathematically cannot overshoot vertically. Keep it, add a test. | |
| Switch to Catmull-Rom | Uses neighboring points to compute tangents — curves look more natural across multi-point sequences. | ✓ |
| Adaptive tension | Reduces the 0.4/0.6 factor when adjacent points are close. Good middle ground. | |

**User's choice:** Switch to Catmull-Rom
**Notes:** More natural-looking trajectories preferred over minimal change.

---

### 2-point edge case

| Option | Description | Selected |
|--------|-------------|----------|
| Fall back to current Bezier for 2-point paths | Clean edge case handling — Catmull-Rom requires neighbors. | |
| Draw a straight line for 2-point paths | Two points, one segment, no curve needed. | ✓ |

**User's choice:** Straight line for 2-point paths
**Notes:** More honest for sparse data.

---

## isBelowGround Prop Fate

| Option | Description | Selected |
|--------|-------------|----------|
| Remove it entirely | Dead code — component determines above/below via clipPath already. | ✓ |
| Repurpose as fill guard | Use it to gate whether red fill renders at all. | |
| Leave it as-is | Harmless — don't touch it in this phase. | |

**User's choice:** Remove it entirely (Recommended)

---

## Deferred Ideas

- **Icon style and size of nodes** — out of scope for Phase 8 (path/fill only). Deferred to Phase 9 (Node Layer).
