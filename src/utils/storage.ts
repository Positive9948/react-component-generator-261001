export function loadJson(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) as string);
  } catch {
    return undefined;
  }
}

export function saveJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 용량 초과나 차단된 저장소에서는 저장을 건너뛰고 앱은 계속 동작한다.
  }
}

export const STORAGE_KEYS = {
  provider: 'rcg:provider',
  components: 'rcg:components',
  promptHistory: 'rcg:promptHistory',
} as const;
