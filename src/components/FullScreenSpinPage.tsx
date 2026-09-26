import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Sparkles,
  RefreshCw,
  Trophy,
  ArrowDown,
  Flame,
  Info,
  History,
  CheckCircle2,
  Zap,
  Gift
} from 'lucide-react';
import { GoldCoin } from './GoldCoin';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { earnCoins, DEFAULT_SETTINGS } from '../services/coinService';
import { sound } from '../utils/sound';

interface FullScreenSpinPageProps {
  onClose: () => void;
  onOpenAuth: () => void;
  onOpenWithdraw: () => void;
}

interface Sector {
  value: number;
  color: string;
  textColor: string;
  label: string;
  isJackpot?: boolean;
}

const SECTORS: Sector[] = [
  { value: 50, color: '#f59e0b', textColor: '#78350f', label: '50' },
  { value: 20, color: '#3b82f6', textColor: '#1e3a8a', label: '20' },
  { value: 35, color: '#10b981', textColor: '#064e3b', label: '35' },
  { value: 10, color: '#ec4899', textColor: '#831843', label: '10' },
  { value: 25, color: '#8b5cf6', textColor: '#4c1d95', label: '25' },
  { value: 30, color: '#f97316', textColor: '#7c2d12', label: '30' },
  { value: 15, color: '#eab308', textColor: '#713f12', label: '15' },
  { value: 45, color: '#06b6d4', textColor: '#164e63', label: '45' },
];

export const FullScreenSpinPage: React.FC<FullScreenSpinPageProps> = ({
  onClose,
  onOpenAuth,
  onOpenWithdraw,
}) => {
  const { profile, currentUser } = useAuth();
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [wonReward, setWonReward] = useState<number | null>(null);
  const [showWinModal, setShowWinModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [recentWins, setRecentWins] = useState<Array<{ id: string; coins: number; time: string }>>([]);

  const spinsLeft = profile?.spinsLeftToday ?? DEFAULT_SETTINGS.dailySpinLimit;
  const numSectors = SECTORS.length;
  const sectorAngle = 360 / numSectors;

  const handleSpin = async () => {
    if (!currentUser || !profile) {
      onOpenAuth();
      return;
    }

    if (spinsLeft <= 0) {
      setErrorMsg('Daily spin limit reached! Please come back tomorrow for fresh spins.');
      sound.playError();
      return;
    }

    if (spinning) return;

    setErrorMsg('');
    setWonReward(null);
    setShowWinModal(false);
    setSpinning(true);

    // Weighted random selection: realistic distribution (10 to 50 coins)
    const rand = Math.random();
    let targetIndex = 3; // default 10 Coins
    if (rand < 0.10) targetIndex = 0; // 50 Coins (Max win)
    else if (rand < 0.22) targetIndex = 7; // 45 Coins
    else if (rand < 0.36) targetIndex = 2; // 35 Coins
    else if (rand < 0.50) targetIndex = 5; // 30 Coins
    else if (rand < 0.65) targetIndex = 4; // 25 Coins
    else if (rand < 0.78) targetIndex = 1; // 20 Coins
    else if (rand < 0.90) targetIndex = 6; // 15 Coins
    else targetIndex = 3; // 10 Coins

    const winningSector = SECTORS[targetIndex];

    // Calculate rotation angle to land precisely on the chosen sector (Top pointer at 12 o'clock)
    const extraTurns = 5 + Math.floor(Math.random() * 3); // 5 to 7 full rotations
    const targetSectorCenter = targetIndex * sectorAngle + sectorAngle / 2;
    const targetMod = (360 - targetSectorCenter + 360) % 360;
    const currentMod = ((rotation % 360) + 360) % 360;
    const forwardDiff = (targetMod - currentMod + 360) % 360;
    // Small natural jitter within +/- 8 degrees (well within the 45 degree slice)
    const jitter = (Math.random() - 0.5) * 12;

    const finalRotation = rotation + (extraTurns * 360) + forwardDiff + jitter;

    setRotation(finalRotation);

    // Tick audio
    const tickInterval = setInterval(() => {
      sound.playTick();
    }, 110);

    setTimeout(() => {
      clearInterval(tickInterval);
    }, 2100);

    // Fast and snappy spin animation duration: 2.4 seconds
    setTimeout(async () => {
      setSpinning(false);
      try {
        await earnCoins(
          profile.uid,
          winningSector.value,
          'spin',
          `Lucky Spin Reward (${winningSector.value} Coins)`,
          'spinsLeftToday'
        );
        setWonReward(winningSector.value);
        setShowWinModal(true);
        sound.playWin();

        // Add to recent wins list
        setRecentWins((prev) => [
          {
            id: Date.now().toString(),
            coins: winningSector.value,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
          ...prev.slice(0, 4),
        ]);

        // Trigger confetti
        confetti({
          particleCount: 120,
          spread: 90,
          origin: { y: 0.55 },
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to credit coins';
        setErrorMsg(msg);
      }
    }, 2400);
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col overflow-y-auto min-h-screen">
      {/* Background glow effects */}
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-40 -right-40 w-96 h-96 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

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
                Lucky Spin
              </h1>
              <span className="bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[10px] font-black px-1.5 py-0.5 rounded-md">
                FULL SCREEN
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* User Balance Chip */}
          <div
            onClick={onOpenWithdraw}
            className="cursor-pointer bg-slate-800/90 hover:bg-slate-700/90 border border-amber-500/30 px-3 py-1.5 rounded-2xl flex items-center gap-2 transition-all shadow-inner"
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

      {/* Main Wheel Arena */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-4 sm:py-6 flex flex-col items-center justify-between relative z-10">
        {/* Wheel Stage with Arcade Glow */}
        <div className="relative w-72 h-72 sm:w-84 sm:h-84 md:w-92 md:h-92 my-auto flex items-center justify-center">
          {/* Pulsing Backlight Glow */}
          <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-2xl animate-pulse pointer-events-none" />

          {/* Golden Casino Pointer on Top */}
          <div className="absolute -top-4 z-30 flex flex-col items-center filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)]">
            <div className="w-9 h-11 bg-gradient-to-b from-rose-500 via-red-600 to-rose-700 rounded-b-2xl flex items-center justify-center border-2 border-white shadow-2xl text-white transform hover:scale-105 transition-transform">
              <ArrowDown className="w-5 h-5 stroke-[3] animate-bounce" />
            </div>
          </div>

          {/* Outer Wheel Decorative Ring with Lights */}
          <div className="w-full h-full rounded-full p-3 sm:p-3.5 bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-700 shadow-[0_0_40px_rgba(245,158,11,0.45)] border-4 border-amber-300 flex items-center justify-center relative">
            {/* Flashing Arcade Bulbs on Ring */}
            <div className="absolute inset-1 rounded-full border border-amber-200/40 pointer-events-none flex items-center justify-center">
              {[...Array(16)].map((_, i) => (
                <div
                  key={`bulb-${i}`}
                  className={`absolute w-2 h-2 rounded-full border border-slate-900 ${
                    i % 2 === 0 ? 'bg-yellow-200 shadow-[0_0_6px_#fde047]' : 'bg-amber-400 shadow-[0_0_6px_#fbbf24]'
                  }`}
                  style={{
                    transform: `rotate(${i * 22.5}deg) translateY(-48%)`,
                    top: '50%',
                    left: '50%',
                    transformOrigin: '0 0',
                  }}
                />
              ))}
            </div>

            {/* Rotating SVG Wheel */}
            <div
              className="w-full h-full rounded-full relative overflow-hidden border-2 border-white shadow-[inset_0_0_20px_rgba(0,0,0,0.6)]"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: spinning ? 'transform 2.4s cubic-bezier(0.12, 0.8, 0.22, 1)' : 'none',
              }}
            >
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                {SECTORS.map((sector, index) => {
                  const startAngle = (index * 360) / numSectors;
                  const endAngle = ((index + 1) * 360) / numSectors;

                  const startRad = (startAngle * Math.PI) / 180;
                  const endRad = (endAngle * Math.PI) / 180;

                  const x1 = 50 + 50 * Math.cos(startRad);
                  const y1 = 50 + 50 * Math.sin(startRad);
                  const x2 = 50 + 50 * Math.cos(endRad);
                  const y2 = 50 + 50 * Math.sin(endRad);

                  const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`;

                  // Calculate text placement
                  const midAngle = (((startAngle + endAngle) / 2) * Math.PI) / 180;
                  const tx = 50 + 33 * Math.cos(midAngle);
                  const ty = 50 + 33 * Math.sin(midAngle);
                  const textRotation = (startAngle + endAngle) / 2 + 90;

                  return (
                    <g key={`fullscreen-sector-${index}-${sector.value}`}>
                      <path
                        d={pathData}
                        fill={sector.color}
                        stroke="#ffffff"
                        strokeWidth="0.9"
                      />
                      <text
                        x={tx}
                        y={ty}
                        fill="#ffffff"
                        fontSize={sector.isJackpot ? '4.0' : '4.8'}
                        fontWeight="900"
                        textAnchor="middle"
                        alignmentBaseline="middle"
                        transform={`rotate(${textRotation}, ${tx}, ${ty})`}
                        style={{
                          textShadow: '0 2px 4px rgba(0,0,0,0.7)',
                          letterSpacing: sector.isJackpot ? '-0.2px' : 'normal',
                        }}
                      >
                        {sector.label}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Center Golden Cap */}
              <div className="absolute inset-0 m-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-b from-yellow-100 via-amber-400 to-yellow-600 border-4 border-white shadow-2xl flex items-center justify-center">
                <GoldCoin className="w-10 h-10" />
              </div>
            </div>
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="w-full mt-3 text-xs text-rose-300 font-bold bg-rose-950/80 border border-rose-800 px-4 py-2 rounded-xl text-center shadow-lg">
            {errorMsg}
          </div>
        )}

        {/* Big Action Button */}
        <div className="w-full mt-4">
          <button
            onClick={handleSpin}
            disabled={spinning || spinsLeft <= 0}
            className={`w-full py-4 px-6 rounded-2xl font-display font-black text-lg shadow-2xl transition-all flex items-center justify-center gap-2.5 active:scale-98 ${
              spinsLeft <= 0
                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                : spinning
                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 cursor-wait shadow-amber-500/20'
                : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-[0_0_30px_rgba(245,158,11,0.5)] border-2 border-yellow-200'
            }`}
          >
            {spinning ? (
              <>
                <RefreshCw className="w-6 h-6 animate-spin text-slate-950" />
                <span>SPINNING... GOOD LUCK!</span>
              </>
            ) : spinsLeft <= 0 ? (
              <span>DAILY LIMIT COMPLETED (COME BACK TOMORROW)</span>
            ) : (
              <>
                <Zap className="w-6 h-6 fill-slate-950 text-slate-950" />
                <span>SPIN WHEEL NOW ({spinsLeft} LEFT)</span>
              </>
            )}
          </button>
        </div>

        {/* Recent Wins Ticker */}
        {recentWins.length > 0 && (
          <div className="w-full mt-3 bg-emerald-950/40 border border-emerald-800/40 rounded-2xl px-4 py-2 text-xs flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Your Last Spin Win:</span>
            </div>
            <div className="font-black text-amber-300">
              +{recentWins[0].coins} Coins ({recentWins[0].time})
            </div>
          </div>
        )}
      </main>

      {/* Win Celebration Modal Popup */}
      <AnimatePresence>
        {showWinModal && wonReward !== null && (
          <div key="spin-win-backdrop" className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              key="spin-win-modal"
              initial={{ scale: 0.6, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.7, opacity: 0, y: 20 }}
              className="bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-400/80 rounded-3xl p-6 sm:p-8 text-center max-w-sm w-full shadow-[0_0_60px_rgba(245,158,11,0.5)] relative overflow-hidden"
            >
              {/* Gold light burst */}
              <div className="absolute -top-20 -left-20 w-48 h-48 bg-amber-500/30 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-yellow-500/30 rounded-full blur-3xl pointer-events-none" />

              <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center shadow-xl shadow-amber-500/30">
                <Trophy className="w-10 h-10 text-slate-950 stroke-[2.5]" />
              </div>

              <span className="text-xs uppercase tracking-widest font-black text-amber-400 block mb-1">
                CONGRATULATIONS!
              </span>

              <h2 className="font-display font-black text-4xl sm:text-5xl text-white tracking-tight my-1">
                +{wonReward} <span className="text-amber-400 text-2xl font-bold">Coins</span>
              </h2>

              <p className="text-xs text-slate-300 mt-2 mb-6">
                Coins have been added directly to your wallet! Real cash value: <strong className="text-emerald-400">₹{(wonReward / 100).toFixed(2)}</strong>
              </p>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    setShowWinModal(false);
                    if (spinsLeft > 0) {
                      handleSpin();
                    }
                  }}
                  disabled={spinsLeft <= 0}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-slate-950 font-display font-black text-sm rounded-2xl shadow-lg shadow-amber-500/25 active:scale-98 transition-all disabled:opacity-50"
                >
                  {spinsLeft > 0 ? `SPIN AGAIN (${spinsLeft} Left)` : 'Daily Spins Finished'}
                </button>

                <button
                  onClick={() => setShowWinModal(false)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors"
                >
                  Stay on Spin Page
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
