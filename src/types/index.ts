import { Timestamp } from 'firebase/firestore';

export interface User {
  id: string; // Document ID (UID)
  mobileNumber: string;
  password?: string;
  balance: number;
  referralCode: string;
  referredBy: string | null;
  withdrawalMethod?: 'GCash' | 'Maya' | null;
  accountName?: string | null;
  accountNumber?: string | null;
  claimedMissions?: string[];
  createdAt: any;
}

export interface InvestmentPlan {
  id: string;
  name: string;
  cost: number;
  dailyReturn: number;
  totalDays: number;
  totalReturn: number;
  tagline: string;
  color: string;
  imageUrl: string;
}

export interface UserInvestment {
  id: string;
  userId: string;
  planName: string;
  cost: number;
  dailyReturn: number;
  daysRemaining: number;
  daysCollectedCount: number;
  lastCollectedAt: any;
  createdAt: any;
}

export interface Deposit {
  id: string;
  userId: string;
  userMobile?: string;
  amount: number;
  proofImageUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
}

export interface Withdrawal {
  id: string;
  userId: string;
  userMobile?: string;
  amount: number;
  withdrawalMethod?: 'GCash' | 'Maya' | string | null;
  accountName?: string | null;
  accountNumber?: string | null;
  accountDetails?: string;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  createdAt: any;
}

export interface Coupon {
  code: string;
  amount: number;
  isUsed: boolean;
  usedBy: string | null;
  usedAt: any | null;
  createdAt: any;
}

export interface AppSettings {
  activeDepositQrUrl: string;
  communityChatLink: string;
  communityQrUrl: string;
  updatedAt?: any;
}

export interface Commission {
  id: string;
  uplineUserId: string;
  fromUserId: string;
  fromUserMobile?: string;
  level: number;
  percentage: number;
  amount: number;
  planName: string;
  createdAt: any;
}

export interface Mission {
  id: string;
  title: string;
  requiredInvites: number;
  reward: number;
  description: string;
}
