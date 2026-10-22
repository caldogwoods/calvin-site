import React from 'react';
import { useSearchParams } from 'react-router-dom';
import './LanguageStudy.css';

const TABS = [
  { key: 'korean', label: 'Korean 🇰🇷', nothingHereText: '아직 내용이 없습니다.' },
  { key: 'japanese', label: 'Japanese 🇯🇵', nothingHereText: 'まだ内容がありません。' },
];

function LanguagePanel({ tab }) {
  return (
    <div className="coming-soon">
      <h3>{tab.label}</h3>
      <p>{tab.nothingHereText || 'Nothing here yet.'}</p>
    </div>
  );
}

export default function LanguageStudy() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTab = TABS.find((tab) => tab.key === searchParams.get('lang')) || TABS[0];

  const selectTab = (tab) => {
    setSearchParams({ lang: tab.key }, { replace: true });
  };

  return (
    <div className="languages-container">
      <header className="languages-header">
        <div className="languages-title-row">
          <h2>Language Study</h2>
        </div>
        <div className="languages-tabs" role="tablist" aria-label="Language options">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              id={`language-tab-${tab.key}`}
              aria-selected={tab.key === selectedTab.key}
              aria-controls="language-panel"
              className={`languages-tab ${tab.key === selectedTab.key ? 'active' : ''}`}
              onClick={() => {
                selectTab(tab);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>
      <div id="language-panel" role="tabpanel" aria-labelledby={`language-tab-${selectedTab.key}`}>
        <LanguagePanel tab={selectedTab} />
      </div>
    </div>
  );
}
