import { SKILL_INFO, skillLetter, skillName, eventsNearFrame } from '../utils/skills';
import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Crosshair,
  RotateCcw,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { Point2D, VideoMetadata, BallLandingAnnotation, SkillEvent, RefereeActionsAnnotation, BoxRect } from '../types';

interface VideoPlayerProps {
  videoFile?: File;
  videoUrl?: string;
  metadata: VideoMetadata | null;
  currentFrame: number;
  onFrameChange: (frame: number) => void;
  onMetadataLoaded: (meta: VideoMetadata) => void;
  pickingMode: 'none' | 'touch' | 'landing';
  onPickCoordinate: (coord: Point2D) => void;
  ballLanding: BallLandingAnnotation;
  events?: SkillEvent[];
  refereeActions?: RefereeActionsAnnotation;
  drawBoxMode?: 'none' | 'referee' | 'umpire';
  onBoxDrawn?: (box: BoxRect) => void;
  onFinishDraw?: () => void;
  onJumpToNextSet?: () => void;
  onJumpToPrevSet?: () => void;
  onJumpToNextSkill?: () => void;
  onJumpToPrevSkill?: () => void;
}

// Boxes show this many frames either side of the signal frame
const BOX_FRAMES = 10;

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoFile,
  videoUrl,
  metadata,
  currentFrame,
  onFrameChange,
  onMetadataLoaded,
  pickingMode,
  onPickCoordinate,
  ballLanding,
  events = [],
  refereeActions,
  drawBoxMode = 'none',
  onBoxDrawn,
  onFinishDraw,
  onJumpToNextSet,
  onJumpToPrevSet,
  onJumpToNextSkill,
  onJumpToPrevSkill,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoverCoord, setHoverCoord] = useState<Point2D | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  const fps = metadata?.fps || 30;

  // Manage video blob URL
  useEffect(() => {
    if (videoFile) {
      const url = URL.createObjectURL(videoFile);
      setBlobUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else if (videoUrl) {
      setBlobUrl(videoUrl);
    } else {
      setBlobUrl(null);
    }
  }, [videoFile, videoUrl]);

  // Sync external currentFrame to video.currentTime
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !metadata || isPlaying) return;

    const targetTime = currentFrame / fps;
    // Only update if difference is greater than half a frame
    if (Math.abs(video.currentTime - targetTime) > 0.5 / fps) {
      video.currentTime = targetTime;
    }
  }, [currentFrame, fps, isPlaying, metadata]);

  // Video loaded metadata
  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;

    const duration = video.duration || 1;
    const detectedFps = 30; // standard default for volleyball clips
    const frameCount = Math.round(duration * detectedFps);

    const meta: VideoMetadata = {
      filename: videoFile ? videoFile.name : 'rally_video.mp4',
      fps: detectedFps,
      width: video.videoWidth || 1920,
      height: video.videoHeight || 1080,
      duration,
      frameCount: frameCount > 0 ? frameCount : 500,
    };

    onMetadataLoaded(meta);
  };

  // Video time update while playing
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !isPlaying) return;

    const calculatedFrame = Math.round(video.currentTime * fps);
    if (calculatedFrame !== currentFrame) {
      onFrameChange(calculatedFrame);
    }
  };

  // Play / Pause toggle
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.playbackRate = playbackRate;
      video.play().catch(console.warn);
      setIsPlaying(true);
    }
  };

  // Step frames
  const stepFrame = (delta: number) => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    }

    const totalFrames = metadata?.frameCount || 9999;
    const newFrame = Math.max(0, Math.min(totalFrames - 1, currentFrame + delta));
    onFrameChange(newFrame);
    video.currentTime = newFrame / fps;
  };

  // Position of the mouse on the video itself, 0..1 (correct with zoom / pan / letterboxing)
  const toVideoCoord = (clientX: number, clientY: number): Point2D | null => {
    const el = wrapRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return null;
    return {
      x: Math.max(0, Math.min(1, (clientX - r.left) / r.width)),
      y: Math.max(0, Math.min(1, (clientY - r.top) / r.height)),
    };
  };

  // Handle clicking on video to pick coordinate
  const handleVideoClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (pickingMode === 'none') return;
    const c = toVideoCoord(e.clientX, e.clientY);
    if (!c) return;
    onPickCoordinate({ x: Number(c.x.toFixed(4)), y: Number(c.y.toFixed(4)) });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const xPixel = (e.clientX - rect.left - panOffset.x) / zoomLevel;
    const yPixel = (e.clientY - rect.top - panOffset.y) / zoomLevel;

    const normalizedX = Math.max(0, Math.min(1, xPixel / rect.width));
    const normalizedY = Math.max(0, Math.min(1, yPixel / rect.height));

    setHoverCoord({
      x: Number(normalizedX.toFixed(4)),
      y: Number(normalizedY.toFixed(4)),
    });

    if (draft) {
      const c = toVideoCoord(e.clientX, e.clientY);
      if (c) setDraft({ ...draft, x1: c.x, y1: c.y });
    }

    if (isPanning) {
      setPanOffset({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
    }
  };

  // Panning with Middle Click or Alt + Drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (drawBoxMode !== 'none' && e.button === 0 && !e.altKey) {
      const c = toVideoCoord(e.clientX, e.clientY);
      if (c) setDraft({ x0: c.x, y0: c.y, x1: c.x, y1: c.y });
      return;
    }
    const canDragPan = zoomLevel > 1 && pickingMode === 'none' && drawBoxMode === 'none' && e.button === 0;
    if (e.button === 1 || e.altKey || canDragPan) {
      e.preventDefault();
      setIsPanning(true);
      setStartPan({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    if (draft) {
      const box: BoxRect = {
        x: Math.min(draft.x0, draft.x1),
        y: Math.min(draft.y0, draft.y1),
        w: Math.abs(draft.x1 - draft.x0),
        h: Math.abs(draft.y1 - draft.y0),
      };
      setDraft(null);
      // Ignore a plain click: the box must be dragged out
      if (box.w > 0.005 && box.h > 0.005 && onBoxDrawn) {
        onBoxDrawn({
          x: Number(box.x.toFixed(4)),
          y: Number(box.y.toFixed(4)),
          w: Number(box.w.toFixed(4)),
          h: Number(box.h.toFixed(4)),
        });
      }
    }
  };

  // Format timecode
  const formatTimecode = (frame: number) => {
    const seconds = frame / fps;
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2).padStart(5, '0');
    return `${mins.toString().padStart(2, '0')}:${secs}`;
  };

  const totalFrames = metadata?.frameCount || 0;
  // Space = play / pause (ignored while typing in a field)
  const togglePlayRef = useRef(togglePlay);
  togglePlayRef.current = togglePlay;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.key !== ' ') return;
      const el = e.target as HTMLElement;
      const tag = el?.tagName;
      const typing =
        tag === 'TEXTAREA' ||
        (tag === 'INPUT' && ['text', 'number', 'search', 'email', 'password', 'url', 'tel'].includes((el as HTMLInputElement).type));
      if (typing) return;
      // A dropdown / checkbox / button that kept focus must not swallow Space
      if (tag === 'SELECT' || tag === 'INPUT' || tag === 'BUTTON') el.blur();
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault(); // also stops a focused button being "clicked" by Space
      if (!e.repeat) togglePlayRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const MAX_ZOOM = 6;

  // Zoom keeping the point under `anchor` (client coords) fixed; no anchor = zoom on the middle
  const zoomTo = (newZoom: number, anchor?: { x: number; y: number }) => {
    const z1 = zoomLevel;
    const z2 = Math.max(1, Math.min(MAX_ZOOM, newZoom));
    if (z2 === z1) return;
    if (z2 === 1) {
      setZoomLevel(1);
      setPanOffset({ x: 0, y: 0 });
      return;
    }
    const container = containerRef.current;
    if (container && anchor) {
      const r = container.getBoundingClientRect();
      const mx = anchor.x - (r.left + r.width / 2);
      const my = anchor.y - (r.top + r.height / 2);
      setPanOffset({
        x: mx - (z2 / z1) * (mx - panOffset.x),
        y: my - (z2 / z1) * (my - panOffset.y),
      });
    } else {
      setPanOffset({ x: (z2 / z1) * panOffset.x, y: (z2 / z1) * panOffset.y });
    }
    setZoomLevel(z2);
  };

  // Mouse wheel = zoom into whatever is under the cursor
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!blobUrl) return;
    zoomTo(zoomLevel * (e.deltaY < 0 ? 1.2 : 1 / 1.2), { x: e.clientX, y: e.clientY });
  };

  const nearEvents = eventsNearFrame(events, currentFrame);

  return (
    <div className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white select-none relative overflow-hidden">
      {/* Viewport Area */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleVideoClick}
        onWheel={handleWheel}
        className={`flex-1 relative flex items-center justify-center overflow-hidden ${blobUrl ? 'bg-black' : ''} cursor-${
          pickingMode !== 'none' || drawBoxMode !== 'none' ? 'crosshair' : isPanning ? 'grabbing' : zoomLevel > 1 ? 'grab' : 'default'
        }`}
      >
        {blobUrl ? (
          <div
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
              transformOrigin: 'center center',
              transition: isPanning ? 'none' : 'transform 0.1s ease-out',
            }}
            ref={wrapRef}
            className="relative inline-block max-w-full max-h-full"
          >
            <video
              ref={videoRef}
              src={blobUrl}
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
              muted={isMuted}
              playsInline
              className="max-h-[calc(100vh-16rem)] max-w-full object-contain pointer-events-none rounded shadow-2xl"
            />

            {/* Referee / umpire boxes: shown for ±10 frames around the signal frame */}
            {refereeActions?.mainRefereeSignalFrame !== null &&
              refereeActions?.mainRefereeSignalFrame !== undefined &&
              Math.abs(currentFrame - refereeActions.mainRefereeSignalFrame) <= BOX_FRAMES &&
              (refereeActions.mainRefereeBoxes || []).map((box, i, all) => (
                <div
                  key={i}
                  style={{
                    left: `${box.x * 100}%`,
                    top: `${box.y * 100}%`,
                    width: `${box.w * 100}%`,
                    height: `${box.h * 100}%`,
                  }}
                  className="absolute border-2 border-purple-400 bg-purple-400/10 pointer-events-none z-20"
                >
                  <span className="absolute -top-5 left-0 text-[10px] font-bold bg-purple-600 text-white px-1.5 rounded whitespace-nowrap">
                    Referee{all.length > 1 ? ` ${i + 1}` : ''}
                    {refereeActions.pointWinner === 'team_left' ? ' · Left wins' : refereeActions.pointWinner === 'team_right' ? ' · Right wins' : ''}
                  </span>
                </div>
              ))}
            {refereeActions?.umpireFlag.hasFlag &&
              refereeActions.umpireFlag.frame !== null &&
              Math.abs(currentFrame - refereeActions.umpireFlag.frame) <= BOX_FRAMES &&
              (refereeActions.umpireFlag.boxes || []).map((box, i, all) => (
                <div
                  key={i}
                  style={{
                    left: `${box.x * 100}%`,
                    top: `${box.y * 100}%`,
                    width: `${box.w * 100}%`,
                    height: `${box.h * 100}%`,
                  }}
                  className="absolute border-2 border-orange-400 bg-orange-400/10 pointer-events-none z-20"
                >
                  <span className="absolute -top-5 left-0 text-[10px] font-bold bg-orange-500 text-white px-1.5 rounded whitespace-nowrap">
                    Line umpire{all.length > 1 ? ` ${i + 1}` : ''} ·{' '}
                    {refereeActions.umpireFlag.decision === 'touch'
                      ? 'Touch + out'
                      : refereeActions.umpireFlag.decision === 'out'
                      ? 'Out'
                      : 'In'}
                  </span>
                </div>
              ))}

            {/* Box being drawn */}
            {draft && (
              <div
                style={{
                  left: `${Math.min(draft.x0, draft.x1) * 100}%`,
                  top: `${Math.min(draft.y0, draft.y1) * 100}%`,
                  width: `${Math.abs(draft.x1 - draft.x0) * 100}%`,
                  height: `${Math.abs(draft.y1 - draft.y0) * 100}%`,
                }}
                className="absolute border-2 border-dashed border-cyan-300 bg-cyan-300/10 pointer-events-none z-30"
              />
            )}

            {/* Glowing Touch Point Marker (Amber) if on touch frame */}
            {ballLanding.precedingTouch !== 'none' &&
              ballLanding.touchCoord &&
              ballLanding.touchFrame !== null &&
              Math.abs(currentFrame - ballLanding.touchFrame) <= 3 && (
                <div
                  style={{
                    left: `${ballLanding.touchCoord.x * 100}%`,
                    top: `${ballLanding.touchCoord.y * 100}%`,
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20 flex flex-col items-center"
                >
                  <div className="w-5 h-5 rounded-full border-2 border-amber-300 bg-amber-500/80 shadow-lg shadow-amber-500/80 flex items-center justify-center animate-pulse">
                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  </div>
                  <span className="text-[10px] bg-amber-950/90 text-amber-200 border border-amber-500/40 px-1 rounded font-mono mt-0.5 whitespace-nowrap">
                    Touch ({ballLanding.precedingTouch})
                  </span>
                </div>
              )}

            {/* Glowing Ground Landing Marker (Cyan/Emerald) if on landing frame */}
            {ballLanding.isAnnotated &&
              ballLanding.landingCoord &&
              ballLanding.landingFrame !== null &&
              Math.abs(currentFrame - ballLanding.landingFrame) <= 3 && (
                <div
                  style={{
                    left: `${ballLanding.landingCoord.x * 100}%`,
                    top: `${ballLanding.landingCoord.y * 100}%`,
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20 flex flex-col items-center"
                >
                  <div className="w-5 h-5 rounded-full border-2 border-cyan-300 bg-cyan-500/80 shadow-lg shadow-cyan-500/80 flex items-center justify-center animate-bounce">
                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  </div>
                  <span className="text-[10px] bg-cyan-950/90 text-cyan-200 border border-cyan-500/40 px-1 rounded font-mono mt-0.5 whitespace-nowrap">
                    Ground Landing ({ballLanding.landingOutcome.toUpperCase()})
                  </span>
                </div>
              )}
          </div>
        ) : (
          <div className="text-center p-8">
            <p className="text-slate-500 text-sm mb-2">No video clip loaded</p>
            <p className="text-slate-600 text-xs">
              Select or drop an MP4 video from the sidebar to start annotating
            </p>
          </div>
        )}

        {/* Skill popup: shows when the playhead is within ±2 frames of a skill event */}
        {nearEvents.length > 0 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-30 pointer-events-none">
            {nearEvents.map((ev) => {
              const info = SKILL_INFO[ev.skill];
              const diff = ev.frame - currentFrame;
              return (
                <div
                  key={ev.id}
                  className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl bg-slate-900/90 border border-white/20 shadow-xl backdrop-blur"
                >
                  <span
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-extrabold text-white ${
                      info?.chip ?? 'bg-slate-500'
                    }`}
                  >
                    {skillLetter(ev.skill)}
                  </span>
                  <span className="text-sm font-bold text-white uppercase tracking-wide">{skillName(ev.skill)}</span>
                  <span className="text-[11px] font-mono text-slate-300">
                    {diff === 0 ? `frame ${ev.frame}` : `${diff > 0 ? '+' : ''}${diff}f`}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Draw-box banner */}
        {drawBoxMode !== 'none' && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-purple-950/90 border border-purple-400 text-purple-200 px-4 py-2 rounded-xl text-xs font-semibold shadow-xl backdrop-blur-md flex items-center space-x-3 z-30">
            <Crosshair className="w-4 h-4 text-purple-300 shrink-0" />
            <span>
              {drawBoxMode === 'referee' ? (
                (refereeActions?.mainRefereeBoxes?.length ?? 0) === 0 ? (
                  <>
                    Drag a box around the <strong className="text-white uppercase underline">main referee</strong>
                    <span className="text-purple-300"> (2nd referee optional)</span>
                  </>
                ) : (
                  <>
                    Referee 1 saved. Drag a box on the <strong className="text-white uppercase underline">2nd referee</strong>, or finish
                  </>
                )
              ) : (
                (refereeActions?.umpireFlag.boxes?.length ?? 0) === 0 ? (
                  <>
                    Drag a box around the <strong className="text-white uppercase underline">line umpire</strong>
                    <span className="text-purple-300"> (2nd umpire optional)</span>
                  </>
                ) : (
                  <>
                    Umpire 1 saved. Drag a box on the <strong className="text-white uppercase underline">2nd umpire</strong>, or finish
                  </>
                )
              )}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFinishDraw?.();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="px-2 py-0.5 rounded-md bg-purple-500 hover:bg-purple-400 text-white font-bold"
            >
              {(drawBoxMode === 'referee' ? refereeActions?.mainRefereeBoxes?.length ?? 0 : refereeActions?.umpireFlag.boxes?.length ?? 0) > 0 ? 'Done (Enter)' : 'Skip (Esc)'}
            </button>
          </div>
        )}

        {/* Picking Mode Banner Overlay */}
        {pickingMode !== 'none' && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-cyan-950/90 border border-cyan-500 text-cyan-300 px-4 py-2 rounded-xl text-xs font-semibold shadow-xl backdrop-blur-md flex items-center space-x-2 animate-bounce z-30">
            <Crosshair className="w-4 h-4 text-cyan-400" />
            <span>
              Click on the video canvas to place{' '}
              <strong className="text-white uppercase underline">
                {pickingMode === 'touch' ? 'Hand Touch Point' : 'Ground Landing Point'}
              </strong>
            </span>
          </div>
        )}

        {/* Live Coordinate Tooltip */}
        {hoverCoord && pickingMode !== 'none' && (
          <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded text-[11px] font-mono shadow-md pointer-events-none z-30">
            X: {(hoverCoord.x * 100).toFixed(1)}% | Y: {(hoverCoord.y * 100).toFixed(1)}%
          </div>
        )}

        {/* Zoom & Reset floating tools */}
        <div className="absolute top-4 right-4 flex items-center space-x-1 bg-white/90 dark:bg-slate-900/80 backdrop-blur border border-slate-300 dark:border-slate-800 rounded-lg p-1 z-30">
          <button
            onClick={() => zoomTo(zoomLevel * 1.25)}
            title="Zoom In"
            className="p-1.5 rounded text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => zoomTo(zoomLevel / 1.25)}
            title="Zoom Out"
            className="p-1.5 rounded text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span
            title="Scroll wheel over the video to zoom where the cursor is. Drag to move when zoomed."
            className="px-1.5 text-[10px] font-mono text-slate-600 dark:text-slate-400"
          >
            {zoomLevel.toFixed(1)}×
          </span>
          {zoomLevel > 1 && (
            <button
              onClick={() => {
                setZoomLevel(1);
                setPanOffset({ x: 0, y: 0 });
              }}
              title="Reset Zoom & Pan"
              className="p-1.5 rounded text-cyan-700 dark:text-cyan-400 hover:bg-slate-200 dark:hover:bg-slate-800 text-[10px] font-mono px-2"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Floating Control Bar at Bottom */}
      <div className="h-14 bg-white/95 dark:bg-studio-darkPanel/95 border-t border-slate-200 dark:border-studio-darkBorder px-4 flex items-center justify-between z-30 backdrop-blur">
        {/* Left: Frame Counter & Timecode */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 font-mono text-xs">
            <span className="text-slate-500 dark:text-slate-400">Frame:</span>
            <input
              type="number"
              min={0}
              max={totalFrames - 1}
              value={currentFrame}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) stepFrame(val - currentFrame);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
              }}
              className="w-16 bg-slate-100 dark:bg-studio-darkCard border border-slate-300 dark:border-studio-darkBorder rounded px-1.5 py-0.5 text-center text-cyan-700 dark:text-cyan-400 font-bold focus:outline-none focus:border-cyan-500"
            />
            <span className="text-slate-500 dark:text-slate-500">/ {totalFrames > 0 ? totalFrames - 1 : 0}</span>
          </div>

          <div className="hidden sm:block text-xs font-mono text-slate-500 dark:text-slate-400 border-l border-slate-300 dark:border-slate-800 pl-3">
            {formatTimecode(currentFrame)}
          </div>
        </div>

        {/* Center: Playback & Frame Stepping Buttons */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          {/* Previous Skill (any skill: toss -> serve -> ...) */}
          <button
            onClick={onJumpToPrevSkill}
            title="Previous skill, any kind (Key: N)"
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-studio-darkCard text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-studio-darkBorder border border-slate-300 dark:border-studio-darkBorder transition-colors shadow-sm"
          >
            <SkipBack className="w-3.5 h-3.5 text-purple-500" />
            <span className="hidden sm:inline text-[11px]">Prev Skill</span>
            <kbd className="hidden md:inline px-1 py-0.5 rounded text-[9px] font-mono bg-slate-300/60 dark:bg-black/40 text-slate-600 dark:text-slate-400">N</kbd>
          </button>

          {/* Previous Set Button */}
          <button
            onClick={onJumpToPrevSet ? onJumpToPrevSet : () => stepFrame(-10)}
            title="Previous Set (Key: < or ,)"
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-studio-darkCard text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-studio-darkBorder border border-slate-300 dark:border-studio-darkBorder transition-colors shadow-sm"
          >
            <ChevronsLeft className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline text-[11px]">Prev Set</span>
            <kbd className="hidden md:inline px-1 py-0.5 rounded text-[9px] font-mono bg-slate-300/60 dark:bg-black/40 text-slate-600 dark:text-slate-400">&lt;</kbd>
          </button>

          {/* Step -1 Frame */}
          <button
            onClick={() => stepFrame(-1)}
            title="Previous 1 Frame (Key: ←)"
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-studio-darkCard transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Play / Pause */}
          <button
            onClick={togglePlay}
            title="Play / Pause (Space)"
            className="w-10 h-10 rounded-full bg-cyan-500 hover:bg-cyan-400 text-white flex items-center justify-center shadow-lg shadow-cyan-500/20 transition-transform active:scale-95 mx-1"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>

          {/* Step +1 Frame */}
          <button
            onClick={() => stepFrame(1)}
            title="Next 1 Frame (Key: →)"
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-studio-darkCard transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Next Set Button (Click or Key >) */}
          <button
            onClick={onJumpToNextSet ? onJumpToNextSet : () => stepFrame(10)}
            title="Next Set (Key: > or .)"
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors shadow-sm shadow-cyan-600/30"
          >
            <span className="hidden sm:inline text-[11px]">Next Set</span>
            <kbd className="hidden md:inline px-1 py-0.5 rounded text-[9px] font-mono bg-black/40 text-cyan-100">&gt;</kbd>
            <ChevronsRight className="w-4 h-4" />
          </button>

          {/* Next Skill (any skill) */}
          <button
            onClick={onJumpToNextSkill}
            title="Next skill, any kind (Key: M)"
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-studio-darkCard text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-studio-darkBorder border border-slate-300 dark:border-studio-darkBorder transition-colors shadow-sm"
          >
            <kbd className="hidden md:inline px-1 py-0.5 rounded text-[9px] font-mono bg-slate-300/60 dark:bg-black/40 text-slate-600 dark:text-slate-400">M</kbd>
            <span className="hidden sm:inline text-[11px]">Next Skill</span>
            <SkipForward className="w-3.5 h-3.5 text-purple-500" />
          </button>
        </div>

        {/* Right: Playback Speed & Mute */}
        <div className="flex items-center space-x-2">
          {/* Playback speed selector */}
          <select
            value={playbackRate}
            onChange={(e) => {
              const r = parseFloat(e.target.value);
              setPlaybackRate(r);
              if (videoRef.current) videoRef.current.playbackRate = r;
              e.currentTarget.blur();
            }}
            className="bg-slate-100 dark:bg-studio-darkCard border border-slate-300 dark:border-studio-darkBorder text-slate-700 dark:text-slate-300 text-xs rounded px-2 py-1 font-mono focus:outline-none focus:border-cyan-500"
          >
            <option value="0.1">0.1x</option>
            <option value="0.25">0.25x</option>
            <option value="0.5">0.5x</option>
            <option value="1">1.0x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2.0x</option>
          </select>

          {/* Mute button */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            title={isMuted ? 'Unmute' : 'Mute'}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-studio-darkCard"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
