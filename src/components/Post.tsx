import React, { useEffect, useState } from 'react';
import { Card, Button, Badge, Modal, Spinner, Dropdown } from 'react-bootstrap';
import { Heart, HeartFill, Eye, Calendar, ThreeDotsVertical, PencilSquare, Trash, Play, ChatSquareText } from 'react-bootstrap-icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import twemoji from 'twemoji';
import { EMOJIS } from '../utils/emojis';
import { processMentions } from '../utils/mentions';
import EditPostModal from './EditPostModal';
import MediaModal from './MediaModal';
import ReportModal from './ReportModal';
import HlsVideo from './HlsVideo';
import '../css/post.scss';
import '../css/mentions.scss';
import { useTranslation } from 'react-i18next';
import { createEmptyReactionsState } from '../utils/postReactions';
import { getProfileGradientCss, getProfileGradientTextColor } from '@shared/profileGradients';
import type { PostReactionsState, PostReactionEmoji } from '../utils/postReactions';
import { formatCalendarDateTime, formatRelativeTime } from '../utils/time';

interface PostUser {
  id: string;
  username: string;
  profile?: {
    displayName?: string;
    avatar?: string;
    avatarGradient?: string | null;
    bannerGradient?: string | null;
  };
}

interface PostData {
  id: string;
  title?: string;
  content: string;
  media?: Array<{
    url: string;
    hlsUrl?: string;
    type: 'image' | 'video';
    originalName: string;
    size: number;
  }> | null;
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  viewsCount: number;
  isLiked: boolean;
  isPinned: boolean;
  user: PostUser;
  _count?: {
    likes: number;
    comments?: number;
  };
  reactions?: PostReactionsState;
  commentsCount?: number;
}

interface PostProps {
  post: PostData;
  onLikeToggle?: (postId: string, isLiked: boolean) => void;
  onReactionChange?: (postId: string, reactions: PostReactionsState) => void;
  onDelete?: (postId: string) => void;
  showFullContent?: boolean;
}

const Post: React.FC<PostProps> = ({ post, onLikeToggle, onReactionChange, onDelete, showFullContent = false }) => {
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likesCount || post._count?.likes || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [reactions, setReactions] = useState<PostReactionsState>(post.reactions ?? createEmptyReactionsState());
  const [reactionLoading, setReactionLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const commentsCount = post.commentsCount ?? post._count?.comments ?? 0;
  const hasCommentsStat = commentsCount > 0;
  const hasViewsStat = post.viewsCount > 0;
  const shouldShowStats = hasCommentsStat || hasViewsStat;
  const editModalMedia = post.media?.map(mediaItem => ({
    url: mediaItem.url,
    type: mediaItem.type,
    originalName: mediaItem.originalName,
  })) ?? [];

  const createdAtDate = new Date(post.createdAt);
  const createdAbsolute = formatCalendarDateTime(createdAtDate, i18n.language, t);
  const createdRelative = formatRelativeTime(createdAtDate, t);
  const createdLabel = showFullContent
    ? t('time.display.absoluteWithRelative', {
        absolute: createdAbsolute,
        relative: createdRelative
      })
    : createdRelative;
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaModalIndex, setMediaModalIndex] = useState(0);
  const [showReportModal, setShowReportModal] = useState(false);
  
  const isOwner = user?.id === post.user.id;
  const isAdmin = (user?.level || 0) >= 10;

  useEffect(() => {
    setReactions(post.reactions ?? createEmptyReactionsState());
  }, [post.reactions]);

  const handlePostClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('.user-info') || target.closest('.post-media')) {
      return;
    }
    navigate(`/post/${post.id}`);
  };

  const handleUserClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/profile/@${post.user.username}`);
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

  const getEmojiMarkup = (emoji: string) => ({
    __html: twemoji.parse(emoji, {
      folder: 'svg',
      ext: '.svg',
      className: 'twemoji-emoji',
    })
  });

  const handleReactionToggle = async (
    emoji: PostReactionEmoji,
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation();
    if (reactionLoading) return;

    setReactionLoading(true);
    try {
      const response = await fetch(`/api/posts/${post.id}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ emoji }),
      });

      if (response.status === 401) {
        window.location.href = '/account/login';
        return;
      }

      if (response.ok) {
        const data = await response.json();
        if (data?.reactions) {
          setReactions(data.reactions as PostReactionsState);
          onReactionChange?.(post.id, data.reactions as PostReactionsState);
        }
      }
    } catch (error) {
      console.error('Error updating reaction:', error);
    } finally {
      setReactionLoading(false);
    }
  };
  
  const handleEditPost = () => {
    if (!isOwner) return;
    setShowEditModal(true);
  };

  const handlePostUpdated = () => {
    window.location.reload();
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
      
      if (onDelete) {
        onDelete(post.id);
      } else {
        if (showFullContent) {
          navigate(-1);
        } else {
          window.location.reload();
        }
      }
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

  const renderMedia = () => {
    if (!post.media || !Array.isArray(post.media) || post.media.length === 0) {
      return null;
    }

    const openMediaModal = (index: number) => {
      setMediaModalIndex(index);
      setShowMediaModal(true);
    };

    return (
      <div className="post-media mt-2 mb-2">
        {post.media.length === 1 ? (
          <div className="single-media">
            {post.media[0].type === 'image' ? (
              <img
                src={post.media[0].url}
                alt={post.media[0].originalName}
                className="img-fluid rounded cursor-pointer"
                style={{ maxHeight: '400px', width: '100%', objectFit: 'cover' }}
                onClick={(e) => {
                  e.stopPropagation();
                  openMediaModal(0);
                }}
              />
            ) : (
              <div 
                className="position-relative cursor-pointer"
                style={{ maxHeight: '400px' }}
                onClick={(e) => {
                  e.stopPropagation();
                  openMediaModal(0);
                }}
              >
                <HlsVideo
                  className="w-100 rounded"
                  style={{ maxHeight: '400px', objectFit: 'cover' }}
                  preload="metadata"
                  muted
                  hlsSrc={post.media[0].hlsUrl}
                  src={post.media[0].url + '#t=0.1'}
                />
                <div 
                  className="position-absolute top-50 start-50 translate-middle"
                  style={{ 
                    pointerEvents: 'none',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    borderRadius: '50%',
                    width: '60px',
                    height: '60px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Play size={24} color="white" />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="media-grid" style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            maxHeight: '300px'
          }}>
            <div 
              className="media-item position-relative cursor-pointer"
              style={{
                aspectRatio: '1/1',
                overflow: 'hidden'
              }}
              onClick={(e) => {
                e.stopPropagation();
                openMediaModal(0);
              }}
            >
              {post.media[0].type === 'image' ? (
                <img
                  src={post.media[0].url}
                  alt={post.media[0].originalName}
                  className="img-fluid rounded w-100 h-100"
                  style={{ objectFit: 'cover' }}
                />
              ) : (
                <div className="position-relative w-100 h-100 rounded overflow-hidden">
                  <HlsVideo
                    className="w-100 h-100"
                    style={{ objectFit: 'cover' }}
                    preload="metadata"
                    muted
                    src={post.media[0].url + '#t=0.1'}
                    hlsSrc={post.media[0].hlsUrl}
                  />
                  <div 
                    className="position-absolute top-50 start-50 translate-middle"
                    style={{ 
                      pointerEvents: 'none',
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      borderRadius: '50%',
                      width: '50px',
                      height: '50px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Play size={20} color="white" />
                  </div>
                </div>
              )}
            </div>

            <div 
              className="media-item position-relative cursor-pointer"
              style={{
                aspectRatio: '1/1',
                overflow: 'hidden'
              }}
              onClick={(e) => {
                e.stopPropagation();
                openMediaModal(1);
              }}
            >
              {post.media[1].type === 'image' ? (
                <img
                  src={post.media[1].url}
                  alt={post.media[1].originalName}
                  className="img-fluid rounded w-100 h-100"
                  style={{ objectFit: 'cover' }}
                />
              ) : (
                <div className="position-relative w-100 h-100 rounded overflow-hidden">
                  <HlsVideo
                    className="w-100 h-100"
                    style={{ objectFit: 'cover' }}
                    preload="metadata"
                    muted
                    src={post.media[1].url + '#t=0.1'}
                    hlsSrc={post.media[1].hlsUrl}
                  />
                  <div 
                    className="position-absolute top-50 start-50 translate-middle"
                    style={{ 
                      pointerEvents: 'none',
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      borderRadius: '50%',
                      width: '50px',
                      height: '50px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Play size={20} color="white" />
                  </div>
                </div>
              )}
              
              {post.media.length > 2 && (
                <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-75 text-white rounded">
                  <span className="fw-bold fs-4">+{post.media.length - 2}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };  const processContent = (content: string) => {
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
    const allowedAttrs = ['href', 'title', 'target', 'rel', 'src', 'alt', 'class', 'data-username'];

    const mentionsProcessed = processMentions(processedContent);
    
    const mdHtml = marked.parse(mentionsProcessed, markedOptions) as string;
    
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
  const avatarGradientId = post.user.profile?.avatarGradient ?? null;
  const placeholderStyle = avatarGradientId
    ? {
        background: getProfileGradientCss(avatarGradientId),
        color: getProfileGradientTextColor(avatarGradientId)
      }
    : undefined;

  return (
    <Card 
      className={`post-card mb-3 ${post.isPinned ? 'pinned' : ''} clickable-post`}
      onClick={handlePostClick}
      style={{ cursor: 'pointer' }}
    >
      {post.isPinned && (
        <div className="pin-indicator">
          <Badge bg="warning" className="pin-badge">{t('post.labels.pinned')}</Badge>
        </div>
      )}
      
      <Card.Body>
        <div className="post-header mb-3">
          <div className="user-info" onClick={handleUserClick} style={{ cursor: 'pointer' }}>
            {post.user.profile?.avatar ? (
              <img 
                src={post.user.profile.avatar} 
                alt={t('post.media.avatarAlt', { name: displayName })}
                className="user-avatar"
              />
            ) : (
              <div className="user-avatar-placeholder" style={placeholderStyle}>
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="user-details">
              <div className="user-name">{displayName}</div>
              <div className="user-username">@{post.user.username}</div>
            </div>
          </div>
          <div className="post-header-right d-flex align-items-center">
            <div className="post-date me-2" title={createdAbsolute}>
              <Calendar size={14} className="me-1" />
              {createdLabel}
            </div>
            <Dropdown>
              <Dropdown.Toggle variant="link" size="sm" className="text-muted p-1">
                <ThreeDotsVertical size={16} />
              </Dropdown.Toggle>
              <Dropdown.Menu align="end">
                {isOwner && (
                  <>
                    <Dropdown.Item onClick={(e) => { e.stopPropagation(); handleEditPost(); }}>
                      <PencilSquare size={14} className="me-2" />
                      {t('post.actions.editPost')}
                    </Dropdown.Item>
                    <Dropdown.Item 
                      onClick={(e) => { e.stopPropagation(); setShowDeleteModal(true); }}
                      className="text-danger"
                    >
                      <Trash size={14} className="me-2" />
                      {t('post.actions.deletePost')}
                    </Dropdown.Item>
                  </>
                )}

                {!isOwner && (
                  <Dropdown.Item onClick={(e) => { e.stopPropagation(); setShowReportModal(true); }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-2"><path d="M21 10v6a2 2 0 0 1-2 2H7l-4 4V6a2 2 0 0 1 2-2h9"></path></svg>
                    {t('post.actions.reportPost')}
                  </Dropdown.Item>
                )}

                {isAdmin && (
                  <>
                    <Dropdown.Divider />
                    <Dropdown.Item onClick={(e) => { e.stopPropagation(); window.open(`/admin/posts/${post.id}`, '_self'); }}>
                      {t('post.actions.viewInAdmin')}
                    </Dropdown.Item>
                  </>
                )}
              </Dropdown.Menu>
            </Dropdown>
          
          </div>
        </div>

        {post.title && (
          <Card.Title className="post-title">{post.title}</Card.Title>
        )}

        <div 
          className={`post-content ${!showFullContent && (post.content.length > 200 || (post.content.match(/\n/g) || []).length > 6) ? 'truncated-height' : ''}`}
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
        
        {renderMedia()}

        {isTruncated && !showFullContent && (
          <Button 
            variant="link" 
            className="read-more-btn p-0"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/post/${post.id}`);
            }}
          >
            {t('post.actions.readMore')}
          </Button>
        )}

        <div className="post-actions mt-3">
          <div className="post-actions-left">
            <Button
              variant="link"
              className={`action-btn like-btn ${isLiked ? 'liked' : ''}`}
              onClick={handleLikeToggle}
              disabled={isLiking}
            >
              {isLiked ? <HeartFill /> : <Heart />}
              <span className="ms-1">{likesCount}</span>
            </Button>

            <div className={`reaction-buttons ${reactionLoading ? 'is-loading' : ''}`} role="group" aria-label={t('post.reactions')}>
              {reactions.summary.map(item => (
                <button
                  key={item.emoji}
                  type="button"
                  className={`reaction-button ${item.isSelected ? 'selected' : ''}`}
                  onClick={(event) => handleReactionToggle(item.emoji, event)}
                  disabled={reactionLoading}
                  title={item.isSelected ? t('post.reactionsPicker.remove', { emoji: item.emoji }) : t('post.reactionsPicker.add', { emoji: item.emoji })}
                  aria-pressed={item.isSelected}
                >
                  <span className="emoji" dangerouslySetInnerHTML={getEmojiMarkup(item.emoji)} />
                  {item.count > 0 && <span className="count">{item.count}</span>}
                </button>
              ))}
            </div>
          </div>

          {shouldShowStats && (
            <div className="post-stats">
              {hasCommentsStat && (
                <span className="stat">
                  <ChatSquareText size={14} />
                  <span className="ms-1">{commentsCount}</span>
                </span>
              )}
              {hasViewsStat && (
                <span className="stat">
                  <Eye size={14} />
                  <span className="ms-1">{post.viewsCount}</span>
                </span>
              )}
            </div>
          )}
        </div>
      </Card.Body>
      
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{t('post.modals.delete.title')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{t('post.modals.delete.description')}</p>
          {post.title && (
            <div className="text-muted small">
              <strong>{t('post.labels.title')}</strong> {post.title}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => setShowDeleteModal(false)}
            disabled={deleteLoading}
          >
            {t('common.cancel')}
          </Button>
          <Button 
            variant="danger" 
            onClick={handleDeletePost}
            disabled={deleteLoading}
          >
            {deleteLoading ? (
              <>
                <Spinner size="sm" className="me-1" />
                {t('common.statuses.deleting')}
              </>
            ) : (
              t('post.actions.deletePost')
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      <MediaModal
        show={showMediaModal}
        onHide={() => setShowMediaModal(false)}
        media={post.media || []}
        initialIndex={mediaModalIndex}
        isAdmin={isAdmin}
        postId={post.id}
      />
      
      <EditPostModal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        onPostUpdated={handlePostUpdated}
        post={{
          id: post.id,
          title: post.title,
          content: post.content,
          media: editModalMedia
        }}
      />
      <ReportModal
        show={showReportModal}
        onHide={() => setShowReportModal(false)}
        targetType="post"
        targetId={post.id}
      />
    </Card>
  );
};

export default Post;