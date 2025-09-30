export type MediaType = 'image' | 'video';

export interface NormalizedMediaItem {
  url: string;
  hlsUrl?: string;
  type: MediaType;
  originalName: string;
  size: number;
  sourceIndex: number;
}

const inferTypeFromExtension = (url: string, fallback: MediaType = 'image'): MediaType => {
  const cleaned = url.split('?')[0]?.toLowerCase() ?? '';
  const extension = cleaned.includes('.') ? cleaned.substring(cleaned.lastIndexOf('.') + 1) : '';

  if (!extension) {
    return fallback;
  }

  const videoExtensions = new Set([
    'mp4',
    'webm',
    'ogg',
    'ogv',
    'mov',
    'mkv',
    'avi',
    'm4v',
    '3gp'
  ]);

  return videoExtensions.has(extension) ? 'video' : fallback;
};

const sanitizeUrl = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return null;
};

const extractNameFromUrl = (url: string): string => {
  const withoutQuery = url.split('?')[0];
  const segments = withoutQuery.split('/').filter(Boolean);
  if (segments.length === 0) {
    return url;
  }
  return decodeURIComponent(segments[segments.length - 1]);
};

const normalizeSingleMedia = (entry: unknown, sourceIndex: number): NormalizedMediaItem | null => {
  if (!entry) {
    return null;
  }

  if (typeof entry === 'string') {
    const url = sanitizeUrl(entry);
    if (!url) {
      return null;
    }

    const type = inferTypeFromExtension(url);
    return {
      url,
      type,
      hlsUrl: undefined,
      originalName: extractNameFromUrl(url),
      size: 0,
      sourceIndex,
    };
  }

  if (typeof entry === 'object') {
    const candidate = entry as Record<string, unknown>;
    const url = sanitizeUrl(candidate.url ?? candidate.src ?? candidate.path ?? candidate.mediaUrl);
    const hlsUrl = sanitizeUrl(candidate.hlsUrl ?? candidate.hls ?? candidate.streamUrl ?? candidate.m3u8Url ?? candidate.m3u8);

    if (!url && !hlsUrl) {
      return null;
    }

    const resolvedUrl = url ?? hlsUrl!;
    const rawType = typeof candidate.type === 'string' ? candidate.type.toLowerCase() : undefined;
    let type: MediaType;

    if (rawType === 'video') {
      type = 'video';
    } else if (rawType === 'image') {
      type = 'image';
    } else if (rawType?.includes('video')) {
      type = 'video';
    } else {
      type = inferTypeFromExtension(resolvedUrl, hlsUrl ? 'video' : 'image');
    }

    const originalNameValue = candidate.originalName ?? candidate.name ?? candidate.filename ?? candidate.title;
    const originalName = typeof originalNameValue === 'string' && originalNameValue.trim().length > 0
      ? originalNameValue.trim()
      : extractNameFromUrl(resolvedUrl);

    const sizeValue = candidate.size ?? candidate.fileSize;
    const size = typeof sizeValue === 'number' && Number.isFinite(sizeValue) ? sizeValue : 0;

    const normalized: NormalizedMediaItem = {
      url: resolvedUrl,
      hlsUrl: hlsUrl ?? undefined,
      type,
      originalName,
      size,
      sourceIndex,
    };

    if (typeof candidate.sourceIndex === 'number' && Number.isInteger(candidate.sourceIndex)) {
      normalized.sourceIndex = candidate.sourceIndex;
    }

    return normalized;
  }

  return null;
};

export const normalizeMediaItems = (input: unknown): NormalizedMediaItem[] => {
  if (!Array.isArray(input)) {
    return [];
  }

  const normalized: NormalizedMediaItem[] = [];

  input.forEach((entry, index) => {
    const item = normalizeSingleMedia(entry, index);
    if (item) {
      normalized.push(item);
    }
  });

  return normalized;
};
