import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  EmojiSmileFill,
  PersonFill
} from 'react-bootstrap-icons';
import { EMOJIS } from '../utils/emojis';
import { parseEmoji } from '../utils/twemojiConfig';
import '../css/emoji-picker.scss';

interface EmojiPickerProps {
  onSelect: (name: string) => void;
  onClose: () => void;
}

const categories = Array.from(new Set(EMOJIS.map(e => e.category)));

const fuzzyMatch = (query: string, text: string) => {
  query = query.toLowerCase();
  text = text.toLowerCase();
  let qi = 0;
  for (let ti = 0; ti < text.length && qi < query.length; ti++) {
    if (text[ti] === query[qi]) qi++;
  }
  return qi === query.length;
};

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect, onClose }) => {
  const pickerRef = useRef<HTMLDivElement>(null);
  const [activeCategory, setActiveCategory] = useState(categories[0]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const filteredEmojis = useMemo(() => {
    if (!search.trim()) {
      return EMOJIS.filter(e => e.category === activeCategory);
    }
    return EMOJIS.filter(e => {
      if (fuzzyMatch(search, e.name)) return true;
      if (e.aliases?.some(alias => fuzzyMatch(search, alias))) return true;
      return false;
    });
  }, [search, activeCategory]);

  return (
    <div ref={pickerRef} className="emoji-picker-wrapper">
      <div className="emoji-categories">
        {categories.map(cat => (
          <button
            key={cat}
            className={`category-button ${cat === activeCategory ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat === "smiles" ? (
              <EmojiSmileFill />
            ) : cat === "people" ? (
              <PersonFill />
            ) : (
              cat
            )}
          </button>
        ))}
      </div>
      <div className="emoji-picker-container">
        <div className="emoji-grid">
          {filteredEmojis.map(emoji => (
            <button
              key={emoji.name}
              type="button"
              onClick={() => onSelect(emoji.name)}
              className="emoji-button"
            >
              <span
                dangerouslySetInnerHTML={{
                  __html: parseEmoji(emoji.char),
                }}
                className="emoji-icon"
              />
              <span className="emoji-name">:{emoji.name}:</span>
            </button>
          ))}
        </div>
        <div className="emoji-search">
          <input
            type="text"
            placeholder="Search emojis..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

export default EmojiPicker;
