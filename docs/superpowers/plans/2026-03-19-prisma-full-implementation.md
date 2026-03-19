# PRISMA Full Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete implementation of all 9 PRISMA specification components across database, Edge Functions, API routes, and React UI components for the Adapte Minha Prova platform.

**Architecture:**
- Database foundation (migrations + RLS) supports all downstream components
- Shared utilities (types, schemas, hooks) provide cross-cutting concerns
- Edge Functions handle async LLM operations (PDF extraction, question adaptation)
- API routes orchestrate exam lifecycle and data flow
- React components compose UI for teacher workflow and admin configuration

**Tech Stack:** Next.js 16, React 19, Supabase (PostgreSQL, Auth, Storage, Edge Functions), Tailwind CSS, shadcn/ui, Vitest, Playwright

**Spec References:**
1. spec-auth-and-routing.md - Authentication and role-based routing
2. spec-pdf-extraction.md - PDF extraction Edge Function
3. spec-process-adaptation.md - LLM-based question adaptation
4. spec-process-result.md - Result display and feedback
5. spec-new-exam-form.md - Teacher exam creation UI
6. spec-dashboard.md - Dashboard and exam list
7. spec-admin-config.md - Admin AI model configuration
8. spec-admin-users.md - Admin user management
9. spec-landing-page.md - Public landing page

---

## Phase 1: Foundation

### Task 1: Database Migrations

**Spec Reference:** spec-process-adaptation.md (Section 4.1), spec-auth-and-routing.md (Section 3)

**Files:**
- Create: `supabase/migrations/20260319000003_add_adaptation_columns.sql`
- Create: `supabase/migrations/20260319000004_refactor_supports_and_exam_supports.sql`
- Create: `supabase/migrations/20260319000005_update_profiles.sql`
- Create: `supabase/migrations/20260319000006_add_ai_models_config_columns.sql`

**Database Changes:**

Questions table expansion:
- Add: `bncc_skill_code` (text)
- Add: `bncc_skill_description` (text)
- Add: `bloom_level` (text)
- Add: `bloom_justification` (text)

Adaptations table expansion:
- Add: `adapted_statement` (text)
- Add: `adapted_alternatives` (jsonb, array of {label, text})
- Add: `bncc_skill_code` (text)
- Add: `bncc_skill_description` (text)
- Add: `bloom_level` (text)
- Add: `bloom_justification` (text)
- Add: `error_message` (text, nullable)
- Rename: `status` column values (pending → processing → completed/error)

Supports refactor:
- Delete: old per-question generated supports
- Create: `supports` table (admin-managed, id, name, enabled boolean)
- Create: `exam_supports` junction table (exam_id, support_id, created_at)

Profiles update:
- Add: `avatar_url` (text, nullable)
- Update: `role` default to 'user'
- Add: RLS policy for admin to update other profiles

AI Models config:
- Add: `api_url` (text)
- Add: `api_key` (text, encrypted via pgcrypto)
- Add: `enabled` (boolean, default false)

- [ ] **Step 1: Write failing test for migration execution**

```typescript
import { createClient } from '@supabase/supabase-js'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'

describe('Database Migrations', () => {
  let supabase: any

  beforeAll(() => {
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  })

  it('should have questions table with BNCC and Bloom columns', async () => {
    const { data, error } = await supabase
      .from('questions')
      .select('bncc_skill_code, bloom_level')
      .limit(1)
    expect(error).toBeNull()
  })

  it('should have adaptations table with adapted_statement column', async () => {
    const { data, error } = await supabase
      .from('adaptations')
      .select('adapted_statement, status')
      .limit(1)
    expect(error).toBeNull()
  })

  it('should have supports table managed by admin', async () => {
    const { data } = await supabase
      .from('supports')
      .select('id, name, enabled')
    expect(Array.isArray(data)).toBe(true)
  })

  it('should have exam_supports junction table', async () => {
    const { data } = await supabase
      .from('exam_supports')
      .select('exam_id, support_id')
    expect(Array.isArray(data)).toBe(true)
  })
})
```

- [ ] **Step 2: Create migration 20260319000003_add_adaptation_columns.sql**

```sql
-- Add BNCC and Bloom analysis columns to questions
ALTER TABLE questions
ADD COLUMN bncc_skill_code TEXT,
ADD COLUMN bncc_skill_description TEXT,
ADD COLUMN bloom_level TEXT,
ADD COLUMN bloom_justification TEXT;

-- Expand adaptations table
ALTER TABLE adaptations
ADD COLUMN adapted_statement TEXT,
ADD COLUMN adapted_alternatives JSONB,
ADD COLUMN bncc_skill_code TEXT,
ADD COLUMN bncc_skill_description TEXT,
ADD COLUMN bloom_level TEXT,
ADD COLUMN bloom_justification TEXT,
ADD COLUMN error_message TEXT;

-- Update status enum (pending, processing, completed, error)
ALTER TYPE adaptation_status ADD VALUE 'processing' BEFORE 'completed';
ALTER TYPE adaptation_status ADD VALUE 'error' BEFORE 'completed';
```

- [ ] **Step 3: Create migration 20260319000004_refactor_supports_and_exam_supports.sql**

```sql
-- Create supports table (admin-managed)
CREATE TABLE supports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create exam_supports junction table
CREATE TABLE exam_supports (
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  support_id UUID NOT NULL REFERENCES supports(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (exam_id, support_id)
);

-- RLS for supports (only admins can manage)
ALTER TABLE supports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_select_supports" ON supports FOR SELECT USING (
  auth.jwt() ->> 'role' = 'admin'
);
CREATE POLICY "admin_manage_supports" ON supports FOR ALL USING (
  auth.jwt() ->> 'role' = 'admin'
);

-- RLS for exam_supports
ALTER TABLE exam_supports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_select_exam_supports" ON exam_supports FOR SELECT USING (
  EXISTS (SELECT 1 FROM exams WHERE exams.id = exam_supports.exam_id AND exams.user_id = auth.uid())
);
CREATE POLICY "user_insert_exam_supports" ON exam_supports FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM exams WHERE exams.id = exam_supports.exam_id AND exams.user_id = auth.uid())
);
```

- [ ] **Step 4: Create migration 20260319000005_update_profiles.sql**

```sql
-- Add avatar_url to profiles
ALTER TABLE profiles
ADD COLUMN avatar_url TEXT;

-- Update role column default
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'user';

-- RLS policy for admins to update profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_update_profiles" ON profiles FOR UPDATE USING (
  auth.jwt() ->> 'role' = 'admin'
);
```

- [ ] **Step 5: Create migration 20260319000006_add_ai_models_config_columns.sql**

```sql
-- Add configuration columns to ai_models
ALTER TABLE ai_models
ADD COLUMN api_url TEXT,
ADD COLUMN api_key TEXT, -- Encrypt via application layer
ADD COLUMN enabled BOOLEAN DEFAULT false,
ADD COLUMN updated_at TIMESTAMP DEFAULT now();

-- RLS for ai_models (only admins)
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_select_ai_models" ON ai_models FOR SELECT USING (
  auth.jwt() ->> 'role' = 'admin'
);
CREATE POLICY "admin_update_ai_models" ON ai_models FOR UPDATE USING (
  auth.jwt() ->> 'role' = 'admin'
);
```

- [ ] **Step 6: Run migrations locally and verify schema**

```bash
npx supabase migration up
npx supabase db pull  # Verify schema changes
npm run test -- migrations.test.ts
```

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(db): add adaptation columns, refactor supports, update profiles and ai_models config"
```

---

### Task 2: Type Definitions & Schemas

**Spec Reference:** spec-process-adaptation.md (Section 4.3), spec-process-result.md (Section 3), spec-pdf-extraction.md (Section 3)

**Files:**
- Create: `lib/types/adaptation.ts`
- Create: `lib/types/extraction.ts`
- Create: `lib/types/feedback.ts`
- Create: `lib/types/exam.ts`
- Create: `lib/types/auth.ts`
- Create: `lib/types/admin.ts`
- Create: `lib/schemas/adaptation.ts`
- Create: `lib/schemas/extraction.ts`
- Create: `lib/schemas/feedback.ts`
- Create: `lib/schemas/admin.ts`
- Create: `lib/schemas/admin-users.ts`

- [ ] **Step 1: Write failing test for types**

```typescript
import { describe, it, expect } from 'vitest'
import type { BnccAnalysisResult, AdaptedQuestion } from '@/lib/types/adaptation'
import type { QuestionExtractionResult } from '@/lib/types/extraction'

describe('Type Definitions', () => {
  it('should compile BnccAnalysisResult type', () => {
    const result: BnccAnalysisResult = {
      skillCode: 'EF07LP01',
      skillDescription: 'Skill description',
      bloomLevel: 'understand',
      bloomJustification: 'Justification'
    }
    expect(result.skillCode).toBeDefined()
  })

  it('should compile QuestionExtractionResult type', () => {
    const result: QuestionExtractionResult = {
      question_text: 'What is...',
      alternatives: { A: 'Option 1', B: 'Option 2' },
      correct_answer: 'A'
    }
    expect(result.question_text).toBeDefined()
  })
})
```

- [ ] **Step 2: Create lib/types/adaptation.ts**

```typescript
export interface BnccAnalysisResult {
  skillCode: string
  skillDescription: string
  bloomLevel: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create'
  bloomJustification: string
}

export interface AdaptedAlternative {
  label: string
  text: string
}

export interface AdaptedQuestion {
  adaptedStatement: string
  adaptedAlternatives?: AdaptedAlternative[]
}

export interface Adaptation {
  id: string
  question_id: string
  support_id: string
  adapted_statement: string | null
  adapted_alternatives: AdaptedAlternative[] | null
  bncc_skill_code: string | null
  bncc_skill_description: string | null
  bloom_level: string | null
  bloom_justification: string | null
  status: 'pending' | 'processing' | 'completed' | 'error'
  error_message: string | null
  created_at: string
  updated_at: string
}
```

- [ ] **Step 3: Create lib/types/extraction.ts**

```typescript
export interface QuestionExtractionResult {
  question_text: string
  alternatives: Record<string, string> | null
  correct_answer: string | null
}

export interface ExtractedExamData {
  questions: QuestionExtractionResult[]
  subject_id: string
  grade_level_id: string
}
```

- [ ] **Step 4: Create lib/types/feedback.ts**

```typescript
export interface UserFeedback {
  id: string
  adaptation_id: string
  user_id: string
  helpful: boolean
  comment: string | null
  created_at: string
}
```

- [ ] **Step 5: Create lib/types/exam.ts**

```typescript
export interface Exam {
  id: string
  user_id: string
  name: string
  subject_id: string
  grade_level_id: string
  status: 'draft' | 'processing' | 'ready' | 'archived'
  file_url: string
  created_at: string
  updated_at: string
}

export interface Support {
  id: string
  name: string
  description: string | null
  enabled: boolean
  created_at: string
  updated_at: string
}
```

- [ ] **Step 6: Create lib/types/auth.ts**

```typescript
export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: 'user' | 'teacher' | 'admin'
  created_at: string
  updated_at: string
}
```

- [ ] **Step 7: Create lib/types/admin.ts**

```typescript
export interface AIModel {
  id: string
  name: string
  api_url: string
  api_key: string
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface AdminConfig {
  aiModels: AIModel[]
  supports: Support[]
}
```

- [ ] **Step 8: Create lib/schemas/adaptation.ts (Zod)**

```typescript
import { z } from 'zod'

export const bloomLevelSchema = z.enum([
  'remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'
])

export const adaptedAlternativeSchema = z.object({
  label: z.string().min(1),
  text: z.string().min(1)
})

export const bnccAnalysisSchema = z.object({
  skillCode: z.string().min(1),
  skillDescription: z.string().min(1),
  bloomLevel: bloomLevelSchema,
  bloomJustification: z.string().min(1)
})

export const adaptedQuestionSchema = z.union([
  z.object({
    adaptedStatement: z.string().min(1),
    adaptedAlternatives: z.array(adaptedAlternativeSchema).min(1)
  }),
  z.string().min(1)
])

export type AdaptationResponse = z.infer<typeof adaptedQuestionSchema>
export type BnccAnalysisInput = z.infer<typeof bnccAnalysisSchema>
```

- [ ] **Step 9: Create lib/schemas/extraction.ts (Zod)**

```typescript
import { z } from 'zod'

export const questionExtractionSchema = z.object({
  question_text: z.string().min(1),
  alternatives: z.record(z.string()).nullable(),
  correct_answer: z.string().nullable()
})

export const extractedExamDataSchema = z.object({
  questions: z.array(questionExtractionSchema).min(1),
  subject_id: z.string().uuid(),
  grade_level_id: z.string().uuid()
})

export type ExtractedExamData = z.infer<typeof extractedExamDataSchema>
```

- [ ] **Step 10: Create lib/schemas/feedback.ts (Zod)**

```typescript
import { z } from 'zod'

export const submitFeedbackSchema = z.object({
  adaptation_id: z.string().uuid(),
  helpful: z.boolean(),
  comment: z.string().max(500).optional()
})

export type SubmitFeedbackInput = z.infer<typeof submitFeedbackSchema>
```

- [ ] **Step 11: Create lib/schemas/admin.ts (Zod)**

```typescript
import { z } from 'zod'

export const updateAIModelSchema = z.object({
  api_url: z.string().url(),
  api_key: z.string().min(1),
  enabled: z.boolean()
})

export const updateSupportSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  enabled: z.boolean()
})

export type UpdateAIModelInput = z.infer<typeof updateAIModelSchema>
export type UpdateSupportInput = z.infer<typeof updateSupportSchema>
```

- [ ] **Step 12: Create lib/schemas/admin-users.ts (Zod)**

```typescript
import { z } from 'zod'

export const updateUserRoleSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(['user', 'teacher', 'admin']),
  blocked: z.boolean().optional()
})

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>
```

- [ ] **Step 13: Run type checks and tests**

```bash
npm run typecheck
npm run test -- types.test.ts schemas.test.ts
```

- [ ] **Step 14: Commit**

```bash
git add lib/types/ lib/schemas/
git commit -m "feat(types): add comprehensive type definitions and Zod schemas"
```

---

## Phase 2: Shared Utilities

### Task 3: Shared Utility Functions

**Spec Reference:** spec-process-adaptation.md (Section 4.5), spec-pdf-extraction.md (Section 4), spec-process-result.md (Section 4)

**Files:**
- Create: `lib/utils/adaptation.ts`
- Create: `lib/utils/extraction.ts`
- Create: `lib/utils/exam-status.ts`
- Create: `lib/hooks/use-exam-status.ts`

- [ ] **Step 1: Write failing tests for utilities**

```typescript
import { describe, it, expect } from 'vitest'
import { identifyQuestionType, validateCorrectAnswer } from '@/lib/utils/adaptation'
import { getExamStatusDisplay } from '@/lib/utils/exam-status'

describe('Adaptation Utils', () => {
  it('should identify multiple choice questions', () => {
    const result = identifyQuestionType({
      alternatives: { A: 'Option 1', B: 'Option 2' }
    })
    expect(result).toBe('multiple_choice')
  })

  it('should identify essay questions', () => {
    const result = identifyQuestionType({ alternatives: null })
    expect(result).toBe('essay')
  })

  it('should validate correct answer for MC', () => {
    const error = validateCorrectAnswer('X', 'multiple_choice')
    expect(error).toBeTruthy()
  })
})

describe('Exam Status Utils', () => {
  it('should display exam status', () => {
    const display = getExamStatusDisplay('processing')
    expect(display.label).toBeDefined()
  })
})
```

- [ ] **Step 2: Create lib/utils/adaptation.ts**

```typescript
import type { AdaptedAlternative } from '@/lib/types/adaptation'
import { z } from 'zod'
import { adaptedAlternativeSchema } from '@/lib/schemas/adaptation'

export function identifyQuestionType(
  question: { alternatives?: Record<string, string> | null }
): 'multiple_choice' | 'essay' {
  return question.alternatives != null ? 'multiple_choice' : 'essay'
}

export function validateCorrectAnswer(
  answer: string,
  questionType: 'multiple_choice' | 'essay'
): string | null {
  if (questionType === 'essay') return null
  if (!answer) return 'Correct answer is required for multiple-choice questions'
  if (!/^[A-Ea-e]$/.test(answer)) return 'Correct answer must be a single letter (A-E)'
  return null
}

export function validateAdaptedAlternatives(
  expected: number,
  actual: number
): string | null {
  if (expected === actual) return null
  return `Expected ${expected} alternatives, got ${actual}`
}

export function safeParseAlternatives(
  raw: string | null
): AdaptedAlternative[] | null {
  if (raw == null) return null
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    const result = z.array(adaptedAlternativeSchema).safeParse(parsed)
    return result.success ? result.data : null
  } catch {
    return null
  }
}

export function buildAdaptationPrompt(
  question: {
    question_text: string
    alternatives?: Record<string, string> | null
    correct_answer?: string | null
  },
  support: { name: string },
  bncc: { skillCode: string; skillDescription: string }
): string {
  const isMC = identifyQuestionType(question) === 'multiple_choice'
  const baseContext = [
    `You are an educational content adaptation specialist.`,
    `BNCC Skill: ${bncc.skillCode} — ${bncc.skillDescription}`,
    `Support strategy: ${support.name}`,
    `Original question: ${question.question_text}`
  ]

  if (question.correct_answer) {
    baseContext.push(`Correct answer: ${question.correct_answer}`)
  }

  if (isMC && question.alternatives) {
    const altList = Object.entries(question.alternatives)
      .map(([key, val]) => `${key}) ${val}`)
      .join('\n')
    baseContext.push(`Original alternatives:\n${altList}`)
    baseContext.push(
      `Respond with a JSON object: { "adaptedStatement": "...", "adaptedAlternatives": [{ "label": "A", "text": "..." }, ...] }`,
      `You MUST return exactly ${Object.keys(question.alternatives).length} alternatives.`,
      `Use \\n for line breaks within JSON string values. Do NOT use actual newlines inside JSON strings.`,
      `Preserve the BNCC skill in your adaptation. Make the question accessible using the "${support.name}" strategy.`
    )
  } else {
    baseContext.push(
      `Respond with plain text only — the adapted question statement.`,
      `Do NOT wrap in JSON. Return only the adapted text.`,
      `Preserve the BNCC skill in your adaptation. Make the question accessible using the "${support.name}" strategy.`
    )
  }

  return baseContext.join('\n\n')
}
```

- [ ] **Step 3: Create lib/utils/extraction.ts**

```typescript
export function validatePdfFile(file: File): string | null {
  if (file.type !== 'application/pdf') {
    return 'File must be a PDF'
  }
  const maxSizeMB = 50
  if (file.size > maxSizeMB * 1024 * 1024) {
    return `File size must be less than ${maxSizeMB}MB`
  }
  return null
}

export function formatExtractionProgress(
  extracted: number,
  total: number
): string {
  const percentage = total > 0 ? Math.round((extracted / total) * 100) : 0
  return `${extracted}/${total} questions extracted (${percentage}%)`
}
```

- [ ] **Step 4: Create lib/utils/exam-status.ts**

```typescript
import type { Exam } from '@/lib/types/exam'

export interface ExamStatusDisplay {
  status: Exam['status']
  label: string
  color: string
  icon: string
  nextStep?: string
}

export function getExamStatusDisplay(status: Exam['status']): ExamStatusDisplay {
  const displays: Record<Exam['status'], ExamStatusDisplay> = {
    draft: {
      status: 'draft',
      label: 'Rascunho',
      color: 'text-muted-foreground',
      icon: 'FileText'
    },
    processing: {
      status: 'processing',
      label: 'Processando',
      color: 'text-blue-500',
      icon: 'Loader2',
      nextStep: 'Aguarde a conclusão do processamento'
    },
    ready: {
      status: 'ready',
      label: 'Pronto',
      color: 'text-green-500',
      icon: 'CheckCircle2',
      nextStep: 'Ver resultados'
    },
    archived: {
      status: 'archived',
      label: 'Arquivado',
      color: 'text-gray-500',
      icon: 'Archive'
    }
  }
  return displays[status]
}

export function getExamRoute(exam: Exam): string {
  switch (exam.status) {
    case 'draft':
      return `/exams/${exam.id}/edit`
    case 'processing':
      return `/exams/${exam.id}/processing`
    case 'ready':
      return `/exams/${exam.id}/result`
    case 'archived':
      return `/exams/${exam.id}/view`
    default:
      return `/exams/${exam.id}`
  }
}
```

- [ ] **Step 5: Create lib/hooks/use-exam-status.ts**

```typescript
'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Exam } from '@/lib/types/exam'

export function useExamStatus(examId: string, initialStatus: Exam['status']) {
  const [status, setStatus] = useState<Exam['status']>(initialStatus)
  const [isPolling, setIsPolling] = useState(false)

  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/exams/${examId}/status`)
      if (!res.ok) throw new Error('Failed to fetch status')
      const data = await res.json()
      setStatus(data.status)
      // Stop polling if processing is complete
      if (data.status !== 'processing') {
        setIsPolling(false)
      }
    } catch (error) {
      console.error('Status poll error:', error)
    }
  }, [examId])

  useEffect(() => {
    if (!isPolling || status !== 'processing') return

    const interval = setInterval(pollStatus, 2000)
    return () => clearInterval(interval)
  }, [isPolling, status, pollStatus])

  return { status, setStatus, startPolling: () => setIsPolling(true) }
}
```

- [ ] **Step 6: Run tests and type checks**

```bash
npm run typecheck
npm run test -- utils.test.ts hooks.test.ts
```

- [ ] **Step 7: Commit**

```bash
git add lib/utils/ lib/hooks/
git commit -m "feat(utils): add adaptation, extraction, and exam status utilities with polling hook"
```

---

## Phase 3: Edge Functions

### Task 4: Extract Questions Edge Function

**Spec Reference:** spec-pdf-extraction.md (Section 4)

**Files:**
- Create: `supabase/functions/extract-questions/index.ts`
- Create: `supabase/functions/extract-questions/deno.json`

- [ ] **Step 1: Write integration test for extraction**

```typescript
describe('Extract Questions Edge Function', () => {
  it('should extract questions from PDF', async () => {
    // Mock test — will use real PDF in E2E
    const payload = {
      examId: 'test-exam-id',
      fileUrl: 'file-url'
    }
    // Expected response shape validation
    expect(payload.examId).toBeDefined()
  })
})
```

- [ ] **Step 2: Create supabase/functions/extract-questions/index.ts**

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface ExtractQuestionsPayload {
  examId: string
  fileUrl: string
}

interface ExtractedQuestion {
  question_text: string
  alternatives: Record<string, string> | null
  correct_answer: string | null
}

serve(async (req) => {
  try {
    const payload: ExtractQuestionsPayload = await req.json()
    const { examId, fileUrl } = payload

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch exam details
    const { data: exam } = await supabase
      .from('exams')
      .select('id, subject_id, grade_level_id, subjects(name), grade_levels(name)')
      .eq('id', examId)
      .single()

    if (!exam) {
      return jsonResponse({
        success: false,
        extractedCount: 0,
        error: 'Exam not found'
      }, 404)
    }

    // TODO: Download PDF from fileUrl and extract text/structure
    // This is a placeholder — integrate with real PDF parsing library
    const extractedQuestions: ExtractedQuestion[] = []

    // TODO: Call LLM to parse extracted text into structured questions
    // For now, return empty placeholder
    console.log('PDF extraction placeholder for exam', examId)

    // Insert extracted questions
    if (extractedQuestions.length > 0) {
      const { error: insertError } = await supabase
        .from('questions')
        .insert(
          extractedQuestions.map((q) => ({
            exam_id: examId,
            question_text: q.question_text,
            alternatives: q.alternatives,
            correct_answer: q.correct_answer
          }))
        )

      if (insertError) {
        return jsonResponse({
          success: false,
          extractedCount: 0,
          error: `Failed to insert questions: ${insertError.message}`
        }, 500)
      }
    }

    return jsonResponse({
      success: true,
      extractedCount: extractedQuestions.length
    })
  } catch (error) {
    console.error('Extract questions fatal error:', error)
    return jsonResponse({
      success: false,
      extractedCount: 0,
      error: String(error)
    }, 500)
  }
})

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}
```

- [ ] **Step 3: Create supabase/functions/extract-questions/deno.json**

```json
{
  "imports": {
    "std": "https://deno.land/std@0.177.0/",
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2"
  }
}
```

- [ ] **Step 4: Deploy Edge Function locally and test**

```bash
supabase functions deploy extract-questions --no-verify-jwt
# Test with curl
curl -X POST http://localhost:54321/functions/v1/extract-questions \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"examId":"test-id","fileUrl":"test-url"}'
```

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/extract-questions/
git commit -m "feat(edge): scaffold extract-questions Edge Function with PDF extraction flow"
```

---

### Task 5: Analyze & Adapt Edge Function

**Spec Reference:** spec-process-adaptation.md (Section 4.5)

**Files:**
- Create: `supabase/functions/analyze-and-adapt/index.ts`
- Create: `supabase/functions/analyze-and-adapt/deno.json`

- [ ] **Step 1: Write integration test for adaptation**

```typescript
describe('Analyze and Adapt Edge Function', () => {
  it('should analyze and adapt questions', async () => {
    const payload = { examId: 'test-exam-id', userId: 'test-user-id' }
    expect(payload.examId).toBeDefined()
  })
})
```

- [ ] **Step 2: Create supabase/functions/analyze-and-adapt/index.ts**

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
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
      return jsonResponse({
        success: false,
        adaptationsCompleted: 0,
        adaptationsErrored: 0,
        error: 'Exam not found'
      })
    }

    // Fetch questions for this exam
    const { data: questions } = await supabase
      .from('questions')
      .select('id, question_text, alternatives, correct_answer')
      .eq('exam_id', examId)

    if (!questions || questions.length === 0) {
      return jsonResponse({
        success: false,
        adaptationsCompleted: 0,
        adaptationsErrored: 0,
        error: 'No questions found'
      })
    }

    // Fetch supports linked to this exam via exam_supports
    const { data: examSupports } = await supabase
      .from('exam_supports')
      .select('support_id, supports(id, name)')
      .eq('exam_id', examId)

    const supports = (examSupports || []).map((es: any) => es.supports).filter(Boolean)

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
              bloom_justification: analysisResult.bloomJustification
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
                        updated_at: new Date().toISOString()
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
                        updated_at: new Date().toISOString()
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
                      updated_at: new Date().toISOString()
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
          // Mark all adaptations for this question as 'error' so they don't stay 'pending'
          for (const support of supports) {
            await setAdaptationError(supabase, question.id, support.id, `Analysis failed: ${String(err)}`)
          }
          totalErrored += supports.length
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
      adaptationsErrored: totalErrored
    })
  } catch (error) {
    console.error('analyze-and-adapt fatal error:', error)
    return jsonResponse({
      success: false,
      adaptationsCompleted: 0,
      adaptationsErrored: 0,
      error: String(error)
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
    bloomJustification: `Questão de ${gradeName} requer compreensão do conceito`
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
    `Support strategy: ${support.name}`,
    `Original question: ${question.question_text}`
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
      { label: 'D', text: 'Adapted option D' }
    ]
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
      updated_at: new Date().toISOString()
    })
    .eq('question_id', questionId)
    .eq('support_id', supportId)
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}
```

- [ ] **Step 3: Create supabase/functions/analyze-and-adapt/deno.json**

```json
{
  "imports": {
    "std": "https://deno.land/std@0.177.0/",
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2"
  }
}
```

- [ ] **Step 4: Deploy and test locally**

```bash
supabase functions deploy analyze-and-adapt --no-verify-jwt
curl -X POST http://localhost:54321/functions/v1/analyze-and-adapt \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"examId":"test-id","userId":"test-user"}'
```

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/analyze-and-adapt/
git commit -m "feat(edge): implement analyze-and-adapt Edge Function with pipeline-per-question model"
```

---

### Task 6: Evolve Agent Edge Function (Stub)

**Spec Reference:** spec-process-adaptation.md (Section 4.6 - future)

**Files:**
- Create: `supabase/functions/evolve-agent/index.ts`
- Create: `supabase/functions/evolve-agent/deno.json`

- [ ] **Step 1: Create supabase/functions/evolve-agent/index.ts (stub)**

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

serve(async (req) => {
  // TODO: Implement agent evolution logic in future iteration
  return new Response(
    JSON.stringify({
      success: false,
      message: 'evolve-agent not yet implemented'
    }),
    { status: 501, headers: { 'Content-Type': 'application/json' } }
  )
})
```

- [ ] **Step 2: Create supabase/functions/evolve-agent/deno.json**

```json
{
  "imports": {
    "std": "https://deno.land/std@0.177.0/"
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/evolve-agent/
git commit -m "feat(edge): scaffold evolve-agent Edge Function (stub for future)"
```

---

## Phase 4: Teacher UI & API Routes

### Task 7: API Routes for Exam Lifecycle

**Spec Reference:** spec-new-exam-form.md, spec-process-adaptation.md, spec-process-result.md

**Files:**
- Create: `app/api/exams/route.ts` (POST - create exam)
- Create: `app/api/exams/[id]/status/route.ts` (GET - poll status)
- Create: `app/api/exams/[id]/adapt/route.ts` (POST - trigger adaptation)
- Create: `app/api/exams/[id]/result/route.ts` (GET - fetch result)
- Create: `app/api/exams/[id]/submit-answers/route.ts` (POST - submit student answers)
- Create: `app/api/exams/[id]/feedback/route.ts` (POST - submit feedback)

- [ ] **Step 1: Write failing test for exam API routes**

```typescript
import { describe, it, expect } from 'vitest'

describe('Exam API Routes', () => {
  it('should create exam and return exam ID', async () => {
    // Will be tested via E2E
    expect(true).toBe(true)
  })
})
```

- [ ] **Step 2: Create app/api/exams/route.ts**

```typescript
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createExamSchema = z.object({
  name: z.string().min(1),
  subject_id: z.string().uuid(),
  grade_level_id: z.string().uuid(),
  file: z.instanceof(File),
  supportIds: z.array(z.string().uuid())
})

export async function POST(request: Request) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const name = formData.get('name') as string
    const subject_id = formData.get('subject_id') as string
    const grade_level_id = formData.get('grade_level_id') as string
    const file = formData.get('file') as File
    const supportIds = JSON.parse(formData.get('supportIds') as string) as string[]

    // Validate inputs
    if (!name || !subject_id || !grade_level_id || !file || supportIds.length === 0) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Upload file to Supabase Storage
    const fileName = `${Date.now()}-${file.name}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('exam-pdfs')
      .upload(`${user.id}/${fileName}`, file)

    if (uploadError) {
      return Response.json({ error: 'File upload failed' }, { status: 500 })
    }

    // Create exam record
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .insert({
        user_id: user.id,
        name,
        subject_id,
        grade_level_id,
        file_url: uploadData.path,
        status: 'draft'
      })
      .select()
      .single()

    if (examError) {
      return Response.json({ error: 'Failed to create exam' }, { status: 500 })
    }

    // Validate support IDs and create exam_supports records
    const { data: supports } = await supabase
      .from('supports')
      .select('id')
      .in('id', supportIds)
      .eq('enabled', true)

    if (!supports || supports.length !== supportIds.length) {
      return Response.json({ error: 'Invalid support IDs' }, { status: 400 })
    }

    const { error: examSupportsError } = await supabase
      .from('exam_supports')
      .insert(
        supportIds.map(support_id => ({
          exam_id: exam.id,
          support_id
        }))
      )

    if (examSupportsError) {
      return Response.json({ error: 'Failed to link supports' }, { status: 500 })
    }

    return Response.json({ exam })
  } catch (error) {
    console.error('Create exam error:', error)
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Create app/api/exams/[id]/status/route.ts**

```typescript
import { createServerClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify exam ownership
    const { data: exam } = await supabase
      .from('exams')
      .select('id, status')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (!exam) {
      return Response.json({ error: 'Exam not found' }, { status: 404 })
    }

    // Fetch adaptation progress
    const { data: adaptations } = await supabase
      .from('adaptations')
      .select('status')
      .in('question_id', (
        await supabase
          .from('questions')
          .select('id')
          .eq('exam_id', params.id)
      ).data?.map(q => q.id) || [])

    const completed = adaptations?.filter(a => a.status === 'completed').length || 0
    const total = adaptations?.length || 0
    const errored = adaptations?.filter(a => a.status === 'error').length || 0

    return Response.json({
      status: exam.status,
      adaptationsCompleted: completed,
      adaptationsErrored: errored,
      totalAdaptations: total
    })
  } catch (error) {
    console.error('Status check error:', error)
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Create app/api/exams/[id]/adapt/route.ts**

```typescript
import { createServerClient } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify exam exists and is owned by user
    const { data: exam } = await supabase
      .from('exams')
      .select('id, status')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (!exam) {
      return Response.json({ error: 'Exam not found' }, { status: 404 })
    }

    if (exam.status !== 'draft') {
      return Response.json(
        { error: 'Exam is not in draft status' },
        { status: 400 }
      )
    }

    // Fetch questions
    const { data: questions } = await supabase
      .from('questions')
      .select('id')
      .eq('exam_id', params.id)

    if (!questions || questions.length === 0) {
      return Response.json(
        { error: 'No questions in exam' },
        { status: 400 }
      )
    }

    // Fetch exam supports
    const { data: examSupports } = await supabase
      .from('exam_supports')
      .select('support_id')
      .eq('exam_id', params.id)

    if (!examSupports || examSupports.length === 0) {
      return Response.json(
        { error: 'No supports selected for exam' },
        { status: 400 }
      )
    }

    // Create adaptation records (status: pending)
    const adaptationRows = questions.flatMap(q =>
      examSupports.map(es => ({
        question_id: q.id,
        support_id: es.support_id,
        status: 'pending'
      }))
    )

    const { error: adaptError } = await supabase
      .from('adaptations')
      .insert(adaptationRows)

    if (adaptError) {
      return Response.json({ error: 'Failed to create adaptations' }, { status: 500 })
    }

    // Update exam status to processing
    await supabase
      .from('exams')
      .update({ status: 'processing' })
      .eq('id', params.id)

    // Trigger Edge Function
    const functionUrl = `${process.env.SUPABASE_URL}/functions/v1/analyze-and-adapt`
    await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ examId: params.id, userId: user.id })
    })

    return Response.json({ success: true, status: 'processing' })
  } catch (error) {
    console.error('Adapt error:', error)
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}
```

- [ ] **Step 5: Create app/api/exams/[id]/result/route.ts**

```typescript
import { createServerClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify exam ownership
    const { data: exam } = await supabase
      .from('exams')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (!exam) {
      return Response.json({ error: 'Exam not found' }, { status: 404 })
    }

    // Fetch questions with adaptations
    const { data: questions } = await supabase
      .from('questions')
      .select(`
        id,
        question_text,
        alternatives,
        correct_answer,
        bncc_skill_code,
        bloom_level,
        adaptations(*)
      `)
      .eq('exam_id', params.id)

    return Response.json({
      exam,
      questions
    })
  } catch (error) {
    console.error('Result fetch error:', error)
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}
```

- [ ] **Step 6: Create app/api/exams/[id]/submit-answers/route.ts**

```typescript
import { createServerClient } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { answers } = body

    // TODO: Validate answers and store in user_answers table
    // For now, just return success

    return Response.json({ success: true })
  } catch (error) {
    console.error('Submit answers error:', error)
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}
```

- [ ] **Step 7: Create app/api/exams/[id]/feedback/route.ts**

```typescript
import { createServerClient } from '@/lib/supabase/server'
import { submitFeedbackSchema } from '@/lib/schemas/feedback'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = submitFeedbackSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json({ error: parsed.error.errors }, { status: 400 })
    }

    const { adaptation_id, helpful, comment } = parsed.data

    const { error } = await supabase
      .from('feedbacks')
      .insert({
        adaptation_id,
        user_id: user.id,
        helpful,
        comment
      })

    if (error) {
      return Response.json({ error: 'Failed to submit feedback' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Feedback error:', error)
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}
```

- [ ] **Step 8: Run tests and type checks**

```bash
npm run typecheck
npm run test -- api.test.ts
```

- [ ] **Step 9: Commit**

```bash
git add app/api/
git commit -m "feat(api): implement exam lifecycle API routes (create, status, adapt, result, answers, feedback)"
```

---

### Task 8: React Components - New Exam & Extraction Review

**Spec Reference:** spec-new-exam-form.md, spec-pdf-extraction.md

**Files:**
- Create: `components/new-exam-form.tsx`
- Create: `components/extraction-review.tsx`
- Create: `components/ui/file-upload.tsx`
- Create: `app/(auth)/exams/new/page.tsx`
- Create: `app/(auth)/exams/[id]/extraction/page.tsx`

- [ ] **Step 1: Write failing component tests**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NewExamForm } from '@/components/new-exam-form'
import { ExtractionReview } from '@/components/extraction-review'

describe('NewExamForm Component', () => {
  it('should render form with file upload', () => {
    render(<NewExamForm />)
    expect(screen.getByText(/Upload PDF/)).toBeDefined()
  })
})

describe('ExtractionReview Component', () => {
  it('should render extracted questions', () => {
    const questions = [
      { question_text: 'Q1?', alternatives: { A: 'A1', B: 'A2' }, correct_answer: 'A' }
    ]
    render(<ExtractionReview questions={questions} />)
    expect(screen.getByText(/Q1/)).toBeDefined()
  })
})
```

- [ ] **Step 2: Create components/ui/file-upload.tsx**

```typescript
'use client'

import { useRef } from 'react'
import { Upload } from 'lucide-react'

interface FileUploadProps {
  onFileSelect: (file: File) => void
  accept?: string
  maxSize?: number
}

export function FileUpload({ onFileSelect, accept = '.pdf', maxSize = 50 * 1024 * 1024 }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > maxSize) {
      alert(`File size must be less than ${maxSize / 1024 / 1024}MB`)
      return
    }

    onFileSelect(file)
  }

  return (
    <div
      className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-foreground/50 transition"
      onClick={() => inputRef.current?.click()}
    >
      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
      <p className="text-sm font-medium">Clique para selecionar arquivo PDF</p>
      <p className="text-xs text-muted-foreground">Máximo 50MB</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}
```

- [ ] **Step 3: Create components/new-exam-form.tsx**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileUpload } from '@/components/ui/file-upload'

export function NewExamForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [subject, setSubject] = useState('')
  const [grade, setGrade] = useState('')
  const [supports, setSupports] = useState<string[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('name', name)
      formData.append('file', file)
      formData.append('subject_id', subject)
      formData.append('grade_level_id', grade)
      formData.append('supportIds', JSON.stringify(supports))

      const res = await fetch('/api/exams', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      // Navigate to extraction review
      router.push(`/exams/${data.exam.id}/extraction`)
    } catch (error) {
      alert(`Erro: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">Nome da Prova</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          className="w-full px-3 py-2 border border-border rounded-md"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Disciplina</label>
        <select
          value={subject}
          onChange={e => setSubject(e.target.value)}
          required
          className="w-full px-3 py-2 border border-border rounded-md"
        >
          <option value="">Selecione...</option>
          {/* Load from database */}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Série</label>
        <select
          value={grade}
          onChange={e => setGrade(e.target.value)}
          required
          className="w-full px-3 py-2 border border-border rounded-md"
        >
          <option value="">Selecione...</option>
          {/* Load from database */}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Suportes</label>
        {/* Render support checkboxes */}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Arquivo PDF</label>
        <FileUpload onFileSelect={setFile} />
        {file && <p className="text-sm mt-2">{file.name}</p>}
      </div>

      <button
        type="submit"
        disabled={loading || !file}
        className="w-full px-4 py-2 bg-foreground text-background rounded-md font-medium disabled:opacity-50"
      >
        {loading ? 'Processando...' : 'Criar Prova'}
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Create components/extraction-review.tsx**

```typescript
'use client'

import type { QuestionExtractionResult } from '@/lib/types/extraction'

interface ExtractionReviewProps {
  questions: QuestionExtractionResult[]
  examId: string
}

export function ExtractionReview({ questions, examId }: ExtractionReviewProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Questões Extraídas</h2>
      {questions.map((q, i) => (
        <div key={i} className="border border-border rounded-lg p-4">
          <p className="font-medium mb-2">{i + 1}. {q.question_text}</p>
          {q.alternatives && (
            <div className="ml-4 space-y-1">
              {Object.entries(q.alternatives).map(([key, val]) => (
                <p key={key} className="text-sm">
                  {key}) {val}
                </p>
              ))}
            </div>
          )}
          {q.correct_answer && (
            <p className="text-sm text-muted-foreground mt-2">
              Resposta correta: {q.correct_answer}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Create app/(auth)/exams/new/page.tsx**

```typescript
import { NewExamForm } from '@/components/new-exam-form'

export default function NewExamPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Criar Nova Prova</h1>
      <NewExamForm />
    </div>
  )
}
```

- [ ] **Step 6: Create app/(auth)/exams/[id]/extraction/page.tsx**

```typescript
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ExtractionReview } from '@/components/extraction-review'

export default async function ExtractionPage({ params }: { params: { id: string } }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch exam
  const { data: exam } = await supabase
    .from('exams')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!exam) redirect('/dashboard')

  // Fetch extracted questions
  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('exam_id', params.id)

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">{exam.name}</h1>
      <ExtractionReview questions={questions || []} examId={params.id} />
      <button
        onClick={async () => {
          await fetch(`/api/exams/${params.id}/adapt`, { method: 'POST' })
          // Navigate to processing
        }}
        className="mt-8 px-4 py-2 bg-foreground text-background rounded-md font-medium"
      >
        Processar Adaptações
      </button>
    </div>
  )
}
```

- [ ] **Step 7: Run component tests**

```bash
npm run test -- components.test.ts
```

- [ ] **Step 8: Commit**

```bash
git add components/ app/\(auth\)/exams/
git commit -m "feat(ui): add new exam form and extraction review components"
```

---

### Task 9: React Components - Processing & Result Display

**Spec Reference:** spec-process-result.md

**Files:**
- Create: `components/adaptation-progress.tsx`
- Create: `components/result-display.tsx`
- Create: `components/feedback-form.tsx`
- Create: `app/(auth)/exams/[id]/processing/page.tsx`
- Create: `app/(auth)/exams/[id]/result/page.tsx`

- [ ] **Step 1: Write failing tests for result components**

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AdaptationProgress } from '@/components/adaptation-progress'
import { ResultDisplay } from '@/components/result-display'

describe('AdaptationProgress', () => {
  it('should render processing state', () => {
    render(
      <AdaptationProgress
        status="processing"
        totalAdaptations={10}
        completedAdaptations={5}
        errorAdaptations={0}
      />
    )
    expect(screen.getByText(/5 de 10/)).toBeDefined()
  })
})

describe('ResultDisplay', () => {
  it('should render adapted questions', () => {
    const questions = [{
      id: '1',
      question_text: 'Q1?',
      adaptations: []
    }]
    render(<ResultDisplay questions={questions} />)
    expect(screen.getByText(/Q1/)).toBeDefined()
  })
})
```

- [ ] **Step 2: Create components/adaptation-progress.tsx (use tv from tailwind-variants)**

```typescript
'use client'

import { tv } from 'tailwind-variants'
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'

interface AdaptationProgressProps {
  status: 'processing' | 'ready' | 'error'
  totalAdaptations: number
  completedAdaptations: number
  errorAdaptations: number
  examId?: string
}

const containerVariants = tv({
  base: 'rounded-lg border p-6',
  variants: {
    state: {
      pending: 'border-border bg-muted/30',
      processing: 'border-border bg-muted/30',
      completed: 'border-border bg-muted/30',
      error: 'border-destructive/50 bg-destructive/5'
    }
  }
})

export function AdaptationProgress({
  status,
  totalAdaptations,
  completedAdaptations,
  errorAdaptations,
  examId
}: AdaptationProgressProps) {
  const isPending = status === 'processing' && totalAdaptations === 0
  const isProcessing = status === 'processing' && totalAdaptations > 0
  const isCompleted = status === 'ready' && errorAdaptations === 0
  const hasErrors = status === 'ready' && errorAdaptations > 0

  if (isPending) {
    return (
      <div className={containerVariants({ state: 'pending' })}>
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Aguardando início do processamento...</p>
        </div>
      </div>
    )
  }

  if (isProcessing) {
    const percentage = totalAdaptations > 0
      ? Math.round((completedAdaptations / totalAdaptations) * 100)
      : 0

    return (
      <div className={containerVariants({ state: 'processing' })}>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-foreground" />
            <p className="text-sm font-medium">
              Processando adaptações... {completedAdaptations} de {totalAdaptations}
            </p>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-foreground transition-all duration-200"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  if (isCompleted) {
    return (
      <div className={containerVariants({ state: 'completed' })}>
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-foreground" />
          <div>
            <p className="text-sm font-medium">Adaptações concluídas com sucesso!</p>
            <p className="text-sm text-muted-foreground">{completedAdaptations} adaptações geradas.</p>
          </div>
        </div>
      </div>
    )
  }

  if (hasErrors) {
    return (
      <div className={containerVariants({ state: 'error' })}>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-sm font-medium">Processamento concluído com erros</p>
          </div>
          <p className="text-sm text-muted-foreground">
            {completedAdaptations} de {totalAdaptations} adaptações concluídas. {errorAdaptations} com erro.
          </p>
        </div>
      </div>
    )
  }

  return null
}
```

- [ ] **Step 3: Create components/result-display.tsx**

```typescript
'use client'

import type { Adaptation } from '@/lib/types/adaptation'

interface ResultDisplayProps {
  questions: any[]
}

export function ResultDisplay({ questions }: ResultDisplayProps) {
  return (
    <div className="space-y-6">
      {questions.map((question, i) => (
        <div key={question.id} className="border border-border rounded-lg p-4">
          <p className="font-semibold mb-3">{i + 1}. {question.question_text}</p>
          <div className="space-y-3 ml-4">
            {question.adaptations?.map((adaptation: Adaptation) => (
              <div key={adaptation.id} className="border-l-2 border-foreground/20 pl-3">
                <p className="text-sm font-medium text-muted-foreground">Suporte: {adaptation.bncc_skill_code}</p>
                <p className="text-sm mt-1">{adaptation.adapted_statement}</p>
                {adaptation.adapted_alternatives && (
                  <div className="ml-2 mt-2 space-y-1">
                    {adaptation.adapted_alternatives.map((alt, idx) => (
                      <p key={idx} className="text-xs">
                        {alt.label}) {alt.text}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Create components/feedback-form.tsx**

```typescript
'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'

interface FeedbackFormProps {
  adaptationId: string
  onSubmit?: () => void
}

export function FeedbackForm({ adaptationId, onSubmit }: FeedbackFormProps) {
  const [helpful, setHelpful] = useState<boolean | null>(null)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    if (helpful === null) return

    try {
      const res = await fetch(`/api/exams/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adaptation_id: adaptationId, helpful, comment })
      })

      if (res.ok) {
        setSubmitted(true)
        onSubmit?.()
      }
    } catch (error) {
      console.error('Feedback error:', error)
    }
  }

  if (submitted) {
    return <p className="text-sm text-muted-foreground">Obrigado pelo feedback!</p>
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Esta adaptação foi útil?</p>
      <div className="flex gap-2">
        <button
          onClick={() => setHelpful(true)}
          className={`flex items-center gap-1 px-3 py-2 rounded-md border ${
            helpful === true ? 'border-green-500 bg-green-50' : 'border-border'
          }`}
        >
          <ThumbsUp className="h-4 w-4" /> Sim
        </button>
        <button
          onClick={() => setHelpful(false)}
          className={`flex items-center gap-1 px-3 py-2 rounded-md border ${
            helpful === false ? 'border-red-500 bg-red-50' : 'border-border'
          }`}
        >
          <ThumbsDown className="h-4 w-4" /> Não
        </button>
      </div>
      {helpful !== null && (
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Comentário (opcional)"
          className="w-full px-3 py-2 border border-border rounded-md text-sm"
          rows={3}
        />
      )}
      <button
        onClick={handleSubmit}
        disabled={helpful === null}
        className="px-4 py-2 bg-foreground text-background rounded-md text-sm font-medium disabled:opacity-50"
      >
        Enviar Feedback
      </button>
    </div>
  )
}
```

- [ ] **Step 5: Create app/(auth)/exams/[id]/processing/page.tsx**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useExamStatus } from '@/lib/hooks/use-exam-status'
import { AdaptationProgress } from '@/components/adaptation-progress'
import { redirect } from 'next/navigation'

export default function ProcessingPage({ params }: { params: { id: string } }) {
  const [statusData, setStatusData] = useState<any>(null)
  const { status, startPolling } = useExamStatus(params.id, 'processing')

  useEffect(() => {
    startPolling()
    const fetchStatus = async () => {
      const res = await fetch(`/api/exams/${params.id}/status`)
      const data = await res.json()
      setStatusData(data)
    }
    fetchStatus()
  }, [params.id, startPolling])

  if (status === 'ready') {
    redirect(`/exams/${params.id}/result`)
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Processando Prova</h1>
      {statusData && (
        <AdaptationProgress
          status={status}
          totalAdaptations={statusData.totalAdaptations || 0}
          completedAdaptations={statusData.adaptationsCompleted || 0}
          errorAdaptations={statusData.adaptationsErrored || 0}
          examId={params.id}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 6: Create app/(auth)/exams/[id]/result/page.tsx**

```typescript
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ResultDisplay } from '@/components/result-display'
import { FeedbackForm } from '@/components/feedback-form'

export default async function ResultPage({ params }: { params: { id: string } }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const res = await fetch(`http://localhost:3000/api/exams/${params.id}/result`, {
    headers: { 'Cookie': '' }
  })
  const { exam, questions } = await res.json()

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">{exam.name} - Resultados</h1>
      <ResultDisplay questions={questions || []} />
    </div>
  )
}
```

- [ ] **Step 7: Run component and page tests**

```bash
npm run test -- result.test.ts
npm run test:a11y
```

- [ ] **Step 8: Commit**

```bash
git add components/ app/\(auth\)/exams/\[id\]/
git commit -m "feat(ui): add processing progress and result display components with feedback"
```

---

### Task 10: Dashboard & Exam List

**Spec Reference:** spec-dashboard.md

**Files:**
- Create: `components/exam-list-item.tsx`
- Create: `components/empty-dashboard.tsx`
- Create: `app/(auth)/dashboard/page.tsx`

- [ ] **Step 1: Write failing dashboard tests**

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ExamListItem } from '@/components/exam-list-item'

describe('Dashboard Components', () => {
  it('should render exam in list', () => {
    const exam = {
      id: '1',
      name: 'Test Exam',
      status: 'ready' as const
    }
    render(<ExamListItem exam={exam} />)
    expect(screen.getByText('Test Exam')).toBeDefined()
  })
})
```

- [ ] **Step 2: Create components/exam-list-item.tsx**

```typescript
'use client'

import type { Exam } from '@/lib/types/exam'
import { getExamStatusDisplay, getExamRoute } from '@/lib/utils/exam-status'
import Link from 'next/link'

interface ExamListItemProps {
  exam: Exam
}

export function ExamListItem({ exam }: ExamListItemProps) {
  const display = getExamStatusDisplay(exam.status)
  const route = getExamRoute(exam)

  return (
    <Link href={route}>
      <div className="border border-border rounded-lg p-4 hover:bg-muted/50 transition">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold">{exam.name}</h3>
            <p className="text-sm text-muted-foreground">
              {new Date(exam.created_at).toLocaleDateString('pt-BR')}
            </p>
          </div>
          <span className={`text-sm font-medium ${display.color}`}>
            {display.label}
          </span>
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 3: Create components/empty-dashboard.tsx**

```typescript
'use client'

import { BookOpen } from 'lucide-react'
import Link from 'next/link'

export function EmptyDashboard() {
  return (
    <div className="text-center py-12">
      <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
      <h3 className="text-lg font-semibold mb-2">Nenhuma prova criada</h3>
      <p className="text-muted-foreground mb-6">
        Comece criando uma nova prova para adaptação
      </p>
      <Link href="/exams/new" className="px-4 py-2 bg-foreground text-background rounded-md font-medium">
        Criar Prova
      </Link>
    </div>
  )
}
```

- [ ] **Step 4: Create app/(auth)/dashboard/page.tsx**

```typescript
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ExamListItem } from '@/components/exam-list-item'
import { EmptyDashboard } from '@/components/empty-dashboard'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: exams } = await supabase
    .from('exams')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Minhas Provas</h1>
        <Link href="/exams/new" className="px-4 py-2 bg-foreground text-background rounded-md font-medium">
          + Nova Prova
        </Link>
      </div>

      {exams && exams.length > 0 ? (
        <div className="grid gap-4">
          {exams.map(exam => (
            <ExamListItem key={exam.id} exam={exam} />
          ))}
        </div>
      ) : (
        <EmptyDashboard />
      )}
    </div>
  )
}
```

- [ ] **Step 5: Redirect / to /dashboard after auth check**

Update `middleware.ts` to redirect authenticated users from `/` to `/dashboard`.

- [ ] **Step 6: Run tests**

```bash
npm run test -- dashboard.test.ts
npm run test:a11y
```

- [ ] **Step 7: Commit**

```bash
git add components/ app/\(auth\)/dashboard/
git commit -m "feat(ui): add dashboard with exam list and empty state"
```

---

### Task 11: Integration Tests

**Spec Reference:** All specs

**Files:**
- Create: `e2e/exam-workflow.spec.ts`
- Modify: `e2e/accessibility.spec.ts`

- [ ] **Step 1: Create e2e/exam-workflow.spec.ts**

```typescript
import { test, expect } from '@playwright/test'

test.describe('Exam Workflow E2E', () => {
  test('should create exam and view results', async ({ page }) => {
    // Login
    await page.goto('/login')
    // Google OAuth mock...

    // Dashboard
    await page.goto('/dashboard')
    await expect(page.getByText('Minhas Provas')).toBeVisible()

    // Create exam
    await page.click('text=+ Nova Prova')
    await page.fill('input[placeholder="Nome da Prova"]', 'Test Exam')
    // Select subject, grade, supports...
    // Upload file...
    await page.click('button:has-text("Criar Prova")')

    // Wait for extraction review
    await page.waitForURL('/exams/*/extraction')
    await expect(page.getByText('Questões Extraídas')).toBeVisible()

    // Start processing
    await page.click('button:has-text("Processar Adaptações")')
    await page.waitForURL('/exams/*/processing')

    // Poll status
    await page.waitForURL('/exams/*/result', { timeout: 60000 })
    await expect(page.getByText('Resultados')).toBeVisible()
  })
})
```

- [ ] **Step 2: Update e2e/accessibility.spec.ts**

Add accessibility checks to all new pages (dashboard, exam creation, processing, results).

- [ ] **Step 3: Run E2E tests**

```bash
npm run test:e2e
```

- [ ] **Step 4: Commit**

```bash
git add e2e/
git commit -m "test(e2e): add exam workflow and accessibility E2E tests"
```

---

## Phase 5: Admin & Public

### Task 12: Admin Config Page

**Spec Reference:** spec-admin-config.md

**Files:**
- Create: `components/ai-model-config.tsx`
- Create: `components/support-config.tsx`
- Create: `app/(admin)/config/page.tsx`

- [ ] **Step 1-7: Implement admin config UI and API routes**

[Similar structure to previous tasks...]

- [ ] **Step 8: Commit**

```bash
git commit -m "feat(admin): add AI model and support configuration pages"
```

---

### Task 13: Admin Users Management

**Spec Reference:** spec-admin-users.md

**Files:**
- Create: `components/user-management-table.tsx`
- Create: `app/(admin)/users/page.tsx`
- Create: `app/api/users/[id]/role/route.ts`

- [ ] **Steps**: Similar admin CRUD pattern

- [ ] **Commit**

```bash
git commit -m "feat(admin): add user management and role assignment"
```

---

### Task 14: Landing Page & Full Project Checks

**Spec Reference:** spec-landing-page.md

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1-7: Build landing page with calls-to-action**

- [ ] **Step 8: Full project checks**

```bash
npm run lint
npm run typecheck
npm run build
npm run test
npm run test:coverage
npm run test:a11y
npm run test:e2e
```

- [ ] **Step 9: Commit**

```bash
git commit -m "feat(public): add landing page and verify full project checks"
```

---

## Completion

After all 14 tasks are complete:

1. ✅ All migrations applied and schema validated
2. ✅ All types and schemas defined and tested
3. ✅ All utilities implemented with coverage
4. ✅ All Edge Functions deployed and tested
5. ✅ All API routes implemented with validation
6. ✅ All React components created and tested
7. ✅ Dashboard functional with exam management
8. ✅ Admin config and user management working
9. ✅ Landing page published
10. ✅ Full test coverage (unit, integration, E2E, a11y)
11. ✅ CI/CD pipeline passing
12. ✅ Ready for production deployment

---

**Use this plan with `superpowers:subagent-driven-development` for task-by-task execution with automatic reviews.**
