import React, { useState } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Dashboard from './Dashboard';
import MyTrips from './MyTrips';
import TransactionHistory from './TransactionHistory';
import './OwnerDashboard.css';

const OwnerDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);

  if (user?.status === 'pending') {
    return (
      <div className="pending-screen">
        <div className="card">
          <h2>Verification Pending</h2>
          <p>Your account is pending verification. Please wait for admin approval.</p>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="btn btn-secondary"
            style={{ color: 'white' }}
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  if (user?.status !== 'active') {
    return <div>Access Denied</div>;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    if (path === '/owner') {
      return location.pathname === '/owner' || location.pathname === '/owner/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="dashboard">
      <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
        <span></span>
        <span></span>
        <span></span>
      </button>
      {menuOpen && (
        <div className="mobile-overlay" onClick={() => setMenuOpen(false)}></div>
      )}
      <nav
        className={`dashboard-nav ${menuOpen ? 'menu-open' : ''}`}
        style={{
          backgroundImage: 'url(/images/bagroundImage.png)'
        }}
      >
        <div className="vanatvam-header">
          <div className="vanatvam-logo-container">
            {!logoError ? (
              <img
                src="/images/logo.png"
                alt="Vanatvam Logo"
                className="vanatvam-logo"
                onError={() => setLogoError(true)}
              />
            ) : (
              <h1 className="vanatvam-title">
                <span className="vanatvam-text">Vanatvam</span>
              </h1>
            )}
          </div>
        </div>
        <div className="nav-links">
          <div className="nav-section-label">Explore</div>
          <Link
            to="/owner"
            className={isActive('/owner') && location.pathname === '/owner' ? 'active' : ''}
            onClick={() => setMenuOpen(false)}
          >
            <span className="nav-icon">🏡</span>
            <span className="nav-text">Cottages</span>
          </Link>

          <div className="nav-section-label">Bookings</div>
          <Link
            to="/owner/trips"
            className={isActive('/owner/trips') ? 'active' : ''}
            onClick={() => setMenuOpen(false)}
          >
            <span className="nav-icon">🎒</span>
            <span className="nav-text">My Trips</span>
          </Link>

          <div className="nav-section-label">Account</div>
          <Link
            to="/owner/transactions"
            className={isActive('/owner/transactions') ? 'active' : ''}
            onClick={() => setMenuOpen(false)}
          >
            <span className="nav-icon">🧾</span>
            <span className="nav-text">Transactions</span>
          </Link>
        </div>
        <div className="user-info">
          <div className="user-avatar">{user?.name?.charAt(0).toUpperCase() || 'U'}</div>
          <div className="user-name-text">{user?.name}</div>
          <button
            onClick={handleLogout}
            className="btn-logout"
            title="Sign Out"
          >
            <span className="logout-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </span>
          </button>
        </div>
      </nav>
      <div className="dashboard-content">
        <Routes>
          <Route path="" element={<Dashboard />} />
          <Route path="trips" element={<MyTrips />} />
          <Route path="transactions" element={<TransactionHistory />} />
        </Routes>
      </div>
    </div>
  );
};

export default OwnerDashboard;

