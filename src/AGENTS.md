# src/AGENTS.md

## 모듈 컨텍스트

React 19 프론트엔드. 프롬프트 입력과 프로바이더/키 설정을 받아 `useComponentGenerator`로 `/api/generate`를 호출하고, 결과를 react-live 미리보기와 코드 보기가 있는 카드로 렌더링한다.

## 기술 스택 및 제약

- 상태는 로컬 React 상태만 사용한다(`hooks/useComponentGenerator.ts`의 `useState`/`useCallback`). 상태 관리 라이브러리와 라우터는 없다.
- 스타일은 `App.css`의 일반 CSS 클래스와 `index.css`의 토큰으로 작성한다. CSS 모듈, CSS-in-JS, Tailwind를 사용하지 않으며 앱 코드에서 인라인 `style`도 사용하지 않는다.
- 생성된 컴포넌트는 react-live `LiveProvider ... noInline`으로 렌더링된다(`components/LivePreview.tsx:10`). 생성 코드는 TypeScript가 아니며 import가 없다.

## 구현 패턴

- 패널은 레트로 윈도우 패턴을 사용한다: `.window` 컨테이너 + `<TitleBar title=... />` + `.window-body`(`App.tsx:75-80`). 새 패널에도 재사용한다.
- 버튼은 `.btn`, 주요 액션은 `.btn btn--default`를 사용한다(`components/PromptInput.tsx:52`).
- 컴포넌트는 `components/PascalCase.tsx`의 named export로 작성한다. default export는 `App`뿐이다.
- 공유 타입은 `types/index.ts`에 둔다.

## 테스트 전략

- 실행: `bunx vitest run src/`
- Testing Library의 role/name 쿼리와 `userEvent.setup()`을 사용한다(패턴: `components/PromptInput.test.tsx`). DOM 정리는 `test/setup.ts`에서 전역으로 처리하므로 파일별 cleanup을 추가하지 않는다.
- 현재 `PromptInput`만 테스트되어 있다. 훅의 요청/응답 처리를 변경하면 `fetch`를 모킹하는 테스트를 추가한다.

## Local Golden Rules

- Do: 앱 UI는 1비트(흑/백/회색 토큰)로 유지한다. `index.css:13`은 색상을 생성된 컴포넌트 전용으로 남겨둔다. 앱 UI에 강조색을 추가하지 않는다.
- Do: 픽셀 폰트 크기는 12px 그리드(`--px-s/m/l`, `index.css:25-31`)를 따른다.
- Do: `apiKey`는 사용자가 입력했을 때만 보낸다(`...(apiKey && { apiKey })`, `hooks/useComponentGenerator.ts:26`). 빈 문자열을 보내도 서버에서 env 키로 폴백되지만, placeholder나 env 키를 보내서는 안 된다.
- Don't: API 키를 `localStorage`, URL, 로그에 저장하지 않는다. 키는 컴포넌트 상태에만 존재하며(`App.tsx:15`) 프로바이더 변경 시 초기화된다(`App.tsx:42-45`).
- Don't: `LivePreview`의 `key={previewKey}` 리마운트를 제거하지 않는다(`components/ComponentCard.tsx:70`). 새로고침 버튼이 애니메이션 재생을 위해 이를 사용한다.
- Don't: `createdAt`을 문자열로 다루지 않는다. `Date` 타입이며(`types/index.ts:7`) `toLocaleTimeString`으로 포맷된다(`components/ComponentCard.tsx:19`). 컴포넌트를 영속화하려면 복원 시 `Date`로 되돌려야 한다.
