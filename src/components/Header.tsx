import React, { useState } from 'react';
import {
  Keyboard,
  Sun,
  Moon,
  Archive,
  RotateCcw,
  CheckCircle2,
  Activity,
} from 'lucide-react';
import { PlaylistItem } from '../types';

interface HeaderProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  activeItem: PlaylistItem | null;
  rallyCount: number;
  onExportBatchZip: (includeVideo: boolean) => void;
  onResetSession: () => void;
  onOpenShortcuts: () => void;
  hasUnsavedChanges?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  onToggleTheme,
  activeItem,
  rallyCount,
  onExportBatchZip,
  onResetSession,
  onOpenShortcuts,
}) => {
  const [includeVideo, setIncludeVideo] = useState<boolean>(false);

  return (
    <header className="h-16 border-b border-slate-200 dark:border-studio-darkBorder bg-white/80 dark:bg-studio-darkPanel/90 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-40 transition-colors">
      {/* Left: Branding & Active Item Name */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-extrabold text-lg">
          M
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
              Sahil Volleyball Studio
            </h1>
            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700 dark:bg-cyan-950/70 dark:text-cyan-400 border border-cyan-300/40 dark:border-cyan-700/50">
              Set • Landing • Referee
            </span>
          </div>
          {activeItem && (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-md">
              Current: <span className="font-medium text-slate-700 dark:text-slate-200">{activeItem.name}</span>
            </p>
          )}
        </div>
      </div>

      {/* Center: Live Auto-Save Indicator */}
      <div className="hidden md:flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-studio-darkCard px-3 py-1.5 rounded-full border border-slate-200 dark:border-studio-darkBorder">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span className="font-medium text-slate-700 dark:text-slate-300">Auto-saved to Local Storage</span>
      </div>

      {/* Right: Actions, Export & Settings */}
      <div className="flex items-center space-x-2">
        {/* Export: ZIP of XML + JSON, optionally with the videos */}
        {(
          <div className={`flex items-center rounded-lg border border-slate-200 dark:border-studio-darkBorder overflow-hidden mr-1 ${rallyCount === 0 ? 'opacity-50' : ''}`}>
            <label
              title="Tick to also put the video files in the ZIP"
              className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-studio-darkCard cursor-pointer select-none"
            >
              <input
                type="checkbox"
                checked={includeVideo}
                onChange={(e) => {
                  setIncludeVideo(e.target.checked);
                  e.currentTarget.blur();
                }}
                className="w-3.5 h-3.5 cursor-pointer"
              />
              <span>Include video</span>
            </label>
            <button
              onClick={() => onExportBatchZip(includeVideo)}
              disabled={rallyCount === 0}
              title={
                rallyCount === 0
                  ? 'Load a rally first'
                  : includeVideo
                  ? `Download ZIP: XML + JSON + video for ${rallyCount} rallies`
                  : `Download ZIP: XML + JSON for ${rallyCount} rallies`
              }
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white transition-all disabled:cursor-not-allowed"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>
        )}

        {/* Keyboard Guide */}
        <button
          onClick={onOpenShortcuts}
          title="Keyboard guide: what every key does"
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-studio-darkCard border border-slate-200 dark:border-studio-darkBorder transition-colors"
        >
          <Keyboard className="w-4 h-4" />
          <span className="hidden sm:inline">Shortcuts</span>
        </button>

        {/* Dark/Light Mode Switcher */}
        <button
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-studio-darkCard transition-colors"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>

        {/* Reset Session */}
        <button
          onClick={onResetSession}
          title="Clear ALL rallies (use the ↺ on a rally card to reset just one)"
          className="p-2 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
