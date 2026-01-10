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
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(formData.email, formData.password, formData.name, formData.phone);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
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
              <div className="success-text">Your account is pending verification. Redirecting to login...</div>
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
              placeholder="Enter your phone number"
              value={formData.phone}
              onChange={(e) => {
                setFormData({ ...formData, phone: e.target.value });
                setError(''); // Clear error when user types
              }}
              required
              className={`auth-input ${error ? 'input-error' : ''}`}
              disabled={loading}
            />
          </div>
          
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Create a password"
              value={formData.password}
              onChange={(e) => {
                setFormData({ ...formData, password: e.target.value });
                setError(''); // Clear error when user types
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

