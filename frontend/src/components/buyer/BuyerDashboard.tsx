import { useEffect, useMemo, useState } from 'react';
import { Compass,Gavel,Heart,LayoutDashboard,LogOut,Settings,Sparkle,Timer,X,MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auctionAPI, buyerAPI, gemAPI } from '../../api/axios';
import { useAuthStore } from '../../store/authStore';
import type { Auction, Gem } from '../../types';
import logo from '../../assets/logo.png';
import { useChatStore } from '../../store/chatStore';
import AuctionBid from './AuctionBid';
import GemDetails from './GemDetails';
import Marketplace from './Marketplace';
import SellerContactModal from './SellerContactModal';
import MessagesPage from './MessagesPage';

type BuyerView = 'dashboard' | 'marketplace' | 'auctions' | 'watchlist' | 'messages';

interface BuyerStats {
  auctionsParticipated: number;
  activeBids: number;
  wonAuctions: number;
  totalBidsPlaced: number;
}

interface BuyerDashboardPayload {
  stats: BuyerStats;
  recentBids: Array<{
    auctionId: string;
    amount: number;
    timestamp: string;
    currentBid: number;
    isWinning: boolean;
    endTime: string;
    gem: Auction['gem'];
  }>;
  recentWins: Auction[];
}

interface BidHistoryItem {
  auctionId: string;
  gem: Auction['gem'];
  seller: Auction['seller'];
  amount: number;
  timestamp: string;
  currentBid: number;
  minimumBidIncrement: number;
  status: Auction['status'];
  endTime: string;
  isWinning: boolean;
}

interface ActiveBidItem {
  auction: Auction;
  myHighestBid: number;
  bidsPlacedByMe: number;
  isWinning: boolean;
  remainingTimeMs: number;
}

const watchlistStorageKey = 'buyer-watchlist-auction-ids';
const buyerDashboardCacheKey = 'buyer-dashboard-cache';

type BuyerDashboardCache = {
  allAuctions: Auction[];
  approvedGems: Gem[];
  dashboard: BuyerDashboardPayload | null;
  activeBids: ActiveBidItem[];
  wonAuctions: Auction[];
  bidHistory: BidHistoryItem[];
};

const loadBuyerDashboardCache = (): BuyerDashboardCache | null => {
  const raw = localStorage.getItem(buyerDashboardCacheKey);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as BuyerDashboardCache;
    return parsed && Array.isArray(parsed.allAuctions) && Array.isArray(parsed.approvedGems) ? parsed : null;
  } catch {
    return null;
  }
};

const saveBuyerDashboardCache = (cache: BuyerDashboardCache) => {
  localStorage.setItem(buyerDashboardCacheKey, JSON.stringify(cache));
};

const formatCurrency = (value: number) => `Rs.${value.toLocaleString()}`;

const formatDateTime = (value: string) => {
  const date = new Date(value);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getCertificateAccessUrl = (certificate?: { url?: string; accessUrl?: string }) => {
  return certificate?.accessUrl || certificate?.url || '';
};

const isPdfCertificate = (certificate?: { url?: string; accessUrl?: string; mimeType?: string }) => {
  const certificateUrl = certificate?.url || certificate?.accessUrl || '';
  const normalizedUrl = certificateUrl.toLowerCase();

  return (
    certificate?.mimeType === 'application/pdf' ||
    normalizedUrl.includes('.pdf') ||
    normalizedUrl.includes('application/pdf')
  );
};

const formatRemaining = (endTime: string, nowMs: number) => {
  const ms = new Date(endTime).getTime() - nowMs;
  if (ms <= 0) {
    return 'Ended';
  }

  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const seconds = Math.floor((ms / 1000) % 60);

  return [
    days > 0 ? `${days}d` : null,
    days > 0 || hours > 0 ? `${hours}h` : null,
    days > 0 || hours > 0 || minutes > 0 ? `${minutes}m` : null,
    `${seconds}s`,
  ].filter(Boolean).join(' ');
};

const parseWatchlist = () => {
  const raw = localStorage.getItem(watchlistStorageKey);
  if (!raw) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveWatchlist = (ids: string[]) => {
  localStorage.setItem(watchlistStorageKey, JSON.stringify(ids));
};

const getLeadingBidderName = (auction?: Auction | null) => {
  const latestBid = auction?.bids?.[auction.bids.length - 1];
  return latestBid?.bidder?.name || 'No bids yet';
};

const BuyerDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const unreadCount = useChatStore((state) => state.unreadCount);
  const cachedBuyerDashboard = loadBuyerDashboardCache();

  const [view, setView] = useState<BuyerView>('dashboard');
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [loading, setLoading] = useState(!cachedBuyerDashboard);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [placingBid, setPlacingBid] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const [allAuctions, setAllAuctions] = useState<Auction[]>(cachedBuyerDashboard?.allAuctions || []);
  const [approvedGems, setApprovedGems] = useState<Gem[]>(cachedBuyerDashboard?.approvedGems || []);
  const [dashboard, setDashboard] = useState<BuyerDashboardPayload | null>(cachedBuyerDashboard?.dashboard || null);
  const [activeBids, setActiveBids] = useState<ActiveBidItem[]>(cachedBuyerDashboard?.activeBids || []);
  const [wonAuctions, setWonAuctions] = useState<Auction[]>(cachedBuyerDashboard?.wonAuctions || []);
  const [bidHistory, setBidHistory] = useState<BidHistoryItem[]>(cachedBuyerDashboard?.bidHistory || []);
  const [watchlistIds, setWatchlistIds] = useState<string[]>(parseWatchlist);

  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [selectedGemDetails, setSelectedGemDetails] = useState<Auction['gem'] | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [showBidConfirm, setShowBidConfirm] = useState(false);
  const [bidFeedback, setBidFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedSeller, setSelectedSeller] = useState<{ _id?: string; name: string; email: string; phone?: string } | null>(null);
  const [selectedGemForContact, setSelectedGemForContact] = useState<{ name: string; id: string } | null>(null);
  const [chatInitialContact, setChatInitialContact] = useState<{ _id?: string; name: string; email: string; phone?: string } | null>(null);
  const [chatInitialGem, setChatInitialGem] = useState<{ name: string; id: string } | null>(null);
  const isBuyerAccount = user?.role === 'buyer';

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const refreshData = async (isInitialLoad: boolean = false) => {
    try {
      if (isInitialLoad && !cachedBuyerDashboard) {
        setLoading(true);
      }
      const [activeRes, dashboardRes, activeBidsRes, wonRes] = await Promise.all([
        auctionAPI.getActiveAuctions(),
        buyerAPI.getDashboard(),
        buyerAPI.getActiveBids(),
        buyerAPI.getWonAuctions(),
      ]);
      const bidHistoryRes = await buyerAPI.getBidHistory();

      setAllAuctions(activeRes.data.auctions || []);
      
      const approvedGemsRes = await gemAPI.getApprovedGems();
      setApprovedGems(approvedGemsRes.data.gems || []);
      
      setDashboard(dashboardRes.data);
      setActiveBids(activeBidsRes.data.activeBids || []);
      setWonAuctions(wonRes.data.wonAuctions || []);
      const nextBidHistory = bidHistoryRes.data.bidHistory || [];
      setBidHistory(nextBidHistory);

      saveBuyerDashboardCache({
        allAuctions: activeRes.data.auctions || [],
        approvedGems: approvedGemsRes.data.gems || [],
        dashboard: dashboardRes.data,
        activeBids: activeBidsRes.data.activeBids || [],
        wonAuctions: wonRes.data.wonAuctions || [],
        bidHistory: nextBidHistory,
      });
    } catch (error) {
      console.error('Failed to load buyer dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData(true);
  }, []);

  const uniqueTypes = useMemo(() => {
    const typeSet = new Set(allAuctions.map((item) => item.gem.type));
    approvedGems.forEach((gem) => typeSet.add(gem.type));
    return ['all', ...Array.from(typeSet)];
  }, [allAuctions, approvedGems]);

  const filteredAuctions = useMemo(() => {
    return allAuctions.filter((item) => {
      const queryValue = query.trim().toLowerCase();
      const matchesQuery =
        queryValue.length === 0 ||
        item.gem.type.toLowerCase().includes(queryValue) ||
        item.gem.origin.toLowerCase().includes(queryValue) ||
        item.gem.color.toLowerCase().includes(queryValue);
      const matchesType = selectedType === 'all' || item.gem.type === selectedType;
      return matchesQuery && matchesType;
    });
  }, [allAuctions, query, selectedType]);

  const watchedAuctions = useMemo(
    () => allAuctions.filter((item) => watchlistIds.includes(item._id)),
    [allAuctions, watchlistIds]
  );

  const toggleWatchlist = (auctionId: string) => {
    const updated = watchlistIds.includes(auctionId)
      ? watchlistIds.filter((id) => id !== auctionId)
      : [...watchlistIds, auctionId];
    setWatchlistIds(updated);
    saveWatchlist(updated);
  };

  const openDetails = async (auctionId: string) => {
    try {
      setLoadingDetails(true);
      setBidFeedback(null);
      setShowBidConfirm(false);
      const response = await auctionAPI.getAuctionById(auctionId);
      setSelectedAuction(response.data.auction);
      const minBid = response.data.auction.currentBid + response.data.auction.minimumBidIncrement;
      setBidAmount(String(minBid));

      const gemId = response.data.auction?.gem?._id || response.data.auction?.gem;
      if (gemId) {
        const gemResponse = await gemAPI.getGemById(gemId);
        setSelectedGemDetails(gemResponse.data.gem || gemResponse.data);
      } else {
        setSelectedGemDetails(response.data.auction.gem || null);
      }
    } catch (error) {
      console.error('Failed to fetch auction details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const openGemDetails = async (gemId: string) => {
    try {
      setLoadingDetails(true);
      setBidFeedback(null);
      setShowBidConfirm(false);
      // Clear any selected auction since this is a direct gem view
      setSelectedAuction(null);
      const gemResponse = await gemAPI.getGemById(gemId);
      setSelectedGemDetails(gemResponse.data.gem || gemResponse.data);
    } catch (error) {
      console.error('Failed to fetch gem details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeDetails = () => {
    setSelectedAuction(null);
    setSelectedGemDetails(null);
    setBidAmount('');
    setShowBidConfirm(false);
    setBidFeedback(null);
  };

  const openSellerContact = (seller: { _id?: string; name: string; email: string; phone?: string }, gemName: string, gemId: string) => {
    setSelectedSeller(seller);
    setSelectedGemForContact({ name: gemName, id: gemId });
  };

  const closeSellerContact = () => {
    setSelectedSeller(null);
    setSelectedGemForContact(null);
  };

  const handleStartChatWithSeller = () => {
    setChatInitialContact(selectedSeller);
    setChatInitialGem(selectedGemForContact);
    setView('messages');
    closeSellerContact();
  };

  const requestBidConfirmation = () => {
    if (!selectedAuction) {
      return;
    }

    const amount = Number(bidAmount);
    const minimumAllowedBid = selectedAuction.currentBid + selectedAuction.minimumBidIncrement;

    if (!Number.isFinite(amount) || amount < minimumAllowedBid) {
      setBidFeedback({
        type: 'error',
        message: `Your bid must be at least ${formatCurrency(minimumAllowedBid)}.`,
      });
      return;
    }

    setBidFeedback(null);
    setShowBidConfirm(true);
  };

  const placeBid = async () => {
    if (!selectedAuction) {
      return;
    }

    const amount = Number(bidAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }

    const minimumAllowedBid = selectedAuction.currentBid + selectedAuction.minimumBidIncrement;
    if (amount < minimumAllowedBid) {
      setBidFeedback({
        type: 'error',
        message: `Your bid must be at least ${formatCurrency(minimumAllowedBid)}.`,
      });
      setShowBidConfirm(false);
      return;
    }

    try {
      setPlacingBid(true);
      setBidFeedback(null);
      await auctionAPI.placeBid({ auctionId: selectedAuction._id, amount });
      const response = await auctionAPI.getAuctionById(selectedAuction._id);
      const updatedAuction = response.data.auction as Auction;
      setSelectedAuction(updatedAuction);
      setBidAmount(String(updatedAuction.currentBid + updatedAuction.minimumBidIncrement));
      await refreshData();
      setBidFeedback({
        type: 'success',
        message: `Your bid of ${formatCurrency(amount)} has been placed for ${updatedAuction.gem.type}.`,
      });
    } catch (error) {
      console.error('Failed to place bid:', error);
      setBidFeedback({
        type: 'error',
        message: 'Bid placement failed. Please review the amount and try again.',
      });
    } finally {
      setPlacingBid(false);
      setShowBidConfirm(false);
    }
  };

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  const renderDashboard = () => {
    const stats = dashboard?.stats;
    const winningBids = activeBids.filter((item) => item.isWinning).length;
    const leadRate = activeBids.length ? Math.round((winningBids / activeBids.length) * 100) : 0;
    const winRate = stats?.totalBidsPlaced ? Math.round(((stats.wonAuctions || 0) / stats.totalBidsPlaced) * 100) : 0;

    return (
      <>
        <div className="buyer-dashboard-hero mb-4">
          <div>
            <p className="buyer-eyebrow mb-2">Buyer dashboard</p>
            <h3>Welcome back, {user?.name?.split(' ')[0]}!</h3>
            <p className="mb-0">Follow your bids, wins, and watchlist movement at a glance.</p>
          </div>
          <div className="buyer-pill-row">
            <span className="buyer-pill">{stats?.activeBids || 0} active bids</span>
            <span className="buyer-pill buyer-pill-soft">{watchlistIds.length} watched items</span>
          </div>
        </div>

        <div className="buyer-analytics-grid">
          <article className="quick-card" role="button" tabIndex={0} onClick={() => setView('auctions')} onKeyDown={(event) => event.key === 'Enter' && setView('auctions')}>
            <div className="quick-icon"><Gavel size={18} /></div>
            <div>Total bids placed</div>
            <strong>{stats?.totalBidsPlaced || 0} bids</strong>
          </article>
          <article className="quick-card" role="button" tabIndex={0} onClick={() => setView('watchlist')} onKeyDown={(event) => event.key === 'Enter' && setView('watchlist')}>
            <div className="quick-icon"><Heart size={18} /></div>
            <div>My watchlist</div>
            <strong>{watchlistIds.length} items</strong>
          </article>
          <article className="quick-card" role="button" tabIndex={0} onClick={() => setView('auctions')} onKeyDown={(event) => event.key === 'Enter' && setView('auctions')}>
            <div className="quick-icon"><Sparkle size={18} /></div>
            <div>Won auctions</div>
            <strong>{stats?.wonAuctions || 0} wins</strong>
          </article>
          <article className="quick-card" role="button" tabIndex={0} onClick={() => setView('dashboard')} onKeyDown={(event) => event.key === 'Enter' && setView('dashboard')}>
            <div className="quick-icon"><Timer size={18} /></div>
            <div>Lead rate</div>
            <strong>{leadRate}% winning</strong>
          </article>
        </div>

        <section className="buyer-overview-panel block-card">
          <div className="section-head">
            <div>
              <h3>Market snapshot</h3>
              <p className="mb-0 text-secondary">A quick read on how your bidding activity is performing.</p>
            </div>
          </div>
          <div className="buyer-metric-row">
            <div className="buyer-metric-card">
              <span>Active bids</span>
              <strong>{stats?.activeBids || 0}</strong>
            </div>
            <div className="buyer-metric-card">
              <span>Lead rate</span>
              <strong>{leadRate}%</strong>
            </div>
            <div className="buyer-metric-card">
              <span>Win rate</span>
              <strong>{winRate}%</strong>
            </div>
            <div className="buyer-metric-card">
              <span>Watchlist</span>
              <strong>{watchlistIds.length}</strong>
            </div>
          </div>
        </section>

        <section className="block-card">
          <div className="section-head">
            <h3>Your Watched Auctions</h3>
            <button type="button" onClick={() => setView('watchlist')}>View All</button>
          </div>
          {watchedAuctions.length === 0 ? (
            <p className="empty-note">No watched auctions yet. Add some from Marketplace.</p>
          ) : (
            watchedAuctions.slice(0, 3).map((auction) => (
              <div key={auction._id} className="d-flex justify-content-between align-items-center border rounded-3 p-2 mb-2">
                <div className="d-flex align-items-center gap-2">
                  <img src={auction.gem.images?.[0] || 'https://via.placeholder.com/200x140'} alt={auction.gem.type} width={52} height={42} style={{ objectFit: 'cover', borderRadius: 8 }} />
                  <div>
                    <strong>{auction.gem.type}</strong>
                    <p className="m-0 text-secondary">{auction.gem.carat} ct</p>
                  </div>
                </div>
                <div className="text-end">
                  <p className="m-0 text-secondary small">Current Bid</p>
                  <strong>{formatCurrency(auction.currentBid)}</strong>
                </div>
              </div>
            ))
          )}
        </section>

        <section className="block-card">
          <div className="section-head">
            <h3>Pick Up Where You Left Off</h3>
            <button type="button" onClick={() => setView('marketplace')}>View All</button>
          </div>
          <div className="market-grid">
            {approvedGems.slice(0, 1).map((gem) => (
              <article className="market-card" key={`gem-${gem._id}`}>
                <img className="market-image" src={gem.images?.[0] || 'https://via.placeholder.com/460x280'} alt={gem.type} />
                <div className="market-body">
                  <strong>{gem.type}</strong>
                  <p className="market-meta">{gem.origin}</p>
                  <div className="d-flex justify-content-between align-items-center gap-2">
                    <div style={{ fontSize: '12px', backgroundColor: '#e8f5e9', padding: '4px 8px', borderRadius: '4px', color: '#2e7d32' }}>
                      Direct Sale
                    </div>
                  </div>
                  <p className="market-meta mb-0">By: <strong>{gem.seller.name}</strong></p>
                  <div className="market-actions">
                    <button
                      className="bid-btn"
                      type="button"
                      style={{ width: '100%' }}
                      onClick={() => openSellerContact(gem.seller, gem.type, gem._id)}
                    >
                      Contact Seller
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {filteredAuctions.slice(0, 3).map((auction) => (
              <article className="market-card" key={auction._id}>
                <img className="market-image" src={auction.gem.images?.[0] || 'https://via.placeholder.com/460x280'} alt={auction.gem.type} />
                <div className="market-body">
                  <strong>{auction.gem.type}</strong>
                  <p className="market-meta">{auction.gem.origin}</p>
                  <div className="d-flex justify-content-between align-items-center gap-2">
                    <div className="bid-price">{formatCurrency(auction.currentBid)}</div>
                    <span className="auction-timer"><Timer size={14} /> {formatRemaining(auction.endTime, nowMs)}</span>
                  </div>
                  <p className="market-meta mb-0">Current leader: <strong>{getLeadingBidderName(auction)}</strong></p>
                  <div className="market-actions">
                    <button className="watch-btn" type="button" onClick={() => toggleWatchlist(auction._id)}>
                      <Heart size={15} fill={watchlistIds.includes(auction._id) ? 'currentColor' : 'none'} />
                      {watchlistIds.includes(auction._id) ? 'Watched' : 'Watch'}
                    </button>
                    <button className="bid-btn" type="button" onClick={() => openDetails(auction._id)}>View Details</button>
                  </div>
                </div>
              </article>
            ))}

            {approvedGems.length === 0 && filteredAuctions.length === 0 && (
              <div className="market-empty-state">
                <h5>No listings are available right now</h5>
                <p>Check again soon for new direct-sale gems and live auctions.</p>
              </div>
            )}
          </div>
        </section>
      </>
    );
  };

  const renderAuctions = () => (
    <>
      <div className="section-head">
        <h3>My Auction Activity</h3>
      </div>

      <section className="block-card">
        <h5 className="mb-3">Active Bids</h5>
        {activeBids.length === 0 ? (
          <p className="empty-note">You have no active bids at the moment.</p>
        ) : (
          activeBids.map((item) => (
            <div key={item.auction._id} className="d-flex justify-content-between border rounded-3 p-2 mb-2">
              <div>
                <strong>{item.auction.gem.type}</strong>
                <p className="m-0 text-secondary">Highest by you: {formatCurrency(item.myHighestBid)}</p>
                <small className={item.isWinning ? 'text-success' : 'text-danger'}>{item.isWinning ? 'Currently Leading' : 'Outbid'}</small>
              </div>
              <div className="text-end">
                <p className="m-0">{formatCurrency(item.auction.currentBid)}</p>
                <small className="text-secondary">{formatRemaining(item.auction.endTime, nowMs)}</small>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="block-card">
        <h5 className="mb-3">Won Auctions</h5>
        {wonAuctions.length === 0 ? (
          <p className="empty-note">No won auctions yet.</p>
        ) : (
          wonAuctions.map((auction) => (
            <div key={auction._id} className="d-flex justify-content-between border rounded-3 p-2 mb-2">
              <div>
                <strong>{auction.gem.type}</strong>
                <p className="m-0 text-secondary">Seller: {auction.seller.name}</p>
              </div>
              <div className="text-end">
                <strong>{formatCurrency(auction.currentBid)}</strong>
              </div>
            </div>
          ))
        )}
      </section>
    </>
  );

  const renderWatchlist = () => (
    <>
      <div className="section-head">
        <div>
          <h3>My Watchlist</h3>
          <p className="mb-0 text-secondary">{watchedAuctions.length} gems in your watchlist</p>
        </div>
      </div>
      <div className="market-grid">
        {watchedAuctions.map((auction) => (
          <article className="market-card" key={auction._id}>
            <img className="market-image" src={auction.gem.images?.[0] || 'https://via.placeholder.com/460x280'} alt={auction.gem.type} />
            <div className="market-body">
              <strong>{auction.gem.type}</strong>
              <p className="market-meta">{auction.gem.origin} - {auction.gem.carat} ct</p>
              <p className="market-meta">Current Bid</p>
              <div className="bid-price">{formatCurrency(auction.currentBid)}</div>
              <div className="market-actions mt-2">
                <button className="alert-btn" type="button" onClick={() => toggleWatchlist(auction._id)}>
                  <X size={15} /> Remove
                </button>
                <button className="bid-btn" type="button" onClick={() => openDetails(auction._id)}>View Details</button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {watchedAuctions.length === 0 && <p className="empty-note">No items in watchlist.</p>}
    </>
  );

  const renderBody = () => {
    if (!isBuyerAccount) {
      return (
        <div className="block-card p-4">
          <h3 className="mb-2">Buyer access required</h3>
          <p className="text-secondary mb-0">
            You are currently signed in as <strong>{user?.role || 'unknown'}</strong>. Switch to a buyer account to view dashboard data, active bids, and won auctions.
          </p>
        </div>
      );
    }

    if (loading) {
      return <p className="empty-note">Loading buyer workspace...</p>;
    }

    switch (view) {
      case 'marketplace':
        return (
          <Marketplace
            auctions={filteredAuctions}
            approvedGems={approvedGems}
            query={query}
            selectedType={selectedType}
            uniqueTypes={uniqueTypes}
            watchlistIds={watchlistIds}
            nowMs={nowMs}
            onTypeChange={setSelectedType}
            onToggleWatchlist={toggleWatchlist}
            onOpenDetails={openDetails}
            onOpenGemDetails={openGemDetails}
            onOpenSellerContact={openSellerContact}
            formatCurrency={formatCurrency}
            formatRemaining={formatRemaining}
            getLeadingBidderName={getLeadingBidderName}
          />
        );
      case 'auctions':
        return renderAuctions();
      case 'watchlist':
        return renderWatchlist();
      case 'messages':
        return <MessagesPage initialContact={chatInitialContact} initialGem={chatInitialGem} />;
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="buyer-shell">
      <aside className="buyer-sidebar">
        <div className="buyer-brand">
          <img src={logo} alt="GemFolio" />
          <h1>GemFolio</h1>
        </div>

        <div className="buyer-profile">
          <div className="buyer-avatar">{user?.name?.slice(0, 1).toUpperCase() || 'B'}</div>
          <div>
            <strong>{user?.name || 'Buyer'}</strong>
            <p className="buyer-role">Buyer</p>
          </div>
        </div>

        <nav className="buyer-nav">
          <button type="button" className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')}>
            <LayoutDashboard size={16} /> Dashboard
          </button>
          <button type="button" className={view === 'marketplace' ? 'active' : ''} onClick={() => setView('marketplace')}>
            <Compass size={16} /> Marketplace
          </button>
          <button type="button" className={view === 'auctions' ? 'active' : ''} onClick={() => setView('auctions')}>
            <Gavel size={16} /> Auctions
          </button>
          <button type="button" className={view === 'watchlist' ? 'active' : ''} onClick={() => setView('watchlist')}>
            <Heart size={16} /> My Watchlist
          </button>
          <button type="button" className={view === 'messages' ? 'active' : ''} onClick={() => setView('messages')}>
            <MessageSquare size={16} /> Messages
            {unreadCount > 0 && (
              <span className="message-notification-chip" aria-label={`${unreadCount} unread messages`}>
                <MessageSquare size={12} />
                <strong>{unreadCount}</strong>
              </span>
            )}
          </button>
        </nav>

        <div className="buyer-sidebar-bottom">
          <button type="button" className="ghost-btn w-100 mb-2 d-flex align-items-center justify-content-center gap-2">
            <Settings size={16} /> Settings
          </button>
          <button type="button" className="alert-btn w-100 d-flex align-items-center justify-content-center gap-2" onClick={handleSignOut}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      <main className="buyer-content">
        {renderBody()}
      </main>

      <GemDetails
        selectedAuction={selectedAuction}
        selectedGemDetails={selectedGemDetails}
        loading={loadingDetails}
        bidAmount={bidAmount}
        bidFeedback={bidFeedback}
        placingBid={placingBid}
        bidHistory={bidHistory}
        onClose={closeDetails}
        onBidAmountChange={setBidAmount}
        onRequestBidConfirmation={requestBidConfirmation}
        onSetMinimumBid={() => {
          if (selectedAuction) {
            setBidAmount(String(selectedAuction.currentBid + selectedAuction.minimumBidIncrement));
          }
        }}
        onSetDoubleBid={() => {
          if (selectedAuction) {
            setBidAmount(String(selectedAuction.currentBid + selectedAuction.minimumBidIncrement * 2));
          }
        }}
        formatCurrency={formatCurrency}
        formatDateTime={formatDateTime}
        getLeadingBidderName={getLeadingBidderName}
        getCertificateAccessUrl={getCertificateAccessUrl}
        isPdfCertificate={isPdfCertificate}
      />

      <AuctionBid
        show={showBidConfirm}
        selectedAuction={selectedAuction}
        bidAmount={bidAmount}
        placingBid={placingBid}
        onCancel={() => setShowBidConfirm(false)}
        onConfirm={placeBid}
        formatCurrency={formatCurrency}
      />

      {selectedSeller && selectedGemForContact && (
        <SellerContactModal
          seller={selectedSeller}
          gemName={selectedGemForContact.name}
          onClose={closeSellerContact}
          onSendMessage={handleStartChatWithSeller}
        />
      )}
    </div>
  );
};

export default BuyerDashboard;