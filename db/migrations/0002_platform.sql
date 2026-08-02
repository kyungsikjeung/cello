create type public.project_role as enum ('owner', 'editor', 'reviewer');

create table public.identity_users (
  id uuid primary key default gen_random_uuid(),
  auth_subject text not null unique,
  email text not null,
  display_name text not null,
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id),
  user_id uuid not null references public.identity_users(id),
  role public.project_role not null,
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 100),
  current_release_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.project_members (
  project_id uuid not null references public.projects(id),
  user_id uuid not null references public.identity_users(id),
  role public.project_role not null,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table public.site_documents (
  project_id uuid primary key references public.projects(id),
  draft jsonb not null default '{}'::jsonb,
  draft_revision bigint not null default 0 check (draft_revision >= 0),
  updated_by uuid references public.identity_users(id),
  updated_at timestamptz not null default now()
);

create table public.site_releases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id),
  revision bigint not null check (revision > 0),
  document jsonb not null,
  published_by uuid not null references public.identity_users(id),
  published_at timestamptz not null default now(),
  unique (project_id, revision),
  unique (id, project_id)
);

alter table public.projects
  add constraint projects_current_release_fk
  foreign key (current_release_id, id)
  references public.site_releases(id, project_id);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id),
  original_key text not null unique,
  display_key text,
  original_name text not null,
  mime_type text not null,
  bytes bigint not null check (bytes > 0 and bytes <= 15728640),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  desktop_focus_x smallint not null default 50 check (desktop_focus_x between 10 and 90),
  desktop_focus_y smallint not null default 50 check (desktop_focus_y between 10 and 90),
  mobile_focus_x smallint not null default 50 check (mobile_focus_x between 10 and 90),
  mobile_focus_y smallint not null default 50 check (mobile_focus_y between 10 and 90),
  created_by uuid not null references public.identity_users(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index workspace_members_user_idx on public.workspace_members (user_id);
create index projects_workspace_idx on public.projects (workspace_id) where deleted_at is null;
create index project_members_user_idx on public.project_members (user_id);
create index site_releases_project_idx on public.site_releases (project_id, revision desc);
create index media_assets_project_idx on public.media_assets (project_id) where deleted_at is null;

create function app_private.current_actor_id()
returns uuid
language sql
stable
set search_path = pg_catalog
as $$
  select nullif(current_setting('app.user_id', true), '')::uuid
$$;

create function app_private.resolve_identity(subject text, user_email text, user_name text)
returns table (id uuid)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if subject is null or subject = '' then
    raise exception 'invalid_auth_subject' using errcode = '22023';
  end if;

  return query
    insert into public.identity_users (auth_subject, email, display_name)
    values (subject, user_email, user_name)
    on conflict (auth_subject) do update
      set email = excluded.email,
          display_name = excluded.display_name,
          updated_at = now()
      where identity_users.status = 'active'
        and identity_users.deleted_at is null
    returning identity_users.id;

  if not found then
    raise exception 'identity_not_active' using errcode = '42501';
  end if;
end;
$$;

create function app_private.has_workspace_role(target uuid, allowed public.project_role[])
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, app_private
as $$
  select exists (
    select 1
      from public.workspace_members
      join public.identity_users on identity_users.id = workspace_members.user_id
      join public.workspaces on workspaces.id = workspace_members.workspace_id
     where workspace_id = target
       and user_id = app_private.current_actor_id()
       and role = any(allowed)
       and identity_users.status = 'active'
       and identity_users.deleted_at is null
       and workspaces.deleted_at is null
  )
$$;

create function app_private.has_project_role(target uuid, allowed public.project_role[])
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, app_private
as $$
  select exists (
    select 1
      from public.project_members
      join public.identity_users on identity_users.id = project_members.user_id
      join public.projects on projects.id = project_members.project_id
      join public.workspaces on workspaces.id = projects.workspace_id
     where project_id = target
       and user_id = app_private.current_actor_id()
       and role = any(allowed)
       and identity_users.status = 'active'
       and identity_users.deleted_at is null
       and projects.deleted_at is null
       and workspaces.deleted_at is null
  )
$$;

create function app_private.touch_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger identity_users_touch before update on public.identity_users
  for each row execute function app_private.touch_updated_at();
create trigger workspaces_touch before update on public.workspaces
  for each row execute function app_private.touch_updated_at();
create trigger projects_touch before update on public.projects
  for each row execute function app_private.touch_updated_at();

create function app_private.create_site_document()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.site_documents (project_id) values (new.id);
  return new;
end;
$$;

create trigger projects_create_document after insert on public.projects
  for each row execute function app_private.create_site_document();

create function app_private.block_release_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'site_releases is immutable; use rollback_site() to move the pointer';
end;
$$;

create trigger site_releases_immutable
  before update or delete on public.site_releases
  for each row execute function app_private.block_release_mutation();

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.site_documents enable row level security;
alter table public.site_releases enable row level security;
alter table public.media_assets enable row level security;

alter table public.workspaces force row level security;
alter table public.workspace_members force row level security;
alter table public.projects force row level security;
alter table public.project_members force row level security;
alter table public.site_documents force row level security;
alter table public.site_releases force row level security;
alter table public.media_assets force row level security;

create policy workspace_members_read_workspace on public.workspaces for select
  using (app_private.has_workspace_role(id, array['owner','editor','reviewer']::public.project_role[]));
create policy members_read_workspace_membership on public.workspace_members for select
  using (
    (
      user_id = app_private.current_actor_id()
      and app_private.has_workspace_role(
        workspace_id,
        array['owner','editor','reviewer']::public.project_role[]
      )
    )
    or app_private.has_workspace_role(workspace_id, array['owner']::public.project_role[])
  );
create policy project_members_read_project on public.projects for select
  using (
    deleted_at is null
    and app_private.has_project_role(id, array['owner','editor','reviewer']::public.project_role[])
  );
create policy members_read_project_membership on public.project_members for select
  using (
    (
      user_id = app_private.current_actor_id()
      and app_private.has_project_role(
        project_id,
        array['owner','editor','reviewer']::public.project_role[]
      )
    )
    or app_private.has_project_role(project_id, array['owner']::public.project_role[])
  );
create policy members_read_documents on public.site_documents for select
  using (app_private.has_project_role(project_id, array['owner','editor','reviewer']::public.project_role[]));
create policy members_read_releases on public.site_releases for select
  using (app_private.has_project_role(project_id, array['owner','editor','reviewer']::public.project_role[]));
create policy members_read_media on public.media_assets for select
  using (app_private.has_project_role(project_id, array['owner','editor','reviewer']::public.project_role[]));

create function public.bootstrap_workspace(workspace_name text, project_slug text, project_name text)
returns table (workspace_id uuid, project_id uuid)
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
declare
  actor uuid := app_private.current_actor_id();
  created_workspace uuid;
  created_project uuid;
begin
  if actor is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.identity_users
     where id = actor and status = 'active' and deleted_at is null
  ) then
    raise exception 'identity_not_active' using errcode = '42501';
  end if;

  insert into public.workspaces (name)
  values (workspace_name)
  returning id into created_workspace;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (created_workspace, actor, 'owner');

  insert into public.projects (workspace_id, slug, name)
  values (created_workspace, project_slug, project_name)
  returning id into created_project;

  insert into public.project_members (project_id, user_id, role)
  values (created_project, actor, 'owner');

  return query select created_workspace, created_project;
end;
$$;

create function public.create_project(target_workspace uuid, project_slug text, project_name text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
declare
  actor uuid := app_private.current_actor_id();
  created_project uuid;
begin
  if not app_private.has_workspace_role(target_workspace, array['owner']::public.project_role[]) then
    raise exception 'permission_denied' using errcode = '42501';
  end if;

  insert into public.projects (workspace_id, slug, name)
  values (target_workspace, project_slug, project_name)
  returning id into created_project;

  insert into public.project_members (project_id, user_id, role)
  values (created_project, actor, 'owner');

  return created_project;
end;
$$;

create function public.save_draft(target uuid, document jsonb, expected_revision bigint)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
declare
  next_revision bigint;
begin
  if not app_private.has_project_role(target, array['owner','editor']::public.project_role[]) then
    raise exception 'permission_denied' using errcode = '42501';
  end if;

  update public.site_documents
     set draft = document,
         draft_revision = draft_revision + 1,
         updated_by = app_private.current_actor_id()
   where project_id = target and draft_revision = expected_revision
   returning draft_revision into next_revision;

  if next_revision is null then
    raise exception 'draft_revision_conflict' using errcode = '40001';
  end if;

  return next_revision;
end;
$$;

create function public.publish_site(target uuid, expected_draft_revision bigint)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
declare
  doc public.site_documents%rowtype;
  release_id uuid;
begin
  if not app_private.has_project_role(target, array['owner']::public.project_role[]) then
    raise exception 'permission_denied' using errcode = '42501';
  end if;

  select * into doc
    from public.site_documents
   where project_id = target
   for update;

  if doc.project_id is null or doc.draft = '{}'::jsonb then
    raise exception 'empty_draft';
  end if;

  if doc.draft_revision <> expected_draft_revision then
    raise exception 'draft_revision_conflict' using errcode = '40001';
  end if;

  insert into public.site_releases (project_id, revision, document, published_by)
  values (
    target,
    coalesce((select max(revision) from public.site_releases where project_id = target), 0) + 1,
    doc.draft,
    app_private.current_actor_id()
  )
  returning id into release_id;

  update public.projects set current_release_id = release_id where id = target;
  return release_id;
end;
$$;

create function public.rollback_site(target uuid, target_release uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
begin
  if not app_private.has_project_role(target, array['owner']::public.project_role[]) then
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

create function public.get_published_site(project_slug text)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'projectId', project.id,
    'slug', project.slug,
    'name', project.name,
    'releaseId', release.id,
    'revision', release.revision,
    'publishedAt', release.published_at,
    'document', release.document
  )
    from public.projects as project
    join public.site_releases as release on release.id = project.current_release_id
   where project.slug = project_slug
     and project.deleted_at is null
$$;

grant select on public.workspaces, public.workspace_members, public.projects,
  public.project_members, public.site_documents, public.site_releases, public.media_assets
  to app_runtime;

grant select, insert, update on public.identity_users to app_functions;
grant select, insert, update on public.workspaces, public.workspace_members, public.projects,
  public.project_members, public.site_documents, public.site_releases, public.media_assets
  to app_functions;

revoke all on function app_private.current_actor_id() from public;
revoke all on function app_private.resolve_identity(text, text, text) from public;
revoke all on function app_private.has_workspace_role(uuid, public.project_role[]) from public;
revoke all on function app_private.has_project_role(uuid, public.project_role[]) from public;
revoke all on function public.bootstrap_workspace(text, text, text) from public;
revoke all on function public.create_project(uuid, text, text) from public;
revoke all on function public.save_draft(uuid, jsonb, bigint) from public;
revoke all on function public.publish_site(uuid, bigint) from public;
revoke all on function public.rollback_site(uuid, uuid) from public;
revoke all on function public.get_published_site(text) from public;

alter function app_private.resolve_identity(text, text, text) owner to app_functions;
alter function app_private.has_workspace_role(uuid, public.project_role[]) owner to app_functions;
alter function app_private.has_project_role(uuid, public.project_role[]) owner to app_functions;
alter function app_private.create_site_document() owner to app_functions;
alter function public.bootstrap_workspace(text, text, text) owner to app_functions;
alter function public.create_project(uuid, text, text) owner to app_functions;
alter function public.save_draft(uuid, jsonb, bigint) owner to app_functions;
alter function public.publish_site(uuid, bigint) owner to app_functions;
alter function public.rollback_site(uuid, uuid) owner to app_functions;
alter function public.get_published_site(text) owner to app_functions;

grant execute on function app_private.resolve_identity(text, text, text) to app_runtime;
grant execute on function app_private.current_actor_id() to app_runtime, app_functions;
grant execute on function app_private.has_workspace_role(uuid, public.project_role[]) to app_runtime, app_functions;
grant execute on function app_private.has_project_role(uuid, public.project_role[]) to app_runtime, app_functions;
grant execute on function public.bootstrap_workspace(text, text, text) to app_runtime;
grant execute on function public.create_project(uuid, text, text) to app_runtime;
grant execute on function public.save_draft(uuid, jsonb, bigint) to app_runtime;
grant execute on function public.publish_site(uuid, bigint) to app_runtime;
grant execute on function public.rollback_site(uuid, uuid) to app_runtime;
grant execute on function public.get_published_site(text) to app_public, app_runtime;
