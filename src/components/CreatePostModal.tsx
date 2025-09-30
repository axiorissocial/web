import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Tab, Tabs, Form, Alert, InputGroup, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import twemoji from 'twemoji';
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
import '../css/postbox.scss';

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
        setError(`File ${file.name} is too large (max 50MB)`);
        return false;
      }
      
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      if (!isImage && !isVideo) {
        setError(`File ${file.name} is not a valid image or video`);
        return false;
      }
      
      return true;
    });

    if (validFiles.length === 0) return;

    if (uploadedMedia.length + validFiles.length > 5) {
      setError('Maximum 5 media files allowed per post');
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
              reject(new Error(errorData.error || 'Upload failed'));
            }
          }
        };
        
        xhr.onerror = () => reject(new Error('Network error'));
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
      setError(error instanceof Error ? error.message : 'Failed to upload media files');
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
        setError(data.message || 'Failed to create post');
      }
    } catch (err) {
      setError('An error occurred while creating the post');
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
          <h6>Uploading Files:</h6>
          {uploadProgress.map((progress, index) => (
            <div key={index} className="mb-2">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <small className="text-muted">{progress.fileName}</small>
                <small className={`text-${
                  progress.status === 'complete' ? 'success' :
                  progress.status === 'error' ? 'danger' :
                  progress.status === 'processing' ? 'warning' : 'primary'
                }`}>
                  {progress.status === 'uploading' ? `${progress.progress}%` :
                   progress.status === 'processing' ? 'Processing...' :
                   progress.status === 'complete' ? 'Complete' : 'Error'}
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
          <h6>Attached Media ({uploadedMedia.length}/5):</h6>
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
                      Video
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
            placeholder="Title (optional)"
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
          <Tab eventKey="write" title="Write">
            <Form.Control
              as="textarea"
              rows={6}
              ref={textareaRef}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Enter your post content (supports Markdown) here..."
              maxLength={1000}
            />
          </Tab>
          <Tab eventKey="preview" title="Preview">
            <div
              className="markdown-content p-2 border rounded"
              style={{ fontSize: '1em' }}
              dangerouslySetInnerHTML={{ __html: sanitizedPreview }}
            />
          </Tab>
        </Tabs>
        <div className="text-end form-text">{charCount}/1000</div>
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
          <h5 className="mb-0 flex-grow-1">Create Post</h5>
          <Button 
            variant="primary" 
            size="sm"
            onClick={handlePost} 
            disabled={content.length === 0 || content.length > 1000 || posting || uploading}
          >
            {uploading ? <><Spinner size="sm" className="me-2" />Uploading...</> : posting ? <Spinner size="sm" /> : 'Post'}
          </Button>
        </div>
        <div className="create-post-body p-3" style={{ height: 'calc(100vh - 80px)', overflowY: 'auto' }}>
          {/* Upload Progress Indicators - prominent for mobile */}
          {uploadProgress.length > 0 && (
            <div className="mb-3">
              <h6>Uploading Files:</h6>
              {uploadProgress.map((progress, index) => (
                <div key={index} className="mb-2">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <small className="text-muted">{progress.fileName}</small>
                    <small className={`text-${
                      progress.status === 'complete' ? 'success' :
                      progress.status === 'error' ? 'danger' :
                      progress.status === 'processing' ? 'warning' : 'primary'
                    }`}>
                      {progress.status === 'uploading' ? `${progress.progress}%` :
                       progress.status === 'processing' ? 'Processing...' :
                       progress.status === 'complete' ? 'Complete' : 'Error'}
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
        <Modal.Title>Create Post</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {uploadProgress.length > 0 && (
          <div className="mb-3">
            <h6>Uploading Files:</h6>
            {uploadProgress.map((progress, index) => (
              <div key={index} className="mb-2">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <small className="text-muted">{progress.fileName}</small>
                  <small className={`text-${
                    progress.status === 'complete' ? 'success' :
                    progress.status === 'error' ? 'danger' :
                    progress.status === 'processing' ? 'warning' : 'primary'
                  }`}>
                    {progress.status === 'uploading' ? `${progress.progress}%` :
                     progress.status === 'processing' ? 'Processing...' :
                     progress.status === 'complete' ? 'Complete' : 'Error'}
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
        <Button variant="secondary" onClick={handleHide}>Cancel</Button>
        <Button 
          variant="primary" 
          onClick={handlePost} 
          disabled={content.length === 0 || content.length > 1000 || posting || uploading}
        >
          {uploading ? <><Spinner size="sm" className="me-2" />Uploading...</> : posting ? <Spinner size="sm" /> : 'Post'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default CreatePostModal;
