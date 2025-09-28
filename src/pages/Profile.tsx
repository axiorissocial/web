import React, { useEffect, useState } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { Card, Button, Spinner, Tabs, Tab, Badge, Row, Col } from 'react-bootstrap';
import { Calendar, GeoAlt, Link45deg, PersonPlus, PersonDash, Envelope, ChatSquareText, Plus } from 'react-bootstrap-icons';
import Sidebar from '../components/singles/Navbar';
import Feed from '../components/Feed';
import { useAuth } from '../contexts/AuthContext';
import '../css/profile.scss';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  bio?: string;
  level: number;
  isVerified: boolean;
  isPrivate: boolean;
  createdAt: string;
  lastLogin?: string;
  profile?: {
    displayName?: string;
    avatar?: string;
    banner?: string;
    location?: string;
    website?: string;
    bio?: string;
    birthDate?: string;
    joinedAt: string;
  };
  _count: {
    posts: number;
    following: number;
    followers: number;
  };
  isFollowing?: boolean;
  isOwn?: boolean;
}

const ProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'about'>('posts');
  const [isMobile, setIsMobile] = useState(window.innerHeight > window.innerWidth);

  // Handle /user/me route - redirect to user's profile when auth is loaded
  useEffect(() => {
    if (!username && !authLoading && currentUser) {
      navigate(`/profile/@${currentUser.username}`, { replace: true });
    }
  }, [username, currentUser, authLoading, navigate]);

  useEffect(() => {
    if (username) {
      fetchProfile();
    }
  }, [username]);

  // Mobile detection
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerHeight > window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleCreatePost = () => {
    navigate('/create-post');
  };

  const fetchProfile = async () => {
    if (!username) return;
    
    // Remove @ symbol if present
    const cleanUsername = username.startsWith('@') ? username.slice(1) : username;
    
    setLoading(true);
    setError('');

    try {
      console.log(`Fetching profile for username: ${cleanUsername}`);
      const response = await fetch(`/api/users/${cleanUsername}/profile`, {
        credentials: 'include'
      });
      
      console.log(`Profile API response status: ${response.status}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('User not found');
          console.error(`User not found: ${cleanUsername}`);
        } else {
          const errorText = await response.text();
          setError('Failed to load profile');
          console.error(`Profile fetch failed: ${response.status} - ${errorText}`);
        }
        return;
      }

      const data = await response.json();
      console.log(`Profile data loaded for ${username}:`, data);
      setProfile(data);
      setFollowing(data.isFollowing || false);
      document.title = `${data.profile?.displayName || data.username} - Axioris`;
    } catch (err) {
      console.error('Error fetching profile for %s:', username, err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!profile || followLoading) return;
    
    setFollowLoading(true);
    
    try {
      const response = await fetch(`/api/users/${profile.id}/follow`, {
        method: following ? 'DELETE' : 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to update follow status');
      }

      const newFollowState = !following;
      setFollowing(newFollowState);
      
      setProfile(prev => prev ? {
        ...prev,
        _count: {
          ...prev._count,
          followers: prev._count.followers + (newFollowState ? 1 : -1)
        }
      } : null);
    } catch (err) {
      console.error('Error toggling follow:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  if (!username && !currentUser) {
    return <Navigate to="/account/login" replace />;
  }

  // Show loading while waiting for redirect or profile data
  if ((!username && authLoading) || loading) {
    return (
      <div className="app-container">
        <Sidebar activeId="profile" />
        <main>
          <div className="text-center py-5">
            <Spinner animation="border" />
            <div className="mt-2">Loading profile...</div>
          </div>
        </main>
      </div>
    );
  }

  // If we don't have a username and we're not loading auth, we're redirecting
  if (!username) {
    return (
      <div className="app-container">
        <Sidebar activeId="profile" />
        <main>
          <div className="text-center py-5">
            <Spinner animation="border" />
            <div className="mt-2">Redirecting...</div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="app-container">
        <Sidebar activeId="profile" />
        <main>
          <div className="text-center py-5">
            <div className="error-state">
              <h3>Profile Not Found</h3>
              <p className="">{error || 'The requested profile could not be found.'}</p>
              <Button variant="primary" onClick={() => window.history.back()}>
                Go Back
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const displayName = profile.profile?.displayName || profile.username;
  const isOwn = profile.isOwn || currentUser?.id === profile.id;
  const joinDate = new Date(profile.profile?.joinedAt || profile.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long'
  });

  const handleMessage = async () => {
    if (!profile || !currentUser) return;

    try {
      // Create or find existing conversation
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          participantIds: [profile.id]
        })
      });

      if (response.ok) {
        await response.json();
        // Navigate to messages page
        navigate('/messages');
      } else {
        console.error('Failed to create conversation');
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  return (
    <div className="app-container">
      <Sidebar activeId="profile" />
      <main>
        <div className="profile-container">
          <Card className="profile-card">
            <div className="profile-banner">
              {profile.profile?.banner ? (
                <img src={profile.profile.banner} alt="Profile banner" className="banner-image" />
              ) : (
                <div className="banner-placeholder" />
              )}
            </div>
            
            <Card.Body className="profile-body">
              <div className="profile-header">
                <div className="profile-avatar-section">
                  {profile.profile?.avatar ? (
                    <img 
                      src={profile.profile.avatar} 
                      alt={`${displayName}'s avatar`}
                      className="profile-avatar"
                    />
                  ) : (
                    <div className="profile-avatar-placeholder">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  
                  <div className="profile-info">
                    <div className="profile-names">
                      <h1 className="display-name">
                        {displayName}
                        {profile.isVerified && (
                          <Badge bg="primary" className="verified-badge">✓</Badge>
                        )}
                      </h1>
                      <p className="username">@{profile.username}</p>
                      <div className="profile-level">
                        <Badge bg="secondary">Level {profile.level}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="profile-actions">
                  {isOwn ? (
                    <>
                      <Button 
                        variant="primary"
                        onClick={handleCreatePost}
                        className="me-2"
                      >
                        <Plus className="me-1" />
                        Create Post
                      </Button>
                      <Button 
                        variant="outline-primary"
                        onClick={() => window.location.href = '/settings'}
                      >
                        Edit Profile
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant={following ? "outline-danger" : "primary"}
                        onClick={handleFollowToggle}
                        disabled={followLoading}
                        className="follow-btn"
                      >
                        {followLoading ? (
                          <Spinner size="sm" className="me-1" />
                        ) : following ? (
                          <PersonDash className="me-1" />
                        ) : (
                          <PersonPlus className="me-1" />
                        )}
                        {following ? 'Unfollow' : 'Follow'}
                      </Button>
                      <Button 
                        variant="outline-secondary" 
                        className="message-btn"
                        onClick={handleMessage}
                        title="Send Message"
                      >
                        <Envelope />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              
              {(profile.bio || profile.profile?.bio) && (
                <div className="profile-bio">
                  <p>{profile.profile?.bio || profile.bio}</p>
                </div>
              )}
              
              <div className="profile-meta">
                <Row>
                  {profile.profile?.location && (
                    <Col xs="auto" className="meta-item">
                      <GeoAlt className="me-1" />
                      <span>{profile.profile.location}</span>
                    </Col>
                  )}
                  {profile.profile?.website && (
                    <Col xs="auto" className="meta-item">
                      <Link45deg className="me-1" />
                      <a href={profile.profile.website} target="_blank" rel="noopener noreferrer">
                        {profile.profile.website.replace(/^https?:\/\//, '')}
                      </a>
                    </Col>
                  )}
                  <Col xs="auto" className="meta-item">
                    <Calendar className="me-1" />
                    <span>Joined {joinDate}</span>
                  </Col>
                </Row>
              </div>
              
              <div className="profile-stats">
                <Row>
                  <Col className="stat-item">
                    <div className="stat-number">{profile._count.posts}</div>
                    <div className="stat-label">Posts</div>
                  </Col>
                  <Col className="stat-item">
                    <div className="stat-number">{profile._count.following}</div>
                    <div className="stat-label">Following</div>
                  </Col>
                  <Col className="stat-item">
                    <div className="stat-number">{profile._count.followers}</div>
                    <div className="stat-label">Followers</div>
                  </Col>
                </Row>
              </div>
            </Card.Body>
          </Card>
          
          <Tabs 
            activeKey={activeTab} 
            onSelect={(tab) => setActiveTab(tab as 'posts' | 'about')}
            className="profile-tabs"
          >
            <Tab eventKey="posts" title={(
              <>
                <ChatSquareText className="me-2" />
                Posts
              </>
            )}>
              <div className="tab-content">
                <Feed userId={profile.id} />
              </div>
            </Tab>
            
            <Tab eventKey="about" title="About">
              <div className="tab-content">
                <Card className="about-card">
                  <Card.Body>
                    <h5>About {displayName}</h5>
                    
                    <div className="about-content">
                      {profile.profile?.bio || profile.bio ? (
                        <p>{profile.profile?.bio || profile.bio}</p>
                      ) : (
                        <p className="">No bio available.</p>
                      )}
                      
                      <div className="about-details">
                        <div className="detail-row">
                          <strong>Username:</strong> @{profile.username}
                        </div>
                        {profile.profile?.location && (
                          <div className="detail-row">
                            <strong>Location:</strong> {profile.profile.location}
                          </div>
                        )}
                        {profile.profile?.website && (
                          <div className="detail-row">
                            <strong>Website:</strong> 
                            <a href={profile.profile.website} target="_blank" rel="noopener noreferrer" className="ms-2">
                              {profile.profile.website}
                            </a>
                          </div>
                        )}
                        <div className="detail-row">
                          <strong>Joined:</strong> {new Date(profile.createdAt).toLocaleDateString()}
                        </div>
                        <div className="detail-row">
                          <strong>Level:</strong> {profile.level}
                        </div>
                        {profile.lastLogin && (
                          <div className="detail-row">
                            <strong>Last Active:</strong> {new Date(profile.lastLogin).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </div>
            </Tab>
          </Tabs>
        </div>
      </main>
      
      {/* Mobile Floating Action Button - Only show on own profile */}
      {isMobile && currentUser && profile?.isOwn && (
        <Button
          variant="primary"
          className="mobile-fab"
          onClick={handleCreatePost}
          size="lg"
        >
          <Plus size={24} />
        </Button>
      )}
    </div>
  );
};

export default ProfilePage;
