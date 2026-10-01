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
});
