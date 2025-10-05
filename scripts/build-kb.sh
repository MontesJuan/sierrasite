#!/usr/bin/env bash
set -euo pipefail

KB_DIR="kb"
OUT_DIR="public/kb"
OUT_FILE="${OUT_DIR}/kb.json"

CHUNK_SIZE="${KB_CHUNK_SIZE:-900}"
CHUNK_OVERLAP="${KB_CHUNK_OVERLAP:-150}"
SLOW_MS="${KB_SLOWDOWN_MS:-0}"

# Cargar GOOGLE_API_KEY desde .env.local si no está exportada
if [[ -z "${GOOGLE_API_KEY:-}" && -f ".env.local" ]]; then
  # shellcheck disable=SC2046
  export $(grep -v '^\s*#' .env.local | grep -E '^\s*[A-Za-z0-9_]+\s*=' | xargs -I{} echo {})
fi

if [[ -z "${GOOGLE_API_KEY:-}" ]]; then
  echo "Falta GOOGLE_API_KEY en el entorno (.env.local o export)."; exit 1
fi

# Dependencia jq
if ! command -v jq >/dev/null 2>&1; then
  echo "Falta 'jq' (instala con: brew install jq)"; exit 1
fi

if [[ ! -d "$KB_DIR" ]]; then
  echo "No existe la carpeta ${KB_DIR}/"; exit 1
fi

EMBED_URL="https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GOOGLE_API_KEY}"

# Pausa en milisegundos (portable)
sleep_ms () {
  local ms="${1:-0}"
  if [[ "$ms" -gt 0 ]]; then
    /usr/bin/env python3 - "$ms" <<'PY'
import sys, time
time.sleep(int(sys.argv[1]) / 1000.0)
PY
  fi
}

# Chunker en Python (maneja UTF-8 correctamente)
py_chunker() {
  /usr/bin/env python3 - "$1" "$CHUNK_SIZE" "$CHUNK_OVERLAP" <<'PY'
import sys
path, size, overlap = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
with open(path, 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read().replace('\r', '').strip()
i = 0
L = len(text)
while i < L:
    end = min(i + size, L)
    chunk = text[i:end]
    sys.stdout.write(chunk)
    sys.stdout.write('\0')
    i = end - overlap
    if i < 0: i = 0
    if i >= L: break
PY
}

tmp_items="$(mktemp)"
trap 'rm -f "$tmp_items"' EXIT

count=0

# Recorre archivos .md/.txt en kb/
while IFS= read -r -d '' file; do
  idx=0
  while IFS= read -r -d '' chunk; do
    idx=$((idx+1)); count=$((count+1))

    payload=$(jq -Rs --arg t "$chunk" '{"content":{"parts":[{"text":$t}]}}' <<<"$chunk")
    resp=$(curl -sS -X POST "$EMBED_URL" -H "Content-Type: application/json" --data-binary "$payload")
    vec=$(jq -e '.embedding.values' <<<"$resp") || { echo "Error embedding en $(basename "$file")#$idx: $resp"; exit 1; }

    item=$(jq -n \
      --arg id "$(basename "$file")#$idx" \
      --arg src "$(basename "$file")" \
      --arg ch "$chunk" \
      --argjson emb "$vec" \
      '{id:$id, source:$src, chunk:$ch, embedding:$emb}')

    echo "$item" >> "$tmp_items"
    printf "\rChunks: %d  (%s)" "$count" "$(basename "$file")"

    sleep_ms "$SLOW_MS"
  done < <(py_chunker "$file")
done < <(find "$KB_DIR" -type f \( -iname '*.md' -o -iname '*.txt' \) -print0 | sort -z)

echo
mkdir -p "$OUT_DIR"
{
  echo '{"items":['
  paste -sd, "$tmp_items"
  echo ']}'
} > "$OUT_FILE"

echo "OK → $OUT_FILE (chunks: $count)"