import { useEffect } from 'react';

export interface OGMetadata {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
}

/**
 * Truncates text to a specified length, trying to break at word boundaries
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
};

/**
 * Strips HTML tags and markdown from text
 */
export const stripFormatting = (text: string): string => {
  // Remove markdown links [text](url)
  let stripped = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  
  // Remove markdown formatting
  stripped = stripped.replace(/[*_~`#]/g, '');
  
  // Remove HTML tags
  stripped = stripped.replace(/<[^>]*>/g, '');
  
  // Normalize whitespace
  stripped = stripped.replace(/\s+/g, ' ').trim();
  
  return stripped;
};

/**
 * Updates OG meta tags in the document head
 */
export const updateOGMetaTags = (metadata: OGMetadata) => {
  const metaTags = [
    { property: 'og:title', content: metadata.title },
    { property: 'og:description', content: metadata.description },
    { property: 'og:type', content: metadata.type || 'website' },
  ];

  if (metadata.image) {
    metaTags.push({ property: 'og:image', content: metadata.image });
  }

  if (metadata.url) {
    metaTags.push({ property: 'og:url', content: metadata.url });
  }

  metaTags.forEach(({ property, content }) => {
    let element = document.querySelector(`meta[property="${property}"]`);
    
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute('property', property);
      document.head.appendChild(element);
    }
    
    element.setAttribute('content', content);
  });

  // Also update Twitter card tags for better compatibility
  const twitterTags = [
    { name: 'twitter:card', content: metadata.image ? 'summary_large_image' : 'summary' },
    { name: 'twitter:title', content: metadata.title },
    { name: 'twitter:description', content: metadata.description },
  ];

  if (metadata.image) {
    twitterTags.push({ name: 'twitter:image', content: metadata.image });
  }

  twitterTags.forEach(({ name, content }) => {
    let element = document.querySelector(`meta[name="${name}"]`);
    
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute('name', name);
      document.head.appendChild(element);
    }
    
    element.setAttribute('content', content);
  });
};

/**
 * React hook to manage OG meta tags for a page
 */
export const useOGMeta = (metadata: OGMetadata) => {
  useEffect(() => {
    updateOGMetaTags(metadata);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metadata.title, metadata.description, metadata.image, metadata.url, metadata.type]);
};
