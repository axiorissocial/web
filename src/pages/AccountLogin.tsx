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
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorRecoveryCode, setTwoFactorRecoveryCode] = useState('');
  const [showRecoveryInput, setShowRecoveryInput] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, verify2FA, user, checkAuth } = useAuth();
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
      const result = await login(emailOrUsername, password, remember);
      if (result.requires2FA) {
        setRequires2FA(true);
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.login.errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await verify2FA(twoFactorCode, twoFactorRecoveryCode || undefined);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.login.errors.invalid2FA'));
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
        <h2 className="text-center mb-3">
          {requires2FA ? t('auth.login.twoFactor.title') : t('auth.login.title')}
        </h2>

        {error && <Alert variant="danger">{error}</Alert>}
        {oauthStatusMessage && (
          <Alert variant={oauthProcessing ? 'info' : 'success'}>{oauthStatusMessage}</Alert>
        )}

        {requires2FA ? (
          <Form onSubmit={handle2FASubmit}>
            <p className="text-muted mb-3">{t('auth.login.twoFactor.description')}</p>
            
            {!showRecoveryInput ? (
              <>
                <FloatingLabel controlId="twoFactorCode" label={t('auth.login.twoFactor.code')} className="mb-3">
                  <Form.Control
                    type="text"
                    placeholder="000000"
                    value={twoFactorCode}
                    onChange={e => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    required
                    autoFocus
                  />
                </FloatingLabel>
                
                <Button
                  variant="link"
                  className="p-0 mb-3"
                  onClick={() => {
                    setShowRecoveryInput(true);
                    setTwoFactorCode('');
                  }}
                >
                  {t('auth.login.twoFactor.useRecoveryCode')}
                </Button>
              </>
            ) : (
              <>
                <FloatingLabel controlId="recoveryCode" label={t('auth.login.twoFactor.recoveryCode')} className="mb-3">
                  <Form.Control
                    type="text"
                    placeholder="XXXX-XXXX"
                    value={twoFactorRecoveryCode}
                    onChange={e => setTwoFactorRecoveryCode(e.target.value.toUpperCase())}
                    required
                    autoFocus
                  />
                </FloatingLabel>
                
                <Button
                  variant="link"
                  className="p-0 mb-3"
                  onClick={() => {
                    setShowRecoveryInput(false);
                    setTwoFactorRecoveryCode('');
                  }}
                >
                  {t('auth.login.twoFactor.useAuthenticator')}
                </Button>
              </>
            )}

            <Button type="submit" className="w-100 mb-3" disabled={loading}>
              {loading ? t('common.statuses.verifying') : t('auth.login.twoFactor.verify')}
            </Button>
            
            <Button
              variant="secondary"
              className="w-100"
              onClick={() => {
                setRequires2FA(false);
                setTwoFactorCode('');
                setTwoFactorRecoveryCode('');
                setShowRecoveryInput(false);
                setError('');
              }}
            >
              {t('common.back')}
            </Button>
          </Form>
        ) : (
          <>
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

                {/* Google OAuth button (commented out) */}
              </div>
            </div>

            <div className="text-center mb-2">
              <Link to="/forgot-password">{t('auth.login.links.forgotPassword')}</Link>
            </div>
            <div className="text-center">
              <span>{t('auth.login.registerPrompt')}</span>{' '}
              <Link to="/account/register">{t('auth.login.registerLink')}</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
