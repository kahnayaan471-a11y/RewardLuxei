import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Flame,
  CreditCard,
  Sparkles,
  RefreshCw,
  Gift,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  Play,
  Clock,
  ExternalLink,
  ChevronRight,
  ListTodo,
  CalendarCheck,
  Ticket,
  Crown,
  Trophy,
  Gamepad2
} from 'lucide-react';
import { GoldCoin } from './GoldCoin';
import { useAuth } from '../context/AuthContext';
import {
  DEFAULT_SETTINGS,
  getTodayDateString,
  getYesterdayDateString,
  fetchTasks,
  subscribeToTasks,
  fetchUserTaskProgress,
  fetchGiveawayConfig,
  subscribeToFeatureToggles,
  DEFAULT_FEATURE_TOGGLES
} from '../services/coinService';
import { AppTask, UserTaskStatus, GiveawayConfig, FeatureToggles } from '../types';
import { GiveawayCountdownTimer } from './GiveawayCountdownTimer';

const SpinWheelIcon: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
    <svg viewBox="0 0 100 100" className="w-full h-full animate-[spin_10s_linear_infinite]" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#020617" stroke="#FBBF24" strokeWidth="4" />
      <path d="M50 50 L50 4 A46 46 0 0 1 82.5 17.5 Z" fill="#F59E0B" />
      <path d="M50 50 L82.5 17.5 A46 46 0 0 1 96 50 Z" fill="#3B82F6" />
      <path d="M50 50 L96 50 A46 46 0 0 1 82.5 82.5 Z" fill="#10B981" />
      <path d="M50 50 L82.5 82.5 A46 46 0 0 1 50 96 Z" fill="#EC4899" />
      <path d="M50 50 L50 96 A46 46 0 0 1 17.5 82.5 Z" fill="#8B5CF6" />
      <path d="M50 50 L17.5 82.5 A46 46 0 0 1 4 50 Z" fill="#EF4444" />
      <path d="M50 50 L4 50 A46 46 0 0 1 17.5 17.5 Z" fill="#06B6D4" />
      <path d="M50 50 L17.5 17.5 A46 46 0 0 1 50 4 Z" fill="#F97316" />
      <circle cx="50" cy="50" r="46" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.5" />
      <circle cx="50" cy="50" r="12" fill="#020617" stroke="#FDE047" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="5" fill="#F59E0B" />
    </svg>
    <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-10 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[8px] border-t-amber-300 drop-shadow-sm" />
  </div>
);

const ScratchCardIcon: React.FC<{ className?: string }> = ({ className = "w-9 h-9" }) => (
  <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="18" width="84" height="64" rx="12" fill="url(#scratchBg)" stroke="#DDD6FE" strokeWidth="3" />
      <path d="M22 32 H78 M22 42 H60 M22 52 H45" stroke="#C084FC" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      <circle cx="70" cy="54" r="18" fill="url(#goldCoin)" stroke="#F59E0B" strokeWidth="2" />
      <text x="70" y="60" textAnchor="middle" fill="#78350F" fontSize="16" fontWeight="900" fontFamily="sans-serif">★</text>
      {/* Scratch silver metallic patch */}
      <rect x="18" y="28" width="38" height="42" rx="8" fill="url(#silverScratch)" stroke="#94A3B8" strokeWidth="1.5" />
      {/* Scratch reveal wave lines */}
      <path d="M22 38 Q 28 32, 34 38 T 46 38" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M24 50 Q 30 44, 36 50 T 48 50" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M22 60 Q 28 54, 34 60" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
      {/* Sparkle icon scratching off */}
      <path d="M50 20 L53 14 L56 20 L62 23 L56 26 L53 32 L50 26 L44 23 Z" fill="#FDE047" />
      <defs>
        <linearGradient id="scratchBg" x1="0" y1="0" x2="100" y2="100">
          <stop offset="0%" stopColor="#7E22CE" />
          <stop offset="100%" stopColor="#4C1D95" />
        </linearGradient>
        <linearGradient id="goldCoin" x1="52" y1="36" x2="88" y2="72">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="silverScratch" x1="18" y1="28" x2="56" y2="70">
          <stop offset="0%" stopColor="#F1F5F9" />
          <stop offset="50%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#94A3B8" />
        </linearGradient>
      </defs>
    </svg>
  </div>
);

const CaptchaIcon: React.FC<{ className?: string }> = ({ className = "w-9 h-9" }) => (
  <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="15" width="80" height="70" rx="12" fill="#0F172A" stroke="#10B981" strokeWidth="3" />
      <rect x="20" y="32" width="28" height="28" rx="6" fill="#10B981" stroke="#34D399" strokeWidth="2" />
      <path d="M25 46 L32 52 L43 37" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M60 32 A 16 16 0 0 1 80 48" stroke="#38BDF8" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <path d="M78 40 L80 48 L72 48" fill="#38BDF8" />
      <path d="M80 56 A 16 16 0 0 1 60 70" stroke="#34D399" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <path d="M62 62 L60 70 L68 70" fill="#34D399" />
      <rect x="20" y="68" width="28" height="6" rx="3" fill="#64748B" />
    </svg>
  </div>
);

const DailyCheckInIcon: React.FC<{ className?: string; checked?: boolean }> = ({ className = "w-9 h-9", checked = false }) => (
  <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="12" y="20" width="76" height="68" rx="14" fill="#020617" stroke="#EA580C" strokeWidth="3" />
      <rect x="12" y="20" width="76" height="22" rx="12" fill="#F97316" />
      <circle cx="30" cy="18" r="4" fill="#FFFFFF" stroke="#C2410C" strokeWidth="2" />
      <circle cx="70" cy="18" r="4" fill="#FFFFFF" stroke="#C2410C" strokeWidth="2" />
      
      {checked ? (
        <>
          <circle cx="50" cy="60" r="18" fill="#10B981" />
          <path d="M41 60 L47 66 L59 52" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <circle cx="50" cy="60" r="18" fill="url(#checkInCoin)" stroke="#FBBF24" strokeWidth="2" />
          <path d="M50 48 L53 55 L60 56 L55 61 L56 68 L50 64 L44 68 L45 61 L40 56 L47 55 Z" fill="#78350F" />
        </>
      )}

      <defs>
        <linearGradient id="checkInCoin" x1="32" y1="42" x2="68" y2="78">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
    </svg>
  </div>
);

const PromoCodeIcon: React.FC<{ className?: string }> = ({ className = "w-9 h-9" }) => (
  <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="12" y="22" width="76" height="56" rx="12" fill="#0F172A" stroke="#F59E0B" strokeWidth="3" />
      <path d="M12 50 C 20 50, 20 40, 12 40" fill="#020617" stroke="#F59E0B" strokeWidth="2" />
      <path d="M88 50 C 80 50, 80 40, 88 40" fill="#020617" stroke="#F59E0B" strokeWidth="2" />
      <path d="M50 22 V 78" stroke="#FBBF24" strokeWidth="2.5" strokeDasharray="4 4" />
      <circle cx="35" cy="50" r="12" fill="url(#promoCoin)" stroke="#F59E0B" strokeWidth="1.5" />
      <text x="35" y="55" textAnchor="middle" fill="#78350F" fontSize="12" fontWeight="900" fontFamily="sans-serif">%</text>
      <path d="M60 38 H78 M60 50 H75 M60 62 H70" stroke="#FDE047" strokeWidth="3" strokeLinecap="round" />
      <defs>
        <linearGradient id="promoCoin" x1="23" y1="38" x2="47" y2="62">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
    </svg>
  </div>
);

const TasksOffersIcon: React.FC<{ className?: string }> = ({ className = "w-9 h-9" }) => (
  <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="18" y="16" width="64" height="72" rx="12" fill="#1E1B4B" stroke="#818CF8" strokeWidth="3" />
      <rect x="36" y="10" width="28" height="12" rx="4" fill="#6366F1" stroke="#A5B4FC" strokeWidth="2" />
      <circle cx="28" cy="38" r="7" fill="#10B981" />
      <path d="M25 38 L27 40 L31 36" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M40 38 H72" stroke="#E0E7FF" strokeWidth="3" strokeLinecap="round" />
      <circle cx="28" cy="54" r="7" fill="#10B981" />
      <path d="M25 54 L27 56 L31 52" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M40 54 H68" stroke="#E0E7FF" strokeWidth="3" strokeLinecap="round" />
      <circle cx="28" cy="70" r="7" fill="#F59E0B" />
      <text x="28" y="74" textAnchor="middle" fill="#78350F" fontSize="10" fontWeight="900" fontFamily="sans-serif">★</text>
      <path d="M40 70 H60" stroke="#A5B4FC" strokeWidth="3" strokeLinecap="round" />
    </svg>
  </div>
);

const GiveawayTrophyIcon: React.FC<{ className?: string }> = ({ className = "w-9 h-9" }) => (
  <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 28 C 10 28, 10 52, 28 54" stroke="#F59E0B" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M78 28 C 90 28, 90 52, 72 54" stroke="#F59E0B" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M25 20 H75 L68 56 C 65 66, 35 66, 32 56 Z" fill="url(#trophyGrad)" stroke="#FEF08A" strokeWidth="2.5" />
      <rect x="42" y="64" width="16" height="16" fill="#D97706" />
      <rect x="28" y="80" width="44" height="10" rx="4" fill="#78350F" stroke="#FDE047" strokeWidth="1.5" />
      <path d="M40 46 L43 36 L50 42 L57 36 L60 46 Z" fill="#78350F" />
      <circle cx="50" cy="34" r="2.5" fill="#EF4444" />
      <circle cx="42" cy="34" r="2" fill="#3B82F6" />
      <circle cx="58" cy="34" r="2" fill="#3B82F6" />
      <defs>
        <linearGradient id="trophyGrad" x1="25" y1="20" x2="75" y2="60">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
      </defs>
    </svg>
  </div>
);

interface HomeDashboardProps {
  onOpenWithdraw: () => void;
  onOpenCheckIn: () => void;
  onOpenAuth: () => void;
  onOpenSpinFullScreen: () => void;
  onOpenScratchFullScreen: () => void;
  onOpenCaptchaFullScreen: () => void;
  onOpenTasks: () => void;
  onOpenPromoModal?: () => void;
  onSelectTask?: (task: AppTask) => void;
  onGoToReferral?: () => void;
  onGoToLeaderboard?: () => void;
  onOpenGiveaway?: () => void;
  onOpenTournament?: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  onOpenWithdraw,
  onOpenCheckIn,
  onOpenSpinFullScreen,
  onOpenScratchFullScreen,
  onOpenCaptchaFullScreen,
  onOpenTasks,
  onOpenPromoModal,
  onSelectTask,
  onGoToReferral,
  onOpenGiveaway,
  onOpenTournament
}) => {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<AppTask[]>([]);
  const [userTaskProgress, setUserTaskProgress] = useState<Record<string, UserTaskStatus>>({});
  const [giveawayConfig, setGiveawayConfig] = useState<GiveawayConfig | null>(null);
  const [featureToggles, setFeatureToggles] = useState<FeatureToggles>(DEFAULT_FEATURE_TOGGLES);

  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();
  const hasClaimedCheckIn = profile?.lastCheckInDate === today;
  const isStreakActive = profile?.lastCheckInDate === yesterday || hasClaimedCheckIn;
  const activeStreak = isStreakActive ? (profile?.dailyStreak || 0) : 0;
  const nextStreakDay = hasClaimedCheckIn
    ? (((activeStreak - 1) % 7) + 1)
    : ((activeStreak % 7) + 1);

  const spinsLeft = profile?.spinsLeftToday ?? DEFAULT_SETTINGS.dailySpinLimit;
  const scratchesLeft = profile?.scratchesLeftToday ?? DEFAULT_SETTINGS.dailyScratchLimit;
  const captchasLeft = profile?.captchasLeftToday ?? DEFAULT_SETTINGS.dailyCaptchaLimit;

  useEffect(() => {
    loadHomeTasks();

    fetchGiveawayConfig()
      .then((cfg) => setGiveawayConfig(cfg))
      .catch(() => {});

    const unsubscribe = subscribeToTasks((liveTasks) => {
      setTasks(liveTasks);
    }, false);

    const unsubToggles = subscribeToFeatureToggles((liveToggles) => {
      setFeatureToggles(liveToggles);
    });

    return () => {
      unsubscribe();
      unsubToggles();
    };
  }, [profile?.uid]);

  const loadHomeTasks = async () => {
    try {
      const list = await fetchTasks(false);
      setTasks(list);
      if (profile?.uid) {
        const progress = await fetchUserTaskProgress(profile.uid);
        setUserTaskProgress(progress);
      }
    } catch (e) {
      console.warn('Could not load home tasks preview:', e);
    }
  };

  const totalTaskCoins = tasks.reduce((sum, t) => sum + (t.coins || 0), 0);

  return (
    <div className="space-y-4 sm:space-y-5 pb-24 max-w-2xl mx-auto">
      {/* 1. Hero Main Wallet Box */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 rounded-3xl p-5 sm:p-6 text-white shadow-2xl relative overflow-hidden border border-slate-700/60">
        {/* Glow backdrop circles */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shadow-inner">
                <GoldCoin className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Wallet Balance
              </span>
            </div>

            {/* Streak Badge Box */}
            <button
              onClick={onOpenCheckIn}
              className="flex items-center gap-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/30 px-3 py-1 rounded-xl text-xs font-black transition-all active:scale-95 shadow-sm cursor-pointer"
            >
              <Flame className="w-4 h-4 text-orange-400 fill-orange-400" />
              <span>{activeStreak} Day Streak</span>
            </button>
          </div>

          {/* Big Balance Number & Withdraw CTA */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-baseline gap-2">
                <GoldCoin className="w-8 h-8 sm:w-10 sm:h-10 self-center" />
                <span className="font-display font-black text-4xl sm:text-5xl tracking-tight text-white">
                  {(profile?.coins || 0).toLocaleString()}
                </span>
                <span className="text-amber-400 font-display font-bold text-lg">Coins</span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Real Cash: <strong className="text-emerald-400 font-bold">₹{((profile?.coins || 0) / 100).toFixed(2)}</strong> (100 Coins = ₹1 INR)
              </p>
            </div>

            <button
              onClick={onOpenWithdraw}
              className="px-5 py-3 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-slate-950 font-display font-black text-sm rounded-2xl shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <CreditCard className="w-4 h-4" />
              <span>Withdraw Cash</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Play & Earn Arena: 2x2 Interactive Grid Boxes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-display font-black text-base sm:text-lg text-slate-900 flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-600 flex items-center justify-center font-bold">
              <Zap className="w-4 h-4 fill-amber-500" />
            </div>
            <span>Play &amp; Earn Games</span>
          </h3>
        </div>

        {/* 2x2 Grid of Game Boxes */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* BOX 1: Lucky Wheel Spin */}
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={onOpenSpinFullScreen}
            className="group cursor-pointer bg-gradient-to-br from-amber-500 via-amber-600 to-yellow-600 rounded-3xl p-4 sm:p-5 text-slate-950 shadow-xl shadow-amber-500/20 relative overflow-hidden border-2 border-amber-300 flex flex-col justify-between min-h-[170px] sm:min-h-[190px]"
          >
            {/* Top row badge */}
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-slate-950 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform p-1.5">
                <SpinWheelIcon className="w-9 h-9" />
              </div>
            </div>

            {/* Bottom info */}
            <div className="mt-3">
              <h4 className="font-display font-black text-base sm:text-lg text-slate-950 leading-tight">
                Lucky Spin
              </h4>

              <div className="mt-2.5 pt-2 border-t border-slate-950/15 flex items-center justify-between text-xs font-black">
                <span className="bg-white/40 text-slate-950 px-2 py-0.5 rounded-md text-[10px]">
                  {spinsLeft} Left Today
                </span>
                <div className="w-6 h-6 rounded-full bg-slate-950 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Play className="w-3 h-3 fill-white ml-0.5" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* BOX 2: Golden Scratch Card */}
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={onOpenScratchFullScreen}
            className="group cursor-pointer bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-700 rounded-3xl p-4 sm:p-5 text-white shadow-xl shadow-purple-600/20 relative overflow-hidden border-2 border-purple-400 flex flex-col justify-between min-h-[170px] sm:min-h-[190px]"
          >
            {/* Top row badge */}
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform p-1.5">
                <ScratchCardIcon className="w-9 h-9" />
              </div>
            </div>

            {/* Bottom info */}
            <div className="mt-3">
              <h4 className="font-display font-black text-base sm:text-lg text-white leading-tight">
                Scratch &amp; Win
              </h4>

              <div className="mt-2.5 pt-2 border-t border-white/20 flex items-center justify-between text-xs font-black">
                <span className="bg-white/20 text-white px-2 py-0.5 rounded-md text-[10px]">
                  {scratchesLeft} Left Today
                </span>
                <div className="w-6 h-6 rounded-full bg-white text-purple-900 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Play className="w-3 h-3 fill-purple-900 ml-0.5" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* BOX 3: Solve Captcha & Earn */}
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={onOpenCaptchaFullScreen}
            className="group cursor-pointer bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 rounded-3xl p-4 sm:p-5 text-white shadow-xl shadow-emerald-600/20 relative overflow-hidden border-2 border-emerald-400 flex flex-col justify-between min-h-[170px] sm:min-h-[190px]"
          >
            {/* Top row badge */}
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform p-1.5">
                <CaptchaIcon className="w-9 h-9" />
              </div>
            </div>

            {/* Bottom info */}
            <div className="mt-3">
              <h4 className="font-display font-black text-base sm:text-lg text-white leading-tight">
                Solve Captcha
              </h4>

              <div className="mt-2.5 pt-2 border-t border-white/20 flex items-center justify-between text-xs font-black">
                <span className="bg-white/20 text-white px-2 py-0.5 rounded-md text-[10px]">
                  {captchasLeft} Left Today
                </span>
                <div className="w-6 h-6 rounded-full bg-white text-emerald-900 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Play className="w-3 h-3 fill-emerald-900 ml-0.5" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* BOX 4: Daily Check-In Bonus Box */}
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={onOpenCheckIn}
            className={`group cursor-pointer rounded-3xl p-4 sm:p-5 shadow-xl relative overflow-hidden border-2 flex flex-col justify-between min-h-[170px] sm:min-h-[190px] ${
              hasClaimedCheckIn
                ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 text-slate-300'
                : 'bg-gradient-to-br from-rose-500 via-orange-500 to-amber-500 border-orange-300 text-white shadow-orange-500/20'
            }`}
          >
            {/* Top row badge */}
            <div className="flex items-start justify-between">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg p-1.5 ${
                  hasClaimedCheckIn
                    ? 'bg-slate-800 border border-slate-700'
                    : 'bg-white/90 shadow-orange-600/30 ring-2 ring-white/50'
                }`}
              >
                <DailyCheckInIcon className="w-9 h-9" checked={hasClaimedCheckIn} />
              </div>
              <span
                className={`text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1 ${
                  hasClaimedCheckIn
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-950 text-amber-300 border border-amber-300/30'
                }`}
              >
                <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
                {hasClaimedCheckIn ? 'CLAIMED' : 'BONUS'}
              </span>
            </div>

            {/* Bottom info */}
            <div className="mt-3">
              <h4 className="font-display font-black text-base sm:text-lg text-white leading-tight">
                Daily Check-In
              </h4>

              <div
                className={`mt-2.5 pt-2 flex items-center justify-between text-xs font-black ${
                  hasClaimedCheckIn ? 'border-t border-slate-700' : 'border-t border-white/20'
                }`}
              >
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] ${
                    hasClaimedCheckIn ? 'bg-slate-700 text-slate-300' : 'bg-white/20 text-white'
                  }`}
                >
                  Day {nextStreakDay} {hasClaimedCheckIn ? '(Claimed)' : ''}
                </span>
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform ${
                    hasClaimedCheckIn ? 'bg-slate-700 text-slate-300' : 'bg-white text-orange-600'
                  }`}
                >
                  <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* 2.5 PROMO / COUPON CODE INSTANT BONUS CARD */}
      <motion.div
        whileHover={{ scale: 1.015, y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={onOpenPromoModal}
        className="group cursor-pointer bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 rounded-3xl p-4 sm:p-5 text-slate-950 shadow-xl shadow-amber-500/20 relative overflow-hidden border-2 border-amber-300 transition-all"
      >
        <div className="absolute -right-8 -top-8 w-28 h-28 bg-white/30 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-slate-950 flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform shrink-0 p-1.5">
              <PromoCodeIcon className="w-9 h-9" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="font-display font-black text-base sm:text-lg text-slate-950 leading-tight">
                  Have a Promo Code?
                </h4>
              </div>
            </div>
          </div>

          <div className="shrink-0 flex items-center">
            <div className="px-3.5 py-2 bg-slate-950 text-white group-hover:bg-purple-950 rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-colors">
              <span>Redeem</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* 3. TASK & OFFERS ACCESS BUTTON (Opens all tasks when clicked) */}
      <div className="space-y-3 pt-2">
        <motion.div
          whileHover={{ scale: 1.015, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={onOpenTasks}
          className="group cursor-pointer bg-gradient-to-br from-[#2D0A4E] via-[#4A0E78] to-[#1E0638] rounded-3xl p-4 sm:p-5 text-white shadow-xl shadow-purple-900/25 relative overflow-hidden border-2 border-purple-400/40 transition-all hover:border-purple-300"
        >
          {/* Subtle glow circles */}
          <div className="absolute -top-12 -right-12 w-44 h-44 bg-purple-500/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-44 h-44 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between gap-3 sm:gap-4">
            {/* Left: Icon and Title */}
            <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
              <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform shrink-0 border border-white/20 p-1.5">
                <TasksOffersIcon className="w-9 h-9 sm:w-10 sm:h-10" />
              </div>

              <div className="min-w-0">
                <h3 className="font-display font-black text-lg sm:text-xl text-white tracking-tight leading-tight">
                  Tasks &amp; Offers
                </h3>
              </div>
            </div>

            {/* Right: Action Arrow */}
            <div className="flex items-center shrink-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white text-purple-950 flex items-center justify-center font-bold shadow-md group-hover:bg-amber-400 group-hover:text-slate-950 transition-colors">
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* 4. OFFICIAL GIVEAWAY & PRIZE POOL CARD (Below Tasks & Offers) */}
        {featureToggles.showGiveaway !== false && (
          <motion.div
            whileHover={{ scale: 1.015, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              if (onOpenGiveaway) {
                onOpenGiveaway();
              } else if (onGoToReferral) {
                onGoToReferral();
              }
            }}
            className="group cursor-pointer bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 rounded-3xl p-4 sm:p-5 text-white shadow-2xl shadow-amber-500/15 relative overflow-hidden border-2 border-amber-400/50 transition-all hover:border-amber-300"
          >
            {/* Animated Gold Shimmer background glow */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-500/30 transition-colors" />
            <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-yellow-500/15 rounded-full blur-3xl pointer-events-none" />

            {/* Top VIP Accent stripe */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 shadow-sm shadow-amber-500/50" />

            <div className="relative z-10 flex items-center justify-between gap-3 sm:gap-4">
              {/* Left: Icon and Title */}
              <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/30 group-hover:scale-105 transition-transform border border-amber-400/60 p-1.5">
                    <GiveawayTrophyIcon className="w-9 h-9 sm:w-10 sm:h-10" />
                  </div>
                </div>

                <div className="min-w-0">
                  <h3 className="font-display font-black text-xl sm:text-2xl text-amber-300 tracking-tight leading-none truncate">
                    Giveaway
                  </h3>
                </div>
              </div>

              {/* Right: Action Arrow */}
              <div className="flex items-center shrink-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-amber-500/30 group-hover:bg-amber-300 transition-colors border border-amber-200">
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* 5. FREE FIRE MAX ESPORTS TOURNAMENT CARD (Below Giveaway) */}
        {featureToggles.showTournaments !== false && (
          <motion.div
            whileHover={{ scale: 1.015, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={onOpenTournament}
            className="group cursor-pointer bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-500 rounded-3xl p-4 sm:p-5 text-slate-950 shadow-xl shadow-orange-600/25 relative overflow-hidden border-2 border-amber-300 transition-all"
          >
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/30 rounded-full blur-xl pointer-events-none" />

            <div className="relative z-10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform shrink-0">
                  <Gamepad2 className="w-7 h-7 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-display font-black text-base sm:text-lg text-slate-950 leading-tight">
                    Free Fire MAX Tournaments
                  </h4>
                </div>
              </div>

              <div className="shrink-0 flex items-center">
                <div className="px-3.5 py-2 bg-slate-950 text-white group-hover:bg-slate-900 rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-colors">
                  <span>Join Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
