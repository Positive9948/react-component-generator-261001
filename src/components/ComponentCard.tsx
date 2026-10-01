import { useState } from 'react';
import type { GeneratedComponent } from '../types';
import { LivePreview } from './LivePreview';
import { CodeView } from './CodeView';
import { TitleBar } from './TitleBar';

interface ComponentCardProps {
  component: GeneratedComponent;
  onRemove: (id: string) => void;
  onRegenerate: (prompt: string) => void;
  isLoading: boolean;
  autoRun?: boolean;
  /** 코드를 받는 중이면 코드 탭에서 실시간으로 보여준다. */
  isStreaming?: boolean;
}

type Tab = 'preview' | 'code';

export function ComponentCard({
  component,
  onRemove,
  onRegenerate,
  isLoading,
  autoRun = true,
  isStreaming = false,
}: ComponentCardProps) {
  const [activeTab, setActiveTab] = useState<Tab>(isStreaming ? 'code' : 'preview');
  const [wasStreaming, setWasStreaming] = useState(isStreaming);
  const [previewKey, setPreviewKey] = useState(0);

  // 스트리밍이 끝나는 순간 미리보기 탭으로 전환한다. (렌더 중 상태 조정 패턴)
  if (wasStreaming !== isStreaming) {
    setWasStreaming(isStreaming);
    if (!isStreaming) setActiveTab('preview');
  }
  const [isRunning, setIsRunning] = useState(autoRun);
  const createdAt = component.createdAt.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <article className="window component-card">
      <TitleBar
        title={isStreaming ? '코드 생성 중...' : `${createdAt}에 생성`}
        onClose={() => onRemove(component.id)}
        closeLabel="이 컴포넌트 삭제"
      />
      <div className="card-header">
        <p className="card-prompt">{component.prompt}</p>
        <div className="card-actions">
          <button
            className="btn"
            onClick={() => setPreviewKey((k) => k + 1)}
            title="애니메이션을 처음부터 다시 재생합니다"
          >
            새로고침
          </button>
          <button
            className="btn"
            onClick={() => onRegenerate(component.prompt)}
            disabled={isLoading}
          >
            {isLoading ? '생성 중...' : '재생성'}
          </button>
        </div>
      </div>
      <div className="card-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'preview'}
          className={`tab ${activeTab === 'preview' ? 'tab--active' : ''}`}
          onClick={() => setActiveTab('preview')}
          disabled={isStreaming}
        >
          미리보기
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'code'}
          className={`tab ${activeTab === 'code' ? 'tab--active' : ''}`}
          onClick={() => setActiveTab('code')}
        >
          코드
        </button>
      </div>
      <div className="card-content" role="tabpanel">
        {activeTab === 'code' ? (
          <CodeView code={component.code} follow={isStreaming} />
        ) : isRunning ? (
          <LivePreview key={previewKey} code={component.code} />
        ) : (
          <div className="preview-render preview-paused">
            <p>이전 세션에서 복원된 컴포넌트입니다.</p>
            <button className="btn" onClick={() => setIsRunning(true)}>
              미리보기 실행
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
