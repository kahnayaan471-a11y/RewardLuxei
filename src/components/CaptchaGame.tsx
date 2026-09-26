import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ShieldCheck, RefreshCw, CheckCircle2, AlertCircle, Coins, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { earnCoins, DEFAULT_SETTINGS } from '../services/coinService';
import { sound } from '../utils/sound';

interface CaptchaGameProps {
  onOpenAuth: () => void;
}

export const CaptchaGame: React.FC<CaptchaGameProps> = ({ onOpenAuth }) => {
  const { profile, currentUser } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [captchaType, setCaptchaType] = useState<'text' | 'math'>('math');
  const [captchaAnswer, setCaptchaAnswer] = useState<string>('');
  const [userInput, setUserInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string; coins?: number } | null>(null);
  const [timer, setTimer] = useState<number>(20);
  const [solvedCount, setSolvedCount] = useState<number>(0);

  const captchasLeft = profile?.captchasLeftToday ?? DEFAULT_SETTINGS.dailyCaptchaLimit;

  // Generate a new captcha
  const generateCaptcha = () => {
    setUserInput('');
    setFeedback(null);
    setTimer(20);

    const isMath = Math.random() > 0.4; // 60% math, 40% text
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
  };

  // Draw distorted captcha on Canvas
  const drawCaptchaCanvas = (text: string) => {
    setTimeout(() => {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;

      // Background with soft pastel noise
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, w, h);

      // Noise Lines
      for (let i = 0; i < 6; i++) {
        ctx.strokeStyle = `hsl(${Math.random() * 360}, 60%, 75%)`;
        ctx.lineWidth = 1.5;
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
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = `rgba(100, 116, 139, ${Math.random() * 0.4})`;
        ctx.beginPath();
        ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 2 + 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw characters with subtle rotation
      ctx.font = 'bold 26px "Courier New", monospace';
      ctx.textBaseline = 'middle';
      const startX = 25;
      const letterSpacing = (w - 50) / text.length;

      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        ctx.save();
        const charX = startX + i * letterSpacing + (Math.random() * 6 - 3);
        const charY = h / 2 + (Math.random() * 6 - 3);
        const angle = (Math.random() * 20 - 10) * (Math.PI / 180);

        ctx.translate(charX, charY);
        ctx.rotate(angle);
        ctx.fillStyle = '#0f172a';
        ctx.fillText(char, 0, 0);
        ctx.restore();
      }
    }, 50);
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
      setFeedback({ type: 'error', message: 'Daily Captcha limit reached. Please try again tomorrow!' });
      sound.playError();
      return;
    }

    if (!userInput.trim()) {
      setFeedback({ type: 'error', message: 'Please enter the answer.' });
      return;
    }

    const isCorrect = userInput.trim().toUpperCase() === captchaAnswer.trim().toUpperCase();

    if (!isCorrect) {
      sound.playError();
      setFeedback({
        type: 'error',
        message: 'Incorrect answer! Try the new captcha.'
      });
      setTimeout(() => {
        generateCaptcha();
      }, 1200);
      return;
    }

    // Base Reward + Speed Bonus (strictly capped <= 50 coins)
    let reward = 25; // 25 coins
    if (timer > 10) {
      reward += 15; // +15 speed bonus -> 40 coins
    } else if (timer > 5) {
      reward += 5; // +5 speed bonus -> 30 coins
    }
    reward = Math.min(50, reward);

    setLoading(true);

    try {
      await earnCoins(
        profile.uid,
        reward,
        'captcha',
        `Captcha Solved (+${reward} Coins${timer > 10 ? ' including speed bonus' : ''})`,
        'captchasLeftToday'
      );

      sound.playWin();
      setSolvedCount((prev) => prev + 1);
      setFeedback({
        type: 'success',
        message: `Correct answer! +${reward} Coins credited!`,
        coins: reward
      });

      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 }
      });

      setTimeout(() => {
        generateCaptcha();
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Coin addition failed';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 md:p-6 shadow-xl border border-slate-100 flex flex-col relative overflow-hidden">
      {/* Glow */}
      <div className="absolute -top-16 -right-16 w-40 h-40 bg-emerald-200/40 rounded-full blur-3xl pointer-events-none" />

      {/* Header Info */}
      <div className="w-full flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-black text-lg text-slate-900 leading-tight">
              Solve Captcha &amp; Earn
            </h3>
            <p className="text-xs text-slate-700">Solve simple puzzles to earn coins</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>{captchasLeft} Left</span>
          </div>
        </div>
      </div>

      {/* Captcha Box */}
      <div className="my-2 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-4 flex flex-col items-center">
        <div className="w-full flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Speed Timer: <strong className={timer <= 5 ? 'text-rose-500 font-extrabold' : 'text-slate-700'}>{timer}s</strong></span>
          </span>

          <button
            onClick={generateCaptcha}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 p-1 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Change</span>
          </button>
        </div>

        {/* Captcha Canvas */}
        <div className="w-full max-w-xs h-16 rounded-xl overflow-hidden border border-slate-300 shadow-inner bg-white flex items-center justify-center">
          <canvas ref={canvasRef} width={280} height={64} className="w-full h-full" />
        </div>

        <span className="text-[11px] text-slate-700 mt-1.5">
          {captchaType === 'math' ? 'Enter the correct result of the math problem above' : 'Type the exact characters shown in the box above'}
        </span>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="mt-2 space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder={captchaType === 'math' ? 'Enter correct answer...' : 'Type letters/numbers...'}
            disabled={loading || captchasLeft <= 0}
            className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-2xl text-center font-display font-bold text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-inner"
            autoComplete="off"
          />

          <button
            type="submit"
            disabled={loading || captchasLeft <= 0}
            className={`px-5 py-3 rounded-2xl font-display font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
              captchasLeft <= 0
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-emerald-500/25'
            }`}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Submit</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Feedback Banner */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            key="captcha-feedback-banner"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`mt-3 p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rewards tip */}
      <div className="mt-3 bg-amber-50/60 border border-amber-200/60 rounded-xl p-2 flex items-center justify-between text-[11px] text-amber-900 font-medium">
        <div className="flex items-center gap-1">
          <Coins className="w-3.5 h-3.5 text-amber-600" />
          <span>Reward: 25 Coins + 10 Bonus if solved in 10s</span>
        </div>
        <span className="font-bold">Solved: {solvedCount}</span>
      </div>
    </div>
  );
};
