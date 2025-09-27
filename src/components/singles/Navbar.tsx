import React, { useState, useEffect } from 'react';
import { LinkContainer } from 'react-router-bootstrap';
import { Nav, Button } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import {
  HouseFill,
  Search,
  PersonCircle,
  Feather,
  BoxArrowInRight,
  PersonPlus,
  BellFill,
  GearFill,
} from 'react-bootstrap-icons';
import '../../css/navbar.scss';
import CreatePostModal from '../CreatePostModal';

interface NavbarProps {
  activeId?: 'home' | 'search' | 'notifications' | 'profile' | 'settings';
}

const allNavItems = [
  { id: 'home', to: '/', icon: <HouseFill />, label: 'Home' },
  { id: 'search', to: '/search', icon: <Search />, label: 'Search' },
  { id: 'notifications', to: '/notifications', icon: <BellFill />, label: 'Notifications' },
  { id: 'profile', to: '/user/me', icon: <PersonCircle />, label: 'Profile' },
  { id: 'settings', to: '/settings', icon: <GearFill />, label: 'Settings' },
] as const;

const Sidebar: React.FC<NavbarProps> = ({ activeId = 'home' }) => {
  const [isMobile, setIsMobile] = useState(window.innerHeight > window.innerWidth);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { user, loading } = useAuth();
  const isAuthenticated = !!user;

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerHeight > window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading) {
    return null;
  }

  // MOBILE VERSION
  if (isMobile) {
    const mobileItems = isAuthenticated
      ? allNavItems
      : allNavItems.filter(item => ['home', 'search', 'profile'].includes(item.id));

    return (
      <nav className="sidebar-mobile d-flex justify-content-around">
        {mobileItems.map(({ id, to, icon }) => (
          <LinkContainer
            key={id}
            to={isAuthenticated ? to : id === 'profile' ? '/account/login' : to}
          >
            <Nav.Link className={activeId === id ? 'active' : ''}>
              {icon}
            </Nav.Link>
          </LinkContainer>
        ))}
      </nav>
    );
  }

  // DESKTOP VERSION
  const desktopItems = isAuthenticated
    ? allNavItems
    : allNavItems.filter(item => ['home', 'search'].includes(item.id));

  return (
    <nav className="sidebar d-flex flex-column p-2">
      <div className="brand mb-3">
        <LinkContainer to="/">
          <Nav.Link className="brand-link d-flex align-items-center">
            <img src="/logo.png" alt="Axioris Logo" className="brand-logo" />
            <span className="brand-text">Axioris</span>
          </Nav.Link>
        </LinkContainer>
      </div>

      <div className="top flex-grow-1">
        <Nav className="flex-column nav-vertical">
          {desktopItems.map(({ id, to, icon, label }) => (
            <LinkContainer key={id} to={to}>
              <Nav.Link className={activeId === id ? 'active' : ''}>
                {React.cloneElement(icon, { className: 'me-2' })}
                {label}
              </Nav.Link>
            </LinkContainer>
          ))}
        </Nav>
      </div>

      <div className="bottom mt-auto d-flex flex-column gap-2">
        {isAuthenticated ? (
            <>
            <Button
              variant="primary"
              className="create-thread-btn d-flex align-items-center justify-content-center w-100"
              onClick={() => setShowCreateModal(true)}
            >
              <Feather className="me-2" />
              Create Thread
            </Button>
            <CreatePostModal
              show={showCreateModal}
              onHide={() => setShowCreateModal(false)}
            />
            </>
        ) : (
          <>
            <LinkContainer to="/account/login">
              <Button
                variant="outline-primary"
                className="login-btn d-flex align-items-center justify-content-center w-100"
              >
                <BoxArrowInRight className="me-2" />
                Login
              </Button>
            </LinkContainer>
            <LinkContainer to="/account/register">
              <Button
                variant="primary"
                className="signup-btn d-flex align-items-center justify-content-center w-100"
              >
                <PersonPlus className="me-2" />
                Sign Up
              </Button>
            </LinkContainer>
          </>
        )}
      </div>
    </nav>
  );
};

export default Sidebar;
