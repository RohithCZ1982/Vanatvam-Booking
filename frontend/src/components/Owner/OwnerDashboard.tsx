import React, { useState } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Dashboard from './Dashboard';
import BookingCalendar from './BookingCalendar';
import MyTrips from './MyTrips';
import QuotaStatus from './QuotaStatus';
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
          <Link
            to="/owner"
            className={isActive('/owner') && location.pathname === '/owner' ? 'active' : ''}
          >
            <span className="nav-icon">📊</span>
            <span className="nav-text">Dashboard</span>
          </Link>
          <Link
            to="/owner/book"
            className={isActive('/owner/book') ? 'active' : ''}
          >
            <span className="nav-icon">🏠</span>
            <span className="nav-text">Book Cottage</span>
          </Link>
          <Link
            to="/owner/trips"
            className={isActive('/owner/trips') ? 'active' : ''}
          >
            <span className="nav-icon">🎒</span>
            <span className="nav-text">My Trips</span>
          </Link>
          <Link
            to="/owner/quota"
            className={isActive('/owner/quota') ? 'active' : ''}
          >
            <span className="nav-icon">💰</span>
            <span className="nav-text">Quota Status</span>
          </Link>
          <Link
            to="/owner/transactions"
            className={isActive('/owner/transactions') ? 'active' : ''}
          >
            <span className="nav-icon">📜</span>
            <span className="nav-text">Transaction History</span>
          </Link>
        </div>
        <div className="user-info">
          <div className="user-details">
            <div className="user-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</div>
            <div className="user-name-text">{user?.name}</div>
          </div>
          <button
            onClick={handleLogout}
            className="btn-logout"
          >
            <span className="logout-icon">↪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </nav>
      <div className="dashboard-content">
        <Routes>
          <Route path="" element={<Dashboard />} />
          <Route path="book" element={<BookingCalendar />} />
          <Route path="trips" element={<MyTrips />} />
          <Route path="quota" element={<QuotaStatus />} />
          <Route path="transactions" element={<TransactionHistory />} />
        </Routes>
      </div>
    </div>
  );
};

export default OwnerDashboard;

