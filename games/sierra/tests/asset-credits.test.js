import test from 'node:test';
import assert from 'node:assert/strict';
import {assetCredit} from '../src/asset-credits.js';

test('external attribution follows the registered source, not the animal slot', () => {
  assert.equal(assetCredit({file:'mule.glb',provenance:{kind:'authored'}}),null);
  assert.equal(assetCredit({attribution:{id:'unknown'}}),null);
  const credit=assetCredit({attribution:{id:'donkey-13',changes:'Rig y animación para SIERRA.'}});
  assert.equal(credit.author,'amoreno');
  assert.equal(credit.licenseUrl,'https://creativecommons.org/licenses/by/4.0/');
  assert.equal(credit.source,'https://sketchfab.com/3d-models/donkey-13-77bcefe8d32b40cba8e706f43e3e0996');
  assert.equal(credit.changes,'Rig y animación para SIERRA.');
});
