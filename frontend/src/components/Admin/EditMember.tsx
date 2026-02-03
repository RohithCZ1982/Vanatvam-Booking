import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';



const EditMember: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchMemberDetails = async () => {
      try {
        const response = await api.get(`/api/admin/member/${userId}`);
        const user = response.data.user;
        setFormData({
          name: user.name,
          email: user.email,
          phone: user.phone,
          password: '', // Don't show existing password
        });
      } catch (error) {
        console.error('Error fetching member details:', error);
      }
    };

    if (userId) {
      fetchMemberDetails();
    }
  }, [userId]);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      const updateData: any = {};
      if (formData.name) updateData.name = formData.name;
      if (formData.email) updateData.email = formData.email;
      if (formData.phone) updateData.phone = formData.phone;
      if (formData.password) updateData.password = formData.password;

      await api.put(`/api/admin/member/${userId}`, updateData);
      setSuccess(true);
      setTimeout(() => {
        navigate('/admin/member-lookup');
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Edit Member Credentials</h2>
      {error && <div className="error">{error}</div>}
      {success && <div className="success">Member updated successfully!</div>}
      <form onSubmit={handleSubmit}>
        <label>
          Name:
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="input"
          />
        </label>
        <label>
          Email:
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            className="input"
          />
        </label>
        <label>
          Phone:
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
            className="input"
          />
        </label>
        <label>
          New Password (leave blank to keep current password):
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="input"
            placeholder="Enter new password or leave blank"
          />
        </label>
        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            title={loading ? 'Updating...' : 'Update Member'}
            style={{ padding: '5px 10px', minWidth: 'auto' }}
          >
            {loading ? '⏳' : '💾'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/member-lookup')}
            className="btn btn-secondary"
            title="Cancel"
            style={{ padding: '5px 10px', minWidth: 'auto' }}
          >
            ↪️
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditMember;

