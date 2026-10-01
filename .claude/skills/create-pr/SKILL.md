---
name: create-pr
description: |
  현재 브랜치의 커밋을 분석해 GitHub PR을 생성한다. 프로젝트 성격을 판별해 해외 오픈소스면 영문 템플릿, 한국 프로젝트면 한국어 템플릿으로 PR 제목·본문을 작성하고, 브랜치 push와 `gh pr create`까지 서브에이전트에서 처리한다.
  "PR 만들어줘", "PR 올려줘", "풀리퀘 생성", "PR 생성해줘", "create a PR", "open a pull request", "/create-pr" 같은 요청에 활성화한다. 작업을 마치고 리뷰를 요청하고 싶다는 말에도 쓴다.
argument-hint: "[--lang ko|en] [--base <branch>] [--draft]"
context: fork
agent: general-purpose
---

# create-pr: 언어 자동 판별 PR 생성

현재 작업 디렉토리의 git 저장소에서, 현재 브랜치의 커밋을 바탕으로 PR을 만든다. 이 스킬은 분리된 서브에이전트에서 실행되므로 호출한 대화의 맥락을 볼 수 없다. 필요한 정보는 모두 git과 `gh`에서 직접 얻고, 판단 근거는 마지막 보고에 남긴다.

사용자가 이 스킬을 부른 것 자체를 **push와 PR 생성 승인**으로 본다. 그 외 되돌리기 어려운 작업(force push, 커밋 수정, 다른 브랜치 변경)은 하지 않는다.

## 인자

`$ARGUMENTS`

- `--lang ko|en`: 언어 판별을 건너뛰고 지정한 템플릿을 쓴다.
- `--base <branch>`: PR 대상 브랜치. 없으면 기본 브랜치를 쓴다.
- `--draft`: Draft PR로 만든다.
- 그 밖의 자유 텍스트(예: "이슈 #12 관련")는 PR 본문 작성에 참고한다.

## 1. 사전 점검

다음을 병렬로 실행한다.

```bash
git status --short
git branch --show-current
git remote -v
gh repo view --json nameWithOwner,defaultBranchRef,isFork,parent,description
gh pr view --json url,state 2>/dev/null   # 현재 브랜치에 이미 PR이 있는지
```

멈추고 보고해야 하는 경우:

- git 저장소가 아니거나 `gh`가 없거나 인증되지 않음 → 사용자가 `! gh auth login`을 실행하도록 안내한다.
- 현재 브랜치에 열린 PR이 이미 있음 → 새로 만들지 않고 기존 URL을 보고한다. 새 커밋이 있다면 push만 하고 그 사실을 알린다.
- base 대비 커밋이 하나도 없음 → PR로 올릴 내용이 없다고 보고한다.

그 밖의 처리:

- **커밋되지 않은 변경**은 커밋하지 않는다. 이 스킬의 범위는 이미 커밋된 내용이다. PR에서 빠졌다는 사실을 보고에 적는다.
- **기본 브랜치(main 등) 위에 있는 경우**: 기본 브랜치로 직접 PR을 열 수 없으므로, 커밋 내용에서 이름을 지어 새 브랜치를 만든다(`feat/prompt-length-limit`처럼 `type/영문-kebab-case`). 로컬 기본 브랜치를 되돌리지는 않는다. 원격 기본 브랜치보다 앞선 커밋만 새 브랜치에 담기므로 결과는 같다.
- **포크 저장소**(`isFork: true`)면 base 저장소는 `parent`이고, head는 `<내 계정>:<브랜치>`로 지정한다.

## 2. 변경 내용 파악

base 브랜치를 정한 뒤(`--base` 또는 `defaultBranchRef`) 다음을 확인한다.

```bash
git fetch origin <base>
git log --oneline origin/<base>..HEAD
git diff --stat origin/<base>...HEAD
git diff origin/<base>...HEAD
```

diff가 매우 크면 `--stat`과 커밋 메시지를 중심으로 파악하고, 핵심 파일만 열어본다. PR 본문은 커밋 메시지를 나열하는 것이 아니라 **리뷰어가 이 PR을 왜, 어떻게 봐야 하는지**를 전달하는 글이다. 커밋이 여러 개면 의도별로 묶어서 설명한다.

## 3. 언어(템플릿) 판별

`--lang`이 있으면 그대로 쓴다. 없으면 PR을 **읽을 사람**이 누구인지를 기준으로 판단한다. 해외 오픈소스 메인테이너에게 한국어 PR을 보내면 리뷰가 안 되고, 한국 팀에게 영문 PR을 보내면 불필요한 마찰이 생긴다. 내 커밋이 한국어라는 사실보다 **상대 저장소의 관행**이 중요하다.

아래 신호를 위에서부터 확인하고, 강한 신호가 나오면 거기서 결정한다.

1. **포크 대상(upstream/parent) 저장소** — 포크해서 업스트림에 PR을 보내는 경우, 업스트림의 언어가 기준이다. 업스트림이 영어권 저장소면 영문.
2. **기존 PR 관행** — `gh pr list --state all --limit 10 --json title,body`의 제목·본문이 주로 한글이면 한국어, 영어면 영문.
3. **저장소 문서** — `README.md`, `CONTRIBUTING.md`, 기존 PR 템플릿(`.github/PULL_REQUEST_TEMPLATE.md` 등)의 주 언어.
4. **커밋 로그** — `git log --oneline -20 origin/<base>`에서 다른 기여자들의 커밋 언어.
5. **판단이 서지 않으면 한국어.** 이 스킬의 사용자는 한국어 사용자이고, 애매한 경우는 대개 개인·사내 저장소다.

"주로 한글"은 대충 봐서 한글 문장이 다수인지로 판단한다. 영어 README에 한글 몇 단어가 섞인 정도는 영어 저장소다.

결정되면 해당 템플릿을 읽는다.

- 한국어: `references/pr-template-ko.md`
- 영문: `references/pr-template-en.md`

**저장소에 자체 PR 템플릿이 있으면 그것을 우선한다.** 메인테이너가 요구하는 형식(체크리스트, CLA 확인 등)을 지켜야 PR이 받아들여지기 때문이다. 이 경우 저장소 템플릿의 섹션 구조를 그대로 채우고, references 템플릿은 각 섹션을 어떻게 채울지에 대한 작성 가이드로만 참고한다.

## 4. 제목과 본문 작성

**제목**

- 저장소의 기존 PR 제목·커밋 관행을 따른다. Conventional Commits를 쓰는 저장소면 `feat: ...` 형식으로.
- 한국어: 예) `feat: 프롬프트 500자 제한 검증과 글자 수 표시 추가`
- 영문: 명령형 현재 시제, 첫 글자 대문자 여부는 저장소 관행을 따른다. 예) `feat: add 500-character prompt limit with live counter`
- 70자 안팎으로 짧게. 세부 내용은 본문에.

**본문**

- 선택한 템플릿의 섹션 구조를 따르고, 템플릿 안의 `<!-- -->` 작성 안내 주석은 지운다.
- 해당 사항이 없는 선택 섹션(스크린샷, 관련 이슈 등)은 비워두지 말고 섹션째 삭제한다.
- 테스트 섹션에는 **실제로 확인된 것만** 적는다. 이 서브에이전트가 테스트를 돌리지 않았다면 체크하지 않는다. 프로젝트 지침(`AGENTS.md`/`CLAUDE.md`)에 검증 명령이 있으면 그 명령을 리뷰어가 실행할 방법으로 적는다.
- 인자로 받은 이슈 번호가 있거나 브랜치명·커밋에 `#123`이 있으면 관련 이슈 섹션에 `Closes #123` 형식으로 연결한다. 확실하지 않으면 `Refs #123`.
- 세션에 PR attribution 지침(예: `🤖 Generated with [Claude Code](...)`)이 있으면 본문 끝에 붙인다.

## 5. push와 PR 생성

```bash
git push -u origin <branch>
gh pr create --base <base> --title "<제목>" --body-file <임시 파일> [--draft]
```

- 본문은 임시 파일에 써서 `--body-file`로 넘긴다. 셸 인자로 넘기면 백틱·따옴표·`$`가 깨진다.
- `--force` push는 하지 않는다. push가 거부되면(원격에 다른 커밋이 있음) 멈추고 상황을 보고한다.
- 포크에서 업스트림으로 보낼 때는 `--repo <parent>`와 `--head <owner>:<branch>`를 지정한다.

## 6. 완료 보고

이 보고가 호출한 쪽에 전달되는 유일한 결과물이다. 다음을 간결하게 포함한다.

- PR URL
- 사용한 템플릿(한국어/영문/저장소 자체 템플릿)과 **그렇게 판단한 근거 한 줄** (예: "업스트림 `vercel/next.js`가 영어 저장소")
- 제목
- base ← head 브랜치, 포함된 커밋 수
- 새로 만든 브랜치가 있으면 그 이름
- PR에 포함되지 않은 미커밋 변경이 있으면 그 목록

언어 판단이 틀렸다면 사용자가 `--lang`을 지정해 다시 부르거나 `gh pr edit`으로 고칠 수 있다고 한 줄 덧붙인다.
