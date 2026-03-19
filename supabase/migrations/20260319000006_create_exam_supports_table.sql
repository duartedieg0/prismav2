-- Migration: Create exam_supports junction table
-- Links exams to the set of educational supports selected at exam creation time
-- The analyze-and-adapt Edge Function reads this table to determine which supports to generate adaptations for

create table if not exists public.exam_supports (
  id uuid primary key default uuid_generate_v4(),
  exam_id uuid references public.exams(id) on delete cascade not null,
  support_id uuid references public.supports(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (exam_id, support_id)
);

-- Enable RLS
alter table public.exam_supports enable row level security;

-- RLS Policy: Teachers can manage supports for their exams
create policy "Teachers can manage their exam_supports"
  on public.exam_supports
  for all
  using (
    exists (
      select 1 from public.exams
      where exams.id = exam_supports.exam_id
        and exams.user_id = auth.uid()
    )
  );

-- Create index for efficient queries by exam_id
create index if not exists idx_exam_supports_exam_id on public.exam_supports(exam_id);

comment on table public.exam_supports is 'Junction table linking exams to educational supports';
comment on column public.exam_supports.exam_id is 'Reference to the exam';
comment on column public.exam_supports.support_id is 'Reference to the educational support strategy';
