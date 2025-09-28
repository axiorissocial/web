import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Form, Spinner, Alert } from 'react-bootstrap';
import { ArrowLeft, ChatSquareText } from 'react-bootstrap-icons';
import Sidebar from '../components/singles/Navbar';
import Post from '../components/Post';
import CommentComponent from '../components/Comment';
import { useAuth } from '../contexts/AuthContext';
import '../css/post.scss';
import '../css/comment.scss';

interface PostUser {
  id: string;
  username: string;
  profile?: {
    displayName?: string;
    avatar?: string;
  };
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: PostUser;
  parentId?: string;
  replies?: Comment[];
  isLiked?: boolean;
  likesCount: number;
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
    comments: number;
  };
}

const PostPage: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);
  const [backContext, setBackContext] = useState<'home' | 'profile' | 'search' | 'unknown'>('unknown');
  
  // Handle comment highlighting from URL hash
  useEffect(() => {
    if (window.location.hash) {
      const commentId = window.location.hash.replace('#comment-', '');
      setTimeout(() => {
        const element = document.getElementById(`comment-${commentId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('highlighted-comment');
          setTimeout(() => {
            element.classList.remove('highlighted-comment');
          }, 3000);
        }
      }, 500); // Wait for comments to load
    }
  }, [post]); // Trigger when post and comments are loaded
  
  // Comments
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);

  useEffect(() => {
    // Check if user can navigate back and determine context
    const hasHistory = window.history.length > 1;
    const referrer = document.referrer;
    const isFromSameOrigin = referrer.includes(window.location.origin);
    
    setCanGoBack(hasHistory && isFromSameOrigin);
    
    if (isFromSameOrigin) {
      if (referrer.includes('/profile/')) {
        setBackContext('profile');
      } else if (referrer.includes('/search')) {
        setBackContext('search');
      } else if (referrer.includes('/') || referrer.endsWith('/')) {
        setBackContext('home');
      } else {
        setBackContext('unknown');
      }
    }
  }, []);

  useEffect(() => {
    if (postId) {
      fetchPost();
      fetchComments();
    }
  }, [postId]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/posts/${postId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const postData = await response.json();
        setPost(postData);
        document.title = `${postData.title || 'Post'} - Axioris`;
      } else if (response.status === 404) {
        setError('Post not found');
      } else {
        setError('Failed to load post');
      }
    } catch (error) {
      setError('Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      setCommentsLoading(true);
      const response = await fetch(`/api/posts/${postId}/comments`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || data);
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || commentLoading || !user) return;
    
    // Check character limit
    if (newComment.trim().length > 1000) {
      alert('Comment is too long. Maximum 1000 characters allowed.');
      return;
    }
    
    setCommentLoading(true);
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          content: newComment.trim(),
        }),
      });

      if (response.ok) {
        setNewComment('');
        fetchComments(); // Refresh comments
      }
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setCommentLoading(false);
    }
  };

  const handleLikeToggle = (_: string, isLiked: boolean) => {
    // Update the post state when like is toggled
    setPost(prev => prev ? {
      ...prev,
      isLiked,
      likesCount: isLiked ? prev.likesCount + 1 : prev.likesCount - 1
    } : null);
  };

  if (loading) {
    return (
      <div className="app-container d-flex">
        <Sidebar activeId="home" />
        <main className="flex-grow-1 p-4 d-flex justify-content-center align-items-center">
          <Spinner animation="border" />
        </main>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="app-container d-flex">
        <Sidebar activeId="home" />
        <main className="flex-grow-1 p-4">
          <Alert variant="danger" className="text-center">
            {error || 'Post not found'}
          </Alert>
          <div className="text-center">
            <Button variant="primary" onClick={() => navigate('/')}>
              <ArrowLeft className="me-2" />
              Back to Home
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-container d-flex">
      <Sidebar activeId="home" />
      <main className="flex-grow-1 p-4">
        <div className="post-page-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <Button 
            variant="outline-secondary" 
            className="mb-3"
            onClick={() => {
              if (canGoBack) {
                navigate(-1);
              } else {
                navigate('/');
              }
            }}
          >
            <ArrowLeft className="me-2" />
            {canGoBack ? 
              (backContext === 'profile' ? 'Back to Profile' :
               backContext === 'search' ? 'Back to Search' :
               backContext === 'home' ? 'Back to Home' :
               'Back') : 
              'Back to Home'}
          </Button>

          <Post 
            post={post} 
            onLikeToggle={handleLikeToggle} 
            showFullContent={true} 
          />

          <Card className="comments-card mt-4">
            <Card.Header>
              <h5 className="mb-0 d-flex align-items-center">
                <ChatSquareText className="me-2" />
                Comments ({post._count.comments})
              </h5>
            </Card.Header>
            
            <Card.Body>
              {user && (
                <Form onSubmit={handleCommentSubmit} className="mb-4">
                  <Form.Group>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Write a comment..."
                      className="mb-2"
                      maxLength={1000}
                    />
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <small className={`char-count ${newComment.length > 900 ? 'text-warning' : ''} ${newComment.length >= 1000 ? 'text-danger' : ''}`}>
                        {newComment.length}/1000 characters
                      </small>
                    </div>
                    <Button 
                      type="submit" 
                      disabled={!newComment.trim() || commentLoading || newComment.length > 1000}
                      size="sm"
                    >
                      {commentLoading ? (
                        <>
                          <Spinner size="sm" className="me-2" />
                          Posting...
                        </>
                      ) : (
                        'Post Comment'
                      )}
                    </Button>
                  </Form.Group>
                </Form>
              )}
              
              {commentsLoading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" size="sm" />
                </div>
              ) : comments.length > 0 ? (
                <div className="comments-list">
                  {comments.map((comment) => (
                    <CommentComponent
                      key={comment.id}
                      comment={comment}
                      postId={postId!}
                      onReplyAdded={fetchComments}
                      isAuthenticated={!!user}
                      currentUser={user}
                      onCommentDeleted={fetchComments}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted py-4">
                  No comments yet. Be the first to comment!
                </div>
              )}
            </Card.Body>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default PostPage;