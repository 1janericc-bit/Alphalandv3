import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './lib/firebase';
import { User, AppSettings } from './types';
import { getAppSettings, getUserById } from './services/dbService';

import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { CommunityLoginModal } from './components/CommunityLoginModal';
import { InvestmentsPanel } from './components/InvestmentsPanel';
import { MyContractsPanel } from './components/MyContractsPanel';
import { WalletPanel } from './components/WalletPanel';
import { TeamPanel } from './components/TeamPanel';
import { MissionsPanel } from './components/MissionsPanel';
import { CouponPanel } from './components/CouponPanel';
import { RouletteGamePanel } from './components/RouletteGamePanel';
import { AdminPortal } from './components/AdminPortal';

import {
  Building2,
  Clock,
  Wallet,
  Users,
  Trophy,
  Ticket,
  Coins,
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [activeTab, setActiveTab] = useState<string>('invest');

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCommunityPopupOpen, setIsCommunityPopupOpen] = useState(false);

  // Secret admin route detector (/admin or #admin)
  const [isAdminRoute, setIsAdminRoute] = useState(false);

  // Check URL path or hash for /admin on boot and upon history changes
  useEffect(() => {
    const checkAdminPath = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      const search = window.location.search;
      if (
        path === '/admin' ||
        path.startsWith('/admin/') ||
        hash === '#admin' ||
        search.includes('route=admin')
      ) {
        setIsAdminRoute(true);
      } else {
        setIsAdminRoute(false);
      }
    };

    checkAdminPath();
    window.addEventListener('popstate', checkAdminPath);
    window.addEventListener('hashchange', checkAdminPath);
    return () => {
      window.removeEventListener('popstate', checkAdminPath);
      window.removeEventListener('hashchange', checkAdminPath);
    };
  }, []);

  // Subscribe to Global App Settings in real time from Firestore
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'settings', 'appConfig'),
      (docSnap) => {
        if (docSnap.exists()) {
          setSettings(docSnap.data() as AppSettings);
        } else {
          // Initialize defaults if not existing
          getAppSettings().then(setSettings);
        }
      },
      (err) => {
        console.error('Settings listener error:', err);
      }
    );

    return () => unsub();
  }, []);

  // Restore active user session from memory / sessionStorage UID (NO balance caching!)
  useEffect(() => {
    const sessionUid = sessionStorage.getItem('alphaland_session_uid');
    if (sessionUid) {
      getUserById(sessionUid).then((u) => {
        if (u) setUser(u);
      });
    }
  }, []);

  // Listen in real time to the logged-in User's document (balance, claims, etc.)
  useEffect(() => {
    if (!user?.id) return;

    const unsubUser = onSnapshot(
      doc(db, 'users', user.id),
      (snap) => {
        if (snap.exists()) {
          setUser({ id: snap.id, ...snap.data() } as User);
        }
      },
      (err) => {
        console.error('User listener error:', err);
      }
    );

    return () => unsubUser();
  }, [user?.id]);

  const handleAuthSuccess = (authenticatedUser: User, isNewLogin: boolean) => {
    setUser(authenticatedUser);
    sessionStorage.setItem('alphaland_session_uid', authenticatedUser.id);

    // Prompt Specification: "Every time a user successfully logs in, a modal automatically pops up displaying the dedicated Community QR Code and Community Chat Link."
    if (isNewLogin) {
      setIsCommunityPopupOpen(true);
    }
  };

  const handleLogout = () => {
    setUser(null);
    sessionStorage.removeItem('alphaland_session_uid');
    setActiveTab('invest');
  };

  const handleExitAdmin = () => {
    setIsAdminRoute(false);
    window.history.pushState({}, '', '/');
  };

  // If secret admin route /admin is navigated to, render the Admin Portal
  if (isAdminRoute) {
    return (
      <AdminPortal
        settings={settings}
        onRefreshSettings={() => getAppSettings().then(setSettings)}
        onExitAdmin={handleExitAdmin}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950 pb-20 md:pb-8">
      {/* Top Navbar */}
      <Navbar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'invest' && (
          <InvestmentsPanel
            user={user}
            onOpenAuth={() => setIsAuthOpen(true)}
            onGoToWallet={() => setActiveTab('wallet')}
            onPlanPurchased={() => setActiveTab('my-contracts')}
          />
        )}

        {activeTab === 'my-contracts' && (
          <MyContractsPanel
            user={user}
            onGoToInvest={() => setActiveTab('invest')}
            onGoToRoulette={() => setActiveTab('roulette')}
            onRefreshUser={() => {
              if (user) getUserById(user.id).then((u) => u && setUser(u));
            }}
          />
        )}

        {activeTab === 'roulette' && (
          <RouletteGamePanel
            user={user}
            onOpenAuth={() => setIsAuthOpen(true)}
            onGoToWallet={() => setActiveTab('wallet')}
            onRefreshUser={() => {
              if (user) getUserById(user.id).then((u) => u && setUser(u));
            }}
          />
        )}

        {activeTab === 'wallet' && (
          <WalletPanel
            user={user}
            settings={settings}
            onOpenAuth={() => setIsAuthOpen(true)}
            onGoToInvest={() => setActiveTab('invest')}
            onRefreshUser={() => {
              if (user) getUserById(user.id).then((u) => u && setUser(u));
            }}
          />
        )}

        {activeTab === 'team' && (
          <TeamPanel
            user={user}
            settings={settings}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        )}

        {activeTab === 'missions' && (
          <MissionsPanel
            user={user}
            onOpenAuth={() => setIsAuthOpen(true)}
            onRefreshUser={() => {
              if (user) getUserById(user.id).then((u) => u && setUser(u));
            }}
            onGoToTeam={() => setActiveTab('team')}
          />
        )}

        {activeTab === 'coupon' && (
          <CouponPanel
            user={user}
            onOpenAuth={() => setIsAuthOpen(true)}
            onRefreshUser={() => {
              if (user) getUserById(user.id).then((u) => u && setUser(u));
            }}
          />
        )}
      </main>

      {/* Mobile Bottom Dock Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-2 py-1 flex items-center justify-around shadow-2xl">
        {[
          { id: 'invest', label: 'Invest', icon: Building2 },
          { id: 'my-contracts', label: 'Contracts', icon: Clock },
          { id: 'roulette', label: 'Roulette', icon: Coins },
          { id: 'wallet', label: 'Wallet', icon: Wallet },
          { id: 'team', label: 'Team', icon: Users },
          { id: 'missions', label: 'Missions', icon: Trophy },
          { id: 'coupon', label: 'Coupon', icon: Ticket },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center py-1.5 px-2 rounded-xl transition-all ${
                isActive ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''}`} />
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Auth Modal (Login / Register) */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Mandatory Community Login Popup Modal */}
      <CommunityLoginModal
        isOpen={isCommunityPopupOpen}
        onClose={() => setIsCommunityPopupOpen(false)}
        settings={settings}
      />
    </div>
  );
}
