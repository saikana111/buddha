import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {existsSync} from 'node:fs';
import {openLibrary} from './lib/corpus.mjs';
import {initTeaching,parseGoal,savePlan,teachingState,clearTeaching,advancePlan,acceptAssessment,dhammapadaSteps,prepareTeaching} from './lib/teaching.mjs';

test('explicit English/Spanish goals retain timeframe and reject negated requests',()=>{
  assert.deepEqual(parseGoal('I want to learn about immersion today'),{topic:'immersion',horizon:'today',evidence:'I want to learn about immersion today'});
  assert.equal(parseGoal('Quiero estudiar el Dhammapada esta semana').horizon,'week');
  assert.equal(parseGoal("I don't want to learn about immersion today"),null);
  assert.equal(parseGoal('What is immersion?'),null);
});
test('plans persist, isolate players, and a failed delivery cannot skip an unintroduced step',async()=>{
  const db=new DatabaseSync(':memory:');initTeaching(db);
  try{
    const plan={id:'plan-1',status:'active',topic:'immersion',horizon:'week',cursor:0,steps:[{title:'One',sourceIds:['x'],status:'pending'},{title:'Two',sourceIds:['y'],status:'pending'}]};
    assert.equal(advancePlan(plan,'next'),false);assert.equal(plan.cursor,0);
    plan.steps[0].introduced=true;advancePlan(plan,'next');assert.equal(plan.cursor,1);assert.equal(plan.steps[0].status,'skipped');
    savePlan(db,'a',plan);assert.equal(teachingState(db,'a').plans[0].cursor,1);assert.equal(teachingState(db,'b').plans.length,0);
    await prepareTeaching(db,{id:'a'},'pause my plan',[],()=>{throw Error('No model call needed');});assert.equal(teachingState(db,'a').plans[0].status,'paused');
    await prepareTeaching(db,{id:'a'},'resume my plan',[],()=>{throw Error('No model call needed');});assert.equal(teachingState(db,'a').plans[0].status,'active');
    clearTeaching(db,'a');assert.equal(teachingState(db,'a').plans.length,0);
  }finally{db.close();}
});
test('a bare yes or fabricated evidence cannot establish understanding',()=>{
  const step={introduced:true,status:'introduced'};
  acceptAssessment(step,'yes',{kind:'answer',result:'supported',evidence:'yes',note:''});assert.notEqual(step.status,'checked');
  acceptAssessment(step,'I am explaining an idea in my own words.',{kind:'answer',result:'supported',evidence:'This is not in their answer at all.',note:''});assert.notEqual(step.status,'checked');
  const answer='I understand that hatred is not ended by further hatred.';
  acceptAssessment(step,answer,{kind:'answer',result:'supported',evidence:answer,note:''});assert.equal(step.status,'checked');assert.equal(step.assessment.method,'local-model-provisional');
});
test('Dhammapada curriculum covers all 423 verses once in canonical order',{skip:!existsSync('data/library.sqlite')},()=>{
  const db=openLibrary();try{
    const steps=dhammapadaSteps(db),ids=steps.flatMap(s=>s.sourceIds);
    assert.equal(ids.length,423);assert.equal(new Set(ids).size,423);
    assert.deepEqual(ids,Array.from({length:423},(_,i)=>`sc:sujato:dhp${i+1}`));
    assert.ok(steps.every(s=>s.sourceIds.length<=2));
  }finally{db.close();}
});
