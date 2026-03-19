# AI Analysis & Adaptation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the AI analysis and adaptation process — database migrations, types, schemas, utility functions, route handlers, Edge Function, and AdaptationProgress component — as defined in `spec/spec-process-adaptation.md`.

**Architecture:** Bottom-up implementation: migrations → types → schemas + tests → utility functions + tests → route handlers → Edge Function → polling component + a11y tests. Each layer depends only on the one below. The Edge Function uses a pipeline-per-question model (analysis → adaptations per question, all questions in parallel). Answer validation is differentiated: MC requires `correctAnswer`, essay is optional.

**Tech Stack:** Next.js 16 (App Router) · Supabase (PostgreSQL, Edge Functions/Deno) · Zod · Vitest + jest-axe · Playwright + axe-core · Tailwind CSS v3 · tailwind-variants

---

## Reference Documents

- Spec: `spec/spec-process-adaptation.md` (source of truth for all contracts, types, schemas, ACs)
- Existing patterns: `lib/types/extraction.ts`, `lib/schemas/extraction.ts`, `app/(auth)/api/exams/route.ts`
- Current migrations: `supabase/migrations/20260318000001_initial_schema.sql`, `supabase/migrations/20260319000001_add_extraction_columns.sql`
- Next.js 16 docs: `node_modules/next/dist/docs/` (read before writing route handlers)

## File Structure

```
supabase/migrations/
  20260319000002_expand_adaptations_table.sql   # Task 1
  20260319000003_create_exam_supports.sql        # Task 1
  20260319000004_add_bncc_bloom_to_questions.sql # Task 1
lib/types/
  adaptation.ts                                  # Task 2
lib/schemas/
  adaptation.ts                                  # Task 3
  adaptation.test.ts                             # Task 3
lib/utils/
  adaptation.ts                                  # Task 4
  adaptation.test.ts                             # Task 4
app/(auth)/api/exams/[id]/
  answers/route.ts                               # Task 5
  adaptation-status/route.ts                     # Task 6
supabase/functions/analyze-and-adapt/
  index.ts                                       # Task 7 (replace stub)
components/
  adaptation-progress.tsx                        # Task 8
  adaptation-progress.test.tsx                   # Task 8
```

---

## Task 1: Database Migrations

**Files:**
- Create: `supabase/migrations/20260319000002_expand_adaptations_table.sql`
- Create: `supabase/migrations/20260319000003_create_exam_supports.sql`
- Create: `supabase/migrations/20260319000004_add_bncc_bloom_to_questions.sql`

- [ ] **Step 1: Create migration to expand `adaptations` table**

Create `supabase/migrations/20260319000002_expand_adaptations_table.sql`:

```sql
-- Expand adaptations table for full adaptation pipeline
-- Spec: spec-process-adaptation.md Section 4.1

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

-- RLS policies for adaptations (teachers access their own via exam ownership)
create policy "Teachers can view their exam adaptations" on public.adaptations
  for select using (
    exists (
      select 1 from public.questions q
      join public.exams e on e.id = q.exam_id
      where q.id = adaptations.question_id
        and e.user_id = auth.uid()
    )
  );

comment on column public.adaptations.support_id is 'FK to supports — which pedagogical support strategy was used';
comment on column public.adaptations.adapted_statement is 'Adapted question stem/text from LLM';
comment on column public.adaptations.status is 'Lifecycle: pending → processing → completed | error';
```

- [ ] **Step 2: Create migration for `exam_supports` junction table**

Create `supabase/migrations/20260319000003_create_exam_supports.sql`:

```sql
-- Create exam_supports junction table
-- Spec: spec-process-adaptation.md Section 4.1

create table if not exists public.exam_supports (
  id uuid primary key default uuid_generate_v4(),
  exam_id uuid references public.exams(id) on delete cascade not null,
  support_id uuid references public.supports(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (exam_id, support_id)
);

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

- [ ] **Step 3: Create migration to add BNCC/Bloom columns to `questions`**

Create `supabase/migrations/20260319000004_add_bncc_bloom_to_questions.sql`:

```sql
-- Add BNCC and Bloom analysis columns to questions table
-- Spec: spec-process-adaptation.md Section 4.5 migration note

alter table public.questions
  add column if not exists bncc_skill_code text,
  add column if not exists bncc_skill_description text,
  add column if not exists bloom_level text check (bloom_level in (
    'remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'
  )),
  add column if not exists bloom_justification text;

comment on column public.questions.bncc_skill_code is 'BNCC skill code identified by LLM (e.g. EF06MA01)';
comment on column public.questions.bloom_level is 'Bloom cognitive level: remember|understand|apply|analyze|evaluate|create';
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260319000002_expand_adaptations_table.sql \
        supabase/migrations/20260319000003_create_exam_supports.sql \
        supabase/migrations/20260319000004_add_bncc_bloom_to_questions.sql
git commit -m "feat(db): add adaptation migrations — expand adaptations, create exam_supports, add BNCC/Bloom to questions"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `lib/types/adaptation.ts`
- Reference: `lib/types/extraction.ts` (follow same documentation style)

- [ ] **Step 1: Create `lib/types/adaptation.ts`**

Copy types exactly from spec Section 4.2. Follow the JSDoc pattern from `lib/types/extraction.ts`:

```typescript
/**
 * Type definitions for AI analysis and adaptation process
 * Corresponds to spec-process-adaptation.md (Section 4)
 * Imports: Exam, Question, ExamStatus from lib/types/extraction.ts
 */

/**
 * Bloom's Taxonomy cognitive levels (6 levels)
 */
export type BloomLevel =
  | 'remember'
  | 'understand'
  | 'apply'
  | 'analyze'
  | 'evaluate'
  | 'create';

/**
 * BNCC skill identified by LLM for a question
 */
export interface BnccAnalysis {
  /** BNCC skill code (e.g. "EF06MA01") */
  skillCode: string;
  /** BNCC skill description in Portuguese */
  skillDescription: string;
}

/**
 * Bloom level identified by LLM for a question
 */
export interface BloomAnalysis {
  /** One of the 6 Bloom cognitive levels */
  level: BloomLevel;
  /** LLM reasoning for the assigned level */
  justification: string;
}

/**
 * Single adapted alternative in a multiple-choice adaptation
 */
export interface AdaptedAlternative {
  /** Alternative label (e.g. "A", "B", "C", "D") */
  label: string;
  /** Adapted alternative text */
  text: string;
}

/**
 * Adaptation record lifecycle status
 */
export type AdaptationStatus = 'pending' | 'processing' | 'completed' | 'error';

/**
 * Full adaptation record — one per question × support
 */
export interface Adaptation {
  id: string;
  questionId: string;
  supportId: string | null;
  adaptedStatement: string | null;
  adaptedAlternatives: AdaptedAlternative[] | null;
  bnccSkillCode: string | null;
  bnccSkillDescription: string | null;
  bloomLevel: BloomLevel | null;
  bloomJustification: string | null;
  status: AdaptationStatus;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Rendered content block with copy-to-clipboard action
 */
export interface CopyableBlock {
  id: string;
  /** Display label (e.g. "Questão 1 — Apoio Visual") */
  label: string;
  /** Adapted text content to be copied */
  content: string;
  questionId: string;
  adaptationId: string;
}

/**
 * Payload sent to analyze-and-adapt Edge Function
 */
export interface AnalyzeAndAdaptPayload {
  examId: string;
  userId: string;
}

/**
 * Response from analyze-and-adapt Edge Function
 */
export interface AnalyzeAndAdaptResponse {
  success: boolean;
  adaptationsCompleted: number;
  adaptationsErrored: number;
  error?: string;
}

/**
 * Adaptation status polling response
 */
export interface AdaptationStatusResponse {
  status: 'processing' | 'ready' | 'error';
  totalAdaptations: number;
  completedAdaptations: number;
  errorAdaptations: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/types/adaptation.ts
git commit -m "feat(types): add adaptation TypeScript types"
```

---

## Task 3: Zod Schemas + Tests

**Files:**
- Create: `lib/schemas/adaptation.ts`
- Create: `lib/schemas/adaptation.test.ts`
- Reference: `lib/schemas/extraction.ts` and `lib/schemas/extraction.test.ts` (follow same patterns)

- [ ] **Step 1: Write failing tests for Zod schemas**

Create `lib/schemas/adaptation.test.ts`:

```typescript
/**
 * Unit tests for adaptation schemas
 * Spec: spec-process-adaptation.md Section 6, Layer 1
 */

import { describe, it, expect } from 'vitest';
import {
  bloomLevelSchema,
  bnccAnalysisSchema,
  bloomAnalysisSchema,
  adaptedAlternativeSchema,
  adaptationResponseSchema,
  submitAnswerOptionalSchema,
  submitAnswersSchema,
} from './adaptation';

describe('Adaptation Schemas', () => {
  describe('bnccAnalysisSchema', () => {
    it('should validate valid BNCC analysis', () => {
      const valid = { skillCode: 'EF06MA01', skillDescription: 'Resolver problemas...' };
      expect(bnccAnalysisSchema.safeParse(valid).success).toBe(true);
    });

    it('should reject missing skillCode', () => {
      const invalid = { skillDescription: 'Resolver problemas...' };
      expect(bnccAnalysisSchema.safeParse(invalid).success).toBe(false);
    });

    it('should reject empty skillDescription', () => {
      const invalid = { skillCode: 'EF06MA01', skillDescription: '' };
      expect(bnccAnalysisSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('bloomAnalysisSchema', () => {
    it('should validate valid Bloom analysis', () => {
      const valid = { level: 'analyze', justification: 'Requires comparison of concepts' };
      expect(bloomAnalysisSchema.safeParse(valid).success).toBe(true);
    });

    it('should reject invalid Bloom level', () => {
      const invalid = { level: 'memorize', justification: 'Some reason' };
      expect(bloomAnalysisSchema.safeParse(invalid).success).toBe(false);
    });

    it('should reject empty justification', () => {
      const invalid = { level: 'apply', justification: '' };
      expect(bloomAnalysisSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('adaptationResponseSchema', () => {
    it('should validate MC object with adaptedStatement and adaptedAlternatives', () => {
      const valid = {
        adaptedStatement: 'Adapted question text',
        adaptedAlternatives: [
          { label: 'A', text: 'Option A' },
          { label: 'B', text: 'Option B' },
        ],
      };
      expect(adaptationResponseSchema.safeParse(valid).success).toBe(true);
    });

    it('should validate plain string (essay)', () => {
      const valid = 'Adapted essay question text';
      expect(adaptationResponseSchema.safeParse(valid).success).toBe(true);
    });

    it('should reject empty string', () => {
      expect(adaptationResponseSchema.safeParse('').success).toBe(false);
    });

    it('should reject object missing adaptedStatement', () => {
      const invalid = {
        adaptedAlternatives: [{ label: 'A', text: 'Option A' }],
      };
      expect(adaptationResponseSchema.safeParse(invalid).success).toBe(false);
    });

    it('should reject object with empty adaptedAlternatives array', () => {
      const invalid = {
        adaptedStatement: 'Some text',
        adaptedAlternatives: [],
      };
      expect(adaptationResponseSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('submitAnswersSchema', () => {
    it('should validate answers with correctAnswer provided', () => {
      const valid = {
        answers: [
          { questionId: '550e8400-e29b-41d4-a716-446655440000', correctAnswer: 'A' },
        ],
      };
      expect(submitAnswersSchema.safeParse(valid).success).toBe(true);
    });

    it('should validate answers with optional correctAnswer omitted (essay)', () => {
      const valid = {
        answers: [
          { questionId: '550e8400-e29b-41d4-a716-446655440000' },
        ],
      };
      expect(submitAnswersSchema.safeParse(valid).success).toBe(true);
    });

    it('should reject empty answers array', () => {
      const invalid = { answers: [] };
      expect(submitAnswersSchema.safeParse(invalid).success).toBe(false);
    });

    it('should reject invalid questionId (not UUID)', () => {
      const invalid = {
        answers: [{ questionId: 'not-a-uuid', correctAnswer: 'A' }],
      };
      expect(submitAnswersSchema.safeParse(invalid).success).toBe(false);
    });

    it('should reject empty correctAnswer string when provided', () => {
      const invalid = {
        answers: [
          { questionId: '550e8400-e29b-41d4-a716-446655440000', correctAnswer: '' },
        ],
      };
      expect(submitAnswersSchema.safeParse(invalid).success).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- lib/schemas/adaptation.test.ts
```

Expected: FAIL — `./adaptation` module not found.

- [ ] **Step 3: Create `lib/schemas/adaptation.ts`**

Copy schemas exactly from spec Section 4.3:

```typescript
/**
 * Zod validation schemas for AI analysis and adaptation process
 * Corresponds to spec-process-adaptation.md (Section 4.3)
 */

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

export const adaptationResponseSchema = z.union([
  z.object({
    adaptedStatement: z.string().min(1),
    adaptedAlternatives: z.array(adaptedAlternativeSchema).min(1),
  }),
  z.string().min(1),
]);

export type AdaptationResponse = z.infer<typeof adaptationResponseSchema>;

export const submitAnswerOptionalSchema = z.object({
  questionId: z.string().uuid('Invalid question ID'),
  correctAnswer: z.string().min(1).optional(),
});

export const submitAnswersSchema = z.object({
  answers: z.array(submitAnswerOptionalSchema).min(1, 'At least one answer is required'),
});

export type SubmitAnswersInput = z.infer<typeof submitAnswersSchema>;
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- lib/schemas/adaptation.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/schemas/adaptation.ts lib/schemas/adaptation.test.ts
git commit -m "feat(schemas): add adaptation Zod schemas with tests"
```

---

## Task 4: Utility Functions + Tests

**Files:**
- Create: `lib/utils/adaptation.ts`
- Create: `lib/utils/adaptation.test.ts`
- Reference: spec Section 6 Layer 1 for test cases

- [ ] **Step 1: Write failing tests**

Create `lib/utils/adaptation.test.ts`:

```typescript
/**
 * Unit tests for adaptation utility functions
 * Spec: spec-process-adaptation.md Section 6, Layer 1
 */

import { describe, it, expect } from 'vitest';
import {
  identifyQuestionType,
  validateCorrectAnswer,
  validateAdaptedAlternatives,
  safeParseAlternatives,
  buildAdaptationPrompt,
} from './adaptation';

describe('Adaptation Utilities', () => {
  describe('identifyQuestionType', () => {
    it('should return multiple_choice for question with alternatives', () => {
      const question = { alternatives: { a: 'Option A', b: 'Option B' } };
      expect(identifyQuestionType(question)).toBe('multiple_choice');
    });

    it('should return essay for question with null alternatives', () => {
      const question = { alternatives: null };
      expect(identifyQuestionType(question)).toBe('essay');
    });

    it('should return essay for question with undefined alternatives', () => {
      const question = {};
      expect(identifyQuestionType(question)).toBe('essay');
    });
  });

  describe('validateAdaptedAlternatives', () => {
    it('should return null when counts match', () => {
      expect(validateAdaptedAlternatives(4, 4)).toBeNull();
    });

    it('should return error message on count mismatch', () => {
      const result = validateAdaptedAlternatives(4, 3);
      expect(result).toBe('Expected 4 alternatives, got 3');
    });

    it('should return error when expected is 0', () => {
      const result = validateAdaptedAlternatives(0, 2);
      expect(result).toBe('Expected 0 alternatives, got 2');
    });
  });

  describe('validateCorrectAnswer', () => {
    it('should return null for valid letter (A-E)', () => {
      expect(validateCorrectAnswer('B', 'multiple_choice')).toBeNull();
    });

    it('should return error for empty string', () => {
      expect(validateCorrectAnswer('', 'multiple_choice')).toBeTruthy();
    });

    it('should return error for non-letter string on MC question', () => {
      expect(validateCorrectAnswer('maybe', 'multiple_choice')).toBeTruthy();
    });

    it('should return null for any string on essay question', () => {
      expect(validateCorrectAnswer('full text answer', 'essay')).toBeNull();
    });

    it('should return null for empty string on essay question', () => {
      expect(validateCorrectAnswer('', 'essay')).toBeNull();
    });
  });

  describe('safeParseAlternatives', () => {
    it('should parse valid JSON array of alternatives', () => {
      const raw = JSON.stringify([
        { label: 'A', text: 'Option A' },
        { label: 'B', text: 'Option B' },
      ]);
      const result = safeParseAlternatives(raw);
      expect(result).toHaveLength(2);
      expect(result![0].label).toBe('A');
    });

    it('should return null for plain text string', () => {
      expect(safeParseAlternatives('Just a plain text answer')).toBeNull();
    });

    it('should return null for null input', () => {
      expect(safeParseAlternatives(null)).toBeNull();
    });

    it('should return null for non-array JSON', () => {
      expect(safeParseAlternatives('{"text": "not an array"}')).toBeNull();
    });
  });

  describe('buildAdaptationPrompt', () => {
    const mcQuestion = {
      question_text: 'What is 2+2?',
      alternatives: { a: '3', b: '4', c: '5', d: '6' },
      correct_answer: 'b',
    };

    const essayQuestion = {
      question_text: 'Explain photosynthesis.',
      alternatives: null,
      correct_answer: null,
    };

    const support = { name: 'Simplificação de Texto' };
    const bncc = { skillCode: 'EF06MA01', skillDescription: 'Resolver problemas...' };

    it('should include JSON output instruction for MC question', () => {
      const prompt = buildAdaptationPrompt(mcQuestion, support, bncc);
      expect(prompt).toContain('adaptedStatement');
      expect(prompt).toContain('adaptedAlternatives');
      expect(prompt).toContain('\\n');
    });

    it('should request plain text output for essay question', () => {
      const prompt = buildAdaptationPrompt(essayQuestion, support, bncc);
      expect(prompt).not.toContain('adaptedAlternatives');
      expect(prompt).toContain('plain text');
    });

    it('should include BNCC skill in prompt', () => {
      const prompt = buildAdaptationPrompt(mcQuestion, support, bncc);
      expect(prompt).toContain('EF06MA01');
    });

    it('should include support name in prompt', () => {
      const prompt = buildAdaptationPrompt(mcQuestion, support, bncc);
      expect(prompt).toContain('Simplificação de Texto');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- lib/utils/adaptation.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/utils/adaptation.ts`**

```typescript
/**
 * Utility functions for AI analysis and adaptation process
 * Corresponds to spec-process-adaptation.md Section 4.5
 */

import type { AdaptedAlternative } from '@/lib/types/adaptation';
import { z } from 'zod';
import { adaptedAlternativeSchema } from '@/lib/schemas/adaptation';

/**
 * Identifies question type based on alternatives field
 * @returns 'multiple_choice' if alternatives is non-null object, 'essay' otherwise
 */
export function identifyQuestionType(
  question: { alternatives?: Record<string, string> | null }
): 'multiple_choice' | 'essay' {
  return question.alternatives != null ? 'multiple_choice' : 'essay';
}

/**
 * Validates correct answer for a question type
 * MC: must be a single letter A-E; Essay: any string is valid (including empty)
 * @returns null if valid, error message string if invalid
 */
export function validateCorrectAnswer(
  answer: string,
  questionType: 'multiple_choice' | 'essay'
): string | null {
  if (questionType === 'essay') return null;
  if (!answer) return 'Correct answer is required for multiple-choice questions';
  if (!/^[A-Ea-e]$/.test(answer)) return 'Correct answer must be a single letter (A-E)';
  return null;
}

/**
 * Validates adapted alternatives count matches original (CON-001)
 * @returns null if counts match, error message string if mismatch
 */
export function validateAdaptedAlternatives(
  expected: number,
  actual: number
): string | null {
  if (expected === actual) return null;
  return `Expected ${expected} alternatives, got ${actual}`;
}

/**
 * Safely parses a raw string as AdaptedAlternative array (CON-003 fallback)
 * @returns parsed array or null if input is not a valid JSON array of alternatives
 */
export function safeParseAlternatives(
  raw: string | null
): AdaptedAlternative[] | null {
  if (raw == null) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const result = z.array(adaptedAlternativeSchema).safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

/**
 * Builds LLM prompt for adapting a question with a given support strategy
 * MC questions: instructs JSON output with adaptedStatement + adaptedAlternatives
 * Essay questions: instructs plain text output
 * CON-002: instructs \n for line breaks in JSON
 */
export function buildAdaptationPrompt(
  question: {
    question_text: string;
    alternatives?: Record<string, string> | null;
    correct_answer?: string | null;
  },
  support: { name: string },
  bncc: { skillCode: string; skillDescription: string }
): string {
  const isMC = identifyQuestionType(question) === 'multiple_choice';
  const baseContext = [
    `You are an educational content adaptation specialist.`,
    `BNCC Skill: ${bncc.skillCode} — ${bncc.skillDescription}`,
    `Support strategy: ${support.name}`,
    `Original question: ${question.question_text}`,
  ];

  if (question.correct_answer) {
    baseContext.push(`Correct answer: ${question.correct_answer}`);
  }

  if (isMC && question.alternatives) {
    const altList = Object.entries(question.alternatives)
      .map(([key, val]) => `${key}) ${val}`)
      .join('\n');
    baseContext.push(`Original alternatives:\n${altList}`);
    baseContext.push(
      `Respond with a JSON object: { "adaptedStatement": "...", "adaptedAlternatives": [{ "label": "A", "text": "..." }, ...] }`,
      `You MUST return exactly ${Object.keys(question.alternatives).length} alternatives.`,
      `Use \\n for line breaks within JSON string values. Do NOT use actual newlines inside JSON strings.`,
      `Preserve the BNCC skill in your adaptation. Make the question accessible using the "${support.name}" strategy.`
    );
  } else {
    baseContext.push(
      `Respond with plain text only — the adapted question statement.`,
      `Do NOT wrap in JSON. Return only the adapted text.`,
      `Preserve the BNCC skill in your adaptation. Make the question accessible using the "${support.name}" strategy.`
    );
  }

  return baseContext.join('\n\n');
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- lib/utils/adaptation.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/utils/adaptation.ts lib/utils/adaptation.test.ts
git commit -m "feat(utils): add adaptation utility functions with tests"
```

---

## Task 5: POST /api/exams/[id]/answers Route Handler

**Files:**
- Create: `app/(auth)/api/exams/[id]/answers/route.ts`
- Reference: `app/(auth)/api/exams/[id]/status/route.ts` (pattern for params, auth, error responses)
- Reference: spec Section 4.4 for contract, Section 5 for ACs

**Important:** Read `node_modules/next/dist/docs/` for async params pattern before implementing.

- [ ] **Step 1: Create route handler**

Create `app/(auth)/api/exams/[id]/answers/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server';
import { submitAnswersSchema } from '@/lib/schemas/adaptation';
import { ZodError } from 'zod';

/**
 * POST /api/exams/[id]/answers
 * Accepts correct answers, creates adaptation records, triggers Edge Function
 *
 * Spec: spec-process-adaptation.md Section 4.4
 * ACs: AC-001, AC-005, AC-006, AC-007, AC-008, AC-009
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // AC-006: Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }

    const { id: examId } = await params;

    // Fetch exam with ownership check (AC-007)
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('id, status, user_id')
      .eq('id', examId)
      .single();

    if (examError || !exam) {
      return Response.json({ error: 'EXAM_NOT_FOUND' }, { status: 404 });
    }

    if (exam.user_id !== user.id) {
      return Response.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    // AC-005: Validate exam status
    if (exam.status !== 'awaiting_answers') {
      return Response.json(
        { error: 'INVALID_STATUS', details: "Exam must be in 'awaiting_answers' status" },
        { status: 409 }
      );
    }

    // Parse and validate request body (Zod)
    const body = await request.json();
    let validated;
    try {
      validated = submitAnswersSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return Response.json(
          { error: 'VALIDATION_ERROR', details: error.issues[0]?.message || 'Validation error' },
          { status: 400 }
        );
      }
      throw error;
    }

    // Fetch exam questions for DB-state validation
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, alternatives')
      .eq('exam_id', examId);

    if (questionsError || !questions) {
      return Response.json({ error: 'EXAM_NOT_FOUND' }, { status: 404 });
    }

    // Validate: no duplicate questionIds
    const submittedIds = validated.answers.map((a) => a.questionId);
    const uniqueIds = new Set(submittedIds);
    if (uniqueIds.size !== submittedIds.length) {
      return Response.json(
        { error: 'VALIDATION_ERROR', details: 'Duplicate questionId entries' },
        { status: 400 }
      );
    }

    // Validate: every questionId belongs to this exam
    const questionIds = new Set(questions.map((q) => q.id));
    for (const answer of validated.answers) {
      if (!questionIds.has(answer.questionId)) {
        return Response.json(
          { error: 'VALIDATION_ERROR', details: `Question ${answer.questionId} does not belong to this exam` },
          { status: 400 }
        );
      }
    }

    // CON-004: MC questions require correctAnswer, essay questions don't
    const answersMap = new Map(
      validated.answers.map((a) => [a.questionId, a.correctAnswer])
    );
    const mcWithoutAnswer = questions.filter(
      (q) => q.alternatives != null && !answersMap.get(q.id)
    );
    if (mcWithoutAnswer.length > 0) {
      return Response.json(
        {
          error: 'VALIDATION_ERROR',
          details: `Missing correctAnswer for ${mcWithoutAnswer.length} multiple-choice question${mcWithoutAnswer.length > 1 ? 's' : ''}`,
        },
        { status: 400 }
      );
    }

    // Side effect 1: Set correct_answer on questions
    for (const answer of validated.answers) {
      if (answer.correctAnswer) {
        await supabase
          .from('questions')
          .update({ correct_answer: answer.correctAnswer })
          .eq('id', answer.questionId);
      }
    }

    // Fetch supports linked to this exam
    const { data: examSupports } = await supabase
      .from('exam_supports')
      .select('support_id')
      .eq('exam_id', examId);

    const supportIds = (examSupports || []).map((es) => es.support_id);

    // Side effect 2: Create adaptation records (question × support)
    const adaptationRecords = questions.flatMap((q) =>
      supportIds.map((supportId) => ({
        question_id: q.id,
        support_id: supportId,
        status: 'pending',
      }))
    );

    if (adaptationRecords.length > 0) {
      await supabase.from('adaptations').insert(adaptationRecords);
    }

    // Side effect 3: Set exam status to 'processing'
    await supabase
      .from('exams')
      .update({ status: 'processing' })
      .eq('id', examId);

    // Side effect 4: Invoke Edge Function (fire-and-forget)
    supabase.functions.invoke('analyze-and-adapt', {
      body: { examId, userId: user.id },
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error('POST /api/exams/[id]/answers error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(auth\)/api/exams/\[id\]/answers/route.ts
git commit -m "feat(api): add POST /api/exams/[id]/answers route handler"
```

---

## Task 6: GET /api/exams/[id]/adaptation-status Route Handler

**Files:**
- Create: `app/(auth)/api/exams/[id]/adaptation-status/route.ts`
- Reference: `app/(auth)/api/exams/[id]/status/route.ts` (follow same auth/params pattern)

- [ ] **Step 1: Create route handler**

Create `app/(auth)/api/exams/[id]/adaptation-status/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/exams/[id]/adaptation-status
 * Polls adaptation progress for AdaptationProgress component
 *
 * Spec: spec-process-adaptation.md Section 4.4
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }

    const { id: examId } = await params;

    // Fetch exam with ownership check
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('id, status, user_id')
      .eq('id', examId)
      .single();

    if (examError || !exam) {
      return Response.json({ error: 'EXAM_NOT_FOUND' }, { status: 404 });
    }

    if (exam.user_id !== user.id) {
      return Response.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    // Fetch question IDs for this exam, then count adaptation statuses
    const { data: questions } = await supabase
      .from('questions')
      .select('id')
      .eq('exam_id', examId);

    const questionIds = (questions || []).map((q) => q.id);

    const { data: adaptations } = questionIds.length > 0
      ? await supabase
          .from('adaptations')
          .select('status')
          .in('question_id', questionIds)
      : { data: [] };

    const total = adaptations?.length || 0;
    const completed = adaptations?.filter((a) => a.status === 'completed').length || 0;
    const errored = adaptations?.filter((a) => a.status === 'error').length || 0;

    // Determine overall status
    let status: 'processing' | 'ready' | 'error';
    if (total === 0) {
      status = 'processing';
    } else if (completed + errored === total) {
      status = 'ready';
    } else {
      status = 'processing';
    }

    return Response.json({
      status,
      totalAdaptations: total,
      completedAdaptations: completed,
      errorAdaptations: errored,
    });
  } catch (error) {
    console.error('GET /api/exams/[id]/adaptation-status error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(auth\)/api/exams/\[id\]/adaptation-status/route.ts
git commit -m "feat(api): add GET /api/exams/[id]/adaptation-status route handler"
```

---

## Task 7: Edge Function — analyze-and-adapt

**Files:**
- Modify: `supabase/functions/analyze-and-adapt/index.ts` (replace stub)
- Reference: spec Section 4.5 for pipeline-per-question flow

**Note:** This is Deno runtime — no npm imports. Use `esm.sh` for Zod if needed or inline validation. Supabase client comes from `@supabase/supabase-js` via `esm.sh`.

- [ ] **Step 1: Implement Edge Function**

Replace `supabase/functions/analyze-and-adapt/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * analyze-and-adapt Edge Function
 * Pipeline-per-question: for each question in parallel:
 *   Stage 1: BNCC + Bloom analysis via LLM
 *   Stage 2: Adaptation per support via LLM (parallel within question)
 *
 * Spec: spec-process-adaptation.md Section 4.5
 */

interface AnalyzeAndAdaptPayload {
  examId: string
  userId: string
}

interface AdaptedAlternative {
  label: string
  text: string
}

const BLOOM_LEVELS = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'] as const

serve(async (req) => {
  try {
    const payload: AnalyzeAndAdaptPayload = await req.json()
    const { examId } = payload

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch exam with subject and grade level
    const { data: exam } = await supabase
      .from('exams')
      .select('id, subject_id, grade_level_id, subjects(name), grade_levels(name)')
      .eq('id', examId)
      .single()

    if (!exam) {
      return jsonResponse({ success: false, adaptationsCompleted: 0, adaptationsErrored: 0, error: 'Exam not found' })
    }

    // Fetch questions for this exam
    const { data: questions } = await supabase
      .from('questions')
      .select('id, question_text, alternatives, correct_answer')
      .eq('exam_id', examId)

    if (!questions || questions.length === 0) {
      return jsonResponse({ success: false, adaptationsCompleted: 0, adaptationsErrored: 0, error: 'No questions found' })
    }

    // Fetch supports linked to this exam via exam_supports
    const { data: examSupports } = await supabase
      .from('exam_supports')
      .select('support_id, supports(id, content)')
      .eq('exam_id', examId)

    const supports = (examSupports || []).map((es: any) => es.supports).filter(Boolean)

    // Fetch default AI model for LLM calls
    const { data: defaultModel } = await supabase
      .from('ai_models')
      .select('id, name')
      .eq('is_default', true)
      .single()

    const subjectName = (exam as any).subjects?.name || 'Unknown'
    const gradeName = (exam as any).grade_levels?.name || 'Unknown'

    let totalCompleted = 0
    let totalErrored = 0

    // Pipeline per question — all questions in parallel
    await Promise.all(
      questions.map(async (question: any) => {
        try {
          // Stage 1: BNCC + Bloom analysis
          const analysisResult = await analyzeQuestion(question, subjectName, gradeName)

          // Write analysis to questions table
          await supabase
            .from('questions')
            .update({
              bncc_skill_code: analysisResult.skillCode,
              bncc_skill_description: analysisResult.skillDescription,
              bloom_level: analysisResult.bloomLevel,
              bloom_justification: analysisResult.bloomJustification,
            })
            .eq('id', question.id)

          // Stage 2: Adaptation per support — parallel within this question
          await Promise.all(
            supports.map(async (support: any) => {
              try {
                // Set status to processing
                await supabase
                  .from('adaptations')
                  .update({ status: 'processing', updated_at: new Date().toISOString() })
                  .eq('question_id', question.id)
                  .eq('support_id', support.id)

                const isMC = question.alternatives != null
                const prompt = buildPrompt(question, support, analysisResult, subjectName, gradeName)

                // TODO: Replace with actual LLM call via ai_models config
                // For now, this is a placeholder that returns a structured response
                const llmResponse = await callLLM(prompt)

                if (isMC) {
                  // Parse MC response
                  try {
                    const parsed = JSON.parse(llmResponse)
                    const adapted = parsed.adaptedAlternatives as AdaptedAlternative[]
                    const originalCount = Object.keys(question.alternatives).length

                    // CON-001: validate count
                    if (adapted.length !== originalCount) {
                      await setAdaptationError(
                        supabase, question.id, support.id,
                        `Expected ${originalCount} alternatives, got ${adapted.length}`
                      )
                      totalErrored++
                      return
                    }

                    await supabase
                      .from('adaptations')
                      .update({
                        adapted_statement: parsed.adaptedStatement,
                        adapted_alternatives: adapted,
                        bncc_skill_code: analysisResult.skillCode,
                        bncc_skill_description: analysisResult.skillDescription,
                        bloom_level: analysisResult.bloomLevel,
                        bloom_justification: analysisResult.bloomJustification,
                        status: 'completed',
                        updated_at: new Date().toISOString(),
                      })
                      .eq('question_id', question.id)
                      .eq('support_id', support.id)

                    totalCompleted++
                  } catch {
                    // CON-003: JSON parse failure — store raw text
                    console.warn(`JSON parse failed for question ${question.id}, support ${support.id}. Storing raw text.`)
                    await supabase
                      .from('adaptations')
                      .update({
                        adapted_statement: llmResponse,
                        status: 'completed',
                        updated_at: new Date().toISOString(),
                      })
                      .eq('question_id', question.id)
                      .eq('support_id', support.id)

                    totalCompleted++
                  }
                } else {
                  // Essay: store plain text
                  await supabase
                    .from('adaptations')
                    .update({
                      adapted_statement: llmResponse,
                      bncc_skill_code: analysisResult.skillCode,
                      bncc_skill_description: analysisResult.skillDescription,
                      bloom_level: analysisResult.bloomLevel,
                      bloom_justification: analysisResult.bloomJustification,
                      status: 'completed',
                      updated_at: new Date().toISOString(),
                    })
                    .eq('question_id', question.id)
                    .eq('support_id', support.id)

                  totalCompleted++
                }
              } catch (err) {
                console.error(`Adaptation error for question ${question.id}, support ${support.id}:`, err)
                await setAdaptationError(supabase, question.id, support.id, String(err))
                totalErrored++
              }
            })
          )
        } catch (err) {
          console.error(`Pipeline error for question ${question.id}:`, err)
          totalErrored++
        }
      })
    )

    // After all pipelines: set exam status to 'ready' (partial success allowed)
    await supabase
      .from('exams')
      .update({ status: 'ready', updated_at: new Date().toISOString() })
      .eq('id', examId)

    return jsonResponse({
      success: totalErrored === 0,
      adaptationsCompleted: totalCompleted,
      adaptationsErrored: totalErrored,
    })
  } catch (error) {
    console.error('analyze-and-adapt fatal error:', error)
    return jsonResponse({
      success: false,
      adaptationsCompleted: 0,
      adaptationsErrored: 0,
      error: String(error),
    }, 500)
  }
})

// --- Helper functions ---

async function analyzeQuestion(
  question: any,
  subjectName: string,
  gradeName: string
): Promise<{ skillCode: string; skillDescription: string; bloomLevel: string; bloomJustification: string }> {
  // TODO: Replace with actual LLM call for BNCC + Bloom analysis
  // Placeholder implementation
  return {
    skillCode: 'EF00XX00',
    skillDescription: `Habilidade identificada para questão de ${subjectName}`,
    bloomLevel: 'understand',
    bloomJustification: `Questão de ${gradeName} requer compreensão do conceito`,
  }
}

function buildPrompt(
  question: any,
  support: any,
  analysis: { skillCode: string; skillDescription: string },
  subjectName: string,
  gradeName: string
): string {
  const isMC = question.alternatives != null
  const lines = [
    `You are an educational content adaptation specialist.`,
    `Subject: ${subjectName}, Grade: ${gradeName}`,
    `BNCC Skill: ${analysis.skillCode} — ${analysis.skillDescription}`,
    `Support strategy: ${support.content}`,
    `Original question: ${question.question_text}`,
  ]

  if (question.correct_answer) {
    lines.push(`Correct answer: ${question.correct_answer}`)
  }

  if (isMC && question.alternatives) {
    const altList = Object.entries(question.alternatives)
      .map(([key, val]) => `${key}) ${val}`)
      .join('\n')
    lines.push(`Original alternatives:\n${altList}`)
    lines.push(
      `Respond with JSON: { "adaptedStatement": "...", "adaptedAlternatives": [{ "label": "A", "text": "..." }, ...] }`,
      `Return exactly ${Object.keys(question.alternatives).length} alternatives.`,
      `Use \\n for line breaks in JSON strings.`
    )
  } else {
    lines.push(`Respond with plain text only — the adapted question statement.`)
  }

  return lines.join('\n\n')
}

async function callLLM(prompt: string): Promise<string> {
  // TODO: Implement actual LLM call using ai_models.api_key
  // This placeholder returns a mock response
  console.log('LLM call placeholder — prompt length:', prompt.length)
  return JSON.stringify({
    adaptedStatement: 'Adapted question placeholder',
    adaptedAlternatives: [
      { label: 'A', text: 'Adapted option A' },
      { label: 'B', text: 'Adapted option B' },
      { label: 'C', text: 'Adapted option C' },
      { label: 'D', text: 'Adapted option D' },
    ],
  })
}

async function setAdaptationError(
  supabase: any,
  questionId: string,
  supportId: string,
  errorMessage: string
) {
  await supabase
    .from('adaptations')
    .update({
      status: 'error',
      error_message: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq('question_id', questionId)
    .eq('support_id', supportId)
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/analyze-and-adapt/index.ts
git commit -m "feat(edge): implement analyze-and-adapt Edge Function with pipeline-per-question model"
```

---

## Task 8: AdaptationProgress Component + A11y Tests

**Files:**
- Create: `components/adaptation-progress.tsx`
- Create: `components/adaptation-progress.test.tsx`
- Reference: spec Section 6 Layer 2 for test cases

- [ ] **Step 1: Write failing a11y tests**

Create `components/adaptation-progress.test.tsx`:

```typescript
/**
 * A11y and behavior tests for AdaptationProgress component
 * Spec: spec-process-adaptation.md Section 6, Layer 2
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { AdaptationProgress } from './adaptation-progress';

expect.extend(toHaveNoViolations);

describe('AdaptationProgress', () => {
  describe('pending state', () => {
    it('should show waiting message', () => {
      render(
        <AdaptationProgress
          status="processing"
          totalAdaptations={0}
          completedAdaptations={0}
          errorAdaptations={0}
        />
      );
      expect(screen.getByText(/aguardando/i)).toBeInTheDocument();
    });

    it('should have no WCAG violations', async () => {
      const { container } = render(
        <AdaptationProgress
          status="processing"
          totalAdaptations={0}
          completedAdaptations={0}
          errorAdaptations={0}
        />
      );
      const results = await axe(container, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] },
      });
      expect(results).toHaveNoViolations();
    });
  });

  describe('processing state', () => {
    it('should show progress indicator with count', () => {
      render(
        <AdaptationProgress
          status="processing"
          totalAdaptations={6}
          completedAdaptations={3}
          errorAdaptations={0}
        />
      );
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toBeInTheDocument();
      expect(progressbar).toHaveAttribute('aria-valuenow', '3');
      expect(progressbar).toHaveAttribute('aria-valuemax', '6');
    });

    it('should have no WCAG violations', async () => {
      const { container } = render(
        <AdaptationProgress
          status="processing"
          totalAdaptations={6}
          completedAdaptations={3}
          errorAdaptations={0}
        />
      );
      const results = await axe(container, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] },
      });
      expect(results).toHaveNoViolations();
    });
  });

  describe('completed state', () => {
    it('should show success message with CTA', () => {
      render(
        <AdaptationProgress
          status="ready"
          totalAdaptations={6}
          completedAdaptations={6}
          errorAdaptations={0}
          examId="550e8400-e29b-41d4-a716-446655440000"
        />
      );
      expect(screen.getByText(/concluíd/i)).toBeInTheDocument();
      expect(screen.getByRole('link')).toBeInTheDocument();
    });

    it('should have no WCAG violations', async () => {
      const { container } = render(
        <AdaptationProgress
          status="ready"
          totalAdaptations={6}
          completedAdaptations={6}
          errorAdaptations={0}
          examId="550e8400-e29b-41d4-a716-446655440000"
        />
      );
      const results = await axe(container, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] },
      });
      expect(results).toHaveNoViolations();
    });
  });

  describe('error state', () => {
    it('should show error summary with alert role', () => {
      render(
        <AdaptationProgress
          status="ready"
          totalAdaptations={6}
          completedAdaptations={4}
          errorAdaptations={2}
          examId="550e8400-e29b-41d4-a716-446655440000"
        />
      );
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/2/)).toBeInTheDocument();
    });

    it('should have no WCAG violations', async () => {
      const { container } = render(
        <AdaptationProgress
          status="ready"
          totalAdaptations={6}
          completedAdaptations={4}
          errorAdaptations={2}
          examId="550e8400-e29b-41d4-a716-446655440000"
        />
      );
      const results = await axe(container, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] },
      });
      expect(results).toHaveNoViolations();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- components/adaptation-progress.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `components/adaptation-progress.tsx`**

```typescript
'use client';

import { tv } from 'tailwind-variants';
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

interface AdaptationProgressProps {
  status: 'processing' | 'ready' | 'error';
  totalAdaptations: number;
  completedAdaptations: number;
  errorAdaptations: number;
  examId?: string;
}

const containerVariants = tv({
  base: 'rounded-lg border p-6',
  variants: {
    state: {
      pending: 'border-border bg-muted/30',
      processing: 'border-border bg-muted/30',
      completed: 'border-border bg-muted/30',
      error: 'border-destructive/50 bg-destructive/5',
    },
  },
});

export function AdaptationProgress({
  status,
  totalAdaptations,
  completedAdaptations,
  errorAdaptations,
  examId,
}: AdaptationProgressProps) {
  const isPending = status === 'processing' && totalAdaptations === 0;
  const isProcessing = status === 'processing' && totalAdaptations > 0;
  const isCompleted = status === 'ready' && errorAdaptations === 0;
  const hasErrors = status === 'ready' && errorAdaptations > 0;

  if (isPending) {
    return (
      <div className={containerVariants({ state: 'pending' })}>
        <div className="flex items-center gap-3">
          <Loader2
            className="h-5 w-5 animate-spin text-muted-foreground motion-reduce:animate-none"
            aria-hidden="true"
          />
          <p className="text-sm text-muted-foreground">
            Aguardando início do processamento...
          </p>
        </div>
      </div>
    );
  }

  if (isProcessing) {
    const percentage = totalAdaptations > 0
      ? Math.round((completedAdaptations / totalAdaptations) * 100)
      : 0;

    return (
      <div className={containerVariants({ state: 'processing' })}>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Loader2
              className="h-5 w-5 animate-spin text-foreground motion-reduce:animate-none"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-foreground">
              Processando adaptações... {completedAdaptations} de {totalAdaptations}
            </p>
          </div>
          <div
            role="progressbar"
            aria-valuenow={completedAdaptations}
            aria-valuemin={0}
            aria-valuemax={totalAdaptations}
            aria-label={`Progresso: ${completedAdaptations} de ${totalAdaptations} adaptações concluídas`}
            className="h-2 w-full overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-foreground transition-all duration-200"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className={containerVariants({ state: 'completed' })}>
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-foreground" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Adaptações concluídas com sucesso!
            </p>
            <p className="text-sm text-muted-foreground">
              {completedAdaptations} adaptação{completedAdaptations !== 1 ? 'ões' : 'ão'} gerada{completedAdaptations !== 1 ? 's' : ''}.
            </p>
          </div>
        </div>
        {examId && (
          <a
            href={`/exams/${examId}/result`}
            className="mt-4 inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors duration-200 hover:bg-foreground/90"
          >
            Ver resultados
          </a>
        )}
      </div>
    );
  }

  if (hasErrors) {
    return (
      <div className={containerVariants({ state: 'error' })}>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
            <p className="text-sm font-medium text-foreground">
              Processamento concluído com erros
            </p>
          </div>
          <div role="alert">
            <p className="text-sm text-muted-foreground">
              {completedAdaptations} de {totalAdaptations} adaptações concluídas.{' '}
              {errorAdaptations} adaptação{errorAdaptations !== 1 ? 'ões' : 'ão'} com erro.
            </p>
          </div>
          {examId && (
            <a
              href={`/exams/${examId}/result`}
              className="mt-2 inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors duration-200 hover:bg-foreground/90"
            >
              Ver resultados disponíveis
            </a>
          )}
        </div>
      </div>
    );
  }

  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- components/adaptation-progress.test.tsx
```

Expected: All tests PASS with zero WCAG violations.

- [ ] **Step 5: Run lint and typecheck**

```bash
npm run lint && npm run typecheck
```

Fix any issues before committing.

- [ ] **Step 6: Commit**

```bash
git add components/adaptation-progress.tsx components/adaptation-progress.test.tsx
git commit -m "feat(ui): add AdaptationProgress component with a11y tests"
```

---

## Task 9: Integration Verification

**Files:** None created — verification only.

- [ ] **Step 1: Run all tests**

```bash
npm run test
```

Expected: All existing + new tests pass.

- [ ] **Step 2: Run lint and typecheck**

```bash
npm run lint && npm run typecheck
```

Expected: Clean.

- [ ] **Step 3: Run build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 4: Verify migration files exist**

```bash
ls supabase/migrations/20260319000002* supabase/migrations/20260319000003* supabase/migrations/20260319000004*
```

Expected: 3 migration files.

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address lint/typecheck issues from adaptation implementation"
```

Only if Step 1–3 required fixes. Skip if everything passed clean.
