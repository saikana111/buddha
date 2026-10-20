import {currentLanguage} from './language.js';
import {setAvatarState} from './scene.js';
import {MeditationAudio} from './meditation-audio.js';
const $=id=>document.getElementById(id),audio=new MeditationAudio();
let state=null,received=0,initialized=false,active=false,working=false,hooks={},lastCheck=0,audioSession=null;
const say=(en,es)=>currentLanguage()==='es'?es:en;
export const isMeditating=()=>active;
export function localDay(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
async function api(action,extra={}){
 const response=await fetch('/api/meditation'+(action?'':'?day='+localDay()),action?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,day:localDay(),...extra})}:{});
 const data=await response.json();if(!response.ok)throw Error(data.error);state=data;received=Date.now();return data;
}
function remaining(){if(!state?.session)return 0;return Math.max(0,state.session.target-state.session.elapsed-(state.session.status==='running'?(Date.now()-received)/1000:0));}
function settings(){return {sound:$('med-sound').value,volume:Number($('med-volume').value)};}
function fill(){
 for(const [id,en,es] of [['meditation-title','Meditation sound','Sonido de meditación'],['med-sound-label','Sound','Sonido'],['med-volume-label','Volume','Volumen'],['med-save','Save','Guardar'],['med-preview','Preview soundscape','Escuchar el ambiente']])$(id).textContent=say(en,es);
 const options=$('med-sound').options;options[0].text=say('Silence','Silencio');options[1].text=say('Temple bell','Campana de templo');options[2].text=say('Temple, bowls, flute and breeze','Templo, cuencos, flauta y brisa');
 if(!state)return;const s=state.settings;$('med-sound').value=s.sound;$('med-volume').value=s.volume;
 $('med-progress').textContent=say(`${s.minutes} minutes per hour. I will call you when it is time. Today: ${(state.completedSeconds/60).toFixed(1)} minutes.`,`${s.minutes} minutos por hora. Te llamaré cuando sea el momento. Hoy: ${(state.completedSeconds/60).toFixed(1)} minutos.`);
}
function controls(){let row=$('meditation-controls');if(!row){row=document.createElement('div');row.id='meditation-controls';document.querySelector('.dialogue-controls').append(row);}return row;}
function button(text,callback){const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=callback;return b;}
function startSound(){
 if(!state?.session||state.session.status!=='running'||audio.context?.state!=='running'||!audio.buffers.bell||audioSession===state.session.id)return;
 audio.volume(state.settings.volume);audio.ambient(state.settings.sound);if(state.settings.sound!=='silent')audio.bell();audioSession=state.session.id;
}
export async function armMeditationAudio(){
 try{await audio.arm();startSound();}
 catch{$('med-status').textContent=say('Audio could not load. Meditation can continue silently.','No se pudo cargar el audio. La meditación puede continuar en silencio.');}
}
function showSession(){
 active=true;$('send').disabled=true;$('question').disabled=true;$('next').hidden=true;$('reveal').hidden=true;
 document.querySelector('.scene-avatar').src='/assets/buddha-meditating.png';setAvatarState('meditating');
 $('reply').replaceChildren();const p=document.createElement('p');p.textContent=say(`It is time to meditate. Let us sit quietly for ${state.session.target/60} minutes.`,`Es hora de meditar. Sentémonos en silencio durante ${state.session.target/60} minutos.`);
 const timer=document.createElement('p');timer.id='meditation-clock';timer.setAttribute('aria-live','off');$('reply').append(p,timer);
 const row=controls();row.replaceChildren();
 row.append(button(state.session.status==='paused'?say('Resume','Retomar'):say('Pause','Pausar'),async()=>{
  if(working)return;working=true;const armed=armMeditationAudio();
  try{await api(state.session.status==='paused'?'resume':'pause');audio.stop();audioSession=null;await armed;if(state.session){showSession();startSound();}else await endView();}catch(e){$('meditation-clock').textContent=e.message;}finally{working=false;}
 }),button(say('End this sitting','Terminar esta sesión'),()=>finish()));
 updateClock();startSound();
}
function updateClock(){const seconds=Math.ceil(remaining());if($('meditation-clock'))$('meditation-clock').textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}${state.session?.status==='paused'?say(' · paused',' · en pausa'):''}`;}
async function endView(){active=false;audio.stop();audioSession=null;controls().replaceChildren();document.querySelector('.scene-avatar').src='/assets/buddha-retro.png';setAvatarState('idle');await hooks.onEnd?.();}
async function finish(){
 if(working||!active)return;working=true;
 try{const sound=state.settings.sound;await api('finish');await endView();if(sound!=='silent')audio.bell(.6);fill();}
 catch(e){if($('meditation-clock'))$('meditation-clock').textContent=e.message;}finally{working=false;}
}
async function tick(){
 if(!state||working)return;
 if(active){
  updateClock();if(state.session?.status==='running'&&remaining()<=0){await finish();return;}
  if(Date.now()-lastCheck>=15000){
   working=true;lastCheck=Date.now();
   try{
    const previous=state.session?.status;await api();
    if(!state.session)await endView();
    else if(previous!==state.session.status){audio.stop();audioSession=null;showSession();}
   }finally{working=false;}
  }
  return;
 }
 if(document.hidden||hooks.isBusy?.()||document.querySelector('dialog[open]')||$('question').value.trim()||Date.now()-lastCheck<10000)return;
 working=true;lastCheck=Date.now();
 try{await api('check');if(state.session)showSession();}
 finally{working=false;}
}
export async function initMeditationUI(callbacks){
 hooks=callbacks;if(initialized){await refreshMeditation();return;}initialized=true;
 // Browsers require a user gesture to unlock audio; subsequent scheduled starts are automatic.
 document.addEventListener('pointerdown',()=>{if(audio.context?.state!=='running'||!audio.buffers.bell)void armMeditationAudio();});
 document.addEventListener('keydown',()=>{if(audio.context?.state!=='running'||!audio.buffers.bell)void armMeditationAudio();});
 $('open-meditation').onclick=async()=>{if(hooks.isBusy?.())return;try{await api();fill();$('meditation-dialog').showModal();}catch(e){$('med-status').textContent=e.message;}};
 $('close-meditation').onclick=()=>$('meditation-dialog').close();
 $('meditation-dialog').addEventListener('close',()=>{if(!active)audio.stop();});
 $('med-preview').onclick=async()=>{
  try{await audio.arm();audio.volume(Number($('med-volume').value));audio.ambient($('med-sound').value);if($('med-sound').value!=='silent')audio.bell();}
  catch(e){$('med-status').textContent=e.message;}
 };
 $('meditation-form').onsubmit=async e=>{
  e.preventDefault();const armed=armMeditationAudio();
  try{await api('settings',{settings:settings()});await armed;audio.volume(state.settings.volume);if(active){audioSession=null;startSound();}else audio.stop();fill();$('med-status').textContent=say('Saved. Change minutes per hour in your profile.','Guardado. Cambia los minutos por hora en tu perfil.');}catch(error){$('med-status').textContent=error.message;}
 };
 try{await api();fill();if(state.session)showSession();}catch(error){initialized=false;throw error;}
 setInterval(()=>tick().catch(error=>{$('med-status').textContent=error.message;}),1000);
}
export function resetMeditationUI(){state=null;active=false;audioSession=null;audio.mute();controls().replaceChildren();document.querySelector('.scene-avatar').src='/assets/buddha-retro.png';setAvatarState('idle');}
export async function refreshMeditation(){await api();fill();}
