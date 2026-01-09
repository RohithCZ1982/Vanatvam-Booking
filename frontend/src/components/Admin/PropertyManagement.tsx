import React, { useEffect, useState } from 'react';
import api from '../../services/api';

interface Property {
  id: number;
  name: string;
  description: string;
}

const PropertyManagement: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await api.get('/api/admin/properties');
      setProperties(response.data);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingId) {
        await api.put(`/api/admin/properties/${editingId}`, formData);
      } else {
        await api.post('/api/admin/properties', formData);
      }
      fetchProperties();
      setShowForm(false);
      setFormData({ name: '', description: '' });
      setEditingId(null);
    } catch (error) {
      console.error('Error saving property:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (property: Property) => {
    setFormData({ name: property.name, description: property.description || '' });
    setEditingId(property.id);
    setShowForm(true);
  };

  return (
    <div className="card">
      <h2>Sanctuary Management (ADM-06)</h2>
      <button 
        onClick={() => setShowForm(!showForm)} 
        className="btn btn-primary" 
        style={{ marginBottom: '20px', padding: '5px 10px', minWidth: 'auto' }}
        title={showForm ? 'Cancel' : 'Add Sanctuary'}
      >
        {showForm ? '↪️' : '➕'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="Sanctuary Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="input"
          />
          <textarea
            placeholder="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="input"
            rows={3}
          />
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
            title={loading ? 'Saving...' : editingId ? 'Update Sanctuary' : 'Create Sanctuary'}
            style={{ padding: '5px 10px', minWidth: 'auto' }}
          >
            {loading ? '⏳' : editingId ? '💾' : '➕'}
          </button>
        </form>
      )}

      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Description</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {properties.map((property) => (
            <tr key={property.id}>
              <td>{property.id}</td>
              <td>{property.name}</td>
              <td>{property.description}</td>
              <td>
                <button 
                  onClick={() => handleEdit(property)} 
                  className="btn btn-secondary"
                  title="Edit Sanctuary"
                  style={{ padding: '5px 10px', minWidth: 'auto' }}
                >
                  ✏️
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PropertyManagement;

