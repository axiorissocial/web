import { useEffect } from 'react';

export default function usePageMeta({ title, description }: { title?: string; description?: string }) {
  useEffect(() => {
    const prevTitle = document.title;
    const prevDescription = document.querySelector("meta[name='description']")?.getAttribute('content');

    if (title) document.title = title;
    if (description) {
      let meta = document.querySelector("meta[name='description']") as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'description';
        document.head.appendChild(meta);
      }
      meta.content = description;
    }

    return () => {
      document.title = prevTitle;
      if (description) {
        const meta = document.querySelector("meta[name='description']") as HTMLMetaElement | null;
        if (meta) meta.setAttribute('content', prevDescription ?? '');
      }
    };
  }, [title, description]);
}
