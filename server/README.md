# 백엔드 실행 구조

이 폴더는 웹사이트 빌더 전용 Fastify API의 런타임 코드만 포함합니다. PostgreSQL 스키마는 저장소 루트의 `db/migrations/`, 백엔드 검증 코드는 `tests/backend/`에서 관리합니다.

## 파일 구조

```text
server/
├─ index.js                  # 프로세스 진입점: 설정·DB·Auth 조립 후 서버 시작
├─ app.js                    # Fastify 인스턴스와 공통 플러그인 조립
├─ config.js                 # 환경변수 검증과 서버 설정 생성
├─ auth/
│  ├─ model.js              # Better Auth 테이블·세션·rate limit 계약
│  ├─ service.js            # Auth 전용 DB pool과 Better Auth 인스턴스 생성
│  └─ routes.js             # /api/auth/* 어댑터와 세션 검사
├─ db/
│  ├─ pool.js               # 업무 DB connection pool 생성
│  ├─ boundaries.js         # runtime/auth DB 역할과 RLS 안전 경계 확인
│  ├─ identity.js           # 인증 사용자와 내부 identity 연결
│  └─ with-actor.js         # 요청별 app_runtime·app.user_id 트랜잭션
├─ routes/
│  ├─ health.js             # live·ready 상태 확인
│  └─ platform.js           # 사용자·workspace·project API
└─ scripts/
   ├─ migrate.js            # db/migrations SQL 순차 적용과 checksum 검증
   └─ provision.js          # app_runtime·app_auth_runtime 로그인 암호 설정

db/migrations/              # 순서가 보장된 PostgreSQL 스키마 변경
tests/backend/              # 백엔드 단위·실제 PostgreSQL 통합 테스트
```

## 시작 순서

`server/index.js`는 다음 순서를 고정합니다.

1. `config.js`가 필수 환경변수를 검증합니다.
2. 업무 DB pool과 Auth 전용 DB pool을 각각 생성합니다.
3. `boundaries.js`가 두 연결의 실제 역할과 RLS 우회 가능성을 검사합니다.
4. `app.js`가 health, Auth, platform 라우트를 등록합니다.
5. 모든 검사가 통과한 경우에만 API 포트를 엽니다.

API 프로세스에는 `DATABASE_MIGRATION_URL`을 주입하지 않는 것이 운영 원칙입니다. 관리자 권한 URL은 migration과 role provisioning 작업에서만 사용합니다.

## 로컬 실행

Node.js 20.19 이상과 PostgreSQL이 필요합니다.

```powershell
Copy-Item server/.env.example server/.env.local
# server/.env.local의 DB URL과 32자 이상의 BETTER_AUTH_SECRET을 개발 환경에 맞게 수정
npm run db:setup
npm run api:dev
```

상태 확인:

```powershell
Invoke-RestMethod http://127.0.0.1:4320/api/health/live
Invoke-RestMethod http://127.0.0.1:4320/api/health/ready
```

- `npm run db:migrate`: SQL migration 적용
- `npm run db:provision`: 제한된 두 runtime 역할의 로그인 암호 설정
- `npm run db:setup`: 위 두 작업을 순서대로 실행
- `npm run api:dev`: `server/.env.local`을 사용해 watch 모드로 실행
- `npm run api:start`: 배포 환경의 `server/.env`를 사용해 실행

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
