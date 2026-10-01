export function loadJson(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) as string);
  } catch {
    return undefined;
  }
}

// 용량 초과나 차단된 저장소에서는 예외 대신 false를 반환해 앱이 계속 동작하게 한다.
export function saveJson(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const STORAGE_KEYS = {
  provider: 'rcg:provider',
  components: 'rcg:components',
  promptHistory: 'rcg:promptHistory',
} as const;
