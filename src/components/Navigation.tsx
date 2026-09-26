import React from 'react';
import { Home, UserPlus, Trophy, User } from 'lucide-react';

export type TabType = 'home' | 'referral' | 'leaderboard' | 'profile';

interface NavigationProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onChangeTab }) => {
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
        className="pointer-events-auto w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl py-2 px-3 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.12),0_8px_10px_-6px_rgba(0,0,0,0.08)] border border-slate-100 flex items-center justify-around"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={`nav-tab-${tab.id}`}
              onClick={() => onChangeTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl transition-all duration-200 relative ${
                isActive
                  ? 'text-amber-600 font-bold scale-105'
                  : 'text-slate-700 hover:text-slate-800 font-medium'
              }`}
            >
              <div
                className={`w-10 h-7 flex items-center justify-center rounded-xl transition-all ${
                  isActive ? 'bg-amber-50 text-amber-600' : 'text-slate-700'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              </div>
              <span className={`text-[11px] mt-0.5 tracking-tight ${isActive ? 'text-amber-600 font-bold' : 'text-slate-700'}`}>
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
