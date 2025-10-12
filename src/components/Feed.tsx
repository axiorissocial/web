import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Spinner, Alert } from 'react-bootstrap';
import { ChatSquareText, Plus } from 'react-bootstrap-icons';
import { useNavigate } from 'react-router-dom';
import Post from './Post';
import { useAuth } from '../contexts/AuthContext';
import '../css/post.scss';
import type { PostReactionsState } from '../utils/postReactions';
import { useTranslation } from 'react-i18next';

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
  hashtags?: string[];
  originCountryCode?: string | null;
  user: {
    id: string;
    username: string;
    profile?: {
      displayName?: string;
      avatar?: string;
      avatarGradient?: string | null;
      bannerGradient?: string | null;
    };
  };
  _count?: {
    likes: number;
    comments?: number;
  };
  commentsCount?: number;
  reactions?: PostReactionsState;
}

interface FeedProps {
  searchQuery?: string;
  userId?: string;
  onPostCreated?: () => void;
}

const Feed: React.FC<FeedProps> = ({ searchQuery, userId, onPostCreated }) => {
  const [posts, setPosts] = useState<PostData[]>([]);
  const postsRef = useRef<PostData[]>(posts);
  useEffect(() => { postsRef.current = posts; }, [posts]);
  // number of posts to reveal at a time on the client
  const PAGE_SIZE = 15;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const fetchPosts = useCallback(async (pageNum = 1, reset = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '25',
      });

      if (searchQuery) params.append('search', searchQuery);
      if (userId) params.append('userId', userId);
      if (!searchQuery && !userId) params.append('sort', 'recommended');

      const response = await fetch(`/api/posts?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('feed.errors.fetch');
      }

      const data = await response.json();

      let newTotal = 0;
      if (reset || pageNum === 1) {
        setPosts(data.posts);
        newTotal = data.posts.length;
      } else {
        // use postsRef to calculate previous length since state updates are async
        const prev = postsRef.current || [];
        setPosts(prevState => [...prevState, ...data.posts]);
        newTotal = prev.length + (data.posts ? data.posts.length : 0);
      }

      setHasMore(data.pagination.hasNextPage);
      setPage(pageNum);
      setErrorKey(null);

      return { postsCount: newTotal, data };
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('feed.')) {
        setErrorKey(err.message);
      } else {
        setErrorKey('feed.errors.generic');
      }
      return null;
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [searchQuery, userId]);

  useEffect(() => {
    fetchPosts(1, true);
  }, [fetchPosts]);

  useEffect(() => {
    const handlePostCreated = () => {
      fetchPosts(1, true);
    };
    
    window.addEventListener('postCreated', handlePostCreated);
    return () => window.removeEventListener('postCreated', handlePostCreated);
  }, [fetchPosts]);

  const handleLikeToggle = (postId: string, isLiked: boolean) => {
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, isLiked, likesCount: isLiked ? post.likesCount + 1 : post.likesCount - 1 }
        : post
    ));
  };

  const handleReactionChange = (postId: string, nextReactions: PostReactionsState) => {
    setPosts(prev => prev.map(post =>
      post.id === postId
        ? { ...post, reactions: nextReactions }
        : post
    ));
  };

  const handlePostDelete = (postId: string) => {
    setPosts(prev => prev.filter(post => post.id !== postId));
  };

  const handleLoadMore = async () => {
    // First reveal more posts if we already have them locally
    const nextVisible = visibleCount + PAGE_SIZE;
    if (nextVisible <= posts.length) {
      setVisibleCount(nextVisible);
      return;
    }

    // Otherwise, fetch the next server page then reveal
    if (hasMore && !loadingMore) {
      const result = await fetchPosts(page + 1);
      const totalNow = result?.postsCount ?? (postsRef.current ? postsRef.current.length : posts.length);
      setVisibleCount(prev => Math.min(prev + PAGE_SIZE, totalNow));
    }
  };

  const handleRefresh = () => {
    setErrorKey(null);
    fetchPosts(1, true);
  };

  React.useImperativeHandle(onPostCreated, () => handleRefresh);

  if (loading) {
    return (
      <div className="feed-loading">
        <Spinner animation="border" />
        <span className="ms-2">{t('feed.status.loading')}</span>
      </div>
    );
  }

  if (errorKey) {
    return (
      <div className="feed-error">
        <Alert variant="danger">
          <p>{t(errorKey)}</p>
          <Button variant="outline-danger" onClick={handleRefresh}>
            {t('feed.actions.retry')}
          </Button>
        </Alert>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="feed-empty">
        <div className="empty-icon">
          <ChatSquareText />
        </div>
        <h3>{t('feed.empty.title')}</h3>
        <p>
          {searchQuery 
            ? t('feed.empty.search', { query: searchQuery })
            : userId
            ? t('feed.empty.user')
            : t('feed.empty.default')
          }
        </p>
        {!searchQuery && !userId && user && (
          <Button 
            variant="primary"
            onClick={() => navigate('/create-post')}
          >
            <Plus size={20} className="me-2" />
            {t('feed.actions.create')}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="feed-container">
      {posts.slice(0, visibleCount).map(post => (
        <Post
          key={post.id}
          post={post}
          onLikeToggle={handleLikeToggle}
          onReactionChange={handleReactionChange}
          onDelete={handlePostDelete}
          showFullContent={false}
        />
      ))}
      
      {(visibleCount < posts.length || hasMore) && (
        <div className="load-more-container">
          <Button
            variant="outline-primary"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="load-more-btn"
          >
            {loadingMore ? (
              <>
                <Spinner size="sm" className="me-2" />
                {t('feed.actions.loadingMore')}
              </>
            ) : (
              // show a localized "Show more" label. fall back to existing key if present
              t('feed.actions.showMore', { defaultValue: t('feed.actions.loadMore') })
            )}
          </Button>
        </div>
      )}
      
      {!hasMore && posts.length > 0 && (
        <div className="text-center  py-4">
          <small>{t('feed.status.end')}</small>
        </div>
      )}
    </div>
  );
};

export default Feed;