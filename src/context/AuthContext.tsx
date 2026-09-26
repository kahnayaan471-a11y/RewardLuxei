import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile as updateFirebaseProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, googleProvider, db } from '../lib/firebase';
import { UserProfile } from '../types';
import {
  initializeUserProfile,
  getCachedProfile,
  updateUserProfilePhoto as saveProfilePhotoToDb,
  updateUserDisplayName as saveDisplayNameToDb
} from '../services/coinService';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string, name: string, referralCode?: string) => Promise<void>;
  loginWithGoogle: (referralCode?: string) => Promise<void>;
  loginDemoUser: (role: 'user' | 'admin') => Promise<void>;
  updateProfilePhoto: (photoURL: string) => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const isEmailAdmin = (email?: string | null): boolean => {
  if (!email) return false;
  const em = email.toLowerCase().trim();
  return (
    em === 'kb124701@gmail.com' ||
    em === 'admin@coinrewards.com' ||
    em === 'admin@rewardluxe.com' ||
    em.startsWith('admin@') ||
    em.includes('admin')
  );
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen to Auth State and Realtime Firestore Profile
  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Fast instant render from cache if available
        const localCached = getCachedProfile(user.uid);
        if (localCached) {
          setProfile(localCached);
          setLoading(false);
        }

        try {
          // Initialize or load Firestore profile in background
          const userProf = await initializeUserProfile(
            user.uid,
            user.email || 'user@example.com',
            user.displayName || 'Player',
            user.photoURL || undefined
          );
          setProfile(userProf);

          if (unsubscribeProfile) {
            unsubscribeProfile();
          }

          // Real-time listener for profile updates (coins, streak, limits)
          unsubscribeProfile = onSnapshot(
            doc(db, 'users', user.uid),
            (snap) => {
              if (snap.exists()) {
                const data = snap.data() as UserProfile;
                setProfile(data);
              }
            },
            (snapshotError) => {
              console.warn('Firestore real-time sync operating in offline mode:', snapshotError?.message || snapshotError);
            }
          );

          setLoading(false);
        } catch (err) {
          console.warn('Error syncing profile from Firestore, using offline fallback:', err);
          setLoading(false);
        }
      } else {
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      if (unsubscribeProfile) unsubscribeProfile();
      unsubscribeAuth();
    };
  }, []);

  // Listen to Global Instant Coin & Progress Updates for Zero-Latency Feedback
  useEffect(() => {
    const handleCoinUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{
        userId?: string;
        amount?: number;
        type?: string;
        limitField?: 'spinsLeftToday' | 'scratchesLeftToday' | 'captchasLeftToday';
        newBalance?: number;
        dailyStreak?: number;
        lastCheckInDate?: string;
        referralCountDelta?: number;
        newReferralCount?: number;
        claimedReferralCoins?: number;
      }>;

      if (!customEvent.detail) return;
      const { amount, limitField, dailyStreak, lastCheckInDate, referralCountDelta, newReferralCount, claimedReferralCoins } = customEvent.detail;

      setProfile((prev) => {
        if (!prev) return prev;
        const currentCoins = Number(prev.coins) || 0;
        const addedAmount = Number(amount) || 0;
        // Always accumulate earned amount safely so coins never get reset
        const targetCoins = Math.max(0, currentCoins + addedAmount);
        const targetTotal = Math.max(0, (prev.totalEarned || 0) + (addedAmount > 0 ? addedAmount : 0));

        let targetReferrals = prev.referralCount || 0;
        if (typeof newReferralCount === 'number') {
          targetReferrals = Math.max(0, newReferralCount);
        } else if (typeof referralCountDelta === 'number') {
          targetReferrals = Math.max(0, targetReferrals + referralCountDelta);
        }

        const updated: UserProfile = {
          ...prev,
          coins: targetCoins,
          totalEarned: targetTotal,
          referralCount: targetReferrals,
          updatedAt: Date.now()
        };

        if (typeof claimedReferralCoins === 'number') {
          updated.claimedReferralCoins = claimedReferralCoins;
        }

        if (typeof dailyStreak === 'number') {
          updated.dailyStreak = dailyStreak;
        }
        if (lastCheckInDate) {
          updated.lastCheckInDate = lastCheckInDate;
        }

        if (limitField === 'spinsLeftToday') {
          updated.spinsLeftToday = Math.max(0, (prev.spinsLeftToday ?? 10) - 1);
        } else if (limitField === 'scratchesLeftToday') {
          updated.scratchesLeftToday = Math.max(0, (prev.scratchesLeftToday ?? 10) - 1);
        } else if (limitField === 'captchasLeftToday') {
          updated.captchasLeftToday = Math.max(0, (prev.captchasLeftToday ?? 20) - 1);
        }

        return updated;
      });
    };

    const handleBanUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ userId: string; isBanned: boolean }>;
      if (customEvent.detail) {
        setProfile((prev) => {
          if (prev && prev.uid === customEvent.detail.userId) {
            return { ...prev, isBanned: customEvent.detail.isBanned };
          }
          return prev;
        });
      }
    };

    window.addEventListener('coin_balance_updated', handleCoinUpdate);
    window.addEventListener('user_ban_status_updated', handleBanUpdate);
    return () => {
      window.removeEventListener('coin_balance_updated', handleCoinUpdate);
      window.removeEventListener('user_ban_status_updated', handleBanUpdate);
    };
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    const prof = await initializeUserProfile(cred.user.uid, cred.user.email || email, cred.user.displayName || 'Player');
    if (prof.isBanned) {
      setProfile(prof);
      return;
    }
  };

  const signupWithEmail = async (email: string, pass: string, name: string, referralCode?: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    if (name.trim()) {
      await updateFirebaseProfile(cred.user, { displayName: name.trim() });
    }
    const prof = await initializeUserProfile(
      cred.user.uid,
      cred.user.email || email,
      name.trim() || 'Player',
      undefined,
      referralCode
    );
    if (prof.isBanned) {
      setProfile(prof);
      return;
    }
  };

  const loginWithGoogle = async (referralCode?: string) => {
    const cred = await signInWithPopup(auth, googleProvider);
    const prof = await initializeUserProfile(
      cred.user.uid,
      cred.user.email || 'user@gmail.com',
      cred.user.displayName || 'Player',
      cred.user.photoURL || undefined,
      referralCode
    );
    if (prof.isBanned) {
      setProfile(prof);
      return;
    }
  };

  // Demo user for instant review or test without mandatory signup
  const loginDemoUser = async (role: 'user' | 'admin') => {
    const demoEmail = role === 'admin' ? 'admin@coinrewards.com' : 'demo_player@coinrewards.com';
    const demoPass = 'demo123456';
    try {
      await loginWithEmail(demoEmail, demoPass);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('suspended') || msg.includes('administrator')) {
        throw err;
      }
      // If doesn't exist, create it
      await signupWithEmail(demoEmail, demoPass, role === 'admin' ? 'Admin Master' : 'Lucky Player');
    }
  };

  // Update User Profile Photo
  const updateProfilePhoto = async (photoURL: string) => {
    if (!profile?.uid) return;
    try {
      await saveProfilePhotoToDb(profile.uid, photoURL);
      if (currentUser) {
        try {
          await updateFirebaseProfile(currentUser, { photoURL });
        } catch (e) {
          console.warn('Could not update Firebase auth photoURL:', e);
        }
      }
      setProfile((prev) => (prev ? { ...prev, photoURL, updatedAt: Date.now() } : prev));
    } catch (err) {
      console.error('Failed to update photo URL:', err);
      throw err;
    }
  };

  // Update User Display Name
  const updateDisplayName = async (displayName: string) => {
    if (!profile?.uid) return;
    try {
      await saveDisplayNameToDb(profile.uid, displayName);
      if (currentUser) {
        try {
          await updateFirebaseProfile(currentUser, { displayName });
        } catch (e) {
          console.warn('Could not update Firebase auth displayName:', e);
        }
      }
      setProfile((prev) => (prev ? { ...prev, displayName, updatedAt: Date.now() } : prev));
    } catch (err) {
      console.error('Failed to update display name:', err);
      throw err;
    }
  };

  // Reset password via email
  const resetPassword = async (email: string) => {
    if (!email || !email.trim()) {
      throw new Error('Please enter your email address');
    }
    await sendPasswordResetEmail(auth, email.trim());
  };

  const logout = async () => {
    await signOut(auth);
    setProfile(null);
  };

  const refreshProfile = () => {
    // onSnapshot already handles real-time updates
  };

  const isAdmin =
    profile?.role === 'admin' ||
    isEmailAdmin(profile?.email) ||
    isEmailAdmin(currentUser?.email);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        profile,
        loading,
        isAdmin: !!isAdmin,
        loginWithEmail,
        signupWithEmail,
        loginWithGoogle,
        loginDemoUser,
        updateProfilePhoto,
        updateDisplayName,
        resetPassword,
        logout,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
