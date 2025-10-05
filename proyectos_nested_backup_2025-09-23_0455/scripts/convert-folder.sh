#!/usr/bin/env bash
set -euo pipefail

# === CONFIG ===
# Carpeta origen (con espacios). Podés sobreescribir pasando otra ruta como 1er argumento.
SRC_DEFAULT="/Volumes/JONES03/SIERRA - DOCUMENTAL/CRUDOS/EXPEDICION 1 BACK/SELECCION"
SRC="${1:-$SRC_DEFAULT}"

# Destino dentro del proyecto (backstage por lo que contás)
DEST="${2:-$(pwd)/public/assets/galeria_web/backstage}"

# Manifiesto que usa la web
MANIFEST="$(pwd)/app/data/gallery.json"

# Calidad / tamaño estándar web
MAXW=1600
QUALITY=82

# === PREP ===
mkdir -p "$DEST"
LOG_ERR="$(pwd)/conversion_errors.txt"
: > "$LOG_ERR"

slugify() {
  local s="$1"
  # quita acentos y normaliza; si iconv falla, sigue con el original
  if command -v iconv >/dev/null 2>&1; then
    s="$(printf "%s" "$s" | iconv -f UTF-8 -t ASCII//TRANSLIT 2>/dev/null || printf "%s" "$s")"
  fi
  s="$(printf "%s" "$s" | tr '[:upper:]' '[:lower:]')"
  s="$(printf "%s" "$s" | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g')"
  printf "%s" "$s"
}

unique_path() {
  local path="$1" base="${1%.*}" ext="${1##*.}" n=1
  while [[ -e "$path" ]]; do
    path="${base}-${n}.${ext}"; ((n++))
  done
  printf "%s" "$path"
}

convert_one() {
  local f="$1"
  local bn="$(basename "$f")"
  local stem="${bn%.*}"
  local slug; slug="$(slugify "$stem")"
  local out="$DEST/${slug}.webp"
  out="$(unique_path "$out")"

  # Verifica legibilidad
  if ! magick identify -quiet "$f" >/dev/null 2>&1; then
    echo "SKIP (no es imagen legible): $f" | tee -a "$LOG_ERR"
    return 0
  fi

  echo "→ $(basename "$f")  ⇒  $(basename "$out")"

  # Convertir a WEBP estándar
  magick "$f[0]" \
    -auto-orient -colorspace sRGB -strip \
    -resize "${MAXW}x${MAXW}>" -filter Lanczos \
    -unsharp 0x0.75+0.75+0.008 \
    -define webp:method=6 -define webp:thread-level=1 \
    -quality "$QUALITY" "$out" \
    || { echo "ERROR: $f" | tee -a "$LOG_ERR"; return 1; }
}

export -f convert_one slugify unique_path
export DEST LOG_ERR MAXW QUALITY

echo "Origen : $SRC"
echo "Destino: $DEST"
echo

# Extensiones a procesar (recursivo)
find "$SRC" -type f \( \
  -iname '*.tif' -o -iname '*.tiff' -o -iname '*.jpg' -o -iname '*.jpeg' -o \
  -iname '*.png' -o -iname '*.heic' -o -iname '*.webp' \
\) -print0 | xargs -0 -I{} bash -c 'convert_one "$@"' _ {}

echo
echo "Conversión finalizada."

# === Actualiza el manifiesto de la galería ===
# Escanea backstage y stills si existen y genera app/data/gallery.json
node - <<'NODE'
const fs = require('fs');
const path = require('path');

const base = path.join(process.cwd(), 'public', 'assets', 'galeria_web');
const folders = ['backstage','stills'].filter(d => fs.existsSync(path.join(base,d)));

function list(dir) {
  const abs = path.join(base, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs)
    .filter(f => /\.(webp|jpg|jpeg|png)$/i.test(f))
    .sort((a,b)=>a.localeCompare(b,'es',{numeric:true}))
    .map(f => `/assets/galeria_web/${dir}/${f}`);
}

const json = Object.fromEntries(folders.map(d => [d, list(d)]));
const out = path.join('app','data','gallery.json');

fs.mkdirSync(path.dirname(out), {recursive:true});
fs.writeFileSync(out, JSON.stringify(json, null, 2));
console.log(`Manifiesto actualizado: ${out}`);
NODE

if [[ -s "$LOG_ERR" ]]; then
  echo "Algunos archivos fallaron. Revisá: $LOG_ERR"
fi

echo "Listo."

