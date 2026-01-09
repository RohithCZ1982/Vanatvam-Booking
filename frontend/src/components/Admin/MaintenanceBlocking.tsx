import React, { useEffect, useState } from 'react';
import api from '../../services/api';

interface Cottage {
  id: number;
  cottage_id: string;
}

interface MaintenanceBlock {
  id: number;
  cottage_id: number;
  start_date: string;
  end_date: string;
  reason: string;
}

interface Booking {
  id: number;
  user_name: string;
  user_email: string;
  property_name: string;
  cottage_name: string;
  check_in: string;
  check_out: string;
  weekday_credits_used: number;
  weekend_credits_used: number;
  status: string;
}

const MaintenanceBlocking: React.FC = () => {
  const [cottages, setCottages] = useState<Cottage[]>([]);
  const [blocks, setBlocks] = useState<MaintenanceBlock[]>([]);
  const [formData, setFormData] = useState({
    cottage_id: '',
    start_date: '',
    end_date: '',
    reason: '',
  });
  const [editingBlock, setEditingBlock] = useState<MaintenanceBlock | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<MaintenanceBlock | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [bookingCounts, setBookingCounts] = useState<{ [key: number]: number }>({});

  useEffect(() => {
    fetchCottages();
    fetchBlocks();
  }, []);

  const fetchCottages = async () => {
    try {
      const response = await api.get('/api/admin/cottages');
      setCottages(response.data);
    } catch (error) {
      console.error('Error fetching cottages:', error);
    }
  };

  const fetchBlocks = async () => {
    try {
      const response = await api.get('/api/admin/maintenance-blocks');
      setBlocks(response.data);
      // Fetch booking counts for each block
      const counts: { [key: number]: number } = {};
      for (const block of response.data) {
        try {
          const bookingsRes = await api.get(`/api/admin/maintenance-blocks/${block.id}/bookings`);
          counts[block.id] = bookingsRes.data.length;
        } catch (error) {
          counts[block.id] = 0;
        }
      }
      setBookingCounts(counts);
    } catch (error) {
      console.error('Error fetching maintenance blocks:', error);
    }
  };

  const fetchBookingsForBlock = async (blockId: number) => {
    setLoadingBookings(true);
    try {
      const response = await api.get(`/api/admin/maintenance-blocks/${blockId}/bookings`);
      setBookings(response.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      alert('Error fetching bookings');
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleViewBookings = async (block: MaintenanceBlock) => {
    setSelectedBlock(block);
    await fetchBookingsForBlock(block.id);
  };

  const handleRevokeAll = async () => {
    if (!selectedBlock) return;
    
    // Prompt for reason
    const reason = window.prompt(
      `Enter reason for revoking all bookings:\n\n` +
      `Total bookings: ${bookings.length}\n\n` +
      `Reason (required):`,
      'Maintenance period - bookings revoked'
    );

    if (reason === null) {
      // User cancelled
      return;
    }

    if (!reason || reason.trim() === '') {
      alert('Reason is required to revoke bookings.');
      return;
    }

    if (!window.confirm(
      `Are you sure you want to revoke ALL ${bookings.length} booking(s) for this maintenance period?\n\n` +
      `Reason: ${reason}\n\n` +
      `This will:\n` +
      `- Cancel all bookings\n` +
      `- Refund quota to owners\n` +
      `- This action cannot be undone!`
    )) {
      return;
    }

    setRevoking(true);
    try {
      await api.post(`/api/admin/revoke-maintenance-bookings/${selectedBlock.id}`, {
        reason: reason.trim()
      });
      alert(`Successfully revoked ${bookings.length} booking(s). Quota has been refunded to owners.`);
      setSelectedBlock(null);
      setBookings([]);
      fetchBlocks(); // Refresh blocks to update booking counts
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error revoking bookings');
    } finally {
      setRevoking(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedBlock(null);
    setBookings([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingBlock) {
        // Update existing block
        await api.put(`/api/admin/maintenance-blocks/${editingBlock.id}`, {
          ...formData,
          cottage_id: parseInt(formData.cottage_id),
        });
        setEditingBlock(null);
      } else {
        // Create new block
        await api.post('/api/admin/maintenance-blocks', {
          ...formData,
          cottage_id: parseInt(formData.cottage_id),
        });
      }
      fetchBlocks();
      setFormData({ cottage_id: '', start_date: '', end_date: '', reason: '' });
    } catch (error) {
      console.error('Error saving maintenance block:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (block: MaintenanceBlock) => {
    setEditingBlock(block);
    // Format dates for input (YYYY-MM-DD)
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    setFormData({
      cottage_id: block.cottage_id.toString(),
      start_date: formatDate(block.start_date),
      end_date: formatDate(block.end_date),
      reason: block.reason || '',
    });
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (blockId: number, cottageName: string) => {
    const confirmMessage = `Are you sure you want to delete the maintenance block for ${cottageName}?`;
    if (!window.confirm(confirmMessage)) return;

    setActionLoading(true);
    try {
      await api.delete(`/api/admin/maintenance-blocks/${blockId}`);
      fetchBlocks();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete maintenance block');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingBlock(null);
    setFormData({ cottage_id: '', start_date: '', end_date: '', reason: '' });
  };

  return (
    <div className="card">
      <h2>Maintenance Blocking (ADM-08)</h2>
      {editingBlock && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#e7f3ff', 
          borderRadius: '8px',
          border: '1px solid #b3d9ff',
          marginBottom: '20px'
        }}>
          <strong>✏️ Editing maintenance block for Cottage ID: {editingBlock.cottage_id}</strong>
        </div>
      )}
      <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
        <select
          value={formData.cottage_id}
          onChange={(e) => setFormData({ ...formData, cottage_id: e.target.value })}
          required
          className="input"
        >
          <option value="">Select Cottage</option>
          {cottages.map((cottage) => (
            <option key={cottage.id} value={cottage.id}>
              {cottage.cottage_id}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={formData.start_date}
          onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
          required
          className="input"
        />
        <input
          type="date"
          value={formData.end_date}
          onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
          required
          className="input"
        />
        <textarea
          placeholder="Reason (optional)"
          value={formData.reason}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          className="input"
          rows={3}
        />
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
            title={loading ? 'Saving...' : editingBlock ? 'Update Maintenance Block' : 'Create Maintenance Block'}
            style={{ padding: '5px 10px', minWidth: 'auto' }}
          >
            {loading ? '⏳' : editingBlock ? '💾' : '➕'}
          </button>
          {editingBlock && (
            <button 
              type="button"
              onClick={handleCancelEdit}
              className="btn btn-secondary"
              title="Cancel Edit"
              style={{ padding: '5px 10px', minWidth: 'auto' }}
            >
              ↪️
            </button>
          )}
        </div>
      </form>

      <h3 style={{ marginBottom: '20px' }}>Active Maintenance Blocks</h3>
      {blocks.length > 0 ? (
        <table className="table">
          <thead>
            <tr>
              <th>Cottage</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Reason</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {blocks.map((block) => {
              const cottage = cottages.find((c) => c.id === block.cottage_id);
              return (
                <tr key={block.id}>
                  <td>{cottage?.cottage_id || 'Unknown'}</td>
                  <td>{new Date(block.start_date).toLocaleDateString()}</td>
                  <td>{new Date(block.end_date).toLocaleDateString()}</td>
                  <td>{block.reason || 'No reason provided'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                      <button 
                        onClick={() => handleEdit(block)}
                        className="btn btn-primary"
                        disabled={actionLoading}
                        title="Edit Maintenance Block"
                        style={{ padding: '5px 10px', minWidth: 'auto' }}
                      >
                        ✏️
                      </button>
                      {bookingCounts[block.id] > 0 && (
                        <button 
                          onClick={() => handleViewBookings(block)}
                          className="btn btn-warning"
                          disabled={actionLoading}
                          title={`View and Revoke ${bookingCounts[block.id]} Booking(s)`}
                          style={{ padding: '5px 10px', minWidth: 'auto', backgroundColor: '#ffc107', color: '#000', borderColor: '#ffc107' }}
                        >
                          🔄 Revoke ({bookingCounts[block.id]})
                        </button>
                      )}
                      <button 
                        onClick={() => handleDelete(block.id, cottage?.cottage_id || 'Unknown')}
                        className="btn btn-danger"
                        disabled={actionLoading}
                        title="Delete Maintenance Block"
                        style={{ padding: '5px 10px', minWidth: 'auto' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p style={{ color: '#6c757d', fontStyle: 'italic' }}>No maintenance blocks found.</p>
      )}

      {/* Modal for viewing and revoking bookings */}
      {selectedBlock && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }} onClick={handleCloseModal}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '30px',
            maxWidth: '900px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', paddingBottom: '15px', borderBottom: '2px solid #e9ecef' }}>
              <h3 style={{ margin: 0, color: '#2c3e50', fontSize: '24px' }}>📋 Bookings Affected by Maintenance</h3>
              <button 
                onClick={handleCloseModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '28px',
                  cursor: 'pointer',
                  padding: '0',
                  width: '35px',
                  height: '35px',
                  color: '#6c757d',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f0f0f0'; e.currentTarget.style.color = '#dc3545'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#6c757d'; }}
                title="Close"
              >
                ✕
              </button>
            </div>

            <div style={{ 
              marginBottom: '25px', 
              padding: '20px', 
              backgroundColor: '#e7f3ff', 
              borderRadius: '8px',
              border: '1px solid #b3d9ff',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '15px'
            }}>
              <div>
                <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '5px', fontWeight: '600' }}>🏠 Cottage</div>
                <div style={{ fontSize: '18px', fontWeight: '600', color: '#2c3e50' }}>
                  {cottages.find(c => c.id === selectedBlock.cottage_id)?.cottage_id || 'Unknown'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '5px', fontWeight: '600' }}>📅 Period</div>
                <div style={{ fontSize: '16px', fontWeight: '500', color: '#2c3e50' }}>
                  {new Date(selectedBlock.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {new Date(selectedBlock.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '5px', fontWeight: '600' }}>📊 Total Bookings</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc3545' }}>
                  {bookings.length}
                </div>
              </div>
            </div>

            {loadingBookings ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳</div>
                <p style={{ color: '#6c757d' }}>Loading bookings...</p>
              </div>
            ) : bookings.length > 0 ? (
              <>
                <div style={{ marginBottom: '25px' }}>
                  <h4 style={{ marginBottom: '15px', color: '#495057', fontSize: '18px' }}>Affected Bookings</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {bookings.map((booking) => {
                      const checkIn = new Date(booking.check_in);
                      const checkOut = new Date(booking.check_out);
                      const days = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
                      const totalCredits = booking.weekday_credits_used + booking.weekend_credits_used;
                      
                      return (
                        <div 
                          key={booking.id}
                          style={{
                            padding: '20px',
                            backgroundColor: '#ffffff',
                            borderRadius: '8px',
                            border: '1px solid #dee2e6',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                            {/* Owner Info */}
                            <div>
                              <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '8px', fontWeight: '600' }}>👤 Owner</div>
                              <div style={{ fontSize: '16px', fontWeight: '600', color: '#2c3e50', marginBottom: '4px' }}>
                                {booking.user_name}
                              </div>
                              <div style={{ fontSize: '13px', color: '#6c757d' }}>
                                {booking.user_email}
                              </div>
                            </div>

                            {/* Property & Cottage */}
                            <div>
                              <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '8px', fontWeight: '600' }}>🏛️ Sanctuary & Cottage</div>
                              <div style={{ fontSize: '15px', fontWeight: '500', color: '#2c3e50', marginBottom: '4px' }}>
                                {booking.property_name}
                              </div>
                              <div style={{ fontSize: '14px', color: '#495057' }}>
                                Cottage: <strong>{booking.cottage_name}</strong>
                              </div>
                            </div>

                            {/* Dates */}
                            <div>
                              <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '8px', fontWeight: '600' }}>📅 Dates</div>
                              <div style={{ fontSize: '14px', color: '#2c3e50', marginBottom: '4px' }}>
                                <strong>Check-in:</strong> {checkIn.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </div>
                              <div style={{ fontSize: '14px', color: '#2c3e50', marginBottom: '4px' }}>
                                <strong>Check-out:</strong> {checkOut.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </div>
                              <div style={{ fontSize: '13px', color: '#6c757d', fontStyle: 'italic' }}>
                                Duration: {days} {days === 1 ? 'day' : 'days'}
                              </div>
                            </div>

                            {/* Credits */}
                            <div>
                              <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '8px', fontWeight: '600' }}>💰 Credits Used</div>
                              <div style={{ display: 'flex', gap: '15px', marginBottom: '8px' }}>
                                <div>
                                  <div style={{ fontSize: '11px', color: '#6c757d' }}>Weekday</div>
                                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#007bff' }}>
                                    {booking.weekday_credits_used}
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '11px', color: '#6c757d' }}>Weekend</div>
                                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#28a745' }}>
                                    {booking.weekend_credits_used}
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '11px', color: '#6c757d' }}>Total</div>
                                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#dc3545' }}>
                                    {totalCredits}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Status */}
                            <div>
                              <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '8px', fontWeight: '600' }}>Status</div>
                              <div>
                                <span className={`badge badge-${booking.status}`} style={{ 
                                  padding: '6px 12px', 
                                  fontSize: '13px',
                                  fontWeight: '600'
                                }}>
                                  {booking.status.toUpperCase()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ 
                  padding: '20px', 
                  backgroundColor: '#fff3cd', 
                  borderRadius: '8px',
                  border: '1px solid #ffc107',
                  marginBottom: '20px'
                }}>
                  <div style={{ fontSize: '14px', color: '#856404', marginBottom: '10px', fontWeight: '600' }}>
                    ⚠️ Warning: Revoking bookings will:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '20px', color: '#856404', fontSize: '13px' }}>
                    <li>Cancel all {bookings.length} booking(s)</li>
                    <li>Refund quota credits to owners automatically</li>
                    <li>This action cannot be undone</li>
                  </ul>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '15px', borderTop: '1px solid #dee2e6' }}>
                  <button 
                    onClick={handleCloseModal}
                    className="btn btn-secondary"
                    disabled={revoking}
                    style={{ padding: '10px 20px' }}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleRevokeAll}
                    className="btn btn-danger"
                    disabled={revoking}
                    style={{ 
                      backgroundColor: '#dc3545', 
                      color: 'white',
                      padding: '10px 25px',
                      fontSize: '15px',
                      fontWeight: '600'
                    }}
                  >
                    {revoking ? '⏳ Revoking...' : `🔄 Revoke All ${bookings.length} Booking(s)`}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ fontSize: '48px', marginBottom: '15px' }}>✅</div>
                <p style={{ color: '#6c757d', fontSize: '16px', marginBottom: '20px' }}>
                  No bookings found for this maintenance period.
                </p>
                <button 
                  onClick={handleCloseModal}
                  className="btn btn-secondary"
                  style={{ padding: '10px 20px' }}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceBlocking;

