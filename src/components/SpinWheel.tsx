import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Coins, RefreshCw, Trophy, ArrowDown, Maximize2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { earnCoins, DEFAULT_SETTINGS } from '../services/coinService';
import { sound } from '../utils/sound';

interface SpinWheelProps {
  onOpenAuth: () => void;
  onOpenFullScreen?: () => void;
}

const SECTORS = [
  { value: 50, color: '#f59e0b', text: '#78350f', label: '50 Coins' },
  { value: 20, color: '#3b82f6', text: '#1e3a8a', label: '20 Coins' },
  { value: 35, color: '#10b981', text: '#064e3b', label: '35 Coins' },
  { value: 10, color: '#ec4899', text: '#831843', label: '10 Coins' },
  { value: 25, color: '#8b5cf6', text: '#4c1d95', label: '25 Coins' },
  { value: 30, color: '#f97316', text: '#7c2d12', label: '30 Coins' },
  { value: 15, color: '#eab308', text: '#713f12', label: '15 Coins' },
  { value: 45, color: '#06b6d4', text: '#164e63', label: '45 Coins' },
];

export const SpinWheel: React.FC<SpinWheelProps> = ({ onOpenAuth, onOpenFullScreen }) => {
  const { profile, currentUser } = useAuth();
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [wonReward, setWonReward] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const lastTickAngle = useRef(0);

  const spinsLeft = profile?.spinsLeftToday ?? DEFAULT_SETTINGS.dailySpinLimit;
  const numSectors = SECTORS.length;
  const sectorAngle = 360 / numSectors;

  const handleSpin = async () => {
    if (!currentUser || !profile) {
      onOpenAuth();
      return;
    }

    if (spinsLeft <= 0) {
      setErrorMsg('Daily spin limit reached. Please come back tomorrow!');
      sound.playError();
      return;
    }

    if (spinning) return;

    setErrorMsg('');
    setWonReward(null);
    setSpinning(true);

    // Pick a random sector with realistic distribution (10 to 50 coins)
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

    // Play tick intervals
    const tickInterval = setInterval(() => {
      sound.playTick();
    }, 150);

    setTimeout(() => {
      clearInterval(tickInterval);
    }, 3500);

    // Spin completes in 4 seconds
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
        sound.playWin();

        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to credit coins';
        setErrorMsg(msg);
      }
    }, 4200);
  };

  return (
    <div className="bg-white rounded-3xl p-5 md:p-6 shadow-xl border border-slate-100 flex flex-col items-center relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute -top-20 -right-20 w-44 h-44 bg-yellow-200/40 rounded-full blur-3xl pointer-events-none" />

      {/* Header Info */}
      <div className="w-full flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 font-bold">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-black text-lg text-slate-900 leading-tight">
              Lucky Spin &amp; Win
            </h3>
            <p className="text-xs text-slate-700">Spin the wheel to win exciting coin rewards!</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onOpenFullScreen && (
            <button
              onClick={onOpenFullScreen}
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-800 transition-colors"
              title="Play Full Screen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
          <div className="bg-amber-50 border border-amber-200 text-amber-900 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>{spinsLeft} Spins Left</span>
          </div>
        </div>
      </div>

      {/* Wheel Area */}
      <div className="relative w-64 h-64 md:w-72 md:h-72 my-2 flex items-center justify-center">
        {/* Pointer Arrow on Top */}
        <div className="absolute -top-3 z-20 flex flex-col items-center filter drop-shadow-md">
          <div className="w-7 h-9 bg-gradient-to-b from-rose-500 to-red-600 rounded-b-full clip-pointer flex items-center justify-center border-2 border-white shadow-lg text-white">
            <ArrowDown className="w-4 h-4 stroke-[3]" />
          </div>
        </div>

        {/* Outer Wheel Rim */}
        <div className="w-full h-full rounded-full p-2 bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.35)] border-4 border-amber-200 flex items-center justify-center">
          {/* Rotating Wheel Container */}
          <div
            className="w-full h-full rounded-full relative overflow-hidden border-2 border-white shadow-inner"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? 'transform 4.2s cubic-bezier(0.12, 0.8, 0.25, 1)' : 'none',
            }}
          >
            {/* SVG Slices */}
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

                // Calculate text position
                const midAngle = ((startAngle + endAngle) / 2 * Math.PI) / 180;
                const tx = 50 + 33 * Math.cos(midAngle);
                const ty = 50 + 33 * Math.sin(midAngle);
                const textRotation = (startAngle + endAngle) / 2 + 90;

                return (
                  <g key={`spin-sector-${index}-${sector.value}`}>
                    <path d={pathData} fill={sector.color} stroke="#ffffff" strokeWidth="0.8" />
                    <text
                      x={tx}
                      y={ty}
                      fill="#ffffff"
                      fontSize="4.8"
                      fontWeight="900"
                      textAnchor="middle"
                      alignmentBaseline="middle"
                      transform={`rotate(${textRotation}, ${tx}, ${ty})`}
                      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                    >
                      {sector.value}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Center Cap */}
            <div className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-gradient-to-b from-white to-slate-100 border-3 border-amber-400 shadow-lg flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-white shadow-xs">
                <Coins className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="mt-2 text-xs text-rose-600 font-bold bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
          {errorMsg}
        </div>
      )}

      {/* Win Celebration Card */}
      <AnimatePresence>
        {wonReward !== null && (
          <motion.div
            key="spin-win-card"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="my-3 p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 rounded-2xl text-center w-full shadow-md"
          >
            <div className="text-xs uppercase tracking-wider font-extrabold text-emerald-800 flex items-center justify-center gap-1">
              <Trophy className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>You Won!</span>
            </div>
            <div className="font-display font-black text-2xl text-emerald-800 my-0.5">
              +{wonReward} Coins
            </div>
            <p className="text-[11px] text-emerald-700">Coins have been added to your wallet!</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spin Button */}
      <button
        onClick={handleSpin}
        disabled={spinning || spinsLeft <= 0}
        className={`w-full mt-3 py-3.5 px-6 rounded-2xl font-display font-extrabold text-base shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98 ${
          spinsLeft <= 0
            ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            : spinning
            ? 'bg-amber-400 text-slate-900 cursor-wait'
            : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 shadow-amber-500/30'
        }`}
      >
        {spinning ? (
          <>
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Spinning... Good Luck!</span>
          </>
        ) : spinsLeft <= 0 ? (
          <span>Spins Finished for Today</span>
        ) : (
          <>
            <Sparkles className="w-5 h-5 fill-slate-950" />
            <span>SPIN NOW ({spinsLeft} Left)</span>
          </>
        )}
      </button>

      {onOpenFullScreen && (
        <button
          onClick={onOpenFullScreen}
          className="w-full mt-2 py-2 text-xs text-amber-700 hover:text-amber-800 font-bold flex items-center justify-center gap-1.5 transition-colors"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Switch to Full Screen Spin Experience</span>
        </button>
      )}
    </div>
  );
};
