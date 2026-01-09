import React, { useState } from 'react';
import api from '../../services/api';

const QuotaReset: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resetInfo, setResetInfo] = useState<any>(null);

  const handleReset = async () => {
    const confirmMessage = `⚠️ WARNING: This will reset ALL active owners' quota balances to their annual quota amounts.\n\n` +
      `This action will:\n` +
      `- Set weekday_balance = weekday_quota for all active users\n` +
      `- Set weekend_balance = weekend_quota for all active users\n` +
      `- Create transaction records for the reset\n\n` +
      `Are you absolutely sure you want to reset all quotas?`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    // Final confirmation
    if (!window.confirm(`Final confirmation: Reset quotas for ALL active owners?`)) {
      return;
    }

    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      const response = await api.post('/api/admin/reset-all-quotas');
      setResetInfo(response.data);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reset quotas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Global Quota Reset (ADM-16)</h2>
      {error && <div className="error">{error}</div>}
      {success && (
        <div className="success">
          {resetInfo?.message || 'Quotas reset successfully!'}
        </div>
      )}

      <div style={{ 
        padding: '20px', 
        backgroundColor: '#fff3cd', 
        borderRadius: '8px',
        border: '1px solid #ffc107',
        marginBottom: '20px'
      }}>
        <h3 style={{ marginTop: 0, color: '#856404' }}>⚠️ Important Information</h3>
        <p style={{ color: '#856404', marginBottom: '10px' }}>
          This action will reset the quota balances for <strong>ALL active owners</strong> to their annual quota amounts.
        </p>
        <ul style={{ color: '#856404', marginLeft: '20px' }}>
          <li>Weekday balance will be set to weekday quota</li>
          <li>Weekend balance will be set to weekend quota</li>
          <li>Transaction records will be created for audit purposes</li>
          <li>This is typically done annually (e.g., January 1st)</li>
        </ul>
      </div>

      <button 
        onClick={handleReset} 
        className="btn btn-danger" 
        disabled={loading}
        title={loading ? 'Resetting...' : 'Reset All Quotas'}
        style={{ padding: '10px 20px', minWidth: 'auto' }}
      >
        {loading ? '⏳ Resetting...' : '🔄 Reset All Quotas'}
      </button>
    </div>
  );
};

export default QuotaReset;

