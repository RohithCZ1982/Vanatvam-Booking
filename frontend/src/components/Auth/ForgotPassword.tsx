import React, { useState } from 'react';
import api from '../../services/api';
import './Auth.css';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      await api.post('/api/auth/forgot-password', { email });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div
        className="auth-container"
        style={{ backgroundImage: 'url(/images/bagroundImage.png)' }}
      >
        <div className="auth-card">
          <div className="auth-header">
            <h1 className="auth-logo">Vanatvam</h1>
            <h2 className="auth-subtitle">Check Your Email</h2>
            <p className="auth-description">
              If an account exists for <strong>{email}</strong>, we've sent a password reset link. Please check your inbox.
            </p>
          </div>

          <div className="auth-form">
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', textAlign: 'center', margin: '0 0 20px', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
              Didn't receive the email? Check your spam folder or try again.
            </p>
            <button
              className="auth-button"
              onClick={() => { setSuccess(false); setEmail(''); }}
              style={{ width: '100%', marginBottom: '10px' }}
            >
              Try Again
            </button>
            <div className="auth-footer">
              <p>
                Remember your password? <a href="/login">Sign In</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="auth-container"
      style={{ backgroundImage: 'url(/images/bagroundImage.png)' }}
    >
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-logo">Vanatvam</h1>
          <h2 className="auth-subtitle">Forgot Password</h2>
          <p className="auth-description">Enter your email to receive a reset link</p>
        </div>

        {error && (
          <div className="error-message" role="alert">
            <span className="error-icon">⚠️</span>
            <span className="error-text">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              required
              className={`auth-input ${error ? 'input-error' : ''}`}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="auth-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Sending...
              </>
            ) : (
              'Send Reset Link'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Remember your password? <a href="/login">Sign In</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
