import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { MAX_COMPONENTS, useComponentGenerator } from './useComponentGenerator';
import { STORAGE_KEYS } from '../utils/storage';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useComponentGenerator', () => {
  it('새로고침 전에 저장된 컴포넌트 목록을 복원한다', () => {
    localStorage.setItem(
      STORAGE_KEYS.components,
      JSON.stringify([
        { id: '1', prompt: '카드', code: 'render(<div />)', createdAt: '2026-10-01T05:00:00.000Z' },
      ]),
    );

    const { result } = renderHook(() => useComponentGenerator());

    expect(result.current.components).toEqual([
      { id: '1', prompt: '카드', code: 'render(<div />)', createdAt: new Date('2026-10-01T05:00:00.000Z') },
    ]);
  });

  it(`컴포넌트는 최대 ${MAX_COMPONENTS}개까지만 보관하고 가장 오래된 것을 버린다`, async () => {
    const saved = Array.from({ length: MAX_COMPONENTS }, (_, i) => ({
      id: `old-${i}`,
      prompt: `프롬프트 ${i}`,
      code: 'render(<div />)',
      createdAt: '2026-10-01T05:00:00.000Z',
    }));
    localStorage.setItem(STORAGE_KEYS.components, JSON.stringify(saved));
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ code: 'render(<div>새것</div>)' })));

    const { result } = renderHook(() => useComponentGenerator());
    await act(() => result.current.generate('새 프롬프트', undefined, 'google'));

    expect(result.current.components).toHaveLength(MAX_COMPONENTS);
    expect(result.current.components[0].prompt).toBe('새 프롬프트');
    expect(result.current.components.map((c) => c.id)).not.toContain(`old-${MAX_COMPONENTS - 1}`);
  });
});
