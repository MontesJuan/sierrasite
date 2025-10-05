#!/usr/bin/env bash
set -euo pipefail

# === Configuración ===
DIR_STILLS="/Users/juanmontes/proyectos/public/assets/galeria_web/stills"
DIR_BACK="$(cd "$(dirname "$DIR_STILLS")" && pwd)/backstage"  # para regenerar gallery.json
MODE="${MODE:-fit}"   # fit | letterbox1080
QUALITY="${QUALITY:-82}"
MAXPIX="${MAXPIX:-1920}"
BG="${BG:-white}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP="$(mktemp -d -t stills_norm.XXXX)"
ERR="$ROOT/conversion_errors_stills.txt"
: > "$ERR"

if [ ! -d "$DIR_STILLS" ]; then
  echo "No existe: $DIR_STILLS"; exit 1
fi

slugify() {
  local in="$1" s
  s="$(printf '%s' "$in" | iconv -f utf-8 -t ascii//TRANSLIT 2>/dev/null || printf '%s' "$in")"
  s="$(printf '%s' "$s" | tr '[:upper:]' '[:lower:]')"
  s="$(printf '%s' "$s" | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//; s/-{2,}/-/g')"
  printf '%s' "$s"
}

convert_fit_magick() {
  magick "$1[0]" -auto-orient -strip -colorspace sRGB \
    -resize "${MAXPIX}x${MAXPIX}>" -define webp:method=6 -quality "$QUALITY" "$2"
}

convert_letterbox_magick() {
  magick "$1[0]" -auto-orient -strip -colorspace sRGB \
    -resize "${MAXPIX}x1080>" -background "$BG" -gravity center -extent "${MAXPIX}x1080" \
    -define webp:method=6 -quality "$QUALITY" "$2"
}

convert_fit_fallback() {
  # sips + cwebp (sin letterbox)
  local tmpjpg="$3"
  sips -s format jpeg -s formatOptions "$QUALITY" -Z "$MAXPIX" "$1" --out "$tmpjpg" >/dev/null 2>&1
  cwebp -quiet -q "$QUALITY" "$tmpjpg" -o "$2" >/dev/null 2>&1
  rm -f "$tmpjpg"
}

process_file() {
  local f="$1"
  local base="$(basename "$f")"
  local name="${base%.*}"
  local slug="$(slugify "$name")"
  local out="$DIR_STILLS/$slug.webp"
  local tmpout="$TMP/${slug}.webp"

  # Convertir
  if command -v magick >/dev/null 2>&1; then
    if [ "$MODE" = "letterbox1080" ]; then
      if convert_letterbox_magick "$f" "$tmpout"; then :
      else echo "✖ fallo (letterbox): $f" >>"$ERR"; return
      fi
    else
      if convert_fit_magick "$f" "$tmpout"; then :
      else echo "✖ fallo (fit): $f" >>"$ERR"; return
      fi
    fi
    mv -f "$tmpout" "$out"
  else
    if command -v sips >/dev/null 2>&1 && command -v cwebp >/dev/null 2>&1; then
      convert_fit_fallback "$f" "$out" "$TMP/${slug}.jpg" || { echo "✖ fallo (sips+cwebp): $f" >>"$ERR"; return; }
    else
      echo "✖ falta ImageMagick o sips+cwebp: $f" >>"$ERR"; return
    fi
  fi

  # Eliminar original si no es el mismo .webp
  if [ "$f" != "$out" ]; then rm -f -- "$f"; fi
  echo "✔ $base → $(basename "$out")"
}

export -f process_file slugify convert_fit_magick convert_letterbox_magick convert_fit_fallback
export DIR_STILLS TMP ERR MODE QUALITY MAXPIX BG

find "$DIR_STILLS" -maxdepth 1 -type f ! -name '.*' \
  \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.tif' -o -iname '*.tiff' -o -iname '*.heic' -o -iname '*.webp' \) \
  -print0 | while IFS= read -r -d '' f; do
    process_file "$f"
  done

# Regenerar gallery.json
node - <<'NODE'
const fs = require('fs'), path = require('path');
const base = path.join('public','assets','galeria_web');
function list(dir){
  try {
    return fs.readdirSync(dir)
      .filter(f => /\.webp$/i.test(f))
      .sort((a,b)=>a.localeCompare(b,'es',{numeric:true}))
      .map(f => `/assets/galeria_web/${path.basename(dir)}/${f}`);
  } catch { return []; }
}
const json = {
  stills: list(path.join(base,'stills')),
  backstage: list(path.join(base,'backstage')),
};
fs.mkdirSync(path.join('app','data'), { recursive: true });
fs.writeFileSync(path.join('app','data','gallery.json'), JSON.stringify(json,null,2));
console.log('gallery.json actualizado', {stills: json.stills.length, backstage: json.backstage.length});
NODE

echo "Hecho. Si hubo errores, revisa: $ERR"
