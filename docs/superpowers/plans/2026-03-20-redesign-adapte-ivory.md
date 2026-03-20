# Redesign Adapte Ivory — Implementação do Novo Design System

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesenhar todas as telas do sistema para seguir o protótipo "Adapte Ivory / The Editorial Educator" — paleta verde esmeralda, tipografia editorial (Plus Jakarta Sans + Inter + JetBrains Mono), sidebar glassmorphism e hierarquia de superfícies sem linhas (no-line philosophy).

**Architecture:** As mudanças são primariamente de camada visual — tokens de design, estilos de componentes e layouts de página. A lógica de negócio, queries ao Supabase e estrutura de rotas permanecem intactas. A abordagem é bottom-up: tokens primeiro → shell/layout → páginas públicas → fluxo principal do usuário → páginas administrativas.

**Tech Stack:** Next.js 16 App Router, React 19, shadcn/ui (radix-nova), Tailwind CSS v3, Plus Jakarta Sans + Inter + JetBrains Mono (já carregados em `app/layout.tsx`), Lucide React (ícones — manter em vez de Material Symbols), Supabase SSR.

---

## Contexto e Restrições Críticas

### Design System Alvo (docs/prototipo/adapte_ivory/DESIGN.md)
- **Paleta:** Verde esmeralda `#00614f` (primary), `#0d7c66` (primary-container), `#f9f9f6` (surface), `#f4f4f1` (surface-container-low), `#eeeeeb` (surface-container)
- **No-Line Philosophy:** sem `border` para separar seções — usar variação de fundo em vez
- **Sidebar:** glassmorphism (`bg-[#f4f4f1]/80 backdrop-blur-xl`), active state emerald
- **Tipografia:** Plus Jakarta Sans (headlines/display), Inter (body), JetBrains Mono (meta/ids)
- **Raio de borda:** `rounded-xl` (0.75rem) como padrão base

### Estado Atual dos Tokens (globals.css)
- `--primary: 161 61% 23%` → já verde, mas menos saturado que o alvo
- `--secondary: 30 100% 50%` → **LARANJA** — deve ser alterado para neutro
- `--accent: 30 100% 50%` → **LARANJA** — deve ser primary-container verde
- `--background: 0 0% 98.5%` → branco frio, deve ser off-white quente
- `tailwind.config.ts` tem `font-sans = Plus Jakarta Sans` → deve ser Inter para corpo

### Restrição de Dados (CRÍTICA)
**Não mockar dados.** Exibir apenas o que existe no banco:
- Dashboard: lista de provas (title, status, created_at, updated_at) + COUNT por status
- Extraction: questões (id, question_text, question_type, alternatives)
- Processing: nome da prova + status (polling existente)
- Result: questões + adaptações (dados reais)
- Se o protótipo mostra stats que não existem no DB → **omitir**

### Rotas de Admin Corretas
O `sidebar.tsx` atual tem rotas erradas. Usar:
- `/config/models`, `/config/agents`, `/config/subjects`, `/config/grades`, `/config/supports`
- `/users`

---

## Mapa de Arquivos

```
Modificar:
  app/globals.css                                   ← tokens de cor e superfície
  tailwind.config.ts                                ← adicionar cores surface-*, primary-container, tertiary; fix font-sans
  components/layout/sidebar.tsx                     ← glassmorphism, rotas corretas, emerald active
  components/layout/app-layout.tsx                  ← passar avatar/role ao sidebar, ajustar padding
  app/(public)/page.tsx                             ← landing page completa
  app/(public)/login/page.tsx                       ← layout dois painéis
  app/(auth)/dashboard/page.tsx                     ← cards editoriais + query de contagem
  components/new-exam-form.tsx                      ← visual das 4 etapas do wizard
  components/ui/stepper.tsx                         ← atualizar visual do stepper
  components/extraction-form.tsx                    ← layout editorial das questões
  app/(auth)/exams/[id]/processing/page.tsx         ← layout atualizado
  app/(auth)/exams/[id]/processing/processing-progress-client.tsx ← progress bar redesign
  components/exam-result-page.tsx                   ← layout duas colunas
  components/question-result-card.tsx               ← card editorial original/adaptado
  components/admin/ai-models-management.tsx         ← table com shadcn Table
  components/admin/user-management.tsx              ← table com shadcn Table + Avatar
  components/admin/agents-management.tsx            ← table com shadcn Table
  components/admin/grades-management.tsx            ← table com shadcn Table
  components/admin/subjects-management.tsx          ← table com shadcn Table
  components/admin/supports-management.tsx          ← table com shadcn Table

Instalar (shadcn):
  table, progress, avatar, separator, alert, scroll-area
```

---

## Task 1: Atualizar Tokens de Design (globals.css + tailwind.config.ts)

**Files:**
- Modify: `app/globals.css`
- Modify: `tailwind.config.ts`

Esta é a tarefa fundacional. Todos os componentes subsequentes dependem dos novos tokens.

- [ ] **Step 1: Atualizar tokens de cor em globals.css**

Substituir o bloco `:root { }` em `app/globals.css` por:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Background — off-white quente do protótipo */
    --background: 60 5% 98%;           /* #f9f9f6 */
    --foreground: 156 5% 11%;          /* #1a1c1b — preto quente */

    /* Cards — branco puro para contraste em superfície */
    --card: 0 0% 100%;                 /* #ffffff */
    --card-foreground: 156 5% 11%;

    --popover: 0 0% 100%;
    --popover-foreground: 156 5% 11%;

    /* Primary — esmeralda escuro #00614f */
    --primary: 166 100% 19%;
    --primary-foreground: 0 0% 100%;

    /* Primary Container — esmeralda médio #0d7c66 (hover ativo, CTAs) */
    --primary-container: 164 83% 26%;
    --primary-container-foreground: 0 0% 100%;

    /* Secondary — superfície neutra (sem laranja!) */
    --secondary: 60 4% 92%;            /* #eeeeeb surface-container */
    --secondary-foreground: 156 5% 11%;

    /* Muted — superfície sutil */
    --muted: 60 4% 92%;                /* #eeeeeb */
    --muted-foreground: 155 8% 43%;    /* #5e5f5b */

    /* Accent — primary-container verde para hovers */
    --accent: 164 83% 26%;             /* #0d7c66 */
    --accent-foreground: 0 0% 100%;

    /* Surface hierarchy — camadas de profundidade sem bordas */
    --surface-container-low: 60 5% 95%;  /* #f4f4f1 */
    --surface-container: 60 4% 92%;      /* #eeeeeb */

    /* Tertiary — âmbar para CTAs de alta ênfase */
    --tertiary: 32 100% 24%;           /* #794b00 */
    --tertiary-foreground: 35 100% 73%;/* #ffddb8 */
    --tertiary-fixed: 35 100% 86%;     /* #ffddb8 light */
    --tertiary-fixed-foreground: 30 100% 9%; /* #2a1700 */

    /* Feedback */
    --destructive: 0 72% 40%;          /* #ba1a1a — mais escuro que o atual */
    --destructive-foreground: 0 0% 100%;

    --success: 155 65% 35%;
    --success-foreground: 0 0% 100%;

    /* Borders — ghost border outline-variant */
    --border: 168 14% 75%;             /* #bdc9c4 */
    --input: 168 14% 75%;
    --ring: 166 100% 19%;              /* primary */

    /* Radius — xl como padrão (12px) */
    --radius: 0.75rem;
  }

  .dark {
    --background: 156 20% 8%;
    --foreground: 60 5% 96%;

    --card: 156 20% 10%;
    --card-foreground: 60 5% 96%;

    --popover: 156 20% 10%;
    --popover-foreground: 60 5% 96%;

    --primary: 166 80% 55%;
    --primary-foreground: 156 20% 8%;

    --primary-container: 164 70% 40%;
    --primary-container-foreground: 0 0% 100%;

    --secondary: 156 15% 18%;
    --secondary-foreground: 60 5% 96%;

    --muted: 156 15% 18%;
    --muted-foreground: 155 8% 65%;

    --accent: 164 70% 40%;
    --accent-foreground: 0 0% 100%;

    --surface-container-low: 156 20% 12%;
    --surface-container: 156 15% 15%;

    --tertiary: 35 80% 60%;
    --tertiary-foreground: 30 100% 9%;
    --tertiary-fixed: 35 100% 25%;
    --tertiary-fixed-foreground: 35 100% 86%;

    --destructive: 0 72% 50%;
    --destructive-foreground: 0 0% 100%;

    --success: 155 65% 45%;
    --success-foreground: 0 0% 100%;

    --border: 156 15% 25%;
    --input: 156 15% 25%;
    --ring: 166 80% 55%;
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
  }
}
```

- [ ] **Step 2: Atualizar tailwind.config.ts**

Adicionar novas cores e corrigir font-sans para Inter:

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
          container: "hsl(var(--primary-container))",
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
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        "surface-container-low": "hsl(var(--surface-container-low))",
        "surface-container": "hsl(var(--surface-container))",
        tertiary: {
          DEFAULT: "hsl(var(--tertiary))",
          foreground: "hsl(var(--tertiary-foreground))",
          fixed: "hsl(var(--tertiary-fixed))",
        },
      },
      borderRadius: {
        sm: "6px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        "2xl": "32px",
      },
      fontSize: {
        "display-xl": ["48px", { lineHeight: "52px", letterSpacing: "-0.02em" }],
        "display-lg": ["42px", { lineHeight: "48px", letterSpacing: "-0.02em" }],
        "display-md": ["36px", { lineHeight: "44px", letterSpacing: "-0.015em" }],
        heading: ["28px", { lineHeight: "36px", letterSpacing: "-0.01em" }],
        body: ["16px", { lineHeight: "24px", letterSpacing: "0em" }],
        small: ["14px", { lineHeight: "20px", letterSpacing: "0em" }],
        caption: ["12px", { lineHeight: "16px", letterSpacing: "0.02em" }],
      },
      fontFamily: {
        // Inter para corpo de texto (padrão do sistema)
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        // Plus Jakarta Sans para headlines / display
        display: ["var(--font-plus-jakarta)", "system-ui", "sans-serif"],
        // JetBrains Mono para metadata e IDs
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      boxShadow: {
        sm: "0px 2px 4px rgba(0, 0, 0, 0.06)",
        md: "0px 4px 12px rgba(0, 0, 0, 0.08)",
        lg: "0px 12px 40px rgba(28, 25, 23, 0.06)",
        glass: "0 12px 40px rgba(28, 25, 23, 0.06)",
      },
    },
  },
  plugins: [animatePlugin],
} satisfies Config

export default config
```

- [ ] **Step 3: Verificar build**

```bash
npm run typecheck && npm run build
```
Expected: build passa sem erros de TypeScript.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css tailwind.config.ts
git commit -m "feat(design): update tokens to Adapte Ivory emerald palette and fix font-sans to Inter"
```

---

## Task 2: Instalar Componentes shadcn Necessários

**Files:**
- Install: `components/ui/table.tsx`, `components/ui/progress.tsx`, `components/ui/avatar.tsx`, `components/ui/separator.tsx`, `components/ui/alert.tsx`, `components/ui/scroll-area.tsx`

- [ ] **Step 1: Instalar componentes**

```bash
npx shadcn@latest add table progress avatar separator alert scroll-area
```

- [ ] **Step 2: Verificar arquivos instalados**

```bash
ls components/ui/
```
Expected: ver table.tsx, progress.tsx, avatar.tsx, separator.tsx, alert.tsx, scroll-area.tsx listados.

- [ ] **Step 3: Verificar build**

```bash
npm run typecheck
```
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add components/ui/
git commit -m "feat(ui): add table, progress, avatar, separator, alert, scroll-area components"
```

---

## Task 3: Redesenhar Sidebar e AppLayout

**Files:**
- Modify: `components/layout/sidebar.tsx`
- Modify: `components/layout/app-layout.tsx`
- Test: `components/layout/sidebar.test.tsx`

O sidebar atual é dark (slate-950) com rotas de admin erradas. Redesenhar com glassmorphism, emerald active states e rotas corretas.

- [ ] **Step 1: Ler o teste atual do sidebar**

```bash
cat components/layout/sidebar.test.tsx
```

Anotar quais seletores e textos o teste usa para não quebrá-los.

- [ ] **Step 2: Atualizar components/layout/sidebar.tsx**

```tsx
'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Cpu,
  Bot,
  BookOpen,
  GraduationCap,
  LifeBuoy,
  Users,
  LogOut,
  UserCircle,
} from 'lucide-react'

interface SidebarProps {
  role: string
  userName: string
  userEmail: string
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
]

const adminItems = [
  { href: '/config/models', label: 'Modelos IA', icon: Cpu },
  { href: '/config/agents', label: 'Agentes', icon: Bot },
  { href: '/config/subjects', label: 'Disciplinas', icon: BookOpen },
  { href: '/config/grades', label: 'Séries', icon: GraduationCap },
  { href: '/config/supports', label: 'Suportes', icon: LifeBuoy },
  { href: '/users', label: 'Usuários', icon: Users },
]

export function Sidebar({ role, userName, userEmail }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-60 z-20 flex flex-col py-6
                 bg-surface-container-low/80 backdrop-blur-xl
                 shadow-glass"
      aria-label="Navegação principal"
    >
      {/* Brand */}
      <div className="px-6 mb-8">
        <p
          className="text-lg font-display font-black text-primary tracking-tight flex items-center gap-2"
          aria-label="Adapte Minha Prova"
        >
          <LayoutDashboard className="size-5" aria-hidden="true" />
          Adapte Minha Prova
        </p>
        {role === 'admin' && (
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60 mt-1">
            Painel Admin
          </p>
        )}
      </div>

      {/* Nav principal */}
      <nav className="flex-1 flex flex-col gap-0.5 px-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-display font-semibold
                         transition-all duration-200
                         ${active
                           ? 'bg-primary-container text-white shadow-sm'
                           : 'text-foreground/70 hover:text-primary hover:bg-primary/10'
                         }`}
            >
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              {label}
            </Link>
          )
        })}

        {/* Seção admin */}
        {role === 'admin' && (
          <>
            <div className="mt-4 mb-2 px-4">
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">
                Administração
              </p>
            </div>
            {adminItems.map(({ href, label, icon: Icon }) => {
              const active = isActive(href)
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-display font-semibold
                             transition-all duration-200
                             ${active
                               ? 'bg-primary-container text-white shadow-sm'
                               : 'text-foreground/70 hover:text-primary hover:bg-primary/10'
                             }`}
                >
                  <Icon className="size-5 shrink-0" aria-hidden="true" />
                  {label}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="mt-auto px-3 pt-4">
        <div className="px-4 mb-3">
          <p className="text-sm font-medium text-foreground leading-tight truncate">
            {userName}
          </p>
          <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
        </div>
        <Link
          href="/profile"
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-display font-semibold
                     text-foreground/70 hover:text-primary hover:bg-primary/10 transition-all duration-200"
        >
          <UserCircle className="size-5 shrink-0" aria-hidden="true" />
          Perfil
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-display font-semibold
                     text-foreground/70 hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
        >
          <LogOut className="size-5 shrink-0" aria-hidden="true" />
          Sair
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 3: Atualizar app-layout.tsx para passar dados de avatar**

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

  if (!user) {
    return <>{children}</>
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, email')
    .eq('id', user.id)
    .single()

  const role = profile?.role || 'user'
  const userName = profile?.full_name || 'Usuário'
  const userEmail = profile?.email || user.email || ''

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={role} userName={userName} userEmail={userEmail} />
      <main className="flex-1 ml-60 min-h-screen">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Executar testes do sidebar**

```bash
npm run test -- components/layout/sidebar.test.tsx
```
Expected: testes passam. Se quebrarem, ajustar seletores no teste (ex: `href` ou `aria-current` ainda devem estar presentes).

- [ ] **Step 5: Commit**

```bash
git add components/layout/sidebar.tsx components/layout/app-layout.tsx components/layout/sidebar.test.tsx
git commit -m "feat(layout): redesign sidebar with glassmorphism, emerald active states, fix admin routes"
```

---

## Task 4: Landing Page

**Files:**
- Modify: `app/(public)/page.tsx`

A landing page atual é um placeholder mínimo. Redesenhar com hero section, features e CTA seguindo o protótipo `docs/prototipo/landing_page/`. **Dados: totalmente estático — sem queries ao banco.**

- [ ] **Step 1: Substituir app/(public)/page.tsx**

```tsx
import Link from 'next/link'
import { BookOpen, Zap, Users, CheckCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

const features = [
  {
    icon: Zap,
    title: 'Adaptação em segundos',
    description: 'Transforme provas complexas em materiais acessíveis com inteligência artificial — sem esforço manual.',
  },
  {
    icon: Users,
    title: 'Suportes personalizados',
    description: 'Configure suportes educacionais como dislexia, TDAH, baixa visão e mais, com critérios específicos para cada aluno.',
  },
  {
    icon: BookOpen,
    title: 'Fluxo simples',
    description: 'Upload do PDF, configuração dos suportes, revisão das questões extraídas e resultado adaptado pronto.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
          <p className="text-base font-display font-black text-primary tracking-tight">
            Adapte Minha Prova
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-display font-semibold text-foreground/70 hover:text-primary transition-colors"
            >
              Entrar
            </Link>
            <Link href="/login">
              <Button size="sm" className="font-display font-bold rounded-xl">
                Começar agora
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-8 bg-gradient-to-br from-primary to-primary-container relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span className="inline-block px-4 py-1.5 bg-white/10 text-white/90 rounded-full font-mono text-xs tracking-widest uppercase mb-8">
            Educação Inclusiva com IA
          </span>
          <h1 className="text-display-xl font-display font-black text-white leading-[1.05] tracking-tight mb-6">
            Adapte provas<br />com IA em segundos
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto leading-relaxed mb-10">
            Ajude cada aluno a aprender no seu ritmo. Use inteligência artificial para transformar
            avaliações em materiais acessíveis e personalizados.
          </p>
          <Link href="/login">
            <Button
              size="lg"
              className="bg-tertiary-fixed text-tertiary-fixed-foreground hover:bg-tertiary-fixed/90
                         font-display font-extrabold text-base px-8 py-4 rounded-xl shadow-lg gap-2"
            >
              Começar agora
              <ArrowRight className="size-5" aria-hidden="true" />
            </Button>
          </Link>
        </div>
        {/* Decoração sutil */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(255,255,255,0.05),transparent_70%)]" aria-hidden="true" />
      </section>

      {/* Features */}
      <section className="py-24 px-8 bg-surface-container-low">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-display-md font-display font-black text-foreground tracking-tight text-center mb-4">
            Simples. Preciso. Inclusivo.
          </h2>
          <p className="text-base text-muted-foreground text-center max-w-xl mx-auto mb-16">
            Um fluxo de trabalho projetado para professores, não para especialistas em tecnologia.
          </p>
          <div className="grid grid-cols-3 gap-8">
            {features.map(({ icon: Icon, title, description }) => (
              <div key={title} className="bg-card rounded-2xl p-8 shadow-sm">
                <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                  <Icon className="size-6 text-primary" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-display font-bold text-foreground mb-3">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24 px-8 bg-background">
        <div className="max-w-2xl mx-auto text-center">
          <CheckCircle className="size-12 text-primary mx-auto mb-6" aria-hidden="true" />
          <h2 className="text-heading font-display font-black text-foreground tracking-tight mb-4">
            Pronto para começar?
          </h2>
          <p className="text-base text-muted-foreground mb-8">
            Entre com sua conta Google e comece a adaptar provas hoje mesmo.
          </p>
          <Link href="/login">
            <Button size="lg" className="font-display font-bold rounded-xl px-8">
              Criar conta gratuita
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build 2>&1 | tail -20
```
Expected: sem erros de compilação.

- [ ] **Step 3: Commit**

```bash
git add app/\(public\)/page.tsx
git commit -m "feat(landing): redesign landing page with editorial hero, features section, and CTA"
```

---

## Task 5: Página de Login

**Files:**
- Modify: `app/(public)/login/page.tsx`

Redesenhar com layout de dois painéis: branding à esquerda (gradient esmeralda), formulário à direita.

- [ ] **Step 1: Atualizar app/(public)/login/page.tsx**

```tsx
'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { BookOpen } from 'lucide-react'

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
    <main className="flex min-h-screen">
      {/* Painel Esquerdo — Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-primary-container
                      flex-col items-start justify-between p-12 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <BookOpen className="size-7 text-white" aria-hidden="true" />
            <span className="text-lg font-display font-black text-white tracking-tight">
              Adapte Minha Prova
            </span>
          </div>
          <h1 className="text-display-lg font-display font-black text-white leading-[1.05] tracking-tight mb-6">
            Educação<br />inclusiva com IA
          </h1>
          <p className="text-white/80 text-lg leading-relaxed max-w-xs">
            Adapte provas para diferentes necessidades em segundos, com inteligência artificial.
          </p>
        </div>
        <p className="text-white/50 text-xs font-mono relative z-10">
          © {new Date().getFullYear()} Adapte Minha Prova
        </p>
        {/* Decoração */}
        <div
          className="absolute bottom-0 right-0 size-80 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3"
          aria-hidden="true"
        />
        <div
          className="absolute top-1/4 right-8 size-32 bg-white/5 rounded-full"
          aria-hidden="true"
        />
      </div>

      {/* Painel Direito — Formulário */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 bg-surface-container-low">
        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <BookOpen className="size-6 text-primary" aria-hidden="true" />
            <span className="text-base font-display font-black text-primary">Adapte Minha Prova</span>
          </div>

          <h2 className="text-heading font-display font-black text-foreground tracking-tight mb-2">
            Bem-vindo de volta
          </h2>
          <p className="text-sm text-muted-foreground mb-8">
            Entre com sua conta Google para continuar
          </p>

          <Button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            size="lg"
            variant="outline"
            className="w-full gap-3 font-display font-semibold rounded-xl bg-card border-border
                       hover:bg-surface-container hover:border-primary/30 transition-all"
          >
            {isLoading ? (
              <>
                <div
                  className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
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

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Sua privacidade é importante. Veja nossa{' '}
            <span className="text-primary underline-offset-2 hover:underline cursor-pointer">
              Política de Privacidade
            </span>
            .
          </p>
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build 2>&1 | tail -10
```

- [ ] **Step 3: Commit**

```bash
git add app/\(public\)/login/page.tsx
git commit -m "feat(login): redesign with two-panel editorial layout (brand left, form right)"
```

---

## Task 6: Dashboard

**Files:**
- Modify: `app/(auth)/dashboard/page.tsx`

Atualizar cards de provas com estilo editorial, superfície em camadas. **Não adicionar stats que não existem no banco.** Adicionar uma query de contagem de provas por status (dado real e simples).

- [ ] **Step 1: Atualizar app/(auth)/dashboard/page.tsx**

```tsx
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { Plus, FileText, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import type { ExamStatus } from '@/lib/types/extraction';

interface Exam {
  id: string;
  title: string;
  status: ExamStatus;
  created_at: string;
  updated_at: string;
}

interface StatusCount {
  status: string;
  count: number;
}

async function fetchUserExams(): Promise<Exam[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: exams } = await supabase
    .from('exams')
    .select('id, title, status, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  return (exams as Exam[]) || [];
}

function formatRelativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `há ${days} dias`;
  return `há ${Math.floor(days / 30)} meses`;
}

interface StatusConfig {
  badgeVariant: 'status-draft' | 'status-processing' | 'status-ready' | 'status-error' | 'status-archived';
  badgeLabel: string;
  actionLabel: string;
  actionDisabled: boolean;
  accentColor: string;
  icon: typeof FileText;
}

function getStatusConfig(status: ExamStatus | 'archived'): StatusConfig {
  const configs: Record<string, StatusConfig> = {
    draft: {
      badgeVariant: 'status-draft',
      badgeLabel: 'Rascunho',
      actionLabel: 'Continuar',
      actionDisabled: false,
      accentColor: 'bg-muted-foreground',
      icon: FileText,
    },
    uploading: {
      badgeVariant: 'status-processing',
      badgeLabel: 'Processando',
      actionLabel: 'Aguardando...',
      actionDisabled: true,
      accentColor: 'bg-primary',
      icon: Clock,
    },
    processing: {
      badgeVariant: 'status-processing',
      badgeLabel: 'Processando',
      actionLabel: 'Aguardando...',
      actionDisabled: true,
      accentColor: 'bg-primary',
      icon: Clock,
    },
    awaiting_answers: {
      badgeVariant: 'status-processing',
      badgeLabel: 'Revisão Pendente',
      actionLabel: 'Revisar Questões',
      actionDisabled: false,
      accentColor: 'bg-primary',
      icon: Clock,
    },
    ready: {
      badgeVariant: 'status-ready',
      badgeLabel: 'Pronto',
      actionLabel: 'Ver Resultado',
      actionDisabled: false,
      accentColor: 'bg-success',
      icon: CheckCircle2,
    },
    error: {
      badgeVariant: 'status-error',
      badgeLabel: 'Erro',
      actionLabel: 'Tentar Novamente',
      actionDisabled: false,
      accentColor: 'bg-destructive',
      icon: AlertCircle,
    },
    archived: {
      badgeVariant: 'status-archived',
      badgeLabel: 'Arquivado',
      actionLabel: 'Ver Arquivo',
      actionDisabled: false,
      accentColor: 'bg-muted-foreground',
      icon: FileText,
    },
  };
  return configs[status] || configs.draft;
}

function getActionHref(exam: Exam): string {
  switch (exam.status) {
    case 'draft': return `/exams/${exam.id}/extraction`;
    case 'awaiting_answers': return `/exams/${exam.id}/extraction`;
    case 'ready': return `/exams/${exam.id}/result`;
    case 'error': return `/exams/new`;
    default: return '#';
  }
}

export default async function DashboardPage() {
  const exams = await fetchUserExams();
  const readyCount = exams.filter(e => e.status === 'ready').length;
  const processingCount = exams.filter(
    e => ['uploading', 'processing', 'awaiting_answers'].includes(e.status)
  ).length;

  return (
    <div className="min-h-screen bg-background py-10 px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <h1 className="text-display-md font-display font-black text-foreground tracking-tight">
              Minhas Provas
            </h1>
            {exams.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1 font-mono">
                {exams.length} prova{exams.length !== 1 ? 's' : ''} no total
                {readyCount > 0 && ` · ${readyCount} pronta${readyCount !== 1 ? 's' : ''}`}
                {processingCount > 0 && ` · ${processingCount} em processamento`}
              </p>
            )}
          </div>
          <Link href="/exams/new">
            <Button className="gap-2 font-display font-bold rounded-xl">
              <Plus className="size-4" aria-hidden="true" />
              Nova Prova
            </Button>
          </Link>
        </div>

        {/* Empty State */}
        {exams.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-6 text-center py-24
                          bg-surface-container-low rounded-2xl border border-border/40">
            <div className="size-20 rounded-2xl bg-primary/10 flex items-center justify-center">
              <FileText className="size-10 text-primary" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-heading font-display font-black text-foreground tracking-tight">
                Nenhuma prova ainda
              </h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
                Crie sua primeira prova para começar a adaptar questões com IA
              </p>
            </div>
            <Link href="/exams/new">
              <Button className="font-display font-bold rounded-xl">
                Criar Primeira Prova
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {exams.map((exam) => {
              const config = getStatusConfig(exam.status);
              const href = getActionHref(exam);
              const StatusIcon = config.icon;

              return (
                <div
                  key={exam.id}
                  className="bg-card rounded-2xl p-6 shadow-sm hover:shadow-md
                             transition-all duration-200 hover:scale-[1.01]
                             flex flex-col gap-4 relative overflow-hidden"
                >
                  {/* Indicador de status lateral */}
                  <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-full ${config.accentColor}`} aria-hidden="true" />

                  <div className="pl-2 flex-1">
                    <h3 className="text-base font-display font-bold text-foreground line-clamp-2 mb-1">
                      {exam.title}
                    </h3>
                    <p className="text-xs font-mono text-muted-foreground">
                      {formatRelativeDate(exam.updated_at)}
                    </p>
                  </div>

                  <div className="pl-2 flex items-center justify-between">
                    <Badge variant={config.badgeVariant} className="gap-1">
                      <StatusIcon className="size-3" aria-hidden="true" />
                      {config.badgeLabel}
                    </Badge>

                    {!config.actionDisabled ? (
                      <Link href={href}>
                        <Button variant="ghost" size="sm" className="text-xs font-display font-semibold h-7 px-3">
                          {config.actionLabel}
                        </Button>
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground font-mono">
                        {config.actionLabel}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add app/\(auth\)/dashboard/page.tsx
git commit -m "feat(dashboard): editorial card layout with real status counts, no mocked stats"
```

---

## Task 7: Wizard Nova Prova — Visual Update

**Files:**
- Modify: `components/new-exam-form.tsx`
- Modify: `components/ui/stepper.tsx`
- Test: `components/new-exam-form.test.tsx`

A estrutura de 4 etapas já existe e funciona corretamente. **Não alterar lógica, validação ou submissão.** Apenas atualizar o visual para o novo design system.

- [ ] **Step 1: Ler o stepper atual**

```bash
cat components/ui/stepper.tsx
```

Anotar a API do componente (props: steps, currentStep).

- [ ] **Step 2: Executar testes atuais para estabelecer baseline**

```bash
npm run test -- components/new-exam-form.test.tsx --reporter=verbose
```
Anotar quais testes passam atualmente.

- [ ] **Step 3: Atualizar visual do Stepper (components/ui/stepper.tsx)**

O Stepper deve mostrar os passos com numeração, linha de progresso e estado ativo/completo usando os novos tokens:

```tsx
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

interface StepperProps {
  steps: string[]
  currentStep: number
  className?: string
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <nav aria-label="Progresso do formulário" className={cn('flex items-center gap-0', className)}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep
        const isActive = index === currentStep
        const isLast = index === steps.length - 1

        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            {/* Step indicator */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                aria-current={isActive ? 'step' : undefined}
                className={cn(
                  'size-8 rounded-full flex items-center justify-center text-xs font-display font-bold transition-all duration-200',
                  isCompleted && 'bg-primary text-primary-foreground',
                  isActive && 'bg-primary-container text-white ring-4 ring-primary/20',
                  !isCompleted && !isActive && 'bg-surface-container text-muted-foreground'
                )}
              >
                {isCompleted ? (
                  <Check className="size-4" aria-hidden="true" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span
                className={cn(
                  'text-[10px] font-mono uppercase tracking-wide whitespace-nowrap',
                  isActive ? 'text-primary font-bold' : 'text-muted-foreground'
                )}
              >
                {step}
              </span>
            </div>

            {/* Connector */}
            {!isLast && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-2 mb-4 transition-colors duration-200',
                  index < currentStep ? 'bg-primary' : 'bg-border'
                )}
                aria-hidden="true"
              />
            )}
          </div>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 4: Atualizar wrapper visual do NewExamForm (components/new-exam-form.tsx)**

Substituir apenas a parte do `return` — manter toda a lógica de estado, validação e submissão intacta. Atualizar a estrutura de layout:

```tsx
// Substituir o return statement do NewExamForm por:
return (
  <div className="min-h-screen bg-surface-container-low py-10 px-8">
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-display-md font-display font-black text-foreground tracking-tight mb-1">
          Nova Prova
        </h1>
        <p className="text-sm text-muted-foreground">
          Preencha os dados e faça upload do PDF para extrair as questões.
        </p>
      </div>

      {/* Stepper */}
      <Stepper steps={STEPS} currentStep={currentStep} className="mb-10" />

      {/* Card do step atual */}
      <div className="bg-card rounded-2xl shadow-sm p-8">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Step 0: Informações */}
          {currentStep === 0 && (
            <div className="space-y-2">
              <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-6">
                Passo 1 — Informações básicas
              </p>
              <Label htmlFor="exam-name" className="text-sm font-display font-semibold">
                Nome da Prova <span className="text-destructive">*</span>
              </Label>
              <Input
                id="exam-name"
                type="text"
                placeholder="Ex: Prova de Matemática — 1º Bimestre"
                value={formData.exam_name}
                onChange={(e) => handleExamNameChange(e.target.value)}
                disabled={isLoading}
                aria-invalid={!!errors.exam_name}
                aria-describedby={errors.exam_name ? 'exam-name-error' : undefined}
                className="rounded-xl"
              />
              {errors.exam_name && (
                <div
                  id="exam-name-error"
                  className="flex items-center gap-2 text-sm text-destructive"
                  role="alert"
                >
                  <AlertCircle className="size-4" aria-hidden="true" />
                  {errors.exam_name}
                </div>
              )}
            </div>
          )}

          {/* Step 1: Configurações */}
          {currentStep === 1 && (
            <>
              <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
                Passo 2 — Configurações da prova
              </p>
              {/* Disciplina */}
              <div className="space-y-2">
                <Label htmlFor="subject" className="text-sm font-display font-semibold">
                  Disciplina <span className="text-destructive">*</span>
                </Label>
                <Select value={formData.subject_id} onValueChange={handleSubjectChange} disabled={isLoading}>
                  <SelectTrigger id="subject" aria-invalid={!!errors.subject_id} className="rounded-xl">
                    <SelectValue placeholder="Selecione uma disciplina" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.subject_id && (
                  <div id="subject-error" className="flex items-center gap-2 text-sm text-destructive" role="alert">
                    <AlertCircle className="size-4" aria-hidden="true" />
                    {errors.subject_id}
                  </div>
                )}
              </div>

              {/* Série */}
              <div className="space-y-2">
                <Label htmlFor="grade-level" className="text-sm font-display font-semibold">
                  Série <span className="text-destructive">*</span>
                </Label>
                <Select value={formData.grade_level_id} onValueChange={handleGradeLevelChange} disabled={isLoading}>
                  <SelectTrigger id="grade-level" aria-invalid={!!errors.grade_level_id} className="rounded-xl">
                    <SelectValue placeholder="Selecione uma série" />
                  </SelectTrigger>
                  <SelectContent>
                    {gradeLevels.map((grade) => (
                      <SelectItem key={grade.id} value={grade.id}>{grade.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.grade_level_id && (
                  <div id="grade-level-error" className="flex items-center gap-2 text-sm text-destructive" role="alert">
                    <AlertCircle className="size-4" aria-hidden="true" />
                    {errors.grade_level_id}
                  </div>
                )}
              </div>

              {/* Suportes */}
              <div className="space-y-3">
                <Label className="text-sm font-display font-semibold block">
                  Suportes Educacionais <span className="text-destructive">*</span>
                </Label>
                <div className="space-y-2 bg-surface-container-low rounded-xl p-4">
                  {supports.map((support) => (
                    <div key={support.id} className="flex items-start gap-3 py-1">
                      <Checkbox
                        id={`support-${support.id}`}
                        checked={formData.supports.includes(support.id)}
                        onCheckedChange={() => handleSupportToggle(support.id)}
                        disabled={isLoading}
                      />
                      <div className="flex-1">
                        <Label htmlFor={`support-${support.id}`} className="text-sm font-medium cursor-pointer">
                          {support.name}
                        </Label>
                        {support.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{support.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {errors.supports && (
                  <div className="flex items-center gap-2 text-sm text-destructive" role="alert">
                    <AlertCircle className="size-4" aria-hidden="true" />
                    {errors.supports}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Step 2: Upload */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
                Passo 3 — Upload do PDF
              </p>
              <label
                htmlFor="pdf-file"
                className="flex flex-col items-center justify-center gap-4 p-12
                           bg-surface-container-low rounded-2xl border-2 border-dashed border-border
                           hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer"
              >
                <FileUp className="size-10 text-primary/60" aria-hidden="true" />
                <div className="text-center">
                  <p className="text-sm font-display font-semibold text-foreground">
                    {pdfFileName || 'Clique para selecionar o arquivo PDF'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Máximo de 10 MB · apenas PDF</p>
                </div>
                <Input
                  id="pdf-file"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  disabled={isLoading}
                  aria-invalid={!!errors.pdf_file}
                  aria-describedby={errors.pdf_file ? 'pdf-file-error' : 'pdf-file-hint'}
                  className="sr-only"
                />
              </label>
              {!errors.pdf_file && (
                <p id="pdf-file-hint" className="text-xs text-muted-foreground sr-only">
                  Máximo de 10 MB. Apenas arquivos PDF são aceitos.
                </p>
              )}
              {errors.pdf_file && (
                <div id="pdf-file-error" className="flex items-center gap-2 text-sm text-destructive" role="alert">
                  <AlertCircle className="size-4" aria-hidden="true" />
                  {errors.pdf_file}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Revisão */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
                Passo 4 — Revisão final
              </p>
              <div className="bg-surface-container-low rounded-2xl p-6 space-y-4">
                {[
                  { label: 'Nome da Prova', value: formData.exam_name },
                  { label: 'Disciplina', value: selectedSubjectName },
                  { label: 'Série', value: selectedGradeLevelName },
                  {
                    label: 'Suportes Educacionais',
                    value: selectedSupportNames.length > 0
                      ? selectedSupportNames.join(', ')
                      : 'Nenhum selecionado',
                  },
                  { label: 'Arquivo PDF', value: pdfFileName || 'Nenhum arquivo' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
                      {label}
                    </p>
                    <p className="text-sm font-display font-semibold text-foreground">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit error */}
          {errors.submit && (
            <div className="flex items-center gap-3 rounded-xl bg-destructive/10 p-4 text-sm text-destructive" role="alert">
              <AlertCircle className="size-5 shrink-0" aria-hidden="true" />
              {errors.submit}
            </div>
          )}

          {/* Navegação */}
          <div className="flex items-center justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep((s) => s - 1)}
              disabled={currentStep === 0}
              className="rounded-xl font-display font-semibold"
            >
              Voltar
            </Button>
            {currentStep < STEPS.length - 1 ? (
              <Button
                type="button"
                onClick={() => setCurrentStep((s) => s + 1)}
                className="rounded-xl font-display font-bold"
              >
                Continuar
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isLoading}
                className="rounded-xl font-display font-bold gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
                    Enviando...
                  </>
                ) : (
                  'Criar Prova e Extrair Questões'
                )}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  </div>
)
```

Adicionar import `FileUp` ao topo do arquivo.

- [ ] **Step 5: Executar testes**

```bash
npm run test -- components/new-exam-form.test.tsx --reporter=verbose
```
Expected: testes passam (estrutura lógica intacta; apenas classes visuais mudaram).

- [ ] **Step 6: Commit**

```bash
git add components/new-exam-form.tsx components/ui/stepper.tsx
git commit -m "feat(new-exam): update wizard visual with editorial layout and new design tokens"
```

---

## Task 8: Página de Extração

**Files:**
- Modify: `components/extraction-form.tsx`
- Test: `components/extraction-form.test.tsx`

Atualizar o layout das questões extraídas. **Não alterar lógica de resposta, submissão ou validação.**

- [ ] **Step 1: Executar testes de baseline**

```bash
npm run test -- components/extraction-form.test.tsx --reporter=verbose
```

- [ ] **Step 2: Atualizar layout em components/extraction-form.tsx**

Substituir apenas o `return` da `ExtractionForm`. Manter toda lógica intacta:

```tsx
// No return do ExtractionForm:
return (
  <div className="min-h-screen bg-surface-container-low py-10 px-8">
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
          Revisão de Extração
        </p>
        <h1 className="text-display-md font-display font-black text-foreground tracking-tight">
          {examName}
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Revise as questões extraídas do PDF e forneça as respostas corretas antes de adaptar.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {questions.map((question, index) => (
            <QuestionInput
              key={question.id}
              question={question}
              index={index}
              // ... props existentes
            />
          ))}
        </div>

        {/* Erro de submit */}
        {submitError && (
          <div className="mt-6 flex items-center gap-3 rounded-xl bg-destructive/10 p-4 text-sm text-destructive" role="alert">
            <AlertCircle className="size-5 shrink-0" aria-hidden="true" />
            {submitError}
          </div>
        )}

        <div className="mt-8 flex justify-end">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl font-display font-bold px-8 gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
                Enviando...
              </>
            ) : (
              'Adaptar Questões com IA'
            )}
          </Button>
        </div>
      </form>
    </div>
  </div>
)
```

> **Nota:** Ler `components/extraction-form.tsx` completo antes de editar para entender quais props `QuestionInput` recebe e manter assinatura correta.

- [ ] **Step 3: Executar testes**

```bash
npm run test -- components/extraction-form.test.tsx --reporter=verbose
```

- [ ] **Step 4: Commit**

```bash
git add components/extraction-form.tsx
git commit -m "feat(extraction): update extraction review layout with editorial style"
```

---

## Task 9: Página de Processamento

**Files:**
- Modify: `app/(auth)/exams/[id]/processing/page.tsx`
- Modify: `app/(auth)/exams/[id]/processing/processing-progress-client.tsx`

- [ ] **Step 1: Ler processing-progress-client.tsx atual**

```bash
cat app/\(auth\)/exams/\[id\]/processing/processing-progress-client.tsx
```

- [ ] **Step 2: Atualizar page.tsx**

```tsx
// Substituir o return em ProcessingPage:
return (
  <div className="min-h-screen bg-surface-container-low py-10 px-8 flex items-center justify-center">
    <div className="w-full max-w-lg">
      <div className="bg-card rounded-2xl shadow-sm p-10 text-center">
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">
          Processando
        </p>
        <h1 className="text-heading font-display font-black text-foreground tracking-tight mb-2">
          {exam.name}
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          A IA está adaptando as questões. Isso leva cerca de 1–2 minutos.
        </p>
        <ProcessingProgressClient examId={examId} />
      </div>
    </div>
  </div>
)
```

- [ ] **Step 3: Atualizar ProcessingProgressClient**

Verificar o componente atual e atualizar para usar `Progress` do shadcn e tokens novos. O polling e a lógica de redirecionamento permanecem intactos. Atualizar apenas o JSX visual:

```tsx
// No return do ProcessingProgressClient, usar Progress component:
import { Progress } from '@/components/ui/progress'

// ... (manter lógica de polling intacta)

return (
  <div className="space-y-6">
    <Progress
      value={progressPercent}
      className="h-2 rounded-full"
      aria-label={`${processedCount} de ${totalCount} questões processadas`}
    />
    <p className="text-sm font-mono text-muted-foreground text-center">
      {processedCount} / {totalCount} questões adaptadas
    </p>
    {isError && (
      <div className="flex items-center gap-3 rounded-xl bg-destructive/10 p-4 text-sm text-destructive" role="alert">
        <AlertCircle className="size-5 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">Erro no processamento</p>
          <button onClick={handleRetry} className="underline text-xs mt-1">Tentar novamente</button>
        </div>
      </div>
    )}
  </div>
)
```

> **Nota:** Ler o arquivo completo antes de editar para entender as variáveis locais (`processedCount`, `totalCount`, `progressPercent`, etc.).

- [ ] **Step 4: Commit**

```bash
git add app/\(auth\)/exams/\[id\]/processing/
git commit -m "feat(processing): redesign processing status page with progress bar and editorial layout"
```

---

## Task 10: Página de Resultado

**Files:**
- Modify: `components/exam-result-page.tsx`
- Modify: `components/question-result-card.tsx`
- Test: `components/exam-result-page.test.tsx`, `components/question-result-card.test.tsx`

Atualizar para layout de duas colunas (questão original | adaptação), estilo editorial.

- [ ] **Step 1: Ler arquivos atuais e testes**

```bash
cat components/exam-result-page.tsx
cat components/question-result-card.tsx
npm run test -- components/exam-result-page.test.tsx --reporter=verbose
```

- [ ] **Step 2: Atualizar question-result-card.tsx**

Manter props e lógica de feedback. Atualizar apenas o layout visual para:
- Cabeçalho com número da questão (fonte mono)
- Duas colunas: original (bg-surface-container-low) | adaptado (bg-card com borda primary/20)
- Feedback (thumbs up/down) no rodapé do card

- [ ] **Step 3: Atualizar exam-result-page.tsx**

Manter lógica de fetch e estado. Atualizar layout principal:
- Header com nome da prova e botão de cópia
- Lista de QuestionResultCard
- Skeleton com cards de 2 colunas

- [ ] **Step 4: Executar testes**

```bash
npm run test -- components/exam-result-page.test.tsx components/question-result-card.test.tsx --reporter=verbose
```

- [ ] **Step 5: Commit**

```bash
git add components/exam-result-page.tsx components/question-result-card.tsx
git commit -m "feat(result): two-column editorial layout for question/adaptation pairs"
```

---

## Task 11: Admin — Modelos de IA e Usuários

**Files:**
- Modify: `components/admin/ai-models-management.tsx`
- Modify: `components/admin/user-management.tsx`

Atualizar para usar o componente `Table` do shadcn com estilo limpo.

- [ ] **Step 1: Ler os arquivos atuais**

```bash
cat components/admin/ai-models-management.tsx
cat components/admin/user-management.tsx
```

- [ ] **Step 2: Atualizar ai-models-management.tsx**

Manter toda lógica de fetch, create, update, delete. Atualizar apenas o layout:
- Header com título + botão "Adicionar" (estilo editorial)
- Substituir tabela customizada por `Table`, `TableHeader`, `TableRow`, `TableHead`, `TableBody`, `TableCell` do shadcn
- Sem bordas entre linhas — usar fundo alternado (`TableRow` com `hover:bg-surface-container-low`)
- Ações por linha em `DropdownMenu` (se já existe) ou botões inline

- [ ] **Step 3: Atualizar user-management.tsx**

Mesmo padrão. Adicionar `Avatar` do shadcn para avatar do usuário:
```tsx
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

// Na célula do usuário:
<Avatar className="size-8">
  <AvatarImage src={user.avatar_url} alt={user.full_name} />
  <AvatarFallback className="text-xs font-display font-bold">
    {user.full_name?.slice(0, 2).toUpperCase() || 'US'}
  </AvatarFallback>
</Avatar>
```

- [ ] **Step 4: Commit**

```bash
git add components/admin/ai-models-management.tsx components/admin/user-management.tsx
git commit -m "feat(admin): redesign AI models and user tables with shadcn Table and Avatar"
```

---

## Task 12: Admin — Páginas de Config Restantes

**Files:**
- Modify: `components/admin/agents-management.tsx`
- Modify: `components/admin/grades-management.tsx`
- Modify: `components/admin/subjects-management.tsx`
- Modify: `components/admin/supports-management.tsx`

Aplicar o mesmo padrão de tabela da Task 11 em todas as páginas de config.

- [ ] **Step 1: Ler os 4 arquivos**

```bash
cat components/admin/agents-management.tsx
cat components/admin/grades-management.tsx
cat components/admin/subjects-management.tsx
cat components/admin/supports-management.tsx
```

- [ ] **Step 2: Atualizar cada arquivo**

Para cada componente:
- Importar: `Table, TableHeader, TableRow, TableHead, TableBody, TableCell` de `@/components/ui/table`
- Manter lógica de fetch, create, update, delete intacta
- Header: título em `font-display font-black` + botão "Adicionar" com ícone `Plus`
- Tabela com `rounded-2xl bg-card shadow-sm overflow-hidden`
- `TableHead` com `text-xs font-mono uppercase tracking-widest text-muted-foreground`
- `TableRow` com `hover:bg-surface-container-low transition-colors`

- [ ] **Step 3: Commit**

```bash
git add components/admin/
git commit -m "feat(admin): apply consistent table pattern to all config management pages"
```

---

## Task 13: Verificação Final — Build, Testes e Acessibilidade

- [ ] **Step 1: Rodar lint**

```bash
npm run lint
```
Corrigir quaisquer erros.

- [ ] **Step 2: Rodar typecheck**

```bash
npm run typecheck
```
Corrigir erros de TypeScript.

- [ ] **Step 3: Rodar testes unitários**

```bash
npm run test
```
Expected: todos os testes passam. Coverage ≥ 80%.

- [ ] **Step 4: Rodar build de produção**

```bash
npm run build
```
Expected: build sem erros.

- [ ] **Step 5: (Opcional) Rodar testes de acessibilidade**

```bash
npm run test:a11y
```

- [ ] **Step 6: Commit final**

```bash
git add -A
git commit -m "chore: final adjustments — lint, typecheck, accessibility fixes"
```

---

## Notas Importantes para o Executor

### O que NÃO mudar
- Lógica de negócio, validação de formulários, queries ao Supabase
- Estrutura de roteamento e redirects
- Assinaturas de API (fetch calls, Edge Functions)
- Atributos de acessibilidade (`aria-*`, `role`, `aria-current`) — verificar que permanecem após edição

### Hierarquia de Superfície (No-Line Philosophy)
Em vez de `border-t` ou `border`, usar:
- Separação por seção: `bg-background` → `bg-surface-container-low` → `bg-card`
- Se borda é necessária para acessibilidade: `border border-border/40`

### Classes de Fonte
- **Corpo:** nenhuma classe explícita (herda `font-sans` = Inter)
- **Títulos e labels:** `font-display` (Plus Jakarta Sans)
- **Metadata, IDs, passos:** `font-mono` (JetBrains Mono)

### Tokens de Cor Proibidos
Não usar hardcoded: `#00614f`, `#0d7c66`, `#f9f9f6`, etc.
Usar apenas classes Tailwind de token: `bg-primary`, `text-primary-container`, `bg-surface-container-low`.

### Referência aos Protótipos
Cada tela tem um protótipo em `docs/prototipo/<nome>/`:
- `screen.png` — imagem visual de referência
- `code.html` — HTML do protótipo com classes Tailwind
Consultar `screen.png` para verificar proporções e hierarquia visual.
