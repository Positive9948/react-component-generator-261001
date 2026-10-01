import { describe, it, expect } from 'vitest';
import { validatePrompt } from './validatePrompt';

describe('validatePrompt', () => {
  it('500자 이하면 에러가 없다', () => {
    expect(validatePrompt('가'.repeat(500))).toBeNull();
  });

  it('500자를 넘으면 에러 메시지를 반환한다', () => {
    expect(validatePrompt('가'.repeat(501))).toBe('프롬프트는 500자 이하로 입력해주세요.');
  });

  it('앞뒤 공백은 길이에 포함하지 않는다', () => {
    expect(validatePrompt(`  ${'가'.repeat(500)}\n `)).toBeNull();
  });
});
