import {randomUUID,createHash} from 'node:crypto';
export const meditationDefaults={minutes:10,sound:'grove',volume:0.25};
export function initMeditation(db){db.exec(`CREATE TABLE IF NOT EXISTS meditation_settings(player_id TEXT PRIMARY KEY,settings TEXT NOT NULL,reminded TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS meditation_sessions(id TEXT PRIMARY KEY,player_id TEXT NOT NULL,day TEXT NOT NULL,status TEXT NOT NULL,seconds REAL NOT NULL,target INTEGER NOT NULL,started REAL NOT NULL);
CREATE INDEX IF NOT EXISTS meditation_player ON meditation_sessions(player_id,status);`);
 const columns=db.prepare('PRAGMA table_info(meditation_settings)').all().map(c=>c.name);
 if(!columns.includes('anchor'))db.exec('ALTER TABLE meditation_settings ADD COLUMN anchor REAL NOT NULL DEFAULT 0');
 if(!columns.includes('last_slot'))db.exec('ALTER TABLE meditation_settings ADD COLUMN last_slot INTEGER NOT NULL DEFAULT -1');
}
function normalized(s){return {minutes:Math.min(60,Math.max(1,Math.round(s.minutes||10))),sound:['silent','bells','grove'].includes(s.sound)?s.sound:'grove',volume:Number.isFinite(s.volume)?Math.min(1,Math.max(0,s.volume)):.25};}
function recordFor(db,id,now){
 db.prepare('INSERT OR IGNORE INTO meditation_settings(player_id,settings,anchor) VALUES(?,?,?)').run(id,JSON.stringify(meditationDefaults),now);
 db.prepare('UPDATE meditation_settings SET anchor=? WHERE player_id=? AND anchor=0').run(now,id);
 return db.prepare('SELECT * FROM meditation_settings WHERE player_id=?').get(id);
}
export function setHourlyMinutes(db,id,minutes,now=Date.now()){
 if(!Number.isInteger(minutes)||minutes<1||minutes>60)throw Error('Choose 1–60 meditation minutes per hour.');
 const record=recordFor(db,id,now),settings={...normalized(JSON.parse(record.settings)),minutes};
 db.prepare('UPDATE meditation_settings SET settings=? WHERE player_id=?').run(JSON.stringify(settings),id);
}
export function hourlySchedule(id,record,settings,now){
 const slot=Math.max(0,Math.floor((now-record.anchor)/3600000));
 const fraction=createHash('sha256').update(`${id}:${record.anchor}:${slot}`).digest().readUInt32BE(0)/0xffffffff;
 const dueAt=record.anchor+slot*3600000+Math.floor(fraction*(60-settings.minutes)*60000);
 return {slot,dueAt,due:slot>record.last_slot&&now>=dueAt};
}
function dayKey(day){if(!/^\d{4}-\d{2}-\d{2}$/.test(day||''))throw Error('Invalid local date');return day;}
export function sessionSeconds(session,now=Date.now()){return Math.min(session.target,Math.max(0,session.seconds+(session.status==='running'?Math.max(0,now-session.started)/1000:0)));}
export function meditationState(db,id,day,now=Date.now()){
  dayKey(day);const record=recordFor(db,id,now),settings=normalized(JSON.parse(record.settings));
  let session=db.prepare("SELECT * FROM meditation_sessions WHERE player_id=? AND status IN ('running','paused') ORDER BY rowid DESC LIMIT 1").get(id);
  if(session&&sessionSeconds(session,now)>=session.target){db.prepare("UPDATE meditation_sessions SET status='finished',seconds=target WHERE id=?").run(session.id);session=null;}
  const seconds=db.prepare("SELECT coalesce(sum(seconds),0) n FROM meditation_sessions WHERE player_id=? AND day=? AND status='finished'").get(id,day).n;
  return {settings,schedule:hourlySchedule(id,record,settings,now),session:session?{...session,elapsed:sessionSeconds(session,now),serverNow:now}:null,completedSeconds:seconds,day};
}
export function meditationCommand(db,id,data,now=Date.now()){
  const day=dayKey(data.day),state=meditationState(db,id,day,now),session=state.session;
  if(data.action==='settings'){
    const s=data.settings;
    if(!s||!['silent','bells','grove'].includes(s.sound)||!Number.isFinite(s.volume)||s.volume<0||s.volume>1)throw Error('Invalid meditation settings');
    db.prepare('UPDATE meditation_settings SET settings=? WHERE player_id=?').run(JSON.stringify({...state.settings,sound:s.sound,volume:s.volume}),id);
  }else if(data.action==='check'){
    if(!session&&state.schedule.due){
      db.exec('BEGIN IMMEDIATE');
      try{
        const claimed=db.prepare('UPDATE meditation_settings SET last_slot=? WHERE player_id=? AND last_slot<?').run(state.schedule.slot,id,state.schedule.slot);
        if(claimed.changes)db.prepare('INSERT INTO meditation_sessions VALUES(?,?,?,?,?,?,?)').run(randomUUID(),id,day,'running',0,state.settings.minutes*60,now);
        db.exec('COMMIT');
      }catch(e){db.exec('ROLLBACK');throw e;}
    }
  }else if(data.action==='pause'||data.action==='finish'){
    if(session)db.prepare('UPDATE meditation_sessions SET seconds=?,status=?,started=? WHERE id=? AND player_id=?').run(sessionSeconds(session,now),data.action==='finish'?'finished':'paused',now,session.id,id);
  }else if(data.action==='resume'){
    if(session?.status==='paused')db.prepare("UPDATE meditation_sessions SET status='running',started=? WHERE id=? AND player_id=?").run(now,session.id,id);
  }else throw Error('Unknown meditation action');
  return meditationState(db,id,day,now);
}
export function clearMeditation(db,id){db.prepare('DELETE FROM meditation_sessions WHERE player_id=?').run(id);db.prepare('DELETE FROM meditation_settings WHERE player_id=?').run(id);}
