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

const AddAdmin: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [actionLoading, setActionLoading] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoadingAdmins(true);
      const response = await api.get('/api/admin/admins');
      setAdmins(response.data);
    } catch (err: any) {
      console.error('Error fetching admins:', err);
    } finally {
      setLoadingAdmins(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear message when user starts typing
    if (message) {
      setMessage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Validation
    if (!formData.name || !formData.email || !formData.password || !formData.phone) {
      setMessage({ type: 'error', text: 'All fields are required' });
      setLoading(false);
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' });
      setLoading(false);
      return;
    }

    // Password validation (minimum 6 characters)
    if (formData.password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters long' });
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/api/admin/create-admin', formData);
      setMessage({ 
        type: 'success', 
        text: `Admin user "${response.data.name}" created successfully!` 
      });
      // Reset form
      setFormData({
        name: '',
        email: '',
        password: '',
        phone: ''
      });
      // Refresh admin list
      fetchAdmins();
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.detail || 'Error creating admin user. Please try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (adminId: number, adminName: string) => {
    if (!window.confirm(`Are you sure you want to deactivate ${adminName}?`)) {
      return;
    }

    setActionLoading({ ...actionLoading, [adminId]: true });
    setMessage(null);

    try {
      await api.post(`/api/admin/deactivate-admin/${adminId}`);
      setMessage({ type: 'success', text: `${adminName} has been deactivated successfully` });
      fetchAdmins();
    } catch (err: any) {
      console.error('Error deactivating admin:', err);
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to deactivate admin' });
    } finally {
      setActionLoading({ ...actionLoading, [adminId]: false });
    }
  };

  const handleReactivate = async (adminId: number, adminName: string) => {
    if (!window.confirm(`Are you sure you want to reactivate ${adminName}?`)) {
      return;
    }

    setActionLoading({ ...actionLoading, [adminId]: true });
    setMessage(null);

    try {
      await api.post(`/api/admin/reactivate-admin/${adminId}`);
      setMessage({ type: 'success', text: `${adminName} has been reactivated successfully` });
      fetchAdmins();
    } catch (err: any) {
      console.error('Error reactivating admin:', err);
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to reactivate admin' });
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
    setMessage(null);

    try {
      await api.delete(`/api/admin/admin/${adminId}`);
      setMessage({ type: 'success', text: `${adminName} has been deleted successfully` });
      fetchAdmins();
    } catch (err: any) {
      console.error('Error deleting admin:', err);
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to delete admin' });
    } finally {
      setActionLoading({ ...actionLoading, [adminId]: false });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusClass = status === 'active' ? 'status-active' : 'status-suspended';
    return <span className={`status-badge ${statusClass}`}>{status.toUpperCase()}</span>;
  };

  return (
    <div>
      <div style={{ maxWidth: '600px', marginBottom: '40px' }}>
        <h3 style={{ marginBottom: '20px', color: '#333' }}>Add New Admin User</h3>
      
      {message && (
        <div 
          style={{
            padding: '12px',
            marginBottom: '20px',
            borderRadius: '4px',
            backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
            color: message.type === 'success' ? '#155724' : '#721c24',
            border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
          }}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
          <label 
            htmlFor="name" 
            style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '500',
              color: '#333'
            }}
          >
            Name <span style={{ color: '#dc3545' }}>*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
            placeholder="Enter admin name"
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label 
            htmlFor="email" 
            style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '500',
              color: '#333'
            }}
          >
            Email Address <span style={{ color: '#dc3545' }}>*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
            placeholder="Enter email address"
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label 
            htmlFor="phone" 
            style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '500',
              color: '#333'
            }}
          >
            Phone Number <span style={{ color: '#dc3545' }}>*</span>
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
            placeholder="Enter phone number"
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label 
            htmlFor="password" 
            style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '500',
              color: '#333'
            }}
          >
            Password <span style={{ color: '#dc3545' }}>*</span>
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={6}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
            placeholder="Enter password (minimum 6 characters)"
          />
          <small style={{ color: '#6c757d', marginTop: '4px', display: 'block' }}>
            Password must be at least 6 characters long
          </small>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '12px 24px',
            backgroundColor: loading ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.3s'
          }}
        >
          {loading ? 'Creating...' : 'Create Admin User'}
        </button>
      </form>
      </div>

      <div className="admin-list-container" style={{ marginTop: '40px' }}>
        <div className="admin-list-header">
          <h3>Admin Users</h3>
          <p className="admin-list-description">
            Manage admin users. You can deactivate or delete admin accounts. You cannot deactivate or delete your own account.
          </p>
        </div>

        {loadingAdmins ? (
          <div className="loading">Loading admin users...</div>
        ) : admins.length === 0 ? (
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
    </div>
  );
};

export default AddAdmin;

