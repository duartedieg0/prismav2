-- Migration: Add feedback columns for adaptation feedback feature
-- Adds adaptation_id FK and rating constraint to feedbacks table
-- This enables the feedback collection workflow in task 3

alter table public.feedbacks
  add column if not exists adaptation_id uuid references public.adaptations(id) on delete cascade,
  add constraint feedbacks_rating_check check (rating is null or (rating >= 0 and rating <= 5));

-- Add index for faster queries by adaptation
create index if not exists idx_feedbacks_adaptation_id on public.feedbacks(adaptation_id);
