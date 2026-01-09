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

const BookingsCalendar: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await api.get('/api/admin/bookings-calendar');
      setBookings(response.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
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

  if (loading) {
    return <div className="card">Loading calendar...</div>;
  }

  return (
    <div className="card">
      <h2>Bookings Overview</h2>
      
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
            
            return (
              <div
                key={index}
                className={`calendar-day ${!date ? 'empty' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => date && setSelectedDate(date)}
              >
                {date && (
                  <>
                    <div className="calendar-day-number">{date.getDate()}</div>
                    {dateBookings.length > 0 && (
                      <div className="calendar-bookings">
                        {dateBookings.slice(0, 3).map(booking => (
                          <div
                            key={booking.id}
                            className={`booking-badge ${booking.status}`}
                            title={`${booking.cottage_name} - ${booking.user_name} (${booking.status})`}
                          >
                            {booking.cottage_name}
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
                  <th>Property</th>
                  <th>Guest</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  <th>Status</th>
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

