import React from 'react';

interface NeonFlameProps {
  streak: number;
  size?: 'sm' | 'md' | 'lg';
  reducedMotion?: boolean;
}

export function getFlameTierLabel(streak: number): string {
  if (streak >= 30) return 'Immortal Flame';
  if (streak >= 14) return 'Supernova Flame';
  if (streak >= 7) return 'Plasma Blaze';
  if (streak >= 3) return 'Electric Spark';
  if (streak >= 1) return 'Ignited';
  return 'Dormant';
}

export const NeonFlame: React.FC<NeonFlameProps> = ({
  streak,
  size = 'lg',
  reducedMotion = false,
}) => {
  const active = streak > 0;
  const tier =
    streak >= 30
      ? 5
      : streak >= 14
        ? 4
        : streak >= 7
          ? 3
          : streak >= 3
            ? 2
            : streak >= 1
              ? 1
              : 0;

  const dims =
    size === 'sm'
      ? 'w-10 h-10'
      : size === 'md'
        ? 'w-14 h-14'
        : 'w-20 h-20 sm:w-24 sm:h-24';

  const outerStops: [string, string, string] =
    tier >= 5
      ? ['#FDE047', '#A855F7', '#22D3EE']
      : tier >= 4
        ? ['#E879F9', '#A855F7', '#22D3EE']
        : tier >= 3
          ? ['#C084FC', '#6366F1', '#22D3EE']
          : tier >= 2
            ? ['#38BDF8', '#3B82F6', '#818CF8']
            : tier >= 1
              ? ['#67E8F9', '#22D3EE', '#2563EB']
              : ['#475569', '#334155', '#1E293B'];

  const innerStops: [string, string] =
    tier >= 4
      ? ['#FFFFFF', '#F5D0FE']
      : tier >= 2
        ? ['#ECFEFF', '#67E8F9']
        : tier >= 1
          ? ['#ECFEFF', '#38BDF8']
          : ['#64748B', '#334155'];

  const haloColor =
    tier >= 5
      ? 'rgba(232, 121, 249, 0.36)'
      : tier >= 3
        ? 'rgba(168, 85, 247, 0.32)'
        : tier >= 1
          ? 'rgba(34, 211, 238, 0.30)'
          : 'rgba(100, 116, 139, 0.12)';

  const gradId = `neonFlameGrad-${size}-${tier}`;
  const innerId = `neonFlameInner-${size}-${tier}`;

  return (
    <div
      className={`relative ${dims} flex items-center justify-center shrink-0 select-none`}
      aria-hidden="true"
    >
      {/* Ambient Radial Halo */}
      <div
        className={`absolute inset-1 rounded-full blur-lg ${
          active && !reducedMotion
            ? 'animate-[flameHalo_2.4s_ease-in-out_infinite]'
            : ''
        }`}
        style={{ background: haloColor }}
      />

      <svg
        viewBox="0 0 64 64"
        className={`relative z-10 w-full h-full drop-shadow-[0_0_12px_rgba(34,211,238,0.45)] ${
          active && !reducedMotion
            ? 'animate-[flameFlicker_1.8s_ease-in-out_infinite]'
            : ''
        }`}
        style={{ transformOrigin: '50% 82%' }}
      >
        <defs>
          <linearGradient id={gradId} x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor={outerStops[0]} />
            <stop offset="55%" stopColor={outerStops[1]} />
            <stop offset="100%" stopColor={outerStops[2]} />
          </linearGradient>
          <linearGradient id={innerId} x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor={innerStops[0]} />
            <stop offset="100%" stopColor={innerStops[1]} />
          </linearGradient>
        </defs>

        {/* Outer Flame Silhouette */}
        <path
          d="M32 6 C35 16, 48 22, 49 36 C50 47, 42 56, 32 56 C22 56, 14 47, 15 36 C16 27, 22 22, 24 15 C26 20, 27 23, 29 22 C28 16, 29 11, 32 6 Z"
          fill={`url(#${gradId})`}
          opacity={active ? 0.96 : 0.45}
        />

        {/* Secondary Plasma Tongue */}
        <path
          d="M32 20 C36 27, 42 32, 42 40 C42 48, 37 53, 32 53 C27 53, 22 48, 22 40 C22 33, 27 28, 32 20 Z"
          fill={`url(#${innerId})`}
          opacity={active ? 0.88 : 0.35}
        />

        {/* Bright Neon Core */}
        <path
          d="M32 34 C35 38, 37 42, 37 46 C37 50, 35 52, 32 52 C29 52, 27 50, 27 46 C27 42, 29 38, 32 34 Z"
          fill="#FFFFFF"
          opacity={active ? 0.92 : 0.25}
        />

        {/* High-Tier Crown Sparks for 7d+ streaks */}
        {tier >= 3 && (
          <>
            <circle cx="20" cy="18" r="2.2" fill="#67E8F9" opacity="0.9" />
            <circle cx="46" cy="16" r="1.8" fill="#E879F9" opacity="0.9" />
          </>
        )}
        {tier >= 5 && (
          <circle cx="32" cy="4" r="2.2" fill="#FDE047" opacity="0.95" />
        )}
      </svg>
    </div>
  );
};
