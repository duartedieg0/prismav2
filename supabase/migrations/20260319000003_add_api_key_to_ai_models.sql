-- Migration: Add API key column to ai_models table
-- Stores the API key for LLM providers (e.g., Anthropic Claude API key)
-- Used by Edge Functions to authenticate with LLM APIs

alter table public.ai_models
  add column if not exists api_key text;

comment on column public.ai_models.api_key is 'API key for LLM provider authentication (e.g., Anthropic API key). Should not be exposed to client-side code.';
