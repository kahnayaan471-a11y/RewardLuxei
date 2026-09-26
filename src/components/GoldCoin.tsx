import React from 'react';

interface GoldCoinProps {
  className?: string;
  size?: number;
  animate?: boolean;
}

export const GoldCoin: React.FC<GoldCoinProps> = ({
  className = 'w-5 h-5',
  size,
  animate = false
}) => {
  const dimensionStyle = size ? { width: `${size}px`, height: `${size}px` } : undefined;

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 drop-shadow-xs select-none ${animate ? 'animate-pulse' : ''} ${className}`}
      style={dimensionStyle}
    >
      <defs>
        {/* Outer Ring Metallic Gold Gradient */}
        <linearGradient id="goldRimGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF275" />
          <stop offset="25%" stopColor="#F59E0B" />
          <stop offset="50%" stopColor="#D97706" />
          <stop offset="75%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>

        {/* Inner Coin Face Radial Gradient */}
        <radialGradient id="coinFaceGradient" cx="45%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="35%" stopColor="#FACC15" />
          <stop offset="70%" stopColor="#EAB308" />
          <stop offset="100%" stopColor="#CA8A04" />
        </radialGradient>

        {/* Outer Rim Bevel Gradient */}
        <linearGradient id="bevelBorder" x1="15%" y1="0%" x2="85%" y2="100%">
          <stop offset="0%" stopColor="#FEF9C3" />
          <stop offset="50%" stopColor="#EAB308" />
          <stop offset="100%" stopColor="#92400E" />
        </linearGradient>

        {/* Dollar Symbol Gradient */}
        <linearGradient id="dollarSignGradient" x1="30%" y1="0%" x2="70%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="35%" stopColor="#FEF08A" />
          <stop offset="70%" stopColor="#EAB308" />
          <stop offset="100%" stopColor="#CA8A04" />
        </linearGradient>

        {/* Subtle Drop Shadow for Dollar */}
        <filter id="dollarShadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="1" dy="2" stdDeviation="1" floodColor="#854D0E" floodOpacity="0.6" />
        </filter>

        {/* Glow Sparkle */}
        <linearGradient id="sparkleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FEF08A" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* 1. Base Outer Gold Rim */}
      <circle cx="50" cy="50" r="48" fill="url(#goldRimGradient)" />

      {/* 2. Inner Bevel Ring Border */}
      <circle cx="50" cy="50" r="44" fill="none" stroke="url(#bevelBorder)" strokeWidth="3" />

      {/* 3. Coin Inner Golden Face */}
      <circle cx="50" cy="50" r="41" fill="url(#coinFaceGradient)" />

      {/* 4. Fine Inner Engraved Circle Ring */}
      <circle cx="50" cy="50" r="39" fill="none" stroke="#D97706" strokeWidth="1" strokeOpacity="0.4" />

      {/* 5. Center Dollar Sign ($) exactly like in user's image */}
      <g filter="url(#dollarShadow)">
        {/* Vertical Center Bar */}
        <rect
          x="47"
          y="23"
          width="6"
          height="54"
          rx="1"
          fill="url(#dollarSignGradient)"
        />
        {/* Dollar 'S' Character */}
        <text
          x="50"
          y="68"
          textAnchor="middle"
          fill="url(#dollarSignGradient)"
          fontSize="48"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          style={{ letterSpacing: '-1px' }}
        >
          $
        </text>
      </g>

      {/* 6. Shiny Sparkle Glint / Highlights on Top Edge */}
      <path
        d="M 28 14 Q 50 8 72 14"
        stroke="#FFFFFF"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeOpacity="0.65"
      />
      <circle cx="36" cy="14" r="1.5" fill="#FFFFFF" fillOpacity="0.9" />

      {/* Starburst Sparkle at top-right edge */}
      <g transform="translate(68, 20)">
        <path
          d="M 0,-6 L 1.5,-1.5 L 6,0 L 1.5,1.5 L 0,6 L -1.5,1.5 L -6,0 L -1.5,-1.5 Z"
          fill="#FFFFFF"
          fillOpacity="0.85"
        />
      </g>
    </svg>
  );
};
