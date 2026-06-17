import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const isValidPhone = (phone: string) => /^(\+91|91)?[6-9]\d{9}$/.test(phone.replace(/[\s-]/g, ''));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isValidPhone(formData.phone)) {
      setError('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    setLoading(true);

    try {
      await register(formData.email, formData.password, formData.name, formData.phone);
      setSuccess(true);
      // Don't auto-redirect, let user read the message about checking email
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Registration failed. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
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
          <div className="success-message" role="alert">
            <span className="success-icon">✅</span>
            <div className="success-content">
              <div className="success-title">Registration Successful!</div>
              <div className="success-text">
                A confirmation email has been sent to <strong>{formData.email}</strong>.
                <br /><br />
                Please check your inbox and click the confirmation link to verify your email address.
                <br /><br />
                After verification, your registration will be pending admin approval.
              </div>
            </div>
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <button
                onClick={() => navigate('/login')}
                className="auth-button"
                style={{ width: '100%', maxWidth: '200px' }}
              >
                Go Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          <h2 className="auth-subtitle">Create Account</h2>
          <p className="auth-description">Join the Vanatvam community</p>
        </div>
        
        {error && (
          <div className="error-message" role="alert">
            <span className="error-icon">⚠️</span>
            <span className="error-text">{error}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                setError(''); // Clear error when user types
              }}
              required
              className={`auth-input ${error ? 'input-error' : ''}`}
              disabled={loading}
            />
          </div>
          
          <div className="input-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                setError(''); // Clear error when user types
              }}
              required
              className={`auth-input ${error ? 'input-error' : ''}`}
              disabled={loading}
            />
          </div>
          
          <div className="input-group">
            <label htmlFor="phone">Phone Number</label>
            <input
              id="phone"
              type="tel"
              placeholder="e.g. 9876543210"
              value={formData.phone}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9+\-\s]/g, '');
                setFormData({ ...formData, phone: val });
                setError('');
              }}
              required
              maxLength={15}
              className={`auth-input ${error ? 'input-error' : ''}`}
              disabled={loading}
            />
          </div>
          
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <div className="password-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a password"
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  setError('');
                }}
                required
                className={`auth-input ${error ? 'input-error' : ''}`}
                disabled={loading}
              />
              <button type="button" className="password-toggle" onClick={() => setShowPassword(v => !v)} tabIndex={-1}>
                {showPassword ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg> : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
              </button>
            </div>
          </div>
          
          <button 
            type="submit" 
            className="auth-button" 
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>
        
        <div className="auth-footer">
          <p>
            Already have an account? <a href="/login">Sign In</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;

