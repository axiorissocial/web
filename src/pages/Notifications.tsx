import React, { useEffect, useState } from 'react';
import { Card, Badge, Button, Spinner, Alert } from 'react-bootstrap';
import { Heart, ChatSquareText, PersonPlus, Reply, HeartFill, CheckAll } from 'react-bootstrap-icons';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/singles/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import '../css/notifications.scss';

interface NotificationUser {
  id: string;
  username: string;
  profile?: {
    displayName?: string;
    avatar?: string;
  };
}

interface Notification {
  id: string;
  type: 'LIKE' | 'COMMENT' | 'FOLLOW' | 'MENTION' | 'REPLY' | 'COMMENT_LIKE';
  sender?: NotificationUser;
  post?: {
    id: string;
    title?: string;
    content: string;
  };
  comment?: {
    id: string;
    content: string;
  };
  message?: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
  unreadCount: number;
}

const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const { setUnreadCount: setGlobalUnreadCount, markAllAsRead: markAllGlobalRead } = useNotifications();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  useEffect(() => {
    document.title = `Notifications${unreadCount > 0 ? ` (${unreadCount})` : ''} - Axioris`;
  }, [unreadCount]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async (pageNum = 1) => {
    try {
      const response = await fetch(`/api/notifications?page=${pageNum}&limit=20`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data: NotificationResponse = await response.json();
        
        if (pageNum === 1) {
          setNotifications(data.notifications);
        } else {
          setNotifications(prev => [...prev, ...data.notifications]);
        }
        
        setHasMore(data.pagination.hasMore);
        setUnreadCount(data.unreadCount);
        setPage(pageNum);
      } else {
        setError('Failed to load notifications');
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        credentials: 'include'
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === notificationId ? { ...notif, isRead: true } : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    setMarkingAllRead(true);
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PUT',
        credentials: 'include'
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notif => ({ ...notif, isRead: true }))
        );
        setUnreadCount(0);
        // Update global unread count
        setGlobalUnreadCount(0);
        markAllGlobalRead();
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    } finally {
      setMarkingAllRead(false);
    }
  };

    const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    // Navigate to the relevant content with highlighting
    switch (notification.type) {
      case 'LIKE':
        if (notification.post) {
          navigate(`/post/${notification.post.id}`);
        }
        break;
      case 'COMMENT':
      case 'MENTION':
        if (notification.post && notification.comment) {
          navigate(`/post/${notification.post.id}#comment-${notification.comment.id}`);
        } else if (notification.post) {
          navigate(`/post/${notification.post.id}`);
        }
        break;
      case 'FOLLOW':
        if (notification.sender) {
          navigate(`/profile/@${notification.sender.username}`);
        }
        break;
      case 'REPLY':
      case 'COMMENT_LIKE':
        if (notification.post && notification.comment) {
          navigate(`/post/${notification.post.id}#comment-${notification.comment.id}`);
        } else if (notification.post) {
          navigate(`/post/${notification.post.id}`);
        }
        break;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'LIKE':
        return <Heart className="text-danger" size={20} />;
      case 'COMMENT':
        return <ChatSquareText className="text-primary" size={20} />;
      case 'FOLLOW':
        return <PersonPlus className="text-success" size={20} />;
      case 'REPLY':
        return <Reply className="text-info" size={20} />;
      case 'COMMENT_LIKE':
        return <HeartFill className="text-danger" size={16} />;
      default:
        return <ChatSquareText className="text-secondary" size={20} />;
    }
  };

  const getNotificationText = (notification: Notification) => {
    const displayName = notification.sender?.profile?.displayName || notification.sender?.username || 'Someone';
    
    switch (notification.type) {
      case 'LIKE':
        return `${displayName} liked your post`;
      case 'COMMENT':
        return `${displayName} commented on your post`;
      case 'FOLLOW':
        return `${displayName} started following you`;
      case 'REPLY':
        return `${displayName} replied to your comment`;
      case 'COMMENT_LIKE':
        return `${displayName} liked your comment`;
      default:
        return notification.message || 'New notification';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!user) {
    return (
      <div className="app-container">
        <Sidebar activeId="notifications" />
        <main className="flex-grow-1 d-flex justify-content-center align-items-center">
          <Alert variant="info">Please log in to view notifications</Alert>
        </main>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar activeId="notifications" />
      <main className="notifications-main">
        <div className="container-fluid">
          <div className="notifications-header d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1>Notifications</h1>
              <p className="text-muted mb-0">Stay up to date with your activity</p>
            </div>
            
            {unreadCount > 0 && (
              <Button
                variant="outline-primary"
                size="sm"
                onClick={markAllAsRead}
                disabled={markingAllRead}
              >
                {markingAllRead ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    Marking...
                  </>
                ) : (
                  'Mark all as read'
                )}
              </Button>
            )}
          </div>

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" />
            <div className="mt-2">Loading notifications...</div>
          </div>
        ) : error ? (
          <Alert variant="danger">{error}</Alert>
        ) : notifications.length === 0 ? (
          <Card className="text-center py-5">
            <Card.Body>
              <ChatSquareText size={48} className="text-muted mb-3" />
              <h5>No notifications yet</h5>
              <p className="text-muted">
                When people interact with your posts or follow you, you'll see notifications here.
              </p>
            </Card.Body>
          </Card>
        ) : (
          <>
            {notifications.map((notification) => (
              <Card 
                key={notification.id}
                className={`mb-2 notification-card ${!notification.isRead ? 'border-primary' : ''}`}
                style={{ cursor: 'pointer' }}
                onClick={() => handleNotificationClick(notification)}
              >
                <Card.Body className="py-3">
                  <div className="d-flex align-items-start">
                    <div className="me-3">
                      {notification.sender?.profile?.avatar ? (
                        <img 
                          src={notification.sender.profile.avatar}
                          alt={notification.sender.username}
                          className="rounded-circle"
                          width={40}
                          height={40}
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <div 
                          className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white"
                          style={{ width: '40px', height: '40px' }}
                        >
                          {notification.sender?.username?.charAt(0).toUpperCase() || '?'}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center mb-1">
                        <div className="me-2">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-grow-1">
                          <span className={!notification.isRead ? 'fw-bold' : ''}>
                            {getNotificationText(notification)}
                          </span>
                        </div>
                        {!notification.isRead && (
                          <Badge bg="primary" pill style={{ width: '8px', height: '8px' }}>
                            &nbsp;
                          </Badge>
                        )}
                      </div>
                      
                      {(notification.post || notification.comment) && (
                        <div className="text-muted small mt-1">
                          {notification.post?.content.length! > 60 
                            ? `"${notification.post?.content.slice(0, 60)}..."`
                            : `"${notification.post?.content || notification.comment?.content}"`
                          }
                        </div>
                      )}
                      
                      <div className="text-muted small mt-1">
                        {formatTimeAgo(notification.createdAt)}
                      </div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            ))}

            {hasMore && (
              <div className="text-center mt-4">
                <Button 
                  variant="outline-primary" 
                  onClick={() => fetchNotifications(page + 1)}
                >
                  Load more notifications
                </Button>
              </div>
            )}
          </>
        )}
        </div>
      </main>
    </div>
  );
};

export default NotificationsPage;
