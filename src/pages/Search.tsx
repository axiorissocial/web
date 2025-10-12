import React, { useState } from 'react';
import usePageMeta from '../utils/usePageMeta';
import { Form, InputGroup, Tabs, Tab, Card, Badge, Button, Spinner } from 'react-bootstrap';
import { Search as SearchIcon, Person, ChatSquareText, PersonPlus, PersonDash } from 'react-bootstrap-icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from '../components/singles/Navbar';
import Feed from '../components/Feed';
import { useAuth } from '../contexts/AuthContext';
import { useOGMeta } from '../utils/ogMeta';
import '../css/search.scss';
import { getProfileGradientCss, getProfileGradientTextColor } from '../utils/profileGradients';

interface User {
  id: string;
  username: string;
  bio?: string;
  isVerified: boolean;
  isAdmin: boolean;
  isFollowing?: boolean;
  profile?: {
    displayName?: string;
    avatar?: string;
    avatarGradient?: string | null;
    bannerGradient?: string | null;
  };
  _count: {
    posts: number;
    followers: number;
  };
}

const SearchPage: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [searchInput, setSearchInput] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'posts' | 'users'>('posts');
  const [users, setUsers] = useState<User[]>([]);
  const [userLoading, setUserLoading] = useState(false);
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const handleFollowToggle = async (userId: string, isFollowing: boolean) => {
    try {
      const response = await fetch(`/api/users/${userId}/${isFollowing ? 'unfollow' : 'follow'}`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user.id === userId 
              ? { 
                  ...user, 
                  isFollowing: !isFollowing,
                  _count: {
                    ...user._count,
                    followers: user._count.followers + (isFollowing ? -1 : 1)
                  }
                }
              : user
          )
        );
      } else {
        const errorData = await response.json();
        console.error('Follow toggle failed:', errorData);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const handleUserClick = (username: string) => {
    navigate(`/profile/${username}`);
  };
  const [userError, setUserError] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [hasMoreUsers, setHasMoreUsers] = useState(true);

  usePageMeta({ title: t('search.documentTitle', { app: t('app.name') }), description: t('search.documentTitle', { app: t('app.name') }) });

  useOGMeta({
    title: t('search.documentTitle', { app: t('app.name') }),
    description: t('search.documentTitle', { app: t('app.name') }),
    type: 'website',
    url: window.location.href,
  });

  const searchUsers = async (query: string, pageNum = 1, reset = false) => {
    if (!query || !query.trim()) {
      setUsers([]);
      return;
    }

    setUserLoading(true);
    setUserError('');

    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&page=${pageNum}&limit=10`);
      
      if (!response.ok) {
        throw new Error(t('search.errors.searchFailed'));
      }

      const data = await response.json();
      
      if (reset || pageNum === 1) {
        setUsers(data.users);
      } else {
        setUsers(prev => [...prev, ...data.users]);
      }

      setHasMoreUsers(data.pagination.hasNextPage);
      setUserPage(pageNum);
    } catch (err) {
      setUserError(err instanceof Error ? err.message : t('search.errors.searchFailed'));
    } finally {
      setUserLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchInput(query);
  };

  const handleSubmitSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = searchInput || '';
    setAppliedQuery(q);
    try {
      navigate(`${window.location.pathname}${q ? `?q=${encodeURIComponent(q)}` : ''}`);
    } catch (err) {}

    if (activeTab === 'users') {
      searchUsers(q, 1, true);
    }
  };

  const handleTabChange = (tab: string | null) => {
    if (tab === 'posts' || tab === 'users') {
      setActiveTab(tab);
    }
  };

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q') || '';
    setSearchInput(q);
    setAppliedQuery(q);
    if (q) {
      if (activeTab === 'users') {
        searchUsers(q, 1, true);
      }
    }
  }, [location.search]);

  const handleLoadMoreUsers = () => {
    if (hasMoreUsers && !userLoading && appliedQuery) {
      searchUsers(appliedQuery, userPage + 1);
    }
  };

  const UserCard: React.FC<{ user: User }> = ({ user }) => {
    const displayName = user.profile?.displayName || user.username;
    const isCurrentUser = currentUser?.id === user.id;
    const avatarGradientId = !user.profile?.avatar ? user.profile?.avatarGradient ?? null : null;
    const placeholderStyle = avatarGradientId
      ? {
          background: getProfileGradientCss(avatarGradientId),
          color: getProfileGradientTextColor(avatarGradientId)
        }
      : undefined;
    
    return (
      <Card className="user-card mb-3">
        <Card.Body>
          <div className="user-container">
            <div 
              className="user-header cursor-pointer" 
              onClick={() => handleUserClick(user.username)}
              style={{ cursor: 'pointer' }}
            >
              <div className="user-info">
                {user.profile?.avatar ? (
                  <img 
                    src={user.profile.avatar} 
                    alt={`${displayName}'s avatar`}
                    className="user-avatar"
                  />
                ) : (
                  <div className="user-avatar-placeholder" style={placeholderStyle}>
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="user-details">
                  <div className="user-name">
                    {displayName}
                      {user.isAdmin && (
                      <Badge bg="danger" className="ms-2">{t('profilePage.adminBadge')}</Badge>
                    )}
                  </div>
                  <div className="user-username">@{user.username}</div>
                  {user.bio && (
                    <div className="user-bio">{user.bio}</div>
                  )}
                </div>
              </div>
              <div className="user-stats">
                <div className="stat">
                  <ChatSquareText size={16} />
                  <span className="ms-1">{user._count.posts} posts</span>
                </div>
                <div className="stat">
                  <Person size={16} />
                  <span className="ms-1">{user._count.followers} followers</span>
                </div>
              </div>
            </div>
            {!isCurrentUser && (
              <div className="user-actions mt-3">
                <Button 
                  variant={user.isFollowing ? "outline-danger" : "outline-primary"} 
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleFollowToggle(user.id, user.isFollowing || false);
                  }}
                  className="me-2"
                >
                  {user.isFollowing ? (
                    <>
                      <PersonDash size={16} className="me-1" />
                      Unfollow
                    </>
                  ) : (
                    <>
                      <PersonPlus size={16} className="me-1" />
                      Follow
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline-primary" 
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleUserClick(user.username);
                  }}
                >
                  <Person size={16} className="me-1" />
                  View Profile
                </Button>
              </div>
            )}
          </div>
        </Card.Body>
      </Card>
    );
  };

  return (
    <div className="app-container">
      <Sidebar activeId="search" />
      <main className="search-main">
        <div className="search-header mb-4">
          <h1>{t('search.heading')}</h1>
          <p className="">{t('search.subheading')}</p>
          
          <div className="search-input-container">
            <Form onSubmit={handleSubmitSearch}>
              <InputGroup size="lg">
                <InputGroup.Text>
                  <SearchIcon />
                </InputGroup.Text>
                <Form.Control
                  name="q"
                  type="text"
                  placeholder={t('search.placeholder')}
                  value={searchInput}
                  onChange={(e) => handleSearch(e.target.value)}
                />
                <Button type="submit" variant="primary">{t('search.actions.search')}</Button>
              </InputGroup>
            </Form>
          </div>
        </div>

  {appliedQuery && (
          <Tabs
            activeKey={activeTab}
            onSelect={handleTabChange}
            className="search-tabs mb-4"
          >
            <Tab eventKey="posts" title={t('search.tabs.posts')}>
              <div className="search-results">
                <Feed searchQuery={appliedQuery} />
              </div>
            </Tab>
            
            <Tab eventKey="users" title={t('search.tabs.users')}>
              <div className="search-results">
                {userLoading && users.length === 0 ? (
                  <div className="text-center py-4">
                    <Spinner animation="border" />
                    <div className="mt-2">{t('search.status.searchingUsers')}</div>
                  </div>
                ) : userError ? (
                  <div className="text-center py-4 text-danger">
                    {userError}
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-5 ">
                    <Person size={48} className="mb-3" />
                    <h5>{t('search.emptyUsers.title')}</h5>
                    <p>{t('search.emptyUsers.subtitle')}</p>
                  </div>
                ) : (
                  <>
                    {users.map(user => (
                      <UserCard key={user.id} user={user} />
                    ))}
                    
                    {hasMoreUsers && (
                      <div className="text-center py-3">
                        <Button
                          variant="outline-primary"
                          onClick={handleLoadMoreUsers}
                          disabled={userLoading}
                        >
                          {userLoading ? (
                            <>
                              <Spinner size="sm" className="me-2" />
                              {t('common.statuses.loading')}
                            </>
                          ) : (
                            t('search.actions.loadMoreUsers')
                          )}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </Tab>
          </Tabs>
        )}

        {!appliedQuery && (
          <div className="search-empty text-center py-5">
            <SearchIcon size={64} className="mb-3 " />
            <h3>{t('search.emptyState.title')}</h3>
            <p className="">{t('search.emptyState.subtitle')}</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default SearchPage;
