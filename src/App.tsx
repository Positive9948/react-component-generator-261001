import { useState, useEffect } from 'react';
import { PromptInput } from './components/PromptInput';
import { ComponentCard } from './components/ComponentCard';
import { TitleBar } from './components/TitleBar';
import { useComponentGenerator } from './hooks/useComponentGenerator';
import { usePersistentState } from './hooks/usePersistentState';
import { parseHistory, parseProvider } from './utils/parsePersisted';
import { addPromptToHistory } from './utils/promptHistory';
import { STORAGE_KEYS } from './utils/storage';
import type { Provider } from './types';
import './App.css';

const PROVIDER_CONFIG = {
  anthropic: { label: 'Anthropic', placeholder: 'sk-ant-...' },
  google: { label: 'Google', placeholder: 'AIza...' },
} as const;

function App() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [provider, setProvider] = usePersistentState(STORAGE_KEYS.provider, parseProvider);
  const [promptHistory, setPromptHistory] = usePersistentState(
    STORAGE_KEYS.promptHistory,
    parseHistory,
  );
  const [envKeys, setEnvKeys] = useState<Record<Provider, boolean>>({
    anthropic: false,
    google: false,
  });
  const { components, isLoading, error, generate, removeComponent, clearAll } =
    useComponentGenerator();

  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => setEnvKeys(data.envKeys))
      .catch(() => {});
  }, []);

  const hasEnvKey = envKeys[provider];

  const handleGenerate = (prompt: string) => {
    if (!apiKey.trim() && !hasEnvKey) {
      alert(`${PROVIDER_CONFIG[provider].label} API 키를 입력하거나 .env에 설정해주세요.`);
      return;
    }
    setPromptHistory((prev) => addPromptToHistory(prev, prompt));
    generate(prompt, apiKey || undefined, provider);
  };

  const handleProviderChange = (newProvider: Provider) => {
    setProvider(newProvider);
    setApiKey('');
  };

  const activeProvider = PROVIDER_CONFIG[provider].label;

  return (
    <div className="desktop">
      <header className="menubar">
        <h1 className="menubar-title">
          <svg className="menubar-icon" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M4 1h11v10h-1V2H4z" />
            <path d="M1 4h11v11H1z" />
            <path fill="#fff" d="M2 5h9v9H2z" />
            <path d="M3 7h7v1H3zM3 9h5v1H3zM3 11h6v1H3z" />
          </svg>
          React 컴포넌트 생성기
        </h1>
        <dl className="menubar-status" aria-label="현재 작업 상태">
          <div>
            <dt>제공자</dt>
            <dd>{activeProvider}</dd>
          </div>
          <div>
            <dt>컴포넌트</dt>
            <dd>{components.length}개</dd>
          </div>
        </dl>
      </header>

      <div className="app">
        <main className="workspace">
          <section className="window window--prompt" aria-label="컴포넌트 생성">
            <TitleBar title="새 컴포넌트" />
            <div className="window-body">
              <PromptInput
                onGenerate={handleGenerate}
                isLoading={isLoading}
                history={promptHistory}
              />
            </div>
          </section>

          <aside className="window window--settings" aria-label="실행 설정">
            <TitleBar title="실행 설정" />
            <div className="window-body">
              <fieldset className="provider-group">
                <legend>AI 제공자</legend>
                {Object.entries(PROVIDER_CONFIG).map(([key, { label }]) => (
                  <label key={key} className="radio">
                    <input
                      type="radio"
                      name="provider"
                      value={key}
                      checked={provider === key}
                      onChange={() => handleProviderChange(key as Provider)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </fieldset>

              <div className="api-key-input">
                <label htmlFor="api-key">API 키</label>
                <div className="api-key-field">
                  <input
                    id="api-key"
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={
                      hasEnvKey ? '서버 키 사용 중' : PROVIDER_CONFIG[provider].placeholder
                    }
                  />
                  <button className="btn" onClick={() => setShowKey(!showKey)} type="button">
                    {showKey ? '숨기기' : '보기'}
                  </button>
                </div>
                <p className={`key-status ${hasEnvKey ? 'key-status--ready' : ''}`}>
                  {hasEnvKey
                    ? '서버 .env 키를 사용합니다. 직접 입력하면 이 키가 우선합니다.'
                    : '키를 직접 입력하거나 서버 .env에 설정하세요.'}
                </p>
              </div>
            </div>
          </aside>
        </main>

        {error && (
          <div className="alert" role="alert">
            <svg className="alert-icon" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M7 1h2v1h1v2h1v2h1v2h1v2h1v2h1v3H1v-3h1v-2h1V8h1V6h1V4h1V2h1z" />
              <path fill="#fff" d="M7 5h2v5H7zM7 11h2v2H7z" />
            </svg>
            <div>
              <h2>컴포넌트를 생성하지 못했습니다</h2>
              <p>{error}</p>
            </div>
          </div>
        )}

        <section className="results-section" aria-label="생성된 컴포넌트">
          {components.length > 0 && (
            <div className="results-header">
              <h2>
                생성된 컴포넌트 <span>{components.length}개</span>
              </h2>
              <button className="btn" onClick={clearAll}>
                전체 삭제
              </button>
            </div>
          )}

          {isLoading && (
            <div className="window loading-window">
              <TitleBar title="생성 중" />
              <div className="window-body">
                <p>{activeProvider}로 컴포넌트를 만들고 있습니다.</p>
                <div
                  className="progress"
                  role="progressbar"
                  aria-label="컴포넌트 생성 진행 중"
                />
              </div>
            </div>
          )}

          {components.length === 0 && !isLoading && (
            <div className="empty-state">
              <svg className="empty-icon" viewBox="0 0 32 32" aria-hidden="true">
                <path d="M9 2h21v20h-2V4H9z" />
                <path d="M5 6h21v20h-2V8H5z" />
                <path d="M1 10h21v21H1z" />
                <path fill="#fff" d="M3 12h17v17H3z" />
                <path d="M5 15h13v2H5zM5 19h9v2H5zM5 23h11v2H5z" />
              </svg>
              <h2>아직 만든 컴포넌트가 없습니다</h2>
              <p>위 창에 원하는 UI를 설명하고 컴포넌트 생성을 누르면, 결과가 여기에 카드로 쌓입니다.</p>
            </div>
          )}

          <div className="results-stack">
            {components.map((component) => (
              <ComponentCard
                key={component.id}
                component={component}
                onRemove={removeComponent}
                onRegenerate={handleGenerate}
                isLoading={isLoading}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;
