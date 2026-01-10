import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import api from '../../services/api';

interface StatisticsData {
  users: {
    total: number;
    active: number;
    pending: number;
    suspended: number;
    by_status: Array<{ name: string; value: number }>;
    over_time: Array<{ month: string; count: number }>;
  };
  bookings: {
    total: number;
    confirmed: number;
    pending: number;
    rejected: number;
    cancelled: number;
    by_status: Array<{ name: string; value: number }>;
    over_time: Array<{ month: string; count: number }>;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const Reports: React.FC = () => {
  const [data, setData] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [todayStats, setTodayStats] = useState<any>(null);
  const [todayStatsLoading, setTodayStatsLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
    fetchTodayStats();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/reports/statistics');
      setData(response.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error fetching statistics');
      console.error('Error fetching statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayStats = async () => {
    try {
      setTodayStatsLoading(true);
      const [pendingMembersRes, pendingBookingsRes, bookingsRes, maintenanceRes] = await Promise.all([
        api.get('/api/admin/pending-members'),
        api.get('/api/admin/approval-queue'),
        api.get('/api/admin/bookings-calendar'),
        api.get('/api/admin/maintenance-blocks')
      ]);

      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      // Number of pending requests (pending members)
      const noOfPendingRequests = pendingMembersRes.data.length;
      
      // Number of pending bookings for approval
      const noOfPendingBookings = pendingBookingsRes.data.length;
      
      // Number of bookings for today (confirmed and pending)
      const todayBookings = bookingsRes.data.filter((booking: any) => {
        const checkIn = new Date(booking.check_in);
        const checkOut = new Date(booking.check_out);
        const todayDate = new Date(todayStr);
        return todayDate >= checkIn && todayDate <= checkOut;
      });
      const noOfBookings = todayBookings.length;
      
      // Number of maintenance cottages for today (count unique cottages)
      const todayMaintenanceCottages = maintenanceRes.data.filter((block: any) => {
        const start = new Date(block.start_date + 'T00:00:00');
        const end = new Date(block.end_date + 'T23:59:59');
        return today >= start && today <= end;
      });
      const uniqueMaintenanceCottages = new Set(todayMaintenanceCottages.map((block: any) => block.cottage_id));
      const noOfMaintenanceCottages = uniqueMaintenanceCottages.size;
      
      setTodayStats({
        noOfPendingRequests,
        noOfPendingBookings,
        noOfBookings,
        noOfMaintenanceCottages
      });
    } catch (err: any) {
      console.error('Error fetching today stats:', err);
    } finally {
      setTodayStatsLoading(false);
    }
  };

  if (loading || todayStatsLoading) {
    return (
      <div>
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading statistics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div style={{ color: '#dc3545', padding: '20px', backgroundColor: '#f8d7da', borderRadius: '4px', marginBottom: '20px' }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Today's Statistics Table */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '15px', fontSize: '18px', color: '#333' }}>
          Today's Statistics ({new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })})
        </h3>
        {todayStats ? (
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
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
        ) : (
          <div style={{ textAlign: 'center', padding: '20px', color: '#6c757d' }}>No statistics available for today</div>
        )}
      </div>

      {/* Main Reports Content */}
      {!data ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>No data available</div>
      ) : (
        <>
          <h3 style={{ marginBottom: '20px', fontSize: '20px', color: '#333' }}>Analytics & Trends</h3>
      
          {/* Summary Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '20px', 
        marginBottom: '30px',
        marginTop: '20px'
      }}>
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#e7f3ff', 
          borderRadius: '8px',
          border: '1px solid #b3d9ff'
        }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Total Users</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#007bff' }}>{data.users.total}</div>
        </div>
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#d4edda', 
          borderRadius: '8px',
          border: '1px solid #c3e6cb'
        }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Active Users</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#28a745' }}>{data.users.active}</div>
        </div>
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#fff3cd', 
          borderRadius: '8px',
          border: '1px solid #ffe69c'
        }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Total Bookings</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffc107' }}>{data.bookings.total}</div>
        </div>
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#d1ecf1', 
          borderRadius: '8px',
          border: '1px solid #bee5eb'
        }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Confirmed Bookings</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#17a2b8' }}>{data.bookings.confirmed}</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', 
        gap: '30px',
        marginTop: '30px'
      }}>
        {/* Users Over Time */}
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#f9f9f9', 
          borderRadius: '8px',
          border: '1px solid #e0e0e0'
        }}>
          <h3 style={{ marginBottom: '20px', color: '#333' }}>Users Registered Over Time (Last 12 Months)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.users.over_time}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="month" 
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#0088FE" name="Users Registered" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Bookings Over Time */}
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#f9f9f9', 
          borderRadius: '8px',
          border: '1px solid #e0e0e0'
        }}>
          <h3 style={{ marginBottom: '20px', color: '#333' }}>Bookings Created Over Time (Last 12 Months)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.bookings.over_time}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="month" 
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#00C49F" name="Bookings Created" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Users by Status Pie Chart */}
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#f9f9f9', 
          borderRadius: '8px',
          border: '1px solid #e0e0e0'
        }}>
          <h3 style={{ marginBottom: '20px', color: '#333' }}>Users by Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.users.by_status}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: any) => `${entry.name}: ${((entry.percent || 0) * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {data.users.by_status.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bookings by Status Pie Chart */}
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#f9f9f9', 
          borderRadius: '8px',
          border: '1px solid #e0e0e0'
        }}>
          <h3 style={{ marginBottom: '20px', color: '#333' }}>Bookings by Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.bookings.by_status}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: any) => `${entry.name}: ${((entry.percent || 0) * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {data.bookings.by_status.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

          {/* Additional Statistics Table */}
          <div style={{ marginTop: '40px' }}>
            <h3 style={{ marginBottom: '20px', color: '#333' }}>Detailed Statistics</h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: '20px' 
            }}>
              <div style={{ 
                padding: '20px', 
                backgroundColor: '#f9f9f9', 
                borderRadius: '8px',
                border: '1px solid #e0e0e0'
              }}>
                <h4 style={{ marginBottom: '15px', color: '#555' }}>User Statistics</h4>
                <table style={{ width: '100%' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '8px', fontWeight: '500' }}>Total Users:</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{data.users.total}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px', fontWeight: '500' }}>Active:</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#28a745' }}>{data.users.active}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px', fontWeight: '500' }}>Pending:</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#ffc107' }}>{data.users.pending}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px', fontWeight: '500' }}>Suspended:</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#dc3545' }}>{data.users.suspended}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ 
                padding: '20px', 
                backgroundColor: '#f9f9f9', 
                borderRadius: '8px',
                border: '1px solid #e0e0e0'
              }}>
                <h4 style={{ marginBottom: '15px', color: '#555' }}>Booking Statistics</h4>
                <table style={{ width: '100%' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '8px', fontWeight: '500' }}>Total Bookings:</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{data.bookings.total}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px', fontWeight: '500' }}>Confirmed:</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#28a745' }}>{data.bookings.confirmed}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px', fontWeight: '500' }}>Pending:</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#ffc107' }}>{data.bookings.pending}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px', fontWeight: '500' }}>Rejected:</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#dc3545' }}>{data.bookings.rejected}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px', fontWeight: '500' }}>Cancelled:</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#6c757d' }}>{data.bookings.cancelled}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;

