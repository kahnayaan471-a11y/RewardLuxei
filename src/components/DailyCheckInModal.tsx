import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Flame, Check, X, CalendarCheck, CheckCircle2 } from 'lucide-react';
import { GoldCoin } from './GoldCoin';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { claimDailyCheckIn, DAILY_CHECKIN_REWARDS, getTodayDateString, getYesterdayDateString } from '../services/coinService';
import { sound } from '../utils/sound';

interface DailyCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth: () => void;
}

export const DailyCheckInModal: React.FC<DailyCheckInModalProps> = ({ isOpen, onClose, onOpenAuth }) => {
  const { profile, currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successReward, setSuccessReward] = useState<number | null>(null);

  if (!isOpen) return null;

  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();
  const hasClaimedToday = profile?.lastCheckInDate === today;
  
  // Active streak verification: valid only if checked in yesterday or already claimed today
  const isStreakActive = profile?.lastCheckInDate === yesterday || hasClaimedToday;
  const currentStreak = isStreakActive ? (profile?.dailyStreak || 0) : 0;
  
  const nextStreakDay = hasClaimedToday
    ? (((currentStreak - 1) % 7) + 1)
    : ((currentStreak % 7) + 1);

  const handleClaim = async () => {
    if (!currentUser || !profile) {
      onOpenAuth();
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await claimDailyCheckIn(profile.uid);
      setSuccessReward(res.reward);
      sound.playWin();

      // Confetti burst
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Check-in failed';
      setErrorMsg(msg);
      sound.playError();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-amber-100 relative overflow-hidden"
      >
        {/* Decorative background glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-200/50 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-orange-200/50 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-orange-100 to-amber-100 border border-orange-200 text-orange-800 px-3.5 py-1.5 rounded-full text-xs font-black mb-2.5 shadow-xs">
            <CalendarCheck className="w-4 h-4 text-orange-600" />
            <Flame className="w-4 h-4 text-orange-500 fill-orange-500 animate-pulse" />
            <span>Streak: {currentStreak} Days</span>
          </div>
          <h3 className="font-display text-2xl font-black text-slate-900 flex items-center justify-center gap-2">
            <GoldCoin className="w-7 h-7 drop-shadow-sm" />
            <span>Daily Check-In Bonus</span>
          </h3>
          <p className="text-xs text-slate-700 mt-1.5 font-medium leading-relaxed">
            Claim <strong>10 Coins daily</strong> and a grand <strong>50 Coins on Day 7</strong>! If you miss a day, streak resets to Day 1.
          </p>
        </div>

        {/* 7-Day Grid */}
        <div className="grid grid-cols-4 gap-2.5 mb-6">
          {DAILY_CHECKIN_REWARDS.map((coins, index) => {
            const dayNum = index + 1;
            const completedDaysInCycle = hasClaimedToday
              ? (((currentStreak - 1) % 7) + 1)
              : (currentStreak % 7);
            const isCompleted = isStreakActive && dayNum <= completedDaysInCycle;
            const isTodayTarget = !hasClaimedToday && dayNum === nextStreakDay;
            const isDay7 = dayNum === 7;

            return (
              <div
                key={`checkin-day-${dayNum}-${index}`}
                className={`relative rounded-2xl p-2.5 text-center flex flex-col items-center justify-between border transition-all ${
                  isDay7 ? 'col-span-2 bg-gradient-to-r from-amber-100 via-yellow-100 to-orange-100 border-amber-400 shadow-md shadow-amber-500/15' : ''
                } ${
                  isTodayTarget
                    ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950 border-amber-500 ring-2 ring-amber-400 ring-offset-2 shadow-lg shadow-amber-500/30'
                    : isCompleted
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <span className={`text-[11px] font-black ${isTodayTarget ? 'text-slate-950' : isCompleted ? 'text-emerald-800' : 'text-slate-700'}`}>
                  Day {dayNum} {isDay7 ? '⭐ Grand' : ''}
                </span>

                <div className="my-1.5 flex items-center justify-center">
                  {isCompleted ? (
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                      <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                    </div>
                  ) : isDay7 ? (
                    <div className="flex items-center justify-center">
                      <GoldCoin className={`w-9 h-9 drop-shadow-md ${isTodayTarget ? 'animate-bounce scale-110' : ''}`} />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <GoldCoin className={`w-7 h-7 drop-shadow-xs ${isTodayTarget ? 'scale-110 animate-pulse' : ''}`} />
                    </div>
                  )}
                </div>

                <div className={`flex items-center gap-1 font-display font-black text-xs ${isTodayTarget ? 'text-slate-950' : isCompleted ? 'text-emerald-700' : isDay7 ? 'text-amber-900 font-extrabold' : 'text-slate-800'}`}>
                  <span>+{coins}</span>
                  <GoldCoin className="w-3 h-3 drop-shadow-xs" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Error or Success Notice */}
        {errorMsg && (
          <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 font-semibold text-center">
            {errorMsg}
          </div>
        )}

        {successReward && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
            <div className="font-display font-black text-lg text-emerald-700 flex items-center justify-center gap-1.5">
              <GoldCoin className="w-6 h-6 drop-shadow-xs" />
              <span>+{successReward} Coins Credited!</span>
            </div>
            <p className="text-xs text-emerald-600 mt-0.5">Coins have been added to your wallet.</p>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleClaim}
          disabled={loading || hasClaimedToday}
          className={`w-full py-3.5 px-4 rounded-2xl font-display font-extrabold text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer ${
            hasClaimedToday
              ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 shadow-amber-500/25'
          }`}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
          ) : hasClaimedToday ? (
            <>
              <Check className="w-4 h-4 text-emerald-500" />
              <span>Already Claimed Today (Come back tomorrow)</span>
            </>
          ) : (
            <>
              <GoldCoin className="w-5 h-5 drop-shadow-xs" />
              <span>Claim Today's Bonus (+{DAILY_CHECKIN_REWARDS[nextStreakDay - 1]} Coins)</span>
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
};
