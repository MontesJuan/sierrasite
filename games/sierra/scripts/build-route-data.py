#!/usr/bin/env python3
"""Genera src/route-data.js a partir de las rutas GPS reales de la expedición.

Uso: python3 scripts/build-route-data.py /ruta/a/la/carpeta/datos
La carpeta debe contener ruta-astica-escuela.json, ruta-gps-escuela-margarita.json,
ruta-gps-margarita-vallecito.json y ruta-gps-vallecito-escuela.json, cada una con
"puntos": [[lat, lon, altura_m], ...]. Sólo se publican formas resumidas y cifras
redondeadas del tramo; las coordenadas no se copian al juego.
"""
import json, math, sys, pathlib

SAMPLES = 49            # una muestra cada 2 unidades de los 96 del tramo jugable
LATERAL = 9.0           # desvío lateral máximo en unidades de juego
VERTICAL = 14.0 / 500   # 14 unidades de juego por cada 500 m reales de desnivel

def load(folder, name):
    return json.load(open(folder / name))['puntos']

def metres(points):
    lat0 = math.radians(points[0][0])
    return [((p[1] - points[0][1]) * 111320 * math.cos(lat0), (p[0] - points[0][0]) * 110540, p[2]) for p in points]

def resample(xy, n):
    acc = [0.0]
    for a, b in zip(xy, xy[1:]): acc.append(acc[-1] + math.hypot(b[0] - a[0], b[1] - a[1]))
    total, out, j = acc[-1], [], 0
    for i in range(n):
        target = total * i / (n - 1)
        while j < len(acc) - 2 and acc[j + 1] < target: j += 1
        span = acc[j + 1] - acc[j] or 1
        t = (target - acc[j]) / span
        out.append(tuple(xy[j][k] + (xy[j + 1][k] - xy[j][k]) * t for k in range(3)))
    return out, total

def smooth(values, passes=2):
    for _ in range(passes):
        values = [values[0]] + [(values[i - 1] + 2 * values[i] + values[i + 1]) / 4 for i in range(1, len(values) - 1)] + [values[-1]]
    return values

def leg(points, name):
    pts, length = resample(metres(points), SAMPLES)
    ex, ny = pts[-1][0] - pts[0][0], pts[-1][1] - pts[0][1]
    chord = math.hypot(ex, ny) or 1
    heading = (math.degrees(math.atan2(ex, ny)) + 360) % 360          # rumbo real: 0 norte, 90 este
    ux, uy = ex / chord, ny / chord
    # Desvío respecto de la línea recta entre los extremos; positivo a la derecha del sentido de marcha.
    lateral = smooth([(p[0] - pts[0][0]) * uy - (p[1] - pts[0][1]) * ux for p in pts])
    peak = max(abs(v) for v in lateral) or 1
    lateral = [round(v / peak * LATERAL, 2) for v in lateral]
    lateral[0] = lateral[1]; lateral[-1] = lateral[-2]               # entra y sale sin quiebre
    heights = smooth([p[2] for p in pts], 3)
    relief = [round((h - heights[0]) * VERTICAL, 2) for h in heights]
    climb = sum(max(0, b - a) for a, b in zip(heights, heights[1:]))
    drop = sum(max(0, a - b) for a, b in zip(heights, heights[1:]))
    return {'name': name, 'km': round(length / 1000, 1), 'heading': round(heading), 'climb': int(round(climb, -1)), 'drop': int(round(drop, -1)),
            'from': int(round(heights[0], -1)), 'to': int(round(heights[-1], -1)), 'lateral': lateral, 'relief': relief}

def main():
    folder = pathlib.Path(sys.argv[1])
    astica = load(folder, 'ruta-astica-escuela.json'); third = len(astica) // 3
    legs = [
        leg(astica[:third + 1], 'De Astica a la boca del valle'),
        leg(astica[third:2 * third + 1], 'Por el cauce del río'),
        leg(astica[2 * third:], 'La subida a la escuela'),
        leg(load(folder, 'ruta-gps-escuela-margarita.json'), 'De la escuela a lo de Margarita'),
        leg(load(folder, 'ruta-gps-margarita-vallecito.json'), 'De lo de Margarita a Vallecito'),
        leg(load(folder, 'ruta-gps-vallecito-escuela.json'), 'De Vallecito a la escuela'),
    ]
    out = pathlib.Path(__file__).resolve().parent.parent / 'src' / 'route-data.js'
    body = ',\n'.join('  ' + json.dumps(item, ensure_ascii=False) for item in legs)
    out.write_text('// Generado por scripts/build-route-data.py desde el registro GPS de la expedición. No editar a mano.\n'
                   '// Cada tramo resume la forma real del camino: rumbo, largo, desnivel, desvío lateral y relieve (49 muestras).\n'
                   f'export const ROUTES = Object.freeze([\n{body},\n]);\n')
    for item in legs: print(item['name'], item['km'], 'km rumbo', item['heading'], 'sube', item['climb'], 'baja', item['drop'], 'relieve', min(item['relief']), max(item['relief']))

main()
