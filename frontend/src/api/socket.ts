import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let socketToken: string | null = null;

const getSocketUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  try {
    const parsedUrl = new URL(apiUrl, window.location.origin);
    const socketPath = parsedUrl.pathname.replace(/\/api\/?$/, '');
    return `${parsedUrl.origin}${socketPath}`;
  } catch {
    return apiUrl.replace(/\/api\/?$/, '');
  }
};

// Track active listeners to prevent duplicates
const listeners = new Map<string, Set<Function>>();

const rebindListeners = () => {
  if (!socket) {
    return;
  }

  const currentSocket = socket;

  listeners.forEach((callbackSet, eventName) => {
    callbackSet.forEach((callback) => {
      currentSocket.on(eventName, callback as (...args: unknown[]) => void);
    });
  });
};

interface MessageEvent {
  _id: string;
  auctionId: string;
  sender: {
    _id: string;
    name: string;
    email: string;
  };
  recipient: {
    _id: string;
    name: string;
    email: string;
  };
  content: string;
  createdAt: string;
  messageType: 'text' | 'system';
}

interface TypingEvent {
  userId: string;
  isTyping: boolean;
}

interface UserStatusEvent {
  userId: string;
  status: 'online' | 'offline';
}

export const initSocket = (token: string): Socket => {
  if (socket && socketToken === token) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
    socketToken = null;
  }

  const socketUrl = getSocketUrl();
  
  socket = io(socketUrl, {
    auth: {
      token: token
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    transports: ['websocket', 'polling']
  });
  socketToken = token;

  rebindListeners();

  socket.on('connect', () => {
    console.log('Connected to WebSocket server');
  });

  socket.on('connect_error', (error) => {
    console.error('WebSocket connection error:', error);
  });

  socket.on('disconnect', (reason) => {
    console.log('Disconnected from WebSocket server:', reason);
  });

  socket.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  return socket;
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    socketToken = null;
    listeners.clear();
  }
};

// Message events
export const joinAuction = (auctionId: string) => {
  if (socket) {
    socket.emit('join_auction', auctionId);
  }
};

export const leaveAuction = (auctionId: string) => {
  if (socket) {
    socket.emit('leave_auction', auctionId);
  }
};

export const joinGem = (gemId: string) => {
  if (socket) {
    socket.emit('join_gem', gemId);
  }
};

export const leaveGem = (gemId: string) => {
  if (socket) {
    socket.emit('leave_gem', gemId);
  }
};

export const sendMessage = (auctionId: string | undefined, recipientId: string, content: string, gemId?: string | undefined) => {
  if (socket) {
    socket.emit('send_message', {
      auctionId: auctionId || undefined,
      gemId: gemId || undefined,
      recipientId,
      content
    });
  }
};

export const onReceiveMessage = (callback: (message: MessageEvent) => void) => {
  if (socket) {
    // Prevent duplicate listeners for same callback
    if (!listeners.has('receive_message')) {
      listeners.set('receive_message', new Set());
    }
    
    const callbackSet = listeners.get('receive_message')!;
    if (!callbackSet.has(callback)) {
      callbackSet.add(callback);
      socket.on('receive_message', callback);
    }
  }
};

export const onNewMessageNotification = (callback: (data: { auctionId: string; senderId: string; preview: string }) => void) => {
  if (socket) {
    if (!listeners.has('new_message_notification')) {
      listeners.set('new_message_notification', new Set());
    }
    
    const callbackSet = listeners.get('new_message_notification')!;
    if (!callbackSet.has(callback)) {
      callbackSet.add(callback);
      socket.on('new_message_notification', callback);
    }
  }
};

export const setUserTyping = (auctionId: string, isTyping: boolean) => {
  if (socket) {
    socket.emit('user_typing', {
      auctionId,
      isTyping
    });
  }
};

export const onUserTyping = (callback: (data: TypingEvent) => void) => {
  if (socket) {
    if (!listeners.has('user_typing')) {
      listeners.set('user_typing', new Set());
    }
    
    const callbackSet = listeners.get('user_typing')!;
    if (!callbackSet.has(callback)) {
      callbackSet.add(callback);
      socket.on('user_typing', callback);
    }
  }
};

export const markMessagesAsRead = (auctionId: string, senderId: string) => {
  if (socket) {
    socket.emit('mark_as_read', {
      auctionId,
      senderId
    });
  }
};

export const onMessagesRead = (callback: (data: { recipientId: string; senderId: string }) => void) => {
  if (socket) {
    if (!listeners.has('messages_read')) {
      listeners.set('messages_read', new Set());
    }
    
    const callbackSet = listeners.get('messages_read')!;
    if (!callbackSet.has(callback)) {
      callbackSet.add(callback);
      socket.on('messages_read', callback);
    }
  }
};

export const onUserInChat = (callback: (data: UserStatusEvent) => void) => {
  if (socket) {
    if (!listeners.has('user_in_chat')) {
      listeners.set('user_in_chat', new Set());
    }
    
    const callbackSet = listeners.get('user_in_chat')!;
    if (!callbackSet.has(callback)) {
      callbackSet.add(callback);
      socket.on('user_in_chat', callback);
    }
  }
};

export const onUserOnline = (callback: (data: { userId: string }) => void) => {
  if (socket) {
    if (!listeners.has('user_online')) {
      listeners.set('user_online', new Set());
    }
    
    const callbackSet = listeners.get('user_online')!;
    if (!callbackSet.has(callback)) {
      callbackSet.add(callback);
      socket.on('user_online', callback);
    }
  }
};

export const onUserOffline = (callback: (data: { userId: string }) => void) => {
  if (socket) {
    if (!listeners.has('user_offline')) {
      listeners.set('user_offline', new Set());
    }
    
    const callbackSet = listeners.get('user_offline')!;
    if (!callbackSet.has(callback)) {
      callbackSet.add(callback);
      socket.on('user_offline', callback);
    }
  }
};

export const onActivity = (callback: (data: any) => void) => {
  if (socket) {
    if (!listeners.has('activity')) {
      listeners.set('activity', new Set());
    }

    const callbackSet = listeners.get('activity')!;
    if (!callbackSet.has(callback)) {
      callbackSet.add(callback);
      socket.on('activity', callback);
    }
  }
};

// Cleanup listeners
export const removeMessageListener = (callback: (message: MessageEvent) => void) => {
  if (socket) {
    socket.off('receive_message', callback);
    const callbackSet = listeners.get('receive_message');
    if (callbackSet) {
      callbackSet.delete(callback);
    }
  }
};

export const removeTypingListener = (callback: (data: TypingEvent) => void) => {
  if (socket) {
    socket.off('user_typing', callback);
    const callbackSet = listeners.get('user_typing');
    if (callbackSet) {
      callbackSet.delete(callback);
    }
  }
};

export const removeUserInChatListener = (callback: (data: UserStatusEvent) => void) => {
  if (socket) {
    socket.off('user_in_chat', callback);
    const callbackSet = listeners.get('user_in_chat');
    if (callbackSet) {
      callbackSet.delete(callback);
    }
  }
};

export const removeReadListener = () => {
  if (socket) {
    socket.off('messages_read');
    listeners.delete('messages_read');
  }
};
