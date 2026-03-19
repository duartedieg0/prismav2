-- Add extraction-related columns to exams table
alter table public.exams
  add column if not exists topic text,
  add column if not exists extraction_warning text,
  add column if not exists error_message text;

-- Expand status CHECK constraint to include new extraction workflow states
alter table public.exams
  drop constraint if exists exams_status_check,
  add constraint exams_status_check check (status in ('draft', 'uploading', 'processing', 'awaiting_answers', 'ready', 'error'));

-- Rename questions.text to questions.question_text for consistency with spec
alter table public.questions
  rename column if exists text to question_text;

-- Add extraction-related columns to questions table
alter table public.questions
  add column if not exists alternatives jsonb,
  add column if not exists correct_answer text;

-- Add comment for documentation
comment on column public.exams.topic is 'Topic/subject context for the exam, provided by user at creation';
comment on column public.exams.extraction_warning is 'Partial OCR or extraction failure messages (non-blocking)';
comment on column public.exams.error_message is 'Error details when extraction or processing fails';
comment on column public.questions.question_text is 'The main question text extracted from PDF';
comment on column public.questions.alternatives is 'Multiple choice options as JSON object {key: value}';
comment on column public.questions.correct_answer is 'Teacher-provided or AI-determined correct answer';
