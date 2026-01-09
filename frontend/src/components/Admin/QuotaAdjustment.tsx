import React, { useState, useEffect } from 'react';
import api from '../../services/api';

interface User {
  id: number;
  name: string;
  email: string;
  property_id: number | null;
}

interface Property {
  id: number;
  name: string;
}

interface Adjustment {
  id: number;
  user_id: number;
  user_name: string;
  property_name: string;
  weekday_change: number;
  weekend_change: number;
  description: string;
  created_at: string;
}

const QuotaAdjustment: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [formData, setFormData] = useState({
    user_id: '',
    weekday_change: 0,
    weekend_change: 0,
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [loadingAdjustments, setLoadingAdjustments] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchUsersAndProperties();
    fetchAdjustments();
  }, []);

  const fetchUsersAndProperties = async () => {
    try {
      const [usersResponse, propertiesResponse] = await Promise.all([
        api.get('/api/admin/all-members'),
        api.get('/api/admin/properties')
      ]);
      setUsers(usersResponse.data);
      setProperties(propertiesResponse.data);
    } catch (error) {
      console.error('Error fetching users and properties:', error);
    } finally {
      setFetching(false);
    }
  };

  const fetchAdjustments = async () => {
    try {
      const response = await api.get('/api/admin/quota-adjustments');
      setAdjustments(response.data);
    } catch (error) {
      console.error('Error fetching adjustments:', error);
    } finally {
      setLoadingAdjustments(false);
    }
  };

  const getPropertyName = (propertyId: number | null): string => {
    if (!propertyId) return 'No Sanctuary';
    const property = properties.find(p => p.id === propertyId);
    return property ? property.name : 'Unknown Sanctuary';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      await api.post('/api/admin/adjust-quota', {
        ...formData,
        user_id: parseInt(formData.user_id),
      });
      setSuccess(true);
      setFormData({
        user_id: '',
        weekday_change: 0,
        weekend_change: 0,
        description: '',
      });
      fetchAdjustments(); // Refresh adjustments list
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Adjustment failed');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="card">
        <h2>Manual Quota Adjustment (ADM-04)</h2>
        <p>Loading users...</p>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="card">
        <h2>Manual Quota Adjustment (ADM-04)</h2>
        <p>No active members found. Please activate members first.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Manual Quota Adjustment (ADM-04)</h2>
      {error && <div className="error">{error}</div>}
      {success && <div className="success">Quota adjusted successfully</div>}
      <form onSubmit={handleSubmit}>
        <label>
          Select Member:
          <select
            value={formData.user_id}
            onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
            required
            className="input"
          >
            <option value="">-- Select a member --</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({getPropertyName(user.property_id)})
              </option>
            ))}
          </select>
        </label>
        <label>
          Weekday Change (positive to add, negative to subtract):
          <input
            type="number"
            value={formData.weekday_change}
            onChange={(e) => setFormData({ ...formData, weekday_change: parseInt(e.target.value) })}
            required
            className="input"
          />
        </label>
        <label>
          Weekend Change (positive to add, negative to subtract):
          <input
            type="number"
            value={formData.weekend_change}
            onChange={(e) => setFormData({ ...formData, weekend_change: parseInt(e.target.value) })}
            required
            className="input"
          />
        </label>
        <label>
          Description:
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="input"
            rows={3}
          />
        </label>
        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={loading}
          title={loading ? 'Adjusting...' : 'Adjust Quota'}
          style={{ padding: '5px 10px', minWidth: 'auto' }}
        >
          {loading ? '⏳' : '💾'}
        </button>
      </form>

      {/* Adjustment History */}
      <div style={{ marginTop: '30px' }}>
        <h3 style={{ marginBottom: '20px', color: '#495057' }}>Adjustment History</h3>
        {loadingAdjustments ? (
          <p>Loading adjustments...</p>
        ) : adjustments.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Member</th>
                <th>Weekday Change</th>
                <th>Weekend Change</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.map((adjustment) => (
                <tr key={adjustment.id}>
                  <td>{new Date(adjustment.created_at).toLocaleDateString()}</td>
                  <td>
                    {adjustment.user_name} ({adjustment.property_name})
                  </td>
                  <td style={{ 
                    color: adjustment.weekday_change >= 0 ? '#28a745' : '#dc3545',
                    fontWeight: '600'
                  }}>
                    {adjustment.weekday_change >= 0 ? '+' : ''}{adjustment.weekday_change}
                  </td>
                  <td style={{ 
                    color: adjustment.weekend_change >= 0 ? '#28a745' : '#dc3545',
                    fontWeight: '600'
                  }}>
                    {adjustment.weekend_change >= 0 ? '+' : ''}{adjustment.weekend_change}
                  </td>
                  <td>{adjustment.description || 'No description'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: '#6c757d', fontStyle: 'italic' }}>No adjustments made yet.</p>
        )}
      </div>
    </div>
  );
};

export default QuotaAdjustment;

