import React from 'react';
import { AppSettings } from '../types';
import { Users, ExternalLink, X, MessageSquare, Sparkles } from 'lucide-react';

interface CommunityLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings | null;
}

export const CommunityLoginModal: React.FC<CommunityLoginModalProps> = ({
  isOpen,
  onClose,
  settings,
}) => {
  if (!isOpen) return null;

  const chatLink = settings?.communityChatLink || 'https://t.me/alphaland_investment_vip';
  const qrUrl =
    settings?.communityQrUrl ||
    'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://t.me/alphaland_investment_vip';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/30 rounded-3xl shadow-2xl p-6 sm:p-8 text-white overflow-hidden text-center">
        {/* Decorative ambient lights */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Official VIP Members Community</span>
        </div>

        <h3 className="text-2xl font-black tracking-tight text-white mb-2">
          Join Our Official Community
        </h3>
        <p className="text-xs sm:text-sm text-slate-300 max-w-xs mx-auto mb-6">
          Connect with thousands of active investors, receive daily payout announcements, investment tips, and 24/7 admin assistance.
        </p>

        {/* Dedicated Community QR Code (strictly communityQrUrl, NOT deposit QR) */}
        <div className="bg-slate-800/90 border border-slate-700/80 p-4 rounded-2xl inline-block shadow-inner mb-6">
          <div className="relative bg-white p-3 rounded-xl shadow-lg">
            <img
              src={qrUrl}
              alt="Alphaland Community QR Code"
              className="w-48 h-48 sm:w-52 sm:h-52 object-contain rounded-lg mx-auto"
            />
            <div className="mt-2 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
              Scan to Join Telegram / VIP Group
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <a
            href={chatLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98]"
          >
            <MessageSquare className="w-5 h-5" />
            <span>Join Community</span>
            <ExternalLink className="w-4 h-4 ml-1 opacity-80" />
          </a>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 text-xs sm:text-sm font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/50 transition-colors"
          >
            Close & Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
