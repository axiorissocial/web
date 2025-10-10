import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  markAllAsRead: () => void;
  incrementUnreadCount: () => void;
  fetchUnreadCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<number | null>(null);

  const clearReconnect = useCallback(() => {
    if (reconnectRef.current !== null) {
      window.clearTimeout(reconnectRef.current);
      reconnectRef.current = null;
    }
  }, []);

  const buildWebSocketUrl = () => {
    const explicitUrl = import.meta.env.VITE_WS_URL as string | undefined;
    if (explicitUrl) {
      const normalized = explicitUrl.replace(/\/$/, '');
      if (normalized.startsWith('ws://') || normalized.startsWith('wss://')) {
        return normalized;
      }

      if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
        const url = normalized.replace(/^http/, 'ws').replace(/\/$/, '');
        return url.endsWith('/ws') || url.endsWith('/api/ws') ? url : `${url}/api/ws`;
      }

      const explicitProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${explicitProtocol}//${normalized.replace(/\/$/, '')}${normalized.endsWith('/ws') || normalized.endsWith('/api/ws') ? '' : '/api/ws'}`;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let host = (import.meta.env.VITE_PUBLIC_HOST as string | undefined)
      || (import.meta.env.VITE_HMR_HOST as string | undefined)
      || window.location.host;

    if (import.meta.env.DEV) {
      const defaultPort = (import.meta.env.VITE_SERVER_PORT as string | undefined)
        || (import.meta.env.VITE_HMR_PORT as string | undefined)
        || '3001';

      const hostname = window.location.hostname;
      const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';

      if (isLocalhost && !host.includes(':')) {
        host = `${host}:${defaultPort}`;
      }
    }

    return `${protocol}//${host.replace(/\/$/, '')}/api/ws`;
  };

  const handleRealtimePayload = (payload: any) => {
    if (!payload || typeof payload !== 'object') return;

    switch (payload.event) {
      case 'notification:count': {
        const count = payload.data?.count;
        if (typeof count === 'number') {
          setUnreadCount(count);
        }
        break;
      }
      case 'notification:increment': {
        const amount = typeof payload.data?.amount === 'number' ? payload.data.amount : 1;
        setUnreadCount(prev => prev + amount);
        break;
      }
      case 'message:new':
      case 'message:sent':
      case 'message:typing':
      case 'message:deleted': {
        window.dispatchEvent(
          new CustomEvent('ws-message', {
            detail: {
              ...(payload.data ?? {}),
              event: payload.event
            }
          })
        );
        break;
      }
      case 'presence:update':
      case 'presence:state': {
        window.dispatchEvent(
          new CustomEvent('ws-presence', {
            detail: {
              ...(payload.data ?? {}),
              event: payload.event
            }
          })
        );
        break;
      }
      default:
        break;
    }
  };

  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    try {
      const response = await fetch('/api/notifications/unread-count', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count || 0);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, [user]);

  const markAllAsRead = () => {
    setUnreadCount(0);
  };

  const incrementUnreadCount = () => {
    setUnreadCount(prev => prev + 1);
  };

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      clearReconnect();
      return;
    }

    let isMounted = true;

    const connectWebSocket = () => {
      if (!user || wsRef.current) {
        return;
      }

      const wsUrl = buildWebSocketUrl();
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        const processPayload = (raw: string) => {
          const trimmed = raw?.trim();
          if (!trimmed) {
            return;
          }

          try {
            const payload = JSON.parse(trimmed);
            handleRealtimePayload(payload);
          } catch (error) {
            console.error('Invalid realtime payload:', error, trimmed);
          }
        };

        if (typeof event.data === 'string') {
          processPayload(event.data);
        } else if (event.data instanceof Blob) {
          event.data.text().then(processPayload).catch((error) => {
            console.error('Invalid realtime payload:', error);
          });
        } else if (event.data instanceof ArrayBuffer) {
          const text = new TextDecoder().decode(event.data);
          processPayload(text);
        }
      };

      ws.onopen = () => {
        clearReconnect();
      };

      ws.onerror = () => {
        ws.close();
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (!isMounted || !user) {
          return;
        }

        if (reconnectRef.current === null) {
          reconnectRef.current = window.setTimeout(() => {
            reconnectRef.current = null;
            connectWebSocket();
          }, 5000);
        }
      };
    };

    fetchUnreadCount();
    connectWebSocket();
    const interval = window.setInterval(fetchUnreadCount, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      clearReconnect();
    };
  }, [user, fetchUnreadCount, clearReconnect]);

  const value = {
    unreadCount,
    setUnreadCount,
    markAllAsRead,
    incrementUnreadCount,
    fetchUnreadCount
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};