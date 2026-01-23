import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import './AdminList.css';

interface Admin {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: string;
  created_at: string;
}

const AdminList: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<{ [key: number]: boolean }>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/admins');
      setAdmins(response.data);
      setError('');
    } catch (err: any) {
      console.error('Error fetching admins:', err);
      setError(err.response?.data?.detail || 'Failed to fetch admin users');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (adminId: number, adminName: string) => {
    if (!window.confirm(`Are you sure you want to deactivate ${adminName}?`)) {
      return;
    }

    setActionLoading({ ...actionLoading, [adminId]: true });
    setError('');
    setSuccess('');

    try {
      await api.post(`/api/admin/deactivate-admin/${adminId}`);
      setSuccess(`${adminName} has been deactivated successfully`);
      fetchAdmins();
    } catch (err: any) {
      console.error('Error deactivating admin:', err);
      setError(err.response?.data?.detail || 'Failed to deactivate admin');
    } finally {
      setActionLoading({ ...actionLoading, [adminId]: false });
    }
  };

  const handleReactivate = async (adminId: number, adminName: string) => {
    if (!window.confirm(`Are you sure you want to reactivate ${adminName}?`)) {
      return;
    }

    setActionLoading({ ...actionLoading, [adminId]: true });
    setError('');
    setSuccess('');

    try {
      await api.post(`/api/admin/reactivate-admin/${adminId}`);
      setSuccess(`${adminName} has been reactivated successfully`);
      fetchAdmins();
    } catch (err: any) {
      console.error('Error reactivating admin:', err);
      setError(err.response?.data?.detail || 'Failed to reactivate admin');
    } finally {
      setActionLoading({ ...actionLoading, [adminId]: false });
    }
  };

  const handleDelete = async (adminId: number, adminName: string) => {
    if (!window.confirm(
      `Are you sure you want to delete ${adminName}?\n\n` +
      `This action cannot be undone and will delete all related records.`
    )) {
      return;
    }

    setActionLoading({ ...actionLoading, [adminId]: true });
    setError('');
    setSuccess('');

    try {
      await api.delete(`/api/admin/admin/${adminId}`);
      setSuccess(`${adminName} has been deleted successfully`);
      fetchAdmins();
    } catch (err: any) {
      console.error('Error deleting admin:', err);
      setError(err.response?.data?.detail || 'Failed to delete admin');
    } finally {
      setActionLoading({ ...actionLoading, [adminId]: false });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusClass = status === 'active' ? 'status-active' : 'status-suspended';
    return <span className={`status-badge ${statusClass}`}>{status.toUpperCase()}</span>;
  };

  if (loading) {
    return (
      <div className="admin-list-container">
        <div className="loading">Loading admin users...</div>
      </div>
    );
  }

  return (
    <div className="admin-list-container">
      <div className="admin-list-header">
        <h3>Admin Users</h3>
        <p className="admin-list-description">
          Manage admin users. You can deactivate or delete admin accounts. You cannot deactivate or delete your own account.
        </p>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      {admins.length === 0 ? (
        <div className="no-admins">
          <p>No admin users found.</p>
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id}>
                  <td>{admin.name}</td>
                  <td>{admin.email}</td>
                  <td>{admin.phone}</td>
                  <td>{getStatusBadge(admin.status)}</td>
                  <td>{new Date(admin.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="action-buttons">
                      {admin.id === currentUser?.id ? (
                        <span className="self-indicator">Current User</span>
                      ) : (
                        <>
                          {admin.status === 'active' ? (
                            <button
                              className="btn btn-warning btn-sm"
                              onClick={() => handleDeactivate(admin.id, admin.name)}
                              disabled={actionLoading[admin.id]}
                            >
                              {actionLoading[admin.id] ? 'Deactivating...' : 'Deactivate'}
                            </button>
                          ) : (
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleReactivate(admin.id, admin.name)}
                              disabled={actionLoading[admin.id]}
                            >
                              {actionLoading[admin.id] ? 'Reactivating...' : 'Reactivate'}
                            </button>
                          )}
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(admin.id, admin.name)}
                            disabled={actionLoading[admin.id]}
                          >
                            {actionLoading[admin.id] ? 'Deleting...' : 'Delete'}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminList;
