import { useState, useCallback } from 'react';
import type { GeneratedComponent, GenerateStreamEvent, Provider } from '../types';
import { usePersistentState } from './usePersistentState';
import { parseComponents } from '../utils/parsePersisted';
import { STORAGE_KEYS } from '../utils/storage';
import { readNdjson } from '../utils/readNdjson';

export const MAX_COMPONENTS = 20;

interface UseComponentGeneratorReturn {
  components: GeneratedComponent[];
  /** 생성 중인 컴포넌트. code에는 지금까지 받은 코드가 누적된다. */
  streaming: GeneratedComponent | null;
  isLoading: boolean;
  error: string | null;
  generate: (prompt: string, apiKey: string | undefined, provider: Provider) => Promise<void>;
  removeComponent: (id: string) => void;
  clearAll: () => void;
  saveFailed: boolean;
}

export function useComponentGenerator(): UseComponentGeneratorReturn {
  const [components, setComponents, saveFailed] = usePersistentState(STORAGE_KEYS.components, parseComponents);
  const [streaming, setStreaming] = useState<GeneratedComponent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (prompt: string, apiKey: string | undefined, provider: Provider) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, ...(apiKey && { apiKey }), provider }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate component');
      }

      const pending: GeneratedComponent = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        prompt,
        code: '',
        createdAt: new Date(),
      };
      setStreaming(pending);

      for await (const event of readNdjson(res.body) as AsyncGenerator<GenerateStreamEvent>) {
        if (event.type === 'delta') {
          pending.code += event.text;
          setStreaming({ ...pending });
        } else if (event.type === 'done') {
          // streaming과 같은 id로 추가해 같은 카드가 이어서 렌더링되도록 한다.
          setComponents((prev) => [{ ...pending, code: event.code }, ...prev].slice(0, MAX_COMPONENTS));
          return;
        } else {
          throw new Error(event.error);
        }
      }
      throw new Error('코드 생성이 중간에 끊겼습니다. 다시 시도해주세요.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setStreaming(null);
      setIsLoading(false);
    }
  }, [setComponents]);

  const removeComponent = useCallback((id: string) => {
    setComponents((prev) => prev.filter((c) => c.id !== id));
  }, [setComponents]);

  const clearAll = useCallback(() => {
    setComponents([]);
  }, [setComponents]);

  return { components, streaming, isLoading, error, generate, removeComponent, clearAll, saveFailed };
}
