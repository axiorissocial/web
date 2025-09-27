import React, { useState } from 'react';
import { Card, Button, Badge, Form, Modal, Spinner, Dropdown } from 'react-bootstrap';
import { Heart, HeartFill, Eye, Calendar, ThreeDotsVertical, PencilSquare, Trash } from 'react-bootstrap-icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import twemoji from 'twemoji';
import { EMOJIS } from '../utils/emojis';
import '../css/post.scss';

interface PostUser {
  id: string;
  username: string;
  profile?: {
    displayName?: string;
    avatar?: string;
  };
}

interface PostData {
  id: string;
  title?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  viewsCount: number;
  isLiked: boolean;
  isPinned: boolean;
  user: PostUser;
  _count: {
    likes: number;
  };
}

interface PostProps {
  post: PostData;
  onLikeToggle?: (postId: string, isLiked: boolean) => void;
  showFullContent?: boolean;
}

const Post: React.FC<PostProps> = ({ post, onLikeToggle, showFullContent = false }) => {
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likesCount || post._count?.likes || 0);
  const [isLiking, setIsLiking] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title || '');
  const [editContent, setEditContent] = useState(post.content);
  const [editLoading, setEditLoading] = useState(false);
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  const isOwner = user?.id === post.user.id;

  const handlePostClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('.user-info')) {
      return;
    }
    navigate(`/post/${post.id}`);
  };

  const handleUserClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/profile/${post.user.username}`);
  };

  const handleLikeToggle = async () => {
    if (isLiking) return;
    
    setIsLiking(true);
    try {
      const response = await fetch(`/api/posts/${post.id}/like`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setIsLiked(data.isLiked);
        setLikesCount(prev => data.isLiked ? prev + 1 : prev - 1);
        onLikeToggle?.(post.id, data.isLiked);
      } else if (response.status === 401) {
        window.location.href = '/account/login';
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setIsLiking(false);
    }
  };
  
  const handleEditPost = async () => {
    if (!isOwner || editLoading) return;
    
    setEditLoading(true);
    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        credentials: 'include',
        body: JSON.stringify({
          title: editTitle.trim() || null,
          content: editContent.trim()
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update post');
      }
      
      (post as any).title = editTitle.trim() || undefined;
      (post as any).content = editContent.trim();
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update post:', error);
    } finally {
      setEditLoading(false);
    }
  };
  
  const handleDeletePost = async () => {
    if (!isOwner || deleteLoading) return;
    
    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete post');
      }
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to delete post:', error);
    } finally {
      setDeleteLoading(false);
      setShowDeleteModal(false);
    }
  };

  const renderEmojisInContent = (text: string) => {
    return text.replace(/:([a-z0-9_]+):/gi, (_, name) => {
      const emoji = EMOJIS.find(e => e.name === name);
      return emoji ? emoji.char : `:${name}:`;
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const processContent = (content: string) => {
    const withEmojis = renderEmojisInContent(content);
    const maxLength = showFullContent ? Infinity : 400;
    
    let processedContent = withEmojis;
    let isTruncated = false;
    
    const lineCount = (content.match(/\n/g) || []).length + 1;
    const shouldTruncateByLines = !showFullContent && lineCount > 8;
    const shouldTruncateByLength = !showFullContent && processedContent.length > maxLength;
    
    if (content.includes('longpost')) {
      console.log('Debug longpost:', {
        originalLength: content.length,
        lineCount,
        shouldTruncateByLines,
        shouldTruncateByLength,
        showFullContent
      });
    }

    if (shouldTruncateByLength) {
      let truncateAt = maxLength;
      const lastSpace = processedContent.lastIndexOf(' ', maxLength);
      const lastNewline = processedContent.lastIndexOf('\n', maxLength);
      
      if (lastSpace > maxLength * 0.8 || lastNewline > maxLength * 0.8) {
        truncateAt = Math.max(lastSpace, lastNewline);
      }
      
      processedContent = processedContent.substring(0, truncateAt).trim() + '...';
      isTruncated = true;
    } else if (shouldTruncateByLines) {
      const lines = processedContent.split('\n');
      processedContent = lines.slice(0, 6).join('\n') + '\n...';
      isTruncated = true;
    }

    const markedOptions = { breaks: true };
    const allowedTags = [
      'a', 'p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'code', 'pre',
      'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'span'
    ];
    const allowedAttrs = ['href', 'title', 'target', 'rel', 'src', 'alt', 'class'];

    const mdHtml = marked.parse(processedContent.replace(/</g, '&lt;').replace(/>/g, '&gt;'), markedOptions) as string;
    const twemojiHtml = twemoji.parse(mdHtml, {
      folder: 'svg',
      ext: '.svg',
      className: 'twemoji-emoji',
    });
    const sanitizedHtml = DOMPurify.sanitize(twemojiHtml, {
      ALLOWED_TAGS: allowedTags,
      ALLOWED_ATTR: allowedAttrs,
    });

    return { html: sanitizedHtml, isTruncated };
  };

  const { html: contentHtml, isTruncated } = processContent(post.content);
  const displayName = post.user.profile?.displayName || post.user.username;

  return (
    <Card 
      className={`post-card mb-3 ${post.isPinned ? 'pinned' : ''} clickable-post`}
      onClick={handlePostClick}
      style={{ cursor: 'pointer' }}
    >
      {post.isPinned && (
        <div className="pin-indicator">
          <Badge bg="warning" className="pin-badge">Pinned</Badge>
        </div>
      )}
      
      <Card.Body>
        <div className="post-header mb-3">
          <div className="user-info" onClick={handleUserClick} style={{ cursor: 'pointer' }}>
            {post.user.profile?.avatar ? (
              <img 
                src={post.user.profile.avatar} 
                alt={`${displayName}'s avatar`}
                className="user-avatar"
              />
            ) : (
              <div className="user-avatar-placeholder">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="user-details">
              <div className="user-name">{displayName}</div>
              <div className="user-username">@{post.user.username}</div>
            </div>
          </div>
          <div className="post-header-right d-flex align-items-center">
            <div className="post-date me-2">
              <Calendar size={14} />
              {formatDate(post.createdAt)}
            </div>
            {showFullContent && isOwner && (
              <Dropdown>
                <Dropdown.Toggle variant="link" size="sm" className="text-muted p-1">
                  <ThreeDotsVertical size={16} />
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={(e) => { e.stopPropagation(); setIsEditing(!isEditing); }}>
                    <PencilSquare size={14} className="me-2" />
                    {isEditing ? 'Cancel Edit' : 'Edit Post'}
                  </Dropdown.Item>
                  <Dropdown.Item 
                    onClick={(e) => { e.stopPropagation(); setShowDeleteModal(true); }}
                    className="text-danger"
                  >
                    <Trash size={14} className="me-2" />
                    Delete Post
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            )}
          </div>
        </div>

        {isEditing ? (
          <>
            <Form.Group className="mb-3">
              <Form.Label>Title (optional)</Form.Label>
              <Form.Control
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Enter post title..."
                onClick={(e) => e.stopPropagation()}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Content</Form.Label>
              <Form.Control
                as="textarea"
                rows={6}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="What's on your mind?"
                onClick={(e) => e.stopPropagation()}
                required
              />
            </Form.Group>
            <div className="d-flex gap-2 mb-3">
              <Button 
                variant="primary" 
                size="sm" 
                onClick={(e) => { e.stopPropagation(); handleEditPost(); }}
                disabled={editLoading || !editContent.trim()}
              >
                {editLoading ? (
                  <>
                    <Spinner size="sm" className="me-1" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setIsEditing(false);
                  setEditTitle(post.title || '');
                  setEditContent(post.content);
                }}
                disabled={editLoading}
              >
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <>
            {post.title && (
              <Card.Title className="post-title">{post.title}</Card.Title>
            )}

            <div 
              className={`post-content ${!showFullContent && (post.content.length > 200 || (post.content.match(/\n/g) || []).length > 6) ? 'truncated-height' : ''}`}
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />
          </>
        )}

        {isTruncated && !showFullContent && (
          <Button 
            variant="link" 
            className="read-more-btn p-0"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/post/${post.id}`);
            }}
          >
            Read more
          </Button>
        )}

        <div className="post-actions mt-3">
          <Button
            variant="link"
            className={`action-btn like-btn ${isLiked ? 'liked' : ''}`}
            onClick={handleLikeToggle}
            disabled={isLiking}
          >
            {isLiked ? <HeartFill /> : <Heart />}
            <span className="ms-1">{likesCount}</span>
          </Button>

          <div className="post-stats">
            <span className="stat">
              <Eye size={14} />
              <span className="ms-1">{post.viewsCount}</span>
            </span>
          </div>
        </div>
      </Card.Body>
      
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete Post</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete this post? This action cannot be undone.</p>
          {post.title && (
            <div className="text-muted small">
              <strong>Title:</strong> {post.title}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => setShowDeleteModal(false)}
            disabled={deleteLoading}
          >
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={handleDeletePost}
            disabled={deleteLoading}
          >
            {deleteLoading ? (
              <>
                <Spinner size="sm" className="me-1" />
                Deleting...
              </>
            ) : (
              'Delete Post'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Card>
  );
};

export default Post;