import React, { useState, useEffect } from 'react';
import { User, AppSettings, Commission } from '../types';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Users,
  Copy,
  Check,
  Share2,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  DollarSign,
  TrendingUp,
  UserCheck,
  Layers,
  Sparkles,
} from 'lucide-react';

interface TeamPanelProps {
  user: User | null;
  settings: AppSettings | null;
  onOpenAuth: () => void;
}

export const TeamPanel: React.FC<TeamPanelProps> = ({
  user,
  settings,
  onOpenAuth,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Referral link
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const refLink = user ? `${origin}/?ref=${user.referralCode}` : '';

  // Listen to commissions earned by user
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const commQ = query(
      collection(db, 'commissions'),
      where('uplineUserId', '==', user.id)
    );

    const unsubComm = onSnapshot(commQ, (snap) => {
      const list: Commission[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Commission);
      });
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setCommissions(list);
    });

    // Query direct referrals (Level 1)
    const refQ = query(
      collection(db, 'users'),
      where('referredBy', '==', user.id)
    );

    const unsubRef = onSnapshot(refQ, (snap) => {
      const members: User[] = [];
      snap.forEach((doc) => {
        members.push({ id: doc.id, ...doc.data() } as User);
      });
      members.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setTeamMembers(members);
      setLoading(false);
    });

    return () => {
      unsubComm();
      unsubRef();
    };
  }, [user]);

  const handleCopy = (text: string, isLink: boolean) => {
    navigator.clipboard.writeText(text);
    if (isLink) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const totalCommissionEarned = commissions.reduce((sum, c) => sum + (c.amount || 0), 0);

  // Dedicated Community settings
  const communityChat =
    settings?.communityChatLink || 'https://t.me/alphaland_investment_vip';
  const communityQr =
    settings?.communityQrUrl ||
    'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://t.me/alphaland_investment_vip';

  if (!user) {
    return (
      <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-lg mx-auto">
        <Users className="w-12 h-12 text-slate-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Team & MLM Portal</h3>
        <p className="text-slate-400 text-sm mb-6">
          Sign in to view your multi-level referral network, copy your invitation link, and track commission earnings.
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
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
      {/* Header & Stats */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950/40 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Multi-Level Referral Syndicate</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Team & MLM Earnings
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
              Earn high-tier commissions when your team joins and invests. Payouts are credited immediately to your balance.
            </p>
          </div>

          {/* Quick Stat Cards */}
          <div className="flex items-center gap-3">
            <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 text-center min-w-[120px]">
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Direct Team</div>
              <div className="text-2xl font-black text-white">{teamMembers.length}</div>
              <div className="text-[10px] text-amber-400 font-semibold">Level 1 Members</div>
            </div>

            <div className="bg-emerald-950/40 p-4 rounded-2xl border border-emerald-500/30 text-center min-w-[140px]">
              <div className="text-[10px] uppercase font-bold text-emerald-400 mb-0.5">Total Commission</div>
              <div className="text-2xl font-black text-emerald-400">
                ${totalCommissionEarned.toFixed(2)}
              </div>
              <div className="text-[10px] text-emerald-300 font-semibold">Lifetime Earned</div>
            </div>
          </div>
        </div>

        {/* Referral Link & Code Box */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-950/80 p-5 rounded-2xl border border-slate-800">
          <div className="md:col-span-7">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Your Exclusive Referral Invitation Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={refLink}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs select-all focus:outline-none"
              />
              <button
                onClick={() => handleCopy(refLink, true)}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shrink-0 transition-all active:scale-95 shadow-md shadow-amber-500/20"
              >
                {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          <div className="md:col-span-5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Referral Code
            </label>
            <div className="flex items-center gap-2">
              <div className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-amber-300 font-mono font-black text-sm tracking-widest text-center">
                {user.referralCode}
              </div>
              <button
                onClick={() => handleCopy(user.referralCode, false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shrink-0 transition-all border border-slate-700"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCode ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MLM Commission Rules & Structure */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold text-white">3-Tier Multi-Level Commission Structure</h3>
          </div>
          <span className="text-[11px] font-bold uppercase text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
            First-Plan Rule Enforced
          </span>
        </div>

        {/* Critical Specification Notice */}
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs sm:text-sm flex items-start gap-2.5">
          <ShieldCheck className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
          <p>
            <strong>First-Plan-Only Commission Rule:</strong> When a referred user purchases a plan, multi-level commissions (Level 1: 30%, Level 2: 3%, Level 3: 2%) are <strong>only</strong> paid out on their <strong>very first investment plan</strong>. Subsequent plan purchases by the same referral give zero commission to uplines.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-950/70 p-5 rounded-xl border border-slate-800">
            <div className="text-xs uppercase font-bold text-slate-400 mb-1">Level 1 (Direct)</div>
            <div className="text-3xl font-black text-amber-400 mb-1">30%</div>
            <p className="text-xs text-slate-300">
              Earn 30% of their first purchased plan. (e.g. $720 commission on Island 2400!)
            </p>
          </div>

          <div className="bg-slate-950/70 p-5 rounded-xl border border-slate-800">
            <div className="text-xs uppercase font-bold text-slate-400 mb-1">Level 2 (Secondary)</div>
            <div className="text-3xl font-black text-blue-400 mb-1">3%</div>
            <p className="text-xs text-slate-300">
              Earn 3% on the first plan purchased by friends invited by your direct referrals.
            </p>
          </div>

          <div className="bg-slate-950/70 p-5 rounded-xl border border-slate-800">
            <div className="text-xs uppercase font-bold text-slate-400 mb-1">Level 3 (Tertiary)</div>
            <div className="text-3xl font-black text-purple-400 mb-1">2%</div>
            <p className="text-xs text-slate-300">
              Earn 2% passive revenue on 3rd generation member initial investments.
            </p>
          </div>
        </div>
      </div>

      {/* PERMANENT COMMUNITY QR CODE & CHAT LINK INTEGRATION (Mandatory in Team Panel) */}
      <div className="bg-gradient-to-r from-blue-950/50 via-slate-900 to-indigo-950/50 border border-blue-500/30 p-6 sm:p-8 rounded-3xl shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-8 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-semibold">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Official Telegram & VIP Community</span>
            </div>
            <h3 className="text-2xl font-black text-white">Join the Official Alphaland Investor Chat</h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
              Stay ahead of team bonuses, participate in weekly community cash giveaways, and get immediate 24/7 priority customer support from our verified community admins.
            </p>

            <div className="pt-2">
              <a
                href={communityChat}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Join Official Community</span>
                <ExternalLink className="w-4 h-4 ml-1 opacity-80" />
              </a>
            </div>
          </div>

          <div className="md:col-span-4 flex flex-col items-center text-center">
            <div className="bg-white p-3 rounded-2xl shadow-xl border border-slate-700/60 inline-block">
              <img
                src={communityQr}
                alt="Community QR Code"
                className="w-44 h-44 object-contain rounded-xl"
              />
              <div className="mt-1.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                Official Community QR
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Team Members & Commission History Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Direct Team Members */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <h4 className="font-bold text-white text-base mb-4 flex items-center justify-between">
            <span>Direct Team Members ({teamMembers.length})</span>
            <span className="text-xs text-amber-400 font-normal">Level 1 Referrals</span>
          </h4>

          {teamMembers.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No team members yet. Share your invitation link to recruit your first affiliate!
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {teamMembers.map((m) => {
                // Mask mobile number for privacy
                const masked =
                  m.mobileNumber.length > 5
                    ? `${m.mobileNumber.slice(0, 3)}****${m.mobileNumber.slice(-3)}`
                    : m.mobileNumber;

                return (
                  <div
                    key={m.id}
                    className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-white text-sm">{masked}</div>
                      <div className="text-[10px] text-slate-400">
                        Joined:{' '}
                        {m.createdAt?.seconds
                          ? new Date(m.createdAt.seconds * 1000).toLocaleDateString()
                          : 'Recently'}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        Level 1 Direct
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Commission Logs */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <h4 className="font-bold text-white text-base mb-4 flex items-center justify-between">
            <span>MLM Commission Ledger ({commissions.length})</span>
            <span className="text-xs text-emerald-400 font-semibold">
              +${totalCommissionEarned.toFixed(2)} Total
            </span>
          </h4>

          {commissions.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No commission payouts recorded yet. Commissions appear automatically when your referrals purchase their first plan.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {commissions.map((c) => (
                <div
                  key={c.id}
                  className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-emerald-400 text-sm">+${c.amount.toFixed(2)}</div>
                    <div className="text-[10px] text-slate-400">
                      {c.planName} • Level {c.level} ({c.percentage}%)
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400">
                      {c.createdAt?.seconds
                        ? new Date(c.createdAt.seconds * 1000).toLocaleDateString()
                        : 'Just now'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
