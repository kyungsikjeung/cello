create extension if not exists pgcrypto;

create schema if not exists app_auth;
create schema if not exists app_private;

revoke create on schema public from public;
revoke all on schema app_auth from public;
revoke all on schema app_private from public;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_runtime') then
    create role app_runtime nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
  end if;

  if not exists (select 1 from pg_roles where rolname = 'app_public') then
    create role app_public nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
  end if;

  if not exists (select 1 from pg_roles where rolname = 'app_functions') then
    create role app_functions nologin nosuperuser nocreatedb nocreaterole noinherit bypassrls;
  end if;

  if not exists (select 1 from pg_roles where rolname = 'app_auth_runtime') then
    create role app_auth_runtime nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
  end if;

  if exists (
    select 1 from pg_roles
     where rolname = 'app_runtime'
       and (rolsuper or rolcreatedb or rolcreaterole or rolinherit or rolbypassrls or rolreplication)
  ) then
    raise exception 'unsafe_existing_role: app_runtime';
  end if;

  if exists (
    select 1 from pg_roles
     where rolname = 'app_auth_runtime'
       and (rolsuper or rolcreatedb or rolcreaterole or rolinherit or rolbypassrls or rolreplication)
  ) then
    raise exception 'unsafe_existing_role: app_auth_runtime';
  end if;

  if exists (
    select 1 from pg_roles
     where rolname = 'app_public'
       and (rolcanlogin or rolsuper or rolcreatedb or rolcreaterole or rolinherit or rolbypassrls or rolreplication)
  ) then
    raise exception 'unsafe_existing_role: app_public';
  end if;

  if exists (
    select 1 from pg_roles
     where rolname = 'app_functions'
       and (rolcanlogin or rolsuper or rolcreatedb or rolcreaterole or rolinherit or not rolbypassrls or rolreplication)
  ) then
    raise exception 'unsafe_existing_role: app_functions';
  end if;

  if exists (
    select 1
      from pg_auth_members
      join pg_roles as member_role on member_role.oid = pg_auth_members.member
     where member_role.rolname in ('app_runtime', 'app_auth_runtime', 'app_public')
  ) then
    raise exception 'unsafe_role_membership';
  end if;
end
$$;

grant usage on schema public, app_private to app_runtime;
grant usage on schema public to app_public;
grant usage on schema public, app_private to app_functions;
grant usage on schema app_auth to app_auth_runtime;
