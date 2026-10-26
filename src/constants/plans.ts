import { InvestmentPlan, Mission } from '../types';

export const INVESTMENT_PLANS: InvestmentPlan[] = [
  {
    id: 'house-150',
    name: 'House 150',
    cost: 150,
    dailyReturn: 50,
    totalDays: 14,
    totalReturn: 700,
    tagline: 'Entry-level suburban rental home with rapid 14-day payback',
    color: 'emerald',
    imageUrl: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'big-house-300',
    name: 'Big House 300',
    cost: 300,
    dailyReturn: 105,
    totalDays: 14,
    totalReturn: 1470,
    tagline: 'Spacious residential duplex providing steady daily dividend yields',
    color: 'blue',
    imageUrl: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'condo-600',
    name: 'Condo 600',
    cost: 600,
    dailyReturn: 215,
    totalDays: 14,
    totalReturn: 3010,
    tagline: 'High-rise luxury metropolitan condominium with prime occupancy',
    color: 'indigo',
    imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'mansion-1200',
    name: 'Mansion 1200',
    cost: 1200,
    dailyReturn: 435,
    totalDays: 14,
    totalReturn: 6090,
    tagline: 'Ultra-exclusive private estate with premier rental returns',
    color: 'purple',
    imageUrl: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'island-2400',
    name: 'Island 2400',
    cost: 2400,
    dailyReturn: 880,
    totalDays: 14,
    totalReturn: 12320,
    tagline: 'Private resort tropical island paradise for elite high-yield investors',
    color: 'amber',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
  },
];

export const MISSIONS: Mission[] = [
  {
    id: 'mission-1',
    title: 'Mission 1: Bronze Builder',
    requiredInvites: 5,
    reward: 50,
    description: 'Invite 5 friends and have them purchase their first investment plan.',
  },
  {
    id: 'mission-2',
    title: 'Mission 2: Silver Syndicate',
    requiredInvites: 10,
    reward: 110,
    description: 'Invite 10 friends and have them purchase their first investment plan.',
  },
  {
    id: 'mission-3',
    title: 'Mission 3: Golden Tycoon',
    requiredInvites: 15,
    reward: 230,
    description: 'Invite 15 friends and have them purchase their first investment plan.',
  },
];

export const COMMISSION_RATES = {
  LEVEL_1: 0.30, // 30%
  LEVEL_2: 0.03, // 3%
  LEVEL_3: 0.02, // 2%
};
