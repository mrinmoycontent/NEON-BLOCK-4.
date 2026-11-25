import React from 'react';

interface NeonLogoProps {
  compact?: boolean;
}

export const NeonLogo: React.FC<NeonLogoProps> = ({ compact = false }) => {
  if (compact) {
    return (
      <div className="flex items-center gap-2.5 shrink-0">
        <svg
          width="32"
          height="32"
          viewBox="0 0 36 36"
          fill="none"
          aria-hidden="true"
          className="shrink-0"
        >
          <defs>
            <linearGradient id="nb-mini-cyan" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#22D3EE" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
            <linearGradient id="nb-mini-purple" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#818CF8" />
              <stop offset="100%" stopColor="#A855F7" />
            </linearGradient>
          </defs>
          <rect x="3" y="3" width="14" height="14" rx="4" fill="#082F49" stroke="url(#nb-mini-cyan)" strokeWidth="2" />
          <rect x="19" y="3" width="14" height="14" rx="4" fill="#1E1B4B" stroke="url(#nb-mini-purple)" strokeWidth="2" />
          <rect x="3" y="19" width="14" height="14" rx="4" fill="#1E1B4B" stroke="url(#nb-mini-purple)" strokeWidth="2" />
          <rect x="19" y="19" width="14" height="14" rx="4" fill="#0E7490" stroke="#67E8F9" strokeWidth="2" />
        </svg>
        <span className="font-display text-lg font-extrabold tracking-wider text-white whitespace-nowrap">
          NEON <span className="text-cyan-400">BLOCK</span>
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center select-none">
      <svg
        width="320"
        height="88"
        viewBox="0 0 320 88"
        fill="none"
        role="img"
        aria-label="NEON BLOCK"
        className="w-full max-w-[300px] h-auto"
      >
        <defs>
          <linearGradient id="nb-title-grad" x1="0" y1="0" x2="320" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#67E8F9" />
            <stop offset="48%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#C084FC" />
          </linearGradient>
          <filter id="nb-glow" x="-15%" y="-25%" width="130%" height="150%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Emblem Cluster */}
        <g transform="translate(14, 16)" filter="url(#nb-glow)">
          <rect x="0" y="0" width="24" height="24" rx="6" fill="#083344" stroke="#22D3EE" strokeWidth="2.2" />
          <rect x="28" y="0" width="24" height="24" rx="6" fill="#1E3A8A" stroke="#60A5FA" strokeWidth="2.2" />
          <rect x="0" y="28" width="24" height="24" rx="6" fill="#4C1D95" stroke="#A78BFA" strokeWidth="2.2" />
          <rect x="28" y="28" width="24" height="24" rx="6" fill="#0E7490" stroke="#67E8F9" strokeWidth="2.2" />
        </g>

        {/* Wordmark */}
        <text
          x="82"
          y="42"
          fill="#F8FAFC"
          fontSize="30"
          fontWeight="800"
          letterSpacing="3.5"
          fontFamily="'Bahnschrift', 'DIN Alternate', 'SF Pro Display', system-ui, sans-serif"
          filter="url(#nb-glow)"
        >
          NEON
        </text>
        <text
          x="82"
          y="72"
          fill="url(#nb-title-grad)"
          fontSize="30"
          fontWeight="800"
          letterSpacing="3.5"
          fontFamily="'Bahnschrift', 'DIN Alternate', 'SF Pro Display', system-ui, sans-serif"
          filter="url(#nb-glow)"
        >
          BLOCK
        </text>
      </svg>
    </div>
  );
};
