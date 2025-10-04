/**
 * Centralized twemoji configuration
 * Provides consistent emoji rendering across the application
 */
import twemoji from 'twemoji';

export interface TwemojiOptions {
  folder?: string;
  ext?: string;
  base?: string;
  className?: string;
  size?: string;
  callback?: (icon: string, options: any) => string;
}

// Local twemoji configuration using @twemoji/svg package
export const localTwemojiOptions: TwemojiOptions = {
  folder: 'svg',  // Keep folder for compatibility
  ext: '.svg',
  base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/',  // Use reliable CDN
  className: 'twemoji-emoji'
};

// Alternative local configuration (can be enabled when local serving is working)
export const experimentalLocalOptions: TwemojiOptions = {
  folder: '',
  ext: '.svg', 
  base: '/node_modules/@twemoji/svg/',
  className: 'twemoji-emoji'
};

// Default configuration for twemoji - now uses local assets
export const defaultTwemojiOptions: TwemojiOptions = localTwemojiOptions;

// CDN fallback configuration for when local assets fail
export const fallbackTwemojiOptions: TwemojiOptions = {
  folder: 'svg',
  ext: '.svg',
  base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/',
  className: 'twemoji-emoji'
};

/**
 * Parse text with emoji using consistent twemoji configuration
 */
export const parseEmoji = (text: string, options?: Partial<TwemojiOptions>): string => {
  const config = { ...defaultTwemojiOptions, ...options };
  
  try {
    return twemoji.parse(text, config);
  } catch (error) {
    console.warn('Twemoji parsing failed, using fallback:', error);
    // Try with fallback configuration
    try {
      return twemoji.parse(text, { ...fallbackTwemojiOptions, ...options });
    } catch (fallbackError) {
      console.error('Twemoji fallback also failed:', fallbackError);
      return text; // Return original text if all else fails
    }
  }
};

/**
 * Simplified emoji parsing for components
 */
export const getEmojiHtml = (emoji: string): string => {
  return parseEmoji(emoji);
};