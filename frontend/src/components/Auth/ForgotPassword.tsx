import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import './Auth.css';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      const response = await api.post('/api/auth/forgot-password', { email });
      setSuccess(true);
      // In development, show the token. In production, this would be sent via email
      if (response.data.reset_token) {
        setResetToken(response.data.reset_token);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1>Vanatvam</h1>
          <h2>Password Reset</h2>
          <div className="success">
            {resetToken ? (
              <>
                <p>Password reset token generated!</p>
                <p style={{fontSize: '12px', wordBreak: 'break-all', backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '4px'}}>
                  <strong>Reset Token:</strong> {resetToken}
                </p>
                <p style={{fontSize: '12px', marginTop: '10px'}}>
                  <Link to={`/reset-password?token=${resetToken}`}>Click here to reset your password</Link>
                </p>
                <p style={{fontSize: '11px', color: '#666', marginTop: '10px'}}>
                  Note: In production, this token would be sent via email.
                </p>
              </>
            ) : (
              <p>If the email exists, a password reset link has been sent.</p>
            )}
          </div>
          <Link to="/login" className="btn btn-primary" style={{display: 'inline-block', marginTop: '20px'}}>
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Vanatvam</h1>
        <h2>Forgot Password</h2>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input"
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
        <p>
          <Link to="/login">Back to Login</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;

