# CLAUDE.md

Guia para agentes de IA ao trabalhar com o código deste repositório.

Este projeto é o **Adapte Minha Prova** — plataforma de adaptação de provas escolares com IA. Usa **Next.js 16 + React 19** no frontend/backend e **Supabase** (PostgreSQL, Auth, Storage, Edge Functions) como infraestrutura.

## Prioridades

- **Sempre verifique as skills disponíveis** antes de implementar — use `/brainstorming` para planejar features, `/writing-plans` para criar planos de implementação, e `/subagent-driven-development` ou `/executing-plans` para executar
- **Execute os checks** antes de concluir qualquer tarefa: `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test`
- **Não use workarounds** — prefira correções de causa raiz
- **Leia a documentação do Next.js 16** em `node_modules/next/dist/docs/` antes de escrever código — esta versão tem breaking changes em relação ao que você conhece
- **Use `npm`** como package manager — este projeto usa npm com package-lock.json

## Comandos do projeto

```bash
npm run dev              # Servidor de desenvolvimento (Next.js)
npm run build            # Build de produção
npm run start            # Executar build de produção
npm run lint             # ESLint
npm run typecheck        # tsc --noEmit
npm run test             # Vitest (unit tests)
npm run test:watch       # Vitest em modo watch
npm run test:coverage    # Vitest com cobertura (thresholds: 80% functions/lines)
npm run test:a11y        # Testes de acessibilidade (verbose)
npm run test:e2e         # Playwright (Chromium + Firefox)
```

- A aplicação roda em `http://localhost:3000`

## Stack e skills recomendadas

| Area | Tecnologia | Skill sugerida |
|------|-----------|----------------|
| Framework | Next.js 16, React 19, App Router | `next-best-practices`, `react`, `vercel-react-best-practices` |
| UI / shadcn | shadcn/ui (radix-nova), Tailwind CSS 3 | `shadcn`, `shadcn-ui`, `tailwindcss` |
| Backend/DB | Supabase (PostgreSQL, Auth, Storage) | usar MCP Supabase |
| Testes unitarios | Vitest, Testing Library, jest-axe | `vitest`, `a11y-testing` |
| Testes E2E | Playwright | — |
| Design / UX | Interface, acessibilidade | `ui-ux-pro-max` |
| Planejamento | Brainstorming, planos, execucao | `brainstorming`, `writing-plans`, `executing-plans`, `subagent-driven-development` |
| Desenvolvimento | TDD, code review, git worktrees | `test-driven-development`, `requesting-code-review`, `using-git-worktrees`, `finishing-a-development-branch` |
| Pesquisa | Deep research | `deep-research`, `creating-spec` |

## Estrutura do projeto

```
/                              # Raiz — Next.js 16 App Router
├── package.json               # Scripts e dependencias
├── tsconfig.json              # TypeScript (bundler, paths: @/*)
├── next.config.ts             # Config Next.js
├── middleware.ts              # Auth routing + role checks (Supabase SSR)
├── tailwind.config.ts         # Tailwind CSS + shadcn theme tokens
├── postcss.config.mjs         # PostCSS (tailwind + autoprefixer)
├── components.json            # shadcn CLI (style: radix-nova, icons: lucide)
├── eslint.config.mjs          # ESLint flat config (next core-web-vitals + ts)
├── vitest.config.ts           # Vitest (jsdom, coverage v8, alias @/*)
├── vitest.setup.ts            # Setup: jest-dom + jest-axe matchers
├── playwright.config.ts       # Playwright (Chromium + Firefox)
├── .env.example               # Template de variaveis de ambiente
├── app/
│   ├── layout.tsx             # Root layout (Geist fonts, dark mode)
│   ├── globals.css            # CSS variables do tema (HSL tokens)
│   ├── page.tsx               # Landing page (/)
│   ├── login/
│   │   ├── page.tsx           # Login (Google OAuth)
│   │   └── callback/route.ts  # OAuth callback handler
│   ├── (admin)/               # Rotas admin (role: admin)
│   ├── (auth)/                # Rotas autenticadas
│   └── (public)/              # Rotas publicas
├── components/
│   └── ui/                    # shadcn components (radix-nova)
├── lib/
│   ├── utils.ts               # cn() — clsx + tailwind-merge
│   └── supabase/
│       ├── client.ts          # Browser client
│       ├── server.ts          # Server client (async cookies)
│       └── middleware.ts      # Session update middleware
├── supabase/
│   ├── config.toml            # Config local dev (ports, auth, storage)
│   ├── migrations/            # SQL migrations (schema + RLS)
│   └── functions/             # Edge Functions (Deno)
│       ├── extract-questions/  # Extrair questoes de PDFs
│       ├── analyze-and-adapt/  # Adaptar questoes com IA
│       └── evolve-agent/       # Evoluir agentes
├── e2e/
│   └── accessibility.spec.ts  # Testes E2E de acessibilidade
└── .github/
    └── workflows/ci.yml       # CI: lint + typecheck + tests + a11y
```

## Banco de dados (Supabase PostgreSQL)

Tabelas principais com RLS habilitado:
- **profiles** — perfis de usuario (roles: user, admin, teacher), criado via trigger
- **ai_models** — modelos de IA disponiveis
- **agents** — agentes de IA para adaptacao
- **subjects** / **grade_levels** — disciplinas e series
- **exams** — provas (draft → processing → ready → archived)
- **questions** — questoes extraidas das provas
- **supports** — suportes gerados por IA
- **adaptations** — alternativas adaptadas
- **feedbacks** — feedback dos usuarios
- **agent_evolutions** — historico de performance dos agentes

## Autenticacao e rotas

- Supabase Auth com SSR (`@supabase/ssr`)
- Login via Google OAuth
- Middleware em `middleware.ts` controla acesso:
  - `/` e `/login` — publicas (redireciona para `/dashboard` se autenticado)
  - `/config` e `/users` — requerem role `admin`
  - Demais rotas — requerem autenticacao
  - Usuarios bloqueados sao redirecionados para `/blocked`

## Regras de componentes React

1. **Componentes funcionais** — sem class components, sem `React.FC`
2. **Props tipadas** — tipar diretamente na funcao
3. **Tratar estados** — loading, error e empty
4. **kebab-case** para nomes de arquivos (ex: `meu-componente.tsx`)
5. **Composicao** — preferir compound components a muitas props booleanas
6. **Server Components por padrao** — usar `'use client'` apenas quando necessario

## Testes

- **Unit tests**: Vitest com jsdom, React Testing Library, jest-axe (acessibilidade)
- **Coverage**: minimo 80% em funcoes e linhas
- **E2E**: Playwright (Chromium + Firefox) — testes em `e2e/`
- **Acessibilidade**: jest-axe nos unit tests + axe-core no Playwright
- Rodar: `npm run test` (unit) ou `npm run test:e2e` (e2e)

## Fluxo de desenvolvimento com Superpowers

1. `/brainstorming` — explorar contexto, definir spec, gerar design doc
2. `/writing-plans` — criar plano de implementacao detalhado
3. `/using-git-worktrees` — criar workspace isolado (pre-requisito de execucao)
4. `/subagent-driven-development` (recomendado) ou `/executing-plans` — executar o plano
5. `/test-driven-development` — TDD por task
6. `/requesting-code-review` — review por task ou batch
7. `/finishing-a-development-branch` — finalizar branch, merge, cleanup

## Worktrees

Worktree directory: .worktrees

## Git

- **Nao execute** `git restore`, `git reset`, `git clean` ou comandos destrutivos **sem permissao explicita do usuario**
- Branches de feature devem ser criadas a partir de `main`
- Commits devem ser atomicos e descritivos

## CI/CD

- GitHub Actions (`.github/workflows/ci.yml`):
  - Job **test**: lint + typecheck + unit tests com coverage
  - Job **a11y**: build + Playwright + testes de acessibilidade
- Deploy via Vercel (configuracao padrao Next.js)

## Anti-padroes

1. Criar Server Actions ou API Routes sem validacao de input
2. Esquecer RLS policies ao criar novas tabelas no Supabase
3. Expor `SUPABASE_SERVICE_ROLE_KEY` ou secrets em codigo client-side — usar apenas em Server Components ou Route Handlers
4. Usar `createBrowserClient` em Server Components ou `createServerClient` em Client Components
5. Editar manualmente arquivos em `components/ui/` — sao gerados pelo shadcn CLI, use `npx shadcn add` para adicionar ou atualizar
6. Alterar schema do banco sem criar migration em `supabase/migrations/` — nunca editar tabelas diretamente
7. Criar componentes sem tratar acessibilidade — todo componente interativo deve ser testavel com jest-axe

@AGENTS.md
