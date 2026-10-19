import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import './ExerciseLayout.css';

// Each tab is a child route of /exercise-tracker (see App.js)
const TABS = [
  { to: '/exercise-tracker', label: 'Activities', end: true },
  { to: '/exercise-tracker/one-punch-man', label: 'One Punch Man' },
];

export default function ExerciseLayout() {
  return (
    <>
      <div className="exercise-tabs-wrapper">
        <nav className="exercise-tabs" aria-label="Exercise pages">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) => `exercise-tab ${isActive ? 'active' : ''}`}
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <Outlet />
    </>
  );
}
