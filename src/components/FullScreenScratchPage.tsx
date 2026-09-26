import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Sparkles,
  Gift,
  RefreshCw,
  Trophy,
  CheckCircle2,
  Zap,
  RotateCcw,
  Sparkle
} from 'lucide-react';
import { GoldCoin } from './GoldCoin';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { earnCoins, DEFAULT_SETTINGS } from '../services/coinService';
import { sound } from '../utils/sound';

interface FullScreenScratchPageProps {
  onClose: () => void;
  onOpenAuth: () => void;
  onOpenWithdraw: () => void;
}

export const FullScreenScratchPage: React.FC<FullScreenScratchPageProps> = ({
  onClose,
  onOpenAuth,
  onOpenWithdraw,
}) => {
  const { profile, currentUser } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isScratching, setIsScratching] = useState(false);
  const [rewardAmount, setRewardAmount] = useState<number>(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [cardReady, setCardReady] = useState(false);
  const [scratchProgress, setScratchProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);
  const [showWinModal, setShowWinModal] = useState(false);
  const [recentWins, setRecentWins] = useState<Array<{ id: string; coins: number; time: string }>>([]);

  const scratchesLeft = profile?.scratchesLeftToday ?? DEFAULT_SETTINGS.dailyScratchLimit;

  // Generate random reward
  const generateNewCard = () => {
    if (scratchesLeft <= 0) {
      setErrorMsg('All scratch cards have been used for today! Please come back tomorrow.');
      return;
    }

    setErrorMsg('');
    setIsRevealed(false);
    setShowWinModal(false);
    setIsClaiming(false);
    setScratchProgress(0);
    setCardReady(true);

    // Random reward calculation strictly capped at maximum 50 coins
    const rand = Math.random();
    let amt = 25;
    if (rand < 0.15) amt = 50; // Max 50 Coins
    else if (rand < 0.35) amt = 40 + Math.floor(Math.random() * 9); // 40 - 48
    else if (rand < 0.60) amt = 30 + Math.floor(Math.random() * 9); // 30 - 38
    else if (rand < 0.82) amt = 20 + Math.floor(Math.random() * 9); // 20 - 28
    else amt = 10 + Math.floor(Math.random() * 9); // 10 - 18

    amt = Math.min(50, amt);
    setRewardAmount(amt);
  };

  useEffect(() => {
    if (!cardReady && scratchesLeft > 0) {
      generateNewCard();
    }
  }, [scratchesLeft]);

  // Setup Canvas with Silver/Gold Luxury Foil
  useEffect(() => {
    if (!cardReady || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Reset composite operation
    ctx.globalCompositeOperation = 'source-over';

    // Luxury gradient cover
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#64748b');
    gradient.addColorStop(0.25, '#94a3b8');
    gradient.addColorStop(0.5, '#cbd5e1');
    gradient.addColorStop(0.75, '#94a3b8');
    gradient.addColorStop(1, '#475569');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Decorative golden pattern border
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, width - 16, height - 16);

    // Draw pattern & text on cover
    ctx.fillStyle = '#1e293b';
    ctx.font = '900 20px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✨ SCRATCH HERE TO WIN ✨', width / 2, height / 2 - 12);
    ctx.font = '600 13px Plus Jakarta Sans, sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText('Rub with finger or mouse to reveal', width / 2, height / 2 + 16);

    // Decorative stars
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 35; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      ctx.beginPath();
      ctx.arc(x, y, Math.random() * 2.5 + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [cardReady, isRevealed]);

  // Scratch handler
  const scratch = (clientX: number, clientY: number) => {
    if (isRevealed || !canvasRef.current || scratchesLeft <= 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 38, 0, Math.PI * 2);
    ctx.fill();

    sound.playScratch();
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

    for (let i = 3; i < pixels.length; i += 32) {
      if (pixels[i] < 128) {
        transparentCount++;
      }
    }

    const totalSamples = pixels.length / 32;
    const percentage = Math.min(100, Math.round((transparentCount / totalSamples) * 100));
    setScratchProgress(percentage);

    if (percentage > 30) {
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

      setShowWinModal(true);
      setRecentWins((prev) => [
        {
          id: Date.now().toString(),
          coins: rewardAmount,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        ...prev.slice(0, 4),
      ]);

      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to credit scratch reward';
      setErrorMsg(msg);
    } finally {
      setIsClaiming(false);
    }
  };

  // Mouse & Touch events
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsScratching(true);
    scratch(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isScratching) return;
    scratch(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    setIsScratching(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsScratching(true);
    if (e.touches[0]) {
      scratch(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isScratching) return;
    if (e.touches[0]) {
      scratch(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col overflow-y-auto min-h-screen">
      {/* Background glow effects */}
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-40 -right-40 w-96 h-96 bg-pink-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/80 flex items-center justify-center transition-all active:scale-95 shadow-md"
            aria-label="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-display font-black text-base sm:text-lg text-white leading-tight">
                Scratch Card
              </h1>
              <span className="bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[10px] font-black px-1.5 py-0.5 rounded-md">
                FULL SCREEN
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* User Balance Chip */}
          <div
            onClick={onOpenWithdraw}
            className="cursor-pointer bg-slate-800/90 hover:bg-slate-700/90 border border-purple-500/30 px-3 py-1.5 rounded-2xl flex items-center gap-2 transition-all shadow-inner"
          >
            <GoldCoin className="w-5 h-5" />
            <div className="text-right">
              <div className="font-display font-black text-xs text-white leading-none">
                {(profile?.coins || 0).toLocaleString()}
              </div>
              <span className="text-[9px] text-emerald-400 font-bold leading-none block">
                ₹{((profile?.coins || 0) / 100).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Scratch Stage */}
      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-4 sm:py-6 flex flex-col items-center justify-between relative z-10">
        {/* Scratch Card Stage */}
        <div className="w-full my-auto flex flex-col items-center">
          {/* Card Container */}
          <div className="relative w-full max-w-sm aspect-[4/3] rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(168,85,247,0.3)] border-4 border-purple-500/40 bg-gradient-to-br from-purple-950 via-slate-900 to-indigo-950 flex items-center justify-center select-none">
            {/* Underlying Hidden Reward Box */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center mb-2 shadow-lg shadow-amber-500/30">
                <Trophy className="w-8 h-8 text-slate-950 stroke-[2.5]" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-widest text-amber-400">
                LUCKY WINNER
              </span>
              <div className="font-display font-black text-4xl sm:text-5xl text-white tracking-tight my-0.5">
                +{rewardAmount} <span className="text-amber-400 text-2xl font-bold">Coins</span>
              </div>
              <span className="text-xs text-emerald-400 font-bold">
                Cash Value: ₹{(rewardAmount / 100).toFixed(2)}
              </span>
            </div>

            {/* Top Scratchable Canvas Layer */}
            {!isRevealed && scratchesLeft > 0 && (
              <canvas
                ref={canvasRef}
                width={360}
                height={270}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUp}
                className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
              />
            )}

            {/* Empty state when daily limit exhausted */}
            {scratchesLeft <= 0 && !isRevealed && (
              <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center">
                <Gift className="w-12 h-12 text-slate-600 mb-2" />
                <h3 className="font-display font-black text-base text-white">Daily Cards Finished</h3>
                <p className="text-xs text-slate-400 mt-1">Please come back tomorrow for 20 new scratch cards!</p>
              </div>
            )}
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="w-full mt-3 text-xs text-rose-300 font-bold bg-rose-950/80 border border-rose-800 px-4 py-2 rounded-xl text-center shadow-lg">
            {errorMsg}
          </div>
        )}

        {/* Action Controls */}
        <div className="w-full mt-4">
          {isRevealed && scratchesLeft > 0 && (
            <button
              onClick={generateNewCard}
              className="w-full py-4 px-6 rounded-2xl font-display font-black text-lg bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 hover:from-purple-400 hover:to-pink-400 text-white shadow-[0_0_30px_rgba(168,85,247,0.4)] border-2 border-purple-300 flex items-center justify-center gap-2 active:scale-98 transition-all"
            >
              <RotateCcw className="w-5 h-5" />
              <span>SCRATCH NEXT CARD ({scratchesLeft} LEFT)</span>
            </button>
          )}
        </div>

        {/* Recent Wins Ticker */}
        {recentWins.length > 0 && (
          <div className="w-full mt-3 bg-emerald-950/40 border border-emerald-800/40 rounded-2xl px-4 py-2 text-xs flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Your Last Scratch Win:</span>
            </div>
            <div className="font-black text-amber-300">
              +{recentWins[0].coins} Coins ({recentWins[0].time})
            </div>
          </div>
        )}
      </main>

      {/* Win Celebration Modal Popup */}
      <AnimatePresence>
        {showWinModal && (
          <div key="scratch-win-backdrop" className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              key="scratch-win-modal"
              initial={{ scale: 0.6, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.7, opacity: 0, y: 20 }}
              className="bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-purple-400/80 rounded-3xl p-6 sm:p-8 text-center max-w-sm w-full shadow-[0_0_60px_rgba(168,85,247,0.5)] relative overflow-hidden"
            >
              <div className="absolute -top-20 -left-20 w-48 h-48 bg-purple-500/30 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-pink-500/30 rounded-full blur-3xl pointer-events-none" />

              <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-tr from-purple-500 to-pink-400 flex items-center justify-center shadow-xl shadow-purple-500/30">
                <Gift className="w-10 h-10 text-white stroke-[2.5]" />
              </div>

              <span className="text-xs uppercase tracking-widest font-black text-purple-400 block mb-1">
                SCRATCH CARD REVEALED!
              </span>

              <h2 className="font-display font-black text-4xl sm:text-5xl text-white tracking-tight my-1">
                +{rewardAmount} <span className="text-amber-400 text-2xl font-bold">Coins</span>
              </h2>

              <p className="text-xs text-slate-300 mt-2 mb-6">
                Coins have been added to your wallet! Real cash value: <strong className="text-emerald-400">₹{(rewardAmount / 100).toFixed(2)}</strong>
              </p>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    setShowWinModal(false);
                    if (scratchesLeft > 0) {
                      generateNewCard();
                    }
                  }}
                  disabled={scratchesLeft <= 0}
                  className="w-full py-3.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-display font-black text-sm rounded-2xl shadow-lg shadow-purple-500/25 active:scale-98 transition-all disabled:opacity-50"
                >
                  {scratchesLeft > 0 ? `SCRATCH NEXT (${scratchesLeft} Left)` : 'Daily Scratch Cards Finished'}
                </button>

                <button
                  onClick={() => setShowWinModal(false)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors"
                >
                  Stay on Scratch Page
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
