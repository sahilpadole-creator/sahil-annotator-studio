import React from 'react';
import {
  Flag,
  CheckCircle2,
  AlertCircle,
  Award,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import {
  RefereeActionsAnnotation,
  PointWinner,
  FlagDecision,
} from '../types';

interface RefereeActionPanelProps {
  refereeActions: RefereeActionsAnnotation;
  currentFrame: number;
  onUpdateRefereeActions: (updated: RefereeActionsAnnotation) => void;
  onJumpToFrame: (frame: number) => void;
  drawBoxMode?: 'none' | 'referee' | 'umpire';
  onStartBoxDraw?: (kind: 'referee' | 'umpire') => void;
  onFlagDecision?: (decision: FlagDecision) => void;
}

export const RefereeActionPanel: React.FC<RefereeActionPanelProps> = ({
  refereeActions,
  currentFrame,
  onUpdateRefereeActions,
  onJumpToFrame,
  drawBoxMode = 'none',
  onStartBoxDraw,
  onFlagDecision,
}) => {
  // Main referee winner
  const handleWinnerChange = (winner: PointWinner) => {
    onUpdateRefereeActions({
      ...refereeActions,
      pointWinner: winner,
      mainRefereeSignalFrame: currentFrame,
      mainRefereeBoxes: [],
      isAnnotated: true,
    });
    onStartBoxDraw?.('referee');
  };

  const handleSetFlagFrame = () => {
    onUpdateRefereeActions({
      ...refereeActions,
      umpireFlag: { ...refereeActions.umpireFlag, frame: currentFrame },
      isAnnotated: true,
    });
  };

  const handleClear = () => {
    onUpdateRefereeActions({
      mainRefereeSignalFrame: null,
      pointWinner: 'none',
      umpireFlag: {
        hasFlag: false,
        frame: null,
        side: 'none',
        decision: 'none',
      },
      isAnnotated: false,
    });
  };

  return (
    <div className="p-4 space-y-4 select-none">
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-studio-darkBorder pb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-1.5">
            <Flag className="w-4 h-4 text-cyan-500" />
            <span>Referee Point Signal & Line Umpires</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Annotate the main referee hand indicating point winner and any line umpire flags.
          </p>
        </div>
        {refereeActions.isAnnotated && (
          <button
            onClick={handleClear}
            title="Clear referee annotations"
            className="flex items-center space-x-1 text-xs text-red-500 hover:text-red-600 px-2 py-1 rounded bg-red-50 dark:bg-red-950/30"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Part 1: Main 1st Referee Hand Signal */}
      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-studio-darkBorder bg-white dark:bg-studio-darkCard space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center space-x-1.5">
            <Award className="w-3.5 h-3.5 text-purple-500" />
            <span>1. Main 1st Referee Hand Signal (Point Awarded)</span>
          </label>
          {refereeActions.pointWinner !== 'none' && (
            <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Winner Logged</span>
            </span>
          )}
        </div>

        {/* Winner Selector Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => handleWinnerChange('team_left')}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center space-x-2 ${
              refereeActions.pointWinner === 'team_left'
                ? 'bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'border-slate-200 dark:border-studio-darkBorder bg-slate-50 dark:bg-studio-darkBorder/30 text-slate-700 dark:text-slate-300 hover:border-purple-400'
            }`}
          >
            <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/20 dark:bg-white/20">R</kbd>
            <span>Team Left (Side A) Won</span>
          </button>

          <button
            onClick={() => handleWinnerChange('team_right')}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center space-x-2 ${
              refereeActions.pointWinner === 'team_right'
                ? 'bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'border-slate-200 dark:border-studio-darkBorder bg-slate-50 dark:bg-studio-darkBorder/30 text-slate-700 dark:text-slate-300 hover:border-purple-400'
            }`}
          >
            <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/20 dark:bg-white/20">T</kbd>
            <span>Team Right (Side B) Won</span>
          </button>
        </div>

        {/* Signal Frame */}
        <div className="flex items-center justify-between bg-slate-50 dark:bg-studio-darkBorder/30 p-2.5 rounded-lg border border-slate-200 dark:border-studio-darkBorder">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">Signal Frame:</span>
            <span className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
              {refereeActions.mainRefereeSignalFrame !== null
                ? `Frame ${refereeActions.mainRefereeSignalFrame}`
                : 'Not set'}
            </span>
            {refereeActions.mainRefereeSignalFrame !== null && (
              <button
                onClick={() => onJumpToFrame(refereeActions.mainRefereeSignalFrame!)}
                className="text-[11px] text-cyan-500 hover:underline"
              >
                Jump
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-studio-darkBorder">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Referee boxes:{' '}
            {(refereeActions.mainRefereeBoxes?.length ?? 0) > 0 ? (
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {refereeActions.mainRefereeBoxes!.length} of 2 drawn (shows ±10 frames)
              </span>
            ) : (
              <span className="font-mono text-amber-500">not drawn</span>
            )}
          </span>
          <button
            onClick={() => {
                onUpdateRefereeActions({ ...refereeActions, mainRefereeBoxes: [] });
                onStartBoxDraw?.('referee');
              }}
            className={`px-2.5 py-1 text-xs font-semibold rounded border transition-all ${
              drawBoxMode === 'referee'
                ? 'bg-purple-500 border-purple-500 text-white animate-pulse'
                : 'bg-slate-100 dark:bg-studio-darkBorder border-slate-300 dark:border-studio-darkBorder text-slate-700 dark:text-slate-200 hover:border-purple-500'
            }`}
          >
            {drawBoxMode === 'referee' ? 'Drag on video…' : (refereeActions.mainRefereeBoxes?.length ?? 0) > 0 ? 'Redraw boxes' : 'Draw box'}
          </button>
        </div>
      </div>

      {/* Part 2: Line umpires' flag */}
      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-studio-darkBorder bg-white dark:bg-studio-darkCard space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center space-x-1.5">
            <Flag className="w-3.5 h-3.5 text-cyan-500" />
            <span>2. Line Umpire Flag</span>
          </label>
          {refereeActions.umpireFlag.hasFlag && (
            <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Flag logged</span>
            </span>
          )}
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
            No flag = press nothing. Flag raised:{' '}
            <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">(1 / 2 / 3, same key again = clear)</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'in', label: 'Ball In', key: '1' },
              { id: 'out', label: 'Ball Out', key: '2' },
              { id: 'touch', label: 'Touch + Out', key: '3' },
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => onFlagDecision?.(d.id as FlagDecision)}
                className={`py-1.5 px-1 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center space-x-1 ${
                  refereeActions.umpireFlag.hasFlag && refereeActions.umpireFlag.decision === d.id
                    ? 'bg-cyan-500 border-cyan-500 text-white shadow-sm'
                    : 'border-slate-200 dark:border-studio-darkBorder bg-slate-50 dark:bg-studio-darkBorder/30 text-slate-700 dark:text-slate-300 hover:border-cyan-400'
                }`}
              >
                <kbd className="px-1 py-0.5 rounded text-[10px] font-mono bg-black/20 dark:bg-white/20">{d.key}</kbd>
                <span>{d.label}</span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Touch + Out = the ball touched the hand and went out.</p>
        </div>

        {refereeActions.umpireFlag.hasFlag && (
          <>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-studio-darkBorder">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Umpire boxes:{' '}
                {(refereeActions.umpireFlag.boxes?.length ?? 0) > 0 ? (
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {refereeActions.umpireFlag.boxes!.length} of 2 drawn (shows ±10 frames)
                  </span>
                ) : (
                  <span className="font-mono text-amber-500">not drawn</span>
                )}
              </span>
              <button
                onClick={() => {
                  onUpdateRefereeActions({
                    ...refereeActions,
                    umpireFlag: { ...refereeActions.umpireFlag, boxes: [] },
                  });
                  onStartBoxDraw?.('umpire');
                }}
                className={`px-2.5 py-1 text-xs font-semibold rounded border transition-all ${
                  drawBoxMode === 'umpire'
                    ? 'bg-purple-500 border-purple-500 text-white animate-pulse'
                    : 'bg-slate-100 dark:bg-studio-darkBorder border-slate-300 dark:border-studio-darkBorder text-slate-700 dark:text-slate-200 hover:border-purple-500'
                }`}
              >
                {drawBoxMode === 'umpire'
                  ? 'Drag on video…'
                  : (refereeActions.umpireFlag.boxes?.length ?? 0) > 0
                  ? 'Redraw boxes'
                  : 'Draw box'}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">Flag Frame:</span>
                <span className="font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                  {refereeActions.umpireFlag.frame !== null ? `Frame ${refereeActions.umpireFlag.frame}` : 'Not set'}
                </span>
                {refereeActions.umpireFlag.frame !== null && (
                  <button
                    onClick={() => onJumpToFrame(refereeActions.umpireFlag.frame!)}
                    className="text-[11px] text-cyan-500 hover:underline"
                  >
                    Jump
                  </button>
                )}
              </div>
              <button
                onClick={handleSetFlagFrame}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-cyan-500 hover:bg-cyan-600 text-white shadow-sm"
              >
                Set Current Frame ({currentFrame})
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
