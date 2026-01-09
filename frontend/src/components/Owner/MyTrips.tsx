import React, { useEffect, useState } from 'react';
import api from '../../services/api';

interface Booking {
  id: number;
  cottage_id: number;
  cottage_name: string;
  check_in: string;
  check_out: string;
  status: string;
  weekday_credits_used: number;
  weekend_credits_used: number;
  created_at: string;
}

const MyTrips: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      const response = await api.get('/api/owner/my-trips');
      setBookings(response.data);
    } catch (error) {
      console.error('Error fetching trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId: number) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;

    try {
      await api.post(`/api/owner/cancel-booking/${bookingId}`);
      fetchTrips();
    } catch (error) {
      console.error('Error cancelling booking:', error);
    }
  };

  const handleViewReceipt = async (bookingId: number) => {
    try {
      const response = await api.get(`/api/owner/booking-receipt/${bookingId}`);
      setSelectedBooking(response.data);
    } catch (error) {
      console.error('Error fetching receipt:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: string } = {
      pending: 'badge-pending',
      confirmed: 'badge-confirmed',
      rejected: 'badge-rejected',
      cancelled: 'badge-cancelled',
    };
    return statusMap[status] || 'badge-secondary';
  };

  return (
    <div>
      <div className="card">
        <h2>My Trips (OWN-11)</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Cottage</th>
              <th>Check-in</th>
              <th>Check-out</th>
              <th>Status</th>
              <th>Credits Used</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking.id}>
                <td>{booking.cottage_name}</td>
                <td>{new Date(booking.check_in).toLocaleDateString()}</td>
                <td>{new Date(booking.check_out).toLocaleDateString()}</td>
                <td>
                  <span className={`badge ${getStatusBadge(booking.status)}`}>{booking.status}</span>
                </td>
                <td>
                  {booking.weekday_credits_used} Weekday / {booking.weekend_credits_used} Weekend
                </td>
                <td>
                  <button
                    onClick={() => handleViewReceipt(booking.id)}
                    className="btn btn-secondary"
                    style={{ marginRight: '5px' }}
                  >
                    Receipt
                  </button>
                  {(booking.status === 'pending' || booking.status === 'confirmed') && (
                    <button
                      onClick={() => handleCancel(booking.id)}
                      className="btn btn-danger"
                    >
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {bookings.length === 0 && <p>No trips found</p>}
      </div>

      {selectedBooking && (
        <div className="card" style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <h3 style={{ marginBottom: 0 }}>Booking Receipt (OWN-13)</h3>
            <button 
              onClick={() => setSelectedBooking(null)} 
              className="btn btn-secondary"
              title="Close"
              style={{ padding: '5px 10px', minWidth: 'auto' }}
            >
              ↪️
            </button>
          </div>

          {/* Booking Information */}
          <div style={{ marginBottom: '30px' }}>
            <h4 style={{ marginBottom: '15px', color: '#495057' }}>Booking Information</h4>
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
                <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '5px' }}>Booking ID</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#495057' }}>
                  #{selectedBooking.booking_id}
                </div>
              </div>
              <div style={{
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #dee2e6',
              }}>
                <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '5px' }}>Status</div>
                <div>
                  <span className={`badge ${getStatusBadge(selectedBooking.status)}`}>
                    {selectedBooking.status}
                  </span>
                </div>
              </div>
              <div style={{
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #dee2e6',
              }}>
                <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '5px' }}>Sanctuary</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#495057' }}>
                  {selectedBooking.property}
                </div>
              </div>
              <div style={{
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #dee2e6',
              }}>
                <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '5px' }}>Cottage</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#495057' }}>
                  {selectedBooking.cottage_id}
                </div>
              </div>
            </div>
          </div>

          {/* Dates & Duration */}
          <div style={{ marginBottom: '30px' }}>
            <h4 style={{ marginBottom: '15px', color: '#495057' }}>Dates & Duration</h4>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '15px' 
            }}>
              <div style={{
                padding: '15px',
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid #e9ecef',
              }}>
                <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '5px' }}>Check-in</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#495057' }}>
                  {new Date(selectedBooking.check_in).toLocaleDateString()}
                </div>
              </div>
              <div style={{
                padding: '15px',
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid #e9ecef',
              }}>
                <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '5px' }}>Check-out</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#495057' }}>
                  {new Date(selectedBooking.check_out).toLocaleDateString()}
                </div>
              </div>
              <div style={{
                padding: '15px',
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid #e9ecef',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '5px' }}>Duration</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
                  {selectedBooking.days || 0} {selectedBooking.days === 1 ? 'day' : 'days'}
                </div>
              </div>
            </div>
          </div>

          {/* Credits Used */}
          <div style={{ marginBottom: '30px' }}>
            <h4 style={{ marginBottom: '15px', color: '#495057' }}>Credits Used</h4>
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
                  Weekday Credits
                </div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#007bff' }}>
                  {selectedBooking.weekday_credits}
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
                  Weekend Credits
                </div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#28a745' }}>
                  {selectedBooking.weekend_credits}
                </div>
              </div>
              <div style={{
                padding: '15px',
                backgroundColor: '#007bff',
                borderRadius: '8px',
                border: '1px solid #0056b3',
                textAlign: 'center',
                color: 'white'
              }}>
                <div style={{ fontSize: '12px', marginBottom: '8px', opacity: 0.9 }}>
                  Total Credits
                </div>
                <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
                  {selectedBooking.total_credits}
                </div>
              </div>
            </div>
          </div>

          {/* Admin Decision Notes */}
          {selectedBooking.decision_notes && (
            <div style={{ marginBottom: '30px' }}>
              <h4 style={{ marginBottom: '15px', color: '#495057' }}>
                Admin {selectedBooking.status === 'confirmed' ? 'Approval' : 'Rejection'} Notes
              </h4>
              <div style={{
                padding: '15px',
                backgroundColor: selectedBooking.status === 'confirmed' ? '#d4edda' : '#f8d7da',
                borderRadius: '8px',
                border: `1px solid ${selectedBooking.status === 'confirmed' ? '#c3e6cb' : '#f5c6cb'}`,
                color: selectedBooking.status === 'confirmed' ? '#155724' : '#721c24'
              }}>
                <p style={{ margin: 0, fontSize: '14px' }}>
                  {selectedBooking.decision_notes}
                </p>
              </div>
            </div>
          )}

          {/* Guest Rules */}
          <div>
            <h4 style={{ marginBottom: '15px', color: '#495057' }}>Guest Rules</h4>
            <div style={{
              padding: '15px',
              backgroundColor: '#e7f3ff',
              borderRadius: '8px',
              border: '1px solid #b3d9ff'
            }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#004085' }}>
                {selectedBooking.guest_rules}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyTrips;

