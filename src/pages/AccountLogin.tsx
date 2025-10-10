import React, { useEffect, useState } from 'react';
import { Form, Button, Alert, FloatingLabel } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOGMeta } from '../utils/ogMeta';
import '../css/login.scss';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { useTranslation } from 'react-i18next';

const LoginPage: React.FC = () => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthProcessing, setOauthProcessing] = useState(false);
  const [oauthStatusMessage, setOauthStatusMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user, checkAuth } = useAuth();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.title = t('auth.login.documentTitle', { app: t('app.name') });
    if (user) {
      navigate('/');
    }
  }, [user, navigate, t, i18n.language]);

  useOGMeta({
    title: t('auth.login.documentTitle', { app: t('app.name') }),
    description: t('auth.login.documentTitle', { app: t('app.name') }),
    type: 'website',
    url: window.location.href,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(emailOrUsername, password, remember);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.login.errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleGithubLogin = () => {
    const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const params = new URLSearchParams({ returnTo });
    window.location.href = `/api/auth/github?${params.toString()}`;
  };

  const handleGoogleLogin = () => {
    const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const params = new URLSearchParams({ returnTo });
    window.location.href = `/api/auth/google?${params.toString()}`;
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
      setOauthStatusMessage(t('auth.login.githubStatus.completing'));
      checkAuth()
        .then(() => {
          navigate('/', { replace: true });
        })
        .catch(() => {
          setOauthProcessing(false);
          setOauthStatusMessage(null);
          setError(t('auth.login.githubErrors.generic'));
          clearAuthParams();
        });
      return;
    }

    if (status === 'error') {
      const errorKey = message ? `auth.login.githubErrors.${message}` : 'auth.login.githubErrors.generic';
      const translated = t(errorKey);
      setError(translated === errorKey ? t('auth.login.githubErrors.generic') : translated);
      setOauthProcessing(false);
      setOauthStatusMessage(null);
      clearAuthParams();
      return;
    }

    if (status === 'linked') {
      setOauthProcessing(false);
      setOauthStatusMessage(t('auth.login.githubStatus.linked'));
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
        <h2 className="text-center mb-3">{t('auth.login.title')}</h2>

        {error && <Alert variant="danger">{error}</Alert>}
        {oauthStatusMessage && (
          <Alert variant={oauthProcessing ? 'info' : 'success'}>{oauthStatusMessage}</Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <FloatingLabel controlId="loginEmailOrUsername" label={t('auth.login.fields.emailOrUsername')} className="mb-3">
            <Form.Control
              type="text"
              placeholder={t('auth.login.fields.emailOrUsernamePlaceholder')}
              value={emailOrUsername}
              onChange={e => setEmailOrUsername(e.target.value)}
              required
            />
          </FloatingLabel>

          <FloatingLabel controlId="loginPassword" label={t('auth.login.fields.password')} className="mb-3">
            <Form.Control
              type="password"
              placeholder={t('auth.login.fields.passwordPlaceholder')}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </FloatingLabel>

          <Form.Group className="mb-3" controlId="loginRemember">
            <Form.Check
              type="checkbox"
              label={t('auth.login.remember')}
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
            />
          </Form.Group>

          <Button type="submit" className="w-100 mb-3" disabled={loading}>
            {loading ? t('auth.login.status.loggingIn') : t('auth.login.cta')}
          </Button>
        </Form>

        <div className="text-center my-3">
          <small className="text-muted d-block mb-2">{t('auth.login.orWith')}</small>
          <div className="d-flex justify-content-center gap-2">
            <span className="oauth-icon-wrapper">
              <button
                type="button"
                className="oauth-icon-btn github"
                onClick={handleGithubLogin}
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
                onClick={handleGoogleLogin}
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
              </button>
              <span className="oauth-tooltip">Google</span>
            </span> */}
          </div>
        </div>

        <div className="text-center mb-2">
          <Link to="/forgot-password">{t('auth.login.links.forgotPassword')}</Link>
        </div>
        <div className="text-center">
          <span>{t('auth.login.registerPrompt')}</span>{' '}
          <Link to="/account/register">{t('auth.login.registerLink')}</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
