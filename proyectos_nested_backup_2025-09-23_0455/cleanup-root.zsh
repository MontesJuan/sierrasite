#!/usr/bin/env zsh
set -euo pipefail
setopt GLOB_DOTS NULL_GLOB   # incluir ocultos y no fallar sin coincidencias

typeset -a KEEP
KEEP=(
  app components data public kb scripts
  node_modules .next .git .gitignore .vercel
  .env.local next.config.mjs next-env.d.ts
  package.json package-lock.json tsconfig.json
  README.md vercel.json cleanup-root.zsh
)

mkdir -p _archive

is_keep() {
  local x="$1"
  for k in $KEEP; do
    [[ "$x" == "$k" ]] && return 0
  done
  return 1
}

for f in * .*; do
  [[ "$f" == "." || "$f" == ".." ]] && continue
  if ! is_keep "$f"; then
    echo "Moviendo: $f -> _archive/$f"
    mv -- "$f" "_archive/$f"
  fi
done
