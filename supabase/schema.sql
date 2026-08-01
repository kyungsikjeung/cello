create extension if not exists pgcrypto;

create type public.project_role as enum ('owner', 'editor', 'viewer');

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.project_role not null,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table public.site_documents (
  project_id uuid primary key references public.projects(id) on delete cascade,
  draft jsonb not null default '{}'::jsonb,
  published jsonb,
  draft_revision bigint not null default 0,
  published_revision bigint,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table public.site_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  revision bigint not null,
  document jsonb not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (project_id, revision)
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  original_key text not null unique,
  display_key text,
  original_name text not null,
  mime_type text not null,
  bytes bigint not null check (bytes > 0 and bytes <= 15728640),
  width integer,
  height integer,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.site_documents enable row level security;
alter table public.site_versions enable row level security;
alter table public.media_assets enable row level security;

create function public.has_project_role(target uuid, allowed public.project_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.project_members where project_id = target and user_id = auth.uid() and role = any(allowed));
$$;

create policy "members read projects" on public.projects for select using (public.has_project_role(id, array['owner','editor','viewer']::public.project_role[]));
create policy "members read membership" on public.project_members for select using (user_id = auth.uid() or public.has_project_role(project_id, array['owner']::public.project_role[]));
create policy "members read documents" on public.site_documents for select using (public.has_project_role(project_id, array['owner','editor','viewer']::public.project_role[]));
create policy "editors update drafts" on public.site_documents for update using (public.has_project_role(project_id, array['owner','editor']::public.project_role[])) with check (public.has_project_role(project_id, array['owner','editor']::public.project_role[]));
create policy "members read versions" on public.site_versions for select using (public.has_project_role(project_id, array['owner','editor','viewer']::public.project_role[]));
create policy "owners create versions" on public.site_versions for insert with check (public.has_project_role(project_id, array['owner']::public.project_role[]));
create policy "members read media" on public.media_assets for select using (public.has_project_role(project_id, array['owner','editor','viewer']::public.project_role[]));
create policy "editors create media" on public.media_assets for insert with check (public.has_project_role(project_id, array['owner','editor']::public.project_role[]));
create policy "editors update media" on public.media_assets for update using (public.has_project_role(project_id, array['owner','editor']::public.project_role[]));
