import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Shield,
  Lock,
  Mail,
  LogIn,
  AlertCircle,
  CheckCircle2,
  LogOut,
  XCircle,
  ShieldAlert,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AdminPanel } from './AdminPanel';
import { sound } from '../utils/sound';

export const AdminPortalPage: React.FC = () => {
  const { currentUser, isAdmin, loginWithEmail, logout } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. If logged in as verified Admin -> Show full Admin Control Center
  if (currentUser && isAdmin) {
    return (
      <div className="min-h-screen bg-[#070A12] text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
        {/* Sleek Sub-header info bar */}
        <div className="bg-[#0B101D]/90 border-b border-indigo-500/20 px-4 py-2 flex items-center justify-between text-xs sticky top-0 z-40 backdrop-blur-md">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="font-mono bg-indigo-950/80 text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-500/30 font-black text-[11px]">
              /admin
            </span>
            <span className="font-bold text-white hidden sm:inline">Executive Console</span>
            <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Verified: {currentUser.email}
            </span>
          </div>

          <button
            onClick={logout}
            className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-bold rounded-lg border border-rose-500/30 flex items-center gap-1.5 transition-all cursor-pointer text-xs active:scale-95"
            title="Sign Out from Admin Panel"
          >
            <LogOut className="w-3 h-3 text-rose-400" />
            <span>Admin Logout</span>
          </button>
        </div>

        <div className="flex-1 w-full mx-auto">
          <AdminPanel onLogout={logout} />
        </div>
      </div>
    );
  }

  // Handle Email/Password Login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both Admin Email and Password');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      await loginWithEmail(email, password);
      sound.playWin();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Admin authentication failed';
      if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        setErrorMsg('Invalid Admin credentials. Check email & password.');
      } else {
        setErrorMsg(msg);
      }
      sound.playError();
    } finally {
      setLoading(false);
    }
  };

  // If a non-admin account is currently logged in
  const isUnauthorizedUser = currentUser && !isAdmin;

  return (
    <div className="min-h-screen bg-[#070A12] text-white flex flex-col justify-center items-center p-4 selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Background glow effects */}
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-40 -right-40 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-[#0E1524]/90 border border-indigo-500/25 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10"
      >
        {/* Top Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-500/25 border border-indigo-400/40">
            <Shield className="w-8 h-8 text-white stroke-[2.5]" />
          </div>

          <div className="inline-flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/30 px-3 py-1 rounded-full text-xs font-mono text-indigo-300 mb-2">
            <Lock className="w-3 h-3 text-indigo-400" />
            <span>PRO ADMIN GATEWAY (/admin)</span>
          </div>

          <h1 className="font-display font-black text-2xl text-white tracking-tight">
            Admin Authentication
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Restricted to authorized administrator credentials only
          </p>
        </div>

        {/* 2. CASE: Unauthorized Non-Admin User Logged In */}
        {isUnauthorizedUser ? (
          <div className="space-y-4">
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-xs text-rose-200">
              <div className="flex items-center gap-2 font-bold mb-1.5 text-rose-400">
                <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                <span>Access Denied (Unauthorized Email)</span>
              </div>
              <p className="text-slate-300 leading-relaxed mb-2">
                Aapne <strong className="text-white underline">{currentUser.email}</strong> se login kiya hai. Yeh account Admin Panel ke liye authorized nahi hai.
              </p>
              <div className="bg-[#070A12] p-2.5 rounded-xl border border-rose-500/20 text-slate-300 text-[11px] leading-snug">
                ⚠️ Admin Panel open karne ke liye authorized admin email (e.g. <span className="font-mono text-amber-300">kb124701@gmail.com</span>) se login karein.
              </div>
            </div>

            <button
              onClick={logout}
              className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-display font-bold text-xs rounded-xl shadow-lg shadow-rose-600/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out &amp; Login with Admin Email</span>
            </button>

            <button
              onClick={() => {
                window.history.pushState({}, '', '/');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700/60 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to User Panel</span>
            </button>
          </div>
        ) : (
          /* 3. CASE: Not Logged In -> Admin Login Screen */
          <div className="space-y-4">
            {/* Error Notification */}
            {errorMsg && (
              <div className="bg-rose-950/80 border border-rose-800 text-rose-200 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Email / Password Form */}
            <form onSubmit={handleEmailLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Admin Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="kb124701@gmail.com"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-[#131B2E] border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Security Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-[#131B2E] border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-display font-black text-sm rounded-xl shadow-lg shadow-indigo-500/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>{loading ? 'Authenticating Admin...' : 'Sign In to Admin Panel'}</span>
              </button>
            </form>
          </div>
        )}
      </motion.div>
    </div>
  );
};

