import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

interface DashboardData {
  user: any;
  property: any;
  cottages: any[];
  available_weekday: number;
  available_weekend: number;
  pending_weekday: number;
  pending_weekend: number;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

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

  if (loading) return <div>Loading...</div>;
  if (!dashboardData) return <div>Error loading dashboard</div>;

  return (
    <div>
      <div className="card">
        <h2>Welcome, {dashboardData.user.name}! 👋</h2>
        <p style={{ fontSize: '16px', color: '#6c757d', marginTop: '10px' }}>
          <strong>Sanctuary:</strong> {dashboardData.property?.name}
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '20px' }}>Quota Status (OWN-08, OWN-09)</h3>
        
        {/* Available Credits */}
        <div style={{ marginBottom: '30px' }}>
          <h4 style={{ marginBottom: '15px', color: '#495057' }}>Available Credits</h4>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '15px' 
          }}>
            <div style={{
              padding: '15px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #dee2e6',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '8px' }}>
                Available Weekday
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#007bff' }}>
                {dashboardData.available_weekday}
              </div>
            </div>
            <div style={{
              padding: '15px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #dee2e6',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '8px' }}>
                Available Weekend
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#28a745' }}>
                {dashboardData.available_weekend}
              </div>
            </div>
          </div>
        </div>

        {/* Total Balance & Pending */}
        <div>
          <h4 style={{ marginBottom: '15px', color: '#495057' }}>Balance Details</h4>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '15px' 
          }}>
            <div style={{
              padding: '15px',
              backgroundColor: 'white',
              borderRadius: '8px',
              border: '1px solid #e9ecef',
            }}>
              <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px', color: '#495057' }}>
                Weekday Credits
              </div>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#6c757d' }}>Total Balance: </span>
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#007bff' }}>
                  {dashboardData.user.weekday_balance}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: '#6c757d' }}>Pending (Escrow): </span>
                <span style={{ fontSize: '16px', fontWeight: '600', color: '#ffc107' }}>
                  {dashboardData.pending_weekday}
                </span>
              </div>
            </div>
            <div style={{
              padding: '15px',
              backgroundColor: 'white',
              borderRadius: '8px',
              border: '1px solid #e9ecef',
            }}>
              <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px', color: '#495057' }}>
                Weekend Credits
              </div>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#6c757d' }}>Total Balance: </span>
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#28a745' }}>
                  {dashboardData.user.weekend_balance}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: '#6c757d' }}>Pending (Escrow): </span>
                <span style={{ fontSize: '16px', fontWeight: '600', color: '#ffc107' }}>
                  {dashboardData.pending_weekend}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '20px' }}>Available Cottages</h3>
        {dashboardData.cottages.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Cottage ID</th>
                <th>Capacity</th>
                <th>Amenities</th>
              </tr>
            </thead>
            <tbody>
              {dashboardData.cottages.map((cottage) => (
                <tr key={cottage.id}>
                  <td style={{ fontWeight: '600' }}>{cottage.cottage_id}</td>
                  <td>{cottage.capacity} {cottage.capacity === 1 ? 'person' : 'people'}</td>
                  <td>{cottage.amenities || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: '#6c757d', fontStyle: 'italic' }}>No cottages available</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

