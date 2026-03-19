-- Migration: Add BNCC and Bloom analysis columns to questions table
-- These columns are populated by the analyze-and-adapt Edge Function
-- BNCC: Base Nacional Comum Curricular (Brazilian national curriculum)
-- Bloom: Bloom's taxonomy cognitive levels (remember, understand, apply, analyze, evaluate, create)

alter table public.questions
  add column if not exists bncc_skill_code text,
  add column if not exists bncc_skill_description text,
  add column if not exists bloom_level text check (bloom_level is null or bloom_level in (
    'remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'
  )),
  add column if not exists bloom_justification text;

comment on column public.questions.bncc_skill_code is 'BNCC skill code identified by LLM (e.g., EF06MA01)';
comment on column public.questions.bncc_skill_description is 'Portuguese description of the BNCC skill';
comment on column public.questions.bloom_level is 'Cognitive level from Bloom''s taxonomy';
comment on column public.questions.bloom_justification is 'LLM explanation for the assigned Bloom level';
