import React, { useEffect } from 'react';
import '../css/error.scss';
import '../css/buttons.scss';
import { Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { HouseFill } from 'react-bootstrap-icons';
import { useTranslation } from 'react-i18next';

interface ErrorPageProps {
  code?: number;
  message?: string;
  logoSrc?: string;
  title?: string;
}

const ErrorPage: React.FC<ErrorPageProps> = ({
  code = 404,
  message,
  logoSrc = '/logo.png',
}) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.title = t('errorPage.documentTitle', { code, app: t('app.name') });
  }, [code, t, i18n.language]);

  const resolvedMessage = message ?? t('errorPage.defaultMessage');

  return (
    <div className="err-container">
      <div className="err-axioris-logo">
        <img src={logoSrc} className="logo" alt={t('errorPage.logoAlt', { app: t('app.name') })} />
        <span>{t('app.name')}</span>
      </div>
      <h1 className="error-code">{code}</h1>
      <h3 className="error-msg">{resolvedMessage}</h3>

      <Button
        className="btn-primary-custom d-flex align-items-center justify-content-center"
        style={{ gap: '0.5rem', width: '100%', padding: '0.6rem 0.75rem', textAlign: 'center' }}
        onClick={() => navigate('/')}
      >
        <HouseFill size={20} />
        {t('errorPage.returnHome')}
      </Button>
    </div>
  );
};

export default ErrorPage;
