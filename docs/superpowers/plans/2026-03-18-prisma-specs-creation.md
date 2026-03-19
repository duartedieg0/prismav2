# PRISMA Specs Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create 9 spec files in `/spec/` covering all features of the PRISMA (Adapte Minha Prova) application rewrite, following the `create-specification` template and incorporating constraints from 9 skills.

**Architecture:** Each spec is a standalone `spec-[name].md` file with 11 sections. Specs are written in core-first order so that later specs can reference types and contracts defined in earlier ones. All specs share a global set of React, Tailwind, Next.js, and testing constraints documented in the design doc.

**Tech Stack:** Next.js 16 (App Router) — Supabase (Auth, Postgres, Storage, Edge Functions) · Vercel AI SDK · Shadcn UI · Tailwind CSS v3 · tailwind-variants · Vitest 4.x · jest-axe · Playwright + axe-core

---

## Reference Documents

- Design approved: `docs/plans/2026-03-18-prisma-specs-design.md`
- Migrations (source of truth for current schema): `supabase/migrations/20260318000001_initial_schema.sql`, `supabase/migrations/20260318000002_create_storage_bucket.sql`

> **Note:** The PRD (`tasks/prd-adapte-minha-prova/prd.md`), Tech Spec (`tasks/prd-adapte-minha-prova/techspec.md`), and spec template (`.agents/skills/create-specification/SKILL.md`) do not exist in the repository. All required context from these documents has been incorporated directly into this plan and the design doc. Agents executing this plan should use the design doc, the Global Constraints block below, and the task descriptions as their source of truth — not external files.

## Current vs Target Schema

The current schema (`20260318000001_initial_schema.sql`) already includes:
- `ai_models.is_default` with partial unique index
- `feedbacks.dismissed_from_evolution`
- `adaptations.adapted_alternatives` JSONB
- `supports.model_id` nullable (references ai_models)

The specs define a **target schema** that extends the current one. Columns/tables that do NOT yet exist but are defined in specs as target state (requiring future migrations):
- `exams.status` CHECK constraint must expand from `('draft','processing','completed','error')` to `('draft','uploading','processing','awaiting_answers','ready','error')` — 6 values
- `exams.topic` (text, optional) — topic/subject context for the exam
- `exams.extraction_warning` (text, nullable) — partial OCR failure messages
- `exams.error_message` (text, nullable) — error details for failed processing
- `profiles.avatar_url` (text, nullable) — from Google OAuth metadata
- `profiles.role` CHECK constraint: current default is `'user'`; target renames to `'teacher'` as default (values: `'teacher' | 'admin'`)
- `questions.alternatives` (JSONB, nullable) — for multiple choice questions
- `questions.correct_answer` (text, nullable) — teacher-provided correct answer
- New junction table `exam_supports` (exam_id, support_id) — links exams to selected supports at creation time (distinct from `supports` table which stores generated content per question)

Each spec must clearly distinguish **existing columns** (reference migration) from **new columns** (document as requiring migration).

## Global Constraints Block (include in every spec — Section 3)

Every spec must include this block verbatim in Section 3 before its feature-specific requirements:

```markdown
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
```

---

## File Structure

```
spec/
├── spec-process-extraction.md      # Task 1
├── spec-process-adaptation.md      # Task 2
├── spec-process-result.md          # Task 3
├── spec-process-new-exam.md        # Task 4
├── spec-process-repository.md      # Task 5
├── spec-design-auth.md             # Task 6
├── spec-design-admin-config.md     # Task 7
├── spec-design-admin-users.md      # Task 8
└── spec-design-landing.md          # Task 9
```

---

## Task 1: spec-process-extraction.md (F5 — PDF Extraction)

**Files:**
- Create: `spec/spec-process-extraction.md`

**Source sections:** PRD F5.1–F5.5, Tech Spec → "extract-questions" Edge Function, "Supabase Storage", risks table (timeout, LLM cost)

**Key types to define:** `Exam`, `ExamStatus`, `Question`, `ExtractionResult`, `ExamWithJoins`

- [ ] **Step 1: Create the file with frontmatter and Introduction**

```markdown
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
```

- [ ] **Step 2: Write Section 2 — Purpose & Scope**

In scope: `POST /api/exams` route handler, Supabase Storage upload, `extract-questions` Edge Function, `ExtractionStatus` component, exam status polling.
Out of scope: BNCC/Bloom analysis (spec-process-adaptation), result display (spec-process-result), form UI (spec-process-new-exam).

- [ ] **Step 3: Write Section 3 — Definitions + Global Constraints + Feature Requirements**

Definitions: ExamStatus enum values, OCR, LLM Multimodal, extraction_warning, awaiting_answers.

Feature REQs (from PRD F5):
```
REQ-001: System SHALL extract objective and essay questions from PDFs up to 25 MB
REQ-002: On partial OCR failure, SHALL persist successfully extracted questions and populate extraction_warning
REQ-003: After extraction, SHALL display questions and prompt teacher to provide correct answers (F5.4)
REQ-004: System SHALL support visual elements (tables, images) unchanged in adapted version (F5.3)
CON-001: Edge Function timeout ~150s; batch processing required for exams with >10 questions
CON-002: PDF sent as base64 to multimodal LLM; no page-by-page conversion in MVP
SEC-001: Storage bucket `exams` RLS — teacher accesses only their own {userId}/{examId}.pdf
```
Then paste Global Constraints block.

- [ ] **Step 4: Write Section 4 — Interfaces & Data Contracts**

Include:
- SQL table `exams` (current schema from `20260318000001_initial_schema.sql` + target columns: `topic`, `extraction_warning`, `error_message`, expanded `status` CHECK — see "Current vs Target Schema" above)
- SQL table `questions` (current schema + target columns: `alternatives` JSONB, `correct_answer`)
- TypeScript: `ExamStatus`, `Exam`, `Question`, `ExtractionResult`
- Zod: `createExamSchema` (FormData fields), `extractedQuestionSchema`
- API contract: `POST /api/exams` (FormData input → `{ id: string }`)
- API contract: `GET /api/exams/[id]/status` (→ `{ status: ExamStatus, errorMessage?: string }`)
- Edge Function `extract-questions` input/output contract

- [ ] **Step 5: Write Section 5 — Acceptance Criteria**

```
AC-001: Given valid PDF ≤25MB, When POST /api/exams, Then exam created with status 'uploading', PDF stored, extraction triggered
AC-002: Given PDF with illegible page, When extraction runs, Then valid questions persisted, extraction_warning populated for failed pages
AC-003: Given exam status 'awaiting_answers', When teacher views extraction page, Then all extracted questions displayed with correct-answer input
AC-004: Given PDF >25MB, When POST /api/exams, Then 400 error returned, no exam created
AC-005: Given Edge Function timeout, When processing exceeds limit, Then exam status set to 'error' with error_message
```

- [ ] **Step 6: Write Section 6 — Test Strategy**

```
Layer 1 — Vitest:
  - createExamSchema: valid input, missing subjectId, supportIds empty, topic >500 chars
  - validatePdfFile: non-PDF MIME type, file >25MB, null file
  - extractedQuestionSchema: valid objective question, valid essay, alternatives null
  - getExamStatusDisplay: all 6 ExamStatus values
  - getExamRoute: all 6 ExamStatus values

Layer 2 — jest-axe + Vitest:
  - <ExtractionStatus> in states: loading, partial-success (with warning), error, complete
  - All states: zero WCAG violations with tags wcag2a, wcag2aa, wcag22aa

Layer 3 — Playwright:
  - /exams/[id]/extraction: full page scan WCAG 2.2 AA
  - Error state with extraction_warning message visible
  Mock: vi.mock('@/lib/supabase/server'), vi.mock('supabase/functions/extract-questions')
  Coverage: 80% minimum on extract-questions Edge Function utilities
```

- [ ] **Step 7: Write Sections 7–11 (Rationale, Dependencies, Examples, Validation, Related)**

Rationale: multimodal LLM vs Tesseract (quality + tables/images); Edge Function vs Inngest (no extra infra); polling vs Realtime (simpler for MVP).
Dependencies: EXT-001 Supabase Edge Functions (Deno), SVC-001 OpenAI-compatible multimodal LLM, INF-001 Supabase Storage bucket `exams`, PLT-001 Next.js App Router Node.js runtime.
Examples: scanned PDF with partial OCR; PDF with table; PDF >25MB rejected.
Related: spec-process-adaptation.md, spec-process-new-exam.md, spec-design-auth.md

- [ ] **Step 8: Validate spec has all 11 sections and global constraints block**

Checklist:
```
- [ ] Frontmatter complete (title, version, date_created, tags)
- [ ] All 11 sections present (Introduction through Related Specifications)
- [ ] Global Constraints block present in Section 3
- [ ] All feature REQs traceable to PRD F5
- [ ] Section 4 includes SQL schemas, TypeScript types, Zod schemas, API contracts
- [ ] Section 5 has ≥5 AC in Given-When-Then format
- [ ] Section 6 has all 3 test layers with specific test cases named
- [ ] Section 11 references at least 3 related specs
```

- [ ] **Step 9: Commit**

```bash
git add spec/spec-process-extraction.md
git commit -m "feat(spec): add PDF extraction process specification"
```

---

## Task 2: spec-process-adaptation.md (F6 — AI Analysis & Adaptation)

**Files:**
- Create: `spec/spec-process-adaptation.md`
- Reference: `spec/spec-process-extraction.md` (imports Exam, Question types)

**Source sections:** PRD F6.1–F6.7, Tech Spec → "analyze-and-adapt" Edge Function, "Vercel AI SDK"

**Key types to define:** `Adaptation`, `AdaptedAlternative`, `CopyableBlock`, `BnccAnalysis`, `BloomAnalysis`

- [ ] **Step 1: Create file with frontmatter and Introduction**

```markdown
---
title: AI Analysis and Adaptation Process
version: 1.0
date_created: 2026-03-18
tags: [process, adaptation, bncc, bloom, llm, edge-function, async]
---
```

Introduction: This spec defines how extracted questions are analyzed for BNCC skills and Bloom level, and how adapted versions are generated per educational support (apoio). Depends on contracts from spec-process-extraction.

- [ ] **Step 2: Write Section 3 — Feature Requirements**

```
REQ-001: System SHALL identify BNCC skills per question via LLM (F6.1)
REQ-002: System SHALL identify Bloom cognitive level per question via LLM (F6.2)
REQ-003: System SHALL generate one adapted version per question × support, preserving BNCC skill (F6.3)
REQ-004: Processing SHALL be async — teacher can leave and return (F6.4)
REQ-005: Multiple choice questions SHALL return JSON { adaptedStatement, adaptedAlternatives[] } with same count as original alternatives
REQ-006: Essay questions SHALL return plain adapted text string
CON-001: adaptedAlternatives.length MUST equal original alternatives.length; mismatch sets adaptation status to 'error'
CON-002: LLM prompt MUST instruct use of \n for line breaks in JSON responses (prevent parse errors)
CON-003: JSON parse failure falls back to treating full response as plain text + logs warning
SEC-001: Edge Function uses Supabase service role key; api_key for LLM models never exposed to client
```
Then paste the **full Global Constraints block verbatim** (same block as Task 1, Step 3 — do not replace with a reference link).

- [ ] **Step 3: Write Section 4 — Interfaces & Data Contracts**

Include:
- SQL tables: `adaptations` (already has `adapted_alternatives` JSONB in current schema), new junction table `exam_supports` (exam_id, support_id — requires migration; see "Current vs Target Schema")
- TypeScript: `Adaptation`, `AdaptedAlternative`, `CopyableBlock` (from lib/types/adaptation.ts)
- Zod: `bnccAnalysisSchema`, `bloomAnalysisSchema`, `adaptationResponseSchema` (union: JSON object | plain string)
- API contract: `POST /api/exams/[id]/answers` (body: `{ answers: { questionId, correctAnswer }[] }` → `{ ok: true }`)
- Edge Function `analyze-and-adapt` input/output contract

- [ ] **Step 4: Write Sections 5–11**

AC examples:
```
AC-001: Given completed extraction, When teacher submits answers, Then analyze-and-adapt triggered for all questions × supports
AC-002: Given multiple choice question, When LLM returns adaptedAlternatives with wrong count, Then adaptation status set to 'error'
AC-003: Given LLM returns malformed JSON, When parsing fails, Then raw text used as adapted content + warning logged
AC-004: Given exam with 3 questions × 2 supports, When adaptation completes, Then 6 adaptation records with status 'completed'
```

Test Layer 1 (Vitest): `buildAdaptationPrompt` (MC vs essay), `safeParseAlternatives` (valid JSON, plain string, null), `validateCorrectAnswer`, `validateAdaptedAlternatives` (count mismatch), `identifyQuestionType`.
Test Layer 2 (jest-axe): `<AdaptationProgress>` in states: pending, processing, completed, error.
Test Layer 3 (Playwright): `/exams/[id]/processing` — WCAG 2.2 AA scan; polling indicator visible.

- [ ] **Step 5: Validate and commit**

```bash
git add spec/spec-process-adaptation.md
git commit -m "feat(spec): add AI analysis and adaptation process specification"
```

---

## Task 3: spec-process-result.md (F7 — Adaptation Result)

**Files:**
- Create: `spec/spec-process-result.md`
- References: spec-process-extraction (Exam, Question), spec-process-adaptation (Adaptation, AdaptedAlternative)

**Source sections:** PRD F7.1–F7.8, Tech Spec → feedback table, `POST /api/exams/[id]/feedback`

**Key types to define:** `Feedback`, `saveFeedbackSchema`, copyable block format rules

- [ ] **Step 1: Create file, write Sections 1–3**

Feature REQs:
```
REQ-001: SHALL display exam info (subject, grade level, topic, selected supports) (F7.1)
REQ-002: SHALL display adapted content per question with copy button (F7.2)
REQ-003: SHALL display BNCC skills analysis per question (F7.3)
REQ-004: SHALL display Bloom level analysis per question (F7.4)
REQ-005: SHALL provide 0–5 star rating per adapted question (F7.5)
REQ-006: SHALL provide free-text comment field (max 5000 chars) per adapted question (F7.6)
REQ-007: SHALL display message informing teacher that comments help improve future adaptations (F7.7)
REQ-008: Feedback submission SHALL NOT block result viewing — fire-and-forget (F7.8)
PAT-007: Multiple choice copyable block format: "[statement]\n\na) text\nb) text ✓\nc) text"
PAT-008: Essay copyable block format: "[adapted statement only]"
```

- [ ] **Step 2: Write Sections 4–6**

Section 4 types: `Feedback` SQL schema, `saveFeedbackSchema` (Zod: adaptationId uuid, rating 0–5, comment max 5000), `generateCopyableBlock(adaptation, alternatives)` function signature.

Test Layer 1: `generateCopyableBlock` (MC with 4 alternatives, correct at position 2; essay; empty alternatives), `saveFeedbackSchema` (rating <0, rating >5, comment >5000 chars, valid).
Test Layer 2: `<QuestionResultCard>` in states: loading, no-feedback, 5-stars-feedback, copy-error.
Test Layer 3: `/exams/[id]/result` — WCAG 2.2 AA; star rating keyboard navigation; copy button with clipboard mock.

- [ ] **Step 3: Validate and commit**

```bash
git add spec/spec-process-result.md
git commit -m "feat(spec): add adaptation result specification"
```

---

## Task 4: spec-process-new-exam.md (F4 — New Exam Form)

**Files:**
- Create: `spec/spec-process-new-exam.md`
- References: spec-design-auth (authenticated session), spec-process-extraction (POST /api/exams contract)

**Source sections:** PRD F4.1–F4.6, Tech Spec → "POST /api/exams", "Supabase Storage"

- [ ] **Step 1: Create file, write Sections 1–3**

Feature REQs:
```
REQ-001: SHALL require subject selection (F4.1)
REQ-002: SHALL require grade level selection (F4.2)
REQ-003: SHALL accept optional topic text (max 500 chars) (F4.3)
REQ-004: SHALL require selection of at least one enabled support (F4.4)
REQ-005: SHALL accept PDF only, max 25 MB (F4.5)
REQ-006: Submit button SHALL be disabled during submission (REQ-P07)
REQ-007: On 201 response, SHALL redirect to /exams/[id]/processing
CON-001: Subject, grade level, and support lists loaded server-side via RSC + React.cache()
CON-002: Client-side validation before submit; server-side validation in route handler
```

- [ ] **Step 2: Write Sections 4–6**

Test Layer 1: `createExamSchema` (valid, missing subjectId, supportIds empty array, topic >500 chars); `validatePdfFile` (null, wrong MIME, >25MB, valid).
Test Layer 2: `<NewExamForm>` in states: initial (all fields empty), validation-errors visible, loading (submit in progress), disabled (during submit).
Test Layer 3: `/exams/new` — WCAG 2.2 AA; keyboard navigation through support checkboxes.

- [ ] **Step 3: Validate and commit**

```bash
git add spec/spec-process-new-exam.md
git commit -m "feat(spec): add new exam form specification"
```

---

## Task 5: spec-process-repository.md (F3 — Exam Repository)

**Files:**
- Create: `spec/spec-process-repository.md`
- References: all spec-process-* (ExamStatus, getExamRoute), spec-design-auth (Profile)

**Source sections:** PRD F3.1–F3.3, Tech Spec → RSC Pages (Teacher), dashboard page

- [ ] **Step 1: Create file, write Sections 1–3**

Feature REQs:
```
REQ-001: SHALL list authenticated teacher's exams in descending creation order (F3.1)
REQ-002: Each item SHALL display status badge with semantic variant (F3.2)
REQ-003: Each item SHALL link to correct route based on status via getExamRoute (F3.2)
REQ-004: SHALL display "Nova Adaptação" button linking to /exams/new (F3.3)
CON-001: Page is RSC — no 'use client'; data loaded server-side
CON-002: Empty state shown when teacher has no exams
```

- [ ] **Step 2: Write Sections 4–6**

Section 4: `ExamWithJoins` interface (exam + subjects.name + grade_levels.name), `getExamStatusDisplay(status)` → `{ label, variant }`, `getExamRoute(examId, status)` → string.

Test Layer 1: `getExamStatusDisplay` (all 6 status values), `getExamRoute` (all 6 status values).
Test Layer 2: `<ExamListItem>` in all 6 status states; `<EmptyDashboard>`.
Test Layer 3: `/dashboard` — WCAG 2.2 AA; status badge labels; "Nova Adaptação" button accessible.

- [ ] **Step 3: Validate and commit**

```bash
git add spec/spec-process-repository.md
git commit -m "feat(spec): add exam repository specification"
```

---

## Task 6: spec-design-auth.md (F2 — Authentication)

**Files:**
- Create: `spec/spec-design-auth.md`
- No spec dependencies (infrastructure only)

**Source sections:** PRD F2.1–F2.4, Tech Spec → "Supabase Auth (Google OAuth)", middleware, RLS

- [ ] **Step 1: Create file, write Sections 1–3**

Feature REQs:
```
REQ-001: SHALL authenticate users via Google OAuth only (F2.1)
REQ-002: Admin role defined by profiles.role = 'admin'; set manually in database (F2.2)
REQ-003: Multiple admins supported (F2.3)
REQ-004: Blocked user (profiles.blocked = true) redirected to /blocked after login (F2.4)
SEC-001: Middleware validates JWT on all (auth) and (admin) routes via updateSession()
SEC-002: (admin) routes additionally check profile.role === 'admin'
SEC-003: RLS on profiles — teacher reads only own profile; admin reads all
CON-001: No email/password auth in MVP
```

- [ ] **Step 2: Write Sections 4–6**

Section 4: `Profile` interface (`id`, `full_name`, `email`, `avatar_url` (requires migration — not in current schema), `role: UserRole`, `blocked`, `created_at`), `UserRole = "teacher" | "admin"` (note: current DB default is `'user'`, target renames to `'teacher'` — requires migration to alter CHECK constraint and default), full `profiles` SQL with RLS policies, trigger `handle_new_user` SQL (update to also populate `avatar_url` from `raw_user_meta_data`), callback route `GET /login/callback/route.ts`.

Test Layer 1: middleware logic mock (`getUser()` — unauthenticated, teacher, admin, blocked); `updateSession` mock.
Test Layer 2: `/login` page (Google OAuth button); `/blocked` page.
Test Layer 3: `/login` — WCAG 2.2 AA; `/(auth)/dashboard` redirect on unauthenticated.

- [ ] **Step 3: Validate and commit**

```bash
git add spec/spec-design-auth.md
git commit -m "feat(spec): add authentication specification"
```

---

## Task 7: spec-design-admin-config.md (F8 — Admin Configuration)

**Files:**
- Create: `spec/spec-design-admin-config.md`
- References: spec-design-auth (admin role guard)

**Source sections:** PRD F8.1–F8.14, Tech Spec → "evolve-agent", API Key risk, admin routes

**Schema note:** All three columns (`ai_models.is_default`, `feedbacks.dismissed_from_evolution`, `adaptations.adapted_alternatives`) already exist in the initial migration (`20260318000001_initial_schema.sql`). No additional migrations needed for these. The `supports.model_id` is already nullable. Confirm by reading the migration directly.

- [ ] **Step 1: Create file, write Sections 1–3**

Feature REQs (F8.1–F8.14 mapped 1:1 as REQ-001 through REQ-014), plus:
```
REQ-015: At most one model may have is_default = true (partial unique index — already in schema)
REQ-016: supports.model_id is nullable (already in schema)
REQ-017: Feedbacks may be dismissed from evolution view without affecting teacher's view (dismissed_from_evolution — already in schema)
CON-001: Agent prompts max 50,000 chars (Zod constraint)
CON-002: Prompt comparator (current vs suggested) loaded via next/dynamic (REQ-P04)
SEC-001: All /api/admin/* routes verify profile.role === 'admin'
SEC-002: api_key returned masked (e.g. "sk-...xxxx") to client; only stored encrypted
```

- [ ] **Step 2: Write Sections 4–6**

Section 4: All TypeScript interfaces (`AiModel`, `Agent`, `Support`), all Zod schemas (`createModelSchema`, `createAgentSchema`, `createSupportSchema`, `evolutionResultSchema`), all SQL tables (`ai_models`, `agents`, `supports`, `subjects`, `grade_levels`, `agent_evolutions`), all admin API endpoints.

Test Layer 1: `createModelSchema` (invalid URL, empty api_key), `createAgentSchema` (prompt >50000 chars), `evolutionResultSchema` (valid, missing suggestedPrompt), masked api_key logic.
Test Layer 2: `<ModelListItem>` (enabled/disabled), `<AgentForm>` (textarea), `<PromptComparator>` (both states).
Test Layer 3: `/config/models`, `/config/agents/[id]/evolve` — WCAG 2.2 AA; comparator keyboard navigation.

- [ ] **Step 3: Validate and commit**

```bash
git add spec/spec-design-admin-config.md
git commit -m "feat(spec): add admin configuration specification"
```

---

## Task 8: spec-design-admin-users.md (F9 — Admin User Management)

**Files:**
- Create: `spec/spec-design-admin-users.md`
- References: spec-design-auth (Profile, UserRole), spec-design-admin-config (admin page pattern)

**Source sections:** PRD F9.1–F9.2, Tech Spec → `GET /api/admin/users`, `PATCH /api/admin/users/[id]`

- [ ] **Step 1: Create file, write Sections 1–3**

Feature REQs:
```
REQ-001: SHALL list all registered users with name, email, role, blocked status, created_at (F9.1)
REQ-002: SHALL provide toggle to block/unblock user — updates profiles.blocked (F9.2)
REQ-003: Block action SHALL require confirmation dialog before executing
SEC-001: PATCH /api/admin/users/[id] verifies profile.role === 'admin'
SEC-002: Admin cannot block themselves (guard in route handler)
CON-001: No user deletion in MVP — block only
```

- [ ] **Step 2: Write Sections 4–6**

Section 4: `Profile` interface (reference spec-design-auth), API contracts `GET /api/admin/users` (→ `Profile[]`) and `PATCH /api/admin/users/[id]` (body `{ blocked: boolean }` → `{ ok: true }`), RLS policy `Admins can update any profile`.

Test Layer 1: self-block guard (mock current user ID = target ID → 403), `updateUserSchema` (blocked not boolean).
Test Layer 2: `<UserListItem>` (blocked/active); `<BlockConfirmDialog>` (open/closed).
Test Layer 3: `/users` — WCAG 2.2 AA; confirmation dialog via keyboard.

- [ ] **Step 3: Validate and commit**

```bash
git add spec/spec-design-admin-users.md
git commit -m "feat(spec): add admin user management specification"
```

---

## Task 9: spec-design-landing.md (F1 — Landing Page)

**Files:**
- Create: `spec/spec-design-landing.md`
- References: spec-design-auth (redirect if authenticated)

**Source sections:** PRD F1.1–F1.2, UI/UX directives, personas

- [ ] **Step 1: Create file, write Sections 1–3**

Feature REQs:
```
REQ-001: SHALL display hero section with value proposition and login CTA (F1.1)
REQ-002: SHALL redirect authenticated users to /dashboard
REQ-003: Design SHALL be minimalist, desktop-first (F1.2)
REQ-004: SHALL generate design-system/MASTER.md via ui-ux-pro-max skill with: style=Minimalism, palette=neutrals+indigo accent, typography=Inter, z-index scale=10/20/30/50
GUD-008: No mobile breakpoints in MVP (desktop-only)
```

- [ ] **Step 2: Write Sections 4–6**

Section 4: Component structure (`flowSteps[]`, `highlights[]`, hero/flow/CTA/footer sections), design tokens used (`bg-background`, `text-foreground`, `text-primary`, `bg-muted/30`, `bg-card`).

Test Layer 1: redirect logic mock (`getUser()` — authenticated → redirect, unauthenticated → render).
Test Layer 2: `<LandingPage>` complete — zero WCAG violations.
Test Layer 3: `/` — WCAG 2.2 AA with tags wcag2a, wcag2aa, wcag22aa; CTA button keyboard accessible.

- [ ] **Step 3: Generate design system**

Create `design-system/MASTER.md` with the following design system definition:
- **Style:** Minimalism (professional SaaS for education)
- **Palette:** Neutrals (off-white bg, near-black text) + indigo accent (`#4F46E5` primary, `#EEF2FF` muted). Defined via CSS variables/design tokens — not hardcoded colors in components.
- **Typography:** Inter (or system-ui fallback). Scale: 14px body, 16px large body, 20px h3, 24px h2, 32px h1, 48px hero. Weight: 400 body, 500 medium, 600 semibold, 700 bold.
- **Spacing rhythm:** 4px base unit. 8px element gap, 16px group gap, 32px section gap, 64px page section gap.
- **z-index scale:** 10 (dropdowns), 20 (sticky headers), 30 (modals), 50 (toasts/notifications).
- **Shadows:** Minimal. One subtle shadow for cards (`0 1px 3px rgba(0,0,0,0.1)`).
- **Border radius:** 6px small, 8px medium, 12px large.

> **Preferred method:** If the `ui-ux-pro-max` skill is available, invoke it with query "education SaaS teacher adaptive minimalism professional" and use its output. Otherwise, create the file manually using the definition above.

- [ ] **Step 4: Validate and commit**

```bash
git add spec/spec-design-landing.md design-system/MASTER.md
git commit -m "feat(spec): add landing page specification and design system"
```

---

## Final Validation Checklist

After all 9 specs are written, verify:

- [ ] All 9 files exist in `/spec/`
- [ ] Each file has all 11 sections
- [ ] Global constraints block present in every Section 3
- [ ] Section 4 of each spec has: SQL schema, TypeScript types, Zod schemas, API contracts
- [ ] Section 5 has ≥4 AC per spec in Given-When-Then format
- [ ] Section 6 has all 3 test layers with named test cases
- [ ] Section 11 cross-references match the dependency table in design doc
- [ ] All migrations (00005, 00006, 00007) reflected in appropriate specs
- [ ] `design-system/MASTER.md` generated and committed
- [ ] `tailwind-variants` (tv) referenced in every spec that mentions component styling (not CVA)

```bash
git add spec/
git commit -m "feat(spec): complete PRISMA specs creation — all 9 specs"
```
