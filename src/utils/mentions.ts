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

export const processMentions = (content: string): string => {
  return content;
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