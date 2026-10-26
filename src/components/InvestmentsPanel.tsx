import React, { useState } from 'react';
import { INVESTMENT_PLANS } from '../constants/plans';
import { InvestmentPlan, User } from '../types';
import { purchaseInvestmentPlan } from '../services/dbService';
import {
  TrendingUp,
  Clock,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Building,
  Sparkles,
  ArrowRight,
  Wallet,
} from 'lucide-react';

interface InvestmentsPanelProps {
  user: User | null;
  onOpenAuth: () => void;
  onGoToWallet: () => void;
  onPlanPurchased: () => void;
}

export const InvestmentsPanel: React.FC<InvestmentsPanelProps> = ({
  user,
  onOpenAuth,
  onGoToWallet,
  onPlanPurchased,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<InvestmentPlan | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSelectPlan = (plan: InvestmentPlan) => {
    if (!user) {
      onOpenAuth();
      return;
    }
    setError(null);
    setSuccessMsg(null);
    setSelectedPlan(plan);
  };

  const handleConfirmPurchase = async () => {
    if (!user || !selectedPlan) return;
    setError(null);

    if (user.balance < selectedPlan.cost) {
      setError(
        `Insufficient balance (₱${user.balance.toFixed(2)}). You need ₱${(
          selectedPlan.cost - user.balance
        ).toFixed(2)} more.`
      );
      return;
    }

    setPurchasing(true);
    try {
      await purchaseInvestmentPlan(user.id, selectedPlan);
      setSuccessMsg(
        `Successfully purchased ${selectedPlan.name}! Your daily return of ₱${selectedPlan.dailyReturn} will automatically credit every 24 hours.`
      );
      setTimeout(() => {
        setSelectedPlan(null);
        setSuccessMsg(null);
        onPlanPurchased();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to purchase plan.');
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950/50 border border-slate-800 p-6 sm:p-10 shadow-2xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>High-Yield Real Estate Portfolios</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Passive Daily Income,{' '}
            <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
              Guaranteed 14-Day Cycle
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-300 mb-6 leading-relaxed">
            Choose a luxury property tier. Collect automatic dividends every 24 hours directly into your wallet balance with instant withdrawal capability.
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-300">
            <div className="flex items-center gap-2 bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-700">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>24-Hour Automated Dividends</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-700">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Full Principal & Yield Return</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-700">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span>Up to 513% Total Yield</span>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Grid */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Available Investment Packages</h2>
            <p className="text-xs sm:text-sm text-slate-400">Select any contract to start generating daily dividends</p>
          </div>
          {user && (
            <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
              <span>Your Balance:</span>
              <span className="font-bold text-amber-400 text-sm">₱{user.balance.toFixed(2)}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {INVESTMENT_PLANS.map((plan) => {
            const profit = plan.totalReturn - plan.cost;
            const roiPercent = Math.round((plan.totalReturn / plan.cost) * 100);

            return (
              <div
                key={plan.id}
                className="group relative bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl overflow-hidden shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col"
              >
                {/* Image Banner */}
                <div className="relative h-44 w-full overflow-hidden bg-slate-800">
                  <img
                    src={plan.imageUrl}
                    alt={plan.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                  
                  {/* Badge */}
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-slate-900/90 backdrop-blur-md border border-amber-500/40 text-[11px] font-black text-amber-300 uppercase tracking-wide">
                    {roiPercent}% ROI
                  </div>

                  <div className="absolute bottom-3 left-4">
                    <h3 className="text-xl font-black text-white">{plan.name}</h3>
                    <p className="text-xs text-amber-300 font-medium">{plan.tagline}</p>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  {/* Metric boxes */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700/50">
                      <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Contract Cost</div>
                      <div className="text-xl font-extrabold text-white">₱{plan.cost}</div>
                    </div>
                    <div className="bg-emerald-950/40 p-3 rounded-xl border border-emerald-500/30">
                      <div className="text-[10px] uppercase font-bold text-emerald-400 mb-0.5">Daily Return</div>
                      <div className="text-xl font-extrabold text-emerald-400">+₱{plan.dailyReturn}/day</div>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-slate-300 border-t border-slate-800 pt-3">
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Contract Duration:</span>
                      <span className="font-bold text-white">{plan.totalDays} Days</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Total Return:</span>
                      <span className="font-extrabold text-amber-300 text-sm">₱{plan.totalReturn}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Net Profit:</span>
                      <span className="font-bold text-emerald-400">+₱{profit}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectPlan(plan)}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  >
                    <span>Invest Now (₱{plan.cost})</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirmation Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-white overflow-hidden">
            <h3 className="text-xl font-black mb-2">Confirm Investment Contract</h3>
            <p className="text-xs text-slate-400 mb-4">
              Review details for <span className="text-amber-400 font-bold">{selectedPlan.name}</span>.
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div>{error}</div>
                  {user && user.balance < selectedPlan.cost && (
                    <button
                      onClick={() => {
                        setSelectedPlan(null);
                        onGoToWallet();
                      }}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500 text-slate-950 font-bold text-xs rounded-lg"
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      <span>Deposit Funds Now</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-emerald-300 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="bg-slate-800/80 rounded-xl p-4 space-y-2.5 text-xs mb-6 border border-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-400">Contract Cost:</span>
                <span className="font-bold text-white">₱{selectedPlan.cost}.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Wallet Balance:</span>
                <span className="font-bold text-white">₱{user?.balance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-700 pt-2">
                <span className="text-slate-400">Balance After Purchase:</span>
                <span className="font-bold text-amber-400">
                  ₱{Math.max(0, (user?.balance || 0) - selectedPlan.cost).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-700 pt-2">
                <span className="text-slate-400">Daily Return:</span>
                <span className="font-bold text-emerald-400">+₱{selectedPlan.dailyReturn}/day</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total 14-Day Payout:</span>
                <span className="font-bold text-emerald-400">₱{selectedPlan.totalReturn}.00</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedPlan(null)}
                disabled={purchasing}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPurchase}
                disabled={purchasing || (user?.balance || 0) < selectedPlan.cost}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {purchasing ? (
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Activate</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
