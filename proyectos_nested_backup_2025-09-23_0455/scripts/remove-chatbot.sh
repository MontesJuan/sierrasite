#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="_backup_chatbot_$STAMP"
mkdir -p "$BACKUP"

backup() {
  local f="$1"
  [ -e "$f" ] || return 0
  mkdir -p "$BACKUP/$(dirname "$f")"
  cp -a "$f" "$BACKUP/$f"
  echo "Backup: $f  ->  $BACKUP/$f"
}

remove() {
  local f="$1"
  [ -e "$f" ] && { rm -rf "$f"; echo "Removed: $f"; }
}

echo "==> Desconectando chatbot…"

# 1) Quitar <ChatBot /> del layout
LAYOUT="app/layout.tsx"
if [ -f "$LAYOUT" ]; then
  backup "$LAYOUT"
  # eliminar import del ChatBot (soporta rutas @/ ./ ../ y nombres chat-bot / ChatBot)
  sed -i.bak -E '/import\s+ChatBot\s+from\s+[\"\'].*components\/(chat-?bot|ChatBot)[\"\'];?/d' "$LAYOUT" || true
  sed -i.bak -E '/from\s+[\"\'].*components\/(chat-?bot|ChatBot)[\"\']\s*;?/d' "$LAYOUT" || true
  # eliminar la etiqueta JSX <ChatBot ... />
  sed -i.bak -E 's/<ChatBot[^>]*\/>\s*//g' "$LAYOUT" || true
  rm -f "$LAYOUT.bak"
  echo "Limpieza en $LAYOUT lista."
fi

# 2) Desactivar/eliminar la API del chat
if [ -d "app/api/chat" ]; then
  backup "app/api/chat"
  rm -rf "app/api/chat"
  echo "Ruta API app/api/chat eliminada."
fi

# 3) Eliminar archivos del chatbot (varias ubicaciones posibles)
CANDIDATES=(
  "components/chat-bot.tsx"
  "app/components/chat-bot.tsx"
  "components/ChatBot.tsx"
  "app/components/ChatBot.tsx"
  "lib/sierra-kb-adapter.ts"
  "lib/knowledge-base.ts"
  "public/kb/kb.json"
  "public/kb"
)
for f in "${CANDIDATES[@]}"; do
  backup "$f"
  remove "$f"
done

# 4) Limpiar flag opcional en .env.local
if [ -f ".env.local" ]; then
  backup ".env.local"
  sed -i.bak -E '/^NEXT_PUBLIC_CHATBOT_ENABLED=/d' .env.local || true
  rm -f .env.local.bak
fi

# 5) Desinstalar dependencias del chat si están
echo "Eliminando dependencias opcionales (si existen)…"
npm remove @google/generative-ai @ai-sdk/google ai >/dev/null 2>&1 || true
# borrar script de kb si se añadió alguna vez
npm pkg delete scripts.kb:build >/dev/null 2>&1 || true

echo "==> Listo. Backup en: $BACKUP"
echo "Sugerido: npm run build  (y luego redeploy)."
