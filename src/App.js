import React, { useState } from 'react';
import logo from './assets/calvin-hobbes.jpg';
import './App.css';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LotrMap from './lotr/LotrMap';
import MediaReviews, { ComingSoon } from './media/MediaReviews';
import GameReviews from './media/GameReviews';
import AddGame from './media/AddGame';
import ExerciseTracker from './exercise/ExerciseTracker';
import ExerciseStats from './exercise/ExerciseStats';
import Login from './components/Login';
import Register from './components/Register';
import ProtectedRoute from './components/ProtectedRoute';

function Home() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} alt="calvin and hobbes" />
        <p>
          A personal site by Calvin Woods.
        </p>
      </header>
    </div>
  );
}

function Navigation() {
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = React.useRef(null);

  const toggleMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const closeMenu = () => setMobileMenuOpen(false);
  const toggleAccountMenu = () => setAccountMenuOpen(!accountMenuOpen);

  // Close account menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setAccountMenuOpen(false);
      }
    };

    if (accountMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [accountMenuOpen]);

  return (
    <nav className="App-nav">
      <div className="nav-container">
        <Link to="." className="nav-logo" onClick={closeMenu}>
          Calvin's Site
        </Link>

        <button className="nav-hamburger" onClick={toggleMenu} aria-label="Toggle menu">
          <span className={`hamburger-line ${mobileMenuOpen ? 'open' : ''}`}></span>
          <span className={`hamburger-line ${mobileMenuOpen ? 'open' : ''}`}></span>
          <span className={`hamburger-line ${mobileMenuOpen ? 'open' : ''}`}></span>
        </button>

        <div className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <Link to="." onClick={closeMenu}>Home</Link>
          <Link to="media-reviews" onClick={closeMenu}>Media Reviews</Link>
          <Link to="exercise-tracker" onClick={closeMenu}>Exercise Tracker</Link>
          {/* <Link to="lotr-map" onClick={closeMenu}>LOTR Map</Link> */}
          {user ? (
            <div className="nav-account-wrapper" ref={accountMenuRef}>
              <button onClick={toggleAccountMenu} className="nav-account-btn">
                Account ▾
              </button>
              {accountMenuOpen && (
                <div className="account-dropdown">
                  <div className="account-dropdown-username">{user.email.split('@')[0]}</div>
                  <button
                    onClick={() => {
                      signOut();
                      closeMenu();
                      setAccountMenuOpen(false);
                    }}
                    className="account-dropdown-logout"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="login" onClick={closeMenu}>Login</Link>
          )}
        </div>
      </div>
    </nav>
  );
}

function AppContent() {
  return (
    <div>
      <Navigation />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="lotr-map" element={<LotrMap />} />
        <Route path="media-reviews" element={<MediaReviews />}>
          <Route index element={<Navigate to="games" replace />} />
          <Route path="games" element={<GameReviews />} />
          <Route path="books" element={<ComingSoon icon="📚" title="Book reviews" />} />
          <Route path="shows" element={<ComingSoon icon="🎬" title="Movie and show reviews" />} />
        </Route>
        {/* Not linked in the nav on purpose */}
        <Route path="media-reviews/games/new" element={<AddGame />} />
        <Route path="media-reviews/new" element={<Navigate to="/media-reviews/games/new" replace />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route
          path="exercise-tracker"
          element={
            <ProtectedRoute>
              <ExerciseTracker />
            </ProtectedRoute>
          }
        />
        <Route
          path="exercise-stats"
          element={
            <ProtectedRoute>
              <ExerciseStats />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
