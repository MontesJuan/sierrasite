#!/usr/bin/env bash
set -euo pipefail

SRC="/Volumes/SIERRA 2/capturas"
DEST="public/assets/galeria_web/stills"
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
: > conversion_errors.txt
: > converted_list.txt

count=0
while IFS= read -r -d '' f; do
  # salta archivos de 0 bytes
  if [ ! -s "$f" ]; then
    echo "SKIP vacío: $f" | tee -a conversion_errors.txt
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
      -resize "${MAX}x${MAX}>" -define webp:method=6 -quality "$Q" \
      "$out" >/dev/null 2>&1
    rc=$?
    set -e
    if [ $rc -eq 0 ]; then ok=1; fi
  fi

  if [ $ok -eq 0 ] && $SIPS_OK; then
    tmp="/tmp/conv.$$.$RANDOM.jpg"
    set +e
    sips -s format jpeg -s formatOptions "$Q" -Z "$MAX" "$f" --out "$tmp" >/dev/null 2>&1
    rc1=$?
    if [ $rc1 -eq 0 ]; then
      cwebp -quiet -q "$Q" "$tmp" -o "$out" >/dev/null 2>&1
      rc2=$?
    else
      rc2=1
    fi
    rm -f "$tmp"
    set -e
    if [ $rc1 -eq 0 ] && [ $rc2 -eq 0 ]; then ok=1; fi
  fi

  if [ $ok -eq 1 ]; then
    echo "/assets/galeria_web/${dir:+$dir/}$safe.webp" >> converted_list.txt
    ((count++)) || true
  else
    echo "ERROR: $f" | tee -a conversion_errors.txt
  fi

done < <(find "$SRC" -type f \( -iname '*.tif' -o -iname '*.tiff' \) ! -size 0c -print0)

echo "✔ Convertidas $count imágenes a WEBP en: $DEST"

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

echo "Hecho. Revisa conversion_errors.txt si hubo fallos."
