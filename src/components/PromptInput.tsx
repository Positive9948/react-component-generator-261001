import { useState } from 'react';
import { MAX_PROMPT_LENGTH, validatePrompt } from '../utils/validatePrompt';

interface PromptInputProps {
  onGenerate: (prompt: string) => void;
  isLoading: boolean;
  history?: string[];
}

const EXAMPLES = [
  'SaaS 관리자용 KPI 카드 3개. 매출, 활성 사용자, 전환율을 비교 가능한 형태로 표시',
  '설정 페이지의 알림 토글 패널. 이메일, 슬랙, 주간 리포트 옵션 포함',
  '검색 필터 바. 상태, 담당자, 날짜 범위를 선택하고 결과 수를 보여주는 UI',
  '온보딩 체크리스트. 5단계 진행률과 완료/대기 상태를 보여주는 카드',
  '요금제 비교 카드 3개. 추천 플랜을 강조하고 CTA 버튼 포함',
  '테이블 행 상세보기 패널. 선택한 고객의 기본 정보와 최근 활동 표시',
];

export function PromptInput({ onGenerate, isLoading, history = [] }: PromptInputProps) {
  const [prompt, setPrompt] = useState('');
  const trimmedPrompt = prompt.trim();
  const validationError = validatePrompt(prompt);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (trimmedPrompt && !validationError && !isLoading) {
      onGenerate(trimmedPrompt);
    }
  };

  const handleExampleClick = (example: string) => {
    setPrompt(example);
  };

  return (
    <div className="prompt-section">
      <h2 className="prompt-heading">무엇을 만들까요?</h2>
      <p className="prompt-lede">화면 구성과 들어갈 데이터를 구체적으로 적을수록 결과가 정확해집니다.</p>
      <form onSubmit={handleSubmit} className="prompt-form">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="예: 고객 목록 테이블 위에 들어갈 검색 필터 바를 만들어줘. 상태, 담당자, 날짜 범위 필터가 필요해."
          className="prompt-textarea"
          rows={4}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleSubmit(e);
            }
          }}
        />
        {validationError && (
          <p className="prompt-error" role="alert">
            {validationError}
          </p>
        )}
        <div className="prompt-actions">
          <span className="prompt-count">
            {trimmedPrompt.length}/{MAX_PROMPT_LENGTH}
          </span>
          <span className="prompt-hint">⌘ 또는 Ctrl + Enter로도 생성됩니다</span>
          <button
            type="submit"
            className="btn btn--default"
            disabled={!trimmedPrompt || !!validationError || isLoading}
          >
            {isLoading ? '생성 중...' : '컴포넌트 생성'}
          </button>
        </div>
      </form>
      {history.length > 0 && (
        <div className="prompt-history">
          <h3 className="examples-label" id="prompt-history-label">
            최근 프롬프트
          </h3>
          <ul aria-labelledby="prompt-history-label">
            {history.map((item) => (
              <li key={item}>
                <button
                  className="example-item history-item"
                  onClick={() => setPrompt(item)}
                  type="button"
                >
                  {item}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="prompt-examples">
        <h3 className="examples-label">예시로 시작하기</h3>
        <ul>
          {EXAMPLES.map((example) => (
            <li key={example}>
              <button
                className="example-item"
                onClick={() => handleExampleClick(example)}
                type="button"
              >
                {example}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
