import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { shouldSearch,conceptHint } from './lib/query-intent.mjs';
import { openLibrary,retrieve } from './lib/corpus.mjs';

test('short concepts reach retrieval even when the model labels them irrelevant',()=>{
  for(const q of ['immersion','inmersión','samādhi','concentración','grief','impermanence','atención plena','fear of losing someone'])assert.equal(shouldSearch(q,{relevant:false}),true,q);
  assert.equal(shouldSearch('write Python code',{relevant:false}),false);
  assert.equal(shouldSearch('repair my computer',{relevant:false}),false);
  assert.deepEqual(conceptHint('samādhi'),conceptHint('inmersión'));
});
test('English and Spanish immersion retrieve a complete definition first',{skip:!existsSync('data/library.sqlite')},()=>{
  const db=openLibrary();try{
    for(const q of ['immersion','inmersión','samādhi','concentración']){
      const results=retrieve(db,q);assert.equal(results[0].id,'sc:sujato:sn45.8:3',q);
      assert.match(results[0].text,/what is right immersion/i);assert.match(results[0].text,/fourth absorption/i);
    }
    assert.ok(retrieve(db,'immersion',{tradition:'Tibetan'}).every(p=>p.tradition==='Tibetan'));
  }finally{db.close();}
});
