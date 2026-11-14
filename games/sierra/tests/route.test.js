import test from 'node:test';
import assert from 'node:assert/strict';
import { ROUTES } from '../src/route-data.js';
import { routeLateral, routeRelief, routeHeading, compass, routeFact, sunDirection } from '../src/route.js';
import { trailHeight, ROUTE_LENGTH } from '../src/trail-physics.js';

test('hay seis tramos reales con 49 muestras, rumbo y cifras plausibles', () => {
  assert.equal(ROUTES.length, 6);
  for (const route of ROUTES) {
    assert.equal(route.lateral.length, 49); assert.equal(route.relief.length, 49);
    assert.ok(route.km > 2 && route.km < 10, route.name);
    assert.ok(route.heading >= 0 && route.heading < 360);
    assert.ok(Math.max(...route.lateral.map(Math.abs)) <= 9.001);
    assert.ok(route.from > 600 && route.to < 2300);
  }
  assert.ok(ROUTES[3].heading > 250 && ROUTES[3].heading < 300, 'de la escuela a lo de Margarita se va hacia el oeste');
  assert.ok(ROUTES[4].heading > 160 && ROUTES[4].heading < 210, 'de lo de Margarita a Vallecito se va hacia el sur');
  assert.ok(ROUTES[5].heading > 40 && ROUTES[5].heading < 100, 'la vuelta a la escuela va hacia el este');
  assert.ok(ROUTES[5].to < ROUTES[5].from, 'la vuelta desde Vallecito baja');
});

test('el sendero sigue las muestras sin saltos ni quiebres bruscos y se mantiene antes y después del tramo', () => {
  for (let chapter = 0; chapter < 6; chapter++) {
    for (let d = 0; d <= ROUTE_LENGTH; d += 2) assert.ok(Math.abs(routeLateral(chapter, d) - ROUTES[chapter].lateral[d / 2]) < 1e-9);
    for (let d = -20; d < ROUTE_LENGTH + 40; d += .25) {
      const step = Math.abs(routeLateral(chapter, d + .25) - routeLateral(chapter, d));
      assert.ok(step < .6, `capítulo ${chapter}, d=${d}: curva demasiado brusca (${step})`);
    }
    assert.equal(routeLateral(chapter, -50), routeLateral(chapter, 0));
    assert.equal(routeLateral(chapter, 400), routeLateral(chapter, ROUTE_LENGTH));
  }
});

test('el relieve real deja planos el arranque y la llegada y suma una pendiente caminable', () => {
  for (let chapter = 0; chapter < 6; chapter++) {
    for (let d = -10; d <= 16; d += 2) assert.equal(routeRelief(chapter, d), routeRelief(chapter, 0), 'arranque plano para la tranquera y el río');
    for (let d = 90; d <= 130; d += 4) assert.ok(Math.abs(routeRelief(chapter, d) - routeRelief(chapter, 90)) < 1e-9, 'llegada plana para las casas');
    for (let d = 0; d < ROUTE_LENGTH; d += .5) {
      const total = (trailHeight(d + .5, chapter) + routeRelief(chapter, d + .5) - trailHeight(d, chapter) - routeRelief(chapter, d)) / .5;
      assert.ok(Math.abs(total) < 1.15, `capítulo ${chapter}, d=${d}: pendiente ${total.toFixed(2)}`);
    }
  }
  assert.ok(routeRelief(5, 90) < -3.5, 'la vuelta a la escuela desciende');
  assert.ok(routeRelief(4, 90) > 2, 'hacia Vallecito se sube');
});

test('la brújula nombra el rumbo real y sus vecinos', () => {
  assert.deepEqual(compass(0), { left: 'NO', main: 'N', right: 'NE' });
  assert.deepEqual(compass(277), { left: 'SO', main: 'O', right: 'NO' });
  assert.deepEqual(compass(187), { left: 'SE', main: 'S', right: 'SO' });
  assert.deepEqual(compass(-90), { left: 'SO', main: 'O', right: 'NO' });
  assert.equal(compass(359).main, 'N');
  assert.equal(routeHeading(3), ROUTES[3].heading); assert.equal(routeHeading(99), ROUTES[5].heading); assert.equal(routeHeading('x'), ROUTES[0].heading);
});

test('la ficha del tramo usa cifras reales y el sol queda donde corresponde al rumbo', () => {
  assert.match(routeFact(3), /5,5 km hacia el oeste y sube de/);
  assert.match(routeFact(5), /hacia el (este|noreste) y baja de/);
  // Yendo hacia el oeste con el sol de la tarde al oeste, el sol queda adelante (−Z) y arriba.
  const ahead = sunDirection(3, ROUTES[3].heading, 30);
  assert.ok(ahead[2] < -.8 && Math.abs(ahead[0]) < 1e-9 && ahead[1] > .4);
  // Sol al este yendo al oeste: queda detrás (+Z).
  assert.ok(sunDirection(3, ROUTES[3].heading - 180, 20)[2] > .8);
  // Sol al norte yendo al oeste: queda a la derecha (+X).
  assert.ok(sunDirection(3, ROUTES[3].heading + 90, 45)[0] > .6);
  const any = sunDirection(4, 272, 11); assert.ok(Math.abs(Math.hypot(...any) - 1) < 1e-9);
});
