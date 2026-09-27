import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Trophy,
  Crown,
  Medal,
  Users,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  subscribeLeaderboard,
  getCachedLeaderboard,
  fetchLeaderboard
} from '../services/coinService';
import { UserProfile } from '../types';
import { GoldCoin } from './GoldCoin';
import { VerifiedBadge } from './VerifiedBadge';
import { sound } from '../utils/sound';

interface LeaderboardViewProps {
  initialTab?: 'coins' | 'referrals';
  onBack?: () => void;
  onGoToReferral?: () => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  initialTab = 'coins',
  onBack,
  onGoToReferral
}) => {
  const { profile } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'coins' | 'referrals'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Instant synchronous cache initialization for 0ms loading
  const [leaders, setLeaders] = useState<UserProfile[]>(() => {
    const cached = getCachedLeaderboard();
    if (cached && cached.length > 0) return cached;
    if (profile) return [profile];
    return [];
  });
  
  const [loading, setLoading] = useState<boolean>(() => {
    const cached = getCachedLeaderboard();
    return !(cached && cached.length > 0) && !profile;
  });

  // Format coins: >= 1,000 converted to 1k, 10k, etc.
  const formatCoins = (num: number | undefined | null): string => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    if (num >= 1000000) {
      const formatted = (num / 1000000).toFixed(1).replace(/\.0$/, '');
      return `${formatted}M`;
    }
    if (num >= 1000) {
      const formatted = (num / 1000).toFixed(1).replace(/\.0$/, '');
      return `${formatted}k`;
    }
    return num.toLocaleString();
  };

  // Subscribe to Live Real-Time Leaderboard from Firestore (Instant updates in background)
  useEffect(() => {
    // Safety timer: Under NO circumstances keep loading screen longer than 400ms
    const timeoutTimer = setTimeout(() => {
      setLoading(false);
    }, 400);

    const unsubscribe = subscribeLeaderboard((liveUsers) => {
      if (liveUsers && liveUsers.length > 0) {
        setLeaders(liveUsers);
      } else if (profile) {
        setLeaders([profile]);
      }
      setLoading(false);
    }, 100);

    return () => {
      clearTimeout(timeoutTimer);
      unsubscribe();
    };
  }, [profile]);

  const [syncing, setSyncing] = useState(false);

  // Compute displayed leaders sorted by active tab
  const displayedLeaders = useMemo(() => {
    let list = [...leaders];

    // Ensure current logged-in user is ALWAYS present with their absolute latest profile stats
    if (profile?.uid) {
      const idx = list.findIndex((u) => u.uid === profile.uid);
      const currentProfileRefs = profile.referralCount || 0;
      const currentListRefs = idx >= 0 ? (list[idx].referralCount || 0) : 0;
      const latestReferrals = Math.max(currentProfileRefs, currentListRefs);
      const latestCoins = profile.coins ?? (idx >= 0 ? list[idx].coins : 0);
      const latestEarned = Math.max(
        profile.totalEarned || 0,
        idx >= 0 ? (list[idx].totalEarned || 0) : 0,
        latestCoins
      );

      const mergedUser: UserProfile = {
        ...(idx >= 0 ? list[idx] : {}),
        ...profile,
        referralCount: latestReferrals,
        coins: latestCoins,
        totalEarned: latestEarned
      };

      if (idx >= 0) {
        list[idx] = mergedUser;
      } else {
        list.push(mergedUser);
      }
    }

    if (activeTab === 'referrals') {
      list.sort((a, b) => {
        const refA = a.referralCount || 0;
        const refB = b.referralCount || 0;
        if (refB !== refA) return refB - refA;
        const coinsA = Math.max(a.coins || 0, a.totalEarned || 0);
        const coinsB = Math.max(b.coins || 0, b.totalEarned || 0);
        return coinsB - coinsA;
      });
    } else {
      list.sort((a, b) => {
        const scoreA = Math.max(a.coins || 0, a.totalEarned || 0);
        const scoreB = Math.max(b.coins || 0, b.totalEarned || 0);
        return scoreB - scoreA;
      });
    }
    return list;
  }, [leaders, activeTab, profile]);

  // Determine current user rank in real-time based on active tab
  const myIndex = useMemo(() => {
    if (!profile?.uid) return -1;
    return displayedLeaders.findIndex((u) => u.uid === profile.uid);
  }, [displayedLeaders, profile?.uid]);

  const isCurrentUserTop1 = myIndex === 0;
  const myRank = myIndex >= 0 ? `#${myIndex + 1}` : '#-';
  const myCoins = profile?.coins ?? (profile?.totalEarned ?? 0);
  const myReferrals = Math.max(
    profile?.referralCount || 0,
    myIndex >= 0 ? (displayedLeaders[myIndex]?.referralCount || 0) : 0
  );
  const myName = profile?.displayName || 'You';

  const handleSyncLeaderboard = async () => {
    setSyncing(true);
    sound.playCoinSound();
    try {
      const fresh = await fetchLeaderboard(100);
      if (fresh && fresh.length > 0) {
        setLeaders(fresh);
      }
    } finally {
      setTimeout(() => setSyncing(false), 500);
    }
  };

  const top1 = displayedLeaders.length > 0 ? displayedLeaders[0] : null;
  const top2 = displayedLeaders.length > 1 ? displayedLeaders[1] : null;
  const top3 = displayedLeaders.length > 2 ? displayedLeaders[2] : null;
  const restLeaders = displayedLeaders.length > 3 ? displayedLeaders.slice(3) : [];

  const getInitialColor = (idx: number): string => {
    const colors = [
      'bg-[#7C3AED]',
      'bg-[#2563EB]',
      'bg-[#D97706]',
      'bg-[#059669]',
      'bg-[#DC2626]',
      'bg-[#4F46E5]',
      'bg-[#0891B2]',
      'bg-[#9333EA]'
    ];
    return colors[idx % colors.length];
  };

  return (
    <div className="space-y-3 pb-36 max-w-md mx-auto -mt-2 sm:-mt-3 text-slate-900 dark:text-slate-100">
      {/* Category Segmented Switcher: Coins Top vs Refer Leaderboard */}
      <div className="flex items-center gap-2 mb-2">
        <div className="grid grid-cols-2 p-1 bg-slate-200/85 dark:bg-slate-800 rounded-2xl border border-slate-300/80 dark:border-slate-700 flex-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('coins')}
            className={`py-2 px-3 rounded-xl font-display font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'coins'
                ? 'bg-white dark:bg-slate-700 text-slate-950 dark:text-white shadow-sm border border-slate-200 dark:border-slate-600'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <GoldCoin className="w-4 h-4" />
            <span>Coins Top</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('referrals')}
            className={`py-2 px-3 rounded-xl font-display font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'referrals'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Refer</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleSyncLeaderboard}
          disabled={syncing}
          className="p-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/85 dark:border-slate-700 rounded-2xl shadow-2xs text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 transition-all cursor-pointer"
          title="Refresh Leaderboard"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin text-purple-600' : ''}`} />
        </button>
      </div>
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {/* Skeleton Podium */}
          <div className="bg-gradient-to-b from-[#1E1B4B] to-[#0F172A] rounded-3xl p-5 border border-purple-900/40">
            <div className="w-24 h-3 bg-white/20 rounded-full mx-auto mb-6" />
            <div className="grid grid-cols-3 gap-2 items-end pt-4 pb-2">
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-slate-700/60 mb-2" />
                <div className="w-16 h-3 bg-slate-700/60 rounded-md mb-1" />
                <div className="w-12 h-2.5 bg-slate-700/40 rounded-md" />
              </div>
              <div className="flex flex-col items-center">
                <div className="w-18 h-18 rounded-full bg-amber-500/30 mb-2" />
                <div className="w-20 h-3.5 bg-amber-500/40 rounded-md mb-1" />
                <div className="w-14 h-2.5 bg-amber-500/30 rounded-md" />
              </div>
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-slate-700/60 mb-2" />
                <div className="w-16 h-3 bg-slate-700/60 rounded-md mb-1" />
                <div className="w-12 h-2.5 bg-slate-700/40 rounded-md" />
              </div>
            </div>
          </div>

          {/* Skeleton List items */}
          <div className="space-y-2 mt-4">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={`skel-${s}`}
                className="bg-white rounded-2xl p-3 border border-slate-200/80 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-5 h-4 bg-slate-200 rounded-md" />
                  <div className="w-10 h-10 rounded-full bg-slate-200" />
                  <div className="space-y-1.5">
                    <div className="w-24 h-3.5 bg-slate-200 rounded-md" />
                    <div className="w-16 h-2.5 bg-slate-150 rounded-md" />
                  </div>
                </div>
                <div className="w-14 h-6 bg-slate-100 rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      ) : displayedLeaders.length === 0 ? (
        <div className="bg-white rounded-3xl p-6 text-center border border-slate-200 shadow-sm mt-4">
          <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Trophy className="w-7 h-7" />
          </div>
          <h3 className="font-display font-black text-slate-900 text-base mb-1">
            No Players Yet
          </h3>
          <p className="text-xs text-slate-500">
            {activeTab === 'coins'
              ? 'Play games and earn coins to be the first champion on the leaderboard!'
              : 'Invite friends to earn referral bonus and rank #1 on the refer leaderboard!'}
          </p>
        </div>
      ) : (
        <>
          {/* 2. Podium Section for Top 3 Players */}
          <div className="bg-gradient-to-b from-[#1E1B4B] to-[#0F172A] rounded-3xl p-4 sm:p-5 text-white shadow-lg border border-purple-900/40 mb-4">
            <div className="text-center mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                {activeTab === 'coins' ? '⭐ Top Earners ⭐' : '👥 Top Refer ⭐'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 items-end pt-2 pb-1">
              {/* Rank 2 (Left) */}
              <div className="flex flex-col items-center">
                {top2 ? (
                  <div className="flex flex-col items-center w-full">
                    <div className="relative mb-1.5">
                      {top2.photoURL ? (
                        <img
                          src={top2.photoURL}
                          alt={top2.displayName}
                          className="w-14 h-14 rounded-full object-cover border-2 border-slate-300 shadow-md"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(top2.uid || top2.displayName || 'player2')}`;
                          }}
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-slate-700 text-slate-200 font-black text-lg flex items-center justify-center border-2 border-slate-300 shadow-md">
                          {top2.displayName ? top2.displayName.charAt(0).toUpperCase() : '2'}
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-300 text-slate-900 text-[10px] font-black flex items-center justify-center border border-white shadow-xs">
                        2
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-1 max-w-full px-1">
                      <span className="font-bold text-xs text-white truncate text-center">
                        {top2.displayName || 'Player 2'}
                      </span>
                      {top2.isVerified && <VerifiedBadge size="sm" />}
                    </div>
                    <div className="bg-white/10 px-2 py-0.5 rounded-full flex items-center gap-1 mt-1 border border-white/10">
                      {activeTab === 'coins' ? (
                        <>
                          <GoldCoin className="w-3 h-3" />
                          <span className="text-[11px] font-bold text-slate-200">
                            {formatCoins(top2.coins ?? top2.totalEarned ?? 0)}
                          </span>
                        </>
                      ) : (
                        <>
                          <Users className="w-3 h-3 text-purple-300" />
                          <span className="text-[11px] font-bold text-purple-200">
                            {top2.referralCount || 0} Refer
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-20 flex items-center justify-center text-[10px] text-slate-500 font-bold">
                    Empty #2
                  </div>
                )}
                <div className="w-full bg-slate-800/80 h-10 rounded-t-xl mt-2 flex items-center justify-center border-t border-slate-600/50">
                  <span className="text-xs font-black text-slate-300">🥈 2nd</span>
                </div>
              </div>

              {/* Rank 1 (Center Champion) */}
              <div className="flex flex-col items-center">
                {top1 && (
                  <div className="flex flex-col items-center w-full relative">
                    <div className="relative mb-1.5">
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 p-1 rounded-full shadow-md z-10 animate-bounce">
                        <Crown className="w-3.5 h-3.5 fill-slate-950" />
                      </div>
                      {top1.photoURL ? (
                        <img
                          src={top1.photoURL}
                          alt={top1.displayName}
                          className="w-16 h-16 rounded-full object-cover border-3 border-amber-400 shadow-lg"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(top1.uid || top1.displayName || 'player1')}`;
                          }}
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-500 text-slate-950 font-black text-xl flex items-center justify-center border-3 border-amber-300 shadow-lg">
                          {top1.displayName ? top1.displayName.charAt(0).toUpperCase() : '👑'}
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-400 text-slate-950 text-xs font-black flex items-center justify-center border-2 border-white shadow-xs">
                        1
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-1 max-w-full px-1">
                      <span className="font-black text-xs sm:text-sm text-amber-300 truncate text-center">
                        {top1.displayName || 'Champion'}
                      </span>
                      {top1.isVerified && <VerifiedBadge size="md" />}
                    </div>
                    <div className="bg-amber-400/20 px-2.5 py-0.5 rounded-full flex items-center gap-1 mt-1 border border-amber-400/30 shadow-xs">
                      {activeTab === 'coins' ? (
                        <>
                          <GoldCoin className="w-3.5 h-3.5" />
                          <span className="text-xs font-black text-amber-300">
                            {formatCoins(top1.coins ?? top1.totalEarned ?? 0)}
                          </span>
                        </>
                      ) : (
                        <>
                          <Users className="w-3.5 h-3.5 text-amber-300" />
                          <span className="text-xs font-black text-amber-300">
                            {top1.referralCount || 0} Refer
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}
                <div className="w-full bg-amber-500/20 h-14 rounded-t-xl mt-2 flex items-center justify-center border-t-2 border-amber-400">
                  <span className="text-xs font-black text-amber-300">🥇 1st</span>
                </div>
              </div>

              {/* Rank 3 (Right) */}
              <div className="flex flex-col items-center">
                {top3 ? (
                  <div className="flex flex-col items-center w-full">
                    <div className="relative mb-1.5">
                      {top3.photoURL ? (
                        <img
                          src={top3.photoURL}
                          alt={top3.displayName}
                          className="w-14 h-14 rounded-full object-cover border-2 border-amber-600/70 shadow-md"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(top3.uid || top3.displayName || 'player3')}`;
                          }}
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-amber-900/80 text-amber-200 font-black text-lg flex items-center justify-center border-2 border-amber-600 shadow-md">
                          {top3.displayName ? top3.displayName.charAt(0).toUpperCase() : '3'}
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-700 text-white text-[10px] font-black flex items-center justify-center border border-white shadow-xs">
                        3
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-1 max-w-full px-1">
                      <span className="font-bold text-xs text-white truncate text-center">
                        {top3.displayName || 'Player 3'}
                      </span>
                      {top3.isVerified && <VerifiedBadge size="sm" />}
                    </div>
                    <div className="bg-white/10 px-2 py-0.5 rounded-full flex items-center gap-1 mt-1 border border-white/10">
                      {activeTab === 'coins' ? (
                        <>
                          <GoldCoin className="w-3 h-3" />
                          <span className="text-[11px] font-bold text-amber-200">
                            {formatCoins(top3.coins ?? top3.totalEarned ?? 0)}
                          </span>
                        </>
                      ) : (
                        <>
                          <Users className="w-3 h-3 text-amber-300" />
                          <span className="text-[11px] font-bold text-amber-200">
                            {top3.referralCount || 0} Refer
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-20 flex items-center justify-center text-[10px] text-slate-500 font-bold">
                    Empty #3
                  </div>
                )}
                <div className="w-full bg-amber-950/60 h-8 rounded-t-xl mt-2 flex items-center justify-center border-t border-amber-700/50">
                  <span className="text-xs font-black text-amber-400">🥉 3rd</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Real-Time Leaderboard List */}
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="font-display font-black text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>{activeTab === 'coins' ? 'All Players Ranking' : 'Top Refer Ranking'}</span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">({displayedLeaders.length})</span>
            </h2>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {activeTab === 'coins' ? 'Highest Coins' : 'Most Refer'}
            </span>
          </div>

          <div className="space-y-2">
            {displayedLeaders.map((user, idx) => {
              const rankNumber = idx + 1;
              const isTop1 = rankNumber === 1;
              const isTop2 = rankNumber === 2;
              const isTop3 = rankNumber === 3;
              const isSelf = profile?.uid === user.uid;
              const score = Math.max(user.coins || 0, user.totalEarned || 0);
              const userInvites = user.referralCount || 0;

              return (
                <motion.div
                  key={user.uid ? `leader-${user.uid}-${idx}` : `leader-${idx}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.02, 0.2) }}
                  className={`rounded-2xl px-3.5 py-2.5 flex items-center justify-between border transition-all ${
                    isSelf
                      ? activeTab === 'referrals'
                        ? 'bg-purple-50/90 dark:bg-purple-950/70 border-purple-300 dark:border-purple-600 ring-2 ring-purple-400/40 shadow-xs'
                        : 'bg-amber-50/90 dark:bg-amber-950/70 border-amber-300 dark:border-amber-600 ring-2 ring-amber-400/40 shadow-xs'
                      : isTop1
                      ? activeTab === 'referrals'
                        ? 'bg-purple-50/40 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/40'
                        : 'bg-amber-50/50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40'
                      : 'bg-white dark:bg-slate-850 dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  {/* Left: Rank + Avatar + Name */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex items-center justify-center min-w-[1.6rem]">
                      {isTop1 ? (
                        <span className="text-base">🥇</span>
                      ) : isTop2 ? (
                        <span className="text-base">🥈</span>
                      ) : isTop3 ? (
                        <span className="text-base">🥉</span>
                      ) : (
                        <span className="font-display font-black text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                          #{rankNumber}
                        </span>
                      )}
                    </div>

                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'Player'}
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover shadow-xs border border-white dark:border-slate-800 flex-shrink-0"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.uid || user.displayName || 'player')}`;
                        }}
                      />
                    ) : (
                      <div
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full ${getInitialColor(
                          idx
                        )} text-white font-bold text-xs sm:text-sm flex items-center justify-center shadow-xs border border-white dark:border-slate-800 flex-shrink-0`}
                      >
                        {user.displayName
                          ? user.displayName.charAt(0).toUpperCase()
                          : user.email
                          ? user.email.charAt(0).toUpperCase()
                          : 'P'}
                      </div>
                    )}

                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                          {user.displayName || (user.email ? user.email.split('@')[0] : `Player ${rankNumber}`)}
                        </span>
                        {user.isVerified && <VerifiedBadge size="sm" />}
                        {isSelf && (
                          <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded-md shrink-0 ${
                            activeTab === 'referrals'
                              ? 'bg-purple-600 text-white'
                              : 'bg-amber-500 text-slate-950'
                          }`}>
                            YOU
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Score (Coins or Refer) */}
                  {activeTab === 'coins' ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {(user.referralCount || 0) > 0 && (
                        <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2 py-1 rounded-xl border border-purple-200/80 dark:border-purple-800/40 flex items-center gap-1">
                          <Users className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                          <span>{user.referralCount}</span>
                        </span>
                      )}
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-2.5 py-1.5 border border-slate-200/80 dark:border-slate-700 shadow-2xs flex items-center gap-1.5">
                        <GoldCoin className="w-4 h-4" />
                        <span className="font-display font-black text-xs sm:text-sm text-slate-900 dark:text-amber-300">
                          {formatCoins(score)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-purple-50 dark:bg-purple-950/60 rounded-xl px-2.5 py-1.5 border border-purple-200/80 dark:border-purple-800/40 shadow-2xs flex items-center gap-1.5 shrink-0">
                      <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span className="font-display font-black text-xs sm:text-sm text-purple-900 dark:text-purple-300">
                        {userInvites}{' '}
                        <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">Refer</span>
                      </span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {/* 4. Bottom Sticky "Your Ranking" Bar */}
      <div className="fixed bottom-16 left-0 right-0 max-w-md mx-auto px-4 pointer-events-none z-30">
        <div className="pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
          <div className={`rounded-xl px-3.5 py-2 flex items-center justify-between border ${
            activeTab === 'referrals'
              ? 'bg-gradient-to-r from-purple-50 dark:from-purple-950/50 to-indigo-50/60 dark:to-indigo-950/40 border-purple-200/80 dark:border-purple-800/40'
              : 'bg-gradient-to-r from-amber-50 dark:from-amber-950/50 to-orange-50/60 dark:to-orange-950/40 border-amber-200/80 dark:border-amber-800/40'
          }`}>
            {/* Left: Rank + Avatar + Name */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span className={`font-display font-black text-xs sm:text-sm min-w-[1.6rem] ${
                activeTab === 'referrals' ? 'text-purple-800 dark:text-purple-300' : 'text-amber-800 dark:text-amber-300'
              }`}>
                {myRank}
              </span>

              {profile?.photoURL ? (
                <img
                  src={profile.photoURL}
                  alt={myName}
                  className="w-8 h-8 rounded-full object-cover shadow-xs border border-white dark:border-slate-800 flex-shrink-0"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(profile?.uid || myName || 'player')}`;
                  }}
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-slate-700 text-white font-black text-xs flex items-center justify-center shadow-xs border border-white dark:border-slate-800 flex-shrink-0">
                  {myName.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                    {myName}
                  </span>
                  {profile?.isVerified && <VerifiedBadge size="sm" />}
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block truncate">
                  {myIndex >= 0
                    ? `Your Position on ${activeTab === 'coins' ? 'Coins' : 'Refer'} Leaderboard`
                    : activeTab === 'coins'
                    ? 'Earn coins to climb up'
                    : 'Refer friends to climb up'}
                </span>
              </div>
            </div>

            {/* Right: User's Score */}
            {activeTab === 'coins' ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl px-2.5 py-1 border border-amber-200/80 dark:border-amber-800/40 shadow-2xs flex items-center gap-1.5 shrink-0">
                <GoldCoin className="w-4 h-4" />
                <span className="font-display font-black text-xs sm:text-sm text-slate-950 dark:text-amber-300">
                  {formatCoins(myCoins)}
                </span>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-xl px-2.5 py-1 border border-purple-200/80 dark:border-purple-800/40 shadow-2xs flex items-center gap-1.5 shrink-0">
                <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="font-display font-black text-xs sm:text-sm text-purple-950 dark:text-purple-300">
                  {myReferrals}{' '}
                  <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">Refer</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
