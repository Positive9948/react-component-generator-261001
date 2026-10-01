import { describe, it, expect } from 'vitest';
import { mapGenerationError } from './errors';

describe('mapGenerationError', () => {
  it('메시지에 503이 있으면 과부하 안내와 503 상태를 돌려준다', () => {
    expect(mapGenerationError(new Error('Gemini API error: 503'))).toEqual({
      status: 503,
      error: 'API 서버가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해주세요.',
    });
  });

  it('메시지에 429가 있으면 요청 과다 안내와 429 상태를 돌려준다', () => {
    expect(mapGenerationError(new Error('Claude API error: 429'))).toEqual({
      status: 429,
      error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
    });
  });

  it('그 외 에러는 원래 메시지와 500 상태를 돌려준다', () => {
    expect(mapGenerationError(new Error('Claude API error: 401'))).toEqual({
      status: 500,
      error: 'Claude API error: 401',
    });
  });
});
