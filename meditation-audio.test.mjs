import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {MeditationAudio} from './public/meditation-audio.js';

test('stop disconnects looping and future voices even when a source cannot be stopped again',()=>{
 const audio=new MeditationAudio();let disconnected=0,stopped=0;
 const node=()=>({disconnect(){disconnected++;}});
 for(const throws of [false,true]){
  const source={...node(),stop(){stopped++;if(throws)throw Error('already ended');}};
  audio.track(source,node(),node());
 }
 audio.timers.push(setInterval(()=>{},10000));
 audio.stop();
 assert.equal(disconnected,6);assert.equal(stopped,2);
 assert.equal(audio.voices.size,0);assert.equal(audio.timers.length,0);
 audio.stop();assert.equal(stopped,2);
});

function fixture(){
 const elements=new Map(),events=new Map(),calls=[];
 const element=id=>{
  if(!elements.has(id))elements.set(id,{id,open:false,value:id==='med-sound'?'grove':'.25',options:[{},{},{}],
   addEventListener(name,fn){events.set(`${id}:${name}`,fn);},
   close(){this.open=false;events.get(`${id}:close`)?.();},showModal(){this.open=true;},
   replaceChildren(){},append(){},setAttribute(){}});
  return elements.get(id);
 };
 let resolveArm,resolveFinish;
 class Audio{
  constructor(){this.context={state:'running'};this.buffers={bell:{}};}
  arm(){return new Promise(resolve=>{resolveArm=resolve;});}
  stop(){calls.push('stop');}mute(){calls.push('mute');}
  volume(){}ambient(){calls.push('ambient');}bell(){calls.push('bell');}
 }
 const blank={settings:{minutes:10,sound:'grove',volume:.25},session:null,completedSeconds:0};
 const sandbox=vm.createContext({
  MeditationAudio:Audio,currentLanguage:()=> 'en',setAvatarState(){},Date,
  document:{getElementById:element,querySelector:element,createElement:element,addEventListener(){}},
  setInterval(){},fetch:async(url,options)=>{
   if(options?.body&&JSON.parse(options.body).action==='finish')await new Promise(resolve=>{resolveFinish=resolve;});
   return {ok:true,json:async()=>structuredClone(blank)};
  }
 });
 const source=readFileSync(new URL('./public/meditation.js',import.meta.url),'utf8')
  .replace(/^import .*;\r?\n/gm,'').replace(/\bexport /g,'');
 vm.runInContext(source,sandbox);
 return {calls,element,run:code=>vm.runInContext(code,sandbox),arm:()=>resolveArm(),finish:()=>resolveFinish()};
}
test('closing preview during audio loading prevents it from starting afterward',async()=>{
 const f=fixture();await f.run('initMeditationUI({})');
 f.element('meditation-dialog').open=true;
 const pending=f.element('med-preview').onclick();
 f.element('meditation-dialog').close();f.arm();await pending;
 assert.deepEqual(f.calls,['stop']);
});
test('exiting a sitting stops immediately before the request completes and plays no closing bell',async()=>{
 const f=fixture();await f.run('initMeditationUI({})');
 f.run("active=true;state.session={id:'test',status:'running',target:600,elapsed:10};");
 const pending=f.run('finish()');
 assert.deepEqual(f.calls,['stop']);
 // A delayed unlock callback must not restart the active sound while finishing.
 f.run('startSound()');assert.deepEqual(f.calls,['stop']);
 f.finish();await pending;
 assert.ok(!f.calls.includes('bell'));assert.ok(!f.calls.includes('ambient'));
 assert.equal(f.run('isMeditating()'),false);
});
