import {randomUUID} from 'node:crypto';
export const meditationDefaults={minutes:10,reminderEnabled:false,reminderTime:'19:00',sound:'bells',volume:0.25};
export function initMeditation(db){db.exec(`CREATE TABLE IF NOT EXISTS meditation_settings(player_id TEXT PRIMARY KEY,settings TEXT NOT NULL,reminded TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS meditation_sessions(id TEXT PRIMARY KEY,player_id TEXT NOT NULL,day TEXT NOT NULL,status TEXT NOT NULL,seconds REAL NOT NULL,target INTEGER NOT NULL,started REAL NOT NULL);
CREATE INDEX IF NOT EXISTS meditation_player ON meditation_sessions(player_id,status);`);}
function dayKey(day){if(!/^\d{4}-\d{2}-\d{2}$/.test(day||''))throw Error('Invalid local date');return day;}
export function sessionSeconds(session,now=Date.now()){return Math.min(session.target,Math.max(0,session.seconds+(session.status==='running'?Math.max(0,now-session.started)/1000:0)));}
export function meditationState(db,id,day,now=Date.now()){
  dayKey(day);const record=db.prepare('SELECT * FROM meditation_settings WHERE player_id=?').get(id);
  let session=db.prepare("SELECT * FROM meditation_sessions WHERE player_id=? AND status IN ('running','paused') ORDER BY rowid DESC LIMIT 1").get(id);
  if(session&&sessionSeconds(session,now)>=session.target){db.prepare("UPDATE meditation_sessions SET status='finished',seconds=target WHERE id=?").run(session.id);session=null;}
  const seconds=db.prepare("SELECT coalesce(sum(seconds),0) n FROM meditation_sessions WHERE player_id=? AND day=? AND status='finished'").get(id,day).n;
  return {settings:record?JSON.parse(record.settings):{...meditationDefaults},reminded:record?.reminded||'',session:session?{...session,elapsed:sessionSeconds(session,now),serverNow:now}:null,completedSeconds:seconds,day};
}
export function meditationCommand(db,id,data,now=Date.now()){
  const day=dayKey(data.day),state=meditationState(db,id,day,now),session=state.session;
  if(data.action==='settings'){
    const s=data.settings;
    if(!s||!Number.isInteger(s.minutes)||s.minutes<1||s.minutes>120||typeof s.reminderEnabled!=='boolean'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.reminderTime)||!['silent','bells','grove'].includes(s.sound)||!Number.isFinite(s.volume)||s.volume<0||s.volume>1)throw Error('Invalid meditation settings');
    const settings={minutes:s.minutes,reminderEnabled:s.reminderEnabled,reminderTime:s.reminderTime,sound:s.sound,volume:s.volume};
    db.prepare('INSERT INTO meditation_settings(player_id,settings) VALUES(?,?) ON CONFLICT(player_id) DO UPDATE SET settings=excluded.settings').run(id,JSON.stringify(settings));
  }else if(data.action==='reminded'){
    db.prepare('INSERT INTO meditation_settings VALUES(?,?,?) ON CONFLICT(player_id) DO UPDATE SET reminded=excluded.reminded').run(id,JSON.stringify(state.settings),day);
  }else if(data.action==='start'){
    if(!session)db.prepare('INSERT INTO meditation_sessions VALUES(?,?,?,?,?,?,?)').run(randomUUID(),id,day,'running',0,state.settings.minutes*60,now);
  }else if(data.action==='pause'||data.action==='finish'){
    if(session)db.prepare('UPDATE meditation_sessions SET seconds=?,status=?,started=? WHERE id=? AND player_id=?').run(sessionSeconds(session,now),data.action==='finish'?'finished':'paused',now,session.id,id);
  }else if(data.action==='resume'){
    if(session?.status==='paused')db.prepare("UPDATE meditation_sessions SET status='running',started=? WHERE id=? AND player_id=?").run(now,session.id,id);
  }else throw Error('Unknown meditation action');
  return meditationState(db,id,day,now);
}
export function clearMeditation(db,id){db.prepare('DELETE FROM meditation_sessions WHERE player_id=?').run(id);db.prepare('DELETE FROM meditation_settings WHERE player_id=?').run(id);}
