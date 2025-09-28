import React, { useEffect, useState } from 'react';
import { Button } from 'react-bootstrap';
import { Plus } from 'react-bootstrap-icons';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/singles/Navbar';
import Feed from '../components/Feed';
import { useAuth } from '../contexts/AuthContext';

const HomePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerHeight > window.innerWidth);

  useEffect(() => {
    document.title = `Home - Axioris`;
    
    const handleResize = () => setIsMobile(window.innerHeight > window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleCreatePost = () => {
    navigate('/create-post');
  };

  return (
    <div className="app-container">
      <Sidebar activeId="home" />
      <main>
        <div className="page-header mb-4">
          <h1>Home</h1>
          <p className="">Discover what's happening in the community</p>
        </div>
        <Feed />
      </main>
      
      {/* Mobile Floating Action Button */}
      {isMobile && user && (
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

export default HomePage;
