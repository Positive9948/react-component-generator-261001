# server/AGENTS.md

## 모듈 컨텍스트

프롬프트를 Anthropic 또는 Google로 프록시하고, 반환된 코드를 react-live용으로 정규화해 `/api` 프록시를 통해 Vite 프론트엔드에 제공하는 Bun HTTP 서버.

## 기술 스택 및 제약

- 런타임은 Bun이다(`Bun.serve`, `.env`에서 `process.env` 자동 로드). Express, node-fetch, dotenv를 추가하지 않는다.
- 프로바이더 API는 순수 `fetch`로 호출하며 공식 SDK는 설치되어 있지 않다. 요청이 없는 한 유지한다.
- Bun 서버의 `idleTimeout`은 스트리밍을 위해 120초로 늘려두었다(기본 10초면 첫 토큰 전이나 긴 생성 중 연결이 끊긴다).
- 모델: Anthropic `claude-haiku-4-5-20251001`(`index.ts`의 `streamAnthropic`), Google은 우선순위 순서의 `GOOGLE_MODELS` 목록(`index.ts:5`).
- 테스트는 `bun test`가 아니라 jsdom 환경의 Vitest로 실행된다(`vite.config.ts:17`). 테스트 대상 모듈에서 `bun:test` import나 `Bun.*` API를 사용하지 않는다.

## 구현 패턴

- `index.ts`는 부수효과가 있는 진입점(라우팅, 프로바이더 호출)이다. 순수 로직은 형제 모듈(`generator.ts`, `fallback.ts`)에 두고 같은 위치에 `*.test.ts`를 둔다.
- 모든 `Response.json`에는 에러와 404를 포함해 `headers: CORS_HEADERS`(`index.ts:51-55`)를 넣는다.
- `/api/generate` 응답 형태: 프로바이더 연결 전 실패(키 없음, 4xx/5xx, 폴백 소진)는 상태 코드와 함께 `{ error }` JSON이다. 연결에 성공하면 200 NDJSON 스트림(`delta`* → `done { code }` | `error { error }`)을 보낸다(`stream.ts`의 `toGenerationStream`). 스트림 도중의 에러는 상태 코드를 바꿀 수 없으므로 `error` 이벤트로만 전달된다. 이벤트 타입은 `src/types/index.ts`의 `GenerateStreamEvent`와 맞춘다.
- 파이프라인 순서는 고정이다: 프로바이더 SSE -> `parseSSE` -> `anthropicTextDeltas`/`googleTextDeltas` -> 전체 텍스트 누적 -> `stripCodeFences` -> `ensureRenderCall`(`stream.ts`의 `toGenerationStream`). `delta` 이벤트는 정규화 전 원문이며, 최종 코드는 `done`의 `code`만 사용한다.
- 에러 → 사용자 메시지/상태 매핑은 `errors.ts`의 `mapGenerationError` 한 곳에서 한다(HTTP 응답과 스트림 `error` 이벤트 공용).

## 테스트 전략

- 실행: `bunx vitest run server/`
- 순수 함수를 직접 테스트하고, 프로바이더 호출은 `fallback.test.ts`처럼 `vi.fn`으로 모킹한다. 테스트에서 실제 프로바이더 API를 호출하지 않는다.
- `generator.ts`에 정규화 규칙을 추가하면 `generator.test.ts`에 "이미 올바른 입력"과 "수정이 필요한 입력" 케이스를 모두 추가한다.

## Local Golden Rules

- Do: 프로바이더 에러를 throw할 때 HTTP 상태 코드를 메시지에 포함한다(`Claude API error: ${status}`, `streamAnthropic`/`streamGoogleModel`). `mapGenerationError`가 `message.includes('503' | '429')`로 503/429를 매핑한다(`errors.ts`). 상태 코드가 빠지면 사용자용 한국어 메시지가 깨진다.
- Do: `SYSTEM_PROMPT` 규칙을 react-live와 맞춘다: import 금지(React는 전역), 순수 JavaScript만 사용, 마지막에 `render(<Name />)` 호출(`index.ts:11-12,20`). 미리보기는 `noInline`으로 실행되며 TypeScript를 제거하지 않는다.
- Don't: `ensureRenderCall`의 가드를 약화하지 않는다. `render(`가 없을 때만, 대문자로 시작하는 `const`/`function` 이름에 대해서만 주입한다(`generator.ts:17-22`). 두 번 주입하거나 소문자 이름에 주입하면 미리보기가 깨진다.
- 비대칭: Google에는 모델 폴백(`streamGoogle`, 연결 단계에서만 동작 — 스트리밍 시작 후 실패는 다음 모델로 넘기지 않음)과 `MAX_TOKENS` 잘림 검사(`stream.ts`의 `googleTextDeltas`, `maxOutputTokens: 8192`)가 있지만 Anthropic에는 둘 다 없다(`max_tokens: 4096`, `stop_reason` 검사 없음). 잘림이나 재시도 동작을 수정할 때는 두 프로바이더 모두에 대해 명시적으로 결정한다.
- Don't: `withModelFallback`이 첫 실패에서 멈추거나 첫 에러를 던지도록 바꾸지 않는다. 테스트가 마지막 에러를 던지는 것과 빈 목록에서 reject하는 것을 검증한다(`fallback.test.ts:27-41`).
- 보안: 클라이언트가 보낸 `apiKey`가 env 키보다 우선한다(`resolveApiKey`, `index.ts:64-66`). 어느 키도 저장, 로그 출력, 에코하지 않는다.
