---
title: Authentication (F2)
version: 1.0
date_created: 2026-03-18
last_updated: 2026-03-18
owner: PRISMA Team
tags: [design, auth, oauth, google, supabase, middleware, roles, rls]
---

# Introduction

This specification defines the authentication and authorization infrastructure for the PRISMA ("Adapte Minha Prova") platform. It covers Google OAuth sign-in via Supabase Auth, JWT session management via Next.js middleware, role-based access control (teacher / admin), and blocked-user handling. All authenticated and admin routes in the application depend on the contracts defined here.

---

## Section 1: Purpose & Scope

### Purpose

This document specifies the authentication system for the PRISMA platform. It defines the sign-in mechanism, session lifecycle, middleware routing rules, role model, and the `profiles` database schema and RLS policies required to implement the feature described in PRD F2.

### In Scope

- `/login` page — Google OAuth sign-in button
- `/login/callback/route.ts` — OAuth authorization code exchange handler
- `/blocked` page — shown to blocked users after login
- `middleware.ts` — JWT validation via `updateSession()`, route guards for `(auth)` and `(admin)` routes, role check for admin routes
- `lib/supabase/middleware.ts` — `updateSession()` function (session refresh + cookie management)
- `profiles` table schema — existing columns and target migrations (`avatar_url`, role default rename)
- `handle_new_user` trigger — auto-creates profile on `auth.users` insert
- RLS policies on `profiles` — scoped read access for teachers and admins
- `Profile` TypeScript interface and `UserRole` type exported from `lib/types/auth.ts`
- Role model: two roles — `teacher` (default) and `admin` (manually assigned)

### Out of Scope

- Exam creation and management — see `spec-process-new-exam.md`, `spec-process-extraction.md`, `spec-process-adaptation.md`
- Admin configuration pages (CRUD for models, agents, subjects, grades) — see `spec-design-admin-config.md`
- Admin user management page — see `spec-design-admin-users.md`
- Landing page — see `spec-design-landing.md`
- Email / password authentication (explicitly excluded from MVP — CON-001)
- Magic link or phone authentication
- Multi-factor authentication

---

## Section 2: Definitions

| Term | Definition |
|------|-----------|
| `Profile` | Row in `public.profiles` table; created automatically via trigger when a new user signs in via Google OAuth; stores display name, email, avatar URL, role, and blocked flag |
| `UserRole` | Union type `"teacher" \| "admin"` — the two roles supported in MVP; `teacher` is the default for all new accounts |
| `(auth)` routes | Next.js App Router route group containing all authenticated teacher-facing pages (e.g., `/dashboard`, `/exams/*`) |
| `(admin)` routes | Next.js App Router route group containing admin-only pages (e.g., `/config`, `/users`); require `profiles.role = 'admin'` |
| `(public)` routes | Route group with no authentication requirement (landing page, `/login`, `/blocked`) |
| `updateSession()` | Function in `lib/supabase/middleware.ts` that refreshes the Supabase JWT session and forwards updated cookies on every request |
| JWT | JSON Web Token issued by Supabase Auth; stored in an HTTP-only cookie managed by `@supabase/ssr` |
| OAuth callback | `GET /login/callback` — route handler that receives the authorization code from Google and exchanges it for a Supabase session |
| RLS | Row Level Security — PostgreSQL policy that restricts which rows a database client can read or write based on `auth.uid()` |
| Blocked user | A user with `profiles.blocked = true`; redirected to `/blocked` after login and denied access to all `(auth)` and `(admin)` routes |
| `handle_new_user` | PostgreSQL trigger function that inserts a new row into `public.profiles` when a user is created in `auth.users` |
| `createServerClient` | Supabase SSR helper that creates a server-side Supabase client with cookie-based session handling (`@supabase/ssr`) |

---

## Section 3: Feature Requirements & Global Constraints

### Feature Requirements (PRD F2)

| ID | Requirement |
|----|------------|
| REQ-001 | SHALL authenticate users via Google OAuth only (F2.1) |
| REQ-002 | Admin role defined by `profiles.role = 'admin'`; set manually in database (F2.2) |
| REQ-003 | Multiple admins supported (F2.3) |
| REQ-004 | Blocked user (`profiles.blocked = true`) redirected to `/blocked` after login (F2.4) |
| SEC-001 | Middleware validates JWT on all `(auth)` and `(admin)` routes via `updateSession()` |
| SEC-002 | `(admin)` routes additionally check `profile.role === 'admin'` |
| SEC-003 | RLS on `profiles` — teacher reads only own profile; admin reads all |
| CON-001 | No email/password auth in MVP |

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
// lib/types/auth.ts

export type UserRole = 'teacher' | 'admin';

export interface Profile {
  id: string;               // uuid — matches auth.users.id
  full_name: string | null;
  email: string | null;
  avatar_url: string | null; // from Google OAuth metadata (requires migration — see 4.3)
  role: UserRole;
  blocked: boolean;
  created_at: string;       // ISO 8601 timestamp
}
```

> **Note on `UserRole`:** The current database `CHECK` constraint allows `'user' | 'admin' | 'teacher'`. The target state (requiring a migration — see Section 4.3) removes `'user'` and renames the default to `'teacher'`. The `UserRole` TypeScript type reflects the **target** post-migration state.

### 4.2 Existing Database Schema (current migration)

The following schema is live in `supabase/migrations/20260318000001_initial_schema.sql`:

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

**Existing RLS policies:**

```sql
create policy "Users can view their own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Admins can view all profiles" on public.profiles
  for select using ((select role from public.profiles where id = auth.uid()) = 'admin');
```

**Existing trigger:**

```sql
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### 4.3 Target Schema Changes (require future migration)

The following changes are **not yet applied** and require a new file in `supabase/migrations/`:

| Change | Details |
|--------|---------|
| Add `profiles.avatar_url` | `text`, nullable — populated from `raw_user_meta_data->>'avatar_url'` during `handle_new_user` and kept in sync on subsequent OAuth sign-ins |
| Rename role default | Change `DEFAULT 'user'` to `DEFAULT 'teacher'`; drop `'user'` from CHECK constraint → `CHECK (role IN ('teacher', 'admin'))` |
| Update trigger | Extend `handle_new_user` to also insert `avatar_url` from `new.raw_user_meta_data->>'avatar_url'` |

Target migration SQL (illustrative — not yet created):

```sql
-- Migration: add avatar_url, rename role default to teacher
alter table public.profiles
  add column if not exists avatar_url text;

alter table public.profiles
  alter column role set default 'teacher',
  drop constraint if exists profiles_role_check,
  add constraint profiles_role_check check (role in ('teacher', 'admin'));

-- Update existing 'user' rows to 'teacher' before applying constraint
update public.profiles set role = 'teacher' where role = 'user';

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;
```

### 4.4 Middleware Contract

```typescript
// middleware.ts (current implementation)

export async function middleware(request: NextRequest): Promise<NextResponse>
```

Routing rules (evaluated top-to-bottom):

| Route pattern | Auth required | Admin required | Blocked check | Action if fails |
|---------------|:---:|:---:|:---:|----------------|
| `/` or `/login/*` | No | No | No | If authenticated + `/`: redirect `/dashboard` |
| Any other route | Yes | No | No | Unauthenticated: redirect `/login` |
| `/config/*` or `/users/*` | Yes | Yes | Yes | Blocked: redirect `/blocked`; not admin: redirect `/dashboard` |

```typescript
// lib/supabase/middleware.ts
export async function updateSession(request: NextRequest): Promise<{
  supabaseResponse: NextResponse;
  user: User | null;
}>
```

`updateSession()` creates a server Supabase client, calls `supabase.auth.getUser()`, and refreshes session cookies on every request. It returns the updated `NextResponse` and the authenticated `User` object (or `null` if unauthenticated).

### 4.5 OAuth Callback Route

```typescript
// app/login/callback/route.ts

/**
 * GET /login/callback
 * Receives ?code= from Google OAuth, exchanges for Supabase session,
 * then redirects to /dashboard.
 */
export async function GET(request: Request): Promise<NextResponse>
```

Flow:
1. Google redirects to `/login/callback?code=<authorization_code>`
2. Route handler reads `code` from `searchParams`
3. Calls `supabase.auth.exchangeCodeForSession(code)` — sets HTTP-only session cookie
4. Redirects to `/dashboard`
5. On `/dashboard`, middleware calls `updateSession()` → `getUser()` → proceeds normally

### 4.6 Login Page

The `/login` page is a React Server Component (RSC) with a single interactive element: a "Entrar com Google" button that initiates the Supabase OAuth flow. The button requires `'use client'` only if it calls `supabase.auth.signInWithOAuth()` client-side, or it can be implemented as a Server Action.

---

## Section 5: Acceptance Criteria

| ID | Given | When | Then |
|----|-------|------|------|
| AC-001 | Unauthenticated user navigates to any `(auth)` route (e.g., `/dashboard`) | Page request is processed | Middleware redirects the user to `/login` before the page renders |
| AC-002 | Unauthenticated user is on `/login` and clicks "Entrar com Google" | OAuth flow completes successfully | User is redirected to `/dashboard`; `profiles` row exists with `full_name`, `email`, `role = 'teacher'` (post-migration) |
| AC-003 | Authenticated teacher (role `teacher`) navigates to `/config` | Page request is processed | Middleware detects non-admin role and redirects to `/dashboard`; the config page is never rendered |
| AC-004 | Authenticated admin (role `admin`) navigates to `/config` | Page request is processed | Middleware allows the request; the admin config page renders normally |
| AC-005 | Authenticated user with `profiles.blocked = true` navigates to any `(auth)` route | Page request is processed by middleware | Middleware detects blocked flag and redirects to `/blocked`; page content is never rendered |
| AC-006 | Already-authenticated user navigates to `/` | Page request is processed | Middleware redirects to `/dashboard`; the landing page is not rendered to the authenticated user |
| AC-007 | New user signs in with Google for the first time | OAuth callback completes (`exchangeCodeForSession` succeeds) | `handle_new_user` trigger fires; a row is inserted into `public.profiles` with `id`, `email`, and `full_name` populated from OAuth metadata |
| AC-008 | Admin navigates to any route | Admin's `Profile` is queried from `profiles` inside middleware | Role check uses `profile.role === 'admin'`; multiple concurrent admin sessions are supported without interference |
| AC-009 | Teacher (non-admin) navigates to `/users` | Page request is processed | Middleware returns redirect to `/dashboard`; RLS on `profiles` prevents the teacher from reading other users' profiles |
| AC-010 | Blocked user navigates to `/blocked` | Page renders | A clear, accessible message explains the account is blocked; no redirect loop occurs (blocked route is public) |

---

## Section 6: Test Strategy

### Layer 1 — Vitest + @testing-library/react

**Middleware logic (`middleware.test.ts`)**

Mock `updateSession` from `lib/supabase/middleware` and `createServerClient` from `@supabase/ssr` via `vi.mock()`.

Scenarios to cover:

| Scenario | `getUser()` returns | Route | Expected outcome |
|----------|--------------------|----|-----------------|
| Unauthenticated | `null` | `/dashboard` | Redirect to `/login` |
| Authenticated teacher | `{ id: 'u1' }`, profile `{ role: 'teacher', blocked: false }` | `/dashboard` | `supabaseResponse` (pass-through) |
| Authenticated teacher | `{ id: 'u1' }`, profile `{ role: 'teacher', blocked: false }` | `/config` | Redirect to `/dashboard` |
| Authenticated admin | `{ id: 'u2' }`, profile `{ role: 'admin', blocked: false }` | `/config` | `supabaseResponse` (pass-through) |
| Blocked user | `{ id: 'u3' }`, profile `{ role: 'teacher', blocked: true }` | `/dashboard` | Redirect to `/blocked` |
| Authenticated user | `{ id: 'u1' }` | `/` | Redirect to `/dashboard` |
| Unauthenticated | `null` | `/` | `supabaseResponse` (pass-through, no redirect) |
| Unauthenticated | `null` | `/login` | `supabaseResponse` (pass-through) |

**`updateSession` unit test (`lib/supabase/middleware.test.ts`)**

- Verifies that `supabase.auth.getUser()` is called
- Verifies that session cookies from `setAll` are forwarded to `supabaseResponse`
- Verifies that `user` is `null` when `getUser()` returns `{ data: { user: null } }`

### Layer 2 — jest-axe + Vitest

**`/login` page (`app/login/page.test.tsx`)**

- Renders "Entrar com Google" button with accessible label text
- Button has a touch target ≥ 44×44px (GUD-003)
- Zero WCAG violations in default state (axe tags: `wcag2a`, `wcag2aa`, `wcag22aa`)
- Button is keyboard-focusable with visible focus ring

**`/blocked` page (`app/blocked/page.test.tsx`)**

- Renders accessible heading and explanation text
- Zero WCAG violations (axe tags: `wcag2a`, `wcag2aa`, `wcag22aa`)
- No interactive elements that could trigger a redirect loop

### Layer 3 — Playwright + @axe-core/playwright

**`/login` page**

- Full page axe scan with tags `wcag2a`, `wcag2aa`, `wcag22aa`; zero violations required (WCAG 2.2 AA)
- "Entrar com Google" button is focusable by keyboard with visible focus ring
- Page renders as RSC — no unnecessary client-side JavaScript for the static layout

**`/(auth)/dashboard` redirect (unauthenticated)**

- Unauthenticated request to `/dashboard` results in a redirect to `/login` (verifies middleware SEC-001)
- After redirect, `/login` page renders with zero axe violations

**CI gate:** All Playwright a11y tests must pass before PR merge; `axe.disableRules()` forbidden.

---

## Section 7: Design Rationale

### Google OAuth Only (REQ-001 / CON-001)

Email/password authentication is explicitly excluded from MVP because:
- **Reduced attack surface**: No passwords to store, hash, or breach; all credential management is delegated to Google
- **Faster onboarding**: Teachers in the target audience (Brazilian public/private schools) already have Google accounts via Google Workspace for Education
- **Simplified UX**: One button on the login page; no forgot-password flow, email verification, or password strength requirements needed for MVP
- **Supabase Auth handles token refresh**: OAuth tokens and JWTs are managed entirely by `@supabase/ssr`, reducing bespoke auth code

### Manual Admin Role Assignment (REQ-002 / REQ-003)

Admin roles are assigned manually via direct database update rather than a self-service UI because:
- **Security**: No attack surface for privilege escalation through the application layer
- **Low volume**: The number of admins is small and infrequent; a UI would add implementation cost without proportional value in MVP
- **Auditability**: Direct database mutations are auditable via Supabase's dashboard and logs
- **Multiple admins supported** (REQ-003): The `role` column has no uniqueness constraint; any number of `profiles` rows can carry `role = 'admin'`

### Middleware-Based Route Guards (SEC-001 / SEC-002)

Middleware is used for routing and role checks (rather than page-level guards) because:
- **Single enforcement point**: All route protection logic lives in one file (`middleware.ts`); adding a new protected route requires only updating the middleware pattern
- **No flash of unauthorized content**: Redirects happen before any RSC or page component renders; the browser never receives a protected page's HTML
- **Complementary to RLS**: Middleware is a UX guard; PostgreSQL RLS is the security enforcement layer. Both are required (defense in depth)

### `updateSession()` on Every Request (SEC-001)

The Supabase session is refreshed on every middleware invocation (not just on login) because:
- **Token expiry**: JWTs are short-lived; `updateSession()` transparently refreshes the access token using the stored refresh token before it expires
- **`@supabase/ssr` pattern**: This is the recommended usage from Supabase SSR documentation; skipping it leads to "Auth session missing" errors in Server Components

### Separate `Profile` Type from `auth.users` (Section 4.1)

The `Profile` interface wraps `public.profiles` columns rather than re-using Supabase's `User` type because:
- **Application-level concerns**: `profiles` holds app-specific fields (`role`, `blocked`, `avatar_url`) that are not present in `auth.users`
- **RLS-enforced access**: `Profile` data is fetched via the RLS-governed Supabase client; `auth.users` is only accessible server-side via `getUser()`
- **Type safety**: Explicitly typing `role: UserRole` (not `string`) enables exhaustive TypeScript checks across the codebase

### Target Schema Migration (Section 4.3)

The current schema uses `role DEFAULT 'user'` with a three-value CHECK constraint. The target renames the default to `'teacher'` and drops `'user'` for the following reasons:
- **Domain clarity**: The platform is teacher-facing; `'user'` is a generic term that doesn't reflect the domain model
- **Type correctness**: `UserRole = "teacher" | "admin"` in TypeScript; keeping `'user'` in the database creates a mismatch between the type and the actual values
- **Backward compatibility**: A data migration (`UPDATE profiles SET role = 'teacher' WHERE role = 'user'`) must run before dropping the constraint; this is included in the target migration

---

## Section 8: Dependencies

| ID | Type | Description |
|----|------|-------------|
| INF-001 | Infrastructure | Supabase Auth — Google OAuth provider; issues JWTs, manages refresh tokens, fires `on_auth_user_created` trigger |
| INF-002 | Infrastructure | Supabase PostgreSQL — `public.profiles` table; RLS policies enforced at database level |
| LIB-001 | Library | `@supabase/ssr` — `createServerClient`, `createBrowserClient`; cookie-based session management for Next.js App Router |
| PLT-001 | Platform | Next.js 16 App Router — `middleware.ts` runs on the Edge Runtime for every request matched by `config.matcher` |
| PLT-002 | Platform | Vercel — deploys the Next.js application; Edge Middleware is available on all Vercel plans |
| EXT-001 | External | Google OAuth 2.0 — Google Cloud Console project with OAuth credentials; `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` configured in environment |
| ENV-001 | Configuration | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — required in all environments (development, preview, production); see `.env.example` |

---

## Section 9: Examples

### Example 1: New Teacher First Login

**Scenario:** A teacher visits the platform for the first time and clicks "Entrar com Google".

**Flow:**
1. Browser → `supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: '/login/callback' })`
2. Google OAuth consent screen → user grants access
3. Google → `GET /login/callback?code=abc123`
4. Route handler: `supabase.auth.exchangeCodeForSession('abc123')` → session cookie set
5. `handle_new_user` trigger fires → inserts row into `profiles`:
   ```
   id: 'uuid-teacher-1', email: 'teacher@escola.edu.br',
   full_name: 'Maria Silva', role: 'teacher', blocked: false
   ```
6. Redirect → `/dashboard`
7. Middleware: `updateSession()` → `getUser()` → user found → allow
8. `/dashboard` renders teacher's (empty) exam list

### Example 2: Blocked User Attempt

**Scenario:** An admin sets `profiles.blocked = true` for user `uuid-teacher-2` directly in the database.

**Flow:**
1. Teacher `uuid-teacher-2` has an active session and navigates to `/dashboard`
2. Middleware: `updateSession()` → `getUser()` → user found
3. Route `/dashboard` is not an admin route → middleware queries `profiles` for role/blocked:
   - **Note:** Currently, the middleware only checks `blocked` for admin routes (`/config`, `/users`). A future enhancement to check `blocked` on all `(auth)` routes is recommended.
4. Current behavior: blocked teachers are only redirected at `/config` and `/users`; redirect to `/blocked` at all routes is a post-MVP enhancement.

> **Design note:** The middleware should be updated to check `blocked` on all `(auth)` routes, not just admin routes. This is flagged as a known gap between SEC-001/REQ-004 and the current implementation.

### Example 3: Admin Route Access by Non-Admin

**Scenario:** A teacher with `role = 'teacher'` navigates directly to `/config`.

**Flow:**
1. Middleware: `updateSession()` → user authenticated
2. Route matches `/config` → admin check triggered
3. `supabase.from('profiles').select('role, blocked').eq('id', user.id).single()`
4. Returns `{ role: 'teacher', blocked: false }`
5. `profile.role !== 'admin'` → `NextResponse.redirect('/dashboard')`
6. Teacher lands on `/dashboard`; config page never renders

### Example 4: Multiple Admins

**Scenario:** Two admins (`uuid-admin-1` and `uuid-admin-2`) both have `profiles.role = 'admin'`.

**Flow:**
1. Both admins log in independently via Google OAuth
2. Middleware processes each request independently, querying each admin's own `profiles` row
3. Both receive access to `/config` and `/users` simultaneously
4. No conflict — no uniqueness constraint on `role`; REQ-003 satisfied

### Example 5: Session Refresh via `updateSession()`

**Scenario:** A teacher's JWT expires while the browser tab is still open.

**Flow:**
1. Teacher makes a request to `/dashboard`
2. Middleware calls `updateSession(request)`
3. Inside `updateSession()`, `supabase.auth.getUser()` detects expired access token
4. Supabase client uses the stored refresh token to issue a new access token
5. `setAll` callback writes new cookies to `supabaseResponse`
6. Updated cookies are sent to the browser in the response headers
7. Teacher's session continues seamlessly without re-login

---

## Section 10: Validation Checklist

The following checklist must be verified before this spec is considered implementation-ready:

- [x] Frontmatter complete: `title`, `version`, `date_created`, `last_updated`, `owner`, `tags`
- [x] All 11 sections present (Introduction through Related Specifications)
- [x] Global Constraints block present verbatim in Section 3
- [x] All feature requirements (REQ-001–REQ-004, SEC-001–SEC-003, CON-001) traceable to PRD F2
- [x] Section 4 includes:
  - [x] `Profile` TypeScript interface with all fields (id, full_name, email, avatar_url, role, blocked, created_at)
  - [x] `UserRole` type defined as `"teacher" | "admin"`
  - [x] Current SQL schema for `profiles` (from existing migration)
  - [x] Current RLS policies (from existing migration)
  - [x] Current `handle_new_user` trigger (from existing migration)
  - [x] Target schema changes clearly distinguished as requiring a future migration
  - [x] Middleware routing rules table (all route patterns, auth/admin/blocked requirements)
  - [x] `updateSession()` return type documented
  - [x] Callback route `GET /login/callback` documented with full flow
- [x] Section 5 has ≥ 5 ACs in Given-When-Then format (10 ACs present)
- [x] Section 6 has all 3 test layers with specific named test cases
- [x] Section 6 Layer 1: middleware scenarios (unauthenticated, teacher, admin, blocked, `/` redirect)
- [x] Section 6 Layer 2: `/login` page, `/blocked` page — axe scans in all states
- [x] Section 6 Layer 3: WCAG 2.2 AA scan on `/login`; unauthenticated redirect to `/login`
- [x] Section 7 justifies: Google-only OAuth, manual admin role, middleware guards, `updateSession()` on every request, separate `Profile` type, target migration
- [x] Known gap documented: blocked check only on admin routes in current middleware
- [x] Section 11 references at least 3 related specs

---

## Section 11: Related Specifications

| Spec | Relationship |
|------|-------------|
| `spec-process-repository.md` | Consumer — the `/dashboard` page (defined there) is the primary redirect target after successful login; uses `Profile` type and `auth.uid()` to scope exam queries |
| `spec-design-admin-config.md` | Consumer — admin configuration pages at `/config/*` require `role = 'admin'`; the role model and middleware rules defined here gate access to those routes |
| `spec-design-admin-users.md` | Consumer — admin user management at `/users/*` requires `role = 'admin'`; the `Profile` interface and RLS policies defined here are the data contract for user listing and role/blocked management |
| `spec-design-landing.md` | Adjacent — the landing page at `/` is a public route; middleware redirects authenticated users away from `/` to `/dashboard` (defined in Section 4.4 here) |
| `spec-process-new-exam.md` | Downstream consumer — `/exams/new` and all exam routes are `(auth)` routes; they rely on middleware JWT validation and the `Profile` type defined here |
