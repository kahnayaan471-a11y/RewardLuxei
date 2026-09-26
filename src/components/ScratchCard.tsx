import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Coins, Gift, RefreshCw, CheckCircle2, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { earnCoins, DEFAULT_SETTINGS } from '../services/coinService';
import { sound } from '../utils/sound';

interface ScratchCardProps {
  onOpenAuth: () => void;
}

export const ScratchCard: React.FC<ScratchCardProps> = ({ onOpenAuth }) => {
  const { profile, currentUser } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isScratching, setIsScratching] = useState(false);
  const [rewardAmount, setRewardAmount] = useState<number>(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [cardReady, setCardReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);

  const scratchesLeft = profile?.scratchesLeftToday ?? DEFAULT_SETTINGS.dailyScratchLimit;

  // Generate random reward
  const generateNewCard = () => {
    if (scratchesLeft <= 0) {
      setErrorMsg('All scratch cards have been used for today!');
      return;
    }

    setErrorMsg('');
    setIsRevealed(false);
    setCardReady(true);

    // Random reward strictly capped at maximum 50 coins
    const rand = Math.random();
    let amt = 25;
    if (rand < 0.15) amt = 50; // Max 50 Coins
    else if (rand < 0.35) amt = 40 + Math.floor(Math.random() * 9); // 40-48 Coins
    else if (rand < 0.60) amt = 30 + Math.floor(Math.random() * 9); // 30-38 Coins
    else if (rand < 0.82) amt = 20 + Math.floor(Math.random() * 9); // 20-28 Coins
    else amt = 10 + Math.floor(Math.random() * 9); // 10-18 Coins

    amt = Math.min(50, amt);
    setRewardAmount(amt);
  };

  useEffect(() => {
    if (!cardReady && scratchesLeft > 0) {
      generateNewCard();
    }
  }, [scratchesLeft]);

  // Setup Canvas
  useEffect(() => {
    if (!cardReady || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background gradient for scratch cover
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#94a3b8');
    gradient.addColorStop(0.5, '#cbd5e1');
    gradient.addColorStop(1, '#64748b');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Draw pattern & text on cover
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✨ SCRATCH HERE ✨', width / 2, height / 2 - 10);
    ctx.font = '12px Plus Jakarta Sans, sans-serif';
    ctx.fillText('Rub with finger or mouse', width / 2, height / 2 + 15);

    // Decorative sparkles pattern
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      ctx.beginPath();
      ctx.arc(x, y, Math.random() * 2 + 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [cardReady, isRevealed]);

  // Scratch handler
  const scratch = (clientX: number, clientY: number) => {
    if (isRevealed || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();

    sound.playScratch();

    // Check % scratched
    checkScratchedPercentage();
  };

  const checkScratchedPercentage = () => {
    if (isRevealed || isClaiming || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imgData.data;
    let transparentCount = 0;

    for (let i = 3; i < pixels.length; i += 16) {
      if (pixels[i] < 128) {
        transparentCount++;
      }
    }

    const totalSamples = pixels.length / 16;
    const percentage = (transparentCount / totalSamples) * 100;

    if (percentage > 40) {
      revealAndClaim();
    }
  };

  const revealAndClaim = async () => {
    if (isRevealed || isClaiming) return;
    setIsRevealed(true);
    setIsClaiming(true);

    if (!currentUser || !profile) {
      onOpenAuth();
      setIsClaiming(false);
      return;
    }

    try {
      await earnCoins(
        profile.uid,
        rewardAmount,
        'scratch',
        `Scratch Card Reward (${rewardAmount} Coins)`,
        'scratchesLeftToday'
      );
      sound.playWin();

      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 }
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Coin addition failed';
      setErrorMsg(msg);
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 md:p-6 shadow-xl border border-slate-100 flex flex-col items-center relative overflow-hidden">
      {/* Glow */}
      <div className="absolute -top-16 -left-16 w-40 h-40 bg-purple-200/40 rounded-full blur-3xl pointer-events-none" />

      {/* Header Info */}
      <div className="w-full flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 font-bold">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-black text-lg text-slate-900 leading-tight">
              Golden Scratch Card
            </h3>
            <p className="text-xs text-slate-700">Scratch the card to win instant coins</p>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 text-purple-700 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-purple-500" />
          <span>{scratchesLeft} Cards Left</span>
        </div>
      </div>

      {/* Card Scratch Box */}
      <div className="relative w-full max-w-xs h-48 rounded-2xl overflow-hidden shadow-md border-2 border-amber-300 bg-gradient-to-br from-amber-500 via-yellow-400 to-amber-600 my-2 flex items-center justify-center select-none">
        {/* Underneath Reward Surface */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
          <div className="w-12 h-12 rounded-full bg-white/90 shadow-md flex items-center justify-center text-amber-600 mb-1 animate-bounce">
            <Coins className="w-7 h-7" />
          </div>
          <span className="text-xs font-bold text-amber-950 uppercase tracking-wider">
            You Won Reward!
          </span>
          <div className="font-display font-black text-3xl text-amber-950">
            +{rewardAmount} Coins
          </div>
          <span className="text-[11px] text-amber-900 font-semibold mt-0.5">
            Credited to your Wallet
          </span>
        </div>

        {/* Scratch Canvas on Top */}
        {!isRevealed && (
          <canvas
            ref={canvasRef}
            width={320}
            height={192}
            className="absolute inset-0 w-full h-full cursor-pointer touch-none z-10"
            onMouseDown={() => setIsScratching(true)}
            onMouseUp={() => setIsScratching(false)}
            onMouseLeave={() => setIsScratching(false)}
            onMouseMove={(e) => {
              if (isScratching) scratch(e.clientX, e.clientY);
            }}
            onTouchStart={() => setIsScratching(true)}
            onTouchEnd={() => setIsScratching(false)}
            onTouchMove={(e) => {
              if (e.touches[0]) {
                scratch(e.touches[0].clientX, e.touches[0].clientY);
              }
            }}
          />
        )}
      </div>

      {/* Error Notice */}
      {errorMsg && (
        <div className="mt-2 text-xs text-rose-600 font-bold bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
          {errorMsg}
        </div>
      )}

      {/* Success Banner */}
      <AnimatePresence>
        {isRevealed && (
          <motion.div
            key="scratch-success-banner"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="w-full mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <div>
                <div className="font-extrabold text-xs text-emerald-800">
                  +{rewardAmount} Coins Added!
                </div>
                <div className="text-[11px] text-emerald-600">Balance updated in real-time.</div>
              </div>
            </div>

            {scratchesLeft > 0 && (
              <button
                onClick={generateNewCard}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1 shadow-xs active:scale-95 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Next Card</span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action instructions / Next button */}
      <div className="w-full mt-3 flex items-center justify-between gap-2">
        <span className="text-xs text-slate-700 font-medium">
          {isRevealed
            ? 'Card revealed!'
            : 'Scratch the silver cover with your finger or mouse'}
        </span>

        {scratchesLeft > 0 && isRevealed && (
          <button
            onClick={generateNewCard}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Scratch Another ({scratchesLeft})</span>
          </button>
        )}
      </div>
    </div>
  );
};
