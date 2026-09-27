import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  UserPlus,
  Copy,
  Check,
  Share2,
  Users,
  Coins,
  Sparkles,
  Gift,
  ArrowRight,
  TrendingUp,
  HelpCircle,
  Percent,
  Trophy,
  ChevronRight,
  Radio,
  UserCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import {
  applyReferralCode,
  claimReferralSignupCoins,
  subscribeToUserReferredFriends,
  DEFAULT_SETTINGS
} from '../services/coinService';
import { ReferralFriendItem } from '../types';
import { sound } from '../utils/sound';

interface ReferralViewProps {
  onOpenAuth: () => void;
  onGoToLeaderboard?: (tab?: 'coins' | 'referrals') => void;
  onGoToPrizePool?: () => void;
}

export const ReferralView: React.FC<ReferralViewProps> = ({
  onOpenAuth,
  onGoToLeaderboard,
  onGoToPrizePool
}) => {
  const { profile, currentUser } = useAuth();
  const [copied, setCopied] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [claimingSignupCoins, setClaimingSignupCoins] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [referredFriends, setReferredFriends] = useState<ReferralFriendItem[]>([]);

  const referralCode = profile?.referralCode || 'COIN-XXXX';
  const referralCount = profile?.referralCount || 0;
  const directSignupEarnings = referralCount * DEFAULT_SETTINGS.referralBonusReferrer;
  const claimedReferralCoins = profile?.claimedReferralCoins || 0;
  const unclaimedReferralCoins = Math.max(0, directSignupEarnings - claimedReferralCoins);

  // Real-time listener for user's referred friends list
  useEffect(() => {
    if (!profile?.referralCode) {
      setReferredFriends([]);
      return;
    }

    const unsubscribe = subscribeToUserReferredFriends(profile.referralCode, (friends) => {
      setReferredFriends(friends);
    });

    return () => {
      unsubscribe();
    };
  }, [profile?.referralCode]);

  const handleClaimSignupCoins = async () => {
    if (!currentUser || !profile) {
      onOpenAuth();
      return;
    }

    if (unclaimedReferralCoins <= 0) return;

    setClaimingSignupCoins(true);
    setFeedback(null);

    try {
      const res = await claimReferralSignupCoins(profile.uid);
      setFeedback({ success: true, message: res.message });
      sound.playWin();
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Claim failed';
      setFeedback({ success: false, message: msg });
      sound.playError();
    } finally {
      setClaimingSignupCoins(false);
    }
  };

  const handleCopy = () => {
    if (!profile) {
      onOpenAuth();
      return;
    }
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    sound.playCoinSound();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (!profile) {
      onOpenAuth();
      return;
    }
    const shareText = `🔥 Hey! Join Rewardluxe and earn real money! Use my referral code: ${referralCode} to get 100 instant bonus coins! You will get 100 coins and I will also get 100 coins + earn together with 3% lifetime rewards! Play here: ${window.location.origin}`;

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

  const handleApplyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !profile) {
      onOpenAuth();
      return;
    }

    if (!inputCode.trim()) return;

    setLoading(true);
    setFeedback(null);

    try {
      const res = await applyReferralCode(profile.uid, inputCode.trim().toUpperCase());
      setFeedback({ success: true, message: res.message });
      sound.playWin();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
      setInputCode('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Referral code apply failed';
      setFeedback({ success: false, message: msg });
      sound.playError();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 pb-20 max-w-2xl mx-auto">
      {/* Top Banner Card */}
      <div className="bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600 rounded-3xl p-6 text-slate-950 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-white/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 bg-black/15 text-slate-950 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2">
              <Gift className="w-4 h-4" />
              <span>100 Coins Bonus + 3% Commission</span>
            </div>
            <h2 className="font-display font-black text-2xl md:text-3xl leading-tight text-slate-950">
              Invite Friends &amp; Earn <span className="underline decoration-white/60">100 Coins + 3%</span>
            </h2>
            <p className="text-xs md:text-sm font-medium text-slate-900 mt-1 max-w-sm">
              Aapke friend ko 100 Coins milenge, aapko bhi 100 Coins milenge, aur aapke friend ke har coin earning ka <strong>3% Lifetime Commission</strong> aapko milega!
            </p>
          </div>

          <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-white/30 backdrop-blur-md p-3 flex flex-col items-center justify-center shadow-inner text-slate-950 shrink-0">
            <div className="flex items-center gap-0.5">
              <Percent className="w-4 h-4 stroke-[3]" />
              <span className="font-display font-black text-sm">3%</span>
            </div>
            <span className="font-display font-black text-[10px] text-center uppercase tracking-tighter">Lifetime Earning</span>
          </div>
        </div>
      </div>

      {/* Referral Code Box */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-100 dark:border-slate-800 transition-colors">
        <h3 className="font-display font-black text-lg text-slate-900 dark:text-white mb-1">
          Your Unique Referral Code
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-300 mb-4">
          Share this code with your friends to get 100 Coins + 3% of their lifetime earnings
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="w-full sm:flex-1 bg-slate-50 dark:bg-slate-800/80 border-2 border-dashed border-amber-300 dark:border-amber-500/60 rounded-2xl py-3 px-4 flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span className="font-display font-black text-xl tracking-wider text-slate-900 dark:text-amber-300">
                {referralCode}
              </span>
            </div>
            <button
              onClick={handleCopy}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                copied ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 shadow-xs'
              }`}
              title="Copy Referral Code"
            >
              {copied ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={handleCopy}
              className="flex-1 sm:flex-none px-4 py-3.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Code</span>
                </>
              )}
            </button>

            <button
              onClick={handleShare}
              className="flex-1 sm:flex-none px-4 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Link</span>
            </button>
          </div>
        </div>

        {/* Highlight Perks Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-4 p-3.5 bg-amber-50/60 dark:bg-amber-950/30 rounded-2xl border border-amber-200/70 dark:border-amber-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xs shrink-0">
              100
            </div>
            <div className="text-xs">
              <span className="font-bold text-slate-900 dark:text-white block">100 Coins Each</span>
              <span className="text-slate-600 dark:text-slate-300 text-[11px]">Dono ko 100-100 Coins signup bonus</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-xs shrink-0">
              3%
            </div>
            <div className="text-xs">
              <span className="font-bold text-slate-900 dark:text-white block">3% Lifetime Commission</span>
              <span className="text-slate-600 dark:text-slate-300 text-[11px]">Friend jitna kamayega uska 3% aapko</span>
            </div>
          </div>
        </div>

        {/* Stats Grid - Optimized for Mobile 2-Column Layout */}
        <div className="grid grid-cols-2 gap-2.5 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/40 rounded-2xl p-3 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <Users className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wide block truncate">
                Friends Joined
              </span>
              <div className="font-display font-black text-base sm:text-lg text-slate-900 dark:text-amber-200 truncate">
                {referralCount.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/40 rounded-2xl p-3 flex flex-col justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs shrink-0">
                <Coins className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide block truncate">
                  Signup Coins
                </span>
                <div className="font-display font-black text-base sm:text-lg text-slate-900 dark:text-emerald-200 truncate">
                  {directSignupEarnings.toLocaleString()} Coins
                </div>
              </div>
            </div>

            {/* Claim Action Button */}
            <div className="mt-2 pt-1.5 border-t border-emerald-200/60 dark:border-emerald-800/60">
              {unclaimedReferralCoins > 0 ? (
                <button
                  type="button"
                  onClick={handleClaimSignupCoins}
                  disabled={claimingSignupCoins}
                  className="w-full py-1.5 px-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-700 active:scale-95 text-white font-black text-[11px] shadow-sm flex items-center justify-center gap-1 cursor-pointer animate-bounce transition-all disabled:opacity-50"
                >
                  <Coins className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span className="truncate">
                    {claimingSignupCoins
                      ? 'Claiming...'
                      : `Claim ${unclaimedReferralCoins.toLocaleString()}`}
                  </span>
                </button>
              ) : directSignupEarnings > 0 ? (
                <div className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800/60 py-1 px-1.5 rounded-lg text-center flex items-center justify-center gap-1 truncate">
                  <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 stroke-[3] shrink-0" />
                  <span className="truncate">Claimed</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleShare}
                  className="w-full py-1 px-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-extrabold text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-all"
                >
                  <Share2 className="w-3 h-3 text-emerald-700 dark:text-emerald-400 shrink-0" />
                  <span className="truncate">Invite</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {feedback && (
          <div
            className={`mt-3 p-3.5 rounded-2xl text-xs font-bold shadow-xs flex items-center justify-between gap-2 ${
              feedback.success
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800'
            }`}
          >
            <span>{feedback.message}</span>
            <button
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs font-bold px-1"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Real-time Joined Friends Live List */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-100 dark:border-slate-800 transition-colors">
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-display font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" />
              <span>Joined Friends ({referredFriends.length})</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live real-time updates when friends join using your referral code
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-[11px] font-extrabold animate-pulse shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Live Syncing</span>
          </div>
        </div>

        {referredFriends.length === 0 ? (
          <div className="text-center py-8 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3 shadow-xs">
              <UserPlus className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No Friends Joined Yet</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
              Share your referral code ({referralCode}). When a friend joins, they will appear here live in real-time!
            </p>
            <button
              onClick={handleShare}
              className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black inline-flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Referral Link</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {referredFriends.map((friend) => (
              <div
                key={friend.uid}
                className="p-3 bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100/80 dark:hover:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-3 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-amber-500 text-slate-950 font-black text-sm flex items-center justify-center overflow-hidden shrink-0 shadow-xs border border-white">
                    {friend.photoURL ? (
                      <img src={friend.photoURL} alt={friend.displayName} className="w-full h-full object-cover" />
                    ) : (
                      friend.displayName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 dark:text-white text-xs truncate">{friend.displayName}</span>
                      {friend.isVerified && (
                        <span className="bg-sky-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full">✓ Verified</span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      Joined {new Date(friend.joinedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40 px-2 py-0.5 rounded-lg text-xs font-black">
                    <Coins className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>+{friend.coinsGenerated} Coins</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold block mt-0.5">
                    100 Bonus + 3% Commission
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Enter Friend's Referral Code Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-100 dark:border-slate-800 transition-colors">
        <h3 className="font-display font-black text-lg text-slate-900 dark:text-white mb-1 flex items-center gap-2">
          <span>Have a Friend's Referral Code?</span>
          <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
            +100 Coins
          </span>
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-300 mb-4">
          Enter your friend's referral code below to receive 100 free bonus coins instantly into your wallet.
        </p>

        {profile?.referredBy ? (
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-bold">
            <Check className="w-4 h-4 text-emerald-500 stroke-[3]" />
            <span>You have already applied referral code ({profile.referredBy})!</span>
          </div>
        ) : (
          <form onSubmit={handleApplyCode} className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="e.g. COIN-7K9A"
                disabled={loading}
                className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl uppercase tracking-wider font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="submit"
                disabled={loading || !inputCode.trim()}
                className={`px-5 py-3 rounded-2xl font-display font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer ${
                  !inputCode.trim()
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                    : 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/25'
                }`}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Apply</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-xl text-xs font-bold ${
                  feedback.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
                }`}
              >
                {feedback.message}
              </div>
            )}
          </form>
        )}
      </div>

      {/* How it works steps */}
      <div className="bg-slate-100/70 dark:bg-slate-900/60 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 transition-colors">
        <h4 className="font-display font-black text-sm text-slate-900 dark:text-white mb-3 flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-amber-500" />
          <span>How Referral &amp; 3% Commission Works</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-white dark:bg-slate-800/90 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
            <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center mb-1.5 text-xs">
              1
            </div>
            <span className="font-bold text-slate-900 dark:text-white block">Share Your Code</span>
            <span className="text-slate-600 dark:text-slate-300 text-[11px]">Share your referral link or code with your friends &amp; family.</span>
          </div>

          <div className="bg-white dark:bg-slate-800/90 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
            <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center mb-1.5 text-xs">
              2
            </div>
            <span className="font-bold text-slate-900 dark:text-white block">100 Coins to Both</span>
            <span className="text-slate-600 dark:text-slate-300 text-[11px]">When your friend enters your code, you get 100 Coins &amp; they get 100 Coins.</span>
          </div>

          <div className="bg-white dark:bg-slate-800/90 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center mb-1.5 text-xs">
              3
            </div>
            <span className="font-bold text-slate-900 dark:text-white block">3% Lifetime Commission</span>
            <span className="text-slate-600 dark:text-slate-300 text-[11px]">Friend jitni bhi coins jeetega (Spin, Scratch, Captcha, Check-in), uska 3% aapke wallet me automatically aayega!</span>
          </div>
        </div>
      </div>
    </div>
  );
};

