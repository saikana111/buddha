import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { bilaraChunks,parseTei } from './lib/ingest.mjs';
import { validateAnswer } from './lib/answer.mjs';
import { openLibrary,passageById,retrieve } from './lib/corpus.mjs';
import {parseLegacy} from './lib/legacy.mjs';
import {parseStory} from './lib/stories.mjs';

test('commentary story parser keeps narrative and excludes navigation and editorial notes',()=>{
 const raw='<p class="Heading3">A story<span class="TT"><span>Editor note</span></span></p><p class="NavBar3">Previous</p><p>He spoke<span class="number">[1.4]</span> kindly.<span class="TT">Gloss</span></p><div id="audio-player"><p>Download audio</p></div><footer><p>Footer</p></footer>';
 const parsed=parseStory(raw);assert.equal(parsed.title,'A story');assert.equal(parsed.chunks[0].text,'He spoke kindly.');
});
test('legacy HTML keeps publication notices out of teaching and reads actual license',()=>{
 const raw='<html><head><meta name="author" content="Translator"></head><body><article id="vb1"><header><h1>Analysis</h1></header><p>Mind <em>and</em> matter.<a class="ref">Page 3</a></p><footer>Published by PTS. <a href="https://creativecommons.org/licenses/by-nc/3.0/">CC license</a></footer></article></body></html>';
 const parsed=parseLegacy(raw);assert.equal(parsed.license,'CC BY-NC 3.0');assert.equal(parsed.translator,'Translator');assert.equal(parsed.chunks[0].text,'Mind and matter.');assert.equal(parsed.synthesisAllowed,true);
});
test('Dhammapada chunking preserves verse boundaries and removes headings',()=>{
 const parts=bilaraChunks({'dhp1:0.1':'Title','dhp1:1':'First line. ','dhp1:2':'Second line.','dhp2:1':'Another verse.'},{dhammapada:true});
 assert.deepEqual(parts.map(p=>p.text),['First line. Second line.','Another verse.']);
 assert.deepEqual(parts[0].segmentIds,['dhp1:1','dhp1:2']);
});

test('legacy rights require publication evidence and preserve reference-only status',()=>{
 const html=notice=>`<article id="ja1"><h1>Story</h1><p>A teaching.</p><footer>${notice}</footer></article>`;
 assert.equal(parseLegacy(html('These translations are in the public domain. You are free to do whatever you like with them.')).synthesisAllowed,true);
 assert.equal(parseLegacy(html('This text is in the public domain. You are free to do whatever you wish with it.')).license,'Public domain (source declaration)');
 assert.equal(parseLegacy(html('Creative Commons Attribution-ShareAlike 3.0 Unported License.')).synthesisAllowed,false);
 assert.equal(parseLegacy(html('Used with permission.')).license,null);
 assert.equal(parseLegacy(html('Dedicated to the public domain via Creative Commons Zero (CC0).')).license,'CC0');
 assert.equal(parseLegacy(html('Free to read online. All rights reserved.')).license,null);
 const free=parseLegacy(html('You may copy, reformat, reprint, republish, and redistribute this work in any medium whatsoever, provided that copies are available free of charge and you include the full text of this license.'));
 assert.equal(free.license,'Custom free-distribution license (full notice applies)');assert.equal(free.synthesisAllowed,false);
 assert.equal(parseLegacy('<article id="x"><p>Compare <a href="https://creativecommons.org/licenses/by/4.0/">this license</a></p><footer>All rights reserved</footer></article>').license,null);
});
test('TEI preserves inline text order, excludes notes and accepts published status',()=>{
 const raw='<TEI><teiHeader><title type="mainTitle" xml:lang="en">A title</title><availability status="1.a"/><bibl key="toh1"/></teiHeader><text><body><div type="translation"><milestone xml:id="m1"/><p tid="1">Learn <emph>kindness</emph> and <ref target="#x">compassion</ref> every day.<note>Editorial note.</note></p></div></body></text></TEI>';
 const p=parseTei(raw);assert.equal(p.chunks[0].text,'Learn kindness and compassion every day.');assert.equal(p.chunks[0].anchor,'m1');assert.equal(parseTei(raw.replace('status="1.a"','status="2"')),null);
});
test('synthesis cannot cite missing or quote-only sources',()=>{
 const a={paragraphs:[{text:'Explanation',ids:['x']}]};
 assert.throws(()=>validateAnswer(a,[]));assert.throws(()=>validateAnswer(a,[{id:'x',synthesisAllowed:false}]));
 assert.equal(validateAnswer(a,[{id:'x',text:'Original',synthesisAllowed:true}]).passages[0].text,'Original');
});
test('imported corpus has every Dhammapada verse and useful retrieval',{skip:!existsSync('data/library.sqlite')},()=>{
 const db=openLibrary();
 for(let n=1;n<=423;n++)assert.ok(passageById(db,`sc:sujato:dhp${n}`)?.text,`Missing verse ${n}`);
 const anger=retrieve(db,'anger hatred resentment');assert.ok(anger.some(p=>p.id.startsWith('sc:sujato:dhp')));
 const chinese=retrieve(db,'impermanence',{tradition:'Chinese'});assert.ok(chinese.length>0);assert.ok(chinese.every(p=>p.tradition==='Chinese'));
 if(db.prepare("SELECT 1 FROM imports WHERE source='84000'").get()){
   assert.ok(retrieve(db,'compassion',{tradition:'Tibetan'}).some(p=>p.source==='84000'));
 }
 if(db.prepare("SELECT 1 FROM imports WHERE source='SuttaCentral Khuddaka'").get()){
   const stories=retrieve(db,'Jataka generosity');assert.ok(stories.length);assert.ok(stories.every(p=>p.collection==='ja'&&p.genre==='Jataka verses and commentary'));
   const milinda=retrieve(db,'Milinda chariot');assert.ok(milinda.length);assert.ok(milinda.every(p=>p.collection==='mil'));
   assert.equal(db.prepare("SELECT count(*) n FROM documents WHERE source='SuttaCentral Khuddaka' AND collection='ja'").get().n,547);
 }
 assert.equal(passageById(db,'invented'),null);db.close();
});
