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
      addEventListener(){},replaceChildren(...nodes){this.children=nodes;this.firstElementChild=nodes[0]||null;},append(...nodes){this.children=[...(this.children||[]),...nodes];},focus(){this.focused=true;},
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
  assert.deepEqual(phases.slice(0,8),['waiting','glimpse','waiting','glimpse','waiting','glimpse','waiting','ready']);
  assert.ok(timings.every(Boolean));
  assert.deepEqual(delays,[6000,220,220,220,220,850,280]);
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
  assert.deepEqual(phases.slice(0,8),['waiting','glimpse','waiting','glimpse','waiting','glimpse','waiting','ready']);
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

test('Spanish translates only the visible source page, caches it, and preserves English sources',async()=>{
  const f=fixture();f.sandbox.currentLanguage=()=> 'es';let requests=0;
  vm.runInContext("sources=[{id:'p',text:Array.from({length:320},(_,i)=>'word'+i).join(' ')}];pages=dialoguePages([{text:sources[0].text,ids:['p'],quote:true}],150);pageIndex=0;canContinue=true;",f.sandbox);
  f.sandbox.fetch=async(url,options)=>{
    requests++;assert.equal(url,'/api/translate-page');
    const blocks=JSON.parse(options.body).blocks;
    assert.equal(blocks[0].text.split(' ').length,150);
    return {ok:true,json:async()=>({translations:[{index:0,text:'Una enseñanza traducida.'}]})};
  };
  await vm.runInContext('showDialoguePage()',f.sandbox);
  assert.equal(requests,1);
  assert.equal(f.element('question').disabled,false);
  assert.equal(f.element('reply').children[1].textContent,'Una enseñanza traducida.');
  assert.match(vm.runInContext('sources[0].text',f.sandbox),/^word0 /);
  await vm.runInContext('showDialoguePage()',f.sandbox);
  assert.equal(requests,1,'rereading does not regenerate translation');
  vm.runInContext('pageIndex++;',f.sandbox);
  await vm.runInContext('showDialoguePage()',f.sandbox);
  assert.equal(requests,2,'the next page translates on demand');
  f.sandbox.currentLanguage=()=> 'en';
  await vm.runInContext('showDialoguePage()',f.sandbox);
  assert.match(f.element('reply').children[0].textContent,/^word150 /);
  assert.equal(requests,2);
});

test('canceling live translation restores the readable original and composer',async()=>{
  const f=fixture();f.sandbox.currentLanguage=()=> 'es';
  vm.runInContext("pages=[[{text:'The English source.',ids:['p'],quote:true}]];pageIndex=0;",f.sandbox);
  f.sandbox.fetch=(_url,{signal})=>new Promise((resolve,reject)=>{
    signal.addEventListener('abort',()=>reject(signal.reason),{once:true});
  });
  const pending=vm.runInContext('showDialoguePage()',f.sandbox);
  assert.equal(f.element('question').disabled,true);
  f.element('cancel-reply').onclick();
  await pending;
  assert.equal(f.element('question').disabled,false);
  assert.equal(f.element('retry-translation').hidden,false);
  assert.equal(f.element('reply').children[1].textContent,'The English source.');
});

test('a delayed Spanish translation cannot overwrite a later English view',async()=>{
  const f=fixture();f.sandbox.currentLanguage=()=> 'es';let resolve;
  vm.runInContext("pages=[[{text:'The English source.',ids:['p'],quote:true}]];pageIndex=0;",f.sandbox);
  f.sandbox.fetch=()=>new Promise(r=>{resolve=r;});
  const pending=vm.runInContext('showDialoguePage()',f.sandbox);
  await Promise.resolve(); // The shared translator starts work through its queue.
  f.sandbox.currentLanguage=()=> 'en';
  await vm.runInContext('showDialoguePage()',f.sandbox);
  resolve({ok:true,json:async()=>({translations:[{index:0,text:'La fuente.'}]})});
  await pending;
  assert.equal(f.element('reply').children[0].textContent,'The English source.');
  assert.equal(f.element('question').disabled,false);
});

test('Spanish citations reuse the dialogue translation and keep English in a collapsed optional view',async()=>{
  const f=fixture();f.sandbox.currentLanguage=()=> 'es';let requests=0;
  f.sandbox.fetch=async()=>{
    requests++;return {ok:true,json:async()=>({translations:[{index:0,text:'Una enseñanza.'}]})};
  };
  vm.runInContext("sources=[{id:'p',text:'A teaching.'}];pages=[[{text:'A teaching.',ids:['p'],quote:true}]];pageIndex=0;",f.sandbox);
  await vm.runInContext('showDialoguePage()',f.sandbox);
  const widget=vm.runInContext("citationText(document.createElement('div'),sources[0],new AbortController().signal)",f.sandbox);
  await widget.ready;
  assert.equal(requests,1);
  assert.equal(widget.quote.textContent,'Una enseñanza.');
  assert.ok(!widget.original.open);
  assert.equal(widget.original.children[0].textContent,'Ver original en inglés');
  assert.equal(widget.original.children[1].textContent,'A teaching.');
});

test('long citations translate only requested pages and reuse earlier pages',async()=>{
  const f=fixture();f.sandbox.currentLanguage=()=> 'es';let requests=0;
  f.sandbox.fetch=async(_url,options)=>{
    requests++;const {blocks}=JSON.parse(options.body);
    assert.equal(blocks[0].text.split(' ').length,150);
    return {ok:true,json:async()=>({translations:[{index:0,text:'Página '+requests}]})};
  };
  const widget=vm.runInContext("citationText(document.createElement('div'),{id:'p',text:Array.from({length:310},(_,i)=>'word'+i).join(' ')},new AbortController().signal)",f.sandbox);
  await widget.ready;assert.equal(requests,1);
  await widget.next.onclick();assert.equal(requests,2);
  await widget.previous.onclick();assert.equal(requests,2);
  assert.equal(widget.quote.textContent,'Página 1');
});

test('closing a citation cancels queued translations without poisoning later requests',async()=>{
  const f=fixture();f.sandbox.currentLanguage=()=> 'es';let requests=0;
  f.sandbox.fetch=(_url,{signal})=>{requests++;return new Promise((resolve,reject)=>{
    signal.addEventListener('abort',()=>reject(signal.reason),{once:true});
  });};
  const widgets=vm.runInContext("sourceController=new AbortController();[citationText(document.createElement('div'),{id:'p',text:'One.'},sourceController.signal),citationText(document.createElement('div'),{id:'p',text:'Two.'},sourceController.signal)]",f.sandbox);
  await Promise.resolve();
  f.element('close-source').onclick();
  await Promise.all(widgets.map(w=>w.ready));
  assert.equal(requests,1,'the queued second passage is never sent after closing');
  f.sandbox.fetch=async()=>({ok:true,json:async()=>({translations:[{index:0,text:'Otra enseñanza.'}]})});
  const next=vm.runInContext("citationText(document.createElement('div'),{id:'p',text:'Three.'},new AbortController().signal)",f.sandbox);
  await next.ready;
  assert.equal(next.quote.textContent,'Otra enseñanza.');
});

test('Back revisits long replies locally and stops at the first page',async()=>{
  const f=fixture();let requests=0;
  f.sandbox.fetch=async()=>{requests++;throw Error('Paging must not call the model');};
  vm.runInContext("render({paragraphs:[{text:Array.from({length:420},(_,i)=>'word'+i).join(' '),ids:[]}],passages:[]});",f.sandbox);
  assert.equal(f.element('back-dialogue').hidden,true);
  f.element('continue-dialogue').onclick();
  assert.equal(f.element('back-dialogue').hidden,false);
  await f.element('back-dialogue').onclick();
  assert.equal(vm.runInContext('pageIndex',f.sandbox),0);
  assert.match(f.element('reply').children[0].textContent,/^word0 /);
  assert.equal(f.element('back-dialogue').hidden,true);
  await f.element('back-dialogue').onclick();
  assert.equal(vm.runInContext('pageIndex',f.sandbox),0);
  assert.equal(requests,0);
});

test('Back preserves earlier source chunks and their citations after Continue fetches more',async()=>{
  const f=fixture();
  vm.runInContext("render({sourceFirst:true,sourceThread:{topic:'happiness'},passages:[{id:'first',text:'The first part.'}]});",f.sandbox);
  f.sandbox.fetch=async()=>({ok:true,json:async()=>({
    sourceFirst:true,sourceThread:{topic:'happiness'},passages:[{id:'second',text:'The second part.'}]
  })});
  await f.element('continue-dialogue').onclick();
  assert.equal(vm.runInContext('pages.length',f.sandbox),2);
  assert.equal(vm.runInContext('pageIndex',f.sandbox),1);
  await f.element('back-dialogue').onclick();
  assert.equal(f.element('reply').children[0].textContent,'The first part.');
  assert.equal(vm.runInContext("sources.find(p=>p.id==='first').text",f.sandbox),'The first part.');
  vm.runInContext("render({paragraphs:[{text:'A new topic.',ids:[]}],passages:[]});",f.sandbox);
  assert.equal(f.element('back-dialogue').hidden,true);
  assert.equal(vm.runInContext('pages.length',f.sandbox),1);
});
