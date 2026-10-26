import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { redeemCoupon } from '../services/dbService';
import {
  Ticket,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';

interface CouponPanelProps {
  user: User | null;
  onOpenAuth: () => void;
  onRefreshUser: () => void;
}

export const CouponPanel: React.FC<CouponPanelProps> = ({
  user,
  onOpenAuth,
  onRefreshUser,
}) => {
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Anti-Spam Security: strict 5-second countdown timer
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    if (lockoutSeconds > 0) return;

    const code = couponCode.trim().toUpperCase();
    if (!code) {
      setError('Please enter a coupon code.');
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const creditedAmount = await redeemCoupon(code, user.id);
      setSuccess(`Success! Coupon "${code}" redeemed! +₱${creditedAmount.toFixed(2)} credited to your wallet balance.`);
      setCouponCode('');
      onRefreshUser();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Invalid or expired coupon.';
      setError(errMsg);
      // Trigger strict 5-second anti-spam security lockout
      setLockoutSeconds(5);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-lg mx-auto">
        <Ticket className="w-12 h-12 text-slate-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Redeem Promotional Voucher</h3>
        <p className="text-slate-400 text-sm mb-6">
          Sign in to your account to redeem bonus voucher codes and claim immediate cash balance.
        </p>
        <button
          onClick={onOpenAuth}
          className="px-6 py-2.5 bg-amber-500 text-slate-950 font-bold rounded-xl"
        >
          Login / Register
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
            <Ticket className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Redeem Coupon Code</h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Enter official promotional vouchers distributed in our Telegram VIP community.
            </p>
          </div>
        </div>

        {/* Anti-Spam Security Warning when locked out */}
        {lockoutSeconds > 0 && (
          <div className="mb-5 p-4 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs sm:text-sm flex items-start gap-3 animate-pulse">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Anti-Spam Security Lockout Active:</div>
              <div className="mt-0.5 text-xs text-rose-200">
                Invalid or already used coupon detected. System input is locked for{' '}
                <strong className="text-white font-mono text-sm">{lockoutSeconds}s</strong> to prevent automated brute-force attempts.
              </div>
            </div>
          </div>
        )}

        {error && lockoutSeconds === 0 && (
          <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-5 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3 text-emerald-300 text-xs sm:text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Voucher / Gift Code
            </label>
            <input
              type="text"
              disabled={lockoutSeconds > 0 || loading}
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder={lockoutSeconds > 0 ? `Locked (${lockoutSeconds}s)` : 'e.g. VIPBONUS50'}
              className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white uppercase placeholder-slate-500 font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-500 text-base disabled:opacity-50 disabled:bg-slate-900"
            />
          </div>

          <button
            type="submit"
            disabled={lockoutSeconds > 0 || loading || !couponCode.trim()}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : lockoutSeconds > 0 ? (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Security Wait ({lockoutSeconds}s)</span>
              </div>
            ) : (
              <>
                <span>Redeem & Credit Balance</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-800 text-xs text-slate-500 space-y-1">
          <p>• Coupons are strictly one-time use per code.</p>
          <p>• Payouts are credited directly to your live wallet balance via atomic Firestore transactions.</p>
          <p>• Keep an eye on our official Telegram announcements for limited-drop bonus codes!</p>
        </div>
      </div>
    </div>
  );
};
