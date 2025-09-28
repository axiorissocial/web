import React, { useState, useRef, useCallback } from 'react';
import { Form } from 'react-bootstrap';
import MentionAutocomplete from './MentionAutocomplete';
import { getCursorMentionContext } from '../utils/mentions';
import type { MentionUser } from '../utils/mentions';

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  className?: string;
  disabled?: boolean;
}

const MentionTextarea: React.FC<MentionTextareaProps> = ({
  value,
  onChange,
  placeholder,
  rows = 3,
  maxLength,
  className = '',
  disabled = false
}) => {
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartPos, setMentionStartPos] = useState(-1);
  const [autocompletePosition, setAutocompletePosition] = useState({ top: 0, left: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const calculateAutocompletePosition = useCallback((textarea: HTMLTextAreaElement, cursorPos: number) => {
    // Create a temporary div to measure text
    const div = document.createElement('div');
    const style = window.getComputedStyle(textarea);
    
    // Copy textarea styles to div
    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.whiteSpace = 'pre-wrap';
    div.style.wordWrap = 'break-word';
    div.style.fontFamily = style.fontFamily;
    div.style.fontSize = style.fontSize;
    div.style.lineHeight = style.lineHeight;
    div.style.padding = style.padding;
    div.style.border = style.border;
    div.style.width = `${textarea.offsetWidth}px`;
    
    // Get text up to cursor position
    const textBeforeCursor = textarea.value.substring(0, cursorPos);
    div.textContent = textBeforeCursor;
    
    document.body.appendChild(div);
    
    const textRect = div.getBoundingClientRect();
    
    document.body.removeChild(div);
    
    // Calculate position relative to textarea
    const top = textRect.height + 25; // Add some offset below the current line
    const left = 0; // Align to left of textarea for simplicity
    
    return { top, left };
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Check for mention context
    const mentionContext = getCursorMentionContext(e.target);
    
    if (mentionContext.isMention && mentionContext.query.length >= 0) {
      setMentionQuery(mentionContext.query);
      setMentionStartPos(mentionContext.startPos);
      setShowAutocomplete(true);
      
      // Calculate autocomplete position
      const position = calculateAutocompletePosition(e.target, e.target.selectionStart || 0);
      setAutocompletePosition(position);
    } else {
      setShowAutocomplete(false);
      setMentionQuery('');
      setMentionStartPos(-1);
    }
  }, [onChange, calculateAutocompletePosition]);

  const handleMentionSelect = useCallback((user: MentionUser) => {
    console.log('Selecting user:', user, 'at position:', mentionStartPos);
    if (textareaRef.current && mentionStartPos >= 0) {
      const textarea = textareaRef.current;
      const cursorPos = textarea.selectionStart || 0;
      const textBefore = value.substring(0, mentionStartPos);
      const textAfter = value.substring(cursorPos);
      
      const newValue = textBefore + `@${user.username} ` + textAfter;
      console.log('New value:', newValue);
      onChange(newValue);
      
      setShowAutocomplete(false);
      setMentionQuery('');
      setMentionStartPos(-1);
      
      // Focus back to textarea and set cursor position
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = mentionStartPos + user.username.length + 2;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  }, [mentionStartPos, value, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Let MentionAutocomplete handle navigation keys when visible
    if (showAutocomplete && ['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(e.key)) {
      e.preventDefault();
      return;
    }
  };

  const handleBlur = () => {
    // Delay hiding to allow click on autocomplete
    setTimeout(() => {
      setShowAutocomplete(false);
    }, 300);
  };

  return (
    <div className="position-relative">
      <Form.Control
        ref={textareaRef}
        as="textarea"
        rows={rows}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        maxLength={maxLength}
        className={className}
        disabled={disabled}
      />
      
      <MentionAutocomplete
        show={showAutocomplete}
        query={mentionQuery}
        onSelect={handleMentionSelect}
        position={autocompletePosition}
      />
    </div>
  );
};

export default MentionTextarea;