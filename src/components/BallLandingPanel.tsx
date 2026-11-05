import React from 'react';
import {
  Crosshair,
  CheckCircle2,
  AlertCircle,
  MapPin,
  RotateCcw,
} from 'lucide-react';
import {
  BallLandingAnnotation,
  LandingOutcome,
  Point2D,
} from '../types';

interface BallLandingPanelProps {
  ballLanding: BallLandingAnnotation;
  currentFrame: number;
  onUpdateBallLanding: (updated: BallLandingAnnotation) => void;
  onJumpToFrame: (frame: number) => void;
  pickingMode: 'none' | 'touch' | 'landing';
  setPickingMode: (mode: 'none' | 'touch' | 'landing') => void;
}

export const BallLandingPanel: React.FC<BallLandingPanelProps> = ({
  ballLanding,
  currentFrame,
  onUpdateBallLanding,
  onJumpToFrame,
  pickingMode,
  setPickingMode,
}) => {
  // Mark current frame as landing frame
  const handleSetLandingFrame = () => {
    onUpdateBallLanding({
      ...ballLanding,
      landingFrame: currentFrame,
      isAnnotated: true,
    });
  };

  // Outcome change
  const handleOutcomeChange = (outcome: LandingOutcome) => {
    onUpdateBallLanding({
      ...ballLanding,
      landingOutcome: outcome,
    });
    setPickingMode('landing');
  };

  const handleClear = () => {
    onUpdateBallLanding({
      landingFrame: null,
      landingCoord: null,
      landingOutcome: 'in',
      precedingTouch: 'none',
      touchFrame: null,
      touchCoord: null,
      isAnnotated: false,
    });
    setPickingMode('none');
  };

  return (
    <div className="p-4 space-y-4 select-none">
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-studio-darkBorder pb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-1.5">
            <Crosshair className="w-4 h-4 text-cyan-500" />
            <span>Ball Landing</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pause on the frame where the ball hits the floor, press E (in) or D (out), then click the ball on the video. The point and the frame are saved together.
          </p>
        </div>
        {ballLanding.isAnnotated && (
          <button
            onClick={handleClear}
            title="Clear ball landing annotation"
            className="flex items-center space-x-1 text-xs text-red-500 hover:text-red-600 px-2 py-1 rounded bg-red-50 dark:bg-red-950/30"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Part 2: Ball Landing Frame & Ground Contact */}
      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-studio-darkBorder bg-white dark:bg-studio-darkCard space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center space-x-1.5">
            <MapPin className="w-3.5 h-3.5 text-cyan-500" />
            <span>Ball Landing on Court Ground</span>
          </label>
          {ballLanding.isAnnotated && (
            <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Landing Logged</span>
            </span>
          )}
        </div>

        {/* Landing Frame Selector */}
        <div className="flex items-center justify-between bg-slate-50 dark:bg-studio-darkBorder/30 p-2.5 rounded-lg border border-slate-200 dark:border-studio-darkBorder">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">Landing Frame:</span>
            <span className="font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
              {ballLanding.landingFrame !== null ? `Frame ${ballLanding.landingFrame}` : 'Not set'}
            </span>
            {ballLanding.landingFrame !== null && (
              <button
                onClick={() => onJumpToFrame(ballLanding.landingFrame!)}
                className="text-[11px] text-cyan-500 hover:underline"
              >
                Jump
              </button>
            )}
          </div>
          <button
            onClick={handleSetLandingFrame}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white shadow-sm transition-all flex items-center space-x-1"
          >
            <span>Re-mark Current Frame ({currentFrame})</span>
          </button>
        </div>

        {/* Outcome: In vs Out */}
        <div>
          <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
            Landing Result: <span className="text-cyan-600 dark:text-cyan-400 font-mono font-bold">(Keys: E / D)</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleOutcomeChange('in')}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-center space-x-1 ${
                ballLanding.landingOutcome === 'in'
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                  : 'border-slate-200 dark:border-studio-darkBorder bg-slate-50 dark:bg-studio-darkBorder/30 text-slate-700 dark:text-slate-300 hover:border-emerald-400'
              }`}
            >
              <kbd className="px-1 py-0.5 rounded text-[10px] font-mono bg-black/20 dark:bg-white/20">E</kbd>
              <span>In Court</span>
            </button>
            <button
              onClick={() => handleOutcomeChange('out')}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-center space-x-1 ${
                ballLanding.landingOutcome === 'out'
                  ? 'bg-red-500 border-red-500 text-white shadow-sm'
                  : 'border-slate-200 dark:border-studio-darkBorder bg-slate-50 dark:bg-studio-darkBorder/30 text-slate-700 dark:text-slate-300 hover:border-red-400'
              }`}
            >
              <kbd className="px-1 py-0.5 rounded text-[10px] font-mono bg-black/20 dark:bg-white/20">D</kbd>
              <span>Out of Court</span>
            </button>
          </div>
        </div>

        {/* Ground Landing Coordinate Selector */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-studio-darkBorder">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">Ground Location:</span>
            {ballLanding.landingCoord ? (
              <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  ({(ballLanding.landingCoord.x * 100).toFixed(1)}%, {(ballLanding.landingCoord.y * 100).toFixed(1)}%)
                </span>
              </span>
            ) : (
              <span className="text-xs text-slate-400 font-mono">Not clicked yet</span>
            )}
          </div>
          <button
            onClick={() => setPickingMode(pickingMode === 'landing' ? 'none' : 'landing')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center space-x-1.5 ${
              pickingMode === 'landing'
                ? 'bg-cyan-500 border-cyan-500 text-white shadow-md animate-pulse'
                : 'bg-slate-100 dark:bg-studio-darkBorder border-slate-300 dark:border-studio-darkBorder text-slate-700 dark:text-slate-200 hover:border-cyan-500'
            }`}
          >
            <span>{pickingMode === 'landing' ? 'Click on Video Now' : 'Pick Ground Point'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
