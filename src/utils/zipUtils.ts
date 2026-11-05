import JSZip from 'jszip';
import { PlaylistItem } from '../types';
import { generateXmlAnnotations } from './xmlExporter';
import { generateJsonAnnotations } from './jsonExporter';

export async function exportBatchZip(
  items: PlaylistItem[],
  includeVideo = false
): Promise<{ blob: Blob; videosIncluded: number; videosMissing: number }> {
  const zip = new JSZip();
  let videosIncluded = 0;
  let videosMissing = 0;

  for (const item of items) {
    const stem = item.name.replace(/\.[^/.]+$/, '');
    
    // Generate XML
    const xml = generateXmlAnnotations(
      item.videoMetadata,
      item.rally,
      item.events,
      item.ballLanding,
      item.refereeActions
    );
    zip.file(`${stem}.xml`, xml);

    // Generate JSON
    const json = generateJsonAnnotations(
      item.videoMetadata,
      item.rally,
      item.events,
      item.ballLanding,
      item.refereeActions
    );
    zip.file(`${stem}_updated.json`, json);

    if (includeVideo) {
      if (item.videoFile) {
        const ext = item.videoFile.name.match(/\.[^/.]+$/)?.[0] ?? '.mp4';
        zip.file(`${stem}${ext}`, item.videoFile);
        videosIncluded++;
      } else {
        videosMissing++;
      }
    }
  }

  // Videos are already compressed, so store them as-is (fast); text files get deflated
  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
    streamFiles: true,
  });
  return { blob, videosIncluded, videosMissing };
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
