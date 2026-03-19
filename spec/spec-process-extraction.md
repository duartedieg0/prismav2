---
title: PDF Extraction Process
version: 1.0
date_created: 2026-03-18
last_updated: 2026-03-18
owner: PRISMA Team
tags: [process, extraction, ocr, llm, edge-function, supabase]
---

# Introduction

This specification defines the PDF extraction process: receiving a teacher-uploaded PDF, converting it to images, extracting questions via a multimodal LLM, and persisting the result to Postgres. This is the entry point of the exam adaptation workflow; all downstream specs depend on the contracts defined here.

---

## Section 1: Purpose & Scope

### Purpose

This document specifies the complete PDF extraction process for the PRISMA ("Adapte Minha Prova") platform. It defines the API surface, data contracts, database schema changes, and acceptance criteria required to implement the feature described in PRD F5.

### In Scope

- `POST /api/exams` route handler (FormData upload, exam record creation, Storage upload, Edge Function invocation)
- Supabase Storage upload to the `exams` bucket
- `extract-questions` Edge Function (multimodal LLM call, question parsing, exam status transitions)
- `ExtractionStatus` component (client-side polling of exam status)
- `GET /api/exams/[id]/status` status polling endpoint
- `ExamStatus` enum, `Exam`, `Question`, `ExtractionResult`, and `ExamWithJoins` TypeScript types
- Exam status lifecycle: `draft → uploading → processing → awaiting_answers | error`

### Out of Scope

- BNCC/Bloom taxonomy analysis and adaptation logic — see `spec-process-adaptation.md`
- Side-by-side result display with adapted questions — see `spec-process-result.md`
- New-exam form UI (subject/grade_level selection, file picker) — see `spec-process-new-exam.md`

---

## Section 2: Definitions

| Term | Definition |
|------|-----------|
| `ExamStatus` | Enum with 6 values: `draft`, `uploading`, `processing`, `awaiting_answers`, `ready`, `error` |
| OCR | Optical Character Recognition — extracting text from scanned/image-based PDF pages |
| LLM Multimodal | Large Language Model capable of processing both text and image inputs (e.g., GPT-4o) |
| `extraction_warning` | Non-fatal warning stored on the `exams` record when some pages fail OCR but others succeed; persists partial results |
| `awaiting_answers` | Intermediate exam status after successful extraction, before the teacher provides correct answers for each question |
| `ExtractionResult` | TypeScript type returned by the `extract-questions` Edge Function, containing extracted questions and optional warnings |
| `ExamWithJoins` | TypeScript type joining `exams` with `subjects`, `grade_levels`, and `questions` for display components |

---

## Section 3: Feature Requirements & Global Constraints

### Feature Requirements (PRD F5)

| ID | Requirement |
|----|------------|
| REQ-001 | System SHALL extract objective and essay questions from PDFs up to 25 MB |
| REQ-002 | On partial OCR failure, SHALL persist successfully extracted questions and populate `extraction_warning` |
| REQ-003 | After extraction, SHALL display questions and prompt teacher to provide correct answers (F5.4) |
| REQ-004 | System SHALL support visual elements (tables, images) unchanged in the adapted version (F5.3) |
| CON-001 | Edge Function timeout ~150s; batch processing required for exams with >10 questions |
| CON-002 | PDF sent as base64 to multimodal LLM; no page-by-page conversion in MVP |
| SEC-001 | Storage bucket `exams` RLS — teacher accesses only their own `{userId}/{examId}.pdf` |

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

### 4.1 Database Schema

#### Table: `exams` (existing)

> **Current schema** — from migration `20260318000001_initial_schema.sql`

```sql
create table if not exists public.exams (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  subject_id uuid references public.subjects(id) on delete restrict not null,
  grade_level_id uuid references public.grade_levels(id) on delete restrict not null,
  title text not null,
  file_path text,
  status text default 'draft' check (status in ('draft', 'processing', 'completed', 'error')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

> **Target schema** — requires a new migration (not yet written)

```sql
-- Migration: add extraction columns to exams and expand status enum
alter table public.exams
  drop constraint exams_status_check,
  add constraint exams_status_check
    check (status in ('draft', 'uploading', 'processing', 'awaiting_answers', 'ready', 'error')),
  add column if not exists topic text,
  add column if not exists extraction_warning text,
  add column if not exists error_message text;
```

Changes summary:
- `status` CHECK expanded from 4 values (`draft`, `processing`, `completed`, `error`) to 6 values (`draft`, `uploading`, `processing`, `awaiting_answers`, `ready`, `error`). Note: `completed` renamed to `ready`.
- `topic` (text, nullable) — optional topic/chapter descriptor provided by teacher
- `extraction_warning` (text, nullable) — non-fatal OCR failure description for partial extractions
- `error_message` (text, nullable) — fatal error detail when `status = 'error'`

#### Table: `questions` (existing)

> **Current schema** — from migration `20260318000001_initial_schema.sql`

```sql
create table if not exists public.questions (
  id uuid primary key default uuid_generate_v4(),
  exam_id uuid references public.exams(id) on delete cascade not null,
  text text not null,
  order_number integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

> **Target schema** — requires a new migration (not yet written)

```sql
-- Migration: add structured question columns
alter table public.questions
  add column if not exists alternatives jsonb,
  add column if not exists correct_answer text;
```

Changes summary:
- `alternatives` (JSONB, nullable) — array of answer options for multiple-choice questions (e.g. `["A) ...", "B) ...", "C) ...", "D) ..."]`); null for essay questions
- `correct_answer` (text, nullable) — teacher-provided correct answer letter or text; populated after `awaiting_answers` phase

### 4.2 TypeScript Types

```typescript
// lib/types/exam.ts

export type ExamStatus =
  | 'draft'
  | 'uploading'
  | 'processing'
  | 'awaiting_answers'
  | 'ready'
  | 'error';

export interface Exam {
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
}

export interface Question {
  id: string;
  examId: string;
  text: string;
  orderNumber: number;
  alternatives: string[] | null;   // null for essay questions
  correctAnswer: string | null;    // null until teacher provides answer
  createdAt: string;
}

export interface ExtractionResult {
  questions: Array<{
    text: string;
    orderNumber: number;
    alternatives: string[] | null;
  }>;
  warning?: string;  // present when partial OCR failure occurred
}

export interface ExamWithJoins extends Exam {
  subject: {
    id: string;
    name: string;
  };
  gradeLevel: {
    id: string;
    name: string;
  };
  questions: Question[];
}
```

### 4.3 Zod Schemas

```typescript
// lib/schemas/exam.ts
import { z } from 'zod';

export const createExamSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  subjectId: z.string().uuid('Invalid subject'),
  gradeLevelId: z.string().uuid('Invalid grade level'),
  topic: z.string().max(500).optional(),
  // file validated separately via validatePdfFile()
});

export type CreateExamInput = z.infer<typeof createExamSchema>;

export const extractedQuestionSchema = z.object({
  text: z.string().min(1),
  orderNumber: z.number().int().positive(),
  alternatives: z.array(z.string()).nullable(),
});

export type ExtractedQuestion = z.infer<typeof extractedQuestionSchema>;
```

### 4.4 API Contracts

#### `POST /api/exams`

Accepts multipart `FormData`. Creates the exam record, uploads the PDF, and triggers the Edge Function.

**Request**
```
Content-Type: multipart/form-data

Fields:
  title         string  (required)
  subjectId     UUID    (required)
  gradeLevelId  UUID    (required)
  topic         string  (optional, max 500 chars)
  file          File    (required, PDF, max 25 MB)
```

**Response — 201 Created**
```json
{ "id": "uuid-of-created-exam" }
```

**Response — 400 Bad Request**
```json
{ "error": "FILE_TOO_LARGE" | "INVALID_FILE_TYPE" | "VALIDATION_ERROR", "details": "..." }
```

**Response — 401 Unauthorized**
```json
{ "error": "UNAUTHENTICATED" }
```

**Response — 500 Internal Server Error**
```json
{ "error": "UPLOAD_FAILED" | "TRIGGER_FAILED", "details": "..." }
```

#### `GET /api/exams/[id]/status`

Polls the exam status for the `ExtractionStatus` component.

**Response — 200 OK**
```json
{
  "status": "draft" | "uploading" | "processing" | "awaiting_answers" | "ready" | "error",
  "errorMessage": "string or absent"
}
```

**Response — 403 Forbidden** — exam does not belong to authenticated user
**Response — 404 Not Found** — exam does not exist

### 4.5 Edge Function Contract: `extract-questions`

**Invocation:** called from `POST /api/exams` route handler via `supabase.functions.invoke()`

**Input**
```typescript
interface ExtractQuestionsPayload {
  examId: string;
  filePath: string;  // Supabase Storage path: {userId}/{examId}.pdf
  userId: string;
}
```

**Output** (returned to caller; also written to DB internally)
```typescript
interface ExtractQuestionsResponse {
  success: boolean;
  questionsCount: number;
  warning?: string;  // partial OCR failure description
  error?: string;    // present only when success = false
}
```

**Side effects on DB:**
1. Sets `exams.status = 'processing'` on start
2. Inserts rows into `questions` for each extracted question
3. On success: sets `exams.status = 'awaiting_answers'`; populates `exams.extraction_warning` if partial failure
4. On fatal failure: sets `exams.status = 'error'` and populates `exams.error_message`

---

## Section 5: Acceptance Criteria

| ID | Given | When | Then |
|----|-------|------|------|
| AC-001 | Valid PDF ≤ 25 MB, authenticated teacher, valid `subjectId` and `gradeLevelId` | `POST /api/exams` with FormData | Exam record created with `status = 'uploading'`, PDF stored at `{userId}/{examId}.pdf`, Edge Function triggered, response `201 { id }` |
| AC-002 | PDF where one or more pages are illegible/low-quality | Extraction Edge Function runs | All successfully extracted questions persisted to `questions`, `exams.extraction_warning` populated with description of failed pages, `status = 'awaiting_answers'` |
| AC-003 | Exam with `status = 'awaiting_answers'` | Teacher navigates to `/exams/[id]/extraction` | All extracted questions displayed with correct-answer input fields; teacher can submit answers |
| AC-004 | PDF > 25 MB | `POST /api/exams` | Response `400 { error: "FILE_TOO_LARGE" }`, no exam record created, no file uploaded |
| AC-005 | Edge Function processing exceeds timeout (~150s) | Processing time limit reached | `exams.status` set to `'error'`, `exams.error_message` populated with timeout description, teacher shown error state with retry option |
| AC-006 | Unauthenticated request | `POST /api/exams` or `GET /api/exams/[id]/status` | Response `401 { error: "UNAUTHENTICATED" }`, no data accessed |
| AC-007 | Authenticated teacher polls status for exam belonging to another user | `GET /api/exams/[id]/status` | Response `403 { error: "FORBIDDEN" }` |

---

## Section 6: Test Strategy

### Layer 1 — Vitest + @testing-library/react

**Zod schema tests (`lib/schemas/exam.test.ts`)**
- `createExamSchema`: valid input passes; missing `subjectId` fails; missing `gradeLevelId` fails; `topic` exceeding 500 chars fails; empty `title` fails
- `extractedQuestionSchema`: valid objective question with alternatives passes; valid essay question with `alternatives: null` passes; missing `text` fails; non-integer `orderNumber` fails

**Utility function tests (`lib/utils/exam.test.ts`)**
- `validatePdfFile`: non-PDF MIME type returns error; file > 25 MB returns error; `null` file returns error; valid PDF ≤ 25 MB returns null (no error)
- `getExamStatusDisplay`: returns correct label and icon for all 6 `ExamStatus` values (`draft`, `uploading`, `processing`, `awaiting_answers`, `ready`, `error`)
- `getExamRoute`: returns correct Next.js route for all 6 `ExamStatus` values

**Hook tests (`hooks/use-exam-status.test.ts`)**
- Polls `GET /api/exams/[id]/status` every 2s while `status` is `uploading` or `processing`
- Stops polling when status reaches terminal state (`awaiting_answers`, `ready`, `error`)
- Calls `onComplete` callback on `awaiting_answers` or `ready`
- Calls `onError` callback on `error`

Mock: `vi.mock('@/lib/supabase/server')`, `vi.mock('@/lib/supabase/client')`

### Layer 2 — jest-axe + Vitest

**Component: `<ExtractionStatus>` (`components/extraction-status.test.tsx`)**
- State `loading`: spinner visible; zero WCAG violations
- State `partial-success` (with `extraction_warning`): warning banner visible; zero WCAG violations
- State `error` (with `error_message`): error message visible, retry button present; zero WCAG violations
- State `complete` (`status = 'awaiting_answers'`): question count displayed, CTA visible; zero WCAG violations

All axe scans use tags: `wcag2a`, `wcag2aa`, `wcag22aa`

Mock: `vi.mock('supabase/functions/extract-questions')`

### Layer 3 — Playwright + @axe-core/playwright

**Page: `/exams/[id]/extraction`**
- Full page axe scan with tags `wcag2a`, `wcag2aa`, `wcag22aa`; zero violations required
- Error state: `extraction_warning` message visible and accessible to screen readers
- Loading state: spinner has `aria-label`; page title announces processing status
- Complete state: question list renders; correct-answer inputs have associated labels

**CI gate:** All Playwright a11y tests must pass before PR merge; `axe.disableRules()` forbidden.

**Coverage target:** 80% minimum on `extract-questions` Edge Function utility functions (question parser, status updater, LLM response validator).

---

## Section 7: Design Rationale

### Multimodal LLM vs. Tesseract OCR

A multimodal LLM (e.g., GPT-4o) was chosen over Tesseract for the following reasons:
- **Quality**: Multimodal LLMs handle low-quality scans, handwriting, and mixed-language documents better than Tesseract
- **Tables and images**: Multimodal LLMs can describe and preserve visual elements (tables, diagrams) natively; Tesseract discards non-text content
- **Structure extraction**: A single LLM call can simultaneously perform OCR and parse the question structure (number, stem, alternatives) without a separate NLP pipeline
- **Trade-off**: Higher cost per extraction and dependency on external API; mitigated by the low frequency of exam uploads (teachers upload infrequently)

### Edge Function vs. Inngest / BullMQ

Supabase Edge Functions were chosen over a dedicated job queue (Inngest, BullMQ) because:
- **No extra infrastructure**: Edge Functions run on Supabase's existing Deno runtime; no additional service to deploy or pay for in MVP
- **Acceptable timeout**: The ~150s timeout is sufficient for exams up to ~10 questions in MVP; batch processing handles larger exams
- **Simpler mental model**: Direct invocation from the API route is easier to trace than an async job queue for the initial release
- **Future migration path**: If timeout becomes a bottleneck post-MVP, the Edge Function can be replaced with an Inngest workflow without changing the API surface or database schema

### Polling vs. Supabase Realtime

Client-side polling via `GET /api/exams/[id]/status` was chosen over Supabase Realtime subscriptions because:
- **Simplicity**: Polling requires no WebSocket connection management or Realtime channel cleanup
- **Reliability**: Polling degrades gracefully on poor network connections; Realtime requires reconnection logic
- **MVP scope**: Extraction typically completes within 30–60s; polling every 2s provides acceptable UX without Realtime overhead
- **Future upgrade**: Realtime can replace polling without changing the `ExamStatus` data model

---

## Section 8: Dependencies

| ID | Type | Description |
|----|------|-------------|
| EXT-001 | External Service | Supabase Edge Functions (Deno runtime) — hosts and executes `extract-questions` |
| SVC-001 | External API | OpenAI-compatible multimodal LLM (e.g., GPT-4o via OpenAI API or Azure OpenAI) — performs OCR + question extraction |
| INF-001 | Infrastructure | Supabase Storage bucket `exams` — stores uploaded PDFs; RLS enforces per-user access |
| PLT-001 | Platform | Next.js 16 App Router, Node.js runtime — hosts `POST /api/exams` and `GET /api/exams/[id]/status` route handlers |
| DB-001 | Database | Supabase PostgreSQL — `exams` and `questions` tables with RLS policies |
| LIB-001 | Library | `@supabase/ssr` — server-side Supabase client for auth and DB access in Next.js route handlers |
| LIB-002 | Library | Zod — runtime validation of FormData inputs and Edge Function responses |

---

## Section 9: Examples

### Example 1: Scanned PDF with Partial OCR Failure

**Scenario:** Teacher uploads a 10-page scanned exam PDF. Pages 1–8 are high-quality; pages 9–10 are blurry.

**Flow:**
1. `POST /api/exams` → exam created (`status = 'uploading'`), PDF stored
2. Edge Function starts → `status = 'processing'`
3. LLM extracts 8 questions from pages 1–8; returns warning for pages 9–10
4. 8 questions inserted into `questions`; `exams.extraction_warning = "Pages 9–10 could not be parsed due to low image quality"`; `status = 'awaiting_answers'`
5. Teacher sees 8 questions with warning banner: "2 pages could not be extracted. Please review."

### Example 2: PDF with Table

**Scenario:** Teacher uploads a science exam containing a data table followed by 3 questions about it.

**Flow:**
1. LLM receives base64 PDF and is instructed to preserve table content verbatim in the question `text`
2. Extracted `text` for Q1: `"Based on the table below:\n| Species | Population |\n|---------|------------|\n| ...\nWhat is the trend shown?"`
3. Table is stored as Markdown inside `questions.text`; no separate visual asset stored in MVP
4. Adaptation spec (`spec-process-adaptation.md`) defines how the table is preserved in adapted versions (REQ-004)

### Example 3: PDF Rejected for Exceeding Size Limit

**Scenario:** Teacher attempts to upload a 30 MB PDF scan.

**Flow:**
1. Client-side validation in the form detects file > 25 MB before submission
2. If bypassed, `POST /api/exams` route handler runs `validatePdfFile()` → returns `FILE_TOO_LARGE`
3. Response: `400 { "error": "FILE_TOO_LARGE", "details": "File size 30.1 MB exceeds the 25 MB limit" }`
4. No exam record created; no file uploaded to Storage

---

## Section 10: Validation Checklist

The following checklist must be verified before this spec is considered implementation-ready:

- [x] Frontmatter complete: `title`, `version`, `date_created`, `last_updated`, `owner`, `tags`
- [x] All 11 sections present (Introduction through Related Specifications)
- [x] Global Constraints block present verbatim in Section 3
- [x] All feature REQs (REQ-001 through SEC-001) traceable to PRD F5
- [x] Section 4 includes:
  - [x] Current SQL schema for `exams` (from existing migration)
  - [x] Target SQL schema changes for `exams` (clearly marked as requiring new migration)
  - [x] Current SQL schema for `questions` (from existing migration)
  - [x] Target SQL schema changes for `questions` (clearly marked as requiring new migration)
  - [x] TypeScript types: `ExamStatus`, `Exam`, `Question`, `ExtractionResult`, `ExamWithJoins`
  - [x] Zod schemas: `createExamSchema`, `extractedQuestionSchema`
  - [x] API contract: `POST /api/exams` (FormData → `{ id: string }`)
  - [x] API contract: `GET /api/exams/[id]/status` (→ `{ status, errorMessage? }`)
  - [x] Edge Function `extract-questions` input/output contract
- [x] Section 5 has ≥ 5 ACs in Given-When-Then format (7 ACs present)
- [x] Section 6 has all 3 test layers with specific named test cases
- [x] Section 11 references at least 3 related specs

---

## Section 11: Related Specifications

| Spec | Relationship |
|------|-------------|
| `spec-process-adaptation.md` | Downstream — consumes `ExamWithJoins`, `Question`, and `ExamStatus` types defined here; triggered after `status = 'awaiting_answers'` |
| `spec-process-new-exam.md` | Upstream UI — defines the teacher-facing form that produces the `POST /api/exams` request specified here |
| `spec-process-result.md` | Downstream — defines the side-by-side result display after adaptation; depends on `Question` and `Exam` types |
| `spec-design-auth.md` | Cross-cutting — defines the Supabase Auth + middleware contract that gates all routes in this spec; `SEC-001` depends on it |
