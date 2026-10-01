import { describe, it, expect } from 'vitest';
import { readNdjson } from './readNdjson';

const streamOf = (...chunks: string[]) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });

describe('readNdjson', () => {
  it('청크 경계에서 나뉜 줄도 합쳐서 한 줄씩 JSON으로 파싱한다', async () => {
    const values: unknown[] = [];

    for await (const value of readNdjson(streamOf('{"n":', '1}\n{"n":2}\n'))) {
      values.push(value);
    }

    expect(values).toEqual([{ n: 1 }, { n: 2 }]);
  });
});
