import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Ticket,
  Check,
  X,
  AlertCircle,
  Sparkles,
  ClipboardPaste
} from 'lucide-react';
import { GoldCoin } from './GoldCoin';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { redeemPromoCode } from '../services/coinService';
import { sound } from '../utils/sound';

interface PromoCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth: () => void;
}

export const PromoCodeModal: React.FC<PromoCodeModalProps> = ({
  isOpen,
  onClose,
  onOpenAuth
}) => {
  const { profile, currentUser } = useAuth();
  const [codeInput, setCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [claimedReward, setClaimedReward] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCodeInput('');
      setErrorMsg('');
      setSuccessMsg('');
      setClaimedReward(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApply = async () => {
    const code = codeInput.trim().toUpperCase();

    if (!currentUser || !profile) {
      onOpenAuth();
      return;
    }

    if (!code) {
      setErrorMsg('Please enter a promo or coupon code');
      sound.playError();
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setClaimedReward(null);

    try {
      const res = await redeemPromoCode(profile.uid, code, profile);

      if (res.success && res.coins) {
        setClaimedReward(res.coins);
        setSuccessMsg(res.message);
        setCodeInput('');
        sound.playWin();

        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } else {
        setErrorMsg(res.message);
        sound.playError();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid or expired promo code';
      setErrorMsg(msg);
      sound.playError();
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = async () => {
    try {
      sound.playTick();
      const text = await navigator.clipboard.readText();
      if (text) {
        setCodeInput(text.trim().toUpperCase());
        setErrorMsg('');
      }
    } catch {
      // clipboard fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 8 }}
        className="bg-[#121826] text-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-800 overflow-hidden"
      >
        {/* Top Header */}
        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 bg-[#0A0D14]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-400 flex items-center justify-center shrink-0 shadow-sm">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-base sm:text-lg text-white">Promo &amp; Coupons</h3>
              <p className="text-xs text-slate-400">Redeem code for instant bonus coins</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Input Box & Paste */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-300 block">
              Enter Secret Promo Code
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="ENTER CODE HERE"
                value={codeInput}
                onChange={(e) => {
                  setCodeInput(e.target.value.toUpperCase());
                  setErrorMsg('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleApply();
                }}
                className="w-full pl-3.5 pr-20 py-3 bg-[#0A0D14] border border-slate-700/80 focus:border-amber-400 rounded-xl font-mono font-black text-sm tracking-wider text-amber-400 placeholder:text-slate-600 focus:outline-hidden transition-colors uppercase"
              />
              <div className="absolute right-2 flex items-center gap-1">
                {codeInput ? (
                  <button
                    type="button"
                    onClick={() => setCodeInput('')}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg text-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePaste}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <ClipboardPaste className="w-3 h-3 text-amber-400" />
                    <span>Paste</span>
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={() => handleApply()}
              disabled={loading || !codeInput.trim()}
              className="w-full py-3 bg-amber-400 hover:bg-amber-300 active:scale-98 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-slate-950" />
                  <span>Redeem Code</span>
                </>
              )}
            </button>
          </div>

          {/* Feedback Messages */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div
                key="promo-error-alert"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </motion.div>
            )}

            {successMsg && claimedReward && (
              <motion.div
                key="promo-success-alert"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 rounded-xl text-xs flex items-center justify-between shadow-md"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-black text-amber-400 text-sm flex items-center gap-1">
                      +{claimedReward} Coins Added!
                    </div>
                    <div className="text-[11px] text-emerald-300/90">{successMsg}</div>
                  </div>
                </div>
                <GoldCoin className="w-7 h-7 shrink-0" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

