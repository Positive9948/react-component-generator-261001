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
}

type Tab = 'preview' | 'code';

export function ComponentCard({
  component,
  onRemove,
  onRegenerate,
  isLoading,
  autoRun = true,
}: ComponentCardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('preview');
  const [previewKey, setPreviewKey] = useState(0);
  const [isRunning, setIsRunning] = useState(autoRun);
  const createdAt = component.createdAt.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <article className="window component-card">
      <TitleBar
        title={`${createdAt}에 생성`}
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
          <CodeView code={component.code} />
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
