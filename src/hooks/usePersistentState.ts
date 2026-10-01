import { useEffect, useState } from 'react';
import { loadJson, saveJson } from '../utils/storage';

// 새로고침 후에도 유지되는 상태. 저장된 값은 손상되었을 수 있으므로 parse로 검증·복원한다.
// 세 번째 값은 마지막 저장이 실패했는지(용량 초과 등)를 알려준다.
export function usePersistentState<T>(key: string, parse: (value: unknown) => T) {
  const [value, setValue] = useState<T>(() => parse(loadJson(key)));
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    // 외부 저장소(localStorage)에 쓴 결과를 반영하는 것이므로 effect 안에서 상태를 갱신한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaveFailed(!saveJson(key, value));
  }, [key, value]);

  return [value, setValue, saveFailed] as const;
}
