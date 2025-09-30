import React, { useState, useEffect, useCallback } from 'react';
import { Button, Spinner, Alert } from 'react-bootstrap';
import { ChatSquareText, Plus } from 'react-bootstrap-icons';
import { useNavigate } from 'react-router-dom';
import Post from './Post';
import { useAuth } from '../contexts/AuthContext';
import '../css/post.scss';

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
  user: {
    id: string;
    username: string;
    profile?: {
      displayName?: string;
      avatar?: string;
    };
  };
  _count: {
    likes: number;
  };
}

interface FeedProps {
  searchQuery?: string;
  userId?: string;
  onPostCreated?: () => void;
}

const Feed: React.FC<FeedProps> = ({ searchQuery, userId, onPostCreated }) => {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchPosts = useCallback(async (pageNum = 1, reset = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '10',
      });

      if (searchQuery) params.append('search', searchQuery);
      if (userId) params.append('userId', userId);

      const response = await fetch(`/api/posts?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }

      const data = await response.json();
      
      if (reset || pageNum === 1) {
        setPosts(data.posts);
      } else {
        setPosts(prev => [...prev, ...data.posts]);
      }

      setHasMore(data.pagination.hasNextPage);
      setPage(pageNum);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts');
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

  const handlePostDelete = (postId: string) => {
    setPosts(prev => prev.filter(post => post.id !== postId));
  };

  const handleLoadMore = () => {
    if (hasMore && !loadingMore) {
      fetchPosts(page + 1);
    }
  };

  const handleRefresh = () => {
    fetchPosts(1, true);
  };

  React.useImperativeHandle(onPostCreated, () => handleRefresh);

  if (loading) {
    return (
      <div className="feed-loading">
        <Spinner animation="border" />
        <span className="ms-2">Loading posts...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="feed-error">
        <Alert variant="danger">
          <p>{error}</p>
          <Button variant="outline-danger" onClick={handleRefresh}>
            Try Again
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
        <h3>No posts yet</h3>
        <p>
          {searchQuery 
            ? `No posts found for "${searchQuery}"`
            : userId
            ? "This user hasn't posted anything yet"
            : "Be the first to share something!"
          }
        </p>
        {!searchQuery && !userId && user && (
          <Button 
            variant="primary"
            onClick={() => navigate('/create-post')}
          >
            <Plus size={20} className="me-2" />
            Create Post
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="feed-container">
      {posts.map(post => (
        <Post
          key={post.id}
          post={post}
          onLikeToggle={handleLikeToggle}
          onDelete={handlePostDelete}
          showFullContent={false}
        />
      ))}
      
      {hasMore && (
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
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </Button>
        </div>
      )}
      
      {!hasMore && posts.length > 0 && (
        <div className="text-center  py-4">
          <small>You've reached the end!</small>
        </div>
      )}
    </div>
  );
};

export default Feed;