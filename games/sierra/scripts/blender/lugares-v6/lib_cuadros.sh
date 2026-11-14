#!/bin/sh
# SIERRA lugares v6 — extracción y etalonaje de cuadros (ffmpeg).
# Entradas por variables de entorno (sin rutas absolutas en el repo):
#   SIERRA_DRON_DIR  carpeta con DJI_03xx.MOV (4K, log plano)   [sólo lectura]
#   SIERRA_FILM      máster etalonado del documental (1280 px)  [sólo lectura]
#   SIERRA_WORK      carpeta privada de trabajo (cuadros, previas, registros)
#
# Etalonaje del dron (log plano -> color natural, igualado al máster del film
# en el plano de la escuela, clip 313 ≈ segundo 1130 del máster):
#   1. curva maestra (igual en R, G y B) en 10 bits: levanta contraste y fija negro/blanco
#   2. saturación x2.4
#   3. balance cálido leve en sombras/medios
GRADE_DRON="format=gbrp10le,curves=all='0/0 0.17/0.03 0.25/0.075 0.35/0.25 0.45/0.505 0.55/0.70 0.645/0.83 0.8/0.95 1/1',format=yuv444p10le,hue=s=2.0,format=gbrp10le,colorbalance=rs=0.04:rm=0.08:gm=-0.02:bm=-0.02"
# Variante para los clips 334/335 (sol bajo, ya cálidos): misma curva, menos saturación, sin balance cálido.
GRADE_DRON_TARDE="format=gbrp10le,curves=all='0/0 0.10/0.03 0.25/0.16 0.45/0.50 0.65/0.80 0.85/0.95 1/1',format=yuv444p10le,hue=s=1.6,format=gbrp10le"

# dron_cuadro CLIP SEG SALIDA.png [crop=w:h:x:y en píxeles 4K | "" = cuadro entero a 1920] [grade]
dron_cuadro() {
  clip="$1"; seg="$2"; out="$3"; crop="$4"; grade="${5:-$GRADE_DRON}"
  if [ -n "$crop" ]; then vf="crop=$crop,$grade"; else vf="scale=1920:-2:flags=lanczos,$grade"; fi
  ffmpeg -v error -y -ss "$seg" -i "$SIERRA_DRON_DIR/DJI_0$clip.MOV" -frames:v 1 -vf "$vf,format=rgb24" "$out"
}
# film_cuadro SEG SALIDA.png  (el máster ya está etalonado: no se toca el color)
film_cuadro() {
  ffmpeg -v error -y -ss "$1" -i "$SIERRA_FILM" -frames:v 1 "$2"
}
