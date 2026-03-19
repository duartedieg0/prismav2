---
title: AI Analysis and Adaptation Process
version: 1.0
date_created: 2026-03-18
last_updated: 2026-03-18
owner: PRISMA Team
tags: [process, adaptation, bncc, bloom, llm, edge-function, async]
---

# Introduction

This specification defines how extracted questions are analyzed for BNCC skills and Bloom level, and how adapted versions are generated per educational support (apoio). Depends on contracts from spec-process-extraction: `ExamStatus`, `Exam`, `Question`, and `ExamWithJoins` types are imported as-is. This process is triggered after the teacher submits correct answers (`status = 'awaiting_answers'` → `status = 'processing'` → `status = 'ready'`).

---

## Section 1: Purpose & Scope

### Purpose

This document specifies the AI analysis and adaptation process for the PRISMA ("Adapte Minha Prova") platform. It defines the API surface, data contracts, database schema changes, Edge Function behavior, and acceptance criteria required to implement the feature described in PRD F6.

### In Scope

- `POST /api/exams/[id]/answers` route handler (correct answer submission, Edge Function invocation)
- `analyze-and-adapt` Edge Function (BNCC analysis, Bloom analysis, adaptation generation per question × support)
- BNCC skill identification via LLM per question (F6.1)
- Bloom cognitive level identification via LLM per question (F6.2)
- Adapted version generation per question × support, preserving BNCC skill (F6.3)
- Async processing — teacher can leave and return while adaptation runs (F6.4)
- `AdaptationProgress` component (client-side polling of exam status during adaptation)
- `Adaptation`, `AdaptedAlternative`, `CopyableBlock`, `BnccAnalysis`, `BloomAnalysis` TypeScript types
- `exam_supports` junction table (new migration required)

### Out of Scope

- PDF extraction (spec-process-extraction.md)
- Side-by-side result display with adapted questions — see `spec-process-result.md`
- New-exam form UI (subject/grade_level selection, file picker) — see `spec-process-new-exam.md`

---

## Section 2: Definitions

| Term | Definition |
|------|-----------|
| BNCC | Base Nacional Comum Curricular — Brazil's national curriculum framework defining competencies and skills per subject and grade level |
| Bloom's Taxonomy | Cognitive classification framework with 6 levels: Remember, Understand, Apply, Analyze, Evaluate, Create |
| Adaptation | An AI-generated version of a question rewritten to accommodate a specific educational support (apoio), preserving the original BNCC skill |
| Support (apoio) | A pedagogical support strategy (e.g., text simplification, visual cue addition, chunked alternatives) that makes questions accessible to students with learning differences |
| Edge Function | A server-side function running in Supabase's Deno runtime, used to isolate LLM API calls and manage timeout/cost boundaries |
| `BnccAnalysis` | TypeScript type representing the LLM-identified BNCC skill code and description for a question |
| `BloomAnalysis` | TypeScript type representing the LLM-identified Bloom cognitive level and justification for a question |
| `AdaptedAlternative` | TypeScript type representing one adapted answer choice in a multiple-choice question's adapted version |
| `CopyableBlock` | TypeScript type representing a rendered content block with a copy-to-clipboard action for teacher use |

---

## Section 3: Feature Requirements & Global Constraints

### Feature Requirements (PRD F6)

| ID | Requirement |
|----|------------|
| REQ-001 | System SHALL identify BNCC skills per question via LLM (F6.1) |
| REQ-002 | System SHALL identify Bloom cognitive level per question via LLM (F6.2) |
| REQ-003 | System SHALL generate one adapted version per question × support, preserving BNCC skill (F6.3) |
| REQ-004 | Processing SHALL be async — teacher can leave and return (F6.4) |
| REQ-005 | Multiple choice questions SHALL return JSON `{ adaptedStatement, adaptedAlternatives[] }` with same count as original alternatives |
| REQ-006 | Essay questions SHALL return plain adapted text string |
| CON-001 | `adaptedAlternatives.length` MUST equal original `alternatives.length`; mismatch sets adaptation status to `'error'` |
| CON-002 | LLM prompt MUST instruct use of `\n` for line breaks in JSON responses (prevent parse errors) |
| CON-003 | JSON parse failure falls back to treating full response as plain text + logs warning |
| SEC-001 | Edge Function uses Supabase service role key; `api_key` for LLM models never exposed to client |

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

#### Table: `adaptations` (existing)

> **Current schema** — from migration `20260318000001_initial_schema.sql`

```sql
create table if not exists public.adaptations (
  id uuid primary key default uuid_generate_v4(),
  question_id uuid references public.questions(id) on delete cascade not null,
  adapted_alternatives jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

> **Target schema** — requires a new migration (not yet written)

```sql
-- Migration: expand adaptations table for full adaptation pipeline
alter table public.adaptations
  add column if not exists support_id uuid references public.supports(id) on delete cascade,
  add column if not exists adapted_statement text,
  add column if not exists bncc_skill_code text,
  add column if not exists bncc_skill_description text,
  add column if not exists bloom_level text check (bloom_level in (
    'remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'
  )),
  add column if not exists bloom_justification text,
  add column if not exists status text default 'pending' check (status in (
    'pending', 'processing', 'completed', 'error'
  )),
  add column if not exists error_message text,
  add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now()) not null;
```

Changes summary:
- `support_id` (uuid, FK to `supports`, nullable) — links adaptation to the specific support strategy used
- `adapted_statement` (text, nullable) — the adapted question stem/text
- `bncc_skill_code` (text, nullable) — BNCC skill code identified by LLM (e.g., `EF06MA01`)
- `bncc_skill_description` (text, nullable) — BNCC skill description in Portuguese
- `bloom_level` (text, nullable) — one of the 6 Bloom levels
- `bloom_justification` (text, nullable) — LLM justification for the assigned Bloom level
- `status` (text, default `'pending'`) — lifecycle of this adaptation record
- `error_message` (text, nullable) — fatal error detail when `status = 'error'`
- `updated_at` (timestamptz) — last modification timestamp

#### Table: `supports` (existing)

> **Current schema** — from migration `20260318000001_initial_schema.sql`

```sql
create table if not exists public.supports (
  id uuid primary key default uuid_generate_v4(),
  question_id uuid references public.questions(id) on delete cascade not null,
  model_id uuid references public.ai_models(id) on delete set null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

No schema changes required for supports in this feature.

#### Table: `exam_supports` (new — requires migration)

> **New junction table** — requires a new migration (not yet written)

```sql
-- Migration: create exam_supports junction table
create table if not exists public.exam_supports (
  id uuid primary key default uuid_generate_v4(),
  exam_id uuid references public.exams(id) on delete cascade not null,
  support_id uuid references public.supports(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (exam_id, support_id)
);

-- RLS
alter table public.exam_supports enable row level security;

create policy "Teachers can manage their exam_supports"
  on public.exam_supports
  for all
  using (
    exists (
      select 1 from public.exams
      where exams.id = exam_supports.exam_id
        and exams.user_id = auth.uid()
    )
  );
```

Purpose: Links an exam to the set of educational supports selected at exam creation time. The `analyze-and-adapt` Edge Function reads this table to determine which supports to generate adaptations for.

### 4.2 TypeScript Types

```typescript
// lib/types/adaptation.ts
// Imports Exam, Question, ExamStatus from lib/types/exam.ts (spec-process-extraction)

export type BloomLevel =
  | 'remember'
  | 'understand'
  | 'apply'
  | 'analyze'
  | 'evaluate'
  | 'create';

export interface BnccAnalysis {
  skillCode: string;           // e.g. "EF06MA01"
  skillDescription: string;    // e.g. "Resolver e elaborar problemas..."
}

export interface BloomAnalysis {
  level: BloomLevel;
  justification: string;       // LLM reasoning for the assigned level
}

export interface AdaptedAlternative {
  label: string;               // e.g. "A", "B", "C", "D"
  text: string;                // adapted alternative text
}

export type AdaptationStatus = 'pending' | 'processing' | 'completed' | 'error';

export interface Adaptation {
  id: string;
  questionId: string;
  supportId: string | null;
  adaptedStatement: string | null;
  adaptedAlternatives: AdaptedAlternative[] | null;  // null for essay questions
  bnccSkillCode: string | null;
  bnccSkillDescription: string | null;
  bloomLevel: BloomLevel | null;
  bloomJustification: string | null;
  status: AdaptationStatus;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CopyableBlock {
  id: string;
  label: string;               // display label for the block, e.g. "Questão 1 — Apoio Visual"
  content: string;             // the adapted text to be copied
  questionId: string;
  adaptationId: string;
}
```

### 4.3 Zod Schemas

```typescript
// lib/schemas/adaptation.ts
import { z } from 'zod';

export const bloomLevelSchema = z.enum([
  'remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'
]);

export const bnccAnalysisSchema = z.object({
  skillCode: z.string().min(1, 'BNCC skill code is required'),
  skillDescription: z.string().min(1, 'BNCC skill description is required'),
});

export type BnccAnalysisInput = z.infer<typeof bnccAnalysisSchema>;

export const bloomAnalysisSchema = z.object({
  level: bloomLevelSchema,
  justification: z.string().min(1, 'Bloom justification is required'),
});

export type BloomAnalysisInput = z.infer<typeof bloomAnalysisSchema>;

export const adaptedAlternativeSchema = z.object({
  label: z.string().min(1),
  text: z.string().min(1),
});

// Union schema: LLM returns either a structured JSON object (MC) or a plain string (essay)
export const adaptationResponseSchema = z.union([
  z.object({
    adaptedStatement: z.string().min(1),
    adaptedAlternatives: z.array(adaptedAlternativeSchema).min(1),
  }),
  z.string().min(1),
]);

export type AdaptationResponse = z.infer<typeof adaptationResponseSchema>;

export const submitAnswersSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().uuid('Invalid question ID'),
      correctAnswer: z.string().min(1, 'Correct answer is required'),
    })
  ).min(1, 'At least one answer is required'),
});

export type SubmitAnswersInput = z.infer<typeof submitAnswersSchema>;
```

### 4.4 API Contracts

#### `POST /api/exams/[id]/answers`

Accepts teacher-provided correct answers per question. Creates one `adaptation` record per question × support (status `pending`), then triggers the `analyze-and-adapt` Edge Function asynchronously.

**Request**
```
Content-Type: application/json

Body:
{
  "answers": [
    { "questionId": "uuid", "correctAnswer": "A" },
    { "questionId": "uuid", "correctAnswer": "texto dissertativo correto" }
  ]
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
{ "error": "EXAM_NOT_FOUND" }
```

**Response — 409 Conflict**
```json
{ "error": "INVALID_STATUS", "details": "Exam must be in 'awaiting_answers' status" }
```

**Side effects:**
1. Sets `questions.correct_answer` for each submitted answer
2. Creates one `adaptations` record per question × support (status `pending`)
3. Sets `exams.status = 'processing'`
4. Invokes `analyze-and-adapt` Edge Function asynchronously (non-blocking)

#### `GET /api/exams/[id]/adaptation-status`

Polls the overall adaptation progress for the `AdaptationProgress` component.

**Response — 200 OK**
```json
{
  "status": "processing" | "ready" | "error",
  "totalAdaptations": 6,
  "completedAdaptations": 4,
  "errorAdaptations": 0
}
```

**Response — 403 Forbidden** — exam does not belong to authenticated user
**Response — 404 Not Found** — exam does not exist

### 4.5 Edge Function Contract: `analyze-and-adapt`

**Invocation:** called from `POST /api/exams/[id]/answers` route handler via `supabase.functions.invoke()` — fire-and-forget (async, non-blocking)

**Input**
```typescript
interface AnalyzeAndAdaptPayload {
  examId: string;
  userId: string;
}
```

**Output** (returned to caller after all adaptations complete; also written to DB internally)
```typescript
interface AnalyzeAndAdaptResponse {
  success: boolean;
  adaptationsCompleted: number;
  adaptationsErrored: number;
  error?: string;  // present only when success = false (fatal failure)
}
```

**Processing flow per question:**
1. Fetch BNCC skill and Bloom level via LLM call (parallel across all questions via `Promise.all`)
2. Update `questions` table with `bncc_skill_code`, `bncc_skill_description`, `bloom_level`, `bloom_justification` (requires migration to add these columns to `questions`)
3. For each support linked to the exam via `exam_supports`:
   a. Build adaptation prompt (MC vs. essay branch)
   b. Call LLM; parse response with `adaptationResponseSchema`
   c. Validate `adaptedAlternatives.length` === `alternatives.length` (CON-001)
   d. On success: update `adaptations` record — status `completed`, store adapted content
   e. On JSON parse failure: store raw text as `adapted_statement`, log warning (CON-003)
   f. On count mismatch or fatal error: update `adaptations` record — status `error`, store `error_message`
4. After all adaptations: if all completed → `exams.status = 'ready'`; if any errored → `exams.status = 'ready'` (partial success allowed; individual records track error state)

**Side effects on DB:**
1. Sets each `adaptations.status = 'processing'` on start per record
2. Writes analysis results to `questions` (requires new columns — see migration note in Section 4.1)
3. Writes adapted content to `adaptations` records
4. Sets `exams.status = 'ready'` on completion

> **Migration note:** `analyze-and-adapt` also requires adding BNCC/Bloom columns to the `questions` table. This requires a new migration (not yet written):
> ```sql
> alter table public.questions
>   add column if not exists bncc_skill_code text,
>   add column if not exists bncc_skill_description text,
>   add column if not exists bloom_level text check (bloom_level in (
>     'remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'
>   )),
>   add column if not exists bloom_justification text;
> ```

---

## Section 5: Acceptance Criteria

| ID | Given | When | Then |
|----|-------|------|------|
| AC-001 | Extraction completed, exam in `awaiting_answers`, teacher submits all correct answers | `POST /api/exams/[id]/answers` | `analyze-and-adapt` triggered for all questions × supports; `exams.status` set to `'processing'`; response `200 { ok: true }` |
| AC-002 | Multiple choice question, LLM returns `adaptedAlternatives` with wrong count | Adaptation Edge Function processes that question × support pair | `adaptations.status` set to `'error'`; `adaptations.error_message` populated with count mismatch description |
| AC-003 | LLM returns malformed JSON (parse failure) | JSON parse attempt fails | Raw LLM response text stored as `adapted_statement`; `adaptations.status` set to `'completed'`; warning logged in Edge Function |
| AC-004 | Exam with 3 questions × 2 supports | All adaptations complete successfully | 6 `adaptations` records with `status = 'completed'`; `exams.status = 'ready'` |
| AC-005 | Exam in any status other than `awaiting_answers` | `POST /api/exams/[id]/answers` | Response `409 { error: "INVALID_STATUS" }` |
| AC-006 | Unauthenticated request | `POST /api/exams/[id]/answers` | Response `401 { error: "UNAUTHENTICATED" }` |
| AC-007 | Authenticated teacher accesses exam belonging to another user | `POST /api/exams/[id]/answers` | Response `403 { error: "FORBIDDEN" }` |

---

## Section 6: Test Strategy

### Layer 1 — Vitest + @testing-library/react

**Utility function tests (`lib/utils/adaptation.test.ts`)**
- `buildAdaptationPrompt`: multiple-choice question generates prompt with JSON output instruction and `\n` line break instruction (CON-002); essay question generates prompt requesting plain text output
- `safeParseAlternatives`: valid JSON array returns parsed `AdaptedAlternative[]`; plain text string returns `null` and does not throw; `null` input returns `null` and does not throw
- `validateCorrectAnswer`: valid letter (A–E) returns `null` (no error); empty string returns error; non-letter string for MC question returns error
- `validateAdaptedAlternatives`: matching count returns `null` (no error); count mismatch returns error message with expected vs. actual counts
- `identifyQuestionType`: question with non-null `alternatives` array returns `'multiple_choice'`; question with `alternatives: null` returns `'essay'`

**Zod schema tests (`lib/schemas/adaptation.test.ts`)**
- `bnccAnalysisSchema`: valid `{ skillCode, skillDescription }` passes; missing `skillCode` fails; empty `skillDescription` fails
- `bloomAnalysisSchema`: valid `{ level: 'analyze', justification: '...' }` passes; invalid Bloom level enum value fails
- `adaptationResponseSchema`: valid MC object with `adaptedStatement` and `adaptedAlternatives` passes; plain string passes; empty string fails; object missing `adaptedStatement` fails

Mock: `vi.mock('@/lib/supabase/server')`, `vi.mock('@/lib/supabase/client')`

### Layer 2 — jest-axe + Vitest

**Component: `<AdaptationProgress>` (`components/adaptation-progress.test.tsx`)**
- State `pending` (no adaptations started): initial waiting message visible; zero WCAG violations
- State `processing` (some adaptations in progress): progress indicator visible with `aria-label`; percentage or count announced; zero WCAG violations
- State `completed` (all adaptations with status `completed`): success state with CTA to view results visible; zero WCAG violations
- State `error` (one or more adaptations with status `error`): error summary visible; retry affordance present; zero WCAG violations

All axe scans use tags: `wcag2a`, `wcag2aa`, `wcag22aa`

Mock: `vi.mock('supabase/functions/analyze-and-adapt')`

### Layer 3 — Playwright + @axe-core/playwright

**Page: `/exams/[id]/processing`**
- Full page axe scan with tags `wcag2a`, `wcag2aa`, `wcag22aa`; zero violations required
- Polling indicator visible: progress element has `role="progressbar"` with `aria-valuenow` and `aria-valuemax`
- Error state: adaptation error messages accessible to screen readers; error descriptions have `role="alert"`
- Loading state: spinner or progress indicator has descriptive `aria-label`

**CI gate:** All Playwright a11y tests must pass before PR merge; `axe.disableRules()` forbidden.

**Coverage target:** 80% minimum on `analyze-and-adapt` Edge Function utility functions (`buildAdaptationPrompt`, `safeParseAlternatives`, `validateAdaptedAlternatives`).

---

## Section 7: Design Rationale

### Edge Function for LLM Calls

Supabase Edge Functions were chosen to host all LLM API calls for the following reasons:
- **Cost isolation**: LLM calls are expensive; running them in a dedicated Edge Function isolates costs and enables per-exam usage tracking
- **Timeout management**: Edge Functions run up to ~150s; this boundary prevents long-running LLM chains from blocking Next.js serverless functions (max ~10s on Vercel)
- **Secret handling**: `SUPABASE_SERVICE_ROLE_KEY` and LLM `api_key` are only accessible in the Deno runtime; they are never exposed to the client or Next.js route handlers (SEC-001)
- **Async fire-and-forget**: The route handler invokes the Edge Function and returns immediately (`{ ok: true }`), enabling the async processing model required by REQ-004

### BNCC + Bloom Enrichment

BNCC skill identification and Bloom level classification were included as first-class features because:
- **Pedagogical value**: Teachers need to know which curriculum competencies each adapted question targets; BNCC codes are required in many Brazilian schools for planning documentation
- **Adaptation quality**: Knowing the Bloom level allows the LLM to preserve cognitive demand in the adapted version (e.g., an 'analyze' question should remain analytical even after simplification)
- **Regulatory alignment**: Brazil's LGPD and education regulations encourage BNCC-aligned materials; enrichment data supports compliance reporting

### JSON Structured Output for Multiple-Choice Adaptations

Multiple-choice adaptations use a structured JSON response (`{ adaptedStatement, adaptedAlternatives[] }`) rather than plain text because:
- **Reliability**: Separating the adapted question stem from adapted alternatives makes it straightforward to render them independently in the result view
- **Validation**: A structured response enables `validateAdaptedAlternatives` to enforce count parity (CON-001), catching LLM hallucinations that add or remove alternatives
- **Copy UX**: The `CopyableBlock` type can represent each alternative independently, allowing teachers to copy individual alternatives for paste into Word/Google Docs
- **Trade-off**: Structured output requires the `\n` line-break instruction (CON-002) and a JSON parse fallback (CON-003) to handle LLM non-compliance

---

## Section 8: Dependencies

| ID | Type | Description |
|----|------|-------------|
| EXT-001 | External Service | Supabase Edge Functions (Deno runtime) — hosts and executes `analyze-and-adapt` |
| SVC-001 | External API | OpenAI-compatible LLM (e.g., GPT-4o via OpenAI API or Azure OpenAI) — performs BNCC analysis, Bloom analysis, and adaptation generation |
| DB-001 | Database | Supabase PostgreSQL — `adaptations`, `supports`, `exam_supports`, `questions`, and `exams` tables with RLS policies |
| PLT-001 | Platform | Next.js 16 App Router, Node.js runtime — hosts `POST /api/exams/[id]/answers` and `GET /api/exams/[id]/adaptation-status` route handlers |
| LIB-001 | Library | `@supabase/ssr` — server-side Supabase client for auth and DB access in Next.js route handlers |
| LIB-002 | Library | Zod — runtime validation of request bodies and Edge Function LLM responses |
| SPEC-001 | Specification | spec-process-extraction.md — provides `Exam`, `Question`, `ExamStatus`, and `ExamWithJoins` types imported by this spec |

---

## Section 9: Examples

### Example 1: Multiple Choice Question — Successful Adaptation

**Scenario:** Exam with 1 multiple-choice question (4 alternatives) × 2 supports (visual cue + simplified text).

**Flow:**
1. Teacher submits `POST /api/exams/[id]/answers` with `{ answers: [{ questionId, correctAnswer: "B" }] }`
2. Route handler creates 2 `adaptations` records (status `pending`), sets `exams.status = 'processing'`, invokes `analyze-and-adapt`
3. Edge Function fetches BNCC + Bloom for the question via LLM: `{ skillCode: "EF06MA01", skillDescription: "...", level: "apply", justification: "..." }`
4. For Support 1 (visual cue): LLM returns `{ adaptedStatement: "...", adaptedAlternatives: [{label:"A",text:"..."}, ...] }` (4 items)
5. `validateAdaptedAlternatives(4, 4)` → no error; `adaptations[0].status = 'completed'`
6. For Support 2 (simplified text): same flow; `adaptations[1].status = 'completed'`
7. `exams.status = 'ready'`
8. Teacher polls `/api/exams/[id]/adaptation-status` → `{ status: "ready", totalAdaptations: 2, completedAdaptations: 2, errorAdaptations: 0 }`

### Example 2: Multiple Choice Question — Alternative Count Mismatch

**Scenario:** LLM returns 3 alternatives for a question that originally had 4.

**Flow:**
1. `validateAdaptedAlternatives(4, 3)` → error: `"Expected 4 alternatives, got 3"`
2. `adaptations.status = 'error'`; `adaptations.error_message = "Expected 4 alternatives, got 3"`
3. `exams.status = 'ready'` (partial success — exam marked ready so teacher can access non-errored adaptations)
4. `AdaptationProgress` renders error state for that specific question × support pair

### Example 3: Essay Question — LLM Returns Malformed JSON

**Scenario:** LLM for an essay question returns a JSON string instead of plain text.

**Flow:**
1. `buildAdaptationPrompt` instructs LLM to return plain text for essay question
2. LLM returns `{"text": "adapted essay content"}` (non-compliant JSON)
3. `safeParseAlternatives` receives non-array JSON — returns `null`
4. `adaptationResponseSchema` union: string branch fails (it is an object); object branch requires `adaptedAlternatives` (also fails)
5. Fallback: raw response string stored as `adapted_statement`; warning logged; `adaptations.status = 'completed'`
6. Teacher sees the raw JSON text in the result view — pedagogically usable even if malformed

### Example 4: Exam with 3 Questions × 2 Supports

**Scenario:** Teacher submits answers for a 3-question exam with 2 supports selected at creation time.

**Flow:**
1. `POST /api/exams/[id]/answers` with 3 answers → 6 `adaptations` records created (3 questions × 2 supports)
2. Edge Function runs BNCC + Bloom for all 3 questions in parallel (`Promise.all`)
3. 6 adaptations processed; all succeed
4. Final state: 6 records with `status = 'completed'`; `exams.status = 'ready'`

---

## Section 10: Validation Checklist

The following checklist must be verified before this spec is considered implementation-ready:

- [x] Frontmatter complete: `title`, `version`, `date_created`, `last_updated`, `owner`, `tags`
- [x] All 11 sections present (Introduction through Related Specifications)
- [x] Global Constraints block present verbatim in Section 3
- [x] All feature REQs (REQ-001 through SEC-001) traceable to PRD F6
- [x] Section 4 includes:
  - [x] Current SQL schema for `adaptations` (from existing migration)
  - [x] Target SQL schema changes for `adaptations` (clearly marked as requiring new migration)
  - [x] Current SQL schema for `supports` (from existing migration)
  - [x] New `exam_supports` junction table (clearly marked as requiring new migration, with RLS policy)
  - [x] Migration note for BNCC/Bloom columns on `questions` table
  - [x] TypeScript types: `Adaptation`, `AdaptedAlternative`, `CopyableBlock`, `BnccAnalysis`, `BloomAnalysis`
  - [x] Zod schemas: `bnccAnalysisSchema`, `bloomAnalysisSchema`, `adaptationResponseSchema` (union: JSON object | plain string)
  - [x] API contract: `POST /api/exams/[id]/answers` (body: answers array → `{ ok: true }`)
  - [x] API contract: `GET /api/exams/[id]/adaptation-status` (polling endpoint)
  - [x] Edge Function `analyze-and-adapt` input/output contract with detailed processing flow
- [x] Section 5 has ≥ 5 ACs in Given-When-Then format (7 ACs present)
- [x] Section 6 has all 3 test layers with specific named test cases
- [x] Section 11 references at least 3 related specs

---

## Section 11: Related Specifications

| Spec | Relationship |
|------|-------------|
| `spec-process-extraction.md` | Upstream — provides `Exam`, `Question`, `ExamStatus`, and `ExamWithJoins` types; adaptation is triggered after `status = 'awaiting_answers'` set by extraction |
| `spec-process-result.md` | Downstream — defines the side-by-side result display after adaptation; depends on `Adaptation`, `AdaptedAlternative`, and `CopyableBlock` types defined here |
| `spec-process-new-exam.md` | Upstream UI — defines the teacher-facing form that selects supports at exam creation time; those selections populate `exam_supports` which this spec reads |
| `spec-design-admin-config.md` | Cross-cutting — defines how administrators configure available LLM models in `ai_models` and supports in `supports`; SEC-001 depends on model `api_key` management defined there |
