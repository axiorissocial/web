import React, { useEffect, useState } from 'react';
import { Form, Button, Alert, FloatingLabel } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../css/login.scss';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub } from '@fortawesome/free-brands-svg-icons';

const LoginPage: React.FC = () => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, user } = useAuth();

  useEffect(() => {
    document.title = `Login - Axioris`;
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(emailOrUsername, password, remember);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGithubLogin = () => {
    window.location.href = '/auth/github';
  };

  return (
    <div className="login-page d-flex flex-column align-items-center justify-content-center min-vh-100">
      <div
        className="login-logo d-flex align-items-center mb-3"
        onClick={() => navigate('/')}
        style={{ cursor: 'pointer' }}
      >
        <img src="/logo.png" alt="Axioris Logo" className="me-2" style={{ height: '40px' }} />
        <span className="logo-text" style={{ fontSize: '1.5rem', fontWeight: 600 }}>Axioris</span>
      </div>

      <div className="login-modal p-4 rounded shadow-sm">
        <h2 className="text-center mb-3">Login</h2>

        {error && <Alert variant="danger">{error}</Alert>}

        <Form onSubmit={handleSubmit}>
          <FloatingLabel controlId="loginEmailOrUsername" label="Email or Username" className="mb-3">
            <Form.Control
              type="text"
              placeholder="Email or Username"
              value={emailOrUsername}
              onChange={e => setEmailOrUsername(e.target.value)}
              required
            />
          </FloatingLabel>

          <FloatingLabel controlId="loginPassword" label="Password" className="mb-3">
            <Form.Control
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </FloatingLabel>

          <Form.Group className="mb-3" controlId="loginRemember">
            <Form.Check
              type="checkbox"
              label="Remember Me"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
            />
          </Form.Group>

          <Button type="submit" className="w-100 mb-3" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </Form>

        <button
          className="github-login-btn w-100 mb-3"
          onClick={handleGithubLogin}
        >
          <FontAwesomeIcon icon={faGithub} className="fa-icon" />
          Login with GitHub
        </button>

        <div className="text-center mb-2">
          <Link to="/forgot-password">Forgot password?</Link>
        </div>
        <div className="text-center">
          <span>Don't have an account? </span>
          <Link to="/account/register">Sign Up</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
