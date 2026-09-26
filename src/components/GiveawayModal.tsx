import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Crown,
  Sparkles,
  Trophy,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Coins,
  Ticket,
  ArrowRight,
  Gift,
  Share2,
  RefreshCw,
  Flame,
  Zap,
  Star,
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

interface GiveawayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth: () => void;
  onOpenWithdraw?: () => void;
}

export const GiveawayModal: React.FC<GiveawayModalProps> = ({
  isOpen,
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
      console.warn('Failed to load giveaway modal data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadGiveawayData();
    }
  }, [isOpen, profile?.uid]);

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
        particleCount: 150,
        spread: 100,
        origin: { y: 0.55 },
        colors: ['#F59E0B', '#FBBF24', '#10B981', '#3B82F6', '#EC4899']
      });

      if (result.entry) {
        setEntries(prev => [
          result.entry,
          ...prev.filter(e => e.userId !== result.entry.userId)
        ]);
      }

      // Refresh list
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
    const shareText = `👑 Join the Official VIP Giveaway on Rewardluxe! Win ${config?.title || 'iPhone 16 Pro & Cash Prizes'}! Claim your spot now: ${window.location.origin}`;
    if (navigator.share) {
      navigator.share({
        title: config?.title || 'Rewardluxe VIP Giveaway',
        text: shareText,
        url: window.location.origin
      }).catch(() => {});
    } else {
      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-xl overflow-y-auto">
        {/* Glow ambient backdrops */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border-2 border-amber-400/40 rounded-3xl shadow-2xl shadow-amber-500/10 overflow-hidden my-auto text-white flex flex-col max-h-[90vh]"
        >
          {/* Top VIP Accent Line */}
          <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 shadow-md shadow-amber-500/50" />

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-amber-500/20 bg-slate-950/80 sticky top-0 z-30 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/30 border border-amber-300">
                  <Crown className="w-5 h-5 text-slate-950 fill-slate-950 animate-bounce" />
                </div>
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
                </span>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="font-display font-black text-base sm:text-lg text-amber-300 tracking-tight leading-tight">
                    Giveaway
                  </h2>
                  <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400" />
                </div>
                <p className="text-[11px] text-amber-200/80 font-bold flex items-center gap-1 mt-0.5">
                  {config?.targetAudience === 'verified_only' ? (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                      <span>★ Verified Badge Only</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>✓ Open For All Members</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-2xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/60 flex items-center justify-center transition-all cursor-pointer hover:rotate-90 duration-300 shadow-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Modal Content */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
            {loading && !config ? (
              <div className="py-16 text-center space-y-3">
                <RefreshCw className="w-9 h-9 animate-spin text-amber-400 mx-auto" />
                <p className="text-xs text-amber-300 font-bold tracking-wider uppercase">Loading VIP Prize Pool...</p>
              </div>
            ) : (
              <>
                {/* Winner Declaration Banner if winner declared */}
                {config?.winnerName && (
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 p-4 rounded-2xl text-slate-950 shadow-2xl shadow-amber-500/25 border-2 border-amber-200 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
                      <Trophy className="w-32 h-32 text-slate-950" />
                    </div>

                    <div className="flex items-center gap-3.5 relative z-10">
                      <div className="w-13 h-13 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center shrink-0 shadow-xl border border-amber-300">
                        <Trophy className="w-7 h-7 text-amber-400 fill-amber-400 animate-pulse" />
                      </div>
                      <div className="min-w-0">
                        <div className="inline-flex items-center gap-1 bg-slate-950 text-amber-300 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider mb-1">
                          <Crown className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span>Official Winner Declared</span>
                        </div>
                        <h3 className="font-display font-black text-lg leading-tight text-slate-950 truncate">
                          🎉 {config.winnerName}
                        </h3>
                        <p className="text-xs text-slate-900 font-bold truncate mt-0.5">
                          Won: {config.winnerPrize || config.title}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Main Hero Prize Card */}
                <div className="relative rounded-3xl overflow-hidden border-2 border-amber-500/30 bg-slate-950 shadow-2xl group">
                  {/* Prize Image Showcase */}
                  <div className="aspect-[16/9] w-full relative overflow-hidden bg-slate-950">
                    <img
                      src={config?.prizeImageUrl || 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=800&q=80'}
                      alt="Giveaway Prize Pool"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-slate-950/20" />
                  </div>

                  {/* Top Floating Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 flex-wrap z-20">
                    <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-xl border backdrop-blur-md ${
                      config?.targetAudience === 'verified_only'
                        ? 'bg-blue-950/80 text-blue-300 border-blue-400/50'
                        : 'bg-emerald-950/80 text-emerald-300 border-emerald-400/50'
                    }`}>
                      {config?.targetAudience === 'verified_only' ? '★ Verified Badge Required' : '✓ Normal & Verified Users'}
                    </span>

                    <span className="bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-[11px] px-3 py-1 rounded-full uppercase tracking-wider shadow-xl border border-amber-300 flex items-center gap-1">
                      <GoldCoin size="sm" />
                      <span>{config?.entryFeeCoins === 0 ? 'FREE ENTRY' : `${config?.entryFeeCoins} Coins`}</span>
                    </span>
                  </div>

                  {/* Overlay Prize Text */}
                  <div className="p-4 sm:p-5 space-y-2 relative z-10 bg-gradient-to-b from-slate-950/90 to-slate-950 -mt-6 border-t border-slate-800/80 rounded-t-3xl backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                      <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1">
                        <Flame className="w-3 h-3 text-amber-400" />
                        Featured Prize Pool
                      </span>
                    </div>

                    <h3 className="font-display font-black text-xl sm:text-2xl text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-400 leading-tight">
                      {config?.title || '🎁 Mega Prize Pool Giveaway'}
                    </h3>

                    <p className="text-xs text-slate-300 leading-relaxed font-medium">
                      {config?.description || 'Take part in this official community giveaway for a chance to win smartphones, cash rewards, gadgets, and exclusive bonus coin prizes!'}
                    </p>
                  </div>
                </div>

                {/* 7 Days Live Countdown Timer */}
                <GiveawayCountdownTimer
                  endDate={config?.endDate}
                  createdAt={config?.createdAt}
                />

                {/* Quick Info Matrix */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-slate-900/90 border border-amber-500/20 p-3 rounded-2xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Participants</div>
                      <div className="text-sm font-black text-amber-300">{entries.length} Joined</div>
                    </div>
                  </div>

                  <div className="bg-slate-900/90 border border-amber-500/20 p-3 rounded-2xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Draw Mode</div>
                      <div className="text-sm font-black text-emerald-400">Official Spin</div>
                    </div>
                  </div>
                </div>

                {/* Action Box */}
                <div className="bg-slate-950 border border-amber-500/30 rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

                  {/* Feedback Banner */}
                  {feedback && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3.5 rounded-2xl text-xs font-bold flex items-start gap-2.5 ${
                        feedback.success
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-500/15 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {feedback.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <span className="leading-snug">{feedback.message}</span>
                    </motion.div>
                  )}

                  {/* Status or Button */}
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
                        className="group relative w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950 font-display font-black text-lg hover:from-amber-300 hover:to-yellow-400 active:scale-98 transition-all shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 border border-amber-200 overflow-hidden"
                      >
                        {/* Button shine line */}
                        <div className="absolute inset-0 w-1/2 h-full bg-white/20 skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000" />

                        {entering ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin text-slate-950" />
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

                {/* Participant List Section */}
                <div className="bg-slate-950/80 rounded-3xl p-4 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="font-bold text-xs text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Ticket className="w-4 h-4 text-amber-400" />
                      Live Participants List ({entries.length})
                    </h4>
                    <button
                      onClick={handleShare}
                      className="text-xs font-bold text-amber-400 flex items-center gap-1 hover:text-amber-300 cursor-pointer transition-colors"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      Share
                    </button>
                  </div>

                  {entries.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-6">
                      Abhi tak koi entry nahi hui hai. Pehle participant banein!
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-52 overflow-y-auto custom-scrollbar pr-1">
                      {entries.slice(0, 20).map((entry, idx) => (
                        <div
                          key={entry.id || idx}
                          className="flex items-center justify-between bg-slate-900/90 p-2.5 rounded-2xl border border-slate-800 text-xs hover:border-amber-500/30 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {entry.userPhoto ? (
                              <img
                                src={entry.userPhoto}
                                alt={entry.userName}
                                className="w-8 h-8 rounded-full object-cover border-2 border-amber-400/40 shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 border border-amber-300">
                                {entry.userName?.charAt(0).toUpperCase()}
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="font-bold text-slate-100 flex items-center gap-1 truncate text-xs">
                                <span>{entry.userName}</span>
                                {entry.isVerified && <VerifiedBadge size="sm" />}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Entered {new Date(entry.enteredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>

                          <span className="text-[10px] font-black bg-amber-500/10 text-amber-400 px-2.5 py-0.5 rounded-full border border-amber-500/20 shrink-0 flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-400" />
                            Joined
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
