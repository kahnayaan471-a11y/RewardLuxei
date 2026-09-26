import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Trophy,
  Share2,
  Copy,
  Check,
  Smartphone,
  Headphones,
  Shirt,
  Package,
  Truck,
  MapPin,
  CheckCircle2,
  X,
  Users,
  Flame,
  Watch,
  Armchair,
  Laptop,
  Gift,
  Crown,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { sound } from '../utils/sound';
import { GoldCoin } from './GoldCoin';
import { PhysicalPrizeClaim, GiveawayConfig } from '../types';
import { PRIZE_MILESTONES, PrizeMilestone } from '../data/prizeMilestones';
import { ReferralTimeline } from './ReferralTimeline';
import { submitPrizeClaim, subscribeToUserPrizeClaims, fetchGiveawayConfig } from '../services/coinService';

interface ReferPrizePoolViewProps {
  onBack: () => void;
  onGoToReferral?: () => void;
}

interface ClaimablePrize {
  id: string;
  type: string;
  title: string;
  isPhysical?: boolean;
}

export const ReferPrizePoolView: React.FC<ReferPrizePoolViewProps> = ({
  onBack
}) => {
  const { profile } = useAuth();
  const [copied, setCopied] = useState(false);

  // Address & Payout modal for prizes
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressPrize, setAddressPrize] = useState<ClaimablePrize | null>(null);
  const [fullName, setFullName] = useState(profile?.displayName || '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [upiId, setUpiId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Paytm' | 'PhonePe' | 'Google Pay'>('UPI');
  const [tshirtSize, setTshirtSize] = useState<'S' | 'M' | 'L' | 'XL' | 'XXL'>('L');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [claimSuccess, setClaimSuccess] = useState(false);

  // Dynamic round calculation based on current week
  const roundNumber = useMemo(() => {
    const epoch = new Date('2026-01-01').getTime();
    const diffWeeks = Math.floor((Date.now() - epoch) / (7 * 24 * 60 * 60 * 1000));
    return Math.max(1, diffWeeks + 1);
  }, []);

  // Track user claimed physical prizes with real-time subscription
  const physicalClaimsStorageKey = `refer_physical_claims_${profile?.uid || 'guest'}`;
  const [savedClaims, setSavedClaims] = useState<PhysicalPrizeClaim[]>(() => {
    try {
      const stored = localStorage.getItem(physicalClaimsStorageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  React.useEffect(() => {
    if (!profile?.uid) return;
    const unsub = subscribeToUserPrizeClaims(profile.uid, (claims) => {
      setSavedClaims(claims);
    });
    return () => unsub();
  }, [profile?.uid]);

  const [giveawayConfig, setGiveawayConfig] = useState<GiveawayConfig | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    fetchGiveawayConfig().then(cfg => {
      if (isMounted) setGiveawayConfig(cfg);
    }).catch(() => {});

    const handleUpdate = (e: CustomEvent) => {
      if (e.detail && isMounted) setGiveawayConfig(e.detail);
    };
    window.addEventListener('giveaway_config_updated' as any, handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('giveaway_config_updated' as any, handleUpdate);
    };
  }, []);

  const currentReferrals = profile?.referralCount || 0;
  const maxReferrals = 100;

  // Next milestone calculation
  const nextMilestone = useMemo(() => {
    return PRIZE_MILESTONES.find((m) => currentReferrals < m.referralsRequired) || null;
  }, [currentReferrals]);

  const handleCopy = () => {
    if (!profile?.referralCode) return;
    navigator.clipboard.writeText(profile.referralCode);
    setCopied(true);
    sound.playCoinSound();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (!profile?.referralCode) return;
    const shareText = `🔥 Refer Prize Pool Me Gaming Laptop, Apple Watch, iPhone 16 Pro, Gaming Chair, AirBuds, Branded T-Shirts, ₹100 & ₹50 Real Cash jeeto! Use code: ${profile.referralCode} to get 100 instant bonus coins! Join now: ${window.location.origin}`;
    if (navigator.share) {
      navigator.share({
        title: 'Rewardluxe - Refer Prize Pool: Laptop, iPhone, Apple Watch, Gaming Chair & Cash',
        text: shareText,
        url: window.location.origin
      }).catch(() => {});
    } else {
      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  // Submit prize claim (physical address or cash UPI payout) to admin
  const handleSubmitAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressPrize || !profile?.uid) return;

    try {
      const isCash = addressPrize.isPhysical === false;

      await submitPrizeClaim({
        userId: profile.uid,
        userName: fullName.trim() || profile.displayName || 'Winner',
        userPhone: phoneNumber.trim(),
        prizeType: addressPrize.type as any,
        prizeTitle: addressPrize.title,
        tshirtSize: addressPrize.type === 'tshirt' ? tshirtSize : undefined,
        shippingAddress: isCash
          ? `UPI/Wallet: ${upiId.trim()} (${paymentMethod})`
          : deliveryAddress.trim(),
        city: isCash ? 'Instant Payout' : city.trim(),
        state: isCash ? paymentMethod : state.trim(),
        pincode: isCash ? '000000' : pincode.trim()
      });

      setClaimSuccess(true);
      sound.playWin();
      setTimeout(() => {
        setClaimSuccess(false);
        setShowAddressModal(false);
        setAddressPrize(null);
      }, 2500);
    } catch (err) {
      console.error('Failed to submit claim:', err);
    }
  };

  const getPrizeIcon = (type: string, className: string = 'w-6 h-6') => {
    switch (type) {
      case 'iphone':
        return <Smartphone className={className} />;
      case 'laptop':
        return <Laptop className={className} />;
      case 'smartwatch':
        return <Watch className={className} />;
      case 'gaming_chair':
        return <Armchair className={className} />;
      case 'airbuds':
        return <Headphones className={className} />;
      case 'tshirt':
        return <Shirt className={className} />;
      case 'cash_100':
      case 'cash_50':
        return <GoldCoin className={className} />;
      default:
        return <Trophy className={className} />;
    }
  };

  return (
    <div className="space-y-4 pb-28 max-w-xl mx-auto text-slate-900">
      {/* 1. Header */}
      <div className="flex items-center justify-between bg-white rounded-3xl p-4 shadow-sm border border-slate-100">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700 hover:bg-slate-200 active:scale-95 transition-all cursor-pointer"
            aria-label="Back to Profile"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-display font-black text-lg text-slate-900 tracking-tight">
              Refer Prize Pool
            </h2>
          </div>
        </div>
      </div>

      {/* Official Giveaway & Prize Pool Winner Banner */}
      {giveawayConfig?.winnerName && (
        <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 p-4 rounded-3xl shadow-lg border border-amber-300 relative overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center font-black shrink-0 shadow-md">
              <Crown className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="bg-slate-950 text-amber-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider">
                  🏆 Prize Pool Winner Declared
                </span>
              </div>
              <h3 className="font-display font-black text-base leading-tight mt-1 text-slate-950">
                🎉 Mubarak Ho, {giveawayConfig.winnerName}!
              </h3>
              <p className="text-xs text-slate-900 font-medium">
                Won: <strong className="font-black">{giveawayConfig.winnerPrize || giveawayConfig.title}</strong>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. Referral Code Quick Share & Copy Card */}
      <div className="flex items-center justify-between p-4 rounded-3xl bg-white border border-slate-100 shadow-sm">
        <div className="min-w-0 pr-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Aapka Referral Code</span>
          <span className="font-mono font-black text-base text-slate-900 tracking-wider">
            {profile?.referralCode || 'COIN-XXXX'}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="py-2.5 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 active:scale-95 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <Share2 className="w-4 h-4" />
            <span>Share &amp; Invite</span>
          </button>
        </div>
      </div>

      {/* 3. VERTICAL STRAIGHT LINE (|) - Refer karne se badhegi, sirf prizepool aur kitne refer karna hai */}
      <ReferralTimeline
        currentReferrals={currentReferrals}
        savedClaims={savedClaims}
        onClaimAddress={(item) => {
          setAddressPrize({
            id: item.id,
            title: item.name,
            type: item.type,
            isPhysical: item.isPhysical
          });
          setShowAddressModal(true);
        }}
      />

      {/* 5. Claimed Physical Rewards List (if any) */}
      {savedClaims.length > 0 && (
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-3">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            <h4 className="font-display font-black text-sm text-slate-900">
              Aapke Claim Kiye Huye Rewards ({savedClaims.length})
            </h4>
          </div>

          <div className="space-y-2">
            {savedClaims.map((claim) => (
              <div
                key={claim.id}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-2 text-xs"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                      {getPrizeIcon(claim.prizeType, 'w-4 h-4 text-white')}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">
                        {claim.prizeTitle} {claim.tshirtSize ? `(Size: ${claim.tshirtSize})` : ''}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {claim.shippingAddress}, {claim.city} ({claim.pincode})
                      </div>
                    </div>
                  </div>

                  {claim.status === 'approved' && (
                    <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-300 shrink-0">
                      ✅ Approved
                    </span>
                  )}
                  {claim.status === 'rejected' && (
                    <span className="text-[10px] font-black uppercase bg-rose-100 text-rose-800 px-2.5 py-1 rounded-full border border-rose-300 shrink-0">
                      ❌ Rejected
                    </span>
                  )}
                  {(claim.status === 'pending' || claim.status === 'submitted') && (
                    <span className="text-[10px] font-black uppercase bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full border border-amber-300 shrink-0">
                      ⏳ Pending Admin Review
                    </span>
                  )}
                  {(claim.status === 'shipped' || claim.status === 'processing') && (
                    <span className="text-[10px] font-black uppercase bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-full border border-indigo-300 shrink-0">
                      🚚 Dispatched / Shipped
                    </span>
                  )}
                  {claim.status === 'delivered' && (
                    <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-300 shrink-0">
                      📦 Delivered
                    </span>
                  )}
                </div>

                {claim.adminNotes && (
                  <div className="text-[11px] bg-white p-2 rounded-xl border border-slate-200 text-slate-600">
                    <span className="font-bold text-slate-900">Admin Note:</span> {claim.adminNotes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Doorstep Delivery Address Modal */}
      <AnimatePresence>
        {showAddressModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 max-w-md w-full relative space-y-4 my-8"
            >
              <button
                type="button"
                onClick={() => setShowAddressModal(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xl shadow-md shrink-0">
                  {addressPrize ? getPrizeIcon(addressPrize.type, 'w-6 h-6 text-slate-950') : <Package className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="font-display font-black text-lg text-slate-900">
                    {addressPrize?.isPhysical === false ? 'Instant UPI / Cash Payout' : 'Courier Delivery Address'}
                  </h3>
                  <p className="text-xs text-amber-700 font-bold">
                    {addressPrize?.title || 'Prize Won!'}
                  </p>
                </div>
              </div>

              {claimSuccess ? (
                <div className="py-6 text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-display font-black text-lg text-slate-900">
                      Claim Request Submitted!
                    </h4>
                    <p className="text-xs text-slate-600 max-w-xs mx-auto mt-1">
                      {addressPrize?.isPhysical === false
                        ? 'Aapki UPI payout request admin ko bhej di gayi hai. Direct transfer jald process hoga!'
                        : 'Aapka courier address save ho gaya hai. Dispatch team jald express courier se bhejegi.'}
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitAddress} className="space-y-3 text-xs">
                  {addressPrize?.isPhysical === false ? (
                    <>
                      <p className="text-slate-500 text-[11px]">
                        Apna UPI ID ya Mobile Number dalein jisme cash payout recieve karna hai:
                      </p>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Full Name:</label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Account Holder Name"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Mobile / WhatsApp Number:</label>
                        <input
                          type="tel"
                          required
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="10-digit mobile number"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Select Payment Method:</label>
                        <div className="grid grid-cols-2 gap-2">
                          {(['UPI', 'Paytm', 'PhonePe', 'Google Pay'] as const).map((method) => (
                            <button
                              key={method}
                              type="button"
                              onClick={() => setPaymentMethod(method)}
                              className={`py-2 px-3 rounded-xl font-black text-xs border transition-all cursor-pointer ${
                                paymentMethod === method
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {method}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Enter {paymentMethod} ID or Mobile Number:
                        </label>
                        <input
                          type="text"
                          required
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          placeholder={paymentMethod === 'UPI' ? 'example@upi or 9876543210@ybl' : 'Registered Mobile Number'}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-display font-black text-xs shadow-lg shadow-emerald-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
                      >
                        <Trophy className="w-4 h-4 text-slate-950" />
                        <span>Confirm &amp; Submit Cash Payout Claim</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-slate-500 text-[11px]">
                        Apna delivery address bharein jahan aap prize mangwana chahte hain:
                      </p>

                      {addressPrize?.type === 'tshirt' && (
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">
                            Select T-Shirt Size:
                          </label>
                          <div className="grid grid-cols-5 gap-2">
                            {(['S', 'M', 'L', 'XL', 'XXL'] as const).map((size) => (
                              <button
                                key={size}
                                type="button"
                                onClick={() => setTshirtSize(size)}
                                className={`py-2 rounded-xl font-black text-xs border transition-all cursor-pointer ${
                                  tshirtSize === size
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {size}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Full Name:</label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Receiver's name"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Mobile / WhatsApp Number:</label>
                        <input
                          type="tel"
                          required
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="10-digit mobile number"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Full Delivery Address:</label>
                        <textarea
                          required
                          rows={2}
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          placeholder="House/Flat No., Street, Landmark"
                          className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">City:</label>
                          <input
                            type="text"
                            required
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="City"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">State:</label>
                          <input
                            type="text"
                            required
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                            placeholder="State"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Pincode:</label>
                          <input
                            type="text"
                            required
                            maxLength={6}
                            value={pincode}
                            onChange={(e) => setPincode(e.target.value)}
                            placeholder="6 Digits"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-display font-black text-xs shadow-lg shadow-amber-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
                      >
                        <Truck className="w-4 h-4" />
                        <span>Confirm Delivery Address</span>
                      </button>
                    </>
                  )}
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default ReferPrizePoolView;
