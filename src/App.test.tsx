import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { STORAGE_KEYS } from './utils/storage';

const mockApi = () =>
  vi.fn(async (url: string) => {
    if (url === '/api/config') {
      return Response.json({ envKeys: { anthropic: true, google: true } });
    }
    return Response.json({ code: 'render(<div>생성됨</div>)' });
  });

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('fetch', mockApi());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('App', () => {
  it('새로고침 전에 선택한 제공자를 복원한다', () => {
    localStorage.setItem(STORAGE_KEYS.provider, JSON.stringify('anthropic'));

    render(<App />);

    expect(screen.getByRole('radio', { name: 'Anthropic' })).toBeChecked();
  });

  it('생성을 요청한 프롬프트를 최근 프롬프트에 추가하고 저장한다', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByPlaceholderText(/고객 목록 테이블/), '프로필 카드');
    await user.click(screen.getByRole('button', { name: '컴포넌트 생성' }));

    const historyList = await screen.findByRole('list', { name: '최근 프롬프트' });
    expect(within(historyList).getByRole('button', { name: '프로필 카드' })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.promptHistory)!)).toEqual(['프로필 카드']);
  });

  it('입력한 API 키는 localStorage에 저장하지 않는다', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText('API 키'), 'AIza-secret');

    const stored = Array.from({ length: localStorage.length }, (_, i) =>
      localStorage.getItem(localStorage.key(i)!),
    ).join('');
    expect(stored).toContain('"google"');
    expect(stored).not.toContain('AIza-secret');
  });

  it('새로고침으로 복원된 컴포넌트는 자동 실행하지 않는다', async () => {
    localStorage.setItem(
      STORAGE_KEYS.components,
      JSON.stringify([
        { id: '1', prompt: '카드', code: 'render(<div>복원됨</div>)', createdAt: '2026-10-01T05:00:00.000Z' },
      ]),
    );

    render(<App />);

    expect(screen.getByRole('button', { name: '미리보기 실행' })).toBeInTheDocument();
    await expect(screen.findByText('복원됨', {}, { timeout: 300 })).rejects.toThrow();
  });

  it('컴포넌트를 브라우저에 저장하지 못하면 경고를 보여준다', () => {
    const setItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === STORAGE_KEYS.components) throw new DOMException('QuotaExceededError');
      setItem.call(this, key, value);
    });

    render(<App />);

    expect(screen.getByRole('alert')).toHaveTextContent('컴포넌트를 브라우저에 저장하지 못했습니다');
  });
});
