import React, { useEffect } from 'react';
import {
  UserCheck,
  Plus,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { SkillEvent, SetStyle, SetDirection } from '../types';

interface SetAnnotationPanelProps {
  events: SkillEvent[];
  currentFrame: number;
  onUpdateEvent: (updatedEvent: SkillEvent) => void;
  onAddSetEvent: (frame: number) => void;
  onJumpToFrame: (frame: number) => void;
  onJumpToNextSet?: () => void;
  onJumpToPrevSet?: () => void;
}

export const SetAnnotationPanel: React.FC<SetAnnotationPanelProps> = ({
  events,
  currentFrame,
  onUpdateEvent,
  onAddSetEvent,
  onJumpToFrame,
  onJumpToNextSet,
  onJumpToPrevSet,
}) => {
  const setEvents = events.filter((e) => e.skill === 'set');

  // Find if current frame is on or near any set event
  const currentSetEvent = setEvents.find(
    (e) => Math.abs(e.frame - currentFrame) <= 5
  );

  // Auto-scroll to active set card when current frame is on or near a set
  useEffect(() => {
    if (currentSetEvent) {
      const el = document.getElementById(`set-card-${currentSetEvent.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [currentSetEvent]);

  const handleSetStyle = (ev: SkillEvent, style: SetStyle) => {
    onUpdateEvent({
      ...ev,
      setStyle: style,
    });
  };

  const handleSetDirection = (ev: SkillEvent, direction: SetDirection) => {
    onUpdateEvent({
      ...ev,
      setDirection: direction,
    });
  };

  return (
    <div className="p-4 space-y-4 select-none">
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-studio-darkBorder pb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-1.5">
            <UserCheck className="w-4 h-4 text-cyan-500" />
            <span>Set Style & Direction</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Annotate whether each setter contact is overhead/underhead and forward/backward.
          </p>
        </div>
        <button
          onClick={() => onAddSetEvent(currentFrame)}
          title="Add a new set skill on current frame"
          className="flex items-center space-x-1 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Set @ Frame {currentFrame}</span>
        </button>
      </div>

      {/* Prev Set / Next Set Quick Switcher Toolbar */}
      {setEvents.length > 0 && (
        <div className="flex items-center justify-between bg-slate-100 dark:bg-studio-darkCard p-2 rounded-xl border border-slate-200 dark:border-studio-darkBorder shadow-sm">
          <button
            onClick={onJumpToPrevSet}
            title="Jump to Previous Set (Key: < or ,)"
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-studio-darkBorder hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors shadow-sm"
          >
            <ChevronLeft className="w-4 h-4 text-cyan-500" />
            <span>Prev Set</span>
            <kbd className="px-1 py-0.5 rounded text-[9px] font-mono bg-black/10 dark:bg-black/40 text-slate-400">&lt;</kbd>
          </button>

          <span className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">
            {currentSetEvent
              ? `Set #${setEvents.findIndex((e) => e.id === currentSetEvent.id) + 1} of ${setEvents.length}`
              : `${setEvents.length} Sets Total`}
          </span>

          <button
            onClick={onJumpToNextSet}
            title="Jump to Next Set (Key: > or .)"
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors shadow-sm shadow-cyan-600/30"
          >
            <span>Next Set</span>
            <kbd className="px-1 py-0.5 rounded text-[9px] font-mono bg-black/30 text-cyan-100">&gt;</kbd>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Set Events List */}
      {setEvents.length === 0 ? (
        <div className="border border-dashed border-slate-300 dark:border-studio-darkBorder rounded-xl p-8 text-center bg-slate-50/50 dark:bg-studio-darkCard/30">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200">
            No Set Skills Found in XML
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto mt-1 mb-3">
            Navigate to the setter contact frame using playback controls, then click "Add Set" to annotate.
          </p>
          <button
            onClick={() => onAddSetEvent(currentFrame)}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-bold rounded-lg shadow-sm"
          >
            Tag Current Frame ({currentFrame}) as Set
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {setEvents.map((ev, idx) => {
            const isNear = Math.abs(ev.frame - currentFrame) <= 5;
            const isComplete = !!(ev.setStyle && ev.setDirection);

            return (
              <div
                key={ev.id}
                id={`set-card-${ev.id}`}
                className={`p-3.5 rounded-xl border transition-all ${
                  isNear
                    ? 'border-cyan-500 bg-cyan-50/60 dark:bg-cyan-950/40 shadow-lg ring-2 ring-cyan-500/40 scale-[1.01]'
                    : 'border-slate-200 dark:border-studio-darkBorder bg-white dark:bg-studio-darkCard opacity-90 hover:opacity-100'
                }`}
              >
                {/* Top Row: Set Name, Frame, Jump Button, Completion badge */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className={`w-5 h-5 rounded-md font-bold text-xs flex items-center justify-center ${
                      isNear
                        ? 'bg-cyan-500 text-white shadow-sm'
                        : 'bg-cyan-100 dark:bg-cyan-900/60 text-cyan-700 dark:text-cyan-300'
                    }`}>
                      #{idx + 1}
                    </span>
                    <button
                      onClick={() => onJumpToFrame(ev.frame)}
                      title="Jump to this frame"
                      className="font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline"
                    >
                      Frame {ev.frame}
                    </button>
                    {ev.player_id !== undefined && (
                      <span className="text-[10px] bg-slate-100 dark:bg-studio-darkBorder text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-mono">
                        Setter ID: {ev.player_id}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {isComplete ? (
                      <span className="flex items-center space-x-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Done</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-500/20">
                        Pending
                      </span>
                    )}
                    <button
                      onClick={() => onJumpToFrame(ev.frame)}
                      className="px-2 py-1 text-[11px] rounded bg-slate-100 dark:bg-studio-darkBorder hover:bg-cyan-500 hover:text-white dark:hover:bg-cyan-500 text-slate-600 dark:text-slate-300 font-medium transition-colors"
                    >
                      Jump
                    </button>
                  </div>
                </div>

                {/* Annotation Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Style: Overhead vs Underhead */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                      1. Style <span className="text-cyan-600 dark:text-cyan-400 font-mono font-bold">(Keys: Q / A)</span>
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => handleSetStyle(ev, 'overhead')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold border flex items-center justify-center space-x-1 transition-all ${
                          ev.setStyle === 'overhead'
                            ? 'bg-cyan-500 border-cyan-500 text-white shadow-sm'
                            : 'border-slate-200 dark:border-studio-darkBorder bg-slate-50 dark:bg-studio-darkBorder/40 text-slate-700 dark:text-slate-300 hover:border-cyan-400'
                        }`}
                      >
                        <kbd className="px-1 py-0.5 rounded text-[10px] font-mono bg-black/20 dark:bg-white/20">Q</kbd>
                        <span>Overhead</span>
                      </button>
                      <button
                        onClick={() => handleSetStyle(ev, 'underhead')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold border flex items-center justify-center space-x-1 transition-all ${
                          ev.setStyle === 'underhead'
                            ? 'bg-cyan-500 border-cyan-500 text-white shadow-sm'
                            : 'border-slate-200 dark:border-studio-darkBorder bg-slate-50 dark:bg-studio-darkBorder/40 text-slate-700 dark:text-slate-300 hover:border-cyan-400'
                        }`}
                      >
                        <kbd className="px-1 py-0.5 rounded text-[10px] font-mono bg-black/20 dark:bg-white/20">A</kbd>
                        <span>Underhead</span>
                      </button>
                    </div>
                  </div>

                  {/* Direction: Forward vs Backward */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                      2. Direction <span className="text-cyan-600 dark:text-cyan-400 font-mono font-bold">(Keys: W / S)</span>
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => handleSetDirection(ev, 'forward')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold border flex items-center justify-center space-x-1 transition-all ${
                          ev.setDirection === 'forward'
                            ? 'bg-cyan-500 border-cyan-500 text-white shadow-sm'
                            : 'border-slate-200 dark:border-studio-darkBorder bg-slate-50 dark:bg-studio-darkBorder/40 text-slate-700 dark:text-slate-300 hover:border-cyan-400'
                        }`}
                      >
                        <kbd className="px-1 py-0.5 rounded text-[10px] font-mono bg-black/20 dark:bg-white/20">W</kbd>
                        <span>Forward</span>
                      </button>
                      <button
                        onClick={() => handleSetDirection(ev, 'backward')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold border flex items-center justify-center space-x-1 transition-all ${
                          ev.setDirection === 'backward'
                            ? 'bg-cyan-500 border-cyan-500 text-white shadow-sm'
                            : 'border-slate-200 dark:border-studio-darkBorder bg-slate-50 dark:bg-studio-darkBorder/40 text-slate-700 dark:text-slate-300 hover:border-cyan-400'
                        }`}
                      >
                        <kbd className="px-1 py-0.5 rounded text-[10px] font-mono bg-black/20 dark:bg-white/20">S</kbd>
                        <span>Backward</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
