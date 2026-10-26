import React, { useState, useEffect } from 'react';
import { User, RouletteLog, RouletteTierConfig, RouletteOutcomeName } from '../types';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { executeRouletteSpin } from '../services/dbService';
import {
  MIN_BET,
  MAX_BET,
  ROULETTE_TIERS,
  validateBet,
} from '../utils/rouletteEngine';
import {
  Flame,
  AlertCircle,
  RotateCw,
  Coins,
  Zap,
} from 'lucide-react';

interface RouletteGamePanelProps {
  user: User | null;
  onOpenAuth: () => void;
  onGoToWallet: () => void;
  onRefreshUser: () => void;
}

// Visual wheel segments (10 slices around 360 degrees)
interface WheelSlice {
  tierName: RouletteOutcomeName;
  multiplier: number;
  label: string;
  color: string;
  angle: number; // Midpoint angle in degrees
}

const WHEEL_SLICES: WheelSlice[] = [
  { tierName: 'Mega Jackpot', multiplier: 10, label: '10x MEGA', color: '#f59e0b', angle: 18 },
  { tierName: 'Lose', multiplier: 0, label: '0x', color: '#334155', angle: 54 },
  { tierName: 'Small Win', multiplier: 1.5, label: '1.5x WIN', color: '#10b981', angle: 90 },
  { tierName: 'Lose', multiplier: 0, label: '0x', color: '#1e293b', angle: 126 },
  { tierName: 'Win', multiplier: 2, label: '2x WIN', color: '#3b82f6', angle: 162 },
  { tierName: 'Lose', multiplier: 0, label: '0x', color: '#334155', angle: 198 },
  { tierName: 'Small Win', multiplier: 1.5, label: '1.5x WIN', color: '#10b981', angle: 234 },
  { tierName: 'Lose', multiplier: 0, label: '0x', color: '#1e293b', angle: 270 },
  { tierName: 'Big Win', multiplier: 4, label: '4x BIG', color: '#a855f7', angle: 306 },
  { tierName: 'Lose', multiplier: 0, label: '0x', color: '#334155', angle: 342 },
];

export const RouletteGamePanel: React.FC<RouletteGamePanelProps> = ({
  user,
  onOpenAuth,
  onGoToWallet,
  onRefreshUser,
}) => {
  // Bet State
  const [betAmount, setBetAmount] = useState<number>(50);
  const [isSpinning, setIsSpinning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Result state
  const [lastResult, setLastResult] = useState<{
    outcome: RouletteTierConfig;
    betAmount: number;
    payout: number;
    playerProfit: number;
    houseProfit: number;
  } | null>(null);

  // Wheel rotation angle state
  const [wheelRotation, setWheelRotation] = useState<number>(0);

  // Live Winnings Feed
  const [recentWinners, setRecentWinners] = useState<RouletteLog[]>([]);

  // Real-time listener for live winning ticker
  useEffect(() => {
    const logsQ = query(
      collection(db, 'roulette_logs'),
      orderBy('createdAt', 'desc'),
      limit(40)
    );

    const unsubscribe = onSnapshot(
      logsQ,
      (snapshot) => {
        const list: RouletteLog[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as RouletteLog;
          // Filter winning spins for the live winning ticker (multiplier > 0)
          if (data.multiplier > 0) {
            list.push({ id: docSnap.id, ...data });
          }
        });
        setRecentWinners(list);
      },
      (err) => {
        console.error('Roulette logs listener error:', err);
      }
    );

    return () => unsubscribe();
  }, []);

  // Format masked mobile number (e.g. ****1234)
  const formatMaskedMobile = (mobile: string) => {
    if (!mobile) return '****0000';
    const digits = mobile.replace(/\D/g, '');
    const last4 = digits.slice(-4) || '1234';
    return `****${last4}`;
  };

  // Handle spin action
  const handleSpin = async () => {
    if (!user) {
      onOpenAuth();
      return;
    }

    setErrorMessage(null);

    // Client-side table limit & balance validation
    const validation = validateBet(betAmount, user.balance);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid bet amount.');
      return;
    }

    setIsSpinning(true);

    try {
      // Execute the atomic Firestore transaction
      const spinRes = await executeRouletteSpin(user.id, user.mobileNumber, betAmount);

      // Pick a slice angle matching the outcome
      const matchingSlices = WHEEL_SLICES.filter((s) => s.tierName === spinRes.outcome.name);
      const chosenSlice =
        matchingSlices[Math.floor(Math.random() * matchingSlices.length)] || WHEEL_SLICES[0];

      // Calculate target rotation:
      // Current wheel rotation + 5 to 7 full 360 deg spins + alignment offset to point to top (270 deg / pointer at 12 o'clock)
      const fullSpins = 5 + Math.floor(Math.random() * 3); // 5 to 7 rotations
      const targetAngle = 360 - chosenSlice.angle + (Math.random() * 10 - 5); // slight natural jitter
      const nextTotalRotation = wheelRotation + fullSpins * 360 + targetAngle;

      setWheelRotation(nextTotalRotation);

      // Wait for wheel animation (approx 3.2 seconds) before revealing result
      setTimeout(() => {
        setLastResult({
          outcome: spinRes.outcome,
          betAmount,
          payout: spinRes.payout,
          playerProfit: spinRes.playerProfit,
          houseProfit: spinRes.houseProfit,
        });
        setIsSpinning(false);
        onRefreshUser();
      }, 3200);
    } catch (err) {
      setIsSpinning(false);
      setErrorMessage(err instanceof Error ? err.message : 'Spin failed. Please try again.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      {/* 1. LIVE WINNINGS TICKER (TOP OF ROULETTE SECTION) */}
      <div className="relative overflow-hidden bg-slate-900 border border-amber-500/30 rounded-2xl p-2.5 shadow-lg flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-xl text-xs font-black uppercase tracking-wider shrink-0 z-10">
          <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400 animate-pulse" />
          <span>Live Wins</span>
        </div>

        {recentWinners.length === 0 ? (
          <div className="text-xs text-slate-400 italic py-0.5">
            Real-time winning feed active. Place a spin to trigger live broadcast ticker!
          </div>
        ) : (
          <div className="overflow-hidden whitespace-nowrap flex-1 relative mask-fade-edges">
            <div className="inline-flex items-center gap-6 animate-marquee">
              {recentWinners.map((winner, idx) => (
                <div
                  key={`${winner.id || idx}-${winner.createdAt?.seconds || idx}`}
                  className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-lg bg-slate-950/70 border border-slate-800"
                >
                  <span className="text-slate-300 font-mono">
                    {formatMaskedMobile(winner.mobileNumber)}
                  </span>
                  <span className="text-slate-400">won</span>
                  <span className="text-emerald-400 font-black">
                    ₱{winner.payout.toFixed(2)}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold ${
                      winner.multiplier >= 10
                        ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                        : winner.multiplier >= 4
                        ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    {winner.multiplier}x
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. MAIN MINI ROULETTE INTERACTION AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Visual Animated Roulette Wheel */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden">
          {/* Ambient casino lighting */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Wheel Pointer at top (12 o'clock) */}
          <div className="relative z-20 flex flex-col items-center mb-1">
            <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[22px] border-t-amber-400 drop-shadow-[0_4px_8px_rgba(245,158,11,0.6)] animate-bounce" />
          </div>

          {/* The Spinning Wheel Canvas / SVG */}
          <div className="relative w-64 h-64 sm:w-80 sm:h-80 z-10 my-2">
            {/* Outer golden rim */}
            <div className="absolute inset-0 rounded-full border-4 border-amber-500/60 shadow-[0_0_35px_rgba(245,158,11,0.25)] pointer-events-none z-10" />

            {/* Rotating Wheel Container */}
            <div
              className="w-full h-full rounded-full transition-transform duration-[3200ms] ease-[cubic-bezier(0.15,0.9,0.2,1)] will-change-transform"
              style={{
                transform: `rotate(${wheelRotation}deg)`,
              }}
            >
              <svg viewBox="0 0 100 100" className="w-full h-full rounded-full">
                {/* 10 slices, each 36 degrees */}
                {WHEEL_SLICES.map((slice, i) => {
                  const startAngle = i * 36 - 90;
                  const endAngle = (i + 1) * 36 - 90;
                  const x1 = 50 + 50 * Math.cos((Math.PI * startAngle) / 180);
                  const y1 = 50 + 50 * Math.sin((Math.PI * startAngle) / 180);
                  const x2 = 50 + 50 * Math.cos((Math.PI * endAngle) / 180);
                  const y2 = 50 + 50 * Math.sin((Math.PI * endAngle) / 180);

                  const textAngle = i * 36 + 18 - 90;
                  const tx = 50 + 35 * Math.cos((Math.PI * textAngle) / 180);
                  const ty = 50 + 35 * Math.sin((Math.PI * textAngle) / 180);

                  return (
                    <g key={i}>
                      <path
                        d={`M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`}
                        fill={slice.color}
                        stroke="#0f172a"
                        strokeWidth="1"
                      />
                      <text
                        x={tx}
                        y={ty}
                        fill="#ffffff"
                        fontSize="3.8"
                        fontWeight="900"
                        fontFamily="monospace"
                        textAnchor="middle"
                        dominantBaseline="central"
                        transform={`rotate(${i * 36 + 18}, ${tx}, ${ty})`}
                      >
                        {slice.label}
                      </text>
                    </g>
                  );
                })}
                {/* Center Hub */}
                <circle cx="50" cy="50" r="14" fill="#020617" stroke="#f59e0b" strokeWidth="2.5" />
                <circle cx="50" cy="50" r="6" fill="#f59e0b" />
              </svg>
            </div>
          </div>

          {/* Result Banner under Wheel */}
          <div className="w-full max-w-sm mt-4 text-center min-h-[72px] flex items-center justify-center">
            {isSpinning ? (
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm animate-pulse">
                <RotateCw className="w-4 h-4 animate-spin text-amber-400" />
                <span>Spinning Roulette... Testing your fortune!</span>
              </div>
            ) : lastResult ? (
              <div
                className={`p-3.5 rounded-2xl w-full border text-xs sm:text-sm animate-fade-in ${
                  lastResult.outcome.multiplier > 0
                    ? lastResult.outcome.multiplier >= 10
                      ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                      : lastResult.outcome.multiplier >= 4
                      ? 'bg-purple-500/20 border-purple-500/60 text-purple-300'
                      : 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between font-black text-sm sm:text-base">
                  <span>{lastResult.outcome.name}! ({lastResult.outcome.multiplier}x)</span>
                  <span className={lastResult.playerProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {lastResult.playerProfit >= 0
                      ? `+₱${lastResult.playerProfit.toFixed(2)} Net`
                      : `-₱${Math.abs(lastResult.playerProfit).toFixed(2)}`}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
                  <span>Bet: ₱{lastResult.betAmount}</span>
                  <span>Payout: ₱{lastResult.payout.toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <div className="text-slate-500 text-xs italic">
                Set your wager (₱50 - ₱300) and spin to win up to 10x Mega Jackpot!
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Table Limits, Betting Controls, & Probabilities */}
        <div className="lg:col-span-5 space-y-5">
          {/* Bet Controls Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Place Your Bet</h3>
                  <p className="text-[11px] text-slate-400">
                    Table Limits: <strong>₱{MIN_BET}</strong> – <strong>₱{MAX_BET}</strong>
                  </p>
                </div>
              </div>

              {user && (
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Balance</span>
                  <div className="text-base font-black text-amber-400">
                    ₱{user.balance.toFixed(2)}
                  </div>
                </div>
              )}
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Bet Input */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Wager Amount (₱)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">
                    ₱
                  </span>
                  <input
                    type="number"
                    min={MIN_BET}
                    max={MAX_BET}
                    step="10"
                    disabled={isSpinning}
                    value={betAmount || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setBetAmount(isNaN(val) ? 0 : val);
                      setErrorMessage(null);
                    }}
                    className="w-full pl-8 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white font-black text-lg focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                  />
                </div>
              </div>

              {/* Quick Bet Buttons */}
              <div className="grid grid-cols-5 gap-1.5">
                {[50, 100, 150, 200, 300].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    disabled={isSpinning}
                    onClick={() => {
                      setBetAmount(amt);
                      setErrorMessage(null);
                    }}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                      betAmount === amt
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                  >
                    ₱{amt}
                  </button>
                ))}
              </div>

              {/* Min / Max / Double Helpers */}
              <div className="flex items-center gap-2 pt-1 text-xs">
                <button
                  type="button"
                  disabled={isSpinning}
                  onClick={() => setBetAmount(MIN_BET)}
                  className="flex-1 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 font-semibold"
                >
                  Min (₱50)
                </button>
                <button
                  type="button"
                  disabled={isSpinning}
                  onClick={() => setBetAmount(Math.min(MAX_BET, betAmount * 2))}
                  className="flex-1 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 font-semibold"
                >
                  2x Bet
                </button>
                <button
                  type="button"
                  disabled={isSpinning}
                  onClick={() => setBetAmount(MAX_BET)}
                  className="flex-1 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 font-semibold"
                >
                  Max (₱300)
                </button>
              </div>

              {/* Spin Button */}
              <button
                type="button"
                onClick={handleSpin}
                disabled={isSpinning}
                className="w-full mt-3 py-4 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-base rounded-2xl shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSpinning ? (
                  <div className="flex items-center gap-2">
                    <RotateCw className="w-5 h-5 animate-spin" />
                    <span>Spinning...</span>
                  </div>
                ) : (
                  <>
                    <Zap className="w-5 h-5 fill-slate-950" />
                    <span>Spin Wheel (₱{betAmount})</span>
                  </>
                )}
              </button>

              {user && user.balance < betAmount && (
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={onGoToWallet}
                    className="text-xs text-amber-400 hover:text-amber-300 underline font-semibold"
                  >
                    Wallet low? Deposit funds to keep playing →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Probabilities & Payouts Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
              <span>Provably Fair Payout Multipliers</span>
              <span className="text-[10px] text-amber-400 font-normal">Strict Probabilities</span>
            </h4>

            <div className="space-y-2 text-xs">
              {ROULETTE_TIERS.map((tier) => (
                <div
                  key={tier.name}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tier.color }}
                    />
                    <span className="font-bold text-white">{tier.name}</span>
                    <span className="text-[11px] text-slate-400">
                      ({(tier.chance * 100).toFixed(1)}%)
                    </span>
                  </div>

                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-black text-amber-400">{tier.multiplier}x</span>
                    <span className="text-slate-500 text-[10px]">
                      = ₱{(betAmount * tier.multiplier).toFixed(0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

