import React from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

// Like ProtectedRoute, but the user must also be an admin (see AuthContext).
// Logged-out users go to the login page and come back here after they log in.
export default function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>No access</h2>
          <p>This page is only for the site admin.</p>
          {/* Shown so the admin can copy it into REACT_APP_ADMIN_USER_IDS */}
          <p style={{ fontSize: 13, color: 'var(--text-muted)', wordBreak: 'break-all' }}>
            Your user id: <code>{user.id}</code>
          </p>
          <div className="auth-link">
            <Link to="/media-reviews">← Back to Media Reviews</Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
