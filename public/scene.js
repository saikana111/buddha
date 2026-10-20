// Local 2D compositing: background, character, light and particles.
import { scenePhase } from './scene-time.js';
const scene = document.getElementById('living-scene');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
let paused = motion.matches;
let previewPhase='auto';
const symbols = {
  sunrise: 'Falling bodhi leaves evoke impermanence, Dhammapada 277.',
  morning: 'A bird rests on a branch, then flies without a trace, inspired by Dhammapada 92–93.',
  midday: 'A bee visits a lotus without harming it, inspired by Dhammapada 49 and 58–59.',
  sunset: 'An oil lamp in the gathering darkness, inspired by Dhammapada 146.',
  night: 'A moon emerging from clouds, inspired by Dhammapada 382.'
};
const atmosphere = document.createElement('div');
atmosphere.className = 'scene-atmosphere';atmosphere.setAttribute('aria-hidden','true');
const cloud = `<svg viewBox="0 0 120 28"><path fill="currentColor" d="M4 23Q1 18 12 17Q17 10 30 12Q35 3 49 6Q58 0 70 7Q84 6 89 14Q103 12 108 18Q120 18 116 23Q97 27 76 25H29Q12 26 4 23Z"/><path fill="#fff" opacity=".17" d="M25 16Q35 7 49 10Q60 3 70 10Q80 8 86 15Q65 12 52 15Q39 13 25 16Z"/></svg>`;
atmosphere.innerHTML = `<div class="sky-light"></div><div class="celestial"></div><div class="stars"></div><div class="cloud cloud-one">${cloud}</div><div class="cloud cloud-two">${cloud}</div>`;
scene.prepend(atmosphere);
// Original pixel-style props. Sources and artistic interpretation: docs/SCENE-SYMBOLISM.md.
const details=document.createElement('div');details.className='scene-details';details.setAttribute('aria-hidden','true');
details.innerHTML=`
<div class="morning-perch phase-detail"><svg class="morning-branch" viewBox="0 0 100 40" shape-rendering="crispEdges"><path fill="#493d29" d="M100 24H65v-3H39v-3H8v4h26v4h28v4h38z"/><path fill="#708b45" d="M20 17h-8v-4h8v-3h7v4h-7zM51 20h8v-5h8v-4H57v4h-6z"/></svg>
<svg class="morning-bird" viewBox="0 0 40 32" shape-rendering="crispEdges">
 <g class="bird-body"><path fill="#243b50" d="M6 22H2v-5h8v-5h9V5h12v4h4v10h-5v6H14v-3z"/><path fill="#e8c780" d="M19 15h12v7h-6v3h-9v-5h3z"/><path fill="#4b8091" d="M9 15h12v7H9z"/><path fill="#e8aa53" d="M35 10h5v3h-5zM17 25h2v4h-5v-2h3zM26 25h2v4h-5v-2h3z"/><path fill="#fff5d4" d="M29 8h3v3h-3z"/><path fill="#182932" d="M30 8h2v2h-2z"/></g>
 <path class="bird-wing" fill="#4b8091" d="M10 16V9H7V3h6v4h6v5h5v5z"/>
</svg></div>
<svg class="noon-lotus phase-detail" viewBox="0 0 100 64" shape-rendering="crispEdges">
 <path class="pond-ripple" fill="none" stroke="#97d7bd" stroke-width="1" d="M5 53h22m46 0h22M17 60h66"/>
 <path fill="#315e4a" d="M11 48h22v-3h36v3h20v8H11z"/><path fill="#6a9d65" d="M18 48h28v4H18zM59 47h22v5H59z"/>
 <g class="lotus-petals"><path fill="#b65783" d="M47 48H30v-5h-9V27h9v5h12zM53 48h17v-5h9V27h-9v5H58z"/><path fill="#e78da0" d="M48 48H37v-9h-6V19h8v7h8zM52 48h11v-9h6V19h-8v7h-8z"/><path fill="#ffcfb4" d="M44 43V19h3V9h6v10h3v24z"/><path fill="#f6c567" d="M42 44h16v5H42z"/></g>
</svg>
<svg class="noon-bee phase-detail" viewBox="0 0 24 20" shape-rendering="crispEdges"><g class="bee-wings" fill="#e4fff3" opacity=".85"><path d="M6 9V2h5v7zM13 9V1h5v8z"/></g><path fill="#332d32" d="M3 10h17v7H3z"/><path fill="#e6b54f" d="M5 10h4v7H5zM12 10h4v7h-4z"/><path fill="#fff1b6" d="M18 11h2v2h-2z"/></svg>
<svg class="evening-lamp phase-detail" viewBox="0 0 80 70" shape-rendering="crispEdges">
 <path fill="#201b2e" opacity=".5" d="M8 61h64v5H8z"/>
 <g class="lamp-flame"><path fill="#ed8b3e" d="M37 45V29h4V12h4v12h4v10h4v11z"/><path fill="#ffe1a0" d="M41 45V31h4v7h4v7z"/></g>
 <path fill="#713e39" d="M12 45h56v8h-6v6H23v-6h-6z"/><path fill="#c4814a" d="M12 44h56v5H12z"/><path fill="#e8b16a" d="M18 44h36v2H18z"/><path fill="#a26440" d="M28 59h27v4H28z"/>
</svg>`;
scene.append(details);
const leaves=document.createElement('div');leaves.className='scene-leaves';leaves.setAttribute('aria-hidden','true');
for(let i=0;i<6;i++){
  const leaf=document.createElement('i');leaf.style.setProperty('--x',`${65+(i*7)%31}%`);
  leaf.style.setProperty('--delay',`${-i*4.3}s`);leaf.style.setProperty('--duration',`${22+i*2}s`);leaves.append(leaf);
}
scene.append(leaves);
function updateTime(){scene.dataset.phase=previewPhase==='auto'?scenePhase():previewPhase;scene.title=symbols[scene.dataset.phase]+(previewPhase==='auto'?' Local clock schedule.':' Debug preview.')+' Click to pause motion.';updatePause();}
document.getElementById('scene-preview').addEventListener('change',event=>{
  previewPhase=['sunrise','morning','midday','sunset','night'].includes(event.target.value)?event.target.value:'auto';
  scene.dataset.preview=previewPhase==='auto'?'false':'true';
  updateTime();
});
export function setAvatarState(state) { scene.dataset.state = state; }
function updatePause() {
  scene.classList.toggle('paused', paused || document.hidden);
  scene.setAttribute('aria-label', `The Buddha beneath a bodhi tree at ${scene.dataset.phase || 'twilight'}. ${symbols[scene.dataset.phase] || ''} Animation ${paused ? 'paused' : 'playing'}. Click or press Space to ${paused ? 'play' : 'pause'}.`);
}
function toggle() { paused = !paused; updatePause(); }
scene.addEventListener('click', toggle);
scene.addEventListener('keydown', event => {
  if (event.code === 'Space' || event.code === 'Enter') { event.preventDefault(); toggle(); }
});
motion.addEventListener('change', event => { paused = event.matches; updatePause(); });
document.addEventListener('visibilitychange', updateTime);
setInterval(updateTime,30000);
const motes = scene.querySelector('.scene-motes');
for (let i = 0; i < 16; i++) {
  const mote = document.createElement('i');
  // Keep the glows near the pond and tree, clear of the central avatar.
  mote.style.setProperty('--x', `${i % 2 ? 70 + (i * 7 % 23) : 7 + (i * 7 % 24)}%`);
  mote.style.setProperty('--y', `${54 + (i * 13 % 35)}%`);
  mote.style.setProperty('--delay', `${-i * 2.7}s`);
  mote.style.setProperty('--duration', `${12 + i % 5 * 3}s`);
  motes.append(mote);
}
setAvatarState('idle');
updateTime();
