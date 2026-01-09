import React from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
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

  return (
    <div className="dashboard">
      <nav className="dashboard-nav">
        <h1>Vanatvam</h1>
        <div className="nav-links">
          <Link to="/owner">📊 Dashboard</Link>
          <Link to="/owner/book">🏠 Book Cottage</Link>
          <Link to="/owner/trips">🎒 My Trips</Link>
          <Link to="/owner/quota">💰 Quota Status</Link>
          <Link to="/owner/transactions">📜 Transaction History</Link>
        </div>
        <div className="user-info">
          <span>{user?.name}</span>
          <button 
            onClick={handleLogout} 
            className="btn btn-secondary"
            style={{ color: 'white' }}
          >
            Logout
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

