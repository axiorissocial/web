import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Tab, Tabs, Form, Alert, InputGroup, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import twemoji from 'twemoji';
import { useTranslation } from 'react-i18next';
import {
  CameraVideo,
  TypeBold,
  TypeItalic,
  Hash,
  EmojiSmile,
  Upload,
  X,
  ArrowLeft,
} from 'react-bootstrap-icons';
import EmojiPicker from './EmojiPicker';
import { EMOJIS } from '../utils/emojis';

interface MediaItem {
  url: string;
  hlsUrl?: string;
  type: 'image' | 'video';
  originalName: string;
  size: number;
}

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
}

interface CreatePostModalProps {
  show: boolean;
  onHide: () => void;
  onPostCreated?: () => void;
  mode?: 'modal' | 'page';
}

const CreatePostModal: React.FC<CreatePostModalProps> = ({ 
  show, 
  onHide, 
  onPostCreated, 
  mode = 'modal' 
}) => {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [activeTab, setActiveTab] = useState('write');
  const [error, setError] = useState('');
  const [charCount, setCharCount] = useState(0);
  const [posting, setPosting] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState<MediaItem[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerHeight > window.innerWidth);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerHeight > window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setCharCount(content.length);
  }, [content]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter(file => {
      if (file.size > 50 * 1024 * 1024) {
        setError(t('createPost.errors.fileTooLarge', { file: file.name }));
        return false;
      }
      
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      if (!isImage && !isVideo) {
        setError(t('createPost.errors.invalidType', { file: file.name }));
        return false;
      }
      
      return true;
    });

    if (validFiles.length === 0) return;

    if (uploadedMedia.length + validFiles.length > 5) {
      setError(t('createPost.errors.maxFiles', { limit: 5 }));
      return;
    }

    setUploading(true);
    setError('');

    const initialProgress = validFiles.map(file => ({
      fileName: file.name,
      progress: 0,
      status: 'uploading' as const
    }));
    setUploadProgress(initialProgress);

    try {
      const formData = new FormData();
      validFiles.forEach(file => formData.append('media', file));
      
      const tempPostId = `temp-${Date.now()}`;
      formData.append('postId', tempPostId);

      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(prev => prev.map(item => ({
            ...item,
            progress: Math.min(progress, 90),
            status: progress < 100 ? 'uploading' : 'processing'
          })));
        }
      });

      const uploadPromise = new Promise<any>((resolve, reject) => {
        xhr.onreadystatechange = () => {
          if (xhr.readyState === XMLHttpRequest.DONE) {
            if (xhr.status === 200) {
              const data = JSON.parse(xhr.responseText);
              resolve(data);
            } else {
              const errorData = JSON.parse(xhr.responseText);
              reject(new Error(errorData.error || t('createPost.errors.uploadFailed')));
            }
          }
        };
        
        xhr.onerror = () => reject(new Error(t('createPost.errors.network')));
      });

      xhr.open('POST', '/api/posts/media');
      xhr.setRequestHeader('credentials', 'include');
      xhr.send(formData);

      const data = await uploadPromise;
      
      setUploadProgress(prev => prev.map(item => ({
        ...item,
        progress: 100,
        status: 'complete'
      })));
      
      setUploadedMedia(prev => [...prev, ...data.media]);
      
      setTimeout(() => setUploadProgress([]), 2000);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadProgress(prev => prev.map(item => ({
        ...item,
        status: 'error'
      })));
      setError(error instanceof Error ? error.message : t('createPost.errors.uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const removeMedia = (index: number) => {
    setUploadedMedia(prev => prev.filter((_, i) => i !== index));
  };

  const handlePost = async () => {
    if (!content.trim()) return;
    setPosting(true);
    setError('');
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          content: content.trim(), 
          title: title.trim() || undefined,
          media: uploadedMedia.length > 0 ? uploadedMedia : null
        }),
      });
      
      if (response.ok) {
        handleHide();
        onPostCreated?.();
      } else {
        const data = await response.json();
        setError(data.message || t('createPost.errors.createFailed'));
      }
    } catch (err) {
      setError(t('createPost.errors.createGeneric'));
    } finally {
      setPosting(false);
    }
  };

  const escapeHtml = (str: string) => str.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const insertAtCursor = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText =
      content.slice(0, start) + before + content.slice(start, end) + after + content.slice(end);
    setContent(newText);
    const cursorPos = start + before.length;
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorPos, cursorPos);
    }, 0);
  };

  const insertEmoji = (emojiName: string) => {
    insertAtCursor(`:${emojiName}:`);
    setEmojiOpen(false);
  };

  const renderEmojisInPreview = (text: string) => {
    return text.replace(/:([a-z0-9_]+):/gi, (_, name) => {
      const emoji = EMOJIS.find(e => e.name === name);
      return emoji ? emoji.char : `:${name}:`;
    });
  };

  const markedOptions = { breaks: true };
  const allowedTags = [
    'a','p','br','strong','em','ul','ol','li','code','pre',
    'blockquote','h1','h2','h3','h4','h5','h6','img','video','span'
  ];
  const allowedAttrs = ['href','title','target','rel','src','alt','class','style','height','width'];

  const mdHtml: string | HTMLElement = marked.parse(escapeHtml(renderEmojisInPreview(content)), markedOptions) as string;
  const twemojiHtml = twemoji.parse(mdHtml, {
    folder: 'svg',
    ext: '.svg',
    className: 'twemoji-emoji',
  });
  const sanitizedPreview = DOMPurify.sanitize(twemojiHtml, {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: allowedAttrs,
  });

  const handleHide = () => {
    setContent('');
    setTitle('');
    setCharCount(0);
    setError('');
    setActiveTab('write');
    setEmojiOpen(false);
    setUploadedMedia([]);
    
    if (mode === 'page' && isMobile) {
      navigate(-1);
    } else {
      onHide();
    }
  };

  const toolbarDisabled = activeTab === 'preview';
  const getStatusLabel = (progress: UploadProgress) => {
    if (progress.status === 'uploading') {
      return t('createPost.upload.status.uploading', { progress: progress.progress });
    }
    if (progress.status === 'processing') {
      return t('createPost.upload.status.processing');
    }
    if (progress.status === 'complete') {
      return t('createPost.upload.status.complete');
    }
    return t('createPost.upload.status.error');
  };

  const PostCreatorContent = () => (
    <>
      {error && <Alert variant="danger">{error}</Alert>}
      <InputGroup className="mb-2 flex-wrap">
        <Button variant="outline-secondary" onClick={() => insertAtCursor('**', '**')} disabled={toolbarDisabled}>
          <TypeBold />
        </Button>
        <Button variant="outline-secondary" onClick={() => insertAtCursor('*', '*')} disabled={toolbarDisabled}>
          <TypeItalic />
        </Button>
        <Button variant="outline-secondary" onClick={() => insertAtCursor('# ')} disabled={toolbarDisabled}>
          <Hash />
        </Button>
        <Button 
          variant="outline-secondary" 
          onClick={() => fileInputRef.current?.click()} 
          disabled={toolbarDisabled || uploading}
        >
          {uploading ? <Spinner size="sm" /> : <Upload />}
        </Button>
        <Button variant="outline-secondary" onClick={() => setEmojiOpen(!emojiOpen)} disabled={toolbarDisabled}>
          <EmojiSmile />
        </Button>
      </InputGroup>
      
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      
      {/* Upload Progress Indicators */}
      {uploadProgress.length > 0 && (
        <div className="mb-3">
          <h6>{t('createPost.upload.heading')}</h6>
          {uploadProgress.map((progress, index) => (
            <div key={index} className="mb-2">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <small className="text-muted">{progress.fileName}</small>
                <small className={`text-${
                  progress.status === 'complete' ? 'success' :
                  progress.status === 'error' ? 'danger' :
                  progress.status === 'processing' ? 'warning' : 'primary'
                }`}>
                  {getStatusLabel(progress)}
                </small>
              </div>
              <div className="progress" style={{ height: '4px' }}>
                <div 
                  className={`progress-bar ${
                    progress.status === 'complete' ? 'bg-success' :
                    progress.status === 'error' ? 'bg-danger' :
                    progress.status === 'processing' ? 'bg-warning' : 'bg-primary'
                  }`}
                  style={{ width: `${progress.progress}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {uploadedMedia.length > 0 && (
        <div className="mb-3">
          <h6>{t('createPost.upload.attached', { count: uploadedMedia.length, limit: 5 })}</h6>
          <div className="d-flex flex-wrap gap-2">
            {uploadedMedia.map((media, index) => (
              <div key={index} className="position-relative" style={{ maxWidth: '100px' }}>
                {media.type === 'image' ? (
                  <img 
                    src={media.url} 
                    alt={media.originalName}
                    className="img-thumbnail"
                    style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                  />
                ) : (
                  <div className="d-flex align-items-center justify-content-center bg-light border rounded" 
                       style={{ width: '100px', height: '100px' }}>
                    <CameraVideo size={24} />
                    <small className="position-absolute bottom-0 start-0 p-1 bg-dark text-white small">
                      {t('createPost.upload.videoLabel')}
                    </small>
                  </div>
                )}
                <Button
                  variant="danger"
                  size="sm"
                  className="position-absolute top-0 end-0 p-1"
                  onClick={() => removeMedia(index)}
                  style={{ transform: 'translate(50%, -50%)' }}
                >
                  <X size={12} />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {emojiOpen && <EmojiPicker onSelect={insertEmoji} onClose={() => setEmojiOpen(false)} />}

      <Form>
        <Form.Group className="mb-3">
          <Form.Control
            type="text"
            placeholder={t('createPost.fields.titlePlaceholder')}
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={100}
          />
        </Form.Group>
        <Tabs
          activeKey={activeTab}
          onSelect={tab => setActiveTab(tab || 'write')}
          className="mb-3"
        >
          <Tab eventKey="write" title={t('createPost.tabs.write')}>
            <Form.Control
              as="textarea"
              rows={6}
              ref={textareaRef}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={t('createPost.fields.contentPlaceholder')}
              maxLength={1000}
            />
          </Tab>
          <Tab eventKey="preview" title={t('createPost.tabs.preview')}>
            <div
              className="markdown-content p-2 border rounded"
              style={{ fontSize: '1em' }}
              dangerouslySetInnerHTML={{ __html: sanitizedPreview }}
            />
          </Tab>
        </Tabs>
        <div className="text-end form-text">{t('createPost.charCount', { count: charCount })}</div>
      </Form>
    </>
  );

  if (isMobile && show) {
    return (
      <div className="create-post-page position-fixed w-100 h-100" style={{ top: 0, left: 0, zIndex: 1050, backgroundColor: 'var(--bg-primary)' }}>
        <div className="create-post-header d-flex align-items-center p-3 border-bottom">
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={handleHide}
            className="me-3"
          >
            <ArrowLeft />
          </Button>
          <h5 className="mb-0 flex-grow-1">{t('createPost.mobileTitle')}</h5>
          <Button 
            variant="primary" 
            size="sm"
            onClick={handlePost} 
            disabled={content.length === 0 || content.length > 1000 || posting || uploading}
          >
            {uploading ? (
              <>
                <Spinner size="sm" className="me-2" />
                {t('createPost.actions.uploading')}
              </>
            ) : posting ? (
              <Spinner size="sm" />
            ) : (
              t('createPost.actions.submit')
            )}
          </Button>
        </div>
        <div className="create-post-body p-3" style={{ height: 'calc(100vh - 80px)', overflowY: 'auto' }}>
          {/* Upload Progress Indicators - prominent for mobile */}
          {uploadProgress.length > 0 && (
            <div className="mb-3">
              <h6>{t('createPost.upload.heading')}</h6>
              {uploadProgress.map((progress, index) => (
                <div key={index} className="mb-2">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <small className="text-muted">{progress.fileName}</small>
                    <small className={`text-${
                      progress.status === 'complete' ? 'success' :
                      progress.status === 'error' ? 'danger' :
                      progress.status === 'processing' ? 'warning' : 'primary'
                    }`}>
                      {getStatusLabel(progress)}
                    </small>
                  </div>
                  <div className="progress" style={{ height: '6px' }}>
                    <div 
                      className={`progress-bar ${
                        progress.status === 'complete' ? 'bg-success' :
                        progress.status === 'error' ? 'bg-danger' :
                        progress.status === 'processing' ? 'bg-warning' : 'bg-primary'
                      }`}
                      style={{ width: `${progress.progress}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <PostCreatorContent />
        </div>
      </div>
    );
  }

  return (
    <Modal show={show} onHide={handleHide} centered size="lg" className="create-post-modal">
      <Modal.Header closeButton>
        <Modal.Title>{t('createPost.title')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {uploadProgress.length > 0 && (
          <div className="mb-3">
            <h6>{t('createPost.upload.heading')}</h6>
            {uploadProgress.map((progress, index) => (
              <div key={index} className="mb-2">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <small className="text-muted">{progress.fileName}</small>
                  <small className={`text-${
                    progress.status === 'complete' ? 'success' :
                    progress.status === 'error' ? 'danger' :
                    progress.status === 'processing' ? 'warning' : 'primary'
                  }`}>
                    {getStatusLabel(progress)}
                  </small>
                </div>
                <div className="progress" style={{ height: '6px' }}>
                  <div 
                    className={`progress-bar ${
                      progress.status === 'complete' ? 'bg-success' :
                      progress.status === 'error' ? 'bg-danger' :
                      progress.status === 'processing' ? 'bg-warning' : 'bg-primary'
                    }`}
                    style={{ width: `${progress.progress}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}
        <PostCreatorContent />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleHide}>{t('createPost.actions.cancel')}</Button>
        <Button 
          variant="primary" 
          onClick={handlePost} 
          disabled={content.length === 0 || content.length > 1000 || posting || uploading}
        >
          {uploading ? (
            <>
              <Spinner size="sm" className="me-2" />
              {t('createPost.actions.uploading')}
            </>
          ) : posting ? (
            <Spinner size="sm" />
          ) : (
            t('createPost.actions.submit')
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default CreatePostModal;
