import React, { useState, useEffect } from 'react';
import { signUpUser, loginUser } from '../services/dbService';
import { User } from '../types';
import { X, Lock, Phone, Gift, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: User, isNewLogin: boolean) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
}) => {
  const [isRegister, setIsRegister] = useState(false);
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [hasUrlRef, setHasUrlRef] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Automatically capture URL query parameter ?ref=CODE
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refParam = params.get('ref');
    if (refParam) {
      setReferralCode(refParam.toUpperCase());
      setHasUrlRef(true);
      setIsRegister(true); // Switch to registration tab automatically
    }
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!mobileNumber.trim()) {
      setError('Please enter your mobile phone number.');
      return;
    }
    if (!password.trim() || password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        const user = await signUpUser(mobileNumber, password, referralCode);
        onAuthSuccess(user, true);
        onClose();
      } else {
        const user = await loginUser(mobileNumber, password);
        onAuthSuccess(user, true);
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 text-white overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">
            {isRegister ? 'Create Alphaland Account' : 'Welcome Back'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {isRegister
              ? 'Start investing in premium real estate plans today'
              : 'Sign in with your mobile number and password'}
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex bg-slate-800/80 p-1 rounded-xl mb-6 border border-slate-700/60">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setError(null);
            }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              !isRegister
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setError(null);
            }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              isRegister
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Register
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-300 text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Referral Bonus Notice if Registering */}
        {isRegister && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
            <Gift className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              {hasUrlRef
                ? 'Referral code detected! You will receive a $30 signup bonus upon registration.'
                : 'Enter a valid referral code to claim a $30 instant welcome bonus!'}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Mobile Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="tel"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="e.g. 09123456789 or +1234567890"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm transition-all"
                required
              />
            </div>
          </div>

          {/* Referral Code Field (Register Only) */}
          {isRegister && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Referral Code (Optional)
                </label>
                <span className="text-[11px] text-amber-400 font-medium">+$30 Bonus</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Gift className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="e.g. AL48X9"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white uppercase placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm font-mono tracking-wider transition-all"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-extrabold rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{isRegister ? 'Complete Registration' : 'Log In to Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          By continuing, you agree to Alphaland Investment terms of service and protocol security rules.
        </div>
      </div>
    </div>
  );
};
