import React, { useEffect, useState } from 'react';
import api from '../../services/api';

interface QuotaStatusData {
  weekday_quota: number;
  weekend_quota: number;
  weekday_balance: number;
  weekend_balance: number;
  available_weekday: number;
  available_weekend: number;
  pending_weekday: number;
  pending_weekend: number;
  confirmed_weekday?: number;
  confirmed_weekend?: number;
  escrowed_in_pending: {
    weekday: number;
    weekend: number;
  };
}

const QuotaStatus: React.FC = () => {
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatusData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuotaStatus();
  }, []);

  const fetchQuotaStatus = async () => {
    try {
      const response = await api.get('/api/owner/quota-status');
      setQuotaStatus(response.data);
    } catch (error) {
      console.error('Error fetching quota status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!quotaStatus) return <div>Error loading quota status</div>;

  // Calculate used/booked days - only confirmed bookings
  // Used = Confirmed bookings only (not including pending)
  const usedWeekday = quotaStatus.confirmed_weekday !== undefined
    ? quotaStatus.confirmed_weekday
    : (quotaStatus.weekday_quota - quotaStatus.weekday_balance - quotaStatus.pending_weekday);

  const usedWeekend = quotaStatus.confirmed_weekend !== undefined
    ? quotaStatus.confirmed_weekend
    : (quotaStatus.weekend_quota - quotaStatus.weekend_balance - quotaStatus.pending_weekend);

  return (
    <div>
      <div className="card">
        <h2>Quota Status (OWN-08, OWN-09)</h2>

        {/* Total Balance */}
        <div style={{ marginBottom: '30px', marginTop: '20px' }}>
          <h3 style={{ marginBottom: '15px', color: '#495057' }}>Total Balance</h3>
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
                Weekday Balance
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#007bff' }}>
                {quotaStatus.weekday_balance}
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
                Weekend Balance
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#28a745' }}>
                {quotaStatus.weekend_balance}
              </div>
            </div>
          </div>
        </div>

        {/* Balance Details */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '15px', color: '#495057' }}>Balance Details</h3>
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
                <span style={{ fontSize: '12px', color: '#6c757d' }}>Annual Quota: </span>
                <span style={{ fontSize: '16px', fontWeight: '600', color: '#495057' }}>
                  {quotaStatus.weekday_quota}
                </span>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#6c757d' }}>Used/Booked: </span>
                <span style={{ fontSize: '16px', fontWeight: '600', color: '#dc3545' }}>
                  {usedWeekday}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: '#6c757d' }}>Pending (Escrow): </span>
                <span style={{ fontSize: '16px', fontWeight: '600', color: '#ffc107' }}>
                  {quotaStatus.pending_weekday}
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
                <span style={{ fontSize: '12px', color: '#6c757d' }}>Annual Quota: </span>
                <span style={{ fontSize: '16px', fontWeight: '600', color: '#495057' }}>
                  {quotaStatus.weekend_quota}
                </span>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#6c757d' }}>Used/Booked: </span>
                <span style={{ fontSize: '16px', fontWeight: '600', color: '#dc3545' }}>
                  {usedWeekend}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: '#6c757d' }}>Pending (Escrow): </span>
                <span style={{ fontSize: '16px', fontWeight: '600', color: '#ffc107' }}>
                  {quotaStatus.pending_weekend}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Note */}
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#e7f3ff',
          borderRadius: '8px',
          border: '1px solid #b3d9ff'
        }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#004085' }}>
            <strong>ℹ️ Note:</strong> Credits shown as "Escrowed" are locked in pending booking requests and will be refunded if the request is rejected or cancelled.
          </p>
        </div>
      </div>
    </div>
  );
};

export default QuotaStatus;

