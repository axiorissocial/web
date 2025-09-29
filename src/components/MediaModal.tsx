import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { ChevronLeft, ChevronRight, X } from 'react-bootstrap-icons';
import HlsVideo from './HlsVideo';

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
}

const MediaModal: React.FC<MediaModalProps> = ({ show, onHide, media, initialIndex }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

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
            {currentMedia.type === 'image' ? 'Image' : 'Video'} {currentIndex + 1} of {media.length}
          </div>
          <Button 
            variant="link" 
            className="text-white p-0"
            onClick={onHide}
            style={{ fontSize: '1.5rem' }}
          >
            <X />
          </Button>
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
      
      {currentMedia.originalName && (
        <Modal.Footer className="border-0 pt-0 justify-content-center">
          <small className="text-muted">{currentMedia.originalName}</small>
        </Modal.Footer>
      )}
    </Modal>
  );
};

export default MediaModal;