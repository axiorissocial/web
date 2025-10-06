import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Button, Spinner } from 'react-bootstrap';
import Sidebar from '../components/singles/Navbar';
import Post from '../components/Post';
import TrendingHashtags from '../components/TrendingHashtags';
import { useTranslation } from 'react-i18next';
import '../css/home.scss';

interface PostUser {
  id: string;
  username: string;
  profile?: {
    displayName?: string;
    avatar?: string;
    avatarGradient?: string | null;
    bannerGradient?: string | null;
  };
}

interface PostMediaItem {
  url: string;
  hlsUrl?: string;
  type: 'image' | 'video';
  originalName: string;
  size: number;
}

interface PostData {
  id: string;
  title?: string;
  content: string;
  media?: PostMediaItem[] | null;
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  viewsCount: number;
  isLiked: boolean;
  isPinned: boolean;
  hashtags?: string[];
  originCountryCode?: string | null;
  user: PostUser;
  commentsCount?: number;
  reactions?: any;
}

interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalPosts: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

const HashtagPage: React.FC = () => {
  const { tag = '' } = useParams<{ tag: string }>();
  const normalizedTag = tag.toLowerCase();
  const { t } = useTranslation();
  const [posts, setPosts] = useState<PostData[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decodedTag = useMemo(() => decodeURIComponent(normalizedTag), [normalizedTag]);

  const fetchPosts = async (page: number, append = false) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const response = await fetch(`/api/posts/hashtags/${encodeURIComponent(decodedTag)}?page=${page}&limit=10`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('hashtags.page.error');
      }

      const data = await response.json();
      setPagination(data.pagination ?? null);
      setPosts(prev => (append ? [...prev, ...data.posts] : data.posts));
    } catch (err) {
      console.error('Failed to load hashtag posts', err);
      if (err instanceof Error && err.message.startsWith('hashtags.')) {
        setError(err.message);
      } else {
        setError('hashtags.page.error');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    document.title = t('hashtags.page.documentTitle', { tag: `#${decodedTag}`, app: t('app.name') });
    fetchPosts(1, false);
  }, [decodedTag]);

  const handleLoadMore = () => {
    if (!pagination?.hasNextPage || loadingMore) return;
    fetchPosts((pagination?.currentPage ?? 1) + 1, true);
  };

  const handleRetry = () => {
    fetchPosts(1, false);
  };

  const headerSubtitle = pagination?.totalPosts
    ? t('hashtags.page.subtitleWithCount', { count: pagination.totalPosts })
    : t('hashtags.page.subtitle');

  return (
    <div className="app-container">
      <Sidebar activeId="home" />
      <main>
        <div className="page-header mb-4">
          <h1>#{decodedTag}</h1>
          <p>{headerSubtitle}</p>
        </div>

        {loading && (
          <div className="trending-loading py-5">
            <Spinner animation="border" />
            <span className="ms-2">{t('hashtags.page.loading')}</span>
          </div>
        )}

        {!loading && error && (
          <Alert variant="danger">
            <p className="mb-3">{t(error)}</p>
            <Button variant="outline-danger" onClick={handleRetry}>
              {t('hashtags.page.retry')}
            </Button>
          </Alert>
        )}

        {!loading && !error && posts.length === 0 && (
          <div className="trending-empty py-5">
            <h3>{t('hashtags.page.empty.title')}</h3>
            <p className="text-muted">{t('hashtags.page.empty.description')}</p>
          </div>
        )}

        {!loading && !error && posts.length > 0 && (
          <div className="row g-4 home-content">
            <div className="col-12 col-lg-8 home-feed">
              {posts.map(post => (
                <Post
                  key={post.id}
                  post={post}
                  showFullContent={false}
                />
              ))}

              {pagination?.hasNextPage && (
                <div className="text-center my-4">
                  <Button
                    variant="outline-primary"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        {t('hashtags.page.loadingMore')}
                      </>
                    ) : (
                      t('hashtags.page.loadMore')
                    )}
                  </Button>
                </div>
              )}

              {!pagination?.hasNextPage && (
                <div className="text-center text-muted py-4 small">
                  {t('hashtags.page.endOfResults')}
                </div>
              )}
            </div>
            <div className="col-12 col-lg-4 home-aside">
              <TrendingHashtags />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default HashtagPage;
