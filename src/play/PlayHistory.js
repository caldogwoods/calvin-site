import React from 'react';
import { Outlet } from 'react-router-dom';
import './PlayHistory.css';

const PLATFORMS = [
  { key: 'playstation', name: 'PlayStation', icon: '🎮' },
  { key: 'nintendo', name: 'Nintendo', icon: '🕹️' },
];

// This page is logged-in-only (see the route in App.js)
export default function PlayHistory() {
  return (
    <div className="play-history-container">
      <header className="play-history-header">
        <h2>Play History</h2>
        <p className="play-history-subtitle">Nintendo and PlayStation</p>
      </header>

      <div className="play-history-grid">
        {PLATFORMS.map((platform) => (
          <section key={platform.key} className={`play-history-card ${platform.key}`}>
            <h3>{platform.name}</h3>
            <div className="play-history-empty">
              <div className="play-history-empty-icon" aria-hidden="true">{platform.icon}</div>
              <p>Coming soon</p>
            </div>
          </section>
        ))}
      </div>

      <Outlet />
    </div>
  );
}
