export type Role = 'admin' | 'user';

export type WithdrawalMethod = 'upi' | 'google_play' | 'bank_transfer';

export type WithdrawalStatus = 'pending' | 'approved' | 'rejected';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  coins: number;
  totalEarned: number;
  totalWithdrawn: number;
  referralCode: string;
  referredBy?: string | null;
  referralCount: number;
  claimedReferralCoins?: number; // Total referral signup coins claimed so far
  role: Role;
  isBanned?: boolean;
  isVerified?: boolean;
  completedTasksCount?: number; // Count of approved/completed tasks
  tasksUsedForWithdrawal?: number; // Total completed tasks consumed by past withdrawals
  requiredTasksForWithdrawal?: number; // Custom required tasks override if set by admin
  dailyStreak: number;
  lastCheckInDate?: string | null; // YYYY-MM-DD
  spinsLeftToday: number;
  lastSpinDate?: string | null; // YYYY-MM-DD
  scratchesLeftToday: number;
  lastScratchDate?: string | null; // YYYY-MM-DD
  captchasLeftToday: number;
  lastCaptchaDate?: string | null; // YYYY-MM-DD
  lastLoginDate?: string | null; // YYYY-MM-DD
  lastLoginAt?: number;
  lastIp?: string; // Client public IP address for multi-account detection
  networkType?: string; // Network / Connection type (e.g. 4g, wifi)
  deviceId?: string; // Unique persistent hardware device ID
  ipHistory?: string[]; // History of IPs used by this user
  createdAt: number;
  updatedAt?: number;
}

export interface WithdrawalDetails {
  upiId?: string;
  playEmail?: string;
  bankAccount?: string;
  ifsc?: string;
  accountHolder?: string;
  bankName?: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  method: WithdrawalMethod;
  details: WithdrawalDetails;
  coins: number;
  inrAmount: number;
  status: WithdrawalStatus;
  tasksConsumed?: number; // Number of completed tasks consumed for this withdrawal request
  adminNotes?: string;
  transactionId?: string;
  redeemCode?: string;
  ipAddress?: string; // IP address at time of withdrawal
  networkType?: string; // Network type at time of withdrawal
  deviceId?: string; // Unique device identifier at time of withdrawal
  createdAt: number;
  updatedAt?: number;
}

export type TransactionType =
  | 'daily_checkin'
  | 'spin'
  | 'scratch'
  | 'captcha'
  | 'task_reward'
  | 'referral_bonus'
  | 'referral_signup'
  | 'referral_commission'
  | 'withdrawal'
  | 'withdrawal_refund'
  | 'admin_adjustment'
  | 'leaderboard_top_reward'
  | 'promo_code'
  | 'refer_prize_pool'
  | 'giveaway_entry'
  | 'tournament_entry'
  | 'tournament_prize'
  | 'tournament_refund';

export interface FeatureToggles {
  showGiveaway: boolean;
  showTournaments: boolean;
  updatedAt?: number;
}

export interface GiveawayConfig {
  id: string;
  title: string;
  description: string;
  prizeImageUrl: string;
  targetAudience: 'all' | 'verified_only'; // 'all' = Normal + Verified, 'verified_only' = Verified Users Only
  entryFeeCoins: number; // 0 = Free Entry, or required coin fee
  active: boolean;
  participantsCount: number;
  winnerName?: string;
  winnerUid?: string;
  winnerEmail?: string;
  winnerPhoto?: string;
  winnerDeclaredAt?: number;
  winnerPrize?: string;
  endDate?: number; // 7-Day or custom countdown end timestamp
  createdAt: number;
  updatedAt?: number;
}

export interface GiveawayEntry {
  id: string;
  giveawayId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhoto?: string;
  isVerified: boolean;
  entryFeeCoins: number;
  enteredAt: number;
}

export interface PromoCode {
  id: string;
  code: string; // e.g. "WELCOME100"
  rewardCoins: number; // e.g. 100
  description?: string;
  maxUses?: number | null; // maximum global claims or null for unlimited
  usedCount: number;
  perUserLimit?: number; // default 1 claim per user
  expiresAt?: number | null; // expiry timestamp
  active: boolean;
  isFeatured?: boolean; // Show in public promo codes list
  createdAt: number;
  updatedAt?: number;
}

export interface PromoCodeRedemption {
  id: string;
  promoCodeId: string;
  code: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  rewardCoins: number;
  redeemedAt: number;
}

export interface LeaderboardRewardState {
  currentTopUid: string;
  currentTopName: string;
  currentTopScore: number;
  topSince: number; // timestamp when user held #1 rank
  lastRewardGivenAt: number; // timestamp of last 24h reward payout
  totalRewardsAwardedCount?: number;
  lastPayoutAmount?: number;
}

export type TaskType = 'instant' | 'minute' | 'day' | 'install' | 'follow' | 'level' | 'other';

export interface TaskMilestone {
  id?: string;
  title: string; // e.g. "Reach 10 Level" or "Day 1: Open App"
  coins: number; // e.g. 22
  isCompleted?: boolean;
}

export interface AppTask {
  id: string;
  title: string;
  description?: string;
  type: TaskType;
  coins: number;
  logoUrl?: string;
  logoBg?: string;
  logoText?: string;
  tags: string[]; // e.g. ['Install', 'Order a Product']
  actionUrl: string;
  active: boolean;
  order?: number;
  instructions?: string;
  durationMinutes?: number;
  targetLevel?: number;
  daysCount?: number;
  milestones?: TaskMilestone[];
  createdAt: number;
}

export type UserTaskStatus = 'not_started' | 'started' | 'pending_approval' | 'approved' | 'rejected' | 'completed';

export interface UserTaskProgress {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  taskId: string;
  taskTitle?: string;
  taskCoins?: number;
  taskType?: TaskType;
  status: UserTaskStatus;
  currentStepIndex?: number;
  currentStepTitle?: string;
  currentStepCoins?: number;
  completedStepCount?: number;
  totalSteps?: number;
  stepProofs?: Array<{
    stepIndex: number;
    title: string;
    coins: number;
    status: 'pending' | 'approved' | 'rejected';
    proofText?: string;
    proofScreenshot?: string;
    submittedAt?: number;
    approvedAt?: number;
  }>;
  startedAt: number;
  submittedAt?: number;
  completedAt?: number;
  proofText?: string;
  proofScreenshot?: string;
  adminNote?: string;
  reviewedAt?: number;
}

export interface CoinTransaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number; // positive or negative
  description: string;
  timestamp: number;
}

export interface AppSettings {
  coinsPerInr: number; // e.g. 100 coins = 1 INR
  minWithdrawInr: number; // e.g. 10 INR
  referralBonusReferrer: number; // 100 coins to referrer
  referralBonusReferee: number; // 100 coins to joiner
  referralCommissionPercent: number; // 3% lifetime earnings commission
  dailySpinLimit: number; // e.g. 10
  dailyScratchLimit: number; // e.g. 10
  dailyCaptchaLimit: number; // e.g. 20
  requiredTasksForWithdrawal?: number; // e.g. 3 tasks by default
}

export interface ReferralFriendItem {
  uid: string;
  displayName: string;
  photoURL?: string;
  joinedAt: number;
  coinsGenerated: number; // Direct signup reward + 3% commissions earned from this friend
  signupBonus: number; // 100 coins
  commissionEarned: number; // 3% commissions
  friendTotalEarned?: number;
  isVerified?: boolean;
}

export interface UserReferralHistoryData {
  totalInvited: number;
  totalEarnings: number;
  signupBonusTotal: number;
  commissionBonusTotal: number;
  friends: ReferralFriendItem[];
}

export type SupportSender = 'user' | 'bot' | 'admin';

export interface SupportMessage {
  id: string;
  conversationId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userPhoto?: string;
  sender: SupportSender;
  text: string;
  photoURL?: string;
  timestamp: number;
  read?: boolean;
}

export interface SupportConversation {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  userPhoto?: string;
  userCoins?: number;
  lastMessage: string;
  lastMessageAt: number;
  lastSender: SupportSender;
  hasPhoto?: boolean;
  unreadByAdmin: number;
  unreadByUser: number;
  status: 'open' | 'resolved' | 'pending_admin';
  createdAt: number;
  updatedAt: number;
}

export interface PhysicalPrizeClaim {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  prizeType: 'tshirt' | 'airbuds' | 'smartwatch' | 'gaming_chair' | 'laptop' | 'iphone' | 'cash_100' | 'cash_50';
  prizeTitle: string;
  tshirtSize?: 'S' | 'M' | 'L' | 'XL' | 'XXL';
  shippingAddress: string;
  city: string;
  state: string;
  pincode: string;
  status: 'pending' | 'approved' | 'rejected' | 'submitted' | 'processing' | 'shipped' | 'delivered';
  adminNotes?: string;
  claimedAt: number;
  updatedAt?: number;
}

export type TournamentStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
export type TournamentFormat = 'solo' | 'duo' | 'squad' | 'clash_squad';
export type TournamentMap = 'Bermuda' | 'Purgatory' | 'Kalahari' | 'Alpine' | 'Nexterra' | 'Random';

export interface FreeFireTournament {
  id: string;
  title: string;
  description?: string;
  gameMode: TournamentFormat;
  mapName: string;
  entryFeeCoins: number; // Selected by admin (0 for Free, 10, 20, 50, 100, 200 Coins)
  prizePoolCoins: number; // Only 1st Prize Coins
  firstPrizeCoins?: number; // Only 1st Prize / Winner prize
  perKillCoins?: number; // Removed - no per kill system
  secondPrizeCoins?: number; // Removed - only 1st prize
  thirdPrizeCoins?: number; // Removed - only 1st prize
  maxSlots: number;
  joinedSlots: number;
  matchDateTime: string; // e.g. "22 Sep 2026, 08:30 PM"
  matchTimestamp: number;
  roomId?: string; // Admin provides Custom Room ID
  roomPassword?: string; // Admin provides Custom Room Password
  roomCredentialsReleased?: boolean; // When admin makes room ID & password visible
  status: TournamentStatus;
  rules?: string;
  winnerAnnouncement?: string;
  winnerName?: string;
  winnerFreeFireName?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface TournamentParticipant {
  id: string;
  tournamentId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhoto?: string;
  freeFireName: string; // Free Fire MAX in-game name (IGN - Mandatory)
  freeFireUid?: string; // Free Fire Player UID
  entryFeePaid: number;
  slotNumber: number;
  joinedAt: number;
  status: 'registered' | 'confirmed';
  prizeWonCoins?: number;
  killsCount?: number;
}


