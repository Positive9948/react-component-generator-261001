import { useState, useLayoutEffect, useRef } from 'react';

interface CodeViewProps {
  code: string;
  /** 코드가 늘어날 때마다 맨 아래로 스크롤한다. 스트리밍 중에 사용한다. */
  follow?: boolean;
}

export function CodeView({ code, follow = false }: CodeViewProps) {
  const [copied, setCopied] = useState(false);
  const blockRef = useRef<HTMLPreElement>(null);

  useLayoutEffect(() => {
    if (follow && blockRef.current) {
      blockRef.current.scrollTop = blockRef.current.scrollHeight;
    }
  }, [code, follow]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-panel">
      <div className="code-toolbar">
        <span>{code.split('\n').length}줄</span>
        <button className="btn" onClick={handleCopy}>
          {copied ? '복사됨' : '코드 복사'}
        </button>
      </div>
      <pre className="code-block" ref={blockRef}>
        <code>{code}</code>
      </pre>
    </div>
  );
}
