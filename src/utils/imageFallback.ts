import React from 'react';

// Bulletproof, zero-network SVG fallback generators for all images in Rewardluxe
// Ensures that NO broken image icons appear anywhere in the app, even if external CDNs are down/blocked.

/**
 * Returns a data-URI SVG avatar with modern gradients and user initials.
 * Computes deterministic gradient from name/seed so each user gets a unique color.
 */
export function getSafeAvatarSvg(name: string = 'User', seed?: string): string {
  const cleanName = (name || '').trim();
  const initial = (cleanName.charAt(0) || 'U').toUpperCase();
  const hashKey = seed || cleanName || 'rewardluxe';

  let hash = 0;
  for (let i = 0; i < hashKey.length; i++) {
    hash = (hash << 5) - hash + hashKey.charCodeAt(i);
    hash |= 0;
  }
  const colorIndex = Math.abs(hash) % 8;

  const gradientPairs: [string, string][] = [
    ['#6366F1', '#8B5CF6'], // Indigo to Violet
    ['#059669', '#10B981'], // Emerald to Teal
    ['#DC2626', '#F43F5E'], // Red to Rose
    ['#D97706', '#F59E0B'], // Amber to Gold
    ['#2563EB', '#38BDF8'], // Blue to Sky
    ['#7C3AED', '#EC4899'], // Purple to Pink
    ['#0D9488', '#06B6D4'], // Teal to Cyan
    ['#EA580C', '#FB923C'], // Orange to Peach
  ];

  const [color1, color2] = gradientPairs[colorIndex];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <linearGradient id="g_${colorIndex}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${color1}" />
      <stop offset="100%" stop-color="${color2}" />
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="28" fill="url(#g_${colorIndex})" />
  <circle cx="50" cy="50" r="42" fill="none" stroke="#FFFFFF" stroke-opacity="0.25" stroke-width="2" />
  <text x="50" y="58" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="44" font-weight="900" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle">${initial}</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Returns a data-URI SVG for app / task offer logos.
 */
export function getSafeAppIconSvg(title: string = 'App'): string {
  const cleanTitle = (title || '').trim();
  const initials = cleanTitle.length > 1 ? cleanTitle.slice(0, 2).toUpperCase() : (cleanTitle.charAt(0) || 'AP').toUpperCase();

  let hash = 0;
  for (let i = 0; i < cleanTitle.length; i++) {
    hash = (hash << 5) - hash + cleanTitle.charCodeAt(i);
    hash |= 0;
  }
  const colorIndex = Math.abs(hash) % 6;

  const pairs: [string, string][] = [
    ['#7C3AED', '#4F46E5'], // Purple
    ['#2563EB', '#1D4ED8'], // Blue
    ['#059669', '#047857'], // Green
    ['#D97706', '#B45309'], // Amber
    ['#DC2626', '#B91C1C'], // Red
    ['#0891B2', '#0E7490'], // Cyan
  ];
  const [c1, c2] = pairs[colorIndex];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <linearGradient id="ag_${colorIndex}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c1}" />
      <stop offset="100%" stop-color="${c2}" />
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="24" fill="url(#ag_${colorIndex})" />
  <rect x="8" y="8" width="84" height="84" rx="18" fill="none" stroke="#FFFFFF" stroke-opacity="0.2" stroke-width="2" />
  <text x="50" y="58" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="34" font-weight="900" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle">${initials}</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Returns a data-URI SVG for Giveaway prize showcase.
 */
export function getSafePrizeImageSvg(prizeTitle: string = 'Super Giveaway'): string {
  const cleanTitle = (prizeTitle || 'Super Giveaway').slice(0, 24);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <defs>
    <linearGradient id="pgrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0F172A" />
      <stop offset="50%" stop-color="#1E1B4B" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    <linearGradient id="goldgrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FCD34D" />
      <stop offset="50%" stop-color="#F59E0B" />
      <stop offset="100%" stop-color="#D97706" />
    </linearGradient>
  </defs>
  <rect width="800" height="450" fill="url(#pgrad)" />
  <circle cx="400" cy="180" r="140" fill="#F59E0B" fill-opacity="0.12" filter="blur(20px)" />
  
  <!-- Trophy Graphic -->
  <g transform="translate(360, 100) scale(1.6)">
    <path d="M12 2l3 5h6l-4.5 4 2 6.5-6.5-4-6.5 4 2-6.5L1 7h6z" fill="url(#goldgrad)" stroke="#FFFFFF" stroke-width="0.8" />
  </g>
  <circle cx="400" cy="180" r="60" fill="none" stroke="url(#goldgrad)" stroke-width="3" stroke-dasharray="6 4" />
  
  <text x="400" y="290" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="32" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="1">GIVEAWAY PRIZE</text>
  <text x="400" y="335" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="700" fill="#FBBF24" text-anchor="middle">${cleanTitle}</text>
  <rect x="340" y="370" width="120" height="34" rx="17" fill="#F59E0B" fill-opacity="0.2" stroke="#F59E0B" stroke-width="1.5" />
  <text x="400" y="392" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="800" fill="#FCD34D" text-anchor="middle">OFFICIAL</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Returns a data-URI SVG for missing/broken screenshot previews.
 */
export function getSafeScreenshotPlaceholderSvg(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <rect width="300" height="200" fill="#1E293B" rx="16" />
  <rect x="12" y="12" width="276" height="176" rx="12" fill="none" stroke="#475569" stroke-width="2" stroke-dasharray="6 6" />
  <path d="M130 90l15-20 25 32 15-18 20 26H95z" fill="#64748B" />
  <circle cx="120" cy="70" r="10" fill="#94A3B8" />
  <text x="150" y="145" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="#94A3B8" text-anchor="middle">Screenshot Attached</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Universal Event Handlers to attach to <img onError={...} />
 */
export const handleAvatarError = (
  e: React.SyntheticEvent<HTMLImageElement>,
  name: string = 'User',
  seed?: string
) => {
  const img = e.currentTarget;
  img.onerror = null; // Prevent loop
  img.src = getSafeAvatarSvg(name, seed);
};

export const handleTaskLogoError = (
  e: React.SyntheticEvent<HTMLImageElement>,
  title: string = 'App'
) => {
  const img = e.currentTarget;
  img.onerror = null;
  img.src = getSafeAppIconSvg(title);
};

export const handlePrizeImageError = (
  e: React.SyntheticEvent<HTMLImageElement>,
  prizeTitle: string = 'Giveaway'
) => {
  const img = e.currentTarget;
  img.onerror = null;
  img.src = getSafePrizeImageSvg(prizeTitle);
};

export const handleScreenshotError = (
  e: React.SyntheticEvent<HTMLImageElement>
) => {
  const img = e.currentTarget;
  img.onerror = null;
  img.src = getSafeScreenshotPlaceholderSvg();
};
