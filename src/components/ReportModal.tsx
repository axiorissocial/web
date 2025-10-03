import React, { useState } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

interface ReportModalProps {
  show: boolean;
  onHide: () => void;
  targetType: 'post' | 'comment';
  targetId: string;
}

const ReportModal: React.FC<ReportModalProps> = ({ show, onHide, targetType, targetId }) => {
  const [reason, setReason] = useState<string>('other');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const resp = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          reason,
          notes,
          postId: targetType === 'post' ? targetId : undefined,
          commentId: targetType === 'comment' ? targetId : undefined,
        })
      });

      if (!resp.ok) {
        const data = await resp.json();
        const message = typeof data.message === 'string' ? data.message : null;
        throw new Error(message ?? 'report.errors.submitFailed');
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onHide();
      }, 1200);
    } catch (err: any) {
      const message = err?.message as string | undefined;
      if (message) {
        setError(message.startsWith('report.') ? t(message) : message);
      } else {
        setError(t('report.errors.submitFailed'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          {t(`report.modalTitle.${targetType}`)}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{t('report.success')}</Alert>}

        <Form.Group className="mb-3">
          <Form.Label>{t('report.fields.reasonLabel')}</Form.Label>
          <Form.Select value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="spam">{t('report.reasons.spam')}</option>
            <option value="harassment">{t('report.reasons.harassment')}</option>
            <option value="sexual">{t('report.reasons.sexual')}</option>
            <option value="illegal">{t('report.reasons.illegal')}</option>
            <option value="other">{t('report.reasons.other')}</option>
          </Form.Select>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>{t('report.fields.notesLabel')}</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('report.placeholders.details')}
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={submitting}>
          {t('common.cancel')}
        </Button>
        <Button variant="danger" onClick={handleSubmit} disabled={submitting}>
          {submitting ? t('report.status.submitting') : t('report.submit')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ReportModal;
