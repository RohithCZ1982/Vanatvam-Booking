import React, { useEffect, useState } from 'react';
import api from '../../services/api';

interface Property {
  id: number;
  name: string;
}

interface Cottage {
  id: number;
  cottage_id: string;
  property_id: number;
  capacity: number;
  amenities: string;
}

const CottageManagement: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [cottages, setCottages] = useState<Cottage[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    property_id: '',
    cottage_id: '',
    capacity: 2,
    amenities: '',
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterProperty, setFilterProperty] = useState('');

  useEffect(() => {
    fetchProperties();
    fetchCottages();
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await api.get('/api/admin/properties');
      setProperties(response.data);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const fetchCottages = async () => {
    try {
      const url = filterProperty
        ? `/api/admin/cottages?property_id=${filterProperty}`
        : '/api/admin/cottages';
      const response = await api.get(url);
      setCottages(response.data);
    } catch (error) {
      console.error('Error fetching cottages:', error);
    }
  };

  useEffect(() => {
    fetchCottages();
  }, [filterProperty]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingId) {
        await api.put(`/api/admin/cottages/${editingId}`, {
          ...formData,
          property_id: parseInt(formData.property_id),
        });
      } else {
        await api.post('/api/admin/cottages', {
          ...formData,
          property_id: parseInt(formData.property_id),
        });
      }
      fetchCottages();
      setShowForm(false);
      setFormData({ property_id: '', cottage_id: '', capacity: 2, amenities: '' });
      setEditingId(null);
    } catch (error) {
      console.error('Error saving cottage:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (cottage: Cottage) => {
    setFormData({
      property_id: cottage.property_id.toString(),
      cottage_id: cottage.cottage_id,
      capacity: cottage.capacity,
      amenities: cottage.amenities || '',
    });
    setEditingId(cottage.id);
    setShowForm(true);
  };

  return (
    <div className="card">
      <h2>Cottage Inventory (ADM-07)</h2>
      <div style={{ marginBottom: '20px' }}>
        <label>
          Filter by Property:
          <select
            value={filterProperty}
            onChange={(e) => setFilterProperty(e.target.value)}
            className="input"
            style={{ width: '200px', display: 'inline-block', marginLeft: '10px' }}
          >
            <option value="">All Properties</option>
            {properties.map((prop) => (
              <option key={prop.id} value={prop.id}>
                {prop.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button 
        onClick={() => setShowForm(!showForm)} 
        className="btn btn-primary" 
        style={{ marginBottom: '20px', padding: '5px 10px', minWidth: 'auto' }}
        title={showForm ? 'Cancel' : 'Add Cottage'}
      >
        {showForm ? '↪️' : '➕'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
          <select
            value={formData.property_id}
            onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
            required
            className="input"
          >
            <option value="">Select Property</option>
            {properties.map((prop) => (
              <option key={prop.id} value={prop.id}>
                {prop.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Cottage ID (e.g., C-12)"
            value={formData.cottage_id}
            onChange={(e) => setFormData({ ...formData, cottage_id: e.target.value })}
            required
            className="input"
          />
          <input
            type="number"
            placeholder="Capacity"
            value={formData.capacity}
            onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
            required
            className="input"
          />
          <textarea
            placeholder="Amenities (comma-separated)"
            value={formData.amenities}
            onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
            className="input"
            rows={3}
          />
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
            title={loading ? 'Saving...' : editingId ? 'Update Cottage' : 'Create Cottage'}
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
            <th>Cottage ID</th>
            <th>Property</th>
            <th>Capacity</th>
            <th>Amenities</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {cottages.map((cottage) => {
            const property = properties.find((p) => p.id === cottage.property_id);
            return (
              <tr key={cottage.id}>
                <td>{cottage.id}</td>
                <td>{cottage.cottage_id}</td>
                <td>{property?.name}</td>
                <td>{cottage.capacity}</td>
                <td>{cottage.amenities}</td>
                <td>
                  <button 
                    onClick={() => handleEdit(cottage)} 
                    className="btn btn-secondary"
                    title="Edit Cottage"
                    style={{ padding: '5px 10px', minWidth: 'auto' }}
                  >
                    ✏️
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default CottageManagement;

