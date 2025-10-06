import React, { useEffect, useMemo, useState } from 'react';
import { Card, Spinner, Button } from 'react-bootstrap';
import { Hash } from 'react-bootstrap-icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import '../css/trending.scss';
import { formatRelativeTime } from '../utils/time';

interface TrendingHashtag {
  tag: string;
  usageCount: number;
  rank: number;
  lastUsedAt: string | null;
  share: number;
}

interface TrendingResponse {
  since: string;
  windowDays: number;
  limit: number;
  countryCode: string | null;
  global: TrendingHashtag[];
  local: TrendingHashtag[];
  localFallbackToGlobal: boolean;
  generatedAt: string;
}

const TrendingHashtags: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState<TrendingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrending = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/posts/trending/hashtags?limit=10', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('failed');
      }

      const payload = await response.json();
      setData(payload);
    } catch (err) {
      console.error('Failed to load trending hashtags', err);
      setError('hashtags.trending.error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrending();
  }, []);

  const resolvedRegionLabel = useMemo(() => {
    if (!data?.countryCode) {
      return null;
    }

    try {
      const displayNames = new Intl.DisplayNames([i18n.language], { type: 'region' });
      return displayNames.of(data.countryCode) ?? data.countryCode;
    } catch (error) {
      return data.countryCode;
    }
  }, [data?.countryCode, i18n.language]);

  const handleTagNavigate = (tag: string) => {
    navigate(`/hashtags/${encodeURIComponent(tag.toLowerCase())}`);
  };

  const renderList = (items: TrendingHashtag[]) => {
    if (!items.length) {
      return (
        <div className="trending-empty">{t('hashtags.trending.empty')}</div>
      );
    }

    return (
      <div className="trending-list">
        {items.map(item => {
          const lastUsed = item.lastUsedAt ? formatRelativeTime(new Date(item.lastUsedAt), t) : null;
          const sharePercent = Math.round(item.share * 100);

          return (
            <button
              key={item.tag}
              type="button"
              className="trending-item"
              onClick={() => handleTagNavigate(item.tag)}
            >
              <div className="trending-rank">{item.rank}</div>
              <div className="trending-details">
                <div className="trending-tag">#{item.tag}</div>
                <div className="trending-meta">
                  <span>{t('hashtags.trending.usageCount', { count: item.usageCount })}</span>
                  {lastUsed && (
                    <span className="separator">•</span>
                    )}
                  {lastUsed && (
                    <span>{t('hashtags.trending.lastUsed', { time: lastUsed })}</span>
                  )}
                </div>
              </div>
              <div className="trending-share">{sharePercent}%</div>
            </button>
          );
        })}
      </div>
    );
  };

  let content: React.ReactNode;

  if (loading) {
    content = (
      <div className="trending-loading">
        <Spinner animation="border" size="sm" />
        <span className="ms-2">{t('hashtags.trending.loading')}</span>
      </div>
    );
  } else if (error) {
    content = (
      <div className="trending-error">
        <p className="mb-2">{t(error)}</p>
        <Button variant="outline-secondary" size="sm" onClick={fetchTrending}>
          {t('hashtags.trending.retry')}
        </Button>
      </div>
    );
  } else if (data) {
    const updatedLabel = formatRelativeTime(new Date(data.generatedAt), t);
    content = (
      <>
        {data.countryCode && (
          <div className="trending-section">
            <div className="trending-section-header">
              <h3>{t('hashtags.trending.localTitle', { region: resolvedRegionLabel ?? data.countryCode })}</h3>
              {data.localFallbackToGlobal && (
                <span className="text-muted small">{t('hashtags.trending.fallback')}</span>
              )}
            </div>
            {renderList(data.local)}
          </div>
        )}

        <div className="trending-section">
          <div className="trending-section-header">
            <h3>{t('hashtags.trending.globalTitle')}</h3>
          </div>
          {renderList(data.global)}
        </div>

        <div className="trending-footer text-muted">
          {t('hashtags.trending.updated', { time: updatedLabel })}
        </div>
      </>
    );
  }

  return (
    <Card className="trending-card">
      <Card.Header className="d-flex align-items-center gap-2">
        <Hash />
        <span>{t('hashtags.trending.heading')}</span>
      </Card.Header>
      <Card.Body>
        {content}
      </Card.Body>
    </Card>
  );
};

export default TrendingHashtags;
