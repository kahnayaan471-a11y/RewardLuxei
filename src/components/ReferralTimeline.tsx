import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Trophy,
  Check,
  MapPin,
  Flame,
  Smartphone,
  Headphones,
  Shirt,
  IndianRupee,
  Rocket,
  Watch,
  Armchair,
  Laptop
} from 'lucide-react';
import { PRIZE_MILESTONES, PrizeMilestone } from '../data/prizeMilestones';
import { useAuth } from '../context/AuthContext';

import { PhysicalPrizeClaim } from '../types';

interface ReferralTimelineProps {
  currentReferrals: number;
  onClaimAddress?: (prize: PrizeMilestone) => void;
  savedClaims?: PhysicalPrizeClaim[];
  showTitle?: boolean;
}

export const ReferralTimeline: React.FC<ReferralTimelineProps> = ({
  currentReferrals: initialReferrals,
  onClaimAddress,
  savedClaims = [],
  showTitle = true
}) => {
  const { profile } = useAuth();
  const currentReferrals = profile?.referralCount ?? initialReferrals ?? 0;

  // Calculate next target milestone
  const nextMilestone = useMemo(() => {
    return PRIZE_MILESTONES.find((m) => currentReferrals < m.referralsRequired) || null;
  }, [currentReferrals]);

  // Unified line fill percentage from 0 to 100 across the 8 milestones
  // Segment 1 (0 -> 100):       0% to 12.5%
  // Segment 2 (100 -> 200):     12.5% to 25%
  // Segment 3 (200 -> 300):     25% to 37.5%
  // Segment 4 (300 -> 500):     37.5% to 50%
  // Segment 5 (500 -> 10000):   50% to 62.5% (Gaming Chair - 10000 Refer)
  // Segment 6 (10000 -> 20000): 62.5% to 75% (Smart Watch - 20000 Refer)
  // Segment 7 (20000 -> 30000): 75% to 87.5% (Gaming Laptop - 30000 Refer)
  // Segment 8 (30000 -> 40000): 87.5% to 100% (iPhone 16 Pro - 40000 Refer)
  const lineFillPercent = useMemo(() => {
    if (currentReferrals <= 0) return 0;
    if (currentReferrals >= 40000) return 100;

    const milestones = [
      { req: 0, pct: 0 },
      { req: 100, pct: 12.5 },
      { req: 200, pct: 25 },
      { req: 300, pct: 37.5 },
      { req: 500, pct: 50 },
      { req: 10000, pct: 62.5 },
      { req: 20000, pct: 75 },
      { req: 30000, pct: 87.5 },
      { req: 40000, pct: 100 }
    ];

    for (let i = 0; i < milestones.length - 1; i++) {
      const p1 = milestones[i];
      const p2 = milestones[i + 1];
      if (currentReferrals >= p1.req && currentReferrals <= p2.req) {
        const ratio = (currentReferrals - p1.req) / (p2.req - p1.req);
        return p1.pct + ratio * (p2.pct - p1.pct);
      }
    }
    return 100;
  }, [currentReferrals]);

  const getPrizeIcon = (type: PrizeMilestone['type'], className = 'w-5 h-5') => {
    switch (type) {
      case 'cash_50':
      case 'cash_100':
        return <IndianRupee className={className} />;
      case 'tshirt':
        return <Shirt className={className} />;
      case 'airbuds':
        return <Headphones className={className} />;
      case 'gaming_chair':
        return <Armchair className={className} />;
      case 'smartwatch':
        return <Watch className={className} />;
      case 'laptop':
        return <Laptop className={className} />;
      case 'iphone':
        return <Smartphone className={className} />;
      default:
        return <Trophy className={className} />;
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-100 space-y-4">
      {/* Header section */}
      {showTitle && (
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-2xs">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-black text-base sm:text-lg text-slate-900 leading-tight">
                Prize Pool Milestones
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full shrink-0 shadow-2xs">
            <Flame className="w-4 h-4 text-amber-600 animate-pulse" />
            <span className="font-display font-black text-xs text-amber-900">
              {currentReferrals} Referrals
            </span>
          </div>
        </div>
      )}

      {/* Vertical Timeline Container */}
      <div className="relative pl-10 sm:pl-12 py-2">
        {/* Background straight vertical line (|) */}
        <div className="absolute left-4 sm:left-[18px] top-4 bottom-5 w-1.5 bg-slate-200 rounded-full -translate-x-1/2" />

        {/* Animated Active vertical line (|) that stretches down as referrals grow */}
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: `${lineFillPercent}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="absolute left-4 sm:left-[18px] top-4 w-1.5 bg-gradient-to-b from-amber-400 via-yellow-400 to-emerald-500 rounded-full -translate-x-1/2 z-0 shadow-xs"
          style={{ maxHeight: 'calc(100% - 24px)' }}
        />

        {/* 1. START POINT (0 Referrals) */}
        <div className="relative flex items-center mb-5">
          <div
            className={`absolute -left-10 sm:-left-12 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center border-2 transition-all z-10 ${
              currentReferrals > 0
                ? 'bg-emerald-500 border-white text-white shadow-md ring-2 ring-emerald-200'
                : 'bg-amber-500 border-white text-slate-950 shadow-md ring-2 ring-amber-200 animate-pulse'
            }`}
          >
            <Rocket className="w-4 h-4" />
          </div>

          <div className="w-full p-2.5 sm:p-3 rounded-2xl border bg-slate-50/90 border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-xs text-slate-800">
                Start Point (0 Refer)
              </span>
            </div>
            <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
              Yahan se shuru karein
            </span>
          </div>
        </div>

        {/* 2. THE 5 MILESTONES */}
        {PRIZE_MILESTONES.map((item, index) => {
          const isUnlocked = currentReferrals >= item.referralsRequired;
          const remaining = Math.max(0, item.referralsRequired - currentReferrals);
          const prevReq = index === 0 ? 0 : PRIZE_MILESTONES[index - 1].referralsRequired;
          const nodeProgress = isUnlocked
            ? 100
            : currentReferrals <= prevReq
            ? 0
            : Math.min(100, Math.round(((currentReferrals - prevReq) / (item.referralsRequired - prevReq)) * 100));

          return (
            <div key={item.id} className="relative flex items-center mb-5 last:mb-0">
              {/* Check if user already claimed this milestone */}
              {(() => {
                const existingClaim = savedClaims.find((c) => c.prizeType === item.type);

                return (
                  <>
                    {/* Node Circle centered right on top of the vertical line */}
                    <div
                      className={`absolute -left-10 sm:-left-12 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center border-2 transition-all z-10 ${
                        isUnlocked
                          ? 'bg-emerald-500 border-white text-white shadow-md ring-2 ring-emerald-200'
                          : nodeProgress > 0
                          ? 'bg-amber-500 border-white text-slate-950 shadow-md ring-2 ring-amber-200 animate-pulse'
                          : 'bg-white border-slate-300 text-slate-400 shadow-2xs'
                      }`}
                    >
                      {isUnlocked ? (
                        <Check className="w-4 h-4 text-white stroke-[3]" />
                      ) : (
                        <span className="font-display font-black text-xs">
                          {index + 1}
                        </span>
                      )}
                    </div>

                    {/* Milestone Card */}
                    <div
                      className={`w-full p-3 sm:p-3.5 rounded-2xl border transition-all ${
                        isUnlocked
                          ? 'bg-emerald-50/80 border-emerald-300 shadow-xs'
                          : nodeProgress > 0
                          ? 'bg-amber-50/60 border-amber-300/80 shadow-xs'
                          : 'bg-slate-50/80 border-slate-200/80'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2.5">
                        {/* Icon & Title */}
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                              isUnlocked
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-900 text-amber-400'
                            }`}
                          >
                            {getPrizeIcon(item.type, 'w-5 h-5')}
                          </div>
                          <div className="min-w-0">
                            <div className="font-display font-black text-sm text-slate-900 truncate">
                              {item.name}
                            </div>
                            <div className="text-[11px] font-semibold text-slate-500">
                              {item.rewardValue}
                            </div>
                          </div>
                        </div>

                        {/* Target & Action Badge */}
                        <div className="text-right shrink-0">
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900 text-white text-xs font-black shadow-2xs">
                            <span>{item.referralsRequired.toLocaleString()}</span>
                            <span className="text-[10px] font-bold text-amber-400">Refer</span>
                          </div>

                          <div className="mt-1">
                            {isUnlocked ? (
                              existingClaim ? (
                                existingClaim.status === 'approved' ? (
                                  <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full inline-block">
                                    ✅ Approved
                                  </span>
                                ) : existingClaim.status === 'rejected' ? (
                                  <button
                                    type="button"
                                    onClick={() => onClaimAddress && onClaimAddress(item)}
                                    className="px-2.5 py-0.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white active:scale-95 text-[10px] font-black inline-flex items-center gap-1 cursor-pointer shadow-xs"
                                  >
                                    ❌ Retry Claim
                                  </button>
                                ) : existingClaim.status === 'shipped' || existingClaim.status === 'processing' ? (
                                  <span className="text-[10px] font-black text-indigo-800 bg-indigo-100 border border-indigo-300 px-2 py-0.5 rounded-full inline-block">
                                    🚚 Dispatched
                                  </span>
                                ) : existingClaim.status === 'delivered' ? (
                                  <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full inline-block">
                                    📦 Delivered
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-black text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full inline-block">
                                    ⏳ Pending
                                  </span>
                                )
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => onClaimAddress && onClaimAddress(item)}
                                  className={`px-3 py-1 rounded-xl text-xs font-black inline-flex items-center gap-1 shadow-md active:scale-95 cursor-pointer animate-bounce ${
                                    item.isPhysical
                                      ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950'
                                      : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white'
                                  }`}
                                >
                                  {item.isPhysical ? (
                                    <>
                                      <MapPin className="w-3 h-3" />
                                      <span>Claim Address</span>
                                    </>
                                  ) : (
                                    <>
                                      <Trophy className="w-3 h-3 text-yellow-200" />
                                      <span>Claim Payout</span>
                                    </>
                                  )}
                                </button>
                              )
                            ) : (
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full inline-block">
                                {remaining.toLocaleString()} refer baaki
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Progress bar inside card for current target */}
                      {!isUnlocked && nodeProgress > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-200/70 flex items-center justify-between text-[10px] font-bold text-slate-500">
                          <span>Target: {currentReferrals.toLocaleString()}/{item.referralsRequired.toLocaleString()} Refer</span>
                          <span className="text-amber-700">{nodeProgress}%</span>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
};
