// Utility functions for handling user mentions

export interface MentionUser {
  id: number;
  username: string;
  displayName?: string;
  avatar?: string;
}

// Parse content and extract mentions
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

// Convert @mentions to clickable links
export const processMentions = (content: string): string => {
  // Simple regex replacement of @username with HTML links
  const mentionRegex = /@(\w+)/g;
  return content.replace(mentionRegex, '<a href="/profile/@$1" class="mention-link" data-username="$1">@$1</a>');
};

// Search users for mention autocomplete
export const searchUsersForMention = async (query: string): Promise<MentionUser[]> => {
  try {
    console.log('Making API call to:', `/api/users/search?q=${encodeURIComponent(query)}&limit=10`);
    const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&limit=10`, {
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('API response:', data);
      
      // Transform the API response to match our MentionUser interface
      const users = (data.users || []).map((user: any) => ({
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

// Get current cursor position for mention detection
export const getCursorMentionContext = (element: HTMLTextAreaElement | HTMLInputElement): { 
  isMention: boolean; 
  query: string; 
  startPos: number; 
} => {
  const cursorPos = element.selectionStart || 0;
  const textBeforeCursor = element.value.substring(0, cursorPos);
  
  // Find the last @ symbol before cursor
  const lastAtIndex = textBeforeCursor.lastIndexOf('@');
  
  if (lastAtIndex === -1) {
    return { isMention: false, query: '', startPos: -1 };
  }
  
  // Check if there's any space between @ and cursor
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

// Insert mention into text at cursor position
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
  
  // Set cursor position after the inserted mention
  const newCursorPos = startPos + username.length + 2; // +2 for @ and space
  element.setSelectionRange(newCursorPos, newCursorPos);
  
  // Dispatch input event to trigger React state updates
  const event = new Event('input', { bubbles: true });
  element.dispatchEvent(event);
};