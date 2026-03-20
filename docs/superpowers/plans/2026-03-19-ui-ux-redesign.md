# UI/UX Redesign — Adapte Minha Prova — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesenhar completamente a interface da plataforma com identidade visual acolhedora (verde-esmeralda + âmbar), sidebar de navegação, e melhorias de usabilidade em todas as páginas.

**Architecture:** Design tokens migrados de uma vez em globals.css + tailwind.config.ts; sidebar como Client Component reutilizável; AppLayout como Server Component compartilhado entre rotas auth e admin; páginas redesenhadas em sequência de dependência.

**Tech Stack:** Next.js 16 App Router, React 19, shadcn/ui (radix-nova), Tailwind CSS 3, Vitest + Testing Library + jest-axe, next/font/google

**Spec:** `docs/superpowers/specs/2026-03-19-ui-ux-redesign-design.md`

---

## Mapa de Arquivos

### Arquivos a Modificar

| Arquivo | Mudança |
|---|---|
| `app/globals.css` | Substituir todos os CSS variables de cor + adicionar --success |
| `tailwind.config.ts` | Adicionar fontSize, fontFamily, borderRadius, boxShadow, colors.success |
| `app/layout.tsx` | Trocar Geist por Plus Jakarta Sans + Inter + JetBrains Mono |
| `components/ui/button.tsx` | Adicionar variante `accent` |
| `components/ui/badge.tsx` | Adicionar variantes de status de prova |
| `app/(auth)/layout.tsx` | Usar AppLayout |
| `app/(admin)/layout.tsx` | Usar AppLayout |
| `app/page.tsx` | Redesenhar landing completa |
| `app/(public)/login/page.tsx` | Redesenhar card de login |
| `app/(auth)/dashboard/page.tsx` | Redesenhar cards de prova |
| `app/(auth)/dashboard/page.test.tsx` | Atualizar testes para nova UI |
| `app/(auth)/exams/new/page.tsx` | Integrar Stepper wizard |
| `app/(auth)/exams/[id]/extraction/page.tsx` | Atualizar UI de confirmação |
| `app/(auth)/exams/[id]/processing/page.tsx` | Melhorar feedback visual |
| `app/(auth)/exams/[id]/processing/processing-progress-client.tsx` | Atualizar animação |
| `app/(auth)/exams/[id]/result/page.tsx` | Layout two-column + feedback simplificado |
| `app/(admin)/config/models/page.tsx` | Tabela padrão admin |
| `app/(admin)/config/agents/page.tsx` | Tabela padrão admin |
| `app/(admin)/config/subjects/page.tsx` | Tabela padrão admin |
| `app/(admin)/config/grades/page.tsx` | Tabela padrão admin |
| `app/(admin)/config/supports/page.tsx` | Tabela padrão admin |
| `app/(admin)/users/page.tsx` | Tabela de usuários com filtros |
| `components/admin/*.tsx` (6 arquivos) | Adaptar aos novos padrões de tabela |

### Arquivos Novos

| Arquivo | Responsabilidade |
|---|---|
| `components/layout/sidebar.tsx` | Sidebar responsiva (Client Component) |
| `components/layout/app-layout.tsx` | Layout wrapper com sidebar (Server Component) |
| `components/ui/stepper.tsx` | Stepper wizard (Client Component) |

---

## Task 1: Design Tokens

**Files:**
- Modify: `app/globals.css`
- Modify: `tailwind.config.ts`
- Modify: `app/layout.tsx`

- [ ] **Step 1.1: Atualizar CSS variables em globals.css**

Substituir o bloco `:root { ... }` em `app/globals.css` com:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 60 20% 98%;
    --foreground: 20 9% 10%;
    --card: 0 0% 100%;
    --card-foreground: 20 9% 10%;
    --popover: 0 0% 100%;
    --popover-foreground: 20 9% 10%;
    --primary: 168 78% 27%;
    --primary-foreground: 0 0% 100%;
    --secondary: 30 25% 93%;
    --secondary-foreground: 20 9% 10%;
    --muted: 30 25% 93%;
    --muted-foreground: 28 7% 45%;
    --accent: 38 92% 50%;
    --accent-foreground: 20 9% 10%;
    --destructive: 0 72% 51%;
    --destructive-foreground: 0 0% 100%;
    --border: 30 18% 87%;
    --input: 30 18% 87%;
    --ring: 168 78% 27%;
    --success: 142 76% 36%;
    --success-foreground: 0 0% 100%;
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
    font-family: var(--font-sans), system-ui, sans-serif;
  }
}
```

- [ ] **Step 1.2: Atualizar tailwind.config.ts**

Substituir o conteúdo de `tailwind.config.ts` com:

```typescript
import type { Config } from "tailwindcss"
import animatePlugin from "tailwindcss-animate"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
      },
      borderRadius: {
        sm: '6px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        full: '9999px',
      },
      boxShadow: {
        sm: '0 1px 3px rgba(28,25,23,0.06)',
        md: '0 4px 12px rgba(28,25,23,0.10)',
        lg: '0 8px 24px rgba(28,25,23,0.12)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'Courier New', 'monospace'],
      },
      fontSize: {
        'display-xl': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '800' }],
        'display-lg': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-md': ['1.5rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '700' }],
        'heading': ['1.125rem', { lineHeight: '1.4', fontWeight: '600' }],
        'body': ['0.9375rem', { lineHeight: '1.6', fontWeight: '400' }],
        'small': ['0.8125rem', { lineHeight: '1.5', fontWeight: '400' }],
        'caption': ['0.6875rem', { lineHeight: '1.4', letterSpacing: '0.06em', fontWeight: '500' }],
      },
    },
  },
  plugins: [animatePlugin],
} satisfies Config

export default config
```

- [ ] **Step 1.3: Atualizar app/layout.tsx com novas fontes**

```tsx
import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const displayFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-display",
  display: "swap",
});

const bodyFont = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Adapte Minha Prova",
  description: "Plataforma de adaptação de provas escolares com IA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

- [ ] **Step 1.4: Verificar que build passa**

```bash
npm run lint && npm run typecheck && npm run build
```

Esperado: sem erros. Se houver erros de tipos no tailwind.config.ts, verificar se `satisfies Config` é compatível.

- [ ] **Step 1.5: Commit**

```bash
git add app/globals.css tailwind.config.ts app/layout.tsx
git commit -m "feat(design): migrate color tokens, typography, and spacing to new design system"
```

---

## Task 2: Button — Variante Accent

**Files:**
- Modify: `components/ui/button.tsx`
- Test: `components/ui/button.test.tsx` (criar se não existir)

- [ ] **Step 2.1: Escrever teste falhando**

Criar `components/ui/button.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { axe } from 'jest-axe'
import { describe, it, expect } from 'vitest'
import { Button } from './button'

describe('Button', () => {
  it('renders accent variant with correct data attribute', () => {
    render(<Button variant="accent">Começar</Button>)
    const button = screen.getByRole('button', { name: /começar/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute('data-variant', 'accent')
  })

  it('has no accessibility violations for accent variant', async () => {
    const { container } = render(<Button variant="accent">Criar prova</Button>)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
```

- [ ] **Step 2.2: Rodar teste para confirmar falha**

```bash
npm run test -- button.test
```

Esperado: FAIL — `variant: "accent"` não existe no type, TypeScript rejeita.

- [ ] **Step 2.3: Adicionar variante accent ao button.tsx**

No objeto `variants.variant` do `buttonVariants`, adicionar após `link`:

```ts
accent: 'bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm',
```

- [ ] **Step 2.4: Rodar teste para confirmar aprovação**

```bash
npm run test -- button.test
```

Esperado: PASS

- [ ] **Step 2.5: Commit**

```bash
git add components/ui/button.tsx components/ui/button.test.tsx
git commit -m "feat(ui): add accent variant to Button component"
```

---

## Task 3: Badge — Variantes de Status de Prova

**Files:**
- Modify: `components/ui/badge.tsx`
- Test: `components/ui/badge.test.tsx` (criar)

- [ ] **Step 3.1: Escrever teste falhando**

Criar `components/ui/badge.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { axe } from 'jest-axe'
import { describe, it, expect } from 'vitest'
import { Badge } from './badge'

describe('Badge', () => {
  const statusVariants = [
    'status-draft',
    'status-processing',
    'status-ready',
    'status-error',
    'status-archived',
  ] as const

  statusVariants.forEach((variant) => {
    it(`renders ${variant} variant`, () => {
      render(<Badge variant={variant}>Label</Badge>)
      const badge = screen.getByText('Label')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveAttribute('data-variant', variant)
    })
  })

  it('has no accessibility violations', async () => {
    const { container } = render(<Badge variant="status-ready">Pronto</Badge>)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
```

- [ ] **Step 3.2: Rodar teste para confirmar falha**

```bash
npm run test -- badge.test
```

Esperado: FAIL — variantes `status-*` não existem.

- [ ] **Step 3.3: Adicionar variantes de status ao badge.tsx**

No objeto `variants.variant` do `badgeVariants`, adicionar após `link`:

```ts
'status-draft':      'bg-muted text-muted-foreground border-transparent',
'status-processing': 'bg-amber-50 text-amber-700 border-amber-200',
'status-ready':      'bg-emerald-50 text-emerald-700 border-emerald-200',
'status-error':      'bg-red-50 text-red-600 border-red-200',
'status-archived':   'bg-gray-50 text-gray-500 border-gray-200',
```

- [ ] **Step 3.4: Rodar teste para confirmar aprovação**

```bash
npm run test -- badge.test
```

Esperado: PASS

- [ ] **Step 3.5: Commit**

```bash
git add components/ui/badge.tsx components/ui/badge.test.tsx
git commit -m "feat(ui): add exam status variants to Badge component"
```

---

## Task 4: Sidebar + AppLayout

**Files:**
- Create: `components/layout/sidebar.tsx`
- Create: `components/layout/sidebar.test.tsx`
- Create: `components/layout/app-layout.tsx`
- Modify: `app/(auth)/layout.tsx`
- Modify: `app/(admin)/layout.tsx`

- [ ] **Step 4.1: Escrever testes falhando para Sidebar**

Criar `components/layout/sidebar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { axe } from 'jest-axe'
import { vi, describe, it, expect } from 'vitest'
import { Sidebar } from './sidebar'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}))

describe('Sidebar', () => {
  it('renders navigation with aria-label', () => {
    render(
      <Sidebar
        role="user"
        userName="João Silva"
        userEmail="joao@escola.com"
      />
    )
    expect(screen.getByRole('navigation', { name: /navegação principal/i })).toBeInTheDocument()
  })

  it('renders dashboard link', () => {
    render(<Sidebar role="user" userName="João" userEmail="joao@email.com" />)
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
  })

  it('does NOT render admin section for role=user', () => {
    render(<Sidebar role="user" userName="João" userEmail="joao@email.com" />)
    expect(screen.queryByText(/administração/i)).not.toBeInTheDocument()
  })

  it('renders admin section for role=admin', () => {
    render(<Sidebar role="admin" userName="Admin" userEmail="admin@email.com" />)
    expect(screen.getByText(/administração/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /modelos de ia/i })).toBeInTheDocument()
  })

  it('marks current route as aria-current=page', () => {
    render(<Sidebar role="user" userName="João" userEmail="joao@email.com" />)
    const dashLink = screen.getByRole('link', { name: /dashboard/i })
    expect(dashLink).toHaveAttribute('aria-current', 'page')
  })

  it('has no accessibility violations', async () => {
    const { container } = render(
      <Sidebar role="user" userName="João" userEmail="joao@email.com" />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
```

- [ ] **Step 4.2: Rodar testes para confirmar falha**

```bash
npm run test -- sidebar.test
```

Esperado: FAIL — arquivo não existe.

- [ ] **Step 4.3: Criar components/layout/sidebar.tsx**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  Brain,
  LayoutDashboard,
  Bot,
  BookOpen,
  GraduationCap,
  Accessibility,
  Users,
  Cpu,
  Menu,
  X,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

const mainNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" aria-hidden="true" /> },
]

const adminNavItems: NavItem[] = [
  { label: 'Modelos de IA', href: '/config/models', icon: <Cpu className="w-4 h-4" aria-hidden="true" /> },
  { label: 'Agentes', href: '/config/agents', icon: <Bot className="w-4 h-4" aria-hidden="true" /> },
  { label: 'Disciplinas', href: '/config/subjects', icon: <BookOpen className="w-4 h-4" aria-hidden="true" /> },
  { label: 'Séries', href: '/config/grades', icon: <GraduationCap className="w-4 h-4" aria-hidden="true" /> },
  { label: 'Suportes', href: '/config/supports', icon: <Accessibility className="w-4 h-4" aria-hidden="true" /> },
  { label: 'Usuários', href: '/users', icon: <Users className="w-4 h-4" aria-hidden="true" /> },
]

interface SidebarProps {
  role: string
  userName?: string | null
  userEmail?: string | null
}

function NavLink({ item, currentPath }: { item: NavItem; currentPath: string }) {
  const isActive = currentPath === item.href || currentPath.startsWith(item.href + '/')
  return (
    <Link
      href={item.href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-150',
        isActive
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      {item.icon}
      {item.label}
    </Link>
  )
}

function SidebarContent({
  role,
  userName,
  userEmail,
  onClose,
}: SidebarProps & { onClose?: () => void }) {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <Brain className="w-6 h-6 text-primary" aria-hidden="true" />
        <span className="font-display text-sm font-700 text-foreground">
          Adapte Minha Prova
        </span>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto rounded-md p-1 text-muted-foreground hover:text-foreground md:hidden"
            aria-label="Fechar menu"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Main nav */}
      <nav aria-label="Navegação principal" className="flex-1 overflow-y-auto p-3 space-y-1">
        {mainNavItems.map((item) => (
          <NavLink key={item.href} item={item} currentPath={pathname} />
        ))}

        {/* Admin section */}
        {role === 'admin' && (
          <div className="pt-4">
            <p className="mb-1 px-3 text-caption uppercase tracking-wide text-muted-foreground">
              Administração
            </p>
            <div className="space-y-1">
              {adminNavItems.map((item) => (
                <NavLink key={item.href} item={item} currentPath={pathname} />
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* User footer */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-md px-3 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
            {userName?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{userName ?? 'Usuário'}</p>
            <p className="truncate text-caption text-muted-foreground">{userEmail ?? ''}</p>
          </div>
        </div>
        <form action="/api/auth/signout" method="post">
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="mt-1 w-full justify-start gap-2 text-muted-foreground"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            Sair
          </Button>
        </form>
      </div>
    </div>
  )
}

export function Sidebar({ role, userName, userEmail }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menu"
        aria-expanded={mobileOpen}
        className="fixed left-4 top-3 z-40 rounded-md p-2 text-muted-foreground hover:text-foreground md:hidden"
      >
        <Menu className="w-5 h-5" aria-hidden="true" />
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 border-r border-border bg-card z-30">
        <SidebarContent role={role} userName={userName} userEmail={userEmail} />
      </aside>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navegação"
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-60 border-r border-border bg-card transition-transform duration-[250ms] ease-in-out md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SidebarContent
          role={role}
          userName={userName}
          userEmail={userEmail}
          onClose={() => setMobileOpen(false)}
        />
      </aside>
    </>
  )
}
```

> **Nota:** O botão "Sair" usa `form action="/api/auth/signout"` — isso assume que existe (ou será criado) uma route handler para logout. Se o logout atual funciona de outra forma, ajustar o método de chamada sem alterar a funcionalidade.

- [ ] **Step 4.4: Criar components/layout/app-layout.tsx**

```tsx
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from './sidebar'

interface AppLayoutProps {
  children: React.ReactNode
}

export async function AppLayout({ children }: AppLayoutProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let role = 'user'
  let userName: string | null = null
  let userEmail: string | null = null

  if (user) {
    userEmail = user.email ?? null
    userName = user.user_metadata?.full_name ?? user.email ?? null

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    role = profile?.role ?? 'user'
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={role} userName={userName} userEmail={userEmail} />
      <main className="flex-1 overflow-y-auto md:pl-60">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 4.5: Atualizar app/(auth)/layout.tsx**

```tsx
import { AppLayout } from '@/components/layout/app-layout'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppLayout>{children}</AppLayout>
}
```

- [ ] **Step 4.6: Atualizar app/(admin)/layout.tsx**

```tsx
import { AppLayout } from '@/components/layout/app-layout'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppLayout>{children}</AppLayout>
}
```

- [ ] **Step 4.7: Rodar testes para confirmar aprovação**

```bash
npm run test -- sidebar.test
```

Esperado: PASS

- [ ] **Step 4.8: Verificar que build passa**

```bash
npm run typecheck && npm run build
```

- [ ] **Step 4.9: Commit**

```bash
git add components/layout/ app/(auth)/layout.tsx app/(admin)/layout.tsx
git commit -m "feat(layout): add Sidebar and AppLayout components with role-based admin section"
```

---

## Task 5: Landing Page

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 5.1: Reescrever app/page.tsx**

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  Brain,
  BarChart3,
  Users,
  FileText,
  Sparkles,
  ShieldCheck,
} from 'lucide-react'

export default async function LandingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-10 border-b border-border/40 bg-background/90 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" aria-hidden="true" />
            <span className="font-display text-sm font-bold text-foreground">
              Adapte Minha Prova
            </span>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/login">Entrar</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-primary py-24">
        <div className="container flex flex-col items-center text-center gap-6">
          <h1 className="text-display-xl font-display text-white max-w-3xl">
            Adapte provas para todos os alunos, com IA
          </h1>
          <p className="text-white/80 text-body max-w-xl">
            Crie versões adaptadas das suas avaliações em minutos. Inclusão educacional
            acessível para professores de todos os níveis.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <Button
              asChild
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-md hover:shadow-lg transition-shadow"
            >
              <Link href="/login">Começar gratuitamente</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-white/40 text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="#como-funciona">Ver como funciona</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="como-funciona" className="py-16">
        <div className="container">
          <h2 className="text-display-lg font-display text-center text-foreground mb-12">
            Tudo que você precisa para uma avaliação inclusiva
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-lg border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className={`mb-4 ${feature.iconColor}`}>{feature.icon}</div>
                <h3 className="text-heading text-foreground mb-2">{feature.title}</h3>
                <p className="text-small text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-muted py-16">
        <div className="container flex flex-col items-center text-center gap-6">
          <h2 className="text-display-lg font-display text-foreground max-w-xl">
            Pronto para transformar suas provas?
          </h2>
          <p className="text-body text-muted-foreground max-w-md">
            Junte-se a professores que já estão promovendo inclusão com tecnologia.
          </p>
          <Button asChild size="lg" variant="default">
            <Link href="/login">Criar minha conta</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container text-center text-small text-muted-foreground">
          © {new Date().getFullYear()} Adapte Minha Prova. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  )
}

const features = [
  {
    icon: <Brain className="w-8 h-8" aria-hidden="true" />,
    iconColor: 'text-primary',
    title: 'Adaptação com IA',
    description: 'Utilize inteligência artificial para adaptar suas provas de forma inteligente e inclusiva.',
  },
  {
    icon: <FileText className="w-8 h-8" aria-hidden="true" />,
    iconColor: 'text-emerald-600',
    title: 'Upload de PDF',
    description: 'Envie o PDF da sua prova e deixe a IA extrair e organizar as questões automaticamente.',
  },
  {
    icon: <Sparkles className="w-8 h-8" aria-hidden="true" />,
    iconColor: 'text-amber-500',
    title: 'Suportes Personalizados',
    description: 'Configure suportes educacionais específicos para diferentes necessidades dos alunos.',
  },
  {
    icon: <BarChart3 className="w-8 h-8" aria-hidden="true" />,
    iconColor: 'text-blue-600',
    title: 'Acompanhamento em Tempo Real',
    description: 'Monitore o progresso da adaptação com indicadores visuais em tempo real.',
  },
  {
    icon: <Users className="w-8 h-8" aria-hidden="true" />,
    iconColor: 'text-violet-600',
    title: 'Inclusão Educacional',
    description: 'Promova a inclusão com provas adaptadas para diferentes perfis de aprendizado.',
  },
  {
    icon: <ShieldCheck className="w-8 h-8" aria-hidden="true" />,
    iconColor: 'text-teal-600',
    title: 'Seguro e Confiável',
    description: 'Seus dados e os de seus alunos protegidos com a melhor infraestrutura de segurança.',
  },
]
```

- [ ] **Step 5.2: Verificar que build passa**

```bash
npm run typecheck && npm run build
```

- [ ] **Step 5.3: Commit**

```bash
git add app/page.tsx
git commit -m "feat(landing): redesign landing page with emerald hero and feature cards"
```

---

## Task 6: Login Page

**Files:**
- Modify: `app/(public)/login/page.tsx`

- [ ] **Step 6.1: Reescrever a página de login**

```tsx
'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Brain } from 'lucide-react'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/login/callback`,
        },
      })
    } catch (error) {
      console.error('Login error:', error)
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
            <Brain className="w-8 h-8 text-primary" aria-hidden="true" />
          </div>
          <span className="font-display text-sm font-bold text-foreground">
            Adapte Minha Prova
          </span>
        </div>

        {/* Heading */}
        <h1 className="text-display-md font-display text-foreground text-center mb-2">
          Bem-vindo de volta
        </h1>
        <p className="text-small text-muted-foreground text-center mb-8">
          Entre com sua conta Google para continuar
        </p>

        {/* Google button */}
        <Button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full gap-3 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          size="lg"
        >
          {isLoading ? (
            <>
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                aria-hidden="true"
              />
              Conectando...
            </>
          ) : (
            <>
              <GoogleIcon />
              Entrar com Google
            </>
          )}
        </Button>

        {/* Privacy note */}
        <p className="mt-6 text-caption text-muted-foreground text-center">
          Ao entrar, você concorda com nossos termos de uso e política de privacidade.
        </p>
      </div>
    </main>
  )
}
```

- [ ] **Step 6.2: Verificar typecheck**

```bash
npm run typecheck
```

- [ ] **Step 6.3: Commit**

```bash
git add app/(public)/login/page.tsx
git commit -m "feat(login): redesign login page with card layout and styled Google button"
```

---

## Task 7: Dashboard

**Files:**
- Modify: `app/(auth)/dashboard/page.tsx`
- Modify: `app/(auth)/dashboard/page.test.tsx`

- [ ] **Step 7.1: Reescrever app/(auth)/dashboard/page.tsx**

```tsx
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Plus, ClipboardList } from 'lucide-react'
import type { ExamStatus } from '@/lib/types/extraction'

function formatRelativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `há ${days} dias`
  const months = Math.floor(days / 30)
  return `há ${months} meses`
}

interface Exam {
  id: string
  title: string
  status: ExamStatus
  created_at: string
  updated_at: string
}

async function fetchUserExams(): Promise<Exam[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const { data: exams, error } = await supabase
    .from('exams')
    .select('id, title, status, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error || !exams) return []
  return exams
}

const statusConfig: Record<
  ExamStatus,
  {
    barColor: string
    badgeVariant: 'status-draft' | 'status-processing' | 'status-ready' | 'status-error' | 'status-archived'
    badgeLabel: string
    actionLabel: string
    actionHref: (id: string) => string
    actionDisabled?: boolean
  }
> = {
  draft: {
    barColor: 'bg-muted-foreground',
    badgeVariant: 'status-draft',
    badgeLabel: 'Rascunho',
    actionLabel: 'Continuar',
    actionHref: (id) => `/exams/${id}/extraction`,
  },
  processing: {
    barColor: 'bg-accent',
    badgeVariant: 'status-processing',
    badgeLabel: 'Processando',
    actionLabel: 'Aguardando...',
    actionHref: () => '#',
    actionDisabled: true,
  },
  ready: {
    barColor: 'bg-success',
    badgeVariant: 'status-ready',
    badgeLabel: 'Pronto',
    actionLabel: 'Ver Resultado',
    actionHref: (id) => `/exams/${id}/result`,
  },
  error: {
    barColor: 'bg-destructive',
    badgeVariant: 'status-error',
    badgeLabel: 'Erro',
    actionLabel: 'Tentar Novamente',
    actionHref: () => '/exams/new',
  },
  archived: {
    barColor: 'bg-muted-foreground',
    badgeVariant: 'status-archived',
    badgeLabel: 'Arquivado',
    actionLabel: 'Ver Arquivo',
    actionHref: (id) => `/exams/${id}/result`,
  },
}

export default async function DashboardPage() {
  const exams = await fetchUserExams()

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-display-md font-display text-foreground">Minhas Provas</h1>
        <Button asChild variant="accent" size="sm">
          <Link href="/exams/new">
            <Plus className="w-4 h-4" aria-hidden="true" />
            Nova Prova
          </Link>
        </Button>
      </div>

      {/* Empty state */}
      {exams.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <ClipboardList
            className="w-16 h-16 text-muted-foreground/50"
            aria-hidden="true"
          />
          <h2 className="text-heading text-foreground">Nenhuma prova ainda</h2>
          <p className="text-small text-muted-foreground max-w-xs">
            Crie sua primeira prova para começar a adaptar avaliações com IA.
          </p>
          <Button asChild variant="default" size="sm">
            <Link href="/exams/new">Criar primeira prova</Link>
          </Button>
        </div>
      )}

      {/* Exams grid */}
      {exams.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {exams.map((exam) => {
            const config = statusConfig[exam.status] ?? statusConfig.draft
            const timeAgo = formatRelativeDate(exam.updated_at)

            return (
              <div
                key={exam.id}
                className="relative flex rounded-lg border border-border bg-card shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 overflow-hidden"
              >
                {/* Status bar */}
                <div className={`w-1 shrink-0 ${config.barColor}`} aria-hidden="true" />

                {/* Content */}
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-heading text-foreground line-clamp-2 flex-1">
                      {exam.title}
                    </h2>
                    <Badge variant={config.badgeVariant}>{config.badgeLabel}</Badge>
                  </div>
                  <p className="text-small text-muted-foreground">{timeAgo}</p>
                  <div className="mt-auto">
                    <Button
                      asChild={!config.actionDisabled}
                      variant="outline"
                      size="sm"
                      disabled={config.actionDisabled}
                      className="w-full"
                    >
                      {config.actionDisabled ? (
                        <span>{config.actionLabel}</span>
                      ) : (
                        <Link href={config.actionHref(exam.id)}>
                          {config.actionLabel}
                        </Link>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

> **Nota:** Este código usa `date-fns` e `date-fns/locale`. Se não estiver instalado, rodar `npm install date-fns`. Verifique se já está no `package.json` antes.

- [ ] **Step 7.2: Ler testes existentes e identificar falhas esperadas**

Ler `app/(auth)/dashboard/page.test.tsx` para identificar quais asserções de texto/estrutura vão falhar com a nova UI.

Rodar os testes antes de implementar para confirmar o estado de partida:

```bash
npm run test -- dashboard
```

Anotar quais testes falham (são os que precisam ser atualizados na Step 7.4).

- [ ] **Step 7.3: Atualizar page.test.tsx para refletir nova UI**

Atualizar as asserções para os novos textos/elementos:

- `"Minhas Provas"` em vez de qualquer título antigo
- `"Nova Prova"` para o botão de criação
- `"Nenhuma prova ainda"` para o empty state
- Status badges por `data-variant` em vez de classe CSS

- [ ] **Step 7.4: Rodar testes**

```bash
npm run test -- dashboard
```

Esperado: PASS

- [ ] **Step 7.5: Commit**

```bash
git add app/(auth)/dashboard/
git commit -m "feat(dashboard): redesign exam cards with status bars and contextual action buttons"
```

---

## Task 8: Stepper Component

**Files:**
- Create: `components/ui/stepper.tsx`
- Create: `components/ui/stepper.test.tsx`

- [ ] **Step 8.1: Escrever testes falhando**

Criar `components/ui/stepper.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { describe, it, expect } from 'vitest'
import { Stepper } from './stepper'

const steps = ['Informações', 'Configurações', 'Upload', 'Revisão']

describe('Stepper', () => {
  it('renders all step labels on desktop', () => {
    render(<Stepper steps={steps} currentStep={0} />)
    steps.forEach((step) => {
      expect(screen.getByText(step)).toBeInTheDocument()
    })
  })

  it('marks current step as active', () => {
    render(<Stepper steps={steps} currentStep={1} />)
    const activeStep = screen.getByText('Configurações').closest('[data-state]')
    expect(activeStep).toHaveAttribute('data-state', 'active')
  })

  it('marks completed steps', () => {
    render(<Stepper steps={steps} currentStep={2} />)
    const completedStep = screen.getByText('Informações').closest('[data-state]')
    expect(completedStep).toHaveAttribute('data-state', 'complete')
  })

  it('shows progress bar with correct width', () => {
    render(<Stepper steps={steps} currentStep={2} />)
    // Step 2 of 4 = 50%
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveAttribute('aria-valuenow', '50')
  })

  it('has no accessibility violations', async () => {
    const { container } = render(<Stepper steps={steps} currentStep={0} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
```

- [ ] **Step 8.2: Rodar testes para confirmar falha**

```bash
npm run test -- stepper.test
```

Esperado: FAIL — arquivo não existe.

- [ ] **Step 8.3: Criar components/ui/stepper.tsx**

```tsx
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StepperProps {
  steps: string[]
  currentStep: number // 0-indexed
  className?: string
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  const progressPercent = Math.round((currentStep / (steps.length - 1)) * 100)

  return (
    <div className={cn('w-full', className)}>
      {/* Progress bar */}
      <div className="mb-4 h-1 w-full rounded-full bg-muted overflow-hidden">
        <div
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Etapa ${currentStep + 1} de ${steps.length}`}
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Steps — desktop */}
      <ol className="hidden sm:flex items-center justify-between">
        {steps.map((step, index) => {
          const state =
            index < currentStep
              ? 'complete'
              : index === currentStep
              ? 'active'
              : 'pending'

          return (
            <li
              key={step}
              data-state={state}
              className="flex flex-col items-center gap-2"
            >
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors',
                  state === 'complete' && 'border-success bg-success text-success-foreground',
                  state === 'active' && 'border-primary bg-primary text-primary-foreground',
                  state === 'pending' && 'border-border bg-background text-muted-foreground'
                )}
                aria-hidden="true"
              >
                {state === 'complete' ? (
                  <Check className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={cn(
                  'text-caption',
                  state === 'active' && 'text-primary font-semibold',
                  state === 'complete' && 'text-success',
                  state === 'pending' && 'text-muted-foreground'
                )}
              >
                {step}
              </span>
            </li>
          )
        })}
      </ol>

      {/* Steps — mobile */}
      <p className="sm:hidden text-small text-muted-foreground text-center">
        Etapa {currentStep + 1} de {steps.length} — {steps[currentStep]}
      </p>
    </div>
  )
}
```

- [ ] **Step 8.4: Rodar testes para confirmar aprovação**

```bash
npm run test -- stepper.test
```

Esperado: PASS

- [ ] **Step 8.5: Commit**

```bash
git add components/ui/stepper.tsx components/ui/stepper.test.tsx
git commit -m "feat(ui): add Stepper component with progress bar and mobile fallback"
```

---

## Task 9: Nova Prova — Wizard com Stepper

**Files:**
- Modify: `app/(auth)/exams/new/page.tsx`
- Modify: `components/new-exam-form.tsx`

> **Contexto:** O form atual em `components/new-exam-form.tsx` é um Client Component que contém toda a lógica. A estratégia é manter a lógica intacta e envolver o form no Stepper visual, mostrando uma etapa por vez.

- [ ] **Step 9.1: Ler o estado atual de new-exam-form.tsx**

```bash
# Ler o componente atual para entender os campos antes de modificar
```

Usar o Read tool para ler `components/new-exam-form.tsx` completo.

- [ ] **Step 9.2: Atualizar new-exam-form.tsx para usar Stepper**

**Mapeamento de campos por etapa** (confirmar contra o código lido na Step 9.1):
1. **Informações** (step 0): campo `title` (nome da prova) + `Label`
2. **Configurações** (step 1): `Select` de `subject_id`, `Select` de `grade_level_id`, checkboxes de `support_ids`
3. **Upload** (step 2): input `type="file"` para PDF
4. **Revisão** (step 3): resumo read-only dos dados preenchidos + botão "Enviar"

Adicionar no topo do componente:
```tsx
const STEPS = ['Informações', 'Configurações', 'Upload', 'Revisão']
const [currentStep, setCurrentStep] = useState(0)
```

Adicionar `<Stepper steps={STEPS} currentStep={currentStep} className="mb-8" />` no topo do form.

Envolver cada grupo de campos em `{currentStep === N && (...)}`.

Adicionar rodapé de navegação:
```tsx
<div className="mt-8 flex justify-between">
  <Button
    type="button"
    variant="outline"
    onClick={() => setCurrentStep((s) => s - 1)}
    disabled={currentStep === 0}
  >
    Voltar
  </Button>
  {currentStep < STEPS.length - 1 ? (
    <Button type="button" variant="default" onClick={() => setCurrentStep((s) => s + 1)}>
      Continuar
    </Button>
  ) : (
    <Button type="submit" variant="default" disabled={isSubmitting}>
      {isSubmitting ? 'Enviando...' : 'Enviar'}
    </Button>
  )}
</div>
```

Manter toda a lógica de validação e submit existente — apenas reorganizar a apresentação dos campos.

- [ ] **Step 9.3: Rodar testes existentes**

```bash
npm run test -- new-exam-form
```

Se quebrarem, atualizar os testes para refletir a navegação por etapas.

- [ ] **Step 9.4: Commit**

```bash
git add app/(auth)/exams/new/ components/new-exam-form.tsx
git commit -m "feat(exams/new): integrate Stepper wizard into new exam form"
```

---

## Task 10: Extração

**Files:**
- Modify: `app/(auth)/exams/[id]/extraction/page.tsx`
- Modify: `components/extraction-form.tsx`

- [ ] **Step 10.1: Ler e rodar testes existentes para confirmar falhas esperadas**

Ler `app/(auth)/exams/[id]/extraction/page.tsx` e `components/extraction-form.tsx` com Read tool.
Ler e rodar os testes existentes:

```bash
npm run test -- extraction
```

Anotar quais falham (a serem corrigidos em Step 10.3).

- [ ] **Step 10.2: Atualizar UI da extração**

Mudanças no `components/extraction-form.tsx`:
- Adicionar header com `"Revisar Questões Extraídas"` em `display-md font-display`
- Adicionar indicador `"X de Y confirmadas"` ao lado do título
- Adicionar botão `"Confirmar todas"` em `variant="outline"`
- Questões confirmadas: adicionar `border-emerald-200 bg-emerald-50/50`
- Questões pendentes: manter `border-border bg-card`
- Botão `"Enviar para Adaptação"`: mover para rodapé, desabilitado até 100% confirmadas

- [ ] **Step 10.3: Rodar testes existentes**

```bash
npm run test -- extraction
```

Atualizar se necessário.

- [ ] **Step 10.4: Commit**

```bash
git add app/(auth)/exams/[id]/extraction/ components/extraction-form.tsx
git commit -m "feat(extraction): update extraction UI with confirmation counter and visual feedback"
```

---

## Task 11: Processamento

**Files:**
- Modify: `app/(auth)/exams/[id]/processing/processing-progress-client.tsx`
- Modify: `app/(auth)/exams/[id]/processing/page.tsx`

- [ ] **Step 11.1: Ler e rodar testes existentes de processamento**

Ler `processing-progress-client.tsx` e `page.tsx` com Read tool.
Rodar testes antes de implementar:

```bash
npm run test -- processing
```

Anotar quais falham.

- [ ] **Step 11.2: Atualizar processing-progress-client.tsx**

```tsx
// Adicionar após os imports existentes:
import { Brain } from 'lucide-react'

// Na renderização, substituir o spinner atual por:
<div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
  {/* Animated icon */}
  <div className="motion-safe:animate-pulse">
    <Brain
      className="w-16 h-16 text-primary"
      aria-hidden="true"
    />
  </div>

  {/* Percentage */}
  <p className="text-display-md font-display text-primary">
    {progress}%
  </p>

  {/* Progress bar */}
  <div className="w-full max-w-sm">
    <div
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Progresso da adaptação"
      className="h-3 rounded-full bg-muted overflow-hidden"
    >
      <div
        className="h-full rounded-full bg-primary transition-all duration-500"
        style={{ width: `${progress}%` }}
      />
    </div>
  </div>

  {/* Status text */}
  <p className="text-body text-muted-foreground text-center max-w-xs">
    {statusMessage ?? 'Processando adaptações...'}
  </p>
</div>
```

Ajustar props conforme a interface existente do componente.

- [ ] **Step 11.3: Rodar testes existentes**

```bash
npm run test -- processing
```

Atualizar se necessário.

- [ ] **Step 11.4: Commit**

```bash
git add app/(auth)/exams/[id]/processing/
git commit -m "feat(processing): update processing page with animated Brain icon and expressive progress bar"
```

---

## Task 12: Resultado

**Files:**
- Modify: `app/(auth)/exams/[id]/result/page.tsx`
- Modify: `components/exam-result-page.tsx`
- Modify: `components/question-result-card.tsx`

- [ ] **Step 12.1: Ler e rodar testes existentes de resultado**

Ler `exam-result-page.tsx`, `question-result-card.tsx` e `result/page.tsx` com Read tool.
Rodar testes antes de implementar:

```bash
npm run test -- result
```

Anotar quais falham. Importações necessárias para Task 12:

```tsx
// Imports de ícones Lucide necessários para componentes do resultado:
import { Copy, Check, ThumbsUp, ThumbsDown } from 'lucide-react'
```

- [ ] **Step 12.2: Atualizar question-result-card.tsx**

Adicionar:
- Layout two-column dentro do card (`grid grid-cols-1 md:grid-cols-2 gap-0`)
- Coluna esquerda com borda direita: `border-r border-border pr-6`
- Coluna direita: `pl-6`
- Header do card: `"Questão [N]"` + botão `"Copiar adaptação"` com feedback visual
- Substituir star rating por thumbs up/down + textarea opcional

```tsx
// Estrutura do card atualizada:
<div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
  {/* Card header */}
  <div className="flex items-center justify-between border-b border-border px-6 py-3">
    <h3 className="text-small font-medium text-muted-foreground">
      Questão {index + 1}
    </h3>
    <CopyButton text={adaptedText} />
  </div>

  {/* Two-column content */}
  <div className="grid grid-cols-1 md:grid-cols-2">
    <div className="p-6 md:border-r md:border-border">
      <p className="text-caption uppercase tracking-wide text-muted-foreground mb-3">
        Original
      </p>
      <p className="text-body leading-relaxed">{originalText}</p>
    </div>
    <div className="p-6 border-t border-border md:border-t-0">
      <p className="text-caption uppercase tracking-wide text-muted-foreground mb-3">
        Adaptada
      </p>
      <p className="text-body leading-relaxed">{adaptedText}</p>
    </div>
  </div>

  {/* Feedback */}
  <div className="border-t border-border px-6 py-4">
    <ThumbsFeedback questionId={questionId} />
  </div>
</div>
```

- [ ] **Step 12.3: Criar CopyButton e ThumbsFeedback como subcomponentes internos**

`CopyButton`: estado `copied` (false → true → false após 2s), mostra `Check` + "Copiado!" quando ativo.

`ThumbsFeedback`: estados `selected` (null | 'up' | 'down') e `comment`, mostra textarea após seleção, botão "Enviar feedback" ao clicar.

- [ ] **Step 12.4: Atualizar header em exam-result-page.tsx**

```tsx
// Header da página de resultado:
<div className="mb-8 flex flex-wrap items-center justify-between gap-4">
  <h1 className="text-display-md font-display text-foreground">
    Resultado da Adaptação
  </h1>
  <div className="flex gap-2">
    <Button variant="outline" size="sm">Exportar PDF</Button>
    <Button asChild variant="ghost" size="sm">
      <Link href="/dashboard">Voltar ao Dashboard</Link>
    </Button>
  </div>
</div>
```

- [ ] **Step 12.5: Rodar testes existentes**

```bash
npm run test -- result
```

Atualizar se necessário.

- [ ] **Step 12.6: Commit**

```bash
git add app/(auth)/exams/[id]/result/ components/exam-result-page.tsx components/question-result-card.tsx
git commit -m "feat(result): add two-column layout, copy button, and thumbs feedback to result page"
```

---

## Task 13: Admin — Tabelas de Config

**Files:**
- Modify: `components/admin/ai-models-management.tsx`
- Modify: `components/admin/agents-management.tsx`
- Modify: `components/admin/subjects-management.tsx`
- Modify: `components/admin/grades-management.tsx`
- Modify: `components/admin/supports-management.tsx`
- Modify: `app/(admin)/config/models/page.tsx`
- Modify: `app/(admin)/config/agents/page.tsx`
- Modify: `app/(admin)/config/subjects/page.tsx`
- Modify: `app/(admin)/config/grades/page.tsx`
- Modify: `app/(admin)/config/supports/page.tsx`

- [ ] **Step 13.1: Adicionar Tooltip e verificar Select via shadcn CLI**

```bash
# Adicionar Tooltip
npx shadcn add tooltip

# Verificar que Select já existe (gerado em task anterior ou existente)
ls components/ui/select.tsx || npx shadcn add select

# Verificar build após adicionar componentes
npm run typecheck
```

- [ ] **Step 13.2: Ler arquivos admin existentes**

Usar Read tool para ler `components/admin/ai-models-management.tsx` como referência do padrão atual.

- [ ] **Step 13.3: Definir padrão de tabela admin reutilizável**

Aplicar em todos os 5 componentes de config o seguinte padrão visual:

```tsx
// Header da seção
<div className="mb-6 flex items-center justify-between">
  <h1 className="text-display-md font-display text-foreground">[Título]</h1>
  <Button variant="default" size="sm" onClick={handleAdd}>
    <Plus className="w-4 h-4" aria-hidden="true" />
    Adicionar [item]
  </Button>
</div>

// Campo de busca
<div className="mb-4 relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
  <Input
    placeholder="Buscar..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    className="pl-9"
    aria-label="Buscar itens"
  />
</div>

// Tabela
<div className="rounded-lg border border-border overflow-hidden">
  <table className="w-full">
    <thead className="bg-muted">
      <tr>
        <th className="px-4 py-3 text-left text-caption uppercase tracking-wide text-muted-foreground font-medium">
          Nome
        </th>
        {/* demais colunas */}
        <th className="px-4 py-3 text-right text-caption uppercase tracking-wide text-muted-foreground font-medium w-24">
          Ações
        </th>
      </tr>
    </thead>
    <tbody className="divide-y divide-border">
      {filtered.map((item) => (
        <tr key={item.id} className="hover:bg-muted/50 h-12">
          <td className="px-4 py-2 text-body">{item.name}</td>
          <td className="px-4 py-2 text-right">
            <div className="flex items-center justify-end gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleEdit(item)}>
                      <Pencil className="w-4 h-4" aria-hidden="true" />
                      <span className="sr-only">Editar {item.name}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Editar</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleDeleteConfirm(item)}>
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                      <span className="sr-only">Deletar {item.name}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Deletar</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  </table>

  {/* Empty state */}
  {filtered.length === 0 && (
    <div className="flex flex-col items-center py-12 gap-3 text-center">
      <p className="text-body text-muted-foreground">Nenhum item encontrado.</p>
      <Button variant="default" size="sm" onClick={handleAdd}>
        Adicionar primeiro item
      </Button>
    </div>
  )}
</div>

// Dialog de confirmação de delete
<Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Tem certeza?</DialogTitle>
      <DialogDescription>
        Esta ação irá deletar permanentemente "{deleteTarget?.name}". Não pode ser desfeita.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
      <Button variant="destructive" onClick={handleDelete}>Deletar</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

- [ ] **Step 13.4: Aplicar padrão em todos os 5 componentes de config**

Para cada componente (`ai-models-management`, `agents-management`, `subjects-management`, `grades-management`, `supports-management`):
1. Adicionar estado `search` para filtragem local
2. Adicionar campo de busca
3. Atualizar header com novo estilo
4. Atualizar tabela com novo estilo (row height 48px, hover, ações com Tooltip)
5. Atualizar Dialog de delete para o padrão acima

- [ ] **Step 13.5: Rodar testes existentes de admin**

```bash
npm run test -- models
```

Atualizar asserções se necessário.

- [ ] **Step 13.6: Commit**

```bash
git add components/admin/ app/(admin)/config/
git commit -m "feat(admin): update config tables with search, tooltips, and consistent table pattern"
```

---

## Task 14: Usuários

**Files:**
- Modify: `components/admin/user-management.tsx`
- Modify: `app/(admin)/users/page.tsx`

- [ ] **Step 14.1: Ler arquivos atuais de usuários**

Usar Read tool para ler `components/admin/user-management.tsx` e `app/(admin)/users/page.tsx`.

- [ ] **Step 14.2: Atualizar user-management.tsx**

Aplicar o padrão de tabela da Task 13, com:

**Colunas:**
```tsx
// Avatar
<td className="px-4 py-2">
  <div className="flex items-center gap-3">
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium"
      aria-hidden="true"
    >
      {user.name?.[0]?.toUpperCase() ?? '?'}
    </div>
    <div>
      <p className="text-small font-medium text-foreground">{user.name}</p>
      <p className="text-caption text-muted-foreground">{user.email}</p>
    </div>
  </div>
</td>

// Role badge
<td className="px-4 py-2">
  <span className={cn(
    'inline-flex items-center rounded-md px-2 py-0.5 text-caption font-medium',
    user.role === 'admin' && 'bg-primary/10 text-primary',
    user.role === 'teacher' && 'bg-blue-50 text-blue-700',
    user.role === 'user' && 'bg-muted text-muted-foreground',
  )}>
    {user.role}
  </span>
</td>

// Status badge
<td className="px-4 py-2">
  <span className={cn(
    'inline-flex items-center rounded-md px-2 py-0.5 text-caption font-medium',
    user.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
  )}>
    {user.is_active ? 'Ativo' : 'Bloqueado'}
  </span>
</td>
```

**Filtros:**
```tsx
<div className="mb-4 flex flex-wrap gap-3">
  {/* Campo de busca */}
  <div className="relative flex-1 min-w-48">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
    <Input placeholder="Buscar por nome ou email..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
  </div>

  {/* Filtro de role */}
  <Select value={roleFilter} onValueChange={setRoleFilter}>
    <SelectTrigger className="w-40">
      <SelectValue placeholder="Todos os roles" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Todos os roles</SelectItem>
      <SelectItem value="admin">Admin</SelectItem>
      <SelectItem value="teacher">Teacher</SelectItem>
      <SelectItem value="user">User</SelectItem>
    </SelectContent>
  </Select>

  {/* Filtro de status */}
  <Select value={statusFilter} onValueChange={setStatusFilter}>
    <SelectTrigger className="w-44">
      <SelectValue placeholder="Todos os status" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Todos os status</SelectItem>
      <SelectItem value="active">Ativo</SelectItem>
      <SelectItem value="blocked">Bloqueado</SelectItem>
    </SelectContent>
  </Select>
</div>
```

- [ ] **Step 14.3: Rodar testes existentes de usuários**

```bash
npm run test -- users
```

Atualizar se necessário.

- [ ] **Step 14.4: Rodar suite completa de testes**

```bash
npm run test
```

Esperado: todos passam. Corrigir qualquer falha antes de continuar.

- [ ] **Step 14.5: Rodar lint e typecheck**

```bash
npm run lint && npm run typecheck
```

Esperado: sem erros.

- [ ] **Step 14.6: Commit final**

```bash
git add components/admin/user-management.tsx app/(admin)/users/
git commit -m "feat(users): update user management table with avatar, role/status badges, and filters"
```

---

## Verificação Final

- [ ] **Rodar todos os checks**

```bash
npm run lint && npm run typecheck && npm run test && npm run build
```

Esperado: tudo passa sem erros.

- [ ] **Verificar acessibilidade E2E**

```bash
npm run test:a11y
```

- [ ] **Commit de finalização (se houver ajustes)**

```bash
git add -A
git commit -m "fix: final adjustments after full UI/UX redesign"
```

---

## Referência Rápida

### Paleta de Cores
- Primary: `#0D7C66` (verde-esmeralda)
- Accent: `#F59E0B` (âmbar — nunca como texto)
- Background: `#FAFAF7` (off-white quente)
- Foreground: `#1C1917` (quase-preto quente)

### Classes Tailwind Novas
- `font-display` — Plus Jakarta Sans
- `font-sans` — Inter
- `text-display-xl/lg/md`, `text-heading`, `text-body`, `text-small`, `text-caption`
- `rounded-sm/md/lg/xl` (6/12/16/24px)
- `shadow-sm/md/lg` (tons quentes)

### Variantes Novas
- `Button variant="accent"` — fundo âmbar
- `Badge variant="status-draft/processing/ready/error/archived"`

### Regra de Ouro
O âmbar (`--accent`) **nunca** como cor de texto — apenas como fundo.
