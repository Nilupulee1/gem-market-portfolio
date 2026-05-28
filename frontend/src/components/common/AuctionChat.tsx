import React, { useState, useEffect, useRef } from 'react';
import '../../styles/chat.css';
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

interface Message {
  _id: string;
  sender: {
    _id: string;
    name: string;
  };
  content: string;
  createdAt: string;
  gem?: {
    _id: string;
    name?: string;
    type?: string;
    images?: string[];
  };
  auction?: {
    _id: string;
    gem?: {
      _id?: string;
      name?: string;
      type?: string;
      images?: string[];
    };
  };
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
  conversationLabel?: string;
}

const AuctionChat: React.FC<AuctionChatProps> = ({
  auctionId,
  gemId,
  conversationId,
  recipientId,
  recipientName,
  conversationLabel
}) => {
  const { user, token } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageContent, setMessageContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [selectedGemIdForReply, setSelectedGemIdForReply] = useState<string | undefined>(gemId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  const messageCount = messages.length;

  // Extract unique gems from conversation
  const uniqueGems = React.useMemo(() => {
    const gemsMap = new Map<string, { _id: string; name?: string; type?: string; images?: string[] }>();

    messages.forEach((msg) => {
      const msgGem = msg.gem || msg.auction?.gem;
      if (msgGem?._id) {
        gemsMap.set(msgGem._id, {
          _id: msgGem._id,
          name: msgGem.name,
          type: msgGem.type,
          images: msgGem.images
        });
      }
    });

    return Array.from(gemsMap.values());
  }, [messages]);

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

        try {
          await axiosInstance.post('/chat/mark-read', {
            auctionId,
            conversationId,
            gemId,
            senderId: recipientId,
          });
          window.dispatchEvent(new Event('chat:refresh-conversations'));
        } catch (markReadError) {
          console.error('Failed to mark conversation as read:', markReadError);
        }
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
      gemId: selectedGemIdForReply || gemId,
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
            <h5 className="mb-0">{conversationLabel || recipientName}</h5>
            <small className="chat-message-count">{messageCount} messages</small>
          </div>
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
              const messageGem = msg.gem || msg.auction?.gem;

              return (
                <React.Fragment key={msg._id}>
                  {showDate && <div className="date-separator">{formatDateLabel(msg.createdAt)}</div>}
                  <div className={`message-row ${msg.sender._id === user?.id ? 'sent' : 'received'}`}>
                    <div className="message-bubble">
                      <div className="message-content">{msg.content}</div>
                      {messageGem && (
                        <div
                          className="message-gem-card"
                          style={{
                            marginTop: '10px',
                            borderRadius: '14px',
                            overflow: 'hidden',
                            border: '1px solid rgba(148, 163, 184, 0.28)',
                            background: 'rgba(255, 255, 255, 0.08)',
                            display: 'flex',
                            gap: '10px',
                            padding: '10px',
                            alignItems: 'center'
                          }}
                        >
                          {messageGem.images?.[0] ? (
                            <img
                              src={messageGem.images[0]}
                              alt={messageGem.type || messageGem.name || 'Gem'}
                              style={{ width: '54px', height: '54px', objectFit: 'cover', borderRadius: '10px', flexShrink: 0 }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '54px',
                                height: '54px',
                                borderRadius: '10px',
                                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(16, 185, 129, 0.3))',
                                display: 'grid',
                                placeItems: 'center',
                                flexShrink: 0,
                                fontSize: '20px'
                              }}
                            >
                              ✦
                            </div>
                          )}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.75 }}>
                              Gem reply
                            </div>
                            <div style={{ fontWeight: 700, lineHeight: 1.2 }}>
                              {messageGem.type || messageGem.name || 'Gem'}
                            </div>
                            <div style={{ fontSize: '12px', opacity: 0.82, lineHeight: 1.3 }}>
                              {messageGem.name || 'Attached gem context'}
                            </div>
                          </div>
                        </div>
                      )}
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
          {uniqueGems.length > 1 && (
            <Form.Group className="gem-selector-group mb-2">
              <Form.Label className="gem-selector-label">Reply about gem:</Form.Label>
              <Form.Select
                value={selectedGemIdForReply || ''}
                onChange={(e) => setSelectedGemIdForReply(e.target.value || undefined)}
                className="gem-selector"
                style={{
                  fontSize: '13px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  backgroundColor: 'rgba(15, 23, 42, 0.4)',
                  color: 'inherit',
                  cursor: 'pointer'
                }}
              >
                <option value="">Select a gem...</option>
                {uniqueGems.map((gem) => (
                  <option key={gem._id} value={gem._id}>
                    {gem.type || gem.name || 'Unnamed Gem'}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          )}
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
