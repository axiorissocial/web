import React, { useState, useEffect } from 'react';
import { Modal, Button, Spinner } from 'react-bootstrap';
import { ChevronLeft, ChevronRight, Download, X } from 'react-bootstrap-icons';
import HlsVideo from './HlsVideo';
import { useTranslation } from 'react-i18next';

interface MediaItem {
  url: string;
  hlsUrl?: string;
  type: 'image' | 'video';
  originalName: string;
  size: number;
}

interface MediaModalProps {
  show: boolean;
  onHide: () => void;
  media: MediaItem[];
  initialIndex: number;
  isAdmin?: boolean;
  postId?: string;
}

const MediaModal: React.FC<MediaModalProps> = ({ show, onHide, media, initialIndex, isAdmin = false, postId }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    setDownloadError(null);
  }, [currentIndex]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!show) return;
      
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateMedia('prev');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigateMedia('next');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onHide();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [show, currentIndex, media.length]);

  const navigateMedia = (direction: 'prev' | 'next') => {
    if (media.length <= 1) return;
    
    let newIndex;
    if (direction === 'prev') {
      newIndex = currentIndex <= 0 ? media.length - 1 : currentIndex - 1;
    } else {
      newIndex = currentIndex >= media.length - 1 ? 0 : currentIndex + 1;
    }
    
    setCurrentIndex(newIndex);
  };

  if (!show || media.length === 0) return null;

  const currentMedia = media[currentIndex];
  const canDownload = Boolean(isAdmin && postId);

  const handleDownload = async () => {
    if (!canDownload || !postId) return;

    try {
      setIsDownloading(true);
      setDownloadError(null);

      const response = await fetch(`/api/posts/${postId}/media/${currentIndex}/download`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        let message: string | null = null;
        try {
          const data = await response.json();
          if (data?.error && typeof data.error === 'string') {
            message = data.error;
          }
        } catch {}
        throw new Error(message ?? 'mediaModal.errors.downloadFailed');
      }

      const blob = await response.blob();
      const disposition = response.headers.get('content-disposition') ?? response.headers.get('Content-Disposition');

      let filename = currentMedia.originalName || `media-${postId}-${currentIndex + 1}`;
      if (disposition) {
        const match = disposition.match(/filename\*?="?([^";]+)"?/i);
        if (match && match[1]) {
          filename = decodeURIComponent(match[1]);
        }
      }

      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Media download failed:', error);
      if (error instanceof Error) {
        setDownloadError(error.message);
      } else {
        setDownloadError('mediaModal.errors.downloadFailed');
      }
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Modal 
      show={show} 
      onHide={onHide} 
      size="xl" 
      centered
      backdrop={true}
      className="media-modal"
    >
      <Modal.Header className="border-0 pb-0">
        <div className="w-100 d-flex justify-content-between align-items-center">
          <div className="text-muted small">
            {t('mediaModal.position', {
              type: t(currentMedia.type === 'image' ? 'mediaModal.types.image' : 'mediaModal.types.video'),
              index: currentIndex + 1,
              total: media.length
            })}
          </div>
          <div className="d-flex align-items-center gap-3">
            {canDownload && (
              <Button
                variant="outline-light"
                className="text-white d-flex align-items-center gap-2"
                disabled={isDownloading}
                onClick={handleDownload}
              >
                {isDownloading ? (
                  <>
                    <Spinner animation="border" size="sm" />
                    <span>{t('mediaModal.actions.preparing')}</span>
                  </>
                ) : (
                  <>
                    <Download />
                    <span>{t('mediaModal.actions.download')}</span>
                  </>
                )}
              </Button>
            )}
            <Button 
              variant="link" 
              className="text-white p-0"
              onClick={onHide}
              style={{ fontSize: '1.5rem' }}
            >
              <X />
            </Button>
          </div>
        </div>
      </Modal.Header>
      
      <Modal.Body className="p-0 position-relative">
        <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
          {currentMedia.type === 'image' ? (
            <img
              src={currentMedia.url}
              alt={currentMedia.originalName}
              className="img-fluid"
              style={{ 
                maxWidth: '100%', 
                maxHeight: '80vh',
                objectFit: 'contain'
              }}
            />
          ) : (
            <HlsVideo
              key={currentMedia.url}
              controls
              className="w-100"
              style={{ 
                maxHeight: '80vh',
                maxWidth: '100%'
              }}
              autoPlay
              hlsSrc={currentMedia.hlsUrl}
              src={currentMedia.url}
            />
          )}
        </div>
        
        {media.length > 1 && (
          <>
            <Button
              variant="dark"
              className="position-absolute top-50 start-0 translate-middle-y ms-3 rounded-circle"
              style={{ 
                width: '50px', 
                height: '50px',
                opacity: 0.8,
                border: 'none'
              }}
              onClick={() => navigateMedia('prev')}
            >
              <ChevronLeft />
            </Button>
            
            <Button
              variant="dark"
              className="position-absolute top-50 end-0 translate-middle-y me-3 rounded-circle"
              style={{ 
                width: '50px', 
                height: '50px',
                opacity: 0.8,
                border: 'none'
              }}
              onClick={() => navigateMedia('next')}
            >
              <ChevronRight />
            </Button>
          </>
        )}
      </Modal.Body>
      
      {(currentMedia.originalName || downloadError) && (
        <Modal.Footer className="border-0 pt-0 flex-column align-items-center">
          {currentMedia.originalName && (
            <small className="text-muted">{currentMedia.originalName}</small>
          )}
          {downloadError && (
            <small className="text-danger mt-1">
              {downloadError.startsWith('mediaModal.') ? t(downloadError) : downloadError}
            </small>
          )}
        </Modal.Footer>
      )}
    </Modal>
  );
};

export default MediaModal;