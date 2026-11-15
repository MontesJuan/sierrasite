---
name: SIERRA
description: La película y sus dibujos en el centro; tinta, grabado y cuaderno.
colors:
  paper: "#C4C5C1"
  ink: "#080605"
  line: "#8b8c88"
  photo-ground: "#d6d4cb"
typography:
  display:
    fontFamily: '"SIERRA CF", "Courier New", monospace'
    fontSize: "clamp(3rem, 7vw, 6rem)"
    fontWeight: 300
    lineHeight: 1.02
  headline:
    fontFamily: '"SIERRA CF", "Courier New", monospace'
    fontSize: "clamp(2.8rem, 5.1vw, 5.5rem)"
    fontWeight: 300
    lineHeight: 1.02
  title:
    fontFamily: '"SIERRA CF", "Courier New", monospace'
    fontSize: "2.5rem"
    fontWeight: 400
    lineHeight: 1.02
  hand:
    fontFamily: '"Don Reyes", "SIERRA CF", "Courier New", monospace'
  school-hand:
    fontFamily: '"Alumnos de Sierra", "American Typewriter", "Courier New", monospace'
  body:
    fontFamily: '"American Typewriter", "Courier New", monospace'
    fontSize: "15px"
    lineHeight: 1.7
  control:
    fontFamily: '"American Typewriter", "Courier New", monospace'
    fontSize: "13px"
  label:
    fontFamily: '"American Typewriter", "Courier New", monospace'
    fontSize: "12px"
rounded:
  square: "0"
  circle: "50%"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  panel: "28px"
components:
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.square}"
    padding: "13px 24px"
  button-outline-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.control}"
    rounded: "{rounded.square}"
    padding: "13px 24px"
  button-primary-hover:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
  button-on-ink:
    backgroundColor: "transparent"
    textColor: "{colors.paper}"
    typography: "{typography.control}"
    rounded: "{rounded.square}"
    padding: "13px 24px"
  choice:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.square}"
    padding: "11px 16px"
  choice-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  field:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "12px"
  order-summary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "28px"
  status-stamp:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "9px 14px"
---

# Design System: SIERRA

## Overview

**Creative North Star: "La película y sus dibujos en el centro; tinta, grabado y cuaderno"**

El manual v03 aplicado al sitio fija un mundo de piedra, tinta y letras propias. La imagen documental y los dibujos originales llevan el carácter de SIERRA; la interfaz toma la austeridad del cuaderno, la impresión y el afiche de cine. El resultado es crudo, rústico, abierto y legible, con amplios espacios entre la imagen, la lectura y la acción.

SIERRA CF construye los titulares. Don Reyes y Alumnos de Sierra aportan voces originales en intervenciones puntuales; American Typewriter sostiene toda la lectura y los controles, con Courier New de respaldo. La tienda prolonga este mundo dentro del sitio de la película. La dirección es autoral y está implementada: no es una exploración de identidad ni un nuevo diseño para el juego existente.

**Key Characteristics:**

- Piedra y Tinta como fondo, lectura e inversión de estados.
- Letras originales de la película y una sola familia de lectura.
- Fotogramas e imágenes completos, con texto fuera de las personas.
- Dibujos originales y visualizaciones de producto con procedencia conservada.
- Esquinas rectas, filetes, columnas abiertas y controles sin sombra.

Registro del código construido, actualizado el 15/11/2026. Autoridad: decisión de Juan y manual v03, documentado en `/Volumes/AZORES/SIERRA/Sierra/03 Imagen y prensa/Manual de marca v03 - tinta grabado y cuaderno.md`. Fuentes de implementación: `app/layout.tsx`, `app/globals.css`, `app/tienda/store.css`, `app/components/{Nav,Icon,CartProvider,Trailer}.tsx`, `app/tienda/catalog-additions.tsx`, las vistas de tienda, carrito, pedido y gestión, y `lib/store/catalog.ts`. La autoridad de identidad no equivale a aprobar créditos ni materiales de prensa.

La evidencia visual de la ampliación está en `.impeccable/review/catalog/`: `desktop.png`, `mobile.png`, `libros-desktop.png`, `poster-desktop.png`, `cart-desktop.png`, `cart-mobile.png`, `trailer-desktop.png` y `trailer-mobile.png`. El cierre de `docs/catalog-finish-review.md` declara F1/F2 resueltos y disposición "ship" sólo para esas dos correcciones: aviso previo de tapas propuestas y resultado junto al libro accionado. No equivale a una nueva revisión general ni a una compra real. Los avisos heredados del detector se registran en `docs/catalog-design-triage.md`; no cambian la identidad ni las reglas de este documento. Son pruebas locales del build y no establecen un estado público de despliegue.

## Colors

El lienzo gris piedra recibe tinta casi negra. La fotografía y los dibujos aportan las variaciones materiales; los valores normativos están en el frontmatter.

### Primary

- **Tinta** (`ink`): lectura, marca, filetes fuertes, botones principales y variantes seleccionadas. También forma las bandas oscuras del sitio y la tienda.

### Neutral

- **Piedra** (`paper`): fondo continuo de páginas, formularios y navegación; texto sobre tinta.
- **Filete** (`line`): separaciones, contornos de campos y opciones sin seleccionar.
- **Fondo de producto** (`photo-ground`): apoyo neutro de las vistas de remera, las tapas de libros, el afiche y las miniaturas del carrito. No es un acento para las acciones.

Los nombres heredados `olive` y `clay` en CSS resuelven a Tinta. No representan colores adicionales del sistema vigente. Los valores de blanco y negro de las muestras de prenda describen el producto, no una segunda paleta de interfaz.

**The Stone and Ink Rule.** Las acciones y sus estados se distinguen con tinta, piedra, contorno y texto; no necesitan un color de marca adicional.

## Typography

**Display Font:** SIERRA CF, cargada desde los archivos originales en pesos Light y Regular, con su variante Italic. El logo se reproduce desde el archivo de marca; no se recompone con texto.

**Body Font:** American Typewriter, con Courier New y monospace de respaldo. La implementación usa la fuente disponible en el sistema; las tres letras propias se cargan desde `/fonts/`.

**Original hands:** Don Reyes para intervenciones de escritura; Alumnos de Sierra para la frase manuscrita de portada. Son usos expresivos concretos, no familias alternativas para formularios o párrafos.

### Hierarchy

- **Display:** titulares principales fluidos. La tienda adapta el titular a su composición; en móvil, tienda y carrito llegan a 3rem.
- **Headline:** títulos de sección en SIERRA CF, de peso ligero y línea compacta. Los tamaños locales responden al ancho y la función, sin una progresión matemática única.
- **Title:** nombres y subtítulos en SIERRA CF Regular. Los códigos operativos del panel usan la familia de lectura para que se puedan leer y partir correctamente.
- **Body:** lectura general de 15px con interlínea 1.7; los bloques de apoyo de tienda y carrito usan 12–14px según contexto. Los párrafos de producto limitan la longitud, habitualmente a 44–48ch; las páginas de pedido y condiciones llegan a 70ch.
- **Control / Label:** acciones de 13px y etiquetas de 12px. Los importes, cantidades y códigos emplean cifras tabulares cuando se alinean. Los importes enteros no fuerzan decimales; cuando hay centavos, se muestran dos cifras.

**The One Reading Voice Rule.** American Typewriter es la única letra de lectura y controles; Courier New es su respaldo. Las letras originales se reservan para su función expresiva.

## Layout

El contenedor editorial y la tienda llegan a 1680px, con márgenes laterales habituales de 7%; los márgenes móviles pasan a 6%. Las secciones editoriales conservan la cadencia amplia del sitio. La tienda organiza imagen y elección en dos columnas de proporción 1.15:1 con un vacío del 8%; a 760px se apilan. Las vistas de producto caben completas mediante `contain`, incluso cuando la superficie de exhibición es vertical y el archivo es horizontal.

La navegación interna separa Remeras, Libros y Póster. Los tres libros forman una grilla de tres columnas con separación de 32px; a 1000px baja a 22px, y a 760px pasa a una sola columna con 45px entre productos. Cada tapa se muestra completa dentro de una superficie cuadrada, sin recorte. El aviso de propuestas de edición precede a la grilla. El póster usa dos columnas de proporción 1.15:1 y separación del 8%; a 760px se apila imagen y elección. El arte completo conserva proporción y créditos en todos los formatos.

El carrito llega a 1500px. En escritorio tiene artículos y dirección a la izquierda, resumen a la derecha; el resumen se mantiene visible con posición sticky. A 1050px se estrechan columnas y miniaturas. A 760px el orden pasa a artículos, resumen y dirección, y el resumen vuelve al flujo normal. Así, el importe pendiente de envío y los pasos de compra se leen antes del formulario final.

Los formularios usan dos columnas que se vuelven una a 760px. Gestión también apila sus columnas en ese ancho. Códigos, correos e identificadores largos pueden partirse; no deben estirar el viewport. El estado del pedido conserva un ancho máximo de 1000px.

La cabecera mide 80px y pasa a 68px a 600px, donde el menú reemplaza los enlaces desplegados. El carrito conserva su contador y acceso global. El acceso al asistente ocupa un lugar propio; en los anchos pequeños se ofrece dentro del menú. La portada separa título, fotograma y pie en bloques sucesivos, manteniendo la proporción del arte y sin superponer su texto a los personajes.

**The Complete Frame Rule.** Los personajes conservan el encuadre completo y el texto ocupa su propio espacio. La composición se adapta a la imagen.

## Elevation & Depth

La tienda, el carrito, el pedido y la gestión usan superficies planas. Los filetes separan artículos y datos; el resumen recibe un contorno de tinta. No se levantan tarjetas de producto mediante sombras. La alternancia entre piedra y tinta organiza el relato del sitio.

El diálogo del asistente conserva una sombra ambiental (`0 16px 60px #0003`) y los diálogos usan fondos traslúcidos para separarse del contenido. Esta excepción modal no se traslada a botones, filas ni paneles de compra.

Las acciones invierten fondo y texto en 0.2s. Las imágenes de producto tienen un ajuste breve de contraste de 0.35s con `cubic-bezier(.16,1,.3,1)` sólo cuando se permite movimiento. La preferencia de movimiento reducido elimina animaciones, transiciones y desplazamiento suave.

**The Flat Surface Rule.** Las superficies de compra y gestión permanecen planas; la jerarquía se construye con espacio, filetes e inversión de tinta y piedra.

## Shapes

Predominan esquinas rectas y bordes de 1px. El círculo queda limitado a funciones concretas ya existentes: muestras de color de prenda y reproducción del tráiler. Las fotografías se presentan sin máscaras decorativas; el dibujo original del chivo puede invertirse para contrastar sobre tinta. Esa inversión no altera su trazo ni autoriza a redibujarlo.

## Components

### Buttons

Rectangulares y directos. El botón delineado invierte a tinta al pasar el puntero; el principal empieza en tinta y se invierte a piedra. La variante sobre tinta tiene texto y contorno piedra. El patrón compartido tiene altura mínima de 48px, padding de 13px por 24px y espacio entre icono y texto de 16px. El foco visible usa un contorno de 2px separado 4px; el estado desactivado baja la opacidad y bloquea la acción.

Las acciones de añadir y continuar ocupan el ancho de su columna. Cada libro conserva su propia acción y coloca inmediatamente después la confirmación o el error, con enlace "Ver carrito". Las acciones secundarias de quitar, deshacer y consultar estado se expresan como texto subrayado. Los símbolos +/− de sumar y cantidades representan operaciones aritméticas; las flechas de navegación son SVG.

### Choices and status stamps

Diseño, color, talle y formato de póster se eligen con grupos de botones delineados. El seleccionado invierte piedra y tinta y expone `aria-pressed`. Las opciones tienen altura mínima de 48px; los talles mantienen un ancho mínimo de 56px. La selección se comunica también con texto, sin depender de la muestra circular de color.

Los estados de gestión son sellos rectangulares delineados, con nombres en español. Conservan texto legible y evitan códigos internos como única explicación al usuario.

### Cards / Containers

El catálogo presenta una imagen y su información en una composición abierta. El resumen del carrito es un panel delimitado por tinta, sin sombra, con padding de 28px que pasa a 20px a 1050px. Las filas de carrito y gestión se separan con filetes. No hay una regla que convierta cada contenido en tarjeta.

### Inputs / Fields

Campos transparentes, rectos, con contorno Filete, texto Tinta, padding de 12px y altura mínima de 48px. Las etiquetas permanecen visibles. El foco de los campos de tienda usa 2px de tinta separados 3px. Los mensajes de error se explican con texto dentro de un borde de tinta y usan `role="alert"`; los avisos de progreso y resultado usan `role="status"`. La dirección conserva sus campos, ayudas y aceptación explícita.

### Navigation

Logo original, enlaces de la película, Tienda, Jugar, idioma, carrito con contador y acceso al asistente. El pie de página también llama "Tienda" al catálogo completo. La página activa se subraya. El menú pequeño incluye nombre visible, control SVG y estado accesible con `aria-expanded` y `aria-controls`. El contador del carrito suma unidades de productos de las tres categorías; no cuenta sólo prendas ni cantidad de variantes.

### Product media and original imagery

La vista de producto alterna entre la visualización en Franco y el frente y espalda de la remera. Mantiene la imagen completa y una leyenda que la identifica como visualización del diseño. Las estampas son originales; las visualizaciones no se presentan como fotografías documentales de fabricación. Fotogramas, dibujos y logos conservan sus fuentes y procedencia. No añadir texto sobre las personas.

### Books and poster

Los libros prolongan la composición abierta: tapa completa, autor, título, descripción, precio y acción, sin una envoltura elevada. Las visualizaciones de tapa dura y lino son propuestas de edición; el aviso se lee antes de la grilla y los tres botones lo referencian con `aria-describedby`. La edición y el envío se confirman antes de habilitar el pago. Antología Poética utiliza la ilustración original de Reyes escribiendo. Ninguna visualización acredita fabricación o encuadernación final.

La confirmación o el límite del carrito aparecen inmediatamente bajo el botón del libro accionado, mediante `role="status"` y con "Ver carrito". No se desplaza ese resultado al final de toda la sección. El patrón se conserva para los tres títulos.

El póster final v08 aprobado se presenta entero. Sus opciones de formato incluyen nombre y dimensiones; el precio cambia con la selección. La imagen y los créditos no se recortan para completar la superficie de exhibición. El botón y su mensaje conservan el mismo lenguaje del catálogo.

### Order, totals and management

El resumen distingue productos, envío por cotizar y subtotal. Puede combinar remeras, libros y pósters, conservando título, detalle, cantidad y precio por artículo; el pedido usa los precios unitarios guardados desde el catálogo del servidor. El pedido privado muestra la cotización y el total confirmado antes de ofrecer el pago. Los plazos de preparación y de tránsito se leen por separado. Los códigos usan cifras tabulares y pueden partirse en móvil. Gestión conserva los mismos campos, botones y filetes; los estados y acciones tienen nombres comprensibles en español. Los datos del entorno de revisión no se convierten en contenido real.

### Trailer

El tráiler existente v06 dura 3:15. La imagen de espera y el control de reproducción activan la carga del video nativo; después aparecen sus controles, reproducción en línea y acceso alternativo al archivo. La duración se muestra antes de reproducir. Este cambio conserva el material existente y el espacio del reproductor; no es una nueva pieza audiovisual.

### Assistant, gallery and icons

Los diálogos conservan su función y tratamiento existente: fondo Piedra, texto Tinta y cierre accesible. El acceso al asistente pertenece a la cabecera o al menú, sin botón flotante sobre la imagen. La galería permite abrir el encuadre completo. Las flechas, reproducción, cierre, envío y descarga usan SVG en línea, trazo de 1.5 y extremos redondeados; el tamaño habitual renderizado es de 18px, con variaciones funcionales de cierre y reproducción.

## Do's and Don'ts

### Do:

- **Do** usar los logos y dibujos originales recuperados, manteniendo su procedencia.
- **Do** conservar imágenes completas y separar la lectura de las personas fotografiadas.
- **Do** mantener Piedra y Tinta, letras originales y una única familia de lectura.
- **Do** ofrecer estados seleccionados, foco visible, mensajes y etiquetas comprensibles.
- **Do** conservar el orden móvil de artículos, resumen y dirección; mostrar los plazos antes del pago.
- **Do** escribir las citas con comillas dobles y las cantidades monetarias con formato argentino.

### Don't:

- **Don't** generar sustitutos o reinterpretaciones de la marca ni de las ilustraciones originales.
- **Don't** reintroducir Cochin, Baskerville, Cormorant Garamond o Manrope en la implementación activa.
- **Don't** recortar personajes, poner texto encima de ellos ni convertir la imagen documental en un recorte uniforme.
- **Don't** trasladar colores heredados, sombras de diálogos o estilos anulados a nuevos controles de la tienda.
- **Don't** usar comillas angulares ni reemplazar las flechas de navegación por glifos tipográficos.
- **Don't** confundir las visualizaciones de producto, las capturas de QA o este registro con aprobación editorial o evidencia de producción.

No canonizado: declaraciones antiguas anuladas en la cascada, la antigua paleta tierra/oliva como identidad vigente, el disparador flotante ya reemplazado y estilos históricos ajenos a las superficies revisadas. Son residuos o antecedentes, no patrones para nuevas pantallas.
