import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Header } from './components/Header';
import { LivePayoutTicker } from './components/LivePayoutTicker';
import { Navigation, TabType } from './components/Navigation';
import { HomeDashboard } from './components/HomeDashboard';
import { ReferralView } from './components/ReferralView';
import { LeaderboardView } from './components/LeaderboardView';
import { ProfileView } from './components/ProfileView';
import { AdminPortalPage } from './components/AdminPortalPage';
import { DailyCheckInModal } from './components/DailyCheckInModal';
import { WithdrawModal } from './components/WithdrawModal';
import { AuthModal } from './components/AuthModal';
import { SupportChatModal } from './components/SupportChatModal';
import { PromoCodeModal } from './components/PromoCodeModal';
import { FullScreenGiveawayPage } from './components/FullScreenGiveawayPage';
import { FullScreenTournamentPage } from './components/FullScreenTournamentPage';
import { FullScreenSpinPage } from './components/FullScreenSpinPage';
import { FullScreenScratchPage } from './components/FullScreenScratchPage';
import { FullScreenCaptchaPage } from './components/FullScreenCaptchaPage';
import { TaskOfferwallView } from './components/TaskOfferwallView';
import { OfferDetailsView } from './components/OfferDetailsView';
import { BannedUserScreen } from './components/BannedUserScreen';
import { AppTask, UserTaskProgress } from './types';
import {
  fetchUserTaskProgress,
  subscribeToUserTaskProgress,
  fetchLeaderboard
} from './services/coinService';

export const checkIsAdminPath = () => {
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  const search = window.location.search.toLowerCase();
  return (
    path === '/admin' ||
    path.startsWith('/admin/') ||
    hash === '#admin' ||
    hash.startsWith('#/admin') ||
    hash.startsWith('#admin/') ||
    search.includes('admin=true') ||
    search.includes('page=admin') ||
    search.includes('page=admin-portal')
  );
};

const MainApp: React.FC = () => {
  const { profile, isAdmin, loading, logout } = useAuth();
  const { isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [leaderboardInitialTab, setLeaderboardInitialTab] = useState<'coins' | 'referrals'>('coins');
  const [profileInitialSubPage, setProfileInitialSubPage] = useState<'main' | 'refer_prize_pool' | 'coin_history' | 'referral_history'>('main');
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(checkIsAdminPath);

  // Modals state
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [isGiveawayOpen, setIsGiveawayOpen] = useState(false);
  const [isTournamentOpen, setIsTournamentOpen] = useState(false);
  const [isSpinFullScreenOpen, setIsSpinFullScreenOpen] = useState(false);
  const [isScratchFullScreenOpen, setIsScratchFullScreenOpen] = useState(false);
  const [isCaptchaFullScreenOpen, setIsCaptchaFullScreenOpen] = useState(false);
  const [isTasksFullScreenOpen, setIsTasksFullScreenOpen] = useState(false);
  const [tasksInitialTab, setTasksInitialTab] = useState<'available' | 'history'>('available');
  const [selectedOfferTask, setSelectedOfferTask] = useState<AppTask | null>(null);
  const [userTasksProgress, setUserTasksProgress] = useState<Record<string, UserTaskProgress>>({});

  useEffect(() => {
    if (profile?.uid) {
      const unsub = subscribeToUserTaskProgress(profile.uid, (prog) => {
        setUserTasksProgress(prog);
      });
      return () => {
        unsub();
      };
    }
  }, [profile?.uid]);

  // Pre-fetch leaderboard in background so clicking Leaderboard tab opens instantaneously (0ms)
  useEffect(() => {
    fetchLeaderboard(30).catch(() => {});
  }, []);

  // Listen to browser navigation (back/forward, URL hash change)
  useEffect(() => {
    const handleLocationChange = () => {
      setIsAdminRoute(checkIsAdminPath());
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setIsAdminRoute(checkIsAdminPath());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="font-display font-black text-xl text-slate-900">Rewardluxe</h2>
        <p className="text-xs text-slate-500 mt-1">Connecting to live database...</p>
      </div>
    );
  }

  // BANNED/SUSPENDED USER FULL-SCREEN OVERLAY (KHOOB BADA RONG / GIANT BAN SCREEN)
  if (profile?.isBanned && !isAdmin) {
    return <BannedUserScreen profile={profile} onLogout={logout} />;
  }

  // 1. ADMIN ROUTE (/admin) -> Exclusively opens Admin Portal & Control Center
  if (isAdminRoute) {
    return <AdminPortalPage />;
  }

  // 2. USER PANEL (/) -> Exclusively for Players
  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#070A12] text-slate-100' : 'bg-slate-50 text-slate-900'} flex flex-col selection:bg-amber-500 selection:text-white transition-colors duration-200`}>
      {/* Top Header */}
      <Header
        onOpenWithdraw={() => setIsWithdrawOpen(true)}
        onOpenCheckIn={() => setIsCheckInOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* Live Payout Trust Ticker */}
      <LivePayoutTicker />

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6">
        {activeTab === 'home' && (
          <HomeDashboard
            onOpenWithdraw={() => setIsWithdrawOpen(true)}
            onOpenCheckIn={() => setIsCheckInOpen(true)}
            onOpenAuth={() => setIsAuthOpen(true)}
            onOpenSpinFullScreen={() => setIsSpinFullScreenOpen(true)}
            onOpenScratchFullScreen={() => setIsScratchFullScreenOpen(true)}
            onOpenCaptchaFullScreen={() => setIsCaptchaFullScreenOpen(true)}
            onOpenTasks={() => {
              setTasksInitialTab('available');
              setIsTasksFullScreenOpen(true);
            }}
            onOpenPromoModal={() => setIsPromoModalOpen(true)}
            onSelectTask={(task) => setSelectedOfferTask(task)}
            onGoToReferral={() => setActiveTab('referral')}
            onGoToLeaderboard={() => {
              setLeaderboardInitialTab('coins');
              setActiveTab('leaderboard');
            }}
            onOpenGiveaway={() => {
              setIsGiveawayOpen(true);
            }}
            onOpenTournament={() => {
              setIsTournamentOpen(true);
            }}
          />
        )}

        {activeTab === 'referral' && (
          <ReferralView
            onOpenAuth={() => setIsAuthOpen(true)}
            onGoToLeaderboard={(tab = 'referrals') => {
              setLeaderboardInitialTab(tab);
              setActiveTab('leaderboard');
            }}
            onGoToPrizePool={() => {
              setIsGiveawayOpen(true);
            }}
          />
        )}

        {activeTab === 'leaderboard' && (
          <LeaderboardView
            initialTab={leaderboardInitialTab}
            onBack={() => setActiveTab('home')}
            onGoToReferral={() => setActiveTab('referral')}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            initialSubPage={profileInitialSubPage}
            onOpenWithdraw={() => setIsWithdrawOpen(true)}
            onOpenCheckIn={() => setIsCheckInOpen(true)}
            onOpenAuth={() => setIsAuthOpen(true)}
            onOpenSupport={() => setIsSupportOpen(true)}
            onOpenTasks={(initialTab) => {
              setTasksInitialTab(initialTab || 'history');
              setIsTasksFullScreenOpen(true);
            }}
          />
        )}
      </main>

      {/* Floating Bottom Navigation Bar */}
      <Navigation
        activeTab={activeTab}
        onChangeTab={(tab) => {
          if (tab === 'profile') {
            setProfileInitialSubPage('main');
          }
          setActiveTab(tab);
        }}
      />

      {/* Offer Details Full Screen Page matching screenshot */}
      {selectedOfferTask && (
        <div className="fixed inset-0 z-50 bg-[#F8F9FD] overflow-y-auto">
          <OfferDetailsView
            task={selectedOfferTask}
            progress={userTasksProgress[selectedOfferTask.id]}
            onBack={() => setSelectedOfferTask(null)}
            onOpenAuth={() => {
              setSelectedOfferTask(null);
              setIsAuthOpen(true);
            }}
            onProgressUpdated={(taskId, newProg) => {
              setUserTasksProgress(prev => ({ ...prev, [taskId]: newProg }));
            }}
          />
        </div>
      )}

      {/* Modals & Full Screen Pages */}
      {isTasksFullScreenOpen && (
        <div className="fixed inset-0 z-40 bg-slate-50 overflow-y-auto">
          <TaskOfferwallView
            initialTab={tasksInitialTab}
            userProgressProp={userTasksProgress}
            onBack={() => setIsTasksFullScreenOpen(false)}
            onSelectTask={(task) => {
              setSelectedOfferTask(task);
            }}
            onOpenAuth={() => {
              setIsTasksFullScreenOpen(false);
              setIsAuthOpen(true);
            }}
            onProgressUpdated={(taskId, newProg) => {
              setUserTasksProgress(prev => ({ ...prev, [taskId]: newProg }));
            }}
          />
        </div>
      )}

      {isSpinFullScreenOpen && (
        <FullScreenSpinPage
          onClose={() => setIsSpinFullScreenOpen(false)}
          onOpenAuth={() => {
            setIsSpinFullScreenOpen(false);
            setIsAuthOpen(true);
          }}
          onOpenWithdraw={() => {
            setIsSpinFullScreenOpen(false);
            setIsWithdrawOpen(true);
          }}
        />
      )}

      {isScratchFullScreenOpen && (
        <FullScreenScratchPage
          onClose={() => setIsScratchFullScreenOpen(false)}
          onOpenAuth={() => {
            setIsScratchFullScreenOpen(false);
            setIsAuthOpen(true);
          }}
          onOpenWithdraw={() => {
            setIsScratchFullScreenOpen(false);
            setIsWithdrawOpen(true);
          }}
        />
      )}

      {isCaptchaFullScreenOpen && (
        <FullScreenCaptchaPage
          onClose={() => setIsCaptchaFullScreenOpen(false)}
          onOpenAuth={() => {
            setIsCaptchaFullScreenOpen(false);
            setIsAuthOpen(true);
          }}
          onOpenWithdraw={() => {
            setIsCaptchaFullScreenOpen(false);
            setIsWithdrawOpen(true);
          }}
        />
      )}

      <DailyCheckInModal
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
        onOpenAuth={() => {
          setIsCheckInOpen(false);
          setIsAuthOpen(true);
        }}
      />

      <WithdrawModal
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        onOpenAuth={() => {
          setIsWithdrawOpen(false);
          setIsAuthOpen(true);
        }}
        onOpenTasks={() => {
          setIsWithdrawOpen(false);
          setIsTasksFullScreenOpen(true);
        }}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />

      <SupportChatModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        onOpenAuth={() => {
          setIsSupportOpen(false);
          setIsAuthOpen(true);
        }}
      />

      <PromoCodeModal
        isOpen={isPromoModalOpen}
        onClose={() => setIsPromoModalOpen(false)}
        onOpenAuth={() => {
          setIsPromoModalOpen(false);
          setIsAuthOpen(true);
        }}
      />

      {isGiveawayOpen && (
        <FullScreenGiveawayPage
          onClose={() => setIsGiveawayOpen(false)}
          onOpenAuth={() => {
            setIsGiveawayOpen(false);
            setIsAuthOpen(true);
          }}
          onOpenWithdraw={() => {
            setIsGiveawayOpen(false);
            setIsWithdrawOpen(true);
          }}
        />
      )}

      {isTournamentOpen && (
        <FullScreenTournamentPage
          onClose={() => setIsTournamentOpen(false)}
          onOpenAuth={() => {
            setIsTournamentOpen(false);
            setIsAuthOpen(true);
          }}
          onOpenWithdraw={() => {
            setIsTournamentOpen(false);
            setIsWithdrawOpen(true);
          }}
          onOpenTasks={() => {
            setIsTournamentOpen(false);
            setIsTasksFullScreenOpen(true);
          }}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
