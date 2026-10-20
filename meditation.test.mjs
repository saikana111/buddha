import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {initMeditation,meditationState,meditationCommand,clearMeditation} from './lib/meditation.mjs';
test('meditation pauses accurately, survives reload, counts actual time and isolates profiles',()=>{
 const db=new DatabaseSync(':memory:');initMeditation(db);const day='2026-10-19',base=1000000;
 try{
  meditationCommand(db,'a',{action:'settings',day,settings:{minutes:2,reminderEnabled:true,reminderTime:'19:00',sound:'grove',volume:.25}},base);
  const initial=meditationCommand(db,'a',{action:'start',day},base);assert.equal(initial.session.target,120);
  const again=meditationCommand(db,'a',{action:'start',day},base+1000);assert.equal(again.session.id,initial.session.id);
  let s=meditationCommand(db,'a',{action:'pause',day},base+30000);assert.equal(s.session.elapsed,30);
  s=meditationState(db,'a',day,base+90000);assert.equal(s.session.elapsed,30);
  meditationCommand(db,'a',{action:'resume',day},base+90000);
  s=meditationCommand(db,'a',{action:'finish',day},base+100000);assert.equal(s.completedSeconds,40);assert.equal(s.session,null);
  assert.equal(meditationState(db,'b',day,base+100000).completedSeconds,0);
  assert.equal(meditationState(db,'a','2026-10-20',base+100000).completedSeconds,0);
  meditationCommand(db,'a',{action:'start',day},base+100000);
  s=meditationState(db,'a',day,base+300000);assert.equal(s.completedSeconds,160);assert.equal(s.session,null);
  assert.equal(meditationState(db,'a',day,base+400000).completedSeconds,160);
  s=meditationCommand(db,'a',{action:'reminded',day},base+400000);assert.equal(s.reminded,day);
  clearMeditation(db,'a');assert.equal(meditationState(db,'a',day).completedSeconds,0);
 }finally{db.close();}
});
test('meditation validates durations, sound modes and reminder times',()=>{
 const db=new DatabaseSync(':memory:');initMeditation(db);try{
 const settings={minutes:10,reminderEnabled:true,reminderTime:'19:00',sound:'bells',volume:.2};
 for(const patch of [{minutes:0},{minutes:121},{minutes:1.5},{reminderTime:'25:00'},{sound:'unknown'},{volume:2}])assert.throws(()=>meditationCommand(db,'a',{action:'settings',day:'2026-10-19',settings:{...settings,...patch}}));
 assert.throws(()=>meditationState(db,'a','bad-date'));
 }finally{db.close();}
});
