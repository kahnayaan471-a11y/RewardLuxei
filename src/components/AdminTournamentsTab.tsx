import React, { useState, useEffect } from 'react';
import {
  Gamepad2,
  Plus,
  Users,
  Trophy,
  Key,
  Calendar,
  MapPin,
  Coins,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  ShieldCheck,
  Send,
  RefreshCw,
  Search,
  ExternalLink,
  Ban,
  Award
} from 'lucide-react';
import {
  FreeFireTournament,
  TournamentParticipant,
  TournamentFormat,
  TournamentStatus,
  FeatureToggles
} from '../types';
import {
  fetchTournaments,
  subscribeToTournaments,
  createTournament,
  updateTournament,
  deleteTournament,
  setTournamentRoomCredentials,
  fetchTournamentParticipants,
  distributeTournamentPrize,
  cancelTournamentAndRefund,
  subscribeToFeatureToggles,
  updateFeatureToggles,
  DEFAULT_FEATURE_TOGGLES
} from '../services/coinService';
import { GoldCoin } from './GoldCoin';

function getDateStringOffset(offsetDays: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatIndianDateTime(dateStr: string, timeStr: string): { display: string; timestamp: number } {
  if (!dateStr) {
    return { display: '', timestamp: Date.now() + 24 * 3600 * 1000 };
  }
  const parts = dateStr.split('-').map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  const [hour = 20, minute = 30] = (timeStr || '20:30').split(':').map(Number);

  const d = new Date(year, month - 1, day, hour, minute);
  const timestamp = d.getTime();

  const dayStr = String(day).padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthStr = monthNames[month - 1] || 'Sep';

  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const displayMin = String(minute).padStart(2, '0');
  const timeFormatted = `${String(displayHour).padStart(2, '0')}:${displayMin} ${period} IST`;

  const now = new Date();
  const isToday = now.getFullYear() === year && now.getMonth() === (month - 1) && now.getDate() === day;
  const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000);
  const isTomorrow = tomorrow.getFullYear() === year && tomorrow.getMonth() === (month - 1) && tomorrow.getDate() === day;

  let prefix = `${dayStr} ${monthStr} ${year}`;
  if (isToday) {
    prefix = `Today (${dayStr} ${monthStr})`;
  } else if (isTomorrow) {
    prefix = `Tomorrow (${dayStr} ${monthStr})`;
  }

  return {
    display: `${prefix}, ${timeFormatted}`,
    timestamp
  };
}

export const AdminTournamentsTab: React.FC = () => {
  const [tournaments, setTournaments] = useState<FreeFireTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | TournamentStatus>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'tomorrow' | string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Create / Edit Modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState<FreeFireTournament | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [gameMode, setGameMode] = useState<TournamentFormat>('solo');
  const [mapName, setMapName] = useState('Bermuda');
  const [entryFeeCoins, setEntryFeeCoins] = useState<number>(50); // Admin selects entry fee!
  const [prizePoolCoins, setPrizePoolCoins] = useState<number>(500);
  const [firstPrizeCoins, setFirstPrizeCoins] = useState<number>(500);
  const [maxSlots, setMaxSlots] = useState<number>(48);
  const [matchDate, setMatchDate] = useState<string>(''); // YYYY-MM-DD
  const [matchTime, setMatchTime] = useState<string>('20:30'); // HH:MM
  const [matchDateTime, setMatchDateTime] = useState('');
  const [rules, setRules] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Room Credentials Modal
  const [selectedRoomTourney, setSelectedRoomTourney] = useState<FreeFireTournament | null>(null);
  const [roomIdInput, setRoomIdInput] = useState('');
  const [roomPasswordInput, setRoomPasswordInput] = useState('');
  const [releaseCredentials, setReleaseCredentials] = useState(false);
  const [roomSaving, setRoomSaving] = useState(false);

  // Home Screen Button Visibility
  const [featureToggles, setFeatureToggles] = useState<FeatureToggles>(DEFAULT_FEATURE_TOGGLES);
  const [togglingVisibility, setTogglingVisibility] = useState(false);

  useEffect(() => {
    const unsub = subscribeToFeatureToggles((toggles) => {
      setFeatureToggles(toggles);
    });
    return () => {
      unsub();
    };
  }, []);

  const handleToggleTournamentVisibility = async () => {
    try {
      setTogglingVisibility(true);
      await updateFeatureToggles({
        showTournaments: !featureToggles.showTournaments
      });
      showNotification('success', `FF Tournaments button home screen par ${!featureToggles.showTournaments ? 'Show' : 'Hide'} kar diya gaya hai.`);
    } catch (e) {
      console.error('Failed to toggle tournaments button visibility:', e);
      showNotification('error', 'Visibility change karne me error aaya.');
    } finally {
      setTogglingVisibility(false);
    }
  };

  // Participants View Modal
  const [viewingTourney, setViewingTourney] = useState<FreeFireTournament | null>(null);
  const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [participantSearch, setParticipantSearch] = useState('');

  // Prize Distribution Modal
  const [winnerParticipant, setWinnerParticipant] = useState<TournamentParticipant | null>(null);
  const [prizeAmountInput, setPrizeAmountInput] = useState<number>(500);
  const [prizeNoteInput, setPrizeNoteInput] = useState<string>('1st Prize / Booyah Winner');
  const [distributingPrize, setDistributingPrize] = useState(false);

  // Feedback Notification
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToTournaments((list) => {
      setTournaments(list);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleDateChange = (newDate: string) => {
    setMatchDate(newDate);
    const { display } = formatIndianDateTime(newDate, matchTime);
    setMatchDateTime(display);
  };

  const handleTimeChange = (newTime: string) => {
    setMatchTime(newTime);
    const { display } = formatIndianDateTime(matchDate, newTime);
    setMatchDateTime(display);
  };

  const handleOpenCreate = () => {
    setEditingTournament(null);
    setTitle('Free Fire MAX Bermuda Solo Battle');
    setDescription('');
    setGameMode('solo');
    setMapName('Bermuda');
    setEntryFeeCoins(50);
    setPrizePoolCoins(500);
    setFirstPrizeCoins(500);
    setMaxSlots(48);
    const tomorrowStr = getDateStringOffset(1);
    setMatchDate(tomorrowStr);
    setMatchTime('20:30');
    const { display } = formatIndianDateTime(tomorrowStr, '20:30');
    setMatchDateTime(display);
    setRules('1. Mobile players only. Strictly no emulators.\n2. No hacking, scripts, teaming or glitches.\n3. Take screenshot of Booyah / end game screen.\n4. Only 1st Prize Winner will get coins.\n5. Room ID & password will be visible 15 min before match.');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (t: FreeFireTournament) => {
    setEditingTournament(t);
    setTitle(t.title);
    setDescription(t.description || '');
    setGameMode(t.gameMode);
    setMapName(t.mapName);
    setEntryFeeCoins(t.entryFeeCoins);
    const firstPrize = t.firstPrizeCoins || t.prizePoolCoins || 500;
    setPrizePoolCoins(firstPrize);
    setFirstPrizeCoins(firstPrize);
    setMaxSlots(t.maxSlots);
    
    // Parse match date & time
    if (t.matchTimestamp) {
      const d = new Date(t.matchTimestamp);
      if (!isNaN(d.getTime())) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        setMatchDate(`${yyyy}-${mm}-${dd}`);
        setMatchTime(`${hh}:${min}`);
      } else {
        setMatchDate(getDateStringOffset(1));
        setMatchTime('20:30');
      }
    } else {
      setMatchDate(getDateStringOffset(1));
      setMatchTime('20:30');
    }
    setMatchDateTime(t.matchDateTime);
    setRules(t.rules || '');
    setIsFormOpen(true);
  };

  const handleSaveTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !matchDateTime.trim()) {
      showNotification('error', 'Title aur Match Date & Time zaroori hain.');
      return;
    }

    setFormLoading(true);
    const winnerPrize = Number(firstPrizeCoins) || Number(prizePoolCoins) || 0;
    const { timestamp: calculatedTimestamp } = formatIndianDateTime(matchDate, matchTime);
    const finalTimestamp = calculatedTimestamp || Date.now() + 24 * 3600 * 1000;

    try {
      if (editingTournament) {
        await updateTournament(editingTournament.id, {
          title: title.trim(),
          description: description.trim(),
          gameMode,
          mapName,
          entryFeeCoins: Number(entryFeeCoins) || 0,
          prizePoolCoins: winnerPrize,
          firstPrizeCoins: winnerPrize,
          perKillCoins: 0,
          secondPrizeCoins: undefined,
          thirdPrizeCoins: undefined,
          maxSlots: Number(maxSlots) || 48,
          matchDateTime: matchDateTime.trim(),
          matchTimestamp: finalTimestamp,
          rules: rules.trim()
        });
        showNotification('success', 'Tournament details successfully update ho gayi hain!');
      } else {
        await createTournament({
          title: title.trim(),
          description: description.trim(),
          gameMode,
          mapName,
          entryFeeCoins: Number(entryFeeCoins) || 0,
          prizePoolCoins: winnerPrize,
          firstPrizeCoins: winnerPrize,
          perKillCoins: 0,
          secondPrizeCoins: undefined,
          thirdPrizeCoins: undefined,
          maxSlots: Number(maxSlots) || 48,
          matchDateTime: matchDateTime.trim(),
          matchTimestamp: finalTimestamp,
          rules: rules.trim(),
          status: 'upcoming'
        });
        showNotification('success', 'Naya Free Fire MAX tournament create ho gaya hai!');
      }
      setIsFormOpen(false);
    } catch (err) {
      console.error(err);
      showNotification('error', 'Save karne me error aaya.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Kya aap "${name}" tournament ko delete karna chahte hain?`)) return;
    try {
      await deleteTournament(id);
      showNotification('success', 'Tournament delete kar diya gaya.');
    } catch {
      showNotification('error', 'Delete karne me error aaya.');
    }
  };

  const handleOpenRoomCredentials = (t: FreeFireTournament) => {
    setSelectedRoomTourney(t);
    setRoomIdInput(t.roomId || '');
    setRoomPasswordInput(t.roomPassword || '');
    setReleaseCredentials(!!t.roomCredentialsReleased);
  };

  const handleSaveRoomCredentials = async () => {
    if (!selectedRoomTourney) return;
    setRoomSaving(true);
    try {
      await setTournamentRoomCredentials(
        selectedRoomTourney.id,
        roomIdInput.trim(),
        roomPasswordInput.trim(),
        releaseCredentials
      );
      showNotification(
        'success',
        releaseCredentials
          ? 'Room ID & Password registered players ke liye RELEASE ho gaya hai!'
          : 'Room ID & Password save ho gaya hai (Players se hidden).'
      );
      setSelectedRoomTourney(null);
    } catch {
      showNotification('error', 'Room credentials save karne me error aaya.');
    } finally {
      setRoomSaving(false);
    }
  };

  const handleOpenParticipants = async (t: FreeFireTournament) => {
    setViewingTourney(t);
    setLoadingParticipants(true);
    try {
      const list = await fetchTournamentParticipants(t.id);
      setParticipants(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingParticipants(false);
    }
  };

  const handleCancelAndRefund = async (t: FreeFireTournament) => {
    if (!window.confirm(`Kya aap "${t.title}" match ko cancel karna chahte hain? Sabhi registered players ko entry fee coins auto-refund ho jayenge.`)) {
      return;
    }
    const res = await cancelTournamentAndRefund(t.id, 'Admin ne match cancel kiya');
    if (res.success) {
      showNotification('success', res.message);
    } else {
      showNotification('error', res.message);
    }
  };

  const handleDistributePrize = async () => {
    if (!viewingTourney || !winnerParticipant || prizeAmountInput <= 0) return;
    setDistributingPrize(true);
    try {
      const res = await distributeTournamentPrize(
        viewingTourney.id,
        winnerParticipant.userId,
        prizeAmountInput,
        `${prizeNoteInput} (${winnerParticipant.freeFireName})`
      );
      if (res.success) {
        showNotification('success', res.message);
        setWinnerParticipant(null);
        // Refresh list
        const updated = await fetchTournamentParticipants(viewingTourney.id);
        setParticipants(updated);
      } else {
        showNotification('error', res.message);
      }
    } catch (e) {
      console.error(e);
      showNotification('error', 'Prize credit karne me error aaya.');
    } finally {
      setDistributingPrize(false);
    }
  };

  // Filtered Tournaments
  const filteredTournaments = tournaments.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;

    // Date Filter Logic
    if (dateFilter !== 'all') {
      const todayStr = getDateStringOffset(0);
      const tomorrowStr = getDateStringOffset(1);

      let tDateStr = '';
      if (t.matchTimestamp) {
        const d = new Date(t.matchTimestamp);
        tDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }

      if (dateFilter === 'today') {
        const matchesDateStr = tDateStr === todayStr;
        const matchesText = (t.matchDateTime || '').toLowerCase().includes('today');
        if (!matchesDateStr && !matchesText) return false;
      } else if (dateFilter === 'tomorrow') {
        const matchesDateStr = tDateStr === tomorrowStr;
        const matchesText = (t.matchDateTime || '').toLowerCase().includes('tomorrow');
        if (!matchesDateStr && !matchesText) return false;
      } else {
        // Specific custom date YYYY-MM-DD
        if (tDateStr !== dateFilter) return false;
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.mapName.toLowerCase().includes(q) ||
        t.gameMode.toLowerCase().includes(q) ||
        (t.matchDateTime || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {actionMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-bold shadow-lg animate-in fade-in slide-in-from-top-2 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Top Banner & Actions Header */}
      <div className="bg-[#0E1524] border border-slate-800/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20 shrink-0">
            <Gamepad2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-black text-lg sm:text-xl text-white">
                Free Fire Tournaments
              </h2>
              <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                {tournaments.length} Matches
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Naye matches banayein, Room ID & Password daalein, aur players manage karein
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-slate-950 font-display font-black text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Create New Tournament</span>
        </button>
      </div>

      {/* Home Screen Button Visibility Live Toggle Card */}
      <div className="bg-[#0E1524] border border-orange-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-orange-500/15 text-orange-400 flex items-center justify-center border border-orange-500/30 shrink-0 shadow-inner">
            <Gamepad2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-display font-black text-sm sm:text-base text-white">
                Show FF Tournaments Button on User Home Screen
              </h4>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                featureToggles.showTournaments
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}>
                {featureToggles.showTournaments ? '● BUTTON VISIBLE' : '○ BUTTON HIDDEN'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Agar aap ise <strong>Hide</strong> karte hain to User Home Dashboard se Free Fire MAX Tournaments ka button/card turant hide ho jayega.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleTournamentVisibility}
          disabled={togglingVisibility}
          className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all cursor-pointer border active:scale-95 shadow-md shrink-0 ${
            featureToggles.showTournaments
              ? 'bg-orange-500 hover:bg-orange-400 text-slate-950 border-orange-300 shadow-orange-500/20'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600'
          }`}
        >
          {featureToggles.showTournaments ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          <span>{featureToggles.showTournaments ? 'Hide from Home Screen' : 'Show on Home Screen'}</span>
        </button>
      </div>

      {/* Filters Bar: Status Tabs + Date Filter + Search */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto bg-[#0E1524] p-1 rounded-xl border border-slate-800/90 text-xs">
            {(['all', 'upcoming', 'ongoing', 'completed', 'cancelled'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg capitalize font-bold transition-all cursor-pointer ${
                  statusFilter === tab
                    ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab === 'all' ? 'All Matches' : tab}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tournament title or map..."
              className="w-full sm:w-64 pl-9 pr-3 py-2 bg-[#0E1524] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* Date Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto py-1 px-1 bg-[#0E1524]/70 rounded-xl border border-slate-800/60 text-xs">
          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5 shrink-0 pl-2">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span>Date Filter:</span>
          </span>
          <button
            type="button"
            onClick={() => setDateFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              dateFilter === 'all'
                ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            All Dates
          </button>
          <button
            type="button"
            onClick={() => setDateFilter('today')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              dateFilter === 'today'
                ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setDateFilter('tomorrow')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              dateFilter === 'tomorrow'
                ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            Tomorrow
          </button>
          <div className="flex items-center gap-1.5 shrink-0 ml-1">
            <input
              type="date"
              value={dateFilter !== 'all' && dateFilter !== 'today' && dateFilter !== 'tomorrow' ? dateFilter : ''}
              onChange={(e) => setDateFilter(e.target.value || 'all')}
              className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
            />
            {dateFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setDateFilter('all')}
                className="text-[11px] text-slate-400 hover:text-amber-400 px-1 font-bold underline cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tournaments Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs">Tournaments load ho rahe hain...</p>
        </div>
      ) : filteredTournaments.length === 0 ? (
        <div className="bg-[#0E1524] border border-slate-800/80 rounded-2xl p-10 text-center text-slate-400">
          <Gamepad2 className="w-12 h-12 mx-auto text-slate-600 mb-2" />
          <h3 className="font-bold text-white text-sm">Koi Tournament Nahi Mila</h3>
          <p className="text-xs text-slate-500 mt-1">Upar &quot;Create Tournament&quot; par click karke match schedule karein.</p>
        </div>
      ) : (
        /* SIMPLE & CLEAN TOURNAMENT CARDS GRID */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTournaments.map(t => {
            const isFull = t.joinedSlots >= t.maxSlots;
            const statusColors: Record<TournamentStatus, string> = {
              upcoming: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
              ongoing: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
              completed: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
              cancelled: 'bg-rose-500/20 text-rose-400 border-rose-500/30'
            };

            return (
              <div
                key={t.id}
                className="bg-[#0E1524] border border-slate-800/90 rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${statusColors[t.status]}`}>
                        {t.status}
                      </span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                        {t.gameMode.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5" />
                        {t.mapName}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-slate-400">
                      <button
                        onClick={() => handleOpenEdit(t)}
                        title="Edit Details"
                        className="p-1.5 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(t.id, t.title)}
                        title="Delete Match"
                        className="p-1.5 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-display font-black text-base text-white leading-tight">
                    {t.title}
                  </h3>

                  {/* Date & Time */}
                  <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold mt-2.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{t.matchDateTime}</span>
                  </div>

                  {/* Key Stats Bar: Entry Fee & Only 1st Prize */}
                  <div className="grid grid-cols-2 gap-2 mt-3.5 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Entry Fee</span>
                      {t.entryFeeCoins === 0 ? (
                        <span className="text-xs font-black text-emerald-400">FREE</span>
                      ) : (
                        <div className="flex items-center justify-center gap-1 mt-0.5">
                          <GoldCoin className="w-3.5 h-3.5" />
                          <span className="text-xs font-black text-amber-400">{t.entryFeeCoins}</span>
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
                        <GoldCoin className="w-3.5 h-3.5" />
                        <span className="text-xs font-black text-yellow-400">{t.firstPrizeCoins || t.prizePoolCoins} Coins</span>
                        <span className="text-[10px] text-slate-400">(₹{(((t.firstPrizeCoins || t.prizePoolCoins) || 0) / 100).toFixed(0)})</span>
                      </div>
                    </div>
                  </div>

                  {/* Slots Progress Bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-400 font-bold">Registered Players:</span>
                      <span className={`font-black ${isFull ? 'text-rose-400' : 'text-amber-400'}`}>
                        {t.joinedSlots} / {t.maxSlots} Slots
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${isFull ? 'bg-rose-500' : 'bg-gradient-to-r from-amber-500 to-yellow-400'}`}
                        style={{ width: `${Math.min(100, (t.joinedSlots / t.maxSlots) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Room ID & Password Status Box */}
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Custom Room Credentials:</span>
                      {t.roomId ? (
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-white font-mono font-bold">ID: {t.roomId}</span>
                          <span className="text-slate-500">|</span>
                          <span className="text-white font-mono font-bold">Pass: {t.roomPassword || 'None'}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Not set yet</span>
                      )}
                    </div>

                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        t.roomCredentialsReleased
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {t.roomCredentialsReleased ? 'Released to Players' : 'Hidden'}
                    </span>
                  </div>
                </div>

                {/* Card Actions Bottom */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleOpenRoomCredentials(t)}
                    className={`flex-1 min-w-[125px] py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      t.roomId
                        ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                        : 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-black shadow-sm'
                    }`}
                  >
                    <Key className={`w-3.5 h-3.5 ${t.roomId ? 'text-amber-400' : 'text-slate-950 stroke-[2.5]'}`} />
                    <span>{t.roomId ? 'Room ID Badlein' : '🔑 Set Room ID'}</span>
                  </button>

                  <button
                    onClick={() => handleOpenParticipants(t)}
                    className="flex-1 min-w-[125px] py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    <span>Players ({t.joinedSlots})</span>
                  </button>

                  {/* Status Toggle Quick Buttons */}
                  {t.status === 'upcoming' && (
                    <button
                      onClick={() => updateTournament(t.id, { status: 'ongoing' })}
                      className="py-2 px-3 rounded-xl bg-blue-600/30 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 text-xs font-bold transition-all cursor-pointer"
                    >
                      Start Match
                    </button>
                  )}

                  {t.status === 'ongoing' && (
                    <button
                      onClick={() => updateTournament(t.id, { status: 'completed' })}
                      className="py-2 px-3 rounded-xl bg-purple-600/30 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all cursor-pointer"
                    >
                      Mark Completed
                    </button>
                  )}

                  {t.status !== 'cancelled' && t.status !== 'completed' && (
                    <button
                      onClick={() => handleCancelAndRefund(t)}
                      title="Cancel and auto-refund participants"
                      className="p-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 transition-all cursor-pointer"
                    >
                      <Ban className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Create or Edit Tournament */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0E1524] border border-slate-800 rounded-3xl max-w-lg w-full p-6 text-white shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto">
            <h3 className="font-display font-black text-lg text-white mb-1">
              {editingTournament ? 'Edit Free Fire Tournament' : 'Schedule New Free Fire Tournament'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Aap entry fee coins select kar sakte hain (0 = Free) aur players se Free Fire in-game name manga jayega.
            </p>

            <form onSubmit={handleSaveTournament} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Tournament Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Free Fire MAX Daily Solo Rush"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Game Mode</label>
                  <select
                    value={gameMode}
                    onChange={(e) => {
                      const mode = e.target.value as TournamentFormat;
                      setGameMode(mode);
                      if (mode === 'clash_squad') setMaxSlots(8);
                      else if (mode === 'solo' || mode === 'squad') setMaxSlots(48);
                    }}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="solo">Solo (Battle Royale)</option>
                    <option value="duo">Duo (Battle Royale)</option>
                    <option value="squad">Squad (Battle Royale)</option>
                    <option value="clash_squad">Clash Squad (4v4)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Map</label>
                  <select
                    value={mapName}
                    onChange={(e) => setMapName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="Bermuda">Bermuda</option>
                    <option value="Purgatory">Purgatory</option>
                    <option value="Kalahari">Kalahari</option>
                    <option value="Alpine">Alpine</option>
                    <option value="Nexterra">Nexterra</option>
                  </select>
                </div>
              </div>

              {/* ADMIN SELECTS ENTRY FEE */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    <span>Entry Fee (Coins) * Admin Selected</span>
                  </label>
                  <span className="text-[11px] font-bold text-slate-300">
                    {entryFeeCoins === 0 ? 'FREE ENTRY' : `₹${(entryFeeCoins / 100).toFixed(2)} INR`}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={entryFeeCoins}
                    onChange={(e) => setEntryFeeCoins(Math.max(0, parseInt(e.target.value) || 0))}
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-mono font-bold focus:outline-none focus:border-amber-400"
                  />
                  <div className="flex gap-1">
                    {[0, 20, 50, 100, 200].map(fee => (
                      <button
                        key={fee}
                        type="button"
                        onClick={() => setEntryFeeCoins(fee)}
                        className={`px-2 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                          entryFeeCoins === fee
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {fee === 0 ? 'FREE' : `${fee}c`}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  0 daalenge to Free Entry hogi. 50 daalenge to user ke wallet se 50 coins deduct honge.
                </p>
              </div>

              {/* Only 1st Prize (Winner Reward Coins) */}
              <div className="p-3.5 rounded-2xl bg-yellow-500/10 border border-yellow-500/30">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-black text-yellow-300 flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-yellow-400" />
                    <span>1st Prize Coins (Only First Prize)</span>
                  </label>
                  <span className="text-[11px] font-bold text-slate-300">
                    ₹{((firstPrizeCoins || 0) / 100).toFixed(2)} INR
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={10}
                    step={50}
                    value={firstPrizeCoins}
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value) || 0);
                      setFirstPrizeCoins(val);
                      setPrizePoolCoins(val);
                    }}
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-mono font-bold focus:outline-none focus:border-amber-400"
                  />
                  <div className="flex gap-1">
                    {[300, 500, 1000, 2000].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          setFirstPrizeCoins(amt);
                          setPrizePoolCoins(amt);
                        }}
                        className={`px-2 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                          firstPrizeCoins === amt
                            ? 'bg-yellow-400 text-slate-950'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {amt}c
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  Ye tournament sirf 1st Prize Winner ko reward karega. 2nd, 3rd, 4th prize aur Per-Kill system completely band hai.
                </p>
              </div>

              {/* Max Slots (Players) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-300">Max Slots (Total Players Allowed)</label>
                  <span className="text-[11px] font-mono text-amber-400 font-bold">{maxSlots} Players</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={2}
                    max={100}
                    value={maxSlots}
                    onChange={(e) => setMaxSlots(parseInt(e.target.value) || 48)}
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                  <div className="flex gap-1">
                    {[8, 12, 24, 48].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setMaxSlots(s)}
                        className={`px-2 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                          maxSlots === s
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {s} Slots
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tournament Date & Time Selection (Kis Din Tournament Hoga) */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 space-y-3.5 shadow-md">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white">Tournament Date & Time Selection</h4>
                      <p className="text-[10px] text-slate-400">Kis din aur kitne baje tournament karana hai select karein</p>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    Schedule
                  </span>
                </div>

                {/* 1. Date Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      <span>Select Match Date (Kis Din Hoga) *</span>
                    </label>
                    <span className="text-[11px] font-mono text-amber-400 font-bold">{matchDate || 'Not Selected'}</span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                    <input
                      type="date"
                      required
                      min={getDateStringOffset(0)}
                      value={matchDate}
                      onChange={(e) => handleDateChange(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                    />

                    {/* Quick Date Presets */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {[
                        { label: 'Today', offset: 0 },
                        { label: 'Tomorrow', offset: 1 },
                        { label: 'Day After', offset: 2 },
                        { label: '+3 Days', offset: 3 },
                      ].map(item => {
                        const dateVal = getDateStringOffset(item.offset);
                        const isSelected = matchDate === dateVal;
                        return (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => handleDateChange(dateVal)}
                            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-amber-400 text-slate-950 shadow-sm'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 2. Time Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Select Match Time (Kitne Baje Hoga) *</span>
                    </label>
                    <span className="text-[11px] font-mono text-amber-400 font-bold">{matchTime} IST</span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                    <input
                      type="time"
                      required
                      value={matchTime}
                      onChange={(e) => handleTimeChange(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                    />

                    {/* Quick Time Slots */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {[
                        { label: '06:00 PM', time: '18:00' },
                        { label: '07:30 PM', time: '19:30' },
                        { label: '08:30 PM', time: '20:30' },
                        { label: '09:30 PM', time: '21:30' },
                        { label: '10:30 PM', time: '22:30' }
                      ].map(item => {
                        const isSelected = matchTime === item.time;
                        return (
                          <button
                            key={item.time}
                            type="button"
                            onClick={() => handleTimeChange(item.time)}
                            className={`px-2 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-amber-400 text-slate-950 shadow-sm'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 3. Final Formatted Display Preview & Override */}
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-bold">Display Schedule Preview:</span>
                    <span className="text-amber-400 font-black">{matchDateTime || 'Not set'}</span>
                  </div>
                  <input
                    type="text"
                    required
                    value={matchDateTime}
                    onChange={(e) => setMatchDateTime(e.target.value)}
                    placeholder="e.g. Tomorrow (23 Sep), 08:30 PM IST"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-400 font-medium"
                  />
                  <p className="text-[9px] text-slate-500">
                    Aap upar date/time choose karein ya direct is text box me bhi edit kar sakte hain.
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Tournament Rules & Guidelines</label>
                <textarea
                  rows={3}
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                  placeholder="Rules for mobile players, screenshots, hacking bans..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-slate-950 font-display font-black text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {formLoading ? 'Saving...' : editingTournament ? 'Update Tournament' : 'Create Tournament'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Set Free Fire Custom Room ID & Password */}
      {selectedRoomTourney && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E1524] border border-slate-800 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl relative">
            <h3 className="font-display font-black text-lg text-white mb-1 flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-400" />
              <span>Free Fire Custom Room Credentials</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Match: <strong className="text-white">{selectedRoomTourney.title}</strong>
            </p>

            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Custom Room ID
                </label>
                <input
                  type="text"
                  value={roomIdInput}
                  onChange={(e) => setRoomIdInput(e.target.value)}
                  placeholder="e.g. 78241920"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Custom Room Password
                </label>
                <input
                  type="text"
                  value={roomPasswordInput}
                  onChange={(e) => setRoomPasswordInput(e.target.value)}
                  placeholder="e.g. 1234 or leave blank if none"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-white block">Release to Registered Players?</span>
                  <span className="text-[10px] text-slate-400">
                    {releaseCredentials
                      ? 'ON: Registered users will see the Room ID & Password immediately.'
                      : 'OFF: Credentials remain hidden until you toggle ON.'}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={releaseCredentials}
                  onChange={(e) => setReleaseCredentials(e.target.checked)}
                  className="w-5 h-5 rounded accent-amber-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedRoomTourney(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={roomSaving}
                onClick={handleSaveRoomCredentials}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-slate-950 font-display font-black text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
              >
                {roomSaving ? 'Saving...' : 'Save & Publish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: View Registered Participants & Award Prizes */}
      {viewingTourney && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0E1524] border border-slate-800 rounded-3xl max-w-2xl w-full p-6 text-white shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div>
                <h3 className="font-display font-black text-lg text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-400" />
                  <span>Registered Participants ({participants.length})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Match: <strong className="text-amber-400">{viewingTourney.title}</strong>
                </p>
              </div>

              <button
                onClick={() => setViewingTourney(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="my-3">
              <input
                type="text"
                value={participantSearch}
                onChange={(e) => setParticipantSearch(e.target.value)}
                placeholder="Search Free Fire IGN, User Name or Player UID..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            {loadingParticipants ? (
              <div className="p-8 text-center text-slate-400">
                <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs">Loading players...</p>
              </div>
            ) : participants.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800/80">
                <p className="text-xs font-bold">Is match me abhi koi player register nahi hua hai.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Slot #</th>
                      <th className="py-2.5 px-3">Free Fire MAX Name (IGN)</th>
                      <th className="py-2.5 px-3">Player UID</th>
                      <th className="py-2.5 px-3">User Account</th>
                      <th className="py-2.5 px-3">Fee Paid</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {participants
                      .filter(p => {
                        if (!participantSearch.trim()) return true;
                        const q = participantSearch.toLowerCase();
                        return (
                          p.freeFireName.toLowerCase().includes(q) ||
                          p.userName.toLowerCase().includes(q) ||
                          (p.freeFireUid && p.freeFireUid.toLowerCase().includes(q))
                        );
                      })
                      .map(p => (
                        <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-black text-amber-400">
                            #{p.slotNumber}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-display font-black text-white text-sm">
                              {p.freeFireName}
                            </span>
                            {p.prizeWonCoins ? (
                              <span className="ml-2 inline-flex items-center gap-1 bg-yellow-500/20 text-yellow-300 text-[10px] font-black px-1.5 py-0.2 rounded-full border border-yellow-500/30">
                                🏆 Won {p.prizeWonCoins}c
                              </span>
                            ) : null}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-300">
                            {p.freeFireUid || <span className="text-slate-500 italic">None</span>}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="text-white font-bold">{p.userName}</div>
                            <div className="text-[10px] text-slate-400">{p.userEmail}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            {p.entryFeePaid > 0 ? (
                              <span className="font-mono text-amber-400 font-bold">{p.entryFeePaid} coins</span>
                            ) : (
                              <span className="text-emerald-400 font-bold">Free</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => {
                                setWinnerParticipant(p);
                                setPrizeAmountInput(viewingTourney.firstPrizeCoins || 500);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/40 text-[11px] font-black flex items-center gap-1 ml-auto transition-all cursor-pointer"
                            >
                              <Award className="w-3 h-3" />
                              <span>Award Prize</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 4: Award Prize Coins to Winner */}
      {winnerParticipant && viewingTourney && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E1524] border border-slate-800 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl relative">
            <h3 className="font-display font-black text-lg text-white mb-1 flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-400" />
              <span>Award Free Fire Tournament Prize</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Player: <strong className="text-amber-400 font-black">{winnerParticipant.freeFireName}</strong> ({winnerParticipant.userName})
            </p>

            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Prize Coins Amount (100 coins = ₹1.00)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={10}
                    step={50}
                    value={prizeAmountInput}
                    onChange={(e) => setPrizeAmountInput(parseInt(e.target.value) || 0)}
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                  <div className="flex gap-1">
                    {[viewingTourney.firstPrizeCoins || viewingTourney.prizePoolCoins || 500, 200, 100].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setPrizeAmountInput(c)}
                        className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-amber-300"
                      >
                        {c}c
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-emerald-400 font-bold mt-1">
                  Real Cash Value: ₹{(prizeAmountInput / 100).toFixed(2)} INR (User ke wallet me turant credit hoga)
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Prize Note / Position
                </label>
                <input
                  type="text"
                  value={prizeNoteInput}
                  onChange={(e) => setPrizeNoteInput(e.target.value)}
                  placeholder="e.g. 1st Prize / Booyah Winner"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setWinnerParticipant(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={distributingPrize || prizeAmountInput <= 0}
                onClick={handleDistributePrize}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-slate-950 font-display font-black text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {distributingPrize ? 'Credit kar rahe hain...' : `Credit ${prizeAmountInput} Coins`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
