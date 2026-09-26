import { getDeviceId } from './deviceFingerprint';

export interface ClientNetworkInfo {
  ip: string;
  networkType: string;
  deviceId: string;
}

let cachedIp: string | null = null;
let cachedNetworkType: string | null = null;

// Determine connection type from browser Network Information API if supported
export function getNetworkType(): string {
  if (typeof navigator === 'undefined') return 'unknown';

  const nav = navigator as unknown as {
    connection?: {
      effectiveType?: string;
      type?: string;
      downlink?: number;
      rtt?: number;
    };
  };

  const conn = nav.connection;
  if (!conn) return 'mobile/broadband';

  const parts: string[] = [];
  if (conn.effectiveType) parts.push(conn.effectiveType.toUpperCase());
  if (conn.type && conn.type !== 'unknown') parts.push(conn.type);

  return parts.length > 0 ? parts.join(' ') : '4G/Wi-Fi';
}

/**
 * Fetches the user's public IP address with multiple fallbacks:
 * 1. Express backend proxy endpoint (/api/client-info)
 * 2. Public IP resolution fallback (api.ipify.org)
 * 3. SessionStorage cached value to ensure fast zero-lag loads
 */
export async function getClientPublicIp(): Promise<string> {
  // Check memory cache first
  if (cachedIp && cachedIp !== '127.0.0.1' && cachedIp !== 'localhost') {
    return cachedIp;
  }

  // Check sessionStorage
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem('rewardluxe_client_ip');
      if (stored && stored !== '127.0.0.1') {
        cachedIp = stored;
        return stored;
      }
    } catch {
      // Ignore storage error
    }
  }

  let detectedIp = '';

  // 1. Try our own backend server
  try {
    const res = await fetch('/api/client-info', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(3000)
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.ip && data.ip !== '127.0.0.1' && data.ip !== '::1') {
        detectedIp = data.ip;
      }
    }
  } catch {
    // Continue to external fallback
  }

  // 2. If backend gave 127.0.0.1 (local dev) or failed, try public IP resolver
  if (!detectedIp || detectedIp === '127.0.0.1') {
    try {
      const res = await fetch('https://api.ipify.org?format=json', {
        signal: AbortSignal.timeout(3500)
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.ip) {
          detectedIp = data.ip;
        }
      }
    } catch {
      // If offline or blocked, fallback to generated pseudo-network hash or 127.0.0.1
    }
  }

  const finalIp = detectedIp || '127.0.0.1';
  cachedIp = finalIp;

  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem('rewardluxe_client_ip', finalIp);
    } catch {
      // Ignore
    }
  }

  return finalIp;
}

/**
 * Returns full network, IP and device fingerprint summary
 */
export async function getClientNetworkInfo(): Promise<ClientNetworkInfo> {
  const deviceId = getDeviceId();
  const networkType = getNetworkType();
  cachedNetworkType = networkType;
  const ip = await getClientPublicIp();

  return {
    ip,
    networkType,
    deviceId
  };
}

/**
 * Synchronous instant getter for cached values
 */
export function getCachedClientNetworkInfo(): ClientNetworkInfo {
  const deviceId = getDeviceId();
  const networkType = cachedNetworkType || getNetworkType();
  let ip = cachedIp || '127.0.0.1';

  if (ip === '127.0.0.1' && typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem('rewardluxe_client_ip');
      if (stored) ip = stored;
    } catch {
      // Ignore
    }
  }

  return {
    ip,
    networkType,
    deviceId
  };
}
