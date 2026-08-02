begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(47);

insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'owner-a@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'editor-a@test.local'),
  ('33333333-3333-3333-3333-333333333333', 'reviewer-a@test.local'),
  ('44444444-4444-4444-4444-444444444444', 'owner-b@test.local');

insert into public.projects (id, slug, name)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'project-a', 'Project A'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'project-b', 'Project B');

insert into public.project_members (project_id, user_id, role)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'owner'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'editor'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'reviewer'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444', 'owner');

create temporary table test_release_ids (
  name text primary key,
  id uuid not null
) on commit drop;
grant select on test_release_ids to authenticated;

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select is(
  (select count(*) from public.projects),
  1::bigint,
  'owner sees only their project'
);
select is(
  (select count(*) from public.project_members),
  3::bigint,
  'owner sees every membership in their project'
);

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

select is(
  (select count(*) from public.projects),
  1::bigint,
  'editor sees only their project'
);
select is(
  (select count(*) from public.project_members),
  1::bigint,
  'editor sees only their own membership'
);
select is(
  public.save_draft(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '{"title":"v1"}'::jsonb,
    0
  ),
  1::bigint,
  'editor can save a draft with the expected revision'
);
select throws_ok(
  $$select public.save_draft(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '{"title":"stale"}'::jsonb,
    0
  )$$,
  '40001',
  'draft_revision_conflict',
  'stale draft updates are rejected'
);
select is(
  (select draft_revision from public.site_documents where project_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  1::bigint,
  'a rejected stale save does not advance the revision'
);
select ok(
  (select draft = '{"title":"v1"}'::jsonb from public.site_documents where project_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'a rejected stale save preserves the draft'
);
select throws_ok(
  $$select public.publish_site('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$,
  '42501',
  'permission_denied',
  'editor cannot publish'
);

set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

select is(
  (select count(*) from public.projects),
  1::bigint,
  'reviewer can read their project'
);
select throws_ok(
  $$select public.save_draft(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '{"title":"reviewer"}'::jsonb,
    1
  )$$,
  '42501',
  'permission_denied',
  'reviewer cannot save a draft'
);
select throws_ok(
  $$select public.publish_site('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$,
  '42501',
  'permission_denied',
  'reviewer cannot publish'
);

set local request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';

select is(
  (select count(*) from public.projects),
  1::bigint,
  'another owner sees only project B'
);
select throws_ok(
  $$select public.save_draft(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '{"title":"cross-project"}'::jsonb,
    1
  )$$,
  '42501',
  'permission_denied',
  'another project owner cannot save project A'
);

set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select lives_ok(
  $$select public.publish_site('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$,
  'owner can publish the first release'
);
select is(
  (select count(*) from public.site_releases),
  1::bigint,
  'first publish creates one release'
);
select is(
  (select revision from public.site_releases where project_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  1::bigint,
  'first release has release revision one'
);
select ok(
  (select document = '{"title":"v1"}'::jsonb from public.site_releases where project_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'first release stores an immutable v1 snapshot'
);
select ok(
  (select p.current_release_id = r.id
     from public.projects p
     join public.site_releases r on r.project_id = p.id and r.revision = 1
    where p.id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'first publish points the project at release one'
);
select is(
  public.save_draft(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '{}'::jsonb,
    1
  ),
  2::bigint,
  'owner can advance the draft to an empty revision'
);
select throws_ok(
  $$select public.publish_site('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$,
  'P0001',
  'empty_draft',
  'an empty draft cannot be published'
);
select is(
  (select count(*) from public.site_releases),
  1::bigint,
  'failed publish does not create a release'
);
select ok(
  (select p.current_release_id = r.id
     from public.projects p
     join public.site_releases r on r.project_id = p.id and r.revision = 1
    where p.id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'failed publish preserves the current release pointer'
);
select is(
  public.save_draft(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '{"title":"v2"}'::jsonb,
    2
  ),
  3::bigint,
  'owner can save v2 after the failed publish'
);
select lives_ok(
  $$select public.publish_site('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$,
  'owner can publish the second release'
);
select is(
  (select count(*) from public.site_releases),
  2::bigint,
  'second publish preserves both releases'
);
select ok(
  (select p.current_release_id = r.id
     from public.projects p
     join public.site_releases r on r.project_id = p.id and r.revision = 2
    where p.id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'second publish points the project at release two'
);
select lives_ok(
  $$select public.rollback_site(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    (select id from public.site_releases
      where project_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and revision = 1)
  )$$,
  'owner can roll back to release one'
);
select ok(
  (select p.current_release_id = r.id
     from public.projects p
     join public.site_releases r on r.project_id = p.id and r.revision = 1
    where p.id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'rollback moves only the current release pointer'
);
select is(
  (select count(*) from public.site_releases),
  2::bigint,
  'rollback keeps every release row'
);

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

select throws_ok(
  $$select public.rollback_site(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    (select id from public.site_releases
      where project_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and revision = 1)
  )$$,
  '42501',
  'permission_denied',
  'editor cannot roll back a release'
);

set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

select throws_ok(
  $$select public.rollback_site(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    (select id from public.site_releases
      where project_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and revision = 1)
  )$$,
  '42501',
  'permission_denied',
  'reviewer cannot roll back a release'
);

set local request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';

select is(
  public.save_draft(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '{"title":"project-b"}'::jsonb,
    0
  ),
  1::bigint,
  'project B owner can save their own draft'
);
select lives_ok(
  $$select public.publish_site('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')$$,
  'project B owner can publish their own release'
);

reset role;
insert into test_release_ids (name, id)
select 'project-b', id
  from public.site_releases
 where project_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select is(
  (select count(*) from public.site_documents),
  1::bigint,
  'owner cannot read another project document'
);
select is(
  (select count(*) from public.site_releases),
  2::bigint,
  'owner cannot read another project releases'
);

select throws_ok(
  $$select public.rollback_site(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    (select id from test_release_ids where name = 'project-b')
  )$$,
  'P0001',
  'release_not_found',
  'owner cannot roll back to another project release'
);
select throws_ok(
  $$update public.site_documents
       set draft = '{"direct":true}'::jsonb
     where project_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  '42501',
  'permission denied for table site_documents',
  'authenticated owner cannot update a draft directly'
);
select throws_ok(
  $$insert into public.site_releases
      (project_id, revision, document, published_by)
    values
      ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 99, '{}'::jsonb,
       '11111111-1111-1111-1111-111111111111')$$,
  '42501',
  'permission denied for table site_releases',
  'authenticated owner cannot insert a release directly'
);
select throws_ok(
  $$update public.projects
       set current_release_id = null
     where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  '42501',
  'permission denied for table projects',
  'authenticated owner cannot move the release pointer directly'
);

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

select lives_ok(
  $$insert into public.media_assets
      (id, project_id, original_key, original_name, mime_type, bytes, created_by)
    values
      ('aaaaaaaa-0000-0000-0000-000000000001',
       'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
       'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/original/asset-1/cello.jpg',
       'cello.jpg', 'image/jpeg', 1024,
       '22222222-2222-2222-2222-222222222222')$$,
  'editor can register media in their project'
);
select throws_ok(
  $$insert into public.media_assets
      (id, project_id, original_key, original_name, mime_type, bytes, created_by)
    values
      ('bbbbbbbb-0000-0000-0000-000000000001',
       'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
       'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/original/asset-1/cross.jpg',
       'cross.jpg', 'image/jpeg', 1024,
       '22222222-2222-2222-2222-222222222222')$$,
  '42501',
  'new row violates row-level security policy for table "media_assets"',
  'editor cannot register media in another project'
);

set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

select is(
  (select count(*) from public.media_assets),
  1::bigint,
  'reviewer sees media from their project'
);

set local request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';

select is(
  (select count(*) from public.media_assets),
  0::bigint,
  'another project owner cannot see project A media'
);

reset role;

select throws_ok(
  $$update public.site_releases
       set document = '{"mutated":true}'::jsonb
     where project_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  'P0001',
  'site_releases is immutable; use rollback_site() to move the pointer',
  'even a privileged update cannot mutate a release'
);
select throws_ok(
  $$delete from public.site_releases
     where project_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  'P0001',
  'site_releases is immutable; use rollback_site() to move the pointer',
  'even a privileged delete cannot remove a release'
);
select ok(
  (select bool_and(
     (revision = 1 and document = '{"title":"v1"}'::jsonb)
     or (revision = 2 and document = '{"title":"v2"}'::jsonb)
   )
   from public.site_releases
   where project_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'release documents remain unchanged after publish and rollback'
);

select * from finish();
rollback;
