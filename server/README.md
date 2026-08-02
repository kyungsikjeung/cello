# 백엔드 실행 구조

이 폴더는 웹사이트 빌더 전용 Fastify API의 런타임 코드만 포함합니다. PostgreSQL 스키마는 저장소 루트의 `db/migrations/`, 백엔드 검증 코드는 `tests/backend/`에서 관리합니다.

## 브랜치 목적

`ks/custom-baas-foundation`은 Fastify·Better Auth·PostgreSQL 기반의 자체 백엔드 실행 기준선을 만드는 브랜치입니다. 인증 세션, 최소권한 DB 역할, workspace/project 생성과 교차 사용자 RLS까지가 범위이며 React CMS 연결, 미디어 저장소, 배포·도메인·결제는 후속 브랜치로 분리합니다.

이 브랜치는 다음 조건을 통과한 뒤 `main`에 병합합니다.

- 관리자 DB URL이 API runtime 설정에 포함되지 않을 것
- 외부 Host 헤더가 Auth 기준 URL을 바꾸지 못할 것
- 시작 실패·종료 신호에서 Fastify와 모든 DB pool이 정리될 것
- 백엔드 단위 테스트, 전체 회귀 테스트, 실제 PostgreSQL 격리 테스트와 빌드가 통과할 것

## 파일 구조

```text
server/
├─ .env.runtime.example       # API runtime 전용 환경변수 템플릿
├─ .env.admin.example         # migration·role provisioning 전용 템플릿
├─ index.js                  # 프로세스 진입점: 설정·DB·Auth 조립 후 서버 시작
├─ app.js                    # Fastify 인스턴스와 공통 플러그인 조립
├─ config.js                 # API·migration·provisioning 환경변수 계약 분리
├─ runtime.js                # 시작 실패 정리와 graceful shutdown 수명주기
├─ errors.js                 # 안정된 API 오류 코드와 500 로그 경계
├─ auth/
│  ├─ model.js              # Better Auth 테이블·세션·rate limit 계약
│  ├─ service.js            # Auth 전용 DB pool과 Better Auth 인스턴스 생성
│  └─ routes.js             # /api/auth/* 어댑터와 세션 검사
├─ db/
│  ├─ pool.js               # 업무 DB connection pool 생성
│  ├─ boundaries.js         # runtime/auth DB 역할과 RLS 안전 경계 확인
│  ├─ identity.js           # 인증 사용자와 내부 identity 연결
│  ├─ platform-repository.js # workspace/project SQL
│  └─ with-actor.js         # 요청별 app_runtime·app.user_id 트랜잭션
├─ routes/
│  ├─ health.js             # live·ready 상태 확인
│  └─ platform.js           # 사용자·workspace·project API
├─ services/
│  └─ platform.js           # workspace/project 사용 사례와 actor 경계
└─ scripts/
   ├─ migrate.js            # db/migrations SQL 순차 적용과 checksum 검증
   └─ provision.js          # app_runtime·app_auth_runtime 로그인 암호 설정

db/migrations/              # 순서가 보장된 PostgreSQL 스키마 변경
tests/backend/              # 백엔드 단위·실제 PostgreSQL 통합 테스트
```

## 시작 순서

`server/index.js`는 다음 순서를 고정합니다.

1. `config.js`가 API runtime에 필요한 환경변수만 검증합니다.
2. 업무 DB pool과 Auth 전용 DB pool을 각각 생성합니다.
3. `boundaries.js`가 두 연결의 실제 역할과 RLS 우회 가능성을 검사합니다.
4. `app.js`가 health, Auth, platform 라우트를 등록합니다.
5. 모든 검사가 통과한 경우에만 API 포트를 엽니다.
6. `SIGINT`·`SIGTERM` 또는 listen 실패 시 Fastify와 두 DB pool을 한 번만 닫습니다.

API 프로세스에는 `DATABASE_MIGRATION_URL`을 주입하지 않습니다. 로컬과 배포 모두 API runtime과 migration 작업의 환경파일·비밀 주입 경로를 분리합니다.

## 로컬 실행

Node.js 20.19 이상과 PostgreSQL이 필요합니다.

```powershell
Copy-Item server/.env.runtime.example server/.env.runtime.local
Copy-Item server/.env.admin.example server/.env.admin.local
# 두 파일의 DB URL과 runtime 파일의 32자 이상 BETTER_AUTH_SECRET을 개발 값으로 수정
npm run db:setup
npm run api:dev
```

상태 확인:

```powershell
Invoke-RestMethod http://127.0.0.1:4320/api/health/live
Invoke-RestMethod http://127.0.0.1:4320/api/health/ready
```

- `npm run db:migrate`: `server/.env.admin.local`로 SQL migration 적용
- `npm run db:provision`: 같은 admin 파일로 제한된 두 runtime 역할의 로그인 암호 설정
- `npm run db:setup`: 위 두 작업을 순서대로 실행
- `npm run api:dev`: `server/.env.runtime.local`을 사용해 watch 모드로 실행
- `npm run api:start`: 배포 환경의 `server/.env.runtime`을 사용해 실행

## 테스트

```powershell
npm run test:backend
```

실제 PostgreSQL 통합 테스트는 데이터를 생성·삭제하므로 이름이 `_test`로 끝나는 새 전용 DB에서만 실행됩니다.

```powershell
$env:ALLOW_DESTRUCTIVE_DB_TESTS='1'
$env:TEST_DATABASE_URL='postgresql://postgres:<password>@127.0.0.1:5432/site_builder_test'
npm run test:backend:integration
```

운영 DB URL로 통합 테스트를 실행하면 안 됩니다.

## 파일 배치 기준

- 인증 설정·세션 처리는 `auth/`에 둡니다.
- HTTP URL과 요청·응답 계약은 `routes/`에 둡니다.
- DB 연결과 요청별 권한 문맥은 `db/`에 둡니다.
- 관리자 권한으로 직접 실행하는 명령은 `scripts/`에 둡니다.
- 스키마 변경은 JavaScript에 넣지 않고 반드시 `db/migrations/`에 새 SQL 파일로 추가합니다.
- 기능이 커져 여러 라우트에서 같은 업무 규칙을 공유할 때만 `services/`를 추가합니다.
