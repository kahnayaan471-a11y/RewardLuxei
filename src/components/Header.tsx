import React from 'react';
import { User as UserIcon, Zap } from 'lucide-react';
import { GoldCoin } from './GoldCoin';
import { PWAInstallButton } from './PWAInstallButton';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getTodayDateString, getYesterdayDateString } from '../services/coinService';

interface HeaderProps {
  onOpenWithdraw: () => void;
  onOpenCheckIn: () => void;
  onOpenAuth: () => void;
  onOpenSupport?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenWithdraw,
  onOpenAuth
}) => {
  const { profile, currentUser } = useAuth();
  const { isDark } = useTheme();

  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();
  const isStreakActive = profile?.lastCheckInDate === yesterday || profile?.lastCheckInDate === today;
  const activeStreak = isStreakActive ? (profile?.dailyStreak || 0) : 0;

  return (
    <header className={`sticky top-0 z-30 ${isDark ? 'bg-[#0B0F19]/95 border-slate-800 text-white' : 'bg-white/95 border-slate-200/80 text-slate-900'} backdrop-blur-md border-b px-4 py-2.5 shadow-xs transition-colors duration-200`}>
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
        {/* Brand / Logo with Custom Gold Coin */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center drop-shadow-md">
            <GoldCoin className="w-10 h-10" />
          </div>
          <div>
            <span className={`font-display font-black text-xl tracking-tight leading-none flex items-center gap-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Reward<span className="text-amber-500">luxe</span>
            </span>
            <span className={`text-[10px] font-bold tracking-wider uppercase flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
              <Zap className="w-2.5 h-2.5 text-amber-500 fill-amber-500" /> Play &amp; Earn
            </span>
          </div>
        </div>

        {/* Right Action Badges */}
        <div className="flex items-center gap-2">
          {/* In-App PWA Install Prompt */}
          <PWAInstallButton />

          {/* Live Coin Wallet Button with Custom Gold Coin */}
          {currentUser && profile ? (
            <button
              onClick={onOpenWithdraw}
              className="group flex items-center gap-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-600 hover:to-yellow-500 text-slate-950 font-extrabold px-3 py-1.5 rounded-2xl shadow-md shadow-amber-500/25 active:scale-95 transition-all cursor-pointer border border-amber-300/80"
            >
              <GoldCoin className="w-5 h-5 drop-shadow-xs" />
              <span className="font-display text-sm tracking-tight text-slate-950 font-black">
                {(profile.coins || 0).toLocaleString()}
              </span>
              <span className="hidden sm:inline-block text-[11px] bg-slate-950/10 text-slate-900 px-1.5 py-0.5 rounded-md font-bold">
                ₹{((profile.coins || 0) / 100).toFixed(1)}
              </span>
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3.5 py-1.5 rounded-xl text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Login / Sign Up</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
