import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadJson, saveJson } from './storage';

beforeEach(() => {
  localStorage.clear();
});

describe('loadJson', () => {
  it('저장된 JSON 값을 파싱해 반환한다', () => {
    localStorage.setItem('key', JSON.stringify({ a: 1 }));
    expect(loadJson('key')).toEqual({ a: 1 });
  });

  it('저장된 값이 손상된 JSON이면 undefined를 반환한다', () => {
    localStorage.setItem('key', '{broken');
    expect(loadJson('key')).toBeUndefined();
  });
});

describe('saveJson', () => {
  it('값을 JSON 문자열로 저장한다', () => {
    saveJson('key', { a: 1 });
    expect(localStorage.getItem('key')).toBe('{"a":1}');
  });

  it('저장소 쓰기가 실패해도 예외를 던지지 않는다', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    expect(() => saveJson('key', { a: 1 })).not.toThrow();
    setItem.mockRestore();
  });

  it('저장 성공 여부를 반환한다', () => {
    expect(saveJson('key', { a: 1 })).toBe(true);

    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    expect(saveJson('key', { a: 1 })).toBe(false);
    setItem.mockRestore();
  });
});
