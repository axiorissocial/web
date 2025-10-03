/* @refresh reload */
import { useEffect } from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './css/index.scss';
import { I18nextProvider } from 'react-i18next';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import i18n from './i18n/config';
import './utils/httpClient';
import Home from './pages/Home';
import Search from './pages/Search';
import Notifications from './pages/Notifications';
import Messages from './pages/Messages';
import Profile from './pages/Profile';
import PostPage from './pages/PostPage';
import Settings from './pages/Settings';
import AdminPanel from './pages/AdminPanel';
import AccountLogin from './pages/AccountLogin';
import AccountRegister from './pages/AccountRegister';
import CreatePost from './pages/CreatePost';
import Mobile from './pages/Mobile';
import Error from './pages/Error';
import Hashtag from './pages/Hashtag';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(registration => console.log('Service Worker registered', registration))
      .catch(err => console.error('Service Worker registration failed', err));
  });
}

function AppRoutes() {
  const navigate = useNavigate();

  useEffect(() => {
    const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
      navigator.userAgent
    );

    const cookies = document.cookie.split(';').map(c => c.trim());
    const hasMobileCookie = cookies.some(c => c.startsWith('mobileonsite='));
    const isStandalone = Boolean(
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
        (window.matchMedia && window.matchMedia('(display-mode: minimal-ui)').matches) ||
        (navigator as any).standalone ||
        document.referrer?.startsWith('android-app://')
    );

    if (isMobile && !hasMobileCookie && !isStandalone) {
      navigate('/mobile', { replace: true });
    }
  }, [navigate]);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/search" element={<Search />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/messages" element={<Messages />} />
      <Route path="/create-post" element={<CreatePost />} />
      <Route path="/profile/@:username" element={<Profile />} />
      <Route path="/profile/:username" element={<Profile />} />
      <Route path="/user/me" element={<Profile />} />
      <Route path="/post/:postId" element={<PostPage />} />
  <Route path="/hashtags/:tag" element={<Hashtag />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/admin" element={<AdminPanel />} />
      <Route path="/account/login" element={<AccountLogin />} />
      <Route path="/account/register" element={<AccountRegister />} />
      <Route path="/mobile" element={<Mobile />} />
      <Route path="*" element={<Error />} />
    </Routes>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <I18nextProvider i18n={i18n}>
        <AuthProvider>
          <NotificationProvider>
            <AppRoutes />
          </NotificationProvider>
        </AuthProvider>
      </I18nextProvider>
    </BrowserRouter>
  </StrictMode>
);
