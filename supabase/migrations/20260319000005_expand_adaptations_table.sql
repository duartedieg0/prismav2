-- Migration: Expand adaptations table for full adaptation pipeline
-- Adds support_id, analysis fields, status tracking, and error handling

alter table public.adaptations
  add column if not exists support_id uuid references public.supports(id) on delete cascade,
  add column if not exists adapted_statement text,
  add column if not exists bncc_skill_code text,
  add column if not exists bncc_skill_description text,
  add column if not exists bloom_level text check (bloom_level is null or bloom_level in (
    'remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'
  )),
  add column if not exists bloom_justification text,
  add column if not exists status text default 'pending' check (status in (
    'pending', 'processing', 'completed', 'error'
  )),
  add column if not exists error_message text,
  add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now()) not null;

-- Create index for efficient queries by question_id and support_id
create index if not exists idx_adaptations_question_support on public.adaptations(question_id, support_id);

-- Create index for status queries
create index if not exists idx_adaptations_status on public.adaptations(status);

comment on column public.adaptations.support_id is 'Links adaptation to the specific support strategy used';
comment on column public.adaptations.adapted_statement is 'The adapted question stem/text';
comment on column public.adaptations.bncc_skill_code is 'BNCC skill code identified by LLM';
comment on column public.adaptations.bncc_skill_description is 'BNCC skill description in Portuguese';
comment on column public.adaptations.bloom_level is 'Cognitive level from Bloom''s taxonomy';
comment on column public.adaptations.bloom_justification is 'LLM explanation for the assigned Bloom level';
comment on column public.adaptations.status is 'Lifecycle of this adaptation record';
comment on column public.adaptations.error_message is 'Fatal error detail when status = error';
comment on column public.adaptations.updated_at is 'Last modification timestamp';
