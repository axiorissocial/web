import React, { useState } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';

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
        throw new Error(data.message || 'Failed to submit report');
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onHide();
      }, 1200);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Report {targetType === 'post' ? 'Post' : 'Comment'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">Report submitted</Alert>}

        <Form.Group className="mb-3">
          <Form.Label>Reason</Form.Label>
          <Form.Select value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="spam">Spam</option>
            <option value="harassment">Harassment</option>
            <option value="sexual">Sexual Content</option>
            <option value="illegal">Illegal Content</option>
            <option value="other">Other</option>
          </Form.Select>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Notes (optional)</Form.Label>
          <Form.Control as="textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={submitting}>Cancel</Button>
        <Button variant="danger" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Report'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ReportModal;
