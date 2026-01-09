import React, { useState, useEffect } from 'react';
import api from '../../services/api';

interface PeakSeason {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
}

const PeakSeasonManagement: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    end_date: '',
  });
  const [savedSeasons, setSavedSeasons] = useState<PeakSeason[]>([]);
  const [editingSeason, setEditingSeason] = useState<PeakSeason | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSavedSeasons();
  }, []);

  const fetchSavedSeasons = async () => {
    try {
      const response = await api.get('/api/admin/peak-seasons');
      setSavedSeasons(response.data);
    } catch (error) {
      console.error('Error fetching peak seasons:', error);
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      if (editingSeason) {
        // Update existing season
        await api.put(`/api/admin/peak-seasons/${editingSeason.id}`, formData);
        setEditingSeason(null);
      } else {
        // Create new season
        await api.post('/api/admin/peak-seasons', formData);
      }
      setSuccess(true);
      setFormData({ name: '', start_date: '', end_date: '' });
      fetchSavedSeasons(); // Refresh saved seasons
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save peak season');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (season: PeakSeason) => {
    setEditingSeason(season);
    // Format dates for input
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    setFormData({
      name: season.name,
      start_date: formatDate(season.start_date),
      end_date: formatDate(season.end_date),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (seasonId: number, seasonName: string) => {
    const confirmMessage = `Are you sure you want to delete the peak season "${seasonName}"?`;
    if (!window.confirm(confirmMessage)) return;

    setActionLoading(true);
    try {
      await api.delete(`/api/admin/peak-seasons/${seasonId}`);
      fetchSavedSeasons();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete peak season');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingSeason(null);
    setFormData({ name: '', start_date: '', end_date: '' });
  };

  return (
    <div className="card">
      <h2>Peak Season Definition (ADM-15)</h2>
      {error && <div className="error">{error}</div>}
      {success && <div className="success">Peak season {editingSeason ? 'updated' : 'created'} successfully</div>}
      {editingSeason && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#e7f3ff', 
          borderRadius: '8px',
          border: '1px solid #b3d9ff',
          marginBottom: '20px'
        }}>
          <strong>✏️ Editing peak season: {editingSeason.name}</strong>
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Peak Season Name (e.g., Summer Peak)"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          className="input"
        />
        <input
          type="date"
          placeholder="Start Date"
          value={formData.start_date}
          onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
          required
          className="input"
        />
        <input
          type="date"
          placeholder="End Date"
          value={formData.end_date}
          onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
          required
          className="input"
        />
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
            title={loading ? 'Saving...' : editingSeason ? 'Update Peak Season' : 'Create Peak Season'}
            style={{ padding: '5px 10px', minWidth: 'auto' }}
          >
            {loading ? '⏳' : editingSeason ? '💾' : '➕'}
          </button>
          {editingSeason && (
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

      {fetching ? (
        <p>Loading saved peak seasons...</p>
      ) : savedSeasons.length > 0 ? (
        <div style={{ marginTop: '30px' }}>
          <h3 style={{ marginBottom: '20px' }}>Saved Peak Seasons</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {savedSeasons.map((season) => (
                <tr key={season.id}>
                  <td>{season.name}</td>
                  <td>{new Date(season.start_date).toLocaleDateString()}</td>
                  <td>{new Date(season.end_date).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button 
                        onClick={() => handleEdit(season)}
                        className="btn btn-primary"
                        disabled={actionLoading}
                        title="Edit Peak Season"
                        style={{ padding: '5px 10px', minWidth: 'auto' }}
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => handleDelete(season.id, season.name)}
                        className="btn btn-danger"
                        disabled={actionLoading}
                        title="Delete Peak Season"
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
        <p style={{ marginTop: '20px' }}>No peak seasons configured yet.</p>
      )}
    </div>
  );
};

export default PeakSeasonManagement;

