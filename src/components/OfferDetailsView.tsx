import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  Upload,
  Check,
  Star,
  FileText,
  ShieldCheck,
  X
} from 'lucide-react';
import { GoldCoin } from './GoldCoin';
import { AppTask, UserTaskProgress, UserTaskStatus, TaskMilestone } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  startUserTask,
  submitTaskForReview
} from '../services/coinService';
import { sound } from '../utils/sound';

interface OfferDetailsViewProps {
  task: AppTask;
  progress?: UserTaskProgress;
  onBack: () => void;
  onOpenAuth: () => void;
  onProgressUpdated?: (taskId: string, progress: UserTaskProgress) => void;
}

export const OfferDetailsView: React.FC<OfferDetailsViewProps> = ({
  task,
  progress,
  onBack,
  onOpenAuth,
  onProgressUpdated
}) => {
  const { profile } = useAuth();
  const [currentProgress, setCurrentProgress] = useState<UserTaskProgress | undefined>(progress);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [proofText, setProofText] = useState('');
  const [proofScreenshot, setProofScreenshot] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);

  const [selectedStepIdx, setSelectedStepIdx] = useState<number>(0);
  const [selectedProofPreview, setSelectedProofPreview] = useState<string | null>(null);

  useEffect(() => {
    setCurrentProgress(progress);
  }, [progress]);

  // Handle timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerSeconds]);

  // Build or compute milestones (Rewards list) matching the exact screenshot
  const rewardsList: TaskMilestone[] = React.useMemo(() => {
    if (task.milestones && task.milestones.length > 0) {
      return task.milestones;
    }

    const totalCoins = task.coins || 1000;

    // 1. Level Tasks (Progressive Game Ladder matching user screenshot)
    if (task.type === 'level') {
      const targetLvl = task.targetLevel || 50;
      let levelSteps: number[] = [];

      if (targetLvl >= 180) {
        levelSteps = [10, 20, 30, 40, 50, 80, 100, 150, targetLvl];
      } else if (targetLvl >= 100) {
        levelSteps = [10, 20, 30, 50, 75, targetLvl];
      } else if (targetLvl >= 50) {
        levelSteps = [10, 20, 30, 40, targetLvl];
      } else if (targetLvl >= 20) {
        levelSteps = [5, 10, 15, targetLvl];
      } else {
        const step = Math.max(1, Math.floor(targetLvl / 3));
        levelSteps = [step, step * 2, targetLvl];
      }

      // Filter uniques and <= targetLvl
      const uniqueLevels = Array.from(new Set(levelSteps.filter(l => l <= targetLvl && l > 0)));

      // Distribute coins progressively with higher level weights
      const weights = uniqueLevels.map((_, i) => i + 1);
      const totalWeight = weights.reduce((a, b) => a + b, 0);

      let allocated = 0;
      return uniqueLevels.map((lvl, idx) => {
        if (idx === uniqueLevels.length - 1) {
          return { title: `Reach ${lvl} Level`, coins: Math.max(1, totalCoins - allocated) };
        }
        const reward = Math.max(1, Math.round((totalCoins * weights[idx]) / totalWeight));
        allocated += reward;
        return { title: `Reach ${lvl} Level`, coins: reward };
      });
    }

    // 2. Day Tasks
    if (task.type === 'day') {
      const days = task.daysCount || 7;
      if (days <= 3) {
        const c1 = Math.round(totalCoins * 0.3);
        const c2 = Math.round(totalCoins * 0.3);
        const c3 = totalCoins - (c1 + c2);
        return [
          { title: 'Day 1: Install & Open App', coins: c1 },
          { title: 'Day 2: Open & Use App 1 Min', coins: c2 },
          { title: 'Day 3: Final Goal & Check-in', coins: c3 }
        ];
      }
      const dailyCoin = Math.floor((totalCoins * 0.5) / (days - 1));
      const finalCoin = totalCoins - (dailyCoin * (days - 1));
      const list: TaskMilestone[] = [];
      for (let d = 1; d < days; d++) {
        list.push({ title: `Day ${d}: Open & Use App`, coins: dailyCoin });
      }
      list.push({ title: `Day ${days}: Complete Final Goal`, coins: finalCoin });
      return list;
    }

    // 3. Minute Tasks
    if (task.type === 'minute') {
      const mins = task.durationMinutes || 2;
      if (mins <= 1) {
        return [{ title: 'Minute 1: Active In-App Surf', coins: totalCoins }];
      }
      const list: TaskMilestone[] = [];
      const coinPerMin = Math.floor(totalCoins / mins);
      for (let m = 1; m < mins; m++) {
        list.push({ title: `Minute ${m}: Active In-App Surf`, coins: coinPerMin });
      }
      list.push({ title: `Minute ${mins}: Final Goal & Finish`, coins: totalCoins - (coinPerMin * (mins - 1)) });
      return list;
    }

    // 4. Instant / 1 Bar me Sari Coin Tasks
    if (task.type === 'instant') {
      return [
        { title: 'Complete Task & Claim All Coins', coins: totalCoins }
      ];
    }

    // 5. Install / Follow / Other Tasks
    const c1 = Math.round(totalCoins * 0.3);
    const c2 = Math.round(totalCoins * 0.3);
    const c3 = totalCoins - (c1 + c2);

    return [
      { title: 'Install & Open App', coins: c1 },
      { title: 'Register New Account', coins: c2 },
      { title: 'Explore & Use for 60 Seconds', coins: c3 }
    ];
  }, [task]);

  const totalSteps = rewardsList.length;
  const rawCompleted = currentProgress?.completedStepCount !== undefined
    ? currentProgress.completedStepCount
    : (currentProgress?.status === 'approved' ? totalSteps : 0);
  const completedSteps = Math.min(rawCompleted, totalSteps);
  const isFullyApproved = completedSteps >= totalSteps || currentProgress?.status === 'approved';
  const isPending = currentProgress?.status === 'pending_approval';
  const activeStepIdx = Math.min(completedSteps, totalSteps - 1);
  const activeStep = rewardsList[activeStepIdx];
  const targetStep = rewardsList[selectedStepIdx] || activeStep || rewardsList[0];

  // Helper to get step proof info
  const getStepProof = (idx: number) => {
    return currentProgress?.stepProofs?.find(p => p.stepIndex === idx);
  };

  const isStepDone = (idx: number) => {
    const p = getStepProof(idx);
    if (p?.status === 'approved') return true;
    if (currentProgress?.status === 'approved') return true;
    return idx < completedSteps;
  };

  const isStepInReview = (idx: number) => {
    const p = getStepProof(idx);
    if (p?.status === 'pending') return true;
    if (isPending && (currentProgress?.currentStepIndex === idx || (currentProgress?.currentStepIndex === undefined && idx === completedSteps))) {
      return true;
    }
    return false;
  };

  // Open proof upload modal specifically for a selected step
  const handleOpenProofModal = (stepIdx: number) => {
    if (!profile) {
      onOpenAuth();
      return;
    }
    setSelectedStepIdx(stepIdx);
    const existing = getStepProof(stepIdx);
    setProofScreenshot(existing?.proofScreenshot || (stepIdx === activeStepIdx ? currentProgress?.proofScreenshot || '' : ''));
    setProofText(existing?.proofText || (stepIdx === activeStepIdx ? currentProgress?.proofText || '' : ''));
    setShowProofModal(true);
  };

  // Handle Get Rewards action (starts task / opens link & opens proof modal)
  const handleGetRewards = async (stepIdx: number = activeStepIdx) => {
    if (!profile) {
      onOpenAuth();
      return;
    }

    sound.playCoinSound();
    setSelectedStepIdx(stepIdx);
    const chosenStep = rewardsList[stepIdx] || activeStep;

    // Mark task as started in backend/Firestore
    const newProg: UserTaskProgress = {
      id: `${profile.uid}_${task.id}`,
      userId: profile.uid,
      userName: profile.displayName || 'User',
      userEmail: profile.email || '',
      taskId: task.id,
      taskTitle: task.title,
      taskCoins: task.coins,
      taskType: task.type,
      status: currentProgress?.status === 'approved' ? 'approved' : 'started',
      currentStepIndex: stepIdx,
      currentStepTitle: chosenStep?.title,
      currentStepCoins: chosenStep?.coins,
      completedStepCount: completedSteps,
      totalSteps: totalSteps,
      startedAt: currentProgress?.startedAt || Date.now()
    };
    setCurrentProgress(newProg);
    if (onProgressUpdated) {
      onProgressUpdated(task.id, newProg);
    }

    try {
      await startUserTask(profile.uid, task, {
        currentStepIndex: stepIdx,
        totalSteps: totalSteps,
        currentStepTitle: chosenStep?.title,
        currentStepCoins: chosenStep?.coins
      });
    } catch (e) {
      console.warn('Could not update start task online:', e);
    }

    // If minute task, start timer
    const seconds = task.durationMinutes ? task.durationMinutes * 60 : (task.type === 'minute' ? 120 : 30);
    setTimerSeconds(seconds);

    // Open target link
    if (task.actionUrl) {
      window.open(task.actionUrl, '_blank', 'noopener,noreferrer');
    }

    // Open proof upload prompt
    const existing = getStepProof(stepIdx);
    setProofScreenshot(existing?.proofScreenshot || '');
    setProofText(existing?.proofText || '');
    setShowProofModal(true);
  };

  // Handle Screenshot Upload
  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Screenshot size must be under 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setProofScreenshot(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit proof for approval
  const handleSubmitProof = async () => {
    if (!profile) {
      onOpenAuth();
      return;
    }
    setIsSubmitting(true);
    setIsVerifying(true);
    sound.playTick();

    const chosenStep = rewardsList[selectedStepIdx] || activeStep;
    const stepTitle = chosenStep?.title || `Step ${selectedStepIdx + 1}`;
    const stepCoins = chosenStep?.coins || Math.round((task.coins || 100) / totalSteps);

    try {
      const res = await submitTaskForReview(
        profile.uid,
        { displayName: profile.displayName, email: profile.email },
        task,
        proofText,
        proofScreenshot,
        {
          stepIndex: selectedStepIdx,
          title: stepTitle,
          coins: stepCoins,
          totalSteps: totalSteps
        }
      );

      if (res.success) {
        sound.playWin();
        const updatedProofs = [...(currentProgress?.stepProofs || []).filter(p => p.stepIndex !== selectedStepIdx)];
        updatedProofs.push({
          stepIndex: selectedStepIdx,
          title: stepTitle,
          coins: stepCoins,
          status: 'pending',
          proofText: proofText,
          proofScreenshot: proofScreenshot,
          submittedAt: Date.now()
        });

        const updatedProg: UserTaskProgress = {
          id: `${profile.uid}_${task.id}`,
          userId: profile.uid,
          userName: profile.displayName,
          userEmail: profile.email,
          taskId: task.id,
          taskTitle: task.title,
          taskCoins: task.coins,
          taskType: task.type,
          status: 'pending_approval',
          currentStepIndex: selectedStepIdx,
          currentStepTitle: stepTitle,
          currentStepCoins: stepCoins,
          completedStepCount: completedSteps,
          totalSteps: totalSteps,
          proofText,
          proofScreenshot: proofScreenshot,
          stepProofs: updatedProofs,
          startedAt: currentProgress?.startedAt || Date.now(),
          submittedAt: Date.now()
        };
        setCurrentProgress(updatedProg);
        if (onProgressUpdated) onProgressUpdated(task.id, updatedProg);
        setShowProofModal(false);
      }
    } catch (err) {
      console.error('Submission error:', err);
    } finally {
      setIsVerifying(false);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9FD] text-[#0f172a] flex flex-col justify-between selection:bg-purple-500 selection:text-white pb-24">
      {/* 1. Top Header: Back Arrow + Uppercase Task Title */}
      <div className="sticky top-0 z-30 bg-[#FAF9FD]/95 backdrop-blur-md px-4 py-3.5 flex items-center gap-3">
        <button
          onClick={onBack}
          aria-label="Go Back"
          className="p-1 -ml-1 rounded-full text-slate-800 hover:bg-slate-200/60 active:scale-95 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-6 h-6 stroke-[2.5]" />
        </button>
        <h1 className="text-base sm:text-lg font-display font-black text-[#1E1B4B] tracking-tight truncate uppercase">
          {task.title}
        </h1>
      </div>

      {/* 2. Main Body Content (Exact structure matching Screenshot_20260904-183428.jpg) */}
      <div className="max-w-md w-full mx-auto px-4 pt-1 pb-6 space-y-4">
        {/* Hero Banner Card with Centered App Icon */}
        <div className="w-full h-32 sm:h-36 rounded-2xl bg-gradient-to-r from-[#e0e7ff]/70 via-[#fae8ff]/70 to-[#dcfce7]/70 border border-purple-100/80 shadow-xs flex items-center justify-center relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute inset-0 bg-white/40 backdrop-blur-xs" />

          {/* Centered Floating Logo / Icon */}
          <div className="relative z-10">
            {task.logoUrl ? (
              <img
                src={task.logoUrl}
                alt={task.title}
                className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl object-cover shadow-lg border-2 border-white"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div
                className={`w-16 h-16 sm:w-18 sm:h-18 rounded-2xl ${
                  task.logoBg || 'bg-[#7C3AED]'
                } text-white flex flex-col items-center justify-center text-center shadow-lg border-2 border-white font-black text-xl`}
              >
                {task.logoText || task.title.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Coin & Rating Area */}
        <div className="flex items-center justify-between pt-1">
          {/* Left: Gold Coin + Large Bold Coin Reward */}
          <div className="flex items-center gap-2">
            <GoldCoin className="w-7 h-7 drop-shadow-xs" />
            <span className="font-display font-black text-2xl sm:text-3xl text-[#1E1B4B] tracking-tight">
              {(task.coins || 0).toLocaleString()}
            </span>
          </div>

          {/* Right: 5 Stars + Task Pill Badge */}
          <div className="flex flex-col items-end gap-1">
            <span className="bg-[#FAF5FF] text-[#7C3AED] border border-[#E9D5FF] text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
              {task.type === 'level' ? 'Level Task' : task.type === 'day' ? 'Day Task' : 'Task'}
            </span>
            <div className="flex items-center gap-0.5 text-amber-400">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <Star className="w-3.5 h-3.5 fill-amber-400" />
            </div>
          </div>
        </div>

        {/* Section 1: Description */}
        <div>
          <h2 className="text-sm font-display font-black text-[#7C3AED] mb-1.5">
            Description
          </h2>
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
            <p className="text-xs sm:text-sm text-[#334155] leading-relaxed font-normal">
              {task.description || `${task.title} is an engaging and rewarding task on Rewardluxe.`}
            </p>
          </div>
        </div>

        {/* Section 2: Instructions */}
        <div>
          <h2 className="text-sm font-display font-black text-[#7C3AED] mb-1.5">
            Instructions
          </h2>
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
            <p className="text-xs sm:text-sm text-[#334155] font-medium leading-relaxed">
              {task.instructions || (
                task.type === 'level'
                  ? `Reach ${task.targetLevel || 10} Level in the game.`
                  : task.type === 'day'
                  ? `Open and use the app daily for ${task.daysCount || 7} consecutive days.`
                  : 'Install, register, and complete the required in-app action.'
              )}
            </p>
          </div>
        </div>

        {/* Section 3: Rewards (Milestones List) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-sm font-display font-black text-[#7C3AED]">
                Rewards &amp; Milestones
              </h2>
              <p className="text-[10px] text-slate-500">
                Har level ya minute ka screenshot upload karke coins claim karein:
              </p>
            </div>
            <span className="text-[11px] font-bold text-slate-700 bg-purple-100/70 border border-purple-200 px-2.5 py-1 rounded-xl">
              {completedSteps} of {totalSteps} Completed
            </span>
          </div>

          <div className="space-y-2.5">
            {rewardsList.map((reward, idx) => {
              const stepProof = getStepProof(idx);
              const isCompleted = isStepDone(idx);
              const inReview = isStepInReview(idx);
              const isCurrent = idx === activeStepIdx && !isCompleted && !inReview;

              return (
                <div
                  key={`milestone-${idx}`}
                  className={`rounded-2xl p-3.5 sm:p-4 border transition-all ${
                    isCompleted
                      ? 'bg-emerald-50/70 border-emerald-200 shadow-2xs'
                      : inReview
                      ? 'bg-amber-50/70 border-amber-300 shadow-xs ring-1 ring-amber-300'
                      : isCurrent
                      ? 'bg-white border-purple-300 shadow-xs ring-2 ring-purple-500/25'
                      : 'bg-white/80 border-slate-200/80 shadow-2xs hover:border-purple-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    {/* Left: Indicator + Title + Instructions */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-xs ${
                          isCompleted
                            ? 'bg-emerald-600 text-white'
                            : inReview
                            ? 'bg-amber-500 text-white animate-pulse'
                            : isCurrent
                            ? 'bg-purple-600 text-white font-black text-xs'
                            : 'bg-slate-100 text-slate-600 font-black text-xs border border-slate-200'
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="w-4 h-4 stroke-[3]" />
                        ) : inReview ? (
                          <Clock className="w-4 h-4 stroke-[2.5]" />
                        ) : (
                          <span>{idx + 1}</span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-xs sm:text-sm font-black truncate ${
                              isCompleted
                                ? 'text-emerald-950 line-through opacity-80'
                                : inReview
                                ? 'text-amber-950'
                                : 'text-[#1E1B4B]'
                            }`}
                          >
                            {reward.title}
                          </span>

                          {isCompleted && (
                            <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase">
                              ✓ Approved
                            </span>
                          )}
                          {inReview && (
                            <span className="bg-amber-100 text-amber-900 text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase animate-pulse">
                              ⏳ In Review
                            </span>
                          )}
                          {isCurrent && (
                            <span className="bg-purple-100 text-purple-800 text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase">
                              Active Step
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                          {isCompleted
                            ? `Earned +${reward.coins} Coins`
                            : inReview
                            ? 'Screenshot uploaded, verification in progress'
                            : 'Upload screenshot to claim this reward'}
                        </p>
                      </div>
                    </div>

                    {/* Right: Golden Coin Badge */}
                    <div
                      className={`border rounded-full px-2.5 py-1 flex items-center gap-1.5 shrink-0 shadow-2xs ${
                        isCompleted
                          ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                          : inReview
                          ? 'bg-amber-100 border-amber-300 text-amber-800'
                          : 'bg-[#F0FDF4] border-[#BBF7D0] text-[#14532D]'
                      }`}
                    >
                      <GoldCoin className="w-4 h-4" />
                      <span className="font-display font-black text-xs sm:text-sm">
                        {reward.coins} Coins
                      </span>
                    </div>
                  </div>

                  {/* Screenshot Proof Bar & Action Button */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100/90 flex items-center justify-between gap-2">
                    {/* Proof Preview Thumbnail if submitted */}
                    {stepProof?.proofScreenshot || (inReview && currentProgress?.proofScreenshot) ? (
                      <div className="flex items-center gap-2">
                        <img
                          src={stepProof?.proofScreenshot || currentProgress?.proofScreenshot}
                          alt="Screenshot Proof"
                          onClick={() =>
                            setSelectedProofPreview(
                              stepProof?.proofScreenshot || currentProgress?.proofScreenshot || null
                            )
                          }
                          className="w-10 h-10 object-cover rounded-lg border border-purple-200 cursor-pointer shadow-xs hover:scale-105 transition-transform"
                          title="Click to view full screenshot"
                        />
                        <div className="text-[10px] text-slate-500">
                          <span className="font-bold text-purple-700 block">Screenshot Attached</span>
                          <span>Tap to view image</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Upload className="w-3.5 h-3.5 text-slate-400" />
                        <span>Screenshot Required</span>
                      </div>
                    )}

                    {/* Action Upload / View Button for each individual step */}
                    {isCompleted ? (
                      <span className="text-[11px] font-black text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Done (+{reward.coins})</span>
                      </span>
                    ) : inReview ? (
                      <button
                        type="button"
                        onClick={() => handleOpenProofModal(idx)}
                        className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[11px] rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <span>🔄 Update Screenshot</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleGetRewards(idx)}
                        className={`px-3 py-1.5 rounded-xl font-display font-black text-xs transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 ${
                          isCurrent
                            ? 'bg-[#703BF7] hover:bg-[#612ae6] text-white shadow-purple-500/30'
                            : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200'
                        }`}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Screenshot</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Box */}
        {isFullyApproved ? (
          <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs flex items-center gap-2.5 shadow-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-black text-sm">All Steps Completed &amp; Approved!</p>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                Total {(task.coins || 0).toLocaleString()} Coins have been credited to your wallet.
              </p>
            </div>
          </div>
        ) : isPending ? (
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 text-xs flex items-center gap-2.5 shadow-xs">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 animate-pulse" />
            <div>
              <p className="font-bold">
                Proof Submitted for Review ({targetStep?.title || `Step ${activeStepIdx + 1}`})
              </p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Admin is verifying your screenshot. Coins will be credited once approved.
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* 3. Sticky Bottom Full-Width Action Button */}
      <div className="fixed bottom-0 inset-x-0 bg-gradient-to-t from-[#FAF9FD] via-[#FAF9FD]/95 to-transparent pt-3 pb-5 px-4 z-40 max-w-md mx-auto">
        {isFullyApproved ? (
          <button
            onClick={onBack}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-display font-bold text-base rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Task Fully Completed • Back to Tasks</span>
          </button>
        ) : (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => handleGetRewards(activeStepIdx)}
            className="w-full py-4 bg-[#703BF7] hover:bg-[#612ae6] text-white font-display font-black text-base sm:text-lg rounded-2xl shadow-xl shadow-purple-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer tracking-wide"
          >
            <Upload className="w-5 h-5" />
            <span>
              {completedSteps > 0
                ? `Upload Step ${activeStepIdx + 1}: ${activeStep?.title}`
                : 'Get Rewards & Upload Screenshot'}
            </span>
            <GoldCoin className="w-5 h-5" />
            <span>{completedSteps > 0 ? `+${activeStep?.coins}` : (task.coins || 0).toLocaleString()}</span>
          </motion.button>
        )}
      </div>

      {/* Proof Submission Modal with required screenshot enforcement */}
      {showProofModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-5 max-w-md w-full shadow-2xl border border-slate-100 space-y-3.5"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-display font-black text-sm">
                <FileText className="w-4 h-4 text-purple-600" />
                <span>Submit Proof • Step {selectedStepIdx + 1} of {totalSteps}</span>
              </div>
              <button
                onClick={() => setShowProofModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step Target Banner */}
            <div className="bg-purple-50 rounded-2xl p-3.5 border border-purple-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-purple-600 uppercase tracking-wider block">
                  Target Milestone:
                </span>
                <p className="text-xs font-black text-purple-950 mt-0.5">
                  {targetStep?.title || task.title}
                </p>
                <p className="text-[11px] font-bold text-amber-600 mt-0.5">
                  Reward on Approval: +{targetStep?.coins || Math.round((task.coins || 100) / totalSteps)} Coins
                </p>
              </div>
              <div className="bg-purple-600 text-white font-black text-xs px-2.5 py-1.5 rounded-xl shadow-xs shrink-0">
                Step {selectedStepIdx + 1}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Your Registered Username / ID / Notes (Optional)
              </label>
              <input
                type="text"
                value={proofText}
                onChange={(e) => setProofText(e.target.value)}
                placeholder="e.g. In-Game ID or Level reached"
                className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-purple-600 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Upload Screenshot Proof <span className="text-red-500">*</span></span>
                <span className="text-[10px] text-purple-600 font-bold">Required</span>
              </label>
              <label className="flex flex-col items-center justify-center p-4 bg-slate-50 border-2 border-dashed border-purple-300 rounded-2xl cursor-pointer hover:bg-purple-50/50 transition-colors">
                <Upload className="w-6 h-6 text-purple-600 mb-1.5" />
                <span className="text-xs text-purple-900 font-black">
                  {proofScreenshot ? 'Screenshot Selected (Tap to change)' : 'Tap to select screenshot from gallery/camera'}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG up to 2MB</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleScreenshotChange}
                  className="hidden"
                />
              </label>
              {proofScreenshot ? (
                <div className="mt-2 text-center relative inline-block w-full">
                  <img
                    src={proofScreenshot}
                    alt="Proof preview"
                    className="max-h-32 rounded-xl mx-auto border-2 border-purple-400 shadow-xs object-cover"
                  />
                  <span className="inline-block mt-1 text-[10px] font-bold text-emerald-600">
                    ✓ Screenshot ready for "{targetStep?.title}"
                  </span>
                </div>
              ) : (
                <p className="text-[10px] text-slate-500 mt-1">
                  Upload screenshot showing that you reached "{targetStep?.title}".
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowProofModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitProof}
                disabled={isSubmitting || isVerifying || !proofScreenshot}
                className={`flex-1 py-3 font-display font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  !proofScreenshot
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-[#703BF7] hover:bg-[#612ae6] text-white shadow-purple-500/25'
                }`}
              >
                {isVerifying ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Submit Screenshot</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Large Screenshot Preview Modal */}
      {selectedProofPreview && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedProofPreview(null)}
        >
          <div className="relative max-w-lg w-full bg-slate-900 rounded-3xl p-3 shadow-2xl border border-slate-700">
            <button
              onClick={() => setSelectedProofPreview(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center z-10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={selectedProofPreview}
              alt="Full Proof Screenshot"
              className="w-full max-h-[80vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
