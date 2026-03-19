---
title: Admin User Management (F9)
version: 1.0
date_created: 2026-03-18
last_updated: 2026-03-18
owner: PRISMA Team
tags: [design, admin, users, profiles, blocked, roles, rls, moderation]
---

# Introduction

This specification defines the admin user management interface for the PRISMA ("Adapte Minha Prova") platform. It covers listing all registered users, viewing their profile details, and toggling the blocked status via a confirmation-gated action. All routes described here are gated by `profiles.role = 'admin'` as defined in `spec-design-auth.md`. The feature relies entirely on the `profiles` table and RLS policies introduced in that spec — no new database tables are required.

---

## Section 1: Purpose & Scope

### Purpose

This document specifies the admin user management page at `/users`. It defines the data contracts, API surface, UI components, acceptance criteria, and test strategy for viewing and moderating user accounts as described in PRD F9.

### In Scope

- `/users` — paginated list of all registered users with name, email, role, blocked status, and registration date
- `<UserListItem>` — individual row component displaying user data and a block/unblock toggle
- `<BlockConfirmDialog>` — confirmation dialog shown before executing a block or unblock action
- `GET /api/admin/users` — returns all profiles for display
- `PATCH /api/admin/users/[id]` — updates `profiles.blocked` for the target user
- Zod schema `updateUserSchema` — validates the PATCH request body
- TypeScript type `UserManagementProfile` — extends `Profile` for display purposes
- Self-block guard in the route handler (SEC-002)
- RLS policy: `Admins can update any profile`

### Out of Scope

- User deletion — explicitly excluded from MVP (CON-001)
- Role assignment via UI — admin roles are assigned manually in the database (per `spec-design-auth.md` REQ-002)
- Password management — not applicable; Google OAuth only (per `spec-design-auth.md` CON-001)
- Admin configuration pages (`/config/*`) — see `spec-design-admin-config.md`
- Authentication and role model — see `spec-design-auth.md`
- Teacher-facing exam workflow — see `spec-process-new-exam.md`

---

## Section 2: Definitions

| Term | Definition |
|------|-----------|
| `Profile` | Row in `public.profiles`; the canonical user record with id, full_name, email, avatar_url, role, blocked, and created_at; defined in `spec-design-auth.md` Section 4.1 |
| `UserRole` | Union type `"teacher" \| "admin"` as defined in `lib/types/auth.ts`; see `spec-design-auth.md` |
| Blocked user | A user with `profiles.blocked = true`; denied access to all `(auth)` and `(admin)` routes; redirected to `/blocked` |
| Block action | Mutation that sets `profiles.blocked = true` for a target user |
| Unblock action | Mutation that sets `profiles.blocked = false` for a target user |
| Self-block | An admin attempting to set `blocked = true` on their own profile; forbidden (SEC-002) |
| `<UserListItem>` | React component rendering a single user row in the `/users` list |
| `<BlockConfirmDialog>` | Radix UI Dialog component that presents a confirmation prompt before executing block or unblock |
| `updateUserSchema` | Zod schema validating the body of `PATCH /api/admin/users/[id]` |
| RLS | Row Level Security — PostgreSQL policy that controls which rows a client can read or write based on `auth.uid()` |

---

## Section 3: Feature Requirements & Global Constraints

### Feature Requirements (PRD F9)

| ID | Requirement |
|----|------------|
| REQ-001 | SHALL list all registered users with full_name, email, role, blocked status, and created_at (F9.1) |
| REQ-002 | SHALL provide a toggle to block/unblock a user — updates `profiles.blocked` (F9.2) |
| REQ-003 | Block action SHALL require a confirmation dialog before executing |
| SEC-001 | `PATCH /api/admin/users/[id]` verifies `profile.role === 'admin'` before processing |
| SEC-002 | Admin cannot block themselves — route handler returns `403` if current user ID equals target ID |
| CON-001 | No user deletion in MVP — block only |

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
// lib/types/auth.ts (already defined in spec-design-auth)

export type UserRole = 'teacher' | 'admin';

export interface Profile {
  id: string;               // uuid — matches auth.users.id
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: UserRole;
  blocked: boolean;
  created_at: string;       // ISO 8601 timestamp
}
```

```typescript
// lib/types/admin-users.ts

import type { Profile } from '@/lib/types/auth';

/**
 * Profile shape used by the /users admin page.
 * Extends Profile with a display-friendly label for role.
 */
export type UserManagementProfile = Profile;

/**
 * Body accepted by PATCH /api/admin/users/[id]
 */
export interface UpdateUserBody {
  blocked: boolean;
}
```

### 4.2 Zod Schema

```typescript
// lib/schemas/admin-users.ts
import { z } from 'zod';

export const updateUserSchema = z.object({
  blocked: z.boolean({ required_error: 'blocked must be a boolean' }),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
```

### 4.3 API Endpoints

All endpoints enforce `SEC-001` (`profile.role === 'admin'`). Unauthenticated requests receive `401 Unauthorized`; authenticated non-admin requests receive `403 Forbidden`.

| Method | Path | Description | Request body | Response |
|--------|------|-------------|-------------|---------|
| GET | `/api/admin/users` | List all profiles ordered by `created_at` desc | — | `Profile[]` |
| PATCH | `/api/admin/users/[id]` | Update `profiles.blocked` for target user | `updateUserSchema` (`{ blocked: boolean }`) | `{ ok: true }` |

**PATCH `/api/admin/users/[id]` — additional guards:**

| Condition | HTTP status |
|-----------|------------|
| Unauthenticated | `401 Unauthorized` |
| Authenticated, `role !== 'admin'` | `403 Forbidden` |
| `id` equals current user's ID (self-block attempt) | `403 Forbidden` with body `{ error: 'Admins cannot block themselves' }` |
| `blocked` field missing or not boolean | `400 Bad Request` with Zod error details |
| Target profile not found | `404 Not Found` |

### 4.4 Database Schema (existing — from spec-design-auth)

The `profiles` table is already live in `supabase/migrations/20260318000001_initial_schema.sql`. No new migrations are required for this feature.

```sql
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  full_name text,
  role text default 'user' check (role in ('user', 'admin', 'teacher')),
  blocked boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

> **Note:** The target schema migration (renaming `'user'` default to `'teacher'`, adding `avatar_url`) is defined in `spec-design-auth.md` Section 4.3. This feature depends on that migration being applied to display the correct role values.

### 4.5 RLS Policies

**Existing policies** (from `spec-design-auth.md`):

```sql
-- Teachers read only their own profile
create policy "Users can view their own profile" on public.profiles
  for select using (auth.uid() = id);

-- Admins read all profiles
create policy "Admins can view all profiles" on public.profiles
  for select using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );
```

**Required new policy** (new migration needed):

```sql
-- Admins can update any profile (required for block/unblock — F9.2)
create policy "Admins can update any profile" on public.profiles
  for update using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );
```

> **Migration note:** The `"Admins can update any profile"` RLS policy does not exist in the initial schema. A new file must be created in `supabase/migrations/` before `PATCH /api/admin/users/[id]` can succeed.

### 4.6 Component Contracts

```typescript
// components/admin/user-list-item.tsx

interface UserListItemProps {
  user: UserManagementProfile;
  currentUserId: string;        // logged-in admin's ID — used to disable self-block toggle
  onBlockToggle: (userId: string, blocked: boolean) => void;
  isLoading?: boolean;          // disables toggle while PATCH is in-flight (REQ-P07)
}
```

```typescript
// components/admin/block-confirm-dialog.tsx

interface BlockConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string | null;
  action: 'block' | 'unblock';
  onConfirm: () => void;
  isLoading?: boolean;
}

// DialogTitle and DialogDescription are required (PAT-005)
// Example:
//   <DialogTitle>Bloquear usuário</DialogTitle>
//   <DialogDescription>
//     Tem certeza que deseja bloquear {userName}? O usuário perderá
//     acesso imediato à plataforma.
//   </DialogDescription>
```

---

## Section 5: Acceptance Criteria

| ID | Given | When | Then |
|----|-------|------|------|
| AC-001 | An authenticated admin navigates to `/users` | The page renders | A list of all registered users is displayed with full_name, email, role, blocked status indicator, and created_at date for each user; the list is ordered newest first |
| AC-002 | An admin clicks the "Block" toggle on a non-blocked user | The toggle is clicked | A confirmation dialog (`<BlockConfirmDialog>`) opens with the user's name, an accessible title, and a description explaining the consequence; no PATCH request is made yet |
| AC-003 | An admin confirms the block action in the dialog | The "Confirm" button in `<BlockConfirmDialog>` is clicked | `PATCH /api/admin/users/[id]` is called with `{ blocked: true }`; on `{ ok: true }` the user's row updates to show a "Blocked" status; the dialog closes; the toggle is re-enabled |
| AC-004 | An admin attempts to block themselves via the UI | The toggle for the logged-in admin's own row is present | The toggle is disabled (`aria-disabled="true"`, `disabled` attribute) and a tooltip or accessible label explains that admins cannot block themselves; no API call is made |
| AC-005 | An unauthenticated caller sends `PATCH /api/admin/users/[id]` with `{ blocked: true }` | The request is processed | The API returns `401 Unauthorized`; `profiles.blocked` is not changed |
| AC-006 | An authenticated teacher (non-admin) sends `PATCH /api/admin/users/[id]` | The request is processed | The API returns `403 Forbidden`; the RLS policy `"Admins can update any profile"` prevents the write; `profiles.blocked` is unchanged |
| AC-007 | An admin sends `PATCH /api/admin/users/[id]` where `[id]` equals their own profile ID | The request reaches the route handler | The handler detects the self-block attempt (SEC-002) and returns `403 Forbidden` with `{ error: 'Admins cannot block themselves' }` before touching the database |
| AC-008 | An admin sends `PATCH /api/admin/users/[id]` with body `{ blocked: "yes" }` | The request reaches the route handler | `updateUserSchema` Zod validation fails; the handler returns `400 Bad Request` with validation error details; no database write occurs |
| AC-009 | An admin successfully unblocks a previously blocked user | `PATCH /api/admin/users/[id]` is called with `{ blocked: false }` | `profiles.blocked` is set to `false`; the user can log in again and is no longer redirected to `/blocked` by middleware |
| AC-010 | An admin navigates to `/users` while the page loads | The Suspense boundary is active | A loading skeleton is rendered; no layout shift occurs when the user list arrives; the page is accessible (no aria violations) during loading state |

---

## Section 6: Test Strategy

### Layer 1 — Vitest + @testing-library/react

**`updateUserSchema` unit tests (`lib/schemas/admin-users.test.ts`)**

| Scenario | Input | Expected |
|----------|-------|---------|
| Valid block | `{ blocked: true }` | Passes; `blocked` is `true` |
| Valid unblock | `{ blocked: false }` | Passes; `blocked` is `false` |
| `blocked` is a string | `{ blocked: "true" }` | Zod error: `blocked` must be a boolean |
| `blocked` is missing | `{}` | Zod error: "blocked must be a boolean" |
| `blocked` is null | `{ blocked: null }` | Zod error: `blocked` must be a boolean |

**Self-block guard tests (`app/api/admin/users/[id]/route.test.ts`)**

Mock `createServerClient` from `@supabase/ssr` via `vi.mock()`. Test scenarios:

| Scenario | Current user ID | Target ID | Expected |
|----------|----------------|-----------|---------|
| Admin blocks another user | `uuid-admin-1` | `uuid-teacher-1` | Proceeds to database update; returns `{ ok: true }` |
| Admin blocks themselves | `uuid-admin-1` | `uuid-admin-1` | Returns `403` with `{ error: 'Admins cannot block themselves' }` (SEC-002) |
| Unauthenticated request | `null` | `uuid-teacher-1` | Returns `401 Unauthorized` |
| Non-admin user | `uuid-teacher-1` (role: `teacher`) | `uuid-teacher-2` | Returns `403 Forbidden` (SEC-001) |
| `blocked` field not boolean | `uuid-admin-1` | `uuid-teacher-1` | Returns `400 Bad Request` with Zod error |

### Layer 2 — jest-axe + Vitest

**`<UserListItem>` (`components/admin/user-list-item.test.tsx`)**

- Renders with `blocked: false` — shows "Active" status indicator; toggle button has accessible label "Bloquear usuário [name]"
- Renders with `blocked: true` — shows "Blocked" status indicator; toggle button has accessible label "Desbloquear usuário [name]"
- Renders when `user.id === currentUserId` — toggle is disabled; `aria-disabled="true"` and `disabled` attributes present
- Toggle button has touch target ≥ 44×44px (GUD-003)
- Zero WCAG violations in all three states (active, blocked, self) with axe tags `wcag2a`, `wcag2aa`, `wcag22aa`
- `isLoading: true` — toggle has `aria-disabled="true"` and `disabled` attribute (REQ-P07)

**`<BlockConfirmDialog>` (`components/admin/block-confirm-dialog.test.tsx`)**

- Closed state (`open: false`) — dialog is not in the DOM or has `aria-hidden="true"`
- Open state (`open: true`, `action: 'block'`) — `DialogTitle` reads "Bloquear usuário"; `DialogDescription` is present with user name; confirm button is enabled
- Open state (`open: true`, `action: 'unblock'`) — `DialogTitle` reads "Desbloquear usuário"; confirm button is enabled
- `isLoading: true` — confirm button has `aria-disabled="true"` and `disabled` attribute; cancel button remains enabled
- Zero WCAG violations in both open states (block, unblock) with axe tags `wcag2a`, `wcag2aa`, `wcag22aa`
- `onConfirm` is called exactly once when confirm button is clicked
- `onOpenChange(false)` is called when cancel button is clicked

### Layer 3 — Playwright + @axe-core/playwright

**`/users` page**

- Full page axe scan with tags `wcag2a`, `wcag2aa`, `wcag22aa`; zero violations required (WCAG 2.2 AA)
- Confirmation dialog opened via keyboard: Tab to block toggle → Enter to activate → dialog opens with focus trapped inside; Escape closes dialog without triggering action
- Confirm button in dialog is reachable and activatable via keyboard (Tab + Enter/Space)
- After confirmation, page updates user row without full navigation; focus returns to an accessible element

**CI gate:** All Playwright a11y tests must pass before PR merge. `axe.disableRules()` is forbidden.

---

## Section 7: Design Rationale

### Confirmation Dialog for Block Action (REQ-003)

A confirmation dialog is required before executing any block or unblock action because:
- **Irreversibility risk**: Blocking a user immediately denies access; an accidental click could lock out an active teacher mid-session.
- **Clarity of consequence**: The dialog explicitly names the affected user and explains the effect (denied platform access), reducing errors in lists with many similar-looking names.
- **Accessibility**: The dialog follows the ARIA dialog pattern (PAT-005), ensuring keyboard users cannot accidentally confirm the action without intentionally navigating to the confirm button.

### No User Deletion in MVP (CON-001)

User deletion is excluded for the following reasons:
- **Data integrity**: Deleting a `profiles` row cascades to `auth.users` via foreign key; orphaned `exams`, `questions`, and `adaptations` rows would be cascade-deleted, permanently destroying teacher work.
- **Auditability**: Blocked accounts preserve the full history of exams and adaptations for audit purposes; deletion removes this history irreversibly.
- **Sufficient for MVP**: The use case for user deletion is rare (GDPR requests, test accounts); blocking is adequate for moderation. Deletion can be added in a future iteration with proper soft-delete or GDPR tooling.

### Self-Block Guard in Route Handler (SEC-002)

The guard that prevents an admin from blocking themselves is enforced in the API route handler rather than only in the UI because:
- **Defense in depth**: The UI disables the toggle for the current admin, but a direct API call bypasses client-side guards. The server-side check is the authoritative enforcement point.
- **Session integrity**: If an admin could block themselves, their active session would redirect to `/blocked` on the next middleware check, locking them out with no recovery path (since no other admin may be available). This is a critical operational risk.

### Admin-Only API Enforcement (SEC-001)

Every `/api/admin/*` route performs an independent server-side role check (see `spec-design-admin-config.md` Section 7 for full rationale). For this feature:
- `GET /api/admin/users` must be admin-only because returning all profiles (including emails) to non-admin users would be a privacy violation and contradicts the RLS policies on `profiles`.
- `PATCH /api/admin/users/[id]` must be admin-only to prevent privilege escalation: a teacher must not be able to unblock themselves or block other users.

### RLS Policy Required for Updates (Section 4.5)

The initial schema includes RLS policies for reading profiles but not for updating them. A new `"Admins can update any profile"` policy is required because:
- **RLS default deny**: Without an explicit UPDATE policy, Supabase's RLS blocks all writes to `profiles` from the server client used in API routes.
- **Scope**: The policy is scoped to admins only (`auth.uid()` must resolve to a profile with `role = 'admin'`), maintaining defense in depth even if the API-layer role check were bypassed.

### `GET /api/admin/users` as Server-Side Fetch

The `/users` page fetches all profiles in a React Server Component (RSC) rather than a client-side `useEffect` because:
- **REQ-P01 compliance**: RSC is the default; `'use client'` is used only for interactive elements (`<BlockConfirmDialog>`, `<UserListItem>` toggle).
- **Security**: The Supabase server client (with cookie-based session) is only safe to use in Server Components or Route Handlers; a browser fetch of `/api/admin/users` would require an extra network hop.
- **Performance**: Server-side fetch eliminates the loading waterfall; the list is available on first render.

---

## Section 8: Dependencies

| ID | Type | Description |
|----|------|-------------|
| DEP-001 | Spec | `spec-design-auth.md` — defines the `Profile` interface, `UserRole` type, `profiles` table schema, existing RLS policies, and the middleware that gates `/users` to `role = 'admin'`; this spec is a direct consumer of all contracts defined there |
| DEP-002 | Spec | `spec-design-admin-config.md` — establishes the admin page pattern (RSC page, `(admin)` route group, `/api/admin/*` with independent role checks); this spec follows the same pattern |
| DEP-003 | Infrastructure | Supabase PostgreSQL — `public.profiles` table with RLS; the new `"Admins can update any profile"` UPDATE policy must be deployed before this feature can function |
| DEP-004 | Infrastructure | Supabase Auth — `auth.uid()` used in RLS policies; server-side session validation via `createServerClient` in route handlers |
| DEP-005 | Library | `zod` — runtime validation of `PATCH /api/admin/users/[id]` request body via `updateUserSchema` |
| DEP-006 | Library | `@supabase/ssr` — `createServerClient` used in route handlers for server-side session and database access |
| DEP-007 | Platform | Next.js 16 App Router — `(admin)` route group; async `params` (REQ-P05); RSC page component for server-side data fetch |
| DEP-008 | Library | `@radix-ui/react-dialog` (via shadcn) — `<BlockConfirmDialog>` requires `DialogTitle` and `DialogDescription` (PAT-005) |

---

## Section 9: Examples

### Example 1: Admin Blocks a Teacher

**Scenario:** Admin wants to block teacher "Ana Costa" (`id: uuid-teacher-3`) who violated platform terms.

**Flow:**
1. Admin navigates to `/users`; page RSC fetches all profiles server-side and renders a list
2. "Ana Costa" row shows `blocked: false`; a "Bloquear" toggle button is visible
3. Admin clicks the toggle; `<BlockConfirmDialog>` opens:
   - Title: "Bloquear usuário"
   - Description: "Tem certeza que deseja bloquear Ana Costa? O usuário perderá acesso imediato à plataforma."
4. Admin clicks "Confirmar"
5. Browser: `PATCH /api/admin/users/uuid-teacher-3` with `{ blocked: true }`
6. Route handler: verifies `role === 'admin'` (SEC-001); checks `uuid-teacher-3 !== currentAdminId` (SEC-002); calls `supabase.from('profiles').update({ blocked: true }).eq('id', 'uuid-teacher-3')`
7. Response: `{ ok: true }`; dialog closes; "Ana Costa" row updates to show "Blocked" badge
8. On Ana Costa's next request, middleware's `blocked` check redirects her to `/blocked`

### Example 2: Admin Attempts to Block Themselves

**Scenario:** Admin "Carlos Mendes" (`id: uuid-admin-2`) navigates to `/users`.

**Flow:**
1. Page RSC passes `currentUserId = 'uuid-admin-2'` to each `<UserListItem>`
2. In Carlos Mendes' own row, `user.id === currentUserId` evaluates to `true`
3. The block toggle is rendered with `disabled` and `aria-disabled="true"`; a tooltip reads "Você não pode bloquear sua própria conta"
4. Carlos cannot click the toggle; no API call is possible from the UI
5. If Carlos sends `PATCH /api/admin/users/uuid-admin-2` directly, the handler returns `403 Forbidden` with `{ error: 'Admins cannot block themselves' }` (SEC-002)

### Example 3: Unblocking a User

**Scenario:** Admin reviews that teacher "Beatriz Lima" (`id: uuid-teacher-5`) was blocked by mistake.

**Flow:**
1. Admin navigates to `/users`; "Beatriz Lima" row shows `blocked: true` with a "Desbloquear" toggle
2. Admin clicks the toggle; `<BlockConfirmDialog>` opens with `action: 'unblock'`:
   - Title: "Desbloquear usuário"
   - Description: "Tem certeza que deseja desbloquear Beatriz Lima? O usuário recuperará acesso imediato à plataforma."
3. Admin clicks "Confirmar"
4. Browser: `PATCH /api/admin/users/uuid-teacher-5` with `{ blocked: false }`
5. Handler updates `profiles.blocked = false`; returns `{ ok: true }`
6. Row updates to show "Active" status; Beatriz can log in again

### Example 4: Non-Admin API Call Rejected

**Scenario:** Teacher "Fabio Souza" discovers the admin API endpoint and attempts to unblock themselves after being blocked.

**Flow:**
1. Fabio sends `PATCH /api/admin/users/uuid-teacher-6` with `{ blocked: false }` using their session cookie
2. Route handler calls `supabase.auth.getUser()` — Fabio is authenticated
3. Handler queries `profiles` for Fabio's role: `role = 'teacher'`
4. `role !== 'admin'` → handler returns `403 Forbidden` immediately
5. The RLS policy `"Admins can update any profile"` would also block the write at database level (defense in depth)
6. `profiles.blocked` remains `true`; Fabio remains blocked

### Example 5: Malformed PATCH Body

**Scenario:** A third-party integration sends an incorrect payload to `PATCH /api/admin/users/[id]`.

**Flow:**
1. Integration sends `PATCH /api/admin/users/uuid-teacher-7` with `{ blocked: "yes" }`
2. Admin authentication check passes
3. Self-block guard passes (`uuid-teacher-7 !== currentAdminId`)
4. `updateUserSchema.safeParse({ blocked: "yes" })` returns `success: false`
5. Handler returns `400 Bad Request` with Zod validation error details
6. No database write is attempted; `profiles.blocked` is unchanged

---

## Section 10: Validation Checklist

The following checklist must be verified before this spec is considered implementation-ready:

- [x] Frontmatter complete: `title`, `version`, `date_created`, `last_updated`, `owner`, `tags`
- [x] All 11 sections present (Introduction through Related Specifications)
- [x] Global Constraints block present verbatim in Section 3
- [x] All feature requirements (REQ-001–REQ-003, SEC-001–SEC-002, CON-001) traceable to PRD F9
- [x] Section 4 includes:
  - [x] `Profile` TypeScript interface (reference to `spec-design-auth.md` Section 4.1)
  - [x] `UserManagementProfile` type alias and `UpdateUserBody` interface
  - [x] `updateUserSchema` Zod schema with all field constraints
  - [x] `GET /api/admin/users` and `PATCH /api/admin/users/[id]` endpoints with method, path, body, and response
  - [x] PATCH error response table (401, 403 self-block, 403 non-admin, 400, 404)
  - [x] Existing `profiles` SQL schema (from migration — no changes)
  - [x] Existing RLS policies (select policies from `spec-design-auth.md`)
  - [x] New RLS policy required: `"Admins can update any profile"` with migration note
  - [x] `<UserListItem>` and `<BlockConfirmDialog>` component prop interfaces
- [x] Section 5 has ≥ 5 ACs in Given-When-Then format (10 ACs present)
- [x] Section 6 has all 3 test layers with specific named test cases
- [x] Section 6 Layer 1: self-block guard (current user ID = target ID → 403), `updateUserSchema` (blocked not boolean)
- [x] Section 6 Layer 2: `<UserListItem>` (blocked/active/self states); `<BlockConfirmDialog>` (open/closed, block/unblock)
- [x] Section 6 Layer 3: `/users` WCAG 2.2 AA; confirmation dialog via keyboard
- [x] Section 7 justifies: confirmation dialog, no deletion, self-block guard, admin-only API, RLS policy requirement, RSC server-side fetch
- [x] Section 8 lists all external dependencies (specs, infrastructure, libraries)
- [x] Section 9 has ≥ 3 concrete examples with step-by-step flows (5 examples present)
- [x] Section 11 references at least 3 related specs

---

## Section 11: Related Specifications

| Spec | Relationship |
|------|-------------|
| `spec-design-auth.md` | Prerequisite — defines the `Profile` interface, `UserRole` type, `profiles` table schema, `handle_new_user` trigger, existing RLS select policies, and the middleware that gates `/users` to `role = 'admin'`; this spec is a direct consumer of all contracts defined there |
| `spec-design-admin-config.md` | Sibling — establishes the admin page pattern (`(admin)` route group, RSC page, `/api/admin/*` with independent role checks) that this spec follows; both specs cover admin-only pages and share SEC-001 enforcement semantics |
| `spec-process-repository.md` | Adjacent — the dashboard and exam listing pages are `(auth)` routes used by the teachers whose access is managed here; blocking a user via this feature immediately prevents access to all routes including those defined in this spec |
| `spec-process-new-exam.md` | Downstream consumer — blocked teachers cannot access exam creation routes; the blocked status managed here directly gates the feature described in this spec |
| `spec-process-result.md` | Adjacent — blocked teachers cannot view exam results; the moderation capability defined here affects teacher access to all teacher-facing features including the result view |
