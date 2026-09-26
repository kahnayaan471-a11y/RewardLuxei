import React, { useState, useEffect, useMemo } from 'react';
import {
  Gift,
  CheckCircle2,
  AlertCircle,
  Coins,
  ShieldCheck,
  Users,
  Image as ImageIcon,
  Save,
  RefreshCw,
  Sparkles,
  Award,
  Check,
  Trophy,
  Search,
  Crown,
  Trash2,
  Shuffle,
  Mail,
  UserCheck,
  ExternalLink,
  Eye,
  EyeOff
} from 'lucide-react';
import {
  fetchGiveawayConfig,
  updateGiveawayConfig,
  fetchGiveawayEntries,
  declareGiveawayWinner,
  clearGiveawayWinner,
  DEFAULT_GIVEAWAY_CONFIG,
  subscribeToFeatureToggles,
  updateFeatureToggles,
  DEFAULT_FEATURE_TOGGLES
} from '../services/coinService';
import { GiveawayConfig, GiveawayEntry, FeatureToggles } from '../types';
import { GiveawayCountdownTimer } from './GiveawayCountdownTimer';

const SAMPLE_PRESET_IMAGES = [
  {
    name: 'iPhone 16 Pro',
    url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80'
  },
  {
    name: 'AirBuds & Merch',
    url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80'
  },
  {
    name: 'Cash & Gold Coins',
    url: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=800&q=80'
  },
  {
    name: 'Smart Watch',
    url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'
  },
  {
    name: 'Gaming Laptop',
    url: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=800&q=80'
  }
];

export const AdminGiveawayTab: React.FC = () => {
  const [config, setConfig] = useState<GiveawayConfig>(DEFAULT_GIVEAWAY_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prizeImageUrl, setPrizeImageUrl] = useState('');
  const [targetAudience, setTargetAudience] = useState<'all' | 'verified_only'>('all');
  const [entryFeeCoins, setEntryFeeCoins] = useState<number>(0);
  const [active, setActive] = useState<boolean>(true);

  // Entries list
  const [entries, setEntries] = useState<GiveawayEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('File size is too large. Please select an image under 8MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setPrizeImageUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const formatDirectImageUrl = (url?: string): string => {
    if (!url || typeof url !== 'string') return '';
    let trimmed = url.trim();
    if (!trimmed) return '';
    if (trimmed.includes('drive.google.com')) {
      const fileIdMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/id=([a-zA-Z0-9_-]+)/);
      if (fileIdMatch && fileIdMatch[1]) {
        return `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}`;
      }
    }
    if (trimmed.includes('dropbox.com')) {
      return trimmed.replace('dl=0', 'raw=1').replace('www.dropbox.com', 'dl.dropboxusercontent.com');
    }
    return trimmed;
  };
  const [selectedWinnerCandidate, setSelectedWinnerCandidate] = useState<GiveawayEntry | null>(null);
  const [customPrizeTitle, setCustomPrizeTitle] = useState('');
  const [declaringWinner, setDeclaringWinner] = useState(false);
  const [isSpinningWinner, setIsSpinningWinner] = useState(false);
  const [spunCandidate, setSpunCandidate] = useState<GiveawayEntry | null>(null);

  // Home Screen Button Visibility
  const [featureToggles, setFeatureToggles] = useState<FeatureToggles>(DEFAULT_FEATURE_TOGGLES);
  const [togglingVisibility, setTogglingVisibility] = useState(false);

  useEffect(() => {
    const unsub = subscribeToFeatureToggles((toggles) => {
      setFeatureToggles(toggles);
    });
    return () => {
      unsub();
    };
  }, []);

  const handleToggleGiveawayVisibility = async () => {
    try {
      setTogglingVisibility(true);
      await updateFeatureToggles({
        showGiveaway: !featureToggles.showGiveaway
      });
    } catch (e) {
      console.error('Failed to toggle giveaway button visibility:', e);
    } finally {
      setTogglingVisibility(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const cfg = await fetchGiveawayConfig();
      setConfig(cfg);
      setTitle(cfg.title || '');
      setDescription(cfg.description || '');
      setPrizeImageUrl(cfg.prizeImageUrl || '');
      setTargetAudience(cfg.targetAudience || 'all');
      setEntryFeeCoins(cfg.entryFeeCoins || 0);
      setActive(cfg.active ?? true);

      // Fetch participants
      setLoadingEntries(true);
      const list = await fetchGiveawayEntries(cfg.id);
      setEntries(list);
    } catch (err) {
      console.warn('Failed to load giveaway data in admin tab:', err);
    } finally {
      setLoading(false);
      setLoadingEntries(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReset7DayCountdown = async () => {
    if (!window.confirm('Start a fresh 7-Day Countdown Timer for the giveaway from today?')) return;
    setSaving(true);
    try {
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      const newEndDate = Date.now() + SEVEN_DAYS_MS;
      const updated = await updateGiveawayConfig({
        endDate: newEndDate,
        createdAt: Date.now()
      });
      setConfig(updated);
      alert('🎉 Fresh 7-Day Countdown Timer started successfully!');
    } catch (err) {
      console.error('Failed to reset giveaway 7D timer:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      const updated = await updateGiveawayConfig({
        title,
        description,
        prizeImageUrl,
        targetAudience,
        entryFeeCoins: Number(entryFeeCoins) || 0,
        active
      });

      setConfig(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to update giveaway config:', err);
      alert('Failed to save settings. Please check your network connection.');
    } finally {
      setSaving(false);
    }
  };

  // Filtered Entries
  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const q = searchQuery.toLowerCase().trim();
    return entries.filter(
      e =>
        (e.userName && e.userName.toLowerCase().includes(q)) ||
        (e.userEmail && e.userEmail.toLowerCase().includes(q)) ||
        (e.userId && e.userId.toLowerCase().includes(q))
    );
  }, [entries, searchQuery]);

  // Handle Pick Winner (Manual Selection)
  const handleConfirmWinner = async (candidate: GiveawayEntry) => {
    if (!candidate) return;
    setDeclaringWinner(true);
    try {
      const prizeName = customPrizeTitle.trim() || title || 'Giveaway Prize Pool';
      const updated = await declareGiveawayWinner(
        {
          userId: candidate.userId,
          userName: candidate.userName,
          userEmail: candidate.userEmail,
          userPhoto: candidate.userPhoto
        },
        prizeName
      );
      setConfig(updated);
      setSelectedWinnerCandidate(null);
      setCustomPrizeTitle('');
      alert(`🎉 Winner declared successfully!\n\nWinner: ${candidate.userName}\nPrize: ${prizeName}`);
    } catch (err) {
      console.error('Failed to declare winner:', err);
      alert('Error declaring winner. Please try again.');
    } finally {
      setDeclaringWinner(false);
    }
  };

  // Handle Lucky Draw Random Winner Spinner
  const handleSpinRandomWinner = () => {
    if (entries.length === 0) {
      alert('Koi participants nahi hain jinho ne join kiya ho!');
      return;
    }

    setIsSpinningWinner(true);
    let counter = 0;
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * entries.length);
      setSpunCandidate(entries[randomIndex]);
      counter++;

      if (counter >= 20) {
        clearInterval(interval);
        setIsSpinningWinner(false);
        const finalWinner = entries[Math.floor(Math.random() * entries.length)];
        setSelectedWinnerCandidate(finalWinner);
        setCustomPrizeTitle(title);
      }
    }, 100);
  };

  // Handle Remove/Clear Winner
  const handleClearWinner = async () => {
    if (!window.confirm('Kya aap sure hain ki current Winner ko remove karna chahte hain?')) return;
    setDeclaringWinner(true);
    try {
      const updated = await clearGiveawayWinner();
      setConfig(updated);
      alert('Winner cleared successfully!');
    } catch (err) {
      console.error('Failed to clear winner:', err);
    } finally {
      setDeclaringWinner(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-400" />
        <span className="text-xs font-bold">Loading Giveaway Configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-emerald-500/10 border border-amber-500/20 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Gift className="w-6 h-6 text-amber-400" />
            <h2 className="text-lg font-black text-white">Giveaway &amp; Winner Management</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Track participants, spin lucky draw, select official winner, and configure entry criteria.
          </p>
        </div>
        <button
          onClick={loadData}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Home Screen Button Visibility Live Toggle Card */}
      <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0 shadow-inner">
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-display font-black text-sm sm:text-base text-white">
                Show Giveaway Button on User Home Screen
              </h4>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                featureToggles.showGiveaway
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}>
                {featureToggles.showGiveaway ? '● BUTTON VISIBLE' : '○ BUTTON HIDDEN'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Agar aap ise <strong>Hide</strong> karte hain to User Home Dashboard par Giveaway ka button/card turant hide ho jayega.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleGiveawayVisibility}
          disabled={togglingVisibility}
          className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all cursor-pointer border active:scale-95 shadow-md shrink-0 ${
            featureToggles.showGiveaway
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-300 shadow-amber-500/20'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600'
          }`}
        >
          {featureToggles.showGiveaway ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          <span>{featureToggles.showGiveaway ? 'Hide from Home Screen' : 'Show on Home Screen'}</span>
        </button>
      </div>

      {/* OFFICIAL WINNER BANNER (IF DECLARED) */}
      {config.winnerName ? (
        <div className="bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-600/20 border-2 border-amber-400 rounded-2xl p-5 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-amber-400/10 rounded-full blur-xl pointer-events-none" />

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 flex items-center justify-center font-black text-xl shadow-lg shrink-0">
                <Trophy className="w-8 h-8 text-slate-950 animate-bounce" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-amber-400 text-slate-950 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider">
                    🏆 Official Winner Declared
                  </span>
                  {config.winnerDeclaredAt && (
                    <span className="text-[11px] text-amber-300 font-mono">
                      {new Date(config.winnerDeclaredAt).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-black text-white mt-1 flex items-center gap-2">
                  <span>{config.winnerName}</span>
                </h3>

                <p className="text-xs text-amber-200/90 mt-0.5">
                  Prize: <strong className="text-white">{config.winnerPrize || config.title}</strong>
                  {config.winnerEmail && ` • Email: ${config.winnerEmail}`}
                  {config.winnerUid && ` • User ID: ${config.winnerUid}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleClearWinner}
                disabled={declaringWinner}
                className="px-3.5 py-2 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Winner</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Crown className="w-6 h-6 text-slate-500" />
            <div>
              <span className="text-xs font-bold text-slate-300 block">No Winner Declared Yet</span>
              <span className="text-[11px] text-slate-500">
                You can select a winner manually from the participant list below or use Lucky Draw random picker.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSpinRandomWinner}
            disabled={isSpinningWinner || entries.length === 0}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 shrink-0"
          >
            <Shuffle className={`w-4 h-4 ${isSpinningWinner ? 'animate-spin' : ''}`} />
            <span>{isSpinningWinner ? 'Spinning Participants...' : '🎲 Spin Lucky Draw Winner'}</span>
          </button>
        </div>
      )}

      {/* WINNER DECLARATION CONFIRMATION MODAL */}
      {selectedWinnerCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <Crown className="w-7 h-7" />
              <div>
                <h3 className="font-black text-lg text-white">Declare Giveaway Winner</h3>
                <p className="text-xs text-slate-400">Confirm winner details for prize pool</p>
              </div>
            </div>

            <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/80 space-y-2 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-400 text-slate-950 font-black flex items-center justify-center text-sm">
                  {selectedWinnerCandidate.userName?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <div className="font-bold text-white text-sm flex items-center gap-1.5">
                    <span>{selectedWinnerCandidate.userName}</span>
                    {selectedWinnerCandidate.isVerified && (
                      <ShieldCheck className="w-4 h-4 text-blue-400" />
                    )}
                  </div>
                  <span className="text-slate-400 text-[11px] block">{selectedWinnerCandidate.userEmail}</span>
                  <span className="text-slate-500 text-[10px] font-mono block">ID: {selectedWinnerCandidate.userId}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Prize Name / Reward Details
              </label>
              <input
                type="text"
                value={customPrizeTitle}
                onChange={e => setCustomPrizeTitle(e.target.value)}
                placeholder="e.g. iPhone 16 Pro (128GB)"
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedWinnerCandidate(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmWinner(selectedWinnerCandidate)}
                disabled={declaringWinner}
                className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {declaringWinner ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trophy className="w-4 h-4" />
                    <span>Confirm Winner</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Settings Form Column */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Gift className="w-4 h-4 text-amber-400" />
            <span>Giveaway Settings</span>
          </h3>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            {/* Live 7-Day Timer & Admin Control */}
            <div className="space-y-2">
              <GiveawayCountdownTimer
                endDate={config.endDate}
                createdAt={config.createdAt}
              />
              <button
                type="button"
                onClick={handleReset7DayCountdown}
                className="w-full py-2 px-3 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-black transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Restart 7-Day Countdown Timer</span>
              </button>
            </div>

            {/* Status Toggle */}
            <div className="flex items-center justify-between p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/60">
              <div>
                <span className="font-bold text-sm text-white block">Giveaway Status</span>
                <span className="text-xs text-slate-400">
                  {active ? 'Giveaway is LIVE and visible to users' : 'Giveaway is currently PAUSED'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActive(!active)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                  active
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                <div className={`w-2.5 h-2.5 rounded-full ${active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                <span>{active ? 'ACTIVE (LIVE)' : 'DISABLED'}</span>
              </button>
            </div>

            {/* Target Audience Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>Target Audience</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTargetAudience('all')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    targetAudience === 'all'
                      ? 'bg-emerald-500/15 border-emerald-500 text-white font-bold'
                      : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black text-emerald-400">Normal / All Users</span>
                    {targetAudience === 'all' && <Check className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400 font-normal">
                    Open for all users
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetAudience('verified_only')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    targetAudience === 'verified_only'
                      ? 'bg-blue-500/15 border-blue-500 text-white font-bold'
                      : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black text-blue-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Verified Only</span>
                    </span>
                    {targetAudience === 'verified_only' && <Check className="w-4 h-4 text-blue-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400 font-normal">
                    Verified badge required
                  </p>
                </button>
              </div>
            </div>

            {/* Entry Fee (Coins) */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>Entry Fee (Coins Required)</span>
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {[0, 50, 100, 250, 500].map(fee => (
                  <button
                    key={fee}
                    type="button"
                    onClick={() => setEntryFeeCoins(fee)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      entryFeeCoins === fee
                        ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    {fee === 0 ? 'FREE (0 Coins)' : `${fee} Coins`}
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={entryFeeCoins}
                onChange={e => setEntryFeeCoins(Math.max(0, parseInt(e.target.value) || 0))}
                placeholder="Enter custom coins fee..."
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Title & Description */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Giveaway Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. 🎁 iPhone 16 Pro & Cash Pool Giveaway"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Description / Prizes</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="e.g. Win iPhone 16 Pro, AirBuds, T-Shirts & ₹10,000 Cash Drop Rewards!"
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-400"
                  required
                />
              </div>
            </div>

            {/* Prize Pool Image Selection */}
            <div className="space-y-2.5">
              <label className="block text-xs font-bold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                  <span>Prize Pool Image</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">URL or Direct File Upload</span>
              </label>

              {/* Sample Preset Images */}
              <div>
                <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">Quick Presets:</span>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_PRESET_IMAGES.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPrizeImageUrl(img.url)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        prizeImageUrl === img.url
                          ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {img.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* URL Input + Upload File Button */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input
                  type="text"
                  value={prizeImageUrl}
                  onChange={e => setPrizeImageUrl(e.target.value)}
                  placeholder="Paste Image URL, Unsplash, Google Drive link..."
                  className="sm:col-span-3 px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-amber-400"
                  required
                />

                <label className="sm:col-span-1 px-3 py-2.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors text-center">
                  <ImageIcon className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate">Upload File</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Live Preview Box */}
              {prizeImageUrl && (
                <div className="mt-2 p-2 bg-slate-950 rounded-2xl border border-amber-500/30 flex items-center gap-3">
                  <img
                    src={formatDirectImageUrl(prizeImageUrl)}
                    alt="Live Prize Preview"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=800&q=80';
                    }}
                    className="w-16 h-12 object-cover rounded-xl border border-slate-800 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-emerald-400 block">✓ Live Image Preview</span>
                    <span className="text-[11px] text-slate-400 truncate block font-mono">{prizeImageUrl}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Settings</span>
                  </>
                )}
              </button>

              {savedSuccess && (
                <div className="mt-3 p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-bold flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Giveaway settings updated!</span>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Participants & Winners List Column ("Kis kis ne join kiya hai") */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <span>Joined Participants ({entries.length})</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                All users who have entered this giveaway
              </p>
            </div>

            {/* Random Pick Button */}
            <button
              type="button"
              onClick={handleSpinRandomWinner}
              disabled={isSpinningWinner || entries.length === 0}
              className="px-3 py-1.5 bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 shrink-0"
            >
              <Shuffle className={`w-3.5 h-3.5 ${isSpinningWinner ? 'animate-spin' : ''}`} />
              <span>Spin Winner</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search participants by name, email, or ID..."
              className="w-full pl-9 pr-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* List of Entries */}
          {loadingEntries ? (
            <div className="text-center py-12 text-slate-500 text-xs flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
              <span>Loading participants list...</span>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
              {searchQuery ? 'No participants found matching your search.' : 'No users have joined this giveaway yet.'}
            </div>
          ) : (
            <div className="max-h-[520px] overflow-y-auto space-y-2.5 pr-1">
              {filteredEntries.map((entry, idx) => {
                const isWinner = config.winnerUid === entry.userId;
                const isSpinSelected = spunCandidate?.userId === entry.userId;

                return (
                  <div
                    key={entry.id || idx}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 text-xs ${
                      isWinner
                        ? 'bg-amber-500/20 border-amber-400/80 shadow-md shadow-amber-500/10'
                        : isSpinSelected
                        ? 'bg-yellow-500/30 border-yellow-300 scale-102'
                        : 'bg-slate-800/60 border-slate-700/60 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        {entry.userPhoto ? (
                          <img
                            src={entry.userPhoto}
                            alt={entry.userName}
                            className="w-9 h-9 rounded-full object-cover border border-slate-700"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-slate-700 font-black text-amber-400 flex items-center justify-center text-xs">
                            {entry.userName ? entry.userName.charAt(0).toUpperCase() : 'U'}
                          </div>
                        )}
                        {isWinner && (
                          <div className="absolute -top-1.5 -right-1.5 bg-amber-400 text-slate-950 rounded-full p-0.5 shadow-sm">
                            <Crown className="w-3.5 h-3.5 fill-slate-950" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="font-bold text-white flex items-center gap-1.5 text-xs truncate">
                          <span className="truncate">{entry.userName || 'User'}</span>
                          {entry.isVerified && (
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          )}
                          {isWinner && (
                            <span className="bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded-md shrink-0">
                              WINNER
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 truncate">
                          {entry.userEmail && <span className="truncate">{entry.userEmail}</span>}
                          <span className="text-slate-600 font-mono">ID: {entry.userId?.slice(0, 8)}...</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-amber-400 block">
                          {entry.entryFeeCoins > 0 ? `${entry.entryFeeCoins} Coins` : 'FREE'}
                        </span>
                        <span className="text-[9px] text-slate-500">
                          {new Date(entry.enteredAt).toLocaleDateString()}
                        </span>
                      </div>

                      {isWinner ? (
                        <div className="px-2.5 py-1.5 bg-amber-400/20 text-amber-300 font-bold text-[10px] rounded-xl border border-amber-400/40 flex items-center gap-1">
                          <Trophy className="w-3 h-3 text-amber-400" />
                          <span>Winner</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedWinnerCandidate(entry);
                            setCustomPrizeTitle(title);
                          }}
                          className="px-2.5 py-1.5 bg-slate-700 hover:bg-amber-500 hover:text-slate-950 text-slate-300 font-bold text-[11px] rounded-xl transition-all cursor-pointer flex items-center gap-1 border border-slate-600 hover:border-amber-400"
                        >
                          <Crown className="w-3 h-3" />
                          <span>Make Winner</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
