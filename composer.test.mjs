import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {dialoguePages} from './public/dialogue-pages.js';

function fixture(){
  const elements=new Map();
  const element=id=>{
    if(!elements.has(id))elements.set(id,{
      value:'',style:{},disabled:true,firstElementChild:{textContent:''},
      addEventListener(){},replaceChildren(){},append(){},focus(){this.focused=true;},
      setAttribute(){},showModal(){},close(){}
    });
    return elements.get(id);
  };
  const profile={player:{configured:true,name:'Test',language:'en',focus:'',notes:''},
    memory:{history:[],lastResponse:null,chatCount:0,learning:[]},teaching:null,meditation:null};
  let meditating=false;
  const sandbox=vm.createContext({
    document:{getElementById:element,createElement:()=>element(Symbol()),documentElement:{style:{setProperty(){}}}},
    window:{addEventListener(){}},matchMedia:()=>({matches:true}),
    t:x=>x,setLanguage(){},currentLanguage:()=> 'en',setAvatarState(){},dialoguePages,
    isMeditating:()=>meditating,initMeditationUI:async()=>{},localDay:()=> '2026-10-20',
    fetch:()=>new Promise(()=>{}),clearInterval(){},setInterval(){},
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
