import React, { useEffect, useState } from 'react';
import usePageMeta from '../utils/usePageMeta';
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
  const { t } = useTranslation();

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  usePageMeta({ title: t('auth.register.documentTitle', { app: t('app.name') }), description: t('auth.register.documentTitle', { app: t('app.name') }) });

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

  const handleGoogleRegister = () => {
    const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const params = new URLSearchParams({ returnTo });
    window.location.href = `/api/auth/google?${params.toString()}`;
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

    if ((provider !== 'github' && provider !== 'google') || !status) {
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

        <div className="text-center my-3">
          <small className="text-muted d-block mb-2">{t('auth.register.orWith')}</small>
          <div className="d-flex justify-content-center gap-2">
            <span className="oauth-icon-wrapper">
              <button
                type="button"
                className="oauth-icon-btn github"
                onClick={handleGithubRegister}
                disabled={oauthProcessing}
                aria-label="GitHub"
              >
                <FontAwesomeIcon icon={faGithub} />
              </button>
              <span className="oauth-tooltip">GitHub</span>
            </span>

            {/* <span className="oauth-icon-wrapper">
              <button
                type="button"
                className="oauth-icon-btn google"
                onClick={handleGoogleRegister}
                disabled={oauthProcessing}
                aria-label="Google"
              >
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" xmlnsXlink="http://www.w3.org/1999/xlink" style={{display: 'block'}}>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
              <span className="oauth-tooltip">Google</span>
              </button>
            </span> */}
          </div>
        </div>

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
