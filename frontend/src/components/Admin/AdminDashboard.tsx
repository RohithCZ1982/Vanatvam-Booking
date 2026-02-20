import React, { useState } from 'react';
import { Routes, Route, Link, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import PendingMembers from './PendingMembers';
import MemberActivation from './MemberActivation';
import MemberLookup from './MemberLookup';
import EditMember from './EditMember';
import QuotaAdjustment from './QuotaAdjustment';
import Settings from './Settings';
import MaintenanceBlocking from './MaintenanceBlocking';
import InventoryHealth from './InventoryHealth';
import ApprovalQueue from './ApprovalQueue';
import BookingDecision from './BookingDecision';
import HolidayConfiguration from './HolidayConfiguration';
import PeakSeasonManagement from './PeakSeasonManagement';
import QuotaReset from './QuotaReset';
import BookingsCalendar from './BookingsCalendar';
import './AdminDashboard.css';

const AdminDashboard: React.FC = () => {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (user?.role !== 'admin') {
    return <div className="card"><h2>Access Denied</h2><p>You must be an admin to access this page.</p></div>;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin' || location.pathname === '/admin/';
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
          <Link
            to="/admin"
            className={isActive('/admin') && location.pathname === '/admin' ? 'active' : ''}
            onClick={() => setMenuOpen(false)}
          >
            <span className="nav-icon">📅</span>
            <span className="nav-text">Dashboard</span>
          </Link>
          <Link
            to="/admin/member-lookup"
            className={isActive('/admin/member-lookup') ? 'active' : ''}
            onClick={() => setMenuOpen(false)}
          >
            <span className="nav-icon">🔍</span>
            <span className="nav-text">Member Lookup</span>
          </Link>
          <Link
            to="/admin/pending-members"
            className={isActive('/admin/pending-members') ? 'active' : ''}
            onClick={() => setMenuOpen(false)}
          >
            <span className="nav-icon">📋</span>
            <span className="nav-text">Pending Members</span>
          </Link>
          <Link
            to="/admin/quota-adjustment"
            className={isActive('/admin/quota-adjustment') ? 'active' : ''}
            onClick={() => setMenuOpen(false)}
          >
            <span className="nav-icon">💰</span>
            <span className="nav-text">Quota Adjustment</span>
          </Link>
          <Link
            to="/admin/inventory-health"
            className={isActive('/admin/inventory-health') ? 'active' : ''}
            onClick={() => setMenuOpen(false)}
          >
            <span className="nav-icon">🏥</span>
            <span className="nav-text">Inventory Health</span>
          </Link>
          <Link
            to="/admin/approval-queue"
            className={isActive('/admin/approval-queue') ? 'active' : ''}
            onClick={() => setMenuOpen(false)}
          >
            <span className="nav-icon">✅</span>
            <span className="nav-text">Approval Queue</span>
          </Link>
          <Link
            to="/admin/maintenance"
            className={isActive('/admin/maintenance') ? 'active' : ''}
            onClick={() => setMenuOpen(false)}
          >
            <span className="nav-icon">🔧</span>
            <span className="nav-text">Maintenance</span>
          </Link>
          <Link
            to="/admin/settings"
            className={isActive('/admin/settings') ? 'active' : ''}
            onClick={() => setMenuOpen(false)}
          >
            <span className="nav-icon">⚙️</span>
            <span className="nav-text">Settings</span>
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
          <Route path="pending-members" element={<PendingMembers />} />
          <Route path="activate-member/:userId" element={<MemberActivation />} />
          <Route path="member-lookup" element={<MemberLookup />} />
          <Route path="edit-member/:userId" element={<EditMember />} />
          <Route path="quota-adjustment" element={<QuotaAdjustment />} />
          <Route path="settings" element={<Settings />} />
          <Route path="maintenance" element={<MaintenanceBlocking />} />
          <Route path="inventory-health" element={<InventoryHealth />} />
          <Route path="approval-queue" element={<ApprovalQueue />} />
          <Route path="booking-decision/:bookingId" element={<BookingDecision />} />
          <Route path="holidays" element={<HolidayConfiguration />} />
          <Route path="peak-seasons" element={<PeakSeasonManagement />} />
          <Route path="quota-reset" element={<QuotaReset />} />
          <Route path="" element={<BookingsCalendar />} />
        </Routes>
      </div>
    </div>
  );
};

export default AdminDashboard;

