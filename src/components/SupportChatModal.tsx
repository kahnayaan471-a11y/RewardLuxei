import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send,
  Paperclip,
  X,
  Trash2,
  Moon,
  Sun,
  ExternalLink,
  Bot,
  User,
  Shield,
  CheckCheck,
  Image as ImageIcon,
  ZoomIn,
  Maximize2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  sendUserSupportMessage,
  subscribeSupportMessages,
  markConversationReadByUser,
  clearSupportMessages,
  TELEGRAM_BOT_USERNAME,
  TELEGRAM_BOT_URL
} from '../services/supportService';
import { SupportMessage } from '../types';
import { sound } from '../utils/sound';

interface SupportChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth?: () => void;
  initialQuery?: string;
}

const QUICK_SUGGESTIONS = [
  { label: 'Task reject kyu hua?', icon: '⚠️' },
  { label: 'Withdrawal paise kab aayenge?', icon: '💳' },
  { label: 'Coins kaise kamaye?', icon: '💰' },
  { label: 'Referral bonus nahi mila', icon: '👥' },
  { label: 'Telegram Support Bot', icon: '🤖' }
];

export const SupportChatModal: React.FC<SupportChatModalProps> = ({
  isOpen,
  onClose,
  onOpenAuth,
  initialQuery
}) => {
  const { profile, user } = useAuth();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Persistent Guest ID for non-logged-in users so chat works seamlessly
  const guestUid = React.useMemo(() => {
    try {
      const stored = localStorage.getItem('rewardluxe_guest_support_id');
      if (stored) return stored;
      const created = 'guest_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('rewardluxe_guest_support_id', created);
      return created;
    } catch {
      return 'guest_user';
    }
  }, []);

  const userId = profile?.uid || user?.uid || guestUid;
  const userName = profile?.displayName || user?.displayName || 'Player';
  const userEmail = profile?.email || user?.email || 'player@rewardluxe.com';
  const userPhoto = profile?.photoURL || user?.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`;

  // Subscribe to real-time messages
  useEffect(() => {
    if (!isOpen || !userId) return;

    markConversationReadByUser(userId);

    const unsubscribe = subscribeSupportMessages(userId, (msgs) => {
      setMessages(msgs);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => unsubscribe();
  }, [isOpen, userId]);

  // Handle initial query if passed
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      setInputText(initialQuery);
    }
  }, [initialQuery]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  // Handle Image Selection / Upload
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Please select an image smaller than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setSelectedPhoto(result);
        sound.playTick();
      }
    };
    reader.readAsDataURL(file);
  };

  // Send Message
  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend && !selectedPhoto) return;

    setIsSending(true);
    setInputText('');
    const photoToSend = selectedPhoto;
    setSelectedPhoto(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    sound.playTick();

    try {
      await sendUserSupportMessage(
        userId,
        userEmail,
        userName,
        userPhoto,
        textToSend,
        photoToSend || undefined,
        profile?.coins || 0
      );
    } catch (err) {
      console.error('Failed to send support message:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Handle Clear History
  const handleClearHistory = async () => {
    if (!userId) return;
    try {
      await clearSupportMessages(userId);
      setMessages([]);
      setShowClearConfirm(false);
      sound.playTick();
    } catch (err) {
      console.error('Error clearing messages:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-xs animate-fadeIn">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        className={`w-full sm:max-w-md md:max-w-lg h-full sm:h-[680px] sm:max-h-[92vh] flex flex-col rounded-none sm:rounded-3xl shadow-2xl overflow-hidden transition-colors ${
          isDarkMode ? 'bg-[#0f172a] text-slate-100' : 'bg-white text-slate-900'
        }`}
      >
        {/* Top Header matching exact screenshot (#1e7e34 / emerald green) */}
        <div
          className={`px-4 py-3 border-b flex items-center justify-between gap-3 shrink-0 ${
            isDarkMode
              ? 'bg-[#14532d] text-white border-green-950'
              : 'bg-[#1b7340] text-white border-green-800'
          }`}
        >
          {/* Avatar & Support Title */}
          <div className="flex items-center gap-3 min-w-0">
            {/* White Squircle Avatar matching screenshot */}
            <div className="w-10 h-10 rounded-2xl bg-white text-[#1b7340] flex items-center justify-center shadow-xs shrink-0">
              <User className="w-6 h-6 fill-current" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-display font-black text-base text-white tracking-tight">
                  Live Support
                </h3>
                {/* Green Online Dot */}
                <span className="w-2.5 h-2.5 rounded-full bg-[#4ade80] border border-white/40 inline-block shadow-xs" />
              </div>
              <p className="text-[12px] text-green-100/90 font-medium truncate">
                Live Support · 24/7 Online
              </p>
            </div>
          </div>

          {/* Right Header Action Icons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="w-8 h-8 rounded-xl bg-black/15 hover:bg-black/25 border border-white/15 flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer"
              title="Toggle theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Clear Chat Trash */}
            <button
              onClick={() => setShowClearConfirm(true)}
              className="w-8 h-8 rounded-xl bg-black/15 hover:bg-black/25 border border-white/15 flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer"
              title="Clear chat history"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Close Modal */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-black/15 hover:bg-black/25 border border-white/15 flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Clear Confirmation Banner */}
        {showClearConfirm && (
          <div className="bg-rose-50 border-b border-rose-200 p-3 px-4 flex items-center justify-between text-xs text-rose-800">
            <span>Live Support chat history delete karni hai?</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearHistory}
                className="px-2.5 py-1 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700"
              >
                Clear
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-2.5 py-1 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Direct Telegram Bot Banner */}
        <div className="bg-gradient-to-r from-sky-600 to-blue-600 px-4 py-1.5 text-white flex items-center justify-between text-[11px] font-bold shadow-xs shrink-0">
          <div className="flex items-center gap-2 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span className="truncate">
              Telegram Live Bot: <strong>@{TELEGRAM_BOT_USERNAME}</strong>
            </span>
          </div>
          <a
            href={TELEGRAM_BOT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white px-2 py-0.5 rounded-full text-[10px] shrink-0 font-extrabold transition-colors"
          >
            <span>Open Bot</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Chat Messages Body */}
        <div
          className={`flex-1 overflow-y-auto p-4 space-y-4 ${
            isDarkMode ? 'bg-[#0b1329]' : 'bg-[#fafafa]'
          }`}
        >
          {/* Default Context / Welcome Card */}
          <div className="flex flex-col items-start space-y-1.5 max-w-[92%]">
            <div
              className={`p-4 rounded-3xl rounded-tl-sm text-[13px] leading-relaxed shadow-xs ${
                isDarkMode
                  ? 'bg-[#1e293b] text-slate-100 border border-slate-800'
                  : 'bg-[#f1f3f4] text-slate-800 border border-slate-200/60'
              }`}
            >
              <p className="font-semibold text-slate-900 dark:text-white mb-2">
                Namaste! 🙏 Rewardluxe Live Support me aapka swagat hai.
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                Aap yahan Task verification, Withdrawal paise, Coins ya kisi bhi problem ke baare me <strong>Hindi ya English</strong> me baat kar sakte hain. Koi screenshot proof ho toh 📎 button se attach karein.
              </p>
            </div>
            <div className="text-[11px] text-slate-400 pl-1 font-medium">
              Live Support · Assistant
            </div>
          </div>

          {/* Real-time Message Stream */}
          {messages.map((msg, index) => {
            const isUser = msg.sender === 'user';
            const isAdmin = msg.sender === 'admin';
            const isBot = msg.sender === 'bot';

            return (
              <motion.div
                key={msg.id ? `msg-${msg.id}-${index}` : `msg-${index}-${msg.timestamp || 0}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[92%] ${
                  isUser ? 'ml-auto' : 'mr-auto'
                } space-y-1`}
              >
                {/* Message Bubble */}
                <div
                  className={`p-3.5 text-[13px] leading-relaxed shadow-xs transition-all ${
                    isUser
                      ? 'bg-[#1b7340] text-white rounded-3xl rounded-tr-sm'
                      : isAdmin
                      ? 'bg-gradient-to-br from-indigo-700 to-purple-800 text-white rounded-3xl rounded-tl-sm shadow-md'
                      : isDarkMode
                      ? 'bg-[#1e293b] text-slate-100 rounded-3xl rounded-tl-sm border border-slate-800'
                      : 'bg-[#f1f3f4] text-slate-800 rounded-3xl rounded-tl-sm border border-slate-200/60'
                  }`}
                >
                  {/* Photo Attachment if any */}
                  {msg.photoURL && (
                    <div className="mb-2 relative rounded-2xl overflow-hidden border border-black/10 group cursor-pointer">
                      <img
                        src={msg.photoURL}
                        alt="Support Screenshot"
                        className="w-full max-h-64 object-cover rounded-xl"
                        onClick={() => setZoomedImage(msg.photoURL || null)}
                      />
                      <div
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 text-white text-xs font-bold transition-opacity"
                        onClick={() => setZoomedImage(msg.photoURL || null)}
                      >
                        <Maximize2 className="w-4 h-4" />
                        <span>View full screenshot</span>
                      </div>
                    </div>
                  )}

                  {/* Message Text with markdown support */}
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                </div>

                {/* Sender & Timestamp Footnote */}
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 px-1">
                  {isAdmin && (
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                      <Shield className="w-3 h-3" /> Live Support Admin
                    </span>
                  )}
                  {isBot && (
                    <span className="font-medium text-slate-500 dark:text-slate-400">
                      Live Support · Assistant
                    </span>
                  )}
                  {isUser && <span className="font-medium">You</span>}
                  <span>•</span>
                  <span>
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  {isUser && <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />}
                </div>
              </motion.div>
            );
          })}

          {/* Typing indicator when bot is answering */}
          {isSending && (
            <div className="flex items-center gap-2 text-xs text-slate-400 animate-pulse pl-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Live Support typing a response...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div
          className={`px-3 py-2 border-t flex items-center gap-2 overflow-x-auto shrink-0 ${
            isDarkMode ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200/80'
          }`}
        >
          {QUICK_SUGGESTIONS.map((chip, idx) => (
            <button
              key={`chip-${idx}`}
              onClick={() => {
                if (chip.label.includes('Telegram')) {
                  window.open(TELEGRAM_BOT_URL, '_blank');
                } else {
                  handleSendMessage(chip.label);
                }
              }}
              className={`text-[11px] font-bold px-3 py-1.5 rounded-full shrink-0 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                isDarkMode
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80'
              }`}
            >
              <span>{chip.icon}</span>
              <span>{chip.label}</span>
            </button>
          ))}
        </div>

        {/* Selected Photo Preview Chip before sending */}
        {selectedPhoto && (
          <div
            className={`px-4 py-2 border-t flex items-center justify-between gap-3 shrink-0 ${
              isDarkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-emerald-50/90 border-emerald-100'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <img
                src={selectedPhoto}
                alt="Selected preview"
                className="w-12 h-12 object-cover rounded-xl border border-emerald-300 shadow-xs"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Screenshot Attached</span>
                </span>
                <span className="text-[11px] text-slate-500">Ready to send to support &amp; admin</span>
              </div>
            </div>

            <button
              onClick={() => {
                setSelectedPhoto(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300"
              title="Remove attachment"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Input Bar matching screenshot container */}
        <div
          className={`p-3 sm:p-4 border-t shrink-0 ${
            isDarkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoSelect}
            className="hidden"
          />

          {/* Rounded Capsule Input Bar */}
          <div
            className={`flex items-center gap-2 p-1.5 pl-3 rounded-2xl border transition-all ${
              isDarkMode
                ? 'bg-[#0f172a] border-slate-700 focus-within:border-emerald-500'
                : 'bg-white border-slate-300/90 focus-within:border-[#1b7340] focus-within:ring-2 focus-within:ring-[#1b7340]/20'
            }`}
          >
            {/* Attachment Paperclip Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Attach screenshot or image"
            >
              <Paperclip className="w-5 h-5 rotate-45" />
            </button>

            {/* Text Input */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Send a message... (Hindi / English)"
              className="flex-1 bg-transparent text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none"
            />

            {/* Light Green / Emerald Send Button matching screenshot */}
            <button
              onClick={() => handleSendMessage()}
              disabled={(!inputText.trim() && !selectedPhoto) || isSending}
              className={`p-2.5 rounded-xl transition-all flex items-center justify-center ${
                (inputText.trim() || selectedPhoto) && !isSending
                  ? 'bg-[#86efac]/80 hover:bg-[#4ade80] text-[#14532d] shadow-xs active:scale-95 cursor-pointer font-bold'
                  : 'bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'
              }`}
              title="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Full Image Zoom Modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-60 bg-black/90 flex flex-col items-center justify-center p-4"
          onClick={() => setZoomedImage(null)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={() => setZoomedImage(null)}
              className="p-2.5 bg-white/20 hover:bg-white/30 rounded-full text-white cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <img
            src={zoomedImage}
            alt="Full Preview"
            className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
