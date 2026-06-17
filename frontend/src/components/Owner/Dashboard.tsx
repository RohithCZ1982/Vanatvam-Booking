import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

interface Cottage {
  id: number;
  cottage_id: string;
  capacity: number;
  amenities: string | null;
  image_url: string | null;
  property_id: number;
}

interface DashboardData {
  user: any;
  property: any;
  cottages: Cottage[];
  available_weekday: number;
  available_weekend: number;
  pending_weekday: number;
  pending_weekend: number;
}

interface CostBreakdown {
  weekday_credits: number;
  weekend_credits: number;
  total_credits: number;
}

interface QuotaStatus {
  available_weekday: number;
  available_weekend: number;
  weekday_balance: number;
  weekend_balance: number;
  pending_weekday: number;
  pending_weekend: number;
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

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCottage, setSelectedCottage] = useState<Cottage | null>(null);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown | null>(null);
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatus | null>(null);
  const [availability, setAvailability] = useState<AvailabilityData | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [quotaError, setQuotaError] = useState('');
  const [hoveredCottage, setHoveredCottage] = useState<number | null>(null);
  const [imageErrors, setImageErrors] = useState<{ [key: number]: boolean }>({});

  // Sanctuary calendar modal
  const [showSanctuaryCalendar, setShowSanctuaryCalendar] = useState(false);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);
  const [sanctuaryData, setSanctuaryData] = useState<any>(null);
  const [loadingCal, setLoadingCal] = useState(false);

  // Default dates: today + 2 days
  const getDefaultDates = () => {
    const today = new Date();
    const checkInDate = new Date(today);
    const checkOutDate = new Date(today);
    checkOutDate.setDate(checkOutDate.getDate() + 2);
    return {
      checkIn: formatDate(checkInDate),
      checkOut: formatDate(checkOutDate),
    };
  };

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getTodayDate = () => formatDate(new Date());

  useEffect(() => {
    fetchDashboard();
    fetchQuotaStatus();
    const defaults = getDefaultDates();
    setCheckIn(defaults.checkIn);
    setCheckOut(defaults.checkOut);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (showSanctuaryCalendar) fetchSanctuaryCalendar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSanctuaryCalendar, calYear, calMonth]);

  const fetchSanctuaryCalendar = async () => {
    setLoadingCal(true);
    try {
      const res = await api.get(`/api/owner/sanctuary-calendar?year=${calYear}&month=${calMonth}`);
      setSanctuaryData(res.data);
    } catch (e) { console.error(e); }
    finally { setLoadingCal(false); }
  };

  const calPrevMonth = () => {
    if (calMonth === 1) { setCalMonth(12); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const calNextMonth = () => {
    if (calMonth === 12) { setCalMonth(1); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };
  const calDayStr = (day: number) =>
    `${calYear}-${String(calMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  const calBookingsForDay = (day: number): any[] => {
    if (!sanctuaryData?.bookings) return [];
    const ds = calDayStr(day);
    return sanctuaryData.bookings.filter((b: any) => b.check_in <= ds && b.check_out > ds);
  };
  const calMaintForDay = (day: number): any[] => {
    if (!sanctuaryData?.maintenance) return [];
    const ds = calDayStr(day);
    return sanctuaryData.maintenance.filter((m: any) => m.start_date <= ds && m.end_date >= ds);
  };
  const calSpecialForDay = (day: number): any =>
    sanctuaryData?.special_dates?.[calDayStr(day)] || null;
  const todayStr = new Date().toISOString().split('T')[0];
  const calFirstDay = new Date(calYear, calMonth - 1, 1).getDay();
  const calDaysInMonth = new Date(calYear, calMonth, 0).getDate();
  const CAL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const CAL_DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/api/owner/dashboard');
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuotaStatus = async () => {
    try {
      const response = await api.get('/api/owner/quota-status');
      setQuotaStatus(response.data);
    } catch (error) {
      console.error('Error fetching quota status:', error);
    }
  };

  const fetchAvailability = async (cottageId: number, cin: string, cout: string) => {
    if (!cin || !cout) return;
    try {
      const response = await api.get(
        `/api/owner/availability/${cottageId}?start_date=${cin}&end_date=${cout}`
      );
      setAvailability(response.data);
    } catch (error) {
      console.error('Error fetching availability:', error);
    }
  };

  const calculateCost = async (cottageId: number, cin: string, cout: string) => {
    if (!cin || !cout) return;
    try {
      const response = await api.post('/api/owner/calculate-cost', {
        cottage_id: cottageId,
        check_in: cin,
        check_out: cout,
      });
      setCostBreakdown(response.data);
    } catch (error) {
      console.error('Error calculating cost:', error);
    }
  };

  useEffect(() => {
    if (selectedCottage && checkIn && checkOut && checkIn < checkOut) {
      fetchAvailability(selectedCottage.id, checkIn, checkOut);
      calculateCost(selectedCottage.id, checkIn, checkOut);
    } else {
      setAvailability(null);
      setCostBreakdown(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCottage, checkIn, checkOut]);

  useEffect(() => {
    if (costBreakdown && quotaStatus) {
      const errors: string[] = [];
      if (costBreakdown.weekday_credits > quotaStatus.available_weekday) {
        errors.push(`Weekday: need ${costBreakdown.weekday_credits}, have ${quotaStatus.available_weekday}`);
      }
      if (costBreakdown.weekend_credits > quotaStatus.available_weekend) {
        errors.push(`Weekend: need ${costBreakdown.weekend_credits}, have ${quotaStatus.available_weekend}`);
      }
      setQuotaError(errors.length > 0 ? errors.join('. ') : '');
    } else {
      setQuotaError('');
    }
  }, [costBreakdown, quotaStatus]);

  const isQuotaExceeded = () => {
    if (!costBreakdown || !quotaStatus) return false;
    return (
      costBreakdown.weekday_credits > quotaStatus.available_weekday ||
      costBreakdown.weekend_credits > quotaStatus.available_weekend
    );
  };

  const handleCottageSelect = (cottage: Cottage) => {
    setSelectedCottage(cottage);
    setBookingError('');
    setBookingSuccess(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToGrid = () => {
    setSelectedCottage(null);
    setCostBreakdown(null);
    setAvailability(null);
    setBookingError('');
    setBookingSuccess(false);
  };

  const handleBooking = async () => {
    if (!selectedCottage || !checkIn || !checkOut) return;

    setBookingError('');
    setBookingSuccess(false);
    setBookingLoading(true);

    try {
      await api.post('/api/owner/bookings', {
        cottage_id: selectedCottage.id,
        check_in: checkIn,
        check_out: checkOut,
      });
      setBookingSuccess(true);
      fetchQuotaStatus();
      const defaults = getDefaultDates();
      setCheckIn(defaults.checkIn);
      setCheckOut(defaults.checkOut);
      setTimeout(() => {
        setBookingSuccess(false);
      }, 4000);
    } catch (err: any) {
      setBookingError(err.response?.data?.detail || 'Booking failed. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  const getImageUrl = (imageUrl: string | null) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('http')) return imageUrl;
    return `${API_URL}${imageUrl}`;
  };

  const getAmenitiesList = (amenities: string | null): string[] => {
    if (!amenities) return [];
    return amenities.split(',').map(a => a.trim()).filter(a => a.length > 0);
  };

  const getAmenityIcon = (amenity: string): string => {
    const lower = amenity.toLowerCase();
    if (lower.includes('wifi') || lower.includes('internet')) return '📶';
    if (lower.includes('ac') || lower.includes('air')) return '❄️';
    if (lower.includes('kitchen') || lower.includes('cook')) return '🍳';
    if (lower.includes('pool') || lower.includes('swim')) return '🏊';
    if (lower.includes('parking') || lower.includes('car')) return '🚗';
    if (lower.includes('tv') || lower.includes('television')) return '📺';
    if (lower.includes('garden') || lower.includes('lawn')) return '🌿';
    if (lower.includes('fireplace') || lower.includes('fire')) return '🔥';
    if (lower.includes('pet') || lower.includes('dog')) return '🐕';
    if (lower.includes('balcony') || lower.includes('view')) return '🏔️';
    if (lower.includes('bbq') || lower.includes('grill')) return '🍖';
    if (lower.includes('laundry') || lower.includes('wash')) return '🧺';
    if (lower.includes('bed')) return '🛏️';
    if (lower.includes('bath')) return '🛁';
    return '✨';
  };

  const getDaysBetween = (cin: string, cout: string): number => {
    const d1 = new Date(cin);
    const d2 = new Date(cout);
    return Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Placeholder images for cottages without images
  const placeholderImages = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  ];

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #FF385C',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    );
  }

  if (!dashboardData) return <div>Error loading dashboard</div>;

  // ============================================================
  // COTTAGE DETAIL VIEW (when a cottage is selected)
  // ============================================================
  if (selectedCottage) {
    const imageUrl = getImageUrl(selectedCottage.image_url);
    const amenities = getAmenitiesList(selectedCottage.amenities);
    const days = checkIn && checkOut && checkIn < checkOut ? getDaysBetween(checkIn, checkOut) : 0;

    return (
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Back button */}
        <button
          onClick={handleBackToGrid}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            fontSize: '15px',
            color: '#222',
            cursor: 'pointer',
            padding: '8px 0',
            marginBottom: '16px',
            fontWeight: '500',
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#FF385C'}
          onMouseLeave={e => e.currentTarget.style.color = '#222'}
        >
          ← Back to all cottages
        </button>

        {/* Hero Image */}
        <div style={{
          width: '100%',
          height: '420px',
          borderRadius: '16px',
          overflow: 'hidden',
          position: 'relative',
          marginBottom: '28px',
          boxShadow: '0 6px 30px rgba(0,0,0,0.12)',
        }}>
          {imageUrl && !imageErrors[selectedCottage.id] ? (
            <img
              src={imageUrl}
              alt={selectedCottage.cottage_id}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
              onError={() => setImageErrors(prev => ({ ...prev, [selectedCottage.id]: true }))}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              background: placeholderImages[selectedCottage.id % placeholderImages.length],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '80px',
            }}>
              🏡
            </div>
          )}
          {/* Gradient overlay at bottom */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '120px',
            background: 'linear-gradient(transparent, rgba(0,0,0,0.5))',
            display: 'flex',
            alignItems: 'flex-end',
            padding: '20px 28px',
          }}>
            <h1 style={{
              color: 'white',
              fontSize: '32px',
              fontWeight: '700',
              margin: 0,
              textShadow: '0 2px 8px rgba(0,0,0,0.4)',
              letterSpacing: '-0.5px',
            }}>
              {selectedCottage.cottage_id}
            </h1>
          </div>
        </div>

        {/* Content: Two columns layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 380px',
          gap: '40px',
          alignItems: 'flex-start',
        }}>
          {/* Left: Details */}
          <div>
            {/* Title & Meta */}
            <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #EBEBEB' }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '600',
                color: '#222',
                margin: '0 0 8px 0',
                background: 'none',
                padding: 0,
                border: 'none',
                boxShadow: 'none',
                backdropFilter: 'none',
                WebkitBackdropFilter: 'none',
                textShadow: 'none',
                letterSpacing: '-0.3px',
              }}>
                Cottage in {dashboardData.property?.name}
              </h2>
              <p style={{
                color: '#717171',
                fontSize: '16px',
                margin: 0,
              }}>
                {selectedCottage.capacity} {selectedCottage.capacity === 1 ? 'guest' : 'guests'} · {amenities.length > 0 ? amenities.length : 'No'} amenities listed
              </p>
            </div>

            {/* Description / Amenities */}
            {amenities.length > 0 && (
              <div style={{ marginBottom: '28px', paddingBottom: '28px', borderBottom: '1px solid #EBEBEB' }}>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#222',
                  margin: '0 0 20px 0',
                  background: 'none',
                  padding: 0,
                  border: 'none',
                  boxShadow: 'none',
                  backdropFilter: 'none',
                  WebkitBackdropFilter: 'none',
                  textShadow: 'none',
                }}>
                  What this place offers
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                }}>
                  {amenities.map((amenity, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '4px 0',
                    }}>
                      <span style={{ fontSize: '24px' }}>{getAmenityIcon(amenity)}</span>
                      <span style={{ fontSize: '16px', color: '#222' }}>{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Availability Calendar */}
            {availability && (
              <div style={{ marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <h3 style={{
                    fontSize: '20px', fontWeight: '600', color: '#222', margin: 0,
                    background: 'none', padding: 0, border: 'none', boxShadow: 'none',
                    backdropFilter: 'none', WebkitBackdropFilter: 'none', textShadow: 'none',
                  }}>
                    Availability
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowSanctuaryCalendar(true)}
                    style={{
                      padding: '5px 14px', borderRadius: '20px',
                      border: '1.5px solid #2d7a4f', background: '#fff',
                      color: '#2d7a4f', fontSize: '12px', fontWeight: '600',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#2d7a4f'; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#2d7a4f'; }}
                  >
                    📅 Sanctuary Calendar
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                  {availability.availability.map((day) => {
                    const isHolidayOrPeak = day.is_holiday || day.is_peak_season;
                    const dayDate = new Date(day.date).toISOString().split('T')[0];
                    const isSelectedDate = dayDate === checkIn || dayDate === checkOut;
                    const d = new Date(day.date);
                    const dayNum = d.getDate();
                    const monthStr = d.toLocaleDateString('en-US', { month: 'short' });

                    let bg = '#E8F5E9';
                    let borderClr = '#C8E6C9';
                    let textColor = '#2E7D32';
                    if (day.is_booked) { bg = '#FFEBEE'; borderClr = '#FFCDD2'; textColor = '#C62828'; }
                    else if (day.is_maintenance) { bg = '#FFF8E1'; borderClr = '#FFECB3'; textColor = '#F57F17'; }
                    if (isHolidayOrPeak && !day.is_booked && !day.is_maintenance) {
                      bg = '#FFFDE7'; borderClr = '#FFF9C4'; textColor = '#F57F17';
                    }
                    if (isSelectedDate) { bg = '#222'; borderClr = '#222'; textColor = '#fff'; }

                    return (
                      <div key={day.date} style={{
                        width: '48px',
                        padding: '6px 2px',
                        textAlign: 'center',
                        backgroundColor: bg,
                        border: `1.5px solid ${borderClr}`,
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: isSelectedDate ? '700' : '500',
                        color: textColor,
                        transition: 'all 0.2s',
                      }}
                        title={
                          day.is_booked ? 'Booked' :
                            day.is_maintenance ? 'Maintenance' :
                              day.is_holiday ? 'Holiday' :
                                day.is_peak_season ? 'Peak Season' : 'Available'
                        }>
                        <div style={{ fontSize: '13px', fontWeight: '700' }}>{dayNum}</div>
                        <div style={{ fontSize: '9px', opacity: 0.8, marginTop: '1px' }}>{monthStr}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px', color: '#717171' }}>
                  <span>🟢 Available</span>
                  <span>🔴 Booked</span>
                  <span>🟡 Holiday/Peak</span>
                  <span>🟠 Maintenance</span>
                  <span>⬛ Selected</span>
                </div>
              </div>
            )}
          </div>

          {/* Right: Booking Card (sticky) */}
          <div style={{
            position: 'sticky',
            top: '20px',
          }}>
            <div style={{
              background: '#fff',
              borderRadius: '12px',
              border: '1px solid #DDDDDD',
              padding: '24px',
              boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
            }}>
              {/* Quota summary */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '20px',
                paddingBottom: '16px',
                borderBottom: '1px solid #EBEBEB',
              }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#717171', marginBottom: '2px' }}>Weekday Credits</div>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: '#222' }}>
                    {quotaStatus?.available_weekday ?? '—'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', color: '#717171', marginBottom: '2px' }}>Weekend Credits</div>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: '#222' }}>
                    {quotaStatus?.available_weekend ?? '—'}
                  </div>
                </div>
              </div>

              {/* Date Inputs */}
              <div style={{
                border: '1px solid #B0B0B0',
                borderRadius: '12px',
                overflow: 'hidden',
                marginBottom: '16px',
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                  <div style={{
                    padding: '12px',
                    borderRight: '1px solid #B0B0B0',
                  }}>
                    <label style={{
                      display: 'block',
                      fontSize: '10px',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: '#222',
                      marginBottom: '4px',
                    }}>Check-in</label>
                    <input
                      type="date"
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      min={getTodayDate()}
                      style={{
                        border: 'none',
                        outline: 'none',
                        fontSize: '14px',
                        color: '#222',
                        width: '100%',
                        padding: 0,
                        background: 'transparent',
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>
                  <div style={{ padding: '12px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '10px',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: '#222',
                      marginBottom: '4px',
                    }}>Checkout</label>
                    <input
                      type="date"
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      min={checkIn || getTodayDate()}
                      style={{
                        border: 'none',
                        outline: 'none',
                        fontSize: '14px',
                        color: '#222',
                        width: '100%',
                        padding: 0,
                        background: 'transparent',
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Cost Breakdown */}
              {costBreakdown && (
                <div style={{
                  marginBottom: '16px',
                  padding: '16px',
                  background: '#F7F7F7',
                  borderRadius: '12px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: '#222' }}>
                    <span>Weekday credits × {costBreakdown.weekday_credits}</span>
                    <span>{costBreakdown.weekday_credits}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: '#222' }}>
                    <span>Weekend credits × {costBreakdown.weekend_credits}</span>
                    <span>{costBreakdown.weekend_credits}</span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingTop: '12px',
                    borderTop: '1px solid #DDDDDD',
                    fontSize: '16px',
                    fontWeight: '700',
                    color: '#222',
                  }}>
                    <span>Total ({days} {days === 1 ? 'night' : 'nights'})</span>
                    <span>{costBreakdown.total_credits} credits</span>
                  </div>
                </div>
              )}

              {/* Errors */}
              {quotaError && (
                <div style={{
                  padding: '12px 14px',
                  background: '#FFF0F0',
                  borderRadius: '10px',
                  border: '1px solid #FFD6D6',
                  marginBottom: '12px',
                  fontSize: '13px',
                  color: '#CC0000',
                  lineHeight: '1.4',
                }}>
                  ⚠️ Insufficient credits: {quotaError}
                </div>
              )}

              {bookingError && (
                <div style={{
                  padding: '12px 14px',
                  background: '#FFF0F0',
                  borderRadius: '10px',
                  border: '1px solid #FFD6D6',
                  marginBottom: '12px',
                  fontSize: '13px',
                  color: '#CC0000',
                }}>
                  {bookingError}
                </div>
              )}

              {bookingSuccess && (
                <div style={{
                  padding: '12px 14px',
                  background: '#F0FFF4',
                  borderRadius: '10px',
                  border: '1px solid #C6F6D5',
                  marginBottom: '12px',
                  fontSize: '13px',
                  color: '#22543D',
                }}>
                  ✅ Booking request submitted! Check "My Trips" for status.
                </div>
              )}

              {/* Reserve Button */}
              <button
                onClick={handleBooking}
                disabled={bookingLoading || !costBreakdown || isQuotaExceeded() || !checkIn || !checkOut || checkIn >= checkOut}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: (bookingLoading || !costBreakdown || isQuotaExceeded() || !checkIn || !checkOut || checkIn >= checkOut)
                    ? '#DDD'
                    : 'linear-gradient(to right, #E61E4D, #E31C5F, #D70466)',
                  border: 'none',
                  borderRadius: '8px',
                  color: (bookingLoading || !costBreakdown || isQuotaExceeded()) ? '#999' : 'white',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: (bookingLoading || !costBreakdown || isQuotaExceeded()) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  letterSpacing: '0.3px',
                }}
                onMouseEnter={e => {
                  if (!bookingLoading && costBreakdown && !isQuotaExceeded()) {
                    e.currentTarget.style.opacity = '0.9';
                    e.currentTarget.style.transform = 'scale(1.01)';
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {bookingLoading ? 'Submitting...' : 'Reserve'}
              </button>

              <p style={{ textAlign: 'center', fontSize: '13px', color: '#717171', marginTop: '10px', marginBottom: 0 }}>
                You won't be charged yet · Pending admin approval
              </p>
            </div>

            {/* Quick actions */}
            <div style={{
              marginTop: '16px',
              display: 'flex',
              gap: '8px',
            }}>
              <button
                onClick={() => navigate('/owner/trips')}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#fff',
                  border: '1px solid #DDDDDD',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  color: '#222',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#222'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#DDDDDD'}
              >
                🎒 My Trips
              </button>
            </div>
          </div>
        </div>

        <style>{`
          @media (max-width: 768px) {
            div[style*="grid-template-columns: 1fr 380px"] {
              grid-template-columns: 1fr !important;
              gap: 24px !important;
            }
            div[style*="height: 420px"] {
              height: 160px !important;
            }
            div[style*="grid-template-columns: 1fr 1fr"] {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    );
  }

  // ============================================================
  // MAIN DASHBOARD - Cottage Grid (Airbnb-style)
  // ============================================================
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: '700',
          color: '#222',
          margin: '0 0 8px 0',
          letterSpacing: '-0.5px',
        }}>
          Welcome back, {dashboardData.user.name?.split(' ')[0]} 👋
        </h1>
        <p style={{ color: '#717171', fontSize: '16px', margin: 0 }}>
          {dashboardData.property?.name} · {dashboardData.cottages.length} cottages available
        </p>
      </div>

      {/* Quick Stats Bar */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '32px',
        flexWrap: 'wrap',
      }}>
        <div style={{
          flex: '1 1 200px',
          background: '#fff',
          borderRadius: '12px',
          padding: '16px 20px',
          border: '1px solid #EBEBEB',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}>
          <div style={{ fontSize: '12px', color: '#717171', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>
            Weekday Credits
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '28px', fontWeight: '700', color: '#222' }}>
              {dashboardData.user.weekday_quota} <span style={{ color: '#ddd', fontWeight: '300', margin: '0 2px' }}>|</span> {dashboardData.available_weekday}
            </span>
            <span style={{ fontSize: '13px', color: '#717171' }}>total | available</span>
          </div>
          <div style={{ fontSize: '12px', color: '#E53E3E', marginTop: '6px' }}>
            📉 {dashboardData.user.weekday_quota - dashboardData.available_weekday - dashboardData.pending_weekday} used
          </div>
          {dashboardData.pending_weekday > 0 && (
            <div style={{ fontSize: '12px', color: '#E08A00', marginTop: '2px' }}>
              🔒 {dashboardData.pending_weekday} in escrow
            </div>
          )}
        </div>

        <div style={{
          flex: '1 1 200px',
          background: '#fff',
          borderRadius: '12px',
          padding: '16px 20px',
          border: '1px solid #EBEBEB',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}>
          <div style={{ fontSize: '12px', color: '#717171', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>
            Weekend Credits
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '28px', fontWeight: '700', color: '#222' }}>
              {dashboardData.user.weekend_quota} <span style={{ color: '#ddd', fontWeight: '300', margin: '0 2px' }}>|</span> {dashboardData.available_weekend}
            </span>
            <span style={{ fontSize: '13px', color: '#717171' }}>total | available</span>
          </div>
          <div style={{ fontSize: '12px', color: '#E53E3E', marginTop: '6px' }}>
            📉 {dashboardData.user.weekend_quota - dashboardData.available_weekend - dashboardData.pending_weekend} used
          </div>
          {dashboardData.pending_weekend > 0 && (
            <div style={{ fontSize: '12px', color: '#E08A00', marginTop: '2px' }}>
              🔒 {dashboardData.pending_weekend} in escrow
            </div>
          )}
        </div>

        <div style={{
          flex: '1 1 200px',
          background: '#fff',
          borderRadius: '12px',
          padding: '16px 20px',
          border: '1px solid #EBEBEB',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}>
          <div style={{ fontSize: '12px', color: '#717171', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>
            Quick Links
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button
              onClick={() => navigate('/owner/trips')}
              style={{
                padding: '6px 12px',
                borderRadius: '20px',
                border: '1px solid #DDDDDD',
                background: '#fff',
                fontSize: '12px',
                cursor: 'pointer',
                color: '#222',
                fontWeight: '500',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#222'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#222'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#222'; e.currentTarget.style.borderColor = '#DDDDDD'; }}
            >
              🎒 My Trips
            </button>
            <button
              onClick={() => navigate('/owner/transactions')}
              style={{
                padding: '6px 12px',
                borderRadius: '20px',
                border: '1px solid #DDDDDD',
                background: '#fff',
                fontSize: '12px',
                cursor: 'pointer',
                color: '#222',
                fontWeight: '500',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#222'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#222'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#222'; e.currentTarget.style.borderColor = '#DDDDDD'; }}
            >
              📜 Transactions
            </button>
          </div>
        </div>
      </div>

      {/* Section Title */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{
          fontSize: '22px',
          fontWeight: '600',
          color: '#222',
          margin: 0,
          background: 'none',
          padding: 0,
          border: 'none',
          boxShadow: 'none',
          backdropFilter: 'none',
          WebkitBackdropFilter: 'none',
          textShadow: 'none',
          letterSpacing: '-0.3px',
        }}>
          Available Cottages
        </h2>
      </div>

      {/* Cottage Grid */}
      {dashboardData.cottages.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '24px',
        }}>
          {dashboardData.cottages.map((cottage, index) => {
            const imageUrl = getImageUrl(cottage.image_url);
            const amenities = getAmenitiesList(cottage.amenities);
            const isHovered = hoveredCottage === cottage.id;

            return (
              <div
                key={cottage.id}
                onClick={() => handleCottageSelect(cottage)}
                onMouseEnter={() => setHoveredCottage(cottage.id)}
                onMouseLeave={() => setHoveredCottage(null)}
                style={{
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease',
                  transform: isHovered ? 'translateY(-4px)' : 'none',
                }}
              >
                {/* Image */}
                <div style={{
                  width: '100%',
                  aspectRatio: '4/3',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  position: 'relative',
                  marginBottom: '10px',
                  boxShadow: isHovered ? '0 8px 25px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.06)',
                  transition: 'box-shadow 0.2s ease',
                }}>
                  {imageUrl && !imageErrors[cottage.id] ? (
                    <img
                      src={imageUrl}
                      alt={cottage.cottage_id}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.4s ease',
                        transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                      }}
                      onError={() => setImageErrors(prev => ({ ...prev, [cottage.id]: true }))}
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      background: placeholderImages[index % placeholderImages.length],
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '48px',
                      transition: 'transform 0.4s ease',
                      transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                    }}>
                      🏡
                    </div>
                  )}

                  {/* Capacity badge */}
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    background: 'rgba(0,0,0,0.65)',
                    backdropFilter: 'blur(8px)',
                    color: 'white',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}>
                    👥 {cottage.capacity}
                  </div>
                </div>

                {/* Info */}
                <div className="cottage-card-info" style={{ padding: '0 2px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '2px',
                  }}>
                    <h3 style={{
                      fontSize: '15px',
                      fontWeight: '600',
                      color: '#222',
                      margin: 0,
                      background: 'none',
                      padding: 0,
                      border: 'none',
                      boxShadow: 'none',
                      backdropFilter: 'none',
                      WebkitBackdropFilter: 'none',
                      textShadow: 'none',
                    }}>
                      {cottage.cottage_id}
                    </h3>
                  </div>
                  <p style={{ color: '#717171', fontSize: '14px', margin: '2px 0' }}>
                    {dashboardData.property?.name}
                  </p>
                  {amenities.length > 0 && (
                    <p style={{ color: '#717171', fontSize: '13px', margin: '2px 0' }}>
                      {amenities.slice(0, 3).join(' · ')}{amenities.length > 3 ? ` +${amenities.length - 3} more` : ''}
                    </p>
                  )}
                  <p style={{ color: '#222', fontSize: '14px', margin: '6px 0 0', fontWeight: '600' }}>
                    {cottage.capacity} {cottage.capacity === 1 ? 'guest' : 'guests'} · 2 nights default
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: '#fff',
          borderRadius: '12px',
          border: '1px solid #EBEBEB',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏠</div>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#222',
            marginBottom: '8px',
            background: 'none',
            padding: 0,
            border: 'none',
            boxShadow: 'none',
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
            textShadow: 'none',
          }}>
            No cottages available
          </h3>
          <p style={{ color: '#717171', fontSize: '15px' }}>
            Contact your admin to add cottages to your sanctuary.
          </p>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          div[style*="grid-template-columns: repeat(auto-fill"] {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 14px !important;
            padding: 0 4px !important;
          }
          div[style*="aspectRatio"] {
            aspect-ratio: 3/2 !important;
            border-radius: 10px !important;
          }
          div[style*="maxWidth: '1200px'"] {
            padding: 0 12px !important;
          }
          .cottage-card-info h3 {
            font-size: 13px !important;
          }
          .cottage-card-info p {
            font-size: 11px !important;
            margin: 1px 0 !important;
          }
          .cottage-card-info span[style*="fontSize: '14px'"] {
            font-size: 12px !important;
          }
        }
        @media (max-width: 480px) {
          div[style*="grid-template-columns: repeat(auto-fill"] {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 10px !important;
            padding: 0 2px !important;
          }
          div[style*="aspectRatio"] {
            aspect-ratio: 1/1 !important;
            border-radius: 8px !important;
          }
          .cottage-card-info h3 {
            font-size: 12px !important;
          }
          .cottage-card-info p:nth-child(n+3) {
            display: none !important;
          }
        }
      `}</style>

      {/* ── Sanctuary Calendar Modal ─────────────────────── */}
      {showSanctuaryCalendar && ReactDOM.createPortal(
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
              <button onClick={calPrevMonth} style={{ background: '#f4f4f4', border: 'none', borderRadius: '8px', width: '34px', height: '34px', cursor: 'pointer', fontSize: '16px' }}>&#8249;</button>
              <span style={{ fontSize: '17px', fontWeight: '700', color: '#1a2332', minWidth: '160px', textAlign: 'center' }}>{CAL_MONTHS[calMonth - 1]} {calYear}</span>
              <button onClick={calNextMonth} style={{ background: '#f4f4f4', border: 'none', borderRadius: '8px', width: '34px', height: '34px', cursor: 'pointer', fontSize: '16px' }}>&#8250;</button>
            </div>
            {loadingCal ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#888' }}>Loading...</div>
            ) : (
              <div style={{ padding: '12px 16px 20px' }}>
                {/* Day headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '4px', marginBottom: '4px' }}>
                  {CAL_DAYS.map(d => (
                    <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', color: '#888', padding: '4px 0', textTransform: 'uppercase' }}>{d}</div>
                  ))}
                </div>
                {/* Calendar days */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '4px' }}>
                  {Array.from({ length: calFirstDay }).map((_, i) => <div key={`e${i}`} />)}
                  {Array.from({ length: calDaysInMonth }, (_, i) => i + 1).map(day => {
                    const dayBookings = calBookingsForDay(day);
                    const dayMaint = calMaintForDay(day);
                    const special = calSpecialForDay(day);
                    const isToday = calDayStr(day) === todayStr;
                    const hasConfirmed = dayBookings.some((b: any) => b.status === 'confirmed');
                    const hasPending = dayBookings.some((b: any) => b.status === 'pending');
                    let cellBg = '#fff';
                    if (special?.is_holiday || special?.is_peak_season) cellBg = '#fffde7';
                    if (dayMaint.length > 0) cellBg = '#fff3e0';
                    if (hasConfirmed) cellBg = '#e8f5e9';
                    if (hasPending && !hasConfirmed) cellBg = '#fff8e1';
                    return (
                      <div key={day} style={{ minHeight: '64px', border: isToday ? '2px solid #2d7a4f' : '1px solid #e8e8e8', borderRadius: '8px', padding: '4px 5px', background: cellBg }}>
                        <div style={{ fontSize: '12px', fontWeight: isToday ? '800' : '600', color: isToday ? '#2d7a4f' : '#333', marginBottom: '3px' }}>{day}</div>
                        {special && (special.is_holiday || special.is_peak_season) && (
                          <div style={{ fontSize: '9px', color: '#f57f17', fontWeight: '600', lineHeight: 1.2, marginBottom: '2px' }}>
                            {special.is_holiday ? `🟡 ${special.holiday_name || 'Holiday'}` : '🟡 Peak'}
                          </div>
                        )}
                        {dayMaint.length > 0 && <div style={{ fontSize: '9px', color: '#e65100', fontWeight: '600', lineHeight: 1.2, marginBottom: '2px' }}>🔧 Maint.</div>}
                        {dayBookings.slice(0, 2).map((b: any) => (
                          <div key={b.id} title={`${b.owner_name} · ${b.check_in} → ${b.check_out}`}
                            style={{ fontSize: '8.5px', fontWeight: '600', borderRadius: '3px', padding: '1px 3px', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px', background: b.status === 'confirmed' ? '#4caf50' : '#ffc107', color: b.status === 'confirmed' ? '#fff' : '#333' }}>
                            {b.cottage_name}
                          </div>
                        ))}
                        {dayBookings.length > 2 && <div style={{ fontSize: '8px', color: '#888' }}>+{dayBookings.length - 2} more</div>}
                      </div>
                    );
                  })}
                </div>
                {/* Legend */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '16px', padding: '10px 12px', background: '#f8f9fa', borderRadius: '8px', fontSize: '11px' }}>
                  {([
                    { color: '#4caf50', label: 'Confirmed', border: 'none' },
                    { color: '#ffc107', label: 'Pending', border: '1px solid #e0a800' },
                    { color: '#ff9800', label: 'Maintenance', border: 'none' },
                    { color: '#fff176', label: 'Holiday/Peak', border: '1px solid #fdd835' },
                  ] as {color:string;label:string;border:string}[]).map(l => (
                    <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: l.color, border: l.border, flexShrink: 0 }} />
                      <span style={{ color: '#555', fontWeight: '500' }}>{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Dashboard;
