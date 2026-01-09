import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import * as XLSX from 'xlsx';

interface AuditEntry {
  id: number | string;
  timestamp: string;
  type: string;
  action: string;
  user_name: string;
  user_email: string;
  property_name: string;
  description: string;
  weekday_change: number;
  weekend_change: number;
  booking_id: number | null;
  details: string;
}

const AuditTrail: React.FC = () => {
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    // Set default to current month
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
    
    fetchAuditTrail(firstDay.toISOString().split('T')[0], lastDay.toISOString().split('T')[0]);
  }, []);

  const fetchAuditTrail = async (start?: string, end?: string) => {
    setLoading(true);
    try {
      const params: any = {};
      if (start) params.start_date = start;
      if (end) params.end_date = end;
      
      const response = await api.get('/api/admin/audit-trail', { params });
      setAuditEntries(response.data);
    } catch (error) {
      console.error('Error fetching audit trail:', error);
      alert('Error fetching audit trail data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!startDate || !endDate) {
      alert('Please select both start and end dates');
      return;
    }
    fetchAuditTrail(startDate, endDate);
  };

  const handleExportToExcel = () => {
    if (auditEntries.length === 0) {
      alert('No data to export');
      return;
    }

    // Prepare data for Excel
    const excelData = auditEntries.map(entry => ({
      'Date & Time': new Date(entry.timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      'Type': entry.type,
      'Action': entry.action,
      'User Name': entry.user_name,
      'User Email': entry.user_email,
      'Sanctuary': entry.property_name,
      'Description': entry.description,
      'Weekday Change': entry.weekday_change,
      'Weekend Change': entry.weekend_change,
      'Booking ID': entry.booking_id || 'N/A',
      'Details': entry.details
    }));

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Trail');

    // Generate filename with date range
    const filename = `audit-trail_${startDate}_to_${endDate}.xlsx`;
    
    // Write and download
    XLSX.writeFile(wb, filename);
  };

  const getActionColor = (action: string) => {
    if (action.includes('REJECTED') || action.includes('Revoked')) {
      return { backgroundColor: '#dc3545', color: 'white' };
    } else if (action.includes('CONFIRMED') || action.includes('Activated')) {
      return { backgroundColor: '#28a745', color: 'white' };
    } else if (action.includes('BOOKING')) {
      return { backgroundColor: '#007bff', color: 'white' };
    } else if (action.includes('TRANSACTION') || action.includes('RESET')) {
      return { backgroundColor: '#6c757d', color: 'white' };
    }
    return { backgroundColor: '#6c757d', color: 'white' };
  };

  return (
    <div>
      <h3 style={{ marginBottom: '20px', color: '#495057' }}>Audit Trail</h3>
      
      {/* Date Range Filter */}
      <div style={{ 
        marginBottom: '20px', 
        padding: '20px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px',
        border: '1px solid #dee2e6',
        display: 'flex',
        gap: '15px',
        alignItems: 'flex-end',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: '1', minWidth: '200px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500', color: '#495057' }}>
            Start Date:
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="input"
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ flex: '1', minWidth: '200px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500', color: '#495057' }}>
            End Date:
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="input"
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleSearch}
            className="btn btn-primary"
            disabled={loading}
            style={{ padding: '10px 20px' }}
          >
            {loading ? '⏳ Searching...' : '🔍 Search'}
          </button>
          <button
            onClick={handleExportToExcel}
            className="btn btn-success"
            disabled={loading || auditEntries.length === 0}
            style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white' }}
          >
            📥 Export to Excel
          </button>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳</div>
          <p style={{ color: '#6c757d' }}>Loading audit trail...</p>
        </div>
      ) : auditEntries.length > 0 ? (
        <>
          <div style={{ marginBottom: '15px', color: '#6c757d', fontSize: '14px' }}>
            Showing {auditEntries.length} audit entry(ies) from {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Type</th>
                  <th>Action</th>
                  <th>User Name</th>
                  <th>Sanctuary</th>
                  <th>Description</th>
                  <th>Weekday</th>
                  <th>Weekend</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {auditEntries.map((entry, index) => {
                  const actionColor = getActionColor(entry.action);
                  return (
                    <tr key={`${entry.id}-${index}`}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {new Date(entry.timestamp).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600',
                          backgroundColor: '#e9ecef',
                          color: '#495057'
                        }}>
                          {entry.type}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                          ...actionColor
                        }}>
                          {entry.action}
                        </span>
                      </td>
                      <td style={{ fontWeight: '500' }}>{entry.user_name}</td>
                      <td>{entry.property_name}</td>
                      <td style={{ maxWidth: '250px', fontSize: '13px' }}>{entry.description}</td>
                      <td style={{ 
                        color: entry.weekday_change >= 0 ? '#28a745' : '#dc3545',
                        fontWeight: '600'
                      }}>
                        {entry.weekday_change >= 0 ? '+' : ''}{entry.weekday_change}
                      </td>
                      <td style={{ 
                        color: entry.weekend_change >= 0 ? '#28a745' : '#dc3545',
                        fontWeight: '600'
                      }}>
                        {entry.weekend_change >= 0 ? '+' : ''}{entry.weekend_change}
                      </td>
                      <td style={{ maxWidth: '200px', fontSize: '12px', color: '#6c757d' }}>
                        {entry.details}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>📋</div>
          <p style={{ color: '#6c757d', fontSize: '16px' }}>
            No audit trail entries found for the selected date range.
          </p>
        </div>
      )}
    </div>
  );
};

export default AuditTrail;

