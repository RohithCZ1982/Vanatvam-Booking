import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './BookingsCalendar.css';

interface Booking {
  id: number;
  cottage_name: string;
  cottage_id: number;
  check_in: string;
  check_out: string;
  status: string;
  user_name: string;
  property_name?: string;
}

interface Holiday {
  date: string;
  holiday_name: string;
}

interface PeakSeason {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
}

interface MaintenanceBlock {
  id: number;
  cottage_id: number;
  start_date: string;
  end_date: string;
  reason?: string;
}

const BookingsCalendar: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [peakSeasons, setPeakSeasons] = useState<PeakSeason[]>([]);
  const [maintenanceBlocks, setMaintenanceBlocks] = useState<MaintenanceBlock[]>([]);
  const [pendingMembers, setPendingMembers] = useState<any[]>([]);
  const [pendingBookings, setPendingBookings] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [revoking, setRevoking] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [bookingsRes, holidaysRes, peakSeasonsRes, maintenanceRes, pendingMembersRes, pendingBookingsRes] = await Promise.all([
        api.get('/api/admin/bookings-calendar'),
        api.get('/api/admin/holidays'),
        api.get('/api/admin/peak-seasons'),
        api.get('/api/admin/maintenance-blocks'),
        api.get('/api/admin/pending-members'),
        api.get('/api/admin/approval-queue')
      ]);
      setBookings(bookingsRes.data);
      setHolidays(holidaysRes.data);
      setPeakSeasons(peakSeasonsRes.data);
      setMaintenanceBlocks(maintenanceRes.data);
      setPendingMembers(pendingMembersRes.data);
      setPendingBookings(pendingBookingsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getBookingsForDate = (date: Date | null): Booking[] => {
    if (!date) return [];
    
    const dateStr = date.toISOString().split('T')[0];
    return bookings.filter(booking => {
      const checkIn = new Date(booking.check_in);
      const checkOut = new Date(booking.check_out);
      const current = new Date(dateStr);
      
      return current >= checkIn && current <= checkOut;
    });
  };

  // Helper function to format date as YYYY-MM-DD in local timezone
  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isHoliday = (date: Date): boolean => {
    const dateStr = formatDateLocal(date);
    return holidays.some(holiday => holiday.date === dateStr);
  };

  const isPeakDay = (date: Date): boolean => {
    const dateStr = formatDateLocal(date);
    return peakSeasons.some(season => {
      const start = new Date(season.start_date + 'T00:00:00');
      const end = new Date(season.end_date + 'T23:59:59');
      return date >= start && date <= end;
    });
  };

  const isMaintenanceDay = (date: Date): boolean => {
    const dateStr = formatDateLocal(date);
    return maintenanceBlocks.some(block => {
      const start = new Date(block.start_date + 'T00:00:00');
      const end = new Date(block.end_date + 'T23:59:59');
      return date >= start && date <= end;
    });
  };

  const getHolidayName = (date: Date): string | null => {
    const dateStr = formatDateLocal(date);
    const holiday = holidays.find(h => h.date === dateStr);
    return holiday ? holiday.holiday_name : null;
  };

  const getPeakSeasonName = (date: Date): string | null => {
    const dateStr = formatDateLocal(date);
    const season = peakSeasons.find(s => {
      const start = new Date(s.start_date + 'T00:00:00');
      const end = new Date(s.end_date + 'T23:59:59');
      return date >= start && date <= end;
    });
    return season ? season.name : null;
  };

  const handleRevokeBooking = async (bookingId: number, cottageName: string, userName: string) => {
    // Prompt for reason
    const reason = window.prompt(
      `Enter reason for revoking this booking:\n\n` +
      `Cottage: ${cottageName}\n` +
      `Guest: ${userName}\n\n` +
      `Reason (required):`,
      ''
    );

    if (reason === null) {
      // User cancelled
      return;
    }

    if (!reason || reason.trim() === '') {
      alert('Reason is required to revoke a booking.');
      return;
    }

    if (!window.confirm(
      `Are you sure you want to revoke this booking?\n\n` +
      `Cottage: ${cottageName}\n` +
      `Guest: ${userName}\n` +
      `Reason: ${reason}\n\n` +
      `This will:\n` +
      `- Cancel the booking\n` +
      `- Refund quota to the owner\n` +
      `- This action cannot be undone!`
    )) {
      return;
    }

    setRevoking(prev => ({ ...prev, [bookingId]: true }));
    try {
      await api.post(`/api/admin/revoke-booking/${bookingId}`, {
        reason: reason.trim()
      });
      alert(`Booking revoked successfully. Quota has been refunded to ${userName}.`);
      fetchAllData(); // Refresh all data including bookings
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error revoking booking');
    } finally {
      setRevoking(prev => ({ ...prev, [bookingId]: false }));
    }
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const days = getDaysInMonth(currentDate);
  const selectedDateBookings = selectedDate ? getBookingsForDate(selectedDate) : [];

  // Calculate statistics for current day
  const getTodayStats = () => {
    const today = new Date();
    const todayStr = formatDateLocal(today);
    
    // Number of pending requests (pending members)
    const noOfPendingRequests = pendingMembers.length;
    
    // Number of pending bookings for approval
    const noOfPendingBookings = pendingBookings.length;
    
    // Number of bookings for today (confirmed and pending)
    const todayBookings = bookings.filter(booking => {
      const checkIn = new Date(booking.check_in);
      const checkOut = new Date(booking.check_out);
      const todayDate = new Date(todayStr);
      return todayDate >= checkIn && todayDate <= checkOut;
    });
    const noOfBookings = todayBookings.length;
    
    // Number of maintenance cottages for today (count unique cottages)
    const todayMaintenanceCottages = maintenanceBlocks.filter(block => {
      const start = new Date(block.start_date + 'T00:00:00');
      const end = new Date(block.end_date + 'T23:59:59');
      return today >= start && today <= end;
    });
    const uniqueMaintenanceCottages = new Set(todayMaintenanceCottages.map(block => block.cottage_id));
    const noOfMaintenanceCottages = uniqueMaintenanceCottages.size;
    
    return {
      noOfPendingRequests,
      noOfPendingBookings,
      noOfBookings,
      noOfMaintenanceCottages
    };
  };

  const todayStats = getTodayStats();

  if (loading) {
    return <div className="card">Loading calendar...</div>;
  }

  return (
    <div className="card">
      <h2>Bookings Overview</h2>
      
      {/* Statistics Table for Current Day */}
      <div style={{ marginBottom: '30px', marginTop: '20px' }}>
        <h3 style={{ marginBottom: '15px', fontSize: '18px', color: '#333' }}>
          Today's Statistics ({new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })})
        </h3>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#34495e', color: 'white' }}>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Metric</th>
              <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #ddd' }}>Count</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '500' }}>No. of Pending Requests</td>
              <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center', fontSize: '18px', fontWeight: 'bold', color: '#ffc107' }}>
                {todayStats.noOfPendingRequests}
              </td>
            </tr>
            <tr style={{ backgroundColor: '#f9f9f9' }}>
              <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '500' }}>No. of Pending Bookings for Approval</td>
              <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center', fontSize: '18px', fontWeight: 'bold', color: '#ff9800' }}>
                {todayStats.noOfPendingBookings}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '500' }}>No. of Bookings</td>
              <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center', fontSize: '18px', fontWeight: 'bold', color: '#28a745' }}>
                {todayStats.noOfBookings}
              </td>
            </tr>
            <tr style={{ backgroundColor: '#f9f9f9' }}>
              <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '500' }}>No. of Maintenance Cottages</td>
              <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center', fontSize: '18px', fontWeight: 'bold', color: '#dc3545' }}>
                {todayStats.noOfMaintenanceCottages}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div className="calendar-controls" style={{ marginBottom: '20px' }}>
        <button onClick={previousMonth} className="btn btn-secondary" style={{ padding: '5px 15px', minWidth: 'auto' }}>
          ← Previous
        </button>
        <h3 style={{ margin: '0 20px', display: 'inline-block' }}>
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h3>
        <button onClick={nextMonth} className="btn btn-secondary" style={{ padding: '5px 15px', minWidth: 'auto' }}>
          Next →
        </button>
        <button onClick={goToToday} className="btn btn-primary" style={{ marginLeft: '20px', padding: '5px 15px', minWidth: 'auto' }}>
          Today
        </button>
      </div>

      <div style={{ marginBottom: '15px', fontSize: '12px', color: '#6c757d' }}>
        <span style={{ marginRight: '15px' }}>🟡 = Holiday/Peak Season</span>
        <span style={{ marginRight: '15px' }}>🔧 = Maintenance Day</span>
      </div>

      <div className="calendar-container">
        <div className="calendar-grid">
          {dayNames.map(day => (
            <div key={day} className="calendar-day-header">
              {day}
            </div>
          ))}
          
          {days.map((date, index) => {
            const dateBookings = date ? getBookingsForDate(date) : [];
            const isToday = date && 
              date.toDateString() === new Date().toDateString();
            const isSelected = date && selectedDate && 
              date.toDateString() === selectedDate.toDateString();
            
            const holiday = date ? isHoliday(date) : false;
            const peakDay = date ? isPeakDay(date) : false;
            const maintenanceDay = date ? isMaintenanceDay(date) : false;
            const holidayName = date ? getHolidayName(date) : null;
            const peakSeasonName = date ? getPeakSeasonName(date) : null;
            
            // Build tooltip
            let tooltip = '';
            if (holiday) tooltip += `Holiday: ${holidayName || 'Holiday'}\n`;
            if (peakDay) tooltip += `Peak Season: ${peakSeasonName || 'Peak Season'}\n`;
            if (maintenanceDay) tooltip += 'Maintenance Day\n';
            if (dateBookings.length > 0) {
              tooltip += `Bookings: ${dateBookings.length}`;
            }
            
            return (
              <div
                key={index}
                className={`calendar-day ${!date ? 'empty' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${maintenanceDay ? 'maintenance-day' : ''} ${holiday || peakDay ? 'holiday-peak-day' : ''}`}
                onClick={() => date && setSelectedDate(date)}
                title={tooltip || undefined}
                style={{
                  backgroundColor: maintenanceDay ? '#fff3cd' : holiday || peakDay ? '#fff9c4' : undefined,
                  borderColor: maintenanceDay ? '#ffc107' : holiday || peakDay ? '#ffd700' : undefined,
                  borderWidth: maintenanceDay || holiday || peakDay ? '2px' : undefined
                }}
              >
                {date && (
                  <>
                    <div className="calendar-day-number" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {date.getDate()}
                      {(holiday || peakDay) && (
                        <span style={{ fontSize: '10px' }}>🟡</span>
                      )}
                      {maintenanceDay && (
                        <span style={{ fontSize: '10px' }}>🔧</span>
                      )}
                    </div>
                    {dateBookings.length > 0 && (
                      <div className="calendar-bookings">
                        {dateBookings.slice(0, 3).map(booking => (
                          <div
                            key={booking.id}
                            className={`booking-badge ${booking.status}`}
                            title={`${booking.cottage_name}${booking.property_name ? ` (${booking.property_name})` : ''} - ${booking.user_name} (${booking.status})`}
                          >
                            {booking.cottage_name}{booking.property_name ? ` (${booking.property_name})` : ''}
                          </div>
                        ))}
                        {dateBookings.length > 3 && (
                          <div className="booking-badge more">
                            +{dateBookings.length - 3} more
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="selected-date-bookings" style={{ marginTop: '30px' }}>
          <h3 style={{ marginBottom: '20px' }}>
            Bookings for {selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h3>
          {selectedDateBookings.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Cottage Name</th>
                  <th>Sanctuary</th>
                  <th>Guest</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {selectedDateBookings.map(booking => (
                  <tr key={booking.id}>
                    <td><strong>{booking.cottage_name}</strong></td>
                    <td>{booking.property_name || 'N/A'}</td>
                    <td>{booking.user_name}</td>
                    <td>{new Date(booking.check_in).toLocaleDateString()}</td>
                    <td>{new Date(booking.check_out).toLocaleDateString()}</td>
                    <td>
                      <span className={`status-badge ${booking.status}`}>
                        {booking.status}
                      </span>
                    </td>
                    <td>
                      {booking.status !== 'cancelled' && booking.status !== 'rejected' ? (
                        <button
                          onClick={() => handleRevokeBooking(booking.id, booking.cottage_name, booking.user_name)}
                          className="btn btn-danger"
                          disabled={revoking[booking.id]}
                          title="Revoke Booking and Refund Quota"
                          style={{ 
                            padding: '5px 10px', 
                            minWidth: 'auto',
                            fontSize: '12px'
                          }}
                        >
                          {revoking[booking.id] ? '⏳' : '🔄 Revoke'}
                        </button>
                      ) : (
                        <span style={{ color: '#6c757d', fontSize: '12px', fontStyle: 'italic' }}>
                          Already {booking.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: '#6c757d', fontStyle: 'italic' }}>
              No bookings on this date.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default BookingsCalendar;

