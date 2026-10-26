---
name: SIERRA
description: Un afiche cinematográfico que se abre en un cuaderno de campo.
colors:
  paper: "#eee6d7"
  ink: "#332f25"
  olive: "#515741"
  clay: "#a86047"
  line: "#bfb5a2"
  dark-land: "#292e24"
typography:
  display:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "clamp(3rem, 7vw, 6rem)"
    fontWeight: 400
    lineHeight: 1.02
  headline:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "clamp(2.8rem, 5.1vw, 5.5rem)"
    fontWeight: 400
    lineHeight: 1.02
  title:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "2.5rem"
    fontWeight: 400
    lineHeight: 1.02
  body:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "15px"
    lineHeight: 1.75
  control:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "13px"
rounded:
  square: "0"
components:
  button:
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    padding: "13px 24px"
    rounded: "{rounded.square}"
  button-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  assistant-entry:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    padding: "9px 14px"
    rounded: "{rounded.square}"
---

# Design System: SIERRA

## Overview

**Creative North Star: "Un afiche cinematográfico que se abre en un cuaderno de campo"**

Cine clásico, tierra pastel, calidez orgánica e identidad serrana. La dirección visual acordada por Juan sigue siendo la autoridad: portada blend apaisada, título y dibujos originales, fotografía documental y amplios silencios. Esta actualización reconcilia la dirección anterior con el código construido; no propone otra identidad ni requiere un torneo de conceptos.

El interior combina papel cálido, columnas asimétricas y una voz editorial serif. La imagen recibe espacio propio; los controles tienen una función concreta y la conversación ocupa un acceso reservado en la cabecera.

**Key Characteristics:**
- Afiche 16:9 y marcas originales recuperadas.
- Papel tierra, tinta cálida, oliva y detalles de arcilla.
- Cormorant Garamond editorial y Manrope funcional.
- Fotografías completas por defecto y dibujos originales integrados al papel.
- Composición abierta, filetes finos y controles rectangulares.

Registro de implementación: `app/site.tsx`, `app/globals.css` y `app/components/`, con fuentes cargadas en `app/layout.tsx`. Estado: preview pendiente de revisión, sin certificación ni publicación de producción. Según la verificación de esta sesión, el build pasó y se probaron menú, galería, chat y carga del tráiler. El revisor dio por resueltos los cuatro hallazgos de su lista y disposición «ship» sólo para ese alcance. El primer detector automático no llegó a ejecutarse por falta de Puppeteer: no constituye un pase. Capturas de referencia: `/Volumes/AZORES/SIERRA/Control/web-ig-2026-10-26/desktop-fixed.jpg` y `/Volumes/AZORES/SIERRA/Control/web-ig-2026-10-26/mobile-fixed.jpg`.

## Colors

La paleta nace del papel, la tinta, la tierra y el monte; los valores normativos están en el frontmatter.

### Primary
- **Oliva serrano** (`olive`): énfasis editorial en cursiva, respuestas del usuario y envío del asistente.
- **Arcilla** (`clay`): foco de teclado y filetes de enlaces de texto.

### Neutral
- **Papel tierra** (`paper`): lienzo, cabecera, márgenes laterales del afiche y diálogos.
- **Tinta cálida** (`ink`): lectura, botones delineados y sus fondos al pasar el puntero.
- **Filete de papel** (`line`): separaciones de créditos, pies de foto, conversación y navegación.
- **Monte oscuro** (`dark-land`): banda territorial y pie de página.

**The Paper Rule.** El papel es el fondo continuo del interior; las fotografías y los dibujos aportan la textura visual, sin añadir texturas generadas.

## Typography

**Display Font:** Cormorant Garamond, con Georgia y serif de respaldo.
**Body Font:** Manrope, con Arial y sans-serif de respaldo.

La serif ligera sostiene titulares, nombres, citas y contacto. Manrope mantiene navegación y lectura funcional. La escala no tiene una razón matemática uniforme: los titulares son fluidos y los textos funcionales se ajustan por contexto.

### Hierarchy
- **Display:** título textual de páginas interiores. En la portada, SIERRA es el logo original dentro del h1; no se recompone con una fuente.
- **Headline:** titulares editoriales amplios, con cursivas oliva en palabras seleccionadas. En móvil el h2 base pasa a 3rem, con variaciones locales.
- **Title:** nombres de protagonistas; en móvil pasan a 2.3rem.
- **Body:** lectura general con interlínea abierta; en móvil pasa a 14px. La sinopsis limita el ancho a 450px.
- **Control:** botones principales; navegación y metadatos usan tamaños menores según su función. No se añaden filas de antetítulos para decorar secciones.

**The Original Title Rule.** El título SIERRA se reproduce desde su archivo original; Cormorant acompaña la película sin sustituir su marca.

## Layout

El contenedor editorial llega a 1680px y usa márgenes internos de 7%, con secciones de 88px verticales. A 900px se reduce a 65px y 6%; a 600px, a 50px y 6%. La introducción usa dos columnas 1.3:1 con un vacío de 9%; la galería usa dos columnas y los retratos tres, escalonados 0/70/140px. En móvil se apilan y desaparece el escalonamiento.

La cabecera mide 80px; a 600px pasa a 68px. Navegación, acceso al asistente y menú tienen espacio en el flujo. El afiche de escritorio mantiene 16:9 y limita su ancho con `min(100%, calc((100svh - 80px) * 16 / 9))`: en pantallas bajas se centra entre márgenes de papel para mantener el CTA dentro del primer viewport. Este ajuste pertenece a la portada, no a todas las imágenes del sitio.

En móvil el arte conserva 16:9; debajo se reserva una extensión de 128px para frase y CTA. No se transforma el afiche en una imagen vertical. Las fotos de galería, retratos y figura ancha usan ancho disponible y altura automática. La banda territorial actual usa `object-fit: cover` en escritorio y `contain` al apilarse en móvil; esa excepción no autoriza recortes nuevos.

**The Complete Frame Rule.** La fotografía documental conserva su encuadre por defecto. Todo recorte nuevo requiere una decisión editorial cuidadosa, no una cuadrícula uniforme.

## Elevation & Depth

Predomina la superficie plana: papel, filetes y alternancia con monte oscuro. El afiche tiene un velo gradual para legibilidad de sus controles. El asistente modal conserva una sombra ambiental (`0 16px 60px #0003`) y un fondo traslúcido; la galería ampliada oscurece el entorno. No hay sombra en el acceso del asistente ni elevación de tarjetas editoriales.

Las transiciones de los botones duran 0.2s y afectan fondo y color. La preferencia de movimiento reducido desactiva transiciones, animaciones y desplazamiento suave.

## Shapes

Predominan esquinas rectas y bordes de 1px. Las imágenes no se encierran en tarjetas redondeadas. El círculo de reproducción es una excepción funcional, centrada en el tráiler. Los dibujos originales usan transparencia y mezcla multiplicar para integrarse al papel.

## Components

### Buttons

Controles rectangulares, delineados y discretos. El botón editorial tiene altura mínima de 48px y separación interna de 16px entre icono y texto. Su hover invierte tinta y papel. La variante sobre afiche usa borde claro y fondo oscuro traslúcido; al pasar el puntero se vuelve papel con tinta. El foco compartido es un contorno de arcilla de 3px separado 5px. No se interpreta esto como auditoría global de contraste o tamaño: las sugerencias del chat mantienen su mínimo actual de 40px.

### Navigation

Logo original a la izquierda; enlaces y selector de idioma a la derecha. La página activa se subraya. En móvil aparece el botón Menú y los enlaces se despliegan bajo la cabecera, con `aria-expanded` y `aria-controls`. El acceso Conversar conserva espacio propio y no flota sobre la página.

### Assistant

El botón se inserta mediante portal en el espacio reservado de cabecera. Abre un `dialog` nativo con `showModal()`, título, cierre SVG, historial, sugerencias, consulta y envío. El diálogo se ubica bajo la cabecera, con ancho de 390px limitado por el viewport. La caja de texto es transparente y lleva un filete oliva inferior. El estado ocupado desactiva las acciones y el error ofrece una alternativa de contacto. La lógica y el CSS del componente histórico en `components/ChatBot.tsx` no forman parte de este sistema activo.

### Photography and gallery

Figuras abiertas con pies de foto, sin contenedores de producto. La galería abre la imagen completa en un diálogo nativo y ofrece descarga. La portada usa el arte blend recuperado y su logo original superpuesto. Mantener la procedencia de los archivos; esta documentación no recalifica como original fotográfico ninguna base editada por IA.

### Trailer and icons

El tráiler mantiene 16:9, una imagen de espera, control circular de reproducción y carga del reproductor al activarlo. Flechas, reproducción, cierre, menú, envío y descarga son SVG en línea, trazo de 1.5 y terminaciones redondeadas. No usar glifos tipográficos como sustitutos.

## Do's and Don'ts

### Do:
- **Do** conservar logos, título e ilustraciones originales recuperados.
- **Do** preservar la portada apaisada y los encuadres fotográficos por defecto.
- **Do** mantener papel cálido, serif editorial y sans funcional.
- **Do** reservar espacio de navegación y conversación antes de superponer controles.
- **Do** conservar foco visible, etiquetas accesibles y movimiento reducido.

### Don't:
- **Don't** generar sustitutos o reinterpretaciones de las marcas e ilustraciones originales.
- **Don't** introducir tarjetas de producto, métricas inventadas o filas decorativas de antetítulos.
- **Don't** convertir los retratos en recortes uniformes ni el afiche móvil en vertical.
- **Don't** recuperar el botón flotante del asistente o los iconos hechos con caracteres.
- **Don't** interpretar este registro o el cierre de cuatro hallazgos como autorización de producción.

No canonizado: reglas CSS antiguas anuladas del disparador flotante, estilos de antetítulos sin uso, componente histórico de chat no montado y el recorte local de la banda territorial. Son residuos o excepciones de implementación, no patrones para nuevas superficies.
