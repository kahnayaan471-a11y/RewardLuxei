import React from 'react';
import { Home, UserPlus, Trophy, User } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export type TabType = 'home' | 'referral' | 'leaderboard' | 'profile';

interface NavigationProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onChangeTab }) => {
  const { isDark } = useTheme();

  const tabs = [
    { id: 'home' as TabType, label: 'Home', icon: Home },
    { id: 'referral' as TabType, label: 'Refer', icon: UserPlus },
    { id: 'leaderboard' as TabType, label: 'Leaderboard', icon: Trophy },
    { id: 'profile' as TabType, label: 'Profile', icon: User },
  ];

  return (
    <div className="fixed bottom-4 left-0 right-0 z-40 px-4 flex justify-center pointer-events-none">
      <nav
        aria-label="Bottom Navigation"
        className={`pointer-events-auto w-full max-w-md ${
          isDark ? 'bg-[#0F172A]/95 border-slate-800 shadow-2xl' : 'bg-white/95 border-slate-100 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.12),0_8px_10px_-6px_rgba(0,0,0,0.08)]'
        } backdrop-blur-md rounded-3xl py-2 px-3 border flex items-center justify-around transition-colors duration-200`}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={`nav-tab-${tab.id}`}
              onClick={() => onChangeTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl transition-all duration-200 relative cursor-pointer ${
                isActive
                  ? 'text-amber-500 font-black scale-105'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 font-semibold'
              }`}
            >
              <div
                className={`w-10 h-7 flex items-center justify-center rounded-xl transition-all ${
                  isActive
                    ? isDark
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-amber-50 text-amber-600'
                    : isDark
                    ? 'text-slate-400'
                    : 'text-slate-600'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
              </div>
              <span
                className={`text-[11px] mt-0.5 tracking-tight font-bold ${
                  isActive
                    ? 'text-amber-500'
                    : isDark
                    ? 'text-slate-400'
                    : 'text-slate-600'
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 absolute bottom-0.5" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
