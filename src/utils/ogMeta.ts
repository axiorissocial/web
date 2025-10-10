import { useEffect } from 'react';

export interface OGMetadata {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
}

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
};

export const stripFormatting = (text: string): string => {
  let stripped = text.replace(/\[([^\]]{0,500})\]\(([^)]{0,2000})\)/g, '$1');
  
  stripped = stripped.replace(/[*_~`#]/g, '');
  stripped = stripped.replace(/<[^>]*>/g, '');
  stripped = stripped.replace(/\s+/g, ' ').trim();
  
  return stripped;
};

export const updateOGMetaTags = (metadata: OGMetadata) => {
  const baseUrl = import.meta.env.FRONTEND_URL || window.location.origin;
  
  const metaTags = [
    { property: 'og:title', content: metadata.title },
    { property: 'og:description', content: metadata.description },
    { property: 'og:type', content: metadata.type || 'website' },
  ];

  if (metadata.image) {
    const imageUrl = metadata.image.startsWith('http') 
      ? metadata.image 
      : `${baseUrl}${metadata.image.startsWith('/') ? '' : '/'}${metadata.image}`;
    metaTags.push({ property: 'og:image', content: imageUrl });
  }

  const pageUrl = metadata.url || window.location.href;
  metaTags.push({ property: 'og:url', content: pageUrl });

  metaTags.forEach(({ property, content }) => {
    let element = document.querySelector(`meta[property="${property}"]`);
    
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute('property', property);
      document.head.appendChild(element);
    }
    
    element.setAttribute('content', content);
  });

  const twitterTags = [
    { name: 'twitter:card', content: metadata.image ? 'summary_large_image' : 'summary' },
    { name: 'twitter:title', content: metadata.title },
    { name: 'twitter:description', content: metadata.description },
  ];

  if (metadata.image) {
    const imageUrl = metadata.image.startsWith('http') 
      ? metadata.image 
      : `${baseUrl}${metadata.image.startsWith('/') ? '' : '/'}${metadata.image}`;
    twitterTags.push({ name: 'twitter:image', content: imageUrl });
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

export const useOGMeta = (metadata: OGMetadata) => {
  useEffect(() => {
    updateOGMetaTags(metadata);
  }, [metadata.title, metadata.description, metadata.image, metadata.url, metadata.type]);
};
