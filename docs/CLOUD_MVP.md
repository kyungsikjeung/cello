# Cloud CMS MVP 계약

현재 실행 모드는 `VITE_STORAGE_MODE=local`이다. 로그인과 권한 UI는 흐름 검증용이며 운영 보안으로 사용하면 안 된다.

## 서버 단계에서 지켜야 하는 요구사항

- 시스템은 Supabase Auth 세션의 `auth.uid()`를 기준으로 프로젝트 접근을 판정해야 한다.
- 시스템은 클라이언트가 전달한 역할과 프로젝트 ID를 신뢰하지 않아야 한다.
- 시스템은 `project_members`와 RLS를 통해 다른 고객 프로젝트의 문서와 미디어를 차단해야 한다.
- 편집자는 초안을 저장할 수 있지만 공개본과 버전을 생성할 수 없어야 한다.
- 소유자만 공개 작업을 수행할 수 있어야 한다.
- 검토자는 초안, 공개본, 버전과 미디어를 읽을 수만 있어야 한다.
- 시스템은 초안 저장 시 `draft_revision`을 비교해 뒤늦은 저장이 최신 작업을 덮어쓰지 않도록 해야 한다.
- R2 비밀키는 Worker 또는 서버 환경에만 존재해야 하며 Vite 환경변수로 노출하면 안 된다.
- 업로드 API는 프로젝트별 250MB, 파일별 15MB, 100개 제한을 서버에서 다시 검증해야 한다.
- 원본 R2 객체 키는 `{projectId}/original/{assetId}` 형식을 사용해야 한다.
- 표시용 객체는 `{projectId}/derived/{assetId}/{variant}` 형식을 사용해야 한다.
- 삭제는 즉시 R2 객체를 제거하지 않고 `deleted_at`을 기록한 뒤 복구 기간이 지난 후 정리해야 한다.

## 다음 연결 작업

1. Supabase 프로젝트 생성 후 `.env.example`의 공개 연결값을 채운다.
2. `supabase/schema.sql`을 적용하고 세 역할의 RLS 테스트를 수행한다.
3. 현재 `auth.js`를 Supabase Auth 어댑터로 교체한다.
4. 콘텐츠 저장을 `localStorage`에서 `site_documents`의 revision 기반 저장으로 교체한다.
5. 서버가 발급한 제한시간 업로드 URL을 통해 R2에 원본을 저장한다.
6. 업로드 성공을 서버가 확인한 뒤에만 `media_assets` 레코드를 생성한다.
7. IndexedDB 데이터 가져오기 도구를 한 번 제공하고 전환 완료 후 로컬 저장을 읽기 전용 백업으로 남긴다.
