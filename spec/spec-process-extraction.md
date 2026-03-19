---
title: PDF Extraction Process
version: 1.0
date_created: 2026-03-18
last_updated: 2026-03-18
owner: PRISMA Team
tags: [process, extraction, ocr, llm, edge-function, supabase]
---

# 1. Introduction

This specification defines the PDF extraction process: receiving a teacher-uploaded PDF, converting it to images, extracting questions via a multimodal LLM, and persisting the result to Postgres. This is the entry point of the exam adaptation workflow; all downstream specs depend on the contracts defined here.

# 2. Purpose & Scope

## Purpose

Enable teachers to upload PDF exam files and automatically extract structured question data (text, type, alternatives) using OCR and multimodal LLM analysis. The extracted questions are then persisted to the database, allowing teachers to review, correct, and enrich the data before proceeding to adaptation.

## In Scope

- POST `/api/exams` route handler for PDF upload and exam creation
- Supabase Storage upload with RLS enforcement
- `extract-questions` Edge Function (Supabase Deno runtime)
- `<ExtractionStatus>` React component for monitoring extraction progress
- Exam status polling mechanism (polling-based status updates)
- Status enum expansion: `draft` → `uploading` → `processing` → `awaiting_answers` → `ready` → `error`

## Out of Scope

- BNCC/Bloom analysis and question tagging (spec-process-adaptation.md)
- Result display and question editing UI (spec-process-result.md)
- New exam form UI and subject/grade selection (spec-process-new-exam.md)
- Tesseract/local OCR; always use multimodal LLM
- Question answer validation or auto-grading

# 3. Definitions, Global Constraints & Feature Requirements

## Definitions

**ExamStatus**: Enum of six states:
- `draft` — Exam created, no PDF uploaded
- `uploading` — PDF being uploaded to Storage
- `processing` — PDF being processed by extract-questions Edge Function
- `awaiting_answers` — Extraction complete; teacher providing correct answers
- `ready` — Extraction complete, correct answers supplied, ready for adaptation
- `error` — Extraction failed; error_message populated

**OCR**: Optical Character Recognition via multimodal LLM (e.g., Claude 3.5 Sonnet with vision)

**LLM Multimodal**: Language model capable of processing images and text; used to extract questions from PDF rendered as base64 images

**extraction_warning**: Text field populated when OCR partially succeeds (e.g., one page illegible, others readable). Contains concatenated warnings per page.

**awaiting_answers**: Status after extraction; teacher must provide correct answers for each question before proceeding.

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

## Feature Requirements

**REQ-001**: System SHALL extract objective and essay questions from PDFs up to 25 MB, including structured alternatives and question text.

**REQ-002**: On partial OCR failure, System SHALL persist successfully extracted questions and populate `extraction_warning` with concatenated page-level error details.

**REQ-003**: After extraction completes, System SHALL display all extracted questions and prompt teacher to provide correct answers for each (Feature F5.4 in PRD).

**REQ-004**: System SHALL support visual elements (tables, images, diagrams) unchanged in the adapted version (Feature F5.3 in PRD); multimodal LLM captures image context in question_text.

**CON-001**: Edge Function timeout ~150 seconds; batch processing required for exams with >10 questions to avoid timeouts.

**CON-002**: PDF sent as base64-encoded image to multimodal LLM; no page-by-page PDF-to-image conversion in MVP.

**SEC-001**: Storage bucket `exams` RLS policy enforces row-level security: teacher accesses only PDFs under `{userId}/{examId}.pdf` path.

# 4. Interfaces & Data Contracts

## SQL Table Schemas

### Table: exams

**Current Schema** (existing):
```sql
CREATE TABLE exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  grade_level_id UUID NOT NULL REFERENCES grade_levels(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('draft', 'processing', 'completed', 'error'))
);
```

**Target Schema** (after migration):
```sql
ALTER TABLE exams ADD COLUMN topic TEXT;
ALTER TABLE exams ADD COLUMN extraction_warning TEXT;
ALTER TABLE exams ADD COLUMN error_message TEXT;
ALTER TABLE exams DROP CONSTRAINT exams_status_check;
ALTER TABLE exams ADD CONSTRAINT exams_status_check
  CHECK (status IN ('draft', 'uploading', 'processing', 'awaiting_answers', 'ready', 'error'));
```

### Table: questions

**Current Schema** (existing):
```sql
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('objective', 'essay')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Target Schema** (after migration):
```sql
ALTER TABLE questions ADD COLUMN alternatives JSONB DEFAULT NULL;
ALTER TABLE questions ADD COLUMN correct_answer TEXT DEFAULT NULL;
```

**alternatives JSON Structure** (for objective questions):
```json
{
  "a": "Option A text",
  "b": "Option B text",
  "c": "Option C text",
  "d": "Option D text",
  "e": "Option E text"
}
```

## TypeScript Types

```typescript
// Exam status enumeration
type ExamStatus = 'draft' | 'uploading' | 'processing' | 'awaiting_answers' | 'ready' | 'error';

// Question type enumeration
type QuestionType = 'objective' | 'essay';

// Exam data model
interface Exam {
  id: string;
  user_id: string;
  subject_id: string;
  grade_level_id: string;
  topic?: string;
  status: ExamStatus;
  extraction_warning?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

// Question data model
interface Question {
  id: string;
  exam_id: string;
  question_text: string;
  question_type: QuestionType;
  alternatives?: Record<string, string> | null;
  correct_answer?: string | null;
  created_at: string;
}

// Edge Function extraction result
interface ExtractionResult {
  success: boolean;
  questions: ExtractedQuestion[];
  warnings?: string[];
  error?: string;
}

// Single extracted question
interface ExtractedQuestion {
  question_text: string;
  question_type: QuestionType;
  alternatives: Record<string, string> | null;
}
```

## Zod Schemas

```typescript
import { z } from 'zod';

// Schema for POST /api/exams request validation
export const createExamSchema = z.object({
  subjectId: z.string().uuid('Invalid subject ID'),
  gradeLevelId: z.string().uuid('Invalid grade level ID'),
  topic: z.string().max(500, 'Topic must be ≤500 characters').optional(),
  supportIds: z.array(z.string().uuid()).default([]),
  pdf: z.instanceof(File).refine(
    (file) => file.type === 'application/pdf',
    'File must be a PDF'
  ).refine(
    (file) => file.size <= 25 * 1024 * 1024,
    'PDF must be ≤25 MB'
  ),
});

// Schema for extracted question validation
export const extractedQuestionSchema = z.object({
  question_text: z.string().min(1, 'Question text required'),
  question_type: z.enum(['objective', 'essay']),
  alternatives: z.record(z.string()).nullable().default(null),
});

// Schema for extraction result
export const extractionResultSchema = z.object({
  success: z.boolean(),
  questions: z.array(extractedQuestionSchema),
  warnings: z.array(z.string()).optional(),
  error: z.string().optional(),
});
```

## API Contracts

### POST /api/exams

**Input**: `FormData` with fields:
- `subjectId` (string, UUID)
- `gradeLevelId` (string, UUID)
- `topic` (string, optional, max 500 chars)
- `supportIds` (string[], optional, comma-separated UUIDs)
- `pdf` (File, required, type: application/pdf, max 25 MB)

**Output** (200 OK):
```json
{
  "id": "exam-uuid",
  "status": "uploading"
}
```

**Error Responses**:
- `400 Bad Request`: Missing fields, invalid UUID, file not PDF, file >25 MB
  ```json
  {
    "error": "PDF must be ≤25 MB"
  }
  ```
- `401 Unauthorized`: User not authenticated
- `500 Internal Server Error`: Storage or database failure

### GET /api/exams/[id]/status

**Input**: Route parameter `id` (exam UUID)

**Output** (200 OK):
```json
{
  "id": "exam-uuid",
  "status": "processing",
  "errorMessage": null
}
```

**or** (if error):
```json
{
  "id": "exam-uuid",
  "status": "error",
  "errorMessage": "Edge Function timeout after 150s"
}
```

**Error Responses**:
- `404 Not Found`: Exam not found or user lacks access
- `401 Unauthorized`: User not authenticated

## Edge Function: extract-questions

**Input** (Supabase Edge Function POST body):
```json
{
  "examId": "exam-uuid",
  "userId": "user-uuid",
  "pdfBase64": "data:application/pdf;base64,JVBERi0xLjQK...",
  "topic": "Biology Chapter 3"
}
```

**Output** (200 OK):
```json
{
  "success": true,
  "questions": [
    {
      "question_text": "What is photosynthesis?",
      "question_type": "essay",
      "alternatives": null
    },
    {
      "question_text": "Which organelle produces ATP?",
      "question_type": "objective",
      "alternatives": {
        "a": "Mitochondrion",
        "b": "Chloroplast",
        "c": "Ribosome",
        "d": "Nucleus",
        "e": "Golgi apparatus"
      }
    }
  ],
  "warnings": ["Page 2: Low OCR confidence (68%)"]
}
```

**Failure** (if critical error):
```json
{
  "success": false,
  "questions": [],
  "error": "PDF parsing failed: invalid file format"
}
```

**Timeout/Limit Exceeded** (503 Service Unavailable):
- Edge Function kills job after ~150 seconds
- Status set to `error`, error_message: "Extraction timeout (>150s)"

# 5. Acceptance Criteria

**AC-001**: Given a valid PDF ≤25 MB with multiple choice and essay questions, When POST `/api/exams` with subject_id, grade_level_id, and pdf FormData fields, Then exam is created with status `uploading`, PDF is stored in `exams/{userId}/{examId}.pdf`, and extraction is triggered.

**AC-002**: Given a PDF with one illegible page (OCR fails) and two readable pages, When extraction Edge Function processes it, Then questions from readable pages are persisted to `questions` table, `extraction_warning` is populated with "Page 2: OCR failed (confidence <30%)", and status transitions to `awaiting_answers`.

**AC-003**: Given an exam in status `awaiting_answers`, When a teacher views the extraction page (`/exams/[id]/extraction`), Then all extracted questions are displayed in a form with input fields for `correct_answer` per question, and teacher can submit answers.

**AC-004**: Given a PDF file >25 MB, When POST `/api/exams` is called, Then response is `400 Bad Request` with error message "PDF must be ≤25 MB", and no exam record is created.

**AC-005**: Given an exam with >10 questions and complex layout, When extraction Edge Function exceeds 150-second timeout, Then exam status is set to `error`, error_message is set to "Extraction timeout (>150s)", and teacher receives notification.

# 6. Test Strategy

## Layer 1: Vitest Unit Tests

### Schema & Utility Tests

1. **createExamSchema validation**
   - Valid input: all required fields, pdf with correct MIME type ✓
   - Missing subjectId: validation error raised
   - supportIds empty array: defaults to [] ✓
   - topic >500 characters: validation error raised
   - pdf >25 MB: validation error raised
   - pdf non-PDF MIME type: validation error raised

2. **validatePdfFile utility**
   - File with MIME type `application/pdf`: returns true
   - File with MIME type `application/msword`: returns false
   - File 25 MB exactly: returns true
   - File 25.1 MB: returns false
   - null file: throws error

3. **extractedQuestionSchema validation**
   - Valid objective question: all fields present, alternatives populated
   - Valid essay question: question_text present, alternatives null
   - Missing question_text: validation error
   - Invalid question_type: validation error

### Component & Hook Tests

4. **useExamStatus hook**
   - Polls `/api/exams/[id]/status` at 2-second intervals
   - Stops polling when status is `ready` or `error`
   - Exposes { status, isLoading, error }

5. **getExamStatusDisplay utility**
   - Returns "Uploading..." for status `uploading`
   - Returns "Processing..." for status `processing`
   - Returns "Awaiting answers..." for status `awaiting_answers`
   - Returns "Ready" for status `ready`
   - Returns "Error" for status `error`
   - Returns "Draft" for status `draft`

6. **getExamRoute utility**
   - Returns `/exams/[id]` for status `draft`
   - Returns `/exams/[id]/extraction` for status `uploading`, `processing`, `awaiting_answers`
   - Returns `/exams/[id]/adapt` for status `ready`
   - Returns `/exams/[id]/error` for status `error`

## Layer 2: jest-axe + Vitest Component Accessibility

### <ExtractionStatus> Component Tests

7. **Loading state**
   - Spinner displayed with aria-label "Extracting questions..."
   - Zero WCAG violations (tags: wcag2a, wcag2aa, wcag22aa)

8. **Partial success state**
   - Questions list displayed
   - extraction_warning message visible and readable
   - Alert role="alert" with warning message
   - Zero WCAG violations

9. **Error state**
   - error_message displayed prominently
   - Alert role="alert" with error type
   - Retry button with cursor-pointer and min 44×44 px
   - Zero WCAG violations

10. **Complete state**
    - All questions displayed with correct_answer input fields
    - Labels associated with inputs via htmlFor
    - Submit button enabled
    - Zero WCAG violations

## Layer 3: Playwright E2E Tests

11. **Full page accessibility scan**
    - Navigate to `/exams/[id]/extraction` for exam in `processing` status
    - Run axe scan with tags: wcag2a, wcag2aa, wcag22aa
    - Zero violations expected
    - Test both light and dark modes

12. **Error state workflow**
    - Mock extraction to return error_message
    - Load extraction page
    - Verify error message displayed
    - Verify axe scan returns zero violations

13. **Form submission with correct answers**
    - Fill in correct_answer for all extracted questions
    - Submit form
    - Verify exam transitions to `ready` status via polling
    - Verify axe scan zero violations on result page

### Coverage Requirements

- Edge Function `extract-questions` utilities: ≥80% coverage
- Server-side validation and upload logic: ≥80% coverage

### Mocking Strategy

```typescript
// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => ({
    from: vi.fn((table) => ({
      insert: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({}),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({}),
      })),
    },
  })),
}));

// Mock Edge Function
vi.mock('supabase/functions/extract-questions', () => ({
  extractQuestions: vi.fn(async (input) => ({
    success: true,
    questions: [
      {
        question_text: "Sample question",
        question_type: "objective",
        alternatives: { a: "Option A", b: "Option B" },
      },
    ],
  })),
}));
```

# 7. Rationale

## Multimodal LLM vs. Tesseract

We selected OpenAI-compatible multimodal LLM (e.g., Claude 3.5 Sonnet with vision) over traditional OCR (Tesseract) for these reasons:

1. **Table and image context**: Tables, diagrams, and embedded images are preserved semantically in the extracted question text; Tesseract would require post-processing.
2. **Question type inference**: LLM naturally infers whether a question is objective or essay based on formatting.
3. **Alternative extraction**: Objective question alternatives are reliably structured by the LLM; Tesseract requires complex heuristics.
4. **No local infrastructure**: Avoids deploying and maintaining Tesseract binaries; uses serverless Edge Function.

## Edge Function vs. Inngest

Edge Function (Supabase Deno runtime) is simpler than Inngest for MVP:

1. **No external dependency**: Supabase Edge Functions run on the same infrastructure as the database.
2. **Direct database writes**: Extracted questions are written immediately to Postgres without a queue.
3. **Timeout acceptable**: 150-second timeout is sufficient for PDFs ≤25 MB in MVP; future versions can batch-process larger exams.
4. **Lower operational overhead**: One fewer managed service.

## Polling vs. Realtime Subscriptions

We use polling-based status updates over Supabase Realtime:

1. **Simpler client code**: `useExamStatus` hook with setInterval; no Realtime listener setup.
2. **Reduced database load**: Polling at 2-second intervals for a few dozen concurrent exams is acceptable in MVP.
3. **Better error recovery**: Network reconnection handled naturally by next fetch.
4. **Future migration path**: Can add Realtime later without changing API contracts.

# 8. Dependencies

**EXT-001**: Supabase Edge Functions (Deno runtime)
- Required for serverless execution of extract-questions
- Version: Deno 1.40+

**SVC-001**: Multimodal LLM service (OpenAI-compatible API)
- Required for vision-based question extraction
- Examples: Claude 3.5 Sonnet, GPT-4o, Llama 2 with Vision
- Must support base64-encoded image input

**INF-001**: Supabase Storage bucket `exams`
- Required for teacher PDF persistence
- RLS policy: owner restriction to `{userId}/{examId}.pdf`

**PLT-001**: Next.js 16 App Router with Node.js runtime
- Route handlers `/api/exams` and `/api/exams/[id]/status`
- FormData parsing in POST handler

**DB-001**: PostgreSQL extensions
- `pgcrypto` for UUID generation (already present)
- No additional extensions required

# 9. Examples

## Example 1: Scanned PDF with Partial OCR Failure

**Input PDF**: 5-page scanned document, pages 1, 3–5 readable, page 2 illegible (faded).

**Edge Function Processing**:
1. Convert PDF to base64 image per page
2. Send each page to multimodal LLM
3. Page 1: 3 objective questions extracted ✓
4. Page 2: LLM returns "Unable to extract; confidence <10%" → warning recorded
5. Pages 3–5: 4 objective + 2 essay questions extracted ✓

**Result**:
```json
{
  "success": true,
  "questions": [
    { "question_text": "Q1", "question_type": "objective", "alternatives": {...} },
    { "question_text": "Q3", "question_type": "objective", "alternatives": {...} },
    ...
  ],
  "warnings": ["Page 2: OCR confidence <10%; skipped"]
}
```

**Database State**:
- `exams.status` = `awaiting_answers`
- `exams.extraction_warning` = "Page 2: OCR confidence <10%; skipped"
- `questions` table = 9 rows (pages 1, 3–5)

## Example 2: PDF with Complex Table

**Input PDF**: Biology exam with periodic table image spanning page 2.

**Edge Function Processing**:
- LLM analyzes periodic table and identifies embedded question: "The element with atomic number 6 is..."
- question_type inferred as `objective`
- alternatives extracted from context

**Result**: Question preserved with full table context in question_text.

## Example 3: PDF >25 MB Rejected

**Input**: User selects 30 MB PDF.

**POST /api/exams**:
1. Client validates file size before upload
2. Server-side validation in createExamSchema rejects >25 MB
3. Response: `400 Bad Request`
   ```json
   {
     "error": "PDF must be ≤25 MB (file size: 30 MB)"
   }
   ```
4. No exam created, no database writes.

# 10. Validation Checklist

- [x] Frontmatter complete
- [x] All 11 sections present
- [x] Global Constraints block present in Section 3
- [x] Section 4 includes SQL schemas, TypeScript types, Zod schemas, API contracts
- [x] Section 5 has ≥5 AC in Given-When-Then format
- [x] Section 6 has all 3 test layers with specific test cases named
- [x] Section 11 references at least 3 related specs

# 11. Related Specifications

1. **spec-process-adaptation.md** — Defines question tagging with BNCC competencies and Bloom's taxonomy; receives extracted questions from this spec as input.

2. **spec-process-result.md** — Specifies question editing and enrichment UI after extraction; depends on questions table schema defined here.

3. **spec-process-new-exam.md** — Defines the new exam form and subject/grade selection workflow prior to PDF upload; provides subject_id and grade_level_id inputs to POST /api/exams route.

4. **spec-design-auth.md** — Specifies authentication and authorization logic; extraction process enforces user_id-based RLS in Storage and database.

5. **spec-system-edge-functions.md** (future) — Centralized documentation of all Supabase Edge Functions; extract-questions is one implementation.

---

**Document Status**: Ready for implementation
**Last Reviewed**: 2026-03-18
**Next Review**: After implementation completion
