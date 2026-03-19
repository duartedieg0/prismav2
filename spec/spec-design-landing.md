---
title: Landing Page (F1)
version: 1.0
date_created: 2026-03-18
last_updated: 2026-03-18
owner: PRISMA Team
tags: [design, landing, hero, marketing, public, accessibility, desktop-first]
---

# Introduction

This specification defines the public landing page for the PRISMA ("Adapte Minha Prova") platform — the first page an unauthenticated visitor encounters at `/`. It presents a minimalist hero section with the platform's value proposition and a clear call-to-action to sign in. The page is a pure React Server Component (RSC) and has no client-side interactivity beyond the CTA button that triggers authentication. Authenticated users are redirected to `/dashboard` before the page renders.

---

## Section 1: Purpose & Scope

### Purpose

This document specifies the landing page for the PRISMA ("Adapte Minha Prova") platform. It defines the page structure, component hierarchy, design token usage, acceptance criteria, and test strategy required to implement the feature described in PRD F1.

### In Scope

- `/` (root route) — the public landing page
- Hero section — platform name, tagline, value proposition text, and "Entrar com Google" CTA button
- How-it-works flow section — three-step visual walkthrough (`flowSteps[]`)
- Key highlights section — three feature highlight cards (`highlights[]`)
- CTA section — secondary call-to-action below the main content
- Footer — minimal branding and attribution
- Middleware redirect — authenticated users redirected to `/dashboard` (defined in `spec-design-auth.md`, applied here)
- Design token usage aligned with `design-system/MASTER.md`

### Out of Scope

- Authentication flow (OAuth initiation, callback, session management) — see `spec-design-auth.md`
- Dashboard and authenticated pages — see `spec-process-repository.md`
- Mobile or responsive layouts (MVP is desktop-only — GUD-008)
- Animations beyond minimal transitions (GUD-004, GUD-005)
- CMS-driven content or A/B testing
- Analytics instrumentation

---

## Section 2: Definitions

| Term | Definition |
|------|-----------|
| Hero section | The first visible area of the landing page; contains the platform name, tagline, value proposition, and the primary CTA button |
| CTA | Call-to-action — the "Entrar com Google" button that initiates the Google OAuth flow by linking to `/login` |
| `flowSteps[]` | Ordered array of three objects describing the how-it-works workflow: upload PDF → AI adapts → download result |
| `highlights[]` | Array of three objects describing key platform features, each with an icon, title, and description |
| Value proposition | A short paragraph (2–3 sentences) explaining what PRISMA does and why teachers should use it |
| RSC | React Server Component — a component rendered entirely on the server; no client-side JavaScript is sent for its markup |
| Design token | A named CSS variable (e.g., `bg-background`, `text-primary`) defined in `design-system/MASTER.md` and mapped to Tailwind CSS v3 theme config |
| Desktop-first | MVP targets a minimum viewport width of 1024px; no mobile breakpoints are implemented in this iteration |

---

## Section 3: Feature Requirements & Global Constraints

### Feature Requirements (PRD F1)

| ID | Requirement |
|----|------------|
| REQ-001 | SHALL display hero section with value proposition and login CTA (F1.1) |
| REQ-002 | SHALL redirect authenticated users to `/dashboard` |
| REQ-003 | Design SHALL be minimalist, desktop-first (F1.2) |
| REQ-004 | SHALL follow `design-system/MASTER.md` tokens and style guide |
| GUD-008 | No mobile breakpoints in MVP (desktop-only) |

### Global Project Constraints

**React Components (PAT)**
- PAT-001: Functional components only; no React.FC; props typed directly with interface
- PAT-002: Business logic in custom hooks (useXxx); component only renders
- PAT-003: Shadcn as copy-paste; variants via tailwind-variants (tv), not CVA
- PAT-004: Compound components use separate named exports, never Object.assign
- PAT-005: Radix UI a11y attributes never removed (DialogTitle + DialogDescription required)
- PAT-006: State hierarchy: useState → Zustand → TanStack Query → URL state

**Tailwind CSS v3 + UI/UX (GUD)**
- GUD-001: Design tokens only (bg-background, text-foreground); never explicit colors
- GUD-002: Tailwind class strings >100 chars split into arrays inside tv()
- GUD-003: Touch targets minimum 44×44px; cursor-pointer on all clickable elements
- GUD-004: Transitions 150–300ms via transition-colors duration-200
- GUD-005: prefers-reduced-motion respected in all animations
- GUD-006: SVG icons only (Lucide React); emojis forbidden as UI icons
- GUD-007: Minimum contrast ratio 4.5:1 (WCAG AA); verified automatically with axe

**Next.js 16 Performance (REQ-P)**
- REQ-P01: RSC by default; 'use client' only when needed (hooks, events, browser APIs)
- REQ-P02: Parallel fetches via Promise.all() or Suspense boundaries; no waterfalls
- REQ-P03: React.cache() for per-request deduplication in Server Components
- REQ-P04: next/dynamic for heavy components (prompt editor, side-by-side comparator)
- REQ-P05: async params and searchParams (Next.js App Router standard)
- REQ-P06: No barrel imports; direct module imports for optimal bundle
- REQ-P07: Buttons disabled with visual feedback during async operations

**Test Strategy (applies to Section 6 of every spec)**
- Layer 1 — Vitest 4.x + @testing-library/react: Zod schemas, utilities, hooks, interactive components; mock Supabase and Vercel AI SDK via vi.mock()
- Layer 2 — jest-axe + Vitest: zero WCAG violations in all component states (default, error, loading, disabled)
- Layer 3 — Playwright + @axe-core/playwright: full page scan with tags wcag2a, wcag2aa, wcag22aa; test form error states and modals
- Coverage: minimum 80% on critical business functions (Edge Functions, adaptation, extraction)
- CI gate: PRs blocked if a11y violations found; axe rules never disabled

---

## Section 4: Interfaces & Data Contracts

### 4.1 TypeScript Types

```typescript
// app/(public)/page.tsx (or a co-located data module)

interface FlowStep {
  step: number;          // 1, 2, 3 — display order
  title: string;         // e.g., "Faça upload da prova"
  description: string;  // short explanation (1–2 sentences)
}

interface Highlight {
  icon: string;          // Lucide icon name (e.g., "Zap", "BookOpen", "Shield")
  title: string;         // feature name (e.g., "Adaptação com IA")
  description: string;  // feature explanation (1–2 sentences)
}
```

### 4.2 Static Content Definitions

The landing page content is defined as static arrays co-located with the page component (no database queries required):

```typescript
const flowSteps: FlowStep[] = [
  {
    step: 1,
    title: "Faça upload da prova",
    description: "Envie o PDF da sua prova escolar. Nosso sistema extrai automaticamente todas as questões.",
  },
  {
    step: 2,
    title: "A IA adapta as questões",
    description: "Agentes de IA especializados adaptam cada questão com apoios pedagógicos para alunos com necessidades específicas.",
  },
  {
    step: 3,
    title: "Baixe a prova adaptada",
    description: "Receba a versão adaptada em segundos, pronta para impressão e distribuição.",
  },
];

const highlights: Highlight[] = [
  {
    icon: "Zap",
    title: "Rápido e preciso",
    description: "Adaptações geradas em segundos com qualidade pedagógica validada.",
  },
  {
    icon: "BookOpen",
    title: "Foco na inclusão",
    description: "Apoios visuais, linguagem simplificada e formatos acessíveis para cada aluno.",
  },
  {
    icon: "Shield",
    title: "Seguro e privado",
    description: "Seus dados e os das suas provas são protegidos com criptografia e isolamento por usuário.",
  },
];
```

### 4.3 Page Sections & Component Structure

```
app/(public)/page.tsx (RSC)
├── <main>
│   ├── <HeroSection>          — platform name, tagline, value prop, CTA button
│   ├── <FlowSection>          — "Como funciona" heading + flowSteps[] cards
│   ├── <HighlightsSection>    — "Por que usar" heading + highlights[] cards
│   └── <CtaSection>           — secondary CTA block before footer
└── <footer>                   — minimal branding
```

No sub-components require `'use client'` — the CTA is a Next.js `<Link>` pointing to `/login`, not an interactive button invoking a browser API.

### 4.4 Design Tokens Used

| Token | Usage |
|-------|-------|
| `bg-background` | Page background (off-white) |
| `text-foreground` | Primary body text (near-black) |
| `text-primary` | Accent headings and CTA button background |
| `bg-muted/30` | Subtle section backgrounds (flow and CTA sections) |
| `bg-card` | Highlight cards and flow step cards |
| `text-muted-foreground` | Secondary text, descriptions |
| `border` | Card borders |
| `ring-primary` | Focus ring on CTA button (accessibility) |

### 4.5 Middleware Dependency (Redirect Logic)

The redirect for authenticated users is handled by `middleware.ts` (defined in `spec-design-auth.md`), not by the page component itself. The landing page at `/` does not call `getUser()` or query Supabase directly.

```typescript
// middleware.ts — relevant routing rule (from spec-design-auth.md Section 4.4)
// If route is '/' and user is authenticated → redirect to '/dashboard'
// If route is '/' and user is unauthenticated → pass through (render landing page)
```

---

## Section 5: Acceptance Criteria

| ID | Given | When | Then |
|----|-------|------|------|
| AC-001 | An unauthenticated visitor navigates to `/` | The page request is processed by middleware and the RSC renders | The landing page is displayed with a visible hero section containing the platform name, a value proposition paragraph, and an "Entrar com Google" CTA button |
| AC-002 | An authenticated user (valid Supabase session) navigates to `/` | The middleware processes the request | The user is redirected to `/dashboard` before the landing page RSC renders; the landing page HTML is never delivered to the browser |
| AC-003 | The landing page is rendered for an unauthenticated visitor | The visitor views the page | The "Como funciona" section displays three numbered flow steps in correct order (1, 2, 3) with titles and descriptions |
| AC-004 | The landing page is rendered for an unauthenticated visitor | The visitor views the highlights section | Three feature highlight cards are visible, each with a Lucide icon, a title, and a description |
| AC-005 | The "Entrar com Google" CTA button is rendered on the landing page | A keyboard user presses Tab to reach the button and then presses Enter | The browser navigates to `/login`; the button has a visible focus ring with contrast ratio ≥ 3:1 against its background |
| AC-006 | The landing page is rendered | An automated axe scan is run against the full page | Zero WCAG violations are reported for tags wcag2a, wcag2aa, wcag22aa |
| AC-007 | The landing page is rendered | A screen reader user navigates the page | Heading hierarchy is correct (h1 → h2 → h3); all interactive elements have accessible labels; no heading levels are skipped |
| AC-008 | The landing page is rendered at 1024px viewport width | The user scrolls through all sections | All sections are fully visible and legible; no horizontal overflow occurs; layout matches the desktop-first design |
| AC-009 | The landing page is a React Server Component | The page is inspected in browser DevTools | No unnecessary client-side JavaScript bundle is sent for the static page layout; only the minimal Next.js runtime is present |
| AC-010 | The landing page references design tokens | Any design token is changed in `globals.css` | The landing page automatically reflects the updated token without code changes to the page component |

---

## Section 6: Test Strategy

### Layer 1 — Vitest + @testing-library/react

**Redirect logic (`app/(public)/page.test.tsx` or `middleware.test.ts`)**

Mock `updateSession` from `lib/supabase/middleware` via `vi.mock()`. The redirect for `/` is already tested in the auth spec middleware suite; this layer focuses on the page component.

| Scenario | `getUser()` returns | Route | Expected outcome |
|----------|--------------------|----|-----------------|
| Authenticated user | `{ id: 'u1' }` | `/` | Middleware redirects to `/dashboard`; landing page RSC not called |
| Unauthenticated user | `null` | `/` | Middleware passes through; landing page RSC renders |

**`<LandingPage>` complete render (`app/(public)/page.test.tsx`)**

- Renders with all `flowSteps[]` (3 items) and `highlights[]` (3 items) visible in the DOM
- "Entrar com Google" CTA link has `href="/login"`
- Platform name heading (`h1`) is present and non-empty
- Zero WCAG violations (jest-axe scan over the full rendered output)

### Layer 2 — jest-axe + Vitest

**`<LandingPage>` accessibility unit test**

- Render the full landing page component with all sections (hero, flow, highlights, CTA, footer)
- Run `axe()` with tags `wcag2a`, `wcag2aa`, `wcag22aa`
- Assert zero violations
- Verify heading hierarchy: single `h1` in hero; `h2` section headings; `h3` (or appropriate level) for card titles
- Verify CTA link is keyboard-accessible and has accessible text ("Entrar com Google" or equivalent accessible label)

### Layer 3 — Playwright + @axe-core/playwright

**`/` page full scan**

- Navigate to `http://localhost:3000/` (unauthenticated — no session cookie)
- Run `checkA11y(page, null, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] } })`
- Assert zero violations (WCAG 2.2 AA)
- Verify "Entrar com Google" CTA button is keyboard-accessible: Tab to reach it, Enter navigates to `/login`
- Verify page renders all three flow steps and three highlight cards

**Authenticated redirect test**

- Set a valid Supabase session cookie
- Navigate to `http://localhost:3000/`
- Assert browser is redirected to `/dashboard` (HTTP 302 or final URL is `/dashboard`)
- Assert landing page content is never rendered to the authenticated client

**CI gate:** All Playwright a11y tests must pass before PR merge; `axe.disableRules()` forbidden.

---

## Section 7: Design Rationale

### Minimalist Desktop-First Design (REQ-003 / GUD-008)

The landing page is intentionally minimal for the following reasons:
- **Audience focus**: The primary users are teachers in Brazilian schools; the platform is accessed on desktop computers in school environments. Mobile is a post-MVP concern.
- **Content economy**: A landing page for an internal/semi-closed tool (accessed via invite or Google Workspace) does not need extensive marketing content; a clear value proposition and a single CTA are sufficient.
- **Maintenance cost**: Every additional section, breakpoint, or animation adds maintenance burden; minimalism reduces technical debt at the MVP stage.

### RSC with No Client-Side JavaScript (REQ-P01)

The landing page is a pure RSC because:
- No user interaction requires browser APIs or client state
- The CTA is a Next.js `<Link>` to `/login` — no `onClick` handler needed
- No data fetching is required (content is static)
- Keeping the page as RSC ensures the smallest possible JavaScript bundle for the public-facing entry point

### Redirect Handled by Middleware, Not the Page (REQ-002)

Authenticated-user redirect is delegated to `middleware.ts` rather than implemented in the page component because:
- **Single enforcement point**: Middleware is the established auth guard for all routes in this project (see `spec-design-auth.md`)
- **No flash of content**: Middleware redirects happen before any HTML is sent; a page-level redirect (via `redirect()`) would still serialize the RSC tree
- **Consistency**: All route protection logic lives in one file; the landing page does not need to be aware of auth state

### Design Tokens Over Hardcoded Colors (GUD-001 / REQ-004)

All colors are applied via Tailwind design tokens (`bg-background`, `text-primary`, etc.) mapped to CSS variables in `globals.css`. This:
- Enables future theming (dark mode, high-contrast mode) without changing component code
- Ensures the landing page automatically inherits any palette changes made at the design system level
- Prevents token drift between the landing page and the rest of the application

### Static Content Arrays (`flowSteps[]`, `highlights[]`)

Content is defined as static TypeScript arrays rather than database-driven because:
- **Performance**: Zero database queries on the public landing page; content is inlined at build time
- **Simplicity**: Landing page copy changes infrequently and do not require a CMS or admin UI at MVP
- **Type safety**: TypeScript interfaces ensure all required fields are present at compile time

---

## Section 8: Dependencies

| ID | Type | Description |
|----|------|-------------|
| INF-001 | Infrastructure | Supabase Auth — the "Entrar com Google" CTA links to `/login` which initiates the OAuth flow; no direct Supabase call from the landing page itself |
| PLT-001 | Platform | Next.js 16 App Router — page at `app/(public)/page.tsx`; RSC rendered at the Edge or Node.js runtime |
| PLT-002 | Platform | Vercel — static-first deployment; the landing page may be statically generated (ISR or full static) since it has no dynamic data |
| LIB-001 | Library | Tailwind CSS v3 — design token classes; all tokens defined in `tailwind.config.ts` and `app/globals.css` |
| LIB-002 | Library | Lucide React — SVG icons for `highlights[]` cards (GUD-006); imported as named exports |
| DS-001 | Design System | `design-system/MASTER.md` — authoritative source for palette, typography scale, spacing rhythm, shadows, and border radius values used on this page |
| COM-001 | Component | `middleware.ts` — handles authenticated-user redirect away from `/`; this page depends on that routing rule being in place |
| SPEC-001 | Specification | `spec-design-auth.md` — defines the middleware routing rule (Section 4.4) that redirects authenticated users from `/` to `/dashboard` |

---

## Section 9: Examples

### Example 1: Unauthenticated First Visit

**Scenario:** A teacher receives a link to the platform and visits `https://app.adapteminha prova.com.br/` for the first time.

**Flow:**
1. Browser → `GET /` (no session cookie)
2. `middleware.ts`: `updateSession()` → `getUser()` returns `null`
3. Route is `/` and user is unauthenticated → middleware passes through
4. Next.js renders `app/(public)/page.tsx` as RSC on the server
5. HTML is sent to browser — hero section, flow steps, highlights, CTA, footer
6. Teacher clicks "Entrar com Google" → navigates to `/login`
7. From `/login`, Google OAuth flow begins (defined in `spec-design-auth.md`)

### Example 2: Authenticated User Visits Landing Page

**Scenario:** A teacher is already logged in and types `/` directly in the address bar (or follows a bookmark).

**Flow:**
1. Browser → `GET /` (valid session cookie present)
2. `middleware.ts`: `updateSession()` → `getUser()` returns `{ id: 'uuid-teacher-1' }`
3. Route is `/` and user is authenticated → middleware returns `NextResponse.redirect('/dashboard')`
4. Browser receives HTTP 302 → navigates to `/dashboard`
5. Landing page RSC is never invoked; no landing page HTML is sent

### Example 3: Hero Section Render

**Scenario:** The RSC renders the hero section with the correct structure.

**Expected output (simplified):**

```html
<section aria-labelledby="hero-heading">
  <h1 id="hero-heading">Adapte Minha Prova</h1>
  <p>Adapte provas escolares para alunos com necessidades específicas usando inteligência artificial — em segundos.</p>
  <a href="/login" class="...">Entrar com Google</a>
</section>
```

### Example 4: Flow Steps Render

**Scenario:** The "Como funciona" section renders all three steps in order.

**Expected DOM order:**
1. Step 1 — "Faça upload da prova" with step number badge "1"
2. Step 2 — "A IA adapta as questões" with step number badge "2"
3. Step 3 — "Baixe a prova adaptada" with step number badge "3"

Each step is wrapped in a card (`bg-card`) with a visible step number, title, and description.

### Example 5: CTA Button Keyboard Accessibility

**Scenario:** A keyboard-only user navigates to the landing page.

**Flow:**
1. User presses Tab — focus moves to "Entrar com Google" link
2. Visible focus ring appears around the button (contrasting ring color, ≥ 3:1 ratio)
3. User presses Enter — browser navigates to `/login`
4. No JavaScript required — the link is a standard `<a>` tag rendered by Next.js `<Link>`

### Example 6: Design Token Change Propagation

**Scenario:** The design team updates the primary accent color from indigo to blue in `globals.css`.

**Before:**
```css
--primary: 239 68% 58%; /* indigo */
```

**After:**
```css
--primary: 217 91% 60%; /* blue */
```

**Result:** The CTA button (`bg-primary`), accent headings (`text-primary`), and all other primary-colored elements on the landing page update automatically without any changes to page component code — demonstrating REQ-004 compliance.

---

## Section 10: Validation Checklist

The following checklist must be verified before this spec is considered implementation-ready:

- [x] Frontmatter complete: `title`, `version`, `date_created`, `last_updated`, `owner`, `tags`
- [x] All 11 sections present (Introduction through Related Specifications)
- [x] Global Constraints block present verbatim in Section 3
- [x] All feature requirements (REQ-001–REQ-004, GUD-008) traceable to PRD F1
- [x] Section 4 includes:
  - [x] `FlowStep` and `Highlight` TypeScript interfaces
  - [x] Static content arrays (`flowSteps[]`, `highlights[]`) with all fields
  - [x] Component hierarchy diagram (page → sections)
  - [x] Design tokens table with usage context
  - [x] Middleware dependency documented (redirect logic in `spec-design-auth.md`)
- [x] Section 5 has ≥ 5 ACs in Given-When-Then format (10 ACs present)
- [x] Section 6 has all 3 test layers with specific named test cases
- [x] Section 6 Layer 1: redirect logic mock (`getUser()` — authenticated → redirect, unauthenticated → render)
- [x] Section 6 Layer 2: `<LandingPage>` complete — zero WCAG violations
- [x] Section 6 Layer 3: `/` — WCAG 2.2 AA with tags wcag2a, wcag2aa, wcag22aa; CTA button keyboard accessible
- [x] Section 7 justifies: minimalist desktop-first design, RSC with no client JS, middleware-based redirect, design tokens, static content arrays
- [x] Section 8 references `design-system/MASTER.md` as DS-001 dependency
- [x] Section 9 has ≥ 5 concrete examples including authenticated redirect, hero render, keyboard accessibility, and token propagation
- [x] Section 11 references at least 3 related specs including `spec-design-auth.md`

---

## Section 11: Related Specifications

| Spec | Relationship |
|------|-------------|
| `spec-design-auth.md` | Dependency — defines the middleware routing rule (Section 4.4) that redirects authenticated users from `/` to `/dashboard`; the `/login` route and Google OAuth flow that the CTA links to are fully specified there |
| `spec-process-repository.md` | Downstream — `/dashboard` is the redirect target for authenticated users and the destination after successful OAuth sign-in; teacher exam list is defined there |
| `spec-process-new-exam.md` | Downstream — the primary user action after reaching `/dashboard` is creating a new exam; the new exam form flow is specified there |
| `design-system/MASTER.md` | Design Dependency — authoritative source for all design tokens, typography scale, spacing rhythm, z-index scale, shadows, and border radius values referenced in Section 4.4 and REQ-004 |
