import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { openLibrary } from './lib/corpus.mjs';
import { buildKnowledgeMap, linkedContext } from './lib/knowledge-map.mjs';

test('knowledge map rejects fabricated evidence and separates historical reports', { skip: !existsSync('data/library.sqlite') }, () => {
  const db = openLibrary();
  try {
    assert.throws(() => buildKnowledgeMap(db,[['a','causes','b','sc:sujato:dhp5','This is invented.']]), /changed evidence/);
    const graph = buildKnowledgeMap(db);
    const links = linkedContext(graph,'craving');
    assert.ok(links.some(e => e.to === 'continued existence'));
    assert.ok(!links.some(e => e.from === 'craving' && e.to === 'continued existence'));
    assert.equal(linkedContext(graph,'Alara Kalama').length,0);
    assert.equal(linkedContext(graph,'Alara Kalama',{layer:'historical-context'}).length,1);
    assert.ok(graph.edges.every(e => e.evidence.passageId && e.humanReviewed === false));
  } finally { db.close(); }
});
