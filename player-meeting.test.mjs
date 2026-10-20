import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {initPlayers,getPlayer,updatePlayer,completeMeeting} from './lib/player.mjs';

test('meeting state persists per profile and existing players migrate as already met',()=>{
  const db=new DatabaseSync(':memory:');
  // A database from before first-meeting tracking.
  db.exec("CREATE TABLE players(id TEXT PRIMARY KEY,name TEXT NOT NULL DEFAULT '',focus TEXT NOT NULL DEFAULT '',notes TEXT NOT NULL DEFAULT '',created TEXT NOT NULL,language TEXT DEFAULT 'en',configured INTEGER DEFAULT 0); INSERT INTO players VALUES('old','Old','','','2026-01-01','en',1)");
  initPlayers(db);
  assert.equal(db.prepare("SELECT met_buddha FROM players WHERE id='old'").get().met_buddha,1);
  const first=getPlayer(db),second=getPlayer(db);
  updatePlayer(db,first.id,{name:'New',focus:'',notes:'',language:'en'});
  const read=id=>getPlayer(db,`bodhi_player=${id}`).met_buddha;
  assert.equal(read(first.id),0);
  completeMeeting(db,first.id);initPlayers(db);
  assert.equal(read(first.id),1);
  assert.equal(read(second.id),0);
  completeMeeting(db,second.id);
  assert.equal(read(second.id),0,'unconfigured profiles cannot complete an entrance');
  db.close();
});
