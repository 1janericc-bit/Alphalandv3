import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { MISSIONS } from '../constants/plans';
import { getDirectActiveReferralsCount, claimMission } from '../services/dbService';
import {
  Trophy,
  CheckCircle2,
  AlertCircle,
  Gift,
  ArrowRight,
  Sparkles,
  Users,
  ShieldCheck,
} from 'lucide-react';

interface MissionsPanelProps {
  user: User | null;
  onOpenAuth: () => void;
  onRefreshUser: () => void;
  onGoToTeam: () => void;
}

export const MissionsPanel: React.FC<MissionsPanelProps> = ({
  user,
  onOpenAuth,
  onRefreshUser,
  onGoToTeam,
}) => {
  const [activeReferrals, setActiveReferrals] = useState(0);
  const [loadingCount, setLoadingCount] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoadingCount(false);
      return;
    }

    let isMounted = true;
    const fetchCount = async () => {
      try {
        const count = await getDirectActiveReferralsCount(user.id);
        if (isMounted) {
          setActiveReferrals(count);
          setLoadingCount(false);
        }
      } catch (err) {
        console.error('Error fetching referral count:', err);
        if (isMounted) setLoadingCount(false);
      }
    };

    fetchCount();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleClaim = async (missionId: string) => {
    if (!user) {
      onOpenAuth();
      return;
    }
    setError(null);
    setSuccess(null);
    setClaimingId(missionId);

    try {
      const reward = await claimMission(user.id, missionId, activeReferrals);
      setSuccess(`Congratulations! Reward of $${reward.toFixed(2)} credited to your wallet!`);
      onRefreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim reward.');
    } finally {
      setClaimingId(null);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-lg mx-auto">
        <Trophy className="w-12 h-12 text-slate-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Missions & Achievements</h3>
        <p className="text-slate-400 text-sm mb-6">
          Sign in to view recruitment milestones and claim cash rewards for building your investor syndicate.
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

  const claimedMissions = user.claimedMissions || [];

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950/40 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Recruitment Milestone Rewards</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            VIP Syndicate Missions
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md">
            Invite friends to invest in real estate plans and unlock cumulative cash bonuses!
          </p>
        </div>

        <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 text-center min-w-[160px]">
          <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Active Referrals</div>
          <div className="text-3xl font-black text-amber-400">
            {loadingCount ? '...' : activeReferrals}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">Invites with Plan</div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-emerald-300 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Missions Cards */}
      <div className="space-y-4">
        {MISSIONS.map((mission) => {
          const isClaimed = claimedMissions.includes(mission.id);
          const progressPercent = Math.min(
            100,
            Math.round((activeReferrals / mission.requiredInvites) * 100)
          );
          const isEligible = activeReferrals >= mission.requiredInvites && !isClaimed;

          return (
            <div
              key={mission.id}
              className={`bg-slate-900 border rounded-2xl p-6 transition-all ${
                isClaimed
                  ? 'border-emerald-500/30 opacity-80'
                  : isEligible
                  ? 'border-amber-500 shadow-lg shadow-amber-500/10'
                  : 'border-slate-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">{mission.title}</h3>
                    {isClaimed && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Claimed</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300">{mission.description}</p>

                  {/* Progress info */}
                  <div className="pt-2">
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Progress:</span>
                      <span className="font-bold text-white">
                        {activeReferrals} / {mission.requiredInvites} active referrals
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isClaimed
                            ? 'bg-emerald-500'
                            : 'bg-gradient-to-r from-amber-500 to-yellow-400'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Reward & Action */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 shrink-0 sm:min-w-[140px]">
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Reward</div>
                    <div className="text-2xl font-black text-amber-400">+${mission.reward}</div>
                  </div>

                  {isClaimed ? (
                    <button
                      disabled
                      className="px-4 py-2 bg-slate-800 text-emerald-400 font-bold text-xs rounded-xl cursor-default flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Reward Received</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleClaim(mission.id)}
                      disabled={!isEligible || claimingId === mission.id}
                      className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 ${
                        isEligible
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-amber-500/20 cursor-pointer'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {claimingId === mission.id ? (
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Gift className="w-4 h-4" />
                          <span>{isEligible ? 'Claim Reward' : `${mission.requiredInvites - activeReferrals} More Needed`}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Share / Invite Call to Action */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Need more active referrals?</h4>
            <p className="text-xs text-slate-400">Share your exclusive link in the Team & MLM portal.</p>
          </div>
        </div>

        <button
          onClick={onGoToTeam}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-1.5 shrink-0"
        >
          <span>Open Team Panel</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
