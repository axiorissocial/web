import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import InlineSpinner from './InlineSpinner';

interface Props {
  show: boolean;
  title?: React.ReactNode;
  body?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  variant?: 'primary' | 'danger' | 'secondary';
  onCancel: () => void;
  onConfirm: () => void;
}

const ConfirmModal: React.FC<Props> = ({ show, title, body, confirmLabel = 'Confirm', cancelLabel = 'Cancel', loading = false, variant = 'danger', onCancel, onConfirm }) => {
  return (
    <Modal show={show} onHide={onCancel} centered>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{body}</Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCancel}>{cancelLabel}</Button>
        <Button variant={variant} onClick={onConfirm} disabled={loading}>
          {loading ? (
            <>
              <InlineSpinner size="sm" className="me-2" />
              {confirmLabel}
            </>
          ) : (
            confirmLabel
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ConfirmModal;
