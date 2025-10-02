import React, { useEffect, useState } from 'react';
import { Form, Button, Alert, FloatingLabel } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../css/login.scss';
import { useTranslation } from 'react-i18next';

const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register, user } = useAuth();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.title = t('auth.register.documentTitle', { app: t('app.name') });
    if (user) {
      navigate('/');
    }
  }, [user, navigate, t, i18n.language]);

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

  return (
    <div className="login-page d-flex flex-column align-items-center justify-content-center min-vh-100">
      <div
        className="login-logo d-flex align-items-center mb-3"
        onClick={() => navigate('/')}
        style={{ cursor: 'pointer' }}
      >
        <img src="/logo.png" alt={t('app.logoAlt', { app: t('app.name') })} className="me-2" style={{ height: '40px' }} />
        <span className="logo-text" style={{ fontSize: '1.5rem', fontWeight: 600 }}>{t('app.name')}</span>
      </div>

      <div className="login-modal p-4 rounded shadow-sm">
        <h2 className="text-center mb-3">{t('auth.register.title')}</h2>

        {error && <Alert variant="danger">{error}</Alert>}

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

        <div className="text-center">
          <span>{t('auth.register.loginPrompt')}</span>{' '}
          <Link to="/account/login">{t('auth.register.loginLink')}</Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
