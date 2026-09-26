import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
  setLogLevel,
  doc,
  getDoc
} from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';

// Single Unified Firebase Configuration for both User App and Admin Panel
export const firebaseConfig = {
  apiKey: "AIzaSyAjTZ3wxBZ_RTp5rhI-nYl7DmRawYi53z0",
  authDomain: "rewardluxe-4c773.firebaseapp.com",
  projectId: "rewardluxe-4c773",
  storageBucket: "rewardluxe-4c773.firebasestorage.app",
  messagingSenderId: "916163780121",
  appId: "1:916163780121:web:5b2b797c4b27d23aa81488",
  measurementId: "G-TDBFYG1H2P",
  ...firebaseConfigJson
};

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Set Firestore log level to silent to prevent connection retry console warnings
setLogLevel('silent');

// Configure robust local caching (IndexedDB multi-tab or in-memory fallback)
let cacheConfig;
try {
  if (typeof window !== 'undefined' && 'indexedDB' in window) {
    cacheConfig = persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    });
  } else {
    cacheConfig = memoryLocalCache();
  }
} catch {
  cacheConfig = memoryLocalCache();
}

// Initialize Firestore with auto-detect long polling and multi-tab persistent cache
export const db = initializeFirestore(app, {
  localCache: cacheConfig,
  experimentalAutoDetectLongPolling: true,
  ignoreUndefinedProperties: true
});

// Non-blocking initialization check using cached getDoc
if (typeof window !== 'undefined') {
  getDoc(doc(db, 'settings', 'global')).catch(() => {
    // Graceful silent fallback for offline mode
  });
}

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export default app;
