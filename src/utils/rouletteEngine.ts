import { RouletteOutcomeName, RouletteTierConfig } from '../types';

export const MIN_BET = 50;
export const MAX_BET = 300;

export const ROULETTE_TIERS: RouletteTierConfig[] = [
  {
    name: 'Mega Jackpot',
    chance: 0.005, // 0.5%
    multiplier: 10,
    color: '#f59e0b',
    bgClass: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
    badgeClass: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black',
  },
  {
    name: 'Big Win',
    chance: 0.015, // 1.5%
    multiplier: 4,
    color: '#a855f7',
    bgClass: 'bg-purple-500/20 text-purple-300 border-purple-500/50',
    badgeClass: 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold',
  },
  {
    name: 'Win',
    chance: 0.050, // 5.0%
    multiplier: 2,
    color: '#3b82f6',
    bgClass: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
    badgeClass: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold',
  },
  {
    name: 'Small Win',
    chance: 0.270, // 27.0%
    multiplier: 1.5,
    color: '#10b981',
    bgClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
    badgeClass: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold',
  },
  {
    name: 'Lose',
    chance: 0.660, // 66.0%
    multiplier: 0,
    color: '#475569',
    bgClass: 'bg-slate-800 text-slate-400 border-slate-700',
    badgeClass: 'bg-slate-800 text-slate-400 font-semibold',
  },
];

/**
 * Validate bet against table limits (50 to 300) and available wallet balance
 */
export function validateBet(bet: number, userBalance: number): { valid: boolean; error?: string } {
  if (isNaN(bet) || !Number.isFinite(bet)) {
    return { valid: false, error: 'Please enter a valid numeric bet amount.' };
  }
  if (bet < MIN_BET) {
    return { valid: false, error: `Minimum bet is ₱${MIN_BET}.` };
  }
  if (bet > MAX_BET) {
    return { valid: false, error: `Maximum table limit is ₱${MAX_BET}.` };
  }
  if (bet > userBalance) {
    return {
      valid: false,
      error: `Insufficient wallet balance. You have ₱${userBalance.toFixed(2)}, cannot bet ₱${bet}.`,
    };
  }
  return { valid: true };
}

/**
 * Decoupled probability engine for picking an outcome strictly based on configured odds.
 */
export function generateSpinOutcome(): RouletteTierConfig {
  const rand = Math.random(); // 0 <= rand < 1
  let cumulative = 0;

  for (const tier of ROULETTE_TIERS) {
    cumulative += tier.chance;
    if (rand < cumulative) {
      return tier;
    }
  }

  // Fallback to the last tier (Lose)
  return ROULETTE_TIERS[ROULETTE_TIERS.length - 1];
}

/**
 * Exact payout and profit calculations
 */
export function calculateSpinMetrics(betAmount: number, tier: RouletteTierConfig) {
  const payout = Number((betAmount * tier.multiplier).toFixed(2));
  const playerProfit = Number((payout - betAmount).toFixed(2));
  const houseProfit = Number((betAmount - payout).toFixed(2));

  return {
    betAmount,
    outcome: tier.name,
    multiplier: tier.multiplier,
    payout,
    playerProfit,
    houseProfit,
  };
}

/**
 * Simulation Engine:
 * Runs automated spin simulations (default 1,000 spins at 50 bet).
 * Computes outcome distribution counts, cumulative house profit, and average house profit per spin.
 */
export interface SimulationResult {
  spins: number;
  bet: number;
  totalWagered: number;
  totalPayout: number;
  cumulativeHouseProfit: number;
  averageHouseProfitPerSpin: number;
  rtpPercentage: number;
  distribution: {
    name: RouletteOutcomeName;
    count: number;
    percentage: number;
    multiplier: number;
  }[];
}

export function simulate(spins = 1000, bet = 50): SimulationResult {
  const counts: Record<RouletteOutcomeName, number> = {
    'Mega Jackpot': 0,
    'Big Win': 0,
    'Win': 0,
    'Small Win': 0,
    'Lose': 0,
  };

  let totalWagered = 0;
  let totalPayout = 0;

  for (let i = 0; i < spins; i++) {
    const outcome = generateSpinOutcome();
    counts[outcome.name]++;
    totalWagered += bet;
    totalPayout += bet * outcome.multiplier;
  }

  const cumulativeHouseProfit = totalWagered - totalPayout;
  const averageHouseProfitPerSpin = spins > 0 ? cumulativeHouseProfit / spins : 0;
  const rtpPercentage = totalWagered > 0 ? (totalPayout / totalWagered) * 100 : 0;

  const distribution = ROULETTE_TIERS.map((tier) => ({
    name: tier.name,
    count: counts[tier.name],
    percentage: Number(((counts[tier.name] / spins) * 100).toFixed(2)),
    multiplier: tier.multiplier,
  }));

  return {
    spins,
    bet,
    totalWagered,
    totalPayout,
    cumulativeHouseProfit: Number(cumulativeHouseProfit.toFixed(2)),
    averageHouseProfitPerSpin: Number(averageHouseProfitPerSpin.toFixed(2)),
    rtpPercentage: Number(rtpPercentage.toFixed(2)),
    distribution,
  };
}

/**
 * Martingale Test Mode:
 * Simulates automated betting where stake doubles after every loss (capped at 300 maximum table limit)
 * and resets to 50 upon any winning outcome (multiplier > 0).
 */
export interface MartingaleResult {
  totalPlayers: number;
  initialBankroll: number;
  roundsPerPlayer: number;
  brokeCount: number;
  brokePercentage: number;
  survivedCount: number;
  totalHouseProfit: number;
  averageHouseProfitPerPlayer: number;
  maxConsecutiveLosses: number;
}

export function simulateMartingale(options?: {
  totalPlayers?: number;
  initialBankroll?: number;
  roundsPerPlayer?: number;
}): MartingaleResult {
  const totalPlayers = options?.totalPlayers || 100;
  const initialBankroll = options?.initialBankroll || 1000;
  const roundsPerPlayer = options?.roundsPerPlayer || 100;

  let brokeCount = 0;
  let totalHouseProfit = 0;
  let globalMaxLossStreak = 0;

  for (let p = 0; p < totalPlayers; p++) {
    let bankroll = initialBankroll;
    let currentStake = MIN_BET;
    let playerBroke = false;
    let currentLossStreak = 0;

    for (let r = 0; r < roundsPerPlayer; r++) {
      if (bankroll < MIN_BET) {
        playerBroke = true;
        break;
      }

      // Stake cannot exceed bankroll or maximum table limit 300
      const actualBet = Math.min(currentStake, bankroll, MAX_BET);
      const outcome = generateSpinOutcome();

      if (outcome.multiplier === 0) {
        // Loss
        bankroll -= actualBet;
        totalHouseProfit += actualBet;
        currentLossStreak++;
        if (currentLossStreak > globalMaxLossStreak) {
          globalMaxLossStreak = currentLossStreak;
        }
        // Double stake up to MAX_BET
        currentStake = Math.min(MAX_BET, actualBet * 2);
      } else {
        // Win (Small Win, Win, Big Win, Mega Jackpot)
        const payout = actualBet * outcome.multiplier;
        const profit = payout - actualBet;
        bankroll += profit;
        totalHouseProfit -= profit;
        currentLossStreak = 0;
        // Reset stake to minimum 50
        currentStake = MIN_BET;
      }
    }

    if (playerBroke || bankroll < MIN_BET) {
      brokeCount++;
    }
  }

  return {
    totalPlayers,
    initialBankroll,
    roundsPerPlayer,
    brokeCount,
    brokePercentage: Number(((brokeCount / totalPlayers) * 100).toFixed(1)),
    survivedCount: totalPlayers - brokeCount,
    totalHouseProfit: Number(totalHouseProfit.toFixed(2)),
    averageHouseProfitPerPlayer: Number((totalHouseProfit / totalPlayers).toFixed(2)),
    maxConsecutiveLosses: globalMaxLossStreak,
  };
}
