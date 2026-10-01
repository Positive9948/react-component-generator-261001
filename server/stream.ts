// 프로바이더 스트리밍 응답을 다루는 순수 함수들.
// 부수효과(Bun.serve 등)가 없어 단위 테스트가 가능하다.
import { stripCodeFences, ensureRenderCall } from './generator';
import { mapGenerationError } from './errors';

/** SSE 바이트 스트림을 읽어 이벤트마다 data 값을 내보낸다. */
export async function* parseSSE(stream: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    // CR과 LF가 청크 경계에서 나뉠 수 있으므로 누적된 버퍼 전체를 정규화한다.
    buffer = (buffer + decoder.decode(value, { stream: true })).replace(/\r\n/g, '\n');

    let boundary: number;
    while ((boundary = buffer.indexOf('\n\n')) !== -1) {
      const event = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const data = event
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n');
      if (data) yield data;
    }
  }
}

/** Anthropic Messages 스트림 이벤트에서 생성 텍스트 조각만 내보낸다. */
export async function* anthropicTextDeltas(events: AsyncIterable<string>): AsyncGenerator<string> {
  for await (const data of events) {
    const event = JSON.parse(data) as {
      type: string;
      delta?: { type: string; text?: string };
      error?: { message: string };
    };
    if (event.type === 'error') {
      throw new Error(`Claude API error: ${event.error?.message}`);
    }
    if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta' && event.delta.text) {
      yield event.delta.text;
    }
  }
}

/** Gemini streamGenerateContent 응답 청크에서 생성 텍스트 조각만 내보낸다. */
export async function* googleTextDeltas(events: AsyncIterable<string>): AsyncGenerator<string> {
  for await (const data of events) {
    const chunk = JSON.parse(data) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        finishReason?: string;
      }>;
    };
    const candidate = chunk.candidates?.[0];
    const text = candidate?.content?.parts?.map((part) => part.text ?? '').join('');
    if (text) yield text;
    if (candidate?.finishReason === 'MAX_TOKENS') {
      throw new Error('생성된 코드가 너무 길어 잘렸습니다. 더 간단한 컴포넌트를 요청해주세요.');
    }
  }
}

/**
 * 생성 텍스트 조각을 NDJSON 이벤트 스트림으로 변환한다.
 * 조각마다 `delta`를 보내고, 끝나면 전체 텍스트를 정규화한 코드를 `done`으로 보낸다.
 */
export function toGenerationStream(deltas: AsyncIterable<string>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      const send = (event: object) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      let text = '';

      try {
        for await (const delta of deltas) {
          text += delta;
          send({ type: 'delta', text: delta });
        }
        send({ type: 'done', code: ensureRenderCall(stripCodeFences(text)) });
      } catch (err) {
        // 응답 상태 코드는 이미 200으로 나갔으므로 에러는 이벤트로 전달한다.
        send({ type: 'error', error: mapGenerationError(err).error });
      }
      controller.close();
    },
  });
}
