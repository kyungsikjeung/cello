-- 초기 스키마: 프로젝트·멤버십·초안 문서·불변 Release·미디어 메타.
-- 원칙(AGENTS.md): 공개본은 불변 Release, 소유자 전용 공개·롤백, 서버(RLS+RPC)가 권한을 다시 검증.
-- 초안 supabase/schema.sql 이 스스로 표시한 공백 중 DB 범위(안전한 publish 경계,
-- 불변 Release + current_release_id, 초안 저장 충돌 처리)를 이 마이그레이션이 해소한다.
-- 워크스페이스, Storage 버킷/객체 RLS, 미디어 파생본·용량 집계는 후속 마이그레이션 범위.

create extension if not exists pgcrypto;

create type public.project_role as enum ('owner', 'editor', 'reviewer');

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  current_release_id uuid,
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

-- 초안은 프로젝트당 1행. 공개본은 여기 두지 않고 site_releases 로만 관리한다.
create table public.site_documents (
  project_id uuid primary key references public.projects(id) on delete cascade,
  draft jsonb not null default '{}'::jsonb,
  draft_revision bigint not null default 0,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

-- 공개본 스냅샷. INSERT 이후 UPDATE/DELETE 금지(불변) — 롤백은 포인터 이동으로만.
create table public.site_releases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  revision bigint not null,
  document jsonb not null,
  published_by uuid not null references auth.users(id),
  published_at timestamptz not null default now(),
  unique (project_id, revision)
);

alter table public.projects
  add constraint projects_current_release_fk
  foreign key (current_release_id) references public.site_releases(id);

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

create index site_releases_project_idx on public.site_releases (project_id, revision desc);
create index media_assets_project_idx on public.media_assets (project_id) where deleted_at is null;

create function public.has_project_role(target uuid, allowed public.project_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.project_members
    where project_id = target and user_id = auth.uid() and role = any(allowed)
  );
$$;

create function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();

create function public.create_site_document()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.site_documents (project_id) values (new.id);
  return new;
end;
$$;

create trigger projects_create_document after insert on public.projects
  for each row execute function public.create_site_document();

create function public.block_release_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'site_releases is immutable; use rollback_site() to move the pointer';
end;
$$;

create trigger site_releases_immutable
  before update or delete on public.site_releases
  for each row execute function public.block_release_mutation();

alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.site_documents enable row level security;
alter table public.site_releases enable row level security;
alter table public.media_assets enable row level security;

create policy "members read projects" on public.projects for select
  using (public.has_project_role(id, array['owner','editor','reviewer']::public.project_role[]));
create policy "members read membership" on public.project_members for select
  using (user_id = auth.uid() or public.has_project_role(project_id, array['owner']::public.project_role[]));
create policy "members read documents" on public.site_documents for select
  using (public.has_project_role(project_id, array['owner','editor','reviewer']::public.project_role[]));
create policy "members read releases" on public.site_releases for select
  using (public.has_project_role(project_id, array['owner','editor','reviewer']::public.project_role[]));
create policy "members read media" on public.media_assets for select
  using (public.has_project_role(project_id, array['owner','editor','reviewer']::public.project_role[]));
create policy "editors create media" on public.media_assets for insert
  with check (public.has_project_role(project_id, array['owner','editor']::public.project_role[]));
create policy "editors update media" on public.media_assets for update
  using (public.has_project_role(project_id, array['owner','editor']::public.project_role[]));
-- site_documents / site_releases 에는 의도적으로 직접 쓰기 정책이 없다.
-- 초안 저장·공개·롤백은 아래 RPC 만이 유일한 쓰기 경로다(초안의 "안전하지 않은 UPDATE 정책" 문제 해소).

create function public.save_draft(target uuid, document jsonb, expected_revision bigint)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  next_revision bigint;
begin
  if not public.has_project_role(target, array['owner','editor']::public.project_role[]) then
    raise exception 'permission_denied' using errcode = '42501';
  end if;
  update public.site_documents
     set draft = document,
         draft_revision = draft_revision + 1,
         updated_by = auth.uid()
   where project_id = target and draft_revision = expected_revision
   returning draft_revision into next_revision;
  if next_revision is null then
    raise exception 'draft_revision_conflict' using errcode = '40001';
  end if;
  return next_revision;
end;
$$;

create function public.publish_site(target uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  doc public.site_documents%rowtype;
  release_id uuid;
begin
  if not public.has_project_role(target, array['owner']::public.project_role[]) then
    raise exception 'permission_denied' using errcode = '42501';
  end if;
  select * into doc from public.site_documents where project_id = target for update;
  if doc.project_id is null or doc.draft = '{}'::jsonb then
    raise exception 'empty_draft';
  end if;
  insert into public.site_releases (project_id, revision, document, published_by)
  values (
    target,
    coalesce((select max(revision) from public.site_releases where project_id = target), 0) + 1,
    doc.draft,
    auth.uid()
  )
  returning id into release_id;
  update public.projects set current_release_id = release_id where id = target;
  return release_id;
end;
$$;

create function public.rollback_site(target uuid, target_release uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_project_role(target, array['owner']::public.project_role[]) then
    raise exception 'permission_denied' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.site_releases where id = target_release and project_id = target
  ) then
    raise exception 'release_not_found';
  end if;
  update public.projects set current_release_id = target_release where id = target;
end;
$$;

revoke execute on function public.save_draft(uuid, jsonb, bigint) from public, anon;
revoke execute on function public.publish_site(uuid) from public, anon;
revoke execute on function public.rollback_site(uuid, uuid) from public, anon;
grant execute on function public.save_draft(uuid, jsonb, bigint) to authenticated;
grant execute on function public.publish_site(uuid) to authenticated;
grant execute on function public.rollback_site(uuid, uuid) to authenticated;

-- 테이블 권한: 행 수준 접근은 RLS가 결정하고, 여기서는 문 수준 권한만 연다.
-- site_documents / site_releases 는 SELECT 만 — 쓰기는 RPC(security definer) 경유가 유일하다.
grant usage on schema public to anon, authenticated;
grant select on public.projects, public.project_members, public.site_documents,
  public.site_releases, public.media_assets to authenticated;
grant insert, update on public.media_assets to authenticated;
