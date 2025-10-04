import React, { useEffect, useState } from 'react';
import { Form, Button, Alert, FloatingLabel } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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

        <button
          className="github-login-btn w-100 mb-3"
          onClick={handleGithubLogin}
          disabled={oauthProcessing}
        >
          <FontAwesomeIcon icon={faGithub} className="fa-icon" />
          {t('auth.login.github')}
        </button>

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
