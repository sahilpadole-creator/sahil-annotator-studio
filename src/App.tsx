import React, { useState, useEffect, useCallback, useMemo , useRef } from 'react';
import {
  PlaylistItem,
  SkillEvent,
  SkillLabel,
  BoxRect,
  FlagDecision,
  Point2D,
  VideoMetadata,
  SetStyle,
  SetDirection,
  BallLandingAnnotation,
  RefereeActionsAnnotation,
} from './types';
import { parseAnnotations } from './utils/xmlParser';
import { generateXmlAnnotations, downloadXmlFile } from './utils/xmlExporter';
import { generateJsonAnnotations, downloadJsonFile } from './utils/jsonExporter';
import { exportBatchZip, downloadBlob } from './utils/zipUtils';
import {
  saveSessionState,
  loadSessionState,
  clearSessionState,
  saveThemePreference,
  loadThemePreference,
} from './utils/storage';
import { areFilesMatching, mergeDuplicatePlaylistItems } from './utils/matchingUtils';

import { Header } from './components/Header';
import { PlaylistSidebar } from './components/PlaylistSidebar';
import { VideoPlayer } from './components/VideoPlayer';
import { TimelineScrubber } from './components/TimelineScrubber';
import { SetAnnotationPanel } from './components/SetAnnotationPanel';
import { BallLandingPanel } from './components/BallLandingPanel';
import { RefereeActionPanel } from './components/RefereeActionPanel';
import { saveFiles, loadFiles, deleteFiles, clearAllFiles } from './utils/fileStore';
import { LETTER_TO_SKILL, eventsNearFrame, skillName } from './utils/skills';
import { KeyboardGuide } from './components/KeyboardGuide';

export const App: React.FC = () => {
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);

  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => loadThemePreference());

  // Playlist and session states
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  // UI modal / panel toggles
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [drawBoxMode, setDrawBoxMode] = useState<'none' | 'referee' | 'umpire'>('none');
  const [pickingMode, setPickingMode] = useState<'none' | 'touch' | 'landing'>('none');

  // Theme synchronization with document element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    saveThemePreference(theme);
  }, [theme]);

  // Load previous session on startup
  useEffect(() => {
    const session = loadSessionState();
    if (session.playlist.length > 0) {
      const restoredPlaylist: PlaylistItem[] = session.playlist.map((item) => ({
        ...item,
        videoFile: undefined, // Files must be re-attached if browser was closed
        rawXml: undefined,
      }));
      const mergedList = mergeDuplicatePlaylistItems(restoredPlaylist);
      setPlaylist(mergedList);
      setActiveItemId(
        mergedList.find((i) => i.id === session.activeItemId)?.id ?? (mergedList.length > 0 ? mergedList[0].id : null)
      );

      // Bring back the video / XML files saved in the browser so nothing has to be re-added
      mergedList.forEach(async (item) => {
        const stored = await loadFiles(item.id);
        if (!stored.video && !stored.xml) return;
        if (stored.video) savedFilesRef.current.add(stored.video);
        const rawXml = stored.xml ? await stored.xml.text() : undefined;
        setPlaylist((prev) =>
          prev.map((p) =>
            p.id === item.id
              ? {
                  ...p,
                  videoFile: p.videoFile ?? stored.video,
                  xmlFile: p.xmlFile ?? stored.xml,
                  rawXml: p.rawXml ?? rawXml,
                }
              : p
          )
        );
      });
    }
  }, []);

  // Save newly added video / XML files so they survive a page reload
  const savedFilesRef = useRef<WeakSet<File>>(new WeakSet());
  useEffect(() => {
    playlist.forEach((item) => {
      const toSave: { video?: File; xml?: File } = {};
      if (item.videoFile && !savedFilesRef.current.has(item.videoFile)) {
        toSave.video = item.videoFile;
        savedFilesRef.current.add(item.videoFile);
      }
      if (item.xmlFile && !savedFilesRef.current.has(item.xmlFile)) {
        toSave.xml = item.xmlFile;
        savedFilesRef.current.add(item.xmlFile);
      }
      if (toSave.video || toSave.xml) saveFiles(item.id, toSave);
    });
  }, [playlist]);

  // Auto-save whenever playlist, active item, or step changes
  useEffect(() => {
    if (playlist.length > 0) {
      saveSessionState(playlist, activeItemId, 'set');
    }
  }, [playlist, activeItemId]);

  // Active playlist item reference
  const activeItem = useMemo(() => {
    return playlist.find((item) => item.id === activeItemId) || null;
  }, [playlist, activeItemId]);

  // Update active item helper
  const updateActiveItem = useCallback(
    (updater: (prev: PlaylistItem) => PlaylistItem) => {
      if (!activeItemId) return;
      setPlaylist((prevList) =>
        prevList.map((item) => (item.id === activeItemId ? updater(item) : item))
      );
    },
    [activeItemId]
  );

  // Helper to link a single video directly to a specific playlist item
  const handleLinkVideo = (itemId: string, vidFile: File) => {
    setPlaylist((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              videoFile: vidFile,
              name: item.name.startsWith('annotation') ? vidFile.name.replace(/\.[^/.]+$/, '') : item.name,
              lastUpdated: new Date().toISOString(),
            }
          : item
      )
    );
  };

  // Helper to link a single XML directly to a specific playlist item
  const handleLinkXml = async (itemId: string, xmlFile: File) => {
    const text = await xmlFile.text();
    const parsed = parseAnnotations(text);
    setPlaylist((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        return {
          ...item,
          xmlFile,
          rawXml: text,
          rally: parsed.rally,
          events: parsed.events,
          ballLanding: parsed.ballLanding,
          refereeActions: parsed.refereeActions,
          lastUpdated: new Date().toISOString(),
        };
      })
    );
  };

  // Handle file uploads (both videos and XMLs)
  const handleFilesSelected = async (files: FileList) => {
    const fileArray = Array.from(files);
    const videoFiles = fileArray.filter((f) => f.type.startsWith('video/') || f.name.endsWith('.mp4'));
    // Annotation files: XML, or the pipeline's <rally>_touch_skill_block.json (never *_result.json).
    const isXml = (f: File) => f.name.toLowerCase().endsWith('.xml') || f.type.includes('xml');
    const xmlStems = new Set(fileArray.filter(isXml).map((f) => f.name.replace(/\.[^/.]+$/, '')));
    const xmlFiles = fileArray.filter(
      (f) =>
        isXml(f) ||
        (f.name.toLowerCase().endsWith('.json') &&
          !/_result\.json$/i.test(f.name) &&
          !xmlStems.has(f.name.replace(/\.[^/.]+$/, '')))
    );

    let currentList = [...playlist];

    // Case 1: Exactly 1 video and 1 XML uploaded together -> ALWAYS merge into a single item!
    if (videoFiles.length === 1 && xmlFiles.length === 1) {
      const vidFile = videoFiles[0];
      const xmlFile = xmlFiles[0];
      const text = await xmlFile.text();
      const parsed = parseAnnotations(text);
      const cleanName = vidFile.name.replace(/\.[^/.]+$/, '');

      // Check if matches an existing item in playlist
      const existingIndex = currentList.findIndex(
        (item) => areFilesMatching(item.name, vidFile.name) || areFilesMatching(item.name, xmlFile.name)
      );

      const mergedItem: PlaylistItem = {
        id: existingIndex >= 0 ? currentList[existingIndex].id : `item-${Date.now()}`,
        name: cleanName,
        videoFile: vidFile,
        xmlFile: xmlFile,
        rawXml: text,
        videoMetadata: parsed.detectedFrameCount
          ? {
              filename: vidFile.name,
              fps: parsed.fps ?? 30,
              width: parsed.width ?? 1920,
              height: parsed.height ?? 1080,
              duration: parsed.detectedFrameCount / (parsed.fps ?? 30),
              frameCount: parsed.detectedFrameCount,
            }
          : null,
        rally: parsed.rally,
        events: parsed.events,
        ballLanding: parsed.ballLanding,
        refereeActions: parsed.refereeActions,
        currentFrame: parsed.rally.startFrame ?? 0,
        isCompleted: false,
        lastUpdated: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        currentList[existingIndex] = mergedItem;
      } else {
        currentList.push(mergedItem);
      }

      const finalList = mergeDuplicatePlaylistItems(currentList);
      setPlaylist(finalList);
      setActiveItemId(mergedItem.id);
      return;
    }

    // Case 2: Batch processing
    // First, process XMLs
    for (const xmlFile of xmlFiles) {
      const text = await xmlFile.text();
      const parsed = parseAnnotations(text);

      const existingIndex = currentList.findIndex((item) => areFilesMatching(item.name, xmlFile.name));

      if (existingIndex >= 0) {
        currentList[existingIndex] = {
          ...currentList[existingIndex],
          xmlFile,
          rawXml: text,
          rally: parsed.rally,
          events: parsed.events,
          ballLanding: parsed.ballLanding,
          refereeActions: parsed.refereeActions,
          lastUpdated: new Date().toISOString(),
        };
      } else {
        const newItem: PlaylistItem = {
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: xmlFile.name.replace(/\.(xml|json)$/i, '').replace(/_touch_skill_block$/i, ''),
          xmlFile,
          rawXml: text,
          videoMetadata: parsed.detectedFrameCount
            ? {
                filename: xmlFile.name.replace(/\.(xml|json)$/i, '.mp4'),
                fps: parsed.fps ?? 30,
                width: parsed.width ?? 1920,
                height: parsed.height ?? 1080,
                duration: parsed.detectedFrameCount / (parsed.fps ?? 30),
                frameCount: parsed.detectedFrameCount,
              }
            : null,
          rally: parsed.rally,
          events: parsed.events,
          ballLanding: parsed.ballLanding,
          refereeActions: parsed.refereeActions,
          currentFrame: parsed.rally.startFrame ?? 0,
          isCompleted: false,
          lastUpdated: new Date().toISOString(),
        };
        currentList.push(newItem);
      }
    }

    // Next, process Videos
    for (const vidFile of videoFiles) {
      const existingIndex = currentList.findIndex((item) => areFilesMatching(item.name, vidFile.name));

      if (existingIndex >= 0) {
        currentList[existingIndex] = {
          ...currentList[existingIndex],
          name: currentList[existingIndex].name.startsWith('annotation') ? vidFile.name.replace(/\.[^/.]+$/, '') : currentList[existingIndex].name,
          videoFile: vidFile,
          lastUpdated: new Date().toISOString(),
        };
      } else {
        const newItem: PlaylistItem = {
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: vidFile.name.replace(/\.[^/.]+$/, ''),
          videoFile: vidFile,
          videoMetadata: null,
          rally: { startFrame: 0, endFrame: null },
          events: [],
          ballLanding: {
            landingFrame: null,
            landingCoord: null,
            landingOutcome: 'in',
            precedingTouch: 'none',
            touchFrame: null,
            touchCoord: null,
            isAnnotated: false,
          },
          refereeActions: {
            mainRefereeSignalFrame: null,
            pointWinner: 'none',
            umpireFlag: {
              hasFlag: false,
              frame: null,
              side: 'none',
              decision: 'none',
            },
            isAnnotated: false,
          },
          currentFrame: 0,
          isCompleted: false,
          lastUpdated: new Date().toISOString(),
        };
        currentList.push(newItem);
      }
    }

    // Auto-merge any split duplicates across the playlist
    const finalList = mergeDuplicatePlaylistItems(currentList);
    setPlaylist(finalList);
    if (!activeItemId && finalList.length > 0) {
      setActiveItemId(finalList[0].id);
    }
  };

  // Delete item from playlist
  const handleDeleteItem = (id: string) => {
    deleteFiles(id);
    setPlaylist((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      if (activeItemId === id) {
        setActiveItemId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  };

  // Reset a single rally's annotations (other rallies are untouched)
  const handleResetRally = (id: string) => {
    const target = playlist.find((item) => item.id === id);
    if (!target) return;
    if (!window.confirm(`Reset all annotations for "${target.name}"? Other rallies are not affected.`)) return;

    setPlaylist((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const base = {
          ...item,
          isCompleted: false,
          currentFrame: 0,
          lastUpdated: new Date().toISOString(),
        };
        if (item.rawXml) {
          // Restore exactly what was loaded from the XML
          const parsed = parseAnnotations(item.rawXml);
          return {
            ...base,
            rally: parsed.rally,
            events: parsed.events,
            ballLanding: parsed.ballLanding,
            refereeActions: parsed.refereeActions,
            currentFrame: parsed.rally.startFrame ?? 0,
          };
        }
        // XML no longer in memory: keep detected skills, clear the annotations made on top
        return {
          ...base,
          events: item.events
            .filter((e) => e.source !== 'manual')
            .map(({ setStyle, setDirection, ...rest }) => rest),
          ballLanding: {
            landingFrame: null,
            landingCoord: null,
            landingOutcome: 'in',
            precedingTouch: 'none',
            touchFrame: null,
            touchCoord: null,
            isAnnotated: false,
          },
          refereeActions: {
            mainRefereeSignalFrame: null,
            pointWinner: 'none',
            umpireFlag: { hasFlag: false, frame: null, side: 'none', decision: 'none' },
            isAnnotated: false,
          },
        };
      })
    );
  };

  // Reset entire session
  const handleResetSession = () => {
    if (window.confirm('Are you sure you want to clear all loaded rallies and annotations?')) {
      clearSessionState();
      clearAllFiles();
      setPlaylist([]);
      setActiveItemId(null);
    }
  };

  // Frame update
  const handleFrameChange = (frame: number) => {
    updateActiveItem((item) => ({
      ...item,
      currentFrame: frame,
    }));
  };

  // Set frames sorted in ascending order
  const setFrames = useMemo(() => {
    if (!activeItem) return [];
    return activeItem.events
      .filter((e) => e.skill === 'set')
      .map((e) => e.frame)
      .sort((a, b) => a - b);
  }, [activeItem]);

  // Jump to Next Set frame
  const handleJumpToNextSet = useCallback(() => {
    if (!activeItem || setFrames.length === 0) return;
    const next = setFrames.find((f) => f > activeItem.currentFrame);
    if (next !== undefined) {
      handleFrameChange(next);
    } else {
      handleFrameChange(setFrames[0]);
    }
  }, [activeItem, setFrames]);

  // Jump to Previous Set frame
  const handleJumpToPrevSet = useCallback(() => {
    if (!activeItem || setFrames.length === 0) return;
    const prevFrames = setFrames.filter((f) => f < activeItem.currentFrame);
    if (prevFrames.length > 0) {
      handleFrameChange(prevFrames[prevFrames.length - 1]);
    } else {
      handleFrameChange(setFrames[setFrames.length - 1]);
    }
  }, [activeItem, setFrames]);

  // Skill-to-skill: jump to the previous / next skill event of any kind (toss -> serve -> ...)
  const skillFrames = useMemo(() => {
    if (!activeItem) return [];
    return Array.from(new Set(activeItem.events.map((e) => e.frame))).sort((a, b) => a - b);
  }, [activeItem]);

  const handleJumpToNextSkill = useCallback(() => {
    if (!activeItem || skillFrames.length === 0) return;
    const next = skillFrames.find((f) => f > activeItem.currentFrame);
    handleFrameChange(next !== undefined ? next : skillFrames[0]);
  }, [activeItem, skillFrames]);

  const handleJumpToPrevSkill = useCallback(() => {
    if (!activeItem || skillFrames.length === 0) return;
    const prev = skillFrames.filter((f) => f < activeItem.currentFrame);
    handleFrameChange(prev.length > 0 ? prev[prev.length - 1] : skillFrames[skillFrames.length - 1]);
  }, [activeItem, skillFrames]);

  // Video metadata loaded
  const handleMetadataLoaded = (meta: VideoMetadata) => {
    updateActiveItem((item) => ({
      ...item,
      videoMetadata: meta,
      rally: {
        startFrame: item.rally.startFrame ?? 0,
        endFrame: item.rally.endFrame ?? meta.frameCount - 1,
      },
    }));
  };

  // Update a single skill event (e.g. set style or direction)
  const handleUpdateEvent = (updated: SkillEvent) => {
    updateActiveItem((item) => ({
      ...item,
      events: item.events.map((e) => (e.id === updated.id ? updated : e)),
      lastUpdated: new Date().toISOString(),
    }));
  };

  // Add a new set event
  const handleAddSetEvent = (frame: number) => {
    const newEvent: SkillEvent = {
      id: `event-${frame}-set-${Date.now()}`,
      frame,
      skill: 'set',
      source: 'manual',
      setStyle: 'overhead',
      setDirection: 'forward',
    };
    updateActiveItem((item) => ({
      ...item,
      events: [...item.events, newEvent].sort((a, b) => a.frame - b.frame),
      lastUpdated: new Date().toISOString(),
    }));
  };

  // Re-label the skill at the current frame (nearest event within ±2 frames), or add one if none is there.
  // Used to correct wrong model output.
  const handleChangeSkillAtFrame = (skill: SkillLabel) => {
    if (!activeItem) return;
    const target = eventsNearFrame(activeItem.events, activeItem.currentFrame)[0];
    updateActiveItem((item) => {
      if (target) {
        return {
          ...item,
          events: item.events
            .map((ev) =>
            ev.id === target.id
              ? {
                  ...ev,
                  skill,
                  frame: item.currentFrame, // the skill lands exactly on the frame you pressed it, not ±1/±2
                  source: 'manual' as const,
                  setStyle: skill === 'set' ? ev.setStyle : undefined,
                  setDirection: skill === 'set' ? ev.setDirection : undefined,
                }
              : ev
            )
            .sort((a, b) => a.frame - b.frame),
          lastUpdated: new Date().toISOString(),
        };
      }
      const created: SkillEvent = {
        id: `event-${item.currentFrame}-${skill}-${Date.now()}`,
        frame: item.currentFrame,
        skill,
        source: 'manual',
      };
      return {
        ...item,
        events: [...item.events, created].sort((a, b) => a.frame - b.frame),
        lastUpdated: new Date().toISOString(),
      };
    });
  };

  // Delete the skill event at the current frame (nearest within ±2 frames)
  const handleDeleteSkillAtFrame = () => {
    if (!activeItem) return;
    const target = eventsNearFrame(activeItem.events, activeItem.currentFrame)[0];
    if (!target) return;
    updateActiveItem((item) => ({
      ...item,
      events: item.events.filter((ev) => ev.id !== target.id),
      lastUpdated: new Date().toISOString(),
    }));
  };

  // Update ball landing annotation
  const handleUpdateBallLanding = (updatedLanding: BallLandingAnnotation) => {
    updateActiveItem((item) => ({
      ...item,
      ballLanding: updatedLanding,
      lastUpdated: new Date().toISOString(),
    }));
  };

  // Update referee actions annotation
  const handleUpdateRefereeActions = (updatedRef: RefereeActionsAnnotation) => {
    updateActiveItem((item) => ({
      ...item,
      refereeActions: updatedRef,
      lastUpdated: new Date().toISOString(),
    }));
  };

  // Line umpire flag: 1 = ball in, 2 = ball out, 3 = ball touched the hand and went out.
  // Same key again (near the same frame) clears the flag. A new flag starts the box tool.
  const handleFlagDecision = (decision: FlagDecision) => {
    if (!activeItem) return;
    const ref = activeItem.refereeActions;
    const flag = ref.umpireFlag;
    const sameFlag = flag.hasFlag && flag.frame !== null && Math.abs(activeItem.currentFrame - flag.frame) <= 10;

    if (sameFlag && flag.decision === decision) {
      handleUpdateRefereeActions({
        ...ref,
        umpireFlag: { hasFlag: false, frame: null, side: 'none', decision: 'none', boxes: [] },
      });
      setDrawBoxMode('none');
      return;
    }
    if (sameFlag) {
      // Just correcting the decision of the flag already there: keep frame and boxes
      handleUpdateRefereeActions({ ...ref, umpireFlag: { ...flag, decision }, isAnnotated: true });
      return;
    }
    handleUpdateRefereeActions({
      ...ref,
      umpireFlag: { hasFlag: true, side: 'none', frame: activeItem.currentFrame, decision, boxes: [] },
      isAnnotated: true,
    });
    setPickingMode('none');
    setDrawBoxMode('umpire');
  };

  // A box was dragged on the video: attach it to the referee or the side umpire
  const handleBoxDrawn = (box: BoxRect) => {
    if (!activeItem) return;
    const ref = activeItem.refereeActions;
    if (drawBoxMode === 'referee') {
      // up to two referees: keep the tool on after the first box, finish after the second
      const boxes = [...(ref.mainRefereeBoxes || []), box].slice(0, 2);
      handleUpdateRefereeActions({ ...ref, mainRefereeBoxes: boxes, isAnnotated: true });
      if (boxes.length < 2) return;
    } else if (drawBoxMode === 'umpire') {
      const boxes = [...(ref.umpireFlag.boxes || []), box].slice(0, 2);
      handleUpdateRefereeActions({ ...ref, umpireFlag: { ...ref.umpireFlag, boxes }, isAnnotated: true });
      if (boxes.length < 2) return;
    }
    setDrawBoxMode('none');
  };

  // Picking coordinate on video canvas
  const handlePickCoordinate = (coord: Point2D) => {
    if (!activeItem) return;

    // Clicking the ball on the video marks BOTH the position and the current frame as the landing
    handleUpdateBallLanding({
      ...activeItem.ballLanding,
      landingCoord: coord,
      landingFrame: activeItem.currentFrame,
      isAnnotated: true,
    });
    setPickingMode('none');
  };

  // Export handlers
  const handleExportXml = () => {
    if (!activeItem) return;
    const xml = generateXmlAnnotations(
      activeItem.videoMetadata,
      activeItem.rally,
      activeItem.events,
      activeItem.ballLanding,
      activeItem.refereeActions
    );
    downloadXmlFile(xml, `${activeItem.name}.xml`);
  };

  const handleExportJson = () => {
    if (!activeItem) return;
    const json = generateJsonAnnotations(
      activeItem.videoMetadata,
      activeItem.rally,
      activeItem.events,
      activeItem.ballLanding,
      activeItem.refereeActions
    );
    downloadJsonFile(json, `${activeItem.name}_updated.json`);
  };

  const handleExportBatchZip = async (includeVideo: boolean) => {
    if (playlist.length === 0) return;
    const { blob, videosMissing } = await exportBatchZip(playlist, includeVideo);
    downloadBlob(blob, 'volleyball_annotations_batch.zip');
    if (includeVideo && videosMissing > 0) {
      window.alert(
        `${videosMissing} rally(ies) had no video loaded (re-link the video after a page reload), so only their XML and JSON were added.`
      );
    }
  };

  // Global Ergonomic Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside an input, textarea or select
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === 'Enter' && drawBoxMode !== 'none') {
        e.preventDefault();
        setDrawBoxMode('none');
        return;
      }

      if (e.key === 'Escape') {
        if (isGuideOpen) { setIsGuideOpen(false); return; }
        if (drawBoxMode !== 'none') { setDrawBoxMode('none'); return; }
        if (pickingMode !== 'none') setPickingMode('none');
        return;
      }

      // Don't trigger annotation keys while the guide is open
      if (isGuideOpen) return;

      if (!activeItem) return;

      // Next Set: Greater Than (>) or . or Shift+ArrowRight
      if (e.key === '>' || e.key === '.' || (e.shiftKey && e.key === 'ArrowRight')) {
        e.preventDefault();
        handleJumpToNextSet();
        return;
      }

      // Previous Set: Less Than (<) or , or Shift+ArrowLeft
      if (e.key === '<' || e.key === ',' || (e.shiftKey && e.key === 'ArrowLeft')) {
        e.preventDefault();
        handleJumpToPrevSet();
        return;
      }

      // Next 1 Frame: Right Arrow
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const total = activeItem.videoMetadata?.frameCount || 999999;
        handleFrameChange(Math.min(total - 1, activeItem.currentFrame + 1));
        return;
      }

      // Previous 1 Frame: Left Arrow
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleFrameChange(Math.max(0, activeItem.currentFrame - 1));
        return;
      }

      // Frame stepping via [ and ] (Left hand accessible)
      if (e.key === '[') {
        e.preventDefault();
        const delta = e.shiftKey ? -10 : -1;
        handleFrameChange(Math.max(0, activeItem.currentFrame + delta));
        return;
      }
      if (e.key === ']') {
        e.preventDefault();
        const total = activeItem.videoMetadata?.frameCount || 9999;
        const delta = e.shiftKey ? 10 : 1;
        handleFrameChange(Math.min(total - 1, activeItem.currentFrame + delta));
        return;
      }

      // Shift + V/T/R/S/D/A/B = change (or add) the skill at this frame; Delete = remove it
      if (e.shiftKey && !e.ctrlKey && !e.metaKey && LETTER_TO_SKILL[e.key.toLowerCase()]) {
        e.preventDefault();
        handleChangeSkillAtFrame(LETTER_TO_SKILL[e.key.toLowerCase()]);
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteSkillAtFrame();
        return;
      }

      const key = e.key.toLowerCase();

      // N / M = previous / next skill of any kind
      if (!e.shiftKey && key === 'n') {
        e.preventDefault();
        handleJumpToPrevSkill();
        return;
      }
      if (!e.shiftKey && key === 'm') {
        e.preventDefault();
        handleJumpToNextSkill();
        return;
      }

      // ==========================================
      // STAGE 1: SET ANNOTATION
      // ==========================================
      {
        const setEvents = activeItem.events.filter((ev) => ev.skill === 'set');
        if (setEvents.length > 0) {
          // Find nearest set event to current frame
          let nearestSet = setEvents[0];
          let minDiff = Math.abs(setEvents[0].frame - activeItem.currentFrame);
          for (const s of setEvents) {
            const diff = Math.abs(s.frame - activeItem.currentFrame);
            if (diff < minDiff) {
              minDiff = diff;
              nearestSet = s;
            }
          }

          if (key === 'q' || key === 'o') {
            e.preventDefault();
            handleUpdateEvent({ ...nearestSet, setStyle: 'overhead' });
          } else if (key === 'a' || key === 'u') {
            e.preventDefault();
            handleUpdateEvent({ ...nearestSet, setStyle: 'underhead' });
          } else if (key === 'w' || key === 'f') {
            e.preventDefault();
            handleUpdateEvent({ ...nearestSet, setDirection: 'forward' });
          } else if (key === 's' || key === 'b') {
            e.preventDefault();
            handleUpdateEvent({ ...nearestSet, setDirection: 'backward' });
          }
        }
      }

      // ==========================================
      // STAGE 2: BALL LANDING & TOUCH CONTEXT
      // ==========================================
      {
        // Outcome: E = In Court, D = Out of Court. Both switch on the pick tool so you just click the ball.
        if (key === 'e') {
          e.preventDefault();
          handleUpdateBallLanding({
            ...activeItem.ballLanding,
            landingOutcome: 'in',
          });
          setPickingMode('landing'); // straight to picking: just click the ball
          return;
        }
        if (key === 'd') {
          e.preventDefault();
          handleUpdateBallLanding({
            ...activeItem.ballLanding,
            landingOutcome: 'out',
          });
          setPickingMode('landing');
          return;
        }
      }

      // ==========================================
      // STAGE 3: REFEREE ACTIONS & FLAGS
      // ==========================================
      {
        // Winner: R = Team Left, T = Team Right
        if (key === 'r') {
          e.preventDefault();
          handleUpdateRefereeActions({
            ...activeItem.refereeActions,
            pointWinner: 'team_left',
            mainRefereeSignalFrame: activeItem.currentFrame,
            mainRefereeBoxes: [],
            isAnnotated: true,
          });
          setPickingMode('none');
          setDrawBoxMode('referee');
          return;
        }
        if (key === 't') {
          e.preventDefault();
          handleUpdateRefereeActions({
            ...activeItem.refereeActions,
            pointWinner: 'team_right',
            mainRefereeSignalFrame: activeItem.currentFrame,
            mainRefereeBoxes: [],
            isAnnotated: true,
          });
          setPickingMode('none');
          setDrawBoxMode('referee');
          return;
        }

        // 1 / 2 / 3 = line-umpire flag decision (turns the flag ON directly, then draw the box)
        const decisionKeys: Record<string, FlagDecision> = { '1': 'in', '2': 'out', '3': 'touch' };
        if (decisionKeys[e.key]) {
          e.preventDefault();
          handleFlagDecision(decisionKeys[e.key]);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeItem, pickingMode, isGuideOpen, drawBoxMode]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-studio-lightBg dark:bg-studio-darkBg text-slate-800 dark:text-slate-100 transition-colors">
      {/* 1. Top Global Header */}
      <Header
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        activeItem={activeItem}
        rallyCount={playlist.length}
        onExportBatchZip={handleExportBatchZip}
        onResetSession={handleResetSession}
        onOpenShortcuts={() => setIsGuideOpen(true)}
      />

      {/* 3. Main Center Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Playlist Sidebar */}
        <PlaylistSidebar
          playlist={playlist}
          activeItemId={activeItemId}
          onSelectItem={setActiveItemId}
          onFilesSelected={handleFilesSelected}
          onDeleteItem={handleDeleteItem}
          onResetItem={handleResetRally}
          isOpen={isSidebarOpen}
          onToggleOpen={() => setIsSidebarOpen((o) => !o)}
          onLinkVideo={handleLinkVideo}
          onLinkXml={handleLinkXml}
        />

        {/* Center: Video Player & Timeline */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-100 dark:bg-black">
          <VideoPlayer
            videoFile={activeItem?.videoFile}
            metadata={activeItem?.videoMetadata || null}
            currentFrame={activeItem?.currentFrame || 0}
            onFrameChange={handleFrameChange}
            onMetadataLoaded={handleMetadataLoaded}
            pickingMode={pickingMode}
            onPickCoordinate={handlePickCoordinate}
            ballLanding={activeItem?.ballLanding || {
              landingFrame: null,
              landingCoord: null,
              landingOutcome: 'in',
              precedingTouch: 'none',
              touchFrame: null,
              touchCoord: null,
              isAnnotated: false,
            }}
            events={activeItem?.events || []}
            refereeActions={activeItem?.refereeActions}
            drawBoxMode={drawBoxMode}
            onBoxDrawn={handleBoxDrawn}
            onFinishDraw={() => setDrawBoxMode('none')}
            onJumpToNextSet={handleJumpToNextSet}
            onJumpToPrevSet={handleJumpToPrevSet}
            onJumpToNextSkill={handleJumpToNextSkill}
            onJumpToPrevSkill={handleJumpToPrevSkill}
          />

          <TimelineScrubber
            currentFrame={activeItem?.currentFrame || 0}
            totalFrames={activeItem?.videoMetadata?.frameCount || 100}
            rally={activeItem?.rally || { startFrame: null, endFrame: null }}
            events={activeItem?.events || []}
            ballLanding={activeItem?.ballLanding || {
              landingFrame: null,
              landingCoord: null,
              landingOutcome: 'in',
              precedingTouch: 'none',
              touchFrame: null,
              touchCoord: null,
              isAnnotated: false,
            }}
            refereeActions={activeItem?.refereeActions || {
              mainRefereeSignalFrame: null,
              pointWinner: 'none',
              umpireFlag: { hasFlag: false, frame: null, side: 'none', decision: 'none' },
              isAnnotated: false,
            }}
            onSeek={handleFrameChange}
          />
        </div>

        {/* Right: Active Stage Annotation Panel */}
        <div className="w-96 shrink-0 flex flex-col border-l border-slate-200 dark:border-studio-darkBorder bg-slate-50 dark:bg-studio-darkPanel">
          <div className="flex-1 overflow-y-auto">
          {activeItem ? (
            <>
              <SetAnnotationPanel
                  events={activeItem.events}
                  currentFrame={activeItem.currentFrame}
                  onUpdateEvent={handleUpdateEvent}
                  onAddSetEvent={handleAddSetEvent}
                  onJumpToFrame={handleFrameChange}
                  onJumpToNextSet={handleJumpToNextSet}
                  onJumpToPrevSet={handleJumpToPrevSet}
                />

              <BallLandingPanel
                  ballLanding={activeItem.ballLanding}
                  currentFrame={activeItem.currentFrame}
                  onUpdateBallLanding={handleUpdateBallLanding}
                  onJumpToFrame={handleFrameChange}
                  pickingMode={pickingMode}
                  setPickingMode={setPickingMode}
                />

              <RefereeActionPanel
                  refereeActions={activeItem.refereeActions}
                  currentFrame={activeItem.currentFrame}
                  onUpdateRefereeActions={handleUpdateRefereeActions}
                  drawBoxMode={drawBoxMode}
                  onFlagDecision={handleFlagDecision}
                  onStartBoxDraw={(kind) => { setPickingMode('none'); setDrawBoxMode(kind); }}
                  onJumpToFrame={handleFrameChange}
                />
            </>
          ) : (
            <div className="p-8 text-center text-slate-400">
              <p className="text-xs">No rally selected</p>
              <p className="text-[11px] mt-1 text-slate-500">
                Upload or select a rally from the left sidebar to begin
              </p>
            </div>
          )}
          </div>
        </div>
      </div>
      <KeyboardGuide isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </div>
  );
};
