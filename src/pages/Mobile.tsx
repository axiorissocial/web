import React, { useEffect } from 'react';
import '../css/mobile.scss';
import '../css/buttons.scss';
import { Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { Download, ChevronRight } from 'react-bootstrap-icons';

interface MobilePageProps {
  code?: number;
  message?: string;
  logoSrc?: string;
  title?: string;
}

const MobilePage: React.FC<MobilePageProps> = ({
  code,
  message = 'For the best experience, please use the Axioris mobile app.',
  logoSrc = '/logo.png',
  title = 'You are on mobile.'
}) => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Mobile Warning - Axioris';
  }, []);

  return (
    <div className="err-container">
      <div className="logo-section">
        <img src={logoSrc} className="logo" alt="Axioris Logo" />
        <span>Axioris</span>
      </div>

      <div className="text-section">
        <h1 className="error-code">{title}</h1>
        {code && <p className="error-subcode">Error Code: {code}</p>}
        <p className="error-msg">{message}</p>
      </div>

      <div className="button-section">
        <Button
          variant="primary"
          className="btn d-flex align-items-center justify-content-center"
          onClick={() => navigate('/')}
        >
          <Download size={20} />
          Download App
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
          Continue on Website
        </Button>
      </div>
    </div>
  );
};

export default MobilePage;
