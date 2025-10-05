#!/usr/bin/env bash
set -euo pipefail

SRC="/Volumes/SIERRA 2/CRUDOS IPHONE/IPHONE/BACK SELECCION"
DEST="public/assets/galeria_web/backstage"
MAX=1920
Q=82

cmd_exists(){ command -v "$1" >/dev/null 2>&1; }
IM=""
if cmd_exists magick; then IM="magick"
elif cmd_exists convert; then IM="convert"
fi
SIPS_OK=false
if cmd_exists sips && cmd_exists cwebp; then SIPS_OK=true; fi

slugify() {
  echo "$1" | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/[[:space:]]+/-/g' \
    | sed -E 's/[^a-z0-9._-]+/-/g' \
    | sed -E 's/-{2,}/-/g' | sed -E 's/^-|-$//g'
}

mkdir -p "$DEST"
: > conversion_errors_backstage.txt
: > converted_backstage.txt

count=0
while IFS= read -r -d '' f; do
  # salta archivos vacíos
  if [ ! -s "$f" ]; then
    echo "SKIP vacío: $f" | tee -a conversion_errors_backstage.txt
    continue
  fi

  rel="${f#"$SRC"/}"
  dir="$(dirname "$rel")"; [ "$dir" = "." ] && dir=""
  base="$(basename "${rel%.*}")"
  safe="$(slugify "$base")"
  out_dir="$DEST/$dir"
  mkdir -p "$out_dir"
  out="$out_dir/$safe.webp"

  echo "→ ${rel}  →  ${out#$DEST/}"

  ok=0

  if [ -n "$IM" ]; then
    set +e
    "$IM" "$f[0]" -auto-orient -strip -colorspace sRGB -depth 8 \
      -resize "${MAX}x${MAX}>" -define webp:method=6 -quality "$Q" "$out" >/dev/null 2>&1
    rc=$?
    set -e
    [ $rc -eq 0 ] && ok=1
  fi

  if [ $ok -eq 0 ] && $SIPS_OK; then
    tmp="/tmp/conv.$$.$RANDOM.jpg"
    set +e
    sips -s format jpeg -s formatOptions "$Q" -Z "$MAX" "$f" --out "$tmp" >/dev/null 2>&1
    rc1=$?
    [ $rc1 -eq 0 ] && cwebp -quiet -q "$Q" "$tmp" -o "$out" >/dev/null 2>&1
    rc2=$?
    rm -f "$tmp"
    set -e
    [ $rc1 -eq 0 ] && [ $rc2 -eq 0 ] && ok=1
  fi

  if [ $ok -eq 1 ]; then
    echo "/assets/galeria_web/${dir:+$dir/}$safe.webp" >> converted_backstage.txt
    ((count++)) || true
  else
    echo "ERROR: $f" | tee -a conversion_errors_backstage.txt
  fi

done < <(find "$SRC" -type f \( -iname '*.tif' -o -iname '*.tiff' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.heic' -o -iname '*.psd' \) ! -size 0c -print0)

echo "✔ Convertidas $count imágenes a WEBP en: $DEST"

# Actualiza manifest de la galería (backstage + stills)
node - <<'NODE'
const fs = require('fs'), path = require('path');
const base = 'public/assets/galeria_web';
function list(dir){
  try{
    return fs.readdirSync(dir)
      .filter(f => /\.(webp|jpg|jpeg|png)$/i.test(f))
      .sort((a,b)=>a.localeCompare(b,'es',{numeric:true}))
      .map(f => `/assets/galeria_web/${path.basename(dir)}/${f}`);
  } catch { return []; }
}
const json = {
  backstage: list(path.join(base,'backstage')),
  stills:    list(path.join(base,'stills')),
};
fs.mkdirSync('app/data', { recursive: true });
fs.writeFileSync('app/data/gallery.json', JSON.stringify(json, null, 2));
console.log('Manifest actualizado: app/data/gallery.json (',
  (json.backstage.length + json.stills.length), 'ítems )');
NODE

echo "Hecho. Revisá conversion_errors_backstage.txt si hubo fallos."
