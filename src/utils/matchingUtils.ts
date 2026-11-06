import { PlaylistItem } from '../types';

const stemCache = new Map<string, string>();

export function extractCleanStem(filename: string): string {
  const cached = stemCache.get(filename);
  if (cached !== undefined) return cached;
  const stem = computeStem(filename);
  if (stemCache.size > 5000) stemCache.clear();
  stemCache.set(filename, stem);
  return stem;
}

function computeStem(filename: string): string {
  return filename
    .replace(/\.[^/.]+$/, '')
    .replace(/^(annotations?|annotated)[-_]/i, '')
    .replace(/^(video|vid|clip|rally|match)[-_]/i, '')
    .replace(/([-_](touch_skill_block|updated|fixed|resync|annotated|annotations?))+$/i, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .trim()
    .toLowerCase();
}

export function extractNumericId(filename: string): string | null {
  const match = filename.match(/\d{3,}/); // 3 or more digits (like 32608, 105, 54552)
  return match ? match[0] : null;
}

export function areFilesMatching(name1: string, name2: string): boolean {
  if (!name1 || !name2) return false;
  
  const stem1 = extractCleanStem(name1);
  const stem2 = extractCleanStem(name2);
  
  if (stem1 && stem2) {
    // Exact match only: a substring test wrongly merged rally "1" with "12", "100"... on big batches
    if (stem1 === stem2) return true;
  }

  const id1 = extractNumericId(name1);
  const id2 = extractNumericId(name2);
  if (id1 && id2 && id1 === id2) {
    return true;
  }

  return false;
}

/**
 * Merges split playlist items where one has XML (skills) and the other has the Video file.
 */
export function mergeDuplicatePlaylistItems(items: PlaylistItem[]): PlaylistItem[] {
  const merged: PlaylistItem[] = [];
  const handledIds = new Set<string>();

  for (let i = 0; i < items.length; i++) {
    const itemA = items[i];
    if (handledIds.has(itemA.id)) continue;

    // Look for a matching counterpart in the remaining items
    let matchedIndex = -1;
    for (let j = i + 1; j < items.length; j++) {
      const itemB = items[j];
      if (handledIds.has(itemB.id)) continue;

      if (areFilesMatching(itemA.name, itemB.name)) {
        // We found a match (e.g. annotations_32608 and video-32608)
        matchedIndex = j;
        break;
      }
    }

    if (matchedIndex >= 0) {
      const itemB = items[matchedIndex];
      handledIds.add(itemA.id);
      handledIds.add(itemB.id);

      // Determine which one has the video and which has the XML events
      const withVideo = itemA.videoFile ? itemA : (itemB.videoFile ? itemB : itemA);
      const withXml = itemA.events.length > 0 ? itemA : (itemB.events.length > 0 ? itemB : itemA);

      const combined: PlaylistItem = {
        id: withVideo.id,
        name: withVideo.name.startsWith('video') ? withVideo.name : withXml.name,
        videoFile: withVideo.videoFile || withXml.videoFile,
        videoUrl: withVideo.videoUrl || withXml.videoUrl,
        xmlFile: withXml.xmlFile || withVideo.xmlFile,
        rawXml: withXml.rawXml || withVideo.rawXml,
        videoMetadata: withVideo.videoMetadata || withXml.videoMetadata,
        rally: withXml.rally.startFrame !== null ? withXml.rally : withVideo.rally,
        events: withXml.events.length > 0 ? withXml.events : withVideo.events,
        ballLanding: withXml.ballLanding.isAnnotated ? withXml.ballLanding : withVideo.ballLanding,
        refereeActions: withXml.refereeActions.isAnnotated ? withXml.refereeActions : withVideo.refereeActions,
        currentFrame: withVideo.currentFrame || withXml.currentFrame || 0,
        isCompleted: withXml.isCompleted || withVideo.isCompleted,
        lastUpdated: new Date().toISOString(),
      };

      merged.push(combined);
    } else {
      handledIds.add(itemA.id);
      merged.push(itemA);
    }
  }

  return merged;
}
