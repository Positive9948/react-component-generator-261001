# AGENTS.md

## 실행 명령어

- 패키지 매니저 / 런타임: `bun`만 사용한다. 락파일은 `bun.lock`이며 npm, yarn, pnpm은 사용하지 않는다.
- 설치: `bun install`
- 개발 서버 (API 서버 :3002 + Vite :5173 동시 실행): `bun run dev`
- API 서버만 실행 (watch 모드): `bun run server`
- 테스트 (Vitest, 1회 실행): `bun run test`
- 테스트 watch: `bun run test:watch`
- 단일 테스트 파일: `bunx vitest run server/generator.test.ts`
- 린트: `bun run lint`
- 빌드 (타입체크 + 번들): `bun run build`
- 변경 완료 전 검증: `bun run test && bun run lint && bun run build`

주의: `bun test`는 Vitest가 아니라 Bun 내장 테스트 러너를 실행한다. 항상 `bun run test`를 사용한다.

## Golden Rules

### 불변 규칙

- 서버 측 API 키(`ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`)는 절대 서버 밖으로 나가지 않는다. `/api/config`는 boolean(`!!ENV_KEYS.*`)만 노출한다 — `server/index.ts:147-156`. 키 값을 반환, 로그 출력, 에코하지 않는다.
- `.env`에는 실제 키가 있으며 gitignore 대상이다(`.gitignore:32`). 커밋하거나 값을 출력하거나 코드·문서에 복사하지 않는다. `.worktreeinclude:3`이 워크트리에 이 파일을 복사하므로 그대로 둔다.
- Gemini 키는 요청 URL 쿼리스트링으로 전송된다(`server/index.ts:99`). 이 URL을 로그로 남기거나 클라이언트에 반환하는 에러 메시지에 포함하지 않는다.
- 민감 파일은 읽지도 수정하지도 않는다. 사용자가 요청해도 마찬가지다. 대상: `.env`, `.env.*`, `*.env`, `.envrc`, 이름에 `secret`·`credential`이 들어간 파일, 키·인증서(`*.pem`, `*.key`, `*.p12`, `*.pfx`, `*.jks`, `*.keystore`, `id_rsa*`, `id_ecdsa*`, `id_ed25519*`), `.npmrc`, `.netrc`, `.pgpass`, `.git-credentials`, 홈의 `~/.ssh`, `~/.aws`, `~/.gnupg`, `~/.kube`, `~/.docker/config.json`, `~/.config/gh`, `~/.config/gcloud`. `.claude/settings.json`의 `permissions.deny`가 Read·Edit·Bash 단계에서 이를 강제한다.
- deny 규칙을 우회하지 않는다: 환경변수 덤프(`env`, `printenv`, `export -p`, `declare -x`, `set`, `$*_API_KEY`·`$*_TOKEN` 에코), 인라인 실행(`node -e`, `bun -e`, `python -c` 등), 스크립트 파일 작성, 인코딩(`base64` 등), 다른 경로 표기, `git show <rev>:.env`, `git add -f`, 자격증명 CLI(`gh auth token`, `security find-*-password`, `aws configure get`, `gcloud auth print-*`, `kubectl config view` 등)로 같은 정보에 접근하지 않는다. 차단되면 다른 방법을 찾지 말고 사용자에게 보고한다. 키 설정 여부만 필요하면 `/api/config`의 boolean으로 확인한다.

### Do

- API 포트는 두 곳을 함께 맞춘다: `Bun.serve({ port: 3002 })`(`server/index.ts:139`)와 Vite 프록시 target(`vite.config.ts:10-11`). 프론트엔드는 상대 경로 `/api/...`만 호출한다(`src/hooks/useComponentGenerator.ts:23`, `src/App.tsx:26`).
- 프로바이더를 추가할 때는 다음을 모두 수정한다: `src/types/index.ts:1`과 `server/index.ts:57`의 `Provider` 타입(공유되지 않고 중복 정의됨), `ENV_KEYS`(`server/index.ts:59-62`), `PROVIDER_CONFIG`(`src/App.tsx:9-12`), `server/index.ts:183-186`의 분기.
- 순수 함수로 만들 수 있는 서버 로직은 부수효과 없는 모듈로 분리하고 같은 위치에 `*.test.ts`를 둔다(패턴: `server/generator.ts`, `server/fallback.ts`). `server/index.ts`는 import 시점에 `Bun.serve`를 시작하며 테스트가 없다.
- 타입 전용 import는 `import type`을 사용한다(`verbatimModuleSyntax: true`, `tsconfig.app.json:14`).

### Don't

- TypeScript enum, namespace, 생성자 파라미터 프로퍼티를 사용하지 않는다. `erasableSyntaxOnly: true`(`tsconfig.app.json:23`)가 이를 거부한다.
- 생성 코드에 대한 이중 방어 중 어느 쪽도 제거하지 않는다: 시스템 프롬프트 규칙(`server/index.ts:11-12,16,20`)과 정규화 함수 `stripCodeFences` / `ensureRenderCall`(`server/generator.ts:5-24`). 모델은 프롬프트를 항상 지키지 않으며 정규화 함수가 이를 보완한다.
- 기본 프로바이더는 양쪽을 확인하지 않고 바꾸지 않는다: 서버 기본값은 `anthropic`(`server/index.ts:161`), UI 기본값은 `google`(`src/App.tsx:17`)이다. UI는 항상 `provider`를 보내므로 서버 기본값은 API를 직접 호출할 때만 적용된다.
- `bun run build`가 `server/`를 타입체크한다고 가정하지 않는다. `tsconfig.app.json:27`은 `src`만, `tsconfig.node.json:25`는 `vite.config.ts`만 포함한다. 서버 타입 에러는 런타임이나 테스트에서만 드러난다.

## 프로젝트 컨텍스트

자연어 프롬프트를 Claude 또는 Gemini로 독립 실행 가능한 React 컴포넌트로 변환하고 브라우저에서 즉시 렌더링하는 웹 앱.

스택: React 19, TypeScript 5.9, Vite 8, Bun (API 서버), react-live 4, Vitest 4 + Testing Library (jsdom), ESLint 9, Galmuri 폰트.

## 표준 및 참고

- 제품 소개, 설치, 기능: `README.md`. 여기에 중복 작성하지 않는다.
- 테스트는 `*.test.ts(x)`로 같은 위치에 둔다. Vitest는 `src/**/*.test.{ts,tsx}`와 `server/**/*.test.ts`만 수집한다(`vite.config.ts:20`). 테스트 이름은 한국어로 작성한다(기존 테스트 참고).
- 사용자에게 보이는 UI 문구, 코드 주석, 에러 메시지는 한국어로 작성한다.
- 커밋: 한국어 Conventional Commits, `type: 요약` 형식이며 `feat`, `fix`, `refactor`, `chore`를 사용한다(`git log` 참고). 커밋 시 `commit` 스킬을 사용한다.
- `.agents/skills/` 아래 스킬은 `skills-lock.json`에 업스트림 저장소 해시로 고정되어 있다. 직접 수정하지 말고 스킬 소스를 통해 업데이트한다.
- deny 규칙의 부작용: `secret`·`credential` 단어가 들어간 모든 Bash 명령(검색, 커밋 메시지 포함)과 `bun -e`·`node -e` 같은 일회성 실행도 막힌다. 검색은 Grep 도구를 쓰고, 커밋 메시지에서는 해당 단어를 피한다. 민감 파일 패턴을 추가·삭제할 때는 `.claude/settings.json`의 `permissions.deny`와 위 불변 규칙을 같은 변경에서 함께 수정한다.
- 유지보수 정책: 이 문서의 규칙이 코드와 어긋나면(라인 이동, 파일명 변경, 포트 변경, 신규 프로바이더 등) 같은 변경에서 이 파일의 업데이트를 제안한다. 알려진 불일치: `README.md`가 저장소에 없는 `.env.example`을 참조한다.

## Context Map

- **[API 서버 / AI 프로바이더 호출 (Bun)](./server/AGENTS.md)** — `/api/*` 라우트, 프로바이더 호출, 모델 폴백, 코드 정규화 수정 시.
- **[프론트엔드 UI / 실시간 미리보기 (React)](./src/AGENTS.md)** — 컴포넌트, 생성 훅, react-live 미리보기, 스타일 수정 시.
