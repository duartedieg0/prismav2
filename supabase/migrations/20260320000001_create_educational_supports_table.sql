-- Create educational supports reference table
create table if not exists public.educational_supports (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  description text,
  category text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.educational_supports enable row level security;

-- RLS Policy: Everyone can view educational supports
create policy "Anyone can view educational supports" on public.educational_supports
  for select using (true);

-- Insert default educational supports
insert into public.educational_supports (name, description, category) values
  ('Simplificação de linguagem', 'Simplifica o enunciado usando vocabulário mais acessível', 'Linguagem'),
  ('Expansão de conceitos', 'Expande explicações de conceitos complexos', 'Conteúdo'),
  ('Exemplos contextualizados', 'Adiciona exemplos relevantes ao contexto do aluno', 'Didática'),
  ('Passo a passo', 'Quebra problema em passos menores e sequenciais', 'Estrutura'),
  ('Dicas de resolução', 'Fornece dicas para resolver sem dar a resposta', 'Orientação'),
  ('Recursos visuais', 'Sugere recursos visuais que podem ajudar', 'Recursos'),
  ('Alternativas de resposta', 'Oferece diferentes formatos de resposta', 'Flexibilidade')
on conflict (name) do nothing;

comment on table public.educational_supports is 'Suportes educacionais disponíveis para adaptação de provas';
comment on column public.educational_supports.name is 'Nome do suporte educacional';
comment on column public.educational_supports.description is 'Descrição e objetivo do suporte';
comment on column public.educational_supports.category is 'Categoria do suporte';
