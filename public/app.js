import {t,setLanguage,currentLanguage} from './language.js';
import {initMeditationUI,isMeditating,resetMeditationUI,localDay,armMeditationAudio,refreshMeditation} from './meditation.js';
import { setAvatarState } from './scene.js';
import { dialoguePages } from './dialogue-pages.js';
const $=id=>document.getElementById(id);
let history=[],sources=[],verse=0,typing=null,finish=null,configured=false,requestInFlight=false,pages=[],pageIndex=0,canContinue=false;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let arriving=false,arrivalGeneration=0;
function arrivalState(state){$('living-scene').dataset.arrival=state;setAvatarState(isMeditating()?'meditating':'idle');}
async function enterGrove(){
  const generation=++arrivalGeneration;
  if(isMeditating()){arrivalState('ready');return;}
  arriving=true;clearInterval(typing);typing=null;finish=null;
  $('send').disabled=true;$('question').disabled=true;
  for(const id of ['next','continue-dialogue','reveal'])$(id).hidden=true;
  arrivalState('waiting');
  const narration=document.createElement('p');
  narration.textContent=currentLanguage()==='es'
    ?'Entre las hojas que susurran, distingues una silueta sentada bajo el árbol. Te acercas. Todo parece aquietarse.'
    :'Beyond the whispering leaves, you glimpse a seated silhouette beneath the tree. You draw closer. The grove seems to grow still.';
  $('reply').replaceChildren(narration);
  const valid=()=>generation===arrivalGeneration&&!isMeditating();
  const opening=fetch('/api/dhammapada?verse=183',{signal:AbortSignal.timeout(6000)})
    .then(r=>r.ok?r.json():null).catch(()=>null);
  try{
    await new Promise(resolve=>setTimeout(resolve,reduced?1800:3200));
    if(!valid())return;
    if(!reduced){
      // Slow, stepped sprite appearances, not rapid flashing.
      for(const state of ['glimpse','waiting','glimpse','waiting']){
        arrivalState(state);
        await new Promise(resolve=>setTimeout(resolve,550));
        if(!valid())return;
      }
    }
    arrivalState('ready');
    const result=await opening;if(!valid())return;
    arriving=false;
    const savedHistory=history.slice();
    render(result?.passages?.length?result:{notice:currentLanguage()==='es'?'Acércate. ¿Qué deseas comprender?':'Come closer. What do you wish to understand?'});
    history=savedHistory;
    canContinue=false;verse=0;
    if(!typing)unlock();
  }finally{
    if(generation===arrivalGeneration){
      arriving=false;arrivalState('ready');
      if(!typing)unlock();
    }
  }
}
function sourceButton(id){const b=document.createElement('button');b.className='citation';b.type='button';b.textContent='['+(sources.findIndex(p=>p.id===id)+1)+']';b.setAttribute('aria-label',t("Read source passage"));b.onclick=()=>openSource(id);return b;}
function openSource(id){const p=sources.find(p=>p.id===id);if(!p)return;const box=$('source-content');box.replaceChildren();const h=document.createElement('h2');h.textContent=p.title;const meta=document.createElement('small');meta.textContent=`${p.tradition} · ${p.collection} · ${p.translator}`;const q=document.createElement('blockquote');q.textContent=p.text;const a=document.createElement('a');a.href=p.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=t("Read the complete source ↗");const note=document.createElement('p');const small=document.createElement('small');small.textContent=t("The dialogue is an AI portrayal, not a historical quotation. This excerpt comes from the source text; its formatting is normalized. Attribution of speakers depends on the original context.");note.append(small);const provenance=document.createElement('details');const summary=document.createElement('summary');summary.textContent=t("Edition and original language");const pre=document.createElement('pre');pre.textContent=`${p.source} · ${p.license}\n${p.licenseStatement}\n\nSegments: ${p.segmentIds.join(', ')}\nRevision: ${p.commit}\n\n${p.original||'Original-language alignment is not available for this passage.'}`;provenance.append(summary,pre);box.append(h,meta,q,a,note,provenance);appendContext(box,p);$('source-dialog').showModal();}
$('close-source').onclick=()=>$('source-dialog').close();
function appendContext(box,passage){
 const es=currentLanguage()==='es',details=document.createElement('details'),summary=document.createElement('summary');
 summary.textContent=es?'Contexto y conceptos relacionados':'Surrounding text and related concepts';details.append(summary);box.append(details);
 let loaded=false;
 details.addEventListener('toggle',async()=>{
  if(!details.open||loaded)return;loaded=true;
  try{
   const response=await fetch('/api/context?id='+encodeURIComponent(passage.id));if(!response.ok)throw Error(es?'No se pudo cargar el contexto.':'Could not load context.');
   const data=await response.json();
   for(const p of data.passages){
    const label=document.createElement('small');label.textContent=(p.id===passage.id?(es?'Pasaje seleccionado':'Selected passage'):(es?'Pasaje contiguo':'Adjacent passage'))+` · ${p.id} · ${p.translator}`;
    const quote=document.createElement('blockquote');quote.textContent=p.text;details.append(label,quote);
   }
   if(data.original.length){
    const original=document.createElement('details'),title=document.createElement('summary');title.textContent=es?'Segmentos originales en pāli':'Aligned Pāli source segments';original.append(title);
    for(const s of data.original){const p=document.createElement('p');p.textContent=`${s.id} — ${s.text}`;original.append(p);}details.append(original);
   }
   if(data.connections.length){
    const note=document.createElement('p');note.textContent=es?'Relaciones propuestas, sin revisión académica; cada conexión pertenece a este pasaje.':'Proposed relationships, not yet scholarly reviewed; each connection is scoped to this passage.';details.append(note);
    for(const edge of data.connections){const p=document.createElement('p');p.textContent=`${edge.from} → ${edge.relation} → ${edge.to}`;const q=document.createElement('blockquote');q.textContent=edge.evidence.quote;details.append(p,q);}
   }
  }catch(error){loaded=false;const p=document.createElement('p');p.textContent=error.message;details.append(p);}
 });
}
function unlock(){if(!configured||isMeditating()||arriving)return;setAvatarState('idle');$('send').disabled=false;$('question').disabled=false;$('reveal').hidden=true;const morePages=pageIndex+1<pages.length;$('next').hidden=!verse||morePages;$('continue-dialogue').hidden=!canContinue||(!!verse&&!morePages);$('question').focus();}
async function restoreAfterMeditation(){
  // Restoring an empty history does not call render(), and profile fetches can fail.
  // Neither case may leave the composer locked after a completed sitting.
  try{await loadProfile(true);}finally{unlock();}
}
function render(result){sources=result.passages||[];const blocks=(result.paragraphs||[]).map(p=>({...p}));
  if(!blocks.length&&sources.length){for(const src of sources){const translated=result.translatedExcerpts?.find(p=>p.id===src.id);blocks.push({text:translated?.text||src.text,ids:[src.id],quote:true,note:currentLanguage()==='es'?t(translated?'Machine-assisted translation; original in the source.':'Source excerpt (English).'):''});}}
  canContinue=blocks.length>0;
  if(!blocks.length)blocks.push({text:result.notice||t("Could you tell me a little more?"),ids:[]});
  if(result.learningQuestion)blocks.push({text:result.learningQuestion,ids:[]});
  history.push({role:'assistant',content:blocks.map(b=>b.text).join('\n')});history=history.slice(-6);
  pages=dialoguePages(blocks);pageIndex=0;showDialoguePage();
}
function showDialoguePage(){
  const nodes=[];
  for(const block of pages[pageIndex]||[]){
    if(block.note){const note=document.createElement('small');note.textContent=block.note;nodes.push(note);}
    const p=document.createElement(block.quote?'blockquote':'p');p.textContent=block.text;
    for(const id of block.ids||[])p.append(sourceButton(id));nodes.push(p);
  }
  const spoken=nodes.map(n=>n.textContent).join('\n');
  $('send').disabled=true;$('question').disabled=true;$('continue-dialogue').hidden=true;
  const reply=$('reply');reply.replaceChildren();if(reply.parentElement)reply.parentElement.scrollTop=0;const all=()=>{clearInterval(typing);typing=null;reply.replaceChildren(...nodes);finish=null;unlock();};finish=all;
  if(reduced){all();return;}
  setAvatarState('speaking');$('reveal').hidden=false;const plain=document.createElement('p');reply.append(plain);let pos=0;typing=setInterval(()=>{pos+=5;plain.textContent=spoken.slice(0,pos);if(pos>=spoken.length)all();},15);
}
$('reveal').onclick=()=>finish?.();
$('continue-dialogue').onclick=()=>{
  if(isMeditating()||requestInFlight||typing)return;
  if(pageIndex+1<pages.length){pageIndex++;showDialoguePage();}
  else return ask(currentLanguage()==='es'?'Continúa, por favor.':'Please continue.');
};
async function ask(question,planId){if(isMeditating()||arriving)return;if(!configured){showWelcome();return;}requestInFlight=true;setAvatarState('listening');verse=0;const m=question.match(/(?:dhammapada|dhp)\s*(?:(?:verse|verso)\s*)?(\d{1,3})\b/i);if(m&&!/explain|mean|interpret|story|stories|background|commentary|explica|significa|historia|comentario/i.test(question))verse=Number(m[1]);if(/^\s*(read|recite|start|begin|teach me)\s+(the\s+)?dhammapada[.!?]?\s*$/i.test(question)){question='Dhammapada verse 1';verse=1;}
  $('send').disabled=true;$('question').disabled=true;$('next').hidden=true;$('continue-dialogue').hidden=true;const waiting=document.createElement('p');waiting.textContent='…';waiting.className='waiting';$('reply').replaceChildren(waiting);
  try{const r=await fetch('/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question,planId,history,localDate:localDay(),previousIds:sources.map(p=>p.id)})});const result=await r.json();if(!r.ok)throw Error(result.error);history.push({role:'user',content:question});render(result);}catch(e){verse=0;const p=document.createElement('p');p.textContent=t(e.message);$('reply').replaceChildren(p);unlock();}finally{requestInFlight=false;}
}
$('form').onsubmit=e=>{e.preventDefault();const q=$('question').value.trim();if(!q)return;$('question').value='';$('question').style.height='auto';ask(q);};
$('question').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();if(!$('send').disabled)$('form').requestSubmit();}};
$('question').oninput=()=>{$('question').style.height='auto';$('question').style.height=Math.min($('question').scrollHeight,130)+'px';};
$('next').onclick=()=>{if(verse<423)ask(`Dhammapada verse ${verse+1}`);else{$('next').hidden=true;verse=0;}};

// Keep the composer above mobile on-screen keyboards as well as browser chrome.
function fitViewport(){if(window.visualViewport && window.visualViewport.scale===1)document.documentElement.style.setProperty("--viewport-height",window.visualViewport.height+"px");}
window.visualViewport?.addEventListener("resize",fitViewport);
window.addEventListener("resize",fitViewport);
fitViewport();

async function loadProfile(restore=false){
  const response=await fetch('/api/profile?day='+localDay());if(!response.ok)throw Error(t("Could not load your profile."));
  const {player,memory,teaching,meditation}=await response.json();
  configured=!!player.configured;setLanguage(player.language);$('player-language').value=player.language;
  $('player-minutes').value=meditation?.settings.minutes||10;$('welcome-minutes').value=meditation?.settings.minutes||10;
  $('player-name').value=player.name;$('player-focus').value=player.focus;$('player-notes').value=player.notes;
  renderStudyPlans(teaching);
  if(meditation){const p=document.createElement('p');p.textContent=currentLanguage()==='es'?`Meditación de hoy: ${(meditation.completedSeconds/60).toFixed(1)} minutos (${meditation.settings.minutes} min/h).`:`Today's meditation: ${(meditation.completedSeconds/60).toFixed(1)} minutes (${meditation.settings.minutes} min/h).`;$('study-plans').prepend(p);}
  $('profile-status').textContent=currentLanguage()==='es'?`${memory.chatCount} conversaciones guardadas en este PC.`:`${memory.chatCount} conversations saved on this PC.`;
  $('learning-notes').replaceChildren();
  for(const item of memory.learning){const p=document.createElement('p');p.textContent=`${t(item.topic)}: ${item.discussions} ${t('discussions')}. ${item.needsReview?t('You mentioned difficulty; worth revisiting.'):t('Understanding not yet assessed.')}`;if(item.evidence){const small=document.createElement('small');small.textContent=` ${t('You said:')} ${item.evidence}`;p.append(small);}$('learning-notes').append(p);}
  $('past-chats').textContent=memory.history.map(m=>`${m.role==='user'?t('You'):t('Reply')}: ${m.content}`).join('\n\n');
  if(restore){history=memory.history;if(memory.lastResponse){render(memory.lastResponse);finish?.();history=memory.history;}else if(player.name){$('reply').firstElementChild.textContent=currentLanguage()==='es'?`Hola, ${player.name}. ${t('What is on your mind?')}`:`Welcome, ${player.name}. What is on your mind?`;}}
  if(configured)await initMeditationUI({isBusy:()=>arriving||requestInFlight||!!typing,onEnd:restoreAfterMeditation});
  return memory;
}
function showWelcome(){
  $('send').disabled=true;$('question').disabled=true;
  $('welcome-language').value=currentLanguage();
  if(!$('welcome-dialog').open)$('welcome-dialog').showModal();
}
function renderStudyPlans(teaching){
  const box=$('study-plans');box.replaceChildren();if(!teaching)return;
  const es=currentLanguage()==='es';
  const h=document.createElement('h3');h.textContent=es?'Planes de aprendizaje':'Learning plans';box.append(h);
  if(teaching.preferences.length){const p=document.createElement('p');p.textContent=(es?'Preferencias: ':'Preferences: ')+teaching.preferences.join(' · ');box.append(p);}
  if(!teaching.plans.length){const p=document.createElement('p');p.textContent=es?'Puedes decir: «Quiero estudiar el Dhammapada esta semana».':'Try: “I want to study the Dhammapada this week.”';box.append(p);}
  for(const plan of teaching.plans){
    const card=document.createElement('section'),title=document.createElement('h4');title.textContent=plan.topic;card.append(title);
    const summary=document.createElement('p');const timeframe=es?{today:'hoy',week:'esta semana',open:'sin fecha fija'}:{today:'today',week:'this week',open:'no fixed date'};
    const statuses=es?{active:'activo',paused:'pausado',completed:'lectura terminada'}:{active:'active',paused:'paused',completed:'reading finished'};
    summary.textContent=`${timeframe[plan.horizon]} · ${plan.localStartDate} · ${statuses[plan.status]} · ${Math.min(plan.cursor+1,plan.steps.length)}/${plan.steps.length}`;card.append(summary);
    const current=document.createElement('p');current.textContent=(es?'Concepto actual: ':'Current concept: ')+plan.steps[plan.cursor]?.title;card.append(current);
    const progress=document.createElement('p');const checked=plan.steps.filter(s=>s.status==='checked').length,review=plan.steps.filter(s=>['review','skipped'].includes(s.status)).length;
    progress.textContent=es?`${checked} comprobaciones provisionales; ${review} conceptos para repasar. El plazo es orientativo.`:`${checked} provisional understanding checks; ${review} concepts to revisit. The timeframe is a preference, not a deadline.`;card.append(progress);
    const list=document.createElement('ol');for(const step of plan.steps.slice(plan.cursor,plan.cursor+5)){const li=document.createElement('li');li.textContent=step.title;list.append(li);}list.start=plan.cursor+1;card.append(list);
    if(plan.status==='active'){const button=document.createElement('button');button.type='button';button.textContent=es?'Retomar este concepto':'Resume this concept';button.onclick=()=>{$('profile-dialog').close();ask(es?'retomar mi plan':'resume my plan');};card.append(button);
      const pause=document.createElement('button');pause.type='button';pause.textContent=es?'Pausar':'Pause';pause.onclick=()=>{$('profile-dialog').close();ask(es?'pausar mi plan':'pause my plan');};card.append(pause);}
    if(plan.status==='paused'){const resume=document.createElement('button');resume.type='button';resume.textContent=es?'Retomar':'Resume';resume.onclick=()=>{$('profile-dialog').close();ask(es?'retomar mi plan':'resume my plan',plan.id);};card.append(resume);}
    const reviewButton=document.createElement('button');reviewButton.type='button';reviewButton.textContent=es?'Repasar':'Review';reviewButton.onclick=()=>{$('profile-dialog').close();ask(es?'repasar mi plan':'review my plan',plan.id);};card.append(reviewButton);
    box.append(card);
  }
}
$('welcome-dialog').addEventListener('cancel',e=>e.preventDefault());
$('welcome-language').onchange=()=>setLanguage($('welcome-language').value);
$('welcome-form').onsubmit=async e=>{
  e.preventDefault();void armMeditationAudio();const name=$('welcome-name').value.trim();
  if(!name){$('welcome-status').textContent=t('Please enter a username.');return;}
  $('begin').disabled=true;$('welcome-status').textContent='';
  try{
    const r=await fetch('/api/profile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,meditationMinutes:Number($('welcome-minutes').value),language:$('welcome-language').value,focus:$('player-focus').value,notes:$('player-notes').value})});
    if(!r.ok)throw Error((await r.json()).error);
    await loadProfile();$('welcome-dialog').close();
    await enterGrove();
  }catch(error){$('welcome-status').textContent=t(error.message);}finally{$('begin').disabled=false;}
};
$('open-profile').onclick=async()=>{$('profile-dialog').showModal();try{await loadProfile();}catch(e){$('profile-status').textContent=t(e.message);}};
$('close-profile').onclick=()=>$('profile-dialog').close();
$('profile-form').onsubmit=async event=>{event.preventDefault();try{const r=await fetch('/api/profile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:$('player-name').value,meditationMinutes:Number($('player-minutes').value),focus:$('player-focus').value,notes:$('player-notes').value,language:$('player-language').value})});if(!r.ok)throw Error((await r.json()).error);setLanguage($('player-language').value);await refreshMeditation();$('profile-status').textContent=t("Saved.");}catch(e){$('profile-status').textContent=t(e.message);}};
$('forget-profile').onclick=async()=>{if(!confirm(t("Delete this player’s saved profile and all their conversations?")))return;try{const r=await fetch('/api/profile',{method:'DELETE'});if(!r.ok)throw Error(t("Could not forget this profile."));arrivalGeneration++;arriving=false;arrivalState('waiting');resetMeditationUI();history=[];sources=[];verse=0;clearInterval(typing);finish=null;$('reply').replaceChildren();const p=document.createElement('p');p.textContent=t("What is on your mind?");$('reply').append(p);await loadProfile();$('profile-dialog').close();showWelcome();}catch(e){$('profile-status').textContent=t(e.message);}};
// Establish the cookie before allowing the first conversation to avoid racing identities.
$('send').disabled=true;$('question').disabled=true;
loadProfile().then(async memory=>{history=memory.history;if(!configured)showWelcome();else await enterGrove();}).catch(e=>{showWelcome();$('welcome-status').textContent=t(e.message);});
