import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import './MediaReviews.css';

// Each tab is a child route of /media-reviews (see App.js)
const TABS = [
  { path: 'games', label: 'Games' },
  { path: 'books', label: 'Books' },
  { path: 'shows', label: 'Movies & Shows' },
];

export default function MediaReviews() {
  return (
    <div className="reviews-container">
      <header className="reviews-header">
        <h2>Media Reviews</h2>
        <nav className="reviews-tabs" aria-label="Media type">
          {TABS.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) => `reviews-tab ${isActive ? 'active' : ''}`}
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <Outlet />
    </div>
  );
}

export function ComingSoon({ icon, title }) {
  return (
    <div className="coming-soon">
      <div className="coming-soon-icon" aria-hidden="true">{icon}</div>
      <h3>{title} are coming soon</h3>
      <p>Nothing here yet. Check back later.</p>
    </div>
  );
}
