import React, { useEffect, useState } from 'react';
import '../css/mobile.scss';
import '../css/buttons.scss';
import { Button, Modal } from 'react-bootstrap';
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
  message = 'Axioris runs beautifully as a Progressive Web App. Install it to stay connected on the go without downloading anything from the store.',
  logoSrc = '/logo.png',
  title = 'Install the Axioris PWA'
}) => {
  const navigate = useNavigate();
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  useEffect(() => {
    document.title = 'Install Axioris PWA';
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
          onClick={() => setShowInstallGuide(true)}
        >
          <Download size={20} />
          Install the PWA
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

      <Modal
        show={showInstallGuide}
        onHide={() => setShowInstallGuide(false)}
        centered
        aria-labelledby="pwa-install-guide-title"
      >
        <Modal.Header closeButton>
          <Modal.Title id="pwa-install-guide-title">How to install on your phone</Modal.Title>
        </Modal.Header>
        <Modal.Body className="pwa-install-guide">
          <p className="mb-3">
            Add Axioris to your home screen so it behaves like a fully native app. It only takes a few seconds:
          </p>
          <h6>On iPhone or iPad (Safari)</h6>
          <ol>
            <li>Tap the <strong>Share</strong> icon in the browser toolbar.</li>
            <li>Select <strong>Add to Home Screen</strong>.</li>
            <li>Confirm by tapping <strong>Add</strong>.</li>
          </ol>
          <h6 className="mt-3">On Android (Chrome)</h6>
          <ol>
            <li>Tap the <strong>⋮</strong> menu in the top right corner.</li>
            <li>Choose <strong>Install app</strong> or <strong>Add to home screen</strong>.</li>
            <li>Confirm the prompt to finish.</li>
          </ol>
          <p className="mb-0 text-muted">
            Once installed, open Axioris from your home screen for the full-screen, distraction-free experience.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowInstallGuide(false)}>
            Close
          </Button>
          <Button variant="primary" onClick={() => setShowInstallGuide(false)}>
            Got it
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default MobilePage;
