import React, { useState, useEffect } from 'react';
import { User, AppSettings, Deposit, Withdrawal, UserInvestment } from '../types';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { submitDeposit, requestWithdrawal } from '../services/dbService';
import { uploadImageToStorage } from '../services/storageService';
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Upload,
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldAlert,
  FileText,
  Building,
  Image as ImageIcon,
  X,
} from 'lucide-react';

interface WalletPanelProps {
  user: User | null;
  settings: AppSettings | null;
  onOpenAuth: () => void;
  onGoToInvest: () => void;
}

export const WalletPanel: React.FC<WalletPanelProps> = ({
  user,
  settings,
  onOpenAuth,
  onGoToInvest,
}) => {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');

  // Deposit Form State
  const [depositAmount, setDepositAmount] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);
  const [depositSuccess, setDepositSuccess] = useState<string | null>(null);

  // Withdrawal Form State
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [accountDetails, setAccountDetails] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);

  // History states
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [hasActiveInvestment, setHasActiveInvestment] = useState<boolean | null>(null);

  // Screenshot Preview Modal State
  const [viewingProofUrl, setViewingProofUrl] = useState<string | null>(null);

  // Listen to deposits, withdrawals, and user active investments in real-time
  useEffect(() => {
    if (!user) return;

    // Deposits query
    const depQ = query(
      collection(db, 'deposits'),
      where('userId', '==', user.id)
    );
    const unsubDep = onSnapshot(depQ, (snapshot) => {
      const list: Deposit[] = [];
      snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as Deposit));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setDeposits(list);
    });

    // Withdrawals query
    const withQ = query(
      collection(db, 'withdrawals'),
      where('userId', '==', user.id)
    );
    const unsubWith = onSnapshot(withQ, (snapshot) => {
      const list: Withdrawal[] = [];
      snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as Withdrawal));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setWithdrawals(list);
    });

    // Active investments query
    const invQ = query(
      collection(db, 'investments'),
      where('userId', '==', user.id)
    );
    const unsubInv = onSnapshot(invQ, (snapshot) => {
      let active = false;
      snapshot.forEach((d) => {
        const inv = d.data() as UserInvestment;
        if (inv.daysRemaining > 0) active = true;
      });
      setHasActiveInvestment(active);
    });

    return () => {
      unsubDep();
      unsubWith();
      unsubInv();
    };
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProofFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    setDepositError(null);
    setDepositSuccess(null);

    const amountNum = parseFloat(depositAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setDepositError('Please enter a valid deposit amount.');
      return;
    }
    if (!proofFile) {
      setDepositError('Please select and upload your transaction receipt/screenshot.');
      return;
    }

    setDepositLoading(true);
    try {
      // Step 1: Upload to Firebase Storage 'deposit-proofs/' with robust try/catch
      const uploadedUrl = await uploadImageToStorage(proofFile, 'deposit-proofs');

      // Step 2: Submit to Firestore deposits collection
      await submitDeposit(user.id, user.mobileNumber, amountNum, uploadedUrl);

      setDepositSuccess(
        `Deposit request for $${amountNum.toFixed(2)} submitted successfully! It is queued for administrator verification.`
      );
      setDepositAmount('');
      setProofFile(null);
      setPreviewUrl(null);
    } catch (err) {
      setDepositError(
        err instanceof Error ? err.message : 'Failed to submit deposit. Please try again.'
      );
    } finally {
      // Explicitly placed in finally block to prevent infinite hanging
      setDepositLoading(false);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    setWithdrawError(null);
    setWithdrawSuccess(null);

    const amountNum = parseFloat(withdrawAmount);
    if (isNaN(amountNum) || amountNum < 100) {
      setWithdrawError('Minimum withdrawal amount is $100.');
      return;
    }
    if (amountNum > user.balance) {
      setWithdrawError(
        `Insufficient balance. You currently have $${user.balance.toFixed(2)} available.`
      );
      return;
    }
    if (!accountDetails.trim()) {
      setWithdrawError('Please provide your payout account details (e.g. USDT TRC20 Address or Bank details).');
      return;
    }

    setWithdrawLoading(true);
    try {
      await requestWithdrawal(user.id, user.mobileNumber, amountNum, accountDetails.trim());
      setWithdrawSuccess(
        `Withdrawal of $${amountNum.toFixed(2)} requested successfully. Status: Pending Admin Processing.`
      );
      setWithdrawAmount('');
      setAccountDetails('');
    } catch (err) {
      setWithdrawError(err instanceof Error ? err.message : 'Withdrawal failed.');
    } finally {
      setWithdrawLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-lg mx-auto">
        <Wallet className="w-12 h-12 text-slate-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Access Your Wallet</h3>
        <p className="text-slate-400 text-sm mb-6">
          Log in or register an account to deposit funds, submit payment proofs, and withdraw your dividends.
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

  // Official dynamic deposit QR code strictly from settings/appConfig
  const depositQrUrl =
    settings?.activeDepositQrUrl ||
    'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=usdt-trc20-deposit-alphaland-official';

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      {/* Wallet Balance Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950/40 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
            Total Available Funds
          </span>
          <div className="text-3xl sm:text-5xl font-black text-white mt-1">
            ${user.balance.toFixed(2)}
          </div>
          <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Synced in real time with Cloud Firestore transactions</span>
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
          <button
            onClick={() => setActiveTab('deposit')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              activeTab === 'deposit'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowDownCircle className="w-4 h-4" />
            <span>Deposit Funds</span>
          </button>
          <button
            onClick={() => setActiveTab('withdraw')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              activeTab === 'withdraw'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowUpCircle className="w-4 h-4" />
            <span>Withdraw</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'deposit' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Official Deposit QR Code strictly from settings */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col items-center text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 mb-3">
              Official Deposit Gateway
            </span>
            <h3 className="text-lg font-bold text-white mb-2">Scan & Pay Deposit QR</h3>
            <p className="text-xs text-slate-400 mb-4 max-w-xs">
              Scan this official QR code with your payment app (USDT / Bank) to transfer the amount, then upload your transaction screenshot.
            </p>

            <div className="bg-white p-3.5 rounded-2xl shadow-xl border border-slate-700/50 mb-4">
              <img
                src={depositQrUrl}
                alt="Official Deposit QR Code"
                className="w-52 h-52 object-contain rounded-xl"
              />
              <div className="mt-2 text-[10px] font-mono text-slate-500 font-bold">
                Dynamic Deposit Address
              </div>
            </div>

            <div className="w-full bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 text-left space-y-1">
              <div className="font-semibold text-slate-300">Important Instructions:</div>
              <div>1. Send exact amount to the official QR code above.</div>
              <div>2. Save a clear screenshot showing the Transaction Reference/Hash.</div>
              <div>3. Attach the screenshot below and submit for 1-click admin approval.</div>
            </div>
          </div>

          {/* Right: Deposit Submission Form */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-2xl shadow-xl">
            <h3 className="text-xl font-bold text-white mb-1">Submit Payment Proof</h3>
            <p className="text-xs text-slate-400 mb-6">
              Your wallet balance will be credited as soon as verified by the finance desk.
            </p>

            {depositError && (
              <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{depositError}</span>
              </div>
            )}

            {depositSuccess && (
              <div className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-emerald-300 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{depositSuccess}</span>
              </div>
            )}

            <form onSubmit={handleDepositSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Deposit Amount ($)
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="e.g. 150, 300, 600"
                  className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Payment Proof Screenshot (Receipt)
                </label>
                <div className="border-2 border-dashed border-slate-700 hover:border-amber-500/50 rounded-2xl p-4 text-center cursor-pointer transition-all bg-slate-950/40">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    id="deposit-proof-file"
                    className="hidden"
                  />
                  <label htmlFor="deposit-proof-file" className="cursor-pointer block">
                    {previewUrl ? (
                      <div className="relative inline-block group">
                        <img
                          src={previewUrl}
                          alt="Screenshot Preview"
                          className="w-40 h-40 object-cover rounded-xl border border-slate-700 shadow-lg mx-auto"
                        />
                        <div className="mt-2 text-xs text-amber-400 font-semibold">
                          Click to select different image
                        </div>
                      </div>
                    ) : (
                      <div className="py-4">
                        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <span className="text-xs font-semibold text-slate-300">
                          Click to browse and upload payment screenshot
                        </span>
                        <p className="text-[11px] text-slate-500 mt-1">PNG, JPG, or WEBP up to 10MB</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={depositLoading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {depositLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Uploading Proof to Storage...</span>
                  </div>
                ) : (
                  <>
                    <span>Submit Deposit Proof</span>
                    <ArrowDownCircle className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* Withdrawal Tab */
        <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-xl max-w-2xl mx-auto">
          <div className="flex items-center gap-2.5 mb-2">
            <ArrowUpCircle className="w-6 h-6 text-emerald-400" />
            <h3 className="text-2xl font-black text-white">Withdrawal Request</h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mb-6">
            Cash out your real estate dividends directly to your destination account.
          </p>

          {/* Mandatory Active Investment Check Notification */}
          {hasActiveInvestment === false && (
            <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Withdrawal Condition Unmet:</div>
                <div className="mt-0.5 text-xs text-slate-300">
                  You must have at least 1 active real estate investment contract to initiate a withdrawal.
                </div>
                <button
                  onClick={onGoToInvest}
                  className="mt-2.5 px-3 py-1.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-lg inline-flex items-center gap-1.5"
                >
                  <Building className="w-3.5 h-3.5" />
                  <span>Choose an Investment Package</span>
                </button>
              </div>
            </div>
          )}

          {/* Mandatory Disclaimer Notice */}
          <div className="mb-6 p-4 rounded-2xl bg-blue-950/40 border border-blue-500/30 text-blue-200 text-xs sm:text-sm flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-400 shrink-0" />
            <div className="font-medium italic">
              "Withdrawals are processed manually and take approximately 2 hours to receive."
            </div>
          </div>

          {withdrawError && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{withdrawError}</span>
            </div>
          )}

          {withdrawSuccess && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{withdrawSuccess}</span>
            </div>
          )}

          <form onSubmit={handleWithdrawSubmit} className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Withdrawal Amount ($)
                </label>
                <span className="text-[11px] text-slate-400">Min: $100.00</span>
              </div>
              <input
                type="number"
                min="100"
                step="any"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Minimum $100"
                className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Destination Account / Wallet Address
              </label>
              <textarea
                rows={2}
                value={accountDetails}
                onChange={(e) => setAccountDetails(e.target.value)}
                placeholder="e.g. USDT (TRC20): TXYz... or Bank Account details"
                className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                required
              />
            </div>

            <button
              type="submit"
              disabled={withdrawLoading || hasActiveInvestment === false}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {withdrawLoading ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Request Payout</span>
                  <ArrowUpCircle className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Transaction History Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
        {/* Deposit Records */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <ArrowDownCircle className="w-4 h-4 text-amber-400" />
              <span>Deposit Proof Queue ({deposits.length})</span>
            </h4>
          </div>

          {deposits.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No deposit history recorded.</p>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {deposits.map((dep) => (
                <div
                  key={dep.id}
                  className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-white text-sm">+${dep.amount.toFixed(2)}</div>
                    <div className="text-[10px] text-slate-400">
                      {dep.createdAt?.seconds
                        ? new Date(dep.createdAt.seconds * 1000).toLocaleString()
                        : 'Just now'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {dep.proofImageUrl && (
                      <button
                        onClick={() => setViewingProofUrl(dep.proofImageUrl)}
                        className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                        title="View Receipt Screenshot"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        dep.status === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : dep.status === 'rejected'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {dep.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Withdrawal Records */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <ArrowUpCircle className="w-4 h-4 text-emerald-400" />
              <span>Withdrawal History ({withdrawals.length})</span>
            </h4>
          </div>

          {withdrawals.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No withdrawal requests recorded.</p>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {withdrawals.map((w) => (
                <div
                  key={w.id}
                  className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-white text-sm">-${w.amount.toFixed(2)}</div>
                    <div className="text-[10px] text-slate-400 truncate max-w-[160px]">
                      {w.accountDetails || 'USDT / Account'}
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        w.status === 'approved' || w.status === 'paid'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : w.status === 'rejected'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {w.status}
                    </span>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {w.createdAt?.seconds
                        ? new Date(w.createdAt.seconds * 1000).toLocaleDateString()
                        : 'Just now'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Proof Image Fullscreen Preview Modal */}
      {viewingProofUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-fade-in">
          <div className="relative max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <button
              onClick={() => setViewingProofUrl(null)}
              className="absolute top-3 right-3 p-2 bg-slate-800 text-slate-400 hover:text-white rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
            <h4 className="text-sm font-bold text-white mb-3">Payment Receipt Screenshot</h4>
            <div className="max-h-[75vh] overflow-auto rounded-xl">
              <img
                src={viewingProofUrl}
                alt="Proof Full Preview"
                className="max-w-full h-auto mx-auto rounded-lg shadow-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
