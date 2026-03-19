---
title: Adaptation Result Display
version: 1.0
date_created: 2026-03-18
last_updated: 2026-03-18
owner: PRISMA Team
tags: [process, result, feedback, bncc, bloom, copy-clipboard, star-rating]
---

# Introduction

This specification defines how adapted exam results are displayed to teachers, including BNCC/Bloom analysis per question, copyable content blocks for direct paste into Word/Google Docs, and the feedback mechanism (star rating + free-text comments). This is the final step of the exam adaptation workflow. It depends on types established in `spec-process-extraction.md` (`Exam`, `Question`) and `spec-process-adaptation.md` (`Adaptation`, `AdaptedAlternative`, `BnccAnalysis`, `BloomAnalysis`).

---

## Section 1: Purpose & Scope

### Purpose

This document specifies the adaptation result page for the PRISMA ("Adapte Minha Prova") platform. It defines the page structure, data contracts, copyable block format rules, feedback API, and acceptance criteria required to implement the feature described in PRD F7.

### In Scope

- `/exams/[id]/result` page — the result display route after `exams.status = 'ready'`
- `<QuestionResultCard>` component — per-question card showing adapted content, BNCC/Bloom analysis, copy button, and feedback form
- Copy-to-clipboard behavior and copyable block format rules (PAT-007, PAT-008)
- BNCC skill display per question (F7.3)
- Bloom cognitive level display per question (F7.4)
- Star rating (0–5) per adapted question (F7.5)
- Free-text comment field (max 5000 chars) per adapted question (F7.6)
- Informational message about how feedback improves future adaptations (F7.7)
- `POST /api/exams/[id]/feedback` route handler — fire-and-forget feedback submission (F7.8)
- `Feedback` TypeScript interface and `saveFeedbackSchema` Zod schema
- `generateCopyableBlock` utility function

### Out of Scope

- PDF extraction — see `spec-process-extraction.md`
- Adaptation generation (LLM calls, BNCC/Bloom analysis pipeline) — see `spec-process-adaptation.md`
- New-exam form UI (subject/grade level selection, file picker, support selection) — see `spec-process-new-exam.md`

---

## Section 2: Definitions

| Term | Definition |
|------|-----------|
| Copyable Block | A pre-formatted text string derived from an `Adaptation` record, designed for direct paste into Word or Google Docs; format depends on question type (PAT-007 for MC, PAT-008 for essay) |
| Star Rating | A 0–5 integer rating provided by the teacher for an adapted question's quality; 0 means no rating submitted |
| Feedback | A teacher-submitted evaluation of an adaptation, consisting of an optional star rating (0–5) and an optional free-text comment (max 5000 chars) |
| Fire-and-forget | Feedback submission pattern where the API response `{ ok: true }` is returned immediately without waiting for DB persistence to complete; the UI does not block on feedback submission |
| BNCC Display | Rendering of `bnccSkillCode` and `bnccSkillDescription` as read-only metadata on each question card |
| Bloom Display | Rendering of `bloomLevel` and `bloomJustification` as read-only metadata on each question card |
| `QuestionResultCard` | A compound component that renders one question's original text, one or more adapted versions, BNCC/Bloom metadata, copy buttons, and a feedback form |

---

## Section 3: Feature Requirements & Global Constraints

### Feature Requirements (PRD F7)

| ID | Requirement |
|----|------------|
| REQ-001 | SHALL display exam info (subject, grade level, topic, selected supports) at the top of the result page (F7.1) |
| REQ-002 | SHALL display adapted content per question with a copy-to-clipboard button (F7.2) |
| REQ-003 | SHALL display BNCC skills analysis per question (F7.3) |
| REQ-004 | SHALL display Bloom level analysis per question (F7.4) |
| REQ-005 | SHALL provide a 0–5 star rating input per adapted question (F7.5) |
| REQ-006 | SHALL provide a free-text comment field (max 5000 chars) per adapted question (F7.6) |
| REQ-007 | SHALL display a message informing the teacher that comments help improve future adaptations (F7.7) |
| REQ-008 | Feedback submission SHALL NOT block result viewing — fire-and-forget pattern (F7.8) |
| PAT-007 | Multiple choice copyable block format: `"[statement]\n\na) text\nb) text ✓\nc) text"` — correct alternative marked with `✓` |
| PAT-008 | Essay copyable block format: `"[adapted statement only]"` — plain text, no alternatives |

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

#### Table: `feedbacks` (existing)

> **Current schema** — from migration `20260318000001_initial_schema.sql`

```sql
create table if not exists public.feedbacks (
  id uuid primary key default uuid_generate_v4(),
  question_id uuid references public.questions(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  rating integer,
  comment text,
  dismissed_from_evolution boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

> **Target schema** — requires a new migration (not yet written)

```sql
-- Migration: add adaptation_id foreign key and rating constraint to feedbacks
alter table public.feedbacks
  add column if not exists adaptation_id uuid references public.adaptations(id) on delete cascade,
  add constraint feedbacks_rating_check check (rating is null or (rating >= 0 and rating <= 5));
```

Changes summary:
- `adaptation_id` (uuid, FK to `adaptations`, nullable) — links feedback to the specific adaptation record being rated; allows multiple feedbacks per question (one per support/adaptation pair)
- `rating` — constrained to 0–5 via CHECK; `null` means no rating submitted (comment-only feedback is allowed)

#### Table: `adaptations` (depends on spec-process-adaptation.md)

No schema changes required by this spec. The `adaptations` table as defined in `spec-process-adaptation.md` (target schema) already provides all columns needed for the result display: `adapted_statement`, `adapted_alternatives`, `bncc_skill_code`, `bncc_skill_description`, `bloom_level`, `bloom_justification`, `status`, `support_id`.

### 4.2 TypeScript Types

```typescript
// lib/types/feedback.ts
// Imports Adaptation, AdaptedAlternative, BnccAnalysis, BloomAnalysis from lib/types/adaptation.ts
// Imports Exam, Question from lib/types/exam.ts

export interface Feedback {
  id: string;
  questionId: string;
  adaptationId: string | null;
  userId: string;
  rating: number | null;       // 0–5; null means not yet rated
  comment: string | null;      // max 5000 chars; null means no comment
  dismissedFromEvolution: boolean;
  createdAt: string;
}

export interface QuestionResult {
  question: Question;
  adaptations: AdaptationWithFeedback[];
}

export interface AdaptationWithFeedback {
  adaptation: Adaptation;
  feedback: Feedback | null;   // null if teacher has not yet submitted feedback
  copyableBlock: string;       // pre-generated by generateCopyableBlock()
}

export interface ExamResult {
  exam: ExamWithJoins;
  questionResults: QuestionResult[];
}
```

### 4.3 Zod Schemas

```typescript
// lib/schemas/feedback.ts
import { z } from 'zod';

export const saveFeedbackSchema = z.object({
  adaptationId: z.string().uuid('Invalid adaptation ID'),
  rating: z
    .number()
    .int('Rating must be an integer')
    .min(0, 'Rating must be at least 0')
    .max(5, 'Rating must be at most 5')
    .optional(),
  comment: z
    .string()
    .max(5000, 'Comment must not exceed 5000 characters')
    .optional(),
});

export type SaveFeedbackInput = z.infer<typeof saveFeedbackSchema>;
```

### 4.4 Utility Function Signature

```typescript
// lib/utils/copyable-block.ts

import type { Adaptation } from '@/lib/types/adaptation';

/**
 * Generates a plain-text copyable block for an adaptation.
 *
 * Multiple choice format (PAT-007):
 *   "[adapted statement]\n\na) text\nb) text ✓\nc) text\nd) text"
 *   — correct alternative identified via adaptation.adaptedAlternatives[i].label === question.correctAnswer
 *
 * Essay format (PAT-008):
 *   "[adapted statement only]"
 *
 * @param adaptation - The completed Adaptation record (status must be 'completed')
 * @param correctAnswer - The correct answer label (e.g. "B") to mark with ✓; null for essay questions
 * @returns Formatted string ready for clipboard
 */
export function generateCopyableBlock(
  adaptation: Adaptation,
  correctAnswer: string | null
): string;
```

### 4.5 API Contracts

#### `POST /api/exams/[id]/feedback`

Accepts a feedback submission for one adapted question. This is a fire-and-forget endpoint — it persists feedback asynchronously and always responds promptly.

**Request**
```
Content-Type: application/json

Body: saveFeedbackSchema
{
  "adaptationId": "uuid",
  "rating": 4,            // optional; 0–5 integer
  "comment": "string"     // optional; max 5000 chars
}
```

**Response — 200 OK**
```json
{ "ok": true }
```

**Response — 400 Bad Request**
```json
{ "error": "VALIDATION_ERROR", "details": "..." }
```

**Response — 401 Unauthorized**
```json
{ "error": "UNAUTHENTICATED" }
```

**Response — 403 Forbidden**
```json
{ "error": "FORBIDDEN" }
```

**Response — 404 Not Found**
```json
{ "error": "ADAPTATION_NOT_FOUND" }
```

**Side effects:**
1. Upserts a `feedbacks` record keyed on `(adaptation_id, user_id)` — re-submitting replaces the previous rating/comment
2. Sets `feedbacks.dismissed_from_evolution = false` on insert (default behavior)
3. The `{ ok: true }` response is returned without waiting for Supabase DB confirmation — errors are logged server-side only

#### `GET /api/exams/[id]/result`

Fetches the full result data for the result page Server Component.

**Response — 200 OK**
```json
{
  "exam": { /* ExamWithJoins */ },
  "questionResults": [
    {
      "question": { /* Question */ },
      "adaptations": [
        {
          "adaptation": { /* Adaptation */ },
          "feedback": { /* Feedback | null */ },
          "copyableBlock": "string"
        }
      ]
    }
  ]
}
```

**Response — 403 Forbidden** — exam does not belong to authenticated user
**Response — 404 Not Found** — exam does not exist or `exams.status !== 'ready'`

---

## Section 5: Acceptance Criteria

| ID | Given | When | Then |
|----|-------|------|------|
| AC-001 | Authenticated teacher, exam with `status = 'ready'`, at least one completed adaptation | Teacher navigates to `/exams/[id]/result` | Page displays exam info (subject, grade level, topic, selected supports) and one `<QuestionResultCard>` per question, each showing adapted content, BNCC skill, Bloom level, copy button, and feedback form |
| AC-002 | Multiple choice question with 4 adapted alternatives, correct answer is "B" (second alternative) | Teacher clicks the copy button on that question's adaptation | Clipboard receives text in PAT-007 format: `"[statement]\n\na) text\nb) text ✓\nc) text\nd) text"` — alternative B is marked with `✓`; copy button shows visual confirmation state |
| AC-003 | Essay question with adapted statement, no alternatives | Teacher clicks the copy button | Clipboard receives text in PAT-008 format: adapted statement only, no alternative lines; copy button shows visual confirmation state |
| AC-004 | Teacher submits 4-star rating and a comment on an adaptation | `POST /api/exams/[id]/feedback` called | Response `200 { ok: true }` returned immediately; `feedbacks` record upserted with `rating = 4` and the provided comment; feedback form shows submitted state without blocking the result view |
| AC-005 | Teacher submits feedback with `comment` exceeding 5000 characters | `POST /api/exams/[id]/feedback` called | Response `400 { error: "VALIDATION_ERROR" }` returned; no `feedbacks` record created or modified |
| AC-006 | Teacher submits feedback with `rating = 6` (out of range) | `POST /api/exams/[id]/feedback` called | Response `400 { error: "VALIDATION_ERROR" }` returned; no `feedbacks` record created or modified |
| AC-007 | Teacher re-submits feedback for an adaptation they already rated | `POST /api/exams/[id]/feedback` called with new rating/comment | Previous `feedbacks` record is replaced (upsert); response `200 { ok: true }`; no duplicate records in `feedbacks` |
| AC-008 | Unauthenticated request | `POST /api/exams/[id]/feedback` | Response `401 { error: "UNAUTHENTICATED" }` |
| AC-009 | Exam with `status = 'processing'` (adaptations not yet ready) | Teacher navigates to `/exams/[id]/result` | Response `404` or redirect to the processing status page; result page is not rendered |

---

## Section 6: Test Strategy

### Layer 1 — Vitest + @testing-library/react

**Utility function tests (`lib/utils/copyable-block.test.ts`)**
- `generateCopyableBlock` with a multiple-choice adaptation, 4 alternatives, correct answer at position 2 (label "C"):
  - Returns string matching PAT-007 format
  - Correct alternative line ends with ` ✓`
  - Other alternative lines do not contain `✓`
  - Statement and alternatives are separated by `\n\n`
- `generateCopyableBlock` with an essay adaptation (`adaptedAlternatives: null`):
  - Returns PAT-008 format: adapted statement only, no alternative lines
- `generateCopyableBlock` with an adaptation where `adaptedAlternatives` is an empty array:
  - Falls back to PAT-008 format (treats as essay); does not throw
- `generateCopyableBlock` with `correctAnswer: null` and multiple-choice alternatives:
  - Renders all alternatives without any `✓` marker; does not throw

**Zod schema tests (`lib/schemas/feedback.test.ts`)**
- `saveFeedbackSchema`: valid `{ adaptationId: uuid, rating: 3, comment: "..." }` passes
- `saveFeedbackSchema`: `rating: -1` fails with message "Rating must be at least 0"
- `saveFeedbackSchema`: `rating: 6` fails with message "Rating must be at most 5"
- `saveFeedbackSchema`: `comment` of 5001 characters fails with message "Comment must not exceed 5000 characters"
- `saveFeedbackSchema`: `{ adaptationId: uuid }` with no `rating` or `comment` passes (both optional)
- `saveFeedbackSchema`: `adaptationId: "not-a-uuid"` fails with message "Invalid adaptation ID"

Mock: `vi.mock('@/lib/supabase/server')`, `vi.mock('@/lib/supabase/client')`

### Layer 2 — jest-axe + Vitest

**Component: `<QuestionResultCard>` (`components/question-result-card.test.tsx`)**

- State `loading` (adaptation `status = 'processing'`):
  - Skeleton or spinner visible with descriptive `aria-label`
  - Copy button is absent or disabled
  - Feedback form is absent or disabled
  - Zero WCAG violations (axe tags: `wcag2a`, `wcag2aa`, `wcag22aa`)

- State `no-feedback` (adaptation `status = 'completed'`, `feedback: null`):
  - Adapted content visible
  - BNCC skill code and description visible
  - Bloom level and justification visible
  - Copy button present and enabled with `aria-label="Copiar questão adaptada"`
  - Star rating inputs visible and interactive (keyboard accessible)
  - Comment textarea visible with `maxLength={5000}` enforced
  - Informational message about feedback improving future adaptations is visible
  - Zero WCAG violations

- State `5-stars-feedback` (adaptation `status = 'completed'`, `feedback.rating = 5`):
  - All 5 stars shown in filled/selected state
  - Submitted comment rendered in read-only mode or editable for update
  - Zero WCAG violations

- State `copy-error` (clipboard API unavailable):
  - Copy button click shows an inline error message (e.g., "Não foi possível copiar")
  - Error message has `role="alert"` for screen reader announcement
  - Zero WCAG violations

### Layer 3 — Playwright + @axe-core/playwright

**Page: `/exams/[id]/result`**
- Full page axe scan with tags `wcag2a`, `wcag2aa`, `wcag22aa`; zero violations required
- Star rating keyboard navigation: Tab focuses first star; arrow keys navigate between stars; Enter/Space selects; `aria-checked` state updates correctly
- Copy button with clipboard mock: clicking copy button triggers `navigator.clipboard.writeText`; visual confirmation state renders for 2s then resets
- Exam info header: subject, grade level, topic, and selected supports all visible and accessible to screen readers
- Feedback informational message: present in the DOM and readable by assistive technology

**CI gate:** All Playwright a11y tests must pass before PR merge; `axe.disableRules()` forbidden.

**Coverage target:** 80% minimum on `generateCopyableBlock` and `saveFeedbackSchema` validation logic.

---

## Section 7: Design Rationale

### Fire-and-Forget Feedback Submission (REQ-008)

Feedback submission uses a fire-and-forget pattern for the following reasons:
- **Non-blocking UX**: Teachers should be able to rate adaptations quickly without waiting for a DB round-trip; the result page must remain usable while feedback is being persisted
- **Low criticality**: Feedback is improvement data, not transactional data; losing a single rating due to a transient network error is acceptable and does not affect the teacher's primary goal (viewing and copying adapted content)
- **Simplicity**: A fire-and-forget approach eliminates the need for loading states, retry logic, and error recovery on the client for feedback submission; errors are logged server-side for monitoring

### Copyable Block Format Rules (PAT-007, PAT-008)

The copyable block format was designed for direct paste into Word/Google Docs:
- **Multiple choice (PAT-007)**: `[statement]\n\na) text\nb) text ✓\nc) text` — lowercase letter labels match Brazilian exam conventions; the `✓` marker on the correct alternative helps teachers verify content before distributing; the double newline (`\n\n`) between statement and alternatives preserves paragraph spacing in word processors
- **Essay (PAT-008)**: Adapted statement only — no alternatives exist to format; copying the stem is the primary teacher action for essay questions
- **No HTML/Markdown**: Plain text ensures compatibility with any paste target; markdown syntax (asterisks, hashes) would appear as literal characters in Word/Google Docs

### Upsert Semantics for Feedback (AC-007)

The `feedbacks` table uses upsert keyed on `(adaptation_id, user_id)` to ensure:
- **No duplicate records**: A teacher re-rating the same adaptation replaces the previous rating, preventing conflicting data in the `agent_evolutions` pipeline
- **Simple UI**: The feedback form always shows the latest rating without needing to differentiate between "create" and "update" states
- **Trade-off**: History of rating changes is lost; if audit logging of rating changes is needed post-MVP, a `feedback_history` table can be added without changing the API surface

### BNCC and Bloom as Read-Only Metadata

BNCC/Bloom data is displayed as read-only metadata (not editable) because:
- **LLM authority**: The classifications are generated by the same LLM that produced the adaptation; inconsistent teacher overrides could reduce adaptation quality in future agent evolutions
- **Simplicity**: A read-only display eliminates form state management for taxonomy fields, keeping `<QuestionResultCard>` focused on the feedback interaction
- **Future scope**: If teachers need to correct BNCC codes, a dedicated override mechanism can be added in a future spec without modifying the result page layout

---

## Section 8: Dependencies

| ID | Type | Description |
|----|------|-------------|
| SPEC-001 | Specification | `spec-process-extraction.md` — provides `Exam`, `Question`, `ExamStatus`, and `ExamWithJoins` types imported by this spec |
| SPEC-002 | Specification | `spec-process-adaptation.md` — provides `Adaptation`, `AdaptedAlternative`, `BnccAnalysis`, `BloomAnalysis`, and `AdaptationStatus` types; `exams.status = 'ready'` is the precondition for this page |
| DB-001 | Database | Supabase PostgreSQL — `feedbacks`, `adaptations`, `questions`, and `exams` tables with RLS policies |
| PLT-001 | Platform | Next.js 16 App Router, Node.js runtime — hosts `POST /api/exams/[id]/feedback` and the `/exams/[id]/result` Server Component |
| LIB-001 | Library | `@supabase/ssr` — server-side Supabase client for auth and DB access |
| LIB-002 | Library | Zod — runtime validation of `saveFeedbackSchema` in `POST /api/exams/[id]/feedback` |
| LIB-003 | Browser API | `navigator.clipboard.writeText` — used by the copy-to-clipboard button; requires HTTPS context or localhost |
| LIB-004 | Library | Lucide React — SVG icons for star rating, copy button, BNCC/Bloom badges (GUD-006) |

---

## Section 9: Examples

### Example 1: Multiple Choice Question — Copy Button

**Scenario:** Exam with 1 multiple-choice question (4 alternatives, correct answer "B") adapted with visual support. Teacher clicks the copy button.

**Adaptation record:**
```json
{
  "adaptedStatement": "Observe a imagem e responda: qual animal vive na água?",
  "adaptedAlternatives": [
    { "label": "A", "text": "Cachorro" },
    { "label": "B", "text": "Peixe" },
    { "label": "C", "text": "Gato" },
    { "label": "D", "text": "Pássaro" }
  ]
}
```

**`generateCopyableBlock` output (PAT-007):**
```
Observe a imagem e responda: qual animal vive na água?

a) Cachorro
b) Peixe ✓
c) Gato
d) Pássaro
```

**Clipboard content:** Exactly the above string; teacher pastes into Word/Google Docs and distributes.

### Example 2: Essay Question — Copy Button

**Scenario:** Exam with 1 essay question adapted with simplified-text support. Teacher clicks the copy button.

**Adaptation record:**
```json
{
  "adaptedStatement": "Escreva com suas palavras o que é fotossíntese e por que ela é importante para as plantas.",
  "adaptedAlternatives": null
}
```

**`generateCopyableBlock` output (PAT-008):**
```
Escreva com suas palavras o que é fotossíntese e por que ela é importante para as plantas.
```

**Clipboard content:** Exactly the above string; no letter labels or `✓` markers.

### Example 3: Feedback Submission — Happy Path

**Scenario:** Teacher rates an adaptation 5 stars and adds a comment.

**Request:**
```json
POST /api/exams/uuid-exam/feedback
{
  "adaptationId": "uuid-adaptation",
  "rating": 5,
  "comment": "Perfeita para minha turma! A simplificação ficou muito adequada."
}
```

**Response:**
```json
{ "ok": true }
```

**DB state after upsert:**
```
feedbacks:
  id: uuid-feedback
  question_id: uuid-question
  adaptation_id: uuid-adaptation
  user_id: uuid-teacher
  rating: 5
  comment: "Perfeita para minha turma! A simplificação ficou muito adequada."
  dismissed_from_evolution: false
  created_at: 2026-03-18T...
```

### Example 4: Feedback Submission — Validation Error

**Scenario:** Teacher accidentally submits a `rating` of `7` (out of range).

**Request:**
```json
POST /api/exams/uuid-exam/feedback
{
  "adaptationId": "uuid-adaptation",
  "rating": 7
}
```

**Response:**
```json
{
  "error": "VALIDATION_ERROR",
  "details": "rating: Rating must be at most 5"
}
```

No `feedbacks` record is created or modified.

### Example 5: BNCC and Bloom Metadata Display

**Scenario:** Exam question has been analyzed by the adaptation pipeline.

**Adaptation data available for display:**
```json
{
  "bnccSkillCode": "EF06CI05",
  "bnccSkillDescription": "Selecionar argumentos que justifiquem a importância da higiene bucal...",
  "bloomLevel": "understand",
  "bloomJustification": "A questão solicita que o aluno explique o processo, o que requer compreensão conceitual."
}
```

**UI rendering:**
- Badge: `EF06CI05` with tooltip showing full description
- Badge: `Compreender` (Portuguese label for `understand`) with popover showing justification text
- Both are read-only; no edit controls rendered

---

## Section 10: Validation Checklist

The following checklist must be verified before this spec is considered implementation-ready:

- [x] Frontmatter complete: `title`, `version`, `date_created`, `last_updated`, `owner`, `tags`
- [x] All 11 sections present (Introduction through Related Specifications)
- [x] Global Constraints block present verbatim in Section 3
- [x] All feature REQs (REQ-001 through PAT-008) traceable to PRD F7
- [x] Section 4 includes:
  - [x] Current SQL schema for `feedbacks` (from existing migration)
  - [x] Target SQL schema changes for `feedbacks` (clearly marked as requiring new migration)
  - [x] `Feedback` TypeScript interface (matching SQL schema)
  - [x] `QuestionResult`, `AdaptationWithFeedback`, `ExamResult` TypeScript interfaces
  - [x] `saveFeedbackSchema` Zod schema (adaptationId uuid, rating 0–5, comment max 5000)
  - [x] `generateCopyableBlock` function signature with doc comment and format rules
  - [x] API contract: `POST /api/exams/[id]/feedback` (body: saveFeedbackSchema → `{ ok: true }`)
  - [x] API contract: `GET /api/exams/[id]/result` (→ ExamResult)
- [x] Section 5 has ≥ 5 ACs in Given-When-Then format (9 ACs present)
- [x] Section 6 has all 3 test layers with specific named test cases
- [x] PAT-007 and PAT-008 copyable block formats defined and exemplified
- [x] Section 11 references at least 3 related specs

---

## Section 11: Related Specifications

| Spec | Relationship |
|------|-------------|
| `spec-process-extraction.md` | Upstream — provides `Exam`, `Question`, `ExamStatus`, and `ExamWithJoins` types; `exams.status = 'ready'` (the precondition for this page) originates from the extraction pipeline |
| `spec-process-adaptation.md` | Direct upstream — provides `Adaptation`, `AdaptedAlternative`, `BnccAnalysis`, `BloomAnalysis`, `AdaptationStatus`, and `CopyableBlock` types; this spec consumes all completed `adaptations` records for display |
| `spec-process-new-exam.md` | Indirect upstream — defines the teacher-facing form where supports are selected; those selections determine which adaptations appear on this result page |
| `spec-design-auth.md` | Cross-cutting — defines the Supabase Auth + middleware contract that gates `/exams/[id]/result`; all API routes in this spec require authenticated teacher sessions |
| `spec-design-admin-config.md` | Cross-cutting — defines how administrators configure available supports and LLM models; the support labels displayed in the result page exam info header come from data managed by admin config |
