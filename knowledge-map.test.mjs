import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { openLibrary } from './lib/corpus.mjs';
import { buildKnowledgeMap, linkedContext,indexKnowledgeMap,relatedTeachings,passageConnections } from './lib/knowledge-map.mjs';

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
test('indexed concepts retrieve bilingual evidence, reject stale links, and preserve tradition boundaries',{skip:!existsSync('data/library.sqlite')},()=>{
 const source=openLibrary(),db=openLibrary(':memory:');
 try{
  const graph=buildKnowledgeMap(source),ids=[...new Set(graph.edges.map(e=>e.evidence.passageId))];
  for(const id of ids){
   const p=source.prepare('SELECT * FROM passages WHERE id=?').get(id),d=source.prepare('SELECT * FROM documents WHERE id=?').get(p.document_id);
   db.prepare('INSERT OR IGNORE INTO documents VALUES(?,?,?,?,?,?)').run(d.id,d.title,d.tradition,d.collection,d.source,d.metadata);
   db.prepare('INSERT INTO passages VALUES(?,?,?,?,?,?,?)').run(p.id,p.document_id,p.ordinal,p.text,p.title,p.segments,p.original);
  }
  indexKnowledgeMap(db);
  const en=relatedTeachings(db,'craving and clinging'),es=relatedTeachings(db,'ansia y apego');
  assert.deepEqual(en.passages.map(p=>p.id),es.passages.map(p=>p.id));
  assert.ok(en.passages.some(p=>p.id==='sc:sujato:sn56.11:2'));
  assert.ok(en.edges.every(e=>e.layer==='canonical-teaching'&&!e.humanReviewed));
  assert.equal(relatedTeachings(db,'craving',{tradition:'Tibetan'}).passages.length,0);
  assert.equal(relatedTeachings(db,'Alara Kalama').edges.length,0);
  assert.equal(relatedTeachings(db,'Alara Kalama',{layer:'historical-context'}).edges.length,1);
  assert.ok(passageConnections(db,'sc:sujato:sn12.2:1').length);
  db.prepare('UPDATE passages SET text=? WHERE id=?').run('Changed edition','sc:sujato:sn12.2:1');
  assert.ok(!relatedTeachings(db,'craving').passages.some(p=>p.id==='sc:sujato:sn12.2:1'));
  assert.deepEqual(passageConnections(db,'sc:sujato:sn12.2:1'),[]);
 }finally{source.close();db.close();}
});
