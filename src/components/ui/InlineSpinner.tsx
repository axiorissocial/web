import React from 'react';
import { Spinner } from 'react-bootstrap';

interface InlineSpinnerProps {
  size?: 'sm' | 'md';
  className?: string;
  ariaLabel?: string;
}

const InlineSpinner: React.FC<InlineSpinnerProps> = ({ size = 'md', className = '', ariaLabel }) => {
  if (size === 'sm') {
    return <Spinner size="sm" className={className} />;
  }
  return <Spinner animation="border" role="status" aria-label={ariaLabel || 'Loading'} className={className} />;
};

export default InlineSpinner;
