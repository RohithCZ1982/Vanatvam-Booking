import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

interface Booking {
  id: number;
  user_id: number;
  user_name: string;
  property_name: string;
  cottage_id: number;
  cottage_name: string;
  check_in: string;
  check_out: string;
  weekday_credits_used: number;
  weekend_credits_used: number;
  created_at: string;
}

const ApprovalQueue: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchApprovalQueue();
  }, []);

  const fetchApprovalQueue = async () => {
    try {
      const response = await api.get('/api/admin/approval-queue');
      setBookings(response.data);
    } catch (error) {
      console.error('Error fetching approval queue:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="card">
      <h2>Approval Queue (ADM-10)</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Owner</th>
            <th>Cottage</th>
            <th>Check-in</th>
            <th>Check-out</th>
            <th>Weekday Credits</th>
            <th>Weekend Credits</th>
            <th>Request Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => (
            <tr key={booking.id}>
              <td>{booking.user_name} ({booking.property_name})</td>
              <td>{booking.cottage_name}</td>
              <td>{new Date(booking.check_in).toLocaleDateString()}</td>
              <td>{new Date(booking.check_out).toLocaleDateString()}</td>
              <td>{booking.weekday_credits_used}</td>
              <td>{booking.weekend_credits_used}</td>
              <td>{new Date(booking.created_at).toLocaleDateString()}</td>
              <td>
                <button
                  onClick={() => navigate(`/admin/booking-decision/${booking.id}`)}
                  className="btn btn-primary"
                  title="Review Booking"
                  style={{ padding: '5px 10px', minWidth: 'auto' }}
                >
                  📋
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {bookings.length === 0 && <p>No pending bookings</p>}
    </div>
  );
};

export default ApprovalQueue;

