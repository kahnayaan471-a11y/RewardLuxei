import React, { useState, useEffect } from 'react';
import { Clock, Flame, Sparkles, Timer } from 'lucide-react';

interface GiveawayCountdownTimerProps {
  endDate?: number;
  createdAt?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const GiveawayCountdownTimer: React.FC<GiveawayCountdownTimerProps> = ({
  endDate,
  createdAt,
  className = '',
  size = 'md'
}) => {
  // Determine target end timestamp (7 days from createdAt or default 7 days from now if not specified)
  const getTargetTime = (): number => {
    if (endDate && endDate > Date.now()) {
      return endDate;
    }
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    if (createdAt) {
      // Calculate 7 day cycles from creation
      const elapsed = Date.now() - createdAt;
      const cycles = Math.floor(elapsed / SEVEN_DAYS_MS);
      return createdAt + (cycles + 1) * SEVEN_DAYS_MS;
    }
    // Default 7 days from current time benchmark
    return Date.now() + SEVEN_DAYS_MS;
  };

  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  }>({ days: 7, hours: 0, minutes: 0, seconds: 0, isExpired: false });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const target = getTargetTime();
      const diff = target - Date.now();

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isExpired: false });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [endDate, createdAt]);

  const padNum = (num: number) => num.toString().padStart(2, '0');

  if (size === 'sm') {
    return (
      <div className={`inline-flex items-center gap-1.5 bg-slate-950/80 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-amber-300 font-mono text-xs font-black shadow-md ${className}`}>
        <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
        <span className="text-amber-200">
          {padNum(timeLeft.days)}d {padNum(timeLeft.hours)}h {padNum(timeLeft.minutes)}m {padNum(timeLeft.seconds)}s
        </span>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-2 border-amber-500/40 rounded-2xl p-3.5 sm:p-4 shadow-xl relative overflow-hidden text-white ${className}`}>
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />

      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center">
            <Timer className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <span className="text-[11px] font-black uppercase text-amber-300 tracking-wider flex items-center gap-1">
              <span>7-Days Mega Giveaway Countdown</span>
              <Sparkles className="w-3 h-3 text-amber-400" />
            </span>
            <p className="text-[10px] text-slate-400 font-medium">Draw starts when countdown hits 00:00:00</p>
          </div>
        </div>

        <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
          <Flame className="w-3 h-3 text-amber-400" />
          7D Live Timer
        </span>
      </div>

      {/* Countdown Digits Grid */}
      <div className="grid grid-cols-4 gap-2 sm:gap-2.5 text-center mt-1">
        {/* Days */}
        <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-2 sm:p-2.5 shadow-inner">
          <div className="font-mono text-lg sm:text-2xl font-black text-amber-300 tracking-tight leading-none">
            {padNum(timeLeft.days)}
          </div>
          <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Days</div>
        </div>

        {/* Hours */}
        <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-2 sm:p-2.5 shadow-inner">
          <div className="font-mono text-lg sm:text-2xl font-black text-amber-300 tracking-tight leading-none">
            {padNum(timeLeft.hours)}
          </div>
          <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Hours</div>
        </div>

        {/* Minutes */}
        <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-2 sm:p-2.5 shadow-inner">
          <div className="font-mono text-lg sm:text-2xl font-black text-amber-300 tracking-tight leading-none">
            {padNum(timeLeft.minutes)}
          </div>
          <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Mins</div>
        </div>

        {/* Seconds */}
        <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-2 sm:p-2.5 shadow-inner bg-amber-500/5">
          <div className="font-mono text-lg sm:text-2xl font-black text-amber-400 tracking-tight leading-none animate-pulse">
            {padNum(timeLeft.seconds)}
          </div>
          <div className="text-[9px] sm:text-[10px] font-bold text-amber-400/80 uppercase tracking-wider mt-1">Secs</div>
        </div>
      </div>
    </div>
  );
};
