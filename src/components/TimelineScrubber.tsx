import React, { useRef, useState } from 'react';
import { SKILL_INFO, skillLetter, skillName, NEAR_FRAMES } from '../utils/skills';
import {
  RallyBounds,
  SkillEvent,
  BallLandingAnnotation,
  RefereeActionsAnnotation,
} from '../types';

interface TimelineScrubberProps {
  currentFrame: number;
  totalFrames: number;
  rally: RallyBounds;
  events: SkillEvent[];
  ballLanding: BallLandingAnnotation;
  refereeActions: RefereeActionsAnnotation;
  onSeek: (frame: number) => void;
}

export const TimelineScrubber: React.FC<TimelineScrubberProps> = ({
  currentFrame,
  totalFrames,
  rally,
  events,
  ballLanding,
  refereeActions,
  onSeek,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [hoverFrame, setHoverFrame] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);

  const maxFrames = Math.max(1, totalFrames);
  const span = Math.max(1, maxFrames - 1);
  const pct = (frame: number) => `${(frame / span) * 100}%`;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!track) return;

    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetFrame = Math.round(ratio * (maxFrames - 1));
    onSeek(targetFrame);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!track) return;

    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const frame = Math.round(ratio * (maxFrames - 1));
    setHoverFrame(frame);
    setHoverX(e.clientX - rect.left);
  };

  const handlePointerLeave = () => {
    setHoverFrame(null);
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 py-2 select-none relative">
      {/* Scrubber Track Container */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className="h-8 bg-slate-200 dark:bg-slate-950/80 rounded-lg relative cursor-pointer overflow-hidden border border-slate-300 dark:border-slate-800/80 group"
      >
        {/* Rally Active Range background */}
        {rally.startFrame !== null && rally.endFrame !== null && (
          <div
            style={{
              left: pct(rally.startFrame),
              width: pct(rally.endFrame - rally.startFrame),
            }}
            className="absolute top-0 bottom-0 bg-cyan-500/20 dark:bg-cyan-500/10 border-x border-cyan-500/50 dark:border-cyan-500/30"
          />
        )}

        {/* Skill Event Markers: one letter per skill (V serve, T toss, R reception, S set, D dig, A attack, B block) */}
        {events.map((ev) => {
          const isNear = Math.abs(ev.frame - currentFrame) <= NEAR_FRAMES;
          return (
            <div
              key={ev.id}
              style={{ left: pct(ev.frame) }}
              title={`${skillName(ev.skill)} @ Frame ${ev.frame} (click to jump here)`}
              className="absolute top-0 bottom-0 -translate-x-1/2 flex items-center justify-center z-20"
            >
              <button
                type="button"
                tabIndex={-1}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onSeek(ev.frame); // exactly the skill's frame
                }}
                className={`min-w-[1rem] h-4 px-0.5 rounded text-[10px] leading-4 text-center font-extrabold font-mono cursor-pointer transition-all ${
                  currentFrame === ev.frame
                    ? 'bg-cyan-500 text-white scale-125 shadow-md shadow-cyan-500/50'
                    : isNear
                    ? 'bg-cyan-600/80 text-white'
                    : 'bg-slate-700 text-white dark:bg-slate-300 dark:text-slate-900 hover:scale-110'
                }`}
              >
                {skillLetter(ev.skill)}
              </button>
            </div>
          );
        })}

        {/* Ball Landing Frame Marker (Bright Green/Yellow) */}
        {ballLanding.isAnnotated && ballLanding.landingFrame !== null && (
          <div
            style={{ left: pct(ballLanding.landingFrame) }}
            title={`Ball Landing @ Frame ${ballLanding.landingFrame}`}
            className="absolute top-0 bottom-0 -translate-x-1/2 w-3 flex flex-col items-center justify-between py-0.5 z-20 pointer-events-none"
          >
            <div className="w-2.5 h-2.5 bg-emerald-400 border border-white rounded-full shadow-md shadow-emerald-400/80 animate-pulse" />
            <div className="w-0.5 h-full bg-emerald-400/80" />
          </div>
        )}

        {/* Preceding Touch Frame Marker (Amber) */}
        {ballLanding.precedingTouch !== 'none' && ballLanding.touchFrame !== null && (
          <div
            style={{ left: pct(ballLanding.touchFrame) }}
            title={`Preceding Touch (${ballLanding.precedingTouch}) @ Frame ${ballLanding.touchFrame}`}
            className="absolute top-0 bottom-0 -translate-x-1/2 w-2 flex flex-col items-center justify-between py-1 z-15 pointer-events-none"
          >
            <div className="w-2 h-2 bg-amber-400 border border-white rounded-full shadow-md shadow-amber-400/80" />
            <div className="w-0.5 h-full bg-amber-400/60" />
          </div>
        )}

        {/* Referee Signal Frame Marker (Purple) */}
        {refereeActions.isAnnotated && refereeActions.mainRefereeSignalFrame !== null && (
          <div
            style={{ left: pct(refereeActions.mainRefereeSignalFrame) }}
            title={`Referee Point Signal @ Frame ${refereeActions.mainRefereeSignalFrame}`}
            className="absolute top-0 bottom-0 -translate-x-1/2 w-3 flex flex-col items-center justify-between py-0.5 z-20 pointer-events-none"
          >
            <div className="w-2.5 h-2.5 bg-purple-400 border border-white rounded-full shadow-md shadow-purple-400/80" />
            <div className="w-0.5 h-full bg-purple-400/80" />
          </div>
        )}

        {/* Current Playhead Scrubber */}
        <div
          style={{ left: pct(currentFrame) }}
          className="absolute top-0 bottom-0 -translate-x-1/2 w-1 bg-slate-900 dark:bg-white shadow-[0_0_6px_rgba(6,182,212,0.8)] dark:shadow-[0_0_10px_#ffffff] z-30 pointer-events-none flex flex-col items-center justify-start"
        >
          <div className="w-3 h-3 bg-slate-900 dark:bg-white rounded-full -translate-y-1 shadow-md" />
        </div>

        {/* Hover Tooltip */}
        {hoverFrame !== null && (
          <div
            style={{ left: `${hoverX}px` }}
            className="absolute -top-7 -translate-x-1/2 bg-slate-800 text-white border border-slate-700 px-1.5 py-0.5 rounded text-[10px] font-mono shadow pointer-events-none z-40 whitespace-nowrap"
          >
            Frame {hoverFrame}
          </div>
        )}
      </div>

      {/* Mini Legend Below Track */}
      <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
        <div className="flex items-center space-x-3">
          {(Object.keys(SKILL_INFO) as (keyof typeof SKILL_INFO)[]).map((k) => (
            <span key={k} className="flex items-center space-x-1">
              <span className="px-1 rounded bg-slate-700 text-white dark:bg-slate-300 dark:text-slate-900 font-extrabold">
                {SKILL_INFO[k]!.letter}
              </span>
              <span>{SKILL_INFO[k]!.name}</span>
            </span>
          ))}
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
            <span>Ball Landing</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-purple-400 inline-block"></span>
            <span>Referee Signal</span>
          </span>
        </div>
        <div>
          <span>Length: {totalFrames} frames</span>
        </div>
      </div>
    </div>
  );
};
