import { describe, it, expect } from 'vitest';
import { parseSSE, anthropicTextDeltas, googleTextDeltas, toGenerationStream } from './stream';

const streamOf = (...chunks: string[]) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });

async function* itemsOf<T>(...items: T[]) {
  yield* items;
}

const collect = async <T>(iterable: AsyncIterable<T>) => {
  const items: T[] = [];
  for await (const item of iterable) items.push(item);
  return items;
};

const readEvents = async (stream: ReadableStream<Uint8Array>) => {
  const text = await new Response(stream).text();
  return text.trim().split('\n').map((line) => JSON.parse(line));
};

describe('parseSSE', () => {
  it('빈 줄로 구분된 이벤트의 data 값을 순서대로 내보낸다', async () => {
    const stream = streamOf('event: a\ndata: {"n":1}\n\nevent: b\ndata: {"n":2}\n\n');

    expect(await collect(parseSSE(stream))).toEqual(['{"n":1}', '{"n":2}']);
  });

  it('CRLF 줄바꿈으로 구분된 이벤트도 읽는다', async () => {
    const stream = streamOf('data: {"n":1}\r\n\r\ndata: {"n":2}\r\n\r\n');

    expect(await collect(parseSSE(stream))).toEqual(['{"n":1}', '{"n":2}']);
  });

  it('청크 경계에서 CR과 LF가 나뉘어도 이벤트를 읽는다', async () => {
    const stream = streamOf('data: {"n":1}\r', '\n\r', '\n');

    expect(await collect(parseSSE(stream))).toEqual(['{"n":1}']);
  });
});

describe('anthropicTextDeltas', () => {
  it('text_delta 이벤트의 텍스트만 순서대로 내보낸다', async () => {
    const events = itemsOf(
      JSON.stringify({ type: 'message_start', message: {} }),
      JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: 'const A' } }),
      JSON.stringify({ type: 'ping' }),
      JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: ' = 1;' } }),
      JSON.stringify({ type: 'message_stop' }),
    );

    expect(await collect(anthropicTextDeltas(events))).toEqual(['const A', ' = 1;']);
  });

  it('스트림 도중 error 이벤트를 받으면 에러를 던진다', async () => {
    const events = itemsOf(
      JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: 'const A' } }),
      JSON.stringify({ type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' } }),
    );

    await expect(collect(anthropicTextDeltas(events))).rejects.toThrow('Claude API error: Overloaded');
  });
});

describe('googleTextDeltas', () => {
  it('각 응답 청크의 parts 텍스트를 순서대로 내보낸다', async () => {
    const events = itemsOf(
      JSON.stringify({ candidates: [{ content: { parts: [{ text: 'const A' }] } }] }),
      JSON.stringify({ candidates: [{ content: { parts: [{ text: ' = 1;' }] }, finishReason: 'STOP' }] }),
    );

    expect(await collect(googleTextDeltas(events))).toEqual(['const A', ' = 1;']);
  });

  it('finishReason이 MAX_TOKENS면 코드가 잘렸다는 에러를 던진다', async () => {
    const events = itemsOf(
      JSON.stringify({ candidates: [{ content: { parts: [{ text: 'const A' }] }, finishReason: 'MAX_TOKENS' }] }),
    );

    await expect(collect(googleTextDeltas(events))).rejects.toThrow('생성된 코드가 너무 길어 잘렸습니다');
  });
});

describe('toGenerationStream', () => {
  it('텍스트 조각을 delta 이벤트로 보내고 마지막에 정규화된 코드를 done 이벤트로 보낸다', async () => {
    const deltas = itemsOf('```jsx\nconst Card = () => <div />;', '\n```');

    expect(await readEvents(toGenerationStream(deltas))).toEqual([
      { type: 'delta', text: '```jsx\nconst Card = () => <div />;' },
      { type: 'delta', text: '\n```' },
      { type: 'done', code: 'const Card = () => <div />;\n\nrender(<Card />);' },
    ]);
  });

  it('생성 도중 에러가 나면 사용자용 메시지를 담은 error 이벤트를 보내고 스트림을 닫는다', async () => {
    async function* failing() {
      yield 'const A';
      throw new Error('Claude API error: 429');
    }

    expect(await readEvents(toGenerationStream(failing()))).toEqual([
      { type: 'delta', text: 'const A' },
      { type: 'error', error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
    ]);
  });
});
