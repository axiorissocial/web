import React, { useEffect, useState } from 'react';
import usePageMeta from '../utils/usePageMeta';
import { Button } from 'react-bootstrap';
import { Plus } from 'react-bootstrap-icons';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/singles/Navbar';
import Feed from '../components/Feed';
import TrendingHashtags from '../components/TrendingHashtags';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useOGMeta } from '../utils/ogMeta';
import '../css/home.scss';

const HomePage: React.FC = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerHeight > window.innerWidth);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerHeight > window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [t, i18n.language]);

  useOGMeta({
    title: t('home.documentTitle', { app: t('app.name') }),
    description: t('home.subtitle'),
    type: 'website',
    url: window.location.href,
  });

  usePageMeta({ title: t('home.documentTitle', { app: t('app.name') }), description: t('home.subtitle') });

  const handleCreatePost = () => {
    navigate('/create-post');
  };

  return (
    <div className="app-container">
      <Sidebar activeId="home" />
      <main>
        <div className="page-header mb-4">
          <h1>{t('home.heading')}</h1>
          <p className="">{t('home.subtitle')}</p>
        </div>
        <div className="row g-4 home-content">
          <div className="col-12 col-lg-8 home-feed">
            <Feed />
          </div>
          <div className="col-12 col-lg-4 home-aside">
            <TrendingHashtags />
          </div>
        </div>
      </main>
      
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
