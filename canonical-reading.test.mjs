import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {readingRequest,canonicalReading,wantsDepth} from './lib/canonical-reading.mjs';
import {openLibrary,passageById} from './lib/corpus.mjs';
import {validateAnswer} from './lib/answer.mjs';

test('exact reading and depth requests are explicit and bilingual',()=>{
  assert.deepEqual(readingRequest('Read MN 61'),{uid:'mn61',offset:0});
  assert.deepEqual(readingRequest('Recita SN 12.52'),{uid:'sn12.52',offset:0});
  assert.equal(readingRequest('Explain MN 61'),null);
  assert.equal(readingRequest('Do not quote MN 61'),null);
  assert.equal(readingRequest('Please continue.',{uid:'mn61',nextOffset:null}),null);
  assert.equal(wantsDepth('Explain extinguishment in detail'),true);
  assert.equal(wantsDepth('Quiero una explicación profunda'),true);
});
test('reading continuation preserves ordered translation text without model rewriting',{skip:!existsSync('data/library.sqlite')},()=>{
  const db=openLibrary();try{
    let request=readingRequest('Read MN 61'),ids=[];
    while(request){
      const result=canonicalReading(db,request);
      assert.ok(result.passages.length<=2);
      for(const p of result.passages){ids.push(p.id);assert.equal(p.text,passageById(db,p.id).text);}
      request=readingRequest('Please continue.',result.reading);
    }
    const expected=db.prepare("SELECT id FROM passages WHERE id LIKE 'sc:sujato:mn61:%' ORDER BY ordinal").all().map(p=>p.id);
    assert.deepEqual(ids,expected);
    assert.equal(canonicalReading(db,{uid:'mn999999',offset:0}),null);
  }finally{db.close();}
});
test('generated citation markers stay in citation data, not spoken text',()=>{
  const result=validateAnswer({paragraphs:[{text:'A fire uses fuel [source:1].',ids:['source:1']}]},[{id:'source:1',synthesisAllowed:true}]);
  assert.equal(result.paragraphs[0].text,'A fire uses fuel.');
  assert.deepEqual(result.paragraphs[0].ids,['source:1']);
});
