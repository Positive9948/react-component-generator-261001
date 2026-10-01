import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { usePersistentState } from './usePersistentState';
import { parseHistory } from '../utils/parsePersisted';

beforeEach(() => {
  localStorage.clear();
});

describe('usePersistentState', () => {
  it('저장된 값을 parse 함수로 복원해 초기값으로 쓴다', () => {
    localStorage.setItem('history', JSON.stringify(['카드', 3]));

    const { result } = renderHook(() => usePersistentState('history', parseHistory));

    expect(result.current[0]).toEqual(['카드']);
  });

  it('값을 바꾸면 localStorage에 저장한다', () => {
    const { result } = renderHook(() => usePersistentState('history', parseHistory));

    act(() => result.current[1](['버튼']));

    expect(localStorage.getItem('history')).toBe('["버튼"]');
  });
});
