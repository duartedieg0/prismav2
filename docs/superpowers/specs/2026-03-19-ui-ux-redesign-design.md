# Design Spec: Redesign UI/UX — Adapte Minha Prova

**Data:** 2026-03-19
**Status:** Aprovado pelo usuário
**Escopo:** Full redesign — design system + todos os componentes + todos os layouts
**Modo de cores:** Light mode apenas

---

## Contexto

A plataforma **Adapte Minha Prova** é uma ferramenta edtech para adaptação de provas escolares com IA, voltada para professores. A interface atual é funcional mas visualmente genérica (azul padrão, branco puro, Geist sans) e apresenta problemas de usabilidade em todos os fluxos principais. O objetivo deste redesign é criar uma identidade visual **acolhedora e humana** — transmitindo cuidado com o aluno e com o professor — e resolver os principais pontos de atrito de usabilidade.

---

## 1. Design System

### 1.1 Paleta de Cores

| Papel | Hex | HSL | Descrição |
|---|---|---|---|
| `--primary` | `#0D7C66` | `168 78% 27%` | Verde-esmeralda — cuidado, crescimento, inclusão |
| `--primary-hover` | `#0A6455` | `168 78% 21%` | Variante escura do primário |
| `--primary-foreground` | `#FFFFFF` | `0 0% 100%` | Texto sobre primário |
| `--accent` | `#F59E0B` | `38 92% 50%` | Âmbar quente — CTAs principais, destaques |
| `--accent-foreground` | `#1C1917` | `20 9% 10%` | Texto sobre accent |
| `--background` | `#FAFAF7` | `60 20% 98%` | Off-white levemente quente |
| `--foreground` | `#1C1917` | `20 9% 10%` | Texto principal — quase-preto quente |
| `--card` | `#FFFFFF` | `0 0% 100%` | Superfície de cards |
| `--card-foreground` | `#1C1917` | `20 9% 10%` | Texto em cards |
| `--muted` | `#F5F0EB` | `30 25% 93%` | Fundo de áreas de baixo destaque |
| `--muted-foreground` | `#78716C` | `28 7% 45%` | Texto secundário |
| `--border` | `#E8E0D8` | `30 18% 87%` | Bordas — tom quente |
| `--input` | `#E8E0D8` | `30 18% 87%` | Borda de inputs |
| `--ring` | `#0D7C66` | `168 78% 27%` | Focus ring |
| `--destructive` | `#DC2626` | `0 72% 51%` | Erros, ações destrutivas |
| `--destructive-foreground` | `#FFFFFF` | `0 0% 100%` | Texto sobre destructive |

**Lógica:** Verde-esmeralda é raro no edtech (que usa azul genérico), diferenciando o produto. O âmbar aquece a interface e guia o olhar nos momentos de ação. O off-white quente elimina a frieza do branco puro.

### 1.2 Tipografia

| Fonte | Papel | Pesos | Origem |
|---|---|---|---|
| `Plus Jakarta Sans` | Display / Headings | 700, 800 | Google Fonts |
| `Inter` | Body / UI | 400, 500, 600 | Google Fonts |
| `JetBrains Mono` | Código / IDs técnicos | 400 | Google Fonts |

**Escala tipográfica:**

| Token | Tamanho | Peso | Line Height | Uso |
|---|---|---|---|---|
| `display-xl` | 48px | 800 | 1.1 | Hero da landing |
| `display-lg` | 36px | 700 | 1.2 | Títulos de seção |
| `display-md` | 24px | 700 | 1.3 | Títulos de página |
| `heading` | 18px | 600 | 1.4 | Subtítulos, cabeçalhos de card |
| `body` | 15px | 400 | 1.6 | Texto padrão |
| `small` | 13px | 400 | 1.5 | Metadados, labels |
| `caption` | 11px | 500 | 1.4 | Badges, chips (all caps) |

**Letter spacing:** `-0.02em` em displays, `0` em body, `0.06em` em labels/caps pequenos.

### 1.3 Espaçamento

Escala baseada em múltiplos de 4px, usando os tokens padrão do Tailwind:

| Token Tailwind | Valor | Uso principal |
|---|---|---|
| `space-1` | 4px | Gap mínimo inline |
| `space-2` | 8px | Padding interno de badges |
| `space-3` | 12px | Gap label → input |
| `space-4` | 16px | Padding interno de cards compactos |
| `space-6` | 24px | Gap entre grupos de elementos |
| `space-8` | 32px | Padding de cards normais |
| `space-12` | 48px | Separação entre seções |
| `space-16` | 64px | Padding vertical de seções principais |
| `space-24` | 96px | Respiração de seções hero |

### 1.4 Border Radius

| Token | Valor | Uso |
|---|---|---|
| `radius-sm` | 6px | Inputs, badges, chips |
| `radius-md` | 12px | Botões, cards |
| `radius-lg` | 16px | Modais, painéis laterais |
| `radius-xl` | 24px | Cards hero, CTAs grandes |

### 1.5 Sombras

Sombras sutis com tom quente (não cinza frio):

| Token | Valor | Uso |
|---|---|---|
| `shadow-sm` | `0 1px 3px rgba(28,25,23,0.06)` | Cards padrão |
| `shadow-md` | `0 4px 12px rgba(28,25,23,0.10)` | Cards em hover |
| `shadow-lg` | `0 8px 24px rgba(28,25,23,0.12)` | Modais, dropdowns |

---

## 2. Arquitetura de Navegação

### 2.1 Sidebar (substituindo navbar)

A navbar horizontal atual é substituída por uma **sidebar fixa à esquerda** em todas as páginas autenticadas e de admin:

- **Largura:** 240px (expandida) / 64px (colapsada em mobile)
- **Conteúdo:**
  - Logo + nome do produto no topo
  - Links principais: Dashboard, (futuro: Minhas Provas)
  - Seção separada "Administração" (visível apenas para role `admin`): Modelos, Agentes, Disciplinas, Séries, Suportes, Usuários
  - Avatar + nome do usuário + botão de logout no rodapé
- **Comportamento:** Fixa em desktop, colapsável em mobile (drawer)

### 2.2 Estrutura de Layout

```
┌─────────────────────────────────────────────┐
│ Sidebar (240px)  │  Main Content Area       │
│                  │  (flex-1, overflow-y)     │
│  Logo            │                           │
│  ─────           │  Page header              │
│  Dashboard       │  ─────────────────        │
│  ─────           │  Page content             │
│  [Admin section] │                           │
│  ─────           │                           │
│  User avatar     │                           │
└─────────────────────────────────────────────┘
```

---

## 3. Redesign por Página

### 3.1 Landing (`/`)

**Objetivo:** Converter visitantes em usuários — transmitir confiança e propósito.

- **Hero section:** Fundo sólido `--primary` (verde), headline branca em `display-xl`, subtítulo em `primary-foreground/80`, CTA principal em âmbar (`--accent`) com sombra, CTA secundário em outline branco
- **Features section:** Fundo `--background` (off-white), 6 cards com ícone colorido (não monocromático), título, descrição. Grid 3 colunas em desktop, 1 em mobile
- **CTA final:** Faixa em `--muted` com headline + botão primário
- **Navbar:** Logo à esquerda, links no centro, "Entrar" como botão outline à direita. Sticky com `backdrop-blur` ao scrollar

### 3.2 Login (`/login`)

**Objetivo:** Acolher o professor sem atrito.

- Card centralizado vertical e horizontalmente, fundo `--background`
- Logo grande + headline acolhedora ("Bem-vindo de volta")
- Subtítulo explicativo curto
- Botão "Entrar com Google" com ícone Google, fundo `--primary`, cor branca, sombra `shadow-md`
- Texto de rodapé sobre privacidade/segurança em `--muted-foreground`

### 3.3 Dashboard (`/dashboard`)

**Objetivo:** Visão rápida do estado das provas + próxima ação clara.

- **Header de página:** "Minhas Provas" em `display-md` + botão "Nova Prova" com ícone `+` em âmbar
- **Cards de prova:** Cada card tem:
  - Barra vertical colorida à esquerda (cor por status: verde=pronto, âmbar=processando, cinza=rascunho, vermelho=erro)
  - Nome da prova em `heading`
  - Disciplina + série em `small` + `--muted-foreground`
  - Data em `caption`
  - Badge de status
  - Botão de **próxima ação** contextual (ex: "Ver Resultado", "Continuar", "Processar")
- **Grid:** 3 colunas em desktop, 2 em tablet, 1 em mobile
- **Empty state:** Ícone SVG simples (clipboard com lápis) + texto encorajador + botão "Criar primeira prova"

### 3.4 Nova Prova (`/exams/new`)

**Objetivo:** Guiar o professor sem sobrecarga cognitiva.

- **Stepper horizontal** no topo com etapas nomeadas e numeradas:
  1. Informações → 2. Configurações → 3. Upload → 4. Revisão
- Uma etapa renderizada por vez (não scroll longo)
- Navegação com botões "Voltar" e "Continuar" (ou "Enviar" na última etapa)
- Progress bar linear acima do stepper mostrando % de conclusão
- Campos com labels claros, placeholders úteis, mensagens de erro inline

### 3.5 Extração (`/exams/[id]/extraction`)

**Objetivo:** Validar as questões extraídas de forma eficiente.

- Lista de questões extraídas com número, texto, e inputs para confirmação
- Botão "Confirmar todas" no topo para acelerar revisão
- Indicador de quantas questões foram confirmadas vs. total
- Botão "Enviar para adaptação" habilitado apenas quando todas confirmadas

### 3.6 Processamento (`/exams/[id]/processing`)

**Objetivo:** Manter o professor informado e confiante enquanto aguarda.

- Layout centralizado com ícone animado (não apenas spinner)
- Barra de progresso expressiva com porcentagem
- Texto de status descritivo (ex: "Analisando questão 3 de 12...")
- Estimativa de tempo restante se disponível
- Animação suave de pulso no ícone principal

### 3.7 Resultado (`/exams/[id]/result`)

**Objetivo:** Apresentar as adaptações de forma clara e coletar feedback.

- **Layout two-column:** coluna esquerda = questão original, coluna direita = questão adaptada
- Cada par de questões em um card com divisória central
- Ações de cópia ("Copiar adaptação") com ícone e feedback visual
- **Feedback simplificado:** thumbs up / thumbs down + campo de comentário opcional (substituindo estrelas)
- Botão "Exportar PDF" / "Voltar ao Dashboard" no header da página

### 3.8 Admin — Config (`/config/*`)

**Objetivo:** Gerenciamento eficiente para administradores.

- Mesma sidebar com seção "Administração" expandida
- Tabelas com:
  - Header com título + botão "Adicionar" à direita
  - Colunas com densidade adequada
  - Filtro de busca visível acima da tabela
  - Ações (editar, deletar) agrupadas na última coluna como ícones com tooltip
- Modais de confirmação para ações destrutivas

### 3.9 Usuários (`/users`)

**Objetivo:** Gestão clara de usuários e permissões.

- Tabela com avatar (inicial do nome), nome, email, role badge, status badge, data de cadastro, ações
- Filtros por role e status acima da tabela
- Badge de role colorido: admin (verde-escuro), teacher (azul), user (cinza)
- Badge de status: ativo (verde), bloqueado (vermelho)

---

## 4. Componentes Atualizados

### Botão (`Button`)

| Variante | Uso | Estilo |
|---|---|---|
| `default` | Ação primária | Fundo `--primary`, texto branco, radius-md |
| `accent` | CTA principal | Fundo `--accent`, texto `--accent-foreground`, radius-md |
| `outline` | Ação secundária | Borda `--border`, fundo transparente |
| `ghost` | Ação terciária | Sem borda, hover em `--muted` |
| `destructive` | Deletar/remover | Fundo `--destructive`, texto branco |

### Badge (`Badge`)

Status das provas mapeados para cores:

| Status | Cor de fundo | Texto |
|---|---|---|
| `draft` | `--muted` | `--muted-foreground` |
| `processing` | âmbar/10 | âmbar/80 |
| `ready` | verde/10 | verde/80 |
| `error` | vermelho/10 | vermelho/80 |
| `archived` | cinza/10 | cinza/60 |

### Card (`Card`)

- Fundo `--card` (branco), borda `--border`, radius-md, shadow-sm
- Hover: shadow-md, borda `--primary/30`
- Transição suave: `transition-all duration-200`

### Input (`Input`)

- Borda `--input`, radius-sm, fundo branco
- Focus: ring `--ring` (verde), borda `--primary`
- Placeholder em `--muted-foreground`

---

## 5. Acessibilidade

- Manter todos os padrões atuais de acessibilidade (jest-axe, aria-hidden, heading hierarchy)
- Garantir contrast ratio mínimo WCAG AA em todos os textos
- Focus rings visíveis em todos os elementos interativos
- Sidebar com navegação por teclado (trap focus em mobile drawer)
- Animações respeitam `prefers-reduced-motion`

---

## 6. Arquivos a Modificar

| Arquivo | Mudança |
|---|---|
| `app/globals.css` | Atualizar todas as CSS variables de cor |
| `tailwind.config.ts` | Adicionar tokens de radius, shadow, font |
| `app/layout.tsx` | Trocar fontes (Plus Jakarta Sans + Inter + JetBrains Mono) |
| `components/layout/sidebar.tsx` | **Novo** — sidebar de navegação |
| `components/layout/app-layout.tsx` | **Novo** — layout wrapper com sidebar |
| `app/(auth)/layout.tsx` | Usar AppLayout com sidebar |
| `app/(admin)/layout.tsx` | Usar AppLayout com sidebar (seção admin) |
| `app/page.tsx` | Redesenhar landing |
| `app/login/page.tsx` | Redesenhar login |
| `app/(auth)/dashboard/page.tsx` | Redesenhar dashboard |
| `app/(auth)/exams/new/page.tsx` | Adicionar stepper |
| `app/(auth)/exams/[id]/processing/page.tsx` | Melhorar feedback visual |
| `app/(auth)/exams/[id]/result/page.tsx` | Layout two-column + feedback simplificado |
| `app/(admin)/*/page.tsx` | Atualizar tabelas de admin |

---

## 7. Ordem de Implementação Recomendada

1. **Design tokens** — `globals.css` + `tailwind.config.ts` + `app/layout.tsx` (fontes)
2. **Sidebar + App Layout** — componentes de navegação compartilhados
3. **Landing + Login** — páginas públicas (impacto imediato e visível)
4. **Dashboard** — primeira página pós-login
5. **Fluxo de prova** — nova prova → extração → processamento → resultado
6. **Admin** — config e usuários

---

## 8. Fora do Escopo

- Dark mode (explicitamente excluído)
- Mudanças no banco de dados ou Edge Functions
- Novos fluxos de usuário (apenas redesign dos existentes)
- Internacionalização (app permanece em português)
