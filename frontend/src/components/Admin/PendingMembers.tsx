import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  created_at: string;
}

const PendingMembers: React.FC = () => {
  const navigate = useNavigate();
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingMembers();
  }, []);

  const fetchPendingMembers = async () => {
    try {
      const response = await api.get('/api/admin/pending-members');
      setMembers(response.data);
    } catch (error) {
      console.error('Error fetching pending members:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="card">
      <h2>Pending Member Queue (ADM-01)</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Sign-up Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.id}>
              <td>{member.name}</td>
              <td>{member.email}</td>
              <td>{member.phone}</td>
              <td>{new Date(member.created_at).toLocaleDateString()}</td>
              <td>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button
                    onClick={() => navigate(`/admin/activate-member/${member.id}`)}
                    className="btn btn-primary"
                    title="Activate Member"
                    style={{ padding: '5px 10px', minWidth: 'auto' }}
                  >
                    ✅
                  </button>
                  <button
                    onClick={() => navigate(`/admin/edit-member/${member.id}`)}
                    className="btn btn-secondary"
                    title="Edit Credentials"
                    style={{ padding: '5px 10px', minWidth: 'auto' }}
                  >
                    ✏️
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {members.length === 0 && <p style={{ marginTop: '20px' }}>No pending members</p>}
    </div>
  );
};

export default PendingMembers;

