import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  increment
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SupportMessage, SupportConversation, SupportSender, UserProfile } from '../types';

export const TELEGRAM_BOT_TOKEN = '8965664001:AAHv7QlaqEk2j7HgPYt34p8Chyxr8lWZaso';
export const TELEGRAM_BOT_USERNAME = 'Websitename';
export const TELEGRAM_BOT_URL = 'https://t.me/Websitename';

// Smart Automated Knowledge-Base Engine for Bot Instant Replies (Hindi & English friendly)
export function generateSmartAutoReply(
  userText: string,
  userName: string,
  hasPhoto: boolean = false,
  userProfile?: UserProfile | null
): string {
  const text = (userText || '').toLowerCase().trim();

  if (hasPhoto) {
    if (text.includes('task') || text.includes('proof') || text.includes('reject') || text.includes('submit')) {
      return `📸 **Screenshot / Proof Mil Gaya!**\n\nDhanyawad ${userName}! Aapka task completion screenshot support file me attach kar diya gaya hai aur hamari Admin Team ko bhej diya gaya hai.\n\n⚡ **Task Approval Checklist:**\n• Screenshot me aapka registered username ya completion screen saaf dikhni chahiye.\n• Admin team 1 se 12 ghante ke andar task verify & approve karti hai.\n• Approve hote hi Reward Coins aapke wallet me automatically credit ho jayenge!\n\nHamare live Admin ko notification bhej diya gaya hai.`;
    }
    if (text.includes('withdraw') || text.includes('payment') || text.includes('upi') || text.includes('money') || text.includes('bank') || text.includes('paise')) {
      return `📸 **Payment / Withdrawal Screenshot Mil Gaya!**\n\nHumne aapka payment screenshot note kar liya hai. Hamari finance team aapki UPI ID/Bank details verify kar rahi hai.\n\n⏱️ **Withdrawal Timing:**\n• UPI & Google Play Redeem Codes: 2 se 24 ghante ke andar.\n• Bank Transfer: 24 se 48 working hours.\n\nAap apna status anytime Profile > Withdrawals me track kar sakte hain.`;
    }
    return `📸 **Screenshot Safalta Se Mil Gaya!**\n\nNamaste ${userName}, screenshot attach karne ke liye dhanyawad! Ye screenshot Admin Panel me save ho gaya hai.\n\nHamari Support team isko review karke reply karegi. Agar koi aur detail batani ho toh neeche likh sakte hain.`;
  }

  // Greeting
  if (/^(hi|hello|hey|namaste|hlo|helo|kaise|kya|start|pranam)/i.test(text)) {
    return `👋 **Namaste ${userName}! Live Support me aapka swagat hai.**\n\nMain hoon **Live Support Assistant**. Aap Hindi ya English me baat kar sakte hain. Main aapki kya madad kar sakta hoon?\n\n• 💰 Coins earning aur task approvals\n• 💳 Withdrawal status aur UPI payout\n• 🎁 Daily streak aur spin rewards\n• 👥 Referral bonus (100 coins + 3% commission)\n\nApna sawal yahan type karein ya 📎 screenshot bhej kar turant help payein!`;
  }

  // Task Rejected or Submission Issues
  if (text.includes('reject') || text.includes('task') || text.includes('submission') || text.includes('proof') || text.includes('kyu') || text.includes('hua')) {
    return `⚠️ **Task Reject Kyu Hota Hai & Solution:**\n\nTask reject hone ke aam kaaran:\n1. **Galat ya Blank Proof**: Unrelated ya blur screenshot upload karna.\n2. **Incomplete Step**: App ko required time tak open na rakhna ya task ka step miss karna.\n3. **Pehle se Installed**: Sponsor tasks sirf first-time fresh install par reward dete hain.\n\n💡 **Aap kya kar sakte hain:**\n• Aap yahan **📎 attachment icon** se apna valid screenshot/proof dobara bhej sakte hain!\n• Admin Panel se hum ise manually re-verify karke approve kar denge.`;
  }

  // Withdrawal / Payment Query
  if (text.includes('withdraw') || text.includes('payout') || text.includes('payment') || text.includes('paise') || text.includes('upi') || text.includes('redeem') || text.includes('kab') || text.includes('nikale')) {
    const minWithdraw = 10;
    const coinsRate = 100;
    return `💳 **Withdrawal & Payment Ki Jankari:**\n\n• **Conversion Rate:** ${coinsRate} Coins = ₹1 INR\n• **Minimum Withdrawal:** ₹${minWithdraw} (${minWithdraw * coinsRate} Coins)\n• **Payout Methods:** UPI, Google Play Redeem Code aur Direct Bank Transfer\n• **Transfer Timing:** Payment request aane ke **2 se 24 ghante** ke andar bhej diya jata hai.\n\n🔒 **Zaroori Rule:** Har withdrawal ke liye task complete karna hota hai (Jaise ₹10 ke liye 1 task, ₹20 ke liye 2 tasks, ₹50 ke liye 5 tasks). Har baar withdraw karne par fresh tasks complete karne ka option aata hai.`;
  }

  // Coins not added / Missing coins
  if (text.includes('coin') || text.includes('balance') || text.includes('point') || text.includes('credit') || text.includes('mile') || text.includes('nahi mila')) {
    return `💰 **Coins Wallet & Balance Jankari:**\n\n• **Spin & Scratch:** Coins turant aapke wallet me credit hote hain.\n• **Daily Check-In:** Har roz check-in karke badhte hue streak coins claim karein.\n• **Task Offers:** Advertiser verification ke baad 15–60 minute me coins credit ho jate hain.\n\nAgar kisi task ke coins abhi tak pending hain, toh screenshot yahan bhej dein, hum manually check kar lenge!`;
  }

  // Referral query
  if (text.includes('refer') || text.includes('friend') || text.includes('invite') || text.includes('code') || text.includes('dost')) {
    return `👥 **Refer & Earn Program:**\n\n• **Instant Bonus:** Jab aapka friend aapke referral code se join karta hai, toh **aap dono ko 100-100 Coins** turant milte hain!\n• **Lifetime Commission:** Aapko aapke dost ki har earning par **lifetime 3% commission** milta hai!\n• Friends ki list aur total commission aap Profile > Referral History me dekh sakte hain.`;
  }

  // Spin / Scratch / Captcha limit
  if (text.includes('spin') || text.includes('scratch') || text.includes('captcha') || text.includes('limit') || text.includes('khatam')) {
    return `🎯 **Daily Limits Jankari:**\n\n• 🎡 **Lucky Spin:** 10 spins daily\n• 🎫 **Scratch Cards:** 10 scratch cards daily\n• 🔢 **Math Captcha:** 20 captchas daily\n\n⏳ **Reset Timing:** Sabhi daily limits roz **raat 12:00 baje (00:00 midnight)** refresh ho jati hain!`;
  }

  // Ban / Suspended account
  if (text.includes('ban') || text.includes('suspend') || text.includes('block') || text.includes('locked')) {
    return `🛡️ **Account Review Request:**\n\nAgar aapka account ya withdrawal flag hua hai, toh multi-account ya VPN use karne ki wajah se ho sakta hai. Aap yahan apni problem likhein ya official Telegram bot **@${TELEGRAM_BOT_USERNAME}** par contact karein. Admin manually check karke unlock kar denge.`;
  }

  // Telegram direct bot
  if (text.includes('telegram') || text.includes('human') || text.includes('admin') || text.includes('agent') || text.includes('contact') || text.includes('baat')) {
    return `🤖 **Official Telegram Support:**\n\nAap hamare official Telegram Support Bot se direct bhi baat kar sakte hain:\n👉 [Telegram Support Open Karein](${TELEGRAM_BOT_URL})\n\nHamari admin team is chat par bhi aapko live reply karegi!`;
  }

  // Default helpful response
  return `Dhanyawad aapke message ke liye, ${userName}! 🌟\n\nAapka request humne record kar liya hai: "${userText.slice(0, 100)}${userText.length > 100 ? '...' : ''}".\n\nHamari Live Admin Team ne ye ticket receive kar liya hai aur jald se jald yahan reply karegi. Agar koi screenshot bhejna hai toh **📎 attachment button** use kar sakte hain.`;
}

// Send message from user
export async function sendUserSupportMessage(
  userId: string,
  userEmail: string,
  userName: string,
  userPhoto: string | undefined,
  text: string,
  photoURL?: string,
  userCoins?: number
): Promise<{ userMsgId: string; botMsgId?: string }> {
  const conversationId = userId;
  const now = Date.now();
  const cleanText = text.trim();
  const hasPhoto = Boolean(photoURL);

  const convRef = doc(db, 'support_conversations', conversationId);
  const msgColl = collection(db, 'support_messages');

  // 1. Add User Message
  const userMsgDoc = await addDoc(msgColl, {
    conversationId,
    userId,
    userName,
    userEmail,
    userPhoto: userPhoto || '',
    sender: 'user' as SupportSender,
    text: cleanText,
    photoURL: photoURL || '',
    timestamp: now,
    read: false
  });

  // 2. Update / Upsert Conversation document
  const convData: Partial<SupportConversation> = {
    id: conversationId,
    userId,
    userEmail: userEmail.toLowerCase(),
    userName: userName || 'Player',
    userPhoto: userPhoto || '',
    userCoins: userCoins || 0,
    lastMessage: cleanText || (hasPhoto ? '📷 Photo Attachment' : 'Message'),
    lastMessageAt: now,
    lastSender: 'user',
    hasPhoto,
    status: 'open',
    updatedAt: now
  };

  try {
    const convSnap = await getDoc(convRef);
    if (!convSnap.exists()) {
      await setDoc(convRef, {
        ...convData,
        unreadByAdmin: 1,
        unreadByUser: 0,
        createdAt: now
      });
    } else {
      await updateDoc(convRef, {
        ...convData,
        unreadByAdmin: increment(1)
      });
    }
  } catch (err) {
    console.warn('Error updating conversation doc:', err);
  }

  // 3. Generate Smart Auto-Reply from Bot
  let botMsgId: string | undefined;
  const autoReplyText = generateSmartAutoReply(cleanText, userName, hasPhoto);

  try {
    const botNow = Date.now() + 500;
    const botMsgDoc = await addDoc(msgColl, {
      conversationId,
      userId,
      userName: 'Bucksy AI Support',
      userEmail: 'support@rewardluxe.com',
      userPhoto: 'https://api.dicebear.com/7.x/bottts/svg?seed=BucksyAI',
      sender: 'bot' as SupportSender,
      text: autoReplyText,
      timestamp: botNow,
      read: true
    });
    botMsgId = botMsgDoc.id;

    // Update conversation last message to bot's auto-reply
    await updateDoc(convRef, {
      lastMessage: autoReplyText.slice(0, 120),
      lastMessageAt: botNow,
      lastSender: 'bot',
      updatedAt: botNow
    });
  } catch (botErr) {
    console.warn('Error saving bot auto-reply:', botErr);
  }

  // 4. Try optional dispatch to Telegram Bot API (Non-blocking)
  notifyTelegramBot(userName, userEmail, cleanText, hasPhoto).catch(() => {});

  return { userMsgId: userMsgDoc.id, botMsgId };
}

// Send Admin Reply from Admin Panel
export async function sendAdminSupportReply(
  conversationId: string,
  userId: string,
  text: string,
  photoURL?: string,
  adminName: string = 'Support Admin'
): Promise<string> {
  const now = Date.now();
  const cleanText = text.trim();
  const hasPhoto = Boolean(photoURL);

  const msgColl = collection(db, 'support_messages');
  const convRef = doc(db, 'support_conversations', conversationId);

  // 1. Add Admin Message
  const adminMsgDoc = await addDoc(msgColl, {
    conversationId,
    userId,
    userName: adminName,
    userEmail: 'admin@rewardluxe.com',
    userPhoto: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&auto=format&fit=crop&q=80',
    sender: 'admin' as SupportSender,
    text: cleanText,
    photoURL: photoURL || '',
    timestamp: now,
    read: false
  });

  // 2. Update Conversation Document
  try {
    await updateDoc(convRef, {
      lastMessage: cleanText || (hasPhoto ? '📷 Admin Photo' : 'Admin Response'),
      lastMessageAt: now,
      lastSender: 'admin',
      unreadByUser: increment(1),
      unreadByAdmin: 0,
      status: 'pending_admin',
      updatedAt: now
    });
  } catch (err) {
    console.warn('Error updating conversation on admin reply:', err);
  }

  return adminMsgDoc.id;
}

// Subscribe to messages in a specific conversation (for User or Admin Live Chat)
export function subscribeSupportMessages(
  conversationId: string,
  callback: (messages: SupportMessage[]) => void
): () => void {
  try {
    const q = query(
      collection(db, 'support_messages'),
      where('conversationId', '==', conversationId),
      limit(200)
    );

    return onSnapshot(
      q,
      (snap) => {
        const msgs: SupportMessage[] = [];
        snap.forEach((d) => {
          msgs.push({ id: d.id, ...(d.data() as Omit<SupportMessage, 'id'>) });
        });
        msgs.sort((a, b) => a.timestamp - b.timestamp);
        callback(msgs);
      },
      (err) => {
        console.warn('Real-time support messages error:', err);
      }
    );
  } catch (err) {
    console.warn('Could not establish support messages listener:', err);
    return () => {};
  }
}

// Subscribe to all conversations (for Admin Panel Support Desk)
export function subscribeAllSupportConversations(
  callback: (conversations: SupportConversation[]) => void
): () => void {
  try {
    const q = query(
      collection(db, 'support_conversations'),
      limit(150)
    );

    return onSnapshot(
      q,
      (snap) => {
        const convs: SupportConversation[] = [];
        snap.forEach((d) => {
          convs.push({ id: d.id, ...(d.data() as Omit<SupportConversation, 'id'>) });
        });
        convs.sort((a, b) => (b.lastMessageAt || b.updatedAt || 0) - (a.lastMessageAt || a.updatedAt || 0));
        callback(convs);
      },
      (err) => {
        console.warn('Real-time support conversations error:', err);
      }
    );
  } catch (err) {
    console.warn('Could not establish support conversations listener:', err);
    return () => {};
  }
}

// Mark conversation as read by Admin
export async function markConversationReadByAdmin(conversationId: string): Promise<void> {
  try {
    const convRef = doc(db, 'support_conversations', conversationId);
    await updateDoc(convRef, {
      unreadByAdmin: 0,
      updatedAt: Date.now()
    });
  } catch (err) {
    console.warn('Failed to mark conversation read by admin:', err);
  }
}

// Mark conversation as read by User
export async function markConversationReadByUser(conversationId: string): Promise<void> {
  try {
    const convRef = doc(db, 'support_conversations', conversationId);
    await updateDoc(convRef, {
      unreadByUser: 0,
      updatedAt: Date.now()
    });
  } catch (err) {
    console.warn('Failed to mark conversation read by user:', err);
  }
}

// Update conversation status (open / resolved)
export async function updateConversationStatus(
  conversationId: string,
  status: 'open' | 'resolved' | 'pending_admin'
): Promise<void> {
  try {
    const convRef = doc(db, 'support_conversations', conversationId);
    await updateDoc(convRef, {
      status,
      updatedAt: Date.now()
    });
  } catch (err) {
    console.warn('Failed to update conversation status:', err);
  }
}

// Clear all messages in a conversation
export async function clearSupportMessages(conversationId: string): Promise<void> {
  try {
    const q = query(
      collection(db, 'support_messages'),
      where('conversationId', '==', conversationId)
    );
    const snap = await getDocs(q);
    const promises = snap.docs.map(d => deleteDoc(d.ref));
    await Promise.all(promises);

    const convRef = doc(db, 'support_conversations', conversationId);
    await updateDoc(convRef, {
      lastMessage: 'Chat cleared',
      lastMessageAt: Date.now(),
      unreadByAdmin: 0,
      unreadByUser: 0,
      hasPhoto: false,
      updatedAt: Date.now()
    });
  } catch (err) {
    console.warn('Error clearing support messages:', err);
  }
}

// Optional helper to notify Telegram bot API webhook or get updates
async function notifyTelegramBot(userName: string, userEmail: string, text: string, hasPhoto: boolean): Promise<void> {
  // Telegram Bot Token: 8965664001:AAHv7QlaqEk2j7HgPYt34p8Chyxr8lWZaso
  // In client environment, we can interact with Telegram API if desired
  try {
    // If webhook or telegram group/channel notification is configured
  } catch {
    // Ignore offline telegram dispatch
  }
}
