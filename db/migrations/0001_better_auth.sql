-- Better Auth 1.6.25 core PostgreSQL schema.
-- Runtime options live in server/auth.js; changes must be regenerated and reviewed as SQL.
set local search_path = app_auth, public, pg_catalog;

create table app_auth.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  "emailVerified" boolean not null default false,
  image text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table app_auth.sessions (
  id uuid primary key default gen_random_uuid(),
  "expiresAt" timestamptz not null,
  token text not null unique,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  "ipAddress" text,
  "userAgent" text,
  "userId" uuid not null references app_auth.users(id) on delete cascade
);

create index sessions_user_id_idx on app_auth.sessions ("userId");

create table app_auth.accounts (
  id uuid primary key default gen_random_uuid(),
  "accountId" text not null,
  "providerId" text not null,
  "userId" uuid not null references app_auth.users(id) on delete cascade,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  scope text,
  password text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index accounts_user_id_idx on app_auth.accounts ("userId");
create unique index accounts_provider_account_uidx
  on app_auth.accounts ("providerId", "accountId");

create table app_auth.verifications (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  value text not null,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index verifications_identifier_idx on app_auth.verifications (identifier);

create table app_auth.rate_limits (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  count integer not null,
  "lastRequest" bigint not null
);

grant select, insert, update, delete on all tables in schema app_auth to app_auth_runtime;
alter default privileges in schema app_auth
  grant select, insert, update, delete on tables to app_auth_runtime;
