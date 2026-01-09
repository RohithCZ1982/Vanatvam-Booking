import React, { useEffect, useState } from 'react';
import api from '../../services/api';

interface RejectedBooking {
  id: number;
  user_name: string;
  property_name: string;
  cottage_name: string;
  check_in: string;
  check_out: string;
  status: string;
  created_at: string;
  decision_notes?: string;
}

const RejectedBookings: React.FC = () => {
  const [bookings, setBookings] = useState<RejectedBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRejectedBookings();
  }, []);

  const fetchRejectedBookings = async () => {
    try {
      const response = await api.get('/api/admin/rejected-bookings');
      setBookings(response.data);
    } catch (error) {
      console.error('Error fetching rejected bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading rejected bookings...</div>;
  }

  const getStatusBadge = (status: string) => {
    if (status === 'rejected') {
      return {
        backgroundColor: '#dc3545',
        color: 'white',
        text: 'REJECTED'
      };
    } else if (status === 'cancelled') {
      return {
        backgroundColor: '#6c757d',
        color: 'white',
        text: 'REVOKED'
      };
    }
    return {
      backgroundColor: '#6c757d',
      color: 'white',
      text: status.toUpperCase()
    };
  };

  return (
    <div>
      <h3 style={{ marginBottom: '20px', color: '#495057' }}>Rejected & Revoked Bookings</h3>
      {bookings.length > 0 ? (
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Sanctuary</th>
              <th>Cottage Name</th>
              <th>Check-in</th>
              <th>Check-out</th>
              <th>Status</th>
              <th>Date</th>
              <th>Reason/Notes</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => {
              const statusBadge = getStatusBadge(booking.status);
              return (
                <tr key={booking.id}>
                  <td style={{ fontWeight: '500' }}>{booking.user_name}</td>
                  <td>{booking.property_name}</td>
                  <td><strong>{booking.cottage_name}</strong></td>
                  <td>{new Date(booking.check_in).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}</td>
                  <td>{new Date(booking.check_out).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}</td>
                  <td>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600',
                      backgroundColor: statusBadge.backgroundColor,
                      color: statusBadge.color
                    }}>
                      {statusBadge.text}
                    </span>
                  </td>
                  <td>{new Date(booking.created_at).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</td>
                  <td style={{ maxWidth: '300px', fontSize: '13px', color: '#6c757d' }}>
                    {booking.decision_notes || <em style={{ color: '#adb5bd' }}>No notes</em>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>✅</div>
          <p style={{ color: '#6c757d', fontSize: '16px' }}>
            No rejected or revoked bookings found.
          </p>
        </div>
      )}
    </div>
  );
};

export default RejectedBookings;

