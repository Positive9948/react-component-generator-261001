# src/AGENTS.md

## 모듈 컨텍스트

React 19 프론트엔드. 프롬프트 입력과 프로바이더/키 설정을 받아 `useComponentGenerator`로 `/api/generate`를 호출하고, 결과를 react-live 미리보기와 코드 보기가 있는 카드로 렌더링한다.

## 기술 스택 및 제약

- 상태는 로컬 React 상태만 사용한다. 상태 관리 라이브러리와 라우터는 없다.
- 새로고침 후 유지할 상태는 `hooks/usePersistentState.ts`로 localStorage에 저장한다(현재: 제공자, 생성된 컴포넌트, 프롬프트 히스토리). 키는 `utils/storage.ts`의 `STORAGE_KEYS`에 모으고, 저장된 값은 손상·구버전일 수 있으므로 반드시 `utils/parsePersisted.ts`의 parse 함수로 검증해 복원한다.
- 스타일은 `App.css`의 일반 CSS 클래스와 `index.css`의 토큰으로 작성한다. CSS 모듈, CSS-in-JS, Tailwind를 사용하지 않으며 앱 코드에서 인라인 `style`도 사용하지 않는다.
- 생성된 컴포넌트는 react-live `LiveProvider ... noInline`으로 렌더링된다(`components/LivePreview.tsx:10`). 생성 코드는 TypeScript가 아니며 import가 없다.

## 구현 패턴

- 패널은 레트로 윈도우 패턴을 사용한다: `.window` 컨테이너 + `<TitleBar title=... />` + `.window-body`(`App.tsx:87-88`). 새 패널에도 재사용한다.
- 버튼은 `.btn`, 주요 액션은 `.btn btn--default`를 사용한다(`components/PromptInput.tsx:52`).
- 컴포넌트는 `components/PascalCase.tsx`의 named export로 작성한다. default export는 `App`뿐이다.
- 공유 타입은 `types/index.ts`에 둔다.

## 테스트 전략

- 실행: `bunx vitest run src/`
- Testing Library의 role/name 쿼리와 `userEvent.setup()`을 사용한다(패턴: `components/PromptInput.test.tsx`). DOM 정리는 `test/setup.ts`에서 전역으로 처리하므로 파일별 cleanup을 추가하지 않는다.
- 훅의 요청/응답 처리를 변경하면 `fetch`를 모킹하는 테스트를 추가한다(패턴: `App.test.tsx`의 `vi.stubGlobal('fetch', ...)`). localStorage를 쓰는 테스트는 `beforeEach`에서 `localStorage.clear()`로 격리한다.

## Local Golden Rules

- Do: 앱 UI는 1비트(흑/백/회색 토큰)로 유지한다. `index.css:13`은 색상을 생성된 컴포넌트 전용으로 남겨둔다. 앱 UI에 강조색을 추가하지 않는다.
- Do: 픽셀 폰트 크기는 12px 그리드(`--px-s/m/l`, `index.css:25-31`)를 따른다.
- Do: `apiKey`는 사용자가 입력했을 때만 보낸다(`...(apiKey && { apiKey })`, `hooks/useComponentGenerator.ts:32`). 빈 문자열을 보내도 서버에서 env 키로 폴백되지만, placeholder나 env 키를 보내서는 안 된다.
- Don't: API 키를 `localStorage`, URL, 로그에 저장하지 않는다. 키는 컴포넌트 상태에만 존재하며(`App.tsx:19`) 프로바이더 변경 시 초기화된다(`App.tsx:53-56`). `usePersistentState`로 옮기지 않는다 — react-live로 실행되는 생성 코드가 같은 출처의 localStorage를 읽을 수 있다. `App.test.tsx`가 이를 검증한다.
- Don't: 새로고침으로 복원된 컴포넌트를 자동 실행하지 않는다(`App.tsx`의 `restoredIds` → `ComponentCard`의 `autoRun={false}`). 탭을 멈추게 하는 생성 코드가 저장되면 새로고침으로도 벗어날 수 없게 된다. 컴포넌트 목록은 저장 용량을 위해 `MAX_COMPONENTS`(20)개로 제한한다.
- Don't: `LivePreview`의 `key={previewKey}` 리마운트를 제거하지 않는다(`components/ComponentCard.tsx:80`). 새로고침 버튼이 애니메이션 재생을 위해 이를 사용한다.
- Don't: `createdAt`을 문자열로 다루지 않는다. `Date` 타입이며(`types/index.ts:7`) `toLocaleTimeString`으로 포맷된다(`components/ComponentCard.tsx:27`). localStorage 복원 시 `parseComponents`가 `Date`로 되돌린다.
