import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trophy,
  Zap,
  Flame
} from 'lucide-react';
import { GoldCoin } from './GoldCoin';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { earnCoins, DEFAULT_SETTINGS } from '../services/coinService';
import { sound } from '../utils/sound';

interface FullScreenCaptchaPageProps {
  onClose: () => void;
  onOpenAuth: () => void;
  onOpenWithdraw: () => void;
}

export const FullScreenCaptchaPage: React.FC<FullScreenCaptchaPageProps> = ({
  onClose,
  onOpenAuth,
  onOpenWithdraw,
}) => {
  const { profile, currentUser } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [captchaType, setCaptchaType] = useState<'text' | 'math'>('math');
  const [captchaAnswer, setCaptchaAnswer] = useState<string>('');
  const [userInput, setUserInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string; coins?: number } | null>(null);
  const [timer, setTimer] = useState<number>(20);
  const [solvedCount, setSolvedCount] = useState<number>(0);
  const [showWinModal, setShowWinModal] = useState(false);
  const [lastWonCoins, setLastWonCoins] = useState(0);
  const [recentWins, setRecentWins] = useState<Array<{ id: string; coins: number; time: string }>>([]);

  const captchasLeft = profile?.captchasLeftToday ?? DEFAULT_SETTINGS.dailyCaptchaLimit;

  // Generate a new captcha
  const generateCaptcha = () => {
    setUserInput('');
    setFeedback(null);
    setTimer(20);

    const isMath = Math.random() > 0.35; // 65% math, 35% text
    setCaptchaType(isMath ? 'math' : 'text');

    let answer = '';
    let displayStr = '';

    if (isMath) {
      const ops = ['+', '-', '×'];
      const op = ops[Math.floor(Math.random() * ops.length)];
      let num1 = Math.floor(Math.random() * 50) + 10;
      let num2 = Math.floor(Math.random() * 30) + 5;

      if (op === '+') {
        answer = String(num1 + num2);
      } else if (op === '-') {
        if (num1 < num2) [num1, num2] = [num2, num1];
        answer = String(num1 - num2);
      } else {
        num1 = Math.floor(Math.random() * 12) + 2;
        num2 = Math.floor(Math.random() * 9) + 2;
        answer = String(num1 * num2);
      }
      displayStr = `${num1} ${op} ${num2} = ?`;
    } else {
      const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
      let code = '';
      for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      answer = code;
      displayStr = code;
    }

    setCaptchaAnswer(answer);
    drawCaptchaCanvas(displayStr);

    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // Draw stylized anti-bot canvas
  const drawCaptchaCanvas = (text: string) => {
    requestAnimationFrame(() => {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;

      // Background with pastel gradient
      const bgGrad = ctx.createLinearGradient(0, 0, w, h);
      bgGrad.addColorStop(0, '#0f172a');
      bgGrad.addColorStop(0.5, '#1e293b');
      bgGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Noise Lines
      for (let i = 0; i < 7; i++) {
        ctx.strokeStyle = `hsl(${Math.random() * 360}, 75%, 60%)`;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(Math.random() * w, Math.random() * h);
        ctx.bezierCurveTo(
          Math.random() * w, Math.random() * h,
          Math.random() * w, Math.random() * h,
          Math.random() * w, Math.random() * h
        );
        ctx.stroke();
      }

      // Noise dots
      for (let i = 0; i < 60; i++) {
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.2})`;
        ctx.beginPath();
        ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 2.5 + 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw characters with rotation and shadow
      ctx.font = 'bold 34px "Courier New", monospace';
      ctx.textBaseline = 'middle';
      const startX = 35;
      const letterSpacing = (w - 70) / text.length;

      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        ctx.save();
        const charX = startX + i * letterSpacing + (Math.random() * 6 - 3);
        const charY = h / 2 + (Math.random() * 6 - 3);
        const angle = (Math.random() * 20 - 10) * (Math.PI / 180);

        ctx.translate(charX, charY);
        ctx.rotate(angle);
        ctx.fillStyle = i % 2 === 0 ? '#38bdf8' : '#34d399';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 6;
        ctx.fillText(char, 0, 0);
        ctx.restore();
      }
    });
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  // Timer Countdown
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  // Handle Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser || !profile) {
      onOpenAuth();
      return;
    }

    if (captchasLeft <= 0) {
      setFeedback({ type: 'error', message: 'Daily Captcha limit reached. Please come back tomorrow!' });
      sound.playError();
      return;
    }

    if (!userInput.trim()) {
      setFeedback({ type: 'error', message: 'Please enter the answer.' });
      return;
    }

    setLoading(true);

    const isCorrect = userInput.trim().toUpperCase() === captchaAnswer.trim().toUpperCase();

    if (isCorrect) {
      // Calculate reward: Base 20 coins + speed bonus (strictly capped <= 50 coins)
      let baseCoins = 20;
      if (timer > 12) baseCoins += 20; // 40 coins for fast answer
      else if (timer > 5) baseCoins += 10; // 30 coins
      baseCoins = Math.min(50, baseCoins);

      try {
        await earnCoins(
          profile.uid,
          baseCoins,
          'captcha',
          `Captcha Solved (${baseCoins} Coins)`,
          'captchasLeftToday'
        );
        sound.playWin();

        setLastWonCoins(baseCoins);
        setShowWinModal(true);
        setSolvedCount((prev) => prev + 1);
        setRecentWins((prev) => [
          {
            id: Date.now().toString(),
            coins: baseCoins,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
          ...prev.slice(0, 4),
        ]);

        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });

        setFeedback({
          type: 'success',
          message: `Correct! +${baseCoins} Coins credited to wallet!`,
          coins: baseCoins,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to credit coins';
        setFeedback({ type: 'error', message: msg });
      }
    } else {
      sound.playError();
      setFeedback({
        type: 'error',
        message: 'Incorrect answer! Please try the new captcha below.',
      });
      setTimeout(() => {
        generateCaptcha();
      }, 500);
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col overflow-y-auto min-h-screen">
      {/* Background glow effects */}
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-40 -right-40 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

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
                Solve Captcha
              </h1>
              <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black px-1.5 py-0.5 rounded-md">
                FULL SCREEN
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* User Balance Chip */}
          <div
            onClick={onOpenWithdraw}
            className="cursor-pointer bg-slate-800/90 hover:bg-slate-700/90 border border-emerald-500/30 px-3 py-1.5 rounded-2xl flex items-center gap-2 transition-all shadow-inner"
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

      {/* Main Captcha Stage */}
      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-4 sm:py-6 flex flex-col items-center justify-between relative z-10">
        {/* Captcha Card Arena */}
        <div className="w-full my-auto flex flex-col items-center">
          {/* Timer & Speed Bonus Header */}
          <div className="w-full max-w-sm flex items-center justify-between px-2 mb-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-300 font-bold">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Time Remaining:</span>
              <span className={`font-mono font-black ${timer <= 5 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                {timer}s
              </span>
            </div>

            <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-md border border-emerald-500/30">
              {timer > 12 ? '⚡ +10 Speed Bonus' : '+15 Base Coins'}
            </span>
          </div>

          {/* Distorted Captcha Canvas Box */}
          <div className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(16,185,129,0.25)] border-2 border-emerald-500/40 bg-slate-900 p-3 flex flex-col items-center">
            <canvas
              ref={canvasRef}
              width={320}
              height={100}
              className="w-full h-24 rounded-2xl border border-slate-700/80 shadow-inner"
            />

            {/* Refresh Button on Captcha */}
            <button
              type="button"
              onClick={generateCaptcha}
              disabled={loading}
              className="mt-2.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              <span>Change / Refresh Captcha</span>
            </button>
          </div>

          {/* Input & Form */}
          <form onSubmit={handleSubmit} className="w-full max-w-sm mt-4 space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 px-1">
                Enter The Answer / Code:
              </label>
              <input
                ref={inputRef}
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={captchaType === 'math' ? 'e.g. 42' : 'e.g. 7K9P2'}
                disabled={loading || captchasLeft <= 0}
                autoFocus
                className="w-full px-4 py-3.5 bg-slate-900/90 border-2 border-slate-700 focus:border-emerald-500 rounded-2xl text-center text-xl font-mono font-black text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all uppercase"
              />
            </div>

            {/* Feedback alert */}
            {feedback && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-200'
                    : 'bg-rose-950/80 border border-rose-800 text-rose-200'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            {/* Big Action Submit Button */}
            <button
              type="submit"
              disabled={loading || captchasLeft <= 0 || !userInput.trim()}
              className={`w-full py-4 px-6 rounded-2xl font-display font-black text-lg shadow-2xl transition-all flex items-center justify-center gap-2.5 active:scale-98 ${
                captchasLeft <= 0
                  ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-[0_0_30px_rgba(16,185,129,0.4)] border-2 border-emerald-200'
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Verifying Answer...</span>
                </>
              ) : captchasLeft <= 0 ? (
                <span>DAILY LIMIT COMPLETED (COME BACK TOMORROW)</span>
              ) : (
                <>
                  <Zap className="w-5 h-5 fill-slate-950 text-slate-950" />
                  <span>SUBMIT &amp; CLAIM COINS ({captchasLeft} LEFT)</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Recent Wins Ticker */}
        {recentWins.length > 0 && (
          <div className="w-full mt-3 bg-emerald-950/40 border border-emerald-800/40 rounded-2xl px-4 py-2 text-xs flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Your Last Captcha Win:</span>
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
          <div key="captcha-win-backdrop" className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              key="captcha-win-modal"
              initial={{ scale: 0.6, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.7, opacity: 0, y: 20 }}
              className="bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-emerald-400/80 rounded-3xl p-6 sm:p-8 text-center max-w-sm w-full shadow-[0_0_60px_rgba(16,185,129,0.5)] relative overflow-hidden"
            >
              <div className="absolute -top-20 -left-20 w-48 h-48 bg-emerald-500/30 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-cyan-500/30 rounded-full blur-3xl pointer-events-none" />

              <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-xl shadow-emerald-500/30">
                <ShieldCheck className="w-10 h-10 text-slate-950 stroke-[2.5]" />
              </div>

              <span className="text-xs uppercase tracking-widest font-black text-emerald-400 block mb-1">
                CAPTCHA SOLVED!
              </span>

              <h2 className="font-display font-black text-4xl sm:text-5xl text-white tracking-tight my-1">
                +{lastWonCoins} <span className="text-amber-400 text-2xl font-bold">Coins</span>
              </h2>

              <p className="text-xs text-slate-300 mt-2 mb-6">
                Coins have been added to your wallet! Real cash value: <strong className="text-emerald-400">₹{(lastWonCoins / 100).toFixed(2)}</strong>
              </p>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    setShowWinModal(false);
                    if (captchasLeft > 0) {
                      generateCaptcha();
                    }
                  }}
                  disabled={captchasLeft <= 0}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-600 hover:to-teal-500 text-slate-950 font-display font-black text-sm rounded-2xl shadow-lg shadow-emerald-500/25 active:scale-98 transition-all disabled:opacity-50"
                >
                  {captchasLeft > 0 ? `SOLVE NEXT CAPTCHA (${captchasLeft} Left)` : 'Daily Captchas Finished'}
                </button>

                <button
                  onClick={() => setShowWinModal(false)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors"
                >
                  Stay on Captcha Page
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
