import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

interface Cottage {
  id: number;
  cottage_id: string;
}

interface DateAvailability {
  date: string;
  is_available: boolean;
  is_booked: boolean;
  is_maintenance: boolean;
  is_holiday: boolean;
  is_peak_season: boolean;
  cost_weekday: boolean;
}

interface AvailabilityData {
  cottage_id: number;
  cottage_name: string;
  availability: DateAvailability[];
}

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

const BookingCalendar: React.FC = () => {
  const { user } = useAuth();
  const [cottages, setCottages] = useState<Cottage[]>([]);
  const [selectedCottage, setSelectedCottage] = useState<number | null>(null);
  const [availability, setAvailability] = useState<AvailabilityData | null>(null);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [costBreakdown, setCostBreakdown] = useState<any>(null);
  const [quotaStatus, setQuotaStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [quotaError, setQuotaError] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [editingBooking, setEditingBooking] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ cottage_id: 0, check_in: '', check_out: '' });

  // Sanctuary calendar modal
  const [showSanctuaryCalendar, setShowSanctuaryCalendar] = useState(false);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);
  const [sanctuaryData, setSanctuaryData] = useState<any>(null);
  const [loadingCal, setLoadingCal] = useState(false);

  // Get today's date in YYYY-MM-DD format for min date validation
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    fetchCottages();
    fetchQuotaStatus();
    fetchBookings();
  }, []);

  useEffect(() => {
    if (costBreakdown && quotaStatus) {
      validateQuota();
    } else {
      setQuotaError('');
    }
  }, [costBreakdown, quotaStatus]);

  const fetchQuotaStatus = async () => {
    try {
      const response = await api.get('/api/owner/quota-status');
      setQuotaStatus(response.data);
    } catch (error) {
      console.error('Error fetching quota status:', error);
    }
  };

  const fetchBookings = async () => {
    try {
      setLoadingBookings(true);
      const response = await api.get('/api/owner/my-trips');
      setBookings(response.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking.id);
    setEditForm({
      cottage_id: booking.cottage_id,
      check_in: booking.check_in.split('T')[0],
      check_out: booking.check_out.split('T')[0]
    });
  };

  const handleCancelEdit = () => {
    setEditingBooking(null);
    setEditForm({ cottage_id: 0, check_in: '', check_out: '' });
  };

  const handleUpdateBooking = async (bookingId: number) => {
    try {
      setLoading(true);
      setError('');
      await api.put(`/api/owner/bookings/${bookingId}`, editForm);
      setSuccess(true);
      setEditingBooking(null);
      fetchBookings();
      fetchQuotaStatus();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update booking');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBooking = async (bookingId: number) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const confirmMessage = booking.status === 'pending'
      ? 'Are you sure you want to delete this pending booking? Credits will be refunded.'
      : 'Are you sure you want to delete this confirmed booking? Credits will be refunded.';

    if (!window.confirm(confirmMessage)) return;

    try {
      setLoading(true);
      setError('');
      await api.delete(`/api/owner/bookings/${bookingId}`);
      setSuccess(true);
      fetchBookings();
      fetchQuotaStatus();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete booking');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCottage && checkIn && checkOut) {
      fetchAvailability();
      calculateCost();
    }
  }, [selectedCottage, checkIn, checkOut]);

  useEffect(() => {
    if (showSanctuaryCalendar) fetchSanctuaryCalendar();
  }, [showSanctuaryCalendar, calYear, calMonth]);

  const fetchSanctuaryCalendar = async () => {
    setLoadingCal(true);
    try {
      const res = await api.get(`/api/owner/sanctuary-calendar?year=${calYear}&month=${calMonth}`);
      setSanctuaryData(res.data);
    } catch (e) { console.error(e); }
    finally { setLoadingCal(false); }
  };

  const fetchCottages = async () => {
    try {
      const response = await api.get('/api/owner/dashboard');
      setCottages(response.data.cottages);
    } catch (error) {
      console.error('Error fetching cottages:', error);
    }
  };

  const fetchAvailability = async () => {
    if (!selectedCottage || !checkIn || !checkOut) return;

    try {
      const response = await api.get(
        `/api/owner/availability/${selectedCottage}?start_date=${checkIn}&end_date=${checkOut}`
      );
      setAvailability(response.data);
    } catch (error) {
      console.error('Error fetching availability:', error);
    }
  };

  const calculateCost = async () => {
    if (!selectedCottage || !checkIn || !checkOut) return;

    try {
      const response = await api.post('/api/owner/calculate-cost', {
        cottage_id: selectedCottage,
        check_in: checkIn,
        check_out: checkOut,
      });
      setCostBreakdown(response.data);
      // Refresh quota status after calculating cost
      fetchQuotaStatus();
    } catch (error) {
      console.error('Error calculating cost:', error);
    }
  };

  const validateQuota = () => {
    if (!costBreakdown || !quotaStatus) {
      setQuotaError('');
      return;
    }

    const requiredWeekday = costBreakdown.weekday_credits;
    const requiredWeekend = costBreakdown.weekend_credits;
    const availableWeekday = quotaStatus.available_weekday;
    const availableWeekend = quotaStatus.available_weekend;

    const errors: string[] = [];

    if (requiredWeekday > availableWeekday) {
      errors.push(
        `Insufficient weekday credits. Required: ${requiredWeekday}, Available: ${availableWeekday}`
      );
    }

    if (requiredWeekend > availableWeekend) {
      errors.push(
        `Insufficient weekend credits. Required: ${requiredWeekend}, Available: ${availableWeekend}`
      );
    }

    setQuotaError(errors.length > 0 ? errors.join('. ') : '');
  };

  const isQuotaExceeded = () => {
    if (!costBreakdown || !quotaStatus) return false;
    return (
      costBreakdown.weekday_credits > quotaStatus.available_weekday ||
      costBreakdown.weekend_credits > quotaStatus.available_weekend
    );
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCottage || !checkIn || !checkOut) {
      setError('Please select cottage and dates');
      return;
    }

    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      await api.post('/api/owner/bookings', {
        cottage_id: selectedCottage,
        check_in: checkIn,
        check_out: checkOut,
      });
      setSuccess(true);
      setCheckIn('');
      setCheckOut('');
      setSelectedCottage(null);
      setCostBreakdown(null);
      setQuotaError('');
      fetchQuotaStatus(); // Refresh quota after successful booking
      fetchBookings(); // Refresh bookings list after successful booking
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="card">
        <h2>Book a Cottage</h2>
        {error && <div className="error">{error}</div>}
        {quotaError && (
          <div className="error" style={{ 
            backgroundColor: '#f8d7da', 
            color: '#721c24', 
            padding: '12px', 
            borderRadius: '4px',
            marginBottom: '15px',
            border: '1px solid #f5c6cb'
          }}>
            <strong>⚠️ Cannot Submit Booking:</strong> {quotaError}
          </div>
        )}
        {success && <div className="success">Booking request submitted successfully!</div>}

        <form onSubmit={handleBooking}>
          <label style={{ marginBottom: '20px', display: 'block' }}>
            <div style={{ marginBottom: '8px' }}>Select Cottage:</div>
            <select
              value={selectedCottage || ''}
              onChange={(e) => setSelectedCottage(parseInt(e.target.value))}
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
          </label>

          <label style={{ marginBottom: '20px', display: 'block' }}>
            <div style={{ marginBottom: '8px' }}>Check-in Date:</div>
            <input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              required
              className="input"
              min={getTodayDate()}
            />
          </label>

          <label style={{ marginBottom: '20px', display: 'block' }}>
            <div style={{ marginBottom: '8px' }}>Check-out Date:</div>
            <input
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              required
              className="input"
              min={checkIn || getTodayDate()}
            />
          </label>

          {costBreakdown && (
            <div style={{ 
              marginTop: '20px', 
              marginBottom: '20px',
              padding: '20px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '8px',
              border: '1px solid #dee2e6',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <h4 style={{ marginTop: '0', marginBottom: '20px', color: '#495057' }}>
                Cost Breakdown
              </h4>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '15px' 
              }}>
                <div style={{
                  padding: '12px',
                  backgroundColor: 'white',
                  borderRadius: '6px',
                  border: '1px solid #e9ecef',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '5px' }}>
                    Weekday Credits
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
                    {costBreakdown.weekday_credits}
                  </div>
                </div>
                <div style={{
                  padding: '12px',
                  backgroundColor: 'white',
                  borderRadius: '6px',
                  border: '1px solid #e9ecef',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '5px' }}>
                    Weekend Credits
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                    {costBreakdown.weekend_credits}
                  </div>
                </div>
                <div style={{
                  padding: '12px',
                  backgroundColor: '#007bff',
                  borderRadius: '6px',
                  border: '1px solid #0056b3',
                  textAlign: 'center',
                  color: 'white'
                }}>
                  <div style={{ fontSize: '12px', marginBottom: '5px', opacity: 0.9 }}>
                    Total Credits
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
                    {costBreakdown.total_credits}
                  </div>
                </div>
              </div>
            </div>
          )}

          {availability && (
            <div style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
                <h4 style={{ margin: 0 }}>Availability</h4>
                <button
                  type="button"
                  onClick={() => setShowSanctuaryCalendar(true)}
                  style={{
                    padding: '5px 14px',
                    borderRadius: '20px',
                    border: '1.5px solid #2d7a4f',
                    background: '#fff',
                    color: '#2d7a4f',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#2d7a4f'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#2d7a4f'; }}
                >
                  📅 Sanctuary Calendar
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {availability.availability.map((day) => {
                  const isHolidayOrPeak = day.is_holiday || day.is_peak_season;
                  const dayDate = new Date(day.date).toISOString().split('T')[0];
                  const isSelectedDate = dayDate === checkIn || dayDate === checkOut;
                  const isInSelectedRange = checkIn && checkOut && dayDate >= checkIn && dayDate < checkOut;
                  
                  // Determine background color
                  let backgroundColor = '#d4edda'; // default available
                  if (day.is_booked) {
                    backgroundColor = '#f8d7da';
                  } else if (day.is_maintenance) {
                    backgroundColor = '#fff3cd';
                  }
                  
                  // Highlight holiday/peak season dates with yellow background
                  if (isHolidayOrPeak) {
                    backgroundColor = '#fff9c4'; // Light yellow
                  }
                  
                  // Highlight selected dates with stronger border
                  const borderColor = isSelectedDate ? '#ffc107' : isHolidayOrPeak ? '#ffd700' : '#ddd';
                  const borderWidth = isSelectedDate ? '3px' : isHolidayOrPeak ? '2px' : '1px';
                  
                  return (
                    <div
                      key={day.date}
                      style={{
                        padding: '5px',
                        width: '40px',
                        textAlign: 'center',
                        backgroundColor: backgroundColor,
                        border: `${borderWidth} solid ${borderColor}`,
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: isSelectedDate ? 'bold' : 'normal',
                        boxShadow: isSelectedDate ? '0 0 5px rgba(255, 193, 7, 0.5)' : 'none',
                      }}
                      title={
                        day.is_holiday
                          ? 'Holiday (Weekend pricing)'
                          : day.is_peak_season
                          ? 'Peak Season (Weekend pricing)'
                          : day.is_maintenance
                          ? 'Maintenance'
                          : day.is_booked
                          ? 'Booked'
                          : 'Available'
                      }
                    >
                      {new Date(day.date).getDate()}
                      {isHolidayOrPeak && ' 🟡'}
                    </div>
                  );
                })}
              </div>
              <p style={{ fontSize: '12px', marginTop: '10px' }}>
                🟡 = Holiday/Peak Season (Weekend pricing) | Selected dates are highlighted with bold border
              </p>
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading || !costBreakdown || isQuotaExceeded()}
            style={{ marginTop: '20px' }}
            title={isQuotaExceeded() ? quotaError : loading ? 'Submitting...' : 'Submit Booking Request'}
          >
            {loading ? 'Submitting...' : 'Submit Booking Request'}
          </button>
          {isQuotaExceeded() && (
            <p style={{ 
              fontSize: '12px', 
              color: '#dc3545', 
              marginTop: '8px',
              fontStyle: 'italic'
            }}>
              Please adjust your booking dates or contact admin to increase your quota.
            </p>
          )}
        </form>
      </div>

      {/* ── Sanctuary Calendar Modal ─────────────────────────────── */}
      {showSanctuaryCalendar && ReactDOM.createPortal((() => {
        const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        const DAY_NAMES = ['Su','Mo','Tu','We','Th','Fr','Sa'];
        const firstDay = new Date(calYear, calMonth - 1, 1).getDay();
        const daysInMonth = new Date(calYear, calMonth, 0).getDate();

        const getBookingsForDay = (day: number) => {
          if (!sanctuaryData) return [];
          const dateStr = `${calYear}-${String(calMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          return (sanctuaryData.bookings || []).filter((b: any) => b.check_in <= dateStr && b.check_out > dateStr);
        };
        const getMaintenanceForDay = (day: number) => {
          if (!sanctuaryData) return [];
          const dateStr = `${calYear}-${String(calMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          return (sanctuaryData.maintenance || []).filter((m: any) => m.start_date <= dateStr && m.end_date >= dateStr);
        };
        const getSpecialForDay = (day: number) => {
          if (!sanctuaryData) return null;
          const dateStr = `${calYear}-${String(calMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          return sanctuaryData.special_dates?.[dateStr] || null;
        };
        const todayStr = new Date().toISOString().split('T')[0];
        const isToday = (day: number) => `${calYear}-${String(calMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}` === todayStr;

        const prevMonth = () => { if (calMonth === 1) { setCalMonth(12); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); };
        const nextMonth = () => { if (calMonth === 12) { setCalMonth(1); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); };

        return (
          <div
            onClick={() => setShowSanctuaryCalendar(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '16px', overflowY: 'auto' }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '780px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden', marginTop: '8px' }}
            >
              {/* Header */}
              <div style={{ background: '#1a2332', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ color: '#aaccbb', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sanctuary Calendar</div>
                  <div style={{ color: '#fff', fontSize: '17px', fontWeight: '700', marginTop: '2px' }}>{sanctuaryData?.property_name || ''}</div>
                </div>
                <button onClick={() => setShowSanctuaryCalendar(false)} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
              </div>

              {/* Month nav */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '14px 20px', borderBottom: '1px solid #eee' }}>
                <button onClick={prevMonth} style={{ background: '#f4f4f4', border: 'none', borderRadius: '8px', width: '34px', height: '34px', cursor: 'pointer', fontSize: '16px' }}>‹</button>
                <span style={{ fontSize: '17px', fontWeight: '700', color: '#1a2332', minWidth: '160px', textAlign: 'center' }}>{MONTHS[calMonth - 1]} {calYear}</span>
                <button onClick={nextMonth} style={{ background: '#f4f4f4', border: 'none', borderRadius: '8px', width: '34px', height: '34px', cursor: 'pointer', fontSize: '16px' }}>›</button>
              </div>

              {loadingCal ? (
                <div style={{ padding: '60px', textAlign: 'center', color: '#888' }}>Loading...</div>
              ) : (
                <div style={{ padding: '12px 16px 20px' }}>
                  {/* Day headers */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '4px', marginBottom: '4px' }}>
                    {DAY_NAMES.map(d => (
                      <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', color: '#888', padding: '4px 0', textTransform: 'uppercase' }}>{d}</div>
                    ))}
                  </div>

                  {/* Calendar grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '4px' }}>
                    {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                      const dayBookings = getBookingsForDay(day);
                      const dayMaint = getMaintenanceForDay(day);
                      const special = getSpecialForDay(day);
                      const today = isToday(day);
                      const hasConfirmed = dayBookings.some((b: any) => b.status === 'confirmed');
                      const hasPending = dayBookings.some((b: any) => b.status === 'pending');
                      const hasMaint = dayMaint.length > 0;

                      let cellBg = '#fff';
                      if (special?.is_holiday || special?.is_peak_season) cellBg = '#fffde7';
                      if (hasMaint) cellBg = '#fff3e0';
                      if (hasConfirmed) cellBg = '#e8f5e9';
                      if (hasPending && !hasConfirmed) cellBg = '#fff8e1';

                      return (
                        <div key={day} style={{ minHeight: '64px', border: today ? '2px solid #2d7a4f' : '1px solid #e8e8e8', borderRadius: '8px', padding: '4px 5px', background: cellBg, position: 'relative' }}>
                          <div style={{ fontSize: '12px', fontWeight: today ? '800' : '600', color: today ? '#2d7a4f' : '#333', marginBottom: '3px' }}>{day}</div>
                          {special && (special.is_holiday || special.is_peak_season) && (
                            <div style={{ fontSize: '9px', color: '#f57f17', fontWeight: '600', lineHeight: 1.2, marginBottom: '2px' }}>
                              {special.is_holiday ? `🟡 ${special.holiday_name || 'Holiday'}` : '🟡 Peak'}
                            </div>
                          )}
                          {hasMaint && <div style={{ fontSize: '9px', color: '#e65100', fontWeight: '600', lineHeight: 1.2, marginBottom: '2px' }}>🔧 Maint.</div>}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {dayBookings.slice(0, 2).map((b: any) => (
                              <div key={b.id} title={`${b.owner_name} · ${b.check_in} → ${b.check_out}`} style={{ fontSize: '8.5px', fontWeight: '600', borderRadius: '3px', padding: '1px 3px', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', background: b.status === 'confirmed' ? '#4caf50' : '#ffc107', color: b.status === 'confirmed' ? '#fff' : '#333' }}>
                                {b.cottage_name}
                              </div>
                            ))}
                            {dayBookings.length > 2 && <div style={{ fontSize: '8px', color: '#888' }}>+{dayBookings.length - 2} more</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '16px', padding: '10px 12px', background: '#f8f9fa', borderRadius: '8px', fontSize: '11px' }}>
                    {[
                      { color: '#4caf50', label: 'Confirmed' },
                      { color: '#ffc107', label: 'Pending', textColor: '#333' },
                      { color: '#ff9800', label: 'Maintenance' },
                      { color: '#fff176', label: 'Holiday/Peak', textColor: '#333', border: '1px solid #fdd835' },
                    ].map(l => (
                      <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: l.color, border: l.border || 'none', flexShrink: 0 }} />
                        <span style={{ color: '#555', fontWeight: '500' }}>{l.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })(), document.body)}

      {/* Bookings List */}
      <div className="card" style={{ marginTop: '30px' }}>
        <h2>My Bookings</h2>
        {loadingBookings ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Loading bookings...</div>
        ) : bookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
            <p>No bookings found. Make your first booking above!</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Cottage</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Check-in</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Check-out</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Credits Used</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Booked On</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => {
                  const getStatusStyle = (status: string) => {
                    const styles: { [key: string]: { backgroundColor: string; color: string } } = {
                      pending: { backgroundColor: '#fff3cd', color: '#856404' },
                      confirmed: { backgroundColor: '#d4edda', color: '#155724' },
                      rejected: { backgroundColor: '#f8d7da', color: '#721c24' },
                      cancelled: { backgroundColor: '#e2e3e5', color: '#383d41' },
                    };
                    return styles[status] || { backgroundColor: '#e2e3e5', color: '#383d41' };
                  };

                  const statusStyle = getStatusStyle(booking.status);
                  const isEditing = editingBooking === booking.id;
                  const canEdit = booking.status === 'pending';
                  const canDelete = booking.status === 'pending' || booking.status === 'confirmed';

                  return (
                    <React.Fragment key={booking.id}>
                      <tr 
                        style={{ 
                          borderBottom: '1px solid #dee2e6',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f8f9fa';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        {isEditing ? (
                          <>
                            <td style={{ padding: '12px' }}>
                              <select
                                value={editForm.cottage_id}
                                onChange={(e) => setEditForm({ ...editForm, cottage_id: parseInt(e.target.value) })}
                                className="input"
                                style={{ width: '100%', padding: '6px' }}
                              >
                                {cottages.map((cottage) => (
                                  <option key={cottage.id} value={cottage.id}>
                                    {cottage.cottage_id}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td style={{ padding: '12px' }}>
                              <input
                                type="date"
                                value={editForm.check_in}
                                onChange={(e) => setEditForm({ ...editForm, check_in: e.target.value })}
                                className="input"
                                style={{ width: '100%', padding: '6px' }}
                                min={getTodayDate()}
                              />
                            </td>
                            <td style={{ padding: '12px' }}>
                              <input
                                type="date"
                                value={editForm.check_out}
                                onChange={(e) => setEditForm({ ...editForm, check_out: e.target.value })}
                                className="input"
                                style={{ width: '100%', padding: '6px' }}
                                min={editForm.check_in || getTodayDate()}
                              />
                            </td>
                            <td style={{ padding: '12px' }}>
                              <span
                                style={{
                                  padding: '4px 12px',
                                  borderRadius: '12px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  textTransform: 'uppercase',
                                  display: 'inline-block',
                                  ...statusStyle
                                }}
                              >
                                {booking.status}
                              </span>
                            </td>
                            <td style={{ padding: '12px', color: '#495057' }}>
                              <div style={{ fontSize: '13px' }}>
                                <div>Weekday: {booking.weekday_credits_used}</div>
                                <div>Weekend: {booking.weekend_credits_used}</div>
                                <div style={{ fontWeight: '600', marginTop: '4px', color: '#007bff' }}>
                                  Total: {booking.weekday_credits_used + booking.weekend_credits_used}
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '12px', color: '#6c757d', fontSize: '13px' }}>
                              {new Date(booking.created_at).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td style={{ padding: '12px' }}>
                              <div style={{ display: 'flex', gap: '5px' }}>
                                <button
                                  onClick={() => handleUpdateBooking(booking.id)}
                                  className="btn btn-primary"
                                  style={{ padding: '6px 12px', fontSize: '12px' }}
                                  disabled={loading}
                                >
                                  Save
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="btn btn-secondary"
                                  style={{ padding: '6px 12px', fontSize: '12px' }}
                                  disabled={loading}
                                >
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td style={{ padding: '12px', color: '#495057' }}>{booking.cottage_name}</td>
                            <td style={{ padding: '12px', color: '#495057' }}>
                              {new Date(booking.check_in).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </td>
                            <td style={{ padding: '12px', color: '#495057' }}>
                              {new Date(booking.check_out).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </td>
                            <td style={{ padding: '12px' }}>
                              <span
                                style={{
                                  padding: '4px 12px',
                                  borderRadius: '12px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  textTransform: 'uppercase',
                                  display: 'inline-block',
                                  ...statusStyle
                                }}
                              >
                                {booking.status}
                              </span>
                            </td>
                            <td style={{ padding: '12px', color: '#495057' }}>
                              <div style={{ fontSize: '13px' }}>
                                <div>Weekday: {booking.weekday_credits_used}</div>
                                <div>Weekend: {booking.weekend_credits_used}</div>
                                <div style={{ fontWeight: '600', marginTop: '4px', color: '#007bff' }}>
                                  Total: {booking.weekday_credits_used + booking.weekend_credits_used}
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '12px', color: '#6c757d', fontSize: '13px' }}>
                              {new Date(booking.created_at).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td style={{ padding: '12px' }}>
                              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                {canEdit && (
                                  <button
                                    onClick={() => handleEditBooking(booking)}
                                    className="btn btn-secondary"
                                    style={{ padding: '6px 12px', fontSize: '12px' }}
                                    title="Edit booking"
                                  >
                                    ✏️ Edit
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    onClick={() => handleDeleteBooking(booking.id)}
                                    className="btn btn-secondary"
                                    style={{ 
                                      padding: '6px 12px', 
                                      fontSize: '12px',
                                      backgroundColor: '#dc3545',
                                      color: 'white',
                                      border: 'none'
                                    }}
                                    title="Delete booking"
                                    disabled={loading}
                                  >
                                    🗑️ Delete
                                  </button>
                                )}
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingCalendar;

