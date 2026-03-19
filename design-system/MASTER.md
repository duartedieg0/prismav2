# Design System — MASTER

**Project:** Adapte Minha Prova (PRISMA)
**Version:** 1.0
**Date:** 2026-03-18
**Owner:** PRISMA Team

This document is the authoritative source of truth for the visual design system used across the PRISMA platform. All components, pages, and specs must reference these tokens and guidelines. Tokens are implemented as CSS custom properties in `app/globals.css` and mapped to Tailwind CSS v3 in `tailwind.config.ts`. No hardcoded colors, font sizes, or spacing values are permitted in component code.

---

## 1. Style Philosophy

**Minimalism — Professional SaaS for Education**

The PRISMA interface is designed for Brazilian school teachers who need to accomplish a focused task (adapting an exam) as efficiently as possible. The visual style reflects:

- **Clarity over decoration**: Every visual element must serve a function. No decorative shapes, gradients, or patterns.
- **Trust through restraint**: Neutral palette with a single indigo accent communicates professionalism and reliability — appropriate for an educational institution context.
- **Content primacy**: Typography and whitespace carry the interface. Generous spacing lets content breathe without competing visual elements.
- **Accessibility by default**: Color choices, contrast ratios, and interactive element sizing meet WCAG 2.2 AA at minimum.

---

## 2. Color Palette

All colors are defined via CSS custom properties (HSL format) in `app/globals.css` and consumed exclusively through Tailwind design token classes. Hardcoded color values (e.g., `text-[#4F46E5]`, `bg-indigo-600`) are forbidden in component code (GUD-001).

### 2.1 Semantic Token Mapping

| Token | CSS Variable | Light Mode Value | Description |
|-------|-------------|-----------------|-------------|
| `bg-background` | `--background` | `0 0% 98%` (off-white `#FAFAFA`) | Page and app background |
| `text-foreground` | `--foreground` | `222 47% 11%` (near-black `#0F172A`) | Primary body and heading text |
| `bg-primary` | `--primary` | `239 84% 60%` (indigo `#4F46E5`) | CTA buttons, active states, links |
| `text-primary` | `--primary` | — | Accent text (same token, text utility) |
| `bg-primary-foreground` | `--primary-foreground` | `0 0% 100%` (white) | Text on primary-colored backgrounds |
| `bg-muted` | `--muted` | `220 14% 96%` (light gray `#F1F5F9`) | Subtle section backgrounds, disabled states |
| `bg-muted/30` | `--muted` at 30% opacity | — | Very subtle section differentiation |
| `text-muted-foreground` | `--muted-foreground` | `215 20% 45%` (medium gray `#64748B`) | Secondary text, descriptions, captions |
| `bg-card` | `--card` | `0 0% 100%` (white) | Card surfaces |
| `text-card-foreground` | `--card-foreground` | `222 47% 11%` (near-black) | Text on card backgrounds |
| `border` | `--border` | `214 32% 91%` (light border `#E2E8F0`) | Card borders, dividers, input borders |
| `ring` | `--ring` | `239 84% 60%` (indigo) | Focus rings on interactive elements |
| `bg-destructive` | `--destructive` | `0 84% 60%` (red `#EF4444`) | Error states, destructive actions |
| `text-destructive` | `--destructive` | — | Error text |
| `bg-accent` | `--accent` | `235 100% 96%` (indigo tint `#EEF2FF`) | Hover states, selected backgrounds |

### 2.2 Raw Palette Reference (do not use directly in components)

| Swatch | Hex | HSL | Role |
|--------|-----|-----|------|
| Off-white | `#FAFAFA` | `0 0% 98%` | Background |
| Near-black | `#0F172A` | `222 47% 11%` | Foreground |
| Indigo Primary | `#4F46E5` | `239 84% 60%` | Primary accent |
| Indigo Muted | `#EEF2FF` | `235 100% 96%` | Accent/muted tint |
| Slate 400 | `#94A3B8` | `215 20% 65%` | Placeholder text |
| Slate 500 | `#64748B` | `215 20% 45%` | Muted foreground |
| Slate 200 | `#E2E8F0` | `214 32% 91%` | Border |
| Slate 100 | `#F1F5F9` | `220 14% 96%` | Muted background |
| White | `#FFFFFF` | `0 0% 100%` | Card background, primary foreground |
| Red 500 | `#EF4444` | `0 84% 60%` | Destructive / error |

### 2.3 Dark Mode

Dark mode tokens are defined in `app/globals.css` under `.dark { }`. The same token names apply — components never need dark-mode-specific code when using design tokens correctly.

---

## 3. Typography

**Font family:** Inter (from `next/font/google`), falling back to `system-ui, -apple-system, sans-serif`.

Inter is chosen for:
- Excellent legibility at small sizes (14px body text) in PT-BR
- Comprehensive weight range (400–700) available via `next/font`
- Neutral, professional character appropriate for SaaS tooling

### 3.1 Type Scale

| Role | Size | Line Height | Weight | Token / Class |
|------|------|-------------|--------|---------------|
| Hero | 48px (`3rem`) | 1.1 | 700 Bold | `text-5xl font-bold` |
| h1 | 32px (`2rem`) | 1.25 | 700 Bold | `text-4xl font-bold` |
| h2 | 24px (`1.5rem`) | 1.3 | 600 Semibold | `text-3xl font-semibold` |
| h3 | 20px (`1.25rem`) | 1.4 | 600 Semibold | `text-xl font-semibold` |
| Large body | 16px (`1rem`) | 1.6 | 400 Regular | `text-base` |
| Body (default) | 14px (`0.875rem`) | 1.6 | 400 Regular | `text-sm` |
| Small / caption | 12px (`0.75rem`) | 1.5 | 400 Regular | `text-xs` |
| Label | 14px (`0.875rem`) | 1.4 | 500 Medium | `text-sm font-medium` |
| Button | 14px (`0.875rem`) | 1 | 500 Medium | `text-sm font-medium` |

### 3.2 Weight Reference

| Name | Value | Usage |
|------|-------|-------|
| Regular | 400 | Body text, descriptions, captions |
| Medium | 500 | Labels, button text, navigation items |
| Semibold | 600 | Section headings (h2, h3), card titles |
| Bold | 700 | Page headings (h1), hero headline |

### 3.3 Typography Rules

- Body text (`text-foreground`) on `bg-background` must meet 4.5:1 contrast ratio (WCAG AA)
- Muted text (`text-muted-foreground`) must meet 4.5:1 against its background — verify with axe
- Line lengths should not exceed 70 characters for body text (readability)
- No italic text for body copy; italic reserved for quotes and emphasis only
- Letter-spacing: default (no adjustment) except for uppercase labels where `tracking-wide` may be applied sparingly

---

## 4. Spacing

**Base unit:** 4px

All spacing values are multiples of the 4px base unit. Tailwind's default scale aligns with this rhythm (`space-1 = 4px`, `space-2 = 8px`, etc.).

### 4.1 Spacing Scale

| Name | Value | Tailwind class | Usage |
|------|-------|---------------|-------|
| xs | 4px | `gap-1`, `p-1`, `m-1` | Icon-to-label gap, tight inline spacing |
| sm | 8px | `gap-2`, `p-2`, `m-2` | Element gap within a component |
| md | 16px | `gap-4`, `p-4`, `m-4` | Group gap (between related elements) |
| lg | 24px | `gap-6`, `p-6`, `m-6` | Card internal padding |
| xl | 32px | `gap-8`, `p-8`, `m-8` | Section gap (between components in a section) |
| 2xl | 48px | `gap-12`, `p-12`, `m-12` | Inter-section gap on desktop |
| 3xl | 64px | `gap-16`, `p-16`, `m-16` | Page section gap (between major page sections) |

### 4.2 Spacing Application Rules

| Context | Spacing |
|---------|---------|
| Icon ↔ text label | 8px (`gap-2`) |
| Form fields (vertical gap) | 16px (`gap-4`) |
| Card internal padding | 24px (`p-6`) |
| Between cards in a grid | 16px (`gap-4`) or 24px (`gap-6`) |
| Between form groups | 32px (`space-y-8`) |
| Between page sections | 64px (`py-16`) |
| Page horizontal padding | 32px (`px-8`) or max-width container |

---

## 5. Layout

### 5.1 Max-Width Container

```
max-w-7xl mx-auto px-8
```

Content is centered with a maximum width of `1280px` and `32px` horizontal padding on each side. Desktop viewport minimum: `1024px`.

### 5.2 Grid System

- Section content grids use CSS Grid via Tailwind: `grid grid-cols-3 gap-6` for three-column card layouts
- Two-column layouts: `grid grid-cols-2 gap-8`
- No mobile grid breakpoints in MVP (GUD-008)

### 5.3 Desktop-Only (MVP)

No responsive breakpoints (`sm:`, `md:`, `lg:`) are implemented in MVP. All layout is designed for and tested at `≥ 1024px` viewport width. This is a deliberate scope decision — see `spec-design-landing.md` Section 7.

---

## 6. Shadows

Shadows are minimal and used exclusively to create depth for floating surfaces (cards, dropdowns, modals). They are never used for decorative purposes.

| Token | Value | Usage |
|-------|-------|-------|
| Shadow sm (card) | `0 1px 3px rgba(0, 0, 0, 0.1)` | Cards, input focus, subtle elevation |
| Shadow md (dropdown) | `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)` | Dropdowns, popovers |
| Shadow lg (modal) | `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)` | Modals, dialogs |

In Tailwind: `shadow-sm` (card), `shadow-md` (dropdown), `shadow-lg` (modal). The shadcn component library defaults align with this scale.

---

## 7. Border Radius

| Name | Value | Tailwind class | Usage |
|------|-------|---------------|-------|
| Small | 6px | `rounded-md` | Badges, tags, small chips |
| Medium | 8px | `rounded-lg` | Input fields, buttons |
| Large | 12px | `rounded-xl` | Cards, panels |
| Full | 9999px | `rounded-full` | Avatar images, circular icon buttons |

The shadcn component library uses `--radius` CSS variable (default `0.5rem = 8px`). The PRISMA design system aligns with medium radius (8px) as the base shadcn `--radius` value.

---

## 8. Z-Index Scale

Z-index values are defined as a strict scale to prevent stacking context conflicts across the application.

| Level | Value | Usage |
|-------|-------|-------|
| Base | 0 | Normal document flow |
| Raised | 1 | Slightly elevated elements (e.g., active card) |
| Dropdown | 10 | Dropdown menus, select popups, tooltips |
| Sticky | 20 | Sticky headers, floating action buttons |
| Modal | 30 | Modals, dialogs, drawers |
| Toast | 50 | Toast notifications, snackbars (always on top) |

Custom Tailwind utilities for z-index values not in the default scale (10, 20, 30, 50) must be defined in `tailwind.config.ts`:

```typescript
// tailwind.config.ts
extend: {
  zIndex: {
    'dropdown': '10',
    'sticky': '20',
    'modal': '30',
    'toast': '50',
  }
}
```

---

## 9. Interactive States

### 9.1 Focus

All interactive elements must have a visible focus ring meeting WCAG 2.2 AA (contrast ratio ≥ 3:1 against adjacent colors):

```
ring-2 ring-primary ring-offset-2
```

The `ring-primary` token uses the indigo accent (`#4F46E5`), which provides sufficient contrast against both `bg-background` (off-white) and `bg-card` (white).

### 9.2 Hover

Hover states use subtle background transitions:

```
hover:bg-accent transition-colors duration-200
```

For primary buttons:
```
hover:bg-primary/90 transition-colors duration-200
```

### 9.3 Disabled

Disabled interactive elements:
```
disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
```

### 9.4 Touch Targets

All clickable/interactive elements must meet a minimum 44×44px touch target (GUD-003). For small icon buttons, use padding to reach the minimum: `p-2` on a 24px icon produces a 40px target; use `p-3` (44px) when needed.

---

## 10. Motion & Animation

### 10.1 Transition Defaults

```
transition-colors duration-200 ease-in-out  /* color/background changes */
transition-opacity duration-150              /* fade in/out */
transition-transform duration-200           /* slide/scale */
```

### 10.2 Reduced Motion

All transitions and animations must respect `prefers-reduced-motion` (GUD-005). Use Tailwind's `motion-safe:` and `motion-reduce:` prefixes:

```
motion-safe:transition-transform motion-reduce:transition-none
```

### 10.3 Prohibited

- Auto-playing videos or GIFs
- Animations that flash more than 3 times per second (WCAG 2.3.1)
- Parallax scrolling effects
- Infinite animations without a pause mechanism

---

## 11. Iconography

**Library:** Lucide React (aligned with shadcn default — GUD-006)

- Icons are always SVG (never emoji, never PNG icon sprites)
- Default size: 16px (`size-4`) for inline icons, 20px (`size-5`) for standalone icons, 24px (`size-6`) for feature/highlight icons
- Icons used as interactive elements must have `aria-label` or be paired with visible text
- Color: inherit from parent via `currentColor`; use `text-*` utilities to color icons

---

## 12. CSS Variables Reference

The following block is the authoritative CSS variable definition for `app/globals.css`. Tailwind tokens map to these variables via `tailwind.config.ts`.

```css
/* app/globals.css */
:root {
  /* Colors */
  --background: 0 0% 98%;
  --foreground: 222 47% 11%;

  --card: 0 0% 100%;
  --card-foreground: 222 47% 11%;

  --popover: 0 0% 100%;
  --popover-foreground: 222 47% 11%;

  --primary: 239 84% 60%;
  --primary-foreground: 0 0% 100%;

  --secondary: 220 14% 96%;
  --secondary-foreground: 222 47% 11%;

  --muted: 220 14% 96%;
  --muted-foreground: 215 20% 45%;

  --accent: 235 100% 96%;
  --accent-foreground: 239 84% 60%;

  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 100%;

  --border: 214 32% 91%;
  --input: 214 32% 91%;
  --ring: 239 84% 60%;

  /* Border radius */
  --radius: 0.5rem; /* 8px — medium (shadcn base) */
}

.dark {
  --background: 222 47% 6%;
  --foreground: 210 40% 98%;

  --card: 222 47% 8%;
  --card-foreground: 210 40% 98%;

  --popover: 222 47% 8%;
  --popover-foreground: 210 40% 98%;

  --primary: 239 84% 65%;
  --primary-foreground: 0 0% 100%;

  --secondary: 217 33% 17%;
  --secondary-foreground: 210 40% 98%;

  --muted: 217 33% 17%;
  --muted-foreground: 215 20% 65%;

  --accent: 217 33% 17%;
  --accent-foreground: 239 84% 65%;

  --destructive: 0 63% 51%;
  --destructive-foreground: 0 0% 100%;

  --border: 217 33% 17%;
  --input: 217 33% 17%;
  --ring: 239 84% 65%;
}
```

---

## 13. Component Token Usage Reference

This section provides a quick reference for how design tokens map to common component patterns across the PRISMA application.

| Component | Background | Text | Border | Shadow |
|-----------|-----------|------|--------|--------|
| Page | `bg-background` | `text-foreground` | — | — |
| Card | `bg-card` | `text-card-foreground` | `border` | `shadow-sm` |
| Primary button | `bg-primary` | `text-primary-foreground` | — | — |
| Secondary button | `bg-secondary` | `text-secondary-foreground` | `border` | — |
| Input field | `bg-background` | `text-foreground` | `border` | — |
| Input focus | — | — | `ring-2 ring-primary` | — |
| Badge (default) | `bg-secondary` | `text-secondary-foreground` | — | — |
| Badge (success) | `bg-accent` | `text-accent-foreground` | — | — |
| Badge (destructive) | `bg-destructive` | `text-destructive-foreground` | — | — |
| Muted section | `bg-muted/30` | `text-foreground` | — | — |
| Dropdown/popover | `bg-popover` | `text-popover-foreground` | `border` | `shadow-md` |
| Modal/dialog | `bg-card` | `text-card-foreground` | `border` | `shadow-lg` |
| Toast | `bg-foreground` | `text-background` | — | `shadow-lg` |

---

## 14. Accessibility Requirements

All visual design decisions must uphold WCAG 2.2 Level AA:

| Requirement | Standard | Verification |
|-------------|----------|-------------|
| Body text contrast | ≥ 4.5:1 | Automated via jest-axe + Playwright axe |
| Large text contrast (≥ 18pt or 14pt bold) | ≥ 3:1 | Automated via jest-axe + Playwright axe |
| UI component contrast (borders, icons) | ≥ 3:1 | Automated via jest-axe + Playwright axe |
| Focus indicator contrast | ≥ 3:1 | Automated via jest-axe + Playwright axe |
| Touch target size | ≥ 44×44px | Manual review + GUD-003 enforcement |
| Color not the sole conveyor of information | WCAG 1.4.1 | Manual review per component |
| Reduced motion | WCAG 2.3.3 (AAA) / best practice | Code review (motion-safe/reduce) |

The CI pipeline blocks PRs with axe violations (tags: `wcag2a`, `wcag2aa`, `wcag22aa`). Axe rules must never be disabled.

---

## 15. Related Documents

| Document | Relationship |
|----------|-------------|
| `app/globals.css` | Implementation — CSS variable definitions (Section 12) |
| `tailwind.config.ts` | Implementation — token mapping and theme extension |
| `components.json` | shadcn CLI config — `style: radix-nova`, base radius, icon library |
| `spec-design-landing.md` | Consumer — landing page design tokens (Section 4.4) |
| `spec-design-auth.md` | Consumer — login and blocked page visual design |
| `spec-design-admin-config.md` | Consumer — admin configuration page visual design |
| `spec-process-repository.md` | Consumer — dashboard and exam list visual design |
