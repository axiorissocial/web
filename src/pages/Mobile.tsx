import React, { useEffect, useMemo, useState } from 'react';
import '../css/mobile.scss';
import '../css/buttons.scss';
import { Button, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { Download, ChevronRight } from 'react-bootstrap-icons';
import { useTranslation } from 'react-i18next';

interface MobilePageProps {
  code?: number;
  message?: string;
  logoSrc?: string;
  title?: string;
}

const MobilePage: React.FC<MobilePageProps> = ({
  code,
  message,
  logoSrc = '/logo.png',
  title
}) => {
  const navigate = useNavigate();
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const { t } = useTranslation();

  const translatedTitle = title ?? t('mobile.pageTitle');
  const translatedMessage = message ?? t('mobile.message');
  const iosSteps = useMemo(
    () => t('mobile.iosSteps', { returnObjects: true }) as string[],
    [t]
  );
  const androidSteps = useMemo(
    () => t('mobile.androidSteps', { returnObjects: true }) as string[],
    [t]
  );

  useEffect(() => {
    document.title = t('mobile.browserTitle');
  }, [t]);

  return (
    <div className="err-container">
      <div className="logo-section">
        <img src={logoSrc} className="logo" alt={`${t('app.name')} Logo`} />
        <span>{t('app.name')}</span>
      </div>

      <div className="text-section">
        <h1 className="error-code">{translatedTitle}</h1>
        {code && <p className="error-subcode">{t('mobile.errorCode', { code })}</p>}
        <p className="error-msg">{translatedMessage}</p>
      </div>

      <div className="button-section">
        <Button
          variant="primary"
          className="btn d-flex align-items-center justify-content-center"
          onClick={() => setShowInstallGuide(true)}
        >
          <Download size={20} />
          {t('mobile.installCta')}
        </Button>

        <Button
          variant="outline-secondary"
          className="btn d-flex align-items-center justify-content-center"
          onClick={() => {
            const expiry = new Date();
            expiry.setTime(expiry.getTime() + 24 * 60 * 60 * 1000);
            document.cookie = `mobileonsite=true; expires=${expiry.toUTCString()}; path=/`;
            navigate('/');
          }}
        >
          <ChevronRight size={20} />
          {t('mobile.continue')}
        </Button>
      </div>

      <Modal
        show={showInstallGuide}
        onHide={() => setShowInstallGuide(false)}
        centered
        aria-labelledby="pwa-install-guide-title"
      >
        <Modal.Header closeButton>
          <Modal.Title id="pwa-install-guide-title">{t('mobile.modalTitle')}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="pwa-install-guide">
          <p className="mb-3">
            {t('mobile.intro')}
          </p>
          <h6>{t('mobile.iosTitle')}</h6>
          <ol>
            {iosSteps.map((step, index) => (
              <li key={`ios-${index}`} dangerouslySetInnerHTML={{ __html: step }} />
            ))}
          </ol>
          <h6 className="mt-3">{t('mobile.androidTitle')}</h6>
          <ol>
            {androidSteps.map((step, index) => (
              <li key={`android-${index}`} dangerouslySetInnerHTML={{ __html: step }} />
            ))}
          </ol>
          <p className="mb-0 text-muted">
            {t('mobile.closing')}
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowInstallGuide(false)}>
            {t('mobile.close')}
          </Button>
          <Button variant="primary" onClick={() => setShowInstallGuide(false)}>
            {t('mobile.confirm')}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default MobilePage;
