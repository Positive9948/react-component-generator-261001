// 테스트가 원하는 시점에 NDJSON 이벤트를 하나씩 흘려보낼 수 있는 응답 스트림
export const controllableStream = () => {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });
  const encoder = new TextEncoder();
  return {
    stream,
    send: (event: object) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`)),
    close: () => controller.close(),
  };
};

// 이벤트를 한 번에 담은 NDJSON 응답
export const ndjsonResponse = (...events: object[]) =>
  new Response(events.map((event) => `${JSON.stringify(event)}\n`).join(''));
