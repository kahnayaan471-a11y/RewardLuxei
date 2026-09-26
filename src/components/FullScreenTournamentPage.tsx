import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Gamepad2,
  Trophy,
  Users,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
  ExternalLink,
  Coins
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  FreeFireTournament,
  TournamentParticipant,
  TournamentFormat,
  TournamentStatus
} from '../types';
import {
  fetchTournaments,
  subscribeToTournaments,
  fetchTournamentParticipants,
  joinFreeFireTournament,
  fetchUserAllTournamentRegistrations
} from '../services/coinService';
import { GoldCoin } from './GoldCoin';

interface FullScreenTournamentPageProps {
  onClose: () => void;
  onOpenAuth: () => void;
  onOpenWithdraw: () => void;
  onOpenTasks?: () => void;
}

export const FullScreenTournamentPage: React.FC<FullScreenTournamentPageProps> = ({
  onClose,
  onOpenAuth,
  onOpenWithdraw,
  onOpenTasks
}) => {
  const { profile } = useAuth();

  const [tournaments, setTournaments] = useState<FreeFireTournament[]>([]);
  const [loading, setLoading] = useState(true);

  // User's own registered participant records
  const [myRegistrations, setMyRegistrations] = useState<Record<string, TournamentParticipant>>({});

  // Join Tournament Modal State
  const [selectedTournamentToJoin, setSelectedTournamentToJoin] = useState<FreeFireTournament | null>(null);
  const [freeFireNameInput, setFreeFireNameInput] = useState('');
  const [freeFireUidInput, setFreeFireUidInput] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccessData, setJoinSuccessData] = useState<{ slotNumber: number; fee: number } | null>(null);

  // Participants View Modal
  const [viewingParticipantsTourney, setViewingParticipantsTourney] = useState<FreeFireTournament | null>(null);
  const [participantsList, setParticipantsList] = useState<TournamentParticipant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  // Room Credentials Copy Feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Rules Expand/Collapse
  const [rulesExpanded, setRulesExpanded] = useState<string | null>(null);

  // Pre-fill freeFireName if previously saved
  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      const savedIGN = localStorage.getItem('last_saved_ff_ign');
      if (savedIGN) setFreeFireNameInput(savedIGN);
      const savedUID = localStorage.getItem('last_saved_ff_uid');
      if (savedUID) setFreeFireUidInput(savedUID);
    }
  }, []);

  // Subscribe to live tournaments
  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToTournaments((list) => {
      setTournaments(list);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Load user's registered tournaments
  useEffect(() => {
    if (!profile?.uid) {
      setMyRegistrations({});
      return;
    }

    const loadMyRegs = async () => {
      try {
        const regs = await fetchUserAllTournamentRegistrations(profile.uid);
        const map: Record<string, TournamentParticipant> = {};
        regs.forEach(r => {
          map[r.tournamentId] = r;
        });
        setMyRegistrations(map);
      } catch (err) {
        console.warn('Failed to load my tournament registrations:', err);
      }
    };

    loadMyRegs();

    const handleJoined = (e: Event) => {
      const customEvent = e as CustomEvent<TournamentParticipant>;
      if (customEvent.detail && customEvent.detail.tournamentId) {
        setMyRegistrations(prev => ({
          ...prev,
          [customEvent.detail.tournamentId]: customEvent.detail
        }));
      }
    };

    window.addEventListener('tournament_joined', handleJoined);
    return () => window.removeEventListener('tournament_joined', handleJoined);
  }, [profile?.uid]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleOpenJoinModal = (t: FreeFireTournament) => {
    if (!profile) {
      onOpenAuth();
      return;
    }
    setSelectedTournamentToJoin(t);
    setJoinError('');
    setJoinSuccessData(null);
  };

  const handleSubmitJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedTournamentToJoin) return;

    const trimmedIGN = freeFireNameInput.trim();
    if (!trimmedIGN || trimmedIGN.length < 2) {
      setJoinError('Kripya apna Free Fire MAX Name (In-Game Name / IGN) dalein.');
      return;
    }

    const fee = selectedTournamentToJoin.entryFeeCoins || 0;
    if (fee > 0 && (profile.coins || 0) < fee) {
      setJoinError(`Aapke wallet me ${fee} coins nahi hain. Earn coins ya tasks complete karein.`);
      return;
    }

    setJoinLoading(true);
    setJoinError('');

    try {
      const res = await joinFreeFireTournament(
        selectedTournamentToJoin,
        profile,
        trimmedIGN,
        freeFireUidInput.trim()
      );

      if (res.success && res.participant) {
        // Remember IGN for next time
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('last_saved_ff_ign', trimmedIGN);
          if (freeFireUidInput.trim()) {
            localStorage.setItem('last_saved_ff_uid', freeFireUidInput.trim());
          }
        }

        setMyRegistrations(prev => ({
          ...prev,
          [selectedTournamentToJoin.id]: res.participant!
        }));

        setJoinSuccessData({
          slotNumber: res.participant.slotNumber,
          fee
        });
      } else {
        setJoinError(res.message || 'Registration fail ho gaya.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setJoinError(msg || 'Server connection error.');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleOpenParticipants = async (t: FreeFireTournament) => {
    setViewingParticipantsTourney(t);
    setLoadingParticipants(true);
    try {
      const list = await fetchTournamentParticipants(t.id);
      setParticipantsList(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingParticipants(false);
    }
  };

  // Tournament List
  const filteredTournaments = tournaments;

  return (
    <div className="fixed inset-0 z-50 bg-[#090D16] text-white flex flex-col overflow-y-auto overflow-x-hidden w-full max-w-full selection:bg-amber-500 selection:text-slate-950">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-40 bg-[#0C121F]/95 backdrop-blur-md border-b border-slate-800/80 px-3.5 py-3 sm:px-6 w-full max-w-full overflow-hidden">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 flex items-center justify-center text-slate-300 hover:text-white transition-all active:scale-95 cursor-pointer shrink-0"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display font-black text-base sm:text-lg tracking-tight text-white truncate">
                  Free Fire MAX Tournaments
                </h1>
                <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-black px-2 py-0.5 rounded-full uppercase shrink-0">
                  {tournaments.length} Matches
                </span>
              </div>
            </div>
          </div>

          {/* User Balance Chip */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 bg-slate-900 border border-amber-500/30 px-3 py-1.5 rounded-2xl shadow-sm">
              <GoldCoin className="w-4 h-4" />
              <span className="font-display font-black text-xs sm:text-sm text-amber-400">
                {(profile?.coins || 0).toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400 font-bold hidden sm:inline">Coins</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area - Fixed Screen, Zero Left-Right Overflow */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-3.5 py-4 sm:px-6 space-y-4 pb-24 overflow-x-hidden">
        {/* Tournaments List */}
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold">Free Fire MAX Tournaments load ho rahe hain...</p>
          </div>
        ) : filteredTournaments.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-10 text-center text-slate-400">
            <Gamepad2 className="w-12 h-12 mx-auto text-slate-600 mb-3" />
            <h3 className="font-display font-black text-base text-white">Koi Tournament Nahi Mila</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Abhi koi match scheduled nahi hai. Jaldi hi naye matches add honge.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTournaments.map((t) => {
              const myReg = myRegistrations[t.id];
              const isRegistered = !!myReg;
              const isFull = t.joinedSlots >= t.maxSlots;

              return (
                <div
                  key={t.id}
                  className={`bg-[#0F1626] border rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden transition-all ${
                    isRegistered
                      ? 'border-emerald-500/50 ring-1 ring-emerald-500/30'
                      : 'border-slate-800/90 hover:border-slate-700'
                  }`}
                >
                  {/* Status Banner / Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                        {t.gameMode.replace('_', ' ')}
                      </span>
                      <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-amber-400" />
                        {t.mapName}
                      </span>
                      <span className="bg-blue-500/20 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {t.matchDateTime}
                      </span>
                    </div>

                    {isRegistered && (
                      <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-2.5 py-1 rounded-xl flex items-center gap-1 shadow-sm shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 fill-slate-950 text-white" />
                        Slot #{myReg.slotNumber} Registered
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="font-display font-black text-lg sm:text-xl text-white tracking-tight">
                    {t.title}
                  </h3>

                  {/* Key Stats Bar: Entry Fee & Only 1st Prize */}
                  <div className="grid grid-cols-2 gap-3 mt-4 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Entry Fee</span>
                      {t.entryFeeCoins === 0 ? (
                        <span className="text-sm font-black text-emerald-400 mt-0.5 block">FREE ENTRY</span>
                      ) : (
                        <div className="flex items-center justify-center gap-1 mt-0.5">
                          <GoldCoin className="w-4 h-4" />
                          <span className="text-sm font-black text-amber-400">{t.entryFeeCoins}</span>
                          <span className="text-[10px] text-slate-400">(₹{(t.entryFeeCoins / 100).toFixed(1)})</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] text-yellow-400 font-bold block uppercase flex items-center justify-center gap-1">
                        <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                        <span>1st Prize (Winner)</span>
                      </span>
                      <div className="flex items-center justify-center gap-1 mt-0.5">
                        <GoldCoin className="w-4 h-4" />
                        <span className="text-sm font-black text-yellow-400">
                          {t.firstPrizeCoins || t.prizePoolCoins} Coins
                        </span>
                        <span className="text-[10px] text-slate-400">
                          (₹{(((t.firstPrizeCoins || t.prizePoolCoins) || 0) / 100).toFixed(0)})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Slots Available Meter */}
                  <div className="mt-3.5">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-400 font-bold flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>Registered Players</span>
                      </span>
                      <span className={`font-black ${isFull ? 'text-rose-400' : 'text-amber-400'}`}>
                        {t.joinedSlots} / {t.maxSlots} Slots Filled
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full transition-all duration-500 ${
                          isFull
                            ? 'bg-rose-500'
                            : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500'
                        }`}
                        style={{ width: `${Math.min(100, (t.joinedSlots / t.maxSlots) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* REGISTERED USER: CUSTOM ROOM CREDENTIALS CALLOUT */}
                  {isRegistered && (
                    <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-slate-950 border border-emerald-500/40">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                          <h4 className="font-display font-black text-sm text-white">
                            Custom Room Details (Free Fire MAX)
                          </h4>
                        </div>
                        <span className="text-[11px] font-mono text-emerald-400 font-bold">
                          IGN: {myReg.freeFireName}
                        </span>
                      </div>

                      {t.roomCredentialsReleased && t.roomId ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2">
                          {/* Room ID Copy */}
                          <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-2.5 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold uppercase block">Room ID</span>
                              <span className="font-mono font-black text-base text-white tracking-wider">
                                {t.roomId}
                              </span>
                            </div>
                            <button
                              onClick={() => handleCopy(t.roomId!, `room_${t.id}`)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-black flex items-center gap-1 hover:bg-amber-400 active:scale-95 transition-all cursor-pointer"
                            >
                              {copiedKey === `room_${t.id}` ? (
                                <>
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Room Password Copy */}
                          <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-2.5 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold uppercase block">Room Password</span>
                              <span className="font-mono font-black text-base text-white tracking-wider">
                                {t.roomPassword || 'None'}
                              </span>
                            </div>
                            {t.roomPassword && (
                              <button
                                onClick={() => handleCopy(t.roomPassword!, `pass_${t.id}`)}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-black flex items-center gap-1 hover:bg-amber-400 active:scale-95 transition-all cursor-pointer"
                              >
                                {copiedKey === `pass_${t.id}` ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    <span>Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-slate-900/70 text-slate-300 text-xs flex items-center gap-2 mt-1">
                          <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>
                            Room ID &amp; Password match shuru hone se <strong>15 minute pehle</strong> yahan automatically show hoga.
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rules Accordion */}
                  {t.rules && (
                    <div className="mt-3">
                      <button
                        onClick={() => setRulesExpanded(rulesExpanded === t.id ? null : t.id)}
                        className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-bold transition-colors cursor-pointer"
                      >
                        <Info className="w-3.5 h-3.5 text-amber-400" />
                        <span>Match Rules &amp; Guidelines</span>
                        {rulesExpanded === t.id ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {rulesExpanded === t.id && (
                        <div className="mt-2 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                          {t.rules}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Card Bottom CTA Actions */}
                  <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                    <button
                      onClick={() => handleOpenParticipants(t)}
                      className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5 text-amber-400" />
                      <span>View Participants ({t.joinedSlots})</span>
                    </button>

                    {isRegistered ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-emerald-400 font-bold">
                          Aap register hain (Slot #{myReg.slotNumber})
                        </span>
                      </div>
                    ) : isFull ? (
                      <button
                        disabled
                        className="px-5 py-2.5 rounded-2xl bg-slate-800 text-slate-500 font-display font-black text-xs cursor-not-allowed"
                      >
                        Match Full
                      </button>
                    ) : t.status !== 'upcoming' ? (
                      <button
                        disabled
                        className="px-5 py-2.5 rounded-2xl bg-slate-800 text-slate-500 font-display font-black text-xs cursor-not-allowed capitalize"
                      >
                        Match {t.status}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenJoinModal(t)}
                        className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-slate-950 font-display font-black text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
                      >
                        <Gamepad2 className="w-4 h-4" />
                        <span>
                          {t.entryFeeCoins === 0 ? 'Join Free Match' : `Join for ${t.entryFeeCoins} Coins`}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* JOIN MODAL: Asks for Free Fire MAX Name (IGN) */}
      <AnimatePresence>
        {selectedTournamentToJoin && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#121826] border-2 border-orange-500/50 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl relative my-8"
            >
              {joinSuccessData ? (
                /* Success Confirmation State */
                <div className="text-center py-4 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>

                  <h3 className="font-display font-black text-xl text-white">
                    Registration Confirmed!
                  </h3>

                  <p className="text-xs text-slate-300">
                    Aapka registration successfully confirm ho gaya hai.
                  </p>

                  <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-left space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Match:</span>
                      <span className="font-bold text-white">{selectedTournamentToJoin.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Assigned Slot:</span>
                      <span className="font-mono font-black text-amber-400">Slot #{joinSuccessData.slotNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Free Fire MAX Name:</span>
                      <span className="font-mono font-black text-emerald-400">{freeFireNameInput}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Entry Fee:</span>
                      <span className="font-bold text-white">
                        {joinSuccessData.fee > 0 ? `${joinSuccessData.fee} Coins Deducted` : 'FREE'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedTournamentToJoin(null);
                      setJoinSuccessData(null);
                    }}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-display font-black text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer mt-2"
                  >
                    Done (Check Room Details)
                  </button>
                </div>
              ) : (
                /* Registration Form */
                <form onSubmit={handleSubmitJoin} className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 text-orange-400 text-xs font-bold uppercase mb-1">
                      <Gamepad2 className="w-4 h-4" />
                      <span>Free Fire MAX Tournament Entry</span>
                    </div>
                    <h3 className="font-display font-black text-lg text-white leading-tight">
                      {selectedTournamentToJoin.title}
                    </h3>
                  </div>

                  {/* Fee & Balance Summary */}
                  <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Entry Fee</span>
                      {selectedTournamentToJoin.entryFeeCoins === 0 ? (
                        <span className="font-black text-emerald-400 text-sm">FREE ENTRY</span>
                      ) : (
                        <div className="flex items-center gap-1 font-black text-amber-400 text-sm mt-0.5">
                          <GoldCoin className="w-4 h-4" />
                          <span>{selectedTournamentToJoin.entryFeeCoins} Coins</span>
                          <span className="text-[10px] text-slate-400">(₹{(selectedTournamentToJoin.entryFeeCoins / 100).toFixed(2)})</span>
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Your Balance</span>
                      <div className="flex items-center gap-1 font-black text-white text-sm mt-0.5">
                        <GoldCoin className="w-4 h-4" />
                        <span>{(profile?.coins || 0).toLocaleString()} Coins</span>
                      </div>
                    </div>
                  </div>

                  {/* MANDATORY FREE FIRE MAX NAME INPUT */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-amber-300 flex items-center justify-between">
                      <span>Free Fire MAX Name (In-Game Name / IGN) *</span>
                      <span className="text-[10px] text-rose-400 font-normal">Zaroori (Required)</span>
                    </label>

                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={freeFireNameInput}
                        onChange={(e) => setFreeFireNameInput(e.target.value)}
                        placeholder="e.g. RAISTAR_99, OP_KILLER, BOSS_01"
                        className="w-full px-3.5 py-2.5 bg-slate-950 border-2 border-amber-500/50 rounded-xl text-sm font-bold text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Apna Free Fire MAX ka <strong>exact in-game name</strong> dalein taaki room me join karte waqt match kiya ja sake.
                    </p>
                  </div>

                  {/* FREE FIRE UID INPUT */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 block">
                      Free Fire Player UID (Optional)
                    </label>
                    <input
                      type="text"
                      value={freeFireUidInput}
                      onChange={(e) => setFreeFireUidInput(e.target.value)}
                      placeholder="e.g. 1928374650"
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Error Notification */}
                  {joinError && (
                    <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-xs text-rose-300 font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{joinError}</span>
                    </div>
                  )}

                  {/* Coins Warning */}
                  {selectedTournamentToJoin.entryFeeCoins > 0 &&
                    (profile?.coins || 0) < selectedTournamentToJoin.entryFeeCoins && (
                      <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-300 font-bold space-y-2">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                          <span>Aapke wallet me पर्याप्त coins nahi hain!</span>
                        </div>
                        {onOpenTasks && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTournamentToJoin(null);
                              onClose();
                              onOpenTasks();
                            }}
                            className="w-full py-1.5 rounded-lg bg-amber-500 text-slate-950 font-black text-[11px] cursor-pointer"
                          >
                            Complete Tasks to Earn Free Coins
                          </button>
                        )}
                      </div>
                    )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setSelectedTournamentToJoin(null)}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={
                        joinLoading ||
                        !freeFireNameInput.trim() ||
                        ((selectedTournamentToJoin.entryFeeCoins || 0) > (profile?.coins || 0))
                      }
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-slate-950 font-display font-black text-xs shadow-lg shadow-amber-500/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {joinLoading ? 'Register kar rahe hain...' : 'Confirm Registration'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PARTICIPANTS MODAL */}
      <AnimatePresence>
        {viewingParticipantsTourney && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#121826] border border-slate-800 rounded-3xl max-w-lg w-full p-6 text-white shadow-2xl relative my-8 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-display font-black text-base text-white flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-amber-400" />
                    <span>Registered Players ({participantsList.length})</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Match: <strong className="text-amber-400">{viewingParticipantsTourney.title}</strong>
                  </p>
                </div>
                <button
                  onClick={() => setViewingParticipantsTourney(null)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>

              {loadingParticipants ? (
                <div className="p-8 text-center text-slate-400">
                  <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs">Loading players...</p>
                </div>
              ) : participantsList.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-950/60 rounded-2xl">
                  <p className="text-xs">Is match me abhi koi player register nahi hua hai.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80">
                  {participantsList.map((p) => {
                    const isMe = profile?.uid === p.userId;
                    return (
                      <div
                        key={p.id}
                        className={`py-2.5 px-3 flex items-center justify-between gap-2 rounded-xl ${
                          isMe ? 'bg-amber-500/15 border border-amber-500/30' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="font-mono font-black text-xs text-amber-400 shrink-0">
                            #{p.slotNumber}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-display font-black text-xs text-white truncate">
                                {p.freeFireName}
                              </span>
                              {isMe && (
                                <span className="bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded-md">
                                  YOU
                                </span>
                              )}
                              {p.prizeWonCoins ? (
                                <span className="text-[10px] text-yellow-400 font-bold">
                                  🏆 Won {p.prizeWonCoins}c
                                </span>
                              ) : null}
                            </div>
                            <span className="text-[10px] text-slate-400 block truncate">
                              Player: {p.userName}
                            </span>
                          </div>
                        </div>

                        <span className="text-[10px] text-slate-400 shrink-0">
                          {p.entryFeePaid > 0 ? `${p.entryFeePaid}c Paid` : 'Free'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
