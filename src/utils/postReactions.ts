export const POST_REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '🎉'] as const;

export type PostReactionEmoji = typeof POST_REACTION_EMOJIS[number];

export interface PostReactionSummaryItem {
  emoji: PostReactionEmoji;
  count: number;
  isSelected: boolean;
}

export interface PostReactionsState {
  availableEmojis: readonly PostReactionEmoji[];
  summary: PostReactionSummaryItem[];
  totalCount: number;
  currentUserReaction: PostReactionEmoji | null;
}

export const createEmptyReactionsState = (): PostReactionsState => ({
  availableEmojis: POST_REACTION_EMOJIS,
  summary: POST_REACTION_EMOJIS.map(emoji => ({
    emoji,
    count: 0,
    isSelected: false,
  })),
  totalCount: 0,
  currentUserReaction: null,
});
