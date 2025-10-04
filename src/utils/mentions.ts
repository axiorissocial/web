export interface MentionUser {
  id: number;
  username: string;
  displayName?: string;
  avatar?: string;
}

export const extractMentions = (content: string): string[] => {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    const username = match[1];
    if (!mentions.includes(username)) {
      mentions.push(username);
    }
  }
  
  return mentions;
};

// Cache for user validation to avoid repeated API calls
const userValidationCache = new Map<string, { isValid: boolean; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const validateUser = async (username: string): Promise<boolean> => {
  const cacheKey = username.toLowerCase();
  const cached = userValidationCache.get(cacheKey);
  
  // Check cache first
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    return cached.isValid;
  }

  try {
    const response = await fetch(`/api/users/search?q=${encodeURIComponent(username)}&limit=1`, {
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      const users = data.users || [];
      // Check for exact username match (case-insensitive)
      const isValid = users.some((user: { username: string }) => 
        user.username.toLowerCase() === username.toLowerCase()
      );
      
      // Cache the result
      userValidationCache.set(cacheKey, { isValid, timestamp: Date.now() });
      return isValid;
    }
    
    // Cache negative result too
    userValidationCache.set(cacheKey, { isValid: false, timestamp: Date.now() });
    return false;
  } catch (error) {
    console.error('Error validating user:', error);
    // Don't cache errors
    return false;
  }
};

export const processMentions = async (content: string): Promise<string> => {
  if (!content || typeof content !== 'string') {
    return content;
  }

  const mentionRegex = /(^|[^\w@])@([a-zA-Z0-9_.]{1,32})\b/g;
  const mentions: { match: string; prefix: string; username: string; startIndex: number; endIndex: number; }[] = [];
  let match;

  // Extract all mentions first with their positions
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push({
      match: match[0],
      prefix: match[1] ?? '',
      username: match[2],
      startIndex: match.index,
      endIndex: match.index + match[0].length
    });
  }

  if (mentions.length === 0) {
    return content;
  }

  // Validate all mentions
  const validationPromises = mentions.map(async (mention) => {
    const isValid = await validateUser(mention.username);
    return { ...mention, isValid };
  });

  const validatedMentions = await Promise.all(validationPromises);

  // Sort by position (descending) to replace from end to start to preserve indices
  validatedMentions.sort((a, b) => b.startIndex - a.startIndex);

  // Replace mentions with validated results
  let processed = content;
  for (const mention of validatedMentions) {
    if (mention.isValid) {
      const escapedUsername = mention.username;
      const mentionLink = `<a href="/profile/${escapedUsername}" class="mention-link" data-username="${escapedUsername}">@${escapedUsername}</a>`;
      const replacement = `${mention.prefix}${mentionLink}`;
      
      // Replace by position for accuracy
      processed = processed.slice(0, mention.startIndex) + 
                 replacement + 
                 processed.slice(mention.endIndex);
    }
    // If not valid, leave as plain text (no replacement)
  }

  return processed;
};

// Synchronous version for backwards compatibility where validation isn't needed
export const processMentionsSync = (content: string): string => {
  if (!content || typeof content !== 'string') {
    return content;
  }

  const mentionRegex = /(^|[^\w@])@([a-zA-Z0-9_.]{1,32})\b/g;
  let hasMatches = false;

  const processed = content.replace(mentionRegex, (_match, prefix, username) => {
    hasMatches = true;
    const safePrefix = prefix ?? '';
    const escapedUsername = username;
    const mentionLink = `<a href="/profile/${escapedUsername}" class="mention-link" data-username="${escapedUsername}">@${escapedUsername}</a>`;
    return `${safePrefix}${mentionLink}`;
  });

  if (!hasMatches) {
    return content;
  }

  return processed;
};

export const searchUsersForMention = async (query: string): Promise<MentionUser[]> => {
  try {
    console.log('Making API call to:', `/api/users/search?q=${encodeURIComponent(query)}&limit=10`);
    const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&limit=10`, {
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('API response:', data);
      
      const users = (data.users || []).map((user: { id: number; username: string; profile?: { displayName?: string; avatar?: string } }) => ({
        id: user.id,
        username: user.username,
        displayName: user.profile?.displayName,
        avatar: user.profile?.avatar
      }));
      
      return users;
    }
    
    return [];
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
};

export const getCursorMentionContext = (element: HTMLTextAreaElement | HTMLInputElement): { 
  isMention: boolean; 
  query: string; 
  startPos: number; 
} => {
  const cursorPos = element.selectionStart || 0;
  const textBeforeCursor = element.value.substring(0, cursorPos);
  
  const lastAtIndex = textBeforeCursor.lastIndexOf('@');
  
  if (lastAtIndex === -1) {
    return { isMention: false, query: '', startPos: -1 };
  }
  
  const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
  
  if (/\s/.test(textAfterAt)) {
    return { isMention: false, query: '', startPos: -1 };
  }
  
  return {
    isMention: true,
    query: textAfterAt,
    startPos: lastAtIndex
  };
};

export const insertMention = (
  element: HTMLTextAreaElement | HTMLInputElement,
  username: string,
  startPos: number
): void => {
  const cursorPos = element.selectionStart || 0;
  const textBefore = element.value.substring(0, startPos);
  const textAfter = element.value.substring(cursorPos);
  
  const newValue = textBefore + `@${username} ` + textAfter;
  element.value = newValue;
  
  const newCursorPos = startPos + username.length + 2;
  element.setSelectionRange(newCursorPos, newCursorPos);
  
  const event = new Event('input', { bubbles: true });
  element.dispatchEvent(event);
};