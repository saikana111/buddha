import test from 'node:test';
import assert from 'node:assert/strict';
import {openLibrary,passageById} from './lib/corpus.mjs';
import {chooseLibraryEncounter,findTeachingScenes,teachingForm,teachingMethodCoverage} from './lib/teaching-method.mjs';
import {encounterProgress} from './lib/guided-dialogue.mjs';

function fixture(){
  const db=openLibrary(':memory:');
  for(const [doc,tradition,allowed,genre] of [
    ['newly-imported','Pāli',true,'Canonical text'],
    ['another-edition','Chinese',true,'Canonical text'],
    ['reference','Tibetan',false,'Canonical text'],
    ['technical','Pāli',true,'Abhidhamma']
  ]){
    db.prepare('INSERT INTO documents VALUES(?,?,?,?,?,?)').run(doc,doc,tradition,'test','fixture',
      JSON.stringify({synthesisAllowed:allowed,genre,speaker:'Test fixture, not canonical text'}));
    for(let n=0;n<7;n++){
      const text=doc==='technical'?`Distinction ${n}: attention and perception are separately described.`:
        n===1?'Suppose a lump of salt is placed in a small cup of water. Consider the difference in saltiness.':
        `Surrounding context ${n} in ${doc}. The comparison concerns salt and water.`;
      db.prepare('INSERT INTO passages VALUES(?,?,?,?,?,?,?)').run(`${doc}:${n}`,doc,n,text,doc,'[]','');
    }
  }
  db.exec("INSERT INTO search(search) VALUES('rebuild')");
  return db;
}

test('new imports are found through corpus-wide search without a curated ID entry',()=>{
  const db=fixture();try{
    const found=findTeachingScenes(db,'salt and water',{tradition:'Pāli'});
    assert.ok(found.some(p=>p.id==='newly-imported:1'));
    assert.ok(found.every(p=>p.synthesisAllowed&&p.tradition==='Pāli'));
    const chinese=findTeachingScenes(db,'salt and water',{tradition:'Chinese'});
    assert.ok(chinese.some(p=>p.id==='another-edition:1'));
    assert.equal(findTeachingScenes(db,'salt and water',{tradition:'Tibetan'}).length,0);
    const selected=chooseLibraryEncounter(db,'Tell a story about salt and water',found,null,{tradition:'Pāli'});
    assert.equal(selected.key,'library');assert.equal(selected.mode,'simile');
    assert.ok(selected.passages.every(p=>p.documentId==='newly-imported'));
    assert.equal(selected.passages.length,4);
  }finally{db.close();}
});
test('technical passages retain exposition and depth rather than invented allegories',()=>{
  const db=fixture();try{
    const p=passageById(db,'technical:1');
    const selected=chooseLibraryEncounter(db,'Explain perception in depth',[p],null,{deep:true});
    assert.equal(selected.mode,'exposition');assert.equal(selected.stage,'explain');
    assert.match(selected.cue,/Do not invent a story/);
    assert.equal(chooseLibraryEncounter(db,'one sentence',[p],null),null);
    assert.equal(teachingForm({text:'A short verse.',genre:'Disciple verses'}),'verse');
    assert.equal(teachingForm({text:'What is it? “Why?” he replied.',genre:'Canonical text'}),'dialogue');
  }finally{db.close();}
});
test('continuity verifies text hashes and advances through the same edition',()=>{
  const db=fixture();try{
    const first=chooseLibraryEncounter(db,'salt',[passageById(db,'newly-imported:1')],null);
    const response={paragraphs:[{text:'What changes?',ids:first.ids}]};
    const saved=encounterProgress(first,response);
    assert.equal(chooseLibraryEncounter(db,'The water becomes salty.',[],saved,{replying:false}).stage,'apply');
    const apply=chooseLibraryEncounter(db,'The water changes.',[],saved,{replying:true});
    assert.equal(apply.stage,'apply');assert.deepEqual(apply.ids,first.ids);
    const applied=encounterProgress(apply,response);
    const next=chooseLibraryEncounter(db,'Please continue.',[],applied,{deep:true});
    assert.equal(next.stage,'explain');
    assert.ok(next.ids.includes('newly-imported:4'));
    assert.ok(next.passages.every(p=>p.documentId==='newly-imported'));
    db.prepare('UPDATE passages SET text=? WHERE id=?').run('Changed source',first.ids[0]);
    assert.equal(chooseLibraryEncounter(db,'Please continue.',[],saved),null);
  }finally{db.close();}
});
test('coverage audits every passage while distinguishing reference-only material',()=>{
  const db=fixture();try{
    const report=teachingMethodCoverage(db);
    assert.equal(report.passages,28);assert.equal(report.synthesisAllowed,21);assert.equal(report.referenceOnly,7);
    assert.equal(Object.values(report.forms).reduce((a,b)=>a+b,0),28);
  }finally{db.close();}
});
