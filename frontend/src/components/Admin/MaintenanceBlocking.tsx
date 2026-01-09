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
    } catch (error) {
      console.error('Error fetching maintenance blocks:', error);
    }
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
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button 
                        onClick={() => handleEdit(block)}
                        className="btn btn-primary"
                        disabled={actionLoading}
                        title="Edit Maintenance Block"
                        style={{ padding: '5px 10px', minWidth: 'auto' }}
                      >
                        ✏️
                      </button>
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
    </div>
  );
};

export default MaintenanceBlocking;

