import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // Redirect when user is loaded after login
  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/owner');
      }
    }
  }, [user, navigate]);

  // Keep error visible for 15 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      // Navigation will happen via useEffect when user state updates
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Invalid email or password. Please try again.';
      setError(errorMessage);
      setLoading(false);
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
          <h2 className="auth-subtitle">Welcome Back</h2>
          <p className="auth-description">Sign in to your account</p>
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
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
              }}
              required
              className={`auth-input ${error ? 'input-error' : ''}`}
              disabled={loading}
            />
          </div>

          <div className="forgot-password-link">
            <a href="/forgot-password">Forgot Password?</a>
          </div>

          <button
            type="submit"
            className="auth-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Logging in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account? <a href="/register">Create Account</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

