#!/usr/bin/env bash
set -euo pipefail

echo "== Auditoría SIERRA =="
echo
echo "[Node]"
node -v || true
echo

echo "[Next/TS]"
jq -r '.dependencies.next // empty' package.json 2>/dev/null || true
jq -r '.devDependencies.typescript // empty' package.json 2>/dev/null || true
echo

echo "[Archivos clave]"
for f in app/layout.tsx app/api/chat/route.ts app/components/chat-bot.tsx lib/sierra-kb-adapter.ts public/kb/kb.json; do
  if [ -e "$f" ]; then echo "✓ $f"; else echo "✗ $f (falta)"; fi
done
echo

echo "[Imports de ChatBot en layout.tsx]"
grep -nE 'import\s+ChatBot\s+from' app/layout.tsx || echo "No se encontró import."
echo

echo "[Uso de <ChatBot />]"
grep -n '<ChatBot' app/layout.tsx || echo "No se encontró <ChatBot />."
echo

echo "[TSConfig alias @/*]"
if [ -f tsconfig.json ]; then
  grep -n '"paths"' tsconfig.json || echo "paths no definidos"
  grep -n '"@/*"' tsconfig.json || echo "alias @/* no definido"
else
  echo "✗ tsconfig.json (falta)"
fi
echo

echo "[Dependencias faltantes/comunes]"
node -e "const p=require('./package.json');const has=d=>Boolean((p.dependencies&&p.dependencies[d])||(p.devDependencies&&p.devDependencies[d])); ['@google/generative-ai','clsx','tailwind-merge'].forEach(d=>console.log((has(d)?'✓':'✗'),' ',d));" || true
echo

echo "[public/kb/kb.json tamaño y cantidad de items]"
if [ -f public/kb/kb.json ]; then
  ls -lh public/kb/kb.json
  node -e "const j=JSON.parse(require('fs').readFileSync('public/kb/kb.json','utf8')); console.log('items:', Array.isArray(j.items)?j.items.length:'?')"
else
  echo "No existe public/kb/kb.json"
fi
echo

echo "== Fin auditoría =="
