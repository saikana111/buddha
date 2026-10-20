import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initPlayers,getPlayer,updatePlayer,rememberChat,playerMemory } from './lib/player.mjs';
import { scenePhase } from './public/scene-time.js';

test('cookie player survives reopening database; profiles and recall are isolated',()=>{
 const dir=mkdtempSync(join(tmpdir(),'bodhi-player-')),file=join(dir,'test.sqlite');
 let db=new DatabaseSync(file);
 try{
  initPlayers(db);const a=getPlayer(db),b=getPlayer(db);assert.notEqual(a.id,b.id);
  assert.equal(a.configured,0);
  updatePlayer(db,a.id,{name:'Ari',language:'es',focus:'Mindfulness',notes:'Beginning meditation'});
  rememberChat(db,a.id,"I am confused about mindfulness",{paragraphs:[{text:'A saved reply.',ids:[]}],passages:[]});
  assert.equal(playerMemory(db,a.id).learning[0].needsReview,true);
  rememberChat(db,a.id,'I understand mindfulness now',{paragraphs:[],passages:[]});
  assert.equal(playerMemory(db,a.id).learning[0].needsReview,false);
  for(let n=0;n<5;n++)rememberChat(db,a.id,'Dhammapada verse '+(n+1),{paragraphs:[],passages:[]});
  assert.ok(playerMemory(db,a.id,'mindfulness').recalled.length);
  assert.equal(playerMemory(db,b.id).chatCount,0);
  db.close();db=new DatabaseSync(file);initPlayers(db);
  const restored=getPlayer(db,`another=1; bodhi_player=${a.id}`);
  assert.equal(restored.name,'Ari');assert.equal(playerMemory(db,restored.id).chatCount,7);
  assert.equal(restored.language,'es');assert.equal(restored.configured,1);
  assert.throws(()=>updatePlayer(db,a.id,{name:' ',language:'es',focus:'',notes:''}),/username/);
  assert.throws(()=>updatePlayer(db,a.id,{name:'Ari',language:'fr',focus:'',notes:''}),/English or Spanish/);
  assert.throws(()=>updatePlayer(db,a.id,{name:12,focus:'',notes:''}),/Invalid name/);
 }finally{db.close();rmSync(file);rmdirSync(dir);}
});
test('old profiles migrate without losing history or re-onboarding named players',()=>{
 const db=new DatabaseSync(':memory:');
 try{
  db.exec("CREATE TABLE players(id TEXT PRIMARY KEY,name TEXT NOT NULL,focus TEXT NOT NULL,notes TEXT NOT NULL,created TEXT NOT NULL); INSERT INTO players VALUES('old','Ari','','','2026');");
  initPlayers(db);initPlayers(db);
  const player=db.prepare("SELECT * FROM players WHERE id='old'").get();assert.equal(player.name,'Ari');assert.equal(player.language,'en');assert.equal(player.configured,1);
 }finally{db.close();}
});
test('five scene phases follow local time and wrap through midnight',()=>{
 for(const [hour,phase] of [[0,'night'],[4,'night'],[5,'sunrise'],[7,'morning'],[11,'midday'],[17,'sunset'],[20,'night'],[23,'night']]){
  assert.equal(scenePhase(new Date(2026,0,1,hour)),phase);
 }
});
