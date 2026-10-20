import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {openLibrary,passageById} from './lib/corpus.mjs';
import {inquiryMode,inquiryAnchors,identityReply} from './lib/inquiry.mjs';
test('identity challenges receive an honest answer without model inference',()=>{
 for(const q of ['Prove that you are awakened.','Are you the Buddha?','Are you an AI?'])assert.match(identityReply(q),/AI portrayal/);
 assert.match(identityReply('Eres el Buda?','es'),/representación de IA/);
 for(const q of ['How can I become awakened?','What is awakening?'])assert.equal(identityReply(q),null);
});
test('skeptical English and Spanish prompts enter inquiry without changing ordinary questions',()=>{
 for(const q of ["I don't believe you",'Why should I trust you?','No creo en esto','Soy escéptico','Demuestra que es verdad'])assert.equal(inquiryMode(q),'examine',q);
 assert.equal(inquiryMode('I want to wake up'),'practice');assert.equal(inquiryMode('immersion'),null);
});
test('inquiry routes to evidence that examines belief and consequences',{skip:!existsSync('data/library.sqlite')},()=>{
 const db=openLibrary();try{
  for(const mode of ['examine','practice'])for(const id of inquiryAnchors(mode))assert.ok(passageById(db,id)?.synthesisAllowed,id);
  assert.match(passageById(db,'sc:sujato:mn95:9').text,/Such is my faith/);
  assert.match(passageById(db,'sc:sujato:an3.65:4').text,/know for yourselves/);
 }finally{db.close();}
});
