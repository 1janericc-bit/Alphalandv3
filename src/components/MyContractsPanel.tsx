import React, { useState, useEffect } from 'react';
import { User, UserInvestment } from '../types';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { autoCreditInvestmentReturns } from '../services/dbService';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Building,
  RefreshCw,
  TrendingUp,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface MyContractsPanelProps {
  user: User | null;
  onGoToInvest: () => void;
  onRefreshUser: () => void;
}

export const MyContractsPanel: React.FC<MyContractsPanelProps> = ({
  user,
  onGoToInvest,
  onRefreshUser,
}) => {
  const [investments, setInvestments] = useState<UserInvestment[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  // Real-time second counter for live cooldown countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen to user's investments in real time from Firestore
  useEffect(() => {
    if (!user) {
      setInvestments([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'investments'),
      where('userId', '==', user.id)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: UserInvestment[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as UserInvestment);
        });
        // Sort newest first
        list.sort((a, b) => {
          const tA = a.createdAt?.seconds || 0;
          const tB = b.createdAt?.seconds || 0;
          return tB - tA;
        });
        setInvestments(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching investments:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Automatically check and credit daily returns when loading active contracts
  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    const runAutoCredit = async () => {
      try {
        const res = await autoCreditInvestmentReturns(user.id);
        if (res.creditedCycles > 0 && isMounted) {
          setSyncNotice(
            `Automated Payout: Credited ${res.creditedCycles} daily dividend cycle(s) (+₱${res.totalEarnings.toFixed(
              2
            )}) to your balance!`
          );
          onRefreshUser();
          setTimeout(() => setSyncNotice(null), 8000);
        }
      } catch (e) {
        console.error('Auto credit error:', e);
      }
    };

    runAutoCredit();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleManualSync = async () => {
    if (!user || syncing) return;
    setSyncing(true);
    setSyncNotice(null);
    try {
      const res = await autoCreditInvestmentReturns(user.id);
      if (res.creditedCycles > 0) {
        setSyncNotice(
          `Credited ${res.creditedCycles} cycle(s) (+₱${res.totalEarnings.toFixed(2)}) directly to your wallet!`
        );
        onRefreshUser();
      } else {
        setSyncNotice('All contracts are up-to-date. Next payouts will unlock upon 24-hour cycle completion.');
      }
    } catch (err) {
      setSyncNotice('Unable to sync payouts at this moment.');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncNotice(null), 6000);
    }
  };

  const DAY_MS = 24 * 60 * 60 * 1000;

  // Format countdown HH:MM:SS until next 24h cycle
  const formatCooldown = (lastCollected: any) => {
    const lastTime =
      lastCollected?.toMillis?.() ||
      lastCollected?.seconds * 1000 ||
      Date.now();
    const nextPayTime = lastTime + DAY_MS;
    const diff = nextPayTime - now;

    if (diff <= 0) {
      return 'Cycle Completed (Syncing...)';
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(
      2,
      '0'
    )}:${String(seconds).padStart(2, '0')}`;
  };

  if (!user) {
    return (
      <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-lg mx-auto">
        <Building className="w-12 h-12 text-slate-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Login Required</h3>
        <p className="text-slate-400 text-sm mb-6">
          Please log in to view and manage your active real estate investment contracts.
        </p>
        <button
          onClick={onGoToInvest}
          className="px-6 py-2.5 bg-amber-500 text-slate-950 font-bold rounded-xl"
        >
          Explore Packages
        </button>
      </div>
    );
  }

  const activeContracts = investments.filter((i) => i.daysRemaining > 0);
  const completedContracts = investments.filter((i) => i.daysRemaining <= 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner & Sync Control */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Strict 24-Hour Automated Return Cycles</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Active Real Estate Contracts</h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Real-time cooldown timers enforce anti-spam protocol and automatic balance credit.
          </p>
        </div>

        <button
          onClick={handleManualSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          <span>{syncing ? 'Checking Cycles...' : 'Sync Payouts'}</span>
        </button>
      </div>

      {/* Sync Notification Banner */}
      {syncNotice && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm flex items-center gap-3 animate-fade-in">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
          <span>{syncNotice}</span>
        </div>
      )}

      {/* Contracts List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs">Loading active investment contracts from Firestore...</p>
        </div>
      ) : activeContracts.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/60 border border-slate-800 rounded-3xl p-8">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-4">
            <Building className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No Active Investment Contracts</h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mb-6">
            You do not currently have any running contracts. Invest in one of our 5 premium real estate packages to begin receiving daily dividends.
          </p>
          <button
            onClick={onGoToInvest}
            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 inline-flex items-center gap-2"
          >
            <span>View Investment Packages</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activeContracts.map((contract) => {
            const totalDays = (contract.daysCollectedCount || 0) + contract.daysRemaining;
            const progressPercent = Math.min(
              100,
              Math.round(((contract.daysCollectedCount || 0) / (totalDays || 14)) * 100)
            );
            const totalEarnedSoFar = (contract.daysCollectedCount || 0) * contract.dailyReturn;
            const cooldownStr = formatCooldown(contract.lastCollectedAt);

            return (
              <div
                key={contract.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      Active Contract
                    </span>
                    <h3 className="text-xl font-black text-white mt-1">{contract.planName}</h3>
                    <p className="text-xs text-slate-400">
                      Cost: <span className="font-bold text-white">₱{contract.cost}</span> | Daily Return:{' '}
                      <span className="font-bold text-emerald-400">+₱{contract.dailyReturn}/day</span>
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] uppercase font-semibold text-slate-400">Total Earned</div>
                    <div className="text-lg font-black text-emerald-400">+₱{totalEarnedSoFar.toFixed(2)}</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>
                      Day <strong className="text-white">{contract.daysCollectedCount}</strong> of{' '}
                      <strong>{totalDays}</strong>
                    </span>
                    <span className="font-bold text-amber-400">{contract.daysRemaining} days remaining</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Strict 24-Hour Cooldown Timer Display */}
                <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400 leading-tight">
                        Next Automated Payout
                      </div>
                      <div className="text-sm font-mono font-bold text-white tracking-widest">
                        {cooldownStr}
                      </div>
                    </div>
                  </div>

                  <span className="text-[11px] text-slate-400 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                    +₱{contract.dailyReturn} on cycle
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Completed Contracts Section */}
      {completedContracts.length > 0 && (
        <div className="pt-6 border-t border-slate-800">
          <h3 className="text-lg font-bold text-slate-400 mb-4">Completed Contracts ({completedContracts.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {completedContracts.map((c) => (
              <div key={c.id} className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl text-xs space-y-1 opacity-75">
                <div className="flex justify-between font-bold text-slate-300">
                  <span>{c.planName}</span>
                  <span className="text-emerald-400">100% Completed</span>
                </div>
                <div className="text-slate-500">
                  Total collected: ₱{(c.daysCollectedCount * c.dailyReturn).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
