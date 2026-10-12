import React from 'react';
import { Outlet } from 'react-router-dom';
import PlayStationCard from './PlayStationCard';
import './PlayHistory.css';

// This page is logged-in-only (see the route in App.js)
export default function PlayHistory() {
  return (
    <div className="play-history-container">
      <header className="play-history-header">
        <h2>Play History</h2>
        <p className="play-history-subtitle">Nintendo and PlayStation</p>
      </header>

      <div className="play-history-grid">
        <section className="play-history-card playstation">
          <h3>PlayStation</h3>
          <PlayStationCard />
        </section>

        <section className="play-history-card nintendo">
          <h3>Nintendo</h3>
          <div className="play-history-empty">
            <div className="play-history-empty-icon" aria-hidden="true">🕹️</div>
            <p>Coming soon</p>
          </div>
        </section>
      </div>

      <Outlet />
    </div>
  );
}
