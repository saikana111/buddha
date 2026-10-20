import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {dialoguePages} from './public/dialogue-pages.js';

function fixture(){
  const elements=new Map();
  const element=id=>{
    if(!elements.has(id))elements.set(id,{
      value:'',style:{},dataset:{},disabled:true,firstElementChild:{textContent:''},
      addEventListener(){},replaceChildren(){},append(){},focus(){this.focused=true;},
      setAttribute(){},showModal(){},close(){}
    });
    return elements.get(id);
  };
  const profile={player:{configured:true,name:'Test',language:'en',focus:'',notes:''},
    memory:{history:[],lastResponse:null,chatCount:0,learning:[]},teaching:null,meditation:null};
  let meditating=false;
  const sandbox=vm.createContext({
    document:{getElementById:element,querySelector:()=>({decode:async()=>{}}),createElement:()=>element(Symbol()),documentElement:{style:{setProperty(){}}}},
    window:{addEventListener(){}},matchMedia:()=>({matches:true}),
    t:x=>x,setLanguage(){},currentLanguage:()=> 'en',setAvatarState(){},dialoguePages,
    isMeditating:()=>meditating,initMeditationUI:async()=>{},localDay:()=> '2026-10-20',
    fetch:()=>new Promise(()=>{}),clearInterval(){},setInterval(){},
    setTimeout:resolve=>resolve(),AbortSignal,AbortController,
  });
  vm.runInContext(readFileSync(new URL('./public/app.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,''),sandbox);
  sandbox.fetch=async()=>({ok:true,json:async()=>profile});
  vm.runInContext('configured=true;',sandbox);
  return {element,sandbox,restore:()=>vm.runInContext('restoreAfterMeditation()',sandbox),meditate:()=>{meditating=true;}};
}

test('ending meditation unlocks the composer even with no saved reply',async()=>{
  const f=fixture();await f.restore();
  assert.equal(f.element('question').disabled,false);
  assert.equal(f.element('send').disabled,false);
  assert.equal(f.element('question').focused,true);
});
test('failed profile refresh cannot strand the composer after meditation',async()=>{
  const f=fixture();f.sandbox.fetch=async()=>{throw Error('offline');};
  await assert.rejects(f.restore(),/offline/);
  assert.equal(f.element('question').disabled,false);
  assert.equal(f.element('send').disabled,false);
});
test('restoring a profile cannot unlock an active sitting',async()=>{
  const f=fixture();f.meditate();await f.restore();
  assert.equal(f.element('question').disabled,true);
});

test('Continue reveals unread text before asking the model for another turn',async()=>{
  const f=fixture();let requests=0;
  f.sandbox.fetch=async(_url,options)=>{
    requests++;assert.equal(JSON.parse(options.body).question,'Please continue.');
    return {ok:true,json:async()=>({paragraphs:[{text:'The next part.',ids:[]}],passages:[]})};
  };
  vm.runInContext(`render({paragraphs:[{text:Array.from({length:410},(_,i)=>'word'+i).join(' '),ids:[]}],passages:[]});`,f.sandbox);
  assert.equal(f.element('continue-dialogue').hidden,false);
  assert.equal(vm.runInContext('pages.length',f.sandbox),3);
  f.element('continue-dialogue').onclick();assert.equal(requests,0);
  assert.equal(vm.runInContext('pageIndex',f.sandbox),1);
  f.element('continue-dialogue').onclick();assert.equal(requests,0);
  await f.element('continue-dialogue').onclick();assert.equal(requests,1);
});

test('a long verse finishes its pages before showing next-verse navigation',()=>{
  const f=fixture();
  vm.runInContext(`verse=1;render({paragraphs:[{text:Array(220).fill('word').join(' '),ids:[]}],passages:[]});`,f.sandbox);
  assert.equal(f.element('next').hidden,true);
  assert.equal(f.element('continue-dialogue').hidden,false);
  f.element('continue-dialogue').onclick();
  assert.equal(f.element('next').hidden,false);
  assert.equal(f.element('continue-dialogue').hidden,true);
});

test('arrival shows the sourced opening without changing saved conversation history',async()=>{
  const f=fixture();
  f.sandbox.fetch=async()=>({ok:true,json:async()=>({passages:[{id:'dhp183',text:'To purify the mind.'}]})});
  vm.runInContext("history=[{role:'user',content:'Earlier question'}];",f.sandbox);
  await vm.runInContext('enterGrove()',f.sandbox);
  assert.equal(f.element('living-scene').dataset.arrival,'ready');
  assert.equal(f.element('question').disabled,false);
  assert.equal(f.element('continue-dialogue').hidden,true);
  assert.equal(vm.runInContext('history.length',f.sandbox),1);
  assert.equal(vm.runInContext('sources[0].id',f.sandbox),'dhp183');
});

test('failed opening fetch still reveals the avatar and unlocks writing',async()=>{
  const f=fixture();f.sandbox.fetch=async()=>{throw Error('offline');};
  await vm.runInContext('enterGrove()',f.sandbox);
  assert.equal(f.element('living-scene').dataset.arrival,'ready');
  assert.equal(f.element('question').disabled,false);
});

test('arrival respects an existing meditation session',async()=>{
  const f=fixture();f.meditate();let requests=0;
  f.sandbox.fetch=async()=>{requests++;};
  await vm.runInContext('enterGrove()',f.sandbox);
  assert.equal(requests,0);
  assert.equal(f.element('living-scene').dataset.arrival,'ready');
  assert.equal(f.element('question').disabled,true);
});

test('ordinary motion uses slow sprite blinks before revealing the opening',async()=>{
  const f=fixture();
  // Re-evaluate a motion-enabled fixture with the same controlled clock.
  const code=readFileSync(new URL('./public/app.js',import.meta.url),'utf8')
    .replace(/^import .*;\r?\n/gm,'').replace("const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;","const reduced=false;");
  const phases=[],timings=[],delays=[];
  const sandbox=vm.createContext({...f.sandbox,fetch:()=>new Promise(()=>{})});
  vm.runInContext(code,sandbox);
  sandbox.setAvatarState=()=>phases.push(f.element('living-scene').dataset.arrival);
  sandbox.setTimeout=(resolve,delay)=>{timings.push(f.element('question').disabled);delays.push(delay);resolve();};
  sandbox.fetch=async()=>({ok:false});
  vm.runInContext('configured=true;',sandbox);
  await vm.runInContext('enterGrove()',sandbox);
  assert.deepEqual(phases.slice(0,6),['waiting','glimpse','waiting','glimpse','waiting','ready']);
  assert.ok(timings.every(Boolean));
  assert.deepEqual(delays,[6000,650,650,650,650]);
});

test('returning players skip the entrance and keep the saved dialogue',async()=>{
  const f=fixture();let requests=0;
  f.sandbox.fetch=async()=>{requests++;throw Error('No entrance fetch expected');};
  vm.runInContext("hasMet=true;history=[{role:'assistant',content:'Our previous conversation'}];",f.sandbox);
  await vm.runInContext('enterGrove()',f.sandbox);
  assert.equal(requests,0);
  assert.equal(f.element('living-scene').dataset.arrival,'ready');
  assert.equal(f.element('question').disabled,false);
  assert.equal(vm.runInContext('history[0].content',f.sandbox),'Our previous conversation');
});

test('first meeting waits for image decoding and blinks even with ambient reduced motion',async()=>{
  const f=fixture(),phases=[];let decoded=false,markRequests=0;
  f.sandbox.document.querySelector=()=>({decode:async()=>{decoded=true;}});
  f.sandbox.setTimeout=resolve=>{assert.equal(decoded,true);resolve();};
  f.sandbox.setAvatarState=()=>phases.push(f.element('living-scene').dataset.arrival);
  f.sandbox.fetch=async url=>{
    if(url==='/api/profile/meeting')markRequests++;
    return {ok:true,json:async()=>({passages:[{id:'dhp183',text:'To purify the mind.'}]})};
  };
  await vm.runInContext('enterGrove()',f.sandbox);
  assert.deepEqual(phases.slice(0,6),['waiting','glimpse','waiting','glimpse','waiting','ready']);
  assert.equal(markRequests,1);
  assert.equal(vm.runInContext('hasMet',f.sandbox),true);
});

test('a stalled reply can be canceled and the composer and draft recover',async()=>{
  const f=fixture();
  f.sandbox.fetch=(_url,{signal})=>new Promise((resolve,reject)=>{
    signal.addEventListener('abort',()=>reject(signal.reason),{once:true});
  });
  const request=vm.runInContext("ask('Please continue.')",f.sandbox);
  assert.equal(f.element('question').disabled,true);
  assert.equal(f.element('cancel-reply').hidden,false);
  f.element('cancel-reply').onclick();
  await request;
  assert.equal(f.element('question').disabled,false);
  assert.equal(f.element('send').disabled,false);
  assert.equal(f.element('cancel-reply').hidden,true);
  assert.equal(f.element('question').value,'Please continue.');
  assert.equal(vm.runInContext('requestInFlight',f.sandbox),false);
});

test('timeout and disconnected-server errors cannot strand the composer',async()=>{
  for(const name of ['TimeoutError','TypeError']){
    const f=fixture();
    f.sandbox.fetch=async()=>{const error=new Error('Request failed');error.name=name;throw error;};
    await vm.runInContext("ask('What is happiness?')",f.sandbox);
    assert.equal(f.element('question').disabled,false);
    assert.equal(vm.runInContext('requestInFlight',f.sandbox),false);
    assert.equal(f.element('cancel-reply').hidden,true);
  }
});

test('waiting narration follows synthesis status and cannot overwrite a finished reply',async()=>{
  const f=fixture();let poll;const waiting={textContent:''};
  f.sandbox.waiting=waiting;
  f.sandbox.setInterval=callback=>{poll=callback;return 17;};
  vm.runInContext('replyController=new AbortController();watchReply(waiting,replyController);',f.sandbox);
  f.sandbox.fetch=async()=>({ok:true,json:async()=>({stage:'reflecting'})});
  await poll();
  assert.match(waiting.textContent,/seated man.*consider your question/);
  assert.doesNotMatch(waiting.textContent,/Buddha|enlightened/);
  vm.runInContext('replyController=null;',f.sandbox);
  waiting.textContent='Finished';
  await poll();
  assert.equal(waiting.textContent,'Finished');
});
