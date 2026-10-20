import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {initMeditation,meditationState,meditationCommand,clearMeditation,setHourlyMinutes} from './lib/meditation.mjs';
import {initPlayers,getPlayer,updatePlayer} from './lib/player.mjs';
const day='2026-10-20',base=1000000;
test('hourly invitation starts only when due and claims once across reloads and checks',()=>{
 const db=new DatabaseSync(':memory:');initMeditation(db);
 try{
  setHourlyMinutes(db,'a',10,base);
  const initial=meditationState(db,'a',day,base),due=initial.schedule.dueAt;
  assert.ok(due>=base&&due<=base+50*60000);
  assert.equal(meditationCommand(db,'a',{action:'check',day},due-1).session,null);
  const started=meditationCommand(db,'a',{action:'check',day},due);assert.equal(started.session.target,600);
  assert.equal(meditationCommand(db,'a',{action:'check',day},due+1000).session.id,started.session.id);
  meditationCommand(db,'a',{action:'finish',day},due+30000);
  assert.equal(meditationCommand(db,'a',{action:'check',day},due+31000).session,null);
  initMeditation(db);assert.equal(meditationState(db,'a',day,due+31000).schedule.due,false);
  // An edit preserves the already claimed hour.
  setHourlyMinutes(db,'a',20,due+32000);assert.equal(meditationCommand(db,'a',{action:'check',day},due+33000).session,null);
  const next=meditationState(db,'a',day,base+3600000);assert.equal(next.schedule.slot,1);
  assert.equal(meditationCommand(db,'a',{action:'check',day},next.schedule.dueAt).session.target,1200);
  assert.equal(meditationState(db,'b',day,base).completedSeconds,0);
 }finally{db.close();}
});
test('automatic sessions pause, resume, cap elapsed time, and skip missed hours',()=>{
 const db=new DatabaseSync(':memory:');initMeditation(db);
 try{
  setHourlyMinutes(db,'a',2,base);
  const due=meditationState(db,'a',day,base).schedule.dueAt;
  meditationCommand(db,'a',{action:'check',day},due);
  let s=meditationCommand(db,'a',{action:'pause',day},due+30000);assert.equal(s.session.elapsed,30);
  assert.equal(meditationState(db,'a',day,due+90000).session.elapsed,30);
  meditationCommand(db,'a',{action:'resume',day},due+90000);
  s=meditationCommand(db,'a',{action:'finish',day},due+100000);assert.equal(s.completedSeconds,40);
  const later=meditationState(db,'a',day,base+10*3600000);
  assert.equal(later.schedule.slot,10);
  meditationCommand(db,'a',{action:'check',day},later.schedule.dueAt);
  s=meditationState(db,'a',day,later.schedule.dueAt+300000);assert.equal(s.completedSeconds,160);assert.equal(s.session,null);
  assert.equal(meditationCommand(db,'a',{action:'check',day},later.schedule.dueAt+300001).session,null);
  clearMeditation(db,'a');assert.equal(meditationState(db,'a',day).completedSeconds,0);
 }finally{db.close();}
});
test('old daily settings migrate, profile saves hourly duration, and manual start is rejected',()=>{
 const db=new DatabaseSync(':memory:');
 db.exec("CREATE TABLE meditation_settings(player_id TEXT PRIMARY KEY,settings TEXT NOT NULL,reminded TEXT NOT NULL DEFAULT '')");
 db.prepare('INSERT INTO meditation_settings VALUES(?,?,?)').run('old',JSON.stringify({minutes:120,sound:'grove',volume:.2,reminderEnabled:false}),'2026-10-19');
 initPlayers(db);
 try{
  assert.equal(meditationState(db,'old',day,base).settings.minutes,60);
  const p=getPlayer(db),profile={name:'Test',focus:'',notes:'',language:'es',meditationMinutes:7};
  updatePlayer(db,p.id,profile);assert.equal(meditationState(db,p.id,day).settings.minutes,7);
  updatePlayer(db,p.id,{...profile,meditationMinutes:12});assert.equal(meditationState(db,p.id,day).settings.minutes,12);
  for(const minutes of [0,61,2.5,'10',null])assert.throws(()=>updatePlayer(db,p.id,{...profile,meditationMinutes:minutes}));
  assert.equal(meditationState(db,p.id,day).settings.minutes,12);
  assert.throws(()=>meditationCommand(db,p.id,{action:'start',day}));
  for(const settings of [{sound:'unknown',volume:.2},{sound:'grove',volume:2}])assert.throws(()=>meditationCommand(db,p.id,{action:'settings',day,settings}));
 }finally{db.close();}
});
