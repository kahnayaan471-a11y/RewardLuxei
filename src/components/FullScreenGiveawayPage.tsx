import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Crown,
  Sparkles,
  Trophy,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Ticket,
  ArrowRight,
  Share2,
  RefreshCw,
  Flame,
  Zap,
  Star,
  Gift,
  ShieldAlert,
  Send,
  ExternalLink
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { GoldCoin } from './GoldCoin';
import { VerifiedBadge } from './VerifiedBadge';
import {
  fetchGiveawayConfig,
  fetchUserGiveawayEntry,
  enterGiveaway,
  fetchGiveawayEntries
} from '../services/coinService';
import { GiveawayConfig, GiveawayEntry } from '../types';
import { sound } from '../utils/sound';
import { GiveawayCountdownTimer } from './GiveawayCountdownTimer';

interface FullScreenGiveawayPageProps {
  onClose: () => void;
  onOpenAuth: () => void;
  onOpenWithdraw?: () => void;
}

export const FullScreenGiveawayPage: React.FC<FullScreenGiveawayPageProps> = ({
  onClose,
  onOpenAuth,
  onOpenWithdraw
}) => {
  const { profile, currentUser } = useAuth();
  const [config, setConfig] = useState<GiveawayConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [userEntry, setUserEntry] = useState<GiveawayEntry | null>(null);
  const [entries, setEntries] = useState<GiveawayEntry[]>([]);
  const [entering, setEntering] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const [activeTab, setActiveTab] = useState<'prize_pool' | 'joined_users'>('prize_pool');
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [config?.prizeImageUrl]);

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

  const fallbackPrizeImage = 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=1200&q=80';
  const formattedUrl = formatDirectImageUrl(config?.prizeImageUrl);
  const prizeImgSrc = (!imgError && formattedUrl.length > 5)
    ? formattedUrl
    : fallbackPrizeImage;

  const loadGiveawayData = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const cfg = await fetchGiveawayConfig();
      setConfig(cfg);

      const list = await fetchGiveawayEntries(cfg.id);
      setEntries(list);

      if (profile?.uid) {
        const myEntry = await fetchUserGiveawayEntry(profile.uid, cfg.id);
        setUserEntry(myEntry);
      } else {
        setUserEntry(null);
      }
    } catch (err) {
      console.warn('Failed to load full screen giveaway data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGiveawayData();
  }, [profile?.uid]);

  const handleEnterGiveaway = async () => {
    if (!currentUser || !profile) {
      onOpenAuth();
      return;
    }

    setEntering(true);
    setFeedback(null);

    try {
      const result = await enterGiveaway(profile.uid);
      setFeedback({ success: true, message: result.message });
      setUserEntry(result.entry);
      sound.playWin();
      confetti({
        particleCount: 180,
        spread: 120,
        origin: { y: 0.5 },
        colors: ['#F59E0B', '#FBBF24', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6']
      });

      if (result.entry) {
        setEntries(prev => [
          result.entry,
          ...prev.filter(e => e.userId !== result.entry.userId)
        ]);
      }

      if (config) {
        const list = await fetchGiveawayEntries(config.id);
        setEntries(list);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Entry failed';
      setFeedback({ success: false, message: msg });
      sound.playError();
    } finally {
      setEntering(false);
    }
  };

  const handleShare = () => {
    const shareText = `👑 Join the PREMIUM VIP Giveaway on Rewardluxe! Win ${config?.title || 'iPhone 16 Pro & Cash Prizes'}! Register here: ${window.location.origin}`;
    if (navigator.share) {
      navigator.share({
        title: config?.title || 'Rewardluxe Premium VIP Giveaway',
        text: shareText,
        url: window.location.origin
      }).catch(() => {});
    } else {
      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 bg-slate-950 text-white overflow-y-auto min-h-screen flex flex-col custom-scrollbar"
    >
      {/* Background ambient lighting */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-80 h-80 bg-yellow-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Sticky Fullscreen Top Header */}
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-xl border-b border-amber-500/30 px-3 sm:px-6 py-2.5 flex items-center justify-between shadow-2xl gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer hover:bg-slate-800 hover:scale-105 active:scale-95 shrink-0"
            aria-label="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="min-w-0 flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Trophy className="w-4 h-4" />
            </div>
            <h1 className="font-display font-black text-base sm:text-lg text-amber-300 tracking-tight leading-none truncate">
              Refer Prize Pool
            </h1>
          </div>
        </div>

        {/* Header Right Controls: Coin Chip */}
        <div className="flex items-center gap-2 shrink-0">
          {profile && (
            <div className="flex bg-slate-900/90 border border-amber-500/40 rounded-xl px-2.5 py-1 items-center gap-1.5 shadow-md">
              <GoldCoin size="sm" />
              <span className="text-xs font-black text-amber-300">{profile.coins.toLocaleString()}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Fullscreen Scrollable Content */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-2 py-3 sm:px-6 sm:py-6 space-y-4 relative z-10">

        {loading && !config ? (
          <div className="py-24 text-center space-y-4">
            <RefreshCw className="w-10 h-10 animate-spin text-amber-400 mx-auto" />
            <p className="text-sm font-black text-amber-300 tracking-wider uppercase">Loading Premium VIP Prize Pool...</p>
          </div>
        ) : (
          <>
            {/* SEGMENTED TAB SWITCHER (Like Leaderboard) */}
            <div className="grid grid-cols-2 p-1 bg-slate-900/80 rounded-xl border border-slate-800 shadow-md gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('prize_pool')}
                className={`py-2.5 px-3 rounded-lg font-display font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'prize_pool'
                    ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800/60'
                }`}
              >
                <Trophy className="w-4 h-4 shrink-0" />
                <span>Winner & Prize Pool</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('joined_users')}
                className={`py-2.5 px-3 rounded-lg font-display font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'joined_users'
                    ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800/60'
                }`}
              >
                <Users className="w-4 h-4 shrink-0" />
                <span>Joined Users ({entries.length})</span>
              </button>
            </div>

            {/* TAB CONTENT 1: WINNER, PRIZE POOL & JOIN ACTION */}
            {activeTab === 'prize_pool' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Hero Prize Showcase Card */}
                <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl">
                  {/* Prize Image */}
                  <div className="aspect-[16/9] w-full relative overflow-hidden bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 flex items-center justify-center">
                    <img
                      key={prizeImgSrc}
                      src={prizeImgSrc}
                      alt="Premium Giveaway Prize"
                      referrerPolicy="no-referrer"
                      onError={() => {
                        console.warn('Prize image failed to load, switching to fallback image');
                        setImgError(true);
                      }}
                      className="w-full h-full object-cover transition-opacity duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
                  </div>

                  {/* Text Details Container */}
                  <div className="p-4 sm:p-6 space-y-2.5 relative z-10 bg-slate-950">
                    <h2 className="font-display font-black text-xl sm:text-2xl text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-400 leading-tight">
                      {config?.title || '🎁 Premium VIP Mega Giveaway'}
                    </h2>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                      {config?.description || 'Participate in this official community giveaway for a chance to win real physical rewards, iPhones, smartphones, cash pools, and exclusive bonus coin packs!'}
                    </p>
                  </div>
                </div>

                {/* 7 Days Live Countdown Timer */}
                <GiveawayCountdownTimer
                  endDate={config?.endDate}
                  createdAt={config?.createdAt}
                />

                {/* JOIN / ENTER ACTION CARD (On Winner / Prize Pool Side) */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                  {/* Feedback Banner */}
                  {feedback && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-2xl text-xs sm:text-sm font-bold flex items-start gap-3 ${
                        feedback.success
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-500/15 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {feedback.success ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <span className="leading-relaxed">{feedback.message}</span>
                    </motion.div>
                  )}

                  {/* Action Status or Button */}
                  {userEntry ? (
                    <div className="space-y-3">
                      <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-4 text-center shadow-inner">
                        <div className="flex items-center justify-center gap-2 text-emerald-400 font-black text-lg">
                          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                          <span>Joined</span>
                        </div>
                      </div>

                      {/* Telegram Winner Announcement Button */}
                      <a
                        href="https://t.me/faaaaaaaaaaaaaaj"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-sky-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-xs sm:text-sm transition-all shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 cursor-pointer border border-sky-300/40 text-center active:scale-98"
                      >
                        <Send className="w-4 h-4 text-white" />
                        <span>Winner Announcement on Telegram</span>
                        <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                      </a>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={handleEnterGiveaway}
                        disabled={entering || !config?.active}
                        className="group relative w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950 font-display font-black text-lg hover:from-amber-300 hover:to-yellow-400 active:scale-98 transition-all shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 border border-amber-200 overflow-hidden"
                      >
                        <div className="absolute inset-0 w-1/2 h-full bg-white/25 skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000" />

                        {entering ? (
                          <>
                            <RefreshCw className="w-6 h-6 animate-spin text-slate-950" />
                            <span>Joining...</span>
                          </>
                        ) : !config?.active ? (
                          <span>Giveaway Paused</span>
                        ) : (
                          <span>Join</span>
                        )}
                      </button>

                      {/* Telegram Winner Announcement Button */}
                      <a
                        href="https://t.me/faaaaaaaaaaaaaaj"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-sky-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-xs sm:text-sm transition-all shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 cursor-pointer border border-sky-300/40 text-center active:scale-98"
                      >
                        <Send className="w-4 h-4 text-white" />
                        <span>Winner Announcement on Telegram</span>
                        <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                      </a>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* TAB CONTENT 2: JOINED USERS LIST */}
            {activeTab === 'joined_users' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <h3 className="font-bold text-sm sm:text-base text-amber-300 uppercase tracking-wider flex items-center gap-2">
                      <Ticket className="w-5 h-5 text-amber-400" />
                      Joined Participants List ({entries.length})
                    </h3>
                    <button
                      onClick={handleShare}
                      className="text-xs font-bold text-amber-400 flex items-center gap-1.5 hover:text-amber-300 cursor-pointer transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                      Share Event
                    </button>
                  </div>

                  {entries.length === 0 ? (
                    <div className="text-center py-12 space-y-3 bg-slate-950/50 rounded-2xl p-6 border border-slate-800/50">
                      <Users className="w-12 h-12 text-slate-600 mx-auto" />
                      <p className="text-sm font-bold text-slate-400">
                        Abhi tak kisi user ne join nahi kiya hai. Sabse pehle participant banein!
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('prize_pool');
                          handleEnterGiveaway();
                        }}
                        className="px-5 py-2.5 bg-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg hover:bg-amber-400 cursor-pointer"
                      >
                        JOIN GIVEAWAY NOW
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 w-full">
                      {entries.map((entry, idx) => {
                        const isMe = profile?.uid && entry.userId === profile.uid;
                        return (
                          <div
                            key={entry.id || idx}
                            className={`flex items-center justify-between p-3.5 rounded-xl border transition-colors w-full ${
                              isMe
                                ? 'bg-amber-950/40 border-amber-500/80 shadow-md shadow-amber-500/10'
                                : 'bg-slate-900/70 hover:bg-slate-900 border-slate-800/80'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Rank Index Badge */}
                              <span className="text-xs font-black text-slate-500 w-6 text-center shrink-0">
                                #{idx + 1}
                              </span>

                              {entry.userPhoto ? (
                                <img
                                  src={entry.userPhoto}
                                  alt={entry.userName}
                                  className="w-9 h-9 rounded-full object-cover border border-amber-400/40 shrink-0"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 border border-amber-300">
                                  {entry.userName?.charAt(0).toUpperCase()}
                                </div>
                              )}

                              <div className="min-w-0">
                                <div className="font-bold text-slate-100 flex items-center gap-1.5 truncate text-xs sm:text-sm">
                                  <span>{entry.userName}</span>
                                  {isMe && (
                                    <span className="bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded uppercase">
                                      YOU
                                    </span>
                                  )}
                                  {entry.isVerified && <VerifiedBadge size="sm" />}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  Entered {new Date(entry.enteredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            </div>

                            <span className={`text-[10px] font-black px-3 py-1 rounded-full border shrink-0 flex items-center gap-1 ${
                              isMe
                                ? 'bg-amber-400 text-slate-950 border-amber-300'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>
                              <Star className="w-3 h-3 fill-current" />
                              {isMe ? 'YOU JOINED' : 'JOINED'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </>
        )}
      </main>
    </motion.div>
  );
};
