import React, { useState, useEffect, useRef } from 'react';
import { Button, Tab, Tabs, Form, Alert, InputGroup, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import twemoji from 'twemoji';
import {
  CameraVideo,
  TypeBold,
  TypeItalic,
  TypeUnderline,
  Hash,
  EmojiSmile,
  Upload,
  X,
} from 'react-bootstrap-icons';
import EmojiPicker from '../components/EmojiPicker';
import MentionTextarea from '../components/MentionTextarea';
import Sidebar from '../components/singles/Navbar';
import { EMOJIS } from '../utils/emojis';
import { processMentions } from '../utils/mentions';
import '../css/postbox.scss';
import '../css/mentions.scss';

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setCharCount(content.length);
  }, [content]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if (uploadedMedia.length + files.length > 5) {
      setError('Maximum 5 media files allowed');
      return;
    }

    setUploading(true);
    setError('');

    try {
      for (const file of Array.from(files)) {
        if (file.size > 50 * 1024 * 1024) {
          setError(`File ${file.name} is too large. Maximum size is 50MB.`);
          continue;
        }

        const formData = new FormData();
        formData.append('media', file);

        const response = await fetch('/api/posts/upload', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        if (response.ok) {
          const { url } = await response.json();
          const mediaItem: MediaItem = {
            url,
            type: file.type.startsWith('video/') ? 'video' : 'image',
            originalName: file.name,
            size: file.size
          };
          setUploadedMedia(prev => [...prev, mediaItem]);
        } else {
          const errorData = await response.json();
          setError(errorData.message || `Failed to upload ${file.name}`);
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError('Failed to upload media files');
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

  const insertAtCursor = (before: string, after: string = '') => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    
    const newText = text.substring(0, start) + before + selectedText + after + text.substring(end);
    setContent(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  const insertEmoji = (emoji: any) => {
    const emojiText = emoji.native || emoji.shortcodes || emoji;
    insertAtCursor(emojiText);
    setEmojiOpen(false);
  };

  const processText = (text: string): string => {
    // Process emoji shortcuts only
    return text.replace(/:([a-z0-9_]+):/gi, (_, name) => {
      const emoji = EMOJIS.find(e => e.name.toLowerCase() === name.toLowerCase());
      return emoji ? emoji.char : `:${name}:`;
    });
  };

  const handlePost = async () => {
    if (content.length === 0 || content.length > 1000) return;
    
    setPosting(true);
    setError('');

    try {
      // Just process emojis, keep mentions as plain text
      const processedContent = processText(content);
      
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          content: processedContent,
          title: title || null,
          media: uploadedMedia
        }),
      });

      if (response.ok) {
        // Navigate back to previous page and refresh
        window.dispatchEvent(new CustomEvent('postCreated'));
        navigate(-1);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      setError('Network error. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  // For preview, show processed mentions
  const previewText = processText(content);
  const processedPreview = processMentions(previewText);
  const markedHtml = marked(processedPreview) as string;
  const processedWithEmojis = twemoji.parse(markedHtml, {
    folder: 'svg',
    ext: '.svg',
    className: 'twemoji-emoji'
  });
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
            <h1>Create Post</h1>
            <p className="text-muted mb-0">Share your thoughts with the community</p>
          </div>
          <Button 
            variant="primary"
            onClick={handlePost} 
            disabled={content.length === 0 || content.length > 1000 || posting}
            className="create-post-submit"
          >
            {posting ? <Spinner size="sm" className="me-2" /> : null}
            {posting ? 'Posting...' : 'Post'}
          </Button>
        </div>

        <div className="create-post-content">
          {error && <Alert variant="danger">{error}</Alert>}
          
          <InputGroup className="mb-3 flex-wrap">
            <Button variant="outline-secondary" onClick={() => insertAtCursor('**', '**')} disabled={toolbarDisabled}>
              <TypeBold />
            </Button>
            <Button variant="outline-secondary" onClick={() => insertAtCursor('*', '*')} disabled={toolbarDisabled}>
              <TypeItalic />
            </Button>
            <Button variant="outline-secondary" onClick={() => insertAtCursor('__', '__')} disabled={toolbarDisabled}>
              <TypeUnderline />
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

          {emojiOpen && (
            <div className="mb-3">
              <EmojiPicker
                onSelect={insertEmoji}
                onClose={() => setEmojiOpen(false)}
              />
            </div>
          )}

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
                <MentionTextarea
                  value={content}
                  onChange={setContent}
                  placeholder="What's on your mind? (supports Markdown formatting and @mentions)"
                  rows={8}
                  maxLength={1000}
                />
              </Tab>
              <Tab eventKey="preview" title="Preview">
                <div
                  className="markdown-content p-3 border rounded"
                  style={{ minHeight: '200px', fontSize: '1em' }}
                  dangerouslySetInnerHTML={{ __html: sanitizedPreview }}
                />
              </Tab>
            </Tabs>
            <div className="d-flex justify-content-between align-items-center">
              <div className="text-muted">
                <small>{charCount}/1000 characters</small>
              </div>
              <Button 
                variant="outline-secondary"
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>
            </div>
          </Form>
        </div>
      </main>
    </div>
  );
};

export default CreatePostPage;