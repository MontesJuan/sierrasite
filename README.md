# SIERRA — Sitio web

Este proyecto es un sitio web estático para el documental **Sierra**, preparado con **Next.js (App Router)**.

## Estructura
- `/app` páginas y componentes
- `/public` assets (favicon, og.jpg)
- `/app/data/siteData.json` contenido editable

## Ejecutar localmente
1. Instalar Node.js 18+
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Correr en dev:
   ```bash
   npm run dev
   ```
4. Abrir `http://localhost:3000`

## Deploy en Vercel (recomendado)
1. Crear un repo en GitHub y subir este proyecto.
2. En **Vercel**, importar el repo y desplegar (framework: Next.js).

**CLI** (en la carpeta del proyecto, no en tu home):
```bash
npm i -g vercel
vercel
```
Cuando la CLI pregunte *"You are deploying your home directory?"*, responde **No** y asegurate de estar dentro de la carpeta del proyecto (por ejemplo `~/proyectos/sierra-site`).

## Personalizar
- Editar `app/data/siteData.json` para actualizar textos (sinopsis, distribución, etc.).
- Reemplazar `/public/og.jpg` con un fotograma o el póster (1200×630).

## Dominios
Puedes apuntar un dominio como `sierradoc.com` o `sierra.film` desde tu proveedor y conectarlo en Vercel (Dashboard → Settings → Domains).
