import React, { useEffect, useState } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { Card, Button, Spinner, Tabs, Tab, Badge, Row, Col } from 'react-bootstrap';
import { Calendar, GeoAlt, Link45deg, PersonPlus, PersonDash, Envelope, ChatSquareText, Plus, Info } from 'react-bootstrap-icons';
import Sidebar from '../components/singles/Navbar';
import Feed from '../components/Feed';
import { useAuth } from '../contexts/AuthContext';
import '../css/profile.scss';
import { useTranslation } from 'react-i18next';
import { getProfileGradientCss, getProfileGradientTextColor } from '@shared/profileGradients';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  bio?: string;
  level: number;
  isVerified: boolean;
  isAdmin: boolean;
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
    avatarGradient?: string | null;
    bannerGradient?: string | null;
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
  const { t, i18n } = useTranslation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'about'>('posts');
  const [isMobile, setIsMobile] = useState(window.innerHeight > window.innerWidth);
  const [messageLoading, setMessageLoading] = useState(false);

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
    
    const cleanUsername = username.startsWith('@') ? username.slice(1) : username;
    
    setLoading(true);
  setError('');

    try {
      const response = await fetch(`/api/users/${cleanUsername}/profile`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          setError(t('profilePage.errors.notFound'));
        } else {
          const errorText = await response.text();
          setError(t('profilePage.errors.loadFailed'));
          console.error(`Profile fetch failed: ${response.status} - ${errorText}`);
        }
        return;
      }

      const data = await response.json();
      setProfile(data);
      setFollowing(data.isFollowing || false);
      document.title = t('profilePage.documentTitle', {
        name: data.profile?.displayName || data.username,
        app: t('app.name')
      });
    } catch (err) {
      console.error('Error fetching profile for %s:', username, err);
      setError(t('profilePage.errors.loadFailed'));
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

  if ((!username && authLoading) || loading) {
    return (
      <div className="app-container">
        <Sidebar activeId="profile" />
        <main>
          <div className="text-center py-5">
            <Spinner animation="border" role="status" aria-label={t('profilePage.loading')} />
            <div className="mt-2">{t('profilePage.loading')}</div>
          </div>
        </main>
      </div>
    );
  }

  if (!username) {
    return (
      <div className="app-container">
        <Sidebar activeId="profile" />
        <main>
          <div className="text-center py-5">
            <Spinner animation="border" role="status" aria-label={t('profilePage.redirecting')} />
            <div className="mt-2">{t('profilePage.redirecting')}</div>
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
              <h3>{t('profilePage.error.title')}</h3>
              <p className="">{error || t('profilePage.error.description')}</p>
              <Button variant="primary" onClick={() => window.history.back()}>
                {t('profilePage.error.back')}
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const displayName = profile.profile?.displayName || profile.username;
  const isOwn = profile.isOwn || currentUser?.id === profile.id;
  const joinDate = new Date(profile.profile?.joinedAt || profile.createdAt).toLocaleDateString(i18n.language, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const lastActiveDisplay = profile.lastLogin
    ? new Date(profile.lastLogin).toLocaleString(i18n.language, {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : null;
  const avatarGradientId = !profile.profile?.avatar ? profile.profile?.avatarGradient ?? null : null;
  const avatarPlaceholderStyle = avatarGradientId
    ? {
        background: getProfileGradientCss(avatarGradientId),
        color: getProfileGradientTextColor(avatarGradientId)
      }
    : undefined;
  const bannerGradientId = !profile.profile?.banner ? profile.profile?.bannerGradient ?? null : null;
  const bannerStyle = bannerGradientId
    ? { background: getProfileGradientCss(bannerGradientId) }
    : undefined;

  const handleMessage = async () => {
    if (!profile || !currentUser) return;

    try {
      setMessageLoading(true);

      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          participantId: profile.id
        })
      });

      if (response.ok) {
        const conversation = await response.json();
        if (conversation?.id) {
          navigate(`/messages?conversation=${conversation.id}`);
        } else {
          navigate('/messages');
        }
      } else {
        console.error('Failed to create conversation');
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    } finally {
      setMessageLoading(false);
    }
  };

  return (
    <div className="app-container">
      <Sidebar activeId="profile" />
      <main className="profile-main">
        <div className="profile-container">
          <Card className="profile-card">
            <div className="profile-banner">
              {profile.profile?.banner ? (
                <img
                  src={profile.profile.banner}
                  alt={t('profilePage.media.bannerAlt', { name: displayName })}
                  className="banner-image"
                />
              ) : (
                <div className="banner-placeholder" style={bannerStyle} />
              )}
            </div>
            
            <Card.Body className="profile-body">
              <div className="profile-header">
                <div className="profile-avatar-section">
                  {profile.profile?.avatar ? (
                    <img 
                      src={profile.profile.avatar} 
                      alt={t('profilePage.media.avatarAlt', { name: displayName })}
                      className="profile-avatar"
                    />
                  ) : (
                    <div className="profile-avatar-placeholder" style={avatarPlaceholderStyle}>
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  
                  <div className="profile-info">
                    <div className="profile-names">
                      <h1 className="display-name">
                        {displayName}
                        {profile.isAdmin && (
                          <Badge bg="danger" className="admin-badge ms-2">ADMIN</Badge>
                        )}
                      </h1>
                      <p className="username">@{profile.username}</p>
                      <div className="profile-level">
                        <Badge bg="secondary">{t('profilePage.level', { level: profile.level })}</Badge>
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
                        {t('profilePage.actions.createPost')}
                      </Button>
                      <Button 
                        variant="outline-primary"
                        onClick={() => window.location.href = '/settings'}
                      >
                        {t('profilePage.actions.editProfile')}
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
                        {following ? t('profilePage.actions.unfollow') : t('profilePage.actions.follow')}
                      </Button>
                      <Button 
                        variant="outline-secondary" 
                        className="message-btn"
                        onClick={handleMessage}
                        title={t('profilePage.actions.sendMessage')}
                        aria-label={t('profilePage.actions.sendMessage')}
                        disabled={messageLoading}
                      >
                        {messageLoading ? <Spinner size="sm" role="status" aria-label={t('profilePage.statuses.messaging')} /> : <Envelope />}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {isMobile && (
                <div className="profile-mobile-stats">
                  <div className="stat-chip">
                    <span className="label">{t('profilePage.stats.posts')}</span>
                    <span className="value">{profile._count.posts}</span>
                  </div>
                  <div className="stat-chip">
                    <span className="label">{t('profilePage.stats.following')}</span>
                    <span className="value">{profile._count.following}</span>
                  </div>
                  <div className="stat-chip">
                    <span className="label">{t('profilePage.stats.followers')}</span>
                    <span className="value">{profile._count.followers}</span>
                  </div>
                </div>
              )}
              
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
                    <span>{t('profilePage.meta.joined', { date: joinDate })}</span>
                  </Col>
                </Row>
              </div>
              
              <div className="profile-stats">
                <Row>
                  <Col className="stat-item">
                    <div className="stat-number">{profile._count.posts}</div>
                    <div className="stat-label">{t('profilePage.stats.posts')}</div>
                  </Col>
                  <Col className="stat-item">
                    <div className="stat-number">{profile._count.following}</div>
                    <div className="stat-label">{t('profilePage.stats.following')}</div>
                  </Col>
                  <Col className="stat-item">
                    <div className="stat-number">{profile._count.followers}</div>
                    <div className="stat-label">{t('profilePage.stats.followers')}</div>
                  </Col>
                </Row>
              </div>
            </Card.Body>
          </Card>
          
          <Tabs 
            activeKey={activeTab} 
            onSelect={(tab) => setActiveTab((tab as 'posts' | 'about') || 'posts')}
            className="profile-tabs"
          >
            <Tab
              eventKey="posts"
              title={(
                <>
                  <ChatSquareText className="me-2" />
                  {t('profilePage.tabs.posts')}
                </>
              )}
            >
              <div className="tab-content">
                <Feed userId={profile.id} />
              </div>
            </Tab>
            
            <Tab
              eventKey="about"
              title={(
                <>
                  <Info className="me-2" />
                  {t('profilePage.tabs.about')}
                </>
              )}
            >
              <div className="tab-content">
                <Card className="about-card">
                  <Card.Body>
                    <h5>{t('profilePage.about.title', { name: displayName })}</h5>
                    
                    <div className="about-content">
                      {profile.profile?.bio || profile.bio ? (
                        <p>{profile.profile?.bio || profile.bio}</p>
                      ) : (
                        <p className="">{t('profilePage.about.values.noBio')}</p>
                      )}
                      
                      <div className="about-details">
                        <div className="detail-row">
                          <strong>{t('profilePage.about.details.username')}</strong>
                          <span>{t('profilePage.about.values.username', { username: profile.username })}</span>
                        </div>
                        {profile.profile?.location && (
                          <div className="detail-row">
                            <strong>{t('profilePage.about.details.location')}</strong>
                            <span>{profile.profile.location}</span>
                          </div>
                        )}
                        {profile.profile?.website && (
                          <div className="detail-row">
                            <strong>{t('profilePage.about.details.website')}</strong>
                            <a href={profile.profile.website} target="_blank" rel="noopener noreferrer" className="ms-2">
                              {profile.profile.website}
                            </a>
                          </div>
                        )}
                        <div className="detail-row">
                          <strong>{t('profilePage.about.details.memberSince')}</strong>
                          <span>{joinDate}</span>
                        </div>
                        <div className="detail-row">
                          <strong>{t('profilePage.about.details.level')}</strong>
                          <span>{profile.level}</span>
                        </div>
                        <div className="detail-row">
                          <strong>{t('profilePage.about.details.lastActive')}</strong>
                          <span>{lastActiveDisplay || t('profilePage.about.values.unknown')}</span>
                        </div>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </div>
            </Tab>
          </Tabs>
        </div>
      </main>
      
      {isMobile && currentUser && profile?.isOwn && (
        <Button
          variant="primary"
          className="mobile-fab"
          onClick={handleCreatePost}
          size="lg"
          aria-label={t('profilePage.actions.createPost')}
          title={t('profilePage.actions.createPost')}
        >
          <Plus size={24} />
        </Button>
      )}
    </div>
  );
};

export default ProfilePage;
