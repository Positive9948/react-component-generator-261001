import { useEffect, useState } from 'react';
import { loadJson, saveJson } from '../utils/storage';

// 새로고침 후에도 유지되는 상태. 저장된 값은 손상되었을 수 있으므로 parse로 검증·복원한다.
export function usePersistentState<T>(key: string, parse: (value: unknown) => T) {
  const [value, setValue] = useState<T>(() => parse(loadJson(key)));

  useEffect(() => {
    saveJson(key, value);
  }, [key, value]);

  return [value, setValue] as const;
}
