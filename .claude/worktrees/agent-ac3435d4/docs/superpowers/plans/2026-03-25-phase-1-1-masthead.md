# Phase 1.1 — Masthead Visual Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the Drift masthead with a 3px green top rule, a larger 36px logo wordmark, and a taller h-16 container — then fix the TabBar sticky offset to match.

**Architecture:** Two component edits, no new files, one new test file. `Masthead.tsx` gets the visual changes; `TabBar.tsx` gets a one-line sticky offset fix. Tests verify structure and class presence using React Testing Library.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Vitest, React Testing Library

---

## Context — read before touching code

- **Codebase warning:** This is Next.js 15 with breaking changes. Before writing any Next.js-specific code, read the relevant guide in `frontend/node_modules/next/dist/docs/`. Heed deprecation notices.
- **Fonts:** Never substitute DM Sans, Lora, or IBM Plex Mono. The logo uses Lora (`font-serif`).
- **Colours:** Never hardcode hex values. Use CSS variables: `var(--forced-dark-accent)` for the green in the masthead (forced-dark surface), `var(--forced-dark-bg)` for background.
- **Tailwind:** All sizing via utility classes. `h-16` = 64px, `h-14` = 56px, `text-4xl` = 36px.
- **Run tests from:** `frontend/` directory using `npm test` (Vitest).
- **Roadmap reference:** `2026-03-25-2121-drift-visual-and-intelligence-roadmap.md` at project root. After delivery, update Phase 1.1 status to `✅ Delivered` and commit.

---

## File Map

| Action | File | What changes |
|---|---|---|
| Modify | `frontend/src/components/layout/Masthead.tsx` | Add green rule div, increase logo to `text-4xl`, increase container to `h-16` |
| Modify | `frontend/src/components/company/TabBar.tsx` | Change `top-14` → `top-16` |
| Create | `frontend/src/__tests__/components/layout/Masthead.test.tsx` | New test file |

---

## Task 1: Write failing tests for the new Masthead

**Files:**
- Create: `frontend/src/__tests__/components/layout/Masthead.test.tsx`

- [ ] **Step 1.1: Create the test file**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Masthead } from "@/components/layout/Masthead";

describe("Masthead", () => {
  it("renders the green top rule", () => {
    render(<Masthead />);
    const rule = screen.getByTestId("masthead-rule");
    expect(rule).toBeInTheDocument();
  });

  it("renders logo at large size", () => {
    render(<Masthead />);
    const logo = screen.getByRole("link", { name: /drift/i });
    expect(logo).toHaveClass("text-4xl");
  });

  it("renders logo text as Drift.", () => {
    render(<Masthead />);
    expect(screen.getByRole("link", { name: /drift/i })).toHaveTextContent("Drift.");
  });

  it("renders all nav items", () => {
    render(<Masthead />);
    expect(screen.getByRole("link", { name: "Companies" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Buried" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "About" })).toBeInTheDocument();
  });

  it("logo links to home", () => {
    render(<Masthead />);
    expect(screen.getByRole("link", { name: /drift/i })).toHaveAttribute("href", "/");
  });
});
```

- [ ] **Step 1.2: Run tests to confirm they fail**

```bash
cd frontend && npm test -- --reporter=verbose src/__tests__/components/layout/Masthead.test.tsx
```

Expected: `FAIL` — `masthead-rule` not found, logo does not have class `text-4xl`.

---

## Task 2: Implement Masthead changes

**Files:**
- Modify: `frontend/src/components/layout/Masthead.tsx`

- [ ] **Step 2.1: Add green top rule and update container height**

Replace the `<header>` opening tag and its inner container. The green rule is a `div` rendered as the first child of `<header>`, before the flex container.

Current `<header>` and container:
```tsx
<header className="bg-[var(--forced-dark-bg)] text-[var(--forced-dark-text)] sticky top-0 z-50">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
```

Replace with:
```tsx
<header className="bg-[var(--forced-dark-bg)] text-[var(--forced-dark-text)] sticky top-0 z-50">
  <div data-testid="masthead-rule" className="h-[3px] bg-[var(--forced-dark-accent)]" />
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
```

- [ ] **Step 2.2: Increase logo size**

Current logo link:
```tsx
<Link href="/" className="font-serif text-xl font-bold text-white tracking-tight">
  Drift<span className="text-[var(--forced-dark-accent)]">.</span>
</Link>
```

Replace with:
```tsx
<Link href="/" className="font-serif italic text-4xl font-bold text-white tracking-tight leading-none">
  Drift<span className="text-[var(--forced-dark-accent)]">.</span>
</Link>
```

- [ ] **Step 2.3: Run tests to confirm they pass**

```bash
cd frontend && npm test -- --reporter=verbose src/__tests__/components/layout/Masthead.test.tsx
```

Expected: all 5 tests `PASS`.

- [ ] **Step 2.4: Commit Masthead changes**

```bash
cd frontend && git add src/components/layout/Masthead.tsx src/__tests__/components/layout/Masthead.test.tsx
git commit -m "feat(masthead): add green top rule, increase logo to 36px, h-16 container"
```

---

## Task 3: Fix TabBar sticky offset

**Files:**
- Modify: `frontend/src/components/company/TabBar.tsx:24`

- [ ] **Step 3.1: Write failing test for TabBar offset**

Open `frontend/src/__tests__/components/company/TabBar.test.tsx` and add one test to the existing suite:

```tsx
it("uses top-16 sticky offset to clear the taller masthead", () => {
  // Render with minimal required props — check existing test file for the
  // props TabBar requires and match them here
  const { container } = render(<TabBar /* existing props */ />);
  const stickyEl = container.querySelector(".sticky");
  expect(stickyEl).toHaveClass("top-16");
});
```

> Note: Check the existing `TabBar.test.tsx` to see how TabBar is rendered (what props it needs) and replicate the same setup. Do not guess prop names.

- [ ] **Step 3.2: Run test to confirm it fails**

```bash
cd frontend && npm test -- --reporter=verbose src/__tests__/components/company/TabBar.test.tsx
```

Expected: `FAIL` — element has class `top-14`, not `top-16`.

- [ ] **Step 3.3: Update TabBar sticky offset**

In `frontend/src/components/company/TabBar.tsx`, find the sticky container (line ~24):

```tsx
<div className="border-b border-border sticky top-14 z-40 bg-background">
```

Change `top-14` → `top-16`:

```tsx
<div className="border-b border-border sticky top-16 z-40 bg-background">
```

- [ ] **Step 3.4: Run full test suite to confirm nothing broke**

```bash
cd frontend && npm test
```

Expected: all tests `PASS`. If any unrelated tests fail, investigate before committing.

- [ ] **Step 3.5: Commit TabBar fix**

```bash
cd frontend && git add src/components/company/TabBar.tsx src/__tests__/components/company/TabBar.test.tsx
git commit -m "fix(tabbar): update sticky offset top-14 → top-16 for taller masthead"
```

---

## Task 4: Visual verification

- [ ] **Step 4.1: Start the dev server**

```bash
cd frontend && npm run dev
```

- [ ] **Step 4.2: Verify in browser**

Open `http://localhost:3000` and confirm:
- A 3px green line appears at the very top of the page, above the masthead
- Logo reads `Drift.` at noticeably larger size (36px) with the period in green
- Masthead height feels comfortable — logo is vertically centred
- Navigate to a company page (e.g. `/company/sdz`) and confirm the TabBar sits flush below the masthead with no gap or overlap

- [ ] **Step 4.3: Check dark/light mode**

Toggle the theme and confirm the green rule and logo period remain green in both modes (they use `var(--forced-dark-accent)` which is always the accent on the forced-dark surface).

---

## Task 5: Update roadmap and wrap up

- [ ] **Step 5.1: Update roadmap status**

Open `2026-03-25-2121-drift-visual-and-intelligence-roadmap.md` at project root.

Change Phase 1.1 row from:
```
| 1.1 | Masthead — green top rule, 36px Lora logo, h-16 height | `Masthead.tsx` | ⬜ Pending |
```
To:
```
| 1.1 | Masthead — green top rule, 36px Lora logo, h-16 height | `Masthead.tsx` | ✅ Delivered |
```

Also add a row to the Delivery log at the bottom:
```
| 2026-03-25 | 1.1 | Masthead green rule, 36px logo, h-16, TabBar offset fix |
```

- [ ] **Step 5.2: Commit roadmap update**

```bash
git add 2026-03-25-2121-drift-visual-and-intelligence-roadmap.md
git commit -m "docs(roadmap): mark Phase 1.1 delivered"
```

---

## Done

Phase 1.1 is complete. Return to the user and await instruction to proceed with Phase 1.2 (path rendering).

**Do not start Phase 1.2 without explicit user approval.**
