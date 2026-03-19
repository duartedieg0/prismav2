---
title: Exam Repository (Dashboard)
version: 1.0
date_created: 2026-03-18
last_updated: 2026-03-18
owner: PRISMA Team
tags: [process, repository, dashboard, exam-list, status-badge, rsc]
---

# Introduction

This specification defines the Exam Repository page — the teacher-facing dashboard that lists all exams the authenticated teacher has created, ordered by most recent first. Each exam entry displays a status badge and links to the appropriate route for that exam's current status via `getExamRoute`. This is the central navigation hub of the PRISMA ("Adapte Minha Prova") teacher workflow, providing a persistent overview and entry point to every active exam. The page is a pure React Server Component (RSC): all data is fetched server-side and no client interactivity is required beyond the rendered links.

---

## Section 1: Purpose & Scope

### Purpose

This document specifies the Exam Repository page for the PRISMA ("Adapte Minha Prova") platform. It defines the page structure, data interfaces, display utilities, and acceptance criteria required to implement the feature described in PRD F3.

### In Scope

- `/dashboard` page — RSC that lists the authenticated teacher's exams
- `<ExamListItem>` component — renders a single exam row with status badge and navigation link
- `<EmptyDashboard>` component — empty state when the teacher has no exams
- `getExamStatusDisplay(status)` utility — maps `ExamStatus` to a human-readable label and badge variant
- `getExamRoute(examId, status)` utility — maps `ExamStatus` to the correct navigation route for that exam
- `ExamWithJoins` TypeScript interface — exam record joined with `subjects.name` and `grade_levels.name`
- "Nova Adaptação" button linking to `/exams/new`
- Server-side data loading via Supabase server client

### Out of Scope

- Exam detail pages and their specific content — see `spec-process-extraction.md`, `spec-process-adaptation.md`, `spec-process-result.md`
- New exam creation form — see `spec-process-new-exam.md`
- Authentication and middleware routing — see `spec-design-auth.md`
- Admin configuration pages — see `spec-design-admin-config.md`

---

## Section 2: Definitions

| Term | Definition |
|------|-----------|
| `ExamStatus` | Union type with 6 values: `draft`, `uploading`, `processing`, `awaiting_answers`, `ready`, `error`; imported from `lib/types/exam.ts` (defined in `spec-process-extraction.md`) |
| `ExamWithJoins` | TypeScript interface extending `Exam` with `subjects.name` and `grade_levels.name` joined from the database |
| `getExamStatusDisplay` | Pure utility function that maps an `ExamStatus` value to a `{ label, variant }` object for badge rendering |
| `getExamRoute` | Pure utility function that maps an `examId` + `ExamStatus` to the correct Next.js route string for navigation |
| Status badge | A UI element (shadcn `<Badge>`) rendered with a semantic variant (e.g., `default`, `secondary`, `destructive`) that communicates the exam's current lifecycle state |
| Empty state | The UI shown on the dashboard when the teacher has no exams; includes a CTA to create a new exam |
| RSC | React Server Component — a component that runs on the server; used here so all exam data is fetched before the page HTML is streamed, with no client-side loading state required |
| `Profile` | The authenticated teacher's user profile, sourced from the `profiles` table; used to scope the exam query to `exams.user_id = auth.uid()` |

---

## Section 3: Feature Requirements & Global Constraints

### Feature Requirements (PRD F3)

| ID | Requirement |
|----|------------|
| REQ-001 | SHALL list authenticated teacher's exams in descending creation order (F3.1) |
| REQ-002 | Each item SHALL display status badge with semantic variant (F3.2) |
| REQ-003 | Each item SHALL link to correct route based on status via `getExamRoute` (F3.2) |
| REQ-004 | SHALL display "Nova Adaptação" button linking to `/exams/new` (F3.3) |
| CON-001 | Page is RSC — no `'use client'`; data loaded server-side |
| CON-002 | Empty state shown when teacher has no exams |

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

### 4.1 TypeScript Interfaces

```typescript
// lib/types/exam.ts
// ExamStatus and Exam imported from spec-process-extraction.md

export type ExamStatus =
  | 'draft'
  | 'uploading'
  | 'processing'
  | 'awaiting_answers'
  | 'ready'
  | 'error';

// ExamWithJoins extends Exam with joined display names for subject and grade level
export interface ExamWithJoins {
  id: string;
  userId: string;
  subjectId: string;
  gradeLevelId: string;
  title: string;
  topic?: string | null;
  filePath: string | null;
  status: ExamStatus;
  extractionWarning?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  subjectName: string;       // subjects.name — e.g. "Matemática"
  gradeLevelName: string;    // grade_levels.name — e.g. "6º ano"
}
```

### 4.2 `getExamStatusDisplay` Utility

```typescript
// lib/utils/exam-status.ts

export type StatusVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline';

export interface ExamStatusDisplay {
  label: string;      // Human-readable Portuguese label for the badge
  variant: StatusVariant; // shadcn Badge variant
}

/**
 * Maps an ExamStatus to a display label and badge variant.
 * Pure function — no side effects.
 */
export function getExamStatusDisplay(status: ExamStatus): ExamStatusDisplay;
```

Status mapping:

| `ExamStatus` | `label` | `variant` |
|---|---|---|
| `draft` | `Rascunho` | `secondary` |
| `uploading` | `Enviando` | `secondary` |
| `processing` | `Processando` | `default` |
| `awaiting_answers` | `Aguardando Respostas` | `outline` |
| `ready` | `Pronto` | `default` |
| `error` | `Erro` | `destructive` |

### 4.3 `getExamRoute` Utility

```typescript
// lib/utils/exam-route.ts
import type { ExamStatus } from '@/lib/types/exam';

/**
 * Returns the correct Next.js route for an exam based on its current status.
 * Pure function — no side effects.
 */
export function getExamRoute(examId: string, status: ExamStatus): string;
```

Route mapping:

| `ExamStatus` | Route returned |
|---|---|
| `draft` | `/exams/${examId}/new` |
| `uploading` | `/exams/${examId}/processing` |
| `processing` | `/exams/${examId}/processing` |
| `awaiting_answers` | `/exams/${examId}/answers` |
| `ready` | `/exams/${examId}/result` |
| `error` | `/exams/${examId}/processing` |

### 4.4 Server-Side Data Loading

```typescript
// lib/data/dashboard.ts
import { cache } from 'react';
import { createServerClient } from '@/lib/supabase/server';
import type { ExamWithJoins } from '@/lib/types/exam';

/**
 * Fetches all exams for the authenticated teacher with joined subject
 * and grade_level names, ordered by created_at descending.
 * React.cache() deduplicates calls within a single server render pass (REQ-P03).
 */
export const getTeacherExams = cache(async (): Promise<ExamWithJoins[]> => {
  // Uses createServerClient (server-only Supabase client)
  // Queries: exams joined with subjects(name) and grade_levels(name)
  // Filter: exams.user_id = auth.uid() (enforced also by RLS)
  // Order: created_at DESC
});
```

The `/dashboard` RSC page calls `getTeacherExams()` directly. No `Promise.all` is needed since this is a single query. RLS policies on the `exams` table guarantee that only the authenticated teacher's exams are returned, even if the application-level filter is absent.

### 4.5 Component Interfaces

```typescript
// components/exam-list-item.tsx

export interface ExamListItemProps {
  exam: ExamWithJoins;
}

// components/empty-dashboard.tsx
// No props required — standalone empty state with CTA
```

---

## Section 5: Acceptance Criteria

| ID | Given | When | Then |
|----|-------|------|------|
| AC-001 | Authenticated teacher with 3 exams in the database | Teacher navigates to `/dashboard` | All 3 exams are listed in descending creation order; each row displays the exam title, subject name, grade level name, and a status badge |
| AC-002 | Authenticated teacher with at least one exam per `ExamStatus` value | Teacher views `/dashboard` | Each exam row displays a badge with the correct Portuguese label and semantic variant as defined in Section 4.2 |
| AC-003 | Authenticated teacher with an exam in `awaiting_answers` status | Teacher clicks the exam row link | Teacher is navigated to `/exams/[id]/answers` as returned by `getExamRoute` |
| AC-004 | Authenticated teacher with an exam in `ready` status | Teacher clicks the exam row link | Teacher is navigated to `/exams/[id]/result` as returned by `getExamRoute` |
| AC-005 | Authenticated teacher with no exams | Teacher navigates to `/dashboard` | Empty state component is rendered with a CTA message and a link or button directing to `/exams/new` |
| AC-006 | Any authenticated teacher on `/dashboard` | Page loads | A "Nova Adaptação" button or link is visible and navigates to `/exams/new` when activated (REQ-004) |
| AC-007 | Unauthenticated user navigates to `/dashboard` | Page request is made | Middleware redirects to `/login` before the page renders (spec-design-auth.md) |
| AC-008 | Authenticated teacher with exams | Teacher views `/dashboard` | Page renders as RSC — no `'use client'` directive on the page component; data is present in the initial HTML without client-side fetches (CON-001) |

---

## Section 6: Test Strategy

### Layer 1 — Vitest + @testing-library/react

**Utility function tests (`lib/utils/exam-status.test.ts`)**
- `getExamStatusDisplay('draft')` returns `{ label: 'Rascunho', variant: 'secondary' }`
- `getExamStatusDisplay('uploading')` returns `{ label: 'Enviando', variant: 'secondary' }`
- `getExamStatusDisplay('processing')` returns `{ label: 'Processando', variant: 'default' }`
- `getExamStatusDisplay('awaiting_answers')` returns `{ label: 'Aguardando Respostas', variant: 'outline' }`
- `getExamStatusDisplay('ready')` returns `{ label: 'Pronto', variant: 'default' }`
- `getExamStatusDisplay('error')` returns `{ label: 'Erro', variant: 'destructive' }`

**Utility function tests (`lib/utils/exam-route.test.ts`)**
- `getExamRoute('abc', 'draft')` returns `'/exams/abc/new'`
- `getExamRoute('abc', 'uploading')` returns `'/exams/abc/processing'`
- `getExamRoute('abc', 'processing')` returns `'/exams/abc/processing'`
- `getExamRoute('abc', 'awaiting_answers')` returns `'/exams/abc/answers'`
- `getExamRoute('abc', 'ready')` returns `'/exams/abc/result'`
- `getExamRoute('abc', 'error')` returns `'/exams/abc/processing'`

Mock: `vi.mock('@/lib/supabase/server')`, `vi.mock('@/lib/supabase/client')`

### Layer 2 — jest-axe + Vitest

**Component: `<ExamListItem>` (`components/exam-list-item.test.tsx`)**
- State `draft`: renders exam title, `Rascunho` badge with `secondary` variant, and a link to `/exams/[id]/new`; zero WCAG violations
- State `uploading`: renders `Enviando` badge with `secondary` variant, link to processing route; zero WCAG violations
- State `processing`: renders `Processando` badge with `default` variant, link to processing route; zero WCAG violations
- State `awaiting_answers`: renders `Aguardando Respostas` badge with `outline` variant, link to answers route; zero WCAG violations
- State `ready`: renders `Pronto` badge with `default` variant, link to result route; zero WCAG violations
- State `error`: renders `Erro` badge with `destructive` variant, link to processing route; zero WCAG violations

**Component: `<EmptyDashboard>` (`components/empty-dashboard.test.tsx`)**
- Renders empty state message and a CTA linking to `/exams/new`; zero WCAG violations
- CTA element has accessible text (not icon-only); touch target ≥ 44×44px (GUD-003)

All axe scans use tags: `wcag2a`, `wcag2aa`, `wcag22aa`

### Layer 3 — Playwright + @axe-core/playwright

**Page: `/dashboard`**
- Full page axe scan with tags `wcag2a`, `wcag2aa`, `wcag22aa`; zero violations required (WCAG 2.2 AA)
- Status badge labels visible and readable: for each of the 6 status values, badge text matches the `label` returned by `getExamStatusDisplay`
- "Nova Adaptação" button is focusable by keyboard, has a visible focus ring, and activates navigation on Enter key
- Empty state: when teacher has no exams, empty state content is accessible to screen readers with no violations

**CI gate:** All Playwright a11y tests must pass before PR merge; `axe.disableRules()` forbidden.

**Coverage target:** 80% minimum on `getExamStatusDisplay` and `getExamRoute` utility functions.

---

## Section 7: Design Rationale

### Pure RSC Page (CON-001)

The `/dashboard` page is a pure React Server Component with no `'use client'` directive because:
- **No interactive state**: The page is read-only — it lists exams and provides navigation links. No form submission, polling, or dynamic UI state is needed
- **Performance**: Data is fetched and rendered on the server before streaming HTML to the browser; the teacher sees a fully populated list with zero client-side loading states
- **Bundle size**: No Supabase client code or React state management code is shipped to the browser for this page (REQ-P01)
- **Security**: The `createServerClient` is only callable on the server; using RSC prevents accidental exposure of server-only credentials to the browser

### `getExamRoute` for Status-Driven Navigation (REQ-003)

A dedicated utility function was chosen over inline conditional expressions for the following reasons:
- **Single source of truth**: All status → route mappings are defined in one place; updating a route only requires one change
- **Testability**: Pure function with no dependencies — all 6 ExamStatus values can be exhaustively tested in a single test file (Layer 1)
- **Type safety**: TypeScript's exhaustive union checking ensures that adding a new `ExamStatus` value causes a compile error until `getExamRoute` handles it
- **Reusability**: Multiple components (e.g., a future notification panel, a breadcrumb component) can call `getExamRoute` without duplicating logic

### Semantic Badge Variants (REQ-002)

Status badges use shadcn `<Badge>` with semantic variants (`secondary`, `default`, `outline`, `destructive`) rather than explicit colors because:
- **Design token compliance**: Variants map to theme tokens (GUD-001), ensuring badges adapt correctly to light/dark mode
- **WCAG compliance**: Token-based colors are validated with axe in Layer 2 and Layer 3 tests; explicit colors risk failing the 4.5:1 contrast ratio (GUD-007)
- **Consistency**: Using the same variant vocabulary as other shadcn components reduces cognitive load for teachers reading the UI

### Empty State Component (CON-002)

A dedicated `<EmptyDashboard>` component is specified rather than an inline conditional because:
- **Accessibility**: Empty state needs its own accessible heading and descriptive text to be announced correctly by screen readers
- **Testability**: Isolated component can be tested for a11y violations independently (Layer 2)
- **Discoverability**: New teachers who land on an empty dashboard need a clear, prominent CTA to begin; a dedicated component makes this easier to iterate on without touching the list layout

---

## Section 8: Dependencies

| ID | Type | Description |
|----|------|-------------|
| SPEC-001 | Specification | `spec-process-extraction.md` — defines `ExamStatus` (6 values), `Exam`, and `ExamWithJoins` types imported by this spec; also defines the exam lifecycle this page reflects |
| SPEC-002 | Specification | `spec-design-auth.md` — defines the Supabase Auth + middleware contract that gates `/dashboard`; provides the `Profile` type and `auth.uid()` used to scope exam queries |
| SPEC-003 | Specification | `spec-process-new-exam.md` — upstream producer; the "Nova Adaptação" button links to `/exams/new` defined in that spec |
| SPEC-004 | Specification | `spec-process-adaptation.md` — downstream consumer; exams in `awaiting_answers` and `processing` statuses are managed by the adaptation process defined there |
| SPEC-005 | Specification | `spec-process-result.md` — downstream consumer; exams in `ready` status link to the result view defined there |
| DB-001 | Database | Supabase PostgreSQL — `exams` table with RLS (read access scoped to `exams.user_id = auth.uid()`); `subjects` and `grade_levels` tables (read-only joins) |
| LIB-001 | Library | `@supabase/ssr` — server-side Supabase client (`createServerClient`) used in `getTeacherExams` RSC data loader |
| PLT-001 | Platform | Next.js 16 App Router — RSC page at `/dashboard`; `async params` pattern where applicable (REQ-P05) |

---

## Section 9: Examples

### Example 1: Teacher with Exams in Multiple Statuses

**Scenario:** Teacher has 4 exams created on different dates in different statuses.

**Dashboard renders (newest first):**
1. "Prova de Frações" — Matemática, 6º ano — badge: `Aguardando Respostas` (outline) — link → `/exams/uuid-1/answers`
2. "Prova de Verbos" — Português, 8º ano — badge: `Pronto` (default) — link → `/exams/uuid-2/result`
3. "Prova de Células" — Ciências, 7º ano — badge: `Processando` (default) — link → `/exams/uuid-3/processing`
4. "Prova de Geografia" — Geografia, 9º ano — badge: `Erro` (destructive) — link → `/exams/uuid-4/processing`

**"Nova Adaptação" button** visible at the top of the page, links to `/exams/new`.

### Example 2: Teacher with No Exams

**Scenario:** Teacher logs in for the first time; `getTeacherExams()` returns an empty array.

**Dashboard renders:**
- Empty state component with heading "Nenhuma prova encontrada" (or equivalent)
- Descriptive text explaining that the teacher has not created any exams yet
- CTA button or link "Criar primeira adaptação" (or equivalent) linking to `/exams/new`
- "Nova Adaptação" button in the header also visible

### Example 3: `getExamStatusDisplay` Usage in `<ExamListItem>`

**Input:** `exam.status = 'awaiting_answers'`

**Flow:**
1. `getExamStatusDisplay('awaiting_answers')` returns `{ label: 'Aguardando Respostas', variant: 'outline' }`
2. `<Badge variant="outline">Aguardando Respostas</Badge>` rendered in the row

### Example 4: `getExamRoute` Usage in `<ExamListItem>`

**Input:** `examId = 'abc-123'`, `status = 'ready'`

**Flow:**
1. `getExamRoute('abc-123', 'ready')` returns `'/exams/abc-123/result'`
2. `<Link href="/exams/abc-123/result">` wraps the exam row
3. Teacher clicks the row and lands on the result view for that exam

### Example 5: Draft Exam After Partial Form Submission

**Scenario:** Teacher started creating a new exam but the browser tab was closed before completing the upload. Exam is in `draft` status.

**Dashboard renders:**
- Exam row with badge `Rascunho` (secondary variant)
- Row link → `/exams/uuid-5/new` (teacher can resume from where they left off)

---

## Section 10: Validation Checklist

The following checklist must be verified before this spec is considered implementation-ready:

- [x] Frontmatter complete: `title`, `version`, `date_created`, `last_updated`, `owner`, `tags`
- [x] All 11 sections present (Introduction through Related Specifications)
- [x] Global Constraints block present verbatim in Section 3
- [x] All feature REQs (REQ-001 through CON-002) traceable to PRD F3
- [x] Section 4 includes:
  - [x] `ExamWithJoins` TypeScript interface (exam + `subjects.name` + `grade_levels.name`)
  - [x] `getExamStatusDisplay(status)` signature with full mapping table (all 6 ExamStatus values → label + variant)
  - [x] `getExamRoute(examId, status)` signature with full mapping table (all 6 ExamStatus values → route string)
  - [x] `ExamStatus` all 6 values: `draft`, `uploading`, `processing`, `awaiting_answers`, `ready`, `error`
  - [x] Server-side data loading pattern (`getTeacherExams` with RSC + `React.cache()`)
  - [x] Component prop interfaces for `<ExamListItem>` and `<EmptyDashboard>`
- [x] Section 5 has ≥ 5 ACs in Given-When-Then format (8 ACs present)
- [x] Section 6 has all 3 test layers with specific named test cases
- [x] Section 6 Layer 1 covers: `getExamStatusDisplay` (all 6 status values); `getExamRoute` (all 6 status values)
- [x] Section 6 Layer 2 covers `<ExamListItem>` in all 6 status states; `<EmptyDashboard>`
- [x] Section 6 Layer 3 covers WCAG 2.2 AA; status badge labels; "Nova Adaptação" button accessible
- [x] Section 11 references at least 3 related specs

---

## Section 11: Related Specifications

| Spec | Relationship |
|------|-------------|
| `spec-process-extraction.md` | Cross-cutting — defines `ExamStatus` (6 values), `Exam`, and `ExamWithJoins` types that this spec imports; the exam lifecycle transitions displayed as badges originate there |
| `spec-design-auth.md` | Cross-cutting — defines the Supabase Auth + middleware contract that gates `/dashboard`; provides `Profile` and `auth.uid()` used to scope the exam list query to the authenticated teacher |
| `spec-process-new-exam.md` | Downstream from this spec — the "Nova Adaptação" button and empty state CTA both navigate to `/exams/new` defined in that spec |
| `spec-process-adaptation.md` | Downstream — exams in `awaiting_answers` and `processing` statuses displayed on this page are being processed by the pipeline defined in that spec |
| `spec-process-result.md` | Downstream — exams in `ready` status displayed on this page link to the side-by-side result view defined in that spec |
