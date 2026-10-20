import test from 'node:test';
import assert from 'node:assert/strict';
import {dialoguePages} from './public/dialogue-pages.js';

test('long replies paginate without losing words or source attribution',()=>{
  const blocks=[{text:Array.from({length:455},(_,i)=>`word${i}${i%25===24?'.':''}`).join(' '),ids:['source'],quote:true},
    {text:'What do you notice?',ids:['source']}];
  const pages=dialoguePages(blocks);
  assert.ok(pages.length>=3);
  assert.ok(pages.every(page=>page.reduce((n,b)=>n+b.text.split(/\s+/).length,0)<=200));
  assert.equal(pages.flat().map(b=>b.text).join(' '),blocks.map(b=>b.text).join(' '));
  assert.ok(pages.flat().every(b=>b.ids[0]==='source'));
  assert.ok(pages.slice(0,2).flat().every(b=>b.quote===true));
  assert.match(pages.at(-1).at(-1).text,/What do you notice/);
});
test('a short reply stays one page and empty input stays empty',()=>{
  assert.deepEqual(dialoguePages([]),[]);
  assert.equal(dialoguePages([{text:'A short reply.',ids:[]}]).length,1);
});
