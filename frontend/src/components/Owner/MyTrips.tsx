import React, { useEffect, useState } from 'react';
import api from '../../services/api';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

interface Booking {
  id: number;
  cottage_id: number;
  cottage_name: string;
  image_url: string | null;
  capacity: number;
  amenities: string | null;
  property_name: string;
  check_in: string;
  check_out: string;
  status: string;
  weekday_credits_used: number;
  weekend_credits_used: number;
  created_at: string;
}

interface Receipt {
  booking_id: number;
  status: string;
  property: string;
  cottage_id: string;
  check_in: string;
  check_out: string;
  days: number;
  weekday_credits: number;
  weekend_credits: number;
  total_credits: number;
  created_at: string;
  decision_notes: string | null;
  guest_rules: string;
}

const MyTrips: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [imageErrors, setImageErrors] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      const response = await api.get('/api/owner/my-trips');
      const sortedData = response.data.sort((a: Booking, b: Booking) =>
        new Date(a.check_in).getTime() - new Date(b.check_in).getTime()
      );
      setBookings(sortedData);
    } catch (error) {
      console.error('Error fetching trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to cancel this booking? Credits will be refunded.')) return;

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
      setSelectedReceipt(response.data);
    } catch (error) {
      console.error('Error fetching receipt:', error);
    }
  };

  const getImageUrl = (imageUrl: string | null) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('http')) return imageUrl;
    return `${API_URL}${imageUrl}`;
  };

  const placeholderGradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  ];

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatShortDate = (dateStr: string): string => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDays = (cin: string, cout: string): number => {
    const d1 = new Date(cin);
    const d2 = new Date(cout);
    return Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  };

  const isUpcoming = (checkIn: string): boolean => {
    return new Date(checkIn) >= new Date(new Date().toISOString().split('T')[0]);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'confirmed':
        return { label: 'Confirmed', bg: '#F0FFF4', color: '#22543D', border: '#C6F6D5', icon: '✅', dot: '#38A169' };
      case 'pending':
        return { label: 'Pending approval', bg: '#FFFAF0', color: '#7B341E', border: '#FEEBC8', icon: '⏳', dot: '#ED8936' };
      case 'rejected':
        return { label: 'Rejected', bg: '#FFF5F5', color: '#742A2A', border: '#FED7D7', icon: '✗', dot: '#E53E3E' };
      case 'cancelled':
        return { label: 'Cancelled', bg: '#F7FAFC', color: '#4A5568', border: '#E2E8F0', icon: '—', dot: '#A0AEC0' };
      default:
        return { label: status, bg: '#F7FAFC', color: '#4A5568', border: '#E2E8F0', icon: '•', dot: '#A0AEC0' };
    }
  };

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'pending', label: 'Pending' },
    { key: 'past', label: 'Past' },
  ];

  const filteredBookings = bookings.filter(b => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'upcoming') return isUpcoming(b.check_in) && (b.status === 'confirmed' || b.status === 'pending');
    if (activeFilter === 'past') return !isUpcoming(b.check_in) || b.status === 'cancelled' || b.status === 'rejected';
    return b.status === activeFilter;
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{
          width: '50px', height: '50px',
          border: '4px solid #f3f3f3', borderTop: '4px solid #FF385C',
          borderRadius: '50%', animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    );
  }

  // ============================================================
  // RECEIPT DETAIL VIEW
  // ============================================================
  if (selectedReceipt) {
    const statusCfg = getStatusConfig(selectedReceipt.status);
    return (
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <button
          onClick={() => setSelectedReceipt(null)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'none', border: 'none', fontSize: '15px',
            color: '#222', cursor: 'pointer', padding: '8px 0',
            marginBottom: '20px', fontWeight: '500',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#FF385C'}
          onMouseLeave={e => e.currentTarget.style.color = '#222'}
        >
          ← Back to trips
        </button>

        {/* Receipt Card */}
        <div style={{
          background: '#fff', borderRadius: '16px',
          border: '1px solid #EBEBEB',
          boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '28px 32px',
            borderBottom: '1px solid #EBEBEB',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{
                fontSize: '24px', fontWeight: '700', color: '#222',
                margin: 0, background: 'none', padding: 0, border: 'none',
                boxShadow: 'none', backdropFilter: 'none', WebkitBackdropFilter: 'none', textShadow: 'none',
              }}>
                Booking Confirmation
              </h2>
              <span style={{
                padding: '6px 14px', borderRadius: '20px',
                fontSize: '13px', fontWeight: '600',
                background: statusCfg.bg, color: statusCfg.color,
                border: `1px solid ${statusCfg.border}`,
              }}>
                {statusCfg.icon} {statusCfg.label}
              </span>
            </div>
            <p style={{ color: '#717171', fontSize: '14px', margin: 0 }}>
              Reservation #{selectedReceipt.booking_id} · Booked on {new Date(selectedReceipt.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          {/* Body */}
          <div style={{ padding: '28px 32px' }}>
            {/* Property & Cottage */}
            <div style={{ marginBottom: '28px', paddingBottom: '24px', borderBottom: '1px solid #EBEBEB' }}>
              <div style={{ fontSize: '12px', color: '#717171', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', marginBottom: '6px' }}>
                Property
              </div>
              <div style={{ fontSize: '20px', fontWeight: '600', color: '#222', marginBottom: '4px' }}>
                {selectedReceipt.cottage_id}
              </div>
              <div style={{ fontSize: '15px', color: '#717171' }}>
                {selectedReceipt.property}
              </div>
            </div>

            {/* Dates */}
            <div style={{ marginBottom: '28px', paddingBottom: '24px', borderBottom: '1px solid #EBEBEB' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#717171', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', marginBottom: '6px' }}>
                    Check-in
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: '#222' }}>
                    {formatDate(selectedReceipt.check_in)}
                  </div>
                </div>
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '12px 20px', background: '#F7F7F7', borderRadius: '12px',
                }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#222' }}>{selectedReceipt.days}</div>
                  <div style={{ fontSize: '11px', color: '#717171', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {selectedReceipt.days === 1 ? 'Night' : 'Nights'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', color: '#717171', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', marginBottom: '6px' }}>
                    Checkout
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: '#222' }}>
                    {formatDate(selectedReceipt.check_out)}
                  </div>
                </div>
              </div>
            </div>

            {/* Credits */}
            <div style={{ marginBottom: '28px', paddingBottom: '24px', borderBottom: '1px solid #EBEBEB' }}>
              <div style={{ fontSize: '12px', color: '#717171', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', marginBottom: '16px' }}>
                Credits Used
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', color: '#222' }}>
                  <span>Weekday credits</span><span>{selectedReceipt.weekday_credits}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', color: '#222' }}>
                  <span>Weekend credits</span><span>{selectedReceipt.weekend_credits}</span>
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  paddingTop: '12px', borderTop: '1px solid #EBEBEB',
                  fontSize: '16px', fontWeight: '700', color: '#222',
                }}>
                  <span>Total</span><span>{selectedReceipt.total_credits} credits</span>
                </div>
              </div>
            </div>

            {/* Decision Notes */}
            {selectedReceipt.decision_notes && (
              <div style={{ marginBottom: '28px', paddingBottom: '24px', borderBottom: '1px solid #EBEBEB' }}>
                <div style={{ fontSize: '12px', color: '#717171', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', marginBottom: '8px' }}>
                  Admin Notes
                </div>
                <div style={{
                  padding: '14px 16px', borderRadius: '10px',
                  background: statusCfg.bg, border: `1px solid ${statusCfg.border}`,
                  color: statusCfg.color, fontSize: '14px', lineHeight: '1.5',
                }}>
                  {selectedReceipt.decision_notes}
                </div>
              </div>
            )}

            {/* Guest Rules */}
            <div>
              <div style={{ fontSize: '12px', color: '#717171', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', marginBottom: '8px' }}>
                House Rules
              </div>
              <div style={{
                padding: '14px 16px', borderRadius: '10px',
                background: '#F7F7F7', fontSize: '14px', color: '#484848', lineHeight: '1.5',
              }}>
                {selectedReceipt.guest_rules}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // TRIPS LIST (Airbnb-style)
  // ============================================================
  const upcomingTrips = filteredBookings.filter(b => isUpcoming(b.check_in) && (b.status === 'confirmed' || b.status === 'pending'));
  const pastTrips = filteredBookings.filter(b => !isUpcoming(b.check_in) || b.status === 'cancelled' || b.status === 'rejected');

  const renderTripCard = (booking: Booking) => {
    const imageUrl = getImageUrl(booking.image_url);
    const statusCfg = getStatusConfig(booking.status);
    const days = getDays(booking.check_in, booking.check_out);
    const upcoming = isUpcoming(booking.check_in) && (booking.status === 'confirmed' || booking.status === 'pending');
    const canCancel = booking.status === 'pending' || booking.status === 'confirmed';

    return (
      <div
        key={booking.id}
        onClick={() => handleViewReceipt(booking.id)}
        style={{
          display: 'flex',
          background: '#fff',
          borderRadius: '16px',
          border: '1px solid #EBEBEB',
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'all 0.25s ease',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.12)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)';
          e.currentTarget.style.transform = 'none';
        }}
      >
        {/* Image */}
        <div style={{
          width: '240px', minHeight: '180px',
          flexShrink: 0, position: 'relative',
        }}>
          {imageUrl && !imageErrors[booking.id] ? (
            <img
              src={imageUrl}
              alt={booking.cottage_name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={() => setImageErrors(prev => ({ ...prev, [booking.id]: true }))}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              background: placeholderGradients[booking.cottage_id % placeholderGradients.length],
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '48px',
            }}>
              🏡
            </div>
          )}
          {/* Status badge on image */}
          <div style={{
            position: 'absolute', top: '12px', left: '12px',
            padding: '4px 10px', borderRadius: '6px',
            fontSize: '11px', fontWeight: '700',
            background: statusCfg.bg, color: statusCfg.color,
            border: `1px solid ${statusCfg.border}`,
            backdropFilter: 'blur(8px)',
            textTransform: 'uppercase', letterSpacing: '0.5px',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            <span>{booking.property_name}</span>
            <span title={statusCfg.label} style={{ fontSize: '14px', cursor: 'help' }}>
              {statusCfg.icon}
            </span>
          </div>
        </div>

        {/* Details */}
        <div style={{
          flex: 1, padding: '20px 24px',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          <div>
            {/* Title row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
              <h3 style={{
                fontSize: '18px', fontWeight: '600', color: '#222',
                margin: 0, background: 'none', padding: 0, border: 'none',
                boxShadow: 'none', backdropFilter: 'none', WebkitBackdropFilter: 'none', textShadow: 'none',
              }}>
                {booking.cottage_name}
              </h3>
              {upcoming && (
                <div style={{
                  fontSize: '12px', color: '#FF385C', fontWeight: '600',
                  background: '#FFF0F3', padding: '4px 10px', borderRadius: '12px',
                }}>
                  Upcoming
                </div>
              )}
            </div>



            {/* Date range */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              fontSize: '15px', color: '#222', marginBottom: '8px',
            }}>
              <span style={{ fontWeight: '500' }}>{formatShortDate(booking.check_in)}</span>
              <span style={{ color: '#B0B0B0' }}>→</span>
              <span style={{ fontWeight: '500' }}>{formatShortDate(booking.check_out)}</span>
              <span style={{
                color: '#717171', fontSize: '13px',
                padding: '2px 8px', background: '#F7F7F7', borderRadius: '6px',
              }}>
                {days} {days === 1 ? 'night' : 'nights'}
              </span>
            </div>

            {/* Credits */}
            <div style={{ fontSize: '13px', color: '#717171' }}>
              {booking.weekday_credits_used + booking.weekend_credits_used} credits used
              <span style={{ margin: '0 6px', color: '#DDD' }}>·</span>
              {booking.capacity} {booking.capacity === 1 ? 'guest' : 'guests'}
            </div>
          </div>

          {/* Actions row */}
          <div style={{
            display: 'flex', gap: '8px', marginTop: '14px',
            alignItems: 'center',
          }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleViewReceipt(booking.id);
              }}
              style={{
                padding: '8px 16px', borderRadius: '8px',
                border: '1px solid #222', background: '#fff',
                fontSize: '13px', fontWeight: '600', color: '#222',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#222'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#222'; }}
            >
              View details
            </button>
            {canCancel && (
              <button
                onClick={(e) => handleCancel(booking.id, e)}
                style={{
                  padding: '8px 16px', borderRadius: '8px',
                  border: '1px solid #DDDDDD', background: '#fff',
                  fontSize: '13px', fontWeight: '500', color: '#717171',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#E53E3E'; e.currentTarget.style.color = '#E53E3E'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#DDDDDD'; e.currentTarget.style.color = '#717171'; }}
              >
                Cancel booking
              </button>
            )}
            <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#B0B0B0' }}>
              Booked {new Date(booking.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <h1 style={{
        fontSize: '28px', fontWeight: '700', color: '#222',
        margin: '0 0 24px', letterSpacing: '-0.5px',
      }}>
        Trips
      </h1>

      {/* Filter Pills */}
      <div style={{
        display: 'flex', gap: '8px', marginBottom: '28px',
        flexWrap: 'wrap',
      }}>
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            style={{
              padding: '8px 18px', borderRadius: '20px',
              border: activeFilter === f.key ? '2px solid #222' : '1px solid #DDDDDD',
              background: activeFilter === f.key ? '#222' : '#fff',
              color: activeFilter === f.key ? '#fff' : '#222',
              fontSize: '13px', fontWeight: '600',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            {f.label}
            {f.key !== 'all' && (
              <span style={{
                marginLeft: '6px', fontSize: '11px',
                opacity: 0.7,
              }}>
                {f.key === 'upcoming' ? bookings.filter(b => isUpcoming(b.check_in) && (b.status === 'confirmed' || b.status === 'pending')).length :
                  f.key === 'past' ? bookings.filter(b => !isUpcoming(b.check_in) || b.status === 'cancelled' || b.status === 'rejected').length :
                    bookings.filter(b => b.status === f.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {filteredBookings.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: '#fff', borderRadius: '16px',
          border: '1px solid #EBEBEB',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎒</div>
          <h3 style={{
            fontSize: '20px', fontWeight: '600', color: '#222',
            marginBottom: '8px', background: 'none', padding: 0,
            border: 'none', boxShadow: 'none', backdropFilter: 'none',
            WebkitBackdropFilter: 'none', textShadow: 'none',
          }}>
            No trips found
          </h3>
          <p style={{ color: '#717171', fontSize: '15px', margin: 0 }}>
            {activeFilter === 'all'
              ? 'Book your first cottage from the dashboard to get started!'
              : `No ${activeFilter} trips at the moment.`}
          </p>
        </div>
      ) : (
        <div>
          {/* Show sections only when filter is 'all' */}
          {activeFilter === 'all' && upcomingTrips.length > 0 && (
            <>
              <h2 style={{
                fontSize: '20px', fontWeight: '600', color: '#222',
                margin: '0 0 16px', background: 'none', padding: 0,
                border: 'none', boxShadow: 'none', backdropFilter: 'none',
                WebkitBackdropFilter: 'none', textShadow: 'none',
              }}>
                Upcoming reservations
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '40px' }}>
                {upcomingTrips.map(renderTripCard)}
              </div>
            </>
          )}

          {activeFilter === 'all' && pastTrips.length > 0 && (
            <>
              <h2 style={{
                fontSize: '20px', fontWeight: '600', color: '#222',
                margin: '0 0 16px', background: 'none', padding: 0,
                border: 'none', boxShadow: 'none', backdropFilter: 'none',
                WebkitBackdropFilter: 'none', textShadow: 'none',
              }}>
                Where you've been
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {pastTrips.map(renderTripCard)}
              </div>
            </>
          )}

          {/* For specific filters, just show the list */}
          {activeFilter !== 'all' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredBookings.map(renderTripCard)}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          div[style*="width: 240px"] {
            width: 140px !important;
            min-height: 140px !important;
          }
        }
        @media (max-width: 520px) {
          div[style*="display: flex"][style*="border-radius: 16px"] {
            flex-direction: column !important;
          }
          div[style*="width: 240px"] {
            width: 100% !important;
            min-height: 180px !important;
            max-height: 200px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default MyTrips;
