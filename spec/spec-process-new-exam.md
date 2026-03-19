---
title: New Exam Form
version: 1.0
date_created: 2026-03-18
last_updated: 2026-03-18
owner: PRISMA Team
tags: [process, new-exam, form, upload, subject, grade-level, support, pdf]
---

# Introduction

This specification defines the new exam form: the teacher-facing UI where a new exam is initiated by selecting a subject, grade level, optional topic, at least one educational support, and uploading a PDF file. Upon successful submission the form calls `POST /api/exams` (defined in `spec-process-extraction.md`) and redirects to the processing page. This is the entry point of the teacher workflow and the upstream producer of all downstream processing specs.

---

## Section 1: Purpose & Scope

### Purpose

This document specifies the new exam form for the PRISMA ("Adapte Minha Prova") platform. It defines the form UI, client-side and server-side validation contracts, data interfaces, and acceptance criteria required to implement the feature described in PRD F4.

### In Scope

- `/exams/new` page — the route that renders the new exam form
- `<NewExamForm>` Client Component — the interactive form (subject select, grade level select, topic textarea, support checkboxes, file picker)
- `createExamSchema` Zod schema — validation for all form fields including file
- `validatePdfFile` utility function — file-level validation (MIME type, size)
- Server-side re-validation inside the `POST /api/exams` route handler (defined in `spec-process-extraction.md`)
- Server-side data loading (subjects, grade levels, supports) via RSC + `React.cache()`
- Redirect to `/exams/[id]/processing` on 201 response
- Subject, GradeLevel, and Support TypeScript interfaces

### Out of Scope

- `POST /api/exams` route handler implementation — see `spec-process-extraction.md`
- PDF extraction Edge Function — see `spec-process-extraction.md`
- Adaptation process and answer submission — see `spec-process-adaptation.md`
- Result display — see `spec-process-result.md`
- Authentication and middleware routing — see `spec-design-auth.md`

---

## Section 2: Definitions

| Term | Definition |
|------|-----------|
| Subject | A school discipline (e.g., Mathematics, Portuguese Language) stored in the `subjects` table |
| Grade Level | A school year or series (e.g., 6th year, 9th year) stored in the `grade_levels` table |
| Topic | An optional free-text field (max 500 chars) describing the specific topic or chapter covered by the exam (e.g., "Frações e decimais") |
| Support (apoio) | A pedagogical support strategy stored in the `supports` table; teachers select one or more supports to request adapted versions of each extracted question |
| `validatePdfFile` | A pure utility function that performs file-level validation: checks for null, wrong MIME type, and size > 25 MB |
| `createExamSchema` | Zod schema covering all non-file form fields plus the file; used for client-side validation and as the contract between the form and `POST /api/exams` |
| RSC | React Server Component — a component that runs on the server; used here to load subject, grade level, and support lists without client-side fetches |
| `React.cache()` | Next.js 16 + React 19 per-request cache; used to deduplicate DB reads when multiple Server Components request the same data in a single render pass |

---

## Section 3: Feature Requirements & Global Constraints

### Feature Requirements (PRD F4)

| ID | Requirement |
|----|------------|
| REQ-001 | Form SHALL require subject selection (F4.1) |
| REQ-002 | Form SHALL require grade level selection (F4.2) |
| REQ-003 | Form SHALL accept optional topic text (max 500 chars) (F4.3) |
| REQ-004 | Form SHALL require selection of at least one enabled support (F4.4) |
| REQ-005 | Form SHALL accept PDF only, max 25 MB (F4.5) |
| REQ-006 | Submit button SHALL be disabled during submission (REQ-P07) |
| REQ-007 | On 201 response, SHALL redirect to /exams/[id]/processing |
| CON-001 | Subject, grade level, and support lists loaded server-side via RSC + React.cache() |
| CON-002 | Client-side validation before submit; server-side validation in route handler |

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
// lib/types/exam-form.ts

export interface Subject {
  id: string;        // UUID — maps to subjects.id
  name: string;      // e.g. "Matemática"
}

export interface GradeLevel {
  id: string;        // UUID — maps to grade_levels.id
  name: string;      // e.g. "6º ano"
}

export interface Support {
  id: string;        // UUID — maps to supports.id
  name: string;      // e.g. "Apoio Visual"
  description: string | null;  // optional longer description shown as hint text
  enabled: boolean;  // only enabled supports are displayed in the form
}

export interface NewExamFormProps {
  subjects: Subject[];
  gradeLevels: GradeLevel[];
  supports: Support[];       // pre-filtered to enabled === true by the RSC loader
}
```

### 4.2 Zod Schema

```typescript
// lib/schemas/new-exam.ts
import { z } from 'zod';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
const ACCEPTED_MIME_TYPES = ['application/pdf'];

export const createExamSchema = z.object({
  subjectId: z.string().uuid('Selecione uma disciplina válida'),
  gradeLevelId: z.string().uuid('Selecione uma série válida'),
  topic: z.string().max(500, 'O tópico deve ter no máximo 500 caracteres').optional(),
  supportIds: z
    .array(z.string().uuid('ID de apoio inválido'))
    .min(1, 'Selecione pelo menos um apoio'),
  file: z
    .instanceof(File, { message: 'Selecione um arquivo PDF' })
    .refine((f) => ACCEPTED_MIME_TYPES.includes(f.type), {
      message: 'Apenas arquivos PDF são aceitos',
    })
    .refine((f) => f.size <= MAX_FILE_SIZE_BYTES, {
      message: 'O arquivo deve ter no máximo 25 MB',
    }),
});

export type CreateExamInput = z.infer<typeof createExamSchema>;
```

### 4.3 `validatePdfFile` Utility Function

```typescript
// lib/utils/pdf.ts

export interface PdfValidationError {
  code: 'NULL_FILE' | 'INVALID_MIME' | 'FILE_TOO_LARGE';
  message: string;
}

/**
 * Validates a File object for PDF upload requirements.
 * Returns null when valid; returns a PdfValidationError when invalid.
 * Pure function — no side effects.
 */
export function validatePdfFile(file: File | null): PdfValidationError | null;
```

Behavior contract:
- `null` input → `{ code: 'NULL_FILE', message: 'Selecione um arquivo PDF' }`
- Non-PDF MIME type → `{ code: 'INVALID_MIME', message: 'Apenas arquivos PDF são aceitos' }`
- `file.size > 25 * 1024 * 1024` → `{ code: 'FILE_TOO_LARGE', message: 'O arquivo deve ter no máximo 25 MB' }`
- Valid file → `null`

### 4.4 API Contract Reference

The form submits to `POST /api/exams` as multipart `FormData`. The full contract is defined in `spec-process-extraction.md` Section 4.4. Key summary:

**Request fields:**
| Field | Type | Required |
|-------|------|----------|
| `subjectId` | UUID string | Yes |
| `gradeLevelId` | UUID string | Yes |
| `topic` | string (max 500) | No |
| `supportIds` | repeated UUID strings | Yes (≥1) |
| `file` | File (PDF, max 25 MB) | Yes |

**Success response — 201 Created:**
```json
{ "id": "uuid-of-created-exam" }
```
On 201, the form redirects to `/exams/[id]/processing` using `router.push()` (REQ-007).

**Error responses — 400 / 401 / 500:** handled inline in the form with user-visible error messages; see Section 5 ACs for display behavior.

### 4.5 Server-Side Data Loading

```typescript
// lib/data/exam-form.ts
import { cache } from 'react';
import { createServerClient } from '@/lib/supabase/server';

// React.cache() deduplicates calls within a single server render pass (CON-001)
export const getSubjects = cache(async (): Promise<Subject[]> => { /* ... */ });
export const getGradeLevels = cache(async (): Promise<GradeLevel[]> => { /* ... */ });
export const getEnabledSupports = cache(async (): Promise<Support[]> => { /* ... */ });
```

The `/exams/new` RSC page calls all three functions, potentially in parallel via `Promise.all()`, and passes the results as props to `<NewExamForm>` (REQ-P02, CON-001).

---

## Section 5: Acceptance Criteria

| ID | Given | When | Then |
|----|-------|------|------|
| AC-001 | Authenticated teacher on `/exams/new`, all fields filled (subject, grade level, ≥1 support, valid PDF ≤ 25 MB) | Teacher clicks "Enviar" | Form submits `POST /api/exams` as FormData; on 201 response, teacher is redirected to `/exams/[id]/processing` |
| AC-002 | Teacher attempts to submit without selecting a subject | Submit button clicked | Inline error "Selecione uma disciplina válida" displayed below the subject field; form not submitted |
| AC-003 | Teacher attempts to submit without selecting any support | Submit button clicked | Inline error "Selecione pelo menos um apoio" displayed; form not submitted |
| AC-004 | Teacher selects a file > 25 MB | File picker selection confirmed | Inline error "O arquivo deve ter no máximo 25 MB" displayed; submit button remains disabled |
| AC-005 | Teacher selects a non-PDF file (e.g., .docx, .png) | File picker selection confirmed | Inline error "Apenas arquivos PDF são aceitos" displayed; submit button remains disabled |
| AC-006 | Teacher clicks "Enviar" with a valid form | Form is in submission state (awaiting API response) | Submit button is disabled with loading indicator; all inputs are disabled; no duplicate submission possible (REQ-006) |
| AC-007 | API responds with 400 (e.g., `FILE_TOO_LARGE`) | Server-side validation fails | Error message displayed inside the form; submit button re-enabled; teacher can correct and resubmit |
| AC-008 | Unauthenticated user navigates to `/exams/new` | Page loads | Middleware redirects to `/login` before the page renders (spec-design-auth.md) |

---

## Section 6: Test Strategy

### Layer 1 — Vitest + @testing-library/react

**Zod schema tests (`lib/schemas/new-exam.test.ts`)**
- `createExamSchema`: valid complete input passes
- `createExamSchema`: missing `subjectId` fails with message "Selecione uma disciplina válida"
- `createExamSchema`: `supportIds` as empty array fails with message "Selecione pelo menos um apoio"
- `createExamSchema`: `topic` exceeding 500 chars fails with message "O tópico deve ter no máximo 500 caracteres"
- `createExamSchema`: valid input with `topic` omitted passes (topic is optional)

**Utility function tests (`lib/utils/pdf.test.ts`)**
- `validatePdfFile`: `null` file returns `{ code: 'NULL_FILE', ... }`
- `validatePdfFile`: File with MIME `application/msword` returns `{ code: 'INVALID_MIME', ... }`
- `validatePdfFile`: File with correct MIME but size > 25 MB returns `{ code: 'FILE_TOO_LARGE', ... }`
- `validatePdfFile`: File with `application/pdf` MIME and size ≤ 25 MB returns `null`

Mock: `vi.mock('@/lib/supabase/server')`, `vi.mock('@/lib/supabase/client')`

### Layer 2 — jest-axe + Vitest

**Component: `<NewExamForm>` (`components/new-exam-form.test.tsx`)**
- State `initial` (all fields empty, not submitted): form rendered with all inputs; zero WCAG violations
- State `validation-errors` (submitted with missing required fields): inline error messages visible; each error associated with its field via `aria-describedby`; zero WCAG violations
- State `loading` (submit in progress): submit button has `aria-disabled="true"` and visible spinner; all inputs disabled; zero WCAG violations
- State `disabled` (during active submission): no interactive element is focusable; zero WCAG violations

All axe scans use tags: `wcag2a`, `wcag2aa`, `wcag22aa`

Mock: `vi.mock('@/lib/supabase/client')`, fetch mocked via `vi.stubGlobal('fetch', ...)`

### Layer 3 — Playwright + @axe-core/playwright

**Page: `/exams/new`**
- Full page axe scan with tags `wcag2a`, `wcag2aa`, `wcag22aa`; zero violations required
- WCAG 2.2 AA keyboard navigation: Tab moves focus from subject → grade level → topic → each support checkbox → file input → submit button in logical DOM order
- Support checkboxes: each checkbox is reachable by keyboard and togglable with Space key
- Error state: after submitting empty form, all error messages announced by screen reader (`role="alert"` or `aria-live="polite"`)
- Loading state: submit button `aria-disabled` and loading spinner has descriptive `aria-label`

**CI gate:** All Playwright a11y tests must pass before PR merge; `axe.disableRules()` forbidden.

**Coverage target:** 80% minimum on `validatePdfFile` utility and `createExamSchema` parsing logic.

---

## Section 7: Design Rationale

### RSC + React.cache() for Reference Data

Subject, grade level, and support lists change infrequently (managed by admins) but must be available on the form page. Loading them in a React Server Component with `React.cache()` was chosen over client-side fetching for the following reasons:
- **No loading flash**: Lists are fully resolved before the page HTML is streamed; teachers see a complete form immediately
- **No waterfalls**: `Promise.all([getSubjects(), getGradeLevels(), getEnabledSupports()])` parallelizes all three DB reads in a single server pass (REQ-P02)
- **Deduplication**: `React.cache()` ensures the same query is not executed twice if multiple RSC subtrees request the same list in one render (REQ-P03)
- **Bundle size**: DB query code stays server-side; no Supabase client code shipped to the browser for this page

### Client Component Scope

`<NewExamForm>` is a Client Component (`'use client'`) because:
- Form validation state, loading state, and error display require `useState`
- File picker and checkbox interactions require DOM event handlers
- `router.push()` after redirect requires `useRouter` (a client-only hook)

The parent `/exams/new` RSC page loads reference data and passes it as serializable props (`Subject[]`, `GradeLevel[]`, `Support[]`), keeping the client bundle minimal (REQ-P01).

### Client-Side Validation Before Submit

Validating with `createExamSchema` on the client before calling the API (CON-002) was chosen because:
- **Immediate feedback**: Teachers see inline errors instantly without a network round-trip
- **No wasted requests**: Invalid submissions never reach the server, reducing unnecessary API load
- **Not a security gate**: Server-side re-validation in the route handler is mandatory; client-side validation is convenience only
- **DRY**: `createExamSchema` is the single source of truth for both layers; Zod schema is imported in both the Client Component and the route handler

### Support Selection via Checkboxes

Educational supports are presented as checkboxes rather than a multi-select dropdown because:
- **Discoverability**: Teachers can see all available supports and their descriptions at a glance without opening a dropdown
- **Accessibility**: Native checkbox elements are natively keyboard-accessible and work predictably with screen readers (WCAG 2.2 Success Criterion 4.1.2)
- **Touch targets**: Checkboxes with visible labels are easier to tap on mobile devices, meeting the 44×44px minimum (GUD-003)

---

## Section 8: Dependencies

| ID | Type | Description |
|----|------|-------------|
| SPEC-001 | Specification | `spec-process-extraction.md` — defines `POST /api/exams` contract that `<NewExamForm>` calls on submit; also defines `Exam` and `ExamStatus` types |
| SPEC-002 | Specification | `spec-design-auth.md` — defines the Supabase Auth + middleware contract that gates `/exams/new`; unauthenticated users are redirected before the page loads |
| SPEC-003 | Specification | `spec-process-repository.md` — defines the repository layer for reading `subjects`, `grade_levels`, and `supports` tables used by RSC data loaders |
| DB-001 | Database | Supabase PostgreSQL — `subjects`, `grade_levels`, `supports` tables (read-only for form); `exams` table (written by `POST /api/exams`) |
| LIB-001 | Library | `@supabase/ssr` — server-side Supabase client used in RSC data loaders |
| LIB-002 | Library | Zod — `createExamSchema` for client-side and server-side validation |
| LIB-003 | Library | `next/navigation` (`useRouter`) — client-side redirect to `/exams/[id]/processing` on 201 |
| PLT-001 | Platform | Next.js 16 App Router — RSC page at `/exams/new`; `async params` pattern (REQ-P05) |

---

## Section 9: Examples

### Example 1: Successful Form Submission

**Scenario:** Teacher selects "Matemática" (subject), "6º ano" (grade level), types "Frações e decimais" (topic), checks "Apoio Visual" and "Texto Simplificado" (supports), and uploads `prova-fracoes.pdf` (3.2 MB).

**Flow:**
1. Teacher clicks "Enviar"
2. `createExamSchema.parse(formData)` — passes; `validatePdfFile(file)` returns `null`
3. Submit button disabled, loading spinner shown
4. `POST /api/exams` called with FormData: `{ subjectId, gradeLevelId, topic, supportIds: [uuid1, uuid2], file }`
5. API responds `201 { "id": "abc-123" }`
6. `router.push('/exams/abc-123/processing')` executes
7. Teacher sees the processing page

### Example 2: PDF Exceeds 25 MB

**Scenario:** Teacher selects all required fields and uploads `prova-grande.pdf` (31.5 MB).

**Flow:**
1. File picker fires `change` event
2. `validatePdfFile(file)` returns `{ code: 'FILE_TOO_LARGE', message: 'O arquivo deve ter no máximo 25 MB' }`
3. Error displayed below file input: "O arquivo deve ter no máximo 25 MB"
4. Submit button remains disabled (form is in invalid state)
5. Teacher replaces the file with a smaller PDF; error clears

### Example 3: No Support Selected

**Scenario:** Teacher fills all fields but forgets to check any support checkbox.

**Flow:**
1. Teacher clicks "Enviar"
2. `createExamSchema.parse(formData)` fails on `supportIds` (empty array)
3. Inline error displayed in the support section: "Selecione pelo menos um apoio"
4. No network request made
5. Teacher checks at least one support; error clears on next change event

### Example 4: Server Returns 400 After Bypass Attempt

**Scenario:** Client-side validation is somehow bypassed and the file is too large.

**Flow:**
1. `POST /api/exams` route handler calls `validatePdfFile(file)` server-side
2. Returns `400 { "error": "FILE_TOO_LARGE", "details": "File size 31.5 MB exceeds the 25 MB limit" }`
3. `<NewExamForm>` receives 400 response, displays error banner: "O arquivo deve ter no máximo 25 MB"
4. Submit button re-enabled; teacher can correct and resubmit

### Example 5: Topic Character Limit

**Scenario:** Teacher types a 510-character topic string.

**Flow:**
1. Topic `<textarea>` shows a live character counter (e.g., "510 / 500")
2. Character counter turns destructive (red via `text-destructive` token) when limit is exceeded
3. On submit attempt, `createExamSchema` fails on `topic` field
4. Inline error: "O tópico deve ter no máximo 500 caracteres"
5. Form not submitted until topic is shortened to ≤ 500 chars

---

## Section 10: Validation Checklist

The following checklist must be verified before this spec is considered implementation-ready:

- [x] Frontmatter complete: `title`, `version`, `date_created`, `last_updated`, `owner`, `tags`
- [x] All 11 sections present (Introduction through Related Specifications)
- [x] Global Constraints block present verbatim in Section 3
- [x] All feature REQs (REQ-001 through CON-002) traceable to PRD F4
- [x] Section 4 includes:
  - [x] TypeScript interfaces: `Subject`, `GradeLevel`, `Support`, `NewExamFormProps`
  - [x] Zod schema: `createExamSchema` (subjectId uuid, gradeLevelId uuid, topic max 500 optional, supportIds uuid[] min 1, file PDF max 25 MB)
  - [x] `validatePdfFile` function signature with full behavior contract (null, wrong MIME, >25 MB, valid)
  - [x] Reference to `POST /api/exams` contract from spec-process-extraction
  - [x] Server-side data loading pattern (RSC + React.cache())
- [x] Section 5 has ≥ 5 ACs in Given-When-Then format (8 ACs present)
- [x] Section 6 has all 3 test layers with specific named test cases
- [x] Section 6 Layer 1 covers: `createExamSchema` (valid, missing subjectId, empty supportIds, topic >500 chars); `validatePdfFile` (null, wrong MIME, >25 MB, valid)
- [x] Section 6 Layer 2 covers `<NewExamForm>` in states: initial, validation-errors, loading, disabled
- [x] Section 6 Layer 3 covers WCAG 2.2 AA and keyboard navigation through support checkboxes
- [x] Section 11 references at least 3 related specs

---

## Section 11: Related Specifications

| Spec | Relationship |
|------|-------------|
| `spec-process-extraction.md` | Downstream — defines `POST /api/exams` that this form submits to; also defines `Exam` and `ExamStatus` types; lists `spec-process-new-exam.md` as its upstream UI |
| `spec-design-auth.md` | Cross-cutting — defines the Supabase Auth + middleware contract that gates `/exams/new`; unauthenticated users are redirected before the form loads |
| `spec-process-repository.md` | Cross-cutting — defines the repository layer for reading `subjects`, `grade_levels`, and `supports` tables consumed by the RSC data loaders in this spec |
| `spec-process-adaptation.md` | Downstream — consumes `supportIds` submitted through this form (stored in `exam_supports`); the support selection made here determines which adaptations are generated |
| `spec-process-result.md` | Downstream — the final step of the workflow initiated by this form; displays adapted results after extraction and adaptation complete |
