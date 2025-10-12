import React from 'react';
import { Alert } from 'react-bootstrap';

interface AlertMessageProps {
  variant?: string;
  dismissible?: boolean;
  onClose?: () => void;
  children?: React.ReactNode;
  className?: string;
}

const AlertMessage: React.FC<AlertMessageProps> = ({ variant = 'info', dismissible = false, onClose, children, className }) => {
  return (
    <Alert variant={variant} dismissible={dismissible} onClose={onClose} className={className}>
      {children}
    </Alert>
  );
};

export default AlertMessage;
