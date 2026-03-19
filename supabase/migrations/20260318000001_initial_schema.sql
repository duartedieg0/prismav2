-- Create extension for UUID
create extension if not exists "uuid-ossp";

-- Profiles table
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  full_name text,
  role text default 'user' check (role in ('user', 'admin', 'teacher')),
  blocked boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- AI Models table
create table if not exists public.ai_models (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  is_default boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Partial unique index for default model
create unique index if not exists ai_models_is_default_unique on public.ai_models(is_default) where is_default = true;

-- Agents table
create table if not exists public.agents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  model_id uuid references public.ai_models(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Subjects table
create table if not exists public.subjects (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Grade levels table
create table if not exists public.grade_levels (
  id uuid primary key default uuid_generate_v4(),
  level integer not null unique,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Exams table
create table if not exists public.exams (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  subject_id uuid references public.subjects(id) on delete restrict not null,
  grade_level_id uuid references public.grade_levels(id) on delete restrict not null,
  title text not null,
  file_path text,
  status text default 'draft' check (status in ('draft', 'processing', 'completed', 'error')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Questions table
create table if not exists public.questions (
  id uuid primary key default uuid_generate_v4(),
  exam_id uuid references public.exams(id) on delete cascade not null,
  text text not null,
  order_number integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Supports table
create table if not exists public.supports (
  id uuid primary key default uuid_generate_v4(),
  question_id uuid references public.questions(id) on delete cascade not null,
  model_id uuid references public.ai_models(id) on delete set null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Adaptations table
create table if not exists public.adaptations (
  id uuid primary key default uuid_generate_v4(),
  question_id uuid references public.questions(id) on delete cascade not null,
  adapted_alternatives jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Feedbacks table
create table if not exists public.feedbacks (
  id uuid primary key default uuid_generate_v4(),
  question_id uuid references public.questions(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  rating integer,
  comment text,
  dismissed_from_evolution boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Agent evolutions table
create table if not exists public.agent_evolutions (
  id uuid primary key default uuid_generate_v4(),
  agent_id uuid references public.agents(id) on delete cascade not null,
  feedback_id uuid references public.feedbacks(id) on delete set null,
  performance_score numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.agents enable row level security;
alter table public.exams enable row level security;
alter table public.questions enable row level security;
alter table public.supports enable row level security;
alter table public.adaptations enable row level security;
alter table public.feedbacks enable row level security;
alter table public.agent_evolutions enable row level security;

-- RLS Policies for profiles
create policy "Users can view their own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Admins can view all profiles" on public.profiles
  for select using ((select role from public.profiles where id = auth.uid()) = 'admin');

-- RLS Policies for exams
create policy "Users can view their own exams" on public.exams
  for select using (auth.uid() = user_id);

create policy "Users can create exams" on public.exams
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own exams" on public.exams
  for update using (auth.uid() = user_id);

-- Trigger for new user profiles
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
