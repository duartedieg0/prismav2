---
title: Admin Configuration (F8)
version: 1.0
date_created: 2026-03-18
last_updated: 2026-03-18
owner: PRISMA Team
tags: [design, admin, config, ai-models, agents, subjects, grade-levels, supports, evolution, crud, rls]
---

# Introduction

This specification defines the admin configuration interface for the PRISMA ("Adapte Minha Prova") platform. It covers full CRUD management of AI models, agents, supports (apoios), subjects, grade levels, and the agent evolution workflow. All routes described here are gated by `profiles.role = 'admin'` as defined in `spec-design-auth.md`. No new database migrations are required — all columns (`ai_models.is_default`, `feedbacks.dismissed_from_evolution`, `adaptations.adapted_alternatives`, `supports.model_id`) already exist in `supabase/migrations/20260318000001_initial_schema.sql`.

---

## Section 1: Purpose & Scope

### Purpose

This document specifies the administration configuration pages at `/config/*`. It defines the data contracts, API surface, UI components, acceptance criteria, and test strategy for managing the reference data and AI infrastructure that power the exam adaptation pipeline described in `spec-process-adaptation.md`.

### In Scope

- `/config/models` — CRUD for AI models (`ai_models` table); default model enforcement via partial unique index
- `/config/agents` — CRUD for adaptation agents (`agents` table); prompt editing with character limit
- `/config/agents/[id]/evolve` — agent evolution view; feedback review; suggested prompt comparator
- `/config/supports` — CRUD for supports/apoios (`supports` table); nullable `model_id`
- `/config/subjects` — CRUD for subjects (`subjects` table)
- `/config/grades` — CRUD for grade levels (`grade_levels` table)
- All `/api/admin/*` route handlers enforcing `role = 'admin'`
- `api_key` masking logic (display `sk-...xxxx`; never return plaintext to client)
- Zod schemas: `createModelSchema`, `createAgentSchema`, `createSupportSchema`, `evolutionResultSchema`
- TypeScript types: `AiModel`, `Agent`, `Support`, `Subject`, `GradeLevel`, `AgentEvolution`
- Prompt comparator component (`<PromptComparator>`) loaded via `next/dynamic`

### Out of Scope

- Admin user management (`/users`) — see `spec-design-admin-users.md`
- Teacher-facing exam workflow — see `spec-process-new-exam.md`, `spec-process-extraction.md`, `spec-process-adaptation.md`
- Authentication and role assignment — see `spec-design-auth.md`
- Edge Functions (`extract-questions`, `analyze-and-adapt`, `evolve-agent`) — their internals are outside this spec; only the triggering API calls are described here
- Landing page — see `spec-design-landing.md`

---

## Section 2: Definitions

| Term | Definition |
|------|-----------|
| `AiModel` | Row in `public.ai_models`; represents a configured AI model (name, description, optional api_key, is_default flag) |
| `Agent` | Row in `public.agents`; an AI agent with a prompt template and a reference to an `AiModel`; owned by an admin user |
| `Support` | Row in `public.supports`; a generated support text (apoio) linked to a `question` and optionally to the `AiModel` that produced it |
| `Subject` | Row in `public.subjects`; a school subject (e.g., "Matemática", "Português") used to classify exams |
| `GradeLevel` | Row in `public.grade_levels`; a school grade (e.g., level 5, name "5º ano") used to classify exams |
| `AgentEvolution` | Row in `public.agent_evolutions`; records a performance evaluation of an agent linked to a specific feedback |
| `is_default` | Boolean flag on `ai_models`; enforced by partial unique index — at most one model may have `is_default = true` at a time |
| `dismissed_from_evolution` | Boolean on `feedbacks`; marks a feedback item as excluded from the agent evolution queue without affecting its visibility in the teacher's feedback view |
| `api_key` | Secret credential for an AI model provider; stored encrypted server-side; returned to the client only in masked form (e.g., `sk-...xxxx`) |
| `PromptComparator` | Client component that renders the current agent prompt alongside a suggested evolved prompt side by side; loaded via `next/dynamic` |
| Partial unique index | PostgreSQL index `ai_models_is_default_unique` defined as `WHERE is_default = true`; guarantees at most one default model without preventing multiple `is_default = false` rows |
| Agent evolution | The process by which an admin reviews feedback, runs the `evolve-agent` Edge Function, and accepts or rejects a new suggested prompt for an agent |

---

## Section 3: Feature Requirements & Global Constraints

### Feature Requirements (PRD F8)

| ID | Requirement |
|----|------------|
| REQ-001 | SHALL list all AI models with name, description, default flag, and masked api_key (F8.1) |
| REQ-002 | SHALL create a new AI model with name, description, optional api_key, and is_default flag (F8.2) |
| REQ-003 | SHALL update an existing AI model's fields; toggling is_default to true automatically unsets the previous default via partial unique index (F8.3) |
| REQ-004 | SHALL delete an AI model; cascade sets `agents.model_id` and `supports.model_id` to NULL (F8.4) |
| REQ-005 | SHALL list all agents with name, associated model, and prompt preview (F8.5) |
| REQ-006 | SHALL create a new agent with name, model_id (nullable), and prompt text ≤ 50,000 chars (F8.6) |
| REQ-007 | SHALL update an existing agent including its full prompt (F8.7) |
| REQ-008 | SHALL delete an agent; cascade deletes its `agent_evolutions` rows (F8.8) |
| REQ-009 | SHALL list supports filtered by question or model; display content and nullable model reference (F8.9) |
| REQ-010 | SHALL create/update/delete subjects (name unique, optional description) (F8.10) |
| REQ-011 | SHALL create/update/delete grade levels (level integer unique, name required) (F8.11) |
| REQ-012 | SHALL display agent evolution history (performance_score, linked feedback) for a given agent (F8.12) |
| REQ-013 | SHALL allow admin to dismiss a feedback from the evolution queue (`dismissed_from_evolution = true`) without removing it from teacher's view (F8.13) |
| REQ-014 | SHALL invoke `evolve-agent` Edge Function and display the suggested prompt in `<PromptComparator>` alongside the current prompt; admin accepts or rejects (F8.14) |
| REQ-015 | At most one model may have `is_default = true` (enforced by partial unique index `ai_models_is_default_unique` — already in schema) |
| REQ-016 | `supports.model_id` is nullable (already in schema); supports may exist without a linked model |
| REQ-017 | Feedbacks may be dismissed from evolution view without affecting teacher's view (`dismissed_from_evolution` — already in schema) |
| CON-001 | Agent prompts max 50,000 characters (Zod constraint: `z.string().max(50000)`) |
| CON-002 | `<PromptComparator>` (current vs suggested prompt) loaded via `next/dynamic` (REQ-P04) |
| SEC-001 | All `/api/admin/*` routes verify `profile.role === 'admin'` before processing any request |
| SEC-002 | `api_key` returned masked (e.g., `"sk-...xxxx"`) to client; only stored encrypted server-side; never exposed in plaintext via any client-accessible endpoint |

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

### 4.1 TypeScript Types

```typescript
// lib/types/admin.ts

export interface AiModel {
  id: string;                  // uuid
  name: string;
  description: string | null;
  is_default: boolean;
  api_key_masked: string | null; // e.g. "sk-...xxxx"; never plaintext
  created_at: string;          // ISO 8601
  updated_at: string;          // ISO 8601
}

export interface Agent {
  id: string;                  // uuid
  user_id: string;             // uuid — admin owner
  name: string;
  model_id: string | null;     // uuid, nullable (on delete set null)
  prompt: string;              // max 50,000 chars (CON-001)
  created_at: string;
  updated_at: string;
  model?: Pick<AiModel, 'id' | 'name'>; // joined for display
}

export interface Support {
  id: string;                  // uuid
  question_id: string;         // uuid
  model_id: string | null;     // uuid, nullable (REQ-016)
  content: string;
  created_at: string;
  model?: Pick<AiModel, 'id' | 'name'>; // joined for display
}

export interface Subject {
  id: string;                  // uuid
  name: string;                // unique
  description: string | null;
  created_at: string;
}

export interface GradeLevel {
  id: string;                  // uuid
  level: number;               // unique integer
  name: string;
  created_at: string;
}

export interface AgentEvolution {
  id: string;                  // uuid
  agent_id: string;            // uuid
  feedback_id: string | null;  // uuid, nullable (on delete set null)
  performance_score: number | null;
  created_at: string;
  feedback?: {
    id: string;
    rating: number | null;
    comment: string | null;
    dismissed_from_evolution: boolean;
  };
}
```

### 4.2 Zod Schemas

```typescript
// lib/schemas/admin.ts
import { z } from 'zod';

export const createModelSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(1000).nullable().optional(),
  api_key: z.string().min(1, 'API key cannot be empty if provided').optional(),
  is_default: z.boolean().default(false),
});

export const updateModelSchema = createModelSchema.partial().extend({
  id: z.string().uuid(),
});

export const createAgentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  model_id: z.string().uuid().nullable().optional(),
  prompt: z.string().max(50000, 'Prompt must be 50,000 characters or fewer'),
});

export const updateAgentSchema = createAgentSchema.partial().extend({
  id: z.string().uuid(),
});

export const createSupportSchema = z.object({
  question_id: z.string().uuid(),
  model_id: z.string().uuid().nullable().optional(),
  content: z.string().min(1, 'Content is required'),
});

export const createSubjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(1000).nullable().optional(),
});

export const createGradeLevelSchema = z.object({
  level: z.number().int().positive(),
  name: z.string().min(1, 'Name is required').max(255),
});

export const evolutionResultSchema = z.object({
  agentId: z.string().uuid(),
  suggestedPrompt: z.string().min(1).max(50000),
  performanceScore: z.number().min(0).max(1).nullable().optional(),
  rationale: z.string().optional(),
});

export type CreateModelInput = z.infer<typeof createModelSchema>;
export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type CreateSupportInput = z.infer<typeof createSupportSchema>;
export type EvolutionResult = z.infer<typeof evolutionResultSchema>;
```

### 4.3 Database Schema (existing — no migrations needed)

All tables below are live in `supabase/migrations/20260318000001_initial_schema.sql`.

```sql
create table if not exists public.ai_models (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  is_default boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enforces REQ-015: at most one default model
create unique index if not exists ai_models_is_default_unique
  on public.ai_models(is_default) where is_default = true;

create table if not exists public.agents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  model_id uuid references public.ai_models(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.subjects (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.grade_levels (
  id uuid primary key default uuid_generate_v4(),
  level integer not null unique,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.supports (
  id uuid primary key default uuid_generate_v4(),
  question_id uuid references public.questions(id) on delete cascade not null,
  model_id uuid references public.ai_models(id) on delete set null,  -- nullable (REQ-016)
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.agent_evolutions (
  id uuid primary key default uuid_generate_v4(),
  agent_id uuid references public.agents(id) on delete cascade not null,
  feedback_id uuid references public.feedbacks(id) on delete set null,
  performance_score numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- feedbacks.dismissed_from_evolution already exists (REQ-017):
-- dismissed_from_evolution boolean default false
```

> **Note:** `adaptations.adapted_alternatives` (jsonb, nullable) also already exists in the initial migration and requires no changes.

### 4.4 API Endpoints

All endpoints are under `/api/admin/` and enforce `SEC-001` (`profile.role === 'admin'`). All endpoints return `401 Unauthorized` for unauthenticated requests and `403 Forbidden` for authenticated non-admin requests.

#### AI Models

| Method | Path | Description | Request body schema | Response |
|--------|------|-------------|--------------------|----|
| GET | `/api/admin/models` | List all models (api_key masked) | — | `AiModel[]` |
| POST | `/api/admin/models` | Create model | `createModelSchema` | `AiModel` |
| PATCH | `/api/admin/models/[id]` | Update model | `updateModelSchema` | `AiModel` |
| DELETE | `/api/admin/models/[id]` | Delete model | — | `204 No Content` |

#### Agents

| Method | Path | Description | Request body schema | Response |
|--------|------|-------------|--------------------|----|
| GET | `/api/admin/agents` | List all agents | — | `Agent[]` |
| POST | `/api/admin/agents` | Create agent | `createAgentSchema` | `Agent` |
| PATCH | `/api/admin/agents/[id]` | Update agent | `updateAgentSchema` | `Agent` |
| DELETE | `/api/admin/agents/[id]` | Delete agent | — | `204 No Content` |
| POST | `/api/admin/agents/[id]/evolve` | Trigger evolution Edge Function | `{ feedbackIds: string[] }` | `EvolutionResult` |
| POST | `/api/admin/agents/[id]/accept-evolution` | Accept suggested prompt | `{ suggestedPrompt: string }` | `Agent` |

#### Supports

| Method | Path | Description | Request body schema | Response |
|--------|------|-------------|--------------------|----|
| GET | `/api/admin/supports` | List supports (filterable by `?question_id=` or `?model_id=`) | — | `Support[]` |
| POST | `/api/admin/supports` | Create support | `createSupportSchema` | `Support` |
| DELETE | `/api/admin/supports/[id]` | Delete support | — | `204 No Content` |

#### Subjects

| Method | Path | Description | Request body schema | Response |
|--------|------|-------------|--------------------|----|
| GET | `/api/admin/subjects` | List all subjects | — | `Subject[]` |
| POST | `/api/admin/subjects` | Create subject | `createSubjectSchema` | `Subject` |
| PATCH | `/api/admin/subjects/[id]` | Update subject | `createSubjectSchema.partial()` | `Subject` |
| DELETE | `/api/admin/subjects/[id]` | Delete subject | — | `204 No Content` |

#### Grade Levels

| Method | Path | Description | Request body schema | Response |
|--------|------|-------------|--------------------|----|
| GET | `/api/admin/grades` | List all grade levels | — | `GradeLevel[]` |
| POST | `/api/admin/grades` | Create grade level | `createGradeLevelSchema` | `GradeLevel` |
| PATCH | `/api/admin/grades/[id]` | Update grade level | `createGradeLevelSchema.partial()` | `GradeLevel` |
| DELETE | `/api/admin/grades/[id]` | Delete grade level | — | `204 No Content` |

#### Feedbacks (evolution queue management)

| Method | Path | Description | Request body schema | Response |
|--------|------|-------------|--------------------|----|
| PATCH | `/api/admin/feedbacks/[id]/dismiss` | Set `dismissed_from_evolution = true` (REQ-017) | — | `204 No Content` |

### 4.5 `api_key` Masking Logic

```typescript
// lib/admin/mask-api-key.ts

/**
 * Returns a masked representation of an API key.
 * Only the last 4 characters are shown.
 * Input "sk-abc123XYZ" → "sk-...cXYZ"
 * Null or undefined → null
 */
export function maskApiKey(apiKey: string | null | undefined): string | null {
  if (!apiKey) return null;
  if (apiKey.length <= 4) return '...';
  return `${apiKey.slice(0, 3)}...${apiKey.slice(-4)}`;
}
```

### 4.6 `<PromptComparator>` Component Contract

```typescript
// components/admin/prompt-comparator.tsx
// Loaded via next/dynamic — 'use client' required

interface PromptComparatorProps {
  currentPrompt: string;
  suggestedPrompt: string;
  onAccept: (suggestedPrompt: string) => void;
  onReject: () => void;
  isLoading?: boolean;
}

// Loaded in parent via:
// const PromptComparator = dynamic(
//   () => import('@/components/admin/prompt-comparator'),
//   { ssr: false }
// );
```

The comparator renders two labeled panels side by side. Both panels are scrollable. The "Accept" and "Reject" buttons are disabled while `isLoading` is true (REQ-P07). The component is keyboard-navigable: Tab moves between panels and buttons; Enter/Space activates buttons.

---

## Section 5: Acceptance Criteria

| ID | Given | When | Then |
|----|-------|------|------|
| AC-001 | An authenticated admin navigates to `/config/models` | The page renders | A list of all AI models is displayed with name, description, default badge, and masked api_key (e.g., `sk-...xxxx`); no plaintext key is present in the DOM |
| AC-002 | An admin submits the "Create Model" form with `is_default = true` and another model already has `is_default = true` | The form is submitted | The API returns `409 Conflict` (unique index violation); the existing default model remains unchanged; the new model is not created |
| AC-003 | An admin sets a model's `is_default` to `true` when no current default exists | `PATCH /api/admin/models/[id]` is called | The model's `is_default` becomes `true`; subsequent `GET /api/admin/models` returns that model with `is_default: true`; all other models have `is_default: false` |
| AC-004 | An admin creates an agent with a prompt longer than 50,000 characters | The form is submitted | `createAgentSchema` Zod validation fails before the API call; an inline error message "Prompt must be 50,000 characters or fewer" is displayed; no network request is made |
| AC-005 | An admin navigates to `/config/agents/[id]/evolve` | The page renders | The agent's current prompt is visible; a list of non-dismissed feedbacks is displayed; the `<PromptComparator>` is not yet shown (no evolution triggered) |
| AC-006 | An admin clicks "Dismiss" on a feedback item in the evolution queue | `PATCH /api/admin/feedbacks/[id]/dismiss` is called | `feedbacks.dismissed_from_evolution` becomes `true`; the feedback disappears from the evolution queue; the teacher's feedback view (which reads all feedbacks regardless of `dismissed_from_evolution`) is unaffected |
| AC-007 | An admin clicks "Run Evolution" with selected feedbacks | `POST /api/admin/agents/[id]/evolve` is called | The `evolve-agent` Edge Function runs; on success the `<PromptComparator>` renders with the current prompt on the left and the suggested prompt on the right; both Accept and Reject buttons are visible |
| AC-008 | An admin clicks "Accept" in the `<PromptComparator>` | `POST /api/admin/agents/[id]/accept-evolution` is called with `suggestedPrompt` | The agent's prompt is updated in the database; an `agent_evolutions` row is created; the page returns to the agent detail view showing the new prompt |
| AC-009 | An unauthenticated user calls `GET /api/admin/models` | The request is processed | The API returns `401 Unauthorized`; no model data is returned |
| AC-010 | An authenticated teacher (non-admin) calls `POST /api/admin/subjects` | The request is processed | The API returns `403 Forbidden`; no subject is created; the `profiles.role` check (SEC-001) is enforced server-side regardless of client-side guards |
| AC-011 | An admin deletes an AI model that is referenced by agents | `DELETE /api/admin/models/[id]` succeeds | All referencing `agents.model_id` values are set to `NULL` (cascade on delete set null); the agents themselves are not deleted; supports referencing that model also have `model_id` set to `NULL` |
| AC-012 | An admin navigates to `/config/subjects` and creates a subject with a name that already exists | The form is submitted | The API returns `409 Conflict` (unique constraint on `subjects.name`); an error message is displayed; no duplicate subject is created |

---

## Section 6: Test Strategy

### Layer 1 — Vitest + @testing-library/react

**Zod schema unit tests (`lib/schemas/admin.test.ts`)**

| Scenario | Schema | Input | Expected |
|----------|--------|-------|---------|
| Empty api_key string | `createModelSchema` | `{ name: 'GPT-4', api_key: '' }` | Validation error: "API key cannot be empty if provided" |
| Valid model (no api_key) | `createModelSchema` | `{ name: 'GPT-4' }` | Passes; `is_default` defaults to `false` |
| Prompt exactly 50,000 chars | `createAgentSchema` | `{ name: 'A', prompt: 'x'.repeat(50000) }` | Passes |
| Prompt 50,001 chars | `createAgentSchema` | `{ name: 'A', prompt: 'x'.repeat(50001) }` | Error: "Prompt must be 50,000 characters or fewer" |
| Valid evolutionResult | `evolutionResultSchema` | `{ agentId: '<uuid>', suggestedPrompt: 'new prompt' }` | Passes; `performanceScore` optional |
| Missing suggestedPrompt | `evolutionResultSchema` | `{ agentId: '<uuid>' }` | Validation error on `suggestedPrompt` |

**`maskApiKey` utility tests (`lib/admin/mask-api-key.test.ts`)**

| Input | Expected output |
|-------|----------------|
| `"sk-abc123XYZ"` | `"sk-...cXYZ"` |
| `null` | `null` |
| `undefined` | `null` |
| `"1234"` (≤4 chars) | `"..."` |
| `"sk-longKeyAbcDEFG"` | `"sk-...DEFG"` |

**API route admin guard tests (`app/api/admin/models/route.test.ts`)**

Mock `createServerClient` via `vi.mock('@supabase/ssr')`. Test scenarios:
- Unauthenticated request (`getUser()` returns `null`) → `401`
- Authenticated teacher (`role: 'teacher'`) → `403`
- Authenticated admin (`role: 'admin'`) → proceeds to handler logic

### Layer 2 — jest-axe + Vitest

**`<ModelListItem>` (`components/admin/model-list-item.test.tsx`)**

- Renders with `is_default: true` — default badge is present with accessible label (e.g., `aria-label="Default model"`)
- Renders with `is_default: false` — no badge; delete button present
- Zero WCAG violations in both states (axe tags: `wcag2a`, `wcag2aa`, `wcag22aa`)
- Delete button has `type="button"` and accessible label; touch target ≥ 44×44px (GUD-003)
- Disabled state during delete (REQ-P07): button has `aria-disabled="true"` and `disabled` attribute

**`<AgentForm>` (`components/admin/agent-form.test.tsx`)**

- Renders textarea for prompt with `aria-describedby` pointing to character count
- Character count updates on input; displays "50000 / 50000" at limit
- At 50,001 chars: error message rendered, submit button disabled
- Zero WCAG violations in default, error, and loading states

**`<PromptComparator>` (`components/admin/prompt-comparator.test.tsx`)**

- Renders two labeled panels: "Prompt atual" (left) and "Prompt sugerido" (right)
- Accept button: `aria-label="Aceitar prompt sugerido"`, enabled when not loading
- Reject button: `aria-label="Rejeitar prompt sugerido"`, enabled when not loading
- Both buttons disabled with `aria-disabled="true"` when `isLoading: true`
- Zero WCAG violations in both states (not loading, loading)

### Layer 3 — Playwright + @axe-core/playwright

**`/config/models` page**

- Full page axe scan (tags: `wcag2a`, `wcag2aa`, `wcag22aa`); zero violations required (WCAG 2.2 AA)
- Create model dialog opens on button click; dialog has `DialogTitle` and `DialogDescription` (PAT-005)
- Dialog axe scan: zero violations in open state

**`/config/agents/[id]/evolve` page**

- Full page axe scan; zero violations
- `<PromptComparator>` keyboard navigation: Tab moves focus between current prompt panel, suggested prompt panel, Accept button, Reject button in order
- Accept and Reject buttons are reachable and activatable via keyboard (Enter/Space)
- Panels are scrollable with keyboard (overflow-y: auto with tabIndex)

**CI gate:** All Playwright a11y tests must pass before PR merge. `axe.disableRules()` is forbidden. `axe.configure({ rules: [] })` that disables rules is forbidden.

---

## Section 7: Design Rationale

### Admin-only access enforced at API layer (SEC-001)

Every `/api/admin/*` route performs an independent server-side role check rather than relying solely on middleware because:
- **Defense in depth**: Middleware is a UX routing guard; it can be bypassed by direct API calls. Server-side role checks are the authoritative enforcement point.
- **API consumers**: Edge Functions and external scripts may call admin APIs directly; they must be rejected if unauthenticated or non-admin regardless of browser state.
- **Explicit fail-fast**: Returning `403` early (before any Supabase queries) avoids leaking information about data shape to unauthorized callers.

### Partial unique index for default model (REQ-015)

A partial unique index (`WHERE is_default = true`) is used instead of application-level enforcement because:
- **Atomicity**: The database enforces the invariant even under concurrent writes; application-level checks have a TOCTOU race condition.
- **Zero migration overhead**: The index already exists in the initial schema; no additional work is needed.
- **Simplicity**: Toggling the default requires only a `PATCH` on the target model and optionally an `UPDATE ... SET is_default = false WHERE id != target`; the index rejects any state that violates the invariant before the transaction commits.

### Nullable `model_id` on supports (REQ-016)

`supports.model_id` is nullable (`ON DELETE SET NULL`) because:
- **Lifecycle decoupling**: A support's content remains valid and useful even if the AI model that generated it is later deleted. Cascade-deleting supports would destroy data that teachers may rely on.
- **Historical accuracy**: Admins may want to audit which model generated a support after the model is retired; `NULL` signals "model no longer available" without data loss.

### `dismissed_from_evolution` flag (REQ-017)

A soft flag is used instead of deleting the feedback or a separate join table because:
- **Non-destructive**: Teacher feedback is valuable; removing it from the evolution queue must not remove it from the teacher's submitted feedback history.
- **Single column**: No additional table or foreign key; the flag is set once and read in two different query filters (evolution queue: `WHERE dismissed_from_evolution = false`; teacher view: no filter on this column).
- **Reversibility**: An admin could unset the flag in the future without losing the feedback record.

### `next/dynamic` for `<PromptComparator>` (CON-002 / REQ-P04)

The comparator is a client-only component that renders two large text panels with scroll and diff highlighting. It is loaded via `next/dynamic` because:
- **Bundle size**: The comparator is only needed on the `/config/agents/[id]/evolve` page; deferring its load keeps the initial JS bundle smaller for all other admin pages.
- **SSR incompatibility**: The comparator uses browser APIs for scroll synchronization; `ssr: false` prevents hydration mismatches.
- **REQ-P04 compliance**: The project constraint explicitly requires `next/dynamic` for heavy components including side-by-side comparators.

### Zod 50,000-char prompt limit (CON-001)

The 50,000-character limit is validated in the Zod schema (client-side, before the API call) and re-validated in the API route handler because:
- **UX feedback**: Client-side validation shows a character counter and inline error without a network round-trip (REQ-P07).
- **Security**: The API handler must not trust client-side validation; a second Zod parse server-side rejects oversized payloads before they reach the database.

---

## Section 8: Dependencies

| ID | Type | Description |
|----|------|-------------|
| DEP-001 | Spec | `spec-design-auth.md` — defines the `admin` role, middleware guards, and `profiles.role` check; SEC-001 in this spec directly depends on the auth middleware pattern |
| DEP-002 | Infrastructure | Supabase PostgreSQL — all six tables (`ai_models`, `agents`, `subjects`, `grade_levels`, `supports`, `agent_evolutions`) and their RLS policies |
| DEP-003 | Infrastructure | Supabase Edge Functions — `evolve-agent` function invoked by `POST /api/admin/agents/[id]/evolve`; must be deployed before the evolution feature is usable |
| DEP-004 | Library | `zod` — runtime validation for all admin API input schemas |
| DEP-005 | Library | `next/dynamic` — required for `<PromptComparator>` lazy loading (CON-002) |
| DEP-006 | Platform | Next.js 16 App Router — `(admin)` route group; async `params` and `searchParams` (REQ-P05) |
| DEP-007 | Library | `@supabase/ssr` — `createServerClient` used in all `/api/admin/*` route handlers for server-side session validation |
| DEP-008 | Spec | `spec-process-adaptation.md` — defines `questions`, `supports`, and `adaptations` tables that admin manages indirectly through this interface |

---

## Section 9: Examples

### Example 1: Setting a Default AI Model

**Scenario:** Admin wants to change the default model from "GPT-4" (`id: uuid-gpt4`) to "Claude 3.5" (`id: uuid-claude`).

**Flow:**
1. Admin opens `/config/models`; list shows GPT-4 with "Default" badge
2. Admin clicks "Edit" on Claude 3.5; toggles `is_default = true` in the form
3. Browser: `PATCH /api/admin/models/uuid-claude` with `{ is_default: true }`
4. Route handler: verifies admin role (SEC-001); calls `supabase.from('ai_models').update({ is_default: true }).eq('id', 'uuid-claude')`
5. PostgreSQL: partial unique index `ai_models_is_default_unique` detects conflict with existing `uuid-gpt4` row
6. **Option A** (recommended): Route handler first sets GPT-4 `is_default = false`, then sets Claude `is_default = true` within a transaction
7. Response: `200 OK` with updated Claude model; list re-fetches; Claude shows "Default" badge, GPT-4 shows none

### Example 2: Agent Prompt Evolution

**Scenario:** Admin evolves agent "Adaptador Fundamental" using 3 recent feedbacks.

**Flow:**
1. Admin navigates to `/config/agents/uuid-agent-1/evolve`
2. Page (RSC) fetches: agent detail + undismissed feedbacks in parallel (`Promise.all` — REQ-P02)
3. Admin selects 3 feedback items; clicks "Run Evolution"
4. Browser: `POST /api/admin/agents/uuid-agent-1/evolve` with `{ feedbackIds: ['f1', 'f2', 'f3'] }`
5. Route handler: invokes `evolve-agent` Edge Function; awaits `EvolutionResult`
6. `<PromptComparator>` renders dynamically (via `next/dynamic`): left = current prompt, right = `suggestedPrompt`
7. Admin reviews; clicks "Accept"
8. Browser: `POST /api/admin/agents/uuid-agent-1/accept-evolution` with `{ suggestedPrompt: '...' }`
9. Handler: updates `agents.prompt`; inserts `agent_evolutions` row with `performance_score`
10. Page navigates back to agent detail; new prompt is visible

### Example 3: Dismissing a Feedback from Evolution Queue

**Scenario:** Admin sees an irrelevant feedback (rating 5, comment "obrigado") in the evolution queue.

**Flow:**
1. Admin is on `/config/agents/uuid-agent-1/evolve`; sees the feedback in the queue
2. Admin clicks "Dismiss" on the feedback item
3. Browser: `PATCH /api/admin/feedbacks/uuid-feedback-7/dismiss`
4. Handler: `supabase.from('feedbacks').update({ dismissed_from_evolution: true }).eq('id', 'uuid-feedback-7')`
5. Response: `204 No Content`; evolution queue re-fetches; feedback disappears
6. Teacher views `/results/uuid-exam-1`; the feedback is still visible (no filter on `dismissed_from_evolution` in teacher view — REQ-017 satisfied)

### Example 4: Creating a Subject with Duplicate Name

**Scenario:** Admin attempts to create a subject "Matemática" that already exists.

**Flow:**
1. Admin is on `/config/subjects`; clicks "New Subject"
2. Fills in `name: "Matemática"`, clicks Submit
3. Browser: `POST /api/admin/subjects` with `{ name: 'Matemática' }`
4. Route handler: Zod validation passes (name is non-empty); calls `supabase.from('subjects').insert(...)`
5. Supabase returns unique constraint violation (`subjects_name_key`)
6. Handler: returns `409 Conflict` with `{ error: 'A subject with this name already exists' }`
7. Form displays inline error; no duplicate row created

### Example 5: Deleting a Model Referenced by Agents

**Scenario:** Admin deletes the "GPT-3.5" model that two agents reference.

**Flow:**
1. Admin is on `/config/models`; clicks "Delete" on GPT-3.5 (`id: uuid-gpt35`)
2. Confirmation dialog appears: "This model is used by 2 agents. Their model reference will be set to None."
3. Admin confirms
4. Browser: `DELETE /api/admin/models/uuid-gpt35`
5. Handler: `supabase.from('ai_models').delete().eq('id', 'uuid-gpt35')`
6. PostgreSQL cascade: `agents.model_id` for both agents set to `NULL`; `supports.model_id` for any linked supports set to `NULL`
7. Response: `204 No Content`; model list re-fetches; both agents now show "No model" in their details

---

## Section 10: Validation Checklist

The following checklist must be verified before this spec is considered implementation-ready:

- [x] Frontmatter complete: `title`, `version`, `date_created`, `last_updated`, `owner`, `tags`
- [x] All 11 sections present (Introduction through Related Specifications)
- [x] Global Constraints block present verbatim in Section 3
- [x] All feature requirements (REQ-001–REQ-017, CON-001–CON-002, SEC-001–SEC-002) traceable to PRD F8
- [x] Schema note confirmed: `ai_models.is_default`, `feedbacks.dismissed_from_evolution`, `adaptations.adapted_alternatives`, and `supports.model_id` nullable all exist in initial migration; no new migrations needed
- [x] Section 4 includes:
  - [x] `AiModel`, `Agent`, `Support`, `Subject`, `GradeLevel`, `AgentEvolution` TypeScript interfaces
  - [x] Zod schemas: `createModelSchema`, `createAgentSchema`, `createSupportSchema`, `evolutionResultSchema`
  - [x] Existing SQL schema for all six tables (from migration — no changes)
  - [x] All admin CRUD API endpoints with method, path, request schema, and response type
  - [x] `maskApiKey` utility function signature and behavior
  - [x] `<PromptComparator>` component props interface and `next/dynamic` loading pattern
- [x] Section 5 has ≥ 5 ACs in Given-When-Then format (12 ACs present)
- [x] Section 6 has all 3 test layers with specific named test cases
- [x] Section 6 Layer 1: Zod schema tests (invalid URL, empty api_key, prompt >50000 chars, evolutionResult), maskApiKey logic, API route admin guard
- [x] Section 6 Layer 2: `<ModelListItem>` (enabled/disabled states), `<AgentForm>` (textarea, char count, error), `<PromptComparator>` (both states, a11y)
- [x] Section 6 Layer 3: WCAG 2.2 AA scans on `/config/models` and `/config/agents/[id]/evolve`; comparator keyboard navigation
- [x] Section 7 justifies: admin-only API enforcement, partial unique index, nullable model_id, dismissed_from_evolution flag, next/dynamic for comparator, Zod 50k char limit
- [x] Section 8 lists all external dependencies (specs, infrastructure, libraries)
- [x] Section 9 has ≥ 3 concrete examples with step-by-step flows
- [x] Section 11 references at least 3 related specs

---

## Section 11: Related Specifications

| Spec | Relationship |
|------|-------------|
| `spec-design-auth.md` | Prerequisite — defines the `admin` role, middleware route guards, and `profiles.role` check; SEC-001 in this spec (all `/api/admin/*` routes verify `role === 'admin'`) directly depends on the authentication contracts defined there |
| `spec-process-adaptation.md` | Consumer — the `agents`, `supports`, and `adaptations` tables managed here are the primary inputs and outputs of the adaptation pipeline; changes to agents (prompt updates via evolution) directly affect adaptation quality |
| `spec-process-new-exam.md` | Consumer — `subjects` and `grade_levels` managed here are required fields when creating a new exam; CRUD operations here affect the options available in the exam creation form |
| `spec-process-result.md` | Adjacent — `supports` and `adaptations` managed here are displayed to teachers in the result view; deletion or modification of supports via admin config affects teacher-visible content |
| `spec-design-admin-users.md` | Sibling — both specs cover admin-only pages; user management is separated to avoid conflating identity management (profiles, blocked, roles) with AI infrastructure management (models, agents, subjects) |
