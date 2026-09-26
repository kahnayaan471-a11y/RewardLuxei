import React, { useState, useEffect } from 'react';
import { 
  X, 
  XOctagon, 
  ShieldAlert, 
  AlertTriangle, 
  Lock, 
  MessageSquare, 
  LogOut, 
  Copy, 
  Check, 
  Ban,
  ShieldX,
  AlertOctagon
} from 'lucide-react';
import { UserProfile } from '../types';
import { sound } from '../utils/sound';
import { SupportChatModal } from './SupportChatModal';

interface BannedUserScreenProps {
  profile: UserProfile | null;
  onLogout: () => Promise<void> | void;
}

export const BannedUserScreen: React.FC<BannedUserScreenProps> = ({ profile, onLogout }) => {
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Play warning buzzer once on screen mount
  useEffect(() => {
    try {
      sound.playError();
    } catch {
      // Audio context might be restricted before user gesture
    }
  }, []);

  const handleCopyUid = () => {
    if (!profile?.uid) return;
    navigator.clipboard.writeText(profile.uid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await onLogout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] min-h-screen w-screen overflow-y-auto bg-[#070913] text-white flex flex-col items-center justify-between p-4 sm:p-6 md:p-8 selection:bg-rose-500 selection:text-white">
      {/* Top Warning Hazard Bar */}
      <div className="w-full max-w-4xl flex items-center justify-between py-2 px-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs font-mono font-bold tracking-widest uppercase mb-4 shadow-lg shadow-rose-950/50">
        <span className="flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 text-rose-500 animate-pulse" />
          <span>SECURITY ALERT // SYSTEM ENFORCEMENT</span>
        </span>
        <span className="bg-rose-500/20 text-rose-400 px-2.5 py-0.5 rounded-md border border-rose-500/40 font-black">
          STATUS: BANNED
        </span>
      </div>

      {/* Main Center Content Container */}
      <div className="max-w-2xl w-full my-auto flex flex-col items-center text-center relative py-4">
        {/* Ambient Glowing Background Halos */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 sm:w-96 md:w-[480px] h-72 sm:h-96 md:h-[480px] bg-rose-600/15 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none -z-10" />

        {/* ❌ KHOOB BADA RONG (GIANT WRONG / BANNED CROSS MARK) ❌ */}
        <div className="relative mb-6 flex items-center justify-center">
          {/* Outer Ping Shockwave Ring */}
          <div className="absolute w-44 h-44 sm:w-56 sm:h-56 md:w-64 md:h-64 rounded-full border-2 border-rose-500/30 animate-ping opacity-25 pointer-events-none" />
          
          {/* Outer Rotating Hazard Ring */}
          <div className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 rounded-full border-4 border-dashed border-rose-500/40 flex items-center justify-center bg-rose-950/20 backdrop-blur-md p-3 shadow-[0_0_50px_rgba(225,29,72,0.35)]">
            
            {/* Core Shield / Circle */}
            <div className="w-full h-full rounded-full bg-gradient-to-b from-rose-600 via-rose-700 to-rose-950 border-4 border-rose-400/80 shadow-[0_0_60px_rgba(244,63,94,0.8),inset_0_0_20px_rgba(0,0,0,0.7)] flex items-center justify-center relative overflow-hidden group">
              
              {/* Internal glowing shine reflection */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none" />
              
              {/* THE GIANT WRONG MARK (❌) */}
              <svg 
                viewBox="0 0 100 100" 
                className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 drop-shadow-[0_0_20px_rgba(255,255,255,0.9)] animate-in zoom-in-50 duration-300"
                fill="none" 
                stroke="currentColor"
              >
                {/* Thick Wrong Cross Stroke */}
                <line 
                  x1="22" y1="22" x2="78" y2="78" 
                  stroke="white" 
                  strokeWidth="14" 
                  strokeLinecap="round" 
                />
                <line 
                  x1="78" y1="22" x2="22" y2="78" 
                  stroke="white" 
                  strokeWidth="14" 
                  strokeLinecap="round" 
                />
                <line 
                  x1="22" y1="22" x2="78" y2="78" 
                  stroke="#ffe4e6" 
                  strokeWidth="8" 
                  strokeLinecap="round" 
                />
                <line 
                  x1="78" y1="22" x2="22" y2="78" 
                  stroke="#ffe4e6" 
                  strokeWidth="8" 
                  strokeLinecap="round" 
                />
              </svg>

              {/* Little lock badge at center */}
              <div className="absolute bottom-2 bg-black/80 px-2 py-0.5 rounded-full border border-rose-500/50 flex items-center gap-1 text-[10px] font-mono text-rose-300">
                <Lock className="w-2.5 h-2.5 text-rose-400" />
                <span>LOCKED</span>
              </div>
            </div>
          </div>

          {/* Angled Red Ban Stamp */}
          <div className="absolute -bottom-3 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white font-black text-[11px] sm:text-xs md:text-sm px-4 py-1 rounded-full border-2 border-white/80 shadow-2xl tracking-wider uppercase flex items-center gap-1.5 shadow-rose-950">
            <Ban className="w-4 h-4 text-white shrink-0" />
            <span>ID BAND / BANNED HAI</span>
          </div>
        </div>

        {/* Primary Ban Heading */}
        <h1 className="font-display font-black text-2xl sm:text-3xl md:text-4xl text-white tracking-tight mb-2">
          ACCOUNT SUSPENDED <span className="text-rose-500">• BANNED</span>
        </h1>
        <p className="text-sm sm:text-base text-rose-200/90 font-medium max-w-lg mb-6 leading-relaxed">
          Admin dwara aapki ID ko <strong className="text-rose-400 underline decoration-rose-500">permanent ban</strong> kar diya gaya hai. Is ID par sabhi suvidhaayein, wallet aur withdrawal block hain.
        </p>

        {/* Account Details & Restriction Dossier Card */}
        <div className="w-full bg-[#0E1424]/90 border-2 border-rose-500/40 rounded-3xl p-5 sm:p-6 text-left shadow-2xl backdrop-blur-xl relative overflow-hidden mb-6">
          {/* Subtle watermarked ban icon in background */}
          <ShieldX className="w-48 h-48 text-rose-500/5 absolute -right-8 -bottom-8 pointer-events-none" />

          {/* User Profile Snippet */}
          <div className="flex items-center gap-4 pb-4 border-b border-slate-800">
            <div className="relative">
              <img 
                src={profile?.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${profile?.uid || 'banned'}`}
                alt={profile?.displayName || 'User'}
                className="w-14 h-14 rounded-2xl object-cover grayscale border-2 border-rose-500/60 shadow-lg shadow-rose-950/50"
              />
              <div className="absolute -top-1 -right-1 bg-rose-600 rounded-full p-1 text-white shadow">
                <X className="w-3 h-3 stroke-[3]" />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display font-black text-base sm:text-lg text-white truncate">
                  {profile?.displayName || 'Banned User'}
                </h3>
                <span className="text-[10px] bg-rose-500/20 text-rose-400 font-black px-2 py-0.5 rounded-full border border-rose-500/40">
                  ID: BANNED
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                {profile?.email || 'No email registered'}
              </p>
            </div>
          </div>

          {/* UID & Suspension Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4 border-b border-slate-800 text-xs">
            <div className="bg-[#080C18] p-2.5 rounded-xl border border-slate-800/80">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>User ID (UID)</span>
                <button 
                  onClick={handleCopyUid}
                  className="text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 font-sans font-bold cursor-pointer"
                  title="Copy UID to share with Admin"
                >
                  {copiedUid ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedUid ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="font-mono text-[11px] text-slate-300 select-all truncate">
                {profile?.uid || 'UID Unavailable'}
              </p>
            </div>

            <div className="bg-[#080C18] p-2.5 rounded-xl border border-slate-800/80">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                Ban Enforcement Action
              </div>
              <p className="font-semibold text-rose-400 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>Admin Ban / Rule Violation</span>
              </p>
            </div>
          </div>

          {/* Restricted Services List */}
          <div className="pt-3">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              All Services Terminated (Blocked Features):
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-semibold">
              <div className="bg-rose-950/30 border border-rose-500/20 text-rose-300 p-2 rounded-xl flex items-center gap-1.5">
                <X className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>Coin Wallet Frozen</span>
              </div>
              <div className="bg-rose-950/30 border border-rose-500/20 text-rose-300 p-2 rounded-xl flex items-center gap-1.5">
                <X className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>Withdrawals Blocked</span>
              </div>
              <div className="bg-rose-950/30 border border-rose-500/20 text-rose-300 p-2 rounded-xl flex items-center gap-1.5">
                <X className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>Tasks & Spin Disabled</span>
              </div>
              <div className="bg-rose-950/30 border border-rose-500/20 text-rose-300 p-2 rounded-xl flex items-center gap-1.5">
                <X className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>Referrals Inactive</span>
              </div>
            </div>
          </div>
        </div>

        {/* Appeal / Action Buttons */}
        <div className="w-full flex flex-col sm:flex-row items-center gap-3">
          {/* Support / Appeal Button */}
          <button
            onClick={() => setIsSupportOpen(true)}
            className="w-full sm:flex-1 py-3.5 px-5 bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-display font-black rounded-2xl text-sm sm:text-base shadow-xl shadow-rose-950/60 transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2 border border-rose-400/40"
          >
            <MessageSquare className="w-5 h-5 text-white" />
            <span>Contact Admin / Appeal (सपोर्ट)</span>
          </button>

          {/* Log Out Button */}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full sm:w-auto py-3.5 px-6 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-bold rounded-2xl text-sm border border-slate-700/80 transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            <span>{isLoggingOut ? 'Logging out...' : 'Log Out (लॉगआउट)'}</span>
          </button>
        </div>
      </div>

      {/* Bottom Footer Notice */}
      <div className="text-center text-xs text-slate-500 mt-4 max-w-lg font-mono">
        Rewardluxe Security & Enforcement System • Unauthorized attempts to bypass this suspension will lead to permanent device IP blacklisting.
      </div>

      {/* Support Chat Modal so user can directly appeal to admin */}
      {isSupportOpen && (
        <SupportChatModal 
          isOpen={isSupportOpen} 
          onClose={() => setIsSupportOpen(false)} 
        />
      )}
    </div>
  );
};
