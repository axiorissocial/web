import React, { useState } from 'react';
import { Button, Dropdown, Form, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { ChatSquareText, Heart, HeartFill, ChevronDown, ChevronUp, ThreeDotsVertical, Trash, PencilSquare, EmojiSmile } from 'react-bootstrap-icons';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import twemoji from 'twemoji';
import { processMentions } from '../utils/mentions';
import MentionTextarea from './MentionTextarea';
import EmojiPicker from './EmojiPicker';
import '../css/comment.scss';

interface CommentUser {
  id: string;
  username: string;
  profile?: {
    displayName?: string;
    avatar?: string;
  };
}

interface CommentData {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  editedAt?: string;
  user: CommentUser;
  parentId?: string;
  replies?: CommentData[];
  isLiked?: boolean;
  likesCount: number;
}

interface CommentProps {
  comment: CommentData;
  postId: string;
  depth?: number;
  onReplyAdded: () => void;
  isAuthenticated: boolean;
  currentUser?: { id: string; username: string } | null;
  onCommentDeleted?: () => void;
}

const CommentComponent: React.FC<CommentProps> = ({ 
  comment, 
  postId, 
  depth = 0, 
  onReplyAdded,
  isAuthenticated,
  currentUser,
  onCommentDeleted
}) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [editLoading, setEditLoading] = useState(false);
  
  const [isLiked, setIsLiked] = useState(comment.isLiked || false);
  const [likesCount, setLikesCount] = useState(comment.likesCount || 0);
  const [likeLoading, setLikeLoading] = useState(false);
  
  const [isExpanded, setIsExpanded] = useState(false);
  
  const [editEmojiOpen, setEditEmojiOpen] = useState(false);
  const [replyEmojiOpen, setReplyEmojiOpen] = useState(false);
  
  const COMMENT_CHAR_LIMIT = 1000;
  const TRUNCATE_LENGTH = 300;

  const handleDeleteComment = async () => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/comments/${comment.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        onCommentDeleted?.();
      } else {
        throw new Error('Failed to delete comment');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEditComment = async () => {
    if (!editContent.trim() || editLoading || editContent === comment.content) {
      setIsEditing(false);
      return;
    }

    if (editContent.length > COMMENT_CHAR_LIMIT) {
      alert(`Comment is too long. Maximum ${COMMENT_CHAR_LIMIT} characters allowed.`);
      return;
    }

    setEditLoading(true);
    try {
      const response = await fetch(`/api/comments/${comment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          content: editContent.trim(),
        }),
      });

      if (response.ok) {
        const updatedComment = await response.json();
        comment.content = updatedComment.content;
        comment.updatedAt = updatedComment.updatedAt;
        setIsEditing(false);
        onReplyAdded?.();
      } else {
        throw new Error('Failed to update comment');
      }
    } catch (error) {
      console.error('Error editing comment:', error);
      alert('Failed to update comment. Please try again.');
    } finally {
      setEditLoading(false);
    }
  };

  const insertEditEmoji = (emojiName: string) => {
    const emoji = `:${emojiName}:`;
    setEditContent(prev => prev + emoji);
    setEditEmojiOpen(false);
  };

  const insertReplyEmoji = (emojiName: string) => {
    const emoji = `:${emojiName}:`;
    setReplyContent(prev => prev + emoji);
    setReplyEmojiOpen(false);
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

  const processCommentContent = (content: string) => {
    const shouldTruncate = content.length > TRUNCATE_LENGTH;
    let displayContent = content;
    
    if (shouldTruncate && !isExpanded) {
      let truncateAt = TRUNCATE_LENGTH;
      const lastSpace = content.lastIndexOf(' ', TRUNCATE_LENGTH);
      const lastNewline = content.lastIndexOf('\n', TRUNCATE_LENGTH);
      
      if (lastSpace > TRUNCATE_LENGTH * 0.8 || lastNewline > TRUNCATE_LENGTH * 0.8) {
        truncateAt = Math.max(lastSpace, lastNewline);
      }
      
      displayContent = content.substring(0, truncateAt).trim() + '...';
    }
    
    return {
      content: displayContent,
      isTruncated: shouldTruncate,
      showExpandButton: shouldTruncate
    };
  };

  const formatContent = (content: string) => {
    const markedOptions = { breaks: true };
    const allowedTags = [
      'a', 'p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'code', 'pre',
      'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'span'
    ];
    const allowedAttrs = ['href', 'title', 'target', 'rel', 'src', 'alt', 'class', 'data-username'];

    const mentionsProcessed = processMentions(content);
    
    const mdHtml = marked.parse(mentionsProcessed, markedOptions) as string;
    const twemojiHtml = twemoji.parse(mdHtml, {
      folder: 'svg',
      ext: '.svg',
      className: 'twemoji-emoji',
    });
    
    return DOMPurify.sanitize(twemojiHtml, {
      ALLOWED_TAGS: allowedTags,
      ALLOWED_ATTR: allowedAttrs,
    });
  };

  const getAvatarUrl = (user: CommentUser) => {
    if (user.profile?.avatar) {
      return user.profile.avatar.startsWith('http') 
        ? user.profile.avatar 
        : `/uploads/avatars/${user.profile.avatar}`;
    }
    return null;
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || replyLoading) return;

    if (replyContent.trim().length > COMMENT_CHAR_LIMIT) {
      alert(`Reply is too long. Maximum ${COMMENT_CHAR_LIMIT} characters allowed.`);
      return;
    }

    setReplyLoading(true);
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          content: replyContent.trim(),
          parentId: comment.id,
        }),
      });

      if (response.ok) {
        setReplyContent('');
        setShowReplyForm(false);
        onReplyAdded();
      } else {
        const error = await response.json();
        console.error('Failed to post reply:', error.error);
      }
    } catch (error) {
      console.error('Error posting reply:', error);
    } finally {
      setReplyLoading(false);
    }
  };

  const handleLikeToggle = async () => {
    if (likeLoading || !isAuthenticated) return;

    setLikeLoading(true);
    try {
      const response = await fetch(`/api/comments/${comment.id}/like`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setIsLiked(data.isLiked);
        setLikesCount(prev => data.isLiked ? prev + 1 : prev - 1);
      } else if (response.status === 401) {
        window.location.href = '/account/login';
      }
    } catch (error) {
      console.error('Error toggling comment like:', error);
    } finally {
      setLikeLoading(false);
    }
  };

  const displayName = comment.user.profile?.displayName || comment.user.username;
  const { content, showExpandButton } = processCommentContent(comment.content);

  return (
    <div 
      id={`comment-${comment.id}`}
      className={`comment-item depth-${depth}`} 
      style={{ marginLeft: depth > 0 ? '30px' : '0' }}
    >
      <div className="d-flex mb-3">
        <Link to={`/profile/${comment.user.username}`} className="text-decoration-none">
          {getAvatarUrl(comment.user) ? (
            <img 
              src={getAvatarUrl(comment.user)!} 
              alt={`${displayName}'s avatar`}
              className="comment-avatar me-3"
            />
          ) : (
            <div className="comment-avatar-placeholder me-3">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </Link>
        <div className="flex-grow-1">
          <div className="d-flex align-items-center mb-1">
            <Link 
              to={`/profile/${comment.user.username}`}
              className="fw-semibold text-decoration-none me-2 user-link"
            >
              {displayName}
            </Link>
            <small className="text-muted me-2">@{comment.user.username}</small>
            <small className="text-muted me-auto">
              {formatDate(comment.createdAt)}
              {comment.editedAt && ' (edited)'}
            </small>
            
            {/* Delete dropdown for comment author */}
            {currentUser && currentUser.id === comment.user.id && (
              <Dropdown align="end">
                <Dropdown.Toggle variant="link" size="sm" className="p-0 text-muted">
                  <ThreeDotsVertical size={12} />
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item 
                    onClick={() => setIsEditing(true)}
                    disabled={isEditing}
                  >
                    <PencilSquare size={14} className="me-2" />
                    Edit
                  </Dropdown.Item>
                  <Dropdown.Item 
                    onClick={handleDeleteComment}
                    disabled={deleteLoading}
                    className="text-danger"
                  >
                    {deleteLoading ? (
                      <>
                        <Spinner size="sm" className="me-2" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash size={14} className="me-2" />
                        Delete
                      </>
                    )}
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            )}
          </div>
          
          {isEditing ? (
            <Form onSubmit={(e) => { e.preventDefault(); handleEditComment(); }} className="mb-3">
              <MentionTextarea
                value={editContent}
                onChange={setEditContent}
                rows={3}
                className="mb-2"
                maxLength={COMMENT_CHAR_LIMIT}
              />
              <div className="d-flex justify-content-between align-items-center mb-2">
                <small className="text-muted">
                  Supports **markdown**, :emojis:, and @mentions
                </small>
                <small className={`char-count ${editContent.length > COMMENT_CHAR_LIMIT * 0.9 ? 'text-warning' : ''} ${editContent.length >= COMMENT_CHAR_LIMIT ? 'text-danger' : ''}`}>
                  {editContent.length}/{COMMENT_CHAR_LIMIT} characters
                </small>
              </div>
              <div className="d-flex gap-2">
                <Button 
                  variant="outline-secondary" 
                  size="sm"
                  onClick={() => setEditEmojiOpen(!editEmojiOpen)}
                  disabled={editLoading}
                >
                  <EmojiSmile size={14} />
                </Button>
                <Button 
                  type="submit" 
                  size="sm"
                  disabled={!editContent.trim() || editLoading || editContent === comment.content || editContent.length > COMMENT_CHAR_LIMIT}
                >
                  {editLoading ? (
                    <>
                      <Spinner size="sm" className="me-2" />
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(comment.content);
                  }}
                  disabled={editLoading}
                >
                  Cancel
                </Button>
              </div>
            </Form>
          ) : (
            <>
              <div 
                className="comment-content mb-2"
                dangerouslySetInnerHTML={{ __html: formatContent(content) }}
              />
            </>
          )}
          
          {editEmojiOpen && (
            <EmojiPicker 
              onSelect={insertEditEmoji} 
              onClose={() => setEditEmojiOpen(false)} 
            />
          )}
          
          {showExpandButton && (
            <Button
              variant="link"
              size="sm"
              className="p-0 mb-2 expand-btn"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <>
                  <ChevronUp size={14} className="me-1" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown size={14} className="me-1" />
                  Show more
                </>
              )}
            </Button>
          )}
          
          <div className="comment-actions">
            <Button
              variant="link"
              size="sm"
              className={`p-0 me-3 like-btn ${isLiked ? 'liked' : ''}`}
              onClick={handleLikeToggle}
              disabled={likeLoading}
            >
              {isLiked ? <HeartFill size={14} /> : <Heart size={14} />}
              <span className="ms-1">{likesCount}</span>
            </Button>
            
            {isAuthenticated && (
              <Button
                variant="link"
                size="sm"
                className="p-0 reply-btn"
                onClick={() => setShowReplyForm(!showReplyForm)}
              >
                <ChatSquareText size={14} className="me-1" />
                Reply
              </Button>
            )}
          </div>

          {showReplyForm && (
            <>
              <Form onSubmit={handleReplySubmit} className="mt-3 reply-form">
                <Form.Group>
                  <MentionTextarea
                    value={replyContent}
                    onChange={setReplyContent}
                    placeholder={`Reply to ${displayName}...`}
                    className="mb-2"
                    rows={3}
                    maxLength={COMMENT_CHAR_LIMIT}
                  />
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <small className="text-muted">
                      Supports **markdown**, :emojis:, and @mentions
                    </small>
                    <small className={`char-count ${replyContent.length > COMMENT_CHAR_LIMIT * 0.9 ? 'text-warning' : ''} ${replyContent.length >= COMMENT_CHAR_LIMIT ? 'text-danger' : ''}`}>
                      {replyContent.length}/{COMMENT_CHAR_LIMIT} characters
                    </small>
                  </div>
                  <div className="d-flex gap-2">
                    <Button 
                      variant="outline-secondary" 
                      size="sm"
                      onClick={() => setReplyEmojiOpen(!replyEmojiOpen)}
                      disabled={replyLoading}
                    >
                      <EmojiSmile size={14} />
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={!replyContent.trim() || replyLoading || replyContent.length > COMMENT_CHAR_LIMIT}
                      size="sm"
                    >
                      {replyLoading ? (
                        <>
                          <Spinner size="sm" className="me-2" />
                          Replying...
                        </>
                      ) : (
                        'Reply'
                      )}
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => {
                        setShowReplyForm(false);
                        setReplyContent('');
                      }}
                      disabled={replyLoading}
                    >
                      Cancel
                    </Button>
                  </div>
                </Form.Group>
              </Form>
              {replyEmojiOpen && (
                <EmojiPicker 
                  onSelect={insertReplyEmoji} 
                  onClose={() => setReplyEmojiOpen(false)} 
                />
              )}
            </>
          )}
        </div>
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div className="comment-replies">
          {comment.replies.map((reply) => (
            <CommentComponent
              key={reply.id}
              comment={reply}
              postId={postId}
              depth={depth + 1}
              onReplyAdded={onReplyAdded}
              isAuthenticated={isAuthenticated}
              currentUser={currentUser}
              onCommentDeleted={onReplyAdded}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentComponent;