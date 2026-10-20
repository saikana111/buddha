import test from 'node:test';
import assert from 'node:assert/strict';
import {expandsPrevious,sourceFirstReply} from './lib/source-first.mjs';

const verse={id:'verse',text:'A line of verse;\nanother line.',collection:'dhp',synthesisAllowed:true};
const story={id:'story',text:'“Suppose there were a raft,” he said. What would you do?',synthesisAllowed:true};
test('source-first replies copy selected source bytes without model rewriting or truncation',async()=>{
  const long={...story,text:story.text.repeat(200)};
  let calls=0;
  const result=await sourceFirstReply('How should I let go?',[verse,long],async()=>{
    calls++;return {ids:['story','verse']};
  });
  assert.equal(calls,1);
  assert.deepEqual(result.paragraphs.map(p=>p.text),[long.text,verse.text]);
  assert.ok(result.paragraphs.every(p=>p.quote));
  assert.equal(result.sourceFirst,true);
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
  assert.equal(expandsPrevious('Another story',previous,{expandingPrevious:true}),false);
  assert.equal(expandsPrevious('More verses',previous,{expandingPrevious:true}),false);
  assert.equal(expandsPrevious('Continue',null),false);
});
