import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Clock,
  Sparkles,
  AlertCircle,
  Play,
  Award,
  Zap,
  Tag,
  Upload,
  XCircle,
  FileText,
  ShieldAlert,
  HelpCircle,
  History,
  CheckCircle,
  Eye,
  RotateCcw,
  X
} from 'lucide-react';
import { GoldCoin } from './GoldCoin';
import { AppTask, UserTaskProgress, UserTaskStatus } from '../types';
import {
  fetchTasks,
  subscribeToTasks,
  fetchUserTaskProgress,
  subscribeToUserTaskProgress,
  isTaskCompleted,
  startUserTask,
  submitTaskForReview,
  completeUserTask,
  getUserAvailableTasksForWithdrawal
} from '../services/coinService';
import { useAuth } from '../context/AuthContext';
import { sound } from '../utils/sound';
import { OfferDetailsView } from './OfferDetailsView';

interface TaskOfferwallViewProps {
  onBack?: () => void;
  onOpenAuth?: () => void;
  onSelectTask?: (task: AppTask) => void;
  initialTab?: 'available' | 'history';
  initialHistoryFilter?: 'all' | 'pending' | 'completed' | 'rejected';
  userProgressProp?: Record<string, UserTaskProgress>;
  onProgressUpdated?: (taskId: string, progress: UserTaskProgress) => void;
}

export const TaskOfferwallView: React.FC<TaskOfferwallViewProps> = ({
  onBack,
  onOpenAuth,
  onSelectTask,
  initialTab,
  initialHistoryFilter,
  userProgressProp,
  onProgressUpdated
}) => {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<AppTask[]>([]);
  const [userProgress, setUserProgress] = useState<Record<string, UserTaskProgress>>(userProgressProp || {});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'available' | 'history'>(initialTab || 'available');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'pending' | 'completed' | 'rejected'>(initialHistoryFilter || 'all');
  const [activeOfferDetailsTask, setActiveOfferDetailsTask] = useState<AppTask | null>(null);

  // Active Task Execution Modal
  const [selectedTask, setSelectedTask] = useState<AppTask | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [claimSuccess, setClaimSuccess] = useState<number | null>(null);

  // Proof Submission States
  const [proofText, setProofText] = useState('');
  const [proofScreenshot, setProofScreenshot] = useState('');
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [viewingStatusTask, setViewingStatusTask] = useState<{ task: AppTask; progress: UserTaskProgress } | null>(null);
  const [selectedProofPreview, setSelectedProofPreview] = useState<string | null>(null);

  // Sync with userProgressProp if provided
  useEffect(() => {
    if (userProgressProp && Object.keys(userProgressProp).length > 0) {
      setUserProgress(prev => ({ ...prev, ...userProgressProp }));
    }
  }, [userProgressProp]);

  // Sync with initialTab or initialHistoryFilter if changed
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (initialHistoryFilter) setHistoryFilter(initialHistoryFilter);
  }, [initialHistoryFilter]);

  useEffect(() => {
    loadAllTasks();

    const unsubscribeTasks = subscribeToTasks((liveTasks) => {
      setTasks(liveTasks);
      setLoading(false);
    }, false);

    let unsubscribeProgress = () => {};
    if (profile?.uid) {
      unsubscribeProgress = subscribeToUserTaskProgress(profile.uid, (liveProg) => {
        setUserProgress(liveProg);
      });
    }

    return () => {
      unsubscribeTasks();
      unsubscribeProgress();
    };
  }, [profile?.uid]);

  const loadAllTasks = async () => {
    setLoading(true);
    try {
      const taskList = await fetchTasks(false);
      setTasks(taskList);

      if (profile?.uid) {
        const progress = await fetchUserTaskProgress(profile.uid);
        setUserProgress(progress);
      }
    } catch (err) {
      console.error('Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter available tasks: Completed tasks MUST NOT appear in the user's available tasks list
  const availableTasks = React.useMemo(() => {
    return tasks.filter((task) => {
      const prog = userProgress[task.id];
      return !isTaskCompleted(prog);
    });
  }, [tasks, userProgress]);

  // Convert progress object to list for history view
  const historyList = React.useMemo(() => {
    return (Object.values(userProgress) as UserTaskProgress[])
      .filter((p: UserTaskProgress) => {
        // Include any task that has been submitted, approved, rejected, completed, or started
        return (
          p.status === 'pending_approval' ||
          p.status === 'approved' ||
          p.status === 'completed' ||
          p.status === 'rejected' ||
          p.status === 'started' ||
          isTaskCompleted(p)
        );
      })
      .map((p) => {
        // Find matching task definition if available
        const matchingTask = tasks.find((t) => t.id === p.taskId);
        return {
          ...p,
          taskTitle: p.taskTitle || matchingTask?.title || 'Task Offer',
          taskCoins: p.taskCoins || matchingTask?.coins || 0,
          taskType: p.taskType || matchingTask?.type || 'install'
        };
      })
      .sort(
        (a: UserTaskProgress, b: UserTaskProgress) =>
          (b.completedAt || b.reviewedAt || b.submittedAt || b.startedAt || 0) -
          (a.completedAt || a.reviewedAt || a.submittedAt || a.startedAt || 0)
      );
  }, [userProgress, tasks]);

  // Filter history based on sub-tab
  const filteredHistory = React.useMemo(() => {
    if (historyFilter === 'all') return historyList;
    if (historyFilter === 'pending') {
      return historyList.filter(
        item => (item.status === 'pending_approval' || item.status === 'started') && !isTaskCompleted(item)
      );
    }
    if (historyFilter === 'completed') {
      return historyList.filter(item => isTaskCompleted(item));
    }
    if (historyFilter === 'rejected') {
      return historyList.filter(item => item.status === 'rejected');
    }
    return historyList;
  }, [historyList, historyFilter]);

  // Counts for tabs
  const completedCount = historyList.filter(i => isTaskCompleted(i)).length;
  const pendingCount = historyList.filter(
    i => (i.status === 'pending_approval' || i.status === 'started') && !isTaskCompleted(i)
  ).length;
  const rejectedCount = historyList.filter(i => i.status === 'rejected').length;

  // Format date nicely
  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Recent';
    const d = new Date(timestamp);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Start Task
  const handleStartTask = async (task: AppTask) => {
    if (!profile) {
      if (onOpenAuth) onOpenAuth();
      return;
    }

    setSelectedTask(task);
    setIsVerifying(false);
    setClaimSuccess(null);
    setSubmissionSuccess(false);
    setProofText('');
    setProofScreenshot('');

    // If minute task or time requirement, set timer
    const seconds = (task.durationMinutes ? task.durationMinutes * 60 : (task.type === 'minute' ? 60 : 15));
    setTimerSeconds(seconds);

    // Mark as started
    await startUserTask(profile.uid, task);
    setUserProgress(prev => ({
      ...prev,
      [task.id]: {
        id: `${profile.uid}_${task.id}`,
        userId: profile.uid,
        taskId: task.id,
        taskTitle: task.title,
        taskCoins: task.coins,
        status: 'started',
        startedAt: Date.now()
      }
    }));

    // Open task URL in new tab
    if (task.actionUrl) {
      window.open(task.actionUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Handle Screenshot Upload (Base64)
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

  // Timer Countdown for verification
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (selectedTask && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedTask, timerSeconds]);

  // Submit Proof For Admin Approval
  const handleSubmitForReview = async (task: AppTask) => {
    if (!profile) return;
    setIsVerifying(true);

    try {
      await submitTaskForReview(
        profile.uid,
        { displayName: profile.displayName, email: profile.email },
        task,
        proofText,
        proofScreenshot
      );

      sound.playWin();
      setSubmissionSuccess(true);
      setUserProgress(prev => ({
        ...prev,
        [task.id]: {
          ...prev[task.id],
          id: `${profile.uid}_${task.id}`,
          userId: profile.uid,
          taskId: task.id,
          taskTitle: task.title,
          taskCoins: task.coins,
          status: 'pending_approval',
          submittedAt: Date.now(),
          proofText,
          proofScreenshot
        }
      }));

      setTimeout(() => {
        setSelectedTask(null);
        setSubmissionSuccess(false);
        setIsVerifying(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to submit task proof:', err);
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-28 max-w-md mx-auto px-4 pt-1 sm:pt-2">
      {/* 1. Header with Back Button and Tab Switcher */}
      <div className="py-3 mb-2 border-b border-slate-200/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {onBack && (
              <button
                onClick={onBack}
                className="w-10 h-10 rounded-full flex items-center justify-center text-slate-900 hover:bg-slate-200 active:scale-95 transition-all -ml-2 cursor-pointer"
                aria-label="Back"
              >
                <ArrowLeft className="w-6 h-6 stroke-[2.5]" />
              </button>
            )}
            <div>
              <h1 className="font-display font-black text-xl text-slate-900 tracking-tight flex items-center gap-2">
                <span>{activeTab === 'available' ? 'Available Tasks' : 'Task History'}</span>
              </h1>
            </div>
          </div>

          {/* Quick Tab Switcher Button */}
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl border border-slate-300/60 text-xs font-bold">
            <button
              onClick={() => setActiveTab('available')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'available'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Tasks</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                activeTab === 'available' ? 'bg-purple-800 text-purple-100' : 'bg-slate-300 text-slate-700'
              }`}>
                {availableTasks.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>History</span>
              {historyList.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  activeTab === 'history' ? 'bg-purple-800 text-purple-100' : 'bg-slate-300 text-slate-700'
                }`}>
                  {historyList.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. AVAILABLE TASKS VIEW */}
      {activeTab === 'available' && (
        <div className="space-y-3 mt-2">
          {loading ? (
            <div className="py-20 text-center">
              <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span className="text-xs text-slate-500 font-medium">Loading tasks...</span>
            </div>
          ) : tasks.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 shadow-2xs space-y-2 mt-4">
              <Zap className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="font-bold text-sm text-slate-800">No tasks available</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Currently there are no active tasks. Admin will add new tasks soon!
              </p>
            </div>
          ) : availableTasks.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 shadow-2xs space-y-3 mt-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs border border-emerald-200">
                <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
              </div>
              <h4 className="font-display font-black text-base text-slate-900">
                All Available Tasks Completed!
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                Aapne sabhi available tasks complete kar liye hain. Naye tasks aate hi yahan dikhenge. Aap apne completed tasks Task History me dekh sakte hain.
              </p>
              <button
                onClick={() => {
                  setActiveTab('history');
                  setHistoryFilter('completed');
                }}
                className="mt-2 inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <History className="w-3.5 h-3.5" />
                <span>View Completed Tasks ({completedCount})</span>
              </button>
            </div>
          ) : (
            availableTasks.map((task, idx) => {
              const prog = userProgress[task.id];
              const status: UserTaskStatus = prog?.status || 'not_started';
              const isApproved = status === 'approved' || status === 'completed';
              const isPending = status === 'pending_approval';
              const isRejected = status === 'rejected';

              return (
                <motion.div
                  key={task.id ? `task-${task.id}-${idx}` : `task-${idx}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.04, 0.25) }}
                  onClick={() => {
                    if (onSelectTask) {
                      onSelectTask(task);
                    } else {
                      setActiveOfferDetailsTask(task);
                    }
                  }}
                  className="cursor-pointer bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-xs hover:shadow-md hover:border-purple-300 transition-all"
                >
                  {/* Top Row: Logo + Task Title + Coin Badge */}
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {task.logoUrl ? (
                        <img
                          src={task.logoUrl}
                          alt={task.title}
                          className="w-12 h-12 rounded-xl object-cover shadow-xs border border-slate-100 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div
                          className={`w-12 h-12 rounded-xl ${
                            task.logoBg || 'bg-purple-700'
                          } text-white font-black flex flex-col items-center justify-center text-center shadow-xs shrink-0 select-none`}
                        >
                          {task.logoText ? (
                            <span className="text-xs font-bold leading-none">{task.logoText}</span>
                          ) : (
                            <span className="text-sm font-black">
                              {task.title.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="min-w-0">
                        <h3 className="font-display font-black text-base text-slate-900 tracking-tight truncate">
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-1">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1.5 rounded-xl shadow-2xs flex items-center gap-1.5 shrink-0">
                      <GoldCoin className="w-4 h-4" />
                      <span className="font-display font-black text-sm text-amber-900">
                        +{task.coins}
                      </span>
                    </div>
                  </div>

                  {/* Subtle Divider */}
                  <div className="border-t border-slate-100 my-2.5" />

                  {/* Bottom Row: Tags & CTA */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {task.tags && task.tags.length > 0 ? (
                        task.tags.map((tag, tagIdx) => (
                          <span
                            key={`tag-${task.id || idx}-${tagIdx}`}
                            className="bg-slate-100 text-slate-700 text-[11px] font-bold px-2.5 py-0.5 rounded-md"
                          >
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="bg-purple-50 text-purple-700 text-[11px] font-bold px-2.5 py-0.5 rounded-md">
                          Task
                        </span>
                      )}
                    </div>

                    <div>
                      {isApproved ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-bold text-xs px-3 py-1 rounded-lg">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Completed</span>
                        </span>
                      ) : isPending ? (
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 font-bold text-xs px-3 py-1 rounded-lg">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Under Review</span>
                        </span>
                      ) : isRejected ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSelectTask) onSelectTask(task);
                            else setActiveOfferDetailsTask(task);
                          }}
                          className="inline-flex items-center gap-1 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-xs px-3 py-1 rounded-lg border border-rose-200 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Rejected (Retry)</span>
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSelectTask) onSelectTask(task);
                            else setActiveOfferDetailsTask(task);
                          }}
                          className="inline-flex items-center gap-1 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition-colors cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Start Task</span>
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {/* 3. TASK HISTORY VIEW (Pending, Completed, Rejected) */}
      {activeTab === 'history' && (
        <div className="space-y-3 mt-2">
          {/* History Sub-Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs font-bold">
            <button
              onClick={() => setHistoryFilter('all')}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all border cursor-pointer ${
                historyFilter === 'all'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              All ({historyList.length})
            </button>

            <button
              onClick={() => setHistoryFilter('pending')}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all border cursor-pointer flex items-center gap-1 ${
                historyFilter === 'pending'
                  ? 'bg-amber-500 text-slate-950 border-amber-500 font-black shadow-xs'
                  : 'bg-white text-amber-800 border-amber-200 hover:bg-amber-50'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending ({pendingCount})</span>
            </button>

            <button
              onClick={() => setHistoryFilter('completed')}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all border cursor-pointer flex items-center gap-1 ${
                historyFilter === 'completed'
                  ? 'bg-emerald-600 text-white border-emerald-600 font-black shadow-xs'
                  : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Completed ({completedCount})</span>
            </button>

            <button
              onClick={() => setHistoryFilter('rejected')}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all border cursor-pointer flex items-center gap-1 ${
                historyFilter === 'rejected'
                  ? 'bg-rose-600 text-white border-rose-600 font-black shadow-xs'
                  : 'bg-white text-rose-800 border-rose-200 hover:bg-rose-50'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Rejected ({rejectedCount})</span>
            </button>
          </div>

          {/* History List */}
          {filteredHistory.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 shadow-2xs space-y-2 mt-4">
              <History className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="font-bold text-sm text-slate-800">No {historyFilter !== 'all' ? historyFilter : ''} task history</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {historyFilter === 'pending'
                  ? 'You do not have any tasks currently pending admin review.'
                  : historyFilter === 'completed'
                  ? 'You have not completed any tasks yet. Start a task to earn coins!'
                  : historyFilter === 'rejected'
                  ? 'No rejected tasks. All your submissions are in good standing!'
                  : 'Complete tasks from the Available Tasks tab to track your submission history and rewards here.'}
              </p>
              {historyFilter === 'all' && (
                <button
                  onClick={() => setActiveTab('available')}
                  className="mt-2 inline-flex items-center gap-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Explore Available Tasks</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map((item, hIdx) => {
                const isApproved = isTaskCompleted(item) || item.status === 'approved' || item.status === 'completed';
                const isPending = (item.status === 'pending_approval' || item.status === 'started') && !isApproved;
                const isRejected = item.status === 'rejected';

                // Find matching task definition if available
                const matchingTask = tasks.find(t => t.id === item.taskId);

                return (
                  <motion.div
                    key={`hist-${item.id || item.taskId}-${hIdx}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(hIdx * 0.04, 0.2) }}
                    className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3"
                  >
                    {/* Top Row: Title + Status + Coins */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {/* Status Badge */}
                          {isApproved && (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Approved &amp; Paid</span>
                            </span>
                          )}
                          {isPending && (
                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-amber-200 animate-pulse">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>{item.status === 'started' ? 'In Progress' : 'Pending Approval'}</span>
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-rose-200">
                              <XCircle className="w-3 h-3 text-rose-600" />
                              <span>Rejected</span>
                            </span>
                          )}

                          <span className="text-[10px] text-slate-400 font-medium">
                            {formatDate(item.submittedAt || item.completedAt || item.startedAt)}
                          </span>
                        </div>

                        <h3 className="font-display font-black text-base text-slate-900 tracking-tight truncate">
                          {item.taskTitle || matchingTask?.title || 'Task Submission'}
                        </h3>
                      </div>

                      <div className="bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1.5 rounded-xl shadow-2xs flex items-center gap-1.5 shrink-0">
                        <GoldCoin className="w-4 h-4" />
                        <span className="font-display font-black text-sm text-amber-900">
                          +{item.taskCoins || matchingTask?.coins || 0}
                        </span>
                      </div>
                    </div>

                    {/* Proof Details & Screenshot */}
                    {(item.proofText || item.proofScreenshot) && (
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 text-xs space-y-2">
                        {item.proofText && (
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
                              Submitted Proof / User Note:
                            </span>
                            <p className="text-slate-800 font-medium break-words">
                              {item.proofText}
                            </p>
                          </div>
                        )}

                        {item.proofScreenshot && (
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                              Uploaded Screenshot Proof:
                            </span>
                            <div className="relative inline-block group">
                              <img
                                src={item.proofScreenshot}
                                alt="Proof preview"
                                className="w-20 h-20 object-cover rounded-lg border border-slate-300 shadow-2xs cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => setSelectedProofPreview(item.proofScreenshot || null)}
                              />
                              <button
                                onClick={() => setSelectedProofPreview(item.proofScreenshot || null)}
                                className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg transition-opacity cursor-pointer text-[10px] font-bold gap-1"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Admin Feedback / Rejection Note */}
                    {item.adminNote && (
                      <div className={`p-3 rounded-xl border text-xs space-y-1 ${
                        isRejected
                          ? 'bg-rose-50 border-rose-200 text-rose-900'
                          : isApproved
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-purple-50 border-purple-200 text-purple-900'
                      }`}>
                        <div className="flex items-center gap-1 font-bold text-[11px]">
                          {isRejected ? (
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          )}
                          <span>Admin Feedback / Note:</span>
                        </div>
                        <p className="font-medium leading-relaxed">{item.adminNote}</p>
                      </div>
                    )}

                    {/* Action buttons (e.g. Retry for Rejected tasks or View for Approved) */}
                    {isRejected && matchingTask && (
                      <div className="pt-1 flex items-center justify-end">
                        <button
                          onClick={() => {
                            if (onSelectTask) {
                              onSelectTask(matchingTask);
                            } else {
                              setActiveOfferDetailsTask(matchingTask);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Re-Submit Proof</span>
                        </button>
                      </div>
                    )}

                    {isApproved && matchingTask && (
                      <div className="pt-1 flex items-center justify-between text-xs text-emerald-800 border-t border-slate-100 mt-2">
                        <span className="flex items-center gap-1 font-bold text-[11px] text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Coins Credited to Wallet</span>
                        </span>
                        <button
                          onClick={() => {
                            if (onSelectTask) {
                              onSelectTask(matchingTask);
                            } else {
                              setActiveOfferDetailsTask(matchingTask);
                            }
                          }}
                          className="inline-flex items-center gap-1 text-purple-700 hover:text-purple-900 font-bold text-xs hover:underline cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Details</span>
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. Full Screenshot Preview Lightbox Modal */}
      <AnimatePresence>
        {selectedProofPreview && (
          <div key="proof-preview-backdrop" className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              key="proof-preview-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-4 max-w-sm sm:max-w-md w-full shadow-2xl relative max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-bold text-xs text-slate-700">Screenshot Proof Preview</span>
                <button
                  onClick={() => setSelectedProofPreview(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="overflow-auto py-3 flex items-center justify-center">
                <img
                  src={selectedProofPreview}
                  alt="Full Proof"
                  className="max-h-[60vh] object-contain rounded-xl border border-slate-200"
                />
              </div>
              <button
                onClick={() => setSelectedProofPreview(null)}
                className="w-full py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs mt-2"
              >
                Close Preview
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. Task Detail & Proof Submission Modal */}
      <AnimatePresence>
        {selectedTask && (
          <div key="selected-task-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
            <motion.div
              key="selected-task-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-purple-100 text-slate-900 relative my-8 max-h-[90vh] overflow-y-auto"
            >
              {/* Submission Success Screen */}
              {submissionSuccess ? (
                <div className="py-6 text-center space-y-3">
                  <div className="w-16 h-16 rounded-3xl bg-purple-100 text-purple-600 flex items-center justify-center mx-auto animate-bounce">
                    <Clock className="w-10 h-10" />
                  </div>
                  <h3 className="font-display font-black text-2xl text-slate-900">
                    Proof Submitted!
                  </h3>
                  <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 font-display font-black text-base px-4 py-2 rounded-2xl">
                    <Clock className="w-5 h-5 text-amber-600" />
                    <span>Sent for Admin Approval ({selectedTask.coins} Coins)</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
                    Admin verify karte hi <strong>{selectedTask.coins} Coins</strong> aapke wallet me add ho jayenge. Status aap yahan track kar sakte hain.
                  </p>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-full ${
                          selectedTask.logoBg || 'bg-[#701a75]'
                        } text-white font-black flex items-center justify-center shadow-xs shrink-0 select-none`}
                      >
                        {selectedTask.logoText ? (
                          <span className="text-xs font-bold text-center leading-none">
                            {selectedTask.logoText}
                          </span>
                        ) : (
                          <span className="text-base font-black">
                            {selectedTask.title.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <h3 className="font-display font-black text-lg text-slate-900 truncate">
                          {selectedTask.title}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-amber-600 font-bold">
                          <GoldCoin className="w-4 h-4" />
                          <span>Reward: {selectedTask.coins} Coins</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedTask(null)}
                      className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Task Instructions */}
                  <div className="bg-purple-50/80 rounded-2xl p-3.5 border border-purple-100 mb-3 text-xs text-slate-700 space-y-1.5">
                    <div className="font-bold text-purple-900 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      <span>Task Requirements:</span>
                    </div>
                    <p className="whitespace-pre-line text-slate-600 leading-relaxed">
                      {selectedTask.instructions ||
                        `1. Open ${selectedTask.title} and complete the required actions.\n2. Take a screenshot or provide your username/registered email as proof.\n3. Admin will review and approve your reward!`}
                    </p>
                  </div>

                  {/* Open Link Again Button */}
                  {selectedTask.actionUrl && (
                    <a
                      href={selectedTask.actionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-3 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 mb-3 transition-colors"
                    >
                      <span>1. Open Task Link / App</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}

                  {/* Step 2: Proof Submission Form */}
                  <div className="space-y-3 pt-2 border-t border-slate-200">
                    <span className="text-xs font-black text-purple-950 uppercase tracking-wide block">
                      Verify &amp; Claim {selectedTask.coins} Coins
                    </span>

                    {/* Proof text / User ID / Mobile */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Registered Mobile / Username / Notes (Optional)
                      </label>
                      <input
                        type="text"
                        value={proofText}
                        onChange={e => setProofText(e.target.value)}
                        placeholder="Enter registered name or user ID"
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:bg-white outline-none"
                      />
                    </div>

                    {/* Screenshot Upload (Optional) */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Upload Screenshot Proof (Optional)
                      </label>
                      <label className="border-2 border-dashed border-purple-200 hover:border-purple-500 rounded-2xl p-3 flex flex-col items-center justify-center cursor-pointer bg-purple-50/40 hover:bg-purple-50 transition-colors">
                        <Upload className="w-5 h-5 text-purple-600 mb-1" />
                        <span className="text-xs text-purple-900 font-bold">
                          {proofScreenshot ? 'Screenshot Selected (Tap to change)' : 'Tap to upload screenshot'}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG up to 2MB</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleScreenshotChange}
                          className="hidden"
                        />
                      </label>

                      {proofScreenshot && (
                        <div className="mt-2 relative inline-block">
                          <img
                            src={proofScreenshot}
                            alt="Proof Preview"
                            className="w-24 h-24 object-cover rounded-xl border border-purple-300 shadow-xs"
                          />
                          <button
                            onClick={() => setProofScreenshot('')}
                            className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center shadow-xs font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="space-y-2 mt-4 pt-2">
                    <button
                      onClick={() => handleSubmitForReview(selectedTask)}
                      disabled={isVerifying}
                      className="w-full py-3 px-4 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 disabled:opacity-50 text-white font-display font-black text-sm rounded-2xl shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                    >
                      {isVerifying ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Verifying Task...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Verify &amp; Claim {selectedTask.coins} Coins</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setSelectedTask(null)}
                      className="w-full py-2 text-slate-500 hover:text-slate-700 text-xs font-semibold cursor-pointer"
                    >
                      Cancel &amp; Submit Later
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. View Status / Rejection Detail Modal */}
      <AnimatePresence>
        {viewingStatusTask && (
          <div key="view-status-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              key="view-status-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl border border-slate-100 text-slate-900 relative"
            >
              <h3 className="font-display font-black text-lg text-slate-900 mb-1">
                {viewingStatusTask.task.title}
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Reward: <strong>{viewingStatusTask.task.coins} Coins</strong>
              </p>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-600">Verification Status:</span>
                  <span
                    className={`font-black text-[11px] px-2.5 py-0.5 rounded-full uppercase ${
                      viewingStatusTask.progress.status === 'approved' || viewingStatusTask.progress.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : viewingStatusTask.progress.status === 'pending_approval'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {viewingStatusTask.progress.status === 'pending_approval' ? 'Pending Approval' : viewingStatusTask.progress.status}
                  </span>
                </div>

                {viewingStatusTask.progress.proofText && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-500 block text-[10px] uppercase">Your Submitted Proof:</span>
                    <p className="text-slate-800 font-medium">{viewingStatusTask.progress.proofText}</p>
                  </div>
                )}

                {viewingStatusTask.progress.adminNote && (
                  <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 space-y-1">
                    <span className="font-bold text-purple-700 block text-[10px] uppercase">Admin Note / Feedback:</span>
                    <p className="text-purple-900 font-semibold">{viewingStatusTask.progress.adminNote}</p>
                  </div>
                )}
              </div>

              <div className="mt-5">
                <button
                  onClick={() => setViewingStatusTask(null)}
                  className="w-full py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs active:scale-95 transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. Offer Details View matching user's screenshot */}
      {activeOfferDetailsTask && (
        <div className="fixed inset-0 z-50 bg-[#F8F9FD] overflow-y-auto">
          <OfferDetailsView
            task={activeOfferDetailsTask}
            progress={userProgress[activeOfferDetailsTask.id]}
            onBack={() => {
              setActiveOfferDetailsTask(null);
              // Reload tasks / progress to reflect any changes
              loadAllTasks();
            }}
            onOpenAuth={() => {
              setActiveOfferDetailsTask(null);
              if (onOpenAuth) onOpenAuth();
            }}
            onProgressUpdated={(taskId, newProg) => {
              setUserProgress(prev => ({ ...prev, [taskId]: newProg }));
            }}
          />
        </div>
      )}
    </div>
  );
};
