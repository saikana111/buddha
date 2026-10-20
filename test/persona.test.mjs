import test from 'node:test';
import assert from 'node:assert/strict';
import { needsDirectDelivery } from '../lib/persona.mjs';

test('ordinary guidance repairs third-person attribution in both languages', () => {
  assert.equal(needsDirectDelivery('How can I meet anger?', 'The Buddha said that hatred does not end through hatred.'), true);
  assert.equal(needsDirectDelivery('¿Cómo afrontar el odio?', 'El Buda enseñó que el odio no cesa con odio.'), true);
  assert.equal(needsDirectDelivery('Help with anger', 'The Blessed One explained that hatred does not end through hatred.'), true);
  assert.equal(needsDirectDelivery('Help with anger', 'Hatred does not end through hatred.'), false);
});

test('explicit source and attribution questions preserve attribution', () => {
  assert.equal(needsDirectDelivery('Who said this?', 'The Buddha said this.'), false);
  assert.equal(needsDirectDelivery('¿Quién enseñó esto?', 'El Buda enseñó esto.'), false);
  assert.equal(needsDirectDelivery('Compare these translations', 'The texts describe different terms.'), false);
  assert.equal(needsDirectDelivery('¿Qué fuente contiene esto?', 'El Buda dijo esto.'), false);
});
