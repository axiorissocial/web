import React, { useEffect, useState } from 'react';
import { Form, InputGroup, Tabs, Tab, Card, Badge, Button, Spinner } from 'react-bootstrap';
import { Search as SearchIcon, Person, ChatSquareText } from 'react-bootstrap-icons';
import Sidebar from '../components/singles/Navbar';
import Feed from '../components/Feed';
import '../css/search.scss';

interface User {
  id: string;
  username: string;
  bio?: string;
  isVerified: boolean;
  profile?: {
    displayName?: string;
    avatar?: string;
  };
  _count: {
    posts: number;
  };
}

const SearchPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'posts' | 'users'>('posts');
  const [users, setUsers] = useState<User[]>([]);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [hasMoreUsers, setHasMoreUsers] = useState(true);

  useEffect(() => {
    document.title = `Search - Axioris`;
  }, []);

  const searchUsers = async (query: string, pageNum = 1, reset = false) => {
    if (!query.trim()) {
      setUsers([]);
      return;
    }

    setUserLoading(true);
    setUserError('');

    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&page=${pageNum}&limit=10`);
      
      if (!response.ok) {
        throw new Error('Failed to search users');
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
      setUserError(err instanceof Error ? err.message : 'Failed to search users');
    } finally {
      setUserLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (activeTab === 'users') {
      searchUsers(query, 1, true);
    }
  };

  const handleTabChange = (tab: string | null) => {
    if (tab === 'posts' || tab === 'users') {
      setActiveTab(tab);
      if (tab === 'users' && searchQuery) {
        searchUsers(searchQuery, 1, true);
      }
    }
  };

  const handleLoadMoreUsers = () => {
    if (hasMoreUsers && !userLoading && searchQuery) {
      searchUsers(searchQuery, userPage + 1);
    }
  };

  const UserCard: React.FC<{ user: User }> = ({ user }) => {
    const displayName = user.profile?.displayName || user.username;
    
    return (
      <Card className="user-card mb-3">
        <Card.Body>
          <div className="user-header">
            <div className="user-info">
              {user.profile?.avatar ? (
                <img 
                  src={user.profile.avatar} 
                  alt={`${displayName}'s avatar`}
                  className="user-avatar"
                />
              ) : (
                <div className="user-avatar-placeholder">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="user-details">
                <div className="user-name">
                  {displayName}
                  {user.isVerified && (
                    <Badge bg="primary" className="ms-2">✓</Badge>
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
            </div>
          </div>
          <div className="user-actions mt-3">
            <Button 
              variant="outline-primary" 
              size="sm"
              onClick={() => window.location.href = `/user/${user.username}`}
            >
              <Person size={16} className="me-1" />
              View Profile
            </Button>
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
          <h1>Search</h1>
          <p className="">Find posts and users</p>
          
          <div className="search-input-container">
            <InputGroup size="lg">
              <InputGroup.Text>
                <SearchIcon />
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Search for posts or users..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </InputGroup>
          </div>
        </div>

        {searchQuery && (
          <Tabs
            activeKey={activeTab}
            onSelect={handleTabChange}
            className="search-tabs mb-4"
          >
            <Tab eventKey="posts" title="Posts">
              <div className="search-results">
                <Feed searchQuery={searchQuery} />
              </div>
            </Tab>
            
            <Tab eventKey="users" title="Users">
              <div className="search-results">
                {userLoading && users.length === 0 ? (
                  <div className="text-center py-4">
                    <Spinner animation="border" />
                    <div className="mt-2">Searching users...</div>
                  </div>
                ) : userError ? (
                  <div className="text-center py-4 text-danger">
                    {userError}
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-5 ">
                    <Person size={48} className="mb-3" />
                    <h5>No users found</h5>
                    <p>Try searching with different keywords</p>
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
                              Loading...
                            </>
                          ) : (
                            'Load More Users'
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

        {!searchQuery && (
          <div className="search-empty text-center py-5">
            <SearchIcon size={64} className="mb-3 " />
            <h3>Start searching</h3>
            <p className="">Enter a keyword to search for posts and users</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default SearchPage;
