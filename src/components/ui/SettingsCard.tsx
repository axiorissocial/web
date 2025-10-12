import React from 'react';
import { Card } from 'react-bootstrap';

interface Props {
  title?: React.ReactNode;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

const SettingsCard: React.FC<Props> = ({ title, icon, children, className }) => {
  return (
    <Card className={`settings-card ${className || ''}`}>
      <Card.Header>
        <h5 className="mb-0">{icon}{title}</h5>
      </Card.Header>
      <Card.Body>
        {children}
      </Card.Body>
    </Card>
  );
};

export default SettingsCard;
