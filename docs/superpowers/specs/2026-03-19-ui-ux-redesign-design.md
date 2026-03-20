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

Substituição completa dos CSS variables em `app/globals.css`. Todos os tokens são migrados de uma vez ao iniciar a implementação dos tokens.

**Mapeamento antigo → novo:**

| CSS Variable | Valor antigo (HSL) | Valor novo (HSL) | Descrição |
|---|---|---|---|
| `--background` | `0 0% 100%` | `60 20% 98%` | Off-white levemente quente |
| `--foreground` | `222.2 84% 4.9%` | `20 9% 10%` | Quase-preto quente |
| `--card` | `0 0% 100%` | `0 0% 100%` | Branco puro (cards elevados) |
| `--card-foreground` | `222.2 84% 4.9%` | `20 9% 10%` | Texto em cards |
| `--popover` | `0 0% 100%` | `0 0% 100%` | Branco puro |
| `--popover-foreground` | `222.2 84% 4.9%` | `20 9% 10%` | Texto em popovers |
| `--primary` | `221.2 83.2% 53.3%` | `168 78% 27%` | Verde-esmeralda |
| `--primary-foreground` | `210 40% 98%` | `0 0% 100%` | Branco sobre primário |
| `--secondary` | `210 40% 96.1%` | `30 25% 93%` | Cinza-bege claro |
| `--secondary-foreground` | `222.2 47.4% 11.2%` | `20 9% 10%` | Texto sobre secundário |
| `--muted` | `210 40% 96.1%` | `30 25% 93%` | Fundo de áreas de baixo destaque |
| `--muted-foreground` | `215.4 16.3% 46.9%` | `28 7% 45%` | Texto secundário cinza-quente |
| `--accent` | `210 40% 96.1%` | `38 92% 50%` | Âmbar — CTAs e destaques |
| `--accent-foreground` | `222.2 47.4% 11.2%` | `20 9% 10%` | Texto sobre accent |
| `--destructive` | `0 84.2% 60.2%` | `0 72% 51%` | Vermelho para erros/deletar |
| `--destructive-foreground` | `210 40% 98%` | `0 0% 100%` | Texto sobre destructive |
| `--border` | `214.3 31.8% 91.4%` | `30 18% 87%` | Borda quente |
| `--input` | `214.3 31.8% 91.4%` | `30 18% 87%` | Borda de inputs |
| `--ring` | `221.2 83.2% 53.3%` | `168 78% 27%` | Focus ring (3px, offset 2px) |
| `--radius` | `0.5rem` | `0.75rem` | Base radius (não usada diretamente) |

**Novos tokens a adicionar em `app/globals.css`:**

```css
--success: 142 76% 36%;
--success-foreground: 0 0% 100%;
```

**Adicionar ao `tailwind.config.ts` (extend.colors):**

```js
success: {
  DEFAULT: 'hsl(var(--success))',
  foreground: 'hsl(var(--success-foreground))',
},
```

**Verificação de contraste WCAG AA:**

| Combinação | Ratio estimado | Status |
|---|---|---|
| `--foreground` (#1C1917) sobre `--background` (#FAFAF7) | ~17:1 | ✅ AAA |
| `--primary` (#0D7C66) sobre `--background` (#FAFAF7) | ~5.2:1 | ✅ AA |
| `--muted-foreground` (#78716C) sobre `--background` (#FAFAF7) | ~4.7:1 | ✅ AA |
| `--accent` (#F59E0B) sobre `--background` (#FAFAF7) | ~2.4:1 | ⚠️ Usar apenas como ícone/decoração, NUNCA como texto |
| Texto branco sobre `--accent` (#F59E0B) | ~2.4:1 | ⚠️ Não usar |
| Texto `--foreground` sobre `--accent` (#F59E0B) | ~6.1:1 | ✅ AA |

> **Regra:** O âmbar (`--accent`) nunca deve ser usado como cor de texto. Sempre usar `--accent-foreground` (#1C1917) sobre fundos âmbar.

### 1.2 Tipografia

**Fontes via `next/font/google` em `app/layout.tsx`:**

```tsx
import { Plus_Jakarta_Sans, Inter, JetBrains_Mono } from 'next/font/google'

const displayFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-display',
  display: 'swap',
})

const bodyFont = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
})

const monoFont = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-mono',
  display: 'swap',
})
```

Aplicar as variáveis no `<body>`: `className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}`

**Substituição em `globals.css`:**

```css
body {
  font-family: var(--font-sans), system-ui, sans-serif;
}
```

**Fallback stack:** `Plus Jakarta Sans → system-ui → sans-serif` | `Inter → system-ui → sans-serif` | `JetBrains Mono → 'Courier New' → monospace`

**Utilitários tipográficos adicionados ao `tailwind.config.ts`:**

```js
// extend.fontSize
fontSize: {
  'display-xl': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '800' }],
  'display-lg': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }],
  'display-md': ['1.5rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '700' }],
  'heading': ['1.125rem', { lineHeight: '1.4', fontWeight: '600' }],
  'body': ['0.9375rem', { lineHeight: '1.6', fontWeight: '400' }],
  'small': ['0.8125rem', { lineHeight: '1.5', fontWeight: '400' }],
  'caption': ['0.6875rem', { lineHeight: '1.4', letterSpacing: '0.06em', fontWeight: '500' }],
}
// extend.fontFamily
fontFamily: {
  display: ['var(--font-display)', 'system-ui', 'sans-serif'],
  sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
  mono: ['var(--font-mono)', 'Courier New', 'monospace'],
}
```

### 1.3 Espaçamento

Tailwind padrão, sem customização necessária. Referência de uso:

| Token Tailwind | Valor | Uso principal |
|---|---|---|
| `space-1` / `p-1` | 4px | Gap mínimo inline |
| `space-2` / `p-2` | 8px | Padding interno de badges |
| `space-3` / `p-3` | 12px | Gap label → input |
| `space-4` / `p-4` | 16px | Padding de cards compactos |
| `space-6` / `p-6` | 24px | Gap entre grupos de elementos |
| `space-8` / `p-8` | 32px | Padding de cards normais |
| `space-12` / `p-12` | 48px | Separação entre seções |
| `space-16` / `p-16` | 64px | Padding vertical de seções |
| `space-24` / `p-24` | 96px | Respiração de seções hero |

> **Preferência:** usar `gap` e `padding` para layout; evitar `margin` em componentes isolados.

### 1.4 Border Radius

Atualização em `tailwind.config.ts`:

```js
borderRadius: {
  sm: '6px',    // inputs, badges, chips
  md: '12px',   // botões, cards
  lg: '16px',   // modais, painéis laterais
  xl: '24px',   // cards hero, CTAs grandes
  full: '9999px', // avatares, pílulas
}
```

> Remover a extensão atual baseada em `var(--radius)`. O `--radius` em `globals.css` pode ser removido.

### 1.5 Sombras

Adição em `tailwind.config.ts`:

```js
boxShadow: {
  sm: '0 1px 3px rgba(28,25,23,0.06)',
  md: '0 4px 12px rgba(28,25,23,0.10)',
  lg: '0 8px 24px rgba(28,25,23,0.12)',
}
```

### 1.6 Focus Ring

Todos os elementos interativos devem ter focus ring visível:

```
ring-width: 3px
ring-color: var(--ring)  /* #0D7C66 */
ring-offset: 2px
ring-offset-color: var(--background)
```

Usar as classes Tailwind `focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2`. Nunca suprimir outline/ring em elementos interativos.

---

## 2. Arquitetura de Navegação

### 2.1 Sidebar — Spec do Componente

**Arquivo:** `components/layout/sidebar.tsx` (Client Component)

**Estrutura:**

```
┌─────────────────────────┐
│  Logo + "Adapte Minha Prova" │ (36px height, font-display)
├─────────────────────────┤
│  [ícone] Dashboard       │ ← link de navegação
├─────────────────────────┤
│  ADMINISTRAÇÃO (label)   │ ← visível apenas se role === 'admin'
│  [ícone] Modelos de IA   │
│  [ícone] Agentes         │
│  [ícone] Disciplinas     │
│  [ícone] Séries          │
│  [ícone] Suportes        │
│  [ícone] Usuários        │
├─────────────────────────┤
│  [avatar] Nome do usuário│ ← rodapé
│           email          │
│  [botão] Sair            │
└─────────────────────────┘
```

**Estados de links:**
- Default: texto `--muted-foreground`, ícone `--muted-foreground`
- Hover: fundo `--muted`, texto `--foreground`
- Active (rota atual): fundo `--primary/10`, texto `--primary`, ícone `--primary`
- Transição: `transition-colors duration-150`

**Visibilidade da seção admin:** Renderizada condicionalmente no servidor (não `hidden`). Recebe a role do usuário como prop via Server Component pai.

**Desktop (≥ 768px):**
- Largura: 240px, fixa à esquerda
- Sempre visível

**Mobile (< 768px):**
- Sidebar oculta por padrão
- Botão hamburger no header da página (icon `Menu` do Lucide, `aria-label="Abrir menu"`)
- Ao clicar: drawer desliza da esquerda (`translateX(-100%)` → `translateX(0)`, 250ms ease)
- Overlay escuro semi-transparente fecha o drawer ao clicar fora
- Focus trap ativo enquanto drawer está aberto (`aria-modal="true"`, `role="dialog"`)
- `aria-expanded` atualizado no botão hamburger conforme estado

**Acessibilidade:**
- `<nav aria-label="Navegação principal">` no sidebar
- Links com `aria-current="page"` no link ativo

### 2.2 App Layout

**Arquivo:** `components/layout/app-layout.tsx` (Server Component — recebe `role` do usuário)

```tsx
// Estrutura simplificada
<div className="flex min-h-screen">
  <Sidebar role={role} />               {/* 240px fixed */}
  <main className="flex-1 overflow-y-auto pl-60"> {/* padding-left = sidebar width */}
    {children}
  </main>
</div>
```

Usado nos layouts `app/(auth)/layout.tsx` e `app/(admin)/layout.tsx`.

---

## 3. Redesign por Página

### 3.1 Landing (`/`)

**Escopo:** redesign completo da página, incluindo navbar, hero, features e CTA final.

**Navbar:**
- Logo à esquerda ("Adapte Minha Prova" + ícone)
- "Entrar" como `Button variant="outline"` à direita
- Sticky, fundo `--background/90 backdrop-blur` ao scrollar
- Mobile: sem hamburger (apenas logo + botão "Entrar")

**Hero Section:**
- Fundo sólido `--primary` (verde-esmeralda)
- Headline: `text-display-xl font-display text-white`
- Subtítulo: `text-white/80 text-body`
- CTA principal: `Button` com `bg-accent text-accent-foreground shadow-md hover:shadow-lg` (âmbar)
- CTA secundário: `Button variant="outline"` com borda branca/40, texto branco
- Layout: centralizado, `py-24`

**Features Section:**
- Fundo `--background`
- 6 cards, grid 3 col desktop / 2 col tablet / 1 col mobile
- Cada card: ícone Lucide colorido (não monocromático, usar classes `text-primary` ou variações), título em `heading`, descrição em `small text-muted-foreground`
- Cards: `rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow`

**CTA Final:**
- Faixa `--muted`, headline + `Button variant="default"` (primário)

### 3.2 Login (`/login`)

**Escopo:** apenas redesign de estilo — OAuth Google já implementado, sem mudanças no fluxo.

- Layout: `min-h-screen flex items-center justify-center bg-background`
- Card: `max-w-sm w-full rounded-xl border border-border shadow-md p-8`
- Logo grande + nome do produto no topo do card
- Headline: `"Bem-vindo de volta"` em `display-md font-display`
- Subtítulo: `"Entre com sua conta Google para continuar"` em `small text-muted-foreground`
- Botão: `"Entrar com Google"` com ícone SVG do Google, `bg-primary text-white w-full rounded-md shadow-sm hover:bg-primary/90`
- Loading state: spinner + `"Conectando..."` (já implementado, manter comportamento)
- Rodapé do card: texto de privacidade em `caption text-muted-foreground text-center`
- Sem error handling adicional (fora do escopo)

### 3.3 Dashboard (`/dashboard`)

**Header da página:**
- `"Minhas Provas"` em `display-md font-display`
- Botão `"Nova Prova"` com ícone `Plus` em `variant="accent"` (âmbar) à direita

**Cards de prova:**

```
┌──────────────────────────────────────┐
│ ▌ (barra lateral 4px, cor por status) │
│                                       │
│  Nome da Prova                 [badge]│
│  Matemática · 5º Ano      há 2 dias  │
│                                       │
│                  [Botão próxima ação] │
└──────────────────────────────────────┘
```

**Lógica da barra de status e botão de ação:**

| Status | Cor da barra | Badge | Botão de ação | Destino |
|---|---|---|---|---|
| `draft` | `--muted-foreground` | "Rascunho" | "Continuar" | `/exams/[id]/extraction` |
| `processing` | `--accent` (âmbar) | "Processando" | "Aguardando..." (disabled) | — |
| `ready` | `--success` (verde) | "Pronto" | "Ver Resultado" | `/exams/[id]/result` |
| `error` | `--destructive` (vermelho) | "Erro" | "Tentar Novamente" | `/exams/new` |
| `archived` | `--muted-foreground` | "Arquivado" | "Ver Arquivo" | `/exams/[id]/result` |

**Grid:** 3 col desktop / 2 col tablet / 1 col mobile, `gap-4`

**Empty state:**
- Ícone SVG `ClipboardList` do Lucide em `w-16 h-16 text-muted-foreground/50`
- Título: `"Nenhuma prova ainda"` em `heading`
- Subtítulo: `"Crie sua primeira prova para começar"` em `small text-muted-foreground`
- Botão: `"Criar primeira prova"` em `variant="default"`

### 3.4 Nova Prova (`/exams/new`)

**Stepper — Spec do Componente:**

Etapas: `1. Informações → 2. Configurações → 3. Upload → 4. Revisão`

**Arquivo:** `components/ui/stepper.tsx` (Client Component, custom — não existe no shadcn atual)

**Visual do stepper horizontal:**
```
● Informações  ─────  ○ Configurações  ─────  ○ Upload  ─────  ○ Revisão
```
- Passo atual: círculo preenchido `--primary`, texto `--primary`, `font-weight: 600`
- Passo completo: círculo com ícone `Check`, cor `--success`
- Passo futuro: círculo vazio com borda `--border`, texto `--muted-foreground`
- Conectores: linha `--border`, vira `--success` quando etapa anterior completa

**Mobile (< 640px):** mostrar apenas `"Etapa 1 de 4"` em texto + barra de progresso linear, sem círculos (ocupam muito espaço)

**Navegação:** botões "Voltar" (`variant="outline"`) e "Continuar" / "Enviar" (`variant="default"`) no rodapé de cada etapa. Usuário pode clicar em etapas anteriores concluídas, mas não pode pular etapas futuras.

**Barra de progresso:** `<progress>` ou `div` com width animado, `h-1 bg-primary rounded-full`, acima do stepper

**Uma etapa por tela** — não scroll longo. Layout: `max-w-lg mx-auto py-8`

### 3.5 Extração (`/exams/[id]/extraction`)

- Header com título `"Revisar Questões Extraídas"` e indicador `"3 de 12 confirmadas"`
- Botão `"Confirmar todas"` em `variant="outline"` no header
- Lista de questões com checkbox de confirmação, número, e texto da questão
- Questões confirmadas: borda `--success/30`, fundo `--success/5`
- Questões pendentes: borda `--border`, fundo `--card`
- Botão `"Enviar para Adaptação"` no rodapé: habilitado apenas quando 100% confirmadas

### 3.6 Processamento (`/exams/[id]/processing`)

- Layout centralizado (`flex flex-col items-center justify-center min-h-[60vh]`)
- Ícone animado: `Brain` do Lucide em `w-16 h-16 text-primary`, animação `pulse` (scale 1.0 → 1.05, 2s, loop)
- `@media (prefers-reduced-motion: reduce)`: animação desativada, ícone estático
- Barra de progresso: `h-3 rounded-full bg-primary`, transição `width` animada
- Texto de porcentagem: `text-display-md font-display text-primary`
- Status descritivo: `"Analisando questão 3 de 12..."` em `body text-muted-foreground`
- Auto-redireciona para resultado ao completar (comportamento existente mantido)

### 3.7 Resultado (`/exams/[id]/result`)

**Layout desktop (≥ 768px):** two-column `grid grid-cols-2 gap-6`
- Coluna esquerda: questão original
- Coluna direita: questão adaptada
- Divisória: `border-r border-border` na coluna esquerda

**Layout mobile (< 768px):** single column, questão original colapsável (accordion) acima da adaptada

**Card de par de questões:**
- Header: `"Questão [N]"` + botão `"Copiar adaptação"` com ícone `Copy` no canto direito
- Ao copiar: ícone muda para `Check`, texto `"Copiado!"`, volta ao normal após 2s
- Texto em `body`, `leading-relaxed`

**Feedback simplificado (substituindo estrelas):**
- Dois botões: 👍 (ThumbsUp) e 👎 (ThumbsDown) — `variant="ghost"`, ficam `text-primary` ao selecionar
- Campo textarea opcional: `"Comentário (opcional)"`, `rows=2`, aparece após selecionar um dos dois
- Botão `"Enviar feedback"` em `variant="outline" size="sm"`, habilitado apenas após selecionar thumb

**Header da página:**
- `"Resultado da Adaptação"` em `display-md font-display`
- Botões: `"Exportar PDF"` (outline) + `"Voltar ao Dashboard"` (ghost)

### 3.8 Admin — Config (`/config/*`)

**Padrão de tabela:**
- Header da seção: título em `display-md` + botão `"Adicionar [item]"` em `variant="default"` à direita
- Campo de busca: `Input` com ícone `Search` inline, acima da tabela, busca por nome/email conforme a tabela
- Tabela: `border border-border rounded-lg overflow-hidden`
- Header da tabela: `bg-muted text-small font-medium text-muted-foreground uppercase tracking-wide`
- Linha: altura 48px, padding horizontal `p-4`, hover `bg-muted/50`
- Coluna de ações (última): ícones `Pencil` (editar) e `Trash2` (deletar) com `tooltip` ao hover, `variant="ghost" size="sm"`
- Ações ficam sempre visíveis (não apenas no hover) para acessibilidade
- Paginação: 25 linhas por página, controles "Anterior" / "Próxima" com contagem `"1–25 de 87"`
- Ordenação: colunas de nome/data clicáveis com ícone `ArrowUpDown` no header
- Empty state: ícone + texto + botão "Adicionar primeiro [item]"

**Ação destrutiva (deletar):** abre `Dialog` de confirmação com título `"Tem certeza?"`, descrição do item a ser deletado, botões `"Cancelar"` (outline) e `"Deletar"` (destructive)

### 3.9 Usuários (`/users`)

**Mesma estrutura de tabela do 3.8**, com colunas:
- Avatar (inicial do nome, `rounded-full bg-primary/10 text-primary w-8 h-8`)
- Nome + email (duas linhas)
- Role badge: `admin` (bg-primary/10 text-primary), `teacher` (bg-blue-50 text-blue-700), `user` (bg-muted text-muted-foreground)
- Status badge: `ativo` (`bg-success/10 text-success`), `bloqueado` (`bg-destructive/10 text-destructive`)
- Data de cadastro (formato `dd/MM/yyyy`)
- Ações: editar role, bloquear/desbloquear

**Filtros:** dropdowns "Todos os roles" e "Todos os status" acima da tabela, ao lado do campo de busca

---

## 4. Componentes Atualizados

### Button

Adicionar variante `accent` ao `components/ui/button.tsx` via `cva`:

```ts
accent: 'bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm',
```

Manter todas as variantes existentes; atualizar estilos de `default` para refletir novo `--primary`.

### Badge

Adicionar variantes de status de prova:

```ts
// Usar diretamente via className onde necessário, ou adicionar variantes ao cva
badge-draft:       'bg-muted text-muted-foreground'
badge-processing:  'bg-amber-50 text-amber-700 border-amber-200'
badge-ready:       'bg-emerald-50 text-emerald-700 border-emerald-200'
badge-error:       'bg-red-50 text-red-600 border-red-200'
badge-archived:    'bg-gray-50 text-gray-500 border-gray-200'
```

> Usar cores Tailwind literais para status (emerald, amber, red, gray) para evitar dependência de variáveis CSS complexas.

### Card

- `rounded-lg border border-border shadow-sm`
- Hover: `hover:shadow-md hover:border-primary/30 transition-all duration-200`

### Input

- `rounded-sm border border-input bg-card`
- Focus: `focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary`

---

## 5. Acessibilidade

- Manter todos os padrões atuais (jest-axe, aria-hidden, heading hierarchy)
- Contrast ratio WCAG AA verificado para todos os textos (ver tabela em 1.1)
- `--accent` (âmbar) **nunca usado como cor de texto** — apenas como fundo ou decoração
- Focus rings em todos os elementos interativos (ver 1.6)
- Sidebar com `aria-label`, focus trap no mobile drawer
- Animações respeitam `prefers-reduced-motion` (ver 3.6)
- Ações de tabela sempre visíveis (não apenas no hover) para usuários de teclado
- Tooltips via `title` ou `Tooltip` do shadcn em ícones de ação sem texto

---

## 6. Logo

- **Símbolo:** ícone `Brain` do Lucide em `text-primary`
- **Wordmark:** "Adapte Minha Prova" em `font-display font-700`
- **Variações:**
  - Sidebar: símbolo (24px) + wordmark, horizontal
  - Landing navbar: símbolo (20px) + wordmark, horizontal, cor branca sobre fundo primário
  - Login card: símbolo (32px) + wordmark, centralizado
- **Considerações futuras:** o símbolo do Lucide pode ser substituído por logo custom sem impacto no restante do sistema

---

## 7. Arquivos a Modificar

| Arquivo | Tipo de mudança |
|---|---|
| `app/globals.css` | Atualizar todos os CSS variables (ver tabela 1.1) |
| `tailwind.config.ts` | Adicionar fontSize, fontFamily, borderRadius, boxShadow |
| `app/layout.tsx` | Trocar fontes para Plus Jakarta Sans + Inter + JetBrains Mono |
| `components/layout/sidebar.tsx` | **Novo** — sidebar responsiva |
| `components/layout/app-layout.tsx` | **Novo** — layout wrapper com sidebar |
| `components/ui/stepper.tsx` | **Novo** — componente de stepper |
| `components/ui/button.tsx` | Adicionar variante `accent` |
| `components/ui/badge.tsx` | Adicionar variantes de status de prova |
| `app/(auth)/layout.tsx` | Usar AppLayout com sidebar |
| `app/(admin)/layout.tsx` | Usar AppLayout com sidebar (seção admin) |
| `app/page.tsx` | Redesenhar landing completa |
| `app/login/page.tsx` | Redesenhar card de login |
| `app/(auth)/dashboard/page.tsx` | Redesenhar cards de prova e empty state |
| `app/(auth)/exams/new/page.tsx` | Adicionar stepper wizard |
| `app/(auth)/exams/[id]/extraction/page.tsx` | Atualizar UI de confirmação |
| `app/(auth)/exams/[id]/processing/page.tsx` | Melhorar feedback visual |
| `app/(auth)/exams/[id]/result/page.tsx` | Layout two-column + feedback simplificado |
| `app/(admin)/config/*/page.tsx` (5 arquivos) | Atualizar tabelas de admin |
| `app/(admin)/users/page.tsx` | Atualizar tabela de usuários |

---

## 8. Ordem de Implementação

1. **Design tokens** — `globals.css` + `tailwind.config.ts` + `app/layout.tsx` (fontes)
2. **Componentes base** — `button.tsx` (variante accent), `badge.tsx` (variantes status)
3. **Layout / Sidebar** — `sidebar.tsx` + `app-layout.tsx` + atualizar layouts de rota
4. **Páginas públicas** — `landing` + `login`
5. **Dashboard** — cards + empty state
6. **Fluxo de prova** — stepper (nova prova) → extração → processamento → resultado
7. **Admin** — tabelas de config (5 páginas) + usuários

---

## 9. Fora do Escopo

- Dark mode
- Mudanças no banco de dados ou Edge Functions
- Novos fluxos de usuário (apenas redesign dos existentes)
- Internacionalização
- Logo custom (usa ícone Lucide como placeholder)
- Formulários de contato ou suporte
- Autenticação alternativa além de Google OAuth
