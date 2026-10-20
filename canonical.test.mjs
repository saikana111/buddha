import test from 'node:test';
import assert from 'node:assert/strict';
import {openLibrary} from './lib/corpus.mjs';
import {initCanonical,linkCanonicalTranslations,canonicalCoverage,canonicalText,searchCanonical,passageContext} from './lib/canonical.mjs';
test('canonical index keeps segment order, distinguishes alignment gaps, and bounds context to the same translation',()=>{
 const db=openLibrary(':memory:');initCanonical(db);
 try{
  db.prepare('INSERT INTO canonical_texts VALUES(?,?,?,?,?,?,?)').run('mn1','sutta','mn','Example','https://example.org/root','revision','hash');
  const root=db.prepare('INSERT INTO canonical_segments VALUES(?,?,?,?)');
  root.run('mn1:1.1','mn1',0,'Sati ānāpānassatibhāvanā');root.run('mn1:1.2','mn1',1,'Dhamma');root.run('mn1:2.1','mn1',2,'Untranslated');
  db.prepare('INSERT INTO documents VALUES(?,?,?,?,?,?)').run('en','Example','Pāli','mn','SuttaCentral',JSON.stringify({uid:'mn1',license:'CC0',translator:'Test'}));
  db.prepare('INSERT INTO documents VALUES(?,?,?,?,?,?)').run('other','Other edition','Pāli','mn','Other',JSON.stringify({uid:'mn1',translator:'Other'}));
  const p=db.prepare('INSERT INTO passages VALUES(?,?,?,?,?,?,?)');
  p.run('en:1','en',0,'First.','Example','["mn1:1.1"]','');
  p.run('en:2','en',1,'Second.','Example','["mn1:1.2"]','');
  p.run('other:1','other',0,'Other wording.','Other','["mn1:2.1"]','');
  linkCanonicalTranslations(db);
  const coverage=canonicalCoverage(db)[0];assert.equal(coverage.segments,3);assert.equal(coverage.alignedSegments,2);
  assert.equal(searchCanonical(db,'anapanasati')[0].id,'mn1:1.1');
  assert.deepEqual(searchCanonical(db,'anapanasati',{book:'bv'}),[]);
  assert.deepEqual(searchCanonical(db,'""'),[]);
  assert.deepEqual(canonicalText(db,'mn1',{offset:1,limit:1}).segments.map(s=>s.id),['mn1:1.2']);
  assert.equal(canonicalText(db,'unknown'),null);
  const context=passageContext(db,'en:1');assert.deepEqual(context.passages.map(p=>p.id),['en:1','en:2']);
  assert.deepEqual(context.original.map(s=>s.id),['mn1:1.1']);assert.equal(passageContext(db,'missing'),null);
 }finally{db.close();}
});
