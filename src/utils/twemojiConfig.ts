import twemoji from 'twemoji';

export interface TwemojiOptions {
  folder?: string;
  ext?: string;
  base?: string;
  className?: string;
  size?: string;
  callback?: (icon: string, options: any) => string;
}

export const localTwemojiOptions: TwemojiOptions = {
  folder: 'svg',
  ext: '.svg',
  base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/',
  className: 'twemoji-emoji'
};

export const experimentalLocalOptions: TwemojiOptions = {
  folder: '',
  ext: '.svg', 
  base: '/node_modules/@twemoji/svg/',
  className: 'twemoji-emoji'
};

export const defaultTwemojiOptions: TwemojiOptions = localTwemojiOptions;

export const fallbackTwemojiOptions: TwemojiOptions = {
  folder: 'svg',
  ext: '.svg',
  base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/',
  className: 'twemoji-emoji'
};

export const parseEmoji = (text: string, options?: Partial<TwemojiOptions>): string => {
  const config = { ...defaultTwemojiOptions, ...options };
  
  try {
    return twemoji.parse(text, config);
  } catch (error) {
    console.warn('Twemoji parsing failed, using fallback:', error);
    try {
      return twemoji.parse(text, { ...fallbackTwemojiOptions, ...options });
    } catch (fallbackError) {
      console.error('Twemoji fallback also failed:', fallbackError);
      return text;
    }
  }
};

export const getEmojiHtml = (emoji: string): string => {
  return parseEmoji(emoji);
};