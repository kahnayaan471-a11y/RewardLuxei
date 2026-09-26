import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  addDoc,
  increment,
  runTransaction,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { getClientNetworkInfo, getCachedClientNetworkInfo } from '../utils/networkTracker';
import {
  UserProfile,
  WithdrawalRequest,
  WithdrawalStatus,
  CoinTransaction,
  TransactionType,
  WithdrawalMethod,
  WithdrawalDetails,
  AppSettings,
  AppTask,
  UserTaskProgress,
  UserTaskStatus,
  LeaderboardRewardState,
  ReferralFriendItem,
  UserReferralHistoryData,
  PromoCode,
  PromoCodeRedemption,
  PhysicalPrizeClaim,
  GiveawayConfig,
  GiveawayEntry,
  FeatureToggles,
  FreeFireTournament,
  TournamentParticipant
} from '../types';
import { ALL_DEMO_USERS } from '../data/demoUsers';

export const DEFAULT_SETTINGS: AppSettings = {
  coinsPerInr: 100, // 100 Coins = 1 INR
  minWithdrawInr: 10, // Min ₹10 (1000 coins)
  referralBonusReferrer: 100, // 100 coins to referrer
  referralBonusReferee: 100, // 100 coins to referee (joiner)
  referralCommissionPercent: 3, // 3% lifetime earnings commission to referrer
  dailySpinLimit: 10,
  dailyScratchLimit: 10,
  dailyCaptchaLimit: 20,
  requiredTasksForWithdrawal: 3
};

// Calculate required completed tasks for any withdrawal amount (₹10 = 1 task, ₹20 = 2 tasks, ₹50 = 5 tasks)
export function calculateRequiredTasksForWithdrawal(inrAmount: number, userOverride?: number): number {
  if (userOverride === 0) return 0; // Admin override 0 exempts user
  // If user has a custom override set by admin (e.g. 1, 2, 3 tasks)
  if (userOverride !== undefined && userOverride > 0) {
    const amountTier = Math.max(1, Math.floor(inrAmount / 10));
    return Math.max(userOverride, amountTier);
  }
  // Standard rule: 1 task per ₹10 (e.g. ₹10 -> 1 task, ₹20 -> 2 tasks, ₹50 -> 5 tasks, ₹100 -> 10 tasks)
  return Math.max(1, Math.floor(inrAmount / 10));
}

// Get user's available completed tasks that have not been consumed by previous withdrawals
export function getUserAvailableTasksForWithdrawal(user: Partial<UserProfile> | null | undefined): number {
  if (!user) return 0;
  const completed = user.completedTasksCount || 0;
  const used = user.tasksUsedForWithdrawal || 0;
  return Math.max(0, completed - used);
}

export const DAILY_CHECKIN_REWARDS = [10, 10, 10, 10, 10, 10, 50]; // Day 1-6: 10 Coins, Day 7 (Final): 50 Coins

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getYesterdayDateString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yYear = yesterday.getFullYear();
  const yMonth = String(yesterday.getMonth() + 1).padStart(2, '0');
  const yDay = String(yesterday.getDate()).padStart(2, '0');
  return `${yYear}-${yMonth}-${yDay}`;
}

// Generate random referral code like COIN-8X2A
export function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'COIN-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Helper to get cached user profile from localStorage
export function getCachedProfile(uid: string): UserProfile | null {
  try {
    const raw = localStorage.getItem(`coin_user_${uid}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Helper to set cached user profile to localStorage
export function setCachedProfile(uid: string, profile: UserProfile): void {
  try {
    localStorage.setItem(`coin_user_${uid}`, JSON.stringify(profile));
  } catch {
    // Ignore storage quota errors
  }
}

// Initialize / Sync User Profile in Firestore
export async function initializeUserProfile(
  uid: string,
  email: string,
  displayName: string,
  photoURL?: string,
  referredByCode?: string
): Promise<UserProfile> {
  const today = getTodayDateString();
  const cached = getCachedProfile(uid);

  // Fetch client network info (IP, network type, device ID)
  let netInfo = getCachedClientNetworkInfo();
  try {
    const freshNet = await getClientNetworkInfo();
    if (freshNet) netInfo = freshNet;
  } catch {
    // Keep cached
  }

  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data() as UserProfile;
      // Check if daily limits need reset or admin role sync
      const updates: Partial<UserProfile> = {
        lastLoginDate: today,
        lastLoginAt: Date.now(),
        updatedAt: Date.now()
      };

      // Record IP, network, and device ID
      if (netInfo.ip && netInfo.ip !== '127.0.0.1') {
        updates.lastIp = netInfo.ip;
      } else if (!data.lastIp && netInfo.ip) {
        updates.lastIp = netInfo.ip;
      }
      if (netInfo.networkType) {
        updates.networkType = netInfo.networkType;
      }
      if (netInfo.deviceId) {
        updates.deviceId = netInfo.deviceId;
      }

      // Maintain list of historical IPs (max 5)
      if (netInfo.ip && netInfo.ip !== '127.0.0.1') {
        const history = Array.isArray(data.ipHistory) ? [...data.ipHistory] : [];
        if (!history.includes(netInfo.ip)) {
          history.unshift(netInfo.ip);
          updates.ipHistory = history.slice(0, 5);
        }
      }
      const normalizedEmail = (email || data.email || '').toLowerCase().trim();
      const isAdminEmail =
        normalizedEmail === 'kb124701@gmail.com' ||
        normalizedEmail === 'admin@coinrewards.com' ||
        normalizedEmail === 'admin@rewardluxe.com' ||
        normalizedEmail.startsWith('admin@');

      if (isAdminEmail && data.role !== 'admin') {
        updates.role = 'admin';
      }

      if (displayName && (!data.displayName || data.displayName === 'Player')) {
        updates.displayName = displayName;
      }

      if (photoURL && !data.photoURL) {
        updates.photoURL = photoURL;
      }

      if (data.lastSpinDate !== today) {
        updates.spinsLeftToday = DEFAULT_SETTINGS.dailySpinLimit;
        updates.lastSpinDate = today;
      }
      if (data.lastScratchDate !== today) {
        updates.scratchesLeftToday = DEFAULT_SETTINGS.dailyScratchLimit;
        updates.lastScratchDate = today;
      }
      if (data.lastCaptchaDate !== today) {
        updates.captchasLeftToday = DEFAULT_SETTINGS.dailyCaptchaLimit;
        updates.lastCaptchaDate = today;
      }

      try {
        await setDoc(userRef, sanitizePayload(updates), { merge: true });
      } catch (e) {
        console.warn('Could not sync user update to Firestore:', e);
      }
      const updated = { ...data, ...updates };
      setCachedProfile(uid, updated);
      return updated;
    }

    // New User Creation
    const newProfile: UserProfile = {
      uid,
      email: email.toLowerCase(),
      displayName: displayName || email.split('@')[0] || 'Player',
      photoURL: photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`,
      coins: 100, // 100 welcome bonus coins!
      totalEarned: 100,
      totalWithdrawn: 0,
      referralCode: generateReferralCode(),
      referredBy: null,
      referralCount: 0,
      role: email.toLowerCase() === 'kb124701@gmail.com' || email.toLowerCase().includes('admin') ? 'admin' : 'user',
      isBanned: false,
      isVerified: false,
      completedTasksCount: 0,
      tasksUsedForWithdrawal: 0,
      requiredTasksForWithdrawal: DEFAULT_SETTINGS.requiredTasksForWithdrawal ?? 3,
      dailyStreak: 0,
      lastCheckInDate: null,
      spinsLeftToday: DEFAULT_SETTINGS.dailySpinLimit,
      lastSpinDate: today,
      scratchesLeftToday: DEFAULT_SETTINGS.dailyScratchLimit,
      lastScratchDate: today,
      captchasLeftToday: DEFAULT_SETTINGS.dailyCaptchaLimit,
      lastCaptchaDate: today,
      createdAt: Date.now(),
      lastLoginDate: today,
      lastLoginAt: Date.now(),
      lastIp: netInfo.ip || '127.0.0.1',
      networkType: netInfo.networkType || '4G/Wi-Fi',
      deviceId: netInfo.deviceId,
      ipHistory: netInfo.ip && netInfo.ip !== '127.0.0.1' ? [netInfo.ip] : [],
      updatedAt: Date.now()
    };

    try {
      await setDoc(userRef, sanitizePayload(newProfile), { merge: true });
      // Record Welcome Transaction
      await addDoc(collection(db, 'transactions'), {
        userId: uid,
        type: 'referral_signup',
        amount: 100,
        description: 'Welcome Bonus',
        timestamp: Date.now()
      });
    } catch (e) {
      console.warn('Could not persist new user doc to server immediately:', e);
    }

    setCachedProfile(uid, newProfile);

    // If provided referral code, process referral reward
    if (referredByCode && referredByCode.trim()) {
      try {
        await applyReferralCode(uid, referredByCode.trim().toUpperCase());
      } catch (err) {
        console.warn('Referral code apply failed:', err);
      }
    }

    return newProfile;
  } catch (err) {
    console.warn('Firestore offline or unreachable, using local cached profile:', err);
    if (cached) {
      return cached;
    }
    const fallbackProfile: UserProfile = {
      uid,
      email: email.toLowerCase(),
      displayName: displayName || email.split('@')[0] || 'Player',
      photoURL: photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`,
      coins: 100,
      totalEarned: 100,
      totalWithdrawn: 0,
      referralCode: generateReferralCode(),
      referredBy: null,
      referralCount: 0,
      role: email.toLowerCase() === 'kb124701@gmail.com' || email.toLowerCase().includes('admin') ? 'admin' : 'user',
      isBanned: false,
      isVerified: false,
      completedTasksCount: 0,
      tasksUsedForWithdrawal: 0,
      requiredTasksForWithdrawal: DEFAULT_SETTINGS.requiredTasksForWithdrawal ?? 3,
      dailyStreak: 0,
      lastCheckInDate: null,
      spinsLeftToday: DEFAULT_SETTINGS.dailySpinLimit,
      lastSpinDate: today,
      scratchesLeftToday: DEFAULT_SETTINGS.dailyScratchLimit,
      lastScratchDate: today,
      captchasLeftToday: DEFAULT_SETTINGS.dailyCaptchaLimit,
      lastCaptchaDate: today,
      createdAt: Date.now(),
      lastLoginDate: today,
      updatedAt: Date.now()
    };

    try {
      await setDoc(doc(db, 'users', uid), sanitizePayload(fallbackProfile), { merge: true });
    } catch (innerErr) {
      console.warn('Fallback setDoc also failed:', innerErr);
    }

    setCachedProfile(uid, fallbackProfile);
    return fallbackProfile;
  }
}

// Update User Profile Photo (for Profile & Leaderboard display)
export async function updateUserProfilePhoto(userId: string, photoURL: string): Promise<void> {
  const userRef = doc(db, 'users', userId);
  try {
    await updateDoc(userRef, {
      photoURL,
      updatedAt: Date.now()
    });
  } catch (err) {
    console.warn('Could not update profile photo on server immediately:', err);
  }

  const cached = getCachedProfile(userId);
  if (cached) {
    cached.photoURL = photoURL;
    cached.updatedAt = Date.now();
    setCachedProfile(userId, cached);
  }
}

// Update User Display Name
export async function updateUserDisplayName(userId: string, displayName: string): Promise<void> {
  const userRef = doc(db, 'users', userId);
  try {
    await updateDoc(userRef, {
      displayName,
      updatedAt: Date.now()
    });
  } catch (err) {
    console.warn('Could not update display name on server immediately:', err);
  }

  const cached = getCachedProfile(userId);
  if (cached) {
    cached.displayName = displayName;
    cached.updatedAt = Date.now();
    setCachedProfile(userId, cached);
  }
}

// Earn Coins Atomically & Instantly
export async function earnCoins(
  userId: string,
  amount: number,
  type: TransactionType,
  description: string,
  limitField?: 'spinsLeftToday' | 'scratchesLeftToday' | 'captchasLeftToday'
): Promise<number> {
  const userRef = doc(db, 'users', userId);
  const today = getTodayDateString();

  // 1. Immediately calculate and update local cache for zero-latency feedback
  const cached = getCachedProfile(userId);
  let newBalance = amount;
  if (cached) {
    cached.coins = Math.max(0, (cached.coins || 0) + amount);
    if (amount > 0) {
      cached.totalEarned = (cached.totalEarned || 0) + amount;
    }
    if (limitField === 'spinsLeftToday') {
      cached.spinsLeftToday = Math.max(0, (cached.spinsLeftToday ?? DEFAULT_SETTINGS.dailySpinLimit) - 1);
      cached.lastSpinDate = today;
    } else if (limitField === 'scratchesLeftToday') {
      cached.scratchesLeftToday = Math.max(0, (cached.scratchesLeftToday ?? DEFAULT_SETTINGS.dailyScratchLimit) - 1);
      cached.lastScratchDate = today;
    } else if (limitField === 'captchasLeftToday') {
      cached.captchasLeftToday = Math.max(0, (cached.captchasLeftToday ?? DEFAULT_SETTINGS.dailyCaptchaLimit) - 1);
      cached.lastCaptchaDate = today;
    }
    newBalance = cached.coins;
    setCachedProfile(userId, cached);
  }

  // 2. Dispatch optimistic UI event across the entire React application
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('coin_balance_updated', {
        detail: {
          userId,
          amount,
          type,
          limitField,
          newBalance,
          timestamp: Date.now()
        }
      })
    );
  }

  // 3. Persist to Firestore with atomic increment
  try {
    const updates: Record<string, unknown> = {
      coins: increment(amount),
      updatedAt: Date.now()
    };
    if (amount > 0) {
      updates.totalEarned = increment(amount);
    }
    if (limitField === 'spinsLeftToday') {
      updates.spinsLeftToday = increment(-1);
      updates.lastSpinDate = today;
    } else if (limitField === 'scratchesLeftToday') {
      updates.scratchesLeftToday = increment(-1);
      updates.lastScratchDate = today;
    } else if (limitField === 'captchasLeftToday') {
      updates.captchasLeftToday = increment(-1);
      updates.lastCaptchaDate = today;
    }

    await setDoc(userRef, updates, { merge: true });

    // Record ledger transaction in Firestore
    try {
      await addDoc(collection(db, 'transactions'), {
        userId,
        type,
        amount,
        description,
        timestamp: Date.now()
      });
    } catch (txErr) {
      console.warn('Transaction log creation fallback:', txErr);
    }
  } catch (err) {
    console.warn('Firestore coins update failed, saved to local cache:', err);
  }

  // 4. Distribute 3% referral commission to referrer if applicable
  if (amount > 0) {
    distributeReferralCommission(userId, amount, type).catch(err => {
      console.warn('Referral commission distribution failed:', err);
    });
  }

  return newBalance;
}

// Distribute 3% Referral Commission to Referrer when referred user earns coins
export async function distributeReferralCommission(
  refereeUserId: string,
  earnedCoins: number,
  sourceType: string
): Promise<void> {
  if (earnedCoins <= 0) return;

  try {
    const refereeRef = doc(db, 'users', refereeUserId);
    const refereeSnap = await getDoc(refereeRef);
    if (!refereeSnap.exists()) return;

    const refereeData = refereeSnap.data() as UserProfile;
    if (!refereeData.referredBy) return; // User was not referred

    // Find referrer by referralCode
    const q = query(collection(db, 'users'), where('referralCode', '==', refereeData.referredBy), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return;

    const referrerDoc = snap.docs[0];
    const referrerId = referrerDoc.id;

    // Calculate 3% commission
    const commissionPercent = DEFAULT_SETTINGS.referralCommissionPercent || 3;
    const commission = Math.max(1, Math.round((earnedCoins * commissionPercent) / 100));

    if (commission > 0) {
      const referrerRef = doc(db, 'users', referrerId);
      await updateDoc(referrerRef, {
        coins: increment(commission),
        totalEarned: increment(commission),
        updatedAt: Date.now()
      });

      // Add ledger transaction record for referrer
      await addDoc(collection(db, 'transactions'), {
        userId: referrerId,
        type: 'referral_commission',
        amount: commission,
        description: `3% Referral Commission from ${refereeData.displayName || 'Friend'} (${earnedCoins} coins in ${sourceType})`,
        timestamp: Date.now()
      });

      // Update local cached profile if present
      const cached = getCachedProfile(referrerId);
      if (cached) {
        cached.coins = (cached.coins || 0) + commission;
        cached.totalEarned = (cached.totalEarned || 0) + commission;
        setCachedProfile(referrerId, cached);
      }
    }
  } catch (err) {
    console.warn('Could not distribute referral commission:', err);
  }
}

// Claim Daily Check-In
export async function claimDailyCheckIn(userId: string): Promise<{ success: boolean; reward: number; streak: number; message: string }> {
  const userRef = doc(db, 'users', userId);
  const today = getTodayDateString();
  const yesterdayStr = getYesterdayDateString();

  const cached = getCachedProfile(userId);
  if (cached?.lastCheckInDate === today) {
    throw new Error('You have already claimed today\'s Daily Check-in!');
  }

  let newStreak = 1;
  if (cached?.lastCheckInDate === yesterdayStr) {
    newStreak = ((cached.dailyStreak || 0) % 7) + 1;
  } else {
    newStreak = 1;
  }

  const reward = DAILY_CHECKIN_REWARDS[newStreak - 1] || 10;

  // 1. Immediately update local cache
  if (cached) {
    cached.coins = (cached.coins || 0) + reward;
    cached.totalEarned = (cached.totalEarned || 0) + reward;
    cached.dailyStreak = newStreak;
    cached.lastCheckInDate = today;
    setCachedProfile(userId, cached);
  }

  // 2. Dispatch optimistic UI event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('coin_balance_updated', {
        detail: {
          userId,
          amount: reward,
          type: 'daily_checkin',
          dailyStreak: newStreak,
          lastCheckInDate: today,
          timestamp: Date.now()
        }
      })
    );
  }

  // 3. Persist to Firestore
  try {
    await setDoc(userRef, {
      coins: increment(reward),
      totalEarned: increment(reward),
      dailyStreak: newStreak,
      lastCheckInDate: today,
      updatedAt: Date.now()
    }, { merge: true });

    try {
      await addDoc(collection(db, 'transactions'), {
        userId,
        type: 'daily_checkin',
        amount: reward,
        description: `Day ${newStreak} Daily Check-In Streak Bonus`,
        timestamp: Date.now()
      });
    } catch (txErr) {
      console.warn('Transaction log creation fallback:', txErr);
    }
  } catch (err) {
    console.warn('Daily check-in Firestore sync fallback:', err);
  }

  // Distribute 3% commission on daily checkin reward
  if (reward > 0) {
    distributeReferralCommission(userId, reward, 'daily_checkin').catch(() => {});
  }

  return {
    success: true,
    reward,
    streak: newStreak,
    message: `Congratulations! Day ${newStreak} bonus of ${reward} coins claimed successfully.`
  };
}

import {
  getDeviceId,
  isDeviceAlreadyReferred,
  recordDeviceAppliedReferral
} from '../utils/deviceFingerprint';

// Apply Referral Code
export async function applyReferralCode(refereeUserId: string, referralCode: string): Promise<{ success: boolean; message: string }> {
  const refereeRef = doc(db, 'users', refereeUserId);
  const refereeDoc = await getDoc(refereeRef);
  if (!refereeDoc.exists()) throw new Error('User not found');

  const refereeData = refereeDoc.data() as UserProfile;
  if (refereeData.referredBy) {
    throw new Error('You have already applied a referral code');
  }
  if (refereeData.referralCode === referralCode) {
    throw new Error('You cannot use your own referral code');
  }

  // Multi-Account / Device Detection Anti-Fraud Check
  const currentDeviceId = getDeviceId();
  if (isDeviceAlreadyReferred(referralCode)) {
    throw new Error('Self-referral ya ek hi phone se multiple referral codes apply karna allowed nahi hai.');
  }

  // Find referrer
  const q = query(collection(db, 'users'), where('referralCode', '==', referralCode), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) {
    throw new Error('Invalid referral code. Please check and try again.');
  }

  const referrerDoc = snap.docs[0];
  const referrerId = referrerDoc.id;
  const referrerData = referrerDoc.data() as UserProfile;

  if (referrerId === refereeUserId) {
    throw new Error('Self-referral allowed nahi hai.');
  }

  // Anti-Fraud: Prevent self-referrals from same phone hardware device
  if (referrerData.deviceId && referrerData.deviceId === currentDeviceId) {
    throw new Error('Self-referral detected: Ek hi mobile phone se multiple accounts bana kar referral bonus claim karna prohibited hai.');
  }

  // Anti-Fraud: Prevent self-referrals from same IP / same device combo
  const clientNet = getCachedClientNetworkInfo();
  if (
    clientNet.ip &&
    clientNet.ip !== '127.0.0.1' &&
    referrerData.lastIp === clientNet.ip &&
    (referrerData.deviceId === currentDeviceId || isDeviceAlreadyReferred(referralCode))
  ) {
    throw new Error('Anti-fraud check: Same network aur device se self-referral karna prohibited hai.');
  }

  // Record applied referral for this device
  recordDeviceAppliedReferral(referralCode);

  // Reward Referrer (100 coins) and Referee (100 coins)
  const referrerBonus = DEFAULT_SETTINGS.referralBonusReferrer;
  const refereeBonus = DEFAULT_SETTINGS.referralBonusReferee;

  await updateDoc(refereeRef, {
    referredBy: referralCode,
    coins: increment(refereeBonus),
    totalEarned: increment(refereeBonus)
  });

  await addDoc(collection(db, 'transactions'), {
    userId: refereeUserId,
    type: 'referral_bonus',
    amount: refereeBonus,
    description: `Referral Signup Bonus (${referralCode})`,
    timestamp: Date.now()
  });

  const referrerRef = doc(db, 'users', referrerId);
  await updateDoc(referrerRef, {
    coins: increment(referrerBonus),
    totalEarned: increment(referrerBonus),
    referralCount: increment(1)
  });

  await addDoc(collection(db, 'transactions'), {
    userId: referrerId,
    type: 'referral_bonus',
    amount: referrerBonus,
    description: `Referral Reward: ${refereeData.displayName || 'Friend'} joined (+100 Coins & 3% Lifetime Commission)`,
    timestamp: Date.now()
  });

  // Update local cache if available
  const refCached = getCachedProfile(refereeUserId);
  if (refCached) {
    refCached.referredBy = referralCode;
    refCached.coins = (refCached.coins || 0) + refereeBonus;
    refCached.totalEarned = (refCached.totalEarned || 0) + refereeBonus;
    setCachedProfile(refereeUserId, refCached);
  }

  const referrerCached = getCachedProfile(referrerId);
  let referrerNewCount = 1;
  if (referrerCached) {
    referrerCached.coins = (referrerCached.coins || 0) + referrerBonus;
    referrerCached.totalEarned = (referrerCached.totalEarned || 0) + referrerBonus;
    referrerCached.referralCount = (referrerCached.referralCount || 0) + 1;
    referrerNewCount = referrerCached.referralCount;
    setCachedProfile(referrerId, referrerCached);
  }

  // Update cached leaderboard if referrer is present
  const lb = getCachedLeaderboard();
  if (lb && lb.length > 0) {
    const idx = lb.findIndex((u) => u.uid === referrerId);
    if (idx >= 0) {
      lb[idx].referralCount = (lb[idx].referralCount || 0) + 1;
      lb[idx].coins = (lb[idx].coins || 0) + referrerBonus;
      lb[idx].totalEarned = (lb[idx].totalEarned || 0) + referrerBonus;
      setCachedLeaderboard(lb);
    }
  }

  // Dispatch live window event for instant referral updates across open tabs/views
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('coin_balance_updated', {
        detail: {
          userId: referrerId,
          amount: referrerBonus,
          referralCountDelta: 1,
          newReferralCount: referrerNewCount
        }
      })
    );
  }

  return {
    success: true,
    message: `Success! ${refereeBonus} bonus coins credited to your wallet, and ${referrerBonus} coins credited to your referrer!`
  };
}

// Live Payout Feed Item interface and subscription
export interface LivePayoutFeedItem {
  id: string;
  userName: string;
  inrAmount: number;
  method: 'upi' | 'google_play' | 'bank_transfer';
  timestamp: number;
}

export function subscribeToRecentApprovedWithdrawals(
  callback: (payouts: LivePayoutFeedItem[]) => void
): () => void {
  try {
    const q = query(
      collection(db, 'withdrawals'),
      where('status', '==', 'approved'),
      limit(25)
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const payouts: LivePayoutFeedItem[] = snap.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            userName: data.userName || 'Player',
            inrAmount: data.inrAmount || 50,
            method: data.method || 'upi',
            timestamp: data.createdAt || Date.now()
          };
        });

        payouts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        callback(payouts);
      },
      (err) => {
        console.warn('Recent approved withdrawals subscription error:', err);
        callback([]);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Could not set up subscribeToRecentApprovedWithdrawals:', err);
    callback([]);
    return () => {};
  }
}

// Subscribe to Real-Time Referred Friends List for a User
export function subscribeToUserReferredFriends(
  referralCode: string,
  callback: (friends: ReferralFriendItem[]) => void
): () => void {
  if (!referralCode || !referralCode.trim()) {
    callback([]);
    return () => {};
  }

  try {
    const q = query(
      collection(db, 'users'),
      where('referredBy', '==', referralCode.trim().toUpperCase())
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const friendsList: ReferralFriendItem[] = snap.docs.map((docSnap) => {
          const data = docSnap.data() as UserProfile;
          const signupBonus = DEFAULT_SETTINGS.referralBonusReferrer || 100;
          // Calculate approx 3% commission generated from friend's total earned minus signups
          const friendEarned = data.totalEarned || 0;
          const commissionEarned = Math.round((friendEarned * (DEFAULT_SETTINGS.referralCommissionPercent || 3)) / 100);
          const totalCoinsGenerated = signupBonus + commissionEarned;

          return {
            uid: docSnap.id,
            displayName: data.displayName || 'Joined Friend',
            photoURL: data.photoURL,
            joinedAt: data.createdAt || Date.now(),
            coinsGenerated: totalCoinsGenerated,
            signupBonus,
            commissionEarned,
            friendTotalEarned: friendEarned,
            isVerified: !!data.isVerified
          };
        });

        // Sort by joinedAt descending (newest joined friends first)
        friendsList.sort((a, b) => b.joinedAt - a.joinedAt);
        callback(friendsList);
      },
      (err) => {
        console.warn('Referred friends subscription error:', err);
        callback([]);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Could not set up subscribeToUserReferredFriends:', err);
    callback([]);
    return () => {};
  }
}

// Claim Accumulated Referral Signup Coins into Wallet Balance
export async function claimReferralSignupCoins(userId: string): Promise<{ success: boolean; claimedAmount: number; message: string }> {
  if (!userId) throw new Error('User ID is required');

  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  if (!userDoc.exists()) throw new Error('User profile not found');

  const userData = userDoc.data() as UserProfile;
  const referralCount = userData.referralCount || 0;
  const totalReferralCoins = referralCount * (DEFAULT_SETTINGS.referralBonusReferrer || 100);
  const alreadyClaimed = userData.claimedReferralCoins || 0;
  const unclaimedCoins = Math.max(0, totalReferralCoins - alreadyClaimed);

  if (unclaimedCoins <= 0) {
    if (totalReferralCoins === 0) {
      throw new Error('Aapke paas abhi koi referral signup coins claim karne ke liye nahi hain. Friends ko invite karein!');
    } else {
      throw new Error('Aapne apne sabhi referral signup coins pehle hi claim kar liye hain!');
    }
  }

  const newClaimedTotal = alreadyClaimed + unclaimedCoins;

  // 1. Update local cache first
  const cached = getCachedProfile(userId);
  let newBalance = unclaimedCoins;
  if (cached) {
    cached.coins = (cached.coins || 0) + unclaimedCoins;
    cached.totalEarned = (cached.totalEarned || 0) + unclaimedCoins;
    cached.claimedReferralCoins = newClaimedTotal;
    newBalance = cached.coins;
    setCachedProfile(userId, cached);
  }

  // 2. Sync with Firestore
  try {
    await updateDoc(userRef, {
      coins: increment(unclaimedCoins),
      totalEarned: increment(unclaimedCoins),
      claimedReferralCoins: newClaimedTotal,
      updatedAt: Date.now()
    });

    await addDoc(collection(db, 'transactions'), {
      userId,
      type: 'referral_bonus',
      amount: unclaimedCoins,
      description: `Claimed ${unclaimedCoins.toLocaleString()} Referral Signup Bonus Coins (${referralCount} Friends)`,
      timestamp: Date.now()
    });
  } catch (err) {
    console.warn('Firestore sync fallback for referral claim:', err);
  }

  // 3. Dispatch optimistic UI event across the application
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('coin_balance_updated', {
        detail: {
          userId,
          amount: unclaimedCoins,
          type: 'referral_bonus',
          claimedReferralCoins: newClaimedTotal,
          newBalance,
          timestamp: Date.now()
        }
      })
    );
  }

  return {
    success: true,
    claimedAmount: unclaimedCoins,
    message: `🎉 Mubarak ho! ${unclaimedCoins.toLocaleString()} Referral Coins aapke wallet me add ho gaye hain!`
  };
}

// Fetch User Referral History & Invited Friends Details
export async function fetchUserReferralHistory(
  userId: string,
  referralCode: string
): Promise<UserReferralHistoryData> {
  const friendsList: ReferralFriendItem[] = [];
  let signupBonusTotal = 0;
  let commissionBonusTotal = 0;

  try {
    // Fetch target user's profile to check referralCount
    let expectedRefCount = 0;
    try {
      const uSnap = await getDoc(doc(db, 'users', userId));
      if (uSnap.exists()) {
        const uData = uSnap.data() as UserProfile;
        expectedRefCount = uData.referralCount || 0;
      }
    } catch (_) {}

    // 1. Query users registered using this referral code
    if (referralCode) {
      const codeClean = referralCode.trim();
      const codeUpper = codeClean.toUpperCase();
      const codesToQuery = Array.from(new Set([codeClean, codeUpper]));

      for (const code of codesToQuery) {
        try {
          const usersQ = query(
            collection(db, 'users'),
            where('referredBy', '==', code)
          );
          const usersSnap = await getDocs(usersQ);
          usersSnap.forEach((d) => {
            if (!friendsList.some(f => f.uid === d.id)) {
              const uData = d.data() as UserProfile;
              friendsList.push({
                uid: d.id,
                displayName: uData.displayName || 'Friend',
                photoURL: uData.photoURL,
                joinedAt: uData.createdAt || Date.now(),
                coinsGenerated: DEFAULT_SETTINGS.referralBonusReferrer,
                signupBonus: DEFAULT_SETTINGS.referralBonusReferrer,
                commissionEarned: 0,
                friendTotalEarned: uData.totalEarned || uData.coins || 0,
                isVerified: uData.isVerified || false
              });
            }
          });
        } catch (err) {
          console.warn('Could not query referredBy users directly:', err);
        }
      }
    }

    // 2. Query user's referral transactions (direct bonuses and 3% commissions)
    let txDocs: CoinTransaction[] = [];
    try {
      const txQ = query(
        collection(db, 'transactions'),
        where('userId', '==', userId),
        where('type', 'in', ['referral_bonus', 'referral_signup', 'referral_commission']),
        orderBy('timestamp', 'desc')
      );
      const txSnap = await getDocs(txQ);
      txDocs = txSnap.docs.map(d => ({ id: d.id, ...d.data() } as CoinTransaction));
    } catch (txErr) {
      // Fallback query without complex order/in index
      try {
        const simpleTxQ = query(
          collection(db, 'transactions'),
          where('userId', '==', userId)
        );
        const simpleSnap = await getDocs(simpleTxQ);
        txDocs = simpleSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as CoinTransaction))
          .filter(t => t.type === 'referral_bonus' || t.type === 'referral_signup' || t.type === 'referral_commission');
      } catch (e2) {
        console.warn('Fallback tx query failed:', e2);
      }
    }

    // Calculate totals and attribute commissions to friends
    txDocs.forEach((tx) => {
      if (tx.type === 'referral_bonus' || tx.type === 'referral_signup') {
        signupBonusTotal += tx.amount;

        // If we don't have friends from the user query (e.g. indexing differences), extract friend info from transaction description
        if (friendsList.length === 0 && tx.description?.includes('joined')) {
          const match = tx.description.match(/Referral Reward:\s*([^\s]+(?:\s+[^\s]+)?)\s*joined/i);
          const friendName = match ? match[1] : 'Invited Friend';
          friendsList.push({
            uid: `ref-${tx.timestamp}`,
            displayName: friendName,
            joinedAt: tx.timestamp,
            coinsGenerated: tx.amount,
            signupBonus: tx.amount,
            commissionEarned: 0,
            friendTotalEarned: 0
          });
        }
      } else if (tx.type === 'referral_commission') {
        commissionBonusTotal += tx.amount;

        // Try to match friend by displayName from description e.g. "3% Referral Commission from Rahul"
        const matchedFriend = friendsList.find(f =>
          f.displayName && tx.description?.toLowerCase().includes(f.displayName.toLowerCase())
        );

        if (matchedFriend) {
          matchedFriend.commissionEarned += tx.amount;
          matchedFriend.coinsGenerated += tx.amount;
        } else if (friendsList.length > 0) {
          // If couldn't pinpoint specific friend, distribute evenly or attribute
          friendsList[0].commissionEarned += tx.amount;
          friendsList[0].coinsGenerated += tx.amount;
        }
      }
    });

    // Pad friendsList if user's referralCount > friendsList.length
    if (expectedRefCount > friendsList.length) {
      const missingCount = expectedRefCount - friendsList.length;
      for (let i = 0; i < missingCount; i++) {
        friendsList.push({
          uid: `invited-${i + 1}`,
          displayName: `Invited Friend #${friendsList.length + 1}`,
          joinedAt: Date.now() - (i + 1) * 3600000 * 24,
          coinsGenerated: DEFAULT_SETTINGS.referralBonusReferrer,
          signupBonus: DEFAULT_SETTINGS.referralBonusReferrer,
          commissionEarned: 0,
          friendTotalEarned: 0,
          isVerified: false
        });
      }
    }

    // Sort friends by joined date descending
    friendsList.sort((a, b) => b.joinedAt - a.joinedAt);

    // If signupBonusTotal is 0 but friends exist, default to 100 * friends
    if (signupBonusTotal === 0 && friendsList.length > 0) {
      signupBonusTotal = friendsList.length * DEFAULT_SETTINGS.referralBonusReferrer;
      friendsList.forEach(f => {
        if (f.coinsGenerated === 0) f.coinsGenerated = DEFAULT_SETTINGS.referralBonusReferrer;
      });
    }

    const totalEarnings = signupBonusTotal + commissionBonusTotal;

    return {
      totalInvited: friendsList.length,
      totalEarnings,
      signupBonusTotal,
      commissionBonusTotal,
      friends: friendsList
    };
  } catch (err) {
    console.error('Error fetching referral history:', err);
    return {
      totalInvited: 0,
      totalEarnings: 0,
      signupBonusTotal: 0,
      commissionBonusTotal: 0,
      friends: []
    };
  }
}

// Helper to generate Google Play Gift Card Redeem Code format
export function generateGooglePlayRedeemCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const segment = (len: number) => {
    let s = '';
    for (let i = 0; i < len; i++) {
      s += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return s;
  };
  return `GPLAY-${segment(4)}-${segment(4)}-${segment(4)}`;
}

// Request Withdrawal
export async function submitWithdrawalRequest(
  userId: string,
  userEmail: string,
  userName: string,
  coins: number,
  inrAmount: number,
  method: WithdrawalMethod,
  details: WithdrawalDetails
): Promise<string> {
  const userRef = doc(db, 'users', userId);

  let withdrawalId = '';

  await runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists()) throw new Error('User not found');

    const userData = userDoc.data() as UserProfile;
    if (userData.isBanned) throw new Error('Account is suspended');

    if ((userData.coins || 0) < coins) {
      throw new Error(`Insufficient coin balance. You have ${userData.coins || 0} coins, required: ${coins} coins`);
    }

    // Task Lock System: Check mandatory completed tasks requirement
    const requiredTasks = calculateRequiredTasksForWithdrawal(inrAmount, userData.requiredTasksForWithdrawal);
    const availableTasks = getUserAvailableTasksForWithdrawal(userData);

    if (requiredTasks > 0 && availableTasks < requiredTasks) {
      const missing = requiredTasks - availableTasks;
      throw new Error(
        `Task Lock Active: Completing tasks is mandatory before withdrawal! You need ${requiredTasks} completed ${requiredTasks === 1 ? 'task' : 'tasks'} to withdraw ₹${inrAmount}. You currently have ${availableTasks} available. Please complete ${missing} more task${missing > 1 ? 's' : ''} from the Offerwall to unlock this payout.`
      );
    }

    // Deduct coins and record consumed tasks for this withdrawal
    transaction.update(userRef, {
      coins: userData.coins - coins,
      totalWithdrawn: (userData.totalWithdrawn || 0) + inrAmount,
      tasksUsedForWithdrawal: (userData.tasksUsedForWithdrawal || 0) + requiredTasks,
      updatedAt: Date.now()
    });

    // Create withdrawal document
    const withRef = doc(collection(db, 'withdrawals'));
    withdrawalId = withRef.id;

    // Auto-generate Google Play Redeem code if method is google_play
    const autoRedeemCode = method === 'google_play' ? generateGooglePlayRedeemCode() : undefined;

    // Capture client network info and device ID for withdrawal auditing & anti-fraud
    const netInfo = getCachedClientNetworkInfo();

    const requestData: WithdrawalRequest = {
      id: withdrawalId,
      userId,
      userEmail,
      userName,
      method,
      details,
      coins,
      inrAmount,
      tasksConsumed: requiredTasks,
      status: 'pending',
      ipAddress: netInfo.ip || '127.0.0.1',
      networkType: netInfo.networkType || '4G/Wi-Fi',
      deviceId: netInfo.deviceId,
      ...(autoRedeemCode ? { redeemCode: autoRedeemCode } : {}),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    transaction.set(withRef, requestData);

    // Record Transaction
    const transRef = doc(collection(db, 'transactions'));
    transaction.set(transRef, {
      userId,
      type: 'withdrawal',
      amount: -coins,
      description: `Withdrawal Request: ₹${inrAmount} via ${method === 'google_play' ? 'Google Play Gift Card' : method.toUpperCase()}`,
      timestamp: Date.now()
    });
  });

  return withdrawalId;
}

// Admin: Approve Withdrawal Request
export async function approveWithdrawal(
  withdrawalId: string,
  adminNotes?: string,
  transactionId?: string,
  redeemCode?: string
): Promise<void> {
  const withRef = doc(db, 'withdrawals', withdrawalId);
  const withDoc = await getDoc(withRef);
  if (!withDoc.exists()) throw new Error('Withdrawal request not found');

  await updateDoc(withRef, {
    status: 'approved',
    adminNotes: adminNotes || 'Payment processed successfully',
    transactionId: transactionId || `TXN-${Date.now().toString(36).toUpperCase()}`,
    redeemCode: redeemCode || '',
    updatedAt: Date.now()
  });
}

// Admin: Reject Withdrawal Request (Refund coins)
export async function rejectWithdrawal(
  withdrawalId: string,
  reason: string,
  refundCoins: boolean = true
): Promise<void> {
  const withRef = doc(db, 'withdrawals', withdrawalId);
  const withDoc = await getDoc(withRef);
  if (!withDoc.exists()) throw new Error('Withdrawal request not found');

  const data = withDoc.data() as WithdrawalRequest;
  if (data.status === 'rejected') throw new Error('Request is already rejected');

  await updateDoc(withRef, {
    status: 'rejected',
    adminNotes: reason || 'Request rejected by admin',
    updatedAt: Date.now()
  });

  if (refundCoins && data.userId) {
    const userRef = doc(db, 'users', data.userId);
    const tasksToRefund = data.tasksConsumed || 0;

    await updateDoc(userRef, {
      coins: increment(data.coins),
      totalWithdrawn: increment(-data.inrAmount),
      ...(tasksToRefund > 0 ? { tasksUsedForWithdrawal: increment(-tasksToRefund) } : {})
    });

    await addDoc(collection(db, 'transactions'), {
      userId: data.userId,
      type: 'withdrawal_refund',
      amount: data.coins,
      description: `Refund for rejected withdrawal: ${reason || 'Admin Rejected'}`,
      timestamp: Date.now()
    });
  }
}

// Admin: Delete a single withdrawal request from history
export async function deleteAdminWithdrawal(withdrawalId: string): Promise<void> {
  const withRef = doc(db, 'withdrawals', withdrawalId);
  await deleteDoc(withRef);
}

// Admin: Delete multiple or all withdrawal history records in batches
export async function deleteAllAdminWithdrawals(withdrawalIds?: string[]): Promise<number> {
  let idsToDelete = withdrawalIds;
  if (!idsToDelete || idsToDelete.length === 0) {
    const snap = await getDocs(collection(db, 'withdrawals'));
    idsToDelete = snap.docs.map(d => d.id);
  }
  if (idsToDelete.length === 0) return 0;

  const batchSize = 400;
  let count = 0;
  for (let i = 0; i < idsToDelete.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = idsToDelete.slice(i, i + batchSize);
    chunk.forEach(id => {
      batch.delete(doc(db, 'withdrawals', id));
    });
    await batch.commit();
    count += chunk.length;
  }
  return count;
}

// Admin: Adjust User Coins
export async function adminAdjustUserCoins(
  userId: string,
  amount: number,
  reason: string
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  if (!userDoc.exists()) throw new Error('User not found');

  await updateDoc(userRef, {
    coins: increment(amount),
    totalEarned: amount > 0 ? increment(amount) : increment(0)
  });

  await addDoc(collection(db, 'transactions'), {
    userId,
    type: 'admin_adjustment',
    amount,
    description: `Admin adjustment: ${reason}`,
    timestamp: Date.now()
  });
}

// Admin: Adjust User Referral Count (Add or Deduct/Minus Referrals)
export async function adminAdjustUserReferrals(
  userId: string,
  countDelta: number,
  reason: string = 'Admin referral adjustment'
): Promise<{ success: boolean; newReferralCount: number }> {
  const userRef = doc(db, 'users', userId);
  let currentRefs = 0;

  try {
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const data = userSnap.data() as UserProfile;
      currentRefs = data.referralCount || 0;
    }
  } catch (err) {
    console.warn('Could not read user doc before referral adjustment:', err);
    const cached = getCachedProfile(userId);
    if (cached) currentRefs = cached.referralCount || 0;
  }

  const newRefs = Math.max(0, currentRefs + countDelta);

  try {
    await updateDoc(userRef, {
      referralCount: newRefs,
      updatedAt: Date.now()
    });
  } catch (err) {
    console.warn('Could not update referralCount in Firestore:', err);
  }

  // Update local cached profile
  const cached = getCachedProfile(userId);
  if (cached) {
    cached.referralCount = newRefs;
    setCachedProfile(userId, cached);
  }

  // Update cached leaderboard
  const lb = getCachedLeaderboard();
  if (lb && lb.length > 0) {
    const idx = lb.findIndex((u) => u.uid === userId);
    if (idx >= 0) {
      lb[idx].referralCount = newRefs;
      setCachedLeaderboard(lb);
    }
  }

  // Record audit transaction
  try {
    await addDoc(collection(db, 'transactions'), {
      userId,
      type: 'admin_adjustment',
      amount: 0,
      description: `Admin referral adjustment: ${countDelta > 0 ? `+${countDelta}` : `${countDelta}`} Referral(s) (${reason || 'Updated by admin'})`,
      timestamp: Date.now()
    });
  } catch {
    // Ignore error
  }

  // Dispatch live window event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('coin_balance_updated', {
        detail: {
          userId,
          amount: 0,
          referralCountDelta: countDelta,
          newReferralCount: newRefs
        }
      })
    );
  }

  return { success: true, newReferralCount: newRefs };
}

// Admin: Ban/Unban User
export async function toggleUserBan(userId: string, isBanned: boolean): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    isBanned,
    updatedAt: Date.now()
  });

  const cached = getCachedProfile(userId);
  if (cached) {
    cached.isBanned = isBanned;
    setCachedProfile(userId, cached);
  }

  // Instant cross-tab & local state sync
  window.dispatchEvent(
    new CustomEvent('user_ban_status_updated', {
      detail: { userId, isBanned }
    })
  );
}

// Admin: Reset a single user's coins and referrals to 0
export async function adminResetUserCoinsAndReferrals(userId: string): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    coins: 0,
    totalEarned: 0,
    referralCount: 0,
    updatedAt: Date.now()
  });

  const cached = getCachedProfile(userId);
  if (cached) {
    cached.coins = 0;
    cached.totalEarned = 0;
    cached.referralCount = 0;
    setCachedProfile(userId, cached);
  }

  const lb = getCachedLeaderboard();
  if (lb && lb.length > 0) {
    const idx = lb.findIndex((u) => u.uid === userId);
    if (idx >= 0) {
      lb[idx].coins = 0;
      lb[idx].referralCount = 0;
      setCachedLeaderboard(lb);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('coin_balance_updated', {
        detail: { userId, amount: 0, newReferralCount: 0 }
      })
    );
  }
}

// Admin: Reset / Zero out all coins for all real users (excluding admin)
export async function adminResetAllUserCoinsOnly(): Promise<{ success: boolean; count: number }> {
  try {
    const q = query(collection(db, 'users'));
    const snap = await getDocs(q);
    let count = 0;

    for (const userDoc of snap.docs) {
      const data = userDoc.data() as UserProfile;
      if (data.role !== 'admin') {
        await updateDoc(doc(db, 'users', userDoc.id), {
          coins: 0,
          totalEarned: 0,
          updatedAt: Date.now()
        });

        const cached = getCachedProfile(userDoc.id);
        if (cached) {
          cached.coins = 0;
          cached.totalEarned = 0;
          setCachedProfile(userDoc.id, cached);
        }
        count++;
      }
    }

    // Refresh cached leaderboard coins
    const lb = getCachedLeaderboard();
    if (lb) {
      lb.forEach(u => {
        if (u.role !== 'admin') {
          u.coins = 0;
          u.totalEarned = 0;
        }
      });
      setCachedLeaderboard(lb);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('coin_balance_updated', {
          detail: { userId: 'all', amount: 0 }
        })
      );
    }

    return { success: true, count };
  } catch (err) {
    console.error('Reset all user coins failed:', err);
    throw err;
  }
}

// Admin: Reset / Deduct all coins and referrals for all real users
export async function adminResetAllUsersCoinsAndReferrals(): Promise<{ success: boolean; count: number }> {
  try {
    const q = query(collection(db, 'users'));
    const snap = await getDocs(q);
    let count = 0;

    for (const userDoc of snap.docs) {
      const data = userDoc.data() as UserProfile;
      if (data.role !== 'admin') {
        await updateDoc(doc(db, 'users', userDoc.id), {
          coins: 0,
          totalEarned: 0,
          referralCount: 0,
          updatedAt: Date.now()
        });

        const cached = getCachedProfile(userDoc.id);
        if (cached) {
          cached.coins = 0;
          cached.totalEarned = 0;
          cached.referralCount = 0;
          setCachedProfile(userDoc.id, cached);
        }
        count++;
      }
    }

    setCachedLeaderboard([]);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('coin_balance_updated', {
          detail: { userId: 'all', amount: 0, newReferralCount: 0 }
        })
      );
    }

    return { success: true, count };
  } catch (err) {
    console.error('Reset all users failed:', err);
    throw err;
  }
}

// Admin: Toggle Verified Badge on User (shown on Leaderboard & Profile)
export async function toggleUserVerified(userId: string, isVerified: boolean): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    isVerified,
    updatedAt: Date.now()
  });
}

// Admin: Update User Profile (Name and/or Profile Picture URL and/or Verified Badge)
export async function adminUpdateUserProfile(
  userId: string,
  updates: { displayName?: string; photoURL?: string; isVerified?: boolean }
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const dataToUpdate: Record<string, any> = {
    updatedAt: Date.now()
  };
  if (updates.displayName !== undefined) {
    dataToUpdate.displayName = updates.displayName.trim();
  }
  if (updates.photoURL !== undefined) {
    dataToUpdate.photoURL = updates.photoURL.trim();
  }
  if (updates.isVerified !== undefined) {
    dataToUpdate.isVerified = !!updates.isVerified;
  }
  await updateDoc(userRef, dataToUpdate);
}

// Admin: Set Custom Required Tasks Count for Withdrawal for a specific user
export async function adminSetUserTaskRequirement(userId: string, requiredCount: number): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    requiredTasksForWithdrawal: Math.max(0, requiredCount),
    updatedAt: Date.now()
  });
}

// Admin: Set User Completed Tasks Count manually
export async function adminSetUserCompletedTasks(userId: string, completedCount: number): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    completedTasksCount: Math.max(0, completedCount),
    updatedAt: Date.now()
  });
}

// Admin: Directly Assign or Force-Complete a Task for a User
export async function adminAssignUserTask(
  userId: string,
  userProfile: { displayName?: string; email?: string },
  task: AppTask,
  autoApprove: boolean = false
): Promise<{ success: boolean }> {
  const userTaskId = `${userId}_${task.id}`;
  const status: UserTaskStatus = autoApprove ? 'approved' : 'started';

  const docData: Partial<UserTaskProgress> = {
    id: userTaskId,
    userId,
    userName: userProfile.displayName || 'User',
    userEmail: userProfile.email || 'user@app.com',
    taskId: task.id,
    taskTitle: task.title,
    taskCoins: task.coins,
    taskType: task.type,
    status,
    startedAt: Date.now(),
    ...(autoApprove ? { completedAt: Date.now(), adminNote: 'Assigned & Approved by Admin' } : {})
  };

  try {
    await setDoc(doc(db, 'user_tasks', userTaskId), docData, { merge: true });

    if (autoApprove) {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        completedTasksCount: increment(1),
        coins: increment(task.coins),
        totalEarned: increment(task.coins),
        updatedAt: Date.now()
      });

      await addDoc(collection(db, 'transactions'), {
        userId,
        type: 'task_reward',
        amount: task.coins,
        description: `Admin Assigned Task: ${task.title}`,
        timestamp: Date.now()
      });
    }

    return { success: true };
  } catch (err) {
    console.error('Error assigning user task:', err);
    return { success: false };
  }
}

// Count completed / approved tasks for user
export async function getUserCompletedTasksCount(userId: string): Promise<number> {
  try {
    const q = query(
      collection(db, 'user_tasks'),
      where('userId', '==', userId),
      where('status', 'in', ['approved', 'completed'])
    );
    const snap = await getDocs(q);
    return snap.size;
  } catch (err) {
    console.warn('Error querying user completed tasks count:', err);
    return 0;
  }
}

// No demo users - only real registered players
export const STARTER_LEADERS: UserProfile[] = [];

// Cached Leaderboard Storage (In-memory & localStorage for 0ms instant loading)
let memoryCachedLeaderboard: UserProfile[] = [];

export function getCachedLeaderboard(): UserProfile[] {
  if (memoryCachedLeaderboard && memoryCachedLeaderboard.length > 0) {
    return memoryCachedLeaderboard.filter((u) => !u.uid.startsWith('starter_bot_'));
  }
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('cached_leaderboard');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const realUsers = parsed.filter((u: UserProfile) => u && u.uid && !u.uid.startsWith('starter_bot_'));
          memoryCachedLeaderboard = realUsers;
          return realUsers;
        }
      }
    } catch {
      // Ignore JSON parse errors
    }
  }
  return [];
}

export function setCachedLeaderboard(users: UserProfile[]): void {
  const realOnly = users.filter((u) => u && u.uid && !u.uid.startsWith('starter_bot_'));
  memoryCachedLeaderboard = realOnly;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('cached_leaderboard', JSON.stringify(realOnly.slice(0, 60)));
    } catch {
      // Ignore quota errors
    }
  }
}

// Add Referrals to User (Persists to Firestore, updates cache, and notifies live UI)
export async function addReferralsToUser(
  userId: string,
  count: number,
  bonusCoinsPerReferral: number = 0
): Promise<{ success: boolean; newReferralCount: number; newCoins: number }> {
  const userRef = doc(db, 'users', userId);
  const totalCoinsBonus = count * bonusCoinsPerReferral;

  const updatePayload: Record<string, any> = {
    referralCount: increment(count),
    updatedAt: Date.now()
  };

  if (totalCoinsBonus > 0) {
    updatePayload.coins = increment(totalCoinsBonus);
    updatePayload.totalEarned = increment(totalCoinsBonus);
  }

  try {
    await updateDoc(userRef, updatePayload);
  } catch (err) {
    console.warn('Could not update referralCount in Firestore directly:', err);
  }

  // Update local cached profile
  const cached = getCachedProfile(userId);
  let finalRefs = count;
  let finalCoins = totalCoinsBonus;
  if (cached) {
    cached.referralCount = (cached.referralCount || 0) + count;
    if (totalCoinsBonus > 0) {
      cached.coins = (cached.coins || 0) + totalCoinsBonus;
      cached.totalEarned = (cached.totalEarned || 0) + totalCoinsBonus;
    }
    finalRefs = cached.referralCount;
    finalCoins = cached.coins;
    setCachedProfile(userId, cached);
  }

  // Record referral transaction if coins were awarded
  if (totalCoinsBonus > 0) {
    try {
      await addDoc(collection(db, 'transactions'), {
        userId,
        type: 'referral_bonus',
        amount: totalCoinsBonus,
        description: `Referral Reward: +${count} Friend${count > 1 ? 's' : ''} Invited (+${totalCoinsBonus} Coins)`,
        timestamp: Date.now()
      });
    } catch {
      // ignore
    }
  }

  // Update cached leaderboard
  const lb = getCachedLeaderboard();
  if (lb && lb.length > 0) {
    const idx = lb.findIndex((u) => u.uid === userId);
    if (idx >= 0) {
      lb[idx].referralCount = finalRefs;
      if (totalCoinsBonus > 0) {
        lb[idx].coins = finalCoins;
        lb[idx].totalEarned = (lb[idx].totalEarned || 0) + totalCoinsBonus;
      }
      setCachedLeaderboard(lb);
    }
  }

  // Dispatch live window event for instant zero-latency UI update across all components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('coin_balance_updated', {
        detail: {
          userId,
          amount: totalCoinsBonus,
          referralCountDelta: count,
          newReferralCount: finalRefs
        }
      })
    );
  }

  return { success: true, newReferralCount: finalRefs, newCoins: finalCoins };
}

// Reset User Referrals (for testing / restart)
export async function resetUserReferrals(userId: string): Promise<void> {
  const userRef = doc(db, 'users', userId);
  try {
    await updateDoc(userRef, {
      referralCount: 0,
      updatedAt: Date.now()
    });
  } catch (err) {
    console.warn('Could not reset referralCount in Firestore:', err);
  }

  const cached = getCachedProfile(userId);
  if (cached) {
    cached.referralCount = 0;
    setCachedProfile(userId, cached);
  }

  const lb = getCachedLeaderboard();
  if (lb && lb.length > 0) {
    const idx = lb.findIndex((u) => u.uid === userId);
    if (idx >= 0) {
      lb[idx].referralCount = 0;
      setCachedLeaderboard(lb);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('coin_balance_updated', {
        detail: {
          userId,
          amount: 0,
          newReferralCount: 0
        }
      })
    );
  }
}

export const DEMO_LEADERBOARD_USERS: UserProfile[] = ALL_DEMO_USERS;

// Helper to consolidate unique real users
function consolidateLeaderboardUsers(liveUsers: UserProfile[]): UserProfile[] {
  const seenUids = new Set<string>();
  const consolidated: UserProfile[] = [];

  for (const u of liveUsers) {
    if (u && u.uid && !seenUids.has(u.uid) && !u.isBanned && !u.uid.startsWith('starter_bot_')) {
      seenUids.add(u.uid);
      consolidated.push(u);
    }
  }

  // Merge locally cached real users
  const localUsers = getAllLocallyCachedUsers();
  for (const lu of localUsers) {
    if (lu && lu.uid && !seenUids.has(lu.uid) && !lu.isBanned && !lu.uid.startsWith('starter_bot_')) {
      seenUids.add(lu.uid);
      consolidated.push(lu);
    }
  }

  // Merge DEMO_LEADERBOARD_USERS so they appear on leaderboard
  for (const du of DEMO_LEADERBOARD_USERS) {
    if (du && du.uid && !seenUids.has(du.uid)) {
      seenUids.add(du.uid);
      consolidated.push(du);
    }
  }

  return consolidated;
}

// Real-Time Subscribe Leaderboard (Live Firestore users with 0ms Instant Cache Hydration & Fast Query)
export function subscribeLeaderboard(
  callback: (users: UserProfile[]) => void,
  maxUsers: number = 100
): () => void {
  // 1. Immediately provide cached leaderboard if available (0ms zero wait time)
  const cached = getCachedLeaderboard();
  if (cached && cached.length > 0) {
    callback(cached.slice(0, maxUsers));
  }

  let isUnsubscribed = false;

  // 2. Parallel ultra-fast one-shot fetch
  fetchLeaderboard(maxUsers)
    .then((freshUsers) => {
      if (!isUnsubscribed && freshUsers && freshUsers.length > 0) {
        callback(freshUsers);
      }
    })
    .catch((err) => {
      console.warn('Fast parallel leaderboard fetch error:', err);
    });

  // Track combined users from coin queries & referral queries
  const liveUsersMap = new Map<string, UserProfile>();

  const updateAndNotify = () => {
    if (isUnsubscribed) return;
    const allUsers = consolidateLeaderboardUsers(Array.from(liveUsersMap.values()));
    if (allUsers.length > 0) {
      setCachedLeaderboard(allUsers);
      callback(allUsers.slice(0, maxUsers));
    }
  };

  let unsubscribeCoinSnap: () => void = () => {};
  let unsubscribeRefSnap: () => void = () => {};

  try {
    // 3A. Real-Time Top Coins listener
    const qCoins = query(
      collection(db, 'users'),
      orderBy('coins', 'desc'),
      limit(maxUsers)
    );

    unsubscribeCoinSnap = onSnapshot(
      qCoins,
      (snap) => {
        snap.forEach((d) => {
          const data = d.data() as UserProfile;
          if (!data.isBanned) {
            const uid = data.uid || d.id;
            liveUsersMap.set(uid, { ...data, uid });
          }
        });
        updateAndNotify();
      },
      (err) => {
        console.warn('Coin leaderboard listener notice, fallback:', err);
        try {
          const qFallback = query(collection(db, 'users'), limit(maxUsers));
          unsubscribeCoinSnap = onSnapshot(qFallback, (snapFallback) => {
            snapFallback.forEach((d) => {
              const data = d.data() as UserProfile;
              if (!data.isBanned) {
                const uid = data.uid || d.id;
                liveUsersMap.set(uid, { ...data, uid });
              }
            });
            updateAndNotify();
          }, () => {});
        } catch {}
      }
    );

    // 3B. Real-Time Top Referrers listener (Tracks referral increments live)
    try {
      const qRef = query(
        collection(db, 'users'),
        where('referralCount', '>', 0),
        limit(maxUsers)
      );

      unsubscribeRefSnap = onSnapshot(
        qRef,
        (snapRef) => {
          snapRef.forEach((d) => {
            const data = d.data() as UserProfile;
            if (!data.isBanned) {
              const uid = data.uid || d.id;
              liveUsersMap.set(uid, { ...data, uid });
            }
          });
          updateAndNotify();
        },
        (refErr) => {
          console.warn('Referral leaderboard listener notice:', refErr);
        }
      );
    } catch (refErr) {
      console.warn('Could not establish referral listener:', refErr);
    }
  } catch (err) {
    console.warn('Could not establish initial leaderboard listener:', err);
  }

  return () => {
    isUnsubscribed = true;
    if (unsubscribeCoinSnap) unsubscribeCoinSnap();
    if (unsubscribeRefSnap) unsubscribeRefSnap();
  };
}

// Fetch Leaderboard (Fast indexed query with local merge)
export async function fetchLeaderboard(maxUsers: number = 100): Promise<UserProfile[]> {
  const usersMap = new Map<string, UserProfile>();

  try {
    // 1. Fetch top coin earners
    let snap;
    try {
      const q = query(
        collection(db, 'users'),
        orderBy('coins', 'desc'),
        limit(maxUsers)
      );
      snap = await getDocs(q);
    } catch (indexErr) {
      console.warn('Indexed leaderboard query fallback:', indexErr);
      const qFallback = query(collection(db, 'users'), limit(maxUsers));
      snap = await getDocs(qFallback);
    }

    if (snap && !snap.empty) {
      snap.forEach((d) => {
        const data = d.data() as UserProfile;
        if (!data.isBanned) {
          const uid = data.uid || d.id;
          usersMap.set(uid, { ...data, uid });
        }
      });
    }

    // 2. Fetch top referrers
    try {
      const qRef = query(
        collection(db, 'users'),
        where('referralCount', '>', 0),
        limit(maxUsers)
      );
      const snapRef = await getDocs(qRef);
      if (snapRef && !snapRef.empty) {
        snapRef.forEach((d) => {
          const data = d.data() as UserProfile;
          if (!data.isBanned) {
            const uid = data.uid || d.id;
            usersMap.set(uid, { ...data, uid });
          }
        });
      }
    } catch (refErr) {
      console.warn('Could not query referrers:', refErr);
    }
  } catch (err) {
    console.warn('Could not fetch live leaderboard:', err);
  }

  const consolidated = consolidateLeaderboardUsers(Array.from(usersMap.values()));
  if (consolidated.length > 0) {
    setCachedLeaderboard(consolidated);
  }

  return consolidated.slice(0, maxUsers);
}

// Subscribe to Top 1 Reward State in Real-Time
export function subscribeLeaderboardTopReward(
  callback: (state: LeaderboardRewardState | null) => void
): () => void {
  try {
    const docRef = doc(db, 'settings', 'leaderboard_top_reward');
    return onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          callback(snap.data() as LeaderboardRewardState);
        } else {
          callback(null);
        }
      },
      (err) => {
        console.warn('Leaderboard top reward listener error:', err);
      }
    );
  } catch (err) {
    console.warn('Could not listen to top reward state:', err);
    return () => {};
  }
}

// 24-Hour Top 1 Reward Engine: Gives +100 Coins every 24 hours to the player holding Rank #1
export async function checkAndProcessLeaderboardTopReward(
  currentTopUser?: UserProfile | null
): Promise<{ state: LeaderboardRewardState | null; rewardGiven: boolean; message?: string }> {
  try {
    let topUser = currentTopUser;

    // If topUser not passed, fetch top user from DB
    if (!topUser) {
      const leaders = await fetchLeaderboard(1);
      if (leaders.length > 0) {
        topUser = leaders[0];
      }
    }

    if (!topUser || !topUser.uid) {
      return { state: null, rewardGiven: false };
    }

    const stateRef = doc(db, 'settings', 'leaderboard_top_reward');
    const stateSnap = await getDoc(stateRef);
    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000; // 24 hours in ms
    const topScore = Math.max(topUser.coins || 0, topUser.totalEarned || 0);

    if (!stateSnap.exists()) {
      // First time initialization
      const newState: LeaderboardRewardState = {
        currentTopUid: topUser.uid,
        currentTopName: topUser.displayName || 'Top Champion',
        currentTopScore: topScore,
        topSince: now,
        lastRewardGivenAt: now,
        totalRewardsAwardedCount: 0,
        lastPayoutAmount: 100
      };
      await setDoc(stateRef, newState);
      return { state: newState, rewardGiven: false };
    }

    const existingState = stateSnap.data() as LeaderboardRewardState;

    // Case 1: Another user took the #1 Spot! Reset the 24h timer for this new champion
    if (existingState.currentTopUid !== topUser.uid) {
      const updatedState: LeaderboardRewardState = {
        currentTopUid: topUser.uid,
        currentTopName: topUser.displayName || 'Top Champion',
        currentTopScore: topScore,
        topSince: now,
        lastRewardGivenAt: now,
        totalRewardsAwardedCount: existingState.totalRewardsAwardedCount || 0,
        lastPayoutAmount: 100
      };
      await updateDoc(stateRef, updatedState as any);
      return {
        state: updatedState,
        rewardGiven: false,
        message: `🏆 New Top #1 Champion: ${topUser.displayName || 'Player'}! 24-Hour Timer Started.`
      };
    }

    // Case 2: Same user is still holding Rank #1!
    // Check if 24 hours have passed since lastRewardGivenAt
    const lastGiven = existingState.lastRewardGivenAt || existingState.topSince || now;
    const timeElapsed = now - lastGiven;

    if (timeElapsed >= TWENTY_FOUR_HOURS) {
      // 24 Hours Completed! Give +100 Coins reward!
      const userRef = doc(db, 'users', topUser.uid);
      await updateDoc(userRef, {
        coins: increment(100),
        totalEarned: increment(100),
        updatedAt: now
      });

      // Add Ledger Transaction
      await addDoc(collection(db, 'transactions'), {
        userId: topUser.uid,
        type: 'leaderboard_top_reward',
        amount: 100,
        description: `👑 Rank #1 Leaderboard 24h Reward: +100 Coins Credited! (Holding #1 Rank)`,
        timestamp: now
      });

      // Update cached profile if it's the current local user
      const cached = getCachedProfile(topUser.uid);
      if (cached) {
        cached.coins = (cached.coins || 0) + 100;
        cached.totalEarned = (cached.totalEarned || 0) + 100;
        setCachedProfile(topUser.uid, cached);
      }

      const updatedState: LeaderboardRewardState = {
        ...existingState,
        currentTopName: topUser.displayName || existingState.currentTopName,
        currentTopScore: topScore + 100,
        lastRewardGivenAt: now,
        totalRewardsAwardedCount: (existingState.totalRewardsAwardedCount || 0) + 1,
        lastPayoutAmount: 100
      };

      await updateDoc(stateRef, updatedState as any);

      return {
        state: updatedState,
        rewardGiven: true,
        message: `🎉 Rank #1 24-Hour Holding Reward: +100 Coins credited to ${topUser.displayName}!`
      };
    }

    // Update score/name in state if changed
    if (existingState.currentTopScore !== topScore || existingState.currentTopName !== topUser.displayName) {
      const updatedState: LeaderboardRewardState = {
        ...existingState,
        currentTopName: topUser.displayName || existingState.currentTopName,
        currentTopScore: topScore
      };
      await updateDoc(stateRef, updatedState as any);
      return { state: updatedState, rewardGiven: false };
    }

    return { state: existingState, rewardGiven: false };
  } catch (err) {
    console.warn('Leaderboard top reward processing error:', err);
    return { state: null, rewardGiven: false };
  }
}

// Fetch User Transactions
export async function fetchUserTransactions(userId: string, maxItems: number = 30): Promise<CoinTransaction[]> {
  try {
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(maxItems)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<CoinTransaction, 'id'>) }));
  } catch (err) {
    try {
      // Fallback if composite index not ready
      const fallbackQ = query(collection(db, 'transactions'), where('userId', '==', userId), limit(maxItems));
      const snap = await getDocs(fallbackQ);
      const results = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<CoinTransaction, 'id'>) }));
      return results.sort((a, b) => b.timestamp - a.timestamp);
    } catch {
      return [];
    }
  }
}

// Fetch User Withdrawals
export async function fetchUserWithdrawals(userId: string): Promise<WithdrawalRequest[]> {
  try {
    const q = query(collection(db, 'withdrawals'), where('userId', '==', userId), limit(50));
    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<WithdrawalRequest, 'id'>) }));
    return list.sort((a, b) => b.createdAt - a.createdAt);
  } catch (err) {
    console.warn('Could not fetch withdrawals:', err);
    return [];
  }
}

// ----------------------------------------------------
// TASK MANAGEMENT & COMPLETION SERVICES
// ----------------------------------------------------

export const DEFAULT_INITIAL_TASKS: AppTask[] = [];

// Helper to strip undefined values so Firestore does not reject payload
function sanitizePayload<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  });
  return result;
}

// Local cache helper for tasks
function getCachedTasks(): AppTask[] {
  try {
    const raw = localStorage.getItem('app_admin_tasks_list');
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore
  }
  return [];
}

function setCachedTasks(tasks: AppTask[]): void {
  try {
    localStorage.setItem('app_admin_tasks_list', JSON.stringify(tasks));
  } catch {
    // Ignore
  }
}

// Fetch all active tasks for users (or all tasks for admin)
export async function fetchTasks(includeInactive = false): Promise<AppTask[]> {
  try {
    const tasksColl = collection(db, 'tasks');
    const snap = await getDocs(tasksColl);
    if (!snap.empty) {
      const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<AppTask, 'id'>) }));
      setCachedTasks(list);
      const filtered = includeInactive ? list : list.filter(t => t.active !== false);
      filtered.sort((a, b) => (a.order || 99) - (b.order || 99) || (b.createdAt || 0) - (a.createdAt || 0));
      return filtered;
    }
  } catch (err) {
    console.warn('Could not fetch tasks from Firestore, falling back to cache:', err);
  }

  // Fallback to locally cached tasks
  const cached = getCachedTasks();
  const filtered = includeInactive ? cached : cached.filter(t => t.active !== false);
  filtered.sort((a, b) => (a.order || 99) - (b.order || 99) || (b.createdAt || 0) - (a.createdAt || 0));
  return filtered;
}

// Real-time listener for tasks
export function subscribeToTasks(
  callback: (tasks: AppTask[]) => void,
  includeInactive = false
): () => void {
  try {
    const tasksColl = collection(db, 'tasks');
    const unsubscribe = onSnapshot(
      tasksColl,
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<AppTask, 'id'>) }));
          setCachedTasks(list);
          const filtered = includeInactive ? list : list.filter(t => t.active !== false);
          filtered.sort((a, b) => (a.order || 99) - (b.order || 99) || (b.createdAt || 0) - (a.createdAt || 0));
          callback(filtered);
        } else {
          const cached = getCachedTasks();
          const filtered = includeInactive ? cached : cached.filter(t => t.active !== false);
          filtered.sort((a, b) => (a.order || 99) - (b.order || 99) || (b.createdAt || 0) - (a.createdAt || 0));
          callback(filtered);
        }
      },
      (err) => {
        console.warn('Tasks subscription error, using cached fallback:', err);
        const cached = getCachedTasks();
        const filtered = includeInactive ? cached : cached.filter(t => t.active !== false);
        callback(filtered);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Could not setup subscribeToTasks:', err);
    const cached = getCachedTasks();
    const filtered = includeInactive ? cached : cached.filter(t => t.active !== false);
    callback(filtered);
    return () => {};
  }
}

// Helper to retrieve all locally cached user profiles from localStorage
export function getAllLocallyCachedUsers(): UserProfile[] {
  const users: UserProfile[] = [];
  const seenUids = new Set<string>();

  if (typeof window === 'undefined') return [];

  try {
    // 1. Scan localStorage keys for `coin_user_`
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('coin_user_')) {
        try {
          const val = localStorage.getItem(key);
          if (val) {
            const parsed = JSON.parse(val) as UserProfile;
            const uid = parsed?.uid || key.replace('coin_user_', '');
            if (parsed && uid && !seenUids.has(uid)) {
              seenUids.add(uid);
              users.push({ ...parsed, uid });
            }
          }
        } catch {
          // ignore error
        }
      }
    }

    // 2. Also check cached_leaderboard
    const lb = getCachedLeaderboard();
    if (lb && Array.isArray(lb)) {
      for (const u of lb) {
        if (u && u.uid && !seenUids.has(u.uid)) {
          seenUids.add(u.uid);
          users.push(u);
        }
      }
    }
  } catch (err) {
    console.warn('Error reading locally cached users:', err);
  }

  return users;
}

// Fetch all users for Admin Panel (combining Firestore and local storage cache)
export async function fetchAdminUsers(): Promise<UserProfile[]> {
  const localUsers = getAllLocallyCachedUsers();
  const list: UserProfile[] = [];
  const seenUids = new Set<string>();

  try {
    const userQ = query(collection(db, 'users'), limit(500));
    const snap = await getDocs(userQ);

    if (!snap.empty) {
      snap.docs.forEach((d) => {
        const data = d.data() as UserProfile;
        const uid = data.uid || d.id;
        seenUids.add(uid);
        list.push({ ...data, uid });
      });
    }
  } catch (err) {
    console.warn('Firestore fetchAdminUsers error, falling back to local list:', err);
  }

  // Merge any locally stored users
  for (const lu of localUsers) {
    if (lu.uid && !seenUids.has(lu.uid)) {
      seenUids.add(lu.uid);
      list.push(lu);
    }
  }

  list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return list;
}

// Real-time listener for all registered users (for Admin Panel)
export function subscribeToUsers(
  callback: (users: UserProfile[]) => void
): () => void {
  // 1. Immediately provide cached/local users so admin sees data without delay
  const localUsers = getAllLocallyCachedUsers();
  if (localUsers.length > 0) {
    callback(localUsers);
  }

  try {
    const usersColl = collection(db, 'users');
    const unsubscribe = onSnapshot(
      usersColl,
      (snap) => {
        const list: UserProfile[] = [];
        const seenUids = new Set<string>();

        if (!snap.empty) {
          snap.docs.forEach((d) => {
            const data = d.data() as UserProfile;
            const uid = data.uid || d.id;
            seenUids.add(uid);
            list.push({ ...data, uid });
          });
        }

        // Merge any local accounts
        const currentLocals = getAllLocallyCachedUsers();
        for (const lu of currentLocals) {
          if (lu.uid && !seenUids.has(lu.uid)) {
            seenUids.add(lu.uid);
            list.push(lu);
          }
        }

        // Merge DEMO_LEADERBOARD_USERS so admin sees full user roster including all demo users
        for (const du of DEMO_LEADERBOARD_USERS) {
          if (du && du.uid && !seenUids.has(du.uid)) {
            seenUids.add(du.uid);
            list.push(du);
          }
        }

        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        callback(list);
      },
      (err) => {
        console.warn('Users subscription error:', err);
        const fallback = getAllLocallyCachedUsers();
        if (fallback.length > 0) {
          callback(fallback);
        }
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Could not setup subscribeToUsers:', err);
    const fallback = getAllLocallyCachedUsers();
    if (fallback.length > 0) {
      callback(fallback);
    }
    return () => {};
  }
}

// Real-time listener for withdrawal requests (for Admin Panel)
export function subscribeToWithdrawals(
  callback: (withdrawals: WithdrawalRequest[]) => void
): () => void {
  try {
    const withColl = collection(db, 'withdrawals');
    const unsubscribe = onSnapshot(
      withColl,
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<WithdrawalRequest, 'id'>) }));
          list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          callback(list);
        } else {
          callback([]);
        }
      },
      (err) => {
        console.warn('Withdrawals subscription error:', err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Could not setup subscribeToWithdrawals:', err);
    return () => {};
  }
}

// Real-time listener for task proofs / submissions (for Admin Panel)
export function subscribeToAdminSubmissions(
  callback: (subs: UserTaskProgress[]) => void
): () => void {
  try {
    const userTasksColl = collection(db, 'user_tasks');
    const unsubscribe = onSnapshot(
      userTasksColl,
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map(d => ({ ...(d.data() as UserTaskProgress), id: d.id }));
          list.sort((a, b) => (b.submittedAt || b.completedAt || 0) - (a.submittedAt || a.completedAt || 0));
          callback(list);
        } else {
          callback([]);
        }
      },
      (err) => {
        console.warn('User tasks subscription error:', err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Could not setup subscribeToAdminSubmissions:', err);
    return () => {};
  }
}

// Admin: Create Task
export async function createAdminTask(taskData: Omit<AppTask, 'id' | 'createdAt'>): Promise<AppTask> {
  const cleaned = sanitizePayload(taskData);
  const newTaskData: Omit<AppTask, 'id'> = {
    title: cleaned.title || 'New Task',
    type: cleaned.type || 'install',
    coins: Number(cleaned.coins) || 100,
    tags: Array.isArray(cleaned.tags) ? cleaned.tags : ['Install', 'Register'],
    actionUrl: cleaned.actionUrl || '',
    logoUrl: cleaned.logoUrl || '',
    description: cleaned.description || '',
    instructions: cleaned.instructions || '',
    logoBg: cleaned.logoBg || 'bg-[#831843]',
    logoText: cleaned.logoText || 'APP',
    active: cleaned.active !== undefined ? cleaned.active : true,
    createdAt: Date.now(),
    ...(cleaned.durationMinutes ? { durationMinutes: Number(cleaned.durationMinutes) } : {}),
    ...(cleaned.targetLevel ? { targetLevel: Number(cleaned.targetLevel) } : {}),
    ...(cleaned.daysCount ? { daysCount: Number(cleaned.daysCount) } : {}),
    ...(Array.isArray(cleaned.milestones) ? { milestones: cleaned.milestones } : {})
  };

  let createdId = `task_${Date.now()}`;
  try {
    const docRef = await addDoc(collection(db, 'tasks'), sanitizePayload(newTaskData));
    createdId = docRef.id;
  } catch (err) {
    console.error('Error creating task in Firestore with addDoc, fallback to setDoc:', err);
    try {
      await setDoc(doc(db, 'tasks', createdId), sanitizePayload(newTaskData));
    } catch (innerErr) {
      console.error('Error creating task in Firestore with setDoc:', innerErr);
    }
  }

  const createdTask: AppTask = { id: createdId, ...newTaskData };

  // Update local cache
  const cached = getCachedTasks();
  const updated = [createdTask, ...cached.filter(t => t.id !== createdId)];
  setCachedTasks(updated);

  return createdTask;
}

// Admin: Update Task
export async function updateAdminTask(taskId: string, updates: Partial<AppTask>): Promise<void> {
  const cleaned = sanitizePayload(updates);
  try {
    const docRef = doc(db, 'tasks', taskId);
    await updateDoc(docRef, cleaned);
  } catch (err) {
    console.warn('Error updating task in Firestore, updating local cache:', err);
  }

  const cached = getCachedTasks();
  const updated = cached.map(t => (t.id === taskId ? { ...t, ...cleaned } : t));
  setCachedTasks(updated);
}

// Admin: Delete Task
export async function deleteAdminTask(taskId: string): Promise<void> {
  try {
    const docRef = doc(db, 'tasks', taskId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Error deleting task in Firestore, removing from cache:', err);
  }

  const cached = getCachedTasks();
  const updated = cached.filter(t => t.id !== taskId);
  setCachedTasks(updated);
}

// Helper to check if a task is completed/approved
export function isTaskCompleted(progress?: UserTaskProgress | null): boolean {
  if (!progress) return false;
  if (progress.status === 'approved' || progress.status === 'completed') return true;
  if (
    progress.totalSteps &&
    progress.completedStepCount !== undefined &&
    progress.completedStepCount >= progress.totalSteps
  ) {
    return true;
  }
  return false;
}

// Fetch user progress for tasks
export async function fetchUserTaskProgress(userId: string): Promise<Record<string, UserTaskProgress>> {
  const progressMap: Record<string, UserTaskProgress> = {};
  try {
    const q = query(collection(db, 'user_tasks'), where('userId', '==', userId));
    const snap = await getDocs(q);
    snap.docs.forEach(docSnap => {
      const data = docSnap.data();
      if (data.taskId) {
        progressMap[data.taskId] = {
          id: docSnap.id,
          userId: data.userId || userId,
          userName: data.userName,
          userEmail: data.userEmail,
          taskId: data.taskId,
          status: data.status || 'not_started',
          currentStepIndex: data.currentStepIndex !== undefined ? data.currentStepIndex : 0,
          currentStepTitle: data.currentStepTitle,
          currentStepCoins: data.currentStepCoins,
          completedStepCount: data.completedStepCount !== undefined ? data.completedStepCount : (data.status === 'approved' ? (data.totalSteps || 1) : 0),
          totalSteps: data.totalSteps || 1,
          stepProofs: data.stepProofs || [],
          startedAt: data.startedAt || Date.now(),
          submittedAt: data.submittedAt,
          completedAt: data.completedAt,
          proofText: data.proofText,
          proofScreenshot: data.proofScreenshot,
          adminNote: data.adminNote,
          reviewedAt: data.reviewedAt,
          taskTitle: data.taskTitle,
          taskCoins: data.taskCoins,
          taskType: data.taskType
        };
      }
    });
  } catch (err) {
    // Check localStorage cache as fallback
    try {
      const localData = localStorage.getItem(`tasks_progress_${userId}`);
      if (localData) {
        const raw = JSON.parse(localData);
        Object.keys(raw).forEach(taskId => {
          const item = raw[taskId];
          if (typeof item === 'string') {
            progressMap[taskId] = {
              id: `${userId}_${taskId}`,
              userId,
              taskId,
              status: item as UserTaskStatus,
              startedAt: Date.now()
            };
          } else {
            progressMap[taskId] = item;
          }
        });
      }
    } catch {
      // Ignore
    }
  }
  return progressMap;
}

// Real-time listener for user tasks progress
export function subscribeToUserTaskProgress(
  userId: string,
  callback: (progress: Record<string, UserTaskProgress>) => void
): () => void {
  // 1. Immediately emit locally cached data if available
  try {
    const localData = localStorage.getItem(`tasks_progress_${userId}`);
    if (localData) {
      const raw = JSON.parse(localData);
      const cachedMap: Record<string, UserTaskProgress> = {};
      Object.keys(raw).forEach(taskId => {
        const item = raw[taskId];
        if (typeof item === 'string') {
          cachedMap[taskId] = {
            id: `${userId}_${taskId}`,
            userId,
            taskId,
            status: item as UserTaskStatus,
            startedAt: Date.now()
          };
        } else {
          cachedMap[taskId] = item;
        }
      });
      callback(cachedMap);
    }
  } catch {
    // Ignore
  }

  // 2. Real-time Firestore onSnapshot listener
  try {
    const q = query(collection(db, 'user_tasks'), where('userId', '==', userId));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const progressMap: Record<string, UserTaskProgress> = {};
        snap.docs.forEach(docSnap => {
          const data = docSnap.data();
          if (data.taskId) {
            progressMap[data.taskId] = {
              id: docSnap.id,
              userId: data.userId || userId,
              userName: data.userName,
              userEmail: data.userEmail,
              taskId: data.taskId,
              status: data.status || 'not_started',
              currentStepIndex: data.currentStepIndex !== undefined ? data.currentStepIndex : 0,
              currentStepTitle: data.currentStepTitle,
              currentStepCoins: data.currentStepCoins,
              completedStepCount: data.completedStepCount !== undefined ? data.completedStepCount : (data.status === 'approved' ? (data.totalSteps || 1) : 0),
              totalSteps: data.totalSteps || 1,
              stepProofs: data.stepProofs || [],
              startedAt: data.startedAt || Date.now(),
              submittedAt: data.submittedAt,
              completedAt: data.completedAt,
              proofText: data.proofText,
              proofScreenshot: data.proofScreenshot,
              adminNote: data.adminNote,
              reviewedAt: data.reviewedAt,
              taskTitle: data.taskTitle,
              taskCoins: data.taskCoins,
              taskType: data.taskType
            };
          }
        });

        // Merge with local storage in case of any un-synced offline items
        try {
          const localData = localStorage.getItem(`tasks_progress_${userId}`);
          if (localData) {
            const raw = JSON.parse(localData);
            Object.keys(raw).forEach(taskId => {
              if (!progressMap[taskId]) {
                const item = raw[taskId];
                if (typeof item === 'string') {
                  progressMap[taskId] = {
                    id: `${userId}_${taskId}`,
                    userId,
                    taskId,
                    status: item as UserTaskStatus,
                    startedAt: Date.now()
                  };
                } else {
                  progressMap[taskId] = item;
                }
              }
            });
          }
          localStorage.setItem(`tasks_progress_${userId}`, JSON.stringify(progressMap));
        } catch {
          // Ignore
        }

        callback(progressMap);
      },
      (err) => {
        console.warn('subscribeToUserTaskProgress listener error:', err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Could not setup subscribeToUserTaskProgress:', err);
    return () => {};
  }
}

// Start a Task (mark as started / in progress)
export async function startUserTask(
  userId: string,
  task: AppTask,
  stepInfo?: { currentStepIndex?: number; totalSteps?: number; currentStepTitle?: string; currentStepCoins?: number }
): Promise<void> {
  const userTaskId = `${userId}_${task.id}`;
  const currentUser = auth.currentUser;
  const cached = getCachedProfile(userId);
  const email = currentUser?.email || cached?.email || '';
  const displayName = currentUser?.displayName || cached?.displayName || 'User';

  const updateData: Partial<UserTaskProgress> = {
    userId,
    userName: displayName,
    userEmail: email,
    taskId: task.id,
    taskTitle: task.title,
    taskCoins: task.coins,
    taskType: task.type,
    status: 'started',
    startedAt: Date.now(),
    ...(stepInfo?.currentStepIndex !== undefined ? { currentStepIndex: stepInfo.currentStepIndex } : {}),
    ...(stepInfo?.totalSteps !== undefined ? { totalSteps: stepInfo.totalSteps } : {}),
    ...(stepInfo?.currentStepTitle ? { currentStepTitle: stepInfo.currentStepTitle } : {}),
    ...(stepInfo?.currentStepCoins ? { currentStepCoins: stepInfo.currentStepCoins } : {})
  };

  try {
    await setDoc(doc(db, 'user_tasks', userTaskId), updateData, { merge: true });
  } catch (err) {
    console.warn('Saving task start locally:', err);
  }

  // Cache in localStorage
  try {
    const localData = localStorage.getItem(`tasks_progress_${userId}`) || '{}';
    const parsed = JSON.parse(localData);
    parsed[task.id] = {
      ...(parsed[task.id] || {}),
      id: userTaskId,
      ...updateData
    };
    localStorage.setItem(`tasks_progress_${userId}`, JSON.stringify(parsed));
  } catch {
    // Ignore
  }
}

// User submits task for admin review (supports step/milestone tracking and authentic email capture)
export async function submitTaskForReview(
  userId: string,
  arg2: { displayName?: string; email?: string } | AppTask,
  arg3?: AppTask | string,
  arg4?: string,
  arg5?: string,
  stepInfo?: {
    stepIndex: number;
    title: string;
    coins: number;
    totalSteps: number;
  }
): Promise<{ success: boolean }> {
  let userProfile: { displayName?: string; email?: string } = {};
  let task: AppTask;
  let proofText: string = '';
  let proofScreenshot: string = '';

  if (arg3 && typeof arg3 === 'object' && 'id' in arg3) {
    // Called as (userId, profile, task, proofText, proofScreenshot, stepInfo)
    userProfile = (arg2 as { displayName?: string; email?: string }) || {};
    task = arg3 as AppTask;
    proofText = arg4 || '';
    proofScreenshot = arg5 || '';
  } else {
    // Called as (userId, task, proofText, proofScreenshot, stepInfo)
    task = arg2 as AppTask;
    proofText = (arg3 as string) || '';
    proofScreenshot = arg4 || '';
    const cached = getCachedProfile(userId);
    if (cached) {
      userProfile = { displayName: cached.displayName, email: cached.email };
    }
  }

  // Ensure authentic email is used
  const currentUser = auth.currentUser;
  const verifiedEmail = currentUser?.email || userProfile.email || getCachedProfile(userId)?.email || 'user@app.com';
  const verifiedName = currentUser?.displayName || userProfile.displayName || getCachedProfile(userId)?.displayName || 'User';

  const userTaskId = `${userId}_${task.id}`;

  const currentStep = stepInfo?.stepIndex !== undefined ? stepInfo.stepIndex : 0;
  const totalSteps = stepInfo?.totalSteps || 1;
  const currentTitle = stepInfo?.title || task.title;
  const currentCoins = stepInfo?.coins || task.coins;

  const newStepProof = {
    stepIndex: currentStep,
    title: currentTitle,
    coins: currentCoins,
    status: 'pending' as const,
    proofText: proofText || '',
    proofScreenshot: proofScreenshot || '',
    submittedAt: Date.now()
  };

  const taskSubmission: Partial<UserTaskProgress> = {
    id: userTaskId,
    userId,
    userName: verifiedName,
    userEmail: verifiedEmail,
    taskId: task.id,
    taskTitle: task.title,
    taskCoins: task.coins,
    taskType: task.type,
    status: 'pending_approval',
    currentStepIndex: currentStep,
    currentStepTitle: currentTitle,
    currentStepCoins: currentCoins,
    totalSteps: totalSteps,
    submittedAt: Date.now(),
    proofText: proofText || '',
    proofScreenshot: proofScreenshot || ''
  };

  try {
    const docRef = doc(db, 'user_tasks', userTaskId);
    const existingSnap = await getDoc(docRef);
    let existingProofs = [];
    if (existingSnap.exists()) {
      existingProofs = existingSnap.data().stepProofs || [];
    }
    // Replace or append step proof
    const filteredProofs = existingProofs.filter((p: { stepIndex: number }) => p.stepIndex !== currentStep);
    filteredProofs.push(newStepProof);

    taskSubmission.stepProofs = filteredProofs;

    await setDoc(docRef, taskSubmission, { merge: true });

    // Cache in localStorage
    try {
      const localData = localStorage.getItem(`tasks_progress_${userId}`) || '{}';
      const parsed = JSON.parse(localData);
      parsed[task.id] = {
        ...parsed[task.id],
        ...taskSubmission
      };
      localStorage.setItem(`tasks_progress_${userId}`, JSON.stringify(parsed));
    } catch {
      // Ignore
    }

    return { success: true };
  } catch (err) {
    console.error('Error submitting task for review:', err);
    // Local fallback
    try {
      const localData = localStorage.getItem(`tasks_progress_${userId}`) || '{}';
      const parsed = JSON.parse(localData);
      parsed[task.id] = {
        ...parsed[task.id],
        ...taskSubmission
      };
      localStorage.setItem(`tasks_progress_${userId}`, JSON.stringify(parsed));
    } catch {
      // Ignore
    }
    return { success: true };
  }
}

// Fetch all task submissions for Admin with verified user email lookup
export async function fetchAdminTaskSubmissions(statusFilter?: UserTaskStatus | 'all'): Promise<UserTaskProgress[]> {
  try {
    let q;
    if (statusFilter && statusFilter !== 'all') {
      q = query(collection(db, 'user_tasks'), where('status', '==', statusFilter), limit(100));
    } else {
      q = query(collection(db, 'user_tasks'), limit(150));
    }
    const snap = await getDocs(q);
    const list: UserTaskProgress[] = snap.docs.map(d => ({
      id: d.id,
      ...(d.data() as Omit<UserTaskProgress, 'id'>)
    }));

    // Cache / lookup emails for submissions where email might be missing
    const userIdsToLookup = new Set<string>();
    list.forEach(item => {
      if (!item.userEmail || item.userEmail === 'user@app.com') {
        userIdsToLookup.add(item.userId);
      }
    });

    if (userIdsToLookup.size > 0) {
      try {
        const userDocs = await Promise.all(
          Array.from(userIdsToLookup).map(uid => getDoc(doc(db, 'users', uid)))
        );
        const userMap = new Map<string, { email?: string; displayName?: string }>();
        userDocs.forEach(ud => {
          if (ud.exists()) {
            userMap.set(ud.id, ud.data() as { email?: string; displayName?: string });
          }
        });

        list.forEach(item => {
          if ((!item.userEmail || item.userEmail === 'user@app.com') && userMap.has(item.userId)) {
            const uInfo = userMap.get(item.userId);
            if (uInfo?.email) item.userEmail = uInfo.email;
            if (uInfo?.displayName && !item.userName) item.userName = uInfo.displayName;
          }
        });
      } catch (lookupErr) {
        console.warn('Could not batch lookup user emails:', lookupErr);
      }
    }

    // Sort by submittedAt / startedAt descending
    list.sort((a, b) => (b.submittedAt || b.startedAt || 0) - (a.submittedAt || a.startedAt || 0));
    return list;
  } catch (err) {
    console.error('Error fetching admin task submissions:', err);
    return [];
  }
}

// Admin: Approve Task Submission (Credits milestone/full coins, unlocks next step if multi-day/minute)
export async function adminApproveTaskSubmission(
  submission: UserTaskProgress,
  adminNote?: string
): Promise<{ success: boolean }> {
  try {
    const docRef = doc(db, 'user_tasks', submission.id);
    const totalSteps = submission.totalSteps || 1;
    const currentStepIndex = submission.currentStepIndex !== undefined ? submission.currentStepIndex : 0;
    const prevCompletedCount = submission.completedStepCount !== undefined ? submission.completedStepCount : 0;
    const newCompletedCount = Math.max(prevCompletedCount + 1, currentStepIndex + 1);

    // Calculate coins to credit for this specific approved step
    const coinsToCredit =
      submission.currentStepCoins ||
      (totalSteps > 1
        ? Math.round((submission.taskCoins || 100) / totalSteps)
        : (submission.taskCoins || 100));

    // Update step proofs
    const existingProofs = submission.stepProofs || [];
    const updatedProofs = existingProofs.map(p =>
      p.stepIndex === currentStepIndex
        ? { ...p, status: 'approved' as const, approvedAt: Date.now() }
        : p
    );

    const isFullyCompleted = newCompletedCount >= totalSteps;

    const updatePayload: Partial<UserTaskProgress> = {
      reviewedAt: Date.now(),
      completedStepCount: newCompletedCount,
      adminNote: adminNote || (isFullyCompleted ? 'Task completed & fully approved!' : `Step ${newCompletedCount}/${totalSteps} approved! Proceed to next step.`),
      stepProofs: updatedProofs
    };

    if (isFullyCompleted) {
      updatePayload.status = 'approved';
      updatePayload.completedAt = Date.now();
    } else {
      // Unlocks next step for the user! User must submit a NEW screenshot for step newCompletedCount
      updatePayload.status = 'started';
      updatePayload.currentStepIndex = newCompletedCount;
      updatePayload.proofScreenshot = ''; // Clear so user must upload screenshot for next day/min
      updatePayload.proofText = '';
    }

    await updateDoc(docRef, updatePayload);

    // Credit coins to user wallet for this approved step
    await earnCoins(
      submission.userId,
      coinsToCredit,
      'task_reward',
      `Approved ${submission.taskTitle || 'Task'}${totalSteps > 1 ? ` (Step ${newCompletedCount}/${totalSteps})` : ''}`
    );

    // If fully completed, increment user's completedTasksCount
    if (isFullyCompleted) {
      try {
        const userRef = doc(db, 'users', submission.userId);
        await updateDoc(userRef, {
          completedTasksCount: increment(1),
          updatedAt: Date.now()
        });
      } catch (e) {
        console.warn('Could not increment user completedTasksCount:', e);
      }
    }

    return { success: true };
  } catch (err) {
    console.error('Error approving task submission:', err);
    // Direct credit as fallback
    const coinsToCredit = submission.currentStepCoins || submission.taskCoins || 100;
    await earnCoins(
      submission.userId,
      coinsToCredit,
      'task_reward',
      `Approved Task: ${submission.taskTitle || 'Task Offer'}`
    );
    return { success: true };
  }
}

// Admin: Reject Task Submission
export async function adminRejectTaskSubmission(
  submissionId: string,
  adminNote: string
): Promise<{ success: boolean }> {
  try {
    const docRef = doc(db, 'user_tasks', submissionId);
    await updateDoc(docRef, {
      status: 'rejected',
      reviewedAt: Date.now(),
      adminNote: adminNote || 'Task proof invalid or requirements not met'
    });
    return { success: true };
  } catch (err) {
    console.error('Error rejecting task submission:', err);
    return { success: false };
  }
}

// Admin: Delete a single task proof / submission record from history
export async function deleteAdminTaskSubmission(submissionId: string): Promise<void> {
  const docRef = doc(db, 'user_tasks', submissionId);
  await deleteDoc(docRef);
}

// Admin: Delete multiple or all task submission history records in batches
export async function deleteAllAdminTaskSubmissions(submissionIds?: string[]): Promise<number> {
  let idsToDelete = submissionIds;
  if (!idsToDelete || idsToDelete.length === 0) {
    const snap = await getDocs(collection(db, 'user_tasks'));
    idsToDelete = snap.docs.map(d => d.id);
  }
  if (idsToDelete.length === 0) return 0;

  const batchSize = 400;
  let count = 0;
  for (let i = 0; i < idsToDelete.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = idsToDelete.slice(i, i + batchSize);
    chunk.forEach(id => {
      batch.delete(doc(db, 'user_tasks', id));
    });
    await batch.commit();
    count += chunk.length;
  }
  return count;
}

// Admin: Delete a single coin transaction from history
export async function deleteUserTransaction(transactionId: string): Promise<void> {
  const docRef = doc(db, 'transactions', transactionId);
  await deleteDoc(docRef);
}

// Admin: Delete all coin transactions for a user
export async function deleteAllUserTransactions(userId: string): Promise<number> {
  const q = query(collection(db, 'transactions'), where('userId', '==', userId));
  const snap = await getDocs(q);
  if (snap.empty) return 0;

  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
  return snap.size;
}

// Instant Complete a Task (for auto-approved tasks / test)
export async function completeUserTask(
  userId: string,
  task: AppTask
): Promise<{ success: boolean; coinsEarned: number }> {
  const userTaskId = `${userId}_${task.id}`;

  try {
    // Mark as completed in user_tasks
    await setDoc(doc(db, 'user_tasks', userTaskId), {
      userId,
      taskId: task.id,
      taskTitle: task.title,
      taskCoins: task.coins,
      taskType: task.type,
      status: 'approved',
      completedAt: Date.now()
    }, { merge: true });

    // Credit coins to user wallet and add transaction record
    await earnCoins(
      userId,
      task.coins,
      'task_reward',
      `Completed Task: ${task.title}`
    );

    // Increment completedTasksCount on user profile
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        completedTasksCount: increment(1),
        updatedAt: Date.now()
      });
    } catch (e) {
      console.warn('Could not increment user completedTasksCount in completeUserTask:', e);
    }

    // Save to local cache
    try {
      const localData = localStorage.getItem(`tasks_progress_${userId}`) || '{}';
      const parsed = JSON.parse(localData);
      parsed[task.id] = {
        id: userTaskId,
        userId,
        taskId: task.id,
        status: 'approved',
        completedAt: Date.now()
      };
      localStorage.setItem(`tasks_progress_${userId}`, JSON.stringify(parsed));
    } catch {
      // Ignore
    }

    return { success: true, coinsEarned: task.coins };
  } catch (err) {
    console.error('Error completing task:', err);

    // Fallback credit if offline
    await earnCoins(
      userId,
      task.coins,
      'task_reward',
      `Completed Task: ${task.title}`
    );

    return { success: true, coinsEarned: task.coins };
  }
}

// -------------------------------------------------------------
// PROMO / COUPON CODES ENGINE (INSTANT FREE COINS)
// -------------------------------------------------------------

export const STARTER_PROMO_CODES: Omit<PromoCode, 'id'>[] = [];

// Helper to get local promo codes cache
function getLocalPromoCodes(): PromoCode[] {
  try {
    const raw = localStorage.getItem('app_promo_codes_cache');
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // Ignore
  }
  return [];
}

function setLocalPromoCodes(list: PromoCode[]): void {
  try {
    localStorage.setItem('app_promo_codes_cache', JSON.stringify(list));
  } catch {
    // Ignore
  }
}

// Fetch all promo codes (strictly from Firestore collection managed by Admin)
export async function fetchPromoCodes(onlyActive = false): Promise<PromoCode[]> {
  try {
    const promoColl = collection(db, 'promo_codes');
    const snap = await getDocs(promoColl);

    if (snap.empty) {
      setLocalPromoCodes([]);
      return [];
    } else {
      const list = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<PromoCode, 'id'>)
      }));
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setLocalPromoCodes(list);
      return onlyActive ? list.filter(c => c.active) : list;
    }
  } catch (err) {
    console.warn('Could not fetch promo codes from Firestore, using local admin cache:', err);
  }

  const local = getLocalPromoCodes();
  // Filter out any stale auto-generated starter promo codes
  const cleanLocal = local.filter(c => !c.id.startsWith('starter_'));
  return onlyActive ? cleanLocal.filter(c => c.active) : cleanLocal;
}

// Fetch featured public promo codes for display in modal
export async function fetchFeaturedPromoCodes(): Promise<PromoCode[]> {
  const codes = await fetchPromoCodes(true);
  return codes.filter(c => c.isFeatured !== false);
}

// Fetch all promo redemptions for a specific user
export async function fetchUserPromoRedemptions(userId: string): Promise<PromoCodeRedemption[]> {
  try {
    const redemptionsColl = collection(db, 'promo_redemptions');
    const q = query(redemptionsColl, where('userId', '==', userId));
    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({
      id: d.id,
      ...(d.data() as Omit<PromoCodeRedemption, 'id'>)
    }));
    list.sort((a, b) => b.redeemedAt - a.redeemedAt);
    return list;
  } catch (err) {
    console.warn('Could not fetch user promo redemptions from Firestore:', err);
    try {
      const local = localStorage.getItem(`promo_redeemed_${userId}`);
      return local ? JSON.parse(local) : [];
    } catch {
      return [];
    }
  }
}

// Redeem Promo Code for a User
export async function redeemPromoCode(
  userId: string,
  codeInput: string,
  userProfile?: UserProfile | null
): Promise<{ success: boolean; coins?: number; promo?: PromoCode; message: string }> {
  const cleanCode = codeInput.trim().toUpperCase();

  if (!cleanCode) {
    return { success: false, message: 'Please enter a valid promo code' };
  }

  let promo: PromoCode | null = null;

  // 1. Direct Firestore Search for the Promo Code
  try {
    const promoColl = collection(db, 'promo_codes');
    
    // Direct exact uppercase match
    const q = query(promoColl, where('code', '==', cleanCode));
    const snap = await getDocs(q);

    if (!snap.empty) {
      const docData = snap.docs[0];
      promo = { id: docData.id, ...(docData.data() as Omit<PromoCode, 'id'>) };
    } else {
      // Fallback scan all docs in Firestore to handle case-insensitivity or whitespace
      const allSnap = await getDocs(promoColl);
      if (!allSnap.empty) {
        const found = allSnap.docs.find(
          d => (d.data()?.code || '').toString().trim().toUpperCase() === cleanCode
        );
        if (found) {
          promo = { id: found.id, ...(found.data() as Omit<PromoCode, 'id'>) };
        }
      }
    }
  } catch (firestoreErr) {
    console.warn('Direct Firestore promo query error, checking local codes:', firestoreErr);
  }

  // 2. Fallback to cached promo codes if Firestore was unreachable or didn't yield a match
  if (!promo) {
    const allPromoCodes = await fetchPromoCodes(false);
    const foundLocal = allPromoCodes.find(
      p => (p.code || '').trim().toUpperCase() === cleanCode
    );
    if (foundLocal) {
      promo = foundLocal;
    }
  }

  if (!promo) {
    return { success: false, message: `Promo code "${cleanCode}" is invalid. Check spelling and try again.` };
  }

  if (promo.active === false) {
    return { success: false, message: `Promo code "${cleanCode}" is currently inactive or disabled.` };
  }

  // Check expiration date
  if (promo.expiresAt && Date.now() > promo.expiresAt) {
    return { success: false, message: `Promo code "${cleanCode}" has expired.` };
  }

  // Check global max usages limit
  if (promo.maxUses && (promo.usedCount || 0) >= promo.maxUses) {
    return { success: false, message: `Promo code "${cleanCode}" limit has been reached.` };
  }

  // 3. Check if user has already redeemed this promo code
  const userRedemptions = await fetchUserPromoRedemptions(userId);
  const alreadyRedeemed = userRedemptions.some(
    r => r.promoCodeId === promo?.id || (r.code || '').trim().toUpperCase() === cleanCode
  );

  if (alreadyRedeemed) {
    return { success: false, message: `You have already redeemed promo code "${cleanCode}". Each code can only be used once per account.` };
  }

  const rewardCoins = Number(promo.rewardCoins) || 50;

  // 4. Atomically Credit Coins to User & Record Redemption
  try {
    // Record redemption in Firestore
    const redDocId = `${userId}_${promo.id}`;
    const redemptionData: Omit<PromoCodeRedemption, 'id'> = {
      promoCodeId: promo.id,
      code: promo.code,
      userId,
      userEmail: userProfile?.email || '',
      userName: userProfile?.displayName || 'Player',
      rewardCoins,
      redeemedAt: Date.now()
    };

    try {
      await setDoc(doc(db, 'promo_redemptions', redDocId), redemptionData);
    } catch (e) {
      console.warn('Could not write promo_redemptions doc:', e);
    }

    // Increment usedCount on promo code in Firestore
    try {
      const promoRef = doc(db, 'promo_codes', promo.id);
      await updateDoc(promoRef, {
        usedCount: increment(1),
        updatedAt: Date.now()
      });
    } catch (e) {
      console.warn('Could not increment promo code usedCount:', e);
    }

    // Credit coins to user wallet and add transaction record
    await earnCoins(
      userId,
      rewardCoins,
      'promo_code',
      `Redeemed Promo Code: ${promo.code}`
    );

    // Update local cache
    try {
      const existing = localStorage.getItem(`promo_redeemed_${userId}`);
      const list: PromoCodeRedemption[] = existing ? JSON.parse(existing) : [];
      list.unshift({ id: redDocId, ...redemptionData });
      localStorage.setItem(`promo_redeemed_${userId}`, JSON.stringify(list));

      // Update local promo codes usedCount
      const cachedPromos = getLocalPromoCodes();
      const updated = cachedPromos.map(p =>
        p.id === promo?.id ? { ...p, usedCount: (p.usedCount || 0) + 1 } : p
      );
      setLocalPromoCodes(updated);
    } catch {
      // Ignore
    }

    return {
      success: true,
      coins: rewardCoins,
      promo,
      message: `🎉 Success! Promo code ${promo.code} applied! +${rewardCoins} Coins added to your wallet.`
    };
  } catch (err: any) {
    console.error('Error redeeming promo code:', err);
    // Fallback direct credit
    try {
      await earnCoins(
        userId,
        rewardCoins,
        'promo_code',
        `Redeemed Promo Code: ${promo.code}`
      );
      return {
        success: true,
        coins: rewardCoins,
        promo,
        message: `🎉 Success! Promo code ${promo.code} applied! +${rewardCoins} Coins added.`
      };
    } catch (fallbackErr: any) {
      return {
        success: false,
        message: fallbackErr?.message || 'Failed to redeem promo code. Please try again.'
      };
    }
  }
}

// Admin: Create Promo Code
export async function createAdminPromoCode(
  data: Omit<PromoCode, 'id' | 'usedCount' | 'createdAt'>
): Promise<PromoCode> {
  const cleanCode = data.code.trim().toUpperCase();
  const newPromo: Omit<PromoCode, 'id'> = {
    code: cleanCode,
    rewardCoins: Number(data.rewardCoins) || 100,
    description: data.description?.trim() || '',
    maxUses: data.maxUses ? Number(data.maxUses) : null,
    usedCount: 0,
    perUserLimit: 1,
    expiresAt: data.expiresAt || null,
    active: data.active !== false,
    isFeatured: data.isFeatured ?? true,
    createdAt: Date.now()
  };

  try {
    const promoColl = collection(db, 'promo_codes');
    
    // Check if code already exists in Firestore; if so update it
    const existingQ = query(promoColl, where('code', '==', cleanCode));
    const existingSnap = await getDocs(existingQ);

    let docId = '';
    if (!existingSnap.empty) {
      docId = existingSnap.docs[0].id;
      await updateDoc(doc(db, 'promo_codes', docId), {
        ...newPromo,
        updatedAt: Date.now()
      });
    } else {
      const docRef = await addDoc(promoColl, newPromo);
      docId = docRef.id;
    }

    const createdPromo: PromoCode = { id: docId, ...newPromo };

    // Update local cache
    const current = getLocalPromoCodes().filter(p => p.code.toUpperCase() !== cleanCode);
    current.unshift(createdPromo);
    setLocalPromoCodes(current);

    return createdPromo;
  } catch (err) {
    console.warn('Could not save promo code to Firestore, saving to local cache:', err);
    const localPromo: PromoCode = {
      id: `local_promo_${Date.now()}`,
      ...newPromo
    };
    const current = getLocalPromoCodes().filter(p => p.code.toUpperCase() !== cleanCode);
    current.unshift(localPromo);
    setLocalPromoCodes(current);
    return localPromo;
  }
}

// Admin: Update Promo Code
export async function updateAdminPromoCode(
  id: string,
  updates: Partial<PromoCode>
): Promise<void> {
  try {
    const docRef = doc(db, 'promo_codes', id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Date.now()
    });
  } catch (err) {
    console.warn('Could not update promo code in Firestore:', err);
  }

  // Update local cache
  const current = getLocalPromoCodes();
  const updated = current.map(p => (p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p));
  setLocalPromoCodes(updated);
}

// Admin: Delete Promo Code
export async function deleteAdminPromoCode(id: string): Promise<void> {
  try {
    const docRef = doc(db, 'promo_codes', id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Could not delete promo code from Firestore:', err);
  }

  // Update local cache
  const current = getLocalPromoCodes();
  const updated = current.filter(p => p.id !== id);
  setLocalPromoCodes(updated);
}

// Admin: Fetch all recent promo redemptions across all users
export async function fetchAdminPromoRedemptions(limitCount = 100): Promise<PromoCodeRedemption[]> {
  try {
    const redColl = collection(db, 'promo_redemptions');
    const q = query(redColl, orderBy('redeemedAt', 'desc'), limit(limitCount));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({
      id: d.id,
      ...(d.data() as Omit<PromoCodeRedemption, 'id'>)
    }));
  } catch (err) {
    console.warn('Could not fetch promo redemptions with orderBy, trying plain getDocs:', err);
    try {
      const redColl = collection(db, 'promo_redemptions');
      const q = query(redColl, limit(limitCount));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<PromoCodeRedemption, 'id'>)
      }));
      list.sort((a, b) => b.redeemedAt - a.redeemedAt);
      return list;
    } catch {
      return [];
    }
  }
}

/* ==================== PRIZE CLAIMS & ADMIN APPROVAL ==================== */

function getLocalPrizeClaims(userId?: string): PhysicalPrizeClaim[] {
  try {
    const key = userId ? `refer_physical_claims_${userId}` : 'refer_physical_claims_all';
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function setLocalPrizeClaims(claims: PhysicalPrizeClaim[], userId?: string) {
  try {
    const key = userId ? `refer_physical_claims_${userId}` : 'refer_physical_claims_all';
    localStorage.setItem(key, JSON.stringify(claims));
  } catch {}
}

export async function submitPrizeClaim(
  claimData: Omit<PhysicalPrizeClaim, 'id' | 'claimedAt' | 'status'>
): Promise<PhysicalPrizeClaim> {
  const claimId = `claim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newClaim: PhysicalPrizeClaim = {
    ...claimData,
    id: claimId,
    status: 'pending',
    claimedAt: Date.now()
  };

  // Try to persist in Firestore
  try {
    const docRef = doc(db, 'prize_claims', claimId);
    await setDoc(docRef, newClaim);
  } catch (err) {
    console.warn('Could not save prize claim to Firestore, saving locally:', err);
  }

  // Update local user cache
  const userClaims = getLocalPrizeClaims(claimData.userId);
  const updatedUserClaims = [newClaim, ...userClaims.filter(c => c.id !== claimId)];
  setLocalPrizeClaims(updatedUserClaims, claimData.userId);

  // Update local all cache
  const allClaims = getLocalPrizeClaims();
  const updatedAllClaims = [newClaim, ...allClaims.filter(c => c.id !== claimId)];
  setLocalPrizeClaims(updatedAllClaims);

  return newClaim;
}

export function subscribeToUserPrizeClaims(
  userId: string,
  callback: (claims: PhysicalPrizeClaim[]) => void
): () => void {
  if (!userId) {
    callback([]);
    return () => {};
  }

  try {
    const claimsRef = collection(db, 'prize_claims');
    const q = query(claimsRef, where('userId', '==', userId));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const claims = snap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<PhysicalPrizeClaim, 'id'>)
        }));
        claims.sort((a, b) => b.claimedAt - a.claimedAt);
        setLocalPrizeClaims(claims, userId);
        callback(claims);
      },
      (err) => {
        console.warn('Prize claims snapshot error, falling back to local cache:', err);
        callback(getLocalPrizeClaims(userId));
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Failed to subscribe to user prize claims:', err);
    callback(getLocalPrizeClaims(userId));
    return () => {};
  }
}

export function subscribeToAllPrizeClaims(
  callback: (claims: PhysicalPrizeClaim[]) => void
): () => void {
  try {
    const claimsRef = collection(db, 'prize_claims');
    const q = query(claimsRef, limit(100));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const claims = snap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<PhysicalPrizeClaim, 'id'>)
        }));
        claims.sort((a, b) => b.claimedAt - a.claimedAt);
        setLocalPrizeClaims(claims);
        callback(claims);
      },
      (err) => {
        console.warn('All prize claims snapshot error, falling back to local cache:', err);
        callback(getLocalPrizeClaims());
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Failed to subscribe to all prize claims:', err);
    callback(getLocalPrizeClaims());
    return () => {};
  }
}

export async function adminApprovePrizeClaim(
  claimId: string,
  adminNotes?: string
): Promise<boolean> {
  const updatePayload = {
    status: 'approved' as const,
    adminNotes: adminNotes || 'Approved by Admin',
    updatedAt: Date.now()
  };

  try {
    const docRef = doc(db, 'prize_claims', claimId);
    await updateDoc(docRef, updatePayload);
  } catch (err) {
    console.warn('Failed to approve prize claim in Firestore, updating locally:', err);
  }

  // Update local caches
  const allClaims = getLocalPrizeClaims();
  const updatedAll = allClaims.map(c => c.id === claimId ? { ...c, ...updatePayload } : c);
  setLocalPrizeClaims(updatedAll);

  return true;
}

export async function adminRejectPrizeClaim(
  claimId: string,
  adminNotes?: string
): Promise<boolean> {
  const updatePayload = {
    status: 'rejected' as const,
    adminNotes: adminNotes || 'Rejected by Admin',
    updatedAt: Date.now()
  };

  try {
    const docRef = doc(db, 'prize_claims', claimId);
    await updateDoc(docRef, updatePayload);
  } catch (err) {
    console.warn('Failed to reject prize claim in Firestore, updating locally:', err);
  }

  // Update local caches
  const allClaims = getLocalPrizeClaims();
  const updatedAll = allClaims.map(c => c.id === claimId ? { ...c, ...updatePayload } : c);
  setLocalPrizeClaims(updatedAll);

  return true;
}

// --- GIVEAWAY SERVICE LOGIC ---

export const DEFAULT_GIVEAWAY_CONFIG: GiveawayConfig = {
  id: 'active_giveaway',
  title: '🎁 iPhone 16 Pro & Cash Pool Giveaway',
  description: 'Participate in our exclusive referral prize pool! Win iPhone 16 Pro, AirBuds, T-Shirts & ₹10,000 Cash Drops.',
  prizeImageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80',
  targetAudience: 'all', // 'all' or 'verified_only'
  entryFeeCoins: 0, // 0 = Free
  active: true,
  participantsCount: 2510,
  createdAt: Date.now()
};

function getLocalGiveawayConfig(): GiveawayConfig {
  try {
    const raw = localStorage.getItem('giveaway_config');
    return raw ? JSON.parse(raw) : DEFAULT_GIVEAWAY_CONFIG;
  } catch {
    return DEFAULT_GIVEAWAY_CONFIG;
  }
}

function setLocalGiveawayConfig(config: GiveawayConfig): void {
  try {
    localStorage.setItem('giveaway_config', JSON.stringify(config));
  } catch (err) {
    console.warn('Failed to save local giveaway config:', err);
  }
}

export async function fetchGiveawayConfig(): Promise<GiveawayConfig> {
  try {
    const docRef = doc(db, 'settings', 'giveaway');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as GiveawayConfig;
      const merged = { ...DEFAULT_GIVEAWAY_CONFIG, ...data };
      setLocalGiveawayConfig(merged);
      return merged;
    } else {
      await setDoc(docRef, DEFAULT_GIVEAWAY_CONFIG);
      setLocalGiveawayConfig(DEFAULT_GIVEAWAY_CONFIG);
      return DEFAULT_GIVEAWAY_CONFIG;
    }
  } catch (err) {
    console.warn('Failed to fetch giveaway config from Firestore, returning local:', err);
    return getLocalGiveawayConfig();
  }
}

export async function updateGiveawayConfig(
  updates: Partial<GiveawayConfig>
): Promise<GiveawayConfig> {
  const current = await fetchGiveawayConfig();
  const updated: GiveawayConfig = {
    ...current,
    ...updates,
    updatedAt: Date.now()
  };

  try {
    const docRef = doc(db, 'settings', 'giveaway');
    await setDoc(docRef, updated, { merge: true });
  } catch (err) {
    console.warn('Failed to update giveaway config in Firestore:', err);
  }

  setLocalGiveawayConfig(updated);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('giveaway_config_updated', {
        detail: updated
      })
    );
  }

  return updated;
}

export async function fetchUserGiveawayEntry(
  userId: string,
  giveawayId: string = 'active_giveaway'
): Promise<GiveawayEntry | null> {
  if (!userId) return null;
  const entryKey = `giveaway_entry_${giveawayId}_${userId}`;
  try {
    const rawLocal = localStorage.getItem(entryKey);
    if (rawLocal) return JSON.parse(rawLocal);
  } catch {
    // continue
  }

  try {
    const entryRef = doc(db, 'giveaway_entries', `${giveawayId}_${userId}`);
    const snap = await getDoc(entryRef);
    if (snap.exists()) {
      const entry = snap.data() as GiveawayEntry;
      localStorage.setItem(entryKey, JSON.stringify(entry));
      return entry;
    }
  } catch (err) {
    console.warn('Failed to check giveaway entry from Firestore:', err);
  }

  return null;
}

export async function enterGiveaway(
  userId: string
): Promise<{ success: boolean; message: string; entry: GiveawayEntry }> {
  if (!userId) throw new Error('User ID is required');

  const config = await fetchGiveawayConfig();
  if (!config.active) {
    throw new Error('Ye Giveaway abhi active nahi hai!');
  }

  // Fetch user profile
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error('User profile not found');

  const user = userSnap.data() as UserProfile;

  // Check Target Audience Eligibility
  if (config.targetAudience === 'verified_only' && !user.isVerified) {
    throw new Error('🚫 Yeh Giveaway sirf Verified Users (Blue Tick Badge) ke liye hai! Pehle Profile me Verified status praapt karein.');
  }

  // Check duplicate entry
  const existingEntry = await fetchUserGiveawayEntry(userId, config.id);
  if (existingEntry) {
    throw new Error('✓ Aapne pehle hi iss Giveaway me Entry le li hai!');
  }

  // Check entry fee
  const fee = config.entryFeeCoins || 0;
  if (fee > 0 && (user.coins || 0) < fee) {
    throw new Error(`⚠️ Insufficient Coins! Iss Giveaway me entry lene ke liye ${fee} Coins chahiye. Aapke pass ${user.coins || 0} Coins hain.`);
  }

  // Deduct fee if required
  if (fee > 0) {
    const cached = getCachedProfile(userId);
    if (cached) {
      cached.coins = Math.max(0, (cached.coins || 0) - fee);
      setCachedProfile(userId, cached);
    }

    try {
      await updateDoc(userRef, {
        coins: increment(-fee),
        updatedAt: Date.now()
      });

      await addDoc(collection(db, 'transactions'), {
        userId,
        type: 'giveaway_entry',
        amount: -fee,
        description: `Entry Fee for Giveaway: ${config.title}`,
        timestamp: Date.now()
      });
    } catch (err) {
      console.warn('Failed to update balance for giveaway entry:', err);
    }
  }

  // Register Giveaway Entry
  const entryData: GiveawayEntry = {
    id: `${config.id}_${userId}`,
    giveawayId: config.id,
    userId,
    userName: user.displayName || 'User',
    userEmail: user.email || '',
    userPhoto: user.photoURL,
    isVerified: !!user.isVerified,
    entryFeeCoins: fee,
    enteredAt: Date.now()
  };

  const entryKey = `giveaway_entry_${config.id}_${userId}`;
  localStorage.setItem(entryKey, JSON.stringify(entryData));

  try {
    const entryRef = doc(db, 'giveaway_entries', `${config.id}_${userId}`);
    await setDoc(entryRef, entryData);

    // Increment participants count
    const giveawayRef = doc(db, 'settings', 'giveaway');
    await updateDoc(giveawayRef, {
      participantsCount: increment(1)
    });
  } catch (err) {
    console.warn('Failed to save giveaway entry to Firestore:', err);
  }

  // Local update for config participants count
  config.participantsCount = (config.participantsCount || 0) + 1;
  setLocalGiveawayConfig(config);

  // Dispatch events
  if (typeof window !== 'undefined') {
    if (fee > 0) {
      window.dispatchEvent(
        new CustomEvent('coin_balance_updated', {
          detail: {
            userId,
            amount: -fee,
            type: 'giveaway_entry',
            timestamp: Date.now()
          }
        })
      );
    }

    window.dispatchEvent(
      new CustomEvent('giveaway_entry_submitted', {
        detail: entryData
      })
    );
  }

  return {
    success: true,
    message: fee > 0
      ? `🎉 Mubarak ho! ${fee} Coins deduct karke aapki Giveaway Entry confirm ho gayi hai!`
      : `🎉 Mubarak ho! Aapki Free Giveaway Entry successfully confirm ho gayi hai!`,
    entry: entryData
  };
}

export async function fetchGiveawayEntries(giveawayId: string = 'active_giveaway'): Promise<GiveawayEntry[]> {
  let entries: GiveawayEntry[] = [];

  // 1. Fetch from Firestore without compound orderBy (prevents index requirement error)
  try {
    const q = query(
      collection(db, 'giveaway_entries'),
      where('giveawayId', '==', giveawayId),
      limit(250)
    );
    const snap = await getDocs(q);
    entries = snap.docs.map(doc => doc.data() as GiveawayEntry);
  } catch (err) {
    console.warn('Failed to fetch giveaway entries by giveawayId:', err);
  }

  // Fallback: If no entries found by exact giveawayId, query all entries
  if (entries.length === 0) {
    try {
      const qAll = query(collection(db, 'giveaway_entries'), limit(250));
      const snapAll = await getDocs(qAll);
      entries = snapAll.docs.map(doc => doc.data() as GiveawayEntry);
    } catch (err) {
      console.warn('Fallback query for all giveaway entries failed:', err);
    }
  }

  // 2. Always merge local user entries stored in localStorage
  if (typeof localStorage !== 'undefined') {
    const existingUids = new Set(entries.map(e => e.userId));
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('giveaway_entry_')) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const localEntry = JSON.parse(raw) as GiveawayEntry;
            if (localEntry && localEntry.userId && !existingUids.has(localEntry.userId)) {
              entries.push(localEntry);
              existingUids.add(localEntry.userId);
            }
          }
        } catch {
          // continue
        }
      }
    }
  }

  // 3. Auto-populate demo users if non-verified & active with completely RANDOM positions (different from Leaderboard)
  try {
    const config = await fetchGiveawayConfig();
    const isNonVerified = config.targetAudience !== 'verified_only';

    if (isNonVerified && config.active) {
      const existingUids = new Set(entries.map(e => e.userId));

      // Deterministic pseudo-random hash generator based on string
      const pseudoHash = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          hash = (hash * 31 + str.charCodeAt(i)) & 0x7fffffff;
        }
        return hash;
      };

      // Randomize the order of demo users so their positions in Giveaway are completely random and do NOT match Leaderboard
      const randomizedDemoUsers = [...DEMO_LEADERBOARD_USERS].sort((a, b) => {
        const hashA = pseudoHash(`${a.uid}_gw_pos_${giveawayId}`);
        const hashB = pseudoHash(`${b.uid}_gw_pos_${giveawayId}`);
        return hashA - hashB;
      });

      const now = Date.now();
      const baseSpanMs = 72 * 3600 * 1000; // 72 hours span
      const stepMs = Math.floor(baseSpanMs / (randomizedDemoUsers.length + 5));

      randomizedDemoUsers.forEach((demoUser, idx) => {
        if (!existingUids.has(demoUser.uid)) {
          const jitter = (pseudoHash(`${demoUser.uid}_jitter`) % 1800000) - 900000;
          const enteredAt = Math.max(now - ((idx + 1) * stepMs + jitter), now - 5 * 24 * 3600 * 1000);
          entries.push({
            id: `${giveawayId}_${demoUser.uid}`,
            giveawayId,
            userId: demoUser.uid,
            userName: demoUser.displayName,
            userEmail: demoUser.email,
            userPhoto: demoUser.photoURL,
            isVerified: false,
            entryFeeCoins: config.entryFeeCoins || 0,
            enteredAt
          });
        }
      });
    }
  } catch (err) {
    console.warn('Could not auto-add demo users to giveaway entries:', err);
  }

  // 4. Sort in memory by enteredAt descending
  entries.sort((a, b) => (b.enteredAt || 0) - (a.enteredAt || 0));

  return entries;
}

export async function declareGiveawayWinner(
  winner: { userId: string; userName: string; userEmail?: string; userPhoto?: string },
  prizeTitle?: string
): Promise<GiveawayConfig> {
  const current = await fetchGiveawayConfig();
  const updated: GiveawayConfig = {
    ...current,
    winnerName: winner.userName,
    winnerUid: winner.userId,
    winnerEmail: winner.userEmail || '',
    winnerPhoto: winner.userPhoto || '',
    winnerDeclaredAt: Date.now(),
    winnerPrize: prizeTitle || current.title,
    updatedAt: Date.now()
  };

  try {
    const docRef = doc(db, 'settings', 'giveaway');
    await setDoc(docRef, updated, { merge: true });
  } catch (err) {
    console.warn('Failed to update giveaway winner in Firestore:', err);
  }

  setLocalGiveawayConfig(updated);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('giveaway_config_updated', {
        detail: updated
      })
    );
  }

  return updated;
}

export async function clearGiveawayWinner(): Promise<GiveawayConfig> {
  const current = await fetchGiveawayConfig();
  const updated: GiveawayConfig = {
    ...current,
    winnerName: '',
    winnerUid: '',
    winnerEmail: '',
    winnerPhoto: '',
    winnerDeclaredAt: undefined,
    winnerPrize: '',
    updatedAt: Date.now()
  };

  try {
    const docRef = doc(db, 'settings', 'giveaway');
    await setDoc(docRef, updated, { merge: true });
  } catch (err) {
    console.warn('Failed to clear giveaway winner in Firestore:', err);
  }

  setLocalGiveawayConfig(updated);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('giveaway_config_updated', {
        detail: updated
      })
    );
  }

  return updated;
}

// ==========================================
// FREE FIRE MAX TOURNAMENT SERVICES
// ==========================================

export const DEFAULT_TOURNAMENTS: FreeFireTournament[] = [];

export const DEMO_TOURNAMENT_IDS = [
  'ff_match_solo_bermuda_1',
  'ff_match_squad_clash_2',
  'ff_match_free_entry_3'
];

function cleanTournamentRecord(t: FreeFireTournament): FreeFireTournament {
  const winnerPrize = t.firstPrizeCoins || t.prizePoolCoins || 0;
  return {
    ...t,
    description: '',
    prizePoolCoins: winnerPrize,
    firstPrizeCoins: winnerPrize,
    perKillCoins: 0,
    secondPrizeCoins: undefined,
    thirdPrizeCoins: undefined
  };
}

const LOCAL_TOURNAMENTS_KEY = 'rewardluxe_freefire_tournaments';
const LOCAL_PARTICIPANTS_PREFIX = 'rewardluxe_tournament_part_';

function getLocalTournaments(): FreeFireTournament[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_TOURNAMENTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const filtered = parsed
          .filter(t => !DEMO_TOURNAMENT_IDS.includes(t.id))
          .map(cleanTournamentRecord);
        return filtered;
      }
    }
  } catch {
    // fallback
  }
  return [];
}

function saveLocalTournaments(list: FreeFireTournament[]) {
  if (typeof localStorage === 'undefined') return;
  try {
    const cleaned = list
      .filter(t => !DEMO_TOURNAMENT_IDS.includes(t.id))
      .map(cleanTournamentRecord);
    localStorage.setItem(LOCAL_TOURNAMENTS_KEY, JSON.stringify(cleaned));
  } catch {
    // ignore
  }
}

export async function fetchTournaments(): Promise<FreeFireTournament[]> {
  const localList = getLocalTournaments();
  try {
    const colRef = collection(db, 'tournaments');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const remoteList: FreeFireTournament[] = [];
      for (const docSnap of snap.docs) {
        if (DEMO_TOURNAMENT_IDS.includes(docSnap.id)) {
          // Auto delete demo tournament from Firestore so it doesn't linger
          try {
            await deleteDoc(doc(db, 'tournaments', docSnap.id));
          } catch {
            // ignore
          }
          continue;
        }
        const data = docSnap.data() as FreeFireTournament;
        remoteList.push(cleanTournamentRecord({ ...data, id: docSnap.id }));
      }
      remoteList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      saveLocalTournaments(remoteList);
      return remoteList;
    } else {
      saveLocalTournaments([]);
      return [];
    }
  } catch (err) {
    console.warn('Failed to fetch tournaments from Firestore, using local:', err);
    return localList;
  }
}

export function subscribeToTournaments(callback: (list: FreeFireTournament[]) => void): () => void {
  callback(getLocalTournaments());

  const colRef = collection(db, 'tournaments');
  const unsubscribe = onSnapshot(colRef, (snap) => {
    if (!snap.empty) {
      const list: FreeFireTournament[] = [];
      snap.forEach(docSnap => {
        if (!DEMO_TOURNAMENT_IDS.includes(docSnap.id)) {
          const data = docSnap.data() as FreeFireTournament;
          list.push(cleanTournamentRecord({ ...data, id: docSnap.id }));
        }
      });
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      saveLocalTournaments(list);
      callback(list);
    } else {
      saveLocalTournaments([]);
      callback([]);
    }
  }, (err) => {
    console.warn('Tournaments snapshot listener error:', err);
    callback(getLocalTournaments());
  });

  return unsubscribe;
}

export async function createTournament(tournamentData: Omit<FreeFireTournament, 'id' | 'createdAt' | 'joinedSlots'> & { id?: string }): Promise<FreeFireTournament> {
  const id = tournamentData.id || `ff_match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const winnerPrize = tournamentData.firstPrizeCoins || tournamentData.prizePoolCoins || 0;
  const newTournament: FreeFireTournament = {
    ...tournamentData,
    id,
    prizePoolCoins: winnerPrize,
    firstPrizeCoins: winnerPrize,
    perKillCoins: 0,
    secondPrizeCoins: undefined,
    thirdPrizeCoins: undefined,
    joinedSlots: 0,
    status: tournamentData.status || 'upcoming',
    roomCredentialsReleased: tournamentData.roomCredentialsReleased ?? false,
    createdAt: Date.now()
  };

  try {
    await setDoc(doc(db, 'tournaments', id), newTournament);
  } catch (err) {
    console.warn('Failed to create tournament in Firestore:', err);
  }

  const current = getLocalTournaments();
  const updated = [newTournament, ...current.filter(t => t.id !== id)];
  saveLocalTournaments(updated);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tournaments_updated', { detail: updated }));
  }

  return newTournament;
}

export async function updateTournament(tournamentId: string, updates: Partial<FreeFireTournament>): Promise<void> {
  try {
    const docRef = doc(db, 'tournaments', tournamentId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Date.now()
    });
  } catch (err) {
    console.warn('Failed to update tournament in Firestore:', err);
  }

  const current = getLocalTournaments();
  const updated = current.map(t => t.id === tournamentId ? { ...t, ...updates, updatedAt: Date.now() } : t);
  saveLocalTournaments(updated);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tournaments_updated', { detail: updated }));
  }
}

export async function deleteTournament(tournamentId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'tournaments', tournamentId));
  } catch (err) {
    console.warn('Failed to delete tournament in Firestore:', err);
  }

  const current = getLocalTournaments();
  const updated = current.filter(t => t.id !== tournamentId);
  saveLocalTournaments(updated);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tournaments_updated', { detail: updated }));
  }
}

export async function setTournamentRoomCredentials(
  tournamentId: string,
  roomId: string,
  roomPassword: string,
  release: boolean
): Promise<void> {
  await updateTournament(tournamentId, {
    roomId,
    roomPassword,
    roomCredentialsReleased: release
  });
}

export async function fetchTournamentParticipants(tournamentId: string): Promise<TournamentParticipant[]> {
  const localKey = `${LOCAL_PARTICIPANTS_PREFIX}${tournamentId}`;
  let localList: TournamentParticipant[] = [];
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(localKey);
      if (raw) localList = JSON.parse(raw);
    } catch {
      // ignore
    }
  }

  try {
    const colRef = collection(db, 'tournament_participants');
    const q = query(colRef, where('tournamentId', '==', tournamentId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const remoteList: TournamentParticipant[] = [];
      snap.forEach(docSnap => {
        remoteList.push({ ...(docSnap.data() as TournamentParticipant), id: docSnap.id });
      });
      remoteList.sort((a, b) => a.slotNumber - b.slotNumber);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(localKey, JSON.stringify(remoteList));
      }
      return remoteList;
    }
  } catch (err) {
    console.warn('Failed to fetch participants from Firestore:', err);
  }

  return localList;
}

export function subscribeToTournamentParticipants(
  tournamentId: string,
  callback: (list: TournamentParticipant[]) => void
): () => void {
  const localKey = `${LOCAL_PARTICIPANTS_PREFIX}${tournamentId}`;
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(localKey);
      if (raw) callback(JSON.parse(raw));
    } catch {
      // ignore
    }
  }

  const colRef = collection(db, 'tournament_participants');
  const q = query(colRef, where('tournamentId', '==', tournamentId));
  const unsub = onSnapshot(q, (snap) => {
    const list: TournamentParticipant[] = [];
    snap.forEach(docSnap => {
      list.push({ ...(docSnap.data() as TournamentParticipant), id: docSnap.id });
    });
    list.sort((a, b) => a.slotNumber - b.slotNumber);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(localKey, JSON.stringify(list));
    }
    callback(list);
  }, (err) => {
    console.warn('Tournament participants subscription error:', err);
  });

  return unsub;
}

export async function fetchUserTournamentRegistration(
  tournamentId: string,
  userId: string
): Promise<TournamentParticipant | null> {
  if (!tournamentId || !userId) return null;
  const userKey = `ff_reg_${tournamentId}_${userId}`;
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(userKey);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
  }

  try {
    const docRef = doc(db, 'tournament_participants', `${tournamentId}_${userId}`);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = { ...(snap.data() as TournamentParticipant), id: snap.id };
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(userKey, JSON.stringify(data));
      }
      return data;
    }
  } catch (err) {
    console.warn('Failed to check user tournament registration:', err);
  }

  return null;
}

export async function fetchUserAllTournamentRegistrations(userId: string): Promise<TournamentParticipant[]> {
  if (!userId) return [];
  const results: TournamentParticipant[] = [];

  if (typeof localStorage !== 'undefined') {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('ff_reg_') && k.endsWith(`_${userId}`)) {
        try {
          const raw = localStorage.getItem(k);
          if (raw) results.push(JSON.parse(raw));
        } catch {
          // ignore
        }
      }
    }
  }

  try {
    const colRef = collection(db, 'tournament_participants');
    const q = query(colRef, where('userId', '==', userId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const remoteList: TournamentParticipant[] = [];
      snap.forEach(docSnap => {
        remoteList.push({ ...(docSnap.data() as TournamentParticipant), id: docSnap.id });
      });
      return remoteList;
    }
  } catch (err) {
    console.warn('Failed to fetch user tournament registrations:', err);
  }

  return results;
}

/**
 * Join a Free Fire MAX Tournament
 * - Validates freeFireName (IGN)
 * - Checks slot availability
 * - Deducts entryFeeCoins (if > 0)
 * - Records transaction
 * - Creates participant entry
 * - Increments joinedSlots count
 */
export async function joinFreeFireTournament(
  tournament: FreeFireTournament,
  user: UserProfile,
  freeFireName: string,
  freeFireUid?: string
): Promise<{ success: boolean; message: string; participant?: TournamentParticipant }> {
  const trimmedName = freeFireName.trim();
  if (!trimmedName || trimmedName.length < 2) {
    return {
      success: false,
      message: 'Kripya apna valid Free Fire MAX in-game name dalein.'
    };
  }

  if (tournament.joinedSlots >= tournament.maxSlots) {
    return {
      success: false,
      message: 'Ye tournament full ho chuka hai (All slots filled)!'
    };
  }

  if (tournament.status !== 'upcoming') {
    return {
      success: false,
      message: `Ye match abhi ${tournament.status} hai, isme naye registrations band hain.`
    };
  }

  const existing = await fetchUserTournamentRegistration(tournament.id, user.uid);
  if (existing) {
    return {
      success: false,
      message: `Aap pehle hi is match me register hain (Slot #${existing.slotNumber})!`
    };
  }

  const fee = tournament.entryFeeCoins || 0;
  if (fee > 0 && (user.coins || 0) < fee) {
    return {
      success: false,
      message: `Aapke wallet me paryapt coins nahi hain. Entry fee: ${fee} coins, aapke pass: ${user.coins || 0} coins.`
    };
  }

  const nextSlotNumber = (tournament.joinedSlots || 0) + 1;
  const participantId = `${tournament.id}_${user.uid}`;
  const participantData: TournamentParticipant = {
    id: participantId,
    tournamentId: tournament.id,
    userId: user.uid,
    userName: user.displayName || 'Gamer',
    userEmail: user.email || '',
    userPhoto: user.photoURL,
    freeFireName: trimmedName,
    freeFireUid: freeFireUid?.trim() || '',
    entryFeePaid: fee,
    slotNumber: nextSlotNumber,
    joinedAt: Date.now(),
    status: 'registered'
  };

  if (fee > 0) {
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        coins: increment(-fee),
        updatedAt: Date.now()
      });

      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        type: 'tournament_entry',
        amount: -fee,
        description: `Entry Fee: ${tournament.title} (FF IGN: ${trimmedName})`,
        timestamp: Date.now()
      });
    } catch (err) {
      console.warn('Failed to update balance in Firestore for tournament entry:', err);
    }
  }

  try {
    const partRef = doc(db, 'tournament_participants', participantId);
    await setDoc(partRef, participantData);
  } catch (err) {
    console.warn('Failed to save tournament participant in Firestore:', err);
  }

  try {
    const tourneyRef = doc(db, 'tournaments', tournament.id);
    await updateDoc(tourneyRef, {
      joinedSlots: increment(1),
      updatedAt: Date.now()
    });
  } catch (err) {
    console.warn('Failed to increment tournament joinedSlots in Firestore:', err);
  }

  const userKey = `ff_reg_${tournament.id}_${user.uid}`;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(userKey, JSON.stringify(participantData));
      const partColKey = `${LOCAL_PARTICIPANTS_PREFIX}${tournament.id}`;
      const rawCol = localStorage.getItem(partColKey);
      const colList: TournamentParticipant[] = rawCol ? JSON.parse(rawCol) : [];
      colList.push(participantData);
      localStorage.setItem(partColKey, JSON.stringify(colList));
    } catch {
      // ignore
    }
  }

  const currentTourneys = getLocalTournaments();
  const updatedTourneys = currentTourneys.map(t =>
    t.id === tournament.id ? { ...t, joinedSlots: (t.joinedSlots || 0) + 1 } : t
  );
  saveLocalTournaments(updatedTourneys);

  if (typeof window !== 'undefined') {
    if (fee > 0) {
      window.dispatchEvent(
        new CustomEvent('coin_balance_updated', {
          detail: {
            userId: user.uid,
            amount: -fee,
            type: 'tournament_entry',
            timestamp: Date.now()
          }
        })
      );
    }
    window.dispatchEvent(
      new CustomEvent('tournaments_updated', { detail: updatedTourneys })
    );
    window.dispatchEvent(
      new CustomEvent('tournament_joined', { detail: participantData })
    );
  }

  return {
    success: true,
    message: fee > 0
      ? `🎉 Congratulations! ${fee} Coins deduct karke aapka registration confirm ho gaya hai (Slot #${nextSlotNumber})!`
      : `🎉 Congratulations! Free Entry confirm ho gayi hai (Slot #${nextSlotNumber})!`,
    participant: participantData
  };
}

export async function distributeTournamentPrize(
  tournamentId: string,
  participantUserId: string,
  prizeCoins: number,
  note: string = 'Tournament Prize Winner'
): Promise<{ success: boolean; message: string }> {
  if (!tournamentId || !participantUserId || prizeCoins <= 0) {
    return { success: false, message: 'Invalid tournament, user or prize coin amount' };
  }

  try {
    const userRef = doc(db, 'users', participantUserId);
    await updateDoc(userRef, {
      coins: increment(prizeCoins),
      updatedAt: Date.now()
    });

    await addDoc(collection(db, 'transactions'), {
      userId: participantUserId,
      type: 'tournament_prize',
      amount: prizeCoins,
      description: `Free Fire Tournament Prize: ${note}`,
      timestamp: Date.now()
    });

    const partRef = doc(db, 'tournament_participants', `${tournamentId}_${participantUserId}`);
    await setDoc(partRef, { prizeWonCoins: prizeCoins }, { merge: true });
  } catch (err) {
    console.warn('Failed to distribute tournament prize in Firestore:', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('coin_balance_updated', {
        detail: {
          userId: participantUserId,
          amount: prizeCoins,
          type: 'tournament_prize',
          timestamp: Date.now()
        }
      })
    );
  }

  return {
    success: true,
    message: `₹${(prizeCoins / 100).toFixed(2)} (${prizeCoins} Coins) user wallet me successfully credit kar diye gaye!`
  };
}

export async function cancelTournamentAndRefund(
  tournamentId: string,
  reason: string = 'Match Cancelled by Admin'
): Promise<{ success: boolean; message: string }> {
  try {
    const participants = await fetchTournamentParticipants(tournamentId);
    let refundedCount = 0;

    for (const p of participants) {
      if (p.entryFeePaid > 0) {
        try {
          const userRef = doc(db, 'users', p.userId);
          await updateDoc(userRef, {
            coins: increment(p.entryFeePaid),
            updatedAt: Date.now()
          });

          await addDoc(collection(db, 'transactions'), {
            userId: p.userId,
            type: 'tournament_refund',
            amount: p.entryFeePaid,
            description: `Refund: ${reason} (Tournament ${tournamentId})`,
            timestamp: Date.now()
          });
          refundedCount++;
        } catch (e) {
          console.warn(`Failed refund for user ${p.userId}:`, e);
        }
      }
    }

    await updateTournament(tournamentId, {
      status: 'cancelled',
      winnerAnnouncement: `Match cancelled. ${reason}`
    });

    return {
      success: true,
      message: `Tournament cancelled. ${refundedCount} participants ko entry fee refund kar di gayi hai.`
    };
  } catch (err) {
    console.error('Cancel tournament error:', err);
    return { success: false, message: 'Tournament cancel karne me error aaya.' };
  }
}

// -------------------------------------------------------------
// FEATURE TOGGLES (Home Screen Button Visibility Controls)
// -------------------------------------------------------------
export const DEFAULT_FEATURE_TOGGLES: FeatureToggles = {
  showGiveaway: true,
  showTournaments: true,
};

const FEATURE_TOGGLES_LOCAL_KEY = 'rewardluxe_feature_toggles';

export function getLocalFeatureToggles(): FeatureToggles {
  if (typeof window === 'undefined') return DEFAULT_FEATURE_TOGGLES;
  try {
    const raw = localStorage.getItem(FEATURE_TOGGLES_LOCAL_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        showGiveaway: parsed.showGiveaway !== false,
        showTournaments: parsed.showTournaments !== false,
        updatedAt: parsed.updatedAt
      };
    }
  } catch {}
  return DEFAULT_FEATURE_TOGGLES;
}

export function setLocalFeatureToggles(toggles: FeatureToggles): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FEATURE_TOGGLES_LOCAL_KEY, JSON.stringify(toggles));
  } catch {}
}

export async function fetchFeatureToggles(): Promise<FeatureToggles> {
  try {
    const docRef = doc(db, 'settings', 'feature_toggles');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const merged: FeatureToggles = {
        showGiveaway: data.showGiveaway !== false,
        showTournaments: data.showTournaments !== false,
        updatedAt: data.updatedAt || Date.now()
      };
      setLocalFeatureToggles(merged);
      return merged;
    } else {
      const initToggles: FeatureToggles = {
        ...DEFAULT_FEATURE_TOGGLES,
        updatedAt: Date.now()
      };
      await setDoc(docRef, initToggles);
      setLocalFeatureToggles(initToggles);
      return initToggles;
    }
  } catch (err) {
    console.warn('Failed to fetch feature toggles from Firestore:', err);
    return getLocalFeatureToggles();
  }
}

export function subscribeToFeatureToggles(
  callback: (toggles: FeatureToggles) => void
): () => void {
  callback(getLocalFeatureToggles());

  let unsubscribeFirestore = () => {};

  try {
    const docRef = doc(db, 'settings', 'feature_toggles');
    unsubscribeFirestore = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const merged: FeatureToggles = {
            showGiveaway: data.showGiveaway !== false,
            showTournaments: data.showTournaments !== false,
            updatedAt: data.updatedAt
          };
          setLocalFeatureToggles(merged);
          callback(merged);
        } else {
          callback(DEFAULT_FEATURE_TOGGLES);
        }
      },
      (error) => {
        console.warn('Feature toggles snapshot listener error:', error);
      }
    );
  } catch (e) {
    console.warn('Could not attach Firestore listener for feature toggles:', e);
  }

  const handleLocalUpdate = (e: Event) => {
    const custom = e as CustomEvent<FeatureToggles>;
    if (custom.detail) {
      callback(custom.detail);
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('feature_toggles_updated', handleLocalUpdate);
  }

  return () => {
    unsubscribeFirestore();
    if (typeof window !== 'undefined') {
      window.removeEventListener('feature_toggles_updated', handleLocalUpdate);
    }
  };
}

export async function updateFeatureToggles(
  updates: Partial<FeatureToggles>
): Promise<FeatureToggles> {
  const current = getLocalFeatureToggles();
  const updated: FeatureToggles = {
    ...current,
    ...updates,
    updatedAt: Date.now()
  };

  setLocalFeatureToggles(updated);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('feature_toggles_updated', {
        detail: updated
      })
    );
  }

  try {
    const docRef = doc(db, 'settings', 'feature_toggles');
    await setDoc(docRef, updated, { merge: true });
  } catch (err) {
    console.warn('Failed to update feature toggles in Firestore:', err);
  }

  return updated;
}



