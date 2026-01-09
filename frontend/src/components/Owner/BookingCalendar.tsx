import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (selectedCottage && checkIn && checkOut) {
      fetchAvailability();
      calculateCost();
    }
  }, [selectedCottage, checkIn, checkOut]);

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
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="card">
        <h2>Book a Cottage (OWN-04, OWN-05, OWN-06, OWN-07)</h2>
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
                Cost Breakdown (OWN-06)
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
              <h4 style={{ marginBottom: '15px' }}>Availability Calendar</h4>
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
    </div>
  );
};

export default BookingCalendar;

