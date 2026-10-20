import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {openLibrary} from './lib/corpus.mjs';
import {chooseEncounter,encounterProgress,encounterPrompt} from './lib/guided-dialogue.mjs';
import {initPlayers,getPlayer,rememberChat,playerMemory} from './lib/player.mjs';

test('guided retrieval keeps the whole simile and respects direct answers and traditions',{skip:!existsSync('data/library.sqlite')},()=>{
  const db=openLibrary();
  try{
    for(const [question,key] of [['how to find extinguishment','fire'],['cómo encontrar la extinción','fire'],['someone insulted me','gift'],['physical pain','arrows'],['right speech','mirror'],['apego a las enseñanzas','raft']]){
      const result=chooseEncounter(db,question,null);
      assert.equal(result.key,key);assert.equal(result.stage,'invite');
      assert.equal(result.passages.length,2);
    }
    const fire=chooseEncounter(db,'extinguishment',null);
    assert.match(fire.passages[1].text,/original fuel is used up/);
    assert.equal(chooseEncounter(db,'extinguishment, just the definition',null),null);
    assert.equal(chooseEncounter(db,'Explain extinguishment in depth',null),null);
    assert.equal(chooseEncounter(db,'extinguishment',null,{tradition:'Tibetan'}),null);
    assert.equal(chooseEncounter(db,'extinguishment',null,{disabled:true}),null);
    assert.equal(chooseEncounter(db,'how are you today?',null),null);
  }finally{db.close();}
});

test('a saved invitation follows the answer or Continue, but does not hijack a new topic',{skip:!existsSync('data/library.sqlite')},()=>{
  const db=openLibrary(),players=openLibrary(':memory:');initPlayers(players);
  try{
    const a=getPlayer(players),b=getPlayer(players);
    const fire=chooseEncounter(db,'extinguishment',null);
    const result={paragraphs:[{text:'What happens if no more fuel is added?',ids:fire.ids}],passages:fire.passages};
    result.guidedEncounter=encounterProgress(fire,result);
    rememberChat(players,a.id,'extinguishment',result);
    const saved=playerMemory(players,a.id).lastResponse.guidedEncounter;
    assert.equal(playerMemory(players,b.id).lastResponse,null);
    assert.equal(chooseEncounter(db,'it goes out',saved,{replying:true}).stage,'apply');
    assert.equal(chooseEncounter(db,'It goes out when no more fuel is added.',saved,{replying:false}).stage,'apply');
    assert.equal(chooseEncounter(db,'repair my car fuel pump',saved,{replying:false}),null);
    const next=chooseEncounter(db,'Please continue.',saved);
    assert.equal(next.stage,'apply');assert.equal(next.continuing,true);
    assert.match(encounterPrompt(next),/without pretending they answered/);
    assert.equal(chooseEncounter(db,'tell me about right speech',saved,{replying:true}).key,'mirror');
    assert.equal(chooseEncounter(db,'what is the weather?',saved),null);
    assert.equal(encounterProgress(fire,{paragraphs:[]}),undefined);
    assert.equal(encounterProgress(fire,{paragraphs:[{text:'An unsupported question?',ids:['other']}]}),undefined);
  }finally{db.close();players.close();}
});

test('missing or reference-only passages cannot become a guided story',{skip:!existsSync('data/library.sqlite')},()=>{
  const source=openLibrary(),db=openLibrary(':memory:');
  try{
    assert.equal(chooseEncounter(db,'extinguishment',null),null);
    for(const id of ['sc:sujato:sn12.52:1','sc:sujato:sn12.52:2']){
      const p=source.prepare('SELECT * FROM passages WHERE id=?').get(id),d=source.prepare('SELECT * FROM documents WHERE id=?').get(p.document_id);
      db.prepare('INSERT OR IGNORE INTO documents VALUES(?,?,?,?,?,?)').run(d.id,d.title,d.tradition,d.collection,d.source,d.metadata);
      db.prepare('INSERT INTO passages VALUES(?,?,?,?,?,?,?)').run(p.id,p.document_id,p.ordinal,p.text,p.title,p.segments,p.original);
    }
    assert.equal(chooseEncounter(db,'extinguishment',null).key,'fire');
    const row=db.prepare('SELECT id,metadata FROM documents LIMIT 1').get();
    db.prepare('UPDATE documents SET metadata=? WHERE id=?').run(JSON.stringify({...JSON.parse(row.metadata),synthesisAllowed:false}),row.id);
    assert.equal(chooseEncounter(db,'extinguishment',null),null);
  }finally{source.close();db.close();}
});
