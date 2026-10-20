import {currentLanguage} from './language.js';
import {setAvatarState} from './scene.js';
import {MeditationAudio} from './meditation-audio.js';
const $=id=>document.getElementById(id),audio=new MeditationAudio();
let state=null,received=0,initialized=false,active=false,working=false,hooks={},inviting=false;
const say=(en,es)=>currentLanguage()==='es'?es:en;
export const isMeditating=()=>active||inviting;
export function localDay(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
async function api(action,extra={}){
  const response=await fetch('/api/meditation'+(action?'':'?day='+localDay()),action?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,day:localDay(),...extra})}:{});
  const data=await response.json();if(!response.ok)throw Error(data.error);state=data;received=Date.now();return data;
}
function remaining(){if(!state?.session)return 0;return Math.max(0,state.session.target-state.session.elapsed-(state.session.status==='running'?(Date.now()-received)/1000:0));}
function settings(){return {minutes:Number($('med-minutes').value),reminderEnabled:$('med-reminder').checked,reminderTime:$('med-time').value,sound:$('med-sound').value,volume:Number($('med-volume').value)};}
function labels(){
  for(const [id,en,es] of [['meditation-title','Meditation','Meditación'],['med-minutes-label','Daily goal (minutes)','Meta diaria (minutos)'],['med-reminder-label','Daily invitation while the app is open','Invitación diaria mientras la aplicación está abierta'],['med-time-label','Local time','Hora local'],['med-sound-label','Sound','Sonido'],['med-volume-label','Volume','Volumen'],['med-save','Save','Guardar'],['med-preview','Hear the bell','Escuchar la campana'],['med-start','Begin / resume meditation','Comenzar / retomar la meditación']])$(id).textContent=say(en,es);
  $('open-meditation').title=say('Meditation','Meditación');$('open-meditation').setAttribute('aria-label',say('Meditation','Meditación'));
  const options=$('med-sound').options;options[0].text=say('Silence','Silencio');options[1].text=say('Occasional bells','Campanas ocasionales');options[2].text=say('Bells and soft breeze','Campanas y brisa suave');
}
function fill(){labels();if(!state)return;const s=state.settings;$('med-minutes').value=s.minutes;$('med-reminder').checked=s.reminderEnabled;$('med-time').value=s.reminderTime;$('med-sound').value=s.sound;$('med-volume').value=s.volume;
  $('med-progress').textContent=say(`Today: ${(state.completedSeconds/60).toFixed(1)} / ${s.minutes} minutes.`,`Hoy: ${(state.completedSeconds/60).toFixed(1)} / ${s.minutes} minutos.`);
}
function controls(){let row=$('meditation-controls');if(!row){row=document.createElement('div');row.id='meditation-controls';document.querySelector('.dialogue-controls').append(row);}return row;}
function button(text,callback){const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=callback;return b;}
function showSession(){
  active=true;inviting=false;$('send').disabled=true;$('question').disabled=true;$('next').hidden=true;$('reveal').hidden=true;
  document.querySelector('.scene-avatar').src='/assets/buddha-meditating.png';setAvatarState('meditating');
  $('reply').replaceChildren();const p=document.createElement('p');p.textContent=say('Let us sit quietly. This time is yours.','Sentémonos en silencio. Este tiempo es tuyo.');const timer=document.createElement('p');timer.id='meditation-clock';timer.setAttribute('aria-live','off');$('reply').append(p,timer);
  const row=controls();row.replaceChildren();
  row.append(button(state.session.status==='paused'?say('Resume','Retomar'):say('Pause','Pausar'),async()=>{if(working)return;working=true;try{await audio.arm();await api(state.session.status==='paused'?'resume':'pause');audio.volume(state.settings.volume);if(state.session?.status==='running')audio.ambient(state.settings.sound);else audio.stop();if(state.session)showSession();else await endView();}catch(e){$('meditation-clock').textContent=e.message;}finally{working=false;}}));
  row.append(button(say('Finish','Terminar'),()=>finish()));
  updateClock();
}
function updateClock(){const seconds=Math.ceil(remaining());if($('meditation-clock'))$('meditation-clock').textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}${state.session?.status==='paused'?say(' · paused',' · en pausa'):''}`;}
async function endView(){active=false;inviting=false;audio.stop();controls().replaceChildren();document.querySelector('.scene-avatar').src='/assets/buddha-retro.png';setAvatarState('idle');await hooks.onEnd?.();}
async function finish(){if(working||!active)return;working=true;try{const sound=state.settings.sound;await api('finish');if(sound!=='silent'){audio.bell();audio.bell(2);}await endView();fill();}catch(e){if($('meditation-clock'))$('meditation-clock').textContent=e.message;}finally{working=false;}}
async function begin(){if(working||hooks.isBusy?.())return;working=true;
  try{await audio.arm();await api('settings',{settings:settings()});await api(state.session?.status==='paused'?'resume':'start');audio.volume(state.settings.volume);audio.ambient(state.settings.sound);if(state.settings.sound!=='silent')audio.bell();$('meditation-dialog').close();showSession();}
  catch(e){$('med-status').textContent=e.message;}finally{working=false;}
}
async function tick(){
  if(!state||working)return;
  if(active){if(!state.session){await endView();return;}updateClock();if(state.session.status==='running'&&remaining()<=0)await finish();return;}
  if(document.hidden||hooks.isBusy?.()||document.querySelector('dialog[open]')||inviting)return;
  const now=new Date(),clock=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`,day=localDay();
  if(state.day!==day){await api();return;}
  if(state.settings.reminderEnabled&&state.reminded!==day&&clock>=state.settings.reminderTime&&state.completedSeconds<state.settings.minutes*60){
    working=true;try{await api('reminded');inviting=true;$('send').disabled=true;$('question').disabled=true;$('next').hidden=true;
      const p=document.createElement('p');p.textContent=say(`It is time to meditate. Shall we sit together for ${state.settings.minutes} minutes?`,`Es hora de meditar. ¿Nos sentamos juntos durante ${state.settings.minutes} minutos?`);$('reply').replaceChildren(p);
      if(state.settings.sound!=='silent')audio.bell();const row=controls();row.replaceChildren();row.append(button(say('Begin','Comenzar'),()=>{fill();begin();}),button(say('Later','Más tarde'),()=>endView()));
    }finally{working=false;}
  }
}
export async function initMeditationUI(callbacks){
  hooks=callbacks;
  if(initialized){if(!state)await refreshMeditation();return;}initialized=true;
  $('open-meditation').onclick=async()=>{if(hooks.isBusy?.())return;try{await api();fill();$('meditation-dialog').showModal();}catch(e){$('med-status').textContent=e.message;}};
  $('close-meditation').onclick=()=>$('meditation-dialog').close();
  $('med-start').onclick=begin;
  $('med-preview').onclick=async()=>{try{await audio.arm();audio.volume(Number($('med-volume').value));audio.bell();}catch(e){$('med-status').textContent=e.message;}};
  $('meditation-form').onsubmit=async e=>{e.preventDefault();try{await audio.arm();await api('settings',{settings:settings()});audio.volume(state.settings.volume);if(active)audio.ambient(state.settings.sound);fill();$('med-status').textContent=say('Saved. Reminders work while this app is open.','Guardado. Las invitaciones funcionan mientras la aplicación está abierta.');}catch(error){$('med-status').textContent=error.message;}};
  try{await api();fill();if(state.session)showSession();}catch(error){initialized=false;throw error;}
  setInterval(()=>tick().catch(error=>{$('med-status').textContent=error.message;}),1000);
}
export function resetMeditationUI(){state=null;active=false;inviting=false;audio.mute();controls().replaceChildren();document.querySelector('.scene-avatar').src='/assets/buddha-retro.png';setAvatarState('idle');}
export async function refreshMeditation(){await api();fill();}
