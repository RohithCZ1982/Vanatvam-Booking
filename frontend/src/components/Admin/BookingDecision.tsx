import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const BookingDecision: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/api/admin/booking-decision', {
        booking_id: parseInt(bookingId!),
        action,
        notes,
      });
      navigate('/admin/approval-queue');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Decision failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Booking Decision (ADM-11)</h2>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <label>
          Action:
          <select
            value={action}
            onChange={(e) => setAction(e.target.value as 'approve' | 'reject')}
            className="input"
          >
            <option value="approve">Approve</option>
            <option value="reject">Reject</option>
          </select>
        </label>
        <label>
          Notes:
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input"
            rows={3}
          />
        </label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            type="submit" 
            className={action === 'approve' ? 'btn btn-success' : 'btn btn-danger'} 
            disabled={loading}
            title={loading ? 'Processing...' : action === 'approve' ? 'Approve Booking' : 'Reject Booking'}
            style={{ padding: '5px 10px', minWidth: 'auto' }}
          >
            {loading ? '⏳' : action === 'approve' ? '✅' : '❌'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/approval-queue')}
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

export default BookingDecision;

