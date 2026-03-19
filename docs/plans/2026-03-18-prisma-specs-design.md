# Design: Plano de Criação de Specs — PRISMA (Adapte Minha Prova)

**Data:** 2026-03-18
**Status:** Aprovado

---

## Contexto

O projeto PRISMA ("Adapte Minha Prova") será reescrito do zero. Para guiar o desenvolvimento, será criado um conjunto de specs formais no formato `spec-[nome].md`, salvas em `/spec/`, seguindo o template definido em `.agents/skills/create-specification/SKILL.md`.

O projeto já possui PRD completo (`tasks/prd-adapte-minha-prova/prd.md`) e Tech Spec detalhada (`tasks/prd-adapte-minha-prova/techspec.md`), que servem como referência primária para as specs.

**Stack:** Next.js 16 (App Router) + Supabase (Auth, Postgres, Storage, Edge Functions) + Vercel AI SDK + Shadcn UI + Tailwind CSS v4.

---

## Decisões

| Decisão | Escolha | Alternativas rejeitadas |
|---------|---------|------------------------|
| Abordagem | Reescrita completa do zero | Redesign incremental, documentação de código existente |
| Formato das specs | `spec-[nome].md` (create-specification) | Formato kiro (requirements/design/tasks), formato livre |
| Granularidade | 1 spec por grupo funcional do PRD (F1–F9) | Por domínio técnico, misto |
| Ordem de criação | Core-first (complexidade → simplicidade) | Ordem do PRD (F1→F9), Layer-first |
| Stack | Mantido da tech spec existente | Não se aplica |

---

## As 9 Specs — Ordem de Criação

| # | Arquivo | Feature PRD | Justificativa |
|---|---------|-------------|---------------|
| 1 | `spec-process-extraction.md` | F5 — Extração de PDF | Core técnico; define contratos de dados para todo o restante |
| 2 | `spec-process-adaptation.md` | F6 — Adaptação por IA | Core técnico; define contratos com LLMs e Edge Functions |
| 3 | `spec-process-result.md` | F7 — Resultado da Adaptação | Output final ao professor; depende de F5 e F6 |
| 4 | `spec-process-new-exam.md` | F4 — Nova Adaptação | Fluxo de entrada; referencia extração e adaptação |
| 5 | `spec-process-repository.md` | F3 — Repositório de Provas | Dashboard do professor; depende de F4–F7 |
| 6 | `spec-design-auth.md` | F2 — Autenticação | Auth + roles + bloqueio; sem dependências de produto |
| 7 | `spec-design-admin-config.md` | F8 — Admin: Configurações | CRUD modelos, agentes, apoios, disciplinas, anos/séries |
| 8 | `spec-design-admin-users.md` | F9 — Admin: Usuários | Gestão de usuários; depende de Auth |
| 9 | `spec-design-landing.md` | F1 — Landing Page | Mais simples e independente; criada por último |

---

## Estrutura Interna de Cada Spec

Cada spec segue as 11 seções do formato `create-specification`:

1. **Introduction** — Propósito em 2–3 frases
2. **Purpose & Scope** — O que está incluso e excluído
3. **Definitions** — Glossário de termos e acrônimos
4. **Requirements, Constraints & Guidelines** — Regras mandatórias (REQ, PAT, GUD, CON, SEC)
5. **Interfaces & Data Contracts** — Schemas SQL, tipos TypeScript, contratos de API
6. **Acceptance Criteria** — Critérios testáveis no formato Given-When-Then
7. **Test Automation Strategy** — Três camadas (veja abaixo)
8. **Rationale & Context** — Justificativa das decisões de design
9. **Dependencies & External Integrations** — EXT, SVC, INF, PLT, COM
10. **Examples & Edge Cases** — Exemplos concretos e casos extremos
11. **Related Specifications** — Links entre specs

---

## Skills Incorporadas às Specs

### Testes — 3 Camadas (Seção 6)

| Camada | Framework | Escopo |
|--------|-----------|--------|
| Unit | **Vitest 3.x** + `@testing-library/react` | Schemas Zod, utilitários, hooks, componentes interativos; mocks via `vi.mock()` |
| A11y Unit | **jest-axe** + Vitest | Zero violações WCAG em todos os estados do componente (padrão, erro, loading, desabilitado) |
| E2E A11y | **Playwright** + `@axe-core/playwright` | Scan de página inteira com tags `wcag2a`, `wcag2aa`, `wcag22aa`; estados de formulário e modais |

**Regras obrigatórias de teste:**
- Coverage mínimo de 80% nas funções de negócio críticas (Edge Functions, adaptação, extração)
- CI gate: PRs bloqueados se houver violações de a11y
- Tags axe obrigatórias: `wcag2a`, `wcag2aa`, `wcag22aa` (WCAG 2.2 AA completo)
- Proibido desabilitar regras do axe
- Testar todos os estados interativos: padrão, erro, loading, desabilitado, modal aberto

### Constraints de Componentes React (Seção 4)

- **PAT-001** — Functional components only; sem `React.FC`; props tipadas diretamente com `interface`
- **PAT-002** — Lógica extraída em custom hooks (`useXxx`); componente renderiza, hook processa
- **PAT-003** — Shadcn como copy-paste; variantes via `tailwind-variants` (tv), não CVA
- **PAT-004** — Compound components: exports separados, nunca `Object.assign` / namespaced
- **PAT-005** — Atributos Radix UI de a11y nunca removidos (`DialogTitle` e `DialogDescription` obrigatórios)
- **PAT-006** — Estado segue hierarquia: `useState` → Zustand → TanStack Query → URL state

### Constraints de Estilo Tailwind + UI/UX (Seção 4)

- **GUD-001** — Apenas design tokens (`bg-background`, `text-foreground`); nunca cores explícitas
- **GUD-002** — Classes Tailwind longas (>100 chars) quebradas em arrays dentro de `tv()`
- **GUD-003** — Touch targets mínimo 44×44px; `cursor-pointer` em todo elemento clicável
- **GUD-004** — Transições 150–300ms via `transition-colors duration-200`
- **GUD-005** — `prefers-reduced-motion` respeitado em todas as animações
- **GUD-006** — Ícones SVG exclusivamente (Lucide React); emojis proibidos como ícones de UI
- **GUD-007** — Contraste mínimo 4.5:1 (WCAG AA); verificado automaticamente com axe

### Constraints de Performance Next.js 16 + Vercel (Seção 4)

- **REQ-P01** — RSC por padrão; `'use client'` apenas quando necessário (hooks, eventos, browser APIs)
- **REQ-P02** — Waterfalls eliminados: fetches paralelos via `Promise.all()` ou `Suspense` boundaries
- **REQ-P03** — `React.cache()` para deduplicação de requests por render cycle em Server Components
- **REQ-P04** — `next/dynamic` para componentes pesados (editor de prompt, comparador de texto lado a lado)
- **REQ-P05** — `async params` e `async searchParams` (padrão obrigatório Next.js 16)
- **REQ-P06** — Sem barrel imports; imports diretos de módulos para bundle otimizado
- **REQ-P07** — Botões desabilitados e com feedback visual durante operações assíncronas

### Design System (ui-ux-pro-max)

A spec `spec-design-landing.md` incluirá requisito de gerar `design-system/MASTER.md` via `ui-ux-pro-max`, definindo:
- **Estilo**: Minimalism (produto SaaS educacional profissional)
- **Paleta**: Neutros com accent primário (azul/índigo — confiança, educação)
- **Tipografia**: Inter ou similar (legibilidade, PT-BR)
- **Hierarquia de z-index**: Escala definida (10, 20, 30, 50)

---

## Exemplo de Spec: spec-process-extraction.md

```
Seção 4 — Requirements & Constraints (recorte):

REQ-001: O sistema SHALL extrair questões objetivas e dissertativas de PDFs até 25 MB
REQ-002: Em falha parcial de OCR, SHALL persistir questões com sucesso e popular extraction_warning
CON-001: Timeout Edge Function ~150s; batching obrigatório para provas com >10 questões
REQ-P01: Route handler POST /api/exams usa Node.js runtime; Edge Function invocada via supabase.functions.invoke()
PAT-002: Hook useExamPolling encapsula lógica de polling com TanStack Query; componente só renderiza status
GUD-007: Indicador de progresso com contraste mínimo 4.5:1; skeleton screen reserva espaço durante loading

Seção 6 — Test Strategy (recorte):
- Vitest: Schema Zod do endpoint, parsing da resposta LLM, lógica de extraction_warning
- jest-axe: <ExtractionStatus> em estados: loading, error, parcial, completo — zero violações
- Playwright: /exams/[id]/extraction com scan WCAG 2.2 AA; estado de erro visível
- Coverage: mínimo 80% nas utilities da Edge Function extract-questions
```

---

## Referências

- PRD: `tasks/prd-adapte-minha-prova/prd.md`
- Tech Spec: `tasks/prd-adapte-minha-prova/techspec.md`
- Template de spec: `.agents/skills/create-specification/SKILL.md`
- Skills aplicadas: `a11y-testing`, `vitest`, `react`, `tailwindcss`, `shadcn`, `shadcn-ui`, `next-best-practices`, `vercel-react-best-practices`, `ui-ux-pro-max`
