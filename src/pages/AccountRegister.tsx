import React, { useEffect, useState } from 'react';
import { Form, Button, Alert, FloatingLabel } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOGMeta } from '../utils/ogMeta';
import '../css/login.scss';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import UsernameConflictModal from '../components/UsernameConflictModal';

const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthProcessing, setOauthProcessing] = useState(false);
  const [oauthStatusMessage, setOauthStatusMessage] = useState<string | null>(null);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [conflictUsername, setConflictUsername] = useState('');
  const [usernameModalError, setUsernameModalError] = useState('');
  const [usernameModalLoading, setUsernameModalLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { register, user, checkAuth } = useAuth();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.title = t('auth.register.documentTitle', { app: t('app.name') });
    if (user) {
      navigate('/');
    }
  }, [user, navigate, t, i18n.language]);

  useOGMeta({
    title: t('auth.register.documentTitle', { app: t('app.name') }),
    description: t('auth.register.documentTitle', { app: t('app.name') }),
    type: 'website',
    url: window.location.href,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError(t('auth.register.validation.passwordMismatch'));
      setLoading(false);
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9.]+$/;
    if (!usernameRegex.test(name)) {
      setError(t('auth.register.validation.usernameFormat'));
      setLoading(false);
      return;
    }

    try {
      await register(name, email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.register.errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleGithubRegister = () => {
    const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const params = new URLSearchParams({ returnTo });
    window.location.href = `/api/auth/github?${params.toString()}`;
  };

  const handleUsernameSubmit = async (username: string) => {
    setUsernameModalLoading(true);
    setUsernameModalError('');

    try {
      const response = await fetch('/api/complete-github-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to complete signup');
      }

      const data = await response.json();
      setShowUsernameModal(false);
      
      await checkAuth();
      
      navigate(data.returnTo || '/', { replace: true });
    } catch (error) {
      console.error('Username submission error:', error);
      setUsernameModalError(error instanceof Error ? error.message : 'Failed to complete signup');
    } finally {
      setUsernameModalLoading(false);
    }
  };

  const handleUsernameModalClose = () => {
    setShowUsernameModal(false);
    setUsernameModalError('');
    setConflictUsername('');
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const provider = params.get('authProvider');
    const status = params.get('authStatus');
    const message = params.get('authMessage');

    if (provider !== 'github' || !status) {
      return;
    }

    const clearAuthParams = () => {
      params.delete('authProvider');
      params.delete('authStatus');
      if (message) {
        params.delete('authMessage');
      }
      const nextSearch = params.toString();
      navigate(`${location.pathname}${nextSearch ? `?${nextSearch}` : ''}`, { replace: true });
    };

    if (status === 'success') {
      setOauthProcessing(true);
      setOauthStatusMessage(t('auth.register.githubStatus.completing'));
      checkAuth()
        .then(() => {
          navigate('/', { replace: true });
        })
        .catch(() => {
          setOauthProcessing(false);
          setOauthStatusMessage(null);
          setError(t('auth.register.githubErrors.generic'));
          clearAuthParams();
        });
      return;
    }

    if (status === 'error') {
      const errorKey = message ? `auth.register.githubErrors.${message}` : 'auth.register.githubErrors.generic';
      const translated = t(errorKey);
      setError(translated === errorKey ? t('auth.register.githubErrors.generic') : translated);
      setOauthProcessing(false);
      setOauthStatusMessage(null);
      clearAuthParams();
      return;
    }

    if (status === 'username_conflict') {
      setConflictUsername(message || '');
      setShowUsernameModal(true);
      setOauthProcessing(false);
      setOauthStatusMessage(null);
      clearAuthParams();
      return;
    }

    if (status === 'linked') {
      setOauthProcessing(false);
      setOauthStatusMessage(t('auth.register.githubStatus.linked'));
      clearAuthParams();
    }
  }, [checkAuth, location.pathname, location.search, navigate, t]);

  return (
    <div className="login-page d-flex flex-column align-items-center justify-content-center min-vh-100">
      <div
        className="login-logo d-flex align-items-center mb-3"
        onClick={() => navigate('/')}
        style={{ cursor: 'pointer' }}
      >
        <img src="/logo.svg" alt={t('app.logoAlt', { app: t('app.name') })} className="me-2" style={{ height: '40px' }} />
        <span className="logo-text" style={{ fontSize: '1.5rem', fontWeight: 600 }}>{t('app.name')}</span>
      </div>

      <div className="login-modal p-4 rounded shadow-sm">
        <h2 className="text-center mb-3">{t('auth.register.title')}</h2>

        {error && <Alert variant="danger">{error}</Alert>}
        {oauthStatusMessage && (
          <Alert variant={oauthProcessing ? 'info' : 'success'}>{oauthStatusMessage}</Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <FloatingLabel controlId="registerUsername" label={t('auth.register.fields.username')} className="mb-3">
            <Form.Control
              type="text"
              placeholder={t('auth.register.fields.usernamePlaceholder')}
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </FloatingLabel>

          <FloatingLabel controlId="registerEmail" label={t('auth.register.fields.email')} className="mb-3">
            <Form.Control
              type="email"
              placeholder={t('auth.register.fields.emailPlaceholder')}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </FloatingLabel>

          <FloatingLabel controlId="registerPassword" label={t('auth.register.fields.password')} className="mb-3">
            <Form.Control
              type="password"
              placeholder={t('auth.register.fields.passwordPlaceholder')}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </FloatingLabel>

          <FloatingLabel controlId="registerConfirmPassword" label={t('auth.register.fields.confirmPassword')} className="mb-3">
            <Form.Control
              type="password"
              placeholder={t('auth.register.fields.confirmPasswordPlaceholder')}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />
          </FloatingLabel>

          <Button type="submit" className="w-100 mb-3" disabled={loading}>
            {loading ? t('auth.register.status.registering') : t('auth.register.cta')}
          </Button>
        </Form>

        <button
          type="button"
          className="github-login-btn w-100 mb-3"
          onClick={handleGithubRegister}
          disabled={oauthProcessing}
        >
          <FontAwesomeIcon icon={faGithub} className="fa-icon" />
          {t('auth.register.github')}
        </button>

        <div className="text-center">
          <span>{t('auth.register.loginPrompt')}</span>{' '}
          <Link to="/account/login">{t('auth.register.loginLink')}</Link>
        </div>
      </div>

      <UsernameConflictModal
        show={showUsernameModal}
        onHide={handleUsernameModalClose}
        onSubmit={handleUsernameSubmit}
        originalUsername={conflictUsername}
        loading={usernameModalLoading}
        error={usernameModalError}
      />
    </div>
  );
};

export default RegisterPage;
