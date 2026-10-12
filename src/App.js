import React, { useState } from 'react';
import logo from './assets/calvin-hobbes.jpg';
import './App.css';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LotrMap from './lotr/LotrMap';
import MediaReviews from './media/MediaReviews';
import ReviewTable from './media/ReviewTable';
import { TYPE_KEYS } from './media/mediaTypes';
import AddReview from './media/AddReview';
import ExerciseTracker from './exercise/ExerciseTracker';
import ExerciseStats from './exercise/ExerciseStats';
import Login from './components/Login';
import Register from './components/Register';
import PlayHistory from './play/PlayHistory';
import PsnGameTrophies from './play/PsnGameTrophies';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import PaletteSwitcher from './components/PaletteSwitcher';

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
  const location = useLocation();
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
          <Link to="play-history" onClick={closeMenu}>Play History</Link>
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
            // Come back to this page after logging in (unless already on login/register)
            <Link
              to="login"
              state={['/login', '/register'].includes(location.pathname) ? location.state : { from: location }}
              onClick={closeMenu}
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

function AppContent() {
  const { isAdmin } = useAuth();
  return (
    <div>
      <Navigation />
      {/* Palette preview (src/theme.css): always in development, and for the admin on the live site */}
      {(process.env.NODE_ENV === 'development' || isAdmin) && <PaletteSwitcher />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="lotr-map" element={<LotrMap />} />
        <Route path="media-reviews" element={<MediaReviews />}>
          <Route index element={<Navigate to="games" replace />} />
          {/* key resets sort and open rows when switching tabs */}
          {TYPE_KEYS.map((type) => (
            <Route key={type} path={type} element={<ReviewTable key={type} type={type} />} />
          ))}
        </Route>
        <Route
          path="media-reviews/new"
          element={
            <AdminRoute>
              <AddReview />
            </AdminRoute>
          }
        />
        <Route path="media-reviews/games/new" element={<Navigate to="/media-reviews/new?type=games" replace />} />
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
        <Route
          path="play-history"
          element={
            <ProtectedRoute>
              <PlayHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="play-history/playstation/:titleId"
          element={
            <ProtectedRoute>
              <PsnGameTrophies />
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
