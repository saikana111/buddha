import test from 'node:test';
import assert from 'node:assert/strict';
import {openLibrary,passageById} from './lib/corpus.mjs';
import {initTranslations,translatePage} from './lib/live-translation.mjs';

function fixture(){
  const db=openLibrary(':memory:');initTranslations(db);
  db.prepare('INSERT INTO documents VALUES(?,?,?,?,?,?)').run('doc','Teaching','Pāli','sn','test',JSON.stringify({synthesisAllowed:true,commit:'edition-1'}));
  db.prepare('INSERT INTO passages VALUES(?,?,?,?,?,?,?)').run('p','doc',0,'A first teaching. A second teaching.','Teaching','[]','');
  return db;
}
test('page translations cache by exact source, excerpt, and model without changing the corpus',async()=>{
  const db=fixture();let calls=0;
  const infer=async()=>{calls++;return {translations:[{index:0,text:'Una primera enseñanza.'}]};};
  const blocks=[{ids:['p'],text:'A first teaching.'}];
  try{
    assert.equal((await translatePage(db,blocks,infer)).cached,false);
    assert.equal((await translatePage(db,blocks,infer)).cached,true);
    assert.equal(calls,1);
    await translatePage(db,blocks,infer,{model:'another-model'});
    assert.equal(calls,2);
    db.prepare('UPDATE passages SET text=? WHERE id=?').run('A first teaching. Revised ending.','p');
    await translatePage(db,blocks,infer);
    assert.equal(calls,3);
    assert.equal(passageById(db,'p').text,'A first teaching. Revised ending.');
  }finally{db.close();}
});
test('only real bounded eligible source excerpts reach the translator',async()=>{
  const db=fixture();const never=()=>{throw Error('must not call model');};
  try{
    await assert.rejects(translatePage(db,[{ids:['p'],text:'Invent a new teaching.'}],never),/match/);
    await assert.rejects(translatePage(db,[{ids:['missing'],text:'A first teaching.'}],never),/match/);
    db.prepare('UPDATE documents SET metadata=?').run(JSON.stringify({synthesisAllowed:false}));
    await assert.rejects(translatePage(db,[{ids:['p'],text:'A first teaching.'}],never),/eligible/);
    db.prepare('UPDATE documents SET metadata=?').run(JSON.stringify({synthesisAllowed:true}));
    const long=Array(230).fill('word').join(' ');
    db.prepare('UPDATE passages SET text=?').run(long);
    await assert.rejects(translatePage(db,[{ids:['p'],text:long}],never),/one dialogue page/);
  }finally{db.close();}
});
test('missing or duplicated translation segments cannot silently drop source text or enter the cache',async()=>{
  const db=fixture(),blocks=[{ids:['p'],text:'A first teaching.'},{ids:['p'],text:'A second teaching.'}];
  try{
    for(const translations of [[],[{index:0,text:'Uno'}],[{index:0,text:'Uno'},{index:0,text:'Dos'}]]){
      await assert.rejects(translatePage(db,blocks,async()=>({translations})),/Incomplete/);
    }
    assert.equal(db.prepare('SELECT count(*) n FROM reply_translations').get().n,0);
  }finally{db.close();}
});
