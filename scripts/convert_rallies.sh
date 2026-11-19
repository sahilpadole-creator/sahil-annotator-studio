#!/usr/bin/env bash
# Convert rally videos to seek-friendly constant-frame-rate H.264 (same settings as the
# volleyball-annotator preview). Usage: scripts/convert_rallies.sh <input_dir> [output_dir]
# Output files are named <name>_h264.mp4 so the annotator recognises them.
set -euo pipefail
in="${1:?usage: $0 <input_dir> [output_dir]}"
out="${2:-$in/h264}"
mkdir -p "$out"
shopt -s nullglob nocaseglob
for f in "$in"/*.mp4 "$in"/*.mov "$in"/*.m4v "$in"/*.avi "$in"/*.mkv; do
  base="$(basename "${f%.*}")"; base="${base%_h264}"
  dst="$out/${base}_h264.mp4"
  [ -s "$dst" ] && { echo "skip  $dst"; continue; }
  fps="$(ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 "$f" | head -1)"
  fps="$(awk -F/ '{ if ($2 > 0) printf "%.6f", $1/$2; else print $1 }' <<<"$fps")"
  echo "convert $f -> $dst (${fps} fps)"
  ffmpeg -nostdin -loglevel error -y -i "$f" -map 0:v:0 -c:v libx264 -preset veryfast -crf 23 \
    -pix_fmt yuv420p -r "$fps" -vsync cfr -g 15 -keyint_min 15 -movflags +faststart -an "$dst"
done
echo "done -> $out"
