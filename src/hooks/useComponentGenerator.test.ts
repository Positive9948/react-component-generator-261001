import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { MAX_COMPONENTS, useComponentGenerator } from './useComponentGenerator';
import { controllableStream, ndjsonResponse } from '../test/streams';
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
    vi.stubGlobal('fetch', vi.fn(async () => ndjsonResponse({ type: 'done', code: 'render(<div>새것</div>)' })));

    const { result } = renderHook(() => useComponentGenerator());
    await act(() => result.current.generate('새 프롬프트', undefined, 'google'));

    expect(result.current.components).toHaveLength(MAX_COMPONENTS);
    expect(result.current.components[0].prompt).toBe('새 프롬프트');
    expect(result.current.components.map((c) => c.id)).not.toContain(`old-${MAX_COMPONENTS - 1}`);
  });

  it('생성 중에는 받은 코드 조각을 streaming 컴포넌트에 누적한다', async () => {
    const { stream, send, close } = controllableStream();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(stream)));
    const { result } = renderHook(() => useComponentGenerator());

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.generate('카드', undefined, 'google');
    });
    send({ type: 'delta', text: 'const A' });
    send({ type: 'delta', text: ' = 1;' });

    await waitFor(() =>
      expect(result.current.streaming).toMatchObject({ prompt: '카드', code: 'const A = 1;' }),
    );

    send({ type: 'done', code: 'const A = 1;' });
    close();
    await act(() => pending);
  });

  it('생성이 끝나면 streaming을 비우고 같은 id로 정규화된 코드를 가진 컴포넌트를 추가한다', async () => {
    const { stream, send, close } = controllableStream();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(stream)));
    const { result } = renderHook(() => useComponentGenerator());

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.generate('카드', undefined, 'google');
    });
    send({ type: 'delta', text: 'const Card = () => <div />;' });
    await waitFor(() => expect(result.current.streaming).not.toBeNull());
    const streamingId = result.current.streaming!.id;

    send({ type: 'done', code: 'const Card = () => <div />;\n\nrender(<Card />);' });
    close();
    await act(() => pending);

    expect(result.current.streaming).toBeNull();
    expect(result.current.components[0]).toMatchObject({
      id: streamingId,
      prompt: '카드',
      code: 'const Card = () => <div />;\n\nrender(<Card />);',
    });
  });

  it('스트림 도중 error 이벤트를 받으면 에러를 보여주고 컴포넌트를 추가하지 않는다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        ndjsonResponse(
          { type: 'delta', text: 'const A' },
          { type: 'error', error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        ),
      ),
    );
    const { result } = renderHook(() => useComponentGenerator());

    await act(() => result.current.generate('카드', undefined, 'google'));

    expect(result.current.error).toBe('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
    expect(result.current.components).toEqual([]);
  });

  it('done 이벤트 없이 스트림이 끝나면 생성이 중단되었다는 에러를 보여준다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ndjsonResponse({ type: 'delta', text: 'const A' })));
    const { result } = renderHook(() => useComponentGenerator());

    await act(() => result.current.generate('카드', undefined, 'google'));

    expect(result.current.error).toBe('코드 생성이 중간에 끊겼습니다. 다시 시도해주세요.');
    expect(result.current.components).toEqual([]);
  });
});
