import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Ticket,
  Plus,
  Search,
  Copy,
  Check,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Users,
  Coins,
  Clock,
  AlertCircle,
  RefreshCw,
  X,
  History,
  Tag
} from 'lucide-react';
import { GoldCoin } from './GoldCoin';
import { PromoCode, PromoCodeRedemption } from '../types';
import {
  fetchPromoCodes,
  createAdminPromoCode,
  updateAdminPromoCode,
  deleteAdminPromoCode,
  fetchAdminPromoRedemptions
} from '../services/coinService';
import { sound } from '../utils/sound';

export const AdminPromoCodesTab: React.FC = () => {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [redemptions, setRedemptions] = useState<PromoCodeRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [activeView, setActiveView] = useState<'codes' | 'redemptions'>('codes');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal State for Creating / Editing
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formCoins, setFormCoins] = useState<number>(100);
  const [formDescription, setFormDescription] = useState('');
  const [formMaxUses, setFormMaxUses] = useState<string>('');
  const [formExpiresAt, setFormExpiresAt] = useState<string>('');
  const [formActive, setFormActive] = useState<boolean>(true);
  const [formFeatured, setFormFeatured] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [codes, recentRedemptions] = await Promise.all([
        fetchPromoCodes(false),
        fetchAdminPromoRedemptions(100)
      ]);
      setPromoCodes(codes);
      setRedemptions(recentRedemptions);
    } catch (err) {
      console.error('Error loading promo codes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    sound.playTick();
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleActive = async (promo: PromoCode) => {
    try {
      const updatedStatus = !promo.active;
      await updateAdminPromoCode(promo.id, { active: updatedStatus });
      setPromoCodes(prev =>
        prev.map(p => (p.id === promo.id ? { ...p, active: updatedStatus } : p))
      );
      sound.playTick();
    } catch (err) {
      console.error('Error toggling promo status:', err);
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!window.confirm(`Are you sure you want to delete promo code "${code}"?`)) return;
    try {
      await deleteAdminPromoCode(id);
      setPromoCodes(prev => prev.filter(p => p.id !== id));
      sound.playTick();
    } catch (err) {
      console.error('Error deleting promo code:', err);
    }
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = formCode.trim().toUpperCase();

    if (!cleanCode) {
      setErrorMsg('Please enter a valid promo code name');
      return;
    }

    if (formCoins <= 0) {
      setErrorMsg('Reward coins must be greater than 0');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    try {
      let expiresTimestamp: number | null = null;
      if (formExpiresAt) {
        expiresTimestamp = new Date(formExpiresAt).getTime();
      }

      const created = await createAdminPromoCode({
        code: cleanCode,
        rewardCoins: Number(formCoins),
        description: formDescription.trim(),
        maxUses: formMaxUses ? Number(formMaxUses) : null,
        expiresAt: expiresTimestamp,
        active: formActive,
        isFeatured: formFeatured
      });

      setPromoCodes(prev => [created, ...prev]);
      setShowCreateModal(false);
      resetForm();
      sound.playWin();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to create promo code');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFormCode('');
    setFormCoins(100);
    setFormDescription('');
    setFormMaxUses('');
    setFormExpiresAt('');
    setFormActive(true);
    setFormFeatured(false);
    setErrorMsg('');
  };

  // Math & Stats
  const totalCodes = promoCodes.length;
  const activeCodes = promoCodes.filter(p => p.active).length;
  const totalRedemptionsCount = promoCodes.reduce((sum, p) => sum + (p.usedCount || 0), 0);
  const totalCoinsDistributed = promoCodes.reduce(
    (sum, p) => sum + (p.usedCount || 0) * (p.rewardCoins || 0),
    0
  );

  // Filtered List
  const filteredCodes = promoCodes.filter(p => {
    if (statusFilter === 'active' && !p.active) return false;
    if (statusFilter === 'inactive' && p.active) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.code.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4 text-slate-100">
      {/* 1. Top KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#0E1524] p-4 rounded-xl border border-slate-800/80 shadow-xs">
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <Ticket className="w-3.5 h-3.5 text-amber-400" />
            <span>Total Codes</span>
          </div>
          <div className="font-display font-black text-2xl text-white mt-1">{totalCodes}</div>
          <div className="text-[11px] text-emerald-400 font-bold mt-0.5">{activeCodes} active</div>
        </div>

        <div className="bg-[#0E1524] p-4 rounded-xl border border-slate-800/80 shadow-xs">
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <Users className="w-3.5 h-3.5 text-sky-400" />
            <span>Total Claims</span>
          </div>
          <div className="font-display font-black text-2xl text-sky-400 mt-1">
            {totalRedemptionsCount.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Across all players</div>
        </div>

        <div className="bg-[#0E1524] p-4 rounded-xl border border-slate-800/80 shadow-xs">
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>Coins Issued</span>
          </div>
          <div className="font-display font-black text-2xl text-amber-400 mt-1">
            {totalCoinsDistributed.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            ≈ ₹{(totalCoinsDistributed / 100).toFixed(2)} INR
          </div>
        </div>

        <div className="bg-[#0E1524] p-4 rounded-xl border border-slate-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Quick Action</span>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="w-full mt-2 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Promo Code</span>
          </button>
        </div>
      </div>

      {/* 2. Sub Navigation & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0E1524] p-3 rounded-xl border border-slate-800/80">
        {/* Left: View Switcher */}
        <div className="flex items-center gap-1 bg-[#070A12] p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveView('codes')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeView === 'codes'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Promo Codes ({promoCodes.length})</span>
          </button>
          <button
            onClick={() => setActiveView('redemptions')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeView === 'redemptions'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Claim Logs ({redemptions.length})</span>
          </button>
        </div>

        {/* Right: Search & Status Filter */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {activeView === 'codes' && (
            <div className="flex items-center gap-1 bg-[#070A12] p-1 rounded-lg border border-slate-800 text-xs font-bold">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  statusFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  statusFilter === 'active' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-white'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setStatusFilter('inactive')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  statusFilter === 'inactive' ? 'bg-rose-950/80 text-rose-400 border border-rose-500/30' : 'text-slate-400 hover:text-white'
                }`}
              >
                Disabled
              </button>
            </div>
          )}

          <div className="relative w-full sm:w-52">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search code..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[#070A12] border border-slate-700/80 rounded-lg text-xs text-white placeholder:text-slate-500 outline-none focus:border-amber-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 bg-[#070A12] hover:bg-slate-800 border border-slate-700/80 rounded-lg text-slate-300 hover:text-white transition-colors shrink-0 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 3. Main Body */}
      {activeView === 'codes' ? (
        /* PROMO CODES LIST */
        filteredCodes.length === 0 ? (
          <div className="bg-[#0E1524] rounded-xl p-10 text-center border border-slate-800/80 space-y-3">
            <Ticket className="w-10 h-10 mx-auto text-slate-600" />
            <h4 className="font-bold text-slate-300 text-sm">No promo codes found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Create your first promotional code to distribute free bonus coins to your app users.
            </p>
            <button
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg shadow-sm inline-flex items-center gap-1.5 mt-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create First Code</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredCodes.map((promo, pIdx) => {
              const isExpired = promo.expiresAt && Date.now() > promo.expiresAt;
              const isLimitReached = promo.maxUses && promo.usedCount >= promo.maxUses;
              const usagePercent = promo.maxUses
                ? Math.min(100, Math.round((promo.usedCount / promo.maxUses) * 100))
                : null;

              return (
                <div
                  key={promo.id ? `promo-${promo.id}-${pIdx}` : `promo-${promo.code}-${pIdx}`}
                  className={`bg-[#0E1524] rounded-xl p-4 border transition-all flex flex-col justify-between gap-3.5 ${
                    !promo.active || isExpired
                      ? 'border-slate-800 opacity-65'
                      : 'border-slate-800/90 hover:border-slate-700'
                  }`}
                >
                  {/* Top Bar: Code Chip & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 bg-[#070A12] text-amber-300 border border-slate-700/80 px-2.5 py-1.5 rounded-lg font-mono font-bold text-xs tracking-wider">
                        <span>{promo.code}</span>
                        <button
                          onClick={() => handleCopy(promo.code, promo.id)}
                          className="text-slate-400 hover:text-white ml-1 transition-colors cursor-pointer"
                          title="Copy Code"
                        >
                          {copiedId === promo.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Reward Badge */}
                      <div className="flex items-center gap-1 bg-amber-400/10 text-amber-300 border border-amber-400/20 px-2 py-1 rounded-lg text-xs font-bold">
                        <GoldCoin className="w-3.5 h-3.5" />
                        <span>+{promo.rewardCoins} Coins</span>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div className="flex items-center gap-1">
                      {isExpired ? (
                        <span className="bg-rose-950/60 text-rose-400 border border-rose-500/30 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                          Expired
                        </span>
                      ) : isLimitReached ? (
                        <span className="bg-amber-950/60 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                          Max Reached
                        </span>
                      ) : promo.active ? (
                        <span className="bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                          Active
                        </span>
                      ) : (
                        <span className="bg-slate-800 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                          Disabled
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description & Details */}
                  <div className="space-y-1.5">
                    {promo.description && (
                      <p className="text-xs text-slate-400 line-clamp-2">
                        {promo.description}
                      </p>
                    )}

                    {/* Usage Progress */}
                    <div className="space-y-1 pt-0.5">
                      <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
                        <span>
                          Claims: <strong className="text-white">{promo.usedCount || 0}</strong>
                          {promo.maxUses ? ` / ${promo.maxUses}` : ' (Unlimited)'}
                        </span>
                        {usagePercent !== null && <span className="text-slate-400">{usagePercent}%</span>}
                      </div>

                      {usagePercent !== null && (
                        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className={`h-full rounded-full transition-all ${
                              usagePercent >= 90
                                ? 'bg-rose-500'
                                : usagePercent >= 50
                                ? 'bg-amber-400'
                                : 'bg-emerald-400'
                            }`}
                            style={{ width: `${usagePercent}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Expiration Note if any */}
                    {promo.expiresAt && (
                      <div className="text-[10px] text-slate-500 flex items-center gap-1 pt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>Expires {new Date(promo.expiresAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Actions Bar */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleActive(promo)}
                        className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                          promo.active
                            ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-950'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {promo.active ? (
                          <>
                            <ToggleRight className="w-4 h-4 text-emerald-400" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-4 h-4 text-slate-500" />
                            <span>Inactive</span>
                          </>
                        )}
                      </button>
                    </div>

                    <button
                      onClick={() => handleDelete(promo.id, promo.code)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                      title="Delete Promo Code"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* REDEMPTIONS AUDIT FEED */
        <div className="bg-[#0E1524] rounded-xl border border-slate-800/80 overflow-hidden">
          <div className="p-3.5 bg-[#070A12] border-b border-slate-800 flex items-center justify-between">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-amber-400" />
              <span>Real-time Promo Redemptions Audit</span>
            </h4>
            <span className="text-xs text-slate-500">Latest 100 claims</span>
          </div>

          {redemptions.length === 0 ? (
            <div className="text-center py-10 text-slate-500 space-y-2">
              <Ticket className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-xs font-semibold text-slate-400">No redemptions logged yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60 max-h-[480px] overflow-y-auto">
              {redemptions.map((r, rIdx) => (
                <div key={r.id ? `redempt-${r.id}-${rIdx}` : `redempt-${rIdx}`} className="p-3 hover:bg-slate-800/30 transition-colors flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
                      <Ticket className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white truncate">
                          {r.userName || r.userEmail || 'Player'}
                        </span>
                        <span className="font-mono bg-[#070A12] border border-slate-700 text-amber-300 px-1.5 py-0.2 rounded font-bold text-[10px]">
                          {r.code}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate font-mono">
                        {r.userEmail || r.userId}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-display font-black text-emerald-400 text-xs">
                      +{r.rewardCoins} Coins
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {new Date(r.redeemedAt).toLocaleDateString()} {new Date(r.redeemedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. Modal: Create New Promo Code */}
      <AnimatePresence>
        {showCreateModal && (
          <div key="create-promo-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
            <motion.div
              key="create-promo-modal"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0E1524] rounded-2xl max-w-md w-full shadow-2xl border border-slate-700/80 overflow-hidden text-slate-100"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#070A12]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/30 text-amber-400 flex items-center justify-center font-bold">
                    <Ticket className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">Create Promo Code</h3>
                    <p className="text-[11px] text-slate-400">Generate voucher code for coin rewards</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleCreatePromo} className="p-4 space-y-3.5 text-xs">
                {errorMsg && (
                  <div className="p-2.5 bg-rose-950/60 border border-rose-500/40 text-rose-300 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Code Field */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Promo Code (Uppercase) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BONUS500, SPECIAL1000"
                    value={formCode}
                    onChange={e => setFormCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-[#070A12] border border-slate-700 rounded-lg font-mono font-bold text-xs text-amber-300 uppercase tracking-wider focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Reward Coins */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      Reward Coins *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={100000}
                      value={formCoins}
                      onChange={e => setFormCoins(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-[#070A12] border border-slate-700 rounded-lg font-bold text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      ≈ ₹{(formCoins / 100).toFixed(2)} INR
                    </span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      Max Total Claims
                    </label>
                    <input
                      type="number"
                      placeholder="Blank = Unlimited"
                      min={1}
                      value={formMaxUses}
                      onChange={e => setFormMaxUses(e.target.value)}
                      className="w-full px-3 py-2 bg-[#070A12] border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Global claim limit
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. VIP Member special reward"
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-[#070A12] border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Expiration Date */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Expiry Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formExpiresAt}
                    onChange={e => setFormExpiresAt(e.target.value)}
                    className="w-full px-3 py-2 bg-[#070A12] border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Toggles */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formActive}
                      onChange={e => setFormActive(e.target.checked)}
                      className="rounded accent-amber-400 w-4 h-4"
                    />
                    <span className="font-semibold text-slate-300">Active Immediately</span>
                  </label>
                </div>

                {/* Modal Actions */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {isSaving ? (
                      <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Publish Code</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
