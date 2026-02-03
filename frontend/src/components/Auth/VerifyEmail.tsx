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
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link. No token provided.');
        return;
      }

      try {
        // Don't double-encode - FastAPI will handle URL decoding
        // Just use the token as-is from the URL params
        console.log('=== Email Verification ===');
        console.log('Token from URL:', token);
        console.log('Token length:', token.length);

        const response = await api.get(`/api/auth/verify-email`, {
          params: { token: token }
        });

        console.log('Verification response:', response);
        console.log('Response status:', response.status);
        console.log('Response data:', response.data);

        // Check if response is successful (status 200-299)
        if (response.status >= 200 && response.status < 300) {
          console.log('✓ Verification successful!');
          setStatus('success');
          setMessage(response.data?.message || 'Email verified successfully!');

          // Redirect to login after 3 seconds
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        } else {
          console.log('✗ Verification failed - unexpected status');
          setStatus('error');
          setMessage(response.data?.detail || 'Email verification failed.');
        }
      } catch (error: any) {
        console.error('=== Verification Error ===');
        console.error('Error object:', error);
        console.error('Error response:', error.response);
        console.error('Error status:', error.response?.status);
        console.error('Error data:', error.response?.data);
        console.error('Error message:', error.message);

        // Check if it's actually a success but axios is treating it as an error
        if (error.response?.status === 200 || error.response?.status === 201) {
          console.log('✓ Status 200/201 in error - treating as success');
          setStatus('success');
          setMessage(error.response?.data?.message || 'Email verified successfully!');
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        } else {
          console.log('✗ Verification failed');
          setStatus('error');
          const errorMessage = error.response?.data?.detail ||
            error.response?.data?.message ||
            error.message ||
            'Email verification failed. The link may have expired or is invalid.';
          setMessage(errorMessage);
        }
      }
    };

    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. No token provided.');
      return;
    }

    // Add a small delay to ensure component is mounted
    const timer = setTimeout(() => {
      verifyEmail();
    }, 100);

    return () => clearTimeout(timer);
  }, [token, navigate]);

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

