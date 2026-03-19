# spec-process-adaptation.md — Review Fixes

> **Parent:** Task 2 of `docs/superpowers/plans/2026-03-18-prisma-specs-creation.md`
> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Address 2 Important issues raised during code review of `spec/spec-process-adaptation.md`, improving clarity for implementors without changing the spec's scope or architecture.

**File to edit:** `spec/spec-process-adaptation.md`

**Decisions from brainstorming (2026-03-19):**
- Processing flow: **pipeline por questão** — cada questão executa análise → adaptações internamente; questões diferentes rodam em paralelo
- Validação de respostas: **objetivas obrigatórias, dissertativas opcionais** — `correctAnswer` é obrigatório apenas para questões com `alternatives`; dissertativas podem ser adaptadas sem gabarito
- Escopo de cobertura de testes: **manter como está** — a lista atual no spec já é suficiente como orientação

---

## Task 1: Reestruturar fluxo como pipeline por questão

**Problem:** Section 4.5 "Processing flow per question" (lines 409–419) é ambíguo sobre quando a análise BNCC/Bloom acontece em relação à geração de adaptações, e não deixa claro o modelo de paralelismo.

**Design:** Pipeline por questão — para cada questão, a análise BNCC/Bloom roda primeiro, depois as adaptações dessa questão rodam em paralelo por suporte. Todas as questões executam seus pipelines simultaneamente via `Promise.all`. A dependência é apenas intra-questão (a análise BNCC de uma questão não depende da análise de outra).

**Files:**
- Edit: `spec/spec-process-adaptation.md` — Section 4.5

- [ ] **Step 1: Rewrite the "Processing flow" block in Section 4.5**

Replace the current numbered list (lines 409–419) with a pipeline-per-question structure:

```markdown
**Processing flow (pipeline per question):**

All questions are processed in parallel via `Promise.all`. Each question runs its own pipeline: analysis first, then adaptations. There is no global phase gate — question B's adaptations can start before question A's analysis finishes.

For each question (parallel via `Promise.all`):

**Stage 1 — Analysis (once per question):**
1. Send question text + correct answer (if provided) + subject + grade level to LLM
2. Parse response with `bnccAnalysisSchema` and `bloomAnalysisSchema`
3. Update `questions` row: set `bncc_skill_code`, `bncc_skill_description`, `bloom_level`, `bloom_justification`

**Stage 2 — Adaptation (once per support, parallel within this question):**
After Stage 1 completes for this question, all supports linked via `exam_supports` are processed in parallel:

4. For each support (parallel via `Promise.all`):
   a. Set `adaptations.status = 'processing'` for this record
   b. Build adaptation prompt (MC vs. essay branch) including the BNCC skill from Stage 1
   c. Call LLM; parse response with `adaptationResponseSchema`
   d. For MC: validate `adaptedAlternatives.length` === `alternatives.length` (CON-001)
   e. On success: update `adaptations` record — status `completed`, store adapted content
   f. On JSON parse failure: store raw text as `adapted_statement`, log warning (CON-003)
   g. On count mismatch or fatal error: update `adaptations` record — status `error`, store `error_message`

**After all question pipelines resolve:**
5. If all `adaptations` completed → `exams.status = 'ready'`; if any errored → `exams.status = 'ready'` (partial success allowed; individual `adaptations` records track error state)
```

- [ ] **Step 2: Update "Side effects on DB" to match the pipeline model**

Replace the current side-effects block (lines 421–425) with:

```markdown
**Side effects on DB (per question pipeline):**
1. **Stage 1:** Writes `bncc_skill_code`, `bncc_skill_description`, `bloom_level`, `bloom_justification` to this question's row (requires new columns — see migration note in Section 4.1)
2. **Stage 2:** Sets each `adaptations.status = 'processing'` → then `'completed'` or `'error'`; writes `adapted_statement`, `adapted_alternatives`, `error_message` as applicable
3. **After all pipelines:** Sets `exams.status = 'ready'` on completion
```

---

## Task 2: Validação diferenciada — objetivas obrigatórias, dissertativas opcionais

**Problem:** O `POST /api/exams/[id]/answers` (Section 4.4) não especifica a política de submissão de respostas. O gabarito de objetivas é necessário para validar CON-001 (paridade de alternativas), mas dissertativas podem ser adaptadas sem gabarito — o LLM adapta o enunciado, não precisa validar alternativas.

**Design:** `correctAnswer` obrigatório para questões com `alternatives` (objetivas); opcional para questões sem `alternatives` (dissertativas). O route handler valida que toda objetiva tem resposta e rejeita se faltar. Dissertativas sem resposta são adaptadas normalmente — a adaptação simplifica o enunciado sem precisar do gabarito.

**Files:**
- Edit: `spec/spec-process-adaptation.md` — Section 3, Section 4.3, Section 4.4, Section 5

- [ ] **Step 1: Add new constraint to Section 3 Feature Requirements**

Add after CON-003:

```markdown
| CON-004 | `POST /api/exams/[id]/answers`: `correctAnswer` is **required** for multiple-choice questions (`alternatives` is not null) and **optional** for essay questions (`alternatives` is null). Submission without answers for any MC question returns `400 VALIDATION_ERROR` |
```

- [ ] **Step 2: Update the API contract in Section 4.4**

After the current description paragraph ("Accepts teacher-provided correct answers per question..."), add a validation rules block:

```markdown
**Validation rules:**
1. Request body must pass `submitAnswersSchema` (Zod)
2. Every multiple-choice question (with `alternatives`) in this exam MUST have a corresponding `correctAnswer` entry — missing MC answers return `400`
3. Essay questions (without `alternatives`) MAY omit `correctAnswer` — if omitted, adaptation runs without it
4. Each `questionId` must reference an existing question belonging to this exam
5. Duplicate `questionId` entries are rejected
6. If any validation fails, return `400 { error: "VALIDATION_ERROR", details: "..." }` with specific field errors
```

- [ ] **Step 3: Update submitAnswersSchema in Section 4.3**

Replace the current `submitAnswersSchema`:

```typescript
export const submitAnswerSchema = z.object({
  questionId: z.string().uuid('Invalid question ID'),
  correctAnswer: z.string().min(1, 'Correct answer is required'),
});

export const submitAnswerOptionalSchema = z.object({
  questionId: z.string().uuid('Invalid question ID'),
  correctAnswer: z.string().min(1).optional(),  // optional for essay questions
});

export const submitAnswersSchema = z.object({
  answers: z.array(submitAnswerOptionalSchema).min(1, 'At least one answer is required'),
});

// Route handler additionally validates:
// - every MC question (alternatives != null) has a non-empty correctAnswer
// - every questionId exists in this exam's questions
// - no duplicate questionIds
// These checks require DB state and cannot be expressed in Zod alone.
```

- [ ] **Step 4: Add new acceptance criteria in Section 5**

Add after AC-007:

```markdown
| AC-008 | Exam has 3 MC questions and 2 essay questions; teacher submits answers for all 3 MC but omits both essays | `POST /api/exams/[id]/answers` | Response `200 { ok: true }`; 5 question pipelines triggered; essay adaptations use enunciado only |
| AC-009 | Exam has 3 MC questions; teacher submits answers for only 2 MC | `POST /api/exams/[id]/answers` | Response `400 { error: "VALIDATION_ERROR", details: "Missing correctAnswer for 1 multiple-choice question" }`; no adaptation records created; `exams.status` unchanged |
```

- [ ] **Step 5: Update Section 4.5 Edge Function — Stage 1 prompt input**

In the Stage 1 description (from Task 1), ensure the prompt input says "correct answer (if provided)" instead of just "correct answer", since essay questions may not have one.

---

## Final Validation

After both tasks:

- [ ] **Step 1: Update `last_updated` in frontmatter to `2026-03-19`**
- [ ] **Step 2: Update validation checklist (Section 10) — confirm all items still checked, add check for CON-004**
- [ ] **Step 3: Verify the spec still has all 11 sections intact**
- [ ] **Step 4: Commit**

```bash
git add spec/spec-process-adaptation.md
git commit -m "fix(spec): clarify processing flow and answer validation in adaptation spec

Address 2 Important issues from code review:
- Restructure Edge Function processing as pipeline-per-question (analysis → adaptations per question, all questions in parallel)
- Define differentiated answer validation: correctAnswer required for MC, optional for essay (CON-004, AC-008, AC-009)"
```
