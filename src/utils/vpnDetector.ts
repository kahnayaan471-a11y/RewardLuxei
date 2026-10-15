import { getClientPublicIp } from './networkTracker';

export interface VpnCheckResult {
  isVpn: boolean;
  ip: string;
  reason?: string;
  country?: string;
  countryCode?: string;
  isp?: string;
  org?: string;
  checkedAt: number;
}

let memoryVpnCache: VpnCheckResult | null = null;
const CACHE_KEY = 'rewardluxe_vpn_status_v1';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Get synchronously cached VPN check result
 */
export function getCachedVpnStatus(): VpnCheckResult | null {
  if (memoryVpnCache && Date.now() - memoryVpnCache.checkedAt < CACHE_TTL_MS) {
    return memoryVpnCache;
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as VpnCheckResult;
        if (Date.now() - parsed.checkedAt < CACHE_TTL_MS) {
          memoryVpnCache = parsed;
          return parsed;
        }
      }
    } catch {
      // Ignore storage error
    }
  }

  return null;
}

/**
 * Store VPN check in session storage and memory
 */
function setVpnCache(res: VpnCheckResult): void {
  memoryVpnCache = res;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(res));
    } catch {
      // Ignore
    }
  }
}

/**
 * Perform a thorough check to detect whether the user is connected via a VPN, Proxy, or Datacenter IP
 */
export async function checkIsVpn(force = false): Promise<VpnCheckResult> {
  if (!force) {
    const cached = getCachedVpnStatus();
    if (cached) return cached;
  }

  // 1. Get client IP
  let publicIp = '';
  try {
    publicIp = await getClientPublicIp();
  } catch {
    publicIp = '127.0.0.1';
  }

  // Localhost / private IP bypass for development testing
  if (
    !publicIp ||
    publicIp === '127.0.0.1' ||
    publicIp === 'localhost' ||
    publicIp === '::1' ||
    publicIp.startsWith('192.168.') ||
    publicIp.startsWith('10.')
  ) {
    const localResult: VpnCheckResult = {
      isVpn: false,
      ip: publicIp || '127.0.0.1',
      reason: 'Local connection',
      country: 'IN',
      checkedAt: Date.now()
    };
    setVpnCache(localResult);
    return localResult;
  }

  // 2. Query our backend API endpoint /api/check-vpn
  try {
    const res = await fetch(`/api/check-vpn?ip=${encodeURIComponent(publicIp)}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(4500)
    });

    if (res.ok) {
      const data = await res.json();
      const checkRes: VpnCheckResult = {
        isVpn: !!data.isVpn,
        ip: data.ip || publicIp,
        reason: data.reason || (data.isVpn ? 'VPN/Proxy Connection Detected' : 'Clean Connection'),
        country: data.country,
        countryCode: data.countryCode,
        isp: data.isp,
        org: data.org,
        checkedAt: Date.now()
      };
      setVpnCache(checkRes);
      return checkRes;
    }
  } catch (err) {
    console.warn('Backend VPN check endpoint error, trying external fallback:', err);
  }

  // 3. Client-side external fallback: ipwho.is
  try {
    const extRes = await fetch(`https://ipwho.is/${encodeURIComponent(publicIp)}`, {
      signal: AbortSignal.timeout(4000)
    });
    if (extRes.ok) {
      const info = await extRes.json();
      if (info.success) {
        const security = info.security || {};
        const isVpn = !!(
          security.vpn ||
          security.proxy ||
          security.tor ||
          security.relay ||
          security.hosting
        );

        const checkRes: VpnCheckResult = {
          isVpn,
          ip: info.ip || publicIp,
          reason: isVpn
            ? 'VPN or Proxy Flagged'
            : 'Residential Network',
          country: info.country,
          countryCode: info.country_code,
          isp: info.connection?.isp,
          org: info.connection?.org,
          checkedAt: Date.now()
        };
        setVpnCache(checkRes);
        return checkRes;
      }
    }
  } catch {
    // If fallback failed, pass with safe default
  }

  const safeDefault: VpnCheckResult = {
    isVpn: false,
    ip: publicIp,
    reason: 'Pass through',
    checkedAt: Date.now()
  };
  setVpnCache(safeDefault);
  return safeDefault;
}

/**
 * Clear cached VPN check (e.g. when user clicks Recheck / Retry)
 */
export function clearVpnCache(): void {
  memoryVpnCache = null;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(CACHE_KEY);
    } catch {
      // Ignore
    }
  }
}
