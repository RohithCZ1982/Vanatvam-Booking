import React, { useState } from 'react';
import { Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
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

  return (
    <div className="dashboard">
      <nav className="dashboard-nav">
        <div className="vanatvam-header">
          <h1 className="vanatvam-title">
            <span className="vanatvam-text">Vanatvam</span>
          </h1>
          <div className="user-name-display">{user?.name}</div>
        </div>
        <div className="nav-links">
          <Link to="/admin">📅 Dashboard</Link>
          <Link to="/admin/member-lookup">🔍 Member Lookup</Link>
          <Link to="/admin/pending-members" style={{fontWeight: 'bold', backgroundColor: '#34495e'}}>📋 Pending Members</Link>
          <Link to="/admin/quota-adjustment">💰 Quota Adjustment</Link>
          <Link to="/admin/inventory-health">🏥 Inventory Health</Link>
          <Link to="/admin/approval-queue">✅ Approval Queue</Link>
          <Link to="/admin/maintenance">🔧 Maintenance</Link>
          <Link to="/admin/settings">⚙️ Settings</Link>
        </div>
        <div className="user-info">
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

