import React, { useState, useEffect } from 'react';
import api from '../../services/api';

interface SavedHoliday {
  date: string;
  holiday_name: string;
}

const HolidayConfiguration: React.FC = () => {
  const [holidays, setHolidays] = useState<Array<{ date: string; holiday_name: string }>>([]);
  const [savedHolidays, setSavedHolidays] = useState<SavedHoliday[]>([]);
  const [currentHoliday, setCurrentHoliday] = useState({ date: '', holiday_name: '' });
  const [editingHoliday, setEditingHoliday] = useState<SavedHoliday | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchSavedHolidays();
  }, []);

  const fetchSavedHolidays = async () => {
    try {
      const response = await api.get('/api/admin/holidays');
      setSavedHolidays(response.data);
    } catch (error) {
      console.error('Error fetching holidays:', error);
    } finally {
      setFetching(false);
    }
  };

  const handleAddHoliday = () => {
    if (currentHoliday.date) {
      setHolidays([...holidays, { ...currentHoliday }]);
      setCurrentHoliday({ date: '', holiday_name: '' });
    }
  };

  const handleRemoveHoliday = (index: number) => {
    setHolidays(holidays.filter((_, i) => i !== index));
  };

  const handleEditHoliday = (holiday: SavedHoliday) => {
    setEditingHoliday(holiday);
    // Format date for input
    const date = new Date(holiday.date);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    setCurrentHoliday({
      date: `${year}-${month}-${day}`,
      holiday_name: holiday.holiday_name || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteHoliday = async (date: string) => {
    const confirmMessage = `Are you sure you want to delete the holiday on ${new Date(date).toLocaleDateString()}?`;
    if (!window.confirm(confirmMessage)) return;

    setActionLoading(true);
    try {
      await api.delete(`/api/admin/holidays/${date}`);
      fetchSavedHolidays();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete holiday');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateHoliday = async () => {
    if (!editingHoliday || !currentHoliday.date) return;

    setActionLoading(true);
    try {
      await api.put(`/api/admin/holidays/${editingHoliday.date}`, {
        date: currentHoliday.date,
        holiday_name: currentHoliday.holiday_name
      });
      setEditingHoliday(null);
      setCurrentHoliday({ date: '', holiday_name: '' });
      fetchSavedHolidays();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to update holiday');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (holidays.length === 0) {
      alert('Please add at least one holiday');
      return;
    }

    setLoading(true);
    setSuccess(false);

    try {
      await api.post('/api/admin/holidays', holidays);
      setSuccess(true);
      setHolidays([]);
      fetchSavedHolidays(); // Refresh saved holidays
    } catch (error) {
      console.error('Error setting holidays:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Holiday Configuration (ADM-14)</h2>
      {success && <div className="success">Holidays configured successfully</div>}
      {editingHoliday && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#e7f3ff', 
          borderRadius: '8px',
          border: '1px solid #b3d9ff',
          marginBottom: '20px'
        }}>
          <strong>✏️ Editing holiday: {new Date(editingHoliday.date).toLocaleDateString()}</strong>
        </div>
      )}
      <form onSubmit={editingHoliday ? (e) => { e.preventDefault(); handleUpdateHoliday(); } : handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
          <h3>{editingHoliday ? 'Edit Holiday' : 'Add Holiday'}</h3>
          <input
            type="date"
            value={currentHoliday.date}
            onChange={(e) => setCurrentHoliday({ ...currentHoliday, date: e.target.value })}
            className="input"
            style={{ width: '200px', display: 'inline-block', marginRight: '10px' }}
          />
          <input
            type="text"
            placeholder="Holiday Name (e.g., Dasara)"
            value={currentHoliday.holiday_name}
            onChange={(e) => setCurrentHoliday({ ...currentHoliday, holiday_name: e.target.value })}
            className="input"
            style={{ width: '200px', display: 'inline-block', marginRight: '10px' }}
          />
          {editingHoliday ? (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="button" 
                onClick={handleUpdateHoliday}
                className="btn btn-primary"
                disabled={actionLoading}
                title="Update Holiday"
                style={{ padding: '5px 10px', minWidth: 'auto' }}
              >
                {actionLoading ? '⏳' : '💾'}
              </button>
              <button 
                type="button"
                onClick={() => {
                  setEditingHoliday(null);
                  setCurrentHoliday({ date: '', holiday_name: '' });
                }}
                className="btn btn-secondary"
                title="Cancel Edit"
                style={{ padding: '5px 10px', minWidth: 'auto' }}
              >
                ↪️
              </button>
            </div>
          ) : (
            <button 
              type="button" 
              onClick={handleAddHoliday} 
              className="btn btn-secondary"
              title="Add Holiday"
              style={{ padding: '5px 10px', minWidth: 'auto' }}
            >
              ➕
            </button>
          )}
        </div>

        {!editingHoliday && holidays.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3>Selected Holidays</h3>
            <ul>
              {holidays.map((holiday, index) => (
                <li key={index} style={{ marginBottom: '10px' }}>
                  {new Date(holiday.date).toLocaleDateString()} - {holiday.holiday_name || 'Holiday'}
                  <button
                    type="button"
                    onClick={() => handleRemoveHoliday(index)}
                    className="btn btn-danger"
                    title="Remove Holiday"
                    style={{ marginLeft: '10px', padding: '5px 10px', minWidth: 'auto' }}
                  >
                    🗑️
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={loading || holidays.length === 0}
          title={loading ? 'Configuring...' : 'Configure Holidays'}
          style={{ padding: '5px 10px', minWidth: 'auto' }}
        >
          {loading ? '⏳' : '💾'}
        </button>
      </form>

      {fetching ? (
        <p>Loading saved holidays...</p>
      ) : savedHolidays.length > 0 ? (
        <div style={{ marginTop: '30px' }}>
          <h3 style={{ marginBottom: '20px' }}>Saved Holidays</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Holiday Name</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {savedHolidays.map((holiday, index) => (
                <tr key={index}>
                  <td>{new Date(holiday.date).toLocaleDateString()}</td>
                  <td>{holiday.holiday_name || 'Holiday'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button 
                        onClick={() => handleEditHoliday(holiday)}
                        className="btn btn-primary"
                        disabled={actionLoading}
                        title="Edit Holiday"
                        style={{ padding: '5px 10px', minWidth: 'auto' }}
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => handleDeleteHoliday(holiday.date)}
                        className="btn btn-danger"
                        disabled={actionLoading}
                        title="Delete Holiday"
                        style={{ padding: '5px 10px', minWidth: 'auto' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ marginTop: '20px' }}>No holidays configured yet.</p>
      )}
    </div>
  );
};

export default HolidayConfiguration;

