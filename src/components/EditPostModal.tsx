import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Form, Tab, Tabs, Spinner, Alert } from 'react-bootstrap';
import { TypeBold, TypeItalic, TypeStrikethrough, EmojiSmile, Image, X } from 'react-bootstrap-icons';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { EMOJIS } from '../utils/emojis';
import EmojiPicker from './EmojiPicker';
import '../css/postbox.scss';
import '../css/emoji-picker.scss';
import { useTranslation } from 'react-i18next';

interface MediaFile {
  url: string;
  type: 'image' | 'video';
  originalName: string;
}

interface EditPostModalProps {
  show: boolean;
  onHide: () => void;
  onPostUpdated?: () => void;
  post: {
    id: string;
    title?: string;
    content: string;
    media?: MediaFile[];
  };
}

const EditPostModal: React.FC<EditPostModalProps> = ({ show, onHide, onPostUpdated, post }) => {
  const [content, setContent] = useState(post.content);
  const [title, setTitle] = useState(post.title || '');
  const [activeTab, setActiveTab] = useState('write');
  const [error, setError] = useState('');
  const [charCount, setCharCount] = useState(post.content.length);
  const [updating, setUpdating] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const { t } = useTranslation();
  
  const [uploadedMedia, setUploadedMedia] = useState<MediaFile[]>(post.media || []);
  const [uploading, setUploading] = useState(false);

  // Track the previous show state to detect when modal opens
  const prevShowRef = useRef(show);
  
  useEffect(() => {
    // Only reset the form state when the modal transitions from hidden to visible
    if (show && !prevShowRef.current) {
      setContent(post.content);
      setTitle(post.title || '');
      setUploadedMedia(post.media || []);
      setCharCount(post.content.length);
    }
    prevShowRef.current = show;
  }, [show, post.content, post.title, post.media]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (updating) return;

    const trimmedContent = content.trim();
    const trimmedTitle = title.trim();

    if (!trimmedContent) {
      setError(t('editPost.errors.emptyContent'));
      return;
    }

    setUpdating(true);
    setError('');

    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title: trimmedTitle || null,
          content: trimmedContent,
          media: uploadedMedia
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const serverError = typeof errorData.error === 'string' ? errorData.error : null;
        throw new Error(serverError ?? 'editPost.errors.updateFailed');
      }

      onPostUpdated?.();
      handleClose();
    } catch (error) {
      console.error('Failed to update post:', error);
      if (error instanceof Error) {
        setError(error.message.startsWith('editPost.') ? t(error.message) : error.message);
      } else {
        setError(t('editPost.errors.updateFailed'));
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleClose = () => {
    setError('');
    setActiveTab('write');
    setEmojiOpen(false);
    onHide();
  };

  const handleCancel = () => {
    setContent(post.content);
    setTitle(post.title || '');
    setUploadedMedia(post.media || []);
    setCharCount(post.content.length);
    handleClose();
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const validFiles = Array.from(files).filter(file => {
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        setError(t('editPost.errors.fileTooLarge', { file: file.name, limit: '50MB' }));
        return false;
      }
      
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      if (!isImage && !isVideo) {
        setError(t('editPost.errors.invalidType', { file: file.name }));
        return false;
      }
      
      return true;
    });

    if (validFiles.length === 0) return;

    if (uploadedMedia.length + validFiles.length > 5) {
      setError(t('editPost.errors.maxFiles', { limit: 5 }));
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
        const serverError = typeof errorData.error === 'string' ? errorData.error : null;
        if (serverError) {
          setError(serverError.startsWith('editPost.') ? t(serverError) : serverError);
        } else {
          setError(t('editPost.errors.mediaUploadFailed'));
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError(t('editPost.errors.mediaUploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const removeMedia = (index: number) => {
    setUploadedMedia(prev => prev.filter((_, i) => i !== index));
  };

  const addMarkdown = (type: string) => {
    const textarea = document.querySelector('#edit-content-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    let replacement = '';
    let newSelectionStart = start;
    let newSelectionEnd = end;

    switch (type) {
      case 'bold':
        replacement = `**${selectedText}**`;
        newSelectionStart = start + 2;
        newSelectionEnd = end + 2;
        break;
      case 'italic':
        replacement = `*${selectedText}*`;
        newSelectionStart = start + 1;
        newSelectionEnd = end + 1;
        break;
      case 'strikethrough':
        replacement = `~~${selectedText}~~`;
        newSelectionStart = start + 2;
        newSelectionEnd = end + 2;
        break;
      default:
        return;
    }

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);
    setCharCount(newContent.length);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        selectedText ? newSelectionStart : start + replacement.length,
        selectedText ? newSelectionEnd : start + replacement.length
      );
    }, 0);
  };

  const addEmoji = (emoji: { char: string; name: string }) => {
    const newContent = content + emoji.char;
    setContent(newContent);
    setCharCount(newContent.length);
    setEmojiOpen(false);
  };

  const renderPreview = () => {
    if (!content.trim()) {
      return <p className="text-muted">{t('editPost.preview.empty')}</p>;
    }

    const html = marked(content, {
      gfm: true,
      breaks: true,
    });

    return (
      <div 
        className="preview-content"
        dangerouslySetInnerHTML={{ 
          __html: DOMPurify.sanitize(html as string) 
        }} 
      />
    );
  };

  const renderMediaPreviews = () => {
    if (uploadedMedia.length === 0) return null;

    return (
      <div className="media-previews mb-3">
        <div className="media-grid">
          {uploadedMedia.map((media, index) => (
            <div key={index} className="media-item">
              <Button
                variant="outline-danger"
                size="sm"
                className="remove-media"
                onClick={() => removeMedia(index)}
                aria-label={t('editPost.media.remove')}
              >
                <X size={12} />
              </Button>
              {media.type === 'image' ? (
                <img 
                  src={media.url} 
                  alt={t('editPost.media.previewAlt')} 
                  className="media-thumbnail"
                />
              ) : (
                <video 
                  src={media.url}
                  className="media-thumbnail"
                  controls={false}
                  muted
                  preload="metadata"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Modal 
      show={show} 
      onHide={handleCancel} 
      size="lg" 
      backdrop="static"
      className="create-post-modal"
    >
      <Modal.Header closeButton>
        <Modal.Title>{t('editPost.modalTitle')}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>{t('editPost.fields.titleLabel')}</Form.Label>
            <Form.Control
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('editPost.fields.titlePlaceholder')}
              disabled={updating}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>{t('editPost.fields.contentLabel')}</Form.Label>
            
            <div className="toolbar mb-2">
              <div className="toolbar-group">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => addMarkdown('bold')}
                  title={t('editPost.toolbar.bold')}
                  disabled={updating}
                >
                  <TypeBold />
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => addMarkdown('italic')}
                  title={t('editPost.toolbar.italic')}
                  disabled={updating}
                >
                  <TypeItalic />
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => addMarkdown('strikethrough')}
                  title={t('editPost.toolbar.strikethrough')}
                  disabled={updating}
                >
                  <TypeStrikethrough />
                </Button>
              </div>
              
              <div className="toolbar-group">
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  style={{ display: 'none' }}
                  id="edit-media-upload"
                  onChange={(e) => handleFileUpload(e.target.files)}
                  disabled={updating || uploading}
                />
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => document.getElementById('edit-media-upload')?.click()}
                  disabled={updating || uploading || uploadedMedia.length >= 5}
                  title={t('editPost.toolbar.upload')}
                >
                  {uploading ? <Spinner size="sm" /> : <Image />}
                </Button>
                
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => setEmojiOpen(!emojiOpen)}
                  title={t('editPost.toolbar.emoji')}
                  disabled={updating}
                >
                  <EmojiSmile />
                </Button>
              </div>
            </div>

            {emojiOpen && (
              <EmojiPicker
                onSelect={(emojiName) => {
                  const emoji = EMOJIS.find(e => e.name === emojiName);
                  if (emoji) addEmoji(emoji);
                }}
                onClose={() => setEmojiOpen(false)}
              />
            )}

            <Tabs
              activeKey={activeTab}
              onSelect={(k) => setActiveTab(k || 'write')}
              className="mb-3"
            >
              <Tab eventKey="write" title={t('editPost.tabs.write')}>
                <Form.Control
                  as="textarea"
                  id="edit-content-textarea"
                  rows={8}
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    setCharCount(e.target.value.length);
                  }}
                  placeholder={t('editPost.fields.contentPlaceholder')}
                  disabled={updating}
                  required
                />
              </Tab>
              <Tab eventKey="preview" title={t('editPost.tabs.preview')}>
                <div className="preview-container">
                  {renderPreview()}
                </div>
              </Tab>
            </Tabs>

            <div className="char-count text-muted small">
              {t('editPost.charCount', { count: charCount })}
            </div>
          </Form.Group>

          {renderMediaPreviews()}

        </Form>
      </Modal.Body>

      <Modal.Footer>
        <Button 
          variant="secondary" 
          onClick={handleCancel}
          disabled={updating}
        >
          {t('common.cancel')}
        </Button>
        <Button 
          variant="primary" 
          onClick={handleSubmit}
          disabled={updating || !content.trim()}
        >
          {updating ? (
            <>
              <Spinner size="sm" className="me-2" />
              {t('editPost.actions.updating')}
            </>
          ) : (
            t('editPost.actions.update')
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EditPostModal;