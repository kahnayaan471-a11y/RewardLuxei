import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  CreditCard,
  Users,
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  ArrowRight,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Ban,
  UserCheck,
  PlusCircle,
  MinusCircle,
  RefreshCw,
  Gift,
  Smartphone,
  Building2,
  Copy,
  Check,
  LogOut,
  ListTodo,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  Sparkles,
  Play,
  Eye,
  EyeOff,
  ToggleLeft,
  ToggleRight,
  FileCheck,
  Image as ImageIcon,
  ZoomIn,
  Maximize2,
  FileText,
  CheckCheck,
  MessageSquare,
  ChevronRight,
  Download,
  History,
  Receipt,
  Coins,
  Calendar,
  Award,
  SlidersHorizontal,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  Dices,
  RotateCcw,
  User,
  Camera,
  Upload,
  Send,
  Paperclip,
  Bot,
  Ticket,
  Flame,
  Database,
  Server,
  Globe,
  Wifi,
  AlertTriangle,
  MapPin,
  Gamepad2,
  X,
  Menu
} from 'lucide-react';
import firebaseConfigJson from '../../firebase-applet-config.json';
import { GoldCoin } from './GoldCoin';
import { AdminPromoCodesTab } from './AdminPromoCodesTab';
import { AdminGiveawayTab } from './AdminGiveawayTab';
import { AdminTournamentsTab } from './AdminTournamentsTab';
import {
  collection,
  getDocs,
  query,
  limit
} from 'firebase/firestore';
import { db, firebaseConfig } from '../lib/firebase';
import { UserProfile, WithdrawalRequest, AppTask, TaskType, TaskMilestone, UserTaskProgress, UserTaskStatus, CoinTransaction, PhysicalPrizeClaim, FeatureToggles } from '../types';
import {
  approveWithdrawal,
  rejectWithdrawal,
  adminAdjustUserCoins,
  adminAdjustUserReferrals,
  adminResetAllUserCoinsOnly,
  adminResetAllUsersCoinsAndReferrals,
  adminResetUserCoinsAndReferrals,
  toggleUserBan,
  toggleUserVerified,
  adminUpdateUserProfile,
  adminSetUserTaskRequirement,
  adminSetUserCompletedTasks,
  fetchTasks,
  subscribeToTasks,
  subscribeToUsers,
  fetchAdminUsers,
  getAllLocallyCachedUsers,
  subscribeToWithdrawals,
  subscribeToAdminSubmissions,
  createAdminTask,
  updateAdminTask,
  deleteAdminTask,
  fetchAdminTaskSubmissions,
  adminApproveTaskSubmission,
  adminRejectTaskSubmission,
  deleteAdminWithdrawal,
  deleteAllAdminWithdrawals,
  deleteAdminTaskSubmission,
  deleteAllAdminTaskSubmissions,
  deleteUserTransaction,
  deleteAllUserTransactions,
  fetchUserTransactions,
  fetchUserWithdrawals,
  subscribeToAllPrizeClaims,
  adminApprovePrizeClaim,
  adminRejectPrizeClaim,
  subscribeToFeatureToggles,
  updateFeatureToggles,
  DEFAULT_FEATURE_TOGGLES
} from '../services/coinService';
import { VerifiedBadge } from './VerifiedBadge';
import { sound } from '../utils/sound';

// Preset avatars for Admin quick assignment
const ADMIN_AVATAR_PRESETS = [
  { label: 'Ace Raider', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AceMaster77&backgroundColor=b6e3f4,c0aede' },
  { label: 'Shadow Shinobi', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=ShinobiBlade99&backgroundColor=ffd5dc,ffdfba' },
  { label: 'Dragon Warrior', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=DragonFighter&backgroundColor=d1d4f9,b6e3f4' },
  { label: 'Thunder Knight', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=ThunderKnight&backgroundColor=ffdfba,ffffba' },
  { label: 'Cyber Bot 01', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=LuckyWinner99&backgroundColor=ffd5dc,d1d4f9' },
  { label: 'Gold Titan Bot', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=GoldTitan777&backgroundColor=ffdfba,ffffba' },
  { label: 'Star Champion', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=SuperStarGamer&backgroundColor=b6e3f4,c0aede' },
  { label: 'Glory Hero', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=GloryHero77&backgroundColor=ffd5dc,ffdfba' },
  { label: 'Happy Champ', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=HappyChamp99' },
  { label: 'Star Eyes', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=StarGamerWin' },
  { label: 'Lucky Wink', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=LuckyWink777' },
  { label: 'Cool Boss', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=CoolBossPlayer' }
];

interface AdminPanelProps {
  onLogout: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'withdrawals' | 'task_proofs' | 'prize_claims' | 'tasks' | 'tournaments' | 'promo_codes' | 'giveaway' | 'users' | 'analytics' | 'firebase'>('withdrawals');
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(true);

  // Data States
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>(() => getAllLocallyCachedUsers());
  const [tasksList, setTasksList] = useState<AppTask[]>([]);
  const [taskSubmissions, setTaskSubmissions] = useState<UserTaskProgress[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [submissionFilter, setSubmissionFilter] = useState<'all' | 'pending_approval' | 'approved' | 'rejected'>('pending_approval');
  const [userSearch, setUserSearch] = useState('');
  const [submissionSearch, setSubmissionSearch] = useState('');
  const [onlySameIpFilter, setOnlySameIpFilter] = useState<boolean>(false);
  const [onlyVerifiedFilter, setOnlyVerifiedFilter] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Physical Prize Claims State
  const [prizeClaims, setPrizeClaims] = useState<PhysicalPrizeClaim[]>([]);
  const [prizeClaimFilter, setPrizeClaimFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [prizeClaimSearch, setPrizeClaimSearch] = useState('');
  const [selectedPrizeClaim, setSelectedPrizeClaim] = useState<PhysicalPrizeClaim | null>(null);
  const [claimActionType, setClaimActionType] = useState<'approve' | 'reject' | null>(null);
  const [claimAdminNote, setClaimAdminNote] = useState('');
  const [claimActionLoading, setClaimActionLoading] = useState(false);

  // Action Modals State (Withdrawals)
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [redeemCode, setRedeemCode] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Task Submissions Action State & Image Viewer
  const [selectedTaskSubmission, setSelectedTaskSubmission] = useState<UserTaskProgress | null>(null);
  const [taskActionType, setTaskActionType] = useState<'approve' | 'reject' | null>(null);
  const [taskAdminNote, setTaskAdminNote] = useState('');
  const [taskActionLoading, setTaskActionLoading] = useState(false);
  const [selectedProofImage, setSelectedProofImage] = useState<{ url: string; title: string; userName: string; notes?: string; coins?: number } | null>(null);

  // Adjust User Coins Modal
  const [adjustUser, setAdjustUser] = useState<UserProfile | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(100);
  const [adjustReason, setAdjustReason] = useState<string>('Admin bonus');

  // Adjust User Referrals Modal
  const [adjustRefUser, setAdjustRefUser] = useState<UserProfile | null>(null);
  const [adjustRefCount, setAdjustRefCount] = useState<number>(1);
  const [adjustRefReason, setAdjustRefReason] = useState<string>('Admin referral adjustment');
  const [adjustRefLoading, setAdjustRefLoading] = useState<boolean>(false);

  // Feature Toggles (Show / Hide Giveaway & FF Tournament Buttons)
  const [featureToggles, setFeatureToggles] = useState<FeatureToggles>(DEFAULT_FEATURE_TOGGLES);
  const [togglingFeature, setTogglingFeature] = useState<string | null>(null);

  useEffect(() => {
    const unsubToggles = subscribeToFeatureToggles((liveToggles) => {
      setFeatureToggles(liveToggles);
    });
    return () => {
      unsubToggles();
    };
  }, []);

  const handleToggleFeature = async (featureKey: 'showGiveaway' | 'showTournaments') => {
    try {
      setTogglingFeature(featureKey);
      const nextVal = !featureToggles[featureKey];
      await updateFeatureToggles({
        [featureKey]: nextVal
      });
      sound.playTick();
    } catch (err) {
      console.error('Error toggling feature:', err);
    } finally {
      setTogglingFeature(null);
    }
  };

  // Bulk Reset Coins & Referrals Modal
  const [showResetAllModal, setShowResetAllModal] = useState<boolean>(false);
  const [showResetCoinsModal, setShowResetCoinsModal] = useState<boolean>(false);
  const [resetAllLoading, setResetAllLoading] = useState<boolean>(false);

  // Edit Task Requirements Modal for a user
  const [reqEditUser, setReqEditUser] = useState<UserProfile | null>(null);
  const [reqRequiredCount, setReqRequiredCount] = useState<number>(3);
  const [reqCompletedCount, setReqCompletedCount] = useState<number>(0);
  const [reqLoading, setReqLoading] = useState<boolean>(false);

  // Edit User Profile (Name & Profile Picture) Modal
  const [editProfileUser, setEditProfileUser] = useState<UserProfile | null>(null);
  const [editDisplayName, setEditDisplayName] = useState<string>('');
  const [editPhotoURL, setEditPhotoURL] = useState<string>('');
  const [editIsVerified, setEditIsVerified] = useState<boolean>(false);
  const [editProfileLoading, setEditProfileLoading] = useState<boolean>(false);
  const [editProfileMsg, setEditProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // User Coin History & Audit View State
  const [historyUser, setHistoryUser] = useState<UserProfile | null>(null);
  const [userTransactions, setUserTransactions] = useState<CoinTransaction[]>([]);
  const [userWithdrawalHistory, setUserWithdrawalHistory] = useState<WithdrawalRequest[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<string>('all');
  const [historySearch, setHistorySearch] = useState('');

  // Task Creation / Edit State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<AppTask | null>(null);
  const [taskFormTitle, setTaskFormTitle] = useState('Nykaa Fashion');
  const [taskFormType, setTaskFormType] = useState<TaskType>('install');
  const [taskFormCoins, setTaskFormCoins] = useState<number>(300);
  const [taskFormTags, setTaskFormTags] = useState<string>('Install, Order a Product');
  const [taskFormUrl, setTaskFormUrl] = useState<string>('https://www.nykaafashion.com');
  const [taskFormLogoUrl, setTaskFormLogoUrl] = useState<string>('');
  const [taskFormDescription, setTaskFormDescription] = useState<string>('Install Nykaa Fashion app & explore products to claim 300 Coins.');
  const [taskFormInstructions, setTaskFormInstructions] = useState<string>('1. Install and open the app.\n2. Keep active for 30 seconds.\n3. Return here to claim coins.');
  const [taskFormLogoBg, setTaskFormLogoBg] = useState<string>('bg-[#831843]');
  const [taskFormLogoText, setTaskFormLogoText] = useState<string>('N\nFASHION');
  const [taskFormDuration, setTaskFormDuration] = useState<number>(2);
  const [taskFormLevel, setTaskFormLevel] = useState<number>(200);
  const [taskFormDays, setTaskFormDays] = useState<number>(7);
  const [taskFormMilestones, setTaskFormMilestones] = useState<TaskMilestone[]>([]);
  const [taskSaving, setTaskSaving] = useState(false);
  const [taskErrorMsg, setTaskErrorMsg] = useState('');

  // Permanent Deletion Confirmation Modal State
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type:
      | 'single_withdrawal'
      | 'all_withdrawals'
      | 'filtered_withdrawals'
      | 'single_task_submission'
      | 'all_task_submissions'
      | 'filtered_task_submissions'
      | 'single_transaction'
      | 'all_transactions';
    targetId?: string;
    targetTitle?: string;
    targetSubtitle?: string;
    itemCount?: number;
    ids?: string[];
    userId?: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState<string>('');

  // Load All Admin Data
  const loadData = async () => {
    setLoading(true);
    try {
      // Load Withdrawals
      const withQ = query(collection(db, 'withdrawals'), limit(100));
      const withSnap = await getDocs(withQ);
      const withList = withSnap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<WithdrawalRequest, 'id'>) }));
      withList.sort((a, b) => b.createdAt - a.createdAt);
      setWithdrawals(withList);

      // Load Users
      const uList = await fetchAdminUsers();
      setUsersList(uList);

      // Load Tasks
      const allTasks = await fetchTasks(true);
      setTasksList(allTasks);

      // Load Task Proof Submissions
      const subs = await fetchAdminTaskSubmissions();
      setTaskSubmissions(subs);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const unsubscribeUsers = subscribeToUsers((liveUsers) => {
      setUsersList(liveUsers);
    });

    const unsubscribeWithdrawals = subscribeToWithdrawals((liveWithdrawals) => {
      setWithdrawals(liveWithdrawals);
    });

    const unsubscribeSubmissions = subscribeToAdminSubmissions((liveSubs) => {
      setTaskSubmissions(liveSubs);
    });

    const unsubscribeTasks = subscribeToTasks((liveTasks) => {
      setTasksList(liveTasks);
    }, true);

    const unsubscribePrizeClaims = subscribeToAllPrizeClaims((liveClaims) => {
      setPrizeClaims(liveClaims);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeWithdrawals();
      unsubscribeSubmissions();
      unsubscribeTasks();
      unsubscribePrizeClaims();
    };
  }, []);

  // Filtered withdrawals
  const filteredWithdrawals = withdrawals.filter(w => {
    if (statusFilter === 'all') return true;
    return w.status === statusFilter;
  });

  const pendingCount = withdrawals.filter(w => w.status === 'pending').length;
  const pendingTaskCount = taskSubmissions.filter(s => s.status === 'pending_approval').length;
  const pendingPrizeClaimCount = prizeClaims.filter(c => c.status === 'pending' || c.status === 'submitted').length;

  const filteredPrizeClaims = prizeClaims.filter(c => {
    const matchesFilter =
      prizeClaimFilter === 'all'
        ? true
        : prizeClaimFilter === 'pending'
        ? c.status === 'pending' || c.status === 'submitted'
        : c.status === prizeClaimFilter;

    if (!matchesFilter) return false;

    if (!prizeClaimSearch.trim()) return true;
    const search = prizeClaimSearch.toLowerCase();
    return (
      (c.userName || '').toLowerCase().includes(search) ||
      (c.userPhone || '').includes(search) ||
      (c.prizeTitle || '').toLowerCase().includes(search) ||
      (c.city || '').toLowerCase().includes(search) ||
      (c.pincode || '').includes(search)
    );
  });

  const handleApprovePrizeClaim = async () => {
    if (!selectedPrizeClaim) return;
    setClaimActionLoading(true);
    try {
      await adminApprovePrizeClaim(selectedPrizeClaim.id, claimAdminNote);
      sound.playWin();
      setSelectedPrizeClaim(null);
      setClaimActionType(null);
      setClaimAdminNote('');
    } catch (err) {
      console.error('Failed to approve claim:', err);
    } finally {
      setClaimActionLoading(false);
    }
  };

  const handleRejectPrizeClaim = async () => {
    if (!selectedPrizeClaim) return;
    setClaimActionLoading(true);
    try {
      await adminRejectPrizeClaim(selectedPrizeClaim.id, claimAdminNote);
      sound.playCoinSound();
      setSelectedPrizeClaim(null);
      setClaimActionType(null);
      setClaimAdminNote('');
    } catch (err) {
      console.error('Failed to reject claim:', err);
    } finally {
      setClaimActionLoading(false);
    }
  };

  // Filtered Task Submissions
  const filteredSubmissions = taskSubmissions.filter(s => {
    if (submissionFilter !== 'all' && s.status !== submissionFilter) return false;
    if (!submissionSearch.trim()) return true;
    const q = submissionSearch.toLowerCase();
    return (
      (s.userName && s.userName.toLowerCase().includes(q)) ||
      (s.userEmail && s.userEmail.toLowerCase().includes(q)) ||
      (s.taskTitle && s.taskTitle.toLowerCase().includes(q)) ||
      (s.proofText && s.proofText.toLowerCase().includes(q))
    );
  });

  // Map users by IP address to detect multi-accounts sharing the exact same IP / Wi-Fi
  const usersByIpMap = useMemo(() => {
    const map: Record<string, UserProfile[]> = {};
    usersList.forEach(u => {
      const ip = (u.lastIp || '').trim();
      if (ip && ip !== '127.0.0.1' && ip !== 'localhost') {
        if (!map[ip]) map[ip] = [];
        map[ip].push(u);
      }
    });
    return map;
  }, [usersList]);

  // Map users by physical device fingerprint
  const usersByDeviceMap = useMemo(() => {
    const map: Record<string, UserProfile[]> = {};
    usersList.forEach(u => {
      const dev = (u.deviceId || '').trim();
      if (dev) {
        if (!map[dev]) map[dev] = [];
        map[dev].push(u);
      }
    });
    return map;
  }, [usersList]);

  // Count users associated with multi-accounting (shared IP or shared Device ID)
  const multiAccountUsersCount = useMemo(() => {
    let count = 0;
    usersList.forEach(u => {
      const hasDupIp = u.lastIp && (usersByIpMap[u.lastIp]?.length || 0) > 1;
      const hasDupDev = u.deviceId && (usersByDeviceMap[u.deviceId]?.length || 0) > 1;
      if (hasDupIp || hasDupDev) count++;
    });
    return count;
  }, [usersList, usersByIpMap, usersByDeviceMap]);

  // Count users with active Blue Tick (Verified Badge)
  const verifiedUsersCount = useMemo(() => {
    return usersList.filter(u => !!u.isVerified).length;
  }, [usersList]);

  // Filtered users (Robust filter supporting IP, deviceId, network, name, email, UID, verification)
  const filteredUsers = usersList.filter(u => {
    if (onlySameIpFilter) {
      const hasDupIp = u.lastIp && (usersByIpMap[u.lastIp]?.length || 0) > 1;
      const hasDupDev = u.deviceId && (usersByDeviceMap[u.deviceId]?.length || 0) > 1;
      if (!hasDupIp && !hasDupDev) return false;
    }

    if (onlyVerifiedFilter && !u.isVerified) {
      return false;
    }

    if (!userSearch || !userSearch.trim()) return true;
    const q = userSearch.trim().toLowerCase();
    const name = (u.displayName || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const refCode = (u.referralCode || '').toLowerCase();
    const uid = (u.uid || '').toLowerCase();
    const ip = (u.lastIp || '').toLowerCase();
    const deviceId = (u.deviceId || '').toLowerCase();
    const net = (u.networkType || '').toLowerCase();
    return (
      name.includes(q) ||
      email.includes(q) ||
      refCode.includes(q) ||
      uid.includes(q) ||
      ip.includes(q) ||
      deviceId.includes(q) ||
      net.includes(q)
    );
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Permanent History Deletion Execution Handler
  const executeDelete = async () => {
    if (!deleteModal) return;
    setIsDeleting(true);
    try {
      if (deleteModal.type === 'single_withdrawal' && deleteModal.targetId) {
        await deleteAdminWithdrawal(deleteModal.targetId);
        setWithdrawals(prev => prev.filter(w => w.id !== deleteModal.targetId));
        sound.playSuccess();
        setDeleteSuccessMsg('Withdrawal record permanently deleted');
      } else if (deleteModal.type === 'all_withdrawals' || deleteModal.type === 'filtered_withdrawals') {
        const ids = deleteModal.ids || withdrawals.map(w => w.id);
        const count = await deleteAllAdminWithdrawals(ids);
        setWithdrawals(prev => prev.filter(w => !ids.includes(w.id)));
        sound.playSuccess();
        setDeleteSuccessMsg(`${count} withdrawal records permanently deleted`);
      } else if (deleteModal.type === 'single_task_submission' && deleteModal.targetId) {
        await deleteAdminTaskSubmission(deleteModal.targetId);
        setTaskSubmissions(prev => prev.filter(s => s.id !== deleteModal.targetId));
        sound.playSuccess();
        setDeleteSuccessMsg('Task submission record permanently deleted');
      } else if (deleteModal.type === 'all_task_submissions' || deleteModal.type === 'filtered_task_submissions') {
        const ids = deleteModal.ids || taskSubmissions.map(s => s.id);
        const count = await deleteAllAdminTaskSubmissions(ids);
        setTaskSubmissions(prev => prev.filter(s => !ids.includes(s.id)));
        sound.playSuccess();
        setDeleteSuccessMsg(`${count} task submission history records permanently deleted`);
      } else if (deleteModal.type === 'single_transaction' && deleteModal.targetId) {
        await deleteUserTransaction(deleteModal.targetId);
        setUserTransactions(prev => prev.filter(t => t.id !== deleteModal.targetId));
        sound.playSuccess();
        setDeleteSuccessMsg('Transaction log record permanently deleted');
      } else if (deleteModal.type === 'all_transactions' && deleteModal.userId) {
        const count = await deleteAllUserTransactions(deleteModal.userId);
        setUserTransactions([]);
        sound.playSuccess();
        setDeleteSuccessMsg(`All ${count} coin transactions cleared for user`);
      }
      setTimeout(() => setDeleteSuccessMsg(''), 4000);
      setDeleteModal(null);
    } catch (err) {
      console.error('Failed to delete records:', err);
      sound.playError();
      alert('Error deleting records: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Open User Coin History Modal & Fetch Records
  const openUserHistoryModal = async (user: UserProfile) => {
    setHistoryUser(user);
    setHistoryLoading(true);
    setHistoryFilter('all');
    setHistorySearch('');
    try {
      const [txs, withs] = await Promise.all([
        fetchUserTransactions(user.uid, 250),
        fetchUserWithdrawals(user.uid)
      ]);
      setUserTransactions(txs);
      setUserWithdrawalHistory(withs);
    } catch (err) {
      console.error('Failed to load user coin history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Filtered transactions for the User Coin History Modal
  const filteredUserTransactions = userTransactions.filter(tx => {
    // 1. Category Filter
    if (historyFilter !== 'all') {
      if (historyFilter === 'tasks' && tx.type !== 'task_reward') return false;
      if (historyFilter === 'daily_checkin' && tx.type !== 'daily_checkin') return false;
      if (historyFilter === 'spin_scratch' && tx.type !== 'spin' && tx.type !== 'scratch') return false;
      if (historyFilter === 'captcha' && tx.type !== 'captcha') return false;
      if (historyFilter === 'referral' && tx.type !== 'referral_bonus' && tx.type !== 'referral_signup' && tx.type !== 'referral_commission') return false;
      if (historyFilter === 'leaderboard' && tx.type !== 'leaderboard_top_reward') return false;
      if (historyFilter === 'admin' && tx.type !== 'admin_adjustment') return false;
      if (historyFilter === 'withdrawal' && tx.type !== 'withdrawal' && tx.type !== 'withdrawal_refund') return false;
    }

    // 2. Search Query
    if (historySearch.trim()) {
      const q = historySearch.toLowerCase();
      const descMatch = tx.description ? tx.description.toLowerCase().includes(q) : false;
      const typeMatch = tx.type ? tx.type.toLowerCase().includes(q) : false;
      const amountMatch = tx.amount ? tx.amount.toString().includes(q) : false;
      return descMatch || typeMatch || amountMatch;
    }

    return true;
  });

  // Calculate detailed coin category totals for history modal
  const historyStats = {
    totalCoinsEarned: userTransactions
      .filter(t => t.type !== 'withdrawal' && t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0),
    tasksCoins: userTransactions
      .filter(t => t.type === 'task_reward')
      .reduce((sum, t) => sum + t.amount, 0),
    tasksCount: userTransactions.filter(t => t.type === 'task_reward').length,
    dailyCheckinCoins: userTransactions
      .filter(t => t.type === 'daily_checkin')
      .reduce((sum, t) => sum + t.amount, 0),
    dailyCheckinCount: userTransactions.filter(t => t.type === 'daily_checkin').length,
    spinScratchCoins: userTransactions
      .filter(t => t.type === 'spin' || t.type === 'scratch')
      .reduce((sum, t) => sum + t.amount, 0),
    spinScratchCount: userTransactions.filter(t => t.type === 'spin' || t.type === 'scratch').length,
    captchaCoins: userTransactions
      .filter(t => t.type === 'captcha')
      .reduce((sum, t) => sum + t.amount, 0),
    captchaCount: userTransactions.filter(t => t.type === 'captcha').length,
    referralBonusCoins: userTransactions
      .filter(t => t.type === 'referral_bonus' || t.type === 'referral_signup')
      .reduce((sum, t) => sum + t.amount, 0),
    referralCommissionCoins: userTransactions
      .filter(t => t.type === 'referral_commission')
      .reduce((sum, t) => sum + t.amount, 0),
    referralTotalCount: userTransactions.filter(t => t.type === 'referral_bonus' || t.type === 'referral_signup' || t.type === 'referral_commission').length,
    adminAdjustmentCoins: userTransactions
      .filter(t => t.type === 'admin_adjustment')
      .reduce((sum, t) => sum + t.amount, 0),
    adminAdjustmentCount: userTransactions.filter(t => t.type === 'admin_adjustment').length,
    leaderboardCoins: userTransactions
      .filter(t => t.type === 'leaderboard_top_reward')
      .reduce((sum, t) => sum + t.amount, 0),
    leaderboardCount: userTransactions.filter(t => t.type === 'leaderboard_top_reward').length,
    withdrawnCoins: userTransactions
      .filter(t => t.type === 'withdrawal')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0),
    withdrawalCount: userTransactions.filter(t => t.type === 'withdrawal').length,
  };

  // Handle Task Proof Approval / Rejection
  const handleConfirmTaskAction = async () => {
    if (!selectedTaskSubmission || !taskActionType) return;
    setTaskActionLoading(true);
    try {
      if (taskActionType === 'approve') {
        await adminApproveTaskSubmission(
          selectedTaskSubmission,
          taskAdminNote || 'Task proof verified & coins credited successfully'
        );
        sound.playWin();
      } else {
        await adminRejectTaskSubmission(
          selectedTaskSubmission.id,
          taskAdminNote || 'Task proof invalid or requirements not met'
        );
        sound.playTick();
      }
      setSelectedTaskSubmission(null);
      setTaskActionType(null);
      setTaskAdminNote('');
      await loadData();
    } catch (err) {
      console.error('Error updating task proof submission:', err);
    } finally {
      setTaskActionLoading(false);
    }
  };

  // Handle Approve
  const handleConfirmApprove = async () => {
    if (!selectedWithdrawal) return;
    setActionLoading(true);
    try {
      await approveWithdrawal(
        selectedWithdrawal.id,
        adminNote || 'Payment approved and sent',
        transactionId || `TXN-${Date.now().toString(36).toUpperCase()}`,
        redeemCode || undefined
      );
      sound.playWin();
      setSelectedWithdrawal(null);
      setActionType(null);
      setAdminNote('');
      setTransactionId('');
      setRedeemCode('');
      await loadData();
    } catch (err) {
      console.error('Approve failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Reject
  const handleConfirmReject = async () => {
    if (!selectedWithdrawal) return;
    setActionLoading(true);
    try {
      await rejectWithdrawal(
        selectedWithdrawal.id,
        adminNote || 'Invalid payment details or suspicious activity',
        true
      );
      sound.playError();
      setSelectedWithdrawal(null);
      setActionType(null);
      setAdminNote('');
      await loadData();
    } catch (err) {
      console.error('Reject failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle User Coin Adjustment
  const handleConfirmAdjust = async () => {
    if (!adjustUser) return;
    setActionLoading(true);
    try {
      await adminAdjustUserCoins(adjustUser.uid, Number(adjustAmount), adjustReason);
      sound.playCoinSound();
      setAdjustUser(null);
      await loadData();
    } catch (err) {
      console.error('Adjust coins failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle User Referral Adjustment (Add or Deduct/Minus)
  const handleConfirmAdjustReferrals = async () => {
    if (!adjustRefUser) return;
    setAdjustRefLoading(true);
    try {
      await adminAdjustUserReferrals(adjustRefUser.uid, Number(adjustRefCount), adjustRefReason);
      sound.playWin();
      setAdjustRefUser(null);
      await loadData();
    } catch (err) {
      console.error('Adjust referrals failed:', err);
    } finally {
      setAdjustRefLoading(false);
    }
  };

  // Handle Bulk Reset Coins Only for all real users
  const handleConfirmResetCoinsOnly = async () => {
    setResetAllLoading(true);
    try {
      await adminResetAllUserCoinsOnly();
      sound.playWin();
      setShowResetCoinsModal(false);
      await loadData();
    } catch (err) {
      console.error('Reset all coins failed:', err);
    } finally {
      setResetAllLoading(false);
    }
  };

  // Handle Bulk Reset Coins & Referrals for all real users
  const handleConfirmResetAll = async () => {
    setResetAllLoading(true);
    try {
      await adminResetAllUsersCoinsAndReferrals();
      sound.playWin();
      setShowResetAllModal(false);
      await loadData();
    } catch (err) {
      console.error('Reset all users failed:', err);
    } finally {
      setResetAllLoading(false);
    }
  };

  // Handle Reset Single User's Coins & Referrals to 0
  const handleResetSingleUser = async (u: UserProfile) => {
    if (window.confirm(`Reset coins and referrals to 0 for ${u.displayName || u.email}?`)) {
      try {
        await adminResetUserCoinsAndReferrals(u.uid);
        sound.playWin();
        await loadData();
      } catch (err) {
        console.error('Reset single user failed:', err);
      }
    }
  };

  // Handle Save User Task Requirement & Completed Count
  const handleSaveTaskRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqEditUser) return;

    setReqLoading(true);
    try {
      await adminSetUserTaskRequirement(reqEditUser.uid, Number(reqRequiredCount));
      await adminSetUserCompletedTasks(reqEditUser.uid, Number(reqCompletedCount));
      sound.playWin();
      setReqEditUser(null);
      await loadData();
    } catch (err) {
      console.error('Failed to update task requirements:', err);
    } finally {
      setReqLoading(false);
    }
  };

  // Open Edit User Profile Modal (Name & Avatar & Blue Tick)
  const openEditProfileModal = (user: UserProfile) => {
    setEditProfileUser(user);
    setEditDisplayName(user.displayName || '');
    setEditPhotoURL(user.photoURL || '');
    setEditIsVerified(!!user.isVerified);
    setEditProfileMsg(null);
  };

  // Handle Photo File Upload (Convert to Data URL)
  const handleAdminAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setEditProfileMsg({ type: 'error', text: 'Image size should be less than 2MB' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setEditPhotoURL(result);
        setEditProfileMsg(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Save User Profile (Display Name & Photo)
  const handleSaveUserProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProfileUser) return;
    if (!editDisplayName.trim()) {
      setEditProfileMsg({ type: 'error', text: 'Display Name cannot be empty.' });
      return;
    }

    setEditProfileLoading(true);
    setEditProfileMsg(null);
    try {
      await adminUpdateUserProfile(editProfileUser.uid, {
        displayName: editDisplayName.trim(),
        photoURL: editPhotoURL.trim(),
        isVerified: editIsVerified
      });
      sound.playWin();
      setEditProfileMsg({ type: 'success', text: 'User Profile updated successfully!' });

      // Immediate local state update
      setUsersList(prev => prev.map(u => 
        u.uid === editProfileUser.uid
          ? { ...u, displayName: editDisplayName.trim(), photoURL: editPhotoURL.trim(), isVerified: editIsVerified }
          : u
      ));

      await loadData();
      setTimeout(() => {
        setEditProfileUser(null);
        setEditProfileMsg(null);
      }, 1000);
    } catch (err: any) {
      console.error('Failed to update user profile:', err);
      setEditProfileMsg({ type: 'error', text: err?.message || 'Failed to update user profile.' });
    } finally {
      setEditProfileLoading(false);
    }
  };

  // Open Create Task Modal
  const openCreateTaskModal = () => {
    setEditingTask(null);
    setTaskErrorMsg('');
    setTaskFormTitle('');
    setTaskFormType('level');
    setTaskFormCoins(1194);
    setTaskFormTags('Game, Reach Level');
    setTaskFormUrl('https://');
    setTaskFormLogoUrl('');
    setTaskFormDescription('Play and reach levels to unlock progressive coin rewards.');
    setTaskFormInstructions('1. Download and open the game.\n2. Play and reach the designated level milestones.\n3. Return here to claim coins for each level achieved!');
    setTaskFormLogoBg('bg-[#831843]');
    setTaskFormLogoText('GAME');
    setTaskFormDuration(2);
    setTaskFormLevel(200);
    setTaskFormDays(7);
    setTaskFormMilestones([
      { title: 'Reach 10 Level', coins: 22 },
      { title: 'Reach 20 Level', coins: 45 },
      { title: 'Reach 30 Level', coins: 68 },
      { title: 'Reach 40 Level', coins: 91 },
      { title: 'Reach 50 Level', coins: 113 },
      { title: 'Reach 80 Level', coins: 159 },
      { title: 'Reach 100 Level', coins: 182 },
      { title: 'Reach 150 Level', coins: 227 },
      { title: 'Reach 200 Level', coins: 284 }
    ]);
    setIsTaskModalOpen(true);
  };

  // Open Edit Task Modal
  const openEditTaskModal = (task: AppTask) => {
    setEditingTask(task);
    setTaskErrorMsg('');
    setTaskFormTitle(task.title || '');
    setTaskFormType(task.type || 'instant');
    setTaskFormCoins(task.coins || 100);
    setTaskFormTags(task.tags && task.tags.length > 0 ? task.tags.join(', ') : 'Install, Register');
    setTaskFormUrl(task.actionUrl || '');
    setTaskFormLogoUrl(task.logoUrl || '');
    setTaskFormDescription(task.description || '');
    setTaskFormInstructions(task.instructions || '');
    setTaskFormLogoBg(task.logoBg || 'bg-[#831843]');
    setTaskFormLogoText(task.logoText || 'APP');
    setTaskFormDuration(task.durationMinutes || 2);
    setTaskFormLevel(task.targetLevel || 10);
    setTaskFormDays(task.daysCount || 7);

    if (task.milestones && task.milestones.length > 0) {
      setTaskFormMilestones(task.milestones);
    } else {
      if (task.type === 'level') {
        const ladder: TaskMilestone[] = [
          { title: 'Reach 10 Level', coins: Math.max(1, Math.round((task.coins || 1000) * 0.05)) },
          { title: 'Reach 20 Level', coins: Math.max(1, Math.round((task.coins || 1000) * 0.1)) },
          { title: 'Reach 50 Level', coins: Math.max(1, Math.round((task.coins || 1000) * 0.25)) },
          { title: `Reach ${task.targetLevel || 100} Level`, coins: Math.max(1, Math.round((task.coins || 1000) * 0.6)) }
        ];
        setTaskFormMilestones(ladder);
      } else if (task.type === 'minute') {
        const mins = task.durationMinutes || 2;
        const perMin = Math.max(1, Math.floor((task.coins || 100) / mins));
        const list: TaskMilestone[] = [];
        for (let m = 1; m < mins; m++) {
          list.push({ title: `Minute ${m}: Active In-App Surf`, coins: perMin });
        }
        list.push({ title: `Minute ${mins}: Final Goal & Finish`, coins: Math.max(1, (task.coins || 100) - (perMin * (mins - 1))) });
        setTaskFormMilestones(list);
      } else if (task.type === 'day') {
        const days = task.daysCount || 7;
        const perDay = Math.max(1, Math.floor((task.coins || 100) / days));
        const list: TaskMilestone[] = [];
        for (let d = 1; d < days; d++) {
          list.push({ title: `Day ${d}: Open & Use App`, coins: perDay });
        }
        list.push({ title: `Day ${days}: Complete Final Goal`, coins: Math.max(1, (task.coins || 100) - (perDay * (days - 1))) });
        setTaskFormMilestones(list);
      } else {
        setTaskFormMilestones([{ title: 'Complete Task & Claim Reward', coins: task.coins || 100 }]);
      }
    }

    setIsTaskModalOpen(true);
  };

  const handleSelectTaskType = (type: TaskType) => {
    setTaskFormType(type);
    if (type === 'level') {
      if (taskFormMilestones.length === 0 || !taskFormMilestones.some(m => m.title.toLowerCase().includes('level'))) {
        const defaultLadder: TaskMilestone[] = [
          { title: 'Reach 10 Level', coins: 22 },
          { title: 'Reach 20 Level', coins: 45 },
          { title: 'Reach 30 Level', coins: 68 },
          { title: 'Reach 40 Level', coins: 91 },
          { title: 'Reach 50 Level', coins: 113 },
          { title: 'Reach 80 Level', coins: 159 },
          { title: 'Reach 100 Level', coins: 182 },
          { title: 'Reach 150 Level', coins: 227 },
          { title: 'Reach 200 Level', coins: 284 }
        ];
        setTaskFormMilestones(defaultLadder);
        setTaskFormCoins(1194);
        setTaskFormLevel(200);
      }
    } else if (type === 'minute') {
      if (taskFormMilestones.length === 0 || !taskFormMilestones.some(m => m.title.toLowerCase().includes('minute'))) {
        const mins = taskFormDuration || 2;
        const perMin = Math.max(1, Math.floor((taskFormCoins || 100) / mins));
        const list: TaskMilestone[] = [];
        for (let m = 1; m < mins; m++) {
          list.push({ title: `Minute ${m}: Active In-App Surf`, coins: perMin });
        }
        list.push({ title: `Minute ${mins}: Final Goal & Finish`, coins: Math.max(1, (taskFormCoins || 100) - (perMin * (mins - 1))) });
        setTaskFormMilestones(list);
      }
    } else if (type === 'day') {
      if (taskFormMilestones.length === 0 || !taskFormMilestones.some(m => m.title.toLowerCase().includes('day'))) {
        const days = taskFormDays || 7;
        const perDay = Math.max(1, Math.floor((taskFormCoins || 100) / days));
        const list: TaskMilestone[] = [];
        for (let d = 1; d < days; d++) {
          list.push({ title: `Day ${d}: Open & Use App`, coins: perDay });
        }
        list.push({ title: `Day ${days}: Complete Final Goal`, coins: Math.max(1, (taskFormCoins || 100) - (perDay * (days - 1))) });
        setTaskFormMilestones(list);
      }
    } else {
      if (taskFormMilestones.length === 0 || taskFormMilestones.length > 1) {
        setTaskFormMilestones([
          { title: 'Complete Task & Claim Reward', coins: taskFormCoins || 300 }
        ]);
      }
    }
  };

  // Save Task
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskFormTitle.trim()) {
      setTaskErrorMsg('Please enter a Task Title.');
      return;
    }
    if (!taskFormCoins || Number(taskFormCoins) < 1) {
      setTaskErrorMsg('Please enter a valid Coin Reward amount.');
      return;
    }

    setTaskSaving(true);
    setTaskErrorMsg('');

    // Format URL with https:// if user didn't write scheme
    let formattedUrl = taskFormUrl.trim();
    if (formattedUrl && !formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }

    const parsedTags = taskFormTags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    // Calculate final coins from milestones if available
    let finalCoins = Number(taskFormCoins);
    if (taskFormMilestones.length > 0) {
      const sum = taskFormMilestones.reduce((acc, m) => acc + (Number(m.coins) || 0), 0);
      if (sum > 0) {
        finalCoins = sum;
      }
    }

    try {
      if (editingTask) {
        await updateAdminTask(editingTask.id, {
          title: taskFormTitle.trim(),
          type: taskFormType,
          coins: finalCoins,
          tags: parsedTags.length > 0 ? parsedTags : ['Install', 'Register'],
          actionUrl: formattedUrl,
          logoUrl: taskFormLogoUrl.trim(),
          description: taskFormDescription.trim(),
          instructions: taskFormInstructions.trim(),
          logoBg: taskFormLogoBg,
          logoText: taskFormLogoText.trim() || 'APP',
          durationMinutes: taskFormType === 'minute' ? Number(taskFormDuration) : undefined,
          targetLevel: taskFormType === 'level' ? Number(taskFormLevel) : undefined,
          daysCount: taskFormType === 'day' ? Number(taskFormDays) : undefined,
          milestones: taskFormMilestones.length > 0 ? taskFormMilestones : undefined
        });

        // Update local tasksList immediately for instant UI response
        setTasksList(prev =>
          prev.map(t =>
            t.id === editingTask.id
              ? {
                  ...t,
                  title: taskFormTitle.trim(),
                  type: taskFormType,
                  coins: finalCoins,
                  tags: parsedTags.length > 0 ? parsedTags : ['Install', 'Register'],
                  actionUrl: formattedUrl,
                  logoUrl: taskFormLogoUrl.trim(),
                  description: taskFormDescription.trim(),
                  instructions: taskFormInstructions.trim(),
                  logoBg: taskFormLogoBg,
                  logoText: taskFormLogoText.trim() || 'APP',
                  durationMinutes: taskFormType === 'minute' ? Number(taskFormDuration) : undefined,
                  targetLevel: taskFormType === 'level' ? Number(taskFormLevel) : undefined,
                  daysCount: taskFormType === 'day' ? Number(taskFormDays) : undefined,
                  milestones: taskFormMilestones.length > 0 ? taskFormMilestones : undefined
                }
              : t
          )
        );
      } else {
        const created = await createAdminTask({
          title: taskFormTitle.trim(),
          type: taskFormType,
          coins: finalCoins,
          tags: parsedTags.length > 0 ? parsedTags : ['Install', 'Register'],
          actionUrl: formattedUrl,
          logoUrl: taskFormLogoUrl.trim(),
          description: taskFormDescription.trim(),
          instructions: taskFormInstructions.trim(),
          logoBg: taskFormLogoBg,
          logoText: taskFormLogoText.trim() || 'APP',
          active: true,
          durationMinutes: taskFormType === 'minute' ? Number(taskFormDuration) : undefined,
          targetLevel: taskFormType === 'level' ? Number(taskFormLevel) : undefined,
          daysCount: taskFormType === 'day' ? Number(taskFormDays) : undefined,
          milestones: taskFormMilestones.length > 0 ? taskFormMilestones : undefined
        });

        // Prepend new task to tasks list immediately
        setTasksList(prev => [created, ...prev.filter(t => t.id !== created.id)]);
      }

      setIsTaskModalOpen(false);
      sound.playWin();
      await loadData();
    } catch (err: any) {
      console.error('Error saving task:', err);
      setTaskErrorMsg(err?.message || 'Failed to save task. Please try again.');
    } finally {
      setTaskSaving(false);
    }
  };

  // Toggle Task Status
  const handleToggleTaskStatus = async (task: AppTask) => {
    try {
      await updateAdminTask(task.id, { active: !task.active });
      setTasksList(prev =>
        prev.map(t => (t.id === task.id ? { ...t, active: !t.active } : t))
      );
    } catch (err) {
      console.error('Error toggling task:', err);
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await deleteAdminTask(taskId);
      setTasksList(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  // Analytics Math
  const totalApprovedInr = withdrawals
    .filter(w => w.status === 'approved')
    .reduce((sum, w) => sum + (w.inrAmount || 0), 0);

  const pendingInr = withdrawals
    .filter(w => w.status === 'pending')
    .reduce((sum, w) => sum + (w.inrAmount || 0), 0);

  const totalUserCoins = usersList.reduce((sum, u) => sum + (u.coins || 0), 0);

  const upiRequests = withdrawals.filter(w => w.method === 'upi').length;
  const playRequests = withdrawals.filter(w => w.method === 'google_play').length;
  const bankRequests = withdrawals.filter(w => w.method === 'bank_transfer').length;

  const adminMenuItems = [
    { id: 'withdrawals', label: 'Withdrawals', icon: CreditCard, badge: pendingCount, badgeColor: 'bg-rose-500 text-white', desc: 'Payout requests & approvals' },
    { id: 'task_proofs', label: 'Task Proofs', icon: FileCheck, badge: pendingTaskCount, badgeColor: 'bg-amber-500 text-slate-950', desc: 'Screenshot proofs review' },
    { id: 'prize_claims', label: 'Prize Claims', icon: Gift, badge: pendingPrizeClaimCount, badgeColor: 'bg-amber-500 text-slate-950', desc: 'Physical reward claims' },
    { id: 'tasks', label: 'Tasks', icon: ListTodo, badge: tasksList.length, badgeColor: 'bg-slate-800 text-slate-300', desc: 'Manage earn offers & apps' },
    { id: 'promo_codes', label: 'Promo Codes', icon: Ticket, badge: undefined, badgeColor: '', desc: 'Bonus coupons & redeem codes' },
    { id: 'giveaway', label: 'Giveaways', icon: Gift, badge: undefined, badgeColor: '', desc: 'Daily & weekly prize draws' },
    { id: 'tournaments', label: 'FF Tournaments', icon: Gamepad2, badge: undefined, badgeColor: '', desc: 'Free Fire MAX custom matches' },
    { id: 'users', label: 'Users', icon: Users, badge: usersList.length, badgeColor: 'bg-slate-800 text-slate-300', desc: 'Player accounts & balances' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, badge: undefined, badgeColor: '', desc: 'Platform coin metrics & stats' },
    { id: 'firebase', label: 'Firebase DB', icon: Flame, badge: undefined, badgeColor: '', desc: 'Firestore sync & configuration' },
  ] as const;

  return (
    <div className={`min-h-screen bg-[#070A12] text-slate-100 pb-24 p-3 sm:p-5 max-w-7xl mx-auto space-y-4 antialiased font-sans transition-all duration-300 ${isMenuOpen ? 'lg:pl-84' : ''}`}>
      {/* Top Header Bar - Executive Pro Dark Theme */}
      <div className="bg-[#0E1524] text-white rounded-3xl p-4 sm:p-5 shadow-2xl flex items-center justify-between gap-3 border border-indigo-500/20 backdrop-blur-xl relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 relative z-10">
          {/* Top-Left Menu Toggle Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer border shrink-0 ${
              isMenuOpen
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-indigo-400/50 shadow-md shadow-indigo-600/30 ring-2 ring-indigo-500/20'
                : 'bg-[#131B2E] text-slate-300 hover:text-white border-slate-700/80 hover:bg-slate-800'
            }`}
            title={isMenuOpen ? "Menu Open in Top-Left (Click to collapse)" : "Click to Open Menu in Top-Left"}
          >
            <Menu className="w-4 h-4 text-indigo-200" />
            <span className="font-display">Menu</span>
            <span className={`w-2 h-2 rounded-full ${isMenuOpen ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
          </button>

          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-black shadow-lg shadow-indigo-600/30 border border-indigo-400/30 shrink-0">
            <Shield className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display font-black text-base sm:text-lg text-white tracking-tight truncate">
                Admin Console
              </h1>
              <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live System
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-0.5 flex items-center gap-1.5">
              <span>Section:</span>
              <span className="bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold capitalize">
                {activeTab.replace('_', ' ')}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 relative z-10">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 bg-[#131B2E] hover:bg-slate-800 border border-slate-700/80 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer shadow-sm active:scale-95"
            title="Refresh All Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          <button
            onClick={onLogout}
            className="px-3 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Home Screen Button Visibility Live Controls */}
      <div className="bg-[#0E1524] border border-indigo-500/25 rounded-3xl p-3.5 sm:p-4.5 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 border border-indigo-400/30 shrink-0">
              <Eye className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display font-black text-sm sm:text-base text-white tracking-tight">
                  Home Screen Button Visibility
                </h3>
                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Live Admin Control
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                User App me Giveaway aur Free Fire MAX Tournaments buttons ko show ya hide karein
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            {/* Giveaway Button Live Toggle */}
            <button
              type="button"
              onClick={() => handleToggleFeature('showGiveaway')}
              disabled={togglingFeature === 'showGiveaway'}
              className={`px-3.5 py-2 rounded-2xl text-xs font-black flex items-center gap-2.5 transition-all border cursor-pointer active:scale-95 shadow-md ${
                featureToggles.showGiveaway
                  ? 'bg-amber-500/20 border-amber-400/60 text-amber-300 hover:bg-amber-500/30'
                  : 'bg-slate-900 border-slate-700/80 text-slate-400 hover:bg-slate-800'
              }`}
              title="Click to toggle Giveaway button visibility on user home screen"
            >
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                featureToggles.showGiveaway ? 'bg-amber-400 text-slate-950 shadow-sm' : 'bg-slate-800 text-slate-400'
              }`}>
                <Gift className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-[10px] text-slate-400 leading-tight">Giveaway Button</div>
                <div className="flex items-center gap-1.5 font-bold">
                  {featureToggles.showGiveaway ? (
                    <>
                      <span className="text-amber-300">Visible</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    </>
                  ) : (
                    <>
                      <span className="text-rose-400">Hidden</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    </>
                  )}
                </div>
              </div>
              <div className={`px-2 py-0.5 rounded-lg text-[10px] uppercase font-black tracking-wider ${
                featureToggles.showGiveaway
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}>
                {featureToggles.showGiveaway ? 'ON' : 'OFF'}
              </div>
            </button>

            {/* Free Fire MAX Tournament Live Toggle */}
            <button
              type="button"
              onClick={() => handleToggleFeature('showTournaments')}
              disabled={togglingFeature === 'showTournaments'}
              className={`px-3.5 py-2 rounded-2xl text-xs font-black flex items-center gap-2.5 transition-all border cursor-pointer active:scale-95 shadow-md ${
                featureToggles.showTournaments
                  ? 'bg-orange-500/20 border-orange-400/60 text-orange-300 hover:bg-orange-500/30'
                  : 'bg-slate-900 border-slate-700/80 text-slate-400 hover:bg-slate-800'
              }`}
              title="Click to toggle Free Fire MAX Tournaments button visibility on user home screen"
            >
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                featureToggles.showTournaments ? 'bg-orange-400 text-slate-950 shadow-sm' : 'bg-slate-800 text-slate-400'
              }`}>
                <Gamepad2 className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-[10px] text-slate-400 leading-tight">FF Tournaments</div>
                <div className="flex items-center gap-1.5 font-bold">
                  {featureToggles.showTournaments ? (
                    <>
                      <span className="text-orange-300">Visible</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    </>
                  ) : (
                    <>
                      <span className="text-rose-400">Hidden</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    </>
                  )}
                </div>
              </div>
              <div className={`px-2 py-0.5 rounded-lg text-[10px] uppercase font-black tracking-wider ${
                featureToggles.showTournaments
                  ? 'bg-orange-400 text-slate-950'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}>
                {featureToggles.showTournaments ? 'ON' : 'OFF'}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Modern KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        <button
          onClick={() => setActiveTab('withdrawals')}
          className="bg-[#0E1524] hover:bg-[#131B2E] border border-slate-800/90 hover:border-amber-500/40 p-3 sm:p-3.5 rounded-2xl transition-all cursor-pointer text-left group shadow-lg"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">Pending Payouts</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="font-display font-black text-base sm:text-lg text-amber-400">
            ₹{pendingInr.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-bold">
            {pendingCount} request{pendingCount === 1 ? '' : 's'} waiting
          </div>
        </button>

        <button
          onClick={() => setActiveTab('task_proofs')}
          className="bg-[#0E1524] hover:bg-[#131B2E] border border-slate-800/90 hover:border-indigo-500/40 p-3 sm:p-3.5 rounded-2xl transition-all cursor-pointer text-left group shadow-lg"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">Task Proofs</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="font-display font-black text-base sm:text-lg text-indigo-300">
            {pendingTaskCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-bold">
            Submissions pending
          </div>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className="bg-[#0E1524] hover:bg-[#131B2E] border border-slate-800/90 hover:border-cyan-500/40 p-3 sm:p-3.5 rounded-2xl transition-all cursor-pointer text-left group shadow-lg"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">Total Users</span>
            <div className="w-7 h-7 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="font-display font-black text-base sm:text-lg text-white">
            {usersList.length.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-bold">
            Registered accounts
          </div>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className="bg-[#0E1524] hover:bg-[#131B2E] border border-slate-800/90 hover:border-emerald-500/40 p-3 sm:p-3.5 rounded-2xl transition-all cursor-pointer text-left group shadow-lg"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">System Coins</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Coins className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="font-display font-black text-base sm:text-lg text-emerald-400">
            {totalUserCoins.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-bold">
            Platform balance
          </div>
        </button>
      </div>

      {/* Admin Menu Tabs Bar - Sleek Modern Pill Rail */}
      <div className="bg-[#0E1524] p-1.5 rounded-2xl border border-slate-800/90 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs font-bold shadow-lg">
        {adminMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as typeof activeTab)}
              className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all shrink-0 cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-[#131B2E]'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{item.label}</span>
              {Boolean(item.badge && item.badge > 0) && (
                <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : item.badgeColor
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Top-Left Persistent Admin Menu Drawer / Sidebar */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Soft backdrop only on mobile / small screens */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs"
            />

            {/* Top-Left Pinned Navigation Panel */}
            <motion.div
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="fixed top-0 left-0 bottom-0 z-50 w-72 sm:w-80 bg-[#090D18]/98 backdrop-blur-2xl border-r border-indigo-500/25 shadow-2xl flex flex-col text-white"
            >
              {/* Top-Left Menu Header */}
              <div className="p-4 border-b border-slate-800/90 flex items-center justify-between gap-2 shrink-0 bg-[#0E1524]/70">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-black shadow-md shadow-indigo-600/30 border border-indigo-400/30 shrink-0">
                    <Menu className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-display font-black text-sm text-white truncate">
                        Admin Menu
                      </h3>
                      <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                        Open
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">Top-left navigation</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="w-8 h-8 rounded-xl bg-[#131B2E] hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-700/60"
                  title="Collapse Menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status Banner */}
              <div className="px-4 py-2 bg-indigo-950/40 border-b border-indigo-900/30 flex items-center justify-between text-[11px] text-indigo-300 shrink-0">
                <span className="flex items-center gap-1.5 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Top-Left Docked
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {adminMenuItems.length} Modules
                </span>
              </div>

              {/* Menu options list */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5 no-scrollbar">
                {adminMenuItems.map((item, idx) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id as typeof activeTab);
                        // Stays open as requested! ("open hi rahe aysa banoo")
                      }}
                      className={`w-full p-2.5 rounded-xl flex items-center justify-between transition-all cursor-pointer text-left group ${
                        isActive
                          ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black shadow-lg shadow-indigo-600/30 border border-indigo-400/40'
                          : 'bg-[#0E1524]/80 hover:bg-[#131B2E] text-slate-300 hover:text-white border border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-[#131B2E] text-indigo-400 group-hover:scale-105 border border-slate-700/60'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-bold truncate ${isActive ? 'text-white font-black' : 'text-slate-200'}`}>
                              {item.label}
                            </span>
                            {Boolean(item.badge && item.badge > 0) && (
                              <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                                isActive ? 'bg-white/20 text-white' : item.badgeColor
                              }`}>
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <span className={`text-[10px] block truncate ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                            {item.desc}
                          </span>
                        </div>
                      </div>

                      <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                        isActive ? 'text-white translate-x-0.5' : 'text-slate-500 opacity-60'
                      }`} />
                    </button>
                  );
                })}
              </div>

              {/* Menu Bottom Footer */}
              <div className="p-3 border-t border-slate-800/90 bg-[#0E1524]/70 space-y-2 shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={loadData}
                    disabled={loading}
                    className="flex-1 py-2 px-3 bg-[#131B2E] hover:bg-slate-800 border border-slate-700/80 rounded-xl text-slate-300 hover:text-white transition-all text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
                    <span>Refresh</span>
                  </button>
                  <button
                    onClick={onLogout}
                    className="py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-400" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* TAB: PROMO CODES ENGINE */}
      {activeTab === 'promo_codes' && <AdminPromoCodesTab />}

      {/* TAB: GIVEAWAY MANAGER */}
      {activeTab === 'giveaway' && <AdminGiveawayTab />}

      {/* TAB: FREE FIRE MAX TOURNAMENTS */}
      {activeTab === 'tournaments' && <AdminTournamentsTab />}

      {/* TAB: TASK PROOFS & SCREENSHOT APPROVALS */}
      {activeTab === 'task_proofs' && (
        <div className="space-y-4">
          {/* Header & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0E1524] p-4 rounded-xl border border-slate-800/90 shadow-xs">
            <div>
              <h3 className="font-display font-black text-base text-white flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-purple-400" />
                <span>Task Proofs &amp; Screenshot Approvals</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Review submitted screenshots and user notes. Approving will automatically credit coins to the user's wallet.
              </p>
            </div>

            {/* Search Submissions */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={submissionSearch}
                onChange={e => setSubmissionSearch(e.target.value)}
                placeholder="Search user, task, notes..."
                className="w-full pl-9 pr-3 py-2 bg-[#070A12] border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-amber-400"
              />
              {submissionSearch && (
                <button
                  onClick={() => setSubmissionSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Filter Pills and Bulk Clear Task History */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0E1524] p-3.5 rounded-xl border border-slate-800/90 shadow-xs">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {[
                { id: 'pending_approval', label: 'Pending Approval', count: taskSubmissions.filter(s => s.status === 'pending_approval').length },
                { id: 'approved', label: 'Approved', count: taskSubmissions.filter(s => s.status === 'approved').length },
                { id: 'rejected', label: 'Rejected', count: taskSubmissions.filter(s => s.status === 'rejected').length },
                { id: 'all', label: 'All Submissions', count: taskSubmissions.length }
              ].map((st, fIdx) => (
                <button
                  key={`sub-filter-${st.id}-${fIdx}`}
                  onClick={() => setSubmissionFilter(st.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    submissionFilter === st.id
                      ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                      : 'bg-[#070A12] border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span>{st.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      submissionFilter === st.id
                        ? 'bg-slate-950 text-amber-400'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {st.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Clear All / Bulk Task Submission History Deletion */}
            {taskSubmissions.length > 0 && (
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {/* Clear Completed/Rejected Tasks */}
                {taskSubmissions.filter(s => s.status === 'approved' || s.status === 'rejected').length > 0 && (
                  <button
                    onClick={() => {
                      const processedIds = taskSubmissions
                        .filter(s => s.status === 'approved' || s.status === 'rejected')
                        .map(s => s.id);
                      setDeleteModal({
                        isOpen: true,
                        type: 'filtered_task_submissions',
                        ids: processedIds,
                        itemCount: processedIds.length,
                        targetTitle: 'Clear Processed (Approved & Rejected) Tasks',
                        targetSubtitle: `Permanently delete all ${processedIds.length} approved/rejected task submission proofs from database history? Pending proofs will remain untouched.`
                      });
                    }}
                    className="px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    title="Delete completed and rejected task submissions"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Clear Processed ({taskSubmissions.filter(s => s.status === 'approved' || s.status === 'rejected').length})</span>
                  </button>
                )}

                {/* Clear Filtered / All Submissions */}
                <button
                  onClick={() => {
                    const ids = filteredSubmissions.map(s => s.id);
                    setDeleteModal({
                      isOpen: true,
                      type: submissionFilter === 'all' ? 'all_task_submissions' : 'filtered_task_submissions',
                      ids,
                      itemCount: ids.length,
                      targetTitle: submissionFilter === 'all' ? 'Clear Entire Task Proof History' : `Delete All ${submissionFilter.replace('_', ' ').toUpperCase()} Submissions`,
                      targetSubtitle: `Are you sure you want to permanently delete all ${ids.length} task submission history record(s)? This cannot be undone.`
                    });
                  }}
                  className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  title="Permanently delete task submission history"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>{submissionFilter === 'all' ? `Clear All History (${taskSubmissions.length})` : `Delete ${submissionFilter.replace('_', ' ')} (${filteredSubmissions.length})`}</span>
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="bg-[#0E1524] rounded-2xl p-12 text-center border border-slate-800 shadow-md">
              <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-bold">Loading Task Submissions...</p>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="bg-[#0E1524] rounded-2xl p-12 text-center border border-slate-800 shadow-md space-y-2">
              <FileCheck className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-200">No {submissionFilter.replace('_', ' ')} task submissions found</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                When users complete tasks and submit their registered username or upload screenshot proofs, they will appear here for your verification.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSubmissions.map((sub, sIdx) => {
                const isPending = sub.status === 'pending_approval';
                const isApproved = sub.status === 'approved';
                const isRejected = sub.status === 'rejected';

                return (
                  <div
                    key={sub.id ? `sub-${sub.id}-${sIdx}` : `sub-${sIdx}`}
                    className="bg-[#0E1524] rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-sm flex flex-col justify-between gap-4 transition-all hover:border-slate-700"
                  >
                    {/* Top bar */}
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-display font-black text-base text-white truncate">
                              {sub.taskTitle || 'Task Offer'}
                            </span>
                            {sub.taskType && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-950/80 text-purple-300 border border-purple-800/60 uppercase">
                                {sub.taskType}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Submitted on {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : 'Recent'}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="flex items-center gap-1 bg-amber-400/10 border border-amber-400/30 text-amber-400 px-2.5 py-1 rounded-xl font-display font-black text-xs">
                            <GoldCoin className="w-4 h-4" />
                            <span>+{sub.taskCoins || 100} Coins</span>
                          </div>
                          {/* Delete task submission record from history */}
                          <button
                            onClick={() => {
                              setDeleteModal({
                                isOpen: true,
                                type: 'single_task_submission',
                                targetId: sub.id,
                                targetTitle: `Task Proof: ${sub.taskTitle || 'Task Offer'} • ${sub.userName || sub.userEmail}`,
                                targetSubtitle: `Permanently delete this task submission and proof screenshot from the database?`
                              });
                            }}
                            className="p-1.5 rounded-xl bg-[#070A12] hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-500/40 transition-all cursor-pointer active:scale-95 shrink-0"
                            title="Delete this task submission from history"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* User Info Bar with Verified Email */}
                      <div className="bg-[#070A12] p-3 rounded-xl border border-slate-800/80 space-y-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                              {sub.userName ? sub.userName.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-display font-black text-white truncate text-sm">
                                {sub.userName || 'User'}
                              </p>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium flex-wrap">
                                <span className="text-purple-300 font-mono font-bold select-all truncate">
                                  {sub.userEmail || 'No email registered'}
                                </span>
                                {sub.userEmail && (
                                  <button
                                    onClick={() => handleCopy(sub.userEmail || '', `email-${sub.id}`)}
                                    className="p-1 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors cursor-pointer"
                                    title="Copy Email"
                                  >
                                    {copiedId === `email-${sub.id}` ? (
                                      <Check className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    const userFound = usersList.find(u => u.uid === sub.userId) || {
                                      uid: sub.userId,
                                      email: sub.userEmail || '',
                                      displayName: sub.userName || 'User',
                                      coins: 0,
                                      totalEarned: 0,
                                      totalWithdrawn: 0,
                                      referralCode: '',
                                      referralCount: 0,
                                      role: 'user' as const,
                                      dailyStreak: 0,
                                      spinsLeftToday: 0,
                                      scratchesLeftToday: 0,
                                      captchasLeftToday: 0,
                                      createdAt: sub.submittedAt || Date.now()
                                    };
                                    openUserHistoryModal(userFound);
                                  }}
                                  className="px-2 py-0.5 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/60 rounded-md text-[10px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                                  title="View user coin earning history"
                                >
                                  <History className="w-3 h-3 text-indigo-400" />
                                  <span>Coin History</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          <span
                            className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase shrink-0 ${
                              isPending
                                ? 'bg-amber-400/10 text-amber-300 border border-amber-400/30'
                                : isApproved
                                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                                : 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                            }`}
                          >
                            {isPending ? 'Pending Review' : sub.status}
                          </span>
                        </div>

                        {/* Multi-Stage Step Info if Day / Minute / Level */}
                        {(sub.totalSteps && sub.totalSteps > 1) ? (
                          <div className="bg-purple-950/60 border border-purple-800/60 rounded-xl p-2 flex items-center justify-between text-[11px]">
                            <span className="font-bold text-purple-200">
                              Stage Submitted: <span className="text-purple-300 font-black">Step {(sub.currentStepIndex || 0) + 1} of {sub.totalSteps}</span> ({sub.currentStepTitle || 'Active Milestone'})
                            </span>
                            <span className="bg-purple-700 text-white font-black text-[10px] px-2 py-0.5 rounded-md">
                              +{sub.currentStepCoins || Math.round((sub.taskCoins || 100) / sub.totalSteps)} Coins
                            </span>
                          </div>
                        ) : null}
                      </div>

                      {/* 1. Registered Mobile / Username / Notes */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Registered Mobile / Username / Notes:
                        </span>
                        <div className="bg-[#070A12] border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs">
                          <span className="font-medium text-slate-200 break-all select-all">
                            {sub.proofText ? sub.proofText : <em className="text-slate-500 not-italic">No text notes entered</em>}
                          </span>
                          {sub.proofText && (
                            <button
                              onClick={() => handleCopy(sub.proofText || '', sub.id)}
                              className="p-1 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors shrink-0 cursor-pointer"
                              title="Copy Notes"
                            >
                              {copiedId === sub.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 2. Uploaded Screenshot Proof(s) */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Uploaded Screenshot Proof{sub.stepProofs && sub.stepProofs.length > 1 ? 's (All Steps)' : ''}:
                          </span>
                          {sub.stepProofs && sub.stepProofs.length > 0 && (
                            <span className="text-[10px] font-bold text-purple-300 bg-purple-950/80 border border-purple-800/60 px-2 py-0.5 rounded-md">
                              {sub.stepProofs.length} Milestone Proof{sub.stepProofs.length > 1 ? 's' : ''} Attached
                            </span>
                          )}
                        </div>

                        {/* If multiple step proofs exist, show all milestone screenshots */}
                        {sub.stepProofs && sub.stepProofs.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {sub.stepProofs.map((stepP, spIdx) => (
                              <div
                                key={`sp-${sub.id}-${spIdx}`}
                                className="bg-[#070A12] rounded-xl p-2 border border-slate-800 flex flex-col justify-between gap-1.5"
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-bold text-slate-200 text-[11px] truncate">
                                    Step {stepP.stepIndex + 1}: {stepP.title || `Milestone ${stepP.stepIndex + 1}`}
                                  </span>
                                  <span
                                    className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase ${
                                      stepP.status === 'approved'
                                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/50'
                                        : stepP.status === 'rejected'
                                        ? 'bg-rose-950 text-rose-300 border border-rose-600/50'
                                        : 'bg-amber-950 text-amber-300 border border-amber-600/50 animate-pulse'
                                    }`}
                                  >
                                    {stepP.status || 'Pending'}
                                  </span>
                                </div>

                                {stepP.proofScreenshot ? (
                                  <div
                                    className="relative group bg-slate-950 rounded-lg overflow-hidden border border-slate-800 cursor-pointer h-28 flex items-center justify-center"
                                    onClick={() =>
                                      setSelectedProofImage({
                                        url: stepP.proofScreenshot!,
                                        title: `${sub.taskTitle} • ${stepP.title}`,
                                        userName: sub.userName || 'User',
                                        notes: stepP.proofText || sub.proofText,
                                        coins: stepP.coins || sub.currentStepCoins
                                      })
                                    }
                                  >
                                    <img
                                      src={stepP.proofScreenshot}
                                      alt={stepP.title}
                                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold gap-1">
                                      <Maximize2 className="w-3 h-3" />
                                      <span>View Full Image</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="bg-[#0E1524] border border-dashed border-slate-800 rounded-lg p-2 text-center text-[10px] text-slate-500">
                                    No screenshot for this step
                                  </div>
                                )}

                                <div className="flex items-center justify-between text-[10px] text-slate-400">
                                  <span>Reward: +{stepP.coins} Coins</span>
                                  {stepP.proofText && (
                                    <span className="text-purple-300 font-medium truncate max-w-[120px]">
                                      Note: {stepP.proofText}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : sub.proofScreenshot ? (
                          <div className="relative group bg-slate-950 rounded-xl overflow-hidden border border-slate-800 cursor-pointer max-h-48 flex items-center justify-center">
                            <img
                              src={sub.proofScreenshot}
                              alt="Proof Screenshot"
                              className="w-full h-44 object-contain transition-transform duration-300 group-hover:scale-105"
                              onClick={() =>
                                setSelectedProofImage({
                                  url: sub.proofScreenshot!,
                                  title: sub.taskTitle || 'Task Offer',
                                  userName: sub.userName || 'User',
                                  notes: sub.proofText,
                                  coins: sub.taskCoins
                                })
                              }
                            />
                            <div
                              onClick={() =>
                                setSelectedProofImage({
                                  url: sub.proofScreenshot!,
                                  title: sub.taskTitle || 'Task Offer',
                                  userName: sub.userName || 'User',
                                  notes: sub.proofText,
                                  coins: sub.taskCoins
                                })
                              }
                              className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold"
                            >
                              <Maximize2 className="w-4 h-4" />
                              <span>Click to Enlarge Proof</span>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-[#070A12] border border-dashed border-slate-800 rounded-xl p-3 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                            <ImageIcon className="w-4 h-4 text-slate-600" />
                            <span>No screenshot attached (Text proof provided)</span>
                          </div>
                        )}
                      </div>

                      {/* Admin Note if already reviewed */}
                      {sub.adminNote && (
                        <div className="text-[11px] text-slate-300 bg-[#070A12] p-2.5 rounded-lg border border-slate-800">
                          <strong className="text-amber-400">Admin Note:</strong> {sub.adminNote}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 border-t border-slate-800/80">
                      {isPending ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedTaskSubmission(sub);
                              setTaskActionType('reject');
                            }}
                            className="flex-1 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Reject</span>
                          </button>

                          <button
                            onClick={() => {
                              setSelectedTaskSubmission(sub);
                              setTaskActionType('approve');
                            }}
                            className="flex-2 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>
                              Approve {sub.totalSteps && sub.totalSteps > 1 ? `Step ${(sub.currentStepIndex || 0) + 1} ` : ''}(+
                              {sub.currentStepCoins ||
                                (sub.totalSteps && sub.totalSteps > 1
                                  ? Math.round((sub.taskCoins || 100) / sub.totalSteps)
                                  : (sub.taskCoins || 100))}{' '}
                              Coins)
                            </span>
                          </button>
                        </div>
                      ) : isApproved ? (
                        <div className="flex items-center justify-between text-xs text-emerald-300 bg-emerald-950/40 px-3 py-2 rounded-xl border border-emerald-800/40 font-bold">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>Approved &amp; {sub.taskCoins} Coins Credited</span>
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-emerald-400/80 font-normal">
                              {sub.reviewedAt ? new Date(sub.reviewedAt).toLocaleDateString() : 'Done'}
                            </span>
                            <button
                              onClick={() => {
                                setDeleteModal({
                                  isOpen: true,
                                  type: 'single_task_submission',
                                  targetId: sub.id,
                                  targetTitle: `Task Proof: ${sub.taskTitle || 'Task Offer'} • ${sub.userName || sub.userEmail}`,
                                  targetSubtitle: `Permanently delete this approved task submission record from history?`
                                });
                              }}
                              className="p-1 rounded-lg text-rose-400/80 hover:text-white hover:bg-rose-500/20 transition-all cursor-pointer"
                              title="Delete task record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-xs text-rose-300 bg-rose-950/40 px-3 py-2 rounded-xl border border-rose-800/40 font-bold">
                          <span className="flex items-center gap-1.5">
                            <XCircle className="w-4 h-4 text-rose-400" />
                            <span>Rejected by Admin</span>
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-rose-400/80 font-normal">
                              {sub.reviewedAt ? new Date(sub.reviewedAt).toLocaleDateString() : 'Closed'}
                            </span>
                            <button
                              onClick={() => {
                                setDeleteModal({
                                  isOpen: true,
                                  type: 'single_task_submission',
                                  targetId: sub.id,
                                  targetTitle: `Task Proof: ${sub.taskTitle || 'Task Offer'} • ${sub.userName || sub.userEmail}`,
                                  targetSubtitle: `Permanently delete this rejected task submission record from history?`
                                });
                              }}
                              className="p-1 rounded-lg text-rose-400/80 hover:text-white hover:bg-rose-500/20 transition-all cursor-pointer"
                              title="Delete task record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: PHYSICAL PRIZE CLAIMS */}
      {activeTab === 'prize_claims' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0E1524] p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {(['pending', 'approved', 'rejected', 'all'] as const).map((st) => (
                <button
                  key={`prize-filter-${st}`}
                  onClick={() => setPrizeClaimFilter(st)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all shrink-0 cursor-pointer ${
                    prizeClaimFilter === st
                      ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                      : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {st === 'pending' ? 'Pending Review' : st} (
                  {st === 'all'
                    ? prizeClaims.length
                    : st === 'pending'
                    ? prizeClaims.filter((c) => c.status === 'pending' || c.status === 'submitted').length
                    : prizeClaims.filter((c) => c.status === st).length}
                  )
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search winner name, phone, city..."
                value={prizeClaimSearch}
                onChange={(e) => setPrizeClaimSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/50"
              />
            </div>
          </div>

          {filteredPrizeClaims.length === 0 ? (
            <div className="bg-[#0E1524] rounded-2xl p-12 text-center border border-slate-800 shadow-md">
              <Gift className="w-12 h-12 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-300">No {prizeClaimFilter} physical prize claims found</p>
              <p className="text-xs text-slate-500 mt-1">Users will submit address claims from Refer Prize Pool</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredPrizeClaims.map((claim) => {
                const isPending = claim.status === 'pending' || claim.status === 'submitted';
                const isApproved = claim.status === 'approved';
                const isRejected = claim.status === 'rejected';

                return (
                  <div
                    key={claim.id}
                    className="bg-[#0E1524] rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition-all"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display font-black text-base text-amber-400">
                          {claim.prizeTitle}
                        </span>
                        {claim.tshirtSize && (
                          <span className="text-xs font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded-lg border border-slate-700">
                            Size: {claim.tshirtSize}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                            isPending
                              ? 'bg-amber-400/10 text-amber-300 border border-amber-400/30'
                              : isApproved
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                              : isRejected
                              ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                              : 'bg-indigo-950/80 text-indigo-300 border border-indigo-500/40'
                          }`}
                        >
                          {isPending ? 'Pending Review' : claim.status}
                        </span>
                      </div>

                      <div className="text-xs text-slate-300 space-y-1">
                        <div>
                          <strong className="text-white">Winner:</strong> {claim.userName}{' '}
                          <span className="text-slate-400 font-mono">({claim.userPhone || 'No Phone'})</span>
                        </div>
                        <div className="text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>
                            {claim.shippingAddress}, {claim.city}, {claim.state} -{' '}
                            <strong className="text-slate-200">{claim.pincode}</strong>
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Claimed At: {new Date(claim.claimedAt).toLocaleString()}
                        </div>
                      </div>

                      {claim.adminNotes && (
                        <div className="text-xs bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-slate-300 mt-2">
                          <strong className="text-amber-400">Admin Note:</strong> {claim.adminNotes}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                      {isPending ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPrizeClaim(claim);
                              setClaimActionType('approve');
                              setClaimAdminNote('Approved & queued for dispatch!');
                            }}
                            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Approve Claim</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPrizeClaim(claim);
                              setClaimActionType('reject');
                              setClaimAdminNote('Invalid address or referral check failed.');
                            }}
                            className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 active:scale-95 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Reject</span>
                          </button>
                        </>
                      ) : (
                        <div className="text-xs text-slate-400 font-medium">
                          Status: <strong className="text-slate-200 uppercase">{claim.status}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 1: WITHDRAWAL REQUESTS */}
      {activeTab === 'withdrawals' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0E1524] p-3.5 rounded-xl border border-slate-800/90 shadow-xs">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {(['pending', 'approved', 'rejected', 'all'] as const).map((st, sIdx) => (
                <button
                  key={`with-filter-${st}-${sIdx}`}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all shrink-0 cursor-pointer ${
                    statusFilter === st
                      ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                      : 'bg-[#070A12] border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {st} ({st === 'all' ? withdrawals.length : withdrawals.filter(w => w.status === st).length})
                </button>
              ))}
            </div>

            {/* Clear All / Delete History Action Buttons */}
            {withdrawals.length > 0 && (
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {/* Delete Approved & Rejected (Clean up completed requests) */}
                {withdrawals.filter(w => w.status === 'approved' || w.status === 'rejected').length > 0 && (
                  <button
                    onClick={() => {
                      const completedIds = withdrawals
                        .filter(w => w.status === 'approved' || w.status === 'rejected')
                        .map(w => w.id);
                      setDeleteModal({
                        isOpen: true,
                        type: 'filtered_withdrawals',
                        ids: completedIds,
                        itemCount: completedIds.length,
                        targetTitle: 'Clear Processed (Approved & Rejected) Withdrawals',
                        targetSubtitle: `Permanently delete all ${completedIds.length} approved/rejected withdrawal records? Pending payouts will remain untouched.`
                      });
                    }}
                    className="px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    title="Delete completed and rejected withdrawal history"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Clear Processed ({withdrawals.filter(w => w.status === 'approved' || w.status === 'rejected').length})</span>
                  </button>
                )}

                {/* Clear All History or Filtered History */}
                <button
                  onClick={() => {
                    const ids = filteredWithdrawals.map(w => w.id);
                    setDeleteModal({
                      isOpen: true,
                      type: statusFilter === 'all' ? 'all_withdrawals' : 'filtered_withdrawals',
                      ids,
                      itemCount: ids.length,
                      targetTitle: statusFilter === 'all' ? 'Clear Entire Withdrawal History' : `Delete All ${statusFilter.toUpperCase()} Withdrawals`,
                      targetSubtitle: `Are you sure you want to permanently delete all ${ids.length} ${statusFilter} withdrawal record(s)? This will wipe them completely from the database.`
                    });
                  }}
                  className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  title="Permanently delete withdrawal history records"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>{statusFilter === 'all' ? `Clear All History (${withdrawals.length})` : `Delete ${statusFilter} (${filteredWithdrawals.length})`}</span>
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="bg-[#0E1524] rounded-2xl p-12 text-center border border-slate-800 shadow-md">
              <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-bold">Loading Withdrawal Requests...</p>
            </div>
          ) : filteredWithdrawals.length === 0 ? (
            <div className="bg-[#0E1524] rounded-2xl p-12 text-center border border-slate-800 shadow-md">
              <CreditCard className="w-12 h-12 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-300">No {statusFilter} withdrawal requests</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredWithdrawals.map((w, wIdx) => (
                <div
                  key={w.id ? `admin-with-${w.id}-${wIdx}` : `admin-with-${wIdx}`}
                  className="bg-[#0E1524] rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-slate-700"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-black text-xl text-amber-400">
                        ₹{w.inrAmount}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        ({w.coins} Coins)
                      </span>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                          w.status === 'pending'
                            ? 'bg-amber-400/10 text-amber-300 border border-amber-400/30'
                            : w.status === 'approved'
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                            : 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        {w.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-300 flex items-center gap-2 flex-wrap">
                      <span><strong className="text-white">{w.userName}</strong> ({w.userEmail})</span>
                      <button
                        onClick={() => {
                          const userFound = usersList.find(u => u.uid === w.userId) || {
                            uid: w.userId,
                            email: w.userEmail,
                            displayName: w.userName,
                            coins: w.coins,
                            totalEarned: w.coins,
                            totalWithdrawn: 0,
                            referralCode: '',
                            referralCount: 0,
                            role: 'user' as const,
                            dailyStreak: 0,
                            spinsLeftToday: 0,
                            scratchesLeftToday: 0,
                            captchasLeftToday: 0,
                            createdAt: w.createdAt
                          };
                          openUserHistoryModal(userFound);
                        }}
                        className="px-2 py-0.5 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/60 rounded-md text-[10px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                        title="Audit user coin earning history"
                      >
                        <History className="w-3 h-3 text-indigo-400" />
                        <span>Coin History</span>
                      </button>
                    </div>

                    <div className="text-xs text-slate-300 bg-[#070A12] p-2.5 rounded-xl border border-slate-800 inline-block">
                      <span className="font-bold uppercase text-[10px] text-slate-400 block mb-0.5">
                        Method: {w.method.replace('_', ' ')}
                      </span>
                      {w.method === 'upi' && <span>UPI ID: <strong className="text-white select-all">{w.details?.upiId}</strong></span>}
                      {w.method === 'google_play' && <span>Play Email: <strong className="text-white select-all">{w.details?.playEmail}</strong></span>}
                      {w.method === 'bank_transfer' && (
                        <span>
                          A/C: <strong className="text-white select-all">{w.details?.bankAccount}</strong> | IFSC: <strong className="text-white select-all">{w.details?.ifsc}</strong> | Name: <strong className="text-white">{w.details?.accountHolder}</strong>
                        </span>
                      )}
                    </div>

                    {w.transactionId && (
                      <div className="text-[11px] text-emerald-400 font-mono">
                        Txn ID: {w.transactionId}
                      </div>
                    )}
                    {w.redeemCode && (
                      <div className="text-[11px] text-purple-300 font-mono font-bold">
                        Redeem Code: {w.redeemCode}
                      </div>
                    )}

                    {/* Network, IP Address & Device Audit Info */}
                    <div className="pt-1.5 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#070A12] border border-slate-800 text-slate-300 font-mono">
                          <Globe className="w-3 h-3 text-cyan-400 shrink-0" />
                          <span>IP: <strong className="text-white select-all">{w.ipAddress || (usersList.find(u => u.uid === w.userId)?.lastIp) || '127.0.0.1'}</strong></span>
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#070A12] border border-slate-800 text-slate-300">
                          <Wifi className="w-3 h-3 text-indigo-400 shrink-0" />
                          <span>Net: <strong className="text-white">{w.networkType || (usersList.find(u => u.uid === w.userId)?.networkType) || '4G/Wi-Fi'}</strong></span>
                        </span>
                        {(w.deviceId || usersList.find(u => u.uid === w.userId)?.deviceId) && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#070A12] border border-slate-800 text-slate-300 font-mono">
                            <Smartphone className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>Device: <strong className="text-white">{((w.deviceId || usersList.find(u => u.uid === w.userId)?.deviceId) || '').substring(0, 16)}...</strong></span>
                          </span>
                        )}
                      </div>

                      {/* Multi-Account / Same IP Detection Warning */}
                      {(() => {
                        const targetIp = (w.ipAddress || usersList.find(u => u.uid === w.userId)?.lastIp || '').trim();
                        const targetDev = (w.deviceId || usersList.find(u => u.uid === w.userId)?.deviceId || '').trim();
                        const sameIpUsers = targetIp && targetIp !== '127.0.0.1' ? (usersByIpMap[targetIp] || []) : [];
                        const sameDevUsers = targetDev ? (usersByDeviceMap[targetDev] || []) : [];
                        const isDuplicate = sameIpUsers.length > 1 || sameDevUsers.length > 1;

                        if (!isDuplicate) return null;

                        return (
                          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[11px] leading-relaxed flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-amber-300">⚠️ Multi-Account Detected (Same Network / Device):</span>
                              {sameIpUsers.length > 1 && (
                                <div className="text-[10px] text-slate-300 mt-0.5">
                                  <strong>{sameIpUsers.length} accounts</strong> registered on this same IP:{' '}
                                  <span className="text-amber-200">
                                    {sameIpUsers.map(u => u.email).slice(0, 4).join(', ')}
                                    {sameIpUsers.length > 4 ? ` +${sameIpUsers.length - 4} more` : ''}
                                  </span>
                                </div>
                              )}
                              {sameDevUsers.length > 1 && (
                                <div className="text-[10px] text-rose-300 font-bold mt-0.5">
                                  🚫 {sameDevUsers.length} accounts sharing this identical physical device!
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {w.status === 'pending' && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedWithdrawal(w);
                            setActionType('reject');
                          }}
                          className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => {
                            setSelectedWithdrawal(w);
                            setActionType('approve');
                          }}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Approve &amp; Pay</span>
                        </button>
                      </>
                    )}

                    {/* Delete single withdrawal record from history */}
                    <button
                      onClick={() => {
                        setDeleteModal({
                          isOpen: true,
                          type: 'single_withdrawal',
                          targetId: w.id,
                          targetTitle: `Withdrawal of ₹${w.inrAmount} • ${w.userName || w.userEmail}`,
                          targetSubtitle: `Are you sure you want to permanently delete this ${w.status} withdrawal record? It will be completely removed from database history.`
                        });
                      }}
                      className="p-2 rounded-xl bg-[#070A12] hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-500/40 transition-all cursor-pointer active:scale-95 shrink-0"
                      title="Delete this withdrawal from history"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TASKS & OFFERS CREATOR & MANAGEMENT */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          {/* Top Actions Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0E1524] p-4 rounded-xl border border-slate-800/90 shadow-xs">
            <div>
              <h3 className="font-display font-black text-base text-white flex items-center gap-2">
                <ListTodo className="w-5 h-5 text-purple-400" />
                <span>Custom Task Management</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Create &amp; publish app install offers, follow tasks, game milestones or timed surf tasks.
              </p>
            </div>

            <button
              onClick={openCreateTaskModal}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 active:scale-95 transition-all shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Task</span>
            </button>
          </div>

          {/* Task Grid / List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {tasksList.map((task, tIdx) => (
              <div
                key={task.id ? `admin-task-${task.id}-${tIdx}` : `admin-task-${tIdx}`}
                className={`rounded-2xl p-4 border transition-all ${
                  task.active
                    ? 'bg-[#0E1524] border-slate-800 shadow-2xs'
                    : 'bg-[#070A12]/80 border-slate-800/60 opacity-60'
                }`}
              >
                {/* Visual Card preview */}
                <div className="flex items-center justify-between gap-2.5 mb-2.5">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {task.logoUrl ? (
                      <img
                        src={task.logoUrl}
                        alt={task.title}
                        className="w-11 h-11 rounded-full object-cover shadow-xs border border-slate-700 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div
                        className={`w-11 h-11 rounded-full ${
                          task.logoBg || 'bg-purple-900'
                        } text-white font-black flex flex-col items-center justify-center text-center shadow-xs border border-slate-700 shrink-0 leading-none`}
                      >
                        {task.logoText ? (
                          task.logoText.split('\n').map((txt, i) => (
                            <span key={`adm-logotxt-${task.id || tIdx}-${i}`} className={i === 0 ? 'text-xs font-black' : 'text-[8px]'}>
                              {txt}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs font-black">
                            {task.title.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-display font-black text-base text-white truncate">
                          {task.title}
                        </h4>
                        <span className="text-[10px] bg-purple-950/80 text-purple-300 border border-purple-800/60 font-bold px-1.5 py-0.5 rounded-md">
                          {task.type === 'level'
                            ? `🎮 Level (${task.targetLevel || 50} Lvl)`
                            : task.type === 'minute'
                            ? `⏱️ Minute (${task.durationMinutes || 2}m)`
                            : task.type === 'day'
                            ? `📅 Day (${task.daysCount || 7}d)`
                            : `⚡ Instant (${task.type || '1 Bar'})`}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1">
                        {task.description}
                      </p>
                    </div>
                  </div>

                  {/* Coin Pill */}
                  <div className="bg-[#070A12] rounded-xl px-2.5 py-1 border border-slate-800 shadow-2xs flex items-center gap-1.5 shrink-0">
                    <GoldCoin className="w-4 h-4" />
                    <span className="font-display font-black text-sm text-amber-400">
                      {task.coins}
                    </span>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-slate-800/80 my-2" />

                {/* Bottom Row Chips & Admin Actions */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1">
                    {task.tags &&
                      task.tags.map((tg, i) => (
                        <span
                          key={`adm-tag-${task.id || tIdx}-${i}`}
                          className={`font-bold text-[10px] px-2.5 py-0.5 rounded-md ${
                            i === 0
                              ? 'bg-sky-950/80 text-sky-300 border border-sky-800/60'
                              : 'bg-indigo-950/80 text-indigo-300 border border-indigo-800/60'
                          }`}
                        >
                          {tg}
                        </span>
                      ))}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggleTaskStatus(task)}
                      className={`p-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                        task.active
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                      title={task.active ? 'Active on User Screen' : 'Disabled'}
                    >
                      {task.active ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4 text-slate-500" />}
                      <span className="text-[10px]">{task.active ? 'Active' : 'Off'}</span>
                    </button>

                    <button
                      onClick={() => openEditTaskModal(task)}
                      className="p-1.5 rounded-lg bg-[#070A12] hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white cursor-pointer"
                      title="Edit Task"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 cursor-pointer"
                      title="Delete Task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: USER LIST */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, email, referral code or UID..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 bg-[#0E1524] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 font-medium shadow-xs focus:border-amber-400 outline-none"
              />
              {userSearch && (
                <button
                  onClick={() => setUserSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              onClick={() => setOnlySameIpFilter(!onlySameIpFilter)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border ${
                onlySameIpFilter
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-xs'
                  : 'bg-[#0E1524] hover:bg-slate-800 border-slate-800 text-slate-300'
              }`}
              title="Filter users sharing identical IP addresses or device IDs (Multi-Account Detection)"
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${onlySameIpFilter ? 'text-amber-400' : 'text-slate-400'}`} />
              <span>Same IP / Multi-Accounts ({multiAccountUsersCount})</span>
            </button>

            <button
              onClick={() => setOnlyVerifiedFilter(!onlyVerifiedFilter)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border ${
                onlyVerifiedFilter
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-xs'
                  : 'bg-[#0E1524] hover:bg-slate-800 border-slate-800 text-slate-300'
              }`}
              title="Filter users with Blue Tick (Verified Badge)"
            >
              <VerifiedBadge size="xs" showTooltip={false} />
              <span>Verified Users ({verifiedUsersCount})</span>
            </button>

            <button
              onClick={() => loadData()}
              className="px-3.5 py-2.5 bg-[#0E1524] hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
              <span>Refresh Users</span>
            </button>

            <button
              onClick={() => setShowResetCoinsModal(true)}
              className="px-3.5 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              title="Reset or zero out all coins for all real users (excluding admin)"
            >
              <GoldCoin size={14} className="text-amber-400" />
              <span>Zero All Coins</span>
            </button>

            <button
              onClick={() => setShowResetAllModal(true)}
              className="px-3.5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              title="Reset or deduct all coins and referrals for all real users"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
              <span>Reset All (Coins & Referrals)</span>
            </button>
          </div>

          <div className="bg-[#0E1524] rounded-2xl border border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#070A12] border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3.5">User</th>
                    <th className="p-3.5">IP &amp; Network</th>
                    <th className="p-3.5">Coins Balance</th>
                    <th className="p-3.5">Withdrawal Task Gate</th>
                    <th className="p-3.5">Total Earned</th>
                    <th className="p-3.5">Referral Code</th>
                    <th className="p-3.5">Badge &amp; Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-slate-500">
                        <Users className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                        <p className="font-bold text-slate-400 text-sm">
                          {userSearch ? 'No matching users found' : 'No registered users found yet'}
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          {userSearch
                            ? 'Try clearing the search query to see all accounts.'
                            : 'When users register or log in, their accounts will appear here.'}
                        </p>
                        {userSearch && (
                          <button
                            onClick={() => setUserSearch('')}
                            className="mt-3 px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold hover:bg-amber-500/20"
                          >
                            Clear Search
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u, uIdx) => {
                    const reqCount = u.requiredTasksForWithdrawal !== undefined ? u.requiredTasksForWithdrawal : 3;
                    const compCount = u.completedTasksCount || 0;
                    const usedCount = u.tasksUsedForWithdrawal || 0;
                    const availCount = Math.max(0, compCount - usedCount);
                    const isGatePassed = reqCount === 0 || availCount >= reqCount;

                    return (
                      <tr key={u.uid ? `adm-user-${u.uid}-${uIdx}` : `adm-user-${uIdx}`} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5">
                          <div className="flex items-center gap-2.5">
                            {/* User Avatar with 1-click edit */}
                            <div
                              onClick={() => openEditProfileModal(u)}
                              className="relative group cursor-pointer shrink-0"
                              title="Click to edit Name or Profile Picture"
                            >
                              {u.photoURL ? (
                                <img
                                  src={u.photoURL}
                                  alt={u.displayName || 'User'}
                                  className="w-10 h-10 rounded-xl object-cover border border-slate-700 shadow-2xs group-hover:ring-2 group-hover:ring-amber-400 transition-all bg-slate-900"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-purple-900 text-purple-200 font-black text-sm flex items-center justify-center border border-purple-700 group-hover:ring-2 group-hover:ring-amber-400 transition-all shadow-2xs">
                                  {(u.displayName || 'U').charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xs">
                                <Edit3 className="w-2.5 h-2.5 stroke-[3]" />
                              </div>
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 font-bold text-white">
                                <span
                                  onClick={() => openEditProfileModal(u)}
                                  className="truncate hover:text-amber-400 cursor-pointer"
                                  title="Click to edit Name"
                                >
                                  {u.displayName || 'Unnamed User'}
                                </span>
                                {u.isVerified && <VerifiedBadge size="xs" />}
                                <button
                                  onClick={() => openEditProfileModal(u)}
                                  className="text-slate-400 hover:text-amber-400 p-0.5 rounded transition-colors cursor-pointer"
                                  title="Edit Name & Photo"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                              </div>
                              <div className="text-[11px] text-slate-400 truncate font-mono">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 font-mono text-[11px]">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-slate-200">
                              <Globe className="w-3 h-3 text-cyan-400 shrink-0" />
                              <span className="font-bold select-all">{u.lastIp || '127.0.0.1'}</span>
                            </div>
                            <div className="flex items-center gap-1 text-slate-400 text-[10px]">
                              <Wifi className="w-3 h-3 text-indigo-400 shrink-0" />
                              <span>{u.networkType || '4G/Wi-Fi'}</span>
                            </div>
                            {/* Duplicate IP / Device Alert Badges */}
                            {(() => {
                              const sameIp = (u.lastIp && u.lastIp !== '127.0.0.1') ? (usersByIpMap[u.lastIp] || []) : [];
                              const sameDev = u.deviceId ? (usersByDeviceMap[u.deviceId] || []) : [];
                              if (sameIp.length <= 1 && sameDev.length <= 1) return null;

                              return (
                                <div className="pt-0.5 space-y-0.5">
                                  {sameIp.length > 1 && (
                                    <span
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/30 text-[9px] font-black cursor-help block w-fit"
                                      title={`Same IP shared by: ${sameIp.map(x => x.email).join(', ')}`}
                                    >
                                      ⚠️ Same IP ({sameIp.length} IDs)
                                    </span>
                                  )}
                                  {sameDev.length > 1 && (
                                    <span
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/30 text-[9px] font-black cursor-help block w-fit"
                                      title={`Same Device shared by: ${sameDev.map(x => x.email).join(', ')}`}
                                    >
                                      🚫 Same Phone ({sameDev.length} IDs)
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="p-3.5 font-bold text-amber-400">
                          {(u.coins || 0).toLocaleString()} Coins
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-lg border ${
                                availCount > 0
                                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
                                  : 'bg-amber-400/10 text-amber-300 border-amber-400/30'
                              }`}
                            >
                              {availCount} Avail ({compCount} done)
                            </span>
                            <button
                              onClick={() => {
                                setReqEditUser(u);
                                setReqRequiredCount(reqCount);
                                setReqCompletedCount(compCount);
                              }}
                              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                              title="Edit withdrawal task requirement or manual completed count"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-300">
                          {(u.totalEarned || 0).toLocaleString()}
                        </td>
                        <td className="p-3.5 font-mono text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-purple-300 font-bold">{u.referralCode}</span>
                            <button
                              onClick={() => {
                                setAdjustRefUser(u);
                                setAdjustRefCount(1);
                                setAdjustRefReason('Admin referral adjustment');
                              }}
                              className="px-2 py-0.5 bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-700/60 rounded-md font-bold text-[10px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                              title="Click to add or minus referrals for this user"
                            >
                              <span>{u.referralCount || 0} refs</span>
                              <Edit3 className="w-3 h-3 text-purple-400" />
                            </button>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {u.isVerified ? (
                              <span className="inline-flex items-center gap-1 text-[10px] bg-sky-950/80 text-sky-300 font-black px-2 py-0.5 rounded-full border border-sky-700/60">
                                <VerifiedBadge size="xs" showTooltip={false} />
                                Verified
                              </span>
                            ) : (
                              <span className="text-[10px] bg-slate-800 text-slate-400 font-bold px-2 py-0.5 rounded-full">
                                Unverified
                              </span>
                            )}
                            {u.isBanned ? (
                              <span className="text-[10px] bg-rose-950/80 text-rose-300 font-black px-2 py-0.5 rounded-full border border-rose-800/60">
                                BANNED
                              </span>
                            ) : (
                              <span className="text-[10px] bg-emerald-950/80 text-emerald-300 font-black px-2 py-0.5 rounded-full border border-emerald-800/60">
                                ACTIVE
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                          {/* EDIT NAME & PHOTO BUTTON */}
                          <button
                            onClick={() => openEditProfileModal(u)}
                            className="px-2.5 py-1 bg-[#070A12] hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-bold rounded-lg text-[11px] transition-colors inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                            title="Edit User Name and Profile Picture"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                            <span>Edit Profile</span>
                          </button>
                          <button
                            onClick={() => openUserHistoryModal(u)}
                            className="px-2.5 py-1 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/60 font-bold rounded-lg text-[11px] transition-colors inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                            title="View detailed coin earning history & activity audit"
                          >
                            <History className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Coin History</span>
                          </button>
                          <button
                            onClick={async () => {
                              await toggleUserVerified(u.uid, !u.isVerified);
                              sound.playWin();
                              await loadData();
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all inline-flex items-center gap-1 cursor-pointer ${
                              u.isVerified
                                ? 'bg-sky-950/80 hover:bg-sky-900 text-sky-300 border border-sky-700/60'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                            }`}
                            title={u.isVerified ? 'Click to Remove Verified Badge' : 'Click to Grant Verified Badge'}
                          >
                            <VerifiedBadge size="xs" showTooltip={false} />
                            <span>{u.isVerified ? 'Remove Tick' : 'Verify Tick'}</span>
                          </button>
                          <button
                            onClick={() => setAdjustUser(u)}
                            className="px-2.5 py-1 bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                          >
                            ± Coins
                          </button>
                          <button
                            onClick={() => {
                              setAdjustRefUser(u);
                              setAdjustRefCount(1);
                              setAdjustRefReason('Admin referral adjustment');
                            }}
                            className="px-2.5 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                            title="Add or deduct (minus) referrals for this user"
                          >
                            ± Referrals
                          </button>
                          <button
                            onClick={() => handleResetSingleUser(u)}
                            className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                            title="Deduct/minus all coins and set referrals to 0 for this user"
                          >
                            Reset To 0
                          </button>
                          <button
                            onClick={async () => {
                              await toggleUserBan(u.uid, !u.isBanned);
                              await loadData();
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                              u.isBanned
                                ? 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60'
                                : 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700/60'
                            }`}
                          >
                            {u.isBanned ? 'Unban' : 'Ban'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#0E1524] p-5 rounded-2xl border border-slate-800 shadow-sm">
            <span className="text-xs text-slate-400 font-bold uppercase block">Total Paid Out</span>
            <div className="font-display font-black text-2xl text-emerald-400 mt-1">₹{totalApprovedInr}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Approved &amp; Transferred</p>
          </div>
          <div className="bg-[#0E1524] p-5 rounded-2xl border border-slate-800 shadow-sm">
            <span className="text-xs text-slate-400 font-bold uppercase block">Pending Payouts</span>
            <div className="font-display font-black text-2xl text-amber-400 mt-1">₹{pendingInr}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">{pendingCount} Requests Awaiting</p>
          </div>
          <div className="bg-[#0E1524] p-5 rounded-2xl border border-slate-800 shadow-sm">
            <span className="text-xs text-slate-400 font-bold uppercase block">Total User Coins</span>
            <div className="font-display font-black text-2xl text-purple-300 mt-1">{totalUserCoins.toLocaleString()}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Across {usersList.length} registered accounts</p>
          </div>
        </div>
      )}

      {/* TAB: FIREBASE DB CONFIG & HEALTH */}
      {activeTab === 'firebase' && (
        <div className="space-y-4">
          {/* Main Status Banner */}
          <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent p-5 rounded-2xl border border-amber-500/30 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/40 text-amber-400 flex items-center justify-center font-black shrink-0 shadow-md">
                  <Flame className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-black text-lg text-white">
                      Active Firebase Project
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      ONLINE &amp; SYNCED
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5 font-medium">
                    Project ID: <strong className="text-amber-400 font-mono">{firebaseConfigJson.projectId}</strong> • Database: <span className="text-slate-300 font-mono">(default) Cloud Firestore</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const fullConfig = `const firebaseConfig = ${JSON.stringify(firebaseConfigJson, null, 2)};`;
                    navigator.clipboard.writeText(fullConfig);
                    setCopiedId('full_firebase_config');
                    setTimeout(() => setCopiedId(null), 2000);
                  }}
                  className="px-3.5 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
                >
                  {copiedId === 'full_firebase_config' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied Config!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Full Config</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Real-time Collections Live Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#0E1524] p-4 rounded-xl border border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-sky-400" />
                  users
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <div className="text-xl font-black text-white mt-1.5">{usersList.length}</div>
              <p className="text-[10px] text-slate-500 mt-0.5">Registered Profiles</p>
            </div>

            <div className="bg-[#0E1524] p-4 rounded-xl border border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                <span className="flex items-center gap-1.5">
                  <ListTodo className="w-3.5 h-3.5 text-amber-400" />
                  tasks
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <div className="text-xl font-black text-amber-400 mt-1.5">{tasksList.length}</div>
              <p className="text-[10px] text-slate-500 mt-0.5">Live Offerwall Tasks</p>
            </div>

            <div className="bg-[#0E1524] p-4 rounded-xl border border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                <span className="flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                  withdrawals
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <div className="text-xl font-black text-emerald-400 mt-1.5">{withdrawals.length}</div>
              <p className="text-[10px] text-slate-500 mt-0.5">Payout Records</p>
            </div>

            <div className="bg-[#0E1524] p-4 rounded-xl border border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                <span className="flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-purple-400" />
                  user_tasks
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <div className="text-xl font-black text-purple-300 mt-1.5">{taskSubmissions.length}</div>
              <p className="text-[10px] text-slate-500 mt-0.5">Proof Submissions</p>
            </div>
          </div>

          {/* Config Parameters Table */}
          <div className="bg-[#0E1524] p-5 rounded-2xl border border-slate-800 shadow-sm space-y-3">
            <h4 className="font-display font-black text-sm text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-amber-400" />
              <span>Firebase Client Config Keys</span>
            </h4>

            <div className="space-y-2 text-xs">
              {[
                { label: 'Project ID', key: 'projectId', val: firebaseConfig.projectId },
                { label: 'API Key', key: 'apiKey', val: firebaseConfig.apiKey },
                { label: 'Auth Domain', key: 'authDomain', val: firebaseConfig.authDomain },
                { label: 'Database URL', key: 'databaseURL', val: (firebaseConfig as Record<string, string | undefined>).databaseURL },
                { label: 'Storage Bucket', key: 'storageBucket', val: firebaseConfig.storageBucket },
                { label: 'App ID', key: 'appId', val: firebaseConfig.appId },
                { label: 'Messaging Sender ID', key: 'messagingSenderId', val: firebaseConfig.messagingSenderId },
                { label: 'Measurement ID', key: 'measurementId', val: (firebaseConfig as Record<string, string | undefined>).measurementId },
              ].map((item) => (
                <div
                  key={`fb-param-${item.key}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-[#070A12] rounded-xl border border-slate-800/80 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-24 text-slate-400 font-bold shrink-0">{item.label}:</span>
                    <span className="font-mono text-amber-300 font-semibold break-all">{item.val || '(none)'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(item.val || '');
                      setCopiedId(item.key);
                      setTimeout(() => setCopiedId(null), 2000);
                    }}
                    className="self-end sm:self-auto px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                  >
                    {copiedId === item.key ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-300">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT TASK MODAL */}
      <AnimatePresence>
        {isTaskModalOpen && (
          <div key="admin-task-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
            <motion.div
              key="admin-task-modal"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0E1524] text-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-800 my-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4 border-b border-slate-800/90 pb-3">
                <h3 className="font-display font-black text-lg text-white">
                  {editingTask ? 'Edit Task Offer' : 'Create New Task Offer'}
                </h3>
                <button
                  onClick={() => setIsTaskModalOpen(false)}
                  className="text-slate-400 hover:text-white text-sm font-bold p-1 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  ✕
                </button>
              </div>

              {taskErrorMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 font-bold flex items-center gap-2 mb-3">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{taskErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSaveTask} className="space-y-3.5 text-xs">
                {/* Task Title */}
                <div>
                  <label className="font-bold text-slate-300 block mb-1">
                    Task / Brand Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={taskFormTitle}
                    onChange={e => setTaskFormTitle(e.target.value)}
                    placeholder="e.g. Nykaa Fashion or Telegram Follow"
                    className="w-full px-3 py-2 bg-[#070A12] border border-slate-700/80 rounded-xl font-bold text-white placeholder-slate-500 focus:border-amber-400 focus:outline-hidden"
                  />
                </div>

                {/* Task Type / Category: 4 Clear Choices */}
                <div>
                  <label className="font-black text-slate-300 text-xs block mb-1.5 flex items-center justify-between">
                    <span>Task Model Category *</span>
                    <span className="text-[10px] text-amber-400 font-bold uppercase">Choose 1 of 4</span>
                  </label>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {/* Option 1: 1 Bar me Saari Coin */}
                    <button
                      type="button"
                      onClick={() => handleSelectTaskType('instant')}
                      className={`p-3 rounded-xl border text-left transition-all relative cursor-pointer ${
                        taskFormType === 'instant' || taskFormType === 'install' || taskFormType === 'follow' || taskFormType === 'other'
                          ? 'border-amber-400 bg-amber-400/10 shadow-xs'
                          : 'border-slate-800 hover:border-slate-700 bg-[#070A12]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-lg">⚡</span>
                        {(taskFormType === 'instant' || taskFormType === 'install' || taskFormType === 'follow' || taskFormType === 'other') && (
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                        )}
                      </div>
                      <div className="font-black text-white text-xs leading-snug">
                        Instant Single
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                        Install / Direct Action
                      </div>
                    </button>

                    {/* Option 2: Level Wala (Gaming / Milestones) */}
                    <button
                      type="button"
                      onClick={() => handleSelectTaskType('level')}
                      className={`p-3 rounded-xl border text-left transition-all relative cursor-pointer ${
                        taskFormType === 'level'
                          ? 'border-emerald-400 bg-emerald-400/10 shadow-xs'
                          : 'border-slate-800 hover:border-slate-700 bg-[#070A12]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-lg">🎮</span>
                        {taskFormType === 'level' && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        )}
                      </div>
                      <div className="font-black text-white text-xs leading-snug">
                        Level Milestones
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                        Reach Game Levels
                      </div>
                    </button>

                    {/* Option 3: Minute Wala */}
                    <button
                      type="button"
                      onClick={() => handleSelectTaskType('minute')}
                      className={`p-3 rounded-xl border text-left transition-all relative cursor-pointer ${
                        taskFormType === 'minute'
                          ? 'border-sky-400 bg-sky-400/10 shadow-xs'
                          : 'border-slate-800 hover:border-slate-700 bg-[#070A12]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-lg">⏱️</span>
                        {taskFormType === 'minute' && (
                          <span className="w-2 h-2 rounded-full bg-sky-400" />
                        )}
                      </div>
                      <div className="font-black text-white text-xs leading-snug">
                        Minute Timed
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                        In-App Surf timer
                      </div>
                    </button>

                    {/* Option 4: Day Wala */}
                    <button
                      type="button"
                      onClick={() => handleSelectTaskType('day')}
                      className={`p-3 rounded-xl border text-left transition-all relative cursor-pointer ${
                        taskFormType === 'day'
                          ? 'border-indigo-400 bg-indigo-400/10 shadow-xs'
                          : 'border-slate-800 hover:border-slate-700 bg-[#070A12]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-lg">📅</span>
                        {taskFormType === 'day' && (
                          <span className="w-2 h-2 rounded-full bg-indigo-400" />
                        )}
                      </div>
                      <div className="font-black text-white text-xs leading-snug">
                        Multi-Day Streak
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                        Day 1 to Day X
                      </div>
                    </button>
                  </div>
                </div>

                {/* Total Coins and Dynamic Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="font-bold text-slate-300 block mb-1">
                      Total Coin Reward (Full Coins) *
                    </label>
                    <input
                      type="number"
                      required
                      min={10}
                      value={taskFormCoins}
                      onChange={e => setTaskFormCoins(Number(e.target.value))}
                      placeholder="e.g. 1194"
                      className="w-full px-3 py-2 bg-[#070A12] border border-slate-700/80 rounded-xl font-bold text-amber-400 focus:border-amber-400 focus:outline-hidden"
                    />
                  </div>

                  {/* If Level Task: Target Level */}
                  {taskFormType === 'level' && (
                    <div>
                      <label className="font-bold text-emerald-400 block mb-1">
                        🎮 Target Game Level *
                      </label>
                      <input
                        type="number"
                        min={5}
                        max={1000}
                        required
                        value={taskFormLevel}
                        onChange={e => {
                          const lvl = Number(e.target.value);
                          setTaskFormLevel(lvl);
                        }}
                        placeholder="e.g. 200 (or 50, 100)"
                        className="w-full px-3 py-2 bg-[#070A12] border border-emerald-500/50 rounded-xl font-bold text-emerald-300 focus:border-emerald-400 focus:outline-hidden"
                      />
                    </div>
                  )}

                  {/* If Minute Task: Duration in Minutes */}
                  {taskFormType === 'minute' && (
                    <div>
                      <label className="font-bold text-sky-400 block mb-1">
                        ⏱️ Duration in Minutes *
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={120}
                        required
                        value={taskFormDuration}
                        onChange={e => {
                          const mins = Number(e.target.value);
                          setTaskFormDuration(mins);
                        }}
                        placeholder="e.g. 2"
                        className="w-full px-3 py-2 bg-[#070A12] border border-sky-500/50 rounded-xl font-bold text-sky-300 focus:border-sky-400 focus:outline-hidden"
                      />
                    </div>
                  )}

                  {/* If Day Task: Number of Days */}
                  {taskFormType === 'day' && (
                    <div>
                      <label className="font-bold text-indigo-400 block mb-1">
                        📅 Number of Days *
                      </label>
                      <input
                        type="number"
                        min={2}
                        max={30}
                        required
                        value={taskFormDays}
                        onChange={e => {
                          const days = Number(e.target.value);
                          setTaskFormDays(days);
                        }}
                        placeholder="e.g. 7"
                        className="w-full px-3 py-2 bg-[#070A12] border border-indigo-500/50 rounded-xl font-bold text-indigo-300 focus:border-indigo-400 focus:outline-hidden"
                      />
                    </div>
                  )}

                  {/* If Instant Task: Sub-type info */}
                  {(taskFormType === 'instant' || taskFormType === 'install' || taskFormType === 'follow' || taskFormType === 'other') && (
                    <div className="flex items-center">
                      <div className="w-full p-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-[11px] text-slate-300 flex items-center gap-2">
                        <span className="text-base text-amber-400">⚡</span>
                        <span>User action complete hone par <strong className="text-amber-400">{taskFormCoins || 0} Coins</strong> claim karega.</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 🎯 CUSTOM MILESTONES & LEVEL-WISE COIN BUILDER */}
                <div className="bg-[#070A12] border border-slate-800 rounded-xl p-3.5 sm:p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                    <div>
                      <div className="font-black text-white text-xs sm:text-sm flex items-center gap-1.5">
                        <span>🎯 Milestone Steps &amp; Coins:</span>
                        <span className="bg-amber-400/20 text-amber-400 border border-amber-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {taskFormMilestones.length} Steps
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Har milestone ka title aur coin reward customize karein:
                      </p>
                    </div>

                    {/* Quick Presets for Level Tasks */}
                    {taskFormType === 'level' && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            const ladder: TaskMilestone[] = [
                              { title: 'Reach 10 Level', coins: 22 },
                              { title: 'Reach 20 Level', coins: 45 },
                              { title: 'Reach 30 Level', coins: 68 },
                              { title: 'Reach 40 Level', coins: 91 },
                              { title: 'Reach 50 Level', coins: 113 },
                              { title: 'Reach 80 Level', coins: 159 },
                              { title: 'Reach 100 Level', coins: 182 },
                              { title: 'Reach 150 Level', coins: 227 },
                              { title: 'Reach 200 Level', coins: 284 }
                            ];
                            setTaskFormMilestones(ladder);
                            setTaskFormCoins(1194);
                            setTaskFormLevel(200);
                          }}
                          className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold text-[10px] rounded-lg transition-all cursor-pointer shadow-xs"
                        >
                          ⚡ Load 9 Levels (1,194 Coins)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const ladder: TaskMilestone[] = [
                              { title: 'Reach 10 Level', coins: 50 },
                              { title: 'Reach 25 Level', coins: 100 },
                              { title: 'Reach 50 Level', coins: 150 },
                              { title: 'Reach 75 Level', coins: 200 },
                              { title: 'Reach 100 Level', coins: 300 }
                            ];
                            setTaskFormMilestones(ladder);
                            setTaskFormCoins(800);
                            setTaskFormLevel(100);
                          }}
                          className="px-2.5 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-bold text-[10px] rounded-lg transition-all cursor-pointer"
                        >
                          ⚡ 5 Levels (100 Lvl)
                        </button>
                      </div>
                    )}

                    {/* Quick Presets for Minute Tasks */}
                    {taskFormType === 'minute' && (
                      <button
                        type="button"
                        onClick={() => {
                          const count = Math.max(1, taskFormDuration || 2);
                          const perMin = Math.max(1, Math.floor((taskFormCoins || 100) / count));
                          const list: TaskMilestone[] = [];
                          for (let m = 1; m < count; m++) {
                            list.push({ title: `Minute ${m}: Active In-App Surf`, coins: perMin });
                          }
                          list.push({ title: `Minute ${count}: Final Goal & Finish`, coins: Math.max(1, (taskFormCoins || 100) - (perMin * (count - 1))) });
                          setTaskFormMilestones(list);
                        }}
                        className="px-2.5 py-1 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 font-bold text-[10px] rounded-lg transition-all cursor-pointer"
                      >
                        ⚡ Generate {taskFormDuration || 2} Minute Steps
                      </button>
                    )}

                    {/* Quick Presets for Day Tasks */}
                    {taskFormType === 'day' && (
                      <button
                        type="button"
                        onClick={() => {
                          const count = Math.max(2, taskFormDays || 7);
                          const perDay = Math.max(1, Math.floor((taskFormCoins || 100) / count));
                          const list: TaskMilestone[] = [];
                          for (let d = 1; d < count; d++) {
                            list.push({ title: `Day ${d}: Open & Use App`, coins: perDay });
                          }
                          list.push({ title: `Day ${count}: Complete Final Goal`, coins: Math.max(1, (taskFormCoins || 100) - (perDay * (count - 1))) });
                          setTaskFormMilestones(list);
                        }}
                        className="px-2.5 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 font-bold text-[10px] rounded-lg transition-all cursor-pointer"
                      >
                        ⚡ Generate {taskFormDays || 7} Days Steps
                      </button>
                    )}
                  </div>

                  {/* Steps List Table */}
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {taskFormMilestones.map((ms, idx) => (
                      <div
                        key={`ms-row-${idx}`}
                        className="flex items-center gap-2 p-2 bg-[#0E1524] border border-slate-800 rounded-xl shadow-xs"
                      >
                        <div className="w-6 h-6 rounded-lg bg-amber-400/20 text-amber-400 font-black text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </div>
                        <input
                          type="text"
                          value={ms.title}
                          onChange={(e) => {
                            const updated = [...taskFormMilestones];
                            updated[idx] = { ...updated[idx], title: e.target.value };
                            setTaskFormMilestones(updated);
                          }}
                          placeholder="e.g. Reach 10 Level or Minute 1"
                          className="flex-1 px-2.5 py-1.5 border border-slate-700/80 rounded-lg text-xs font-bold text-white bg-[#070A12] focus:border-amber-400 focus:outline-hidden"
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            type="number"
                            min={1}
                            value={ms.coins}
                            onChange={(e) => {
                              const updated = [...taskFormMilestones];
                              updated[idx] = { ...updated[idx], coins: Number(e.target.value) || 0 };
                              setTaskFormMilestones(updated);
                            }}
                            placeholder="Coins"
                            className="w-20 px-2 py-1.5 border border-amber-400/40 rounded-lg text-xs font-black text-amber-400 bg-amber-400/10 text-right focus:border-amber-400 focus:outline-hidden"
                          />
                          <span className="text-[11px] font-bold text-slate-400">Coins</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = taskFormMilestones.filter((_, i) => i !== idx);
                            setTaskFormMilestones(updated);
                          }}
                          disabled={taskFormMilestones.length <= 1}
                          className="w-7 h-7 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shrink-0"
                          title="Delete this milestone"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Actions & Sum Calculation Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        let defaultTitle = `Step ${taskFormMilestones.length + 1}`;
                        if (taskFormType === 'level') {
                          const last = taskFormMilestones[taskFormMilestones.length - 1];
                          const match = last?.title?.match(/\d+/);
                          const nextLvl = match ? Number(match[0]) + 10 : (taskFormMilestones.length + 1) * 10;
                          defaultTitle = `Reach ${nextLvl} Level`;
                        } else if (taskFormType === 'minute') {
                          defaultTitle = `Minute ${taskFormMilestones.length + 1}: Active Surf`;
                        } else if (taskFormType === 'day') {
                          defaultTitle = `Day ${taskFormMilestones.length + 1}: Open App`;
                        }
                        setTaskFormMilestones([
                          ...taskFormMilestones,
                          { title: defaultTitle, coins: 50 }
                        ]);
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add {taskFormType === 'level' ? 'Level' : taskFormType === 'minute' ? 'Minute' : 'Step'}</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {/* Calculate Total Sum Button */}
                      <button
                        type="button"
                        onClick={() => {
                          const sum = taskFormMilestones.reduce((a, b) => a + (Number(b.coins) || 0), 0);
                          setTaskFormCoins(sum);
                        }}
                        className="px-2.5 py-1 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 text-amber-400 font-bold text-[11px] rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                        title="Update Total Coins to match the sum of all steps"
                      >
                        <span>🔄 Sync Total:</span>
                        <span className="font-black text-amber-300">
                          {taskFormMilestones.reduce((a, b) => a + (Number(b.coins) || 0), 0)} Coins
                        </span>
                      </button>

                      {/* Auto Distribute Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (taskFormMilestones.length === 0) return;
                          const total = Number(taskFormCoins) || 100;
                          const count = taskFormMilestones.length;
                          const weights = taskFormMilestones.map((_, i) => (taskFormType === 'level' ? i + 1 : 1));
                          const totalWeight = weights.reduce((a, b) => a + b, 0);
                          let allocated = 0;
                          const updated = taskFormMilestones.map((ms, idx) => {
                            if (idx === count - 1) {
                              return { ...ms, coins: Math.max(1, total - allocated) };
                            }
                            const share = Math.max(1, Math.round((total * weights[idx]) / totalWeight));
                            allocated += share;
                            return { ...ms, coins: share };
                          });
                          setTaskFormMilestones(updated);
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                        title="Distribute Total Coins evenly/progressively across existing steps"
                      >
                        ⚖️ Auto-Distribute
                      </button>
                    </div>
                  </div>
                </div>

                {/* Action Tags */}
                <div>
                  <label className="font-bold text-slate-300 block mb-1">
                    Action Chips / Tags (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={taskFormTags}
                    onChange={e => setTaskFormTags(e.target.value)}
                    placeholder="e.g. Install, Order a Product"
                    className="w-full px-3 py-2 bg-[#070A12] border border-slate-700/80 rounded-xl font-medium text-white placeholder-slate-500 focus:border-amber-400 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-400">
                    First tag shows in cyan blue chip, second tag in royal blue chip.
                  </span>
                </div>

                {/* Target URL */}
                <div>
                  <label className="font-bold text-slate-300 block mb-1">
                    Target URL / App Link
                  </label>
                  <input
                    type="text"
                    value={taskFormUrl}
                    onChange={e => setTaskFormUrl(e.target.value)}
                    placeholder="https://example.com/app or t.me/channel"
                    className="w-full px-3 py-2 bg-[#070A12] border border-slate-700/80 rounded-xl font-mono text-[11px] text-white placeholder-slate-500 focus:border-amber-400 focus:outline-hidden"
                  />
                </div>

                {/* Task Image URL */}
                <div>
                  <label className="font-bold text-slate-300 block mb-1">
                    Task Image / Logo URL
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={taskFormLogoUrl}
                      onChange={e => setTaskFormLogoUrl(e.target.value)}
                      placeholder="https://example.com/app-icon.png"
                      className="flex-1 px-3 py-2 bg-[#070A12] border border-slate-700/80 rounded-xl font-mono text-[11px] text-white placeholder-slate-500 focus:border-amber-400 focus:outline-hidden"
                    />
                    {taskFormLogoUrl && (
                      <img
                        src={taskFormLogoUrl}
                        alt="Logo Preview"
                        className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0 bg-slate-900"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Paste direct PNG/JPG image link for the round task icon.
                  </span>
                </div>

                {/* Description & Instructions */}
                <div>
                  <label className="font-bold text-slate-300 block mb-1">
                    Short Description
                  </label>
                  <input
                    type="text"
                    value={taskFormDescription}
                    onChange={e => setTaskFormDescription(e.target.value)}
                    placeholder="e.g. Install Nykaa Fashion app & explore products."
                    className="w-full px-3 py-2 bg-[#070A12] border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:border-amber-400 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">
                    Step-by-Step Instructions
                  </label>
                  <textarea
                    rows={2}
                    value={taskFormInstructions}
                    onChange={e => setTaskFormInstructions(e.target.value)}
                    placeholder="1. Open app... 2. Stay 30s..."
                    className="w-full px-3 py-2 bg-[#070A12] border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:border-amber-400 focus:outline-hidden"
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsTaskModalOpen(false)}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={taskSaving}
                    className="flex-1 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-display font-black rounded-xl text-xs shadow-md transition-all active:scale-98"
                  >
                    {taskSaving ? 'Saving Task...' : editingTask ? 'Update Task' : 'Publish Task'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* APPROVE / REJECT MODAL */}
      {selectedWithdrawal && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#0E1524] text-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-800">
            <h3 className="font-display font-black text-lg text-white mb-2">
              {actionType === 'approve' ? 'Approve Withdrawal Request' : 'Reject Withdrawal Request'}
            </h3>

            <div className="bg-[#070A12] p-3 rounded-xl border border-slate-800 text-xs mb-4 space-y-1 text-slate-300">
              <div>Amount: <strong className="text-amber-400">₹{selectedWithdrawal.inrAmount}</strong> ({selectedWithdrawal.coins} Coins)</div>
              <div>User: <strong className="text-white">{selectedWithdrawal.userName}</strong> ({selectedWithdrawal.userEmail})</div>
              <div>Method: <strong className="uppercase text-amber-400">{selectedWithdrawal.method.replace('_', ' ')}</strong></div>
            </div>

            {actionType === 'approve' ? (
              <div className="space-y-3">
                {selectedWithdrawal.method === 'google_play' && (
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      Google Play Gift / Redeem Code
                    </label>
                    <input
                      type="text"
                      value={redeemCode}
                      onChange={(e) => setRedeemCode(e.target.value)}
                      placeholder="e.g. GPLAY-9X82-K3LA"
                      className="w-full px-3 py-2 bg-[#070A12] border border-slate-700/80 rounded-xl text-xs font-mono font-bold uppercase text-amber-400 focus:border-amber-400 focus:outline-hidden"
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Bank / UPI Transaction Reference ID
                  </label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="e.g. TXN-12938491823"
                    className="w-full px-3 py-2 bg-[#070A12] border border-slate-700/80 rounded-xl text-xs font-mono font-bold text-white focus:border-amber-400 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Admin Approval Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Payment transferred via UPI/Bank"
                    className="w-full px-3 py-2 bg-[#070A12] border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-hidden"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Rejection Reason (Will be shown to user)
                  </label>
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Invalid UPI ID or KYC issue. Coins will be refunded automatically."
                    rows={3}
                    className="w-full px-3 py-2 bg-[#070A12] border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-hidden"
                  />
                </div>
                <p className="text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg">
                  Note: Rejecting will automatically refund {selectedWithdrawal.coins} coins to the user's wallet.
                </p>
              </div>
            )}

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => {
                  setSelectedWithdrawal(null);
                  setActionType(null);
                }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={actionType === 'approve' ? handleConfirmApprove : handleConfirmReject}
                disabled={actionLoading}
                className={`flex-1 py-2.5 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all active:scale-98 ${
                  actionType === 'approve'
                    ? 'bg-emerald-400 hover:bg-emerald-300'
                    : 'bg-rose-500 hover:bg-rose-400 text-white'
                }`}
              >
                {actionLoading ? 'Processing...' : actionType === 'approve' ? 'Confirm Approval' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TASK PROOF APPROVAL / REJECTION MODAL */}
      {selectedTaskSubmission && taskActionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#0E1524] text-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-800">
            <h3 className="font-display font-black text-lg text-white mb-2">
              {taskActionType === 'approve' ? 'Approve Task Proof & Credit Coins' : 'Reject Task Submission'}
            </h3>

            <div className="bg-[#070A12] p-3.5 rounded-xl border border-slate-800 text-xs mb-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Task:</span>
                <strong className="text-white">{selectedTaskSubmission.taskTitle}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">User:</span>
                <strong className="text-white">{selectedTaskSubmission.userName || 'User'}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">User Email:</span>
                <span className="text-amber-400 font-mono font-bold select-all bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                  {selectedTaskSubmission.userEmail || 'No email registered'}
                </span>
              </div>
              {selectedTaskSubmission.totalSteps && selectedTaskSubmission.totalSteps > 1 ? (
                <div className="flex items-center justify-between text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 p-2 rounded-xl">
                  <span className="font-bold">Stage to Approve:</span>
                  <span className="font-black">
                    Step {(selectedTaskSubmission.currentStepIndex || 0) + 1} of {selectedTaskSubmission.totalSteps} ({selectedTaskSubmission.currentStepTitle || 'Milestone'})
                  </span>
                </div>
              ) : null}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                <span className="text-slate-400 font-bold">Coins to Credit on Approval:</span>
                <strong className="text-emerald-400 font-black text-sm">
                  +
                  {selectedTaskSubmission.currentStepCoins ||
                    (selectedTaskSubmission.totalSteps && selectedTaskSubmission.totalSteps > 1
                      ? Math.round((selectedTaskSubmission.taskCoins || 100) / selectedTaskSubmission.totalSteps)
                      : (selectedTaskSubmission.taskCoins || 100))}{' '}
                  Coins
                </strong>
              </div>
              {selectedTaskSubmission.proofText && (
                <div className="pt-1.5 text-slate-400 border-t border-slate-800">
                  <span className="font-bold text-slate-300">User Note:</span> {selectedTaskSubmission.proofText}
                </div>
              )}
            </div>

            {taskActionType === 'approve' ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Approval Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={taskAdminNote}
                    onChange={(e) => setTaskAdminNote(e.target.value)}
                    placeholder={
                      selectedTaskSubmission.totalSteps && selectedTaskSubmission.totalSteps > 1
                        ? `Step ${(selectedTaskSubmission.currentStepIndex || 0) + 1} approved! Proceed to next step.`
                        : 'Proof verified & coins credited successfully'
                    }
                    className="w-full px-3 py-2 bg-[#070A12] border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-hidden"
                  />
                </div>
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    {selectedTaskSubmission.totalSteps &&
                    selectedTaskSubmission.totalSteps > 1 &&
                    (selectedTaskSubmission.completedStepCount || 0) + 1 < selectedTaskSubmission.totalSteps ? (
                      <>
                        Crediting{' '}
                        <strong className="text-emerald-400">
                          +
                          {selectedTaskSubmission.currentStepCoins ||
                            Math.round((selectedTaskSubmission.taskCoins || 100) / selectedTaskSubmission.totalSteps)}{' '}
                          Coins
                        </strong>
                        . User will be required to submit next proof for Step{' '}
                        {(selectedTaskSubmission.currentStepIndex || 0) + 2}!
                      </>
                    ) : (
                      <>
                        Confirming approval will credit{' '}
                        <strong className="text-emerald-400">
                          +
                          {selectedTaskSubmission.currentStepCoins || selectedTaskSubmission.taskCoins || 100} Coins
                        </strong>{' '}
                        and mark task fully finished!
                      </>
                    )}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Rejection Reason * (Will be shown to user)
                  </label>
                  <textarea
                    value={taskAdminNote}
                    onChange={(e) => setTaskAdminNote(e.target.value)}
                    placeholder="Screenshot not clear or task requirements not completed."
                    rows={3}
                    className="w-full px-3 py-2 bg-[#070A12] border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-hidden"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => {
                  setSelectedTaskSubmission(null);
                  setTaskActionType(null);
                }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmTaskAction}
                disabled={taskActionLoading}
                className={`flex-1 py-2.5 font-black rounded-xl text-xs shadow-md transition-all active:scale-98 ${
                  taskActionType === 'approve'
                    ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950'
                    : 'bg-rose-500 hover:bg-rose-400 text-white'
                }`}
              >
                {taskActionLoading ? 'Processing...' : taskActionType === 'approve' ? 'Confirm & Credit Coins' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN PROOF SCREENSHOT VIEWER MODAL */}
      <AnimatePresence>
        {selectedProofImage && (
          <div key="admin-proof-screenshot-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-sm">
            <motion.div
              key="admin-proof-screenshot-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0E1524] border border-slate-800 rounded-2xl max-w-2xl w-full p-4 sm:p-5 shadow-2xl flex flex-col max-h-[95vh] text-white"
            >
              {/* Top Modal Bar */}
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="min-w-0">
                  <h4 className="font-display font-black text-sm sm:text-base text-white truncate">
                    {selectedProofImage.title} • Proof Screenshot
                  </h4>
                  <p className="text-xs text-slate-400 truncate">
                    Uploaded by <span className="text-amber-400 font-bold">{selectedProofImage.userName}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={selectedProofImage.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 hover:text-white transition-colors"
                    title="Open in new window"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => setSelectedProofImage(null)}
                    className="p-2 bg-slate-800 hover:bg-rose-500/80 rounded-xl text-slate-300 hover:text-white transition-colors text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* User Note Callout */}
              {selectedProofImage.notes && (
                <div className="bg-[#070A12] rounded-xl p-2.5 my-3 text-xs border border-slate-800 flex items-center gap-2 text-slate-300">
                  <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    <strong className="text-white">Registered Details:</strong> {selectedProofImage.notes}
                  </span>
                </div>
              )}

              {/* High Resolution Image Container */}
              <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center p-2 bg-[#070A12] rounded-xl border border-slate-800 my-2">
                <img
                  src={selectedProofImage.url}
                  alt="Proof Full High Res"
                  className="max-h-[65vh] w-auto max-w-full object-contain rounded-lg shadow-lg"
                />
              </div>

              {/* Footer Close */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedProofImage(null)}
                  className="px-5 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-xl text-xs font-black transition-all"
                >
                  Close Viewer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADJUST COINS MODAL */}
      {adjustUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#0E1524] text-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-800">
            <h3 className="font-display font-black text-lg text-white mb-1">
              Adjust Coins for {adjustUser.displayName}
            </h3>
            <p className="text-xs text-slate-400 mb-4">Current Coins: <span className="text-amber-400 font-bold">{adjustUser.coins}</span></p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Coins Amount (Positive to add, Negative to deduct)
                </label>
                <input
                  type="number"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Number(e.target.value))}
                  placeholder="e.g. 500 or -200"
                  className="w-full px-3 py-2 bg-[#070A12] border border-slate-700/80 rounded-xl text-xs font-bold text-amber-400 focus:border-amber-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Reason for Adjustment
                </label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Special Contest Winner"
                  className="w-full px-3 py-2 bg-[#070A12] border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setAdjustUser(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmAdjust}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all active:scale-98"
              >
                {actionLoading ? 'Saving...' : 'Apply Coins'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADJUST REFERRALS MODAL (ADD OR MINUS REFERRALS) */}
      {adjustRefUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#0E1524] text-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                <h3 className="font-display font-black text-lg text-white">
                  Adjust Referrals
                </h3>
              </div>
              <button
                onClick={() => setAdjustRefUser(null)}
                className="text-slate-400 hover:text-white text-sm font-bold p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-1">
              User: <strong className="text-white">{adjustRefUser.displayName || adjustRefUser.email}</strong>
            </p>
            <p className="text-xs text-slate-400 mb-4">
              Current Referrals: <span className="text-purple-300 font-black">{adjustRefUser.referralCount || 0}</span>
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Referral Count Change (Positive = Add, Negative = Minus)
                </label>
                <input
                  type="number"
                  value={adjustRefCount}
                  onChange={(e) => setAdjustRefCount(Number(e.target.value))}
                  placeholder="e.g. 5 or -2"
                  className="w-full px-3 py-2 bg-[#070A12] border border-slate-700/80 rounded-xl text-xs font-bold text-purple-300 focus:border-purple-400 focus:outline-hidden"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setAdjustRefCount(1)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                    adjustRefCount === 1 ? 'bg-purple-500 text-white border-purple-400' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  +1 Ref
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustRefCount(5)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                    adjustRefCount === 5 ? 'bg-purple-500 text-white border-purple-400' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  +5 Refs
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustRefCount(10)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                    adjustRefCount === 10 ? 'bg-purple-500 text-white border-purple-400' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  +10 Refs
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustRefCount(-1)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                    adjustRefCount === -1 ? 'bg-rose-500 text-white border-rose-400' : 'bg-slate-800 text-rose-300 border-rose-900/60 hover:bg-slate-700'
                  }`}
                >
                  -1 Ref (Minus)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustRefCount(-5)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                    adjustRefCount === -5 ? 'bg-rose-500 text-white border-rose-400' : 'bg-slate-800 text-rose-300 border-rose-900/60 hover:bg-slate-700'
                  }`}
                >
                  -5 Refs (Minus)
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Reason for Adjustment
                </label>
                <input
                  type="text"
                  value={adjustRefReason}
                  onChange={(e) => setAdjustRefReason(e.target.value)}
                  placeholder="e.g. Manual referral reward or correction"
                  className="w-full px-3 py-2 bg-[#070A12] border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setAdjustRefUser(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmAdjustReferrals}
                disabled={adjustRefLoading}
                className="flex-1 py-2.5 bg-purple-500 hover:bg-purple-400 text-white font-black rounded-xl text-xs shadow-md transition-all active:scale-98 cursor-pointer"
              >
                {adjustRefLoading ? 'Saving...' : 'Save Referrals'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ZERO ALL COINS MODAL */}
      {showResetCoinsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#0E1524] text-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border-2 border-amber-500/60 relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <GoldCoin size={20} className="text-amber-400" />
                <h3 className="font-display font-black text-lg text-white">
                  Zero All Users Coins
                </h3>
              </div>
              <button
                onClick={() => setShowResetCoinsModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-4 text-xs text-amber-200">
              <p className="font-bold">⚠️ Action: Zero Coins for All Users</p>
              <p className="mt-1 text-[11px] text-slate-300">
                This will deduct/reset coins to <strong>0</strong> for <strong>ALL real users</strong> in the system (Admin coins will remain safe).
              </p>
            </div>

            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              Are you sure you want to refresh and set all users' coin balance to zero?
            </p>

            <div className="flex gap-2.5">
              <button
                onClick={() => setShowResetCoinsModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmResetCoinsOnly}
                disabled={resetAllLoading}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-xl text-xs shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {resetAllLoading ? 'Zeroing Coins...' : 'Yes, Zero All Coins'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK RESET ALL REAL USERS MODAL */}
      {showResetAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#0E1524] text-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border-2 border-rose-500/60 relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-rose-400">
                <RotateCcw className="w-5 h-5" />
                <h3 className="font-display font-black text-lg text-white">
                  Reset All Users Data
                </h3>
              </div>
              <button
                onClick={() => setShowResetAllModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl mb-4 text-xs text-rose-200">
              <p className="font-bold">⚠️ Warning: Bulk Deduct/Reset Action</p>
              <p className="mt-1 text-[11px] text-slate-300">
                This action will deduct/minus all coins and set referral counts to <strong>0</strong> for <strong>ALL real users</strong> in the database!
              </p>
            </div>

            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              Are you sure you want to proceed and minus/zero out all coins and referrals for every user?
            </p>

            <div className="flex gap-2.5">
              <button
                onClick={() => setShowResetAllModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmResetAll}
                disabled={resetAllLoading}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl text-xs shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {resetAllLoading ? 'Resetting All...' : 'Yes, Reset All'}
              </button>
            </div>
          </div>
        </div>
      )}
      <AnimatePresence>
        {reqEditUser && (
          <div key="admin-req-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
            <motion.div
              key="admin-req-modal"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0E1524] text-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-800"
            >
              <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-display font-black text-base text-white">
                    Task Gate Requirements
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    For <strong className="text-slate-200">{reqEditUser.displayName || 'User'}</strong>
                  </p>
                </div>
                <button
                  onClick={() => setReqEditUser(null)}
                  className="text-slate-400 hover:text-white text-sm font-bold p-1 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveTaskRequirement} className="space-y-3.5 text-xs">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">
                    Required Tasks for Withdrawal
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    required
                    value={reqRequiredCount}
                    onChange={(e) => setReqRequiredCount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#070A12] border border-slate-700/80 rounded-xl font-bold text-sm text-white focus:border-amber-400 focus:outline-hidden"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Default is 3. Set to 1 if you assigned 1 task and want user to withdraw. Set 0 to remove requirement.
                  </p>
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">
                    Current Completed Tasks Count
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    required
                    value={reqCompletedCount}
                    onChange={(e) => setReqCompletedCount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#070A12] border border-slate-700/80 rounded-xl font-bold text-sm text-emerald-400 focus:border-emerald-400 focus:outline-hidden"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Number of tasks this user has officially completed.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReqEditUser(null)}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reqLoading}
                    className="flex-1 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all active:scale-98"
                  >
                    {reqLoading ? 'Saving...' : 'Save Requirements'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT USER PROFILE (NAME & PROFILE PICTURE) MODAL */}
      <AnimatePresence>
        {editProfileUser && (
          <div key="admin-profile-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
            <motion.div
              key="admin-profile-modal"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0E1524] text-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-800 my-auto max-h-[92vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center font-black">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-base text-white">
                      Edit User Profile
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono truncate max-w-[220px]">
                      {editProfileUser.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setEditProfileUser(null);
                    setEditProfileMsg(null);
                  }}
                  className="text-slate-400 hover:text-white text-sm font-bold p-1 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Status Message */}
              {editProfileMsg && (
                <div
                  className={`p-3 my-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    editProfileMsg.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {editProfileMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{editProfileMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleSaveUserProfile} className="space-y-4 text-xs mt-4">
                {/* User Name Input */}
                <div>
                  <label className="font-bold text-slate-300 block mb-1.5 flex items-center justify-between">
                    <span>User Display Name *</span>
                    <span className="text-[10px] text-slate-400 font-normal">Shown on Leaderboard & Profile</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={editDisplayName}
                      onChange={(e) => setEditDisplayName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full px-3.5 py-2.5 bg-[#070A12] border border-slate-700/80 rounded-xl font-bold text-white text-xs focus:border-amber-400 focus:outline-hidden transition-all"
                    />
                  </div>
                </div>

                {/* Blue Tick (Verified Badge) Admin Control */}
                <div className="p-3 bg-[#070A12] border border-slate-800 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${editIsVerified ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-800 text-slate-500'}`}>
                      <VerifiedBadge size="sm" showTooltip={false} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                        <span>Blue Tick (Verified Badge)</span>
                        {editIsVerified ? (
                          <span className="text-[10px] text-sky-400 font-extrabold uppercase bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/30">Active</span>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-bold uppercase bg-slate-800/80 px-1.5 py-0.5 rounded">Off</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Admin ke grant karne par hi user ko blue tick milega
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditIsVerified(prev => !prev)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer border shrink-0 ${
                      editIsVerified
                        ? 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border-sky-500/50 shadow-xs'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                  >
                    {editIsVerified ? 'Remove Tick' : 'Grant Blue Tick'}
                  </button>
                </div>

                {/* Profile Picture Section */}
                <div>
                  <label className="font-bold text-slate-300 block mb-1.5">
                    Profile Picture / Avatar
                  </label>

                  {/* Avatar Preview & Quick Actions */}
                  <div className="flex items-center gap-3.5 p-3 bg-[#070A12] rounded-xl border border-slate-800 mb-3">
                    <div className="relative shrink-0">
                      {editPhotoURL ? (
                        <img
                          src={editPhotoURL}
                          alt="Preview"
                          className="w-14 h-14 rounded-xl object-cover border border-slate-700 shadow-md bg-slate-900"
                          referrerPolicy="no-referrer"
                          onError={() => {
                            // fallback
                          }}
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-amber-400/20 text-amber-400 font-black text-xl flex items-center justify-center border border-amber-400/30 shadow-md">
                          {(editDisplayName || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* File Upload Button */}
                        <label className="cursor-pointer px-2.5 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-xl text-[11px] font-black shadow-xs inline-flex items-center gap-1 transition-all active:scale-95">
                          <Upload className="w-3 h-3" />
                          <span>Upload Photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAdminAvatarUpload}
                            className="hidden"
                          />
                        </label>

                        {/* Clear/Reset Avatar */}
                        {editPhotoURL && (
                          <button
                            type="button"
                            onClick={() => setEditPhotoURL('')}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[11px] font-bold transition-colors"
                          >
                            Remove Photo
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Pick a preset below, paste image link, or upload.
                      </p>
                    </div>
                  </div>

                  {/* Quick Preset Avatars */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-400 block">
                      Choose from Curated Presets:
                    </span>
                    <div className="grid grid-cols-6 gap-2 bg-[#070A12] p-2.5 rounded-xl border border-slate-800">
                      {ADMIN_AVATAR_PRESETS.map((preset, pIdx) => {
                        const isSelected = editPhotoURL === preset.url;
                        return (
                          <button
                            key={`preset-${pIdx}`}
                            type="button"
                            onClick={() => setEditPhotoURL(preset.url)}
                            className={`relative group rounded-lg overflow-hidden aspect-square border-2 transition-all active:scale-90 ${
                              isSelected
                                ? 'border-amber-400 ring-2 ring-amber-400/50 shadow-xs scale-105'
                                : 'border-transparent hover:border-slate-600 opacity-80 hover:opacity-100'
                            }`}
                            title={preset.label}
                          >
                            <img
                              src={preset.url}
                              alt={preset.label}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            {isSelected && (
                              <div className="absolute inset-0 bg-amber-400/40 flex items-center justify-center">
                                <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Photo URL Input */}
                  <div className="mt-3">
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">
                      Or Custom Image URL:
                    </label>
                    <input
                      type="url"
                      value={editPhotoURL}
                      onChange={(e) => setEditPhotoURL(e.target.value)}
                      placeholder="https://example.com/avatar.jpg"
                      className="w-full px-3 py-2 bg-[#070A12] border border-slate-700/80 rounded-xl font-mono text-[11px] text-white placeholder-slate-500 focus:border-amber-400 focus:outline-hidden transition-all"
                    />
                  </div>
                </div>

                {/* Submit & Cancel Buttons */}
                <div className="flex gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setEditProfileUser(null);
                      setEditProfileMsg(null);
                    }}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editProfileLoading || !editDisplayName.trim()}
                    className="flex-1 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{editProfileLoading ? 'Saving Profile...' : 'Save Profile Changes'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* USER DETAILED COIN EARNING & TRANSACTION HISTORY MODAL */}
      <AnimatePresence>
        {historyUser && (
          <div key="admin-history-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs overflow-y-auto">
            <motion.div
              key="admin-history-modal"
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-[#0E1524] text-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-800 overflow-hidden my-auto"
            >
              {/* Header */}
              <div className="bg-[#070A12] p-5 sm:p-6 text-white shrink-0 border-b border-slate-800">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-amber-400/20 text-amber-400 font-black text-xl flex items-center justify-center shadow-md border border-amber-400/30 shrink-0">
                      {historyUser.displayName ? historyUser.displayName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display font-black text-lg sm:text-xl text-white truncate">
                          {historyUser.displayName || 'Unnamed User'}
                        </h3>
                        {historyUser.isVerified && <VerifiedBadge size="sm" />}
                        {historyUser.isBanned && (
                          <span className="text-[10px] bg-rose-500/20 text-rose-400 font-black px-2 py-0.5 rounded-full border border-rose-500/30">
                            BANNED
                          </span>
                        )}
                        <span className="text-[10px] bg-slate-800 text-slate-300 font-bold px-2 py-0.5 rounded-full uppercase border border-slate-700">
                          {historyUser.role || 'User'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                        <span className="font-mono text-amber-400/90 select-all font-bold">
                          {historyUser.email}
                        </span>
                        <span>•</span>
                        <span>Ref Code: <strong className="text-amber-300 font-mono">{historyUser.referralCode || 'N/A'}</strong> ({historyUser.referralCount || 0} refs)</span>
                        <span>•</span>
                        <span className="text-slate-500 font-mono text-[11px]">UID: {historyUser.uid.slice(0, 8)}...</span>
                      </div>
                      {/* User IP, Network & Device ID */}
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 font-mono text-cyan-300 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-800">
                          <Globe className="w-3 h-3 text-cyan-400" />
                          <span>IP: <strong className="select-all text-white">{historyUser.lastIp || '127.0.0.1'}</strong></span>
                        </span>
                        <span className="inline-flex items-center gap-1 text-indigo-300 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-800">
                          <Wifi className="w-3 h-3 text-indigo-400" />
                          <span>Net: <strong className="text-white">{historyUser.networkType || '4G/Wi-Fi'}</strong></span>
                        </span>
                        {historyUser.deviceId && (
                          <span className="inline-flex items-center gap-1 font-mono text-amber-300 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-800">
                            <Smartphone className="w-3 h-3 text-amber-400" />
                            <span>Device: <strong className="text-white">{historyUser.deviceId}</strong></span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button
                      onClick={async () => {
                        const newBannedState = !historyUser.isBanned;
                        await toggleUserBan(historyUser.uid, newBannedState);
                        setHistoryUser({ ...historyUser, isBanned: newBannedState });
                        await loadData();
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                        historyUser.isBanned
                          ? 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60'
                          : 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700/60'
                      }`}
                      title={historyUser.isBanned ? 'Unban this user' : 'Ban this user'}
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>{historyUser.isBanned ? 'Unban User' : 'Ban User'}</span>
                    </button>

                    {userTransactions.length > 0 && (
                      <button
                        onClick={() => {
                          setDeleteModal({
                            isOpen: true,
                            type: 'all_transactions',
                            userId: historyUser.uid,
                            itemCount: userTransactions.length,
                            targetTitle: `Clear Coin History: ${historyUser.displayName || historyUser.email}`,
                            targetSubtitle: `Are you sure you want to permanently delete all ${userTransactions.length} transaction log records for this user?`
                          });
                        }}
                        className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                        title="Clear all transaction history for this user"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        <span>Clear History ({userTransactions.length})</span>
                      </button>
                    )}
                    <button
                      onClick={() => openUserHistoryModal(historyUser)}
                      disabled={historyLoading}
                      className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Refresh History"
                    >
                      <RefreshCw className={`w-4 h-4 ${historyLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={() => setHistoryUser(null)}
                      className="p-2 bg-slate-800 hover:bg-rose-500/80 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>

              {/* KPI Summary Cards Grid */}
              <div className="p-4 sm:p-5 bg-[#070A12]/60 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 shrink-0">
                {/* 1. Current Balance */}
                <div className="bg-[#0E1524] p-3 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    <span>Current Wallet</span>
                  </div>
                  <div className="font-display font-black text-base text-amber-400 mt-1">
                    {(historyUser.coins || 0).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold">
                    ≈ ₹{((historyUser.coins || 0) / 100).toFixed(2)}
                  </div>
                </div>

                {/* 2. Lifetime Earned */}
                <div className="bg-[#0E1524] p-3 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Total Earned</span>
                  </div>
                  <div className="font-display font-black text-base text-emerald-400 mt-1">
                    {(historyUser.totalEarned || historyStats.totalCoinsEarned).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold">
                    {userTransactions.length} events
                  </div>
                </div>

                {/* 3. Tasks & Offers */}
                <div className="bg-[#0E1524] p-3 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                    <ListTodo className="w-3.5 h-3.5 text-purple-400" />
                    <span>Tasks/Offers</span>
                  </div>
                  <div className="font-display font-black text-base text-purple-400 mt-1">
                    {historyStats.tasksCoins.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold">
                    {historyStats.tasksCount} completed
                  </div>
                </div>

                {/* 4. Daily & Games */}
                <div className="bg-[#0E1524] p-3 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                    <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                    <span>Daily &amp; Games</span>
                  </div>
                  <div className="font-display font-black text-base text-pink-400 mt-1">
                    {(historyStats.dailyCheckinCoins + historyStats.spinScratchCoins + historyStats.captchaCoins).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold">
                    Spin/Scratch/Captcha
                  </div>
                </div>

                {/* 5. Referrals */}
                <div className="bg-[#0E1524] p-3 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Referrals (3%)</span>
                  </div>
                  <div className="font-display font-black text-base text-indigo-400 mt-1">
                    {(historyStats.referralBonusCoins + historyStats.referralCommissionCoins).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold">
                    {historyStats.referralCommissionCoins > 0 ? `+${historyStats.referralCommissionCoins} comm` : 'Invites'}
                  </div>
                </div>

                {/* 6. Withdrawals */}
                <div className="bg-[#0E1524] p-3 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                    <CreditCard className="w-3.5 h-3.5 text-rose-400" />
                    <span>Withdrawn</span>
                  </div>
                  <div className="font-display font-black text-base text-rose-400 mt-1">
                    {(historyStats.withdrawnCoins || historyUser.totalWithdrawn || 0).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold">
                    {userWithdrawalHistory.length} requests
                  </div>
                </div>
              </div>

              {/* Filters & Search Toolbar */}
              <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0E1524] shrink-0">
                {/* Filter Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs">
                  {[
                    { id: 'all', label: 'All', count: userTransactions.length },
                    { id: 'tasks', label: '🎯 Tasks/Offers', count: historyStats.tasksCount },
                    { id: 'daily_checkin', label: '📅 Daily Streak', count: historyStats.dailyCheckinCount },
                    { id: 'spin_scratch', label: '🎰 Spin/Scratch', count: historyStats.spinScratchCount },
                    { id: 'captcha', label: '🔢 Captcha', count: historyStats.captchaCount },
                    { id: 'referral', label: '👥 Referrals (3%)', count: historyStats.referralTotalCount },
                    { id: 'leaderboard', label: '🏆 Leaderboard', count: historyStats.leaderboardCount },
                    { id: 'admin', label: '🛠️ Admin ±', count: historyStats.adminAdjustmentCount },
                    { id: 'withdrawal', label: '💸 Withdrawals', count: historyStats.withdrawalCount },
                  ].map(tab => (
                    <button
                      key={`hist-tab-${tab.id}`}
                      onClick={() => setHistoryFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                        historyFilter === tab.id
                          ? 'bg-amber-400 text-slate-950 shadow-xs'
                          : 'bg-[#070A12] hover:bg-slate-800 text-slate-400 border border-slate-800'
                      }`}
                    >
                      {tab.label} {tab.count > 0 && <span className="opacity-80">({tab.count})</span>}
                    </button>
                  ))}
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-60 shrink-0">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search in history..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-[#070A12] border border-slate-700/80 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:border-amber-400 focus:outline-hidden transition-all"
                  />
                  {historySearch && (
                    <button
                      onClick={() => setHistorySearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Transactions Feed / List */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5 bg-[#070A12]/40">
                {historyLoading ? (
                  <div className="text-center py-16">
                    <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-xs font-bold text-slate-400">Loading User Coin History &amp; Logs...</p>
                  </div>
                ) : filteredUserTransactions.length === 0 ? (
                  <div className="text-center py-14 bg-[#070A12] rounded-2xl border border-dashed border-slate-800">
                    <Receipt className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-300">No transactions recorded for this filter</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {historySearch ? 'Try clearing your search query' : 'User has not generated earnings in this category yet'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredUserTransactions.map((tx, txIdx) => {
                      const isCredit = tx.type !== 'withdrawal' && tx.amount > 0;
                      const isDebit = tx.type === 'withdrawal' || tx.amount < 0;

                      // Category styles & icon mapping
                      let badgeBg = 'bg-slate-800/80 text-slate-300 border-slate-700';
                      let IconComponent = Coins;
                      let categoryName = 'Transaction';

                      if (tx.type === 'task_reward') {
                        badgeBg = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
                        IconComponent = ListTodo;
                        categoryName = 'Task Offer';
                      } else if (tx.type === 'daily_checkin') {
                        badgeBg = 'bg-amber-400/10 text-amber-400 border-amber-400/20';
                        IconComponent = Calendar;
                        categoryName = 'Daily Streak Check-In';
                      } else if (tx.type === 'spin') {
                        badgeBg = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
                        IconComponent = RotateCcw;
                        categoryName = 'Spin & Win';
                      } else if (tx.type === 'scratch') {
                        badgeBg = 'bg-pink-500/10 text-pink-400 border-pink-500/20';
                        IconComponent = Sparkles;
                        categoryName = 'Scratch Card';
                      } else if (tx.type === 'captcha') {
                        badgeBg = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                        IconComponent = FileCheck;
                        categoryName = 'Captcha Solved';
                      } else if (tx.type === 'referral_bonus' || tx.type === 'referral_signup') {
                        badgeBg = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                        IconComponent = Users;
                        categoryName = 'Referral Invite Bonus';
                      } else if (tx.type === 'referral_commission') {
                        badgeBg = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                        IconComponent = TrendingUp;
                        categoryName = '3% Friend Commission';
                      } else if (tx.type === 'leaderboard_top_reward') {
                        badgeBg = 'bg-amber-400/10 text-amber-400 border-amber-400/20';
                        IconComponent = Award;
                        categoryName = 'Leaderboard Top Reward';
                      } else if (tx.type === 'admin_adjustment') {
                        badgeBg = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
                        IconComponent = SlidersHorizontal;
                        categoryName = 'Admin Adjustment';
                      } else if (tx.type === 'withdrawal') {
                        badgeBg = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                        IconComponent = ArrowUpRight;
                        categoryName = 'Withdrawal Debit';
                      } else if (tx.type === 'withdrawal_refund') {
                        badgeBg = 'bg-teal-500/10 text-teal-400 border-teal-500/20';
                        IconComponent = RefreshCw;
                        categoryName = 'Withdrawal Refund';
                      }

                      return (
                        <div
                          key={tx.id ? `tx-${tx.id}-${txIdx}` : `tx-${txIdx}`}
                          className="bg-[#0E1524] p-3.5 sm:p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between gap-3.5"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${badgeBg}`}>
                              <IconComponent className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${badgeBg}`}>
                                  {categoryName}
                                </span>
                                <span className="text-[11px] text-slate-500 font-medium">
                                  {tx.timestamp ? new Date(tx.timestamp).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: 'numeric',
                                    minute: 'numeric',
                                    hour12: true
                                  }) : 'Recent'}
                                </span>
                              </div>
                              <p className="font-bold text-white text-xs sm:text-sm mt-0.5 truncate">
                                {tx.description || `${categoryName} earning`}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right shrink-0">
                              <div
                                className={`font-display font-black text-sm sm:text-base flex items-center justify-end gap-1 ${
                                  isCredit ? 'text-emerald-400' : isDebit ? 'text-rose-400' : 'text-slate-200'
                                }`}
                              >
                                <span>{isCredit ? `+${tx.amount.toLocaleString()}` : isDebit ? `${tx.amount > 0 ? `-${tx.amount.toLocaleString()}` : tx.amount.toLocaleString()}` : `${tx.amount}`}</span>
                                <span className="text-xs font-bold text-slate-500">Coins</span>
                              </div>
                              <div className="text-[10px] font-bold text-slate-500">
                                {isCredit ? `+₹${(Math.abs(tx.amount) / 100).toFixed(2)}` : `-₹${(Math.abs(tx.amount) / 100).toFixed(2)}`}
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setDeleteModal({
                                  isOpen: true,
                                  type: 'single_transaction',
                                  targetId: tx.id,
                                  targetTitle: `${tx.description || categoryName} (${tx.amount} Coins)`,
                                  targetSubtitle: `Permanently delete this individual transaction record from user history?`
                                });
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Delete this transaction log"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 bg-[#070A12] border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
                <span>
                  Showing <strong className="text-white">{filteredUserTransactions.length}</strong> of <strong className="text-white">{userTransactions.length}</strong> recorded logs
                </span>
                <button
                  onClick={() => setHistoryUser(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-colors"
                >
                  Close History
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Prize Claim Approve/Reject Action Modal */}
      <AnimatePresence>
        {selectedPrizeClaim && claimActionType && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0E1524] border border-slate-800 rounded-3xl p-5 sm:p-6 max-w-md w-full text-slate-100 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  {claimActionType === 'approve' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-400" />
                  )}
                  <h3 className="font-display font-black text-lg text-white">
                    {claimActionType === 'approve' ? 'Approve Prize Claim' : 'Reject Prize Claim'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPrizeClaim(null);
                    setClaimActionType(null);
                  }}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 space-y-2 text-xs">
                <div>
                  <span className="text-slate-400">Prize:</span>{' '}
                  <strong className="text-amber-400">{selectedPrizeClaim.prizeTitle}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Winner:</span>{' '}
                  <strong className="text-white">{selectedPrizeClaim.userName}</strong> ({selectedPrizeClaim.userPhone})
                </div>
                <div>
                  <span className="text-slate-400">Address:</span>{' '}
                  <span className="text-slate-200">
                    {selectedPrizeClaim.shippingAddress}, {selectedPrizeClaim.city}, {selectedPrizeClaim.state} ({selectedPrizeClaim.pincode})
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Admin Note (Visible to User):
                </label>
                <textarea
                  rows={3}
                  value={claimAdminNote}
                  onChange={(e) => setClaimAdminNote(e.target.value)}
                  placeholder="Enter dispatch tracking number or note for user..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/50"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPrizeClaim(null);
                    setClaimActionType(null);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={claimActionLoading}
                  onClick={claimActionType === 'approve' ? handleApprovePrizeClaim : handleRejectPrizeClaim}
                  className={`px-5 py-2 rounded-xl text-slate-950 font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                    claimActionType === 'approve'
                      ? 'bg-emerald-400 hover:bg-emerald-500'
                      : 'bg-rose-500 text-white hover:bg-rose-600'
                  }`}
                >
                  {claimActionLoading ? (
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : claimActionType === 'approve' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm Approval</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      <span>Confirm Rejection</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GLOBAL PERMANENT DELETION CONFIRMATION MODAL */}
      <AnimatePresence>
        {deleteModal && deleteModal.isOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0E1524] border border-rose-500/40 rounded-3xl p-5 sm:p-6 max-w-md w-full text-slate-100 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-base text-white">
                      Confirm Permanent Deletion
                    </h3>
                    <p className="text-[11px] text-rose-300 font-bold">
                      Irreversible History Cleanup
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !isDeleting && setDeleteModal(null)}
                  disabled={isDeleting}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Warning: This history record will be erased permanently!</span>
                </div>
                {deleteModal.targetTitle && (
                  <p className="text-white font-black text-sm break-words">
                    {deleteModal.targetTitle}
                  </p>
                )}
                {deleteModal.targetSubtitle && (
                  <p className="text-slate-300 text-xs leading-relaxed">
                    {deleteModal.targetSubtitle}
                  </p>
                )}
                {deleteModal.itemCount !== undefined && deleteModal.itemCount > 0 && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-amber-300 text-xs font-mono font-bold">
                    <span>Records to delete:</span>
                    <strong className="text-white">{deleteModal.itemCount}</strong>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDeleteModal(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={executeDelete}
                  className="px-5 py-2 rounded-xl text-white font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md bg-rose-600 hover:bg-rose-500 active:scale-95 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Deleting from database...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Permanently Delete</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Deletion Toast Notification */}
      <AnimatePresence>
        {deleteSuccessMsg && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-slate-950 font-black px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-emerald-300 text-xs"
          >
            <CheckCircle2 className="w-4 h-4 text-slate-950" />
            <span>{deleteSuccessMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
