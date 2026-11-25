import React from 'react';
import { Minus, Play, Plus, Volume1, Volume2, VolumeX } from 'lucide-react';

interface AudioSettingsPanelProps {
  sfxVolume: number; // 0..100
  muted: boolean;
  compact?: boolean;
  onVolumeChange: (nextVolume: number, playPreview?: boolean) => void;
  onToggleMute: () => void;
  onPreviewSound: () => void;
}

export const AudioSettingsPanel: React.FC<AudioSettingsPanelProps> = ({
  sfxVolume,
  muted,
  compact = false,
  onVolumeChange,
  onToggleMute,
  onPreviewSound,
}) => {
  const effectiveDisplayPct = muted ? 0 : sfxVolume;
  const VolumeIcon =
    muted || sfxVolume === 0 ? VolumeX : sfxVolume < 50 ? Volume1 : Volume2;

  const stepVolume = (delta: number) => {
    const next = Math.max(0, Math.min(100, sfxVolume + delta));
    onVolumeChange(next, true);
  };

  return (
    <div
      className={
        compact
          ? 'space-y-2.5 text-left'
          : 'space-y-4 text-left'
      }
    >
      {/* Header Label + Live Percentage Readout */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <VolumeIcon
            className={`w-4 h-4 shrink-0 ${
              muted || sfxVolume === 0 ? 'text-slate-400' : 'text-cyan-300'
            }`}
          />
          <span
            className={
              compact
                ? 'text-xs font-medium text-slate-300'
                : 'text-sm font-semibold text-white'
            }
          >
            Sound Effects Volume
          </span>
        </div>
        <span className="font-mono-nums text-xs sm:text-sm font-bold text-cyan-300 shrink-0">
          {muted ? `Muted (${sfxVolume}%)` : `${sfxVolume}%`}
        </span>
      </div>

      {/* Accessible Slider Row with Fire TV D-Pad Step Buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => stepVolume(-10)}
          disabled={sfxVolume <= 0 && !muted}
          aria-label="Decrease sound effects volume by 10 percent"
          className="neon-focus min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-[#0F1838] border border-indigo-400/25 hover:border-cyan-400/60 text-slate-200 hover:text-cyan-300 disabled:opacity-35 transition-colors shrink-0"
        >
          <Minus className="w-4 h-4" />
        </button>

        <div className="relative flex-1 flex items-center">
          {/* Custom Gradient Track Behind Native Range Input */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 h-2 rounded-full bg-[#060A18] border border-slate-800 overflow-hidden"
          >
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-purple-400 transition-all duration-100"
              style={{ width: `${effectiveDisplayPct}%` }}
            />
          </div>

          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={sfxVolume}
            onChange={(e) => onVolumeChange(Number(e.target.value), true)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                e.preventDefault();
                stepVolume(-5);
              } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                e.preventDefault();
                stepVolume(5);
              } else if (e.key === 'Home') {
                e.preventDefault();
                onVolumeChange(0, false);
              } else if (e.key === 'End') {
                e.preventDefault();
                onVolumeChange(100, true);
              }
            }}
            aria-label="Sound effects volume"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={sfxVolume}
            aria-valuetext={muted ? `Muted, saved at ${sfxVolume} percent` : `${sfxVolume} percent`}
            className="neon-slider neon-focus relative z-10 w-full"
          />
        </div>

        <button
          type="button"
          onClick={() => stepVolume(10)}
          disabled={sfxVolume >= 100 && !muted}
          aria-label="Increase sound effects volume by 10 percent"
          className="neon-focus min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-[#0F1838] border border-indigo-400/25 hover:border-cyan-400/60 text-slate-200 hover:text-cyan-300 disabled:opacity-35 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Mute Toggle + Live Preview Action Row */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onToggleMute}
          aria-pressed={muted}
          className={`neon-focus min-h-[44px] px-3 py-2 rounded-xl border text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
            muted
              ? 'bg-slate-900/90 border-slate-700 text-slate-300 hover:border-cyan-400/50'
              : 'bg-[#0F1838] border-cyan-400/40 text-cyan-100 hover:border-cyan-300/75'
          }`}
        >
          {muted ? (
            <>
              <VolumeX className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Unmute SFX</span>
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4 text-cyan-300 shrink-0" />
              <span>Mute SFX</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onPreviewSound}
          disabled={muted || sfxVolume === 0}
          className="neon-focus min-h-[44px] px-3 py-2 rounded-xl bg-[#0F1838] border border-purple-400/35 hover:border-cyan-400/65 text-slate-100 hover:text-cyan-200 disabled:opacity-40 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
        >
          <Play className="w-3.5 h-3.5 text-purple-300 shrink-0" />
          <span>Preview Sound</span>
        </button>
      </div>

      {!compact && (
        <div className="flex items-center justify-between gap-2 pt-1 text-xs text-slate-400">
          <span>Quick presets</span>
          <div className="flex items-center gap-1.5">
            {[30, 70, 100].map((preset) => {
              const active = !muted && sfxVolume === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onVolumeChange(preset, true)}
                  className={`neon-focus min-h-[36px] min-w-[52px] px-2.5 rounded-lg font-mono-nums text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/55'
                      : 'bg-[#0B1228] text-slate-400 border border-slate-800 hover:text-slate-200 hover:border-indigo-400/40'
                  }`}
                >
                  {preset}%
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
