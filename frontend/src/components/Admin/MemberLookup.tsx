import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: string;
  role: string;
  property_id: number | null;
  weekday_balance: number;
  weekend_balance: number;
}

interface Property {
  id: number;
  name: string;
}

interface Booking {
  id: number;
  check_in: string;
  check_out: string;
  status: string;
}

const MemberLookup: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await api.get('/api/admin/properties');
      setProperties(response.data);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const getPropertyName = (propertyId: number | null): string => {
    if (!propertyId) return 'No Sanctuary';
    const property = properties.find(p => p.id === propertyId);
    return property ? property.name : 'Unknown Sanctuary';
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const response = await api.get(`/api/admin/search-members?query=${query}`);
      setUsers(response.data);
    } catch (error) {
      console.error('Error searching members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (userId: number) => {
    try {
      const response = await api.get(`/api/admin/member/${userId}`);
      setSelectedUser(response.data);
    } catch (error) {
      console.error('Error fetching member details:', error);
    }
  };

  const handleDeactivate = async (userId: number, userName: string) => {
    if (!window.confirm(`Are you sure you want to deactivate ${userName}? This will prevent them from making new bookings.`)) {
      return;
    }

    setActionLoading(true);
    try {
      await api.post(`/api/admin/deactivate-member/${userId}`);
      alert(`${userName} has been deactivated successfully.`);
      // Refresh the search results
      if (query.trim()) {
        handleSearch();
      }
      // Refresh selected user if it's the deactivated one
      if (selectedUser && selectedUser.user.id === userId) {
        handleViewDetails(userId);
      }
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to deactivate member');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivate = async (userId: number, userName: string) => {
    if (!window.confirm(`Are you sure you want to reactivate ${userName}? This will allow them to make bookings again.`)) {
      return;
    }

    setActionLoading(true);
    try {
      await api.post(`/api/admin/reactivate-member/${userId}`);
      alert(`${userName} has been reactivated successfully.`);
      // Refresh the search results
      if (query.trim()) {
        handleSearch();
      }
      // Refresh selected user if it's the reactivated one
      if (selectedUser && selectedUser.user.id === userId) {
        handleViewDetails(userId);
      }
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to reactivate member');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (userId: number, userName: string) => {
    const confirmMessage = `⚠️ WARNING: This will permanently delete ${userName} and ALL their related records including:\n\n` +
      `- All bookings\n` +
      `- All quota transactions\n` +
      `- User account\n\n` +
      `This action CANNOT be undone!\n\n` +
      `Are you absolutely sure you want to delete this user?`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    // Double confirmation
    if (!window.confirm(`Final confirmation: Delete ${userName} permanently?`)) {
      return;
    }

    setActionLoading(true);
    try {
      await api.delete(`/api/admin/member/${userId}`);
      alert(`${userName} and all related records have been deleted successfully.`);
      // Refresh the search results
      if (query.trim()) {
        handleSearch();
      }
      // Clear selected user if it's the deleted one
      if (selectedUser && selectedUser.user.id === userId) {
        setSelectedUser(null);
      }
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete member');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Member Lookup & History (ADM-03)</h2>
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search by name, email, phone, or sanctuary name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input"
          style={{ width: '300px', display: 'inline-block', marginRight: '10px' }}
        />
        <button 
          onClick={handleSearch} 
          className="btn btn-primary" 
          disabled={loading}
          title="Search Members"
          style={{ padding: '5px 10px', minWidth: 'auto' }}
        >
          🔍
        </button>
      </div>

      {users.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Sanctuary</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.phone}</td>
                <td>{getPropertyName(user.property_id)}</td>
                <td>
                  <span className={`badge badge-${user.status}`}>{user.status}</span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button 
                      onClick={() => handleViewDetails(user.id)} 
                      className="btn btn-secondary" 
                      disabled={actionLoading}
                      title="View Details"
                      style={{ padding: '5px 10px', minWidth: 'auto' }}
                    >
                      📋
                    </button>
                    <button 
                      onClick={() => navigate(`/admin/edit-member/${user.id}`)} 
                      className="btn btn-primary"
                      disabled={actionLoading}
                      title="Edit Credentials"
                      style={{ padding: '5px 10px', minWidth: 'auto' }}
                    >
                      ✏️
                    </button>
                    {user.role !== 'admin' && (
                      <>
                        {user.status === 'suspended' ? (
                          <button 
                            onClick={() => handleReactivate(user.id, user.name)} 
                            className="btn btn-success"
                            disabled={actionLoading}
                            title="Reactivate Account"
                            style={{ padding: '5px 10px', minWidth: 'auto' }}
                          >
                            ✅
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleDeactivate(user.id, user.name)} 
                            className="btn btn-secondary"
                            disabled={actionLoading}
                            title="Deactivate Account"
                            style={{ padding: '5px 10px', minWidth: 'auto' }}
                          >
                            ⏸️
                          </button>
                        )}
                        <button 
                          onClick={() => handleDelete(user.id, user.name)} 
                          className="btn btn-danger"
                          disabled={actionLoading}
                          title="Delete User and All Related Records"
                          style={{ padding: '5px 10px', minWidth: 'auto' }}
                        >
                          🗑️
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selectedUser && (
        <div className="card" style={{ marginTop: '20px' }}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px'}}>
            <h3 style={{ marginBottom: 0 }}>Member Details</h3>
            <div style={{ display: 'flex', gap: '5px' }}>
              <button 
                onClick={() => navigate(`/admin/edit-member/${selectedUser.user.id}`)} 
                className="btn btn-primary"
                disabled={actionLoading}
                title="Edit Credentials"
                style={{ padding: '5px 10px', minWidth: 'auto' }}
              >
                ✏️
              </button>
              {selectedUser.user.role !== 'admin' && (
                <>
                  {selectedUser.user.status === 'suspended' ? (
                    <button 
                      onClick={() => handleReactivate(selectedUser.user.id, selectedUser.user.name)} 
                      className="btn btn-success"
                      disabled={actionLoading}
                      title="Reactivate Account"
                      style={{ padding: '5px 10px', minWidth: 'auto' }}
                    >
                      ✅
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleDeactivate(selectedUser.user.id, selectedUser.user.name)} 
                      className="btn btn-secondary"
                      disabled={actionLoading}
                      title="Deactivate Account"
                      style={{ padding: '5px 10px', minWidth: 'auto' }}
                    >
                      ⏸️
                    </button>
                  )}
                  <button 
                    onClick={() => handleDelete(selectedUser.user.id, selectedUser.user.name)} 
                    className="btn btn-danger"
                    disabled={actionLoading}
                    title="Delete User and All Related Records"
                    style={{ padding: '5px 10px', minWidth: 'auto' }}
                  >
                    🗑️
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Member Information Cards */}
          <div style={{ marginBottom: '30px' }}>
            <h4 style={{ marginBottom: '15px', color: '#495057' }}>Personal Information</h4>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
              gap: '15px' 
            }}>
              <div style={{
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #dee2e6',
              }}>
                <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '5px' }}>Name</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#495057' }}>
                  {selectedUser.user.name}
                </div>
              </div>
              <div style={{
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #dee2e6',
              }}>
                <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '5px' }}>Email</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#495057' }}>
                  {selectedUser.user.email}
                </div>
              </div>
              <div style={{
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #dee2e6',
              }}>
                <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '5px' }}>Phone</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#495057' }}>
                  {selectedUser.user.phone}
                </div>
              </div>
            </div>
          </div>

          {/* Quota Balance */}
          <div style={{ marginBottom: '30px' }}>
            <h4 style={{ marginBottom: '15px', color: '#495057' }}>Quota Balance</h4>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '15px' 
            }}>
              <div style={{
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #dee2e6',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '8px' }}>
                  Weekday Balance
                </div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#007bff' }}>
                  {selectedUser.user.weekday_balance}
                </div>
              </div>
              <div style={{
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #dee2e6',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '8px' }}>
                  Weekend Balance
                </div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#28a745' }}>
                  {selectedUser.user.weekend_balance}
                </div>
              </div>
            </div>
          </div>

          {/* Booking History */}
          <div>
            <h4 style={{ marginBottom: '15px', color: '#495057' }}>Booking History</h4>
            {selectedUser.bookings.length > 0 ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>Check-in</th>
                    <th>Check-out</th>
                    <th>Days</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedUser.bookings.map((booking: Booking) => {
                    const checkIn = new Date(booking.check_in);
                    const checkOut = new Date(booking.check_out);
                    const days = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <tr key={booking.id}>
                        <td>{checkIn.toLocaleDateString()}</td>
                        <td>{checkOut.toLocaleDateString()}</td>
                        <td>{days} {days === 1 ? 'day' : 'days'}</td>
                        <td>
                          <span className={`badge badge-${booking.status}`}>{booking.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p style={{ color: '#6c757d', fontStyle: 'italic' }}>No booking history</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberLookup;

