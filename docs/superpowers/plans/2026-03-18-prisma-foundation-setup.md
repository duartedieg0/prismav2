# PRISMA Foundation Setup

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap a new Next.js 16 repository for the PRISMA rewrite with all dependencies, Supabase project, CI/CD, and base structure in place — ready for the 9 feature specs to be implemented.

**Architecture:** Next.js 16 App Router on Vercel · Supabase (Auth, Postgres, Storage, Edge Functions) · Tailwind CSS v4 · Shadcn UI · tailwind-variants · Vitest 3.x + jest-axe · Playwright + axe-core

**Must complete before:** Any task in `docs/superpowers/plans/2026-03-18-prisma-specs-creation.md`

---

## Prerequisites (manual — do before running this plan)

- [ ] Create empty GitHub repository `prisma-app` (or chosen name)
- [ ] Create Supabase project at supabase.com — note `PROJECT_REF`, `ANON_KEY`, `SERVICE_ROLE_KEY`, `DATABASE_URL`
- [ ] Create Google OAuth client at console.cloud.google.com — note `CLIENT_ID` and `CLIENT_SECRET`
- [ ] Configure Google OAuth in Supabase Dashboard → Authentication → Providers → Google
- [ ] Install Supabase CLI: `npm install -g supabase`
- [ ] Install Vercel CLI: `npm install -g vercel`

---

## Task 1: Bootstrap Next.js Project

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `.env.local`, `.env.example`

- [ ] **Step 1: Create Next.js app**

```bash
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias="@/*"
```

- [ ] **Step 2: Verify default structure exists**

```bash
ls app/ lib/ public/
```
Expected: `app/` with `layout.tsx`, `page.tsx`; `public/` exists.

- [ ] **Step 3: Create `.env.example`**

```bash
cat > .env.example << 'EOF'
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
```

- [ ] **Step 4: Create `.env.local` with real values (never commit)**

```bash
cp .env.example .env.local
# Fill in real values from Supabase dashboard
```

- [ ] **Step 5: Ensure `.gitignore` includes `.env.local`**

```bash
grep ".env.local" .gitignore || echo ".env.local" >> .gitignore
```

- [ ] **Step 6: Commit**

```bash
git add . && git commit -m "chore: bootstrap Next.js 16 project"
```

---

## Task 2: Configure Tailwind CSS v4 + tailwind-variants

**Files:**
- Modify: `app/globals.css`
- Create: `tailwind.config.ts` (if not generated)

- [ ] **Step 1: Upgrade to Tailwind v4**

```bash
npm install tailwindcss@next @tailwindcss/postcss@next
```

- [ ] **Step 2: Install tailwind-variants (replaces CVA)**

```bash
npm install tailwind-variants
```

- [ ] **Step 3: Update `app/globals.css` with CSS variable design tokens**

```css
@import "tailwindcss";

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add . && git commit -m "chore: configure Tailwind CSS v4 and tailwind-variants"
```

---

## Task 3: Install and Configure Shadcn UI

**Files:**
- Create: `components/ui/` (populated by CLI)
- Modify: `components.json`

- [ ] **Step 1: Initialize Shadcn**

```bash
npx shadcn@latest init
```

Select: Style → Default · Base color → Slate · CSS variables → Yes

- [ ] **Step 2: Add core components used across all features**

```bash
npx shadcn@latest add button card dialog form input label select textarea badge skeleton toast
```

- [ ] **Step 3: Verify components created**

```bash
ls components/ui/
```
Expected: `button.tsx`, `card.tsx`, `dialog.tsx`, `form.tsx`, `input.tsx`, etc.

- [ ] **Step 4: Remove `class-variance-authority` if installed (replaced by tailwind-variants)**

```bash
npm uninstall class-variance-authority
```

Check `package.json` — `cva` should be gone.

- [ ] **Step 5: Commit**

```bash
git add . && git commit -m "chore: install and configure Shadcn UI components"
```

---

## Task 4: Configure Supabase Client

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/middleware.ts`

- [ ] **Step 1: Install Supabase packages**

```bash
npm install @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: Create browser client `lib/supabase/client.ts`**

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 3: Create server client `lib/supabase/server.ts`**

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 4: Create middleware helper `lib/supabase/middleware.ts`**

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  return { supabaseResponse, user }
}
```

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/ && git commit -m "chore: configure Supabase client (browser + server + middleware)"
```

---

## Task 5: Create Auth Middleware

**Files:**
- Create: `middleware.ts` (project root)
- Create: `app/login/callback/route.ts`

- [ ] **Step 1: Create `middleware.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  // Public routes — no auth required
  if (pathname === '/' || pathname.startsWith('/login')) {
    if (user && pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return supabaseResponse
  }

  // All other routes require auth
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Admin routes require role check
  if (pathname.startsWith('/config') || pathname.startsWith('/users')) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} } }
    )
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, blocked')
      .eq('id', user.id)
      .single()

    if (!profile || profile.blocked) {
      return NextResponse.redirect(new URL('/blocked', request.url))
    }
    if (profile.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

- [ ] **Step 2: Create OAuth callback route `app/login/callback/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}
```

- [ ] **Step 3: Commit**

```bash
git add middleware.ts app/login/callback/ && git commit -m "chore: add auth middleware and OAuth callback route"
```

---

## Task 6: Supabase Database Migrations

**Files:**
- Create: `supabase/migrations/00001_initial_schema.sql`

- [ ] **Step 1: Initialize Supabase locally**

```bash
supabase init
supabase link --project-ref <PROJECT_REF>
```

- [ ] **Step 2: Create initial migration from tech spec schema**

```bash
supabase migration new initial_schema
```

Edit the generated file with the full schema from `tasks/prd-adapte-minha-prova/techspec.md` → "Modelos de Dados" section, including:
- `profiles` table + trigger `handle_new_user`
- `ai_models` + `is_default` partial unique index (migration 00005 gap)
- `agents`
- `supports` (model_id nullable — migration 00005 gap)
- `subjects`
- `grade_levels`
- `exams`
- `exam_supports`
- `questions`
- `adaptations` + `adapted_alternatives` JSONB column (migration 00007 gap)
- `feedbacks` + `dismissed_from_evolution` boolean (migration 00006 gap)
- `agent_evolutions`
- All RLS policies

- [ ] **Step 3: Apply migration locally**

```bash
supabase db reset
```
Expected: "Database reset successful"

- [ ] **Step 4: Apply migration to remote Supabase project**

```bash
supabase db push
```

- [ ] **Step 5: Commit**

```bash
git add supabase/ && git commit -m "chore: add initial database schema migration"
```

---

## Task 7: Supabase Storage + Edge Functions Scaffold

**Files:**
- Create: `supabase/functions/extract-questions/index.ts`
- Create: `supabase/functions/analyze-and-adapt/index.ts`
- Create: `supabase/functions/evolve-agent/index.ts`

- [ ] **Step 1: Create Storage bucket `exams` via migration**

```bash
supabase migration new create_storage_bucket
```

```sql
insert into storage.buckets (id, name, public, file_size_limit)
values ('exams', 'exams', false, 26214400); -- 25 MB

create policy "Teachers upload own PDFs"
  on storage.objects for insert
  with check (bucket_id = 'exams' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Teachers read own PDFs"
  on storage.objects for select
  using (bucket_id = 'exams' and auth.uid()::text = (storage.foldername(name))[1]);
```

- [ ] **Step 2: Scaffold Edge Functions**

```bash
supabase functions new extract-questions
supabase functions new analyze-and-adapt
supabase functions new evolve-agent
```

Each `index.ts` should have a minimal stub:

```typescript
// supabase/functions/extract-questions/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

serve(async (req) => {
  // TODO: implement in spec-process-extraction task
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

- [ ] **Step 3: Verify functions run locally**

```bash
supabase functions serve extract-questions
# In another terminal:
curl -i http://localhost:54321/functions/v1/extract-questions
```
Expected: `{"ok":true}`

- [ ] **Step 4: Commit**

```bash
git add supabase/ && git commit -m "chore: add Storage bucket migration and Edge Function scaffolds"
```

---

## Task 8: Configure Vitest + jest-axe

**Files:**
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Install test dependencies**

```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom jest-axe
npm install -D @types/jest-axe
```

- [ ] **Step 2: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      thresholds: { functions: 80, lines: 80 },
      exclude: ['node_modules', '.next', 'supabase', 'e2e'],
    },
  },
  resolve: {
    alias: { '@': resolve(__dirname, '.') },
  },
})
```

- [ ] **Step 3: Create `vitest.setup.ts`**

```typescript
import '@testing-library/jest-dom'
import { toHaveNoViolations } from 'jest-axe'
import { expect } from 'vitest'

expect.extend(toHaveNoViolations)
```

- [ ] **Step 4: Add scripts to `package.json`**

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:a11y": "vitest run --reporter=verbose"
  }
}
```

- [ ] **Step 5: Verify Vitest runs**

```bash
npm test
```
Expected: "No test files found" (zero failures — no tests yet).

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts vitest.setup.ts package.json && git commit -m "chore: configure Vitest with jest-axe and coverage thresholds"
```

---

## Task 9: Configure Playwright + axe-core

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/accessibility.spec.ts` (smoke test)

- [ ] **Step 1: Install Playwright**

```bash
npm install -D @playwright/test @axe-core/playwright
npx playwright install --with-deps chromium firefox
```

- [ ] **Step 2: Create `playwright.config.ts`**

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

- [ ] **Step 3: Create smoke accessibility test `e2e/accessibility.spec.ts`**

```typescript
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('landing page has no a11y violations', async ({ page }) => {
  await page.goto('/')
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze()
  expect(results.violations).toEqual([])
})
```

- [ ] **Step 4: Add script to `package.json`**

```json
{ "scripts": { "test:e2e": "playwright test" } }
```

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts e2e/ package.json && git commit -m "chore: configure Playwright with axe-core E2E a11y tests"
```

---

## Task 10: GitHub Actions CI Pipeline

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create CI workflow**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test:coverage

  a11y:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run build
      - run: npx playwright install --with-deps chromium
      - run: npx wait-on http://localhost:3000 & npm start
      - run: npm run test:e2e
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
```

- [ ] **Step 2: Add `typecheck` script to `package.json`**

```json
{ "scripts": { "typecheck": "tsc --noEmit" } }
```

- [ ] **Step 3: Add GitHub Secrets (manual)**

In GitHub repo → Settings → Secrets → Actions:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

- [ ] **Step 4: Commit**

```bash
git add .github/ package.json && git commit -m "chore: add CI pipeline with unit tests, coverage, and a11y gate"
```

---

## Task 11: Base App Structure + Vercel Deploy

**Files:**
- Create: `app/(public)/page.tsx` (placeholder)
- Create: `app/(public)/login/page.tsx` (placeholder)
- Create: `app/(auth)/layout.tsx` (placeholder)
- Create: `app/(admin)/layout.tsx` (placeholder)

- [ ] **Step 1: Create route group placeholders**

```bash
mkdir -p app/\(public\) app/\(auth\) app/\(admin\)
```

Each placeholder `page.tsx`:
```typescript
// app/(public)/page.tsx
export default function LandingPage() {
  return <main><h1>Adapte Minha Prova</h1></main>
}
```

- [ ] **Step 2: Link to Vercel**

```bash
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
```

- [ ] **Step 3: Deploy to preview**

```bash
vercel
```
Expected: preview URL accessible, no build errors.

- [ ] **Step 4: Commit and push**

```bash
git add app/ && git commit -m "chore: add base route group structure and Vercel deploy"
git push origin main
```

---

## Final Checklist

Before starting spec implementation tasks, verify:

- [ ] `npm run dev` starts without errors on `localhost:3000`
- [ ] `npm test` runs (0 failures)
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `supabase db push` applied schema to remote project
- [ ] Supabase Auth → Google provider configured with correct callback URL: `https://<project-ref>.supabase.co/auth/v1/callback`
- [ ] Edge Function stubs deployed: `supabase functions deploy`
- [ ] `.env.local` present locally (not committed)
- [ ] GitHub Actions CI passing on `main`
- [ ] Vercel preview URL accessible

**Proceed to:** `docs/superpowers/plans/2026-03-18-prisma-specs-creation.md`
