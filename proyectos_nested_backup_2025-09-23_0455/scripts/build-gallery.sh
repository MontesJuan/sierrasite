#!/usr/bin/env bash
set -euo pipefail

SRC_BASE="public/assets/galeria"
DEST_BASE="public/assets/galeria_web"

cmd_exists(){ command -v "$1" >/dev/null 2>&1; }

if cmd_exists magick; then IM=magick
elif cmd_exists convert; then IM=convert
else IM=""
fi

mkdir -p "$DEST_BASE/backstage" "$DEST_BASE/stills"

process_dir () {
  local SRC="$1" DEST="$2"
  mkdir -p "$DEST"
  shopt -s nullglob nocaseglob
  for f in "$SRC"/*.{jpg,jpeg,png,webp}; do
    base="$(basename "${f%.*}")"
    safe="$(printf '%s' "$base" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cs 'a-z0-9._-' '-')"
    out="$DEST/$safe.webp"
    if [ -n "$IM" ]; then
      $IM "$f" -auto-orient -strip -resize "1920x1920>" -quality 82 -sampling-factor 4:2:0 -define webp:method=6 "$out"
    else
      # fallback: sips + cwebp
      tmp="/tmp/${safe}.jpg"
      sips -Z 1920 "$f" --setProperty format jpeg --out "$tmp" >/dev/null
      cwebp -q 80 "$tmp" -o "$out" >/dev/null
      rm -f "$tmp"
    fi
    echo "✔ $out"
  done
}

process_dir "$SRC_BASE/backstage" "$DEST_BASE/backstage"
process_dir "$SRC_BASE/stills"    "$DEST_BASE/stills"

node scripts/gen-gallery-manifest.mjs "$DEST_BASE"
