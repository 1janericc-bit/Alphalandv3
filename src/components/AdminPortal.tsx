import React, { useState, useEffect } from 'react';
import {
  AppSettings,
  Deposit,
  Withdrawal,
  Coupon,
  User,
} from '../types';
import {
  collection,
  query,
  onSnapshot,
  doc,
  getDocs,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  updateAppSettings,
  approveDeposit,
  rejectDeposit,
  updateWithdrawalStatus,
  createCoupon,
} from '../services/dbService';
import { uploadImageToStorage } from '../services/storageService';
import {
  ShieldAlert,
  Lock,
  CheckCircle2,
  XCircle,
  Clock,
  Upload,
  QrCode,
  MessageSquare,
  Ticket,
  Users,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
  LogOut,
  ExternalLink,
  Eye,
  AlertCircle,
  Building2,
} from 'lucide-react';

interface AdminPortalProps {
  settings: AppSettings | null;
  onRefreshSettings: () => void;
  onExitAdmin: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  settings,
  onRefreshSettings,
  onExitAdmin,
}) => {
  // Authentication state for secret admin portal
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Active admin tab
  const [activeAdminTab, setActiveAdminTab] = useState<
    'deposits' | 'withdrawals' | 'settings' | 'coupons' | 'users'
  >('deposits');

  // Real-time data lists
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);

  // Action states
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);

  // Settings form states (Separate fields for deposit QR vs community QR vs community link)
  const [activeDepositQrUrl, setActiveDepositQrUrl] = useState(settings?.activeDepositQrUrl || '');
  const [communityChatLink, setCommunityChatLink] = useState(settings?.communityChatLink || '');
  const [communityQrUrl, setCommunityQrUrl] = useState(settings?.communityQrUrl || '');
  const [uploadingDepositQr, setUploadingDepositQr] = useState(false);
  const [depositQrProgress, setDepositQrProgress] = useState(0);
  const [depositQrError, setDepositQrError] = useState<string | null>(null);

  const [uploadingCommunityQr, setUploadingCommunityQr] = useState(false);
  const [communityQrProgress, setCommunityQrProgress] = useState(0);
  const [communityQrError, setCommunityQrError] = useState<string | null>(null);

  const [savingSettings, setSavingSettings] = useState(false);

  // New coupon state
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponAmount, setNewCouponAmount] = useState('');
  const [creatingCoupon, setCreatingCoupon] = useState(false);

  // Sync settings when props change
  useEffect(() => {
    if (settings) {
      setActiveDepositQrUrl(settings.activeDepositQrUrl || '');
      setCommunityChatLink(settings.communityChatLink || '');
      setCommunityQrUrl(settings.communityQrUrl || '');
    }
  }, [settings]);

  // Handle Admin Login
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminUsername === 'Admin123' && adminPassword === 'Admin123') {
      setIsAdminAuthenticated(true);
      setLoginError(null);
    } else {
      setLoginError('Invalid Administrator credentials. Access denied.');
    }
  };

  // Listen to Firestore collections once authenticated
  useEffect(() => {
    if (!isAdminAuthenticated) return;

    // Deposits stream
    const depQ = query(collection(db, 'deposits'));
    const unsubDep = onSnapshot(depQ, (snap) => {
      const list: Deposit[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Deposit));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setDeposits(list);
    });

    // Withdrawals stream
    const withQ = query(collection(db, 'withdrawals'));
    const unsubWith = onSnapshot(withQ, (snap) => {
      const list: Withdrawal[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Withdrawal));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setWithdrawals(list);
    });

    // Coupons stream
    const coupQ = query(collection(db, 'coupons'));
    const unsubCoup = onSnapshot(coupQ, (snap) => {
      const list: Coupon[] = [];
      snap.forEach((d) => list.push({ code: d.id, ...d.data() } as Coupon));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setCoupons(list);
    });

    // Users stream
    const usersQ = query(collection(db, 'users'));
    const unsubUsers = onSnapshot(usersQ, (snap) => {
      const list: User[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as User));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setUsersList(list);
    });

    return () => {
      unsubDep();
      unsubWith();
      unsubCoup();
      unsubUsers();
    };
  }, [isAdminAuthenticated]);

  // Handle Deposit Approval
  const handleApproveDeposit = async (dep: Deposit) => {
    setProcessingId(dep.id);
    try {
      await approveDeposit(dep.id);
      setActionNotice(`Approved deposit of $${dep.amount.toFixed(2)} and credited user balance.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error approving deposit');
    } finally {
      setProcessingId(null);
      setTimeout(() => setActionNotice(null), 5000);
    }
  };

  const handleRejectDeposit = async (dep: Deposit) => {
    if (!confirm('Reject this deposit request?')) return;
    setProcessingId(dep.id);
    try {
      await rejectDeposit(dep.id);
      setActionNotice(`Deposit request for $${dep.amount.toFixed(2)} marked as rejected.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error rejecting deposit');
    } finally {
      setProcessingId(null);
      setTimeout(() => setActionNotice(null), 5000);
    }
  };

  // Handle Withdrawal Actions
  const handleApproveWithdrawal = async (w: Withdrawal) => {
    setProcessingId(w.id);
    try {
      await updateWithdrawalStatus(w.id, 'approved');
      setActionNotice(`Withdrawal of $${w.amount.toFixed(2)} approved.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error approving withdrawal');
    } finally {
      setProcessingId(null);
      setTimeout(() => setActionNotice(null), 5000);
    }
  };

  const handleMarkWithdrawalPaid = async (w: Withdrawal) => {
    setProcessingId(w.id);
    try {
      await updateWithdrawalStatus(w.id, 'paid');
      setActionNotice(`Withdrawal of $${w.amount.toFixed(2)} marked as Paid.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error updating withdrawal');
    } finally {
      setProcessingId(null);
      setTimeout(() => setActionNotice(null), 5000);
    }
  };

  const handleRejectWithdrawal = async (w: Withdrawal) => {
    if (!confirm('Reject withdrawal and refund balance back to user?')) return;
    setProcessingId(w.id);
    try {
      await updateWithdrawalStatus(w.id, 'rejected');
      setActionNotice(`Withdrawal rejected. Refunded $${w.amount.toFixed(2)} back to user balance.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error rejecting withdrawal');
    } finally {
      setProcessingId(null);
      setTimeout(() => setActionNotice(null), 5000);
    }
  };

  // Upload handlers with strict try/catch/finally
  const handleUploadDepositQr = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];

    setDepositQrError(null);
    setUploadingDepositQr(true);
    setDepositQrProgress(0);

    try {
      console.log(`[Admin] Initiating upload for deposit QR: ${file.name} (${file.size} bytes)`);
      const url = await uploadImageToStorage(file, 'admin-qr', {
        onProgress: (p) => setDepositQrProgress(p),
      });

      setActiveDepositQrUrl(url);
      await updateAppSettings({ activeDepositQrUrl: url });
      onRefreshSettings();
      setActionNotice('Official Payment Deposit QR Code updated and saved successfully.');
    } catch (error) {
      console.error("Upload error:", error);
      const errMsg = error instanceof Error ? error.message : 'Failed to upload deposit QR code.';
      setDepositQrError(errMsg);
      alert(`Deposit QR Upload Error: ${errMsg}`);
    } finally {
      // Placed inside finally block to guarantee the UI never hangs
      setUploadingDepositQr(false);
      setDepositQrProgress(0);
      input.value = '';
    }
  };

  const handleUploadCommunityQr = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];

    setCommunityQrError(null);
    setUploadingCommunityQr(true);
    setCommunityQrProgress(0);

    try {
      console.log(`[Admin] Initiating upload for community QR: ${file.name} (${file.size} bytes)`);
      const url = await uploadImageToStorage(file, 'admin-qr', {
        onProgress: (p) => setCommunityQrProgress(p),
      });

      setCommunityQrUrl(url);
      await updateAppSettings({ communityQrUrl: url });
      onRefreshSettings();
      setActionNotice('Community VIP QR Code updated and saved successfully.');
    } catch (error) {
      console.error("Upload error:", error);
      const errMsg = error instanceof Error ? error.message : 'Failed to upload community QR code.';
      setCommunityQrError(errMsg);
      alert(`Community QR Upload Error: ${errMsg}`);
    } finally {
      // Placed inside finally block to guarantee the UI never hangs
      setUploadingCommunityQr(false);
      setCommunityQrProgress(0);
      input.value = '';
    }
  };

  const handleSaveTextSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await updateAppSettings({
        activeDepositQrUrl: activeDepositQrUrl.trim(),
        communityChatLink: communityChatLink.trim(),
        communityQrUrl: communityQrUrl.trim(),
      });
      onRefreshSettings();
      setActionNotice('System settings updated and synchronized successfully!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setSavingSettings(false);
      setTimeout(() => setActionNotice(null), 5000);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = newCouponCode.trim().toUpperCase();
    const amount = parseFloat(newCouponAmount);
    if (!code || isNaN(amount) || amount <= 0) {
      alert('Please provide a valid coupon code and amount.');
      return;
    }

    setCreatingCoupon(true);
    try {
      await createCoupon(code, amount);
      setActionNotice(`Created coupon "${code}" with value $${amount.toFixed(2)}.`);
      setNewCouponCode('');
      setNewCouponAmount('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create coupon.');
    } finally {
      setCreatingCoupon(false);
      setTimeout(() => setActionNotice(null), 5000);
    }
  };

  // If not authenticated, display protected admin login
  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl text-white">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-3">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black">Admin Clearance Portal</h2>
            <p className="text-xs text-slate-400 mt-1">
              Restricted management console. Authorized financial controllers only.
            </p>
          </div>

          {loginError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                Admin Username
              </label>
              <input
                type="text"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                placeholder="Admin123"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                Admin Password
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black rounded-xl text-sm shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98]"
            >
              Authenticate & Unlock Console
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={onExitAdmin}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              ← Back to Main App
            </button>
          </div>
        </div>
      </div>
    );
  }

  const pendingDeposits = deposits.filter((d) => d.status === 'pending');
  const pendingWithdrawals = withdrawals.filter((w) => w.status === 'pending');

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Admin Top Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black">Alphaland Executive Control</h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  ROOT ADMIN
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Direct Firestore transactions • Storage management • Instant payout approval
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onExitAdmin}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700"
            >
              Return to User App
            </button>
            <button
              onClick={() => setIsAdminAuthenticated(false)}
              className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-xs font-semibold rounded-lg border border-rose-800/60 flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Lock Console</span>
            </button>
          </div>
        </div>

        {/* Global Action Notification */}
        {actionNotice && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Admin Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
          {[
            { id: 'deposits', label: `Pending Deposits (${pendingDeposits.length})` },
            { id: 'withdrawals', label: `Pending Withdrawals (${pendingWithdrawals.length})` },
            { id: 'settings', label: 'QR & Community Settings' },
            { id: 'coupons', label: `Coupons (${coupons.length})` },
            { id: 'users', label: `User Accounts (${usersList.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveAdminTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeAdminTab === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Deposits Queue */}
        {activeAdminTab === 'deposits' && (
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
            <h3 className="text-lg font-bold mb-4 flex items-center justify-between">
              <span>Deposit Verification Queue</span>
              <span className="text-xs text-amber-400 font-normal">
                {pendingDeposits.length} awaiting approval
              </span>
            </h3>

            {deposits.length === 0 ? (
              <p className="text-center py-12 text-slate-500 text-xs">No deposits submitted yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="p-3">User UID / Mobile</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Payment Receipt</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {deposits.map((dep) => (
                      <tr key={dep.id} className="hover:bg-slate-800/40">
                        <td className="p-3">
                          <div className="font-bold text-white">{dep.userMobile || 'N/A'}</div>
                          <div className="text-[10px] text-slate-500 font-mono truncate max-w-[120px]">
                            {dep.userId}
                          </div>
                        </td>
                        <td className="p-3 font-bold text-emerald-400 text-sm">
                          ${dep.amount.toFixed(2)}
                        </td>
                        <td className="p-3">
                          {dep.proofImageUrl ? (
                            <button
                              onClick={() => setSelectedProofUrl(dep.proofImageUrl)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Receipt</span>
                            </button>
                          ) : (
                            <span className="text-slate-500">No Image</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-400">
                          {dep.createdAt?.seconds
                            ? new Date(dep.createdAt.seconds * 1000).toLocaleString()
                            : 'N/A'}
                        </td>
                        <td className="p-3">
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
                        </td>
                        <td className="p-3 text-right">
                          {dep.status === 'pending' ? (
                            <div className="inline-flex items-center gap-2">
                              <button
                                onClick={() => handleApproveDeposit(dep)}
                                disabled={processingId === dep.id}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow transition-all active:scale-95 disabled:opacity-50"
                              >
                                {processingId === dep.id ? 'Crediting...' : '1-Click Approve'}
                              </button>
                              <button
                                onClick={() => handleRejectDeposit(dep)}
                                disabled={processingId === dep.id}
                                className="px-2.5 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 font-semibold rounded-lg border border-rose-800 disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[11px]">Processed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Withdrawals Queue */}
        {activeAdminTab === 'withdrawals' && (
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
            <h3 className="text-lg font-bold mb-4 flex items-center justify-between">
              <span>Withdrawal Requests Processing Queue</span>
              <span className="text-xs text-amber-400 font-normal">
                {pendingWithdrawals.length} pending
              </span>
            </h3>

            {withdrawals.length === 0 ? (
              <p className="text-center py-12 text-slate-500 text-xs">No withdrawals requested yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="p-3">User UID / Mobile</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Payout Account / Address</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {withdrawals.map((w) => (
                      <tr key={w.id} className="hover:bg-slate-800/40">
                        <td className="p-3">
                          <div className="font-bold text-white">{w.userMobile || 'N/A'}</div>
                          <div className="text-[10px] text-slate-500 font-mono truncate max-w-[120px]">
                            {w.userId}
                          </div>
                        </td>
                        <td className="p-3 font-bold text-emerald-400 text-sm">
                          ${w.amount.toFixed(2)}
                        </td>
                        <td className="p-3 text-slate-300 font-mono text-[11px] max-w-[200px] break-all">
                          {w.accountDetails || 'USDT / Account'}
                        </td>
                        <td className="p-3 text-slate-400">
                          {w.createdAt?.seconds
                            ? new Date(w.createdAt.seconds * 1000).toLocaleString()
                            : 'N/A'}
                        </td>
                        <td className="p-3">
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
                        </td>
                        <td className="p-3 text-right">
                          {w.status === 'pending' ? (
                            <div className="inline-flex items-center gap-2">
                              <button
                                onClick={() => handleApproveWithdrawal(w)}
                                disabled={processingId === w.id}
                                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-all"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleMarkWithdrawalPaid(w)}
                                disabled={processingId === w.id}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-all"
                              >
                                Mark Paid
                              </button>
                              <button
                                onClick={() => handleRejectWithdrawal(w)}
                                disabled={processingId === w.id}
                                className="px-2.5 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 font-semibold rounded-lg border border-rose-800"
                              >
                                Reject & Refund
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[11px]">{w.status}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Official Deposit QR & Community Management (Strictly Separate Fields!) */}
        {activeAdminTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Deposit QR Management */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
              <div className="flex items-center gap-2 text-amber-400">
                <QrCode className="w-5 h-5" />
                <h3 className="text-lg font-bold text-white">1. Official Deposit QR Code</h3>
              </div>
              <p className="text-xs text-slate-400">
                This QR code is strictly displayed in the user <strong>Deposit Gateway</strong> for receiving payments.
              </p>

              {depositQrError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{depositQrError}</span>
                </div>
              )}

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center">
                <img
                  src={activeDepositQrUrl}
                  alt="Current Deposit QR"
                  className="w-40 h-40 object-contain rounded-xl bg-white p-2 mb-3 shadow"
                />

                {uploadingDepositQr && (
                  <div className="w-full max-w-xs mb-3">
                    <div className="flex justify-between text-[11px] text-amber-400 font-semibold mb-1">
                      <span>Uploading to Firebase Storage...</span>
                      <span>{depositQrProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-300"
                        style={{ width: `${depositQrProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <label
                  className={`px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow transition-all ${
                    uploadingDepositQr
                      ? 'opacity-50 cursor-not-allowed pointer-events-none'
                      : 'cursor-pointer active:scale-95'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>
                    {uploadingDepositQr
                      ? `Uploading QR (${depositQrProgress}%)...`
                      : 'Upload New Deposit QR Image'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadDepositQr}
                    className="hidden"
                    disabled={uploadingDepositQr}
                  />
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                  Direct Image URL (activeDepositQrUrl)
                </label>
                <input
                  type="text"
                  value={activeDepositQrUrl}
                  onChange={(e) => setActiveDepositQrUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-mono"
                />
              </div>
            </div>

            {/* Community Settings Management (Distinct Fields!) */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
              <div className="flex items-center gap-2 text-blue-400">
                <MessageSquare className="w-5 h-5" />
                <h3 className="text-lg font-bold text-white">2. Community Chat & Community QR</h3>
              </div>
              <p className="text-xs text-slate-400">
                These settings are strictly for the <strong>Login Popup Modal</strong> and the <strong>Team & MLM Panel</strong>. Never mixed with payment QR!
              </p>

              {communityQrError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{communityQrError}</span>
                </div>
              )}

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center">
                <img
                  src={communityQrUrl}
                  alt="Current Community QR"
                  className="w-40 h-40 object-contain rounded-xl bg-white p-2 mb-3 shadow"
                />

                {uploadingCommunityQr && (
                  <div className="w-full max-w-xs mb-3">
                    <div className="flex justify-between text-[11px] text-blue-400 font-semibold mb-1">
                      <span>Uploading to Firebase Storage...</span>
                      <span>{communityQrProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${communityQrProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <label
                  className={`px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow transition-all ${
                    uploadingCommunityQr
                      ? 'opacity-50 cursor-not-allowed pointer-events-none'
                      : 'cursor-pointer active:scale-95'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>
                    {uploadingCommunityQr
                      ? `Uploading QR (${communityQrProgress}%)...`
                      : 'Upload New Community QR Image'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadCommunityQr}
                    className="hidden"
                    disabled={uploadingCommunityQr}
                  />
                </label>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    Community Chat Link (communityChatLink)
                  </label>
                  <input
                    type="url"
                    value={communityChatLink}
                    onChange={(e) => setCommunityChatLink(e.target.value)}
                    placeholder="https://t.me/your_vip_group"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    Community QR Code Image URL (communityQrUrl)
                  </label>
                  <input
                    type="text"
                    value={communityQrUrl}
                    onChange={(e) => setCommunityQrUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-mono"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveTextSettings}
                disabled={savingSettings}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2"
              >
                {savingSettings ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>Save All Text URLs to Firestore</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 4: Coupon Management */}
        {activeAdminTab === 'coupons' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Create Coupon Form */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                <Ticket className="w-5 h-5 text-amber-400" />
                <span>Issue New Promotional Coupon</span>
              </h3>
              <p className="text-xs text-slate-400 mb-5">
                Coupons can be redeemed exactly once by any active user.
              </p>

              <form onSubmit={handleCreateCoupon} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    Coupon Code (Uppercase)
                  </label>
                  <input
                    type="text"
                    value={newCouponCode}
                    onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                    placeholder="e.g. ALPHA100"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono uppercase text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    Bonus Amount ($)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={newCouponAmount}
                    onChange={(e) => setNewCouponAmount(e.target.value)}
                    placeholder="e.g. 50"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={creatingCoupon}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold rounded-xl text-sm shadow transition-all active:scale-95 disabled:opacity-50"
                >
                  {creatingCoupon ? 'Creating Voucher...' : 'Generate Coupon'}
                </button>
              </form>
            </div>

            {/* Coupons List */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
              <h3 className="text-lg font-bold mb-4">Coupons History ({coupons.length})</h3>

              {coupons.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-10">No coupons issued yet.</p>
              ) : (
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {coupons.map((c) => (
                    <div
                      key={c.code}
                      className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-mono font-black text-white text-sm tracking-wider">
                          {c.code}
                        </div>
                        <div className="text-slate-400 font-semibold text-emerald-400 mt-0.5">
                          Amount: ${c.amount.toFixed(2)}
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            c.isUsed
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {c.isUsed ? 'Redeemed' : 'Active'}
                        </span>
                        {c.isUsed && c.usedBy && (
                          <div className="text-[10px] text-slate-500 font-mono mt-1 truncate max-w-[140px]">
                            By: {c.usedBy}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Users Overview */}
        {activeAdminTab === 'users' && (
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
            <h3 className="text-lg font-bold mb-4">Registered User Accounts ({usersList.length})</h3>

            {usersList.length === 0 ? (
              <p className="text-center py-12 text-slate-500 text-xs">No users registered yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="p-3">Mobile Number</th>
                      <th className="p-3">Balance</th>
                      <th className="p-3">Referral Code</th>
                      <th className="p-3">Referred By UID</th>
                      <th className="p-3">Registered Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-bold text-white">{u.mobileNumber}</td>
                        <td className="p-3 font-bold text-emerald-400">${u.balance.toFixed(2)}</td>
                        <td className="p-3 font-mono font-bold text-amber-300">{u.referralCode}</td>
                        <td className="p-3 font-mono text-slate-400 truncate max-w-[160px]">
                          {u.referredBy || 'Direct (None)'}
                        </td>
                        <td className="p-3 text-slate-400">
                          {u.createdAt?.seconds
                            ? new Date(u.createdAt.seconds * 1000).toLocaleDateString()
                            : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Fullscreen Proof Preview Modal */}
        {selectedProofUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-fade-in">
            <div className="relative max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <button
                onClick={() => setSelectedProofUrl(null)}
                className="absolute top-3 right-3 p-2 bg-slate-800 text-slate-400 hover:text-white rounded-full"
              >
                ✕
              </button>
              <h4 className="text-sm font-bold text-white mb-3">Deposit Proof Screenshot</h4>
              <div className="max-h-[75vh] overflow-auto rounded-xl">
                <img
                  src={selectedProofUrl}
                  alt="Proof Preview"
                  className="max-w-full h-auto mx-auto rounded-lg shadow-xl"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
