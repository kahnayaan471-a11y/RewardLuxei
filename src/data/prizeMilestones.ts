export interface PrizeMilestone {
  id: string;
  name: string;
  referralsRequired: number;
  rewardValue: string;
  type: 'cash_50' | 'cash_100' | 'tshirt' | 'airbuds' | 'gaming_chair' | 'smartwatch' | 'laptop' | 'iphone';
  isPhysical: boolean;
}

export const PRIZE_MILESTONES: PrizeMilestone[] = [
  {
    id: 'cash_50',
    name: '₹50 Real Cash',
    referralsRequired: 100,
    rewardValue: '₹50 Instant UPI / Wallet',
    type: 'cash_50',
    isPhysical: false
  },
  {
    id: 'cash_100',
    name: '₹100 Real Cash',
    referralsRequired: 200,
    rewardValue: '₹100 Instant UPI / Wallet',
    type: 'cash_100',
    isPhysical: false
  },
  {
    id: 'tshirt',
    name: 'Official Branded T-Shirt',
    referralsRequired: 300,
    rewardValue: 'Free Doorstep Courier',
    type: 'tshirt',
    isPhysical: true
  },
  {
    id: 'airbuds',
    name: 'Wireless AirBuds Pro',
    referralsRequired: 500,
    rewardValue: 'Free Doorstep Courier',
    type: 'airbuds',
    isPhysical: true
  },
  {
    id: 'gaming_chair',
    name: 'Ergonomic Gaming Chair',
    referralsRequired: 10000,
    rewardValue: 'Free Doorstep Courier',
    type: 'gaming_chair',
    isPhysical: true
  },
  {
    id: 'smartwatch',
    name: 'Apple Smart Watch',
    referralsRequired: 20000,
    rewardValue: 'Free Doorstep Courier',
    type: 'smartwatch',
    isPhysical: true
  },
  {
    id: 'laptop',
    name: 'Premium Gaming Laptop',
    referralsRequired: 30000,
    rewardValue: 'Free Doorstep Courier',
    type: 'laptop',
    isPhysical: true
  },
  {
    id: 'iphone',
    name: 'Apple iPhone 16 Pro',
    referralsRequired: 40000,
    rewardValue: 'Mega Draw / Doorstep Courier',
    type: 'iphone',
    isPhysical: true
  }
];
