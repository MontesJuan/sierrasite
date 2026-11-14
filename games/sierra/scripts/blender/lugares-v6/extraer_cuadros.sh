#!/bin/sh
# SIERRA lugares v6 — extrae y etalona todos los cuadros que usan las recetas.
# Uso:  SIERRA_DRON_DIR=... SIERRA_FILM=... SIERRA_WORK=... sh extraer_cuadros.sh
# Sólo lectura sobre el material original; escribe en $SIERRA_WORK/frames y /film.
# Un ffmpeg por vez; los recortes del dron se sacan a resolución nativa pero
# nunca de más de 1920 px de lado (recorte=ancho:alto:x:y en píxeles 4K).
set -e
cd "$(dirname "$0")"
. ./lib_cuadros.sh
C="$SIERRA_WORK/frames/crops"
mkdir -p "$C" "$SIERRA_WORK/film/adobe" "$SIERRA_WORK/logs"
# --- texturas ---
dron_cuadro 313 10  "$C/c313_t10_wall.png"   "1920:560:100:1620"                 # pirca
dron_cuadro 309 45  "$C/c309_t45_roca.png"   "1100:1100:950:600"                 # roca
dron_cuadro 310 5   "$C/c310_t5.png"         "1400:900:2440:1260"                # agua
dron_cuadro 306 2   "$C/c306_t2_roof.png"    "500:500:2280:540"                  # chapa
for t in 19 25 31; do dron_cuadro 334 $t "$C/c334_t$t.png" "1920:1080:1900:500" "$GRADE_DRON_TARDE"; done  # suelo
dron_cuadro 334 5   "$C/c334_t5_arena.png"   "1000:1900:2840:130" "$GRADE_DRON_TARDE"   # suelo
dron_cuadro 335 4.2 "$C/c335_s4.2.png"       "1400:1080:300:0"    "$GRADE_DRON_TARDE"   # huella
for t in 3375 3378 3381 3384 3387 3390 3393 3396 3399 3402 3405 3408 3411 3414; do
  film_cuadro $t "$SIERRA_WORK/film/adobe/a$t.png"                                # adobe (plano fijo)
done
# --- edificios ---
dron_cuadro 313 25  "$C/e313_t25_izq.png"    "1920:1080:0:700"                   # fachada de la escuela
dron_cuadro 313 25  "$C/e313_t25_der.png"    "1920:1080:1920:700"
dron_cuadro 306 20  "$C/c306_t20_corral.png" "1760:1760:1150:300"                # corral cenital
dron_cuadro 323 25  "$C/c323_t25_roof.png"   "700:700:1300:520"                  # tono de la chapa vieja
ffmpeg -v error -y -ss 2885 -i "$SIERRA_FILM" -frames:v 1 -q:v 2 "$SIERRA_WORK/film/f2885.jpg"   # tono de la casa de piedra
ffmpeg -v error -y -ss 3545 -i "$SIERRA_FILM" -frames:v 1 -q:v 2 "$SIERRA_WORK/film/f3545.jpg"   # madera del cerco
echo "cuadros listos en $SIERRA_WORK"
