import test from 'node:test';
import assert from 'node:assert/strict';
import {expandsPrevious,sourceFirstReply,questionScope,quoteResult,attachSourceThread,continueSourceThread} from './lib/source-first.mjs';
import {openLibrary,passageById} from './lib/corpus.mjs';

const verse={id:'verse',text:'A line of verse;\nanother line.',collection:'dhp',synthesisAllowed:true};
const story={id:'story',text:'“Suppose there were a raft,” he said. What would you do?',synthesisAllowed:true};
test('source-first replies copy selected source bytes without model rewriting or truncation',async()=>{
  const long={...story,text:story.text.repeat(200)};
  let calls=0;
  const result=await sourceFirstReply('How should I let go?',[verse,long],async()=>{
    calls++;return {ids:['story']};
  });
  assert.equal(calls,1);
  assert.deepEqual(result.paragraphs.map(p=>p.text),[long.text]);
  assert.ok(result.paragraphs.every(p=>p.quote));
  assert.equal(result.sourceFirst,true);
});

test('scope follows meaning rather than question length',()=>{
  assert.equal(questionScope('What is happiness?'),'broad');
  assert.equal(questionScope('¿Qué es la felicidad?'),'broad');
  assert.equal(questionScope('What does this particular word mean in the passage you just showed me?'),'focused');
  assert.equal(questionScope('What is happiness? One short verse, please.'),'focused');
});

test('follow-ups select unused sources instead of automatically generating explanations',async()=>{
  let offered;
  const result=await sourceFirstReply('Explain that',[verse,story],async(messages,schema)=>{
    offered=schema.properties.ids.items.enum;return {ids:['story']};
  },'en',{seen:['verse'],scope:'focused'});
  assert.deepEqual(offered,['story']);
  assert.equal(result.paragraphs[0].text,story.text);
  assert.equal(await sourceFirstReply('Explain that',[verse],()=>{throw Error('No unseen sources');},'en',{seen:['verse']}),null);
});

test('broad questions try substantial narratives first, but do not force an irrelevant story',async()=>{
  const long={...story,text:story.text.repeat(30)};
  const offers=[];
  const result=await sourceFirstReply('What is happiness?',[verse,long],async(_messages,schema)=>{
    const ids=schema.properties.ids.items.enum;offers.push(ids);
    return {ids:ids.includes('verse')?['verse']:[]};
  });
  assert.deepEqual(offers,[['story'],['verse','story']]);
  assert.equal(result.passages[0].id,'verse');
});

test('broad stories continue through ordered same-edition chunks with no model call',()=>{
  const db=openLibrary(':memory:');
  try{
    const addDoc=(id,collection)=>db.prepare('INSERT INTO documents VALUES(?,?,?,?,?,?)').run(id,id,'Pāli',collection,'test',JSON.stringify({synthesisAllowed:true}));
    addDoc('story','sn');addDoc('verse','dhp');addDoc('other-edition','sn');
    const add=(id,doc,n,text)=>db.prepare('INSERT INTO passages VALUES(?,?,?,?,?,?,?)').run(id,doc,n,text,id,'[]','');
    for(let n=1;n<=5;n++)add('s'+n,'story',n,'Suppose a traveler. Part '+n);
    add('v1','verse',1,'A short poem.');add('v2','verse',2,'An unrelated poem.');
    add('other','other-edition',1,'An alternate translation.');
    let result=attachSourceThread(db,quoteResult([passageById(db,'s1')]),{topic:'What is happiness?',scope:'broad',extend:true});
    assert.deepEqual(result.passages.map(p=>p.id),['s1','s2']);
    result=continueSourceThread(db,result);
    assert.deepEqual(result.passages.map(p=>p.id),['s3','s4']);
    result=continueSourceThread(db,result);
    assert.deepEqual(result.passages.map(p=>p.id),['s5']);
    assert.deepEqual(result.sourceThread.seen,['s1','s2','s3','s4','s5']);
    assert.equal(continueSourceThread(db,result),null);
    const poem=attachSourceThread(db,quoteResult([passageById(db,'v1')]),{scope:'broad',extend:true});
    assert.equal(poem.passages.length,1);
    assert.equal(continueSourceThread(db,poem),null);
  }finally{db.close();}
});
test('Spanish source-first replies retain the source and label its language',async()=>{
  const result=await sourceFirstReply('¿Cómo practicar?',[verse],async()=>({ids:['verse']}),'es');
  assert.equal(result.paragraphs[0].text,verse.text);
  assert.match(result.paragraphs[0].note,/inglesa/);
});
test('unrelated results do not become invented quotations; unknown IDs are rejected',async()=>{
  const result=await sourceFirstReply('unmatched',[verse],async()=>({ids:[]}));
  assert.deepEqual(result.paragraphs,[]);
  assert.ok(result.notice);
  await assert.rejects(sourceFirstReply('question',[verse],async()=>({ids:['invented']})),/Invalid source/);
  assert.equal(await sourceFirstReply('question',[{...verse,synthesisAllowed:false}],()=>{throw Error('must not run');}),null);
});
test('discussion follows an existing passage; new topics and requests for more texts quote first',()=>{
  const previous={sourceFirst:true,passages:[verse]};
  for(const q of ['Continue','Please continue.','Explain that','Why?','¿Qué significa eso?','Continúa, por favor.']){
    assert.equal(expandsPrevious(q,previous),true,q);
  }
  assert.equal(expandsPrevious('How does this apply at work?',previous,{expandingPrevious:true}),true);
  assert.equal(expandsPrevious('Teach me about generosity',previous),false);
  assert.equal(expandsPrevious('Another story',previous,{expandingPrevious:true}),true);
  assert.equal(expandsPrevious('More verses',previous,{expandingPrevious:true}),true);
  assert.equal(expandsPrevious('Continue',null),false);
});
