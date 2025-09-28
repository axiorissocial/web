import React, { useEffect, useState } from 'react';
import { Card, ListGroup, Button, Form, InputGroup, Spinner, Badge } from 'react-bootstrap';
import { Send } from 'react-bootstrap-icons';
import Sidebar from '../components/singles/Navbar';
import { useAuth } from '../contexts/AuthContext';
import '../css/messages.scss';

interface User {
  id: string;
  username: string;
  profile?: {
    displayName?: string;
    avatar?: string;
  };
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  sender: User;
  isEdited: boolean;
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

const Messages: React.FC = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    document.title = 'Messages - Axioris';
    if (user) {
      fetchConversations();
    }
  }, [user]);

  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation);
    }
  }, [activeConversation]);

  const fetchConversations = async () => {
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
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    setMessagesLoading(true);
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
        // Mark messages as read
        markAsRead(conversationId);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  };

  const markAsRead = async (conversationId: string) => {
    try {
      await fetch(`/api/conversations/${conversationId}/read`, {
        method: 'POST',
        credentials: 'include'
      });
      
      // Update unread count in conversations list
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
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation || sending) return;

    setSending(true);
    try {
      const response = await fetch(`/api/conversations/${activeConversation}/messages`, {
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
        const message = await response.json();
        setMessages(prev => [...prev, message]);
        setNewMessage('');
        
        // Update conversation's last message
        setConversations(prev =>
          prev.map(conv =>
            conv.id === activeConversation
              ? { ...conv, lastMessage: message, updatedAt: message.createdAt }
              : conv
          )
        );
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getOtherParticipantName = (conversation: Conversation) => {
    const otherUser = conversation.otherParticipants[0]?.user;
    return otherUser?.profile?.displayName || otherUser?.username || 'Unknown User';
  };

  const getOtherParticipantAvatar = (conversation: Conversation) => {
    return conversation.otherParticipants[0]?.user?.profile?.avatar;
  };

  if (!user) {
    return (
      <div className="app-container">
        <Sidebar activeId="messages" />
        <main>
          <div className="text-center py-5">
            <h3>Please log in to view messages</h3>
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
            <Spinner animation="border" />
            <div className="mt-2">Loading messages...</div>
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
          {/* Conversations Sidebar */}
          <Card className="conversations-sidebar">
            <Card.Header>
              <h5 className="mb-0">Messages</h5>
            </Card.Header>
            <Card.Body className="p-0">
              {conversations.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <p>No conversations yet</p>
                  <small>Start a conversation by visiting someone's profile</small>
                </div>
              ) : (
                <ListGroup variant="flush">
                  {conversations.map((conversation) => (
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
                              alt="Avatar"
                              className="avatar-img"
                            />
                          ) : (
                            <div className="avatar-placeholder">
                              {getOtherParticipantName(conversation).charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-grow-1">
                          <div className="d-flex justify-content-between align-items-start">
                            <h6 className="mb-1">{getOtherParticipantName(conversation)}</h6>
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
                          {conversation.lastMessage && (
                            <p className="mb-0 text-muted last-message">
                              {conversation.lastMessage.sender.id === user.id ? 'You: ' : ''}
                              {conversation.lastMessage.content}
                            </p>
                          )}
                        </div>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Card.Body>
          </Card>

          {/* Messages Area */}
          <Card className="messages-area">
            {activeConversation ? (
              <>
                <Card.Header>
                  <h6 className="mb-0">
                    {getOtherParticipantName(
                      conversations.find(c => c.id === activeConversation)!
                    )}
                  </h6>
                </Card.Header>
                <Card.Body className="messages-body">
                  {messagesLoading ? (
                    <div className="text-center py-4">
                      <Spinner animation="border" size="sm" />
                    </div>
                  ) : (
                    <div className="messages-list">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`message ${
                            message.sender.id === user.id ? 'own-message' : 'other-message'
                          }`}
                        >
                          <div className="message-content">
                            <p className="mb-1">{message.content}</p>
                            <small className="text-muted">
                              {formatTime(message.createdAt)}
                              {message.isEdited && ' (edited)'}
                            </small>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card.Body>
                <Card.Footer>
                  <Form onSubmit={sendMessage}>
                    <InputGroup>
                      <Form.Control
                        type="text"
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        disabled={sending}
                        maxLength={1000}
                      />
                      <Button
                        variant="primary"
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                      >
                        {sending ? <Spinner size="sm" /> : <Send />}
                      </Button>
                    </InputGroup>
                  </Form>
                </Card.Footer>
              </>
            ) : (
              <Card.Body className="text-center py-5 text-muted">
                <h5>Select a conversation</h5>
                <p>Choose a conversation from the sidebar to start messaging</p>
              </Card.Body>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Messages;