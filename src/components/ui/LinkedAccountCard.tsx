import React from 'react';
import { Button } from 'react-bootstrap';
import InlineSpinner from './InlineSpinner';

interface Props {
  providerName: string;
  connected: boolean;
  avatarUrl?: string;
  displayName?: string;
  username?: string;
  loading?: boolean;
  onLink?: () => void;
  onUnlink?: () => void;
}

const LinkedAccountCard: React.FC<Props> = ({ providerName, connected, avatarUrl, displayName, username, loading, onLink, onUnlink }) => {
  return (
    <fieldset className="border rounded p-3 mb-3">
      <legend className="fw-semibold h6 px-2">{providerName}</legend>
      <div className="d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName || username} className="rounded-circle me-3" style={{ width: 40, height: 40 }} />
          ) : (
            <div className="rounded-circle bg-secondary me-3" style={{ width: 40, height: 40 }} />
          )}
          <div>
            <div className="fw-semibold">{displayName || username || (connected ? providerName : `${providerName} not linked`)}</div>
            {username && <div className="text-muted small">@{username}</div>}
          </div>
        </div>

        {connected ? (
          <Button variant="outline-danger" size="sm" onClick={onUnlink} disabled={loading}>
            {loading ? (
              <>
                <InlineSpinner size="sm" className="me-2" />
                Unlinking...
              </>
            ) : (
              'Unlink'
            )}
          </Button>
        ) : (
          <Button variant="outline-primary" size="sm" onClick={onLink} disabled={loading}>
            {loading ? (
              <>
                <InlineSpinner size="sm" className="me-2" />
                Linking...
              </>
            ) : (
              `Link ${providerName}`
            )}
          </Button>
        )}
      </div>
    </fieldset>
  );
};

export default LinkedAccountCard;
