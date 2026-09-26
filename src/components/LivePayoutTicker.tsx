import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, IndianRupee, Sparkles } from 'lucide-react';
import {
  subscribeToRecentApprovedWithdrawals,
  LivePayoutFeedItem
} from '../services/coinService';
import { ALL_DEMO_USERS } from '../data/demoUsers';

// Extensive pool of 80+ realistic, diverse Indian player names
const RANDOM_NAMES = [
  'Rahul Verma', 'Aman Sharma', 'Priya Patel', 'Rohit S.', 'Vicky Rajput',
  'Sneha Joshi', 'Ankit Tiwari', 'Neha Singh', 'Deepak K.', 'Pooja Mehra',
  'Manish Yadav', 'Ritu Choudhary', 'Arjun Thakur', 'Sachin G.', 'Divya Nair',
  'Karan Mehta', 'Shreya Das', 'Ravi Gupta', 'Harsh Vardhan', 'Gaurav Mishra',
  'Kunal Sen', 'Payal Roy', 'Akash Mishra', 'Varun Joshi', 'Mohit Malhotra',
  'Sameer Khan', 'Sandeep Rao', 'Rajat Bhatia', 'Nitin Sharma', 'Swati Dubey',
  'Vishal Pandey', 'Tanvi Agarwal', 'Devendra S.', 'Jyoti Rawat', 'Mayank S.',
  'Sonu Kumar', 'Saurabh Tiwari', 'Simran Kaur', 'Ayush Jain', 'Rajesh K.',
  'Preeti Meena', 'Shubham Patil', 'Hemant Solanki', 'Tarun Nair', 'Bikash Das',
  'Alok Nath', 'Kavita Soni', 'Chandan Kumar', 'Deepika Pillai', 'Abhishek Jha',
  'Manish Chauhan', 'Arjun Deshmukh', 'Divya N.', 'Harsh R.', 'Gaurav Saxena',
  'Sunita Maurya', 'Sumit Grover', 'Pankaj Tripathy', 'Karanveer B.', 'Ritu Goswami',
  'Manoj Bajpai', 'Bhavna Bhatt', 'Adarsh Shukla', 'Komal Baghel', 'Dinesh Jangid',
  'Kriti Kaushik', 'Yogeshwar D.', 'Naveen Reddy', 'Aarti Rathore', 'Farhan Ali',
  'Nisha Agarwal', 'Girish K.', 'Pallavi Sen', 'Vivek Dubey', 'Pradeep Rawat',
  'Monika S.', 'Suraj Pal', 'Meenakshi N.', 'Lokesh Sharma', 'Ananya Roy',
  'Amitabh K.', 'Babulal M.', 'Ishaan V.', 'Zoya Khan', 'Rohan Mathur'
];

const AMOUNTS = [10, 20, 25, 30, 50, 50, 75, 100, 100, 150, 200, 500];
const METHODS: Array<'upi' | 'google_play' | 'bank_transfer'> = [
  'upi', 'upi', 'upi', 'google_play', 'google_play', 'bank_transfer'
];

const AVATAR_BG_GRADIENTS = [
  'from-amber-500 to-orange-600',
  'from-emerald-500 to-teal-600',
  'from-blue-500 to-indigo-600',
  'from-purple-500 to-pink-600',
  'from-rose-500 to-red-600',
  'from-cyan-500 to-blue-600'
];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface DisplayPayoutItem {
  id: string;
  userName: string;
  photoURL?: string;
  inrAmount: number;
  method: 'upi' | 'google_play' | 'bank_transfer';
  timeLabel: string;
  avatarBg: string;
}

export const LivePayoutTicker: React.FC = () => {
  const [realPayouts, setRealPayouts] = useState<LivePayoutFeedItem[]>([]);
  const [currentItem, setCurrentItem] = useState<DisplayPayoutItem | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Keep track of recent names to avoid repeating the same name
  const recentNamesRef = useRef<string[]>([]);

  // Helper to generate a fresh randomized payout item with a unique name and DP
  const getNextPayoutItem = (): DisplayPayoutItem => {
    // 50% chance to pick from ALL_DEMO_USERS who have profile pictures!
    const pickFromDemoUsers = Math.random() < 0.75 && ALL_DEMO_USERS.length > 0;
    
    let selectedName: string;
    let selectedPhoto: string | undefined;

    if (pickFromDemoUsers) {
      const availableDemo = ALL_DEMO_USERS.filter(
        (du) => !recentNamesRef.current.includes(du.displayName)
      );
      const demoPool = availableDemo.length > 0 ? availableDemo : ALL_DEMO_USERS;
      const chosen = getRandomElement(demoPool);
      selectedName = chosen.displayName;
      selectedPhoto = chosen.photoURL;
    } else {
      const availableNames = RANDOM_NAMES.filter(
        (name) => !recentNamesRef.current.includes(name)
      );
      const pool = availableNames.length > 0 ? availableNames : RANDOM_NAMES;
      selectedName = getRandomElement(pool);
    }

    // Update recent names buffer (up to 25 names kept)
    recentNamesRef.current = [...recentNamesRef.current.slice(-24), selectedName];

    // Check if there are real approved withdrawals to borrow amount/method from
    let amount = getRandomElement(AMOUNTS);
    let method = getRandomElement(METHODS);

    if (realPayouts.length > 0) {
      const realItem = getRandomElement<LivePayoutFeedItem>(realPayouts);
      if (realItem.inrAmount) amount = realItem.inrAmount;
      if (realItem.method) method = realItem.method;
    }

    const timeOptions = ['abhi', 'abhi', '1m pehle', '2m pehle', 'just now'];
    const timeLabel = getRandomElement(timeOptions);
    const avatarBg = getRandomElement(AVATAR_BG_GRADIENTS);

    return {
      id: `payout_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userName: selectedName,
      photoURL: selectedPhoto,
      inrAmount: amount,
      method,
      timeLabel,
      avatarBg
    };
  };

  // Subscribe to real-time approved withdrawals
  useEffect(() => {
    const unsubscribe = subscribeToRecentApprovedWithdrawals((livePayouts) => {
      if (livePayouts && livePayouts.length > 0) {
        setRealPayouts(livePayouts);
      } else {
        setRealPayouts([]);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Initial trigger after 1.5s
  useEffect(() => {
    const initialTimer = setTimeout(() => {
      setCurrentItem(getNextPayoutItem());
      setIsVisible(true);
    }, 1500);

    return () => clearTimeout(initialTimer);
  }, []);

  // Show -> Hide -> Pick Next Random Name -> Show cycle
  useEffect(() => {
    if (isDismissed) return;

    let timer: NodeJS.Timeout;
    if (isVisible) {
      // Stay visible for 4 seconds
      timer = setTimeout(() => {
        setIsVisible(false);
      }, 4000);
    } else {
      // Stay hidden for 2.8 seconds, then pick a NEW random name and show
      timer = setTimeout(() => {
        setCurrentItem(getNextPayoutItem());
        setIsVisible(true);
      }, 2800);
    }

    return () => clearTimeout(timer);
  }, [isVisible, isDismissed]);

  if (isDismissed || !currentItem) {
    return null;
  }

  const getMethodBadge = (method: 'upi' | 'google_play' | 'bank_transfer') => {
    switch (method) {
      case 'google_play':
        return 'Play Code';
      case 'bank_transfer':
        return 'Bank';
      case 'upi':
      default:
        return 'UPI';
    }
  };

  const initialLetter = currentItem.userName.charAt(0).toUpperCase();

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none px-3 w-full max-w-sm sm:max-w-md flex justify-center">
      <AnimatePresence mode="wait">
        {isVisible && currentItem && (
          <motion.div
            key={currentItem.id}
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="pointer-events-auto bg-slate-900 text-white pl-2 pr-3 py-1.5 rounded-full shadow-xl border border-emerald-500/40 flex items-center gap-2 max-w-full text-xs font-medium tracking-wide transform-gpu"
          >
            {/* User Avatar Circle with Image or Gradient */}
            {currentItem.photoURL ? (
              <img
                src={currentItem.photoURL}
                alt={currentItem.userName}
                className="w-6 h-6 rounded-full object-cover border border-emerald-400/60 shadow shrink-0"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(currentItem.userName || 'player')}`;
                }}
              />
            ) : (
              <div className={`w-6 h-6 rounded-full bg-gradient-to-tr ${currentItem.avatarBg} flex items-center justify-center font-black text-[11px] text-white shadow-inner shrink-0`}>
                {initialLetter}
              </div>
            )}

            {/* Pulsing Green Live Dot */}
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>

            {/* Payout Details with Random Player Name */}
            <div className="flex items-center gap-1.5 truncate text-[11px] sm:text-xs">
              <span className="font-extrabold text-amber-300 truncate max-w-[110px] sm:max-w-[130px]">
                {currentItem.userName}
              </span>
              <span className="text-slate-300 text-[10px] sm:text-[11px]">ne</span>
              <span className="font-black text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-1.5 py-0.5 rounded-md inline-flex items-center gap-0.5 shrink-0 text-[11px]">
                <IndianRupee className="w-3 h-3 stroke-[3]" />
                {currentItem.inrAmount} {getMethodBadge(currentItem.method)}
              </span>
              <span className="text-slate-300 text-[10px] sm:text-[11px]">withdraw kiya</span>
            </div>

            {/* Verified Icon & Time Badge */}
            <div className="flex items-center gap-1 shrink-0 ml-auto">
              <span className="text-[9px] font-semibold text-slate-400 hidden sm:inline">
                {currentItem.timeLabel}
              </span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5] shrink-0" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
