import React, { useState, useEffect } from 'react';
import api from '../../services/api';

interface Property {
  id: number;
  name: string;
}

const InventoryHealth: React.FC = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [properties, setProperties] = useState<Property[]>([]);
  const [healthData, setHealthData] = useState<any[]>([]);
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

  const handleFetch = async () => {
    if (!startDate || !endDate) {
      alert('Please select start and end dates');
      return;
    }

    setLoading(true);
    try {
      const url = `/api/admin/inventory-health?start_date=${startDate}&end_date=${endDate}${
        propertyId ? `&property_id=${propertyId}` : ''
      }`;
      const response = await api.get(url);
      setHealthData(response.data);
    } catch (error) {
      console.error('Error fetching inventory health:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Inventory Health View (ADM-09)</h2>
      <div style={{ marginBottom: '20px' }}>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="input"
          style={{ width: '200px', display: 'inline-block', marginRight: '10px' }}
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="input"
          style={{ width: '200px', display: 'inline-block', marginRight: '10px' }}
        />
        <select
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          className="input"
          style={{ width: '200px', display: 'inline-block', marginRight: '10px' }}
        >
          <option value="">All Properties</option>
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.name}
            </option>
          ))}
        </select>
        <button 
          onClick={handleFetch} 
          className="btn btn-primary" 
          disabled={loading}
          title={loading ? 'Loading...' : 'Fetch Health Data'}
          style={{ padding: '5px 10px', minWidth: 'auto' }}
        >
          {loading ? '⏳' : '🔍'}
        </button>
      </div>

      {healthData.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Property</th>
              <th>Cottage</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {healthData.map((item, index) => (
              <tr key={index}>
                <td>{new Date(item.date).toLocaleDateString()}</td>
                <td>{item.property_name || 'No Property'}</td>
                <td>{item.cottage_name}</td>
                <td>
                  <span className={`badge badge-${item.status}`}>{item.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default InventoryHealth;

