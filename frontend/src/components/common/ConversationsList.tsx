import React, { useState, useEffect } from 'react';
import { ListGroup, Card, Spinner } from 'react-bootstrap';
import { Mail } from 'lucide-react';
import axiosInstance from '../../api/axios';
import { useAuthStore } from '../../store/authStore';

interface Conversation {
  _id: string;
  gem?: {
    _id: string;
    name: string;
    type?: string;
    images?: string[];
  };
  auction: {
    _id: string;
    gem: {
      _id?: string;
      name: string;
      type?: string;
      images?: string[];
    };
    currentBid: number;
  };
  lastMessage?: {
    _id: string;
    content: string;
    sender?: {
      _id: string;
      name: string;
      email: string;
    };
  };
  seller: {
    _id: string;
    name: string;
    email: string;
  };
  buyer: {
    _id: string;
    name: string;
    email: string;
  };
  unreadCount: {
    buyerUnread: number;
    sellerUnread: number;
  };
  updatedAt: string;
}

interface ConversationsListProps {
  onSelectConversation?: (conversation: Conversation) => void;
  selectedConversationId?: string | null;
  className?: string;
}

const ConversationsList: React.FC<ConversationsListProps> = ({
  onSelectConversation,
  selectedConversationId,
  className
}) => {
  const { user, token } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!token) {
      setConversations([]);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchConversations = async ({ showLoader = false }: { showLoader?: boolean } = {}) => {
      try {
        if (showLoader) {
          setLoading(true);
        }

        const response = await axiosInstance.get('/chat/conversations');
        if (!isMounted) {
          return;
        }

        const data = response.data;
        setConversations(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching conversations:', error);
        if (isMounted) {
          setConversations([]);
        }
      } finally {
        if (showLoader && isMounted) {
          setLoading(false);
        }
      }
    };

    fetchConversations({ showLoader: true });

    const refreshInterval = window.setInterval(() => {
      fetchConversations();
    }, 8000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchConversations();
      }
    };

    const handleConversationRefresh = () => {
      fetchConversations();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('chat:refresh-conversations', handleConversationRefresh as EventListener);

    return () => {
      isMounted = false;
      window.clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('chat:refresh-conversations', handleConversationRefresh as EventListener);
    };
  }, [token]);

  const filteredConversations = conversations.filter((conv) => {
    const otherUser = user?.id === conv.seller._id ? conv.buyer : conv.seller;
    return otherUser.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.lastMessage?.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.gem?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.auction?.gem?.name?.toLowerCase().includes(searchTerm.toLowerCase());
  }).sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());

  const getUnreadCount = (conv: Conversation) => {
    if (!user) return 0;
    return user.id === conv.seller._id
      ? Number(conv.unreadCount?.sellerUnread || 0)
      : Number(conv.unreadCount?.buyerUnread || 0);
  };


  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className={`conversations-loading ${className || ''}`}>
        <Spinner animation="border" variant="light" />
      </div>
    );
  }

  return (
    <div className={`conversations-list-container ${className}`}>
      <Card className="border-0 conversations-card">
        <Card.Header className="conversations-header">
          <div>
            <h5 className="mb-0">Chat</h5>
            <small>{conversations.length} conversations</small>
          </div>
        </Card.Header>

        <Card.Body className="conversations-body">
          <input
            type="text"
            placeholder="Search conversations..."
            className="conversation-search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />


          <ListGroup variant="flush" className="conversations-list">
            {filteredConversations.length === 0 ? (
              <div className="conversations-empty">
                <p>No conversations yet</p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const otherUser = user?.id === conv.seller._id ? conv.buyer : conv.seller;
                const unreadCount = getUnreadCount(conv);
                const unreadLabel = unreadCount > 99 ? '99+' : String(unreadCount);
                const isSelected = selectedConversationId === conv._id;

                return (
                  <ListGroup.Item
                    key={conv._id}
                    className={`conversation-item ${isSelected ? 'selected' : ''} ${unreadCount > 0 ? 'unread' : ''}`}
                    onClick={() => onSelectConversation?.(conv)}
                    role="button"
                  >
                    <div className="conversation-avatar">{otherUser.name[0]?.toUpperCase()}</div>
                    <div className="conversation-info flex-grow-1">
                      <div className="d-flex align-items-center justify-content-between gap-2 mb-1">
                        <h6 className="mb-0">{otherUser.name}</h6>
                        {unreadCount > 0 && (
                          <div className="conversation-unread-indicator" aria-label={`${unreadCount} unread messages`}>
                            <Mail size={12} aria-hidden="true" />
                            <span className="conversation-badge">{unreadLabel}</span>
                          </div>
                        )}
                      </div>
                      <p className="mb-0 message-preview">
                        {conv.lastMessage?.content || 'No messages yet'}
                      </p>
                      <small className="d-block conversation-time">{formatTime(conv.updatedAt)}</small>
                    </div>
                  </ListGroup.Item>
                );
              })
            )}
          </ListGroup>
        </Card.Body>
      </Card>
    </div>
  );
};

export default ConversationsList;
