// Utility to generate and persist a unique Device ID fingerprint
// Used to detect and block fake multi-account referrals from the same physical device/phone.

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server_id';

  const STORAGE_KEY = 'rewardluxe_device_fingerprint_v1';
  let deviceId = localStorage.getItem(STORAGE_KEY);

  if (!deviceId) {
    // Generate persistent fingerprint using canvas/hardware specs + random crypto UUID
    const screenSpecs = `${window.screen.width}x${window.screen.height}_${window.screen.colorDepth}`;
    const userAgent = navigator.userAgent || '';
    const language = navigator.language || '';
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    const randomSeed = Math.random().toString(36).substring(2, 10);
    const timestamp = Date.now().toString(36);

    const rawString = `${screenSpecs}_${userAgent}_${language}_${hardwareConcurrency}_${randomSeed}_${timestamp}`;

    // Simple fast hash string
    let hash = 0;
    for (let i = 0; i < rawString.length; i++) {
      const char = rawString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }

    const hexHash = Math.abs(hash).toString(16).padStart(8, '0');
    deviceId = `DEV-${hexHash.toUpperCase()}-${timestamp.toUpperCase()}`;

    try {
      localStorage.setItem(STORAGE_KEY, deviceId);
    } catch {
      // Ignore quota error
    }
  }

  return deviceId;
}

// Store list of referral codes used on this device
export function isDeviceAlreadyReferred(referralCode: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem('rewardluxe_applied_referrals_v1');
    if (raw) {
      const list: string[] = JSON.parse(raw);
      return list.includes(referralCode.trim().toUpperCase());
    }
  } catch {
    // Ignore
  }
  return false;
}

export function recordDeviceAppliedReferral(referralCode: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem('rewardluxe_applied_referrals_v1');
    const list: string[] = raw ? JSON.parse(raw) : [];
    const clean = referralCode.trim().toUpperCase();
    if (!list.includes(clean)) {
      list.push(clean);
      localStorage.setItem('rewardluxe_applied_referrals_v1', JSON.stringify(list));
    }
  } catch {
    // Ignore
  }
}
