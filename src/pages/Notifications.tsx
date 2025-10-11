import React, { useCallback, useEffect, useState } from 'react';
import { Card, Badge, Button, Spinner, Alert, Modal, ButtonGroup } from 'react-bootstrap';
import { Heart, ChatSquareText, PersonPlus, Reply, HeartFill, Archive, Trash, ArrowCounterclockwise } from 'react-bootstrap-icons';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/singles/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useOGMeta } from '../utils/ogMeta';
import '../css/notifications.scss';
import { useTranslation } from 'react-i18next';
import { formatRelativeTime } from '../utils/time';
import { getProfileGradientCss, getProfileGradientTextColor } from '../utils/profileGradients';

interface NotificationUser {
  id: string;
  username: string;
  profile?: {
    displayName?: string;
    avatar?: string;
    avatarGradient?: string | null;
    bannerGradient?: string | null;
  };
}

interface Notification {
  id: string;
  type: 'LIKE' | 'COMMENT' | 'FOLLOW' | 'MENTION' | 'REPLY' | 'COMMENT_LIKE' | 'MESSAGE';
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
  conversation?: {
    id: string;
  };
  message?: string;
  isRead: boolean;
  createdAt: string;
  isArchived: boolean;
  archivedAt?: string;
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
  const { t, i18n } = useTranslation();
  const [view, setView] = useState<'active' | 'archived'>('active');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Notification | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Notification | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [busyNotificationId, setBusyNotificationId] = useState<string | null>(null);

  useEffect(() => {
    const titleKey = unreadCount > 0
      ? 'notificationsCenter.documentTitleWithCount'
      : 'notificationsCenter.documentTitle';
    document.title = t(titleKey, { count: unreadCount, app: t('app.name') });
  }, [unreadCount, t, i18n.language]);

  useOGMeta({
    title: t(unreadCount > 0 ? 'notificationsCenter.documentTitleWithCount' : 'notificationsCenter.documentTitle', { count: unreadCount, app: t('app.name') }),
    description: t('notificationsCenter.documentTitle', { app: t('app.name') }),
    type: 'website',
    url: window.location.href,
  });

  const buildPlaceholderStyle = (profile?: NotificationUser['profile']) => {
    if (!profile || profile.avatar) {
      return undefined;
    }

    const gradientId = profile.avatarGradient ?? null;
    if (!gradientId) {
      return undefined;
    }

    return {
      background: getProfileGradientCss(gradientId),
      color: getProfileGradientTextColor(gradientId)
    } as React.CSSProperties;
  };

  const fetchNotifications = useCallback(async (pageNum = 1, targetView = view) => {
    if (!user) return;

    if (pageNum === 1) {
      setLoading(true);
      setError('');
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const response = await fetch(`/api/notifications?page=${pageNum}&limit=20&view=${targetView}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('FAILED_NOTIFICATION_FETCH');
      }

      const data: NotificationResponse = await response.json();

      if (pageNum === 1) {
        setNotifications(data.notifications);
      } else {
        setNotifications(prev => [...prev, ...data.notifications]);
      }

      setHasMore(data.pagination.hasMore);
      setUnreadCount(data.unreadCount);
      setGlobalUnreadCount(data.unreadCount);
      setPage(pageNum);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(t('notificationsCenter.errors.fetch'));

      if (pageNum === 1) {
        setNotifications([]);
        setHasMore(false);
      }
    } finally {
      if (pageNum === 1) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  }, [user, view, setGlobalUnreadCount, t]);

  useEffect(() => {
    if (user) {
      setPage(1);
      fetchNotifications(1, view);
    } else {
      setNotifications([]);
      setLoading(false);
      setError('');
    }
  }, [user, view, fetchNotifications]);

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
        setUnreadCount(prev => {
          const next = Math.max(0, prev - 1);
          setGlobalUnreadCount(next);
          return next;
        });
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    setMarkingAllRead(true);
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'PUT',
        credentials: 'include'
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notif => ({ ...notif, isRead: true }))
        );
        setUnreadCount(0);
        setGlobalUnreadCount(0);
        markAllGlobalRead();
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleChangeView = (nextView: 'active' | 'archived') => {
    if (view === nextView) return;
    setView(nextView);
    setNotifications([]);
    setHasMore(true);
    setPage(1);
    setError('');
  };

  const openArchiveModal = (notification: Notification, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setArchiveTarget(notification);
    setShowArchiveModal(true);
  };

  const openDeleteModal = (notification: Notification, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setDeleteTarget(notification);
    setShowDeleteModal(true);
  };

  const closeArchiveModal = () => {
    if (actionLoading) return;
    setShowArchiveModal(false);
    setArchiveTarget(null);
  };

  const closeDeleteModal = () => {
    if (actionLoading) return;
    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  const confirmArchive = async () => {
    if (!archiveTarget) return;
    setActionLoading(true);

    try {
      const response = await fetch(`/api/notifications/${archiveTarget.id}/archive`, {
        method: 'PUT',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('FAILED_NOTIFICATION_ARCHIVE');
      }

      setNotifications(prev => prev.filter(notif => notif.id !== archiveTarget.id));

      if (!archiveTarget.isRead) {
        setUnreadCount(prev => {
          const next = Math.max(0, prev - 1);
          setGlobalUnreadCount(next);
          return next;
        });
      }
    } catch (error) {
      console.error('Error archiving notification:', error);
      setError(t('notificationsCenter.errors.archive'));
    } finally {
      setActionLoading(false);
      setShowArchiveModal(false);
      setArchiveTarget(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);

    try {
      const response = await fetch(`/api/notifications/${deleteTarget.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('FAILED_NOTIFICATION_DELETE');
      }

      setNotifications(prev => prev.filter(notif => notif.id !== deleteTarget.id));

      if (!deleteTarget.isRead && !deleteTarget.isArchived) {
        setUnreadCount(prev => {
          const next = Math.max(0, prev - 1);
          setGlobalUnreadCount(next);
          return next;
        });
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      setError(t('notificationsCenter.errors.delete'));
    } finally {
      setActionLoading(false);
      setShowDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  const handleUnarchive = async (notification: Notification, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setBusyNotificationId(notification.id);

    try {
      const response = await fetch(`/api/notifications/${notification.id}/unarchive`, {
        method: 'PUT',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('FAILED_NOTIFICATION_RESTORE');
      }

      setNotifications(prev => prev.filter(notif => notif.id !== notification.id));
    } catch (error) {
      console.error('Error restoring notification:', error);
      setError(t('notificationsCenter.errors.restore'));
    } finally {
      setBusyNotificationId(null);
    }
  };

  const getContentPreview = (notification: Notification) => {
    const snippet = notification.post?.content || notification.comment?.content || notification.message;

    if (!snippet) {
      return '';
    }

    const shortened = snippet.length > 80 ? `${snippet.slice(0, 80)}...` : snippet;
    return t('notificationsCenter.preview', { snippet: shortened });
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

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
      case 'MESSAGE':
        if (notification.conversation?.id) {
          navigate(`/messages?conversation=${notification.conversation.id}`);
        } else {
          navigate('/messages');
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
      case 'MESSAGE':
        return <ChatSquareText className="text-success" size={20} />;
      default:
        return <ChatSquareText className="text-secondary" size={20} />;
    }
  };

  const getNotificationText = (notification: Notification) => {
    const displayName =
      notification.sender?.profile?.displayName ||
      notification.sender?.username ||
      t('notificationsCenter.unknownSender');

    const params = { name: displayName };

    switch (notification.type) {
      case 'LIKE':
        return t('notificationsCenter.types.like', params);
      case 'COMMENT':
        return t('notificationsCenter.types.comment', params);
      case 'MENTION':
        return t('notificationsCenter.types.mention', params);
      case 'FOLLOW':
        return t('notificationsCenter.types.follow', params);
      case 'REPLY':
        return t('notificationsCenter.types.reply', params);
      case 'COMMENT_LIKE':
        return t('notificationsCenter.types.commentLike', params);
      case 'MESSAGE':
        return notification.message || t('notificationsCenter.types.message', params);
      default:
        return notification.message || t('notificationsCenter.types.generic');
    }
  };

  const formatTimeAgo = (dateString: string) => formatRelativeTime(new Date(dateString), t);

  if (!user) {
    return (
      <div className="app-container">
        <Sidebar activeId="notifications" />
        <main className="flex-grow-1 d-flex justify-content-center align-items-center">
          <Alert variant="info">{t('notificationsCenter.authRequired')}</Alert>
        </main>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar activeId="notifications" />
      <main className="notifications-main">
          <div className="notifications-header d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
            <div>
              <h1>{t('notificationsCenter.title')}</h1>
              <p className="text-muted mb-0">
                {view === 'archived' ? t('notificationsCenter.subtitle.archived') : t('notificationsCenter.subtitle.active')}
              </p>
            </div>

            <div className="notifications-controls d-flex align-items-center gap-2 ms-auto">
              <ButtonGroup aria-label={t('notificationsCenter.views.ariaLabel')}>
                <Button
                  variant={view === 'active' ? 'primary' : 'outline-secondary'}
                  size="sm"
                  onClick={() => handleChangeView('active')}
                >
                  {t('notificationsCenter.views.active')}
                </Button>
                <Button
                  variant={view === 'archived' ? 'warning' : 'outline-secondary'}
                  size="sm"
                  onClick={() => handleChangeView('archived')}
                >
                  {t('notificationsCenter.views.archived')}
                </Button>
              </ButtonGroup>

              {view === 'active' && unreadCount > 0 && (
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={markAllAsRead}
                  disabled={markingAllRead}
                >
                  {markingAllRead ? (
                    <>
                      <Spinner size="sm" className="me-2" />
                      {t('notificationsCenter.actions.marking')}
                    </>
                  ) : (
                    t('notificationsCenter.actions.markAll')
                  )}
                </Button>
              )}
            </div>
          </div>

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" />
            <div className="mt-2">{t('notificationsCenter.loading')}</div>
          </div>
        ) : error ? (
          <Alert variant="danger">{error}</Alert>
        ) : notifications.length === 0 ? (
          <Card className="text-center py-5">
            <Card.Body>
              {view === 'archived' ? (
                <Archive size={48} className="text-warning mb-3" />
              ) : (
                <ChatSquareText size={48} className="text-muted mb-3" />
              )}
              <h5>{view === 'archived' ? t('notificationsCenter.empty.archived.title') : t('notificationsCenter.empty.active.title')}</h5>
              <p className="text-muted">
                {view === 'archived'
                  ? t('notificationsCenter.empty.archived.message')
                  : t('notificationsCenter.empty.active.message')}
              </p>
            </Card.Body>
          </Card>
        ) : (
          <>
            {notifications.map((notification) => {
              const preview = getContentPreview(notification);
              const isBusy = busyNotificationId === notification.id;

              return (
                <Card
                  key={notification.id}
                  className={`mb-2 notification-card ${!notification.isRead ? 'border-primary' : ''} ${notification.isArchived ? 'archived' : ''}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <Card.Body className="py-3">
                    <div className="d-flex align-items-start">
                      <div className="me-3">
                        {(() => {
                          const placeholderStyle = buildPlaceholderStyle(notification.sender?.profile);
                          const placeholderClassName = `rounded-circle d-flex align-items-center justify-content-center ${
                            placeholderStyle ? '' : 'bg-secondary text-white'
                          }`;

                          return notification.sender?.profile?.avatar ? (
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
                              className={placeholderClassName}
                              style={{
                                width: '40px',
                                height: '40px',
                                ...(placeholderStyle ?? {})
                              }}
                            >
                              {notification.sender?.username?.charAt(0).toUpperCase() || '?'}
                            </div>
                          );
                        })()}
                      </div>

                      <div className="flex-grow-1">
                        <div className="d-flex align-items-start gap-2 mb-2 flex-wrap">
                          <div className="d-flex align-items-center flex-grow-1 gap-2">
                            <div className="notification-icon text-nowrap">
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-grow-1">
                              <span className={!notification.isRead && view === 'active' ? 'fw-bold' : ''}>
                                {getNotificationText(notification)}
                              </span>
                            </div>
                            {view === 'active' && !notification.isRead && (
                              <Badge bg="primary" pill className="ms-1 unread-indicator">&nbsp;</Badge>
                            )}
                            {view === 'archived' && (
                              <Badge bg="secondary" pill className="ms-1">{t('notificationsCenter.badges.archived')}</Badge>
                            )}
                          </div>

                          <div className="notification-action-buttons d-flex align-items-center gap-2 ms-auto">
                            {view === 'active' ? (
                              <ButtonGroup size="sm">
                                <Button
                                  variant="outline-warning"
                                  className="notification-action-btn archive"
                                  title={t('notificationsCenter.actions.tooltips.archive')}
                                  onClick={(event) => openArchiveModal(notification, event)}
                                  disabled={actionLoading || isBusy}
                                >
                                  <Archive size={16} />
                                </Button>
                                <Button
                                  variant="outline-danger"
                                  className="notification-action-btn delete"
                                  title={t('notificationsCenter.actions.tooltips.delete')}
                                  onClick={(event) => openDeleteModal(notification, event)}
                                  disabled={actionLoading || isBusy}
                                >
                                  <Trash size={16} />
                                </Button>
                              </ButtonGroup>
                            ) : (
                              <ButtonGroup size="sm">
                                <Button
                                  variant="outline-success"
                                  className="notification-action-btn restore"
                                  title={t('notificationsCenter.actions.tooltips.restore')}
                                  onClick={(event) => handleUnarchive(notification, event)}
                                  disabled={isBusy}
                                >
                                  {isBusy ? <Spinner animation="border" size="sm" /> : <ArrowCounterclockwise size={16} />}
                                </Button>
                                <Button
                                  variant="outline-danger"
                                  className="notification-action-btn delete"
                                  title={t('notificationsCenter.actions.tooltips.delete')}
                                  onClick={(event) => openDeleteModal(notification, event)}
                                  disabled={actionLoading || isBusy}
                                >
                                  <Trash size={16} />
                                </Button>
                              </ButtonGroup>
                            )}
                          </div>
                        </div>

                        {preview && (
                          <div className="text-muted small">
                            {preview}
                          </div>
                        )}

                        <div className="text-muted small mt-2">
                          {view === 'archived' && notification.archivedAt
                            ? t('notificationsCenter.timestamps.archived', { time: formatTimeAgo(notification.archivedAt) })
                            : formatTimeAgo(notification.createdAt)}
                        </div>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              );
            })}

            {hasMore && (
              <div className="text-center mt-4">
                <Button 
                  variant="outline-primary" 
                  onClick={() => fetchNotifications(page + 1, view)}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <>
                      <Spinner size="sm" className="me-2" />
                      {t('notificationsCenter.loadMore.loading')}
                    </>
                  ) : (
                    t('notificationsCenter.loadMore.label')
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </main>
      <Modal show={showArchiveModal} onHide={closeArchiveModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>{t('notificationsCenter.modals.archive.title')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {archiveTarget ? (
            <>
              <p className="mb-2">
                {t('notificationsCenter.modals.archive.description', {
                  content: getNotificationText(archiveTarget)
                })}
              </p>
              <p className="text-muted small mb-0">
                {t('notificationsCenter.modals.archive.helper')}
              </p>
            </>
          ) : (
            t('notificationsCenter.modals.archive.fallback')
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={closeArchiveModal} disabled={actionLoading}>
            {t('common.cancel')}
          </Button>
          <Button variant="warning" onClick={confirmArchive} disabled={actionLoading}>
            {actionLoading ? (
              <>
                <Spinner size="sm" className="me-2" />
                {t('notificationsCenter.modals.archive.status.archiving')}
              </>
            ) : (
              <>
                <Archive size={16} className="me-2" />
                {t('notificationsCenter.modals.archive.confirm')}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showDeleteModal} onHide={closeDeleteModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>{t('notificationsCenter.modals.delete.title')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {deleteTarget ? (
            <>
              <p className="mb-2">
                {t('notificationsCenter.modals.delete.description', {
                  content: getNotificationText(deleteTarget)
                })}
              </p>
              <p className="text-muted small mb-0">
                {t('notificationsCenter.modals.delete.helper')}
              </p>
            </>
          ) : (
            t('notificationsCenter.modals.delete.fallback')
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={closeDeleteModal} disabled={actionLoading}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={confirmDelete} disabled={actionLoading}>
            {actionLoading ? (
              <>
                <Spinner size="sm" className="me-2" />
                {t('notificationsCenter.modals.delete.status.deleting')}
              </>
            ) : (
              <>
                <Trash size={16} className="me-2" />
                {t('notificationsCenter.modals.delete.confirm')}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default NotificationsPage;
