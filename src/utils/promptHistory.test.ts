import { describe, it, expect } from 'vitest';
import { MAX_HISTORY, addPromptToHistory } from './promptHistory';

describe('addPromptToHistory', () => {
  it('새 프롬프트를 맨 앞에 추가한다', () => {
    expect(addPromptToHistory(['카드'], '버튼')).toEqual(['버튼', '카드']);
  });

  it('이미 있는 프롬프트는 중복 없이 맨 앞으로 옮긴다', () => {
    expect(addPromptToHistory(['카드', '버튼', '표'], '버튼')).toEqual(['버튼', '카드', '표']);
  });

  it(`최대 ${MAX_HISTORY}개까지만 보관하고 가장 오래된 항목을 버린다`, () => {
    const full = Array.from({ length: MAX_HISTORY }, (_, i) => `프롬프트 ${i}`);

    const result = addPromptToHistory(full, '새 프롬프트');

    expect(result).toHaveLength(MAX_HISTORY);
    expect(result[0]).toBe('새 프롬프트');
    expect(result).not.toContain(`프롬프트 ${MAX_HISTORY - 1}`);
  });
});
