import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Tab, Tabs, Form, Alert, InputGroup } from 'react-bootstrap';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import twemoji from 'twemoji';
import {
  Image,
  CameraVideo,
  TypeBold,
  TypeItalic,
  TypeUnderline,
  Hash,
  EmojiSmile,
} from 'react-bootstrap-icons';
import EmojiPicker from './EmojiPicker';
import { EMOJIS } from '../utils/emojis';
import '../css/postbox.scss';

interface CreatePostModalProps {
  show: boolean;
  onHide: () => void;
  onPostCreated?: () => void;
}

const CreatePostModal: React.FC<CreatePostModalProps> = ({ show, onHide, onPostCreated }) => {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [activeTab, setActiveTab] = useState('write');
  const [error, setError] = useState('');
  const [charCount, setCharCount] = useState(0);
  const [posting, setPosting] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setCharCount(content.length);
  }, [content]);

  const handlePost = async () => {
    if (!content.trim()) return;
    setPosting(true);
    setError('');
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: content.trim(), title: title.trim() || undefined }),
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
    onHide();
  };

  const toolbarDisabled = activeTab === 'preview';

  return (
    <Modal show={show} onHide={handleHide} size="lg" backdrop="static" keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>Create Thread</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        <InputGroup className="mb-2 flex-wrap">
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
          <Button variant="outline-secondary" onClick={() => insertAtCursor('![alt text](image-url)')} disabled={toolbarDisabled}>
            <Image />
          </Button>
          <Button variant="outline-secondary" onClick={() => insertAtCursor('<video src="video-url" controls></video>')} disabled={toolbarDisabled}>
            <CameraVideo />
          </Button>
          <Button variant="outline-secondary" onClick={() => setEmojiOpen(!emojiOpen)} disabled={toolbarDisabled}>
            <EmojiSmile />
          </Button>
        </InputGroup>
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
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleHide}>Cancel</Button>
        <Button variant="primary" onClick={handlePost} disabled={content.length === 0 || content.length > 1000 || posting}>
          Post
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default CreatePostModal;
