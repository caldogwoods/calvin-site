import React from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import './MediaReviews.css';

// Each tab is a child route of /media-reviews (see App.js)
const TABS = [
  { path: 'games', label: 'Games' },
  { path: 'books', label: 'Books' },
  { path: 'shows', label: 'Movies & Shows' },
];

export default function MediaReviews() {
  const { pathname } = useLocation();
  // Start the add form on the type of the open tab
  const currentTab = TABS.find((tab) => pathname.endsWith(`/${tab.path}`));
  const addUrl = `/media-reviews/new${currentTab ? `?type=${currentTab.path}` : ''}`;

  return (
    <div className="reviews-container">
      <header className="reviews-header">
        <div className="reviews-title-row">
          <h2>Media Reviews</h2>
          {/* Shown to everyone; the add page itself is admin-only */}
          <Link to={addUrl} className="add-review-button">
            <span aria-hidden="true">+</span> Add review
          </Link>
        </div>
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
