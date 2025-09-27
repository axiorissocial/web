import React, { useState } from 'react';
import { Button, Form, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { ChatSquareText, Heart, HeartFill, ChevronDown, ChevronUp } from 'react-bootstrap-icons';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import twemoji from 'twemoji';
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
}

const CommentComponent: React.FC<CommentProps> = ({ 
  comment, 
  postId, 
  depth = 0, 
  onReplyAdded,
  isAuthenticated 
}) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  
  // Like state
  const [isLiked, setIsLiked] = useState(comment.isLiked || false);
  const [likesCount, setLikesCount] = useState(comment.likesCount || 0);
  const [likeLoading, setLikeLoading] = useState(false);
  
  // Collapse/expand state for long comments
  const [isExpanded, setIsExpanded] = useState(false);
  
  const maxDepth = 3; // Maximum nesting depth for replies
  const COMMENT_CHAR_LIMIT = 1000; // Character limit for replies
  const TRUNCATE_LENGTH = 300; // Length at which to truncate and show expand button

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
      // Find the last complete word within the limit
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
    const allowedAttrs = ['href', 'title', 'target', 'rel', 'src', 'alt', 'class'];

    const mdHtml = marked.parse(content.replace(/</g, '&lt;').replace(/>/g, '&gt;'), markedOptions) as string;
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
    return user.profile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=0d6efd&color=fff&size=40`;
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || replyLoading) return;

    // Check character limit
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
    <div className={`comment-item depth-${depth}`} style={{ marginLeft: depth > 0 ? '30px' : '0' }}>
      <div className="d-flex mb-3">
        <Link to={`/profile/${comment.user.username}`} className="text-decoration-none">
          <img 
            src={getAvatarUrl(comment.user)} 
            alt={`${displayName}'s avatar`}
            className="comment-avatar me-3"
          />
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
            <small className="text-muted">
              {formatDate(comment.createdAt)}
              {comment.updatedAt !== comment.createdAt && ' (edited)'}
            </small>
          </div>
          
          <div 
            className="comment-content mb-2"
            dangerouslySetInnerHTML={{ __html: formatContent(content) }}
          />
          
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
            
            {isAuthenticated && depth < maxDepth && (
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
            <Form onSubmit={handleReplySubmit} className="mt-3 reply-form">
              <Form.Group>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder={`Reply to ${displayName}...`}
                  className="mb-2"
                  size="sm"
                  maxLength={COMMENT_CHAR_LIMIT}
                />
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <small className={`char-count ${replyContent.length > COMMENT_CHAR_LIMIT * 0.9 ? 'text-warning' : ''} ${replyContent.length >= COMMENT_CHAR_LIMIT ? 'text-danger' : ''}`}>
                    {replyContent.length}/{COMMENT_CHAR_LIMIT} characters
                  </small>
                </div>
                <div className="d-flex gap-2">
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
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentComponent;