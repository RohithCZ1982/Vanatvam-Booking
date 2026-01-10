import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import './Auth.css';

const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying your email address...');
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. No token provided.');
      return;
    }

    verifyEmail();
  }, [token]);

  const verifyEmail = async () => {
    try {
      const response = await api.get(`/api/auth/verify-email?token=${token}`);
      setStatus('success');
      setMessage(response.data.message || 'Email verified successfully!');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error: any) {
      setStatus('error');
      setMessage(
        error.response?.data?.detail || 
        'Email verification failed. The link may have expired or is invalid.'
      );
    }
  };

  return (
    <div 
      className="auth-container"
      style={{
        backgroundImage: 'url(/images/bagroundImage.png)'
      }}
    >
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-logo">Vanatvam</h1>
        </div>
        
        {status === 'verifying' && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
            <div className="auth-description">{message}</div>
          </div>
        )}
        
        {status === 'success' && (
          <div className="success-message" role="alert">
            <span className="success-icon">✅</span>
            <div className="success-content">
              <div className="success-title">Email Verified!</div>
              <div className="success-text">{message}</div>
              <div className="success-text" style={{ marginTop: '10px', fontSize: '14px' }}>
                Redirecting to login page...
              </div>
            </div>
          </div>
        )}
        
        {status === 'error' && (
          <div className="error-message" role="alert">
            <span style={{ fontSize: '24px', marginRight: '10px' }}>❌</span>
            <div>
              <div style={{ fontWeight: '600', marginBottom: '8px' }}>Verification Failed</div>
              <div>{message}</div>
              <button
                onClick={() => navigate('/login')}
                className="auth-button"
                style={{ marginTop: '20px', width: '100%' }}
              >
                Go to Login
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;

