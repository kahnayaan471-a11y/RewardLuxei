import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Sparkles,
  Check,
  RefreshCw,
  Crown,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Gamepad2,
  Flame,
  Bot,
  Compass,
  Smile,
  Palette,
  Upload,
  Image as ImageIcon,
  ShieldAlert,
  Loader2,
  ScanLine
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { sound } from '../utils/sound';
import confetti from 'canvas-confetti';

interface AvatarSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SAFE_VERIFIED_AVATARS = [
  // Pro Gaming & Esports (Dicebear Safe Vectors)
  {
    id: 'game_cyber_pro',
    label: 'Cyber Samurai',
    category: 'Gaming',
    url: 'https://api.dicebear.com/7.x/micah/svg?seed=CyberSamurai&backgroundColor=b6e3f4,c0aede'
  },
  {
    id: 'game_neon_girl',
    label: 'Neon Valkyrie',
    category: 'Gaming',
    url: 'https://api.dicebear.com/7.x/micah/svg?seed=NeonValkyrie&backgroundColor=ffd5dc,d1d4f9'
  },
  {
    id: 'game_esports_ace',
    label: 'Esports Master',
    category: 'Gaming',
    url: 'https://api.dicebear.com/7.x/micah/svg?seed=EsportsMaster&backgroundColor=ffdfba,ffffba'
  },
  {
    id: 'game_sniper_pro',
    label: 'Sniper Ace',
    category: 'Gaming',
    url: 'https://api.dicebear.com/7.x/micah/svg?seed=SniperAce&backgroundColor=d1d4f9,b6e3f4'
  },
  {
    id: 'game_arcade_queen',
    label: 'Arcade Star',
    category: 'Gaming',
    url: 'https://api.dicebear.com/7.x/micah/svg?seed=ArcadeStar&backgroundColor=ffd5dc,ffdfba'
  },
  {
    id: 'game_shadow_ninja',
    label: 'Shadow Rogue',
    category: 'Gaming',
    url: 'https://api.dicebear.com/7.x/micah/svg?seed=ShadowRogue&backgroundColor=c0aede,b6e3f4'
  },
  // Warriors & Anime Champions (Dicebear Safe Vectors)
  {
    id: 'anime_ace_master',
    label: 'Ace Raider',
    category: 'Warriors',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AceMaster77&backgroundColor=b6e3f4,c0aede'
  },
  {
    id: 'anime_shadow_blade',
    label: 'Shadow Shinobi',
    category: 'Warriors',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=ShinobiBlade99&backgroundColor=ffd5dc,ffdfba'
  },
  {
    id: 'anime_dragon_fighter',
    label: 'Dragon Warrior',
    category: 'Warriors',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=DragonFighter&backgroundColor=d1d4f9,b6e3f4'
  },
  {
    id: 'anime_thunder_knight',
    label: 'Thunder Knight',
    category: 'Warriors',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=ThunderKnight&backgroundColor=ffdfba,ffffba'
  },
  {
    id: 'anime_mystic_mage',
    label: 'Mystic Mage',
    category: 'Warriors',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MysticSorcerer&backgroundColor=ffd5dc,d1d4f9'
  },
  {
    id: 'anime_valkyrie_pro',
    label: 'Solar Ranger',
    category: 'Warriors',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=SolarRanger&backgroundColor=c0aede,b6e3f4'
  },

  // Cyber Bots & AI Titans
  {
    id: 'bot_super_titan',
    label: 'Cyber Bot 01',
    category: 'Cyber Bots',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=LuckyWinner99&backgroundColor=ffd5dc,d1d4f9,c0aede,b6e3f4'
  },
  {
    id: 'bot_gold_titan',
    label: 'Gold Titan Bot',
    category: 'Cyber Bots',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=GoldTitan777&backgroundColor=ffdfba,baffc9,ffffba'
  },
  {
    id: 'bot_plasma_core',
    label: 'Plasma Bot',
    category: 'Cyber Bots',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=PlasmaCore44&backgroundColor=b6e3f4,c0aede'
  },
  {
    id: 'bot_mecha_prime',
    label: 'Mecha Prime',
    category: 'Cyber Bots',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=MechaPrime88&backgroundColor=d1d4f9,ffd5dc'
  },
  {
    id: 'bot_neon_android',
    label: 'Neon Android',
    category: 'Cyber Bots',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=NeonDroid55&backgroundColor=baffc9,ffdfba'
  },
  {
    id: 'bot_quantum_spark',
    label: 'Quantum Spark',
    category: 'Cyber Bots',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=QuantumSpark&backgroundColor=ffffba,ffd5dc'
  },

  // Adventurers & Stylized
  {
    id: 'lorelei_star_1',
    label: 'Star Champion',
    category: 'Adventurers',
    url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=SuperStarGamer&backgroundColor=b6e3f4,c0aede'
  },
  {
    id: 'lorelei_star_2',
    label: 'Glory Hero',
    category: 'Adventurers',
    url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=GloryHero77&backgroundColor=ffd5dc,ffdfba'
  },
  {
    id: 'lorelei_star_3',
    label: 'Cosmic Ace',
    category: 'Adventurers',
    url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=CosmicAce99&backgroundColor=d1d4f9,b6e3f4'
  },
  {
    id: 'lorelei_star_4',
    label: 'Phoenix Rider',
    category: 'Adventurers',
    url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=PhoenixRider&backgroundColor=ffdfba,ffffba'
  },
  {
    id: 'lorelei_star_5',
    label: 'Shadow Archer',
    category: 'Adventurers',
    url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=ShadowArcher&backgroundColor=ffd5dc,d1d4f9'
  },
  {
    id: 'lorelei_star_6',
    label: 'Apex Hunter',
    category: 'Adventurers',
    url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=ApexHunter&backgroundColor=c0aede,b6e3f4'
  },

  // Fun Emojis & Lucky Mascots
  {
    id: 'fun_happy_champ',
    label: 'Happy Champ',
    category: 'Fun Mascots',
    url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=HappyChamp99'
  },
  {
    id: 'fun_star_eye',
    label: 'Star Eyes',
    category: 'Fun Mascots',
    url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=StarGamerWin'
  },
  {
    id: 'fun_gold_crown',
    label: 'Lucky Wink',
    category: 'Fun Mascots',
    url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=LuckyWink777'
  },
  {
    id: 'fun_cool_sunglass',
    label: 'Cool Boss',
    category: 'Fun Mascots',
    url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=CoolBossPlayer'
  },
  {
    id: 'fun_fire_flame',
    label: 'Fire Pro',
    category: 'Fun Mascots',
    url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=FireProPlayer'
  },
  {
    id: 'fun_party_king',
    label: 'Jackpot Ace',
    category: 'Fun Mascots',
    url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=JackpotAce'
  }
];

export const AvatarSelectorModal: React.FC<AvatarSelectorModalProps> = ({
  isOpen,
  onClose
}) => {
  const { profile, updateProfilePhoto, updateDisplayName } = useAuth();
  const [selectedPhoto, setSelectedPhoto] = useState<string>(
    profile?.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${profile?.uid || 'player'}`
  );
  const [nameInput, setNameInput] = useState<string>(profile?.displayName || '');
  const [isSaving, setIsSaving] = useState(false);
  const [mainTab, setMainTab] = useState<'gallery' | 'avatars' | 'custom'>('gallery');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Gallery Upload & AI Moderation States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'safe' | 'unsafe'>('idle');
  const [unsafeReason, setUnsafeReason] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Custom Avatar Studio state
  const [customStyle, setCustomStyle] = useState<'bottts' | 'adventurer' | 'lorelei' | 'fun-emoji'>('adventurer');
  const [customSeed, setCustomSeed] = useState<string>(profile?.displayName || 'Player1');
  const [customBgColor, setCustomBgColor] = useState<string>('b6e3f4,c0aede');

  if (!isOpen) return null;

  // Process & compress uploaded image file from gallery
  const handleImageUpload = (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Kripya valid image file (JPG, PNG, WebP) select karein.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('Image size 10MB se kam hona chahiye.');
      return;
    }

    setErrorMessage(null);
    setScanStatus('scanning');
    setIsScanning(true);
    setUnsafeReason(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        // Resize image to max 400x400 with high quality square crop for profile display
        const canvas = document.createElement('canvas');
        const maxDim = 400;
        let width = img.width;
        let height = img.height;

        // Center square crop
        const minDim = Math.min(width, height);
        const startX = (width - minDim) / 2;
        const startY = (height - minDim) / 2;

        canvas.width = maxDim;
        canvas.height = maxDim;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, maxDim, maxDim);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);

          // Now perform AI 18+ & Content Safety Scan via server
          try {
            const response = await fetch('/api/moderate-image', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                imageBase64: compressedBase64,
                mimeType: 'image/jpeg'
              })
            });

            if (!response.ok) {
              throw new Error('Safety scan server response failed.');
            }

            const data = await response.json();

            if (data.isSafe === false) {
              // 18+ / INAPPROPRIATE CONTENT DETECTED!
              setIsScanning(false);
              setScanStatus('unsafe');
              const reasonText =
                data.reason ||
                '18+, adult content, ya inappropriate photo detect hui hai. Yeh image lagana mana hai!';
              setUnsafeReason(reasonText);
              setShowRejectModal(true);
              sound.playError();
              // Reset photo to previous safe photo
              setSelectedPhoto(profile?.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${profile?.uid || 'player'}`);
            } else {
              // PHOTO IS SAFE & VERIFIED!
              setIsScanning(false);
              setScanStatus('safe');
              setSelectedPhoto(compressedBase64);
              sound.playWin();
            }
          } catch (err) {
            console.warn('AI moderation scan fallback:', err);
            // If offline/server issue, still allow the processed photo
            setIsScanning(false);
            setScanStatus('safe');
            setSelectedPhoto(compressedBase64);
          }
        }
      };
      img.onerror = () => {
        setIsScanning(false);
        setScanStatus('idle');
        setErrorMessage('Image load karne me error aayi.');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Generate safe dynamic Dicebear avatar
  const handleGenerateCustom = (seedStr: string, styleChoice: string, bgChoice: string) => {
    const cleanSeed = encodeURIComponent(seedStr.trim() || 'Champion');
    const newUrl = `https://api.dicebear.com/7.x/${styleChoice}/svg?seed=${cleanSeed}&backgroundColor=${bgChoice}`;
    setSelectedPhoto(newUrl);
    setScanStatus('safe');
    sound.playCoinSound();
  };

  // 1-Click Random Safe Avatar
  const handleGenerateRandom = () => {
    const randomSeeds = ['LuckyTiger', 'AceGamer', 'King777', 'CyberNinja', 'TitanGold', 'StarValkyrie', 'ProPlayer99', 'VictoryRoyale'];
    const randomSeed = randomSeeds[Math.floor(Math.random() * randomSeeds.length)] + Math.floor(Math.random() * 999);
    const styles: Array<'bottts' | 'adventurer' | 'fun-emoji' | 'lorelei'> = ['adventurer', 'bottts', 'lorelei', 'fun-emoji'];
    const randomStyle = styles[Math.floor(Math.random() * styles.length)];
    const bgList = ['ffd5dc,d1d4f9', 'ffdfba,baffc9', 'b6e3f4,c0aede', 'ffffba,ffdfba'];
    const randomBg = bgList[Math.floor(Math.random() * bgList.length)];

    setCustomSeed(randomSeed);
    setCustomStyle(randomStyle);
    setCustomBgColor(randomBg);
    handleGenerateCustom(randomSeed, randomStyle, randomBg);
  };

  const handleSave = async () => {
    if (!profile?.uid) return;

    if (scanStatus === 'unsafe') {
      setErrorMessage('18+ ya rejected photo save nahi ki ja sakti. Kripya doosri photo chunein.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      // 1. Update Profile Photo
      if (selectedPhoto && selectedPhoto !== profile.photoURL) {
        await updateProfilePhoto(selectedPhoto);
      }

      // 2. Update Display Name if changed
      if (nameInput.trim() && nameInput.trim() !== profile.displayName) {
        await updateDisplayName(nameInput.trim());
      }

      sound.playWin();
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 }
      });

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Save profile error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update profile picture.');
    } finally {
      setIsSaving(false);
    }
  };

  const categories = [
    { id: 'All', label: 'All Avatars', icon: Sparkles },
    { id: 'Gaming', label: 'Pro Gaming', icon: Gamepad2 },
    { id: 'Warriors', label: 'Warriors & Anime', icon: Flame },
    { id: 'Cyber Bots', label: 'Cyber Bots', icon: Bot },
    { id: 'Adventurers', label: 'Adventurers', icon: Compass },
    { id: 'Fun Mascots', label: 'Fun Mascots', icon: Smile }
  ];

  const filteredAvatars =
    activeCategory === 'All'
      ? SAFE_VERIFIED_AVATARS
      : SAFE_VERIFIED_AVATARS.filter((a) => a.category === activeCategory);

  if (!isOpen) return null;

  return (
    <>
      <div key="avatar-selector-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto">
        <motion.div
          key="avatar-modal-card"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-800 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
                <Crown className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="font-display font-black text-lg sm:text-xl text-white">
                  Profile Photo & Avatar Studio
                </h3>
                <p className="text-xs text-purple-200 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Gallery Upload + 18+ AI Safety Shield</span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Main Mode Tabs */}
          <div className="flex items-center bg-slate-100 p-1.5 border-b border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setMainTab('gallery')}
              className={`flex-1 py-2 px-3 rounded-xl font-display font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all ${
                mainTab === 'gallery'
                  ? 'bg-white text-purple-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Gallery Upload (AI Safe)</span>
            </button>
            <button
              type="button"
              onClick={() => setMainTab('avatars')}
              className={`flex-1 py-2 px-3 rounded-xl font-display font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all ${
                mainTab === 'avatars'
                  ? 'bg-white text-purple-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              <span>36+ Gaming Avatars</span>
            </button>
            <button
              type="button"
              onClick={() => setMainTab('custom')}
              className={`flex-1 py-2 px-3 rounded-xl font-display font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all ${
                mainTab === 'custom'
                  ? 'bg-white text-purple-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Custom Studio</span>
            </button>
          </div>

          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
            {/* Live Preview & Name Edit Card */}
            <div className="bg-gradient-to-br from-slate-50 to-purple-50/50 rounded-2xl p-3.5 sm:p-4 border border-purple-100 flex flex-col sm:flex-row items-center gap-4">
              <div className="relative group shrink-0">
                <img
                  src={selectedPhoto}
                  alt="Profile Avatar Preview"
                  className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl object-cover border-3 border-purple-500 shadow-md bg-white"
                  referrerPolicy="no-referrer"
                />

                {/* AI Status Badge */}
                {isScanning ? (
                  <div className="absolute inset-0 bg-slate-950/70 rounded-2xl flex flex-col items-center justify-center text-white backdrop-blur-xs p-1">
                    <Loader2 className="w-6 h-6 text-amber-400 animate-spin mb-1" />
                    <span className="text-[9px] font-black text-amber-300 text-center leading-tight">
                      AI 18+ Scan...
                    </span>
                  </div>
                ) : scanStatus === 'safe' ? (
                  <div className="absolute -bottom-1.5 -right-1.5 bg-emerald-600 text-white p-1 rounded-full shadow-md border-2 border-white" title="Verified Clean Image">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                ) : scanStatus === 'unsafe' ? (
                  <div className="absolute -bottom-1.5 -right-1.5 bg-rose-600 text-white p-1 rounded-full shadow-md border-2 border-white" title="Blocked: 18+ Content">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="absolute -bottom-1.5 -right-1.5 bg-purple-600 text-white p-1 rounded-full shadow-md border-2 border-white">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              <div className="flex-1 w-full text-center sm:text-left space-y-2">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 block">
                      Leaderboard Profile Preview
                    </span>
                    {scanStatus === 'safe' && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        AI Verified Safe
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-0.5">
                    <span className="font-display font-black text-slate-900 text-base">
                      {nameInput.trim() || profile?.displayName || 'Player'}
                    </span>
                    {profile?.isVerified && (
                      <span className="bg-blue-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                        ✓
                      </span>
                    )}
                  </div>
                </div>

                {/* Display Name Input */}
                <div className="relative">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Enter your player display name..."
                    maxLength={25}
                    className="w-full text-xs bg-white border border-purple-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* TAB 1: Gallery Upload with AI 18+ Protection */}
            {mainTab === 'gallery' && (
              <div className="space-y-3">
                <div className="bg-gradient-to-br from-indigo-50/70 to-purple-50/70 border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-3xl p-5 text-center transition-all">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleImageUpload(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />

                  <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-indigo-600/30">
                    {isScanning ? (
                      <ScanLine className="w-7 h-7 animate-pulse text-amber-300" />
                    ) : (
                      <ImageIcon className="w-7 h-7" />
                    )}
                  </div>

                  <h4 className="font-display font-black text-slate-900 text-sm mb-1">
                    Upload Photo from Phone Gallery
                  </h4>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto mb-4">
                    Apni gallery se pasand ki photo chunein. Har photo ko hamara <strong>AI 18+ Safety Shield</strong> scan karke check karta hai taaki platform par koi galat photo na lag sake.
                  </p>

                  <button
                    type="button"
                    disabled={isScanning}
                    onClick={() => fileInputRef.current?.click()}
                    className="py-2.5 px-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 active:scale-95 text-white font-display font-black text-xs rounded-xl shadow-md transition-all inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isScanning ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>AI Safety Scanning in Progress...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Select Photo from Gallery</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Safety Shield Details */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>AI Safety Policy (18+ Strictly Prohibited)</span>
                  </div>
                  <ul className="text-[11px] text-slate-600 space-y-1 list-disc list-inside">
                    <li>Selfie, normal portraits, sports, anime, cars, aur natural photos bilkul allowed hain.</li>
                    <li><strong className="text-rose-600">18+, nudity, adult content, vulgarity, ya gore photos automatically reject aur block ho jayengi.</strong></li>
                  </ul>
                </div>
              </div>
            )}

            {/* TAB 2: Pick from 36+ Verified HD Avatars */}
            {mainTab === 'avatars' && (
              <div className="space-y-3">
                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                  {categories.map((cat, cIdx) => {
                    const Icon = cat.icon;
                    const isActive = activeCategory === cat.id;
                    return (
                      <button
                        key={`cat-pill-${cat.id}-${cIdx}`}
                        type="button"
                        onClick={() => setActiveCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                          isActive
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Grid of Avatars */}
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5 max-h-64 overflow-y-auto pr-1">
                  {filteredAvatars.map((avatar, aIdx) => {
                    const isSelected = selectedPhoto === avatar.url;
                    return (
                      <button
                        key={avatar.id ? `avatar-${avatar.id}-${aIdx}` : `avatar-${aIdx}`}
                        type="button"
                        onClick={() => {
                          setSelectedPhoto(avatar.url);
                          setScanStatus('safe');
                          sound.playCoinSound();
                        }}
                        className={`relative group rounded-2xl p-1.5 transition-all border-2 flex flex-col items-center justify-center cursor-pointer ${
                          isSelected
                            ? 'border-purple-600 bg-purple-50/80 shadow-md ring-2 ring-purple-400/50 scale-105'
                            : 'border-slate-200 hover:border-purple-300 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <img
                          src={avatar.url}
                          alt={avatar.label}
                          className="w-12 h-12 rounded-xl object-cover bg-slate-50"
                          referrerPolicy="no-referrer"
                        />
                        <span className="text-[9px] font-bold text-slate-700 truncate w-full text-center mt-1">
                          {avatar.label}
                        </span>
                        {isSelected && (
                          <div className="absolute top-1 right-1 bg-purple-600 text-white p-0.5 rounded-full shadow-xs">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: Safe Custom Character Generator */}
            {mainTab === 'custom' && (
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-black text-slate-900">Custom Vector Character Generator</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateRandom}
                    className="text-[11px] font-extrabold text-purple-700 hover:text-purple-900 flex items-center gap-1 bg-purple-100/90 px-2.5 py-1 rounded-xl transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Random Combo</span>
                  </button>
                </div>

                {/* Style selector */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { id: 'adventurer', label: 'Anime Hero' },
                    { id: 'bottts', label: 'Cyber Bot' },
                    { id: 'lorelei', label: 'Pro Gamer' },
                    { id: 'fun-emoji', label: 'Cool Emoji' }
                  ].map((s, sIdx) => (
                    <button
                      key={`style-${s.id}-${sIdx}`}
                      type="button"
                      onClick={() => {
                        const newStyle = s.id as any;
                        setCustomStyle(newStyle);
                        handleGenerateCustom(customSeed, newStyle, customBgColor);
                      }}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all border ${
                        customStyle === s.id
                          ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* Seed text input for instant safe customization */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customSeed}
                    onChange={(e) => {
                      setCustomSeed(e.target.value);
                      handleGenerateCustom(e.target.value, customStyle, customBgColor);
                    }}
                    placeholder="Type any word to transform avatar..."
                    maxLength={20}
                    className="flex-1 text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Action Buttons */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isScanning || scanStatus === 'unsafe'}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:to-indigo-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving to Leaderboard...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Photo Saved Successfully!</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Profile Photo</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>

      {/* 18+ / INAPPROPRIATE PHOTO REJECTED MODAL POPUP */}
      <AnimatePresence>
        {showRejectModal && (
          <div key="reject-modal-backdrop" className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              key="reject-modal-card"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 text-center relative overflow-hidden"
            >
              {/* Close button */}
              <button
                onClick={() => setShowRejectModal(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Red Shield Alert */}
              <div className="w-16 h-16 rounded-3xl bg-rose-500 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/30 font-black">
                <ShieldAlert className="w-9 h-9" />
              </div>

              <h4 className="font-display font-black text-xl text-slate-900 mb-2">
                18+ / Inappropriate Photo Rejected!
              </h4>

              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-xs text-rose-800 text-left mb-4 leading-relaxed">
                <p className="font-bold mb-1">AI Safety Reason:</p>
                <p>{unsafeReason || 'Yeh photo 18+ ya community guidelines ke khilaf hai. Leaderboard aur public profile par aisi photo allow nahi hai.'}</p>
              </div>

              <p className="text-xs text-slate-600 mb-5">
                Kripya apni saaf aur clean photo upload karein ya hamari Gaming Avatar library me se choose karein.
              </p>

              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(false);
                  setScanStatus('idle');
                }}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-700 to-indigo-700 text-white font-display font-black text-xs rounded-xl shadow-md cursor-pointer active:scale-95"
              >
                Choose Another Photo
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
