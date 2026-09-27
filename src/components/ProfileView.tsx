import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  Mail,
  Coins,
  CreditCard,
  History,
  LogOut,
  Flame,
  Shield,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Info,
  HelpCircle,
  BookOpen,
  FileText,
  Lock,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  MessageCircle,
  Award,
  Zap,
  Camera,
  Edit3,
  Users,
  UserPlus,
  Gift,
  TrendingUp,
  Copy,
  Check,
  Search,
  Share2,
  Percent,
  Trophy,
  Moon,
  Sun
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { CoinTransaction, UserReferralHistoryData } from '../types';
import {
  fetchUserTransactions,
  fetchUserReferralHistory,
  subscribeToUserReferredFriends,
  claimReferralSignupCoins,
  getTodayDateString,
  getYesterdayDateString,
  DEFAULT_SETTINGS,
  calculateRequiredTasksForWithdrawal,
  getUserAvailableTasksForWithdrawal
} from '../services/coinService';
import { VerifiedBadge } from './VerifiedBadge';
import { AvatarSelectorModal } from './AvatarSelectorModal';
import { ReferPrizePoolView } from './ReferPrizePoolView';

interface ProfileViewProps {
  initialSubPage?: ProfileSubPage;
  onOpenWithdraw: () => void;
  onOpenCheckIn: () => void;
  onOpenAuth: () => void;
  onOpenSupport?: () => void;
  onOpenTasks?: (initialTab?: 'available' | 'history') => void;
}

type ProfileSubPage =
  | 'main'
  | 'coin_history'
  | 'referral_history'
  | 'refer_prize_pool'
  | 'about'
  | 'how_to_earn'
  | 'help_support'
  | 'privacy_policy'
  | 'terms_conditions';

export const ProfileView: React.FC<ProfileViewProps> = ({
  initialSubPage = 'main',
  onOpenWithdraw,
  onOpenCheckIn,
  onOpenAuth,
  onOpenSupport,
  onOpenTasks
}) => {
  const { profile, currentUser, logout } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const [currentSubPage, setCurrentSubPage] = useState<ProfileSubPage>(initialSubPage);

  useEffect(() => {
    if (initialSubPage) {
      setCurrentSubPage(initialSubPage);
    }
  }, [initialSubPage]);
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [loadingTxns, setLoadingTxns] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'earned' | 'spent'>('all');
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  // Referral History State
  const [referralHistory, setReferralHistory] = useState<UserReferralHistoryData>({
    totalInvited: 0,
    totalEarnings: 0,
    signupBonusTotal: 0,
    commissionBonusTotal: 0,
    friends: []
  });
  const [loadingReferrals, setLoadingReferrals] = useState(false);
  const [copiedRefCode, setCopiedRefCode] = useState(false);
  const [refSearch, setRefSearch] = useState('');

  const [claimingRefCoins, setClaimingRefCoins] = useState(false);
  const [claimMsg, setClaimMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (profile?.uid) {
      loadTransactions();
      loadReferralHistory();
    }
  }, [profile?.uid, profile?.referralCode]);

  useEffect(() => {
    if (!profile?.referralCode) return;
    const unsub = subscribeToUserReferredFriends(profile.referralCode, (liveFriends) => {
      if (liveFriends && liveFriends.length > 0) {
        setReferralHistory((prev) => {
          const signupTotal = liveFriends.reduce((acc, f) => acc + (f.signupBonus || 100), 0);
          const commTotal = liveFriends.reduce((acc, f) => acc + (f.commissionEarned || 0), 0);
          return {
            totalInvited: Math.max(liveFriends.length, profile.referralCount || 0),
            totalEarnings: signupTotal + commTotal,
            signupBonusTotal: signupTotal,
            commissionBonusTotal: commTotal,
            friends: liveFriends
          };
        });
      }
    });
    return () => unsub();
  }, [profile?.referralCode, profile?.referralCount]);

  const handleClaimReferralCoins = async () => {
    if (!profile?.uid) return;
    setClaimingRefCoins(true);
    setClaimMsg(null);
    try {
      const res = await claimReferralSignupCoins(profile.uid);
      setClaimMsg({ type: 'success', text: res.message });
      loadReferralHistory();
    } catch (err: any) {
      setClaimMsg({ type: 'error', text: err.message || 'Failed to claim referral coins.' });
    } finally {
      setClaimingRefCoins(false);
    }
  };

  const loadTransactions = async () => {
    if (!profile?.uid) return;
    setLoadingTxns(true);
    try {
      const list = await fetchUserTransactions(profile.uid, 50);
      setTransactions(list);
    } catch (err) {
      console.error('Failed to load user transactions:', err);
    } finally {
      setLoadingTxns(false);
    }
  };

  const loadReferralHistory = async () => {
    if (!profile?.uid) return;
    setLoadingReferrals(true);
    try {
      const data = await fetchUserReferralHistory(profile.uid, profile.referralCode || '');
      setReferralHistory(data);
    } catch (err) {
      console.error('Failed to load referral history:', err);
    } finally {
      setLoadingReferrals(false);
    }
  };

  const handleCopyReferralCode = () => {
    if (profile?.referralCode) {
      navigator.clipboard.writeText(profile.referralCode);
      setCopiedRefCode(true);
      setTimeout(() => setCopiedRefCode(false), 2000);
    }
  };

  const handleShareReferral = () => {
    if (!profile?.referralCode) return;
    const shareText = `🔥 Hey! Join Rewardluxe and earn real money! Use my referral code: ${profile.referralCode} to get 100 instant bonus coins! You will get 100 coins and I will also get 100 coins + earn together with 3% lifetime rewards! Play here: ${window.location.origin}`;

    if (navigator.share) {
      navigator.share({
        title: 'Rewardluxe - 100 Coins Bonus + 3% Commission',
        text: shareText,
        url: window.location.origin
      }).catch(() => {});
    } else {
      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  if (!currentUser || !profile) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center max-w-md mx-auto shadow-xl border border-slate-100 dark:border-slate-800 my-8">
        <div className="w-16 h-16 rounded-3xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
          <User className="w-8 h-8" />
        </div>
        <h3 className="font-display font-black text-xl text-slate-900 dark:text-white">
          Account Not Logged In
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 mb-6">
          Log in or create an account to view your coins, rank, and withdrawal history.
        </p>
        <button
          onClick={onOpenAuth}
          className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-2xl shadow-lg shadow-amber-500/25 transition-all"
        >
          Login / Register
        </button>
      </div>
    );
  }

  // Filter transactions
  const filteredTransactions = transactions.filter((txn) => {
    if (historyFilter === 'earned') return txn.amount > 0;
    if (historyFilter === 'spent') return txn.amount < 0;
    return true;
  });

  // Calculate quick stats
  const totalEarnedTxns = transactions
    .filter((t) => t.amount > 0)
    .reduce((acc, t) => acc + t.amount, 0);
  const totalSpentTxns = Math.abs(
    transactions
      .filter((t) => t.amount < 0)
      .reduce((acc, t) => acc + t.amount, 0)
  );

  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();
  const isStreakActive = profile.lastCheckInDate === yesterday || profile.lastCheckInDate === today;
  const activeStreak = isStreakActive ? (profile.dailyStreak || 0) : 0;

  return (
    <div className="max-w-2xl mx-auto pb-24">
      <AnimatePresence mode="wait">
        {/* ===================== SUBPAGE: COIN HISTORY ===================== */}
        {currentSubPage === 'coin_history' && (
          <motion.div
            key="coin_history"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentSubPage('main')}
                  className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="font-display font-black text-lg text-slate-900 dark:text-white">
                    Coin Transaction History
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Track all coin credits, debits & rewards
                  </p>
                </div>
              </div>

              <button
                onClick={loadTransactions}
                disabled={loadingTxns}
                className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 flex items-center justify-center text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 active:scale-95 transition-all"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loadingTxns ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Quick Stat Bar */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-amber-50/90 dark:bg-amber-950/40 rounded-2xl p-3 border border-amber-200/80 dark:border-amber-800/40 text-center">
                <span className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-300">Current Balance</span>
                <div className="font-display font-black text-base text-slate-900 dark:text-amber-200 mt-0.5">
                  {(profile.coins || 0).toLocaleString()}
                </div>
              </div>
              <div className="bg-emerald-50/90 dark:bg-emerald-950/40 rounded-2xl p-3 border border-emerald-200/80 dark:border-emerald-800/40 text-center">
                <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300">Total Credits</span>
                <div className="font-display font-black text-base text-emerald-700 dark:text-emerald-400 mt-0.5">
                  +{(totalEarnedTxns || profile.totalEarned || profile.coins || 0).toLocaleString()}
                </div>
              </div>
              <div className="bg-rose-50/90 dark:bg-rose-950/40 rounded-2xl p-3 border border-rose-200/80 dark:border-rose-800/40 text-center">
                <span className="text-[10px] uppercase font-bold text-rose-800 dark:text-rose-300">Total Debits</span>
                <div className="font-display font-black text-base text-rose-700 dark:text-rose-400 mt-0.5">
                  -{totalSpentTxns.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex bg-slate-200/70 dark:bg-slate-800 p-1 rounded-2xl gap-1 text-xs font-bold">
              <button
                onClick={() => setHistoryFilter('all')}
                className={`flex-1 py-2 rounded-xl transition-all ${
                  historyFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All Records ({transactions.length})
              </button>
              <button
                onClick={() => setHistoryFilter('earned')}
                className={`flex-1 py-2 rounded-xl transition-all ${
                  historyFilter === 'earned'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Credits Earned
              </button>
              <button
                onClick={() => setHistoryFilter('spent')}
                className={`flex-1 py-2 rounded-xl transition-all ${
                  historyFilter === 'spent'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Debits / Withdraw
              </button>
            </div>

            {/* Transaction List */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
              {loadingTxns ? (
                <div className="py-12 text-center">
                  <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Fetching transactions...</span>
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400 space-y-2">
                  <Coins className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                  <div className="text-sm font-bold text-slate-700 dark:text-slate-200">No transactions recorded yet</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                    Play games, spin the wheel, scratch cards, or refer friends to start earning coins!
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredTransactions.map((txn, idx) => {
                    const isPositive = txn.amount > 0;
                    return (
                      <div key={txn.id ? `${txn.id}-${idx}` : `txn-${txn.timestamp}-${idx}`} className="py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                              isPositive ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                            }`}
                          >
                            {isPositive ? (
                              <ArrowDownLeft className="w-4 h-4" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                              {txn.description}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                              {new Date(txn.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <div
                          className={`font-display font-black text-xs sm:text-sm flex-shrink-0 ${
                            isPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {isPositive ? `+${txn.amount}` : txn.amount} Coins
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ===================== SUBPAGE: REFERRAL & FRIENDS HISTORY ===================== */}
        {currentSubPage === 'referral_history' && (
          <motion.div
            key="referral_history"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentSubPage('main')}
                  className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="font-display font-black text-slate-900 dark:text-white text-lg">Referral & Friends History</h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Track invited friends & earnings generated from each</p>
                </div>
              </div>
              <button
                onClick={loadReferralHistory}
                disabled={loadingReferrals}
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all disabled:opacity-50"
                title="Refresh Referral History"
              >
                <RefreshCw className={`w-4 h-4 ${loadingReferrals ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Referral Code Share Banner */}
            <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 rounded-3xl p-5 text-white shadow-xl shadow-indigo-600/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
              
              <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                      <Gift className="w-4 h-4 text-amber-300" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">Your Referral Program</span>
                  </div>
                  <span className="text-[11px] bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full font-extrabold text-amber-300 border border-white/10">
                    3% Lifetime Commission
                  </span>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="w-full sm:w-auto text-center sm:text-left">
                    <div className="text-[10px] text-indigo-200 uppercase font-semibold">Your Referral Code</div>
                    <div className="font-mono text-xl font-black tracking-widest text-amber-300">
                      {profile.referralCode || 'N/A'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={handleCopyReferralCode}
                      className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-white text-indigo-900 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-indigo-50 active:scale-95 transition-all shadow-md"
                    >
                      {copiedRefCode ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span className="text-emerald-700">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy Code</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleShareReferral}
                      className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-black text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Share</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-indigo-100/90 leading-tight">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>
                    You get <strong>{DEFAULT_SETTINGS.referralBonusReferrer} Coins</strong> for every friend who joins + <strong>3% of all their lifetime game earnings</strong>!
                  </span>
                </div>
              </div>
            </div>

            {/* Summary Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Metric 1: Total Invited */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Friends</span>
                  <div className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div>
                  <div className="font-display font-black text-lg text-slate-900 dark:text-white">
                    {Math.max(profile?.referralCount || 0, referralHistory.totalInvited || 0)}
                  </div>
                  <div className="text-[10px] text-slate-400">Total Joined</div>
                </div>
              </div>

              {/* Metric 2: Total Referral Earnings */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Earned</span>
                  <div className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Coins className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div>
                  <div className="font-display font-black text-lg text-emerald-600 dark:text-emerald-400">
                    +{referralHistory.totalEarnings}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    ≈ ₹{(referralHistory.totalEarnings / DEFAULT_SETTINGS.coinsPerInr).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Metric 3: Direct Signup Bonus */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Direct Bonus</span>
                  <div className="w-7 h-7 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Gift className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div>
                  <div className="font-display font-black text-lg text-amber-600 dark:text-amber-400">
                    +{referralHistory.signupBonusTotal}
                  </div>
                  <div className="text-[10px] text-slate-400">Signup Rewards</div>
                </div>
              </div>

              {/* Metric 4: 3% Commission */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">3% Passive</span>
                  <div className="w-7 h-7 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div>
                  <div className="font-display font-black text-lg text-purple-600 dark:text-purple-400">
                    +{referralHistory.commissionBonusTotal}
                  </div>
                  <div className="text-[10px] text-slate-400">Lifetime Comms</div>
                </div>
              </div>
            </div>

            {/* Claim Referral Signup Coins Banner if unclaimed > 0 */}
            {(() => {
              const refCount = Math.max(profile?.referralCount || 0, referralHistory.totalInvited || 0);
              const totalRefCoinsPossible = refCount * DEFAULT_SETTINGS.referralBonusReferrer;
              const unclaimedCoins = Math.max(0, totalRefCoinsPossible - (profile?.claimedReferralCoins || 0));

              if (unclaimedCoins <= 0) return null;

              return (
                <div className="bg-gradient-to-r from-amber-500 to-yellow-500 rounded-2xl p-4 text-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/30 flex items-center justify-center font-black">
                      <Gift className="w-5 h-5 text-slate-950" />
                    </div>
                    <div>
                      <div className="font-extrabold text-sm">
                        Unclaimed Referral Bonus: +{unclaimedCoins.toLocaleString()} Coins
                      </div>
                      <div className="text-xs font-semibold text-slate-900/80">
                        Claim {unclaimedCoins.toLocaleString()} bonus coins into your main wallet!
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleClaimReferralCoins}
                    disabled={claimingRefCoins}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 active:scale-95 text-amber-400 font-extrabold text-xs shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    {claimingRefCoins ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Claiming...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 text-amber-400" />
                        <span>Claim Coins Now</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })()}

            {claimMsg && (
              <div
                className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                  claimMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                <span>{claimMsg.text}</span>
              </div>
            )}

            {/* Invited Friends List Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-xl border border-slate-100 dark:border-slate-800 space-y-4 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Invited Friends List & Earnings</span>
                    <span className="text-[10px] font-extrabold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-800/40">
                      {referralHistory.friends.length} Friends
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Earnings breakdown generated from each invited friend</p>
                </div>

                {referralHistory.friends.length > 3 && (
                  <div className="relative w-full sm:w-48">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search friends..."
                      value={refSearch}
                      onChange={(e) => setRefSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 dark:text-slate-200"
                    />
                  </div>
                )}
              </div>

              {loadingReferrals ? (
                <div className="py-12 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                  <p className="text-xs">Loading invited friends history...</p>
                </div>
              ) : referralHistory.friends.length === 0 ? (
                <div className="py-10 text-center space-y-3 bg-slate-50/60 dark:bg-slate-800/40 rounded-2xl border border-slate-100/80 dark:border-slate-800 p-6">
                  <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl mx-auto flex items-center justify-center">
                    <UserPlus className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">No Friends Invited Yet</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                      Share your referral code with friends, classmates, and family. You'll earn 100 bonus coins instantly plus 3% lifetime earnings on all their activities!
                    </p>
                  </div>
                  <button
                    onClick={handleShareReferral}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Invite Friends Now</span>
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {referralHistory.friends
                    .filter((f) =>
                      !refSearch ||
                      f.displayName.toLowerCase().includes(refSearch.toLowerCase())
                    )
                    .map((friend, idx) => (
                      <div
                        key={`friend-${friend.uid || 'anon'}-${idx}`}
                        className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 rounded-2xl px-2 -mx-2 transition-colors"
                      >
                        {/* Friend Identity */}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-sm shadow-sm overflow-hidden shrink-0">
                            {friend.photoURL ? (
                              <img
                                src={friend.photoURL}
                                alt={friend.displayName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              (friend.displayName || 'F').charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              <span>{friend.displayName}</span>
                              {friend.isVerified && <VerifiedBadge size="sm" />}
                              <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold px-1.5 py-0.2 rounded">
                                Active
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                              <span>Joined: {new Date(friend.joinedAt).toLocaleDateString()}</span>
                              {friend.friendTotalEarned !== undefined && friend.friendTotalEarned > 0 && (
                                <>
                                  <span>•</span>
                                  <span>Friend earned: {friend.friendTotalEarned} Coins</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Earnings Generated Breakdown */}
                        <div className="flex flex-wrap sm:flex-nowrap items-center sm:justify-end gap-2 text-right">
                          <div className="flex items-center gap-1.5 text-[10px] bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-semibold px-2 py-1 rounded-lg border border-amber-100 dark:border-amber-800/40">
                            <Gift className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            <span>Signup: +{friend.signupBonus}</span>
                          </div>

                          {friend.commissionEarned > 0 && (
                            <div className="flex items-center gap-1.5 text-[10px] bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 font-semibold px-2 py-1 rounded-lg border border-purple-100 dark:border-purple-800/40">
                              <TrendingUp className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                              <span>3% Comms: +{friend.commissionEarned}</span>
                            </div>
                          )}

                          <div className="bg-emerald-50/80 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800/40 px-2.5 py-1 rounded-xl text-right shrink-0">
                            <div className="font-display font-black text-xs sm:text-sm text-emerald-700 dark:text-emerald-400">
                              +{friend.coinsGenerated} Coins
                            </div>
                            <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">
                              ₹{(friend.coinsGenerated / DEFAULT_SETTINGS.coinsPerInr).toFixed(2)} total
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ===================== SUBPAGE: REFER PRIZE POOL ===================== */}
        {currentSubPage === 'refer_prize_pool' && (
          <motion.div
            key="refer_prize_pool"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <ReferPrizePoolView
              onBack={() => setCurrentSubPage('main')}
              onGoToReferral={() => {
                setCurrentSubPage('referral_history');
                loadReferralHistory();
              }}
            />
          </motion.div>
        )}

        {/* ===================== SUBPAGE: ABOUT US ===================== */}
        {currentSubPage === 'about' && (
          <motion.div
            key="about"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {/* Header matching screenshot: AboutUs */}
            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
              <button
                onClick={() => setCurrentSubPage('main')}
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="font-display font-black text-lg text-slate-900 dark:text-white">AboutUs</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">App Information &amp; Development Team</p>
              </div>
            </div>

            {/* Developed By Section Matching User Screenshot */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7] inline-block shadow-2xs shrink-0" />
                <h3 className="font-display font-black text-lg text-slate-900 dark:text-white tracking-tight">
                  Developed By
                </h3>
              </div>

              <div className="space-y-3">
                {/* Developer 1: llliiizz_aa / Md Sanaullah Amir (with custom Instagram DP and redirect) */}
                <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-[#f8fafc] dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700 hover:border-sky-200 transition-all">
                  <div className="flex items-center gap-3.5 min-w-0 pr-2">
                    {/* Ring Avatar with uploaded image: https://iili.io/n2V9Vxj.jpg */}
                    <div className="w-13 h-13 rounded-full p-0.5 bg-gradient-to-tr from-sky-400 via-blue-300 to-sky-200 shadow-2xs shrink-0 flex items-center justify-center overflow-hidden">
                      <img
                        src="https://iili.io/n2V9Vxj.jpg"
                        alt="llliiizz_aa"
                        referrerPolicy="no-referrer"
                        className="w-full h-full rounded-full object-cover object-center"
                      />
                    </div>
                    <div className="min-w-0 truncate">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-display font-black text-base text-slate-900 dark:text-white tracking-tight truncate">
                          llliiizz_aa
                        </h4>
                        {/* Exact Official Instagram Scalloped Verified Badge */}
                        <svg className="w-[18px] h-[18px] text-[#0095F6] shrink-0" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M10.29 2.308a2.4 2.4 0 013.42 0l.738.742a2.4 2.4 0 001.782.704l1.045-.046a2.4 2.4 0 012.418 2.418l-.046 1.045a2.4 2.4 0 00.704 1.782l.742.738a2.4 2.4 0 010 3.42l-.742.738a2.4 2.4 0 00-.704 1.782l.046 1.045a2.4 2.4 0 01-2.418 2.418l-1.045-.046a2.4 2.4 0 00-1.782.704l-.738.742a2.4 2.4 0 01-3.42 0l-.738-.742a2.4 2.4 0 00-1.782-.704l-1.045.046a2.4 2.4 0 01-2.418-2.418l.046-1.045a2.4 2.4 0 00-.704-1.782l-.742-.738a2.4 2.4 0 010-3.42l.742-.738a2.4 2.4 0 00.704-1.782l-.046-1.045a2.4 2.4 0 012.418-2.418l1.045.046a2.4 2.4 0 001.782-.704l.738-.742z"
                            fill="#0095F6"
                          />
                          <path
                            d="M8.8 11.8l2.2 2.2 4.4-4.5"
                            stroke="#FFFFFF"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Instagram Button with redirect link */}
                  <a
                    href="https://www.instagram.com/llliiizz_aa?stkn=MjdibjFhaHNoZjN1"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open Instagram Profile @llliiizz_aa"
                    className="w-11 h-11 rounded-2xl bg-[#eef4ff] dark:bg-slate-700/80 hover:bg-[#e0ecff] dark:hover:bg-slate-700 border border-[#d0e1fd] dark:border-slate-600 hover:border-pink-300 hover:shadow-md flex items-center justify-center shrink-0 active:scale-95 transition-all group cursor-pointer"
                  >
                    <svg
                      className="w-6 h-6 transform group-hover:scale-110 transition-transform"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <defs>
                        <radialGradient id="igGradient1" cx="20%" cy="105%" r="130%" fx="20%" fy="105%">
                          <stop offset="0%" stopColor="#fdf497" />
                          <stop offset="10%" stopColor="#fdf497" />
                          <stop offset="45%" stopColor="#fd5949" />
                          <stop offset="70%" stopColor="#d6249f" />
                          <stop offset="100%" stopColor="#285AEB" />
                        </radialGradient>
                      </defs>
                      <rect x="2" y="2" width="20" height="20" rx="5.5" ry="5.5" stroke="url(#igGradient1)" strokeWidth="2.2" />
                      <circle cx="12" cy="12" r="4.2" stroke="url(#igGradient1)" strokeWidth="2.2" />
                      <circle cx="17.5" cy="6.5" r="1.3" fill="url(#igGradient1)" />
                    </svg>
                  </a>
                </div>

                {/* Developer 2: _its_ibraheem___ (Direct User Uploaded Image URL) */}
                <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-[#f8fafc] dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700 hover:border-sky-200 transition-all">
                  <div className="flex items-center gap-3.5 min-w-0 pr-2">
                    {/* Ring Avatar with uploaded image: https://iili.io/n2Ms0Qt.jpg */}
                    <div className="w-13 h-13 rounded-full p-0.5 bg-gradient-to-tr from-sky-400 via-blue-300 to-sky-200 shadow-2xs shrink-0 flex items-center justify-center overflow-hidden">
                      <img
                        src="https://iili.io/n2Ms0Qt.jpg"
                        alt="_its_ibraheem___"
                        referrerPolicy="no-referrer"
                        className="w-full h-full rounded-full object-cover object-center"
                      />
                    </div>
                    <div className="min-w-0 truncate">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-display font-black text-base text-slate-900 dark:text-white tracking-tight truncate">
                          _its_ibraheem___
                        </h4>
                        {/* Exact Official Instagram Scalloped Verified Badge */}
                        <svg className="w-[18px] h-[18px] text-[#0095F6] shrink-0" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M10.29 2.308a2.4 2.4 0 013.42 0l.738.742a2.4 2.4 0 001.782.704l1.045-.046a2.4 2.4 0 012.418 2.418l-.046 1.045a2.4 2.4 0 00.704 1.782l.742.738a2.4 2.4 0 010 3.42l-.742.738a2.4 2.4 0 00-.704 1.782l.046 1.045a2.4 2.4 0 01-2.418 2.418l-1.045-.046a2.4 2.4 0 00-1.782.704l-.738.742a2.4 2.4 0 01-3.42 0l-.738-.742a2.4 2.4 0 00-1.782-.704l-1.045.046a2.4 2.4 0 01-2.418-2.418l.046-1.045a2.4 2.4 0 00-.704-1.782l-.742-.738a2.4 2.4 0 010-3.42l.742-.738a2.4 2.4 0 00.704-1.782l-.046-1.045a2.4 2.4 0 012.418-2.418l1.045.046a2.4 2.4 0 001.782-.704l.738-.742z"
                            fill="#0095F6"
                          />
                          <path
                            d="M8.8 11.8l2.2 2.2 4.4-4.5"
                            stroke="#FFFFFF"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Instagram Button with redirect link */}
                  <a
                    href="https://www.instagram.com/_its_ibraheem___?stkn=NWFiZ2dpNWF1MzJi"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open Instagram Profile @_its_ibraheem___"
                    className="w-11 h-11 rounded-2xl bg-[#eef4ff] dark:bg-slate-700/80 hover:bg-[#e0ecff] dark:hover:bg-slate-700 border border-[#d0e1fd] dark:border-slate-600 hover:border-pink-300 hover:shadow-md flex items-center justify-center shrink-0 active:scale-95 transition-all group cursor-pointer"
                  >
                    <svg
                      className="w-6 h-6 transform group-hover:scale-110 transition-transform"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <defs>
                        <radialGradient id="igGradient" cx="20%" cy="105%" r="130%" fx="20%" fy="105%">
                          <stop offset="0%" stopColor="#fdf497" />
                          <stop offset="10%" stopColor="#fdf497" />
                          <stop offset="45%" stopColor="#fd5949" />
                          <stop offset="70%" stopColor="#d6249f" />
                          <stop offset="100%" stopColor="#285AEB" />
                        </radialGradient>
                      </defs>
                      <rect x="2" y="2" width="20" height="20" rx="5.5" ry="5.5" stroke="url(#igGradient)" strokeWidth="2.2" />
                      <circle cx="12" cy="12" r="4.2" stroke="url(#igGradient)" strokeWidth="2.2" />
                      <circle cx="17.5" cy="6.5" r="1.3" fill="url(#igGradient)" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ===================== SUBPAGE: HOW TO EARN ===================== */}
        {currentSubPage === 'how_to_earn' && (
          <motion.div
            key="how_to_earn"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {/* Header */}
            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
              <button
                onClick={() => setCurrentSubPage('main')}
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="font-display font-black text-lg text-slate-900 dark:text-white">How to Earn Coins</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Complete tasks & earn daily money</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm flex items-start gap-3.5 transition-colors">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black shrink-0">
                  1
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Daily Spin Wheel (10 / Day)</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    Spin the lucky wheel everyday to win up to 250 coins per spin directly credited to your wallet.
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm flex items-start gap-3.5 transition-colors">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-black shrink-0">
                  2
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Golden Scratch Cards (10 / Day)</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    Scratch interactive cards to reveal surprise coin jackpots of up to 400 coins.
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm flex items-start gap-3.5 transition-colors">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black shrink-0">
                  3
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Fast Captcha Solver (20 / Day)</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    Solve high-speed captchas with special speed multiplier bonuses (+10 bonus for answers under 8 seconds).
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm flex items-start gap-3.5 transition-colors">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black shrink-0">
                  4
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Invite & Earn Program</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    Get 100 coins for every invited friend + earn a 3% lifetime coin commission on all tasks your friend completes!
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ===================== SUBPAGE: HELP & SUPPORT ===================== */}
        {currentSubPage === 'help_support' && (
          <motion.div
            key="help_support"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {/* Header */}
            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
              <button
                onClick={() => setCurrentSubPage('main')}
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="font-display font-black text-lg text-slate-900 dark:text-white">Help & Support</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Frequently Asked Questions & Support Desk</p>
              </div>
            </div>

            {/* Quick Support & Contact Options */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-3 shadow-xl border border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 transition-colors">
              {/* Live Chat with Bucksy */}
              {onOpenSupport && (
                <button
                  onClick={onOpenSupport}
                  className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-emerald-50/70 dark:hover:bg-emerald-950/30 rounded-2xl transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>Live Support Chat</span>
                        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-extrabold px-2 py-0.5 rounded-full">
                          24/7 Live
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">Live chat in Hindi &amp; English for tasks, coins &amp; payouts</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                    <span className="hidden sm:inline">Open Chat</span>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
                  </div>
                </button>
              )}

              {/* Telegram Support Channel */}
              <a
                href="https://t.me/Websitename"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-sky-50/70 dark:hover:bg-sky-950/30 rounded-2xl transition-all text-left group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#229ED9]/15 text-[#229ED9] border border-[#229ED9]/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white">
                      Telegram Support
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Official updates &amp; direct community help</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[#229ED9] font-bold text-xs">
                  <span className="hidden sm:inline">Connect</span>
                  <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-[#229ED9] transition-colors" />
                </div>
              </a>
            </div>

            {/* FAQ Accordion */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3 transition-colors">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                Frequently Asked Questions
              </h4>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <div className="font-bold text-slate-900 dark:text-white mb-1">
                    Q: How long does a withdrawal take to credit in UPI?
                  </div>
                  <div className="text-slate-600 dark:text-slate-300">
                    A: Standard UPI withdrawals are processed and credited within 2 to 24 hours after verification by our automated payout system.
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <div className="font-bold text-slate-900 dark:text-white mb-1">
                    Q: When do daily spin and scratch card limits reset?
                  </div>
                  <div className="text-slate-600 dark:text-slate-300">
                    A: All daily limits reset automatically at 12:00 AM (Midnight) IST everyday.
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <div className="font-bold text-slate-900 dark:text-white mb-1">
                    Q: Can I use multiple accounts on the same phone?
                  </div>
                  <div className="text-slate-600 dark:text-slate-300">
                    A: No. To prevent abuse, our fair play security rules restrict each physical device to one registered player account.
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ===================== SUBPAGE: PRIVACY POLICY ===================== */}
        {currentSubPage === 'privacy_policy' && (
          <motion.div
            key="privacy_policy"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {/* Header */}
            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
              <button
                onClick={() => setCurrentSubPage('main')}
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="font-display font-black text-lg text-slate-900 dark:text-white">Privacy Policy</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">How we protect and handle your data</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed transition-colors">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-1">1. Information We Collect</h4>
                <p>
                  We collect your registered email address, player display name, gameplay transaction history, and provided payout details (UPI ID or Bank account info) exclusively for processing coin rewards.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-1">2. Data Security</h4>
                <p>
                  All credentials and transaction logs are stored in encrypted Google Cloud Firestore databases adhering to standard TLS 1.3 security encryption.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-1">3. Third-Party Sharing</h4>
                <p>
                  Rewardluxe never sells or distributes player personal information to third-party marketing companies. Data is solely utilized for verification and payment processing.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ===================== SUBPAGE: TERMS & CONDITIONS ===================== */}
        {currentSubPage === 'terms_conditions' && (
          <motion.div
            key="terms_conditions"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {/* Header */}
            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
              <button
                onClick={() => setCurrentSubPage('main')}
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="font-display font-black text-lg text-slate-900 dark:text-white">Terms & Conditions</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Rules & fair play guidelines</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed transition-colors">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-1">1. Fair Play & Prohibited Actions</h4>
                <p>
                  Use of automated scripts, macro clickers, emulator farming, or artificial multiple referral rings is strictly prohibited. Violation will result in permanent account suspension and forfeiture of unwithdrawn balance.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-1">2. Withdrawal Criteria</h4>
                <p>
                  Withdrawals are subjected to the minimum redemption threshold (1,000 Coins / ₹10). Players must supply accurate payout details.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-1">3. Modifications</h4>
                <p>
                  Rewardluxe reserves the right to adjust reward limits, bonus multipliers, or terms with prior notification on the platform.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ===================== MAIN PROFILE PAGE ===================== */}
        {currentSubPage === 'main' && (
          <motion.div
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Profile User Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-100 dark:border-slate-800 relative overflow-hidden transition-colors">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                {/* Clickable Profile Photo with Camera Badge */}
                <div
                  className="relative group cursor-pointer shrink-0"
                  onClick={() => setShowAvatarModal(true)}
                  title="Click to change profile picture"
                >
                  <img
                    src={profile.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.uid}`}
                    alt={profile.displayName}
                    className="w-20 h-20 sm:w-22 sm:h-22 rounded-3xl bg-slate-100 dark:bg-slate-800 border-2 border-amber-300 shadow-md object-cover transition-transform group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-slate-950/40 rounded-3xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                    <Camera className="w-6 h-6 drop-shadow-md" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-purple-600 hover:bg-purple-700 text-white p-1.5 rounded-full shadow-md border-2 border-white dark:border-slate-900 transition-all">
                    <Camera className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                    <div className="flex items-center gap-1.5">
                      <h2 className="font-display font-black text-xl text-slate-900 dark:text-white">
                        {profile.displayName || 'Player'}
                      </h2>
                      {profile.isVerified && <VerifiedBadge size="md" />}
                    </div>
                  </div>

                  <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium mb-2.5">
                    <Mail className="w-3.5 h-3.5" />
                    <span>{profile.email}</span>
                  </div>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-3">
                    <span className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-xl font-bold">
                      Referral Code: <strong className="text-slate-900 dark:text-amber-300">{profile.referralCode}</strong>
                    </span>
                    <span className="text-[11px] bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200/50 dark:border-orange-900/50 px-2.5 py-1 rounded-xl font-bold flex items-center gap-1">
                      <Flame className="w-3 h-3" />
                      Streak: {activeStreak}d
                    </span>
                  </div>

                  {/* Change Photo / Edit Avatar Button */}
                  <div className="flex justify-center sm:justify-start">
                    <button
                      onClick={() => setShowAvatarModal(true)}
                      className="inline-flex items-center gap-1.5 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40 hover:from-purple-100 hover:to-indigo-100 dark:hover:from-purple-900/40 dark:hover:to-indigo-900/40 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/60 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      <span>Upload Gallery Photo / Avatar</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Coin & Cash Metric Summary */}
              <div className="grid grid-cols-3 gap-2.5 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
                <div className="bg-amber-50/80 dark:bg-amber-950/40 rounded-2xl p-3 border border-amber-200 dark:border-amber-800/40">
                  <span className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-300">Current Coins</span>
                  <div className="font-display font-black text-lg text-slate-900 dark:text-amber-200 mt-0.5">
                    {(profile.coins || 0).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold">
                    ₹{((profile.coins || 0) / 100).toFixed(1)}
                  </span>
                </div>

                <div className="bg-emerald-50/80 dark:bg-emerald-950/40 rounded-2xl p-3 border border-emerald-200 dark:border-emerald-800/40">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300">Total Earned</span>
                  <div className="font-display font-black text-lg text-slate-900 dark:text-emerald-200 mt-0.5">
                    {(profile.totalEarned || profile.coins || 0).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">Coins</span>
                </div>

                <div className="bg-purple-50/80 dark:bg-purple-950/40 rounded-2xl p-3 border border-purple-200 dark:border-purple-800/40">
                  <span className="text-[10px] uppercase font-bold text-purple-800 dark:text-purple-300">Total Withdrawn</span>
                  <div className="font-display font-black text-lg text-slate-900 dark:text-purple-200 mt-0.5">
                    ₹{profile.totalWithdrawn || 0}
                  </div>
                  <span className="text-[10px] text-purple-700 dark:text-purple-400 font-bold">Cash</span>
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div className="grid grid-cols-2 gap-2 mt-4">
                <button
                  onClick={onOpenWithdraw}
                  className="py-3 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-extrabold rounded-2xl text-xs shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Withdraw Money</span>
                </button>

                <button
                  onClick={onOpenCheckIn}
                  className="py-3 px-4 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-extrabold rounded-2xl text-xs shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span>Daily Check-In</span>
                </button>
              </div>
            </div>

            {/* Profile Options List (Direct Navigation) */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-3 shadow-xl border border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 transition-colors">
              {/* Option: Dark / White Theme Toggle Switch (Only in Profile) */}
              <div className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/60 rounded-2xl transition-all">
                <div className="flex items-center gap-3.5">
                  <div className={`w-10 h-10 rounded-2xl ${isDark ? 'bg-indigo-950 text-indigo-400 border border-indigo-500/30' : 'bg-amber-50 text-amber-500 border border-amber-200/60'} flex items-center justify-center transition-colors shrink-0`}>
                    {isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <span>App Theme</span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${isDark ? 'bg-indigo-900/60 text-indigo-300 border border-indigo-500/30' : 'bg-amber-100 text-amber-800'}`}>
                        {isDark ? 'Dark Mode 🌙' : 'Light Mode ☀️'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {isDark ? 'Dark mode enabled for comfortable viewing' : 'Clean white theme active'}
                    </div>
                  </div>
                </div>

                {/* Interactive Toggle Switch */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  aria-label="Toggle Dark and Light theme"
                  className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isDark ? 'bg-indigo-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center text-[10px] ${
                      isDark ? 'translate-x-6 bg-slate-900 text-amber-400' : 'translate-x-0 text-amber-500'
                    }`}
                  >
                    {isDark ? <Moon className="w-3.5 h-3.5 text-indigo-400" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
                  </span>
                </button>
              </div>

              {/* Option 0: Refer Prize Pool (New Feature) */}
              <button
                onClick={() => setCurrentSubPage('refer_prize_pool')}
                className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-amber-50/60 dark:hover:bg-amber-950/30 rounded-2xl transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-300 text-slate-950 font-black flex items-center justify-center group-hover:scale-105 shadow-md shadow-amber-500/25 transition-transform shrink-0">
                    <Trophy className="w-5 h-5 text-slate-950" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white">
                      Refer Prize Pool
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800/40 px-2 py-0.5 rounded-lg hidden sm:inline">
                    Win Big
                  </span>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors" />
                </div>
              </button>

              {/* Option 1: Referral & Friends History */}
              <button
                onClick={() => {
                  setCurrentSubPage('referral_history');
                  loadReferralHistory();
                }}
                className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/60 rounded-2xl transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white">
                      Referral &amp; Friends History
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors" />
              </button>

              {/* Option 2: Coin History */}
              <button
                onClick={() => setCurrentSubPage('coin_history')}
                className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/60 rounded-2xl transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white">Coin History</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors" />
              </button>

              {/* Option 2.5: Task History & Completed Tasks */}
              {onOpenTasks && (
                <button
                  onClick={() => onOpenTasks('history')}
                  className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/60 rounded-2xl transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-800/40 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">
                        Task History
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors" />
                </button>
              )}

              {/* Option 3: How to Earn */}
              <button
                onClick={() => setCurrentSubPage('how_to_earn')}
                className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/60 rounded-2xl transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white">How to Earn</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors" />
              </button>

              {/* Option 3: About Us / About App */}
              <button
                onClick={() => setCurrentSubPage('about')}
                className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/60 rounded-2xl transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-800/40 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white">About App</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors" />
              </button>

              {/* Option 4: Live Support Chat (Bucksy) */}
              {onOpenSupport && (
                <button
                  onClick={onOpenSupport}
                  className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-emerald-50/70 dark:hover:bg-emerald-950/30 rounded-2xl transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>Live Support Chat</span>
                        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-extrabold px-2 py-0.5 rounded-full">
                          24/7 Live
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                    <span className="hidden sm:inline">Open Chat</span>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
                  </div>
                </button>
              )}

              {/* Option 5: Telegram Support (Direct) */}
              <a
                href="https://t.me/Websitename"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-sky-50/70 dark:hover:bg-sky-950/30 rounded-2xl transition-all text-left group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#229ED9]/15 text-[#229ED9] border border-[#229ED9]/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white">
                      Telegram Support
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[#229ED9] font-bold text-xs">
                  <span className="hidden sm:inline">Connect</span>
                  <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-[#229ED9] transition-colors" />
                </div>
              </a>

              {/* Option 6: Help & Support */}
              <button
                onClick={() => setCurrentSubPage('help_support')}
                className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/60 rounded-2xl transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white">Help &amp; Support</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors" />
              </button>

              {/* Option 5: Privacy Policy */}
              <button
                onClick={() => setCurrentSubPage('privacy_policy')}
                className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/60 rounded-2xl transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white">Privacy Policy</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors" />
              </button>

              {/* Option 6: Terms & Conditions */}
              <button
                onClick={() => setCurrentSubPage('terms_conditions')}
                className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/60 rounded-2xl transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white">Terms &amp; Conditions</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors" />
              </button>
            </div>

              {/* Logout Button */}
              <div className="pt-2">
                <button
                  onClick={logout}
                  className="w-full py-3.5 px-4 bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 text-slate-600 dark:text-slate-300 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all border border-slate-100 dark:border-slate-800 shadow-sm cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out of Account</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Profile Picture & Avatar Selector Modal */}
        <AvatarSelectorModal
          isOpen={showAvatarModal}
          onClose={() => setShowAvatarModal(false)}
        />
      </div>
    );
  };
