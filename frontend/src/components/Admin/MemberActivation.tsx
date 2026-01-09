import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

interface Property {
  id: number;
  name: string;
}

const MemberActivation: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [formData, setFormData] = useState({
    property_id: '',
    weekday_quota: 12,
    weekend_quota: 6,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/api/admin/activate-member', {
        user_id: parseInt(userId!),
        ...formData,
        property_id: parseInt(formData.property_id),
      });
      navigate('/admin/pending-members');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Activation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Activate Member (ADM-02)</h2>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <label>
          Sanctuary:
          <select
            value={formData.property_id}
            onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
            required
            className="input"
          >
            <option value="">Select Sanctuary</option>
            {properties.map((prop) => (
              <option key={prop.id} value={prop.id}>
                {prop.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Weekday Quota:
          <input
            type="number"
            value={formData.weekday_quota}
            onChange={(e) => setFormData({ ...formData, weekday_quota: parseInt(e.target.value) })}
            required
            className="input"
          />
        </label>
        <label>
          Weekend Quota:
          <input
            type="number"
            value={formData.weekend_quota}
            onChange={(e) => setFormData({ ...formData, weekend_quota: parseInt(e.target.value) })}
            required
            className="input"
          />
        </label>
        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={loading}
          title={loading ? 'Activating...' : 'Activate Member'}
          style={{ padding: '5px 10px', minWidth: 'auto' }}
        >
          {loading ? '⏳' : '✅'}
        </button>
      </form>
    </div>
  );
};

export default MemberActivation;

