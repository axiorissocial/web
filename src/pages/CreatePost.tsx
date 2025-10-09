import React, { useState, useEffect, useRef } from 'react';
import { Button, Tab, Tabs, Form, Alert, InputGroup, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { parseEmoji } from '../utils/twemojiConfig';
import {
  CameraVideo,
  TypeBold,
  TypeItalic,
  Hash,
  EmojiSmile,
  Upload,
  X,
} from 'react-bootstrap-icons';
import EmojiPicker from '../components/EmojiPicker';
import MentionTextarea from '../components/MentionTextarea';
import Sidebar from '../components/singles/Navbar';
import { EMOJIS } from '../utils/emojis';
import { processMentions, processMentionsSync } from '../utils/mentions';
import { useOGMeta } from '../utils/ogMeta';
import '../css/postbox.scss';
import '../css/mentions.scss';
import { useTranslation } from 'react-i18next';

interface MediaItem {
  url: string;
  type: 'image' | 'video';
  originalName: string;
  size: number;
}

const CreatePostPage: React.FC = () => {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [activeTab, setActiveTab] = useState('write');
  const [error, setError] = useState('');
  const [charCount, setCharCount] = useState(0);
  const [posting, setPosting] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.title = t('createPost.documentTitle', { app: t('app.name') });
  }, [t, i18n.language]);

  useOGMeta({
    title: t('createPost.documentTitle', { app: t('app.name') }),
    description: t('createPost.documentTitle', { app: t('app.name') }),
    type: 'website',
    url: window.location.href,
  });

  useEffect(() => {
    setCharCount(content.length);
  }, [content]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const validFiles = Array.from(files).filter(file => {
      if (file.size > 50 * 1024 * 1024) {
        setError(t('createPost.errors.fileTooLarge', { file: file.name }));
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

    try {
      const formData = new FormData();
      validFiles.forEach(file => formData.append('media', file));

      const response = await fetch('/api/posts/media', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setUploadedMedia(prev => [...prev, ...data.media]);
      } else {
        const errorData = await response.json();
        setError(errorData.error || t('createPost.errors.uploadFailed'));
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError(t('createPost.errors.uploadFailed'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeMedia = (index: number) => {
    setUploadedMedia(prev => prev.filter((_, i) => i !== index));
  };

  const insertAtCursor = (text: string) => {
    setContent(prev => prev + text);
  };

  const insertMarkdown = (before: string, after: string = '') => {
    setContent(prev => prev + before + after);
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

  const handlePost = async () => {
    if (content.length === 0 || content.length > 1000) {
      setError(t('createPost.errors.contentLength'));
      return;
    }
    
    setPosting(true);
    setError('');

    try {
      const mentionsProcessed = await processMentions(content);
      const processedContent = renderEmojisInPreview(mentionsProcessed);
      const payloadContent = content;
      
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          content: payloadContent,
          previewHtml: processedContent,
          title: title || null,
          media: uploadedMedia
        }),
      });

      if (response.ok) {
        window.dispatchEvent(new CustomEvent('postCreated'));
        navigate(-1);
      } else {
        const errorData = await response.json();
        setError(errorData.message || t('createPost.errors.createFailed'));
      }
    } catch (error) {
      console.error('Error creating post:', error);
      setError(t('createPost.errors.network'));
    } finally {
      setPosting(false);
    }
  };

  const mentionsProcessed = processMentionsSync(content);
  const previewText = renderEmojisInPreview(mentionsProcessed);
  const markedHtml = marked(previewText) as string;
  const processedWithEmojis = parseEmoji(markedHtml);
  const sanitizedPreview = DOMPurify.sanitize(processedWithEmojis, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'img', 'a', 'span'],
    ALLOWED_ATTR: ['class', 'src', 'alt', 'draggable', 'href', 'data-username'],
  });

  const toolbarDisabled = activeTab === 'preview';

  return (
    <div className="app-container">
      <Sidebar />
      <main className="create-post-main">
        <div className="create-post-header d-flex align-items-center justify-content-between mb-4">
          <div>
            <h1>{t('createPost.title')}</h1>
            <p className="text-muted mb-0">{t('createPost.subtitle')}</p>
          </div>
          <Button 
            variant="primary"
            onClick={handlePost} 
            disabled={content.length === 0 || content.length > 1000 || posting}
            className="create-post-submit"
          >
            {posting ? <Spinner size="sm" className="me-2" /> : null}
            {posting ? t('createPost.actions.postingStatus') : t('createPost.actions.submit')}
          </Button>
        </div>

        <div className="create-post-content">
          {error && <Alert variant="danger">{error}</Alert>}
          
          <InputGroup className="mb-3 flex-wrap">
            <Button variant="outline-secondary" onClick={() => insertMarkdown('**', '**')} disabled={toolbarDisabled}>
              <TypeBold />
            </Button>
            <Button variant="outline-secondary" onClick={() => insertMarkdown('*', '*')} disabled={toolbarDisabled}>
              <TypeItalic />
            </Button>
            <Button variant="outline-secondary" onClick={() => insertMarkdown('# ')} disabled={toolbarDisabled}>
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
          
          {emojiOpen && (
            <div className="emoji-picker-container-createpost">
              <EmojiPicker
                onSelect={insertEmoji}
                onClose={() => setEmojiOpen(false)}
              />
            </div>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          
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
                <MentionTextarea
                  value={content}
                  onChange={setContent}
                  placeholder={t('createPost.fields.contentPlaceholder')}
                  rows={8}
                  maxLength={1000}
                />
              </Tab>
              <Tab eventKey="preview" title={t('createPost.tabs.preview')}>
                <div
                  className="markdown-content p-3 border rounded"
                  style={{ minHeight: '200px', fontSize: '1em' }}
                  dangerouslySetInnerHTML={{ __html: sanitizedPreview }}
                />
              </Tab>
            </Tabs>
            <div className="d-flex justify-content-between align-items-center">
              <div className="text-muted">
                <small>{t('createPost.charCount', { count: charCount })}</small>
              </div>
              <Button 
                variant="outline-secondary"
                onClick={() => navigate(-1)}
              >
                {t('common.cancel')}
              </Button>
            </div>
          </Form>
        </div>
      </main>
    </div>
  );
};

export default CreatePostPage;