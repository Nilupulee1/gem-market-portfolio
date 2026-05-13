import React, { useState, useEffect, useRef } from 'react';
import { Form, Button, Spinner, Card } from 'react-bootstrap';
import { Send, Loader } from 'lucide-react';
import axiosInstance from '../../api/axios';
import {
  initSocket,
  sendMessage as emitMessage,
  joinAuction,
  leaveAuction,
  joinGem,
  leaveGem,
  onReceiveMessage,
  onUserTyping,
  markMessagesAsRead,
  onUserInChat,
  removeMessageListener,
  removeTypingListener,
  removeUserInChatListener,
  setUserTyping as emitUserTyping
} from '../../api/socket';
import { useAuthStore } from '../../store/authStore';
import './AuctionChat.css';

interface Message {
  _id: string;
  sender: {
    _id: string;
    name: string;
  };
  content: string;
  createdAt: string;
}

interface TypingUser {
  userId: string;
  isTyping: boolean;
}

interface AuctionChatProps {
  auctionId?: string;
  gemId?: string;
  conversationId?: string;
  recipientId: string;
  recipientName: string;
  gemName?: string;
  conversationLabel?: string;
}

const AuctionChat: React.FC<AuctionChatProps> = ({
  auctionId,
  gemId,
  conversationId,
  recipientId,
  recipientName,
  gemName,
  conversationLabel
}) => {
  const { user, token } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageContent, setMessageContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [userOnline, setUserOnline] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  const mergeUniqueMessages = (existingMessages: Message[], incomingMessages: Message[]) => {
    const seenIds = new Set(existingMessages.map((message) => message._id));
    const mergedMessages = [...existingMessages];

    incomingMessages.forEach((message) => {
      if (!seenIds.has(message._id)) {
        seenIds.add(message._id);
        mergedMessages.push(message);
      }
    });

    return mergedMessages;
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatDateLabel = (value: string) => {
    const date = new Date(value);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    return isToday ? 'Today' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize socket and fetch messages
  useEffect(() => {
    if (!token || !user) return;

    const fetchMessages = async () => {
      try {
        setLoading(true);
        let url = '';
        if (conversationId) {
          url = `/chat/conversation/${conversationId}`;
        } else if (auctionId) {
          url = `/chat/auction/${auctionId}`;
        } else if (gemId) {
          url = `/chat/gem/${gemId}?recipientId=${recipientId || ''}`;
        }

        if (!url) return;
        
        const response = await axiosInstance.get(url);
        const fetchedMessages = response.data.messages || [];
        setMessages((prev) => mergeUniqueMessages(prev, fetchedMessages));
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };

    initSocket(token);
    
    if (auctionId) {
      console.log('Joining auction room:', auctionId);
      joinAuction(auctionId);
    } else if (gemId) {
      console.log('Joining gem room:', gemId);
      joinGem(gemId);
    }

    fetchMessages();

    const handleNewMessage = (newMessage: Message) => {
      console.log('Received message:', newMessage);
      setMessages((prev) => {
        if (prev.some((message) => message._id === newMessage._id)) {
          return prev;
        }

        return [...prev, newMessage];
      });
      if (newMessage.sender._id !== user.id && auctionId) {
        markMessagesAsRead(auctionId, newMessage.sender._id);
      }
    };

    const handleUserTyping = (data: TypingUser) => {
      setTypingUsers((prev) => {
        const existing = prev.find((u) => u.userId === data.userId);
        if (existing) {
          return prev.map((u) => (u.userId === data.userId ? data : u));
        }
        return [...prev, data];
      });
    };

    const handleUserStatus = (data: { userId: string; status: 'online' | 'offline' }) => {
      console.log('User status:', data);
      if (data.userId === recipientId) {
        setUserOnline(data.status === 'online');
      }
    };

    console.log('Registering message listener');
    onReceiveMessage(handleNewMessage);
    onUserTyping(handleUserTyping);
    onUserInChat(handleUserStatus);

    return () => {
      if (auctionId) {
        console.log('Leaving auction room:', auctionId);
        leaveAuction(auctionId);
      } else if (gemId) {
        console.log('Leaving gem room:', gemId);
        leaveGem(gemId);
      }
      console.log('Removing message listener');
      removeMessageListener(handleNewMessage);
      removeTypingListener(handleUserTyping);
      removeUserInChatListener(handleUserStatus);
    };
  }, [auctionId, conversationId, gemId, token, user, recipientId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim() || !user) return;

    setSending(true);

    const messagePayload = {
      content: messageContent,
      recipientId,
      auctionId,
      gemId,
    };

    try {
      emitMessage(
        messagePayload.auctionId || undefined,
        messagePayload.recipientId,
        messagePayload.content,
        messagePayload.gemId || undefined
      );
      setMessageContent('');
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (auctionId) emitUserTyping(auctionId, false);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleTyping = () => {
    if (!user || !auctionId) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    } else {
      emitUserTyping(auctionId, true);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      if (auctionId) {
        emitUserTyping(auctionId, false);
      }
      typingTimeoutRef.current = null;
    }, 3000);
  };

  return (
    <Card className="auction-chat">
      <Card.Header className="chat-header">
        <div className="chat-header-main">
          <div className="chat-avatar">{recipientName[0]?.toUpperCase()}</div>
          <div>
            <h5 className="mb-1">{conversationLabel || recipientName}</h5>
            <div className="chat-header-subtitle">
              <span className={`status-dot ${userOnline ? 'online' : 'offline'}`} />
              <span>{userOnline ? 'Online now' : 'Offline'}</span>
              {gemName && <span className="chat-divider">•</span>}
              {gemName && <span>{gemName}</span>}
            </div>
          </div>
        </div>
        <div className="chat-header-actions">
          <button type="button" className="chat-action-btn" aria-label="video call">◎</button>
          <button type="button" className="chat-action-btn" aria-label="phone call">⌁</button>
          <button type="button" className="chat-action-btn" aria-label="more">⋯</button>
        </div>
      </Card.Header>
      <Card.Body className="chat-messages">
        {loading ? (
          <div className="chat-loading">
            <Spinner animation="border" variant="light" />
          </div>
        ) : (
          <>
            {messages.map((msg, index) => {
              const showDate = index === 0 || formatDateLabel(messages[index - 1].createdAt) !== formatDateLabel(msg.createdAt);

              return (
                <React.Fragment key={msg._id}>
                  {showDate && <div className="date-separator">{formatDateLabel(msg.createdAt)}</div>}
                  <div className={`message-row ${msg.sender._id === user?.id ? 'sent' : 'received'}`}>
                    <div className="message-bubble">
                      <div className="message-content">{msg.content}</div>
                      <div className="message-timestamp">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </Card.Body>
      <Card.Footer className="chat-input">
        <Form onSubmit={handleSendMessage} className="chat-composer">
          <Form.Control
            type="text"
            placeholder="Type a message..."
            value={messageContent}
            onChange={(e) => {
              setMessageContent(e.target.value);
              handleTyping();
            }}
            disabled={sending}
            className="chat-composer-input"
          />
          <Button type="submit" className="chat-send-btn" disabled={sending || !messageContent.trim()}>
            {sending ? <Loader size={18} className="spinner" /> : <Send size={18} />}
          </Button>
        </Form>
        <div className="typing-indicator">
          {typingUsers.some((u) => u.isTyping && u.userId !== user?.id) && (
            <>
              <span />
              <span />
              <span />
              <strong>{typingUsers.filter(u => u.isTyping && u.userId !== user?.id).length > 0 ? recipientName : ''}</strong>
              <span>is typing...</span>
            </>
          )}
        </div>
      </Card.Footer>
    </Card>
  );
};

export default AuctionChat;
