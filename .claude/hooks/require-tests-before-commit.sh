#!/usr/bin/env bash
# PreToolUse(Bash) 훅: git commit 전에 전체 테스트를 실행하고, 실패하면 커밋을 차단한다.
# exit 2 = 도구 호출 차단 (stderr가 Claude에게 전달됨)

command=$(jq -r '.tool_input.command // empty')

# git commit이 포함된 명령만 검사한다 (cd ... && git commit, git -C dir commit 등 포함)
if ! printf '%s' "$command" | grep -qE '(^|[;&|[:space:]])git([[:space:]]+-[^[:space:]]+([[:space:]]+[^-[:space:]][^[:space:]]*)?)*[[:space:]]+commit([[:space:]]|$)'; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}" || {
  echo "커밋 차단: 프로젝트 루트로 이동하지 못했습니다." >&2
  exit 2
}

if ! output=$(bun run test 2>&1); then
  {
    echo "커밋 차단: 테스트가 실패했습니다. 모든 테스트를 통과시킨 뒤 다시 커밋하세요."
    echo "----- bun run test (마지막 40줄) -----"
    printf '%s\n' "$output" | tail -40
  } >&2
  exit 2
fi

exit 0
