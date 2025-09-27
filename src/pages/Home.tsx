import React, { useEffect } from 'react';
import Sidebar from '../components/singles/Navbar';
import Feed from '../components/Feed';

const HomePage: React.FC = () => {
  useEffect(() => {
    document.title = `Home - Axioris`;
  }, []);

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
    </div>
  );
};

export default HomePage;
