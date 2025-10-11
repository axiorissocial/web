import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card, ListGroup, Button, Form, InputGroup, Spinner, Badge } from 'react-bootstrap';
import { Send, Trash, EmojiSmile } from 'react-bootstrap-icons';
import Sidebar from '../components/singles/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { useOGMeta } from '../utils/ogMeta';
import '../css/messages.scss';
import { useLocation } from 'react-router-dom';
import EmojiPicker from '../components/EmojiPicker';
import DOMPurify from 'dompurify';
import { parseEmoji } from '../utils/twemojiConfig';
import { EMOJIS } from '../utils/emojis';
import { useTranslation } from 'react-i18next';
import { getProfileGradientCss, getProfileGradientTextColor } from '../utils/profileGradients';
import { formatCalendarDateTime } from '../utils/time';

interface User {
  id: string;
  username: string;
  profile?: {
    displayName?: string;
    avatar?: string;
    avatarGradient?: string | null;
    bannerGradient?: string | null;
  };
}

interface Message {
  id: string;
  conversationId: string;
  content: string;
  createdAt: string;
  sender: User;
  isEdited: boolean;
  updatedAt?: string;
}

interface Conversation {
  id: string;
  otherParticipants: Array<{
    user: User;
  }>;
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: string;
}

interface RealtimeMessagePayload {
  event?: 'message:new' | 'message:sent' | 'message:typing' | 'message:deleted';
  conversationId: string;
  message?: Message;
  unreadMessages?: number;
  userId?: string;
  isTyping?: boolean;
  messageId?: string;
  lastMessage?: Message | null;
  deletedBy?: string;
}

const emojiShortcodeMap: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const { name, char, aliases } of EMOJIS) {
    map.set(name.toLowerCase(), char);
    if (aliases) {
      for (const alias of aliases) {
        map.set(alias.toLowerCase(), char);
      }
    }
  }
  return map;
})();

const convertShortcodesToEmoji = (text: string) =>
  text.replace(/:([a-z0-9_+\-]+):/gi, (_, code: string) =>
    emojiShortcodeMap.get(code.toLowerCase()) ?? `:${code}:`
  );

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

type MessageHtmlOptions = {
  preserveLineBreaks?: boolean;
};

const buildMessageHtml = (content: string, options: MessageHtmlOptions = {}) => {
  const { preserveLineBreaks = true } = options;
  const baseContent = convertShortcodesToEmoji(content ?? '');
  const escaped = escapeHtml(baseContent);
  const normalized = preserveLineBreaks
    ? escaped.replace(/\r\n|\r|\n/g, '<br />')
    : escaped.replace(/\r\n|\r|\n/g, ' ');
  const parsed = parseEmoji(normalized);
  return DOMPurify.sanitize(parsed, {
    ALLOWED_TAGS: ['br', 'img', 'span'],
    ALLOWED_ATTR: ['class', 'src', 'alt', 'draggable', 'loading', 'width', 'height', 'role', 'aria-hidden', 'referrerpolicy', 'decoding']
  });
};

const formatMessageContent = (content: string) => buildMessageHtml(content, { preserveLineBreaks: true });
const formatMessagePreview = (content: string) => buildMessageHtml(content, { preserveLineBreaks: false });

const Messages: React.FC = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [deletingMessageIds, setDeletingMessageIds] = useState<string[]>([]);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [pendingConversationId, setPendingConversationId] = useState<string | null>(() => {
    const params = new URLSearchParams(location.search);
    return params.get('conversation');
  });
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(() => new Set<string>());
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messageInputRef = useRef<HTMLInputElement | null>(null);
  const conversationsRef = useRef<Conversation[]>([]);
  const activeConversationRef = useRef<string | null>(null);
  const typingStateRef = useRef(false);
  const typingStopTimeoutRef = useRef<number | null>(null);
  const typingTimeoutsRef = useRef<Map<string, Map<string, number>>>(new Map());
  const pendingAutoScrollConversationRef = useRef<string | null>(null);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = 'smooth') => {
      if (!messagesEndRef.current) {
        return;
      }

      messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
    },
    []
  );

  const fetchConversations = useCallback(async (showSpinner = false) => {
    if (!user) {
      return;
    }

    if (showSpinner) {
      setLoading(true);
    }

    try {
      const response = await fetch('/api/conversations', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      if (showSpinner) {
        setLoading(false);
      }
    }
  }, [user]);

  const markAsRead = useCallback(async (conversationId: string) => {
    try {
      await fetch(`/api/conversations/${conversationId}/read`, {
        method: 'POST',
        credentials: 'include'
      });

      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      );
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, []);

  const fetchMessages = useCallback(async (conversationId: string) => {
    setMessagesLoading(true);
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        const orderedMessages: Message[] = [...data.messages].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        setMessages(orderedMessages);
        await markAsRead(conversationId);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  }, [markAsRead]);

  useEffect(() => {
    document.title = t('messagesCenter.documentTitle', { app: t('app.name') });
  }, [t, i18n.language]);

  useOGMeta({
    title: t('messagesCenter.documentTitle', { app: t('app.name') }),
    description: t('messagesCenter.documentTitle', { app: t('app.name') }),
    type: 'website',
    url: window.location.href,
  });

  useEffect(() => {
    if (user) {
      fetchConversations(true);
    } else {
      setConversations([]);
      setMessages([]);
      setActiveConversation(null);
      setOnlineUsers(new Set());
      setLoading(false);
    }
  }, [user, fetchConversations]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setPendingConversationId(params.get('conversation'));
  }, [location.search]);

  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation);
    }
  }, [activeConversation, fetchMessages]);

  useEffect(() => {
    if (pendingConversationId) {
      const exists = conversations.some(conversation => conversation.id === pendingConversationId);
      if (exists) {
        if (activeConversation !== pendingConversationId) {
          setActiveConversation(pendingConversationId);
        }
        setPendingConversationId(null);
      }
    } else if (!activeConversation && conversations.length > 0) {
      setActiveConversation(conversations[0].id);
    }
  }, [pendingConversationId, conversations, activeConversation]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    setEmojiPickerOpen(false);
  }, [activeConversation]);

  useEffect(() => {
    if (!activeConversation) {
      pendingAutoScrollConversationRef.current = null;
      return;
    }

    if (messagesLoading) {
      return;
    }

    if (pendingAutoScrollConversationRef.current === activeConversation) {
      scrollToBottom('auto');
      pendingAutoScrollConversationRef.current = null;
    }
  }, [activeConversation, messagesLoading, scrollToBottom]);

  useEffect(() => {
    if (!activeConversation) {
      return;
    }

    if (pendingAutoScrollConversationRef.current) {
      return;
    }

    if (messages.length === 0) {
      scrollToBottom('auto');
      return;
    }

    scrollToBottom('smooth');
  }, [messages, activeConversation, scrollToBottom]);

  const updateAfterMessageDeletion = useCallback(
    (conversationId: string, messageId: string, lastMessage?: Message | null) => {
      setMessages(prev => {
        if (activeConversationRef.current !== conversationId) {
          return prev;
        }

        if (!prev.some(m => m.id === messageId)) {
          return prev;
        }

        return prev.filter(m => m.id !== messageId);
      });

      setConversations(prev => {
        const current = prev.find(conv => conv.id === conversationId);
        if (!current) {
          return prev;
        }

        const removedWasLast = current.lastMessage?.id === messageId;
        const nextLast = lastMessage ?? (removedWasLast ? undefined : current.lastMessage);
        const updatedConversation: Conversation = {
          ...current,
          lastMessage: nextLast,
          updatedAt: lastMessage?.createdAt ?? new Date().toISOString()
        };

        const others = prev.filter(conv => conv.id !== conversationId);
        return [updatedConversation, ...others];
      });
    },
    []
  );

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<RealtimeMessagePayload>;
      const detail = customEvent.detail;

      if (!detail || !detail.conversationId) {
        return;
      }

      const { conversationId, message, unreadMessages, event: eventName } = detail;

      if (eventName === 'message:deleted') {
        const { messageId, lastMessage } = detail as {
          messageId?: string;
          lastMessage?: Message | null;
        };

        if (!messageId) {
          return;
        }

        updateAfterMessageDeletion(conversationId, messageId, lastMessage);
        setDeletingMessageIds(prev => prev.filter(id => id !== messageId));
        return;
      }

      if (eventName === 'message:typing') {
        const { userId, isTyping } = detail;
        if (!userId || userId === user?.id) {
          return;
        }

        setTypingUsers(prev => {
          const existing = new Set(prev[conversationId] || []);
          if (isTyping) {
            existing.add(userId);
          } else {
            existing.delete(userId);
          }

          if (existing.size === 0) {
            const next = { ...prev };
            delete next[conversationId];
            return next;
          }

          return {
            ...prev,
            [conversationId]: Array.from(existing)
          };
        });

        const conversationTimeouts = typingTimeoutsRef.current.get(conversationId) || new Map();
        if (conversationTimeouts.has(userId)) {
          window.clearTimeout(conversationTimeouts.get(userId)!);
        }

        if (isTyping) {
          const timeoutId = window.setTimeout(() => {
            setTypingUsers(prev => {
              const current = prev[conversationId];
              if (!current) return prev;

              const nextSet = new Set(current);
              nextSet.delete(userId);

              if (nextSet.size === 0) {
                const next = { ...prev };
                delete next[conversationId];
                return next;
              }

              return {
                ...prev,
                [conversationId]: Array.from(nextSet)
              };
            });

            const convTimeouts = typingTimeoutsRef.current.get(conversationId);
            if (convTimeouts) {
              convTimeouts.delete(userId);
              if (convTimeouts.size === 0) {
                typingTimeoutsRef.current.delete(conversationId);
              }
            }
          }, 5000);

          conversationTimeouts.set(userId, timeoutId);
        } else {
          conversationTimeouts.delete(userId);
        }

        if (conversationTimeouts.size > 0) {
          typingTimeoutsRef.current.set(conversationId, conversationTimeouts);
        } else {
          typingTimeoutsRef.current.delete(conversationId);
        }

        return;
      }

      if (!message) {
        return;
      }
      const isActive = activeConversationRef.current === conversationId;
      const existingConversation = conversationsRef.current.find(conv => conv.id === conversationId);
      const isSenderEvent = eventName === 'message:sent';

      if (message.sender.id !== user?.id) {
        setTypingUsers(prev => {
          const current = prev[conversationId];
          if (!current || current.length === 0) {
            return prev;
          }

          if (!current.includes(message.sender.id)) {
            return prev;
          }

          const nextSet = new Set(current);
          nextSet.delete(message.sender.id);

          if (nextSet.size === 0) {
            const next = { ...prev };
            delete next[conversationId];
            return next;
          }

          return {
            ...prev,
            [conversationId]: Array.from(nextSet)
          };
        });

        const conversationTimeouts = typingTimeoutsRef.current.get(conversationId);
        if (conversationTimeouts?.has(message.sender.id)) {
          window.clearTimeout(conversationTimeouts.get(message.sender.id)!);
          conversationTimeouts.delete(message.sender.id);
          if (conversationTimeouts.size === 0) {
            typingTimeoutsRef.current.delete(conversationId);
          }
        }
      }

      if (existingConversation) {
        const computedUnread = isActive || isSenderEvent
          ? 0
          : typeof unreadMessages === 'number'
            ? unreadMessages
            : existingConversation.unreadCount + 1;

        setConversations(prev => {
          const current = prev.find(conv => conv.id === conversationId);
          if (!current) {
            return prev;
          }

          const updated: Conversation = {
            ...current,
            lastMessage: message,
            updatedAt: message.createdAt,
            unreadCount: computedUnread
          };

          const others = prev.filter(conv => conv.id !== conversationId);
          return [updated, ...others];
        });
      } else {
        void fetchConversations();
      }

      if (isActive) {
        setMessages(prev => {
          if (prev.some(m => m.id === message.id)) {
            return prev;
          }

          const next = [...prev, message].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          return next;
        });

        if (!isSenderEvent) {
          void markAsRead(conversationId);
        }
      }
    };

    window.addEventListener('ws-message', handler as EventListener);

    return () => {
      window.removeEventListener('ws-message', handler as EventListener);
    };
  }, [fetchConversations, markAsRead, updateAfterMessageDeletion]);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ event?: string; userIds?: string[]; userId?: string; status?: string }>;
      const detail = customEvent.detail;
      if (!detail) {
        return;
      }

      if (detail.event === 'presence:state') {
        const ids = detail.userIds || [];
        setOnlineUsers(new Set(ids));
        return;
      }

      if (detail.event === 'presence:update' && detail.userId) {
        setOnlineUsers(prev => {
          const next = new Set(prev);
          if (detail.status === 'online') {
            next.add(detail.userId!);
          } else {
            next.delete(detail.userId!);
          }
          return next;
        });
      }
    };

    window.addEventListener('ws-presence', handler as EventListener);

    return () => {
      window.removeEventListener('ws-presence', handler as EventListener);
    };
  }, []);

useEffect(() => {
  return () => {
    if (typingStopTimeoutRef.current !== null) {
      window.clearTimeout(typingStopTimeoutRef.current);
      typingStopTimeoutRef.current = null;
    }

    typingTimeoutsRef.current.forEach((conversationTimeouts) => {
      conversationTimeouts.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
    });
    typingTimeoutsRef.current.clear();
  };
}, []);

  const sendTypingStatus = useCallback(async (typing: boolean, conversationId?: string) => {
    const targetConversationId = conversationId ?? activeConversationRef.current;
    if (!targetConversationId) {
      return;
    }

    try {
      await fetch(`/api/conversations/${targetConversationId}/typing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ isTyping: typing })
      });
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  }, []);

  useEffect(() => {
    const previousConversation = activeConversationRef.current;
    if (previousConversation && previousConversation !== activeConversation && typingStateRef.current) {
      typingStateRef.current = false;
      void sendTypingStatus(false, previousConversation);
    }

    if (activeConversation && previousConversation !== activeConversation) {
      pendingAutoScrollConversationRef.current = activeConversation;
    } else if (!activeConversation) {
      pendingAutoScrollConversationRef.current = null;
    }

    activeConversationRef.current = activeConversation;

    if (typingStopTimeoutRef.current !== null) {
      window.clearTimeout(typingStopTimeoutRef.current);
      typingStopTimeoutRef.current = null;
    }
  }, [activeConversation, sendTypingStatus]);

  const scheduleTypingStop = useCallback(() => {
    if (typingStopTimeoutRef.current !== null) {
      window.clearTimeout(typingStopTimeoutRef.current);
    }

    typingStopTimeoutRef.current = window.setTimeout(() => {
      typingStopTimeoutRef.current = null;
      if (typingStateRef.current) {
        typingStateRef.current = false;
        void sendTypingStatus(false);
      }
    }, 3000);
  }, [sendTypingStatus]);

  const handleTypingActivity = useCallback(() => {
    if (!activeConversationRef.current) {
      return;
    }

    if (!typingStateRef.current) {
      typingStateRef.current = true;
      void sendTypingStatus(true);
    }

    scheduleTypingStop();
  }, [scheduleTypingStop, sendTypingStatus]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation || sending) return;

    const conversationId = activeConversation;
    setSending(true);
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          content: newMessage.trim()
        })
      });

      if (response.ok) {
        const message: Message = await response.json();
        setMessages(prev => {
          if (prev.some(m => m.id === message.id)) {
            return prev;
          }

          const next = [...prev, message].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          return next;
        });
        setNewMessage('');
        if (messageInputRef.current) {
          window.requestAnimationFrame(() => {
            messageInputRef.current?.focus();
          });
        }

        if (typingStateRef.current) {
          typingStateRef.current = false;
          void sendTypingStatus(false);
          if (typingStopTimeoutRef.current !== null) {
            window.clearTimeout(typingStopTimeoutRef.current);
            typingStopTimeoutRef.current = null;
          }
        }

        setConversations(prev => {
          const current = prev.find(conv => conv.id === conversationId);
          if (!current) {
            return prev;
          }

          const updated: Conversation = {
            ...current,
            lastMessage: message,
            updatedAt: message.createdAt,
            unreadCount: 0
          };

          const others = prev.filter(conv => conv.id !== conversationId);
          return [updated, ...others];
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
      setEmojiPickerOpen(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return formatCalendarDateTime(date, i18n.language, t);
  };

  const getOtherParticipantName = (conversation: Conversation) => {
    const otherUser = conversation.otherParticipants[0]?.user;
    return otherUser?.profile?.displayName || otherUser?.username || t('messagesCenter.unknownUser');
  };

  const getOtherParticipantAvatar = (conversation: Conversation) => {
    return conversation.otherParticipants[0]?.user?.profile?.avatar;
  };

  const getProfileGradientStyle = (profile?: User['profile']) => {
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

  const getOtherParticipantId = (conversation: Conversation) => {
    return conversation.otherParticipants[0]?.user?.id;
  };

  const activeConversationData = activeConversation
    ? conversations.find(c => c.id === activeConversation) || null
    : null;
  const activeParticipantId = activeConversationData ? getOtherParticipantId(activeConversationData) : undefined;
  const handleDeleteMessage = useCallback(
    async (message: Message) => {
      if (deletingMessageIds.includes(message.id)) {
        return;
      }

      setDeletingMessageIds(prev => [...prev, message.id]);

      try {
        const response = await fetch(
          `/api/conversations/${message.conversationId}/messages/${message.id}`,
          {
            method: 'DELETE',
            credentials: 'include'
          }
        );

        if (response.ok) {
          const data = await response.json().catch(() => ({}));
          const nextLastMessage = (data as { lastMessage?: Message | null })?.lastMessage;
          updateAfterMessageDeletion(message.conversationId, message.id, nextLastMessage);
        } else {
          const errorData = await response.json().catch(() => null);
          const errorMsg = errorData?.error || t('messagesCenter.status.deleteFailure');
          console.error(errorMsg);
        }
      } catch (error) {
        console.error('Error deleting message:', error);
      } finally {
        setDeletingMessageIds(prev => prev.filter(id => id !== message.id));
      }
    },
    [deletingMessageIds, updateAfterMessageDeletion, t]
  );

  const insertEmoji = useCallback(
    (emojiName: string) => {
      const input = messageInputRef.current;
      const currentValue = newMessage;
      const selectionStart = input?.selectionStart ?? currentValue.length;
      const selectionEnd = input?.selectionEnd ?? currentValue.length;
      const emojiText = `:${emojiName}:`;

      const nextValue =
        currentValue.slice(0, selectionStart) + emojiText + currentValue.slice(selectionEnd);

      setNewMessage(nextValue);
      setEmojiPickerOpen(false);

      requestAnimationFrame(() => {
        if (!input) {
          return;
        }
        input.focus();
        const cursor = selectionStart + emojiText.length;
        input.setSelectionRange(cursor, cursor);
      });

      handleTypingActivity();
    },
    [newMessage, handleTypingActivity]
  );

  const isActiveParticipantOnline = activeParticipantId ? onlineUsers.has(activeParticipantId) : false;
  const activeParticipantName = activeConversationData
    ? getOtherParticipantName(activeConversationData)
    : '';

  if (!user) {
    return (
      <div className="app-container">
        <Sidebar activeId="messages" />
        <main>
          <div className="text-center py-5">
            <h3>{t('messagesCenter.authRequired')}</h3>
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="app-container">
        <Sidebar activeId="messages" />
        <main>
          <div className="text-center py-5">
            <Spinner animation="border" role="status" aria-label={t('messagesCenter.loading')} />
            <div className="mt-2">{t('messagesCenter.loading')}</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar activeId="messages" />
      <main className="messages-main">
        <div className="messages-container">
          <Card className="conversations-sidebar">
            <Card.Header>
              <h5 className="mb-0">{t('messagesCenter.sidebar.title')}</h5>
            </Card.Header>
            <Card.Body className="p-0">
              {conversations.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <p>{t('messagesCenter.empty.title')}</p>
                  <small>{t('messagesCenter.empty.subtitle')}</small>
                </div>
              ) : (
                <ListGroup variant="flush">
                  {conversations.map((conversation) => {
                    const otherParticipantId = getOtherParticipantId(conversation);
                    const isOnline = otherParticipantId ? onlineUsers.has(otherParticipantId) : false;
                    const isTyping = (typingUsers[conversation.id]?.length ?? 0) > 0;
                    const lastMessagePreview = conversation.lastMessage
                      ? formatMessagePreview(conversation.lastMessage.content)
                      : '';
                    const isOwnPreview = conversation.lastMessage?.sender.id === user.id;

                    return (
                      <ListGroup.Item
                        key={conversation.id}
                        action
                        active={activeConversation === conversation.id}
                        onClick={() => setActiveConversation(conversation.id)}
                        className="conversation-item"
                      >
                        <div className="d-flex align-items-center">
                          <div className="conversation-avatar me-3">
                            {getOtherParticipantAvatar(conversation) ? (
                              <img
                                src={getOtherParticipantAvatar(conversation)}
                                alt={t('messagesCenter.conversation.avatarAlt', {
                                  name: getOtherParticipantName(conversation)
                                })}
                                className="avatar-img"
                              />
                            ) : (
                              <div
                                className="avatar-placeholder"
                                style={getProfileGradientStyle(
                                  conversation.otherParticipants[0]?.user?.profile
                                )}
                              >
                                {getOtherParticipantName(conversation).charAt(0).toUpperCase()}
                              </div>
                            )}
                            {otherParticipantId && (
                              <span
                                className={`presence-dot ${isOnline ? 'online' : 'offline'}`}
                                title={isOnline ? t('messagesCenter.status.online') : t('messagesCenter.status.offline')}
                                aria-hidden="true"
                              />
                            )}
                          </div>
                          <div className="flex-grow-1">
                            <div className="d-flex justify-content-between align-items-start">
                              <div className="d-flex align-items-center gap-2">
                                <h6 className="mb-1">{getOtherParticipantName(conversation)}</h6>
                              </div>
                              <div className="d-flex align-items-center">
                                {conversation.unreadCount > 0 && (
                                  <Badge bg="primary" pill className="me-2">
                                    {conversation.unreadCount}
                                  </Badge>
                                )}
                                <small className="text-muted">
                                  {formatTime(conversation.updatedAt)}
                                </small>
                              </div>
                            </div>
                            {isTyping ? (
                              <p className="mb-0 text-primary typing-preview">{t('messagesCenter.status.typing')}</p>
                            ) : (
                              conversation.lastMessage && (
                                <p className="mb-0 text-muted last-message">
                                  {isOwnPreview && (
                                    <span className="last-message-prefix">{t('messagesCenter.conversation.youPrefix')}</span>
                                  )}
                                  <span
                                    className="message-preview"
                                    dangerouslySetInnerHTML={{
                                      __html: lastMessagePreview
                                    }}
                                  />
                                </p>
                              )
                            )}
                          </div>
                        </div>
                      </ListGroup.Item>
                    );
                  })}
                </ListGroup>
              )}
            </Card.Body>
          </Card>

          <Card className="messages-area">
            {activeConversation ? (
              <>
                <Card.Header>
                  {activeConversationData ? (
                    <div className="d-flex flex-column">
                      <h6 className="mb-0">{activeParticipantName}</h6>
                      <small
                        className={`presence-status ${isActiveParticipantOnline ? 'online' : 'offline'}`}
                      >
                        {isActiveParticipantOnline
                          ? t('messagesCenter.status.online')
                          : t('messagesCenter.status.offline')}
                      </small>
                    </div>
                  ) : (
                    <h6 className="mb-0">{t('messagesCenter.conversation.defaultTitle')}</h6>
                  )}
                </Card.Header>
                <Card.Body className="messages-body">
                  {messagesLoading ? (
                    <div className="text-center py-4">
                      <Spinner
                        animation="border"
                        size="sm"
                        role="status"
                        aria-label={t('messagesCenter.loading')}
                      />
                    </div>
                  ) : (
                    <div className="messages-list">
                      {messages.map((message) => {
                        const isOwnMessage = message.sender.id === user.id;
                        const isDeleting = deletingMessageIds.includes(message.id);
                        const renderedMessage = formatMessageContent(message.content);

                        return (
                          <div
                            key={message.id}
                            className={`message ${isOwnMessage ? 'own-message' : 'other-message'}`}
                          >
                            <div className="message-content">
                              {isOwnMessage && (
                                <div className="message-toolbar">
                                  <Button
                                    variant="link"
                                    size="sm"
                                    className="message-action"
                                    aria-label={isDeleting
                                      ? t('messagesCenter.status.deleting')
                                      : t('messagesCenter.status.deleteAction')}
                                    onClick={() => handleDeleteMessage(message)}
                                    disabled={isDeleting}
                                  >
                                    {isDeleting ? (
                                      <Spinner
                                        animation="border"
                                        size="sm"
                                        role="status"
                                        variant="light"
                                        aria-label={t('messagesCenter.status.deleting')}
                                      />
                                    ) : (
                                      <Trash size={16} />
                                    )}
                                  </Button>
                                </div>
                              )}
                              <p
                                className="mb-1"
                                dangerouslySetInnerHTML={{ __html: renderedMessage }}
                              />
                              <small className="text-muted">
                                {formatTime(message.createdAt)}
                                {message.isEdited && ` ${t('messagesCenter.timestamps.edited')}`}
                              </small>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                      {activeConversation && (typingUsers[activeConversation]?.length ?? 0) > 0 && (
                        <div className="typing-indicator">
                          <small className="text-muted">{t('messagesCenter.typingIndicator')}</small>
                        </div>
                      )}
                    </div>
                  )}
                </Card.Body>
                <Card.Footer>
                  <Form onSubmit={sendMessage}>
                    <InputGroup>
                      <Form.Control
                        type="text"
                        placeholder={t('messagesCenter.input.placeholder')}
                        value={newMessage}
                        onChange={(e) => {
                          setNewMessage(e.target.value);
                          handleTypingActivity();
                        }}
                        onBlur={() => {
                          if (typingStateRef.current) {
                            typingStateRef.current = false;
                            void sendTypingStatus(false);
                          }
                          if (typingStopTimeoutRef.current !== null) {
                            window.clearTimeout(typingStopTimeoutRef.current);
                            typingStopTimeoutRef.current = null;
                          }
                        }}
                        ref={messageInputRef}
                        disabled={sending}
                        maxLength={1000}
                      />
                      <Button
                        variant="outline-secondary"
                        type="button"
                        className="emoji-toggle"
                        onClick={() => setEmojiPickerOpen(prev => !prev)}
                        aria-label={emojiPickerOpen
                          ? t('messagesCenter.input.hideEmoji')
                          : t('messagesCenter.input.showEmoji')}
                        disabled={sending}
                      >
                        <EmojiSmile />
                      </Button>
                      <Button
                        variant="primary"
                        type="submit"
                        aria-label={t('messagesCenter.input.send')}
                        disabled={!newMessage.trim() || sending}
                      >
                        {sending ? <Spinner size="sm" /> : <Send />}
                      </Button>
                    </InputGroup>
                  </Form>
                  {emojiPickerOpen && (
                    <div className="messages-emoji-picker">
                      <EmojiPicker onSelect={insertEmoji} onClose={() => setEmojiPickerOpen(false)} />
                    </div>
                  )}
                </Card.Footer>
              </>
            ) : (
              <Card.Body className="text-center py-5 text-muted">
                <h5>{t('messagesCenter.conversation.selectTitle')}</h5>
                <p>{t('messagesCenter.conversation.selectSubtitle')}</p>
              </Card.Body>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Messages;