// Local 2D compositing: background, character, light and particles.
import { scenePhase } from './scene-time.js';
const scene = document.getElementById('living-scene');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
let paused = motion.matches;
let previewPhase='auto';
const symbols = {
  sunrise: 'A small lamp and rising light, inspired by Dhammapada 387.',
  morning: 'An opening lotus, inspired by Dhammapada 58–59.',
  midday: 'An eight-spoked wheel, inspired by the eightfold path in SN 56.11.',
  sunset: 'Falling leaves evoke impermanence, Dhammapada 277.',
  night: 'A moon emerging from clouds, inspired by Dhammapada 382.'
};
const atmosphere = document.createElement('div');
atmosphere.className = 'scene-atmosphere';atmosphere.setAttribute('aria-hidden','true');
atmosphere.innerHTML = `<div class="sky-light"></div><div class="celestial"></div><div class="cloud cloud-one"></div><div class="cloud cloud-two"></div><div class="stars"></div>
<svg class="teaching-symbol" viewBox="0 0 180 120" xmlns="http://www.w3.org/2000/svg">
<g class="symbol-lotus" stroke="#dcb8b7" stroke-width="1.5" fill="#ca8c9a"><path d="M90 96Q48 85 57 55Q82 58 90 96Q132 85 123 55Q98 58 90 96"/><path d="M90 96Q66 62 90 35Q114 62 90 96" fill="#eed2b6"/><path d="M90 96Q40 100 30 78Q64 71 90 96Q116 71 150 78Q140 100 90 96" fill="#78a295"/></g>
<g class="symbol-wheel" fill="none" stroke="#eed195" stroke-width="2"><circle cx="90" cy="65" r="37"/><circle cx="90" cy="65" r="31"/><circle cx="90" cy="65" r="7"/><path d="M90 28V102M53 65H127M64 39L116 91M64 91L116 39"/></g>
<g class="symbol-lamp"><path d="M62 89Q90 119 118 89Z" fill="#b99058"/><path d="M90 88Q71 75 91 49Q88 66 98 72Q105 84 90 88" fill="#ffdc91"/></g>
<g class="symbol-leaf" fill="#d8a45b" stroke="#f1c57d"><path d="M64 39Q126 27 114 70Q104 99 76 101Q47 76 64 39Z"/><path d="M62 115Q91 78 104 45" fill="none"/></g></svg>`;
scene.prepend(atmosphere);
const leaves=document.createElement('div');leaves.className='scene-leaves';leaves.setAttribute('aria-hidden','true');
for(let i=0;i<9;i++){
  const leaf=document.createElement('i');leaf.style.setProperty('--x',`${(i*31)%100}%`);
  leaf.style.setProperty('--delay',`${-i*4.3}s`);leaf.style.setProperty('--duration',`${22+i*2}s`);leaves.append(leaf);
}
scene.append(leaves);
function updateTime(){scene.dataset.phase=previewPhase==='auto'?scenePhase():previewPhase;scene.title=symbols[scene.dataset.phase]+(previewPhase==='auto'?' Local clock schedule.':' Debug preview.')+' Click to pause motion.';updatePause();}
document.getElementById('scene-preview').addEventListener('change',event=>{
  previewPhase=['sunrise','morning','midday','sunset','night'].includes(event.target.value)?event.target.value:'auto';
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
for (let i = 0; i < 12; i++) {
  const mote = document.createElement('i');
  mote.style.setProperty('--x', `${8 + (i * 37 % 86)}%`);
  mote.style.setProperty('--y', `${32 + (i * 17 % 56)}%`);
  mote.style.setProperty('--delay', `${-i * 2.7}s`);
  mote.style.setProperty('--duration', `${12 + i % 5 * 3}s`);
  motes.append(mote);
}
setAvatarState('idle');
updateTime();
