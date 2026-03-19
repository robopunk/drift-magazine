# Drift Full Dark Redesign — Caffeine Palette (v1)

## Context

Drift currently uses a light warm parchment theme (`#F4EFE4` base). The user wants a **full dark redesign** across all frontend pages, inspired by the [Caffeine shadcn theme](https://21st.dev/community/themes/caffeine) — a coffee-inspired dark palette with espresso darks, crema highlights, and roasted amber accents. Typography (Playfair Display + Source Serif 4 + JetBrains Mono) is preserved. Momentum spectrum and status badge colors are editorial/semantic and preserved in meaning, adapted for dark backgrounds.

**Recommended execution model:** Sonnet — this is structured CSS refactoring with a fully specified token map; no creative ambiguity remains.

---

## Caffeine Theme Reference (from 21st.dev)

### Dark mode palette (primary)
```css
.dark {
  --card: #191919;
  --ring: #ffe0c2;
  --input: #484848;
  --muted: #222222;
  --accent: #2a2a2a;
  --border: #201e18;
  --primary: #ffe0c2;        /* crema — hero accent */
  --secondary: #393028;      /* warm dark brown */
  --background: #111111;     /* espresso dark base */
  --foreground: #eeeeee;     /* light text */
  --destructive: #e54d2e;
  --muted-foreground: #b4b4b4;
  --primary-foreground: #081a1b;
  --secondary-foreground: #ffe0c2;
  --chart-1: #ffe0c2;
  --chart-2: #393028;
  --chart-3: #2a2a2a;
  --chart-4: #42382e;
  --chart-5: #ffe0c1;
}
```

### Light mode palette (reference only)
```css
:root {
  --card: #fcfcfc;
  --ring: #644a40;
  --input: #d8d8d8;
  --muted: #efefef;
  --accent: #e8e8e8;
  --border: #d8d8d8;
  --primary: #644a40;
  --secondary: #ffdfb5;
  --background: #f9f9f9;
  --foreground: #202020;
  --destructive: #e54d2e;
  --muted-foreground: #646464;
  --primary-foreground: #ffffff;
  --secondary-foreground: #582d1d;
}
```

---

## Token Mapping (Old Light → New Caffeine Dark)

### Backgrounds & Surfaces

| Token | Old | New | Source |
|---|---|---|---|
| `--bg` | `#F4EFE4` | `#111111` | Caffeine `background` |
| `--bg-deep` | *(new)* | `#0d0d0d` | For masthead/footer (replaces `--ink`-as-bg pattern) |
| `--surface` | `#FDFBF7` | `#191919` | Caffeine `card` |
| `--surface2` | `#F0EAD8` | `#222222` | Caffeine `muted` |
| `--surface3` | `#E8E0CC` | `#2a2a2a` | Caffeine `accent` |

### Text (Inverted)

| Token | Old | New |
|---|---|---|
| `--ink` | `#1C1917` | `#eeeeee` |
| `--ink-light` | `#44403C` | `#cccccc` |
| `--ink-muted` | `#78716C` | `#999999` |
| `--ink-faint` | `#A8A29E` | `#666666` |
| `--ink-ghost` | `#D4C9B8` | `#444444` |
| `--parchment` | `#F6F1E7` | `#eeeeee` |

### Brand Accent (Gold → Crema)

| Token | Old | New |
|---|---|---|
| `--gold` | `#A0782A` | `#ffe0c2` |
| `--gold-light` | `#C4962E` | `#ffe0c2` |
| `--gold-pale` | `#F0E6C8` | `#393028` |
| `--rule` | `#D4C9A8` | `#2a2520` |
| `--border` | `rgba(154,110,32,.18)` | `rgba(255,224,194,.12)` |
| `--border2` | `rgba(154,110,32,.28)` | `rgba(255,224,194,.22)` |

### Shadows (Darker for dark theme)

| Token | New |
|---|---|
| `--shadow-sm` | `0 2px 6px rgba(0,0,0,.35), 0 1px 2px rgba(0,0,0,.25)` |
| `--shadow-md` | `0 6px 20px rgba(0,0,0,.4), 0 2px 6px rgba(0,0,0,.3)` |
| `--shadow-lg` | `0 12px 40px rgba(0,0,0,.5), 0 4px 12px rgba(0,0,0,.35)` |
| `--shadow-gold` | `0 0 24px rgba(255,224,194,.08)` |

### Status Badges (Dark-mode variants)

| Status | Old bg | New bg | New text |
|---|---|---|---|
| On Record | `#D8F3DC` | `#0f2b1f` | `#4ade80` |
| Watch / Drift | `#FDE8C8` | `#2a1a05` | `#f59e0b` |
| Dropped | `#FADBD8` | `#1e0a0a` | `#f87171` |
| Morphed | `#D6EAF8` | `#0a1e2e` | `#60a5fa` |

### Graveyard Exit Badges (Dark variants)

| Manner | New bg | New text | New border |
|---|---|---|---|
| Silent Drop | `#2a1010` | `#f87171` | `#4a2020` |
| Morphed | `#0a1e2e` | `#60a5fa` | `#1a3a5a` |
| Phased Out | `#2a1a05` | `#fbbf24` | `#4a3010` |
| Transparent Exit | `#0a2018` | `#4ade80` | `#1a4030` |

### Transparency Score Badges (Dark variants)

| Score | New bg | New text |
|---|---|---|
| Very Low | `#2a1010` | `#f87171` |
| Low | `#2a1505` | `#fb923c` |
| Medium | `#2a1a05` | `#fbbf24` |
| High | `#0a2018` | `#4ade80` |

### Preserved (No Change)

- **Momentum spectrum colors** (+4 Orbit → -4 Buried) — editorial/semantic
- **Momentum SVG icon animations** — same cubic-bezier, same patterns
- **Typography** — Playfair Display, Source Serif 4, JetBrains Mono
- **Animation easing** — `cubic-bezier(.23,1,.32,1)`

---

## Implementation Order

### Phase 1: `frontend/sandoz.html` (reference implementation)

This is the most complex file (2,260 lines) and sets the pattern for all others.

1. **`:root` token block** (~lines 12-75) — Replace all token values per mapping above. Add `--bg-deep: #0d0d0d`.
2. **Fix `--ink`-as-background pattern** — The old code uses `var(--ink)` as background for masthead, footer, mobile drawer, company mark, evidence drawer header. Replace all with `var(--bg-deep)`:
   - `.mast` background
   - `.mobile-drawer` background
   - `.co-mark` background
   - `.ev-drawer-head` background
   - `.site-footer` background
3. **Replace hardcoded `background:white`** (~3 instances) → `background:var(--surface)`
4. **Replace ~30 hardcoded `rgba()` values** that bypass the token system:
   - `rgba(253,251,247,...)` (tooltip bg) → `rgba(25,25,25,...)`
   - `rgba(244,239,228,...)` (atmosphere) → `rgba(17,17,17,...)`
   - `rgba(212,201,168,...)` (hamburger, borders) → `rgba(255,224,194,...)`
   - `rgba(154,110,32,...)` (ground line, scrollbar) → `rgba(255,224,194,...)` with halved alphas
   - `rgba(26,22,18,...)` (time axis, soil grid) → `rgba(255,255,255,...)` with low alphas
5. **Graveyard soil gradient** — `linear-gradient(to bottom, #E8E0CC, #DDD2B8, #E4D5B8)` → `linear-gradient(to bottom, #1a1510, #151008, #1a1510)`
6. **Gravestone shapes** — stone gradient from light warm → dark warm: `linear-gradient(160deg, #2a2520, #222018)`
7. **Timeline atmosphere gradient** — Replace green/warm gradient with dark atmospheric equivalent using subtle crema glow near ground line
8. **Status badges, manner badges, transparency badges** — Apply dark-mode variant colors
9. **JS hardcoded colors** — Fix SVG icon fills (`#F4EFE4` → `#333`, `#A0782A` → `#ffe0c2`), fix fallback greys (`#555` → `#444`)
10. **Add `<meta name="color-scheme" content="dark">`** to `<head>`
11. **Add `::selection` styling** — `background: rgba(255,224,194,.25); color: #eeeeee`

### Phase 2: `frontend/index.html`

1. **`:root` token block** — Same mapping as sandoz.html
2. **Fix `--ink`-as-background** — masthead, mobile nav, footer, card logo, `.sector-btn.active`
3. **Hero section** — Button `.btn-primary` text changes from light (`#FDFBF7`) to dark (`#111111`) since the crema button is now the accent
4. **Search input** — Verify dark styling for background, placeholder, autofill
5. **Company cards** — Replace `background:white` → `var(--surface)`
6. **Sector btn active** — Change from `background:var(--ink)` to `background:var(--gold);color:#111111`
7. **Hardcoded rgba values** — Same pattern as sandoz.html
8. **Meta tag + selection styling**

### Phase 3: `frontend/admin.html`

Already dark but uses different base values. Alignment:

| Token | Current Admin | New |
|---|---|---|
| `--bg` | `#0D0B08` | `#111111` |
| `--surface` | `#141210` | `#191919` |
| `--surface2` | `#1C1916` | `#222222` |
| `--surface3` | `#242018` | `#2a2a2a` |
| `--gold` | `#C4962E` | `#ffe0c2` |
| `--ink` | `#F0E8D4` | `#eeeeee` |

Smaller diff — mostly token value swaps.

### Phase 4: `frontend/timeline-concept.html`

Same core token mapping. Check for hardcoded rgba values in timeline rendering CSS.

### Phase 5: `brand/colour-palette.html`

Update the design token reference to document Caffeine dark as the canonical palette. Update all swatch hex values and demo visuals.

### Phase 6: Documentation

Update `CLAUDE.md` token tables and design rules to reflect the new dark-first palette.

---

## Critical Gotcha: `--ink` as Background

The single most impactful change is that `--ink` flips from `#1C1917` (dark) to `#eeeeee` (light). Everywhere the old code uses `var(--ink)` as a **background color** will break. The fix is introducing `--bg-deep: #0d0d0d` and replacing all `background:var(--ink)` usages with `background:var(--bg-deep)`.

**Affected locations across all files:**
- Mastheads, footers, mobile drawers, company marks, evidence drawer headers, active sector buttons, card logo circles

---

## Verification

### Per-page checklist
1. Token propagation — DevTools confirms `--bg` renders as `#111111`
2. No white flashes — search for remaining `white`, `#fff`, `#FDFBF7`, `#F4EFE4`
3. Text contrast — body text 15.9:1, card text 13.8:1, muted text 4.6:1 (all pass WCAG AA)
4. Crema accent — visible on ground line, brand mark period, and accent elements only
5. Status/momentum badges — readable with dark backgrounds
6. Graveyard — gravestones, manner badges, transparency badges render correctly
7. Hover states — card lifts show as subtle shadow changes
8. Tooltips — dark bg with visible borders
9. Timeline scrollbar — custom colors updated
10. Native scrollbar — dark via `color-scheme: dark` meta tag

### Contrast spot-checks

| Element | Background | Text Color | Ratio |
|---|---|---|---|
| Body text | `#111111` | `#eeeeee` | 15.9:1 |
| Card text | `#191919` | `#eeeeee` | 13.8:1 |
| Muted text on card | `#191919` | `#999999` | 4.6:1 |
| Faint labels on card | `#191919` | `#666666` | 2.8:1 (AA large) |
| Crema on dark bg | `#111111` | `#ffe0c2` | 12.5:1 |
| Status green text | `#0f2b1f` | `#4ade80` | ~5.5:1 |
| Status red text | `#1e0a0a` | `#f87171` | ~6.2:1 |

### Browser testing
- Chrome, Firefox, Edge on Windows
- Custom scrollbar rendering, SVG momentum icons on dark, form input dark styling

---

## Files Modified

| File | Complexity | Key Changes |
|---|---|---|
| `frontend/sandoz.html` | High | Full token swap, ~30 rgba replacements, graveyard/timeline gradients, JS color fixes |
| `frontend/index.html` | Medium | Token swap, hero buttons, search input, company cards, sector buttons |
| `frontend/admin.html` | Low | Align existing dark tokens to Caffeine values |
| `frontend/timeline-concept.html` | Low | Token swap, timeline-specific rgba values |
| `brand/colour-palette.html` | Medium | Update all swatch demos and token reference values |
| `CLAUDE.md` | Low | Update inline token tables and design rules |
