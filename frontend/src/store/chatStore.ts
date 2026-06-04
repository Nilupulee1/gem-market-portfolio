import { create } from 'zustand';

const unreadMessagesKey = 'chat-unread-count';

interface ChatState {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  incrementUnreadCount: () => void;
  resetUnreadCount: () => void;
  initChatState: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  unreadCount: 0,

  setUnreadCount: (count) => {
    const nextCount = Math.max(0, count);
    localStorage.setItem(unreadMessagesKey, String(nextCount));
    set({ unreadCount: nextCount });
  },

  incrementUnreadCount: () => {
    set((state) => {
      const nextCount = state.unreadCount + 1;
      localStorage.setItem(unreadMessagesKey, String(nextCount));
      return { unreadCount: nextCount };
    });
  },

  resetUnreadCount: () => {
    localStorage.setItem(unreadMessagesKey, '0');
    set({ unreadCount: 0 });
  },

  initChatState: () => {
    const storedCount = Number(localStorage.getItem(unreadMessagesKey) || '0');
    set({ unreadCount: Number.isFinite(storedCount) ? storedCount : 0 });
  },
}));