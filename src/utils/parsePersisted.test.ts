import { describe, it, expect } from 'vitest';
import { parseComponents, parseHistory, parseProvider } from './parsePersisted';

describe('parseProvider', () => {
  it('저장된 값이 유효한 제공자면 그대로 반환한다', () => {
    expect(parseProvider('anthropic')).toBe('anthropic');
  });

  it('저장된 값이 없거나 알 수 없는 제공자면 기본값 google을 반환한다', () => {
    expect(parseProvider(undefined)).toBe('google');
    expect(parseProvider('openai')).toBe('google');
  });
});

describe('parseComponents', () => {
  it('저장된 컴포넌트 목록을 복원하고 createdAt을 Date로 되돌린다', () => {
    const saved = JSON.parse(
      JSON.stringify([
        { id: '1', prompt: '카드', code: 'render(<div />)', createdAt: new Date('2026-10-01T05:00:00Z') },
      ]),
    );

    expect(parseComponents(saved)).toEqual([
      { id: '1', prompt: '카드', code: 'render(<div />)', createdAt: new Date('2026-10-01T05:00:00Z') },
    ]);
  });

  it('저장된 값이 없거나 배열이 아니면 빈 배열을 반환한다', () => {
    expect(parseComponents(undefined)).toEqual([]);
    expect(parseComponents({ id: '1' })).toEqual([]);
  });

  it('필드가 빠졌거나 날짜가 잘못된 항목은 제외한다', () => {
    const valid = { id: '1', prompt: '카드', code: 'render(<div />)', createdAt: '2026-10-01T05:00:00.000Z' };

    const result = parseComponents([
      valid,
      { id: '2', prompt: '버튼' },
      { ...valid, id: '3', createdAt: 'not-a-date' },
      null,
    ]);

    expect(result.map((c) => c.id)).toEqual(['1']);
  });
});

describe('parseHistory', () => {
  it('저장된 프롬프트 히스토리를 복원한다', () => {
    expect(parseHistory(['카드', '버튼'])).toEqual(['카드', '버튼']);
  });

  it('배열이 아니면 빈 배열을, 배열이면 문자열 항목만 반환한다', () => {
    expect(parseHistory(undefined)).toEqual([]);
    expect(parseHistory(['카드', 3, null])).toEqual(['카드']);
  });
});
