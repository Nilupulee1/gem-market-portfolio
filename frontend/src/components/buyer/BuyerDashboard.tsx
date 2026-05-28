import { useEffect, useMemo, useState } from 'react';
import {
  Compass, Gavel, Heart, LayoutDashboard, LogOut,
  Sparkle, Timer, X, MessageSquare, Moon, Sun, TrendingUp,
  Trophy, Activity, Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auctionAPI, buyerAPI, gemAPI } from '../../api/axios';
import axiosInstance from '../../api/axios';
import { useAuthStore } from '../../store/authStore';
import type { Auction, Gem } from '../../types';
import logo from '../../assets/logo.png';
import { useChatStore } from '../../store/chatStore';
import AuctionBid from './AuctionBid';
import GemDetails from './GemDetails';
import LiveAuctions from './LiveAuctions';
import Marketplace from './Marketplace';
import SellerContactModal from './SellerContactModal';
import MessagesPage from './MessagesPage';
import WinningAuctionCard from './WinningAuctionCard';
import ActiveBidsCard from './ActiveBidsCard';

type BuyerView = 'dashboard' | 'marketplace' | 'auctions' | 'watchlist' | 'messages';
type ThemeMode = 'light' | 'dark';

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

const watchlistStorageKey   = 'buyer-watchlist-auction-ids';
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
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as BuyerDashboardCache;
    return parsed && Array.isArray(parsed.allAuctions) && Array.isArray(parsed.approvedGems) ? parsed : null;
  } catch { return null; }
};

const saveBuyerDashboardCache = (cache: BuyerDashboardCache) =>
  localStorage.setItem(buyerDashboardCacheKey, JSON.stringify(cache));

const formatCurrency  = (v: number) => `Rs.${v.toLocaleString()}`;

const formatDateTime  = (v: string) =>
  new Date(v).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

const getCertificateAccessUrl = (cert?: { url?: string; accessUrl?: string }) => cert?.accessUrl || cert?.url || '';

const isPdfCertificate = (cert?: { url?: string; accessUrl?: string; mimeType?: string }) => {
  const u = (cert?.url || cert?.accessUrl || '').toLowerCase();
  return cert?.mimeType === 'application/pdf' || u.includes('.pdf') || u.includes('application/pdf');
};

const formatRemaining = (endTime: string, nowMs: number) => {
  const ms = new Date(endTime).getTime() - nowMs;
  if (ms <= 0) return 'Ended';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms / 3600000) % 24);
  const m = Math.floor((ms / 60000) % 60);
  const s = Math.floor((ms / 1000) % 60);
  return [d > 0 ? `${d}d` : null, d > 0 || h > 0 ? `${h}h` : null, d > 0 || h > 0 || m > 0 ? `${m}m` : null, `${s}s`].filter(Boolean).join(' ');
};

const parseWatchlist = () => {
  try { const p = JSON.parse(localStorage.getItem(watchlistStorageKey) || ''); return Array.isArray(p) ? p : []; }
  catch { return []; }
};

const saveWatchlist = (ids: string[]) => localStorage.setItem(watchlistStorageKey, JSON.stringify(ids));

const getLeadingBidderName = (auction?: Auction | null) => {
  const latest = auction?.bids?.[auction.bids.length - 1];
  return latest?.bidder?.name || 'No bids yet';
};

/* ─── Nav items ─── */
const NAV_ITEMS: { view: BuyerView; icon: React.ReactNode; label: string }[] = [
  { view: 'dashboard',   icon: <LayoutDashboard size={16} />, label: 'Dashboard'   },
  { view: 'marketplace', icon: <Compass size={16} />,         label: 'Marketplace' },
  { view: 'auctions',    icon: <Gavel size={16} />,           label: 'Auctions'    },
  { view: 'watchlist',   icon: <Heart size={16} />,           label: 'Watchlist'   },
  { view: 'messages',    icon: <MessageSquare size={16} />,   label: 'Messages'    },
];

/* ─── Stat card ─── */
const QuickStat = ({
  icon, label, value, accent, onClick,
}: { icon: React.ReactNode; label: string; value: string | number; accent?: string; onClick?: () => void }) => (
  <article
    className="bdr-quick-stat"
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onClick={onClick}
    onKeyDown={e => e.key === 'Enter' && onClick?.()}
    style={{ cursor: onClick ? 'pointer' : 'default' }}
  >
    <div className="bdr-quick-stat-icon" style={accent ? { background: `${accent}18`, color: accent } : {}}>
      {icon}
    </div>
    <div className="bdr-quick-stat-body">
      <span className="bdr-quick-stat-label">{label}</span>
      <strong className="bdr-quick-stat-value">{value}</strong>
    </div>
  </article>
);

/* ─── Metric card ─── */
const MetricCard = ({ label, value, color }: { label: string; value: string | number; color?: string }) => (
  <div className="bdr-metric-card">
    <span className="bdr-metric-label">{label}</span>
    <strong className="bdr-metric-value" style={color ? { color } : {}}>{value}</strong>
  </div>
);

/* ════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════ */
const BuyerDashboard = ({
  theme,
  onToggleTheme,
}: {
  theme?: ThemeMode;
  onToggleTheme?: () => void;
}) => {
  const navigate    = useNavigate();
  const { user, logout } = useAuthStore();
  const unreadCount = useChatStore(s => s.unreadCount);
  const cached      = loadBuyerDashboardCache();

  const [view,        setView]       = useState<BuyerView>('dashboard');
  const [query]                      = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [loading,     setLoading]    = useState(!cached);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [placingBid,  setPlacingBid] = useState(false);
  const [nowMs,       setNowMs]      = useState(() => Date.now());

  const [allAuctions,  setAllAuctions]  = useState<Auction[]>(cached?.allAuctions  || []);
  const [approvedGems, setApprovedGems] = useState<Gem[]>(cached?.approvedGems || []);
  const [dashboard,    setDashboard]    = useState<BuyerDashboardPayload | null>(cached?.dashboard || null);
  const [activeBids,   setActiveBids]   = useState<ActiveBidItem[]>(cached?.activeBids   || []);
  const [wonAuctions,  setWonAuctions]  = useState<Auction[]>(cached?.wonAuctions  || []);
  const [bidHistory,   setBidHistory]   = useState<BidHistoryItem[]>(cached?.bidHistory   || []);
  const [watchlistIds, setWatchlistIds] = useState<string[]>(parseWatchlist);

  const [selectedAuction,       setSelectedAuction]       = useState<Auction | null>(null);
  const [selectedGemDetails,    setSelectedGemDetails]    = useState<Auction['gem'] | null>(null);
  const [bidAmount,             setBidAmount]             = useState('');
  const [showBidConfirm,        setShowBidConfirm]        = useState(false);
  const [bidFeedback,           setBidFeedback]           = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedSeller,        setSelectedSeller]        = useState<{ _id?: string; name: string; email: string; phone?: string } | null>(null);
  const [selectedGemForContact, setSelectedGemForContact] = useState<{ name: string; id: string; images?: string[] } | null>(null);
  const [chatInitialContact,    setChatInitialContact]    = useState<{ _id?: string; name: string; email: string; phone?: string } | null>(null);
  const [chatInitialGem,        setChatInitialGem]        = useState<{ name: string; id: string } | null>(null);
  const [conversations,         setConversations]         = useState<Array<{ auction?: { _id: string }; gem?: { _id: string } }>>([]);
  const [dismissedWinningAuctions, setDismissedWinningAuctions] = useState<string[]>([]);

  const isBuyerAccount = user?.role === 'buyer';

  /* timers */
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  /* fetch */
  const refreshData = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad && !cached) setLoading(true);
      const [activeRes, dashRes, bidsRes, wonRes] = await Promise.all([
        auctionAPI.getActiveAuctions(),
        buyerAPI.getDashboard(),
        buyerAPI.getActiveBids(),
        buyerAPI.getWonAuctions(),
      ]);
      const histRes = await buyerAPI.getBidHistory();
      let convData: typeof conversations = [];
      try { const r = await axiosInstance.get('/chat/conversations'); convData = Array.isArray(r.data) ? r.data : []; }
      catch { /* silent */ }

      const gemsRes = await gemAPI.getApprovedGems();
      setAllAuctions(activeRes.data.auctions || []);
      setApprovedGems(gemsRes.data.gems || []);
      setDashboard(dashRes.data);
      setActiveBids(bidsRes.data.activeBids || []);
      setWonAuctions(wonRes.data.wonAuctions || []);
      setConversations(convData);
      const nextHist = histRes.data.bidHistory || [];
      setBidHistory(nextHist);
      saveBuyerDashboardCache({ allAuctions: activeRes.data.auctions || [], approvedGems: gemsRes.data.gems || [], dashboard: dashRes.data, activeBids: bidsRes.data.activeBids || [], wonAuctions: wonRes.data.wonAuctions || [], bidHistory: nextHist });
    } catch (e) { console.error(e); }
    finally     { setLoading(false); }
  };

  useEffect(() => { refreshData(true); }, []);

  useEffect(() => {
    if (view !== 'dashboard') return;
    const refresh = async () => {
      try { const r = await axiosInstance.get('/chat/conversations'); setConversations(Array.isArray(r.data) ? r.data : []); } catch { /* silent */ }
    };
    refresh();
    const id = window.setInterval(refresh, 3000);
    return () => window.clearInterval(id);
  }, [view]);

  /* memos */
  const uniqueTypes = useMemo(() => {
    const s = new Set(allAuctions.map(a => a.gem.type));
    approvedGems.forEach(g => s.add(g.type));
    return ['all', ...Array.from(s)];
  }, [allAuctions, approvedGems]);

  const filteredAuctions = useMemo(() =>
    allAuctions.filter(a => {
      const q = query.trim().toLowerCase();
      return (q.length === 0 || a.gem.type.toLowerCase().includes(q) || a.gem.origin.toLowerCase().includes(q) || a.gem.color.toLowerCase().includes(q))
        && (selectedType === 'all' || a.gem.type === selectedType);
    }), [allAuctions, query, selectedType]);

  const watchedAuctions  = useMemo(() => allAuctions.filter(a => watchlistIds.includes(a._id)), [allAuctions, watchlistIds]);
  const liveAuctions     = useMemo(() => allAuctions.filter(a => new Date(a.endTime).getTime() > Date.now()), [allAuctions]);

  const wonAuctionsWithoutContact = useMemo(() => {
    const ids = new Set(conversations.map(c => c.auction?._id).filter(Boolean));
    return wonAuctions.filter(a => !ids.has(a._id) && !dismissedWinningAuctions.includes(a._id));
  }, [wonAuctions, conversations, dismissedWinningAuctions]);

  /* handlers */
  const toggleWatchlist = (id: string) => {
    const updated = watchlistIds.includes(id) ? watchlistIds.filter(x => x !== id) : [...watchlistIds, id];
    setWatchlistIds(updated); saveWatchlist(updated);
  };

  const openDetails = async (auctionId: string) => {
    try {
      setLoadingDetails(true); setBidFeedback(null); setShowBidConfirm(false);
      const res = await auctionAPI.getAuctionById(auctionId);
      setSelectedAuction(res.data.auction);
      setBidAmount(String(res.data.auction.currentBid + res.data.auction.minimumBidIncrement));
      const gemId = res.data.auction?.gem?._id || res.data.auction?.gem;
      if (gemId) { const gr = await gemAPI.getGemById(gemId); setSelectedGemDetails(gr.data.gem || gr.data); }
      else { setSelectedGemDetails(res.data.auction.gem || null); }
    } catch (e) { console.error(e); }
    finally { setLoadingDetails(false); }
  };

  const openGemDetails = async (gemId: string) => {
    try {
      setLoadingDetails(true); setBidFeedback(null); setShowBidConfirm(false); setSelectedAuction(null);
      const gr = await gemAPI.getGemById(gemId); setSelectedGemDetails(gr.data.gem || gr.data);
    } catch (e) { console.error(e); }
    finally { setLoadingDetails(false); }
  };

  const closeDetails = () => { setSelectedAuction(null); setSelectedGemDetails(null); setBidAmount(''); setShowBidConfirm(false); setBidFeedback(null); };

  const openSellerContact = async (seller: { _id?: string; name: string; email: string; phone?: string }, gemName: string, gemId: string) => {
    setSelectedSeller(seller);
    try { const gr = await gemAPI.getGemById(gemId); const g = gr.data.gem || gr.data; setSelectedGemForContact({ name: g?.type || gemName, id: gemId, images: g?.images || [] }); }
    catch { setSelectedGemForContact({ name: gemName, id: gemId }); }
  };

  const closeSellerContact = () => { setSelectedSeller(null); setSelectedGemForContact(null); };

  const handleStartChatWithSeller = () => {
    setChatInitialContact(selectedSeller); setChatInitialGem(selectedGemForContact);
    setView('messages'); closeSellerContact();
    setTimeout(() => refreshData(), 500);
  };

  const requestBidConfirmation = () => {
    if (!selectedAuction) return;
    const amt  = Number(bidAmount);
    const minB = selectedAuction.currentBid + selectedAuction.minimumBidIncrement;
    if (!Number.isFinite(amt) || amt < minB) { setBidFeedback({ type: 'error', message: `Your bid must be at least ${formatCurrency(minB)}.` }); return; }
    setBidFeedback(null); setShowBidConfirm(true);
  };

  const placeBid = async () => {
    if (!selectedAuction) return;
    const amt  = Number(bidAmount);
    const minB = selectedAuction.currentBid + selectedAuction.minimumBidIncrement;
    if (!Number.isFinite(amt) || amt <= 0) return;
    if (amt < minB) { setBidFeedback({ type: 'error', message: `Your bid must be at least ${formatCurrency(minB)}.` }); setShowBidConfirm(false); return; }
    try {
      setPlacingBid(true); setBidFeedback(null);
      await auctionAPI.placeBid({ auctionId: selectedAuction._id, amount: amt });
      const res = await auctionAPI.getAuctionById(selectedAuction._id);
      const upd = res.data.auction as Auction;
      setSelectedAuction(upd); setBidAmount(String(upd.currentBid + upd.minimumBidIncrement));
      await refreshData();
      setBidFeedback({ type: 'success', message: `Your bid of ${formatCurrency(amt)} has been placed for ${upd.gem.type}.` });
    } catch (e) { console.error(e); setBidFeedback({ type: 'error', message: 'Bid placement failed. Please review the amount and try again.' }); }
    finally { setPlacingBid(false); setShowBidConfirm(false); }
  };

  const handleSignOut = () => { logout(); navigate('/login'); };

  /* ── Render helpers ── */
  const renderDashboard = () => {
    const stats      = dashboard?.stats;
    const winningBids = activeBids.filter(i => i.isWinning).length;
    const leadRate   = activeBids.length ? Math.round((winningBids / activeBids.length) * 100) : 0;
    const winRate    = stats?.totalBidsPlaced ? Math.round(((stats.wonAuctions || 0) / stats.totalBidsPlaced) * 100) : 0;

    return (
      <>
        {/* Hero banner */}
        <div className="bdr-hero hero-premium-mesh mb-4 animate-fade-up">
          <div>
            <p className="dashboard-eyebrow mb-2">Buyer Dashboard</p>
            <h4>Welcome back, {user?.name?.split(' ')[0]}!</h4>
            <p className="mb-0">Follow your bids, wins and watchlist movement at a glance.</p>
          </div>
          <div className="dashboard-chip-stack">
            <span className="dashboard-chip">{stats?.activeBids || 0} active bids</span>
            <span className="dashboard-chip dashboard-chip-soft">{watchlistIds.length} watched items</span>
          </div>
        </div>

        {/* Stat cards */}
        <div className="bdr-stat-grid mb-4">
          <QuickStat icon={<Gavel size={20}/>}     label="Total Bids" value={stats?.totalBidsPlaced || 0}      accent="#2f6de1" onClick={() => setView('auctions')} />
          <QuickStat icon={<Activity size={20}/>}  label="Active Bids" value={stats?.activeBids || 0}          accent="#10b981" onClick={() => setView('auctions')} />
          <QuickStat icon={<Trophy size={20}/>}    label="Won Auctions" value={stats?.wonAuctions || 0}         accent="#f59e0b" onClick={() => setView('auctions')} />
          <QuickStat icon={<Heart size={20}/>}     label="Watchlist" value={watchlistIds.length}                accent="#ef4444" onClick={() => setView('watchlist')} />
        </div>

        {/* Won-auction CTA cards */}
        {wonAuctionsWithoutContact.length > 0 && (
          <div className="mb-4">
            {wonAuctionsWithoutContact.map(a => (
              <WinningAuctionCard key={a._id} auction={a} onContactSeller={openSellerContact} onDismiss={id => setDismissedWinningAuctions(p => [...p, id])} />
            ))}
          </div>
        )}

        {/* Market snapshot */}
        <div className="bdr-analytics-row mb-4">
          <div className="content-card flex-fill animate-fade-up delay-2">
            <div className="card-body">
              <p className="dashboard-eyebrow mb-2">Bid performance</p>
              <h5 className="mb-3">Market snapshot</h5>
              <div className="bdr-metric-row">
                <MetricCard label="Active bids"   value={stats?.activeBids || 0} />
                <MetricCard label="Lead rate"     value={`${leadRate}%`}          color="#10b981" />
                <MetricCard label="Win rate"      value={`${winRate}%`}           color="#2f6de1" />
                <MetricCard label="Watchlist"     value={watchlistIds.length} />
              </div>
            </div>
          </div>

          {/* Watched auctions mini-list */}
          <div className="content-card bdr-watchlist-panel animate-fade-up delay-3">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <p className="dashboard-eyebrow mb-1">Saved items</p>
                  <h5 className="mb-0">Watched Auctions</h5>
                </div>
                <button className="bdr-link-btn" type="button" onClick={() => setView('watchlist')}>View All</button>
              </div>
              {watchedAuctions.length === 0 ? (
                <div className="dashboard-empty-inline">No watched auctions yet</div>
              ) : watchedAuctions.slice(0, 3).map(a => (
                <div key={a._id} className="bdr-watch-row">
                  <img src={a.gem.images?.[0] || 'https://via.placeholder.com/56x42'} alt={a.gem.type} className="bdr-watch-thumb" />
                  <div className="bdr-watch-info">
                    <span className="bdr-watch-name">{a.gem.type}</span>
                    <span className="bdr-watch-meta">{a.gem.carat} ct</span>
                  </div>
                  <div className="bdr-watch-bid">
                    <span className="bdr-watch-bid-label">Current bid</span>
                    <strong>{formatCurrency(a.currentBid)}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent listings */}
        <div className="content-card animate-fade-up delay-4">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <p className="dashboard-eyebrow mb-1">Pick up where you left off</p>
                <h5 className="mb-0">Recent Listings</h5>
              </div>
              <button className="bdr-link-btn" type="button" onClick={() => setView('marketplace')}>View All</button>
            </div>
            <div className="bdr-market-grid">
              {approvedGems.slice(0, 1).map(gem => (
                <article className="bdr-market-card" key={`gem-${gem._id}`}>
                  <div className="bdr-market-img-wrap">
                    <img className="bdr-market-img" src={gem.images?.[0] || 'https://via.placeholder.com/460x280'} alt={gem.type} />
                    <span className="bdr-market-badge bdr-badge-sale">Direct Sale</span>
                  </div>
                  <div className="bdr-market-body">
                    <strong className="bdr-market-name">{gem.type}</strong>
                    <p className="bdr-market-meta">{gem.origin}</p>
                    <p className="bdr-market-meta">By: <strong>{gem.seller.name}</strong></p>
                    <div className="bdr-market-actions">
                      <button className="bdr-btn-primary" type="button" onClick={() => openSellerContact(gem.seller, gem.type, gem._id)}>
                        Contact Seller
                      </button>
                    </div>
                  </div>
                </article>
              ))}
              {filteredAuctions.slice(0, 3).map(a => (
                <article className="bdr-market-card" key={a._id}>
                  <div className="bdr-market-img-wrap">
                    <img className="bdr-market-img" src={a.gem.images?.[0] || 'https://via.placeholder.com/460x280'} alt={a.gem.type} />
                    <span className="bdr-market-badge bdr-badge-live">Live Auction</span>
                  </div>
                  <div className="bdr-market-body">
                    <strong className="bdr-market-name">{a.gem.type}</strong>
                    <p className="bdr-market-meta">{a.gem.origin}</p>
                    <div className="bdr-market-price-row">
                      <span className="bdr-market-price">{formatCurrency(a.currentBid)}</span>
                      <span className="bdr-market-timer"><Timer size={12}/> {formatRemaining(a.endTime, nowMs)}</span>
                    </div>
                    <div className="bdr-market-actions">
                      <button className="bdr-btn-ghost" type="button" onClick={() => toggleWatchlist(a._id)}>
                        <Heart size={13} fill={watchlistIds.includes(a._id) ? 'currentColor' : 'none'}/>
                        {watchlistIds.includes(a._id) ? 'Watched' : 'Watch'}
                      </button>
                      <button className="bdr-btn-primary" type="button" onClick={() => openDetails(a._id)}>
                        <Eye size={13}/> View
                      </button>
                    </div>
                  </div>
                </article>
              ))}
              {approvedGems.length === 0 && filteredAuctions.length === 0 && (
                <div className="bdr-market-empty">
                  <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.4 }}>💎</div>
                  <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No listings available right now</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderAuctions = () => (
    <>
      <LiveAuctions auctions={liveAuctions} watchlistIds={watchlistIds} nowMs={nowMs}
        onToggleWatchlist={toggleWatchlist} onOpenDetails={openDetails}
        formatCurrency={formatCurrency} formatRemaining={formatRemaining} getLeadingBidderName={getLeadingBidderName} />

      <div className="content-card mt-4 animate-fade-up">
        <div className="card-body">
          <p className="dashboard-eyebrow mb-2">Bid tracking</p>
          <h5 className="mb-1">My Active Bids</h5>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>Track your active and past auction participation.</p>

          {activeBids.length === 0 ? (
            <div className="dashboard-empty-inline">You have no active bids at the moment.</div>
          ) : (
            <div className="bdr-market-grid">
              {activeBids.map(item => (
                <ActiveBidsCard key={item.auction._id} item={item} nowMs={nowMs}
                  formatCurrency={formatCurrency} formatRemaining={formatRemaining}
                  onIncreaseBid={b => { setSelectedAuction(b.auction); setShowBidConfirm(true); }}
                  onViewDetails={openDetails} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="content-card mt-4 animate-fade-up delay-1">
        <div className="card-body">
          <p className="dashboard-eyebrow mb-2">Past wins</p>
          <h5 className="mb-3">Won Auctions</h5>
          {wonAuctions.length === 0 ? (
            <div className="dashboard-empty-inline">No won auctions yet.</div>
          ) : wonAuctions.map(a => (
            <div key={a._id} className="bdr-won-row">
              <div>
                <strong className="bdr-won-name">{a.gem.type}</strong>
                <span className="bdr-won-meta">Seller: {a.seller.name}</span>
              </div>
              <div className="bdr-won-actions">
                <strong className="bdr-won-price">{formatCurrency(a.currentBid)}</strong>
                <button className="bdr-btn-ghost" type="button" onClick={() => openDetails(a._id)}>View</button>
                <button className="bdr-btn-primary" type="button" onClick={() => openSellerContact(a.seller, a.gem.type, a.gem._id)}>Contact</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  const renderWatchlist = () => (
    <div className="content-card animate-fade-up">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <p className="dashboard-eyebrow mb-1">Saved items</p>
            <h5 className="mb-0">My Watchlist <span style={{ fontWeight: 400, color: 'var(--text-secondary)', fontSize: 13 }}>({watchedAuctions.length})</span></h5>
          </div>
        </div>
        {watchedAuctions.length === 0 ? (
          <div className="bdr-market-empty">
            <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.4 }}>🔍</div>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No items in watchlist. Add some from Marketplace.</p>
          </div>
        ) : (
          <div className="bdr-market-grid">
            {watchedAuctions.map(a => (
              <article className="bdr-market-card" key={a._id}>
                <div className="bdr-market-img-wrap">
                  <img className="bdr-market-img" src={a.gem.images?.[0] || 'https://via.placeholder.com/460x280'} alt={a.gem.type} />
                  <span className="bdr-market-badge bdr-badge-live">Live Auction</span>
                </div>
                <div className="bdr-market-body">
                  <strong className="bdr-market-name">{a.gem.type}</strong>
                  <p className="bdr-market-meta">{a.gem.origin} · {a.gem.carat} ct</p>
                  <span className="bdr-market-price">{formatCurrency(a.currentBid)}</span>
                  <div className="bdr-market-actions mt-2">
                    <button className="bdr-btn-danger" type="button" onClick={() => toggleWatchlist(a._id)}>
                      <X size={13}/> Remove
                    </button>
                    <button className="bdr-btn-primary" type="button" onClick={() => openDetails(a._id)}>
                      <Eye size={13}/> View
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderBody = () => {
    if (!isBuyerAccount) return (
      <div className="content-card animate-fade-up">
        <div className="card-body">
          <h5 className="mb-2">Buyer access required</h5>
          <p className="mb-0" style={{ color: 'var(--text-secondary)' }}>
            You are currently signed in as <strong>{user?.role || 'unknown'}</strong>. Switch to a buyer account to view dashboard data, active bids, and won auctions.
          </p>
        </div>
      </div>
    );

    if (loading) return (
      <div className="content-card animate-fade-up">
        <div className="card-body" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div className="port-spinner" style={{ width: 32, height: 32, margin: '0 auto 16px', borderWidth: 3 }} />
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Loading your workspace…</p>
        </div>
      </div>
    );

    switch (view) {
      case 'marketplace': return (
        <Marketplace auctions={filteredAuctions} approvedGems={approvedGems} query={query}
          selectedType={selectedType} uniqueTypes={uniqueTypes} watchlistIds={watchlistIds}
          nowMs={nowMs} onTypeChange={setSelectedType} onToggleWatchlist={toggleWatchlist}
          onOpenDetails={openDetails} onOpenGemDetails={openGemDetails}
          onOpenSellerContact={openSellerContact} formatCurrency={formatCurrency}
          formatRemaining={formatRemaining} getLeadingBidderName={getLeadingBidderName} />
      );
      case 'auctions':   return renderAuctions();
      case 'watchlist':  return renderWatchlist();
      case 'messages':   return <MessagesPage initialContact={chatInitialContact} initialGem={chatInitialGem} />;
      default:           return renderDashboard();
    }
  };

  const initials = user?.name ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : 'B';

  return (
    <div className="bdr-shell">

      {/* ── Navbar ── */}
      <header className="bdr-navbar">
        <div className="bdr-navbar-inner">
          <button type="button" className="bdr-navbar-brand" onClick={() => setView('dashboard')}>
            <img src={logo} alt="GemFolio" className="bdr-navbar-logo" />
            <span>GemFolio</span>
          </button>
          <div className="bdr-navbar-actions">
            <div className="bdr-navbar-user">
              <span className="bdr-navbar-avatar">{initials}</span>
              <span>{user?.name?.split(' ')[0]}</span>
            </div>
            {onToggleTheme && (
              <button type="button" className="seller-navbar-theme-toggle" onClick={onToggleTheme}
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
                {theme === 'dark' ? <Sun size={15}/> : <Moon size={15}/>}
                <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Content wrapper ── */}
      <div className="bdr-content-wrapper">

        {/* ── Sidebar ── */}
        <aside className="bdr-sidebar">
          {/* Profile card */}
          <div className="sidebar-profile-section">
            <div className="sidebar-profile-card">
              <div className="sidebar-profile-avatar-container">
                <div className="sidebar-profile-avatar">
                  <div className="sidebar-profile-avatar-inner">{initials}</div>
                </div>
              </div>
              <div className="sidebar-profile-info">
                <div className="sidebar-profile-name" title={user?.name || ''}>{user?.name}</div>
                <div className="sidebar-profile-role-badge">Verified Buyer</div>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="sidebar-nav" aria-label="Buyer navigation">
            {NAV_ITEMS.map(({ view: v, icon, label }) => (
              <button
                key={v}
                type="button"
                className={`sidebar-nav-link ${view === v ? 'active' : ''}`}
                onClick={() => setView(v)}
              >
                {icon}
                <span style={{ flex: 1 }}>{label}</span>
                {v === 'messages' && unreadCount > 0 && (
                  <span className="bdr-unread-badge" aria-label={`${unreadCount} unread`}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Sign out */}
          <div className="sidebar-button-group">
            <button type="button" className="bdr-signout-btn" onClick={handleSignOut}>
              <LogOut size={15}/> Sign Out
            </button>
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="bdr-main">
          {renderBody()}
        </main>
      </div>

      {/* ── Modals / overlays ── */}
      <GemDetails
        selectedAuction={selectedAuction} selectedGemDetails={selectedGemDetails}
        loading={loadingDetails} bidAmount={bidAmount} bidFeedback={bidFeedback}
        placingBid={placingBid} bidHistory={bidHistory} onClose={closeDetails}
        onBidAmountChange={setBidAmount} onRequestBidConfirmation={requestBidConfirmation}
        formatCurrency={formatCurrency} formatDateTime={formatDateTime}
        getLeadingBidderName={getLeadingBidderName}
        getCertificateAccessUrl={getCertificateAccessUrl} isPdfCertificate={isPdfCertificate}
        onOpenSellerContact={openSellerContact}
      />

      <AuctionBid
        show={showBidConfirm} selectedAuction={selectedAuction} bidAmount={bidAmount}
        placingBid={placingBid} onCancel={() => setShowBidConfirm(false)} onConfirm={placeBid}
        formatCurrency={formatCurrency}
      />

      {selectedSeller && selectedGemForContact && (
        <SellerContactModal
          seller={selectedSeller} gemName={selectedGemForContact.name}
          onClose={closeSellerContact} onSendMessage={handleStartChatWithSeller}
        />
      )}
    </div>
  );
};

export default BuyerDashboard;