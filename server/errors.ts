// 생성 중 발생한 에러를 사용자용 메시지와 HTTP 상태로 변환한다.
// 프로바이더 에러 메시지에 상태 코드가 포함되어 있다는 전제에 의존한다.

export interface GenerationError {
  status: number;
  error: string;
}

export function mapGenerationError(err: unknown): GenerationError {
  const message = err instanceof Error ? err.message : 'Unknown error';

  if (message.includes('503')) {
    return { status: 503, error: 'API 서버가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해주세요.' };
  }

  if (message.includes('429')) {
    return { status: 429, error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' };
  }

  return { status: 500, error: message };
}
