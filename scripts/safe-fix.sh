#!/usr/bin/env bash
set -euo pipefail

# ======= Config general =======
PROJECT_ROOT="."          # raíz del repo actual
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="_backup_fix_${STAMP}"
DO_DRYRUN=1               # por defecto NO escribe
DO_APPLY=0
DO_REMOVE_EN=0
DO_PURGE_GALLERY=0
DO_SCAFFOLD_UI=0

# ======= Parseo de flags =======
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)        DO_DRYRUN=1; DO_APPLY=0; shift ;;
    --apply)          DO_DRYRUN=0; DO_APPLY=1; shift ;;
    --remove-en)      DO_REMOVE_EN=1; shift ;;
    --purge-gallery)  DO_PURGE_GALLERY=1; shift ;;
    --scaffold-ui)    DO_SCAFFOLD_UI=1; shift ;;
    -h|--help)
      cat <<USAGE
Uso: scripts/safe-fix.sh [opciones]

  --dry-run           (default) solo muestra acciones
  --apply             aplica cambios
  --remove-en         elimina /app/en/layout.tsx, NavBarEn.tsx, FooterEn.tsx
  --purge-gallery     elimina public/assets/galeria y public/assets/gallery
  --scaffold-ui       crea/sobrescribe NavBar, Footer, layout, home, prensa, CSS, data JSON, next.config

Ejemplos:
  scripts/safe-fix.sh --dry-run
  scripts/safe-fix.sh --apply --remove-en --purge-gallery --scaffold-ui
USAGE
      exit 0;;
    *) echo "Flag desconocida: $1"; exit 1;;
  esac
done

# ======= Helpers =======
log()  { echo -e "$*"; }
act()  { if [[ $DO_DRYRUN -eq 1 ]]; then echo "DRY: $*"; else echo "$*"; fi; }
ensure_backup_dir() { [[ -d "$BACKUP_DIR" ]] || mkdir -p "$BACKUP_DIR"; }
relpath() { python3 - "$PROJECT_ROOT" "$1" <<'PY' 2>/dev/null || echo "$1"
import os,sys
root=os.path.abspath(sys.argv[1]); p=os.path.abspath(sys.argv[2])
print(os.path.relpath(p, root))
PY
}

backup_path() {
  local p="$1"
  [[ -e "$p" ]] || return 0
  ensure_backup_dir
  local rp; rp="$(relpath "$p")"
  local dest="$BACKUP_DIR/$rp"
  [[ $DO_DRYRUN -eq 1 ]] && { echo "DRY: backup $rp -> $dest"; return 0; }
  mkdir -p "$(dirname "$dest")"
  cp -a "$p" "$dest"
  echo "Backup: $rp -> $dest"
}

remove_path() {
  local p="$1"
  [[ -e "$p" ]] || { act "skip rm (no existe): $p"; return 0; }
  backup_path "$p"
  if [[ $DO_APPLY -eq 1 ]]; then
    rm -rf "$p"
    echo "Removed: $(relpath "$p")"
  else
    echo "DRY: rm -rf $(relpath "$p")"
  fi
}

write_file() {
  local dst="$1"; shift
  local dir; dir="$(dirname "$dst")"
  [[ $DO_DRYRUN -eq 1 ]] && { echo "DRY: write $(relpath "$dst")"; return 0; }
  mkdir -p "$dir"
  backup_path "$dst"
  # shellcheck disable=SC2129
  cat > "$dst" <<'EOF'
'"$@"'
EOF
  echo "Wrote: $(relpath "$dst")"
}

# sed in-place compatible macOS/Linux
sed_inplace() {
  local expr="$1"; local file="$2"
  if [[ $DO_DRYRUN -eq 1 ]]; then
    echo "DRY: sed -i '$expr' $file"
    return 0
  fi
  if sed --version >/dev/null 2>&1; then
    sed -i "$expr" "$file"
  else
    sed -i '' "$expr" "$file"
  fi
}

json_write() {
  local dst="$1"; shift
  write_file "$dst" "$@"
}

# ======= Inicio =======
cd "$PROJECT_ROOT"
log "== Auditoría y fixes seguros en: $(pwd) =="
[[ $DO_DRYRUN -eq 1 ]] && log "(Modo DRY-RUN, no se escribe nada)"
[[ $DO_APPLY  -eq 1 ]] && log "(APLICANDO cambios)"

# 1) Limpieza básica
log "\n[1] Limpieza básica"
# *.bak
if [[ $DO_APPLY -eq 1 ]]; then
  find . -type f -name "*.bak" -print -delete | sed 's/^/Deleted: /' || true
else
  find . -type f -name "*.bak" -print | sed 's/^/DRY delete: /' || true
fi

# _archive opcional
if [[ -d "./_archive" ]]; then
  remove_path "./_archive"
else
  act "skip rm (no existe): ./_archive"
fi

# apigoogle.rtf sensible
[[ -f "./app/apigoogle.rtf" ]] && remove_path "./app/apigoogle.rtf" || act "skip rm: app/apigoogle.rtf no existe"

# 2) Scripts de conversión: excluir ._* (recurso macOS)
log "\n[2] Ajuste de scripts para excluir ._*"
for s in "./scripts/convert-folder.sh" "./scripts/stills_uniform.sh"; do
  if [[ -f "$s" ]]; then
    backup_path "$s"
    sed_inplace 's|find "\$INPUT_DIR" -type f -print0|find "$INPUT_DIR" -type f ! -name "._*" -print0|' "$s"
    echo "Patched: $(relpath "$s")"
  else
    act "skip patch: $s no existe"
  fi
done

# 3) Eliminaciones opcionales
log "\n[3] Eliminaciones opcionales"
if [[ $DO_PURGE_GALLERY -eq 1 ]]; then
  for d in "./public/assets/galeria" "./public/assets/gallery"; do
    if [[ -d "$d" ]]; then
      remove_path "$d"
    else
      act "skip rm (no existe): $d"
    fi
  done
else
  act "skip purge-gallery (no solicitado)"
fi

if [[ $DO_REMOVE_EN -eq 1 ]]; then
  for f in "./app/components/NavBarEn.tsx" "./app/components/FooterEn.tsx" "./app/en/layout.tsx"; do
    if [[ -e "$f" ]]; then
      remove_path "$f"
    else
      act "skip rm (no existe): $f"
    fi
  done
else
  act "skip remove-en (no solicitado)"
fi

# 4) Datos y UI opcional (scaffold)
log "\n[4] Scaffold de datos/UI (opcional)"
if [[ $DO_SCAFFOLD_UI -eq 1 ]]; then
  mkdir -p "./app/data" "./app/components" "./app/prensa" "./public/kb"

  # navigation.json
  json_write "./app/data/navigation.json" '{
  "es": [
    { "href": "/sinopsis", "label": "Sinopsis" },
    { "href": "/trailer", "label": "Tráiler" },
    { "href": "/impacto", "label": "Impacto" },
    { "href": "/equipo", "label": "Equipo" },
    { "href": "/financiacion", "label": "Financiación" },
    { "href": "/distribucion", "label": "Distribución" },
    { "href": "/contacto", "label": "Contacto" },
    { "href": "/prensa", "label": "Prensa" }
  ],
  "en": [
    { "href": "/en/synopsis", "label": "Synopsis" },
    { "href": "/en/trailer", "label": "Trailer" },
    { "href": "/en/social-impact", "label": "Social Impact" },
    { "href": "/en/team", "label": "Team" },
    { "href": "/en/collaborate", "label": "Collaborate" },
    { "href": "/en/distribution", "label": "Distribution" },
    { "href": "/en/contact", "label": "Contact" },
    { "href": "/en/press", "label": "Press" }
  ]
}'

  # siteData.json
  json_write "./app/data/siteData.json" '{
  "es": {
    "tagline": "Un viaje humano por la cordillera sanjuanina",
    "logline": "Dos maestras recorren la Sierra de Pie de Palo para sostener la educación de niños en parajes remotos.",
    "impact": ["Sensibilizar sobre la educación rural","Visibilizar identidades serranas","Promover circuitos culturales federales"],
    "distribution": ["Mar del Plata 2025 (inscripción)","Gaumont & Espacio INCAA","Funciones educativas 2026"],
    "homeButtonTrailerText": "Ver tráiler",
    "homeButtonTrailerLink": "/trailer",
    "homeButtonSponsorText": "Patrocinar",
    "homeButtonSponsorLink": "/financiacion",
    "footerCopyrightPrefix": "© {year} Sierra — Un documental de",
    "documentaryTitle": "Sierra",
    "directorName": "Juan Francisco Montes",
    "contactEmail": "mulanimavisual@gmail.com",
    "contactPhone": "+54 2645 101344",
    "contactInstagram": "@sierra.docu",
    "metadataTitle": "SIERRA — Documental",
    "metadataDescription": "Sitio oficial del largometraje SIERRA"
  },
  "en": {
    "tagline": "A human journey through the San Juan range",
    "logline": "Two teachers traverse the Sierra de Pie de Palo to support education in remote settlements.",
    "impact": ["Raise awareness about rural education","Give visibility to mountain identities","Promote federal cultural circuits"],
    "distribution": ["Mar del Plata 2025 (submitted)","Gaumont & Espacio INCAA","Educational screenings 2026"],
    "homeButtonTrailerText": "Watch trailer",
    "homeButtonTrailerLink": "/en/trailer",
    "homeButtonSponsorText": "Sponsor",
    "homeButtonSponsorLink": "/en/collaborate",
    "documentaryTitle": "Sierra",
    "directorName": "Juan Francisco Montes",
    "contactEmail": "mulanimavisual@gmail.com",
    "contactPhone": "+54 2645 101344",
    "contactInstagram": "@sierra.docu",
    "metadataTitle": "SIERRA — Documentary",
    "metadataDescription": "Official site of the feature documentary SIERRA"
  }
}'

  # pressStills.json
  json_write "./app/data/pressStills.json" '[
  "/assets/galeria_web/stills/example-01.webp",
  "/assets/galeria_web/stills/example-02.webp"
]'

  # NavBar.tsx
  write_file "./app/components/NavBar.tsx" $'\'use client\'\nimport Link from "next/link";\nimport Image from "next/image";\nimport { usePathname } from "next/navigation";\nimport theme from "../data/theme.json";\nimport navigationData from "../data/navigation.json";\n\nexport default function NavBar(){\n  const pathname = usePathname();\n  const locale = pathname.startsWith("/en") ? "en" : "es";\n  const links = (navigationData as any)[locale] || [];\n  return (\n    <nav className="main-nav">\n      <Link href={locale === "en" ? "/en" : "/"} className="nav-logo-link">\n        <Image src={(theme as any).brand.logoPath} width={120} height={38} alt="Sierra" />\n      </Link>\n      {links.map((l:any)=> (\n        <Link key={l.href} href={l.href} className={pathname===l.href?\"active\":\"\"}>{l.label}</Link>\n      ))}\n      <div className=\"nav-button-wrapper\"/>\n      <Link href={locale === \"en\" ? \"/\" : \"/en\"} className=\"locale-switcher\">{locale === \"en\" ? \"ES\" : \"EN\"}</Link>\n    </nav>\n  );\n}\n'

  # Footer.tsx
  write_file "./app/components/Footer.tsx" $'\'use client\'\nimport Image from "next/image";\nimport theme from "../data/theme.json";\nimport siteData from "../data/siteData.json";\nimport { usePathname } from "next/navigation";\n\nexport default function Footer(){\n  const pathname = usePathname();\n  const locale = pathname.startsWith("/en") ? "en" : "es";\n  const year = new Date().getFullYear();\n  const copy = (siteData as any)[locale].documentaryTitle + \" — \" + (siteData as any)[locale].directorName;\n  return (\n    <footer>\n      <div className=\"container\">\n        <div className=\"footer-flex-container\">\n          <div className=\"footer-flex-item\">\n            <div className=\"heading-bold\">SIERRA</div>\n            <p className=\"small\">Largometraje documental (2025), 75 min. San Juan, Argentina.</p>\n          </div>\n          <div className=\"footer-flex-item\">\n            <div className=\"heading-bold\">Contacto</div>\n            <div className=\"small\">\n              <div>@sierra.docu</div>\n              <div><a href=\"mailto:mulanimavisual@gmail.com\">mulanimavisual@gmail.com</a></div>\n              <div>+54 2645 101344</div>\n            </div>\n          </div>\n          <div className=\"footer-full-width-divider\" />\n          <div className=\"card brand footer-flex-item\" style={{textAlign:\"center\"}}>\n            <div className=\"kicker\">Produce</div>\n            <Image src={(theme as any).brand.producerLogo} width={160} height={64} alt=\"Mulánima\" />\n          </div>\n        </div>\n        <div className=\"small footer-copyright-text\">© {year} {copy}</div>\n      </div>\n    </footer>\n  );\n}\n'

  # layout.tsx
  write_file "./app/layout.tsx" $'import "./globals.css";\nimport NavBar from "./components/NavBar";\nimport Footer from "./components/Footer";\nimport type { Metadata } from "next";\n\nexport const metadata: Metadata = {\n  title: "SIERRA — Documental",\n  description: "Sitio oficial del largometraje SIERRA"\n};\n\nexport default function RootLayout({ children }: { children: React.ReactNode }){\n  return (\n    <html lang="es">\n      <body>\n        <NavBar />\n        {children}\n        <Footer />\n      </body>\n    </html>\n  );\n}\n'

  # Home page (simple)
  write_file "./app/page.tsx" $'export default function Page(){\n  return (\n    <main className=\"section\">\n      <div className=\"container\">\n        <h1>SIERRA</h1>\n        <p>Bienvenidos al sitio oficial.</p>\n      </div>\n    </main>\n  );\n}\n'

  # Prensa page (simple)
  write_file "./app/prensa/page.tsx" $'\'use client\'\nimport Image from \"next/image\";\nimport pressStills from \"../data/pressStills.json\";\n\nexport default function Page(){\n  return (\n    <main className=\"section\">\n      <div className=\"container grid press-stills-grid\">\n        {pressStills.map((src:string,i:number)=> (\n          <div key={i} className=\"card press-still-card\">\n            <Image src={src} width={1200} height={675} className=\"press-still-image\" alt={`Still ${i+1}`} />\n            <div className=\"press-download-button\"><a className=\"button\" href={src} download>Descargar</a></div>\n          </div>\n        ))}\n      </div>\n    </main>\n  );\n}\n'

  # globals.css minimal
  write_file "./app/globals.css" $'@import url(\"https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap\");\n:root{--bg:#000;--fg:#f2f2f2;--muted:#b6b6b6;--paper:#0b0b0b;--border:#232323}\n*{box-sizing:border-box}\nhtml,body{margin:0;padding:0;background:var(--bg);color:var(--fg);font-family:Inter,system-ui}\n.container{max-width:1080px;margin:0 auto;padding:28px}\n.section{padding:36px 0}\n.main-nav{position:sticky;top:0;z-index:10;display:flex;gap:18px;align-items:center;padding:12px 28px;border-bottom:1px solid var(--border);background:rgba(0,0,0,.7);backdrop-filter:saturate(150%) blur(6px)}\n.main-nav a{color:#fff;opacity:.85;text-decoration:none}\n.main-nav a.active{opacity:1;text-decoration:underline}\n.nav-logo-link{display:inline-flex;align-items:center;gap:12px}\n.locale-switcher{margin-left:auto;padding:6px 10px;border:1px solid #bbb;border-radius:4px;font-size:13px;color:#bbb}\nfooter{border-top:1px solid var(--border);background:var(--paper);padding:24px 0}\n.footer-flex-container{display:flex;gap:24px;flex-wrap:wrap}\n.footer-flex-item{flex:1;min-width:260px}\n.footer-full-width-divider{flex-basis:100%;height:1px;background:var(--border);margin:16px 0}\n.card{padding:16px;border:1px solid var(--border);border-radius:10px;background:#0e0e0e}\n.button{display:inline-block;padding:10px 14px;border:1px solid #fff;border-radius:999px}\n.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px}\n.press-stills-grid{grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}\n.press-still-image{width:100%;height:auto;object-fit:cover;border-radius:8px}\n'

  # next.config.mjs
  write_file "./next.config.mjs" $'/** @type {import("next").NextConfig} */\nconst nextConfig = {\n  images: {\n    deviceSizes: [320,640,768,1024,1280,1536,1920,2560],\n    imageSizes:  [320,480,640,800,1024,1280],\n    formats: [\"image/webp\"],\n    dangerouslyAllowSVG: true\n  }\n};\nexport default nextConfig;\n'
else
  act "skip scaffold-ui (no solicitado)"
fi

# 5) Reporte final
log "\n== Fin == "
log "Backup: $BACKUP_DIR (se crea solo si algo fue respaldado)"
if [[ $DO_APPLY -eq 1 ]]; then
  log "Sugerido: npm run build"
else
  log "Esto fue un DRY-RUN. Para aplicar: scripts/safe-fix.sh --apply [flags]"
fi