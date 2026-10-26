import React from 'react';
import { User } from '../types';
import { Building2, Wallet, LogOut, Copy, Check, ShieldCheck, Sparkles } from 'lucide-react';

interface NavbarProps {
  user: User | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  setActiveTab,
  onLogout,
  onOpenAuth,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopyRef = () => {
    if (!user) return;
    navigator.clipboard.writeText(user.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div
            onClick={() => setActiveTab('invest')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <Building2 className="w-6 h-6 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                  ALPHALAND
                </span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/30">
                  VIP
                </span>
              </div>
              <p className="text-[10px] text-slate-400 tracking-wider uppercase font-medium">
                Premium Real Estate Investment
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          {user && (
            <nav className="hidden md:flex items-center gap-1">
              {[
                { id: 'invest', label: 'Investments' },
                { id: 'my-contracts', label: 'My Contracts' },
                { id: 'wallet', label: 'Wallet' },
                { id: 'team', label: 'Team & MLM' },
                { id: 'missions', label: 'Missions' },
                { id: 'coupon', label: 'Coupon' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          )}

          {/* User info or Login */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Live Real-Time Wallet Balance */}
                <div
                  onClick={() => setActiveTab('wallet')}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-500/40 cursor-pointer hover:border-emerald-400 transition-all shadow-sm"
                  title="Click to manage Wallet"
                >
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-semibold text-emerald-400 leading-tight">
                      Balance
                    </div>
                    <div className="text-sm sm:text-base font-bold text-white tracking-wide">
                      ₱{user.balance.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Referral Code Quick Copy */}
                <button
                  onClick={handleCopyRef}
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 transition-all"
                  title="Click to copy your Referral Code"
                >
                  <span className="text-slate-400 font-mono text-[11px]">Ref:</span>
                  <span className="font-bold text-amber-300">{user.referralCode}</span>
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>

                {/* Logout Button */}
                <button
                  onClick={onLogout}
                  className="p-2 rounded-lg bg-slate-800/80 hover:bg-rose-950/50 hover:text-rose-400 text-slate-400 border border-slate-700/60 transition-all"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-sm shadow-md shadow-amber-500/20 transition-all active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>Login / Register</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
