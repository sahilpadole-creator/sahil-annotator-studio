import { PlaylistItem, AnnotationStep, AppSettings } from '../types';

const STORAGE_KEY_PLAYLIST = 'mahesh_annotator_playlist_v1';
const STORAGE_KEY_ACTIVE_ID = 'mahesh_annotator_active_id_v1';
const STORAGE_KEY_ACTIVE_STEP = 'mahesh_annotator_active_step_v1';
const STORAGE_KEY_THEME = 'mahesh_annotator_theme_v1';
const STORAGE_KEY_SETTINGS = 'mahesh_annotator_settings_v1';

export interface SerializedPlaylistItem {
  id: string;
  name: string;
  videoMetadata: PlaylistItem['videoMetadata'];
  rally: PlaylistItem['rally'];
  events: PlaylistItem['events'];
  ballLanding: PlaylistItem['ballLanding'];
  refereeActions: PlaylistItem['refereeActions'];
  currentFrame: number;
  isCompleted: boolean;
  lastUpdated: string;
}

export function saveSessionState(
  playlist: PlaylistItem[],
  activeItemId: string | null,
  activeStep: AnnotationStep
): void {
  try {
    const serialized: SerializedPlaylistItem[] = playlist.map((item) => ({
      id: item.id,
      name: item.name,
      videoMetadata: item.videoMetadata,
      rally: item.rally,
      events: item.events,
      ballLanding: item.ballLanding,
      refereeActions: item.refereeActions,
      currentFrame: item.currentFrame,
      isCompleted: item.isCompleted,
      lastUpdated: new Date().toISOString(),
    }));

    localStorage.setItem(STORAGE_KEY_PLAYLIST, JSON.stringify(serialized));
    if (activeItemId) {
      localStorage.setItem(STORAGE_KEY_ACTIVE_ID, activeItemId);
    }
    localStorage.setItem(STORAGE_KEY_ACTIVE_STEP, activeStep);
  } catch (err) {
    console.warn('Failed to save state to localStorage:', err);
  }
}

export function loadSessionState(): {
  playlist: SerializedPlaylistItem[];
  activeItemId: string | null;
  activeStep: AnnotationStep;
} {
  try {
    const rawList = localStorage.getItem(STORAGE_KEY_PLAYLIST);
    const activeId = localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
    const rawStep = localStorage.getItem(STORAGE_KEY_ACTIVE_STEP) as AnnotationStep;

    const playlist: SerializedPlaylistItem[] = rawList ? JSON.parse(rawList) : [];
    const activeStep: AnnotationStep = ['set', 'landing', 'referee'].includes(rawStep)
      ? rawStep
      : 'set';

    return {
      playlist,
      activeItemId: activeId || (playlist.length > 0 ? playlist[0].id : null),
      activeStep,
    };
  } catch (err) {
    console.warn('Failed to load state from localStorage:', err);
    return { playlist: [], activeItemId: null, activeStep: 'set' };
  }
}

export function clearSessionState(): void {
  localStorage.removeItem(STORAGE_KEY_PLAYLIST);
  localStorage.removeItem(STORAGE_KEY_ACTIVE_ID);
  localStorage.removeItem(STORAGE_KEY_ACTIVE_STEP);
}

export function saveThemePreference(theme: 'dark' | 'light'): void {
  localStorage.setItem(STORAGE_KEY_THEME, theme);
}

export function loadThemePreference(): 'dark' | 'light' {
  const t = localStorage.getItem(STORAGE_KEY_THEME);
  return t === 'light' ? 'light' : 'dark';
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // fallback
  }
  return {
    theme: 'dark',
    playbackFps: 30,
    autoAdvanceOnTag: true,
    jumpFrameStep: 10,
  };
}
