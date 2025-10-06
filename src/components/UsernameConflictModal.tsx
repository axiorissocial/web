import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

interface UsernameConflictModalProps {
  show: boolean;
  onHide: () => void;
  onSubmit: (username: string) => void;
  originalUsername: string;
  loading?: boolean;
  error?: string;
}

const UsernameConflictModal: React.FC<UsernameConflictModalProps> = ({
  show,
  onHide,
  onSubmit,
  originalUsername,
  loading = false,
  error = ''
}) => {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (show) {
      setUsername(originalUsername || '');
      setValidationError('');
      setIsAvailable(null);
    }
  }, [show, originalUsername]);

  useEffect(() => {
    if (!username || username.length < 2) {
      setIsAvailable(null);
      setValidationError('');
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9.]+$/;
    if (!usernameRegex.test(username)) {
      setValidationError(t('auth.register.validation.usernameFormat'));
      setIsAvailable(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsValidating(true);
      setValidationError('');
      
      try {
        const response = await fetch(`/api/check-username?username=${encodeURIComponent(username)}`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setIsAvailable(data.available);
          if (!data.available) {
            setValidationError(t('auth.register.errors.usernameTaken'));
          }
        } else {
          setValidationError(t('auth.register.errors.usernameCheckFailed'));
          setIsAvailable(false);
        }
      } catch (error) {
        console.error('Username validation error:', error);
        setValidationError(t('auth.register.errors.usernameCheckFailed'));
        setIsAvailable(false);
      } finally {
        setIsValidating(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [username, t]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && isAvailable && !isValidating && !loading) {
      onSubmit(username);
    }
  };

  const canSubmit = username && isAvailable && !isValidating && !loading;

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>{t('auth.usernameConflict.title')}</Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        <div className="mb-3">
          <p>{t('auth.usernameConflict.description', { username: originalUsername })}</p>
        </div>

        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>{t('auth.register.fields.username')}</Form.Label>
            <Form.Control
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('auth.register.fields.usernamePlaceholder')}
              isInvalid={!!validationError || isAvailable === false}
              isValid={isAvailable === true}
              autoFocus
            />
            
            {isValidating && (
              <div className="mt-2 text-muted d-flex align-items-center">
                <Spinner size="sm" className="me-2" />
                {t('auth.usernameConflict.checking')}
              </div>
            )}
            
            {validationError && (
              <Form.Control.Feedback type="invalid">
                {validationError}
              </Form.Control.Feedback>
            )}
            
            {isAvailable === true && (
              <Form.Control.Feedback type="valid">
                {t('auth.usernameConflict.available')}
              </Form.Control.Feedback>
            )}
          </Form.Group>
        </Form>
      </Modal.Body>
      
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          {t('common.actions.cancel')}
        </Button>
        <Button 
          variant="primary" 
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {loading && <Spinner size="sm" className="me-2" />}
          {t('auth.usernameConflict.confirm')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default UsernameConflictModal;