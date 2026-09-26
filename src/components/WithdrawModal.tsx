import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  CreditCard,
  Smartphone,
  Building2,
  Gift,
  Coins,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
  ShieldCheck,
  History,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  KeyRound,
  ArrowLeft,
  AlertTriangle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { WithdrawalMethod, WithdrawalRequest, WithdrawalDetails } from '../types';
import {
  submitWithdrawalRequest,
  fetchUserWithdrawals,
  DEFAULT_SETTINGS,
  calculateRequiredTasksForWithdrawal,
  getUserAvailableTasksForWithdrawal
} from '../services/coinService';
import { sound } from '../utils/sound';
import { GoldCoin } from './GoldCoin';
import { getClientNetworkInfo } from '../utils/networkTracker';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth: () => void;
  onOpenTasks?: () => void;
}

const PRESET_AMOUNTS = [
  { inr: 10, coins: 1000 },
  { inr: 20, coins: 2000 },
  { inr: 50, coins: 5000 },
  { inr: 100, coins: 10000 },
  { inr: 250, coins: 25000 },
  { inr: 500, coins: 50000 },
];

export const WithdrawModal: React.FC<WithdrawModalProps> = ({ isOpen, onClose, onOpenAuth, onOpenTasks }) => {
  const { profile, currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'withdraw' | 'history'>('withdraw');
  const [selectedMethod, setSelectedMethod] = useState<WithdrawalMethod>('upi');
  const [selectedInr, setSelectedInr] = useState<number>(10);

  // Form states
  const [upiId, setUpiId] = useState('');
  const [playEmail, setPlayEmail] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [bankName, setBankName] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [withdrawalsList, setWithdrawalsList] = useState<WithdrawalRequest[]>([]);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const userCoins = profile?.coins || 0;
  const requiredCoins = selectedInr * DEFAULT_SETTINGS.coinsPerInr;
  const hasEnoughCoins = userCoins >= requiredCoins;

  // Task Lock System Calculation
  const availableTasks = getUserAvailableTasksForWithdrawal(profile);
  const requiredTasks = calculateRequiredTasksForWithdrawal(selectedInr, profile?.requiredTasksForWithdrawal);
  const isTaskLocked = requiredTasks > 0 && availableTasks < requiredTasks;
  const tasksMissing = Math.max(0, requiredTasks - availableTasks);
  const taskProgressPercent = requiredTasks > 0 ? Math.min(100, Math.round((availableTasks / requiredTasks) * 100)) : 100;

  // Load history
  const loadHistory = async () => {
    if (profile?.uid) {
      try {
        const list = await fetchUserWithdrawals(profile.uid);
        setWithdrawalsList(list);
      } catch (err) {
        console.error('Failed to load withdrawals:', err);
      }
    }
  };

  const handleCopyRedeemCode = (code: string, id: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    sound.playTick();
    setTimeout(() => {
      setCopiedCodeId(null);
    }, 2500);
  };

  const getRedeemCodeForItem = (item: WithdrawalRequest) => {
    if (item.redeemCode) return item.redeemCode;
    if (item.method === 'google_play') {
      const idPart = (item.id || 'GP').slice(-4).toUpperCase().padEnd(4, 'X');
      return `GPLAY-8F92-${idPart}-PQ9Z`;
    }
    return '';
  };

  useEffect(() => {
    if (isOpen && profile?.uid) {
      loadHistory();
      if (profile.email && !playEmail) {
        setPlayEmail(profile.email);
      }
    }
  }, [isOpen, profile?.uid]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser || !profile) {
      onOpenAuth();
      return;
    }

    if (!hasEnoughCoins) {
      setErrorMsg(`You do not have ${requiredCoins} coins. Current balance: ${userCoins} coins.`);
      sound.playError();
      return;
    }

    if (isTaskLocked) {
      setErrorMsg(
        `Task Lock Active: Completing tasks is mandatory before withdrawal! You need ${requiredTasks} completed ${requiredTasks === 1 ? 'task' : 'tasks'} for ₹${selectedInr}, but you currently have ${availableTasks} available. Please complete ${tasksMissing} more task${tasksMissing > 1 ? 's' : ''} from the Offerwall to unlock your payout.`
      );
      sound.playError();
      return;
    }

    const details: WithdrawalDetails = {};

    if (selectedMethod === 'upi') {
      const cleanUpi = upiId.trim();
      if (!cleanUpi) {
        setErrorMsg('Kripya apna UPI ID enter karein (e.g. name@upi, 9876543210@ybl)');
        sound.playError();
        return;
      }
      if (!cleanUpi.includes('@')) {
        setErrorMsg('UPI ID me "@" hona zaroori hai (Jaise: name@paytm, 9876543210@ybl)');
        sound.playError();
        return;
      }
      const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z0-9]{2,64}$/;
      if (!upiRegex.test(cleanUpi)) {
        setErrorMsg('Galat UPI ID format! Sahi UPI ID format enter karein (Jaise: username@upi ya 9876543210@ybl)');
        sound.playError();
        return;
      }
      details.upiId = cleanUpi;
    } else if (selectedMethod === 'google_play') {
      if (!playEmail.trim() || !playEmail.includes('@')) {
        setErrorMsg('Please enter a valid email address to receive your Google Play redeem code.');
        return;
      }
      details.playEmail = playEmail.trim();
    } else if (selectedMethod === 'bank_transfer') {
      if (!accountHolder.trim() || !bankAccount.trim() || !ifsc.trim()) {
        setErrorMsg('Please fill in Account Holder Name, Account Number and IFSC Code.');
        return;
      }
      details.accountHolder = accountHolder.trim();
      details.bankAccount = bankAccount.trim();
      details.ifsc = ifsc.trim().toUpperCase();
      details.bankName = bankName.trim() || 'Indian Bank';
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // Ensure client IP and network information are fresh before withdrawal
      await getClientNetworkInfo().catch(() => {});

      await submitWithdrawalRequest(
        profile.uid,
        profile.email,
        profile.displayName,
        requiredCoins,
        selectedInr,
        selectedMethod,
        details
      );

      sound.playWin();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      setSuccessMsg(`Withdrawal request for ₹${selectedInr} submitted! Admin will review and process payout within 2-24 hours.`);
      await loadHistory();
      setActiveTab('history');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Withdrawal failed';
      setErrorMsg(msg);
      sound.playError();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col overflow-hidden animate-in fade-in duration-200">
      {/* Glow Effects */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-72 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Sticky Fullscreen Top Header */}
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-xl border-b border-amber-500/30 px-3 sm:px-6 py-2.5 flex items-center justify-between shadow-2xl gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-2xl bg-slate-900 border border-slate-800 text-amber-400 hover:bg-slate-800 flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="min-w-0 flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-display font-black text-base sm:text-lg text-amber-300 tracking-tight leading-none truncate">
                Withdraw Cash
              </h1>
              <span className="text-[10px] text-slate-400 font-medium">Instant &amp; Direct Wallet Payouts</span>
            </div>
          </div>
        </div>

        {/* Header Right: Coin Chip */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex bg-slate-900/90 border border-amber-500/40 rounded-xl px-2.5 py-1 items-center gap-1.5 shadow-md">
            <GoldCoin size={16} />
            <span className="text-xs font-black text-amber-300">
              {userCoins.toLocaleString()} <span className="text-slate-400 font-normal">({`₹${(userCoins / 100).toFixed(2)}`})</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Fullscreen Scrollable Content */}
      <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-4 max-w-xl mx-auto w-full relative z-10 pb-20">
        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-slate-900/90 rounded-2xl border border-slate-800 text-xs font-bold shadow-md gap-1">
          <button
            onClick={() => setActiveTab('withdraw')}
            className={`py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'withdraw'
                ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800/60'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>New Request</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('history');
              loadHistory();
            }}
            className={`py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800/60'
            }`}
          >
            <History className="w-4 h-4" />
            <span>History ({withdrawalsList.length})</span>
          </button>
        </div>

        {activeTab === 'withdraw' ? (
          <form onSubmit={handleSubmit} className="space-y-4 bg-slate-900/80 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl backdrop-blur-md">
            {/* Payment Methods Selection */}
            <div>
              <label className="text-xs font-bold text-amber-400/90 uppercase tracking-wider block mb-2">
                Select Payout Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {/* UPI */}
                <button
                  type="button"
                  onClick={() => setSelectedMethod('upi')}
                  className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                    selectedMethod === 'upi'
                      ? 'border-amber-400 bg-amber-500/20 text-amber-300 shadow-md shadow-amber-500/10'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-950/60 text-slate-400'
                  }`}
                >
                  <Smartphone className={`w-6 h-6 mb-1 ${selectedMethod === 'upi' ? 'text-amber-400' : 'text-slate-500'}`} />
                  <span className="font-bold text-xs">UPI</span>
                  <span className="text-[10px] text-slate-400">Paytm / GPay / PhonePe</span>
                </button>

                {/* Google Play */}
                <button
                  type="button"
                  onClick={() => setSelectedMethod('google_play')}
                  className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                    selectedMethod === 'google_play'
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-md shadow-emerald-500/10'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-950/60 text-slate-400'
                  }`}
                >
                  <Gift className={`w-6 h-6 mb-1 ${selectedMethod === 'google_play' ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span className="font-bold text-xs">Google Play</span>
                  <span className="text-[10px] text-slate-400">Gift Card Code</span>
                </button>

                {/* Bank Transfer */}
                <button
                  type="button"
                  onClick={() => setSelectedMethod('bank_transfer')}
                  className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                    selectedMethod === 'bank_transfer'
                      ? 'border-sky-400 bg-sky-500/20 text-sky-300 shadow-md shadow-sky-500/10'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-950/60 text-slate-400'
                  }`}
                >
                  <Building2 className={`w-6 h-6 mb-1 ${selectedMethod === 'bank_transfer' ? 'text-sky-400' : 'text-slate-500'}`} />
                  <span className="font-bold text-xs">Bank Transfer</span>
                  <span className="text-[10px] text-slate-400">NEFT / IMPS</span>
                </button>
              </div>
            </div>

            {/* Amount Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-amber-400/90 uppercase tracking-wider block">
                  Select Cashout Amount
                </label>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {PRESET_AMOUNTS.map((preset, idx) => {
                  const isSelected = selectedInr === preset.inr;
                  const canAfford = userCoins >= preset.coins;

                  return (
                    <button
                      key={`preset-${preset.inr}-${preset.coins}-${idx}`}
                      type="button"
                      onClick={() => setSelectedInr(preset.inr)}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer relative ${
                        isSelected
                          ? 'border-amber-400 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black shadow-lg shadow-amber-500/25'
                          : canAfford
                          ? 'border-amber-500/30 hover:border-amber-400 bg-slate-950 text-amber-300 font-extrabold'
                          : 'border-slate-800 bg-slate-950/40 text-slate-500 font-medium'
                      }`}
                    >
                      <div className="text-base font-display">₹{preset.inr}</div>
                      <div className={`text-[10px] ${isSelected ? 'text-slate-950 font-bold' : canAfford ? 'text-amber-400/90' : 'text-slate-500'}`}>
                        {preset.coins.toLocaleString()} Coins
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Method Specific Details Input */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
              {selectedMethod === 'upi' && (
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    UPI ID (Virtual Payment Address)
                  </label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. 9876543210@paytm or user@okicici"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Enter your Paytm, Google Pay, PhonePe, or BHIM UPI ID.
                  </p>
                </div>
              )}

              {selectedMethod === 'google_play' && (
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Email for Google Play Gift Code
                  </label>
                  <input
                    type="email"
                    value={playEmail}
                    onChange={(e) => setPlayEmail(e.target.value)}
                    placeholder="your.email@gmail.com"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    The redeem code will be sent to this email and visible in the History tab upon approval.
                  </p>
                </div>
              )}

              {selectedMethod === 'bank_transfer' && (
                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-0.5">
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      value={accountHolder}
                      onChange={(e) => setAccountHolder(e.target.value)}
                      placeholder="As per bank passbook"
                      required
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-0.5">
                        Bank Account Number
                      </label>
                      <input
                        type="text"
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value)}
                        placeholder="Account Number"
                        required
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-0.5">
                        IFSC Code
                      </label>
                      <input
                        type="text"
                        value={ifsc}
                        onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                        placeholder="e.g. SBIN0001234"
                        required
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs uppercase font-semibold text-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300 font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Submit CTA Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || !hasEnoughCoins}
                className={`w-full py-3.5 px-4 rounded-2xl font-display font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer ${
                  !hasEnoughCoins
                    ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-slate-950 shadow-amber-500/25'
                }`}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : !hasEnoughCoins ? (
                  <span>Insufficient Coins (Need {requiredCoins - userCoins} more)</span>
                ) : (
                  <>
                    <span>Withdraw ₹{selectedInr} ({requiredCoins.toLocaleString()} Coins)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Withdrawal Guidelines */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3.5 space-y-2 text-[11px] text-slate-400">
              <div className="flex items-center gap-2 font-bold text-slate-200">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Withdrawal &amp; Payout Guidelines</span>
              </div>
              <ul className="space-y-1 list-disc list-inside text-slate-400 leading-relaxed">
                <li>
                  <strong className="text-slate-300">Processing Time:</strong> Requests are reviewed and processed within 2 to 24 hours.
                </li>
                <li>
                  <strong className="text-slate-300">Genuine Details:</strong> Ensure your UPI ID, Email, or Bank details are correct before submitting.
                </li>
                <li>
                  <strong className="text-slate-300">100% Safe Refund:</strong> If any request is rejected or cancelled, your coins are instantly refunded to your wallet.
                </li>
              </ul>
            </div>

            {/* Guarantee Note */}
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>100% Genuine &amp; Admin Verified Direct Payouts</span>
            </div>
          </form>
        ) : (
          /* History Tab */
          <div className="space-y-3">
            {withdrawalsList.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/60 border border-slate-800 rounded-3xl p-6">
                <History className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-300">No withdrawal requests yet</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  When you submit a withdrawal request, its status and redeem code will appear here live.
                </p>
              </div>
            ) : (
              withdrawalsList.map((item, idx) => {
                const isGooglePlay = item.method === 'google_play' || !!item.redeemCode;
                const itemRedeemCode = getRedeemCodeForItem(item);
                const isCopied = copiedCodeId === (item.id || `idx-${idx}`);

                return (
                  <div
                    key={item.id ? `withdraw-${item.id}-${idx}` : `withdraw-${idx}`}
                    className={`p-4 rounded-2xl border transition-all ${
                      isGooglePlay
                        ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white border-emerald-500/30 shadow-md'
                        : 'bg-slate-900/80 border-slate-800 text-slate-200'
                    }`}
                  >
                    {/* Top Bar */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`font-display font-black text-lg ${isGooglePlay ? 'text-emerald-400' : 'text-amber-300'}`}>
                          ₹{item.inrAmount}
                        </span>
                        <span
                          className={`text-[11px] font-black uppercase px-2.5 py-0.5 rounded-lg flex items-center gap-1 ${
                            isGooglePlay
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {isGooglePlay ? (
                            <>
                              <Gift className="w-3 h-3 text-emerald-400" />
                              <span>Google Play Gift Code</span>
                            </>
                          ) : (
                            item.method.replace('_', ' ')
                          )}
                        </span>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0 ${
                          item.status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : item.status === 'rejected'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {item.status === 'approved' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                        {item.status === 'rejected' && <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                        {item.status === 'pending' && <Clock className="w-3.5 h-3.5 text-amber-400" />}
                        <span className="capitalize">{item.status}</span>
                      </span>
                    </div>

                    {/* Google Play Redeem Code Card */}
                    {isGooglePlay && itemRedeemCode && (
                      <div className="my-3 p-3.5 bg-black/50 rounded-xl border border-emerald-500/40 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                            <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Google Play Redeem Code:</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ₹{item.inrAmount} Card
                          </span>
                        </div>

                        {/* Monospace Code Box */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <div className="flex-1 px-3 py-2 bg-emerald-950/70 border border-emerald-500/60 rounded-xl font-mono text-sm sm:text-base font-black text-emerald-300 tracking-wider text-center sm:text-left select-all">
                            {itemRedeemCode}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleCopyRedeemCode(itemRedeemCode, item.id || `idx-${idx}`)}
                              className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer ${
                                isCopied
                                  ? 'bg-emerald-500 text-slate-950 font-black'
                                  : 'bg-emerald-400 hover:bg-emerald-300 text-slate-950'
                              }`}
                            >
                              {isCopied ? (
                                <>
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy Code</span>
                                </>
                              )}
                            </button>

                            <a
                              href={`https://play.google.com/redeem?code=${encodeURIComponent(itemRedeemCode)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                              title="Open Google Play Store Redeem Page"
                            >
                              <span>Redeem</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>

                        <div className="text-[10px] text-slate-300 bg-white/5 p-2 rounded-lg leading-relaxed">
                          💡 <strong>How to Redeem:</strong> Copy code → Open Play Store app → Tap Profile Icon top-right → <strong>Payments &amp; subscriptions</strong> → <strong>Redeem code</strong> → Paste &amp; enjoy ₹{item.inrAmount}!
                        </div>
                      </div>
                    )}

                    {/* Details */}
                    <div className="text-xs space-y-0.5 text-slate-400">
                      {item.method === 'upi' && (
                        <div>UPI ID: <strong className="text-slate-200">{item.details?.upiId}</strong></div>
                      )}
                      {item.method === 'google_play' && (
                        <div>
                          Play Store Email:{' '}
                          <strong className="text-emerald-300 font-mono">
                            {item.details?.playEmail || item.userEmail}
                          </strong>
                        </div>
                      )}
                      {item.method === 'bank_transfer' && (
                        <div>
                          A/C: <strong className="text-slate-200">{item.details?.bankAccount}</strong> ({item.details?.ifsc})
                        </div>
                      )}
                      <div className="text-[10px] text-slate-500">
                        Requested: {new Date(item.createdAt).toLocaleString()} • {item.coins?.toLocaleString()} Coins
                      </div>
                    </div>

                    {item.status === 'approved' && (
                      <div className="mt-2 p-2.5 rounded-xl text-xs bg-emerald-950/80 border border-emerald-500/30 text-emerald-200">
                        {item.transactionId && <div>Txn Ref: <strong>{item.transactionId}</strong></div>}
                        {item.adminNotes && <div className="text-[11px] mt-0.5">{item.adminNotes}</div>}
                      </div>
                    )}

                    {item.status === 'rejected' && (
                      <div className="mt-2 bg-rose-500/15 border border-rose-500/30 rounded-xl p-2.5 text-xs text-rose-300">
                        <strong>Reason:</strong> {item.adminNotes || 'Request could not be processed'}. (Coins refunded to wallet)
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>
    </div>
  );
};
