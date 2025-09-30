import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ListGroup } from 'react-bootstrap';
import { searchUsersForMention } from '../utils/mentions';
import type { MentionUser } from '../utils/mentions';

interface MentionAutocompleteProps {
  show: boolean;
  query: string;
  onSelect: (user: MentionUser) => void;
  position: { top: number; left: number };
}

const MentionAutocomplete: React.FC<MentionAutocompleteProps> = ({
  show,
  query,
  onSelect,
  position
}) => {
  const [users, setUsers] = useState<MentionUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (show && query.length > 0) {
      searchUsers();
    } else {
      setUsers([]);
      setSelectedIndex(0);
    }
  }, [show, query]);

  const searchUsers = async () => {
    setLoading(true);
    try {
      console.log('Searching users with query:', query);
      const results = await searchUsersForMention(query);
      console.log('Search results:', results);
      setUsers(results);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Error searching users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!show || users.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, users.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        if (users[selectedIndex]) {
          onSelect(users[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setUsers([]);
        break;
    }
  }, [show, users, selectedIndex, onSelect]);

  useEffect(() => {
    if (show) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [show, handleKeyDown]);

  if (!show || users.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="mention-autocomplete"
      onMouseDown={(e) => e.preventDefault()}
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        zIndex: 1000,
        maxWidth: '300px',
        maxHeight: '200px',
        overflowY: 'auto',
        background: 'var(--bs-body-bg)',
        border: '1px solid var(--bs-border-color)',
        borderRadius: '0.375rem',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}
    >
      {loading ? (
        <div className="p-3 text-center text-muted">
          Searching users...
        </div>
      ) : (
        <ListGroup variant="flush">
          {users.map((user, index) => (
            <ListGroup.Item
              key={user.id}
              action
              active={index === selectedIndex}
              onClick={() => onSelect(user)}
              onMouseDown={(e) => e.preventDefault()}
              className="d-flex align-items-center py-2"
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="rounded-circle me-2"
                  width={24}
                  height={24}
                  style={{ objectFit: 'cover' }}
                />
              ) : (
                <div
                  className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white me-2"
                  style={{ width: '24px', height: '24px', fontSize: '12px' }}
                >
                  {user.username.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="fw-medium">{user.displayName || user.username}</div>
                {user.displayName && (
                  <div className="text-muted small">@{user.username}</div>
                )}
              </div>
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}
    </div>
  );
};

export default MentionAutocomplete;