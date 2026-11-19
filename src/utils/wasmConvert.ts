/** In-browser fallback: re-encode a clip to constant-frame-rate H.264 with ffmpeg.wasm. */
type FFmpegInstance = import('@ffmpeg/ffmpeg').FFmpeg;
let loading: Promise<FFmpegInstance> | null = null;

async function getFfmpeg(): Promise<FFmpegInstance> {
  if (!loading) {
    loading = (async () => {
      const { FFmpeg } = await import('@ffmpeg/ffmpeg');
      const { toBlobURL } = await import('@ffmpeg/util');
      const ff = new FFmpeg();
      const base = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm';
      await ff.load({
        coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      return ff;
    })();
    loading.catch(() => { loading = null; });
  }
  return loading;
}

/** Read the clip's own frame rate by letting ffmpeg print its stream info. */
async function probeFps(ff: FFmpegInstance, input: string): Promise<number | null> {
  let text = '';
  const onLog = ({ message }: { message: string }) => { text += message + '\n'; };
  ff.on('log', onLog);
  try { await ff.exec(['-hide_banner', '-i', input]); } catch { /* ffmpeg exits non-zero with no output file */ }
  ff.off('log', onLog);
  const m = text.match(/Video:[^\n]*?,\s*([\d.]+)\s*fps/);
  const v = m ? parseFloat(m[1]) : NaN;
  return Number.isFinite(v) && v > 1 && v < 241 ? v : null;
}

export async function convertToH264(file: File, onProgress?: (r: number) => void): Promise<File> {
  const ff = await getFfmpeg();
  const handler = ({ progress }: { progress: number }) => onProgress?.(Math.max(0, Math.min(1, progress)));
  ff.on('progress', handler);
  const ext = (file.name.match(/\.[^/.]+$/)?.[0] || '.mp4').toLowerCase();
  const input = `input${ext}`;
  const output = 'output_h264.mp4';
  try {
    const { fetchFile } = await import('@ffmpeg/util');
    await ff.writeFile(input, await fetchFile(file));
    const fps = await probeFps(ff, input);
    await ff.exec([
      '-i', input, '-map', '0:v:0', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '26',
      '-pix_fmt', 'yuv420p', ...(fps ? ['-r', String(fps)] : []), '-vsync', 'cfr', '-g', '15', '-keyint_min', '15',
      '-movflags', '+faststart', '-an', output,
    ]);
    const data = await ff.readFile(output);
    const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    const stem = file.name.replace(/\.[^/.]+$/, '').replace(/_h264$/i, '');
    return new File([copy], `${stem}_h264.mp4`, { type: 'video/mp4' });
  } finally {
    ff.off('progress', handler);
    try { await ff.deleteFile(input); } catch { /* ignore */ }
    try { await ff.deleteFile(output); } catch { /* ignore */ }
  }
}
