import { importStories } from './import-stories.mjs';
import {indexCanonical} from './index-canonical.mjs';
import {indexKnowledgeMap} from '../lib/knowledge-map.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { openLibrary, libraryStats } from '../lib/corpus.mjs';
import { bilaraChunks, parseTei, cleanText } from '../lib/ingest.mjs';
import { importLegacy } from './import-legacy.mjs';
import { inventoryTipitaka } from './tipitaka-inventory.mjs';
const db=openLibrary();
const docInsert=db.prepare('INSERT OR REPLACE INTO documents VALUES(?,?,?,?,?,?)');
const passageInsert=db.prepare('INSERT OR REPLACE INTO passages(id,document_id,ordinal,text,title,segments,original) VALUES(?,?,?,?,?,?,?)');
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isDirectory()?files(path.join(dir,d.name)):[path.join(dir,d.name)]);}
const hash=s=>createHash('sha256').update(s).digest('hex');
const reports=[];
db.exec('BEGIN');
try {
  db.exec('DELETE FROM search; DELETE FROM passages; DELETE FROM documents; DELETE FROM imports;');
  const sc=JSON.parse(fs.readFileSync('data/sources/bilara-revision.json'));
  const base=`data/sources/bilara-data-${sc.commit}`;
  const authors=JSON.parse(fs.readFileSync(`${base}/_author.json`));
  const publications=Object.values(JSON.parse(fs.readFileSync(`${base}/_publication.json`))).filter(p=>p.translation_lang_iso==='en');
  const rootMap=new Map();
  for(const file of files(`${base}/root`)){if(!file.endsWith('.json'))continue;const name=path.basename(file).split('_')[0];if(!rootMap.has(name)||file.includes(`${path.sep}ms${path.sep}`))rootMap.set(name,file);}
  const report={source:'SuttaCentral',commit:sc.commit,files:0,passages:0,skipped:[],coverage:'Available published English translations, not the complete canon'};
  for(const file of files(`${base}/translation/en`).filter(f=>f.endsWith('.json'))){
    const rel=path.relative(base,file).replaceAll('\\','/'), author=rel.split('/')[2],uid=path.basename(file).split('_')[0];
    const pub=publications.filter(p=>{const prefix=p.source_url?.split('/published/')[1];return prefix&&(rel===prefix||rel.startsWith(prefix+'/'));}).sort((a,b)=>b.source_url.length-a.source_url.length)[0];
    if(!pub){report.skipped.push({path:rel,reason:'No publication metadata matched'});continue;}
    const license=pub.license?.license_abbreviation;
    if(!['CC0','CC BY-SA 3.0'].includes(license)){report.skipped.push({path:rel,reason:`Unrecognized license: ${license}`});continue;}
    const raw=fs.readFileSync(file,'utf8'),segments=JSON.parse(raw);
    const title=Object.entries(segments).filter(([id])=>/:0\./.test(id)).map(([,s])=>cleanText(s)).filter(Boolean).slice(0,4).join(' · ')||uid;
    const tradition=pub.root_lang_iso==='pli'?'Pāli':pub.root_lang_iso==='lzh'?'Chinese':'Indic parallels';
    const docid=`sc:${author}:${uid}`;
    const root=rootMap.has(uid)?JSON.parse(fs.readFileSync(rootMap.get(uid),'utf8')):{};
    const metadata={uid,translator:authors[author]?.name||author,license,licenseStatement:pub.license?.license_statement||'',sourceUrl:`https://raw.githubusercontent.com/${sc.repo}/${sc.commit}/${rel}`,url:`https://suttacentral.net/${uid}/en/${author}`,commit:sc.commit,sha256:hash(raw),rootLanguage:pub.root_lang_iso,publication:pub.publication_number,genre:rel.includes('/vinaya/')?'Vinaya':rel.includes('/abhidhamma/')?'Abhidhamma':/thag|thig/.test(uid)?'Disciple verses':'Canonical text',speaker:'Varies by passage; not automatically attributed to the Buddha',synthesisAllowed:license==='CC0',rendering:'Source wording; display markup and whitespace normalized'};
    docInsert.run(docid,title,tradition,pub.text_uid,'SuttaCentral',JSON.stringify(metadata));
    const dhp=/^dhp\d/.test(uid), chunks=bilaraChunks(segments,{dhammapada:dhp});
    chunks.forEach((chunk,i)=>{const id=dhp?`sc:${author}:${chunk.segmentIds[0].split(':')[0]}`:`${docid}:${i+1}`;passageInsert.run(id,docid,i,chunk.text,dhp?`Dhammapada ${chunk.segmentIds[0].split(':')[0].slice(3)} · ${title}`:title,JSON.stringify(chunk.segmentIds),chunk.segmentIds.map(id=>root[id]||'').join(' ').trim());});
    report.files++;report.passages+=chunks.length;
  }
  reports.push(report);console.log('SuttaCentral imported',report.files,report.passages,'skipped',report.skipped.length);
  const tib=JSON.parse(fs.readFileSync('data/sources/tibetan-revision.json'));
  const tibbase=`data/sources/data-tei-${tib.commit}`;
  const tibReport={source:'84000',commit:tib.commit,files:0,passages:0,skipped:[],coverage:'Published English translations in this repository snapshot; not complete Kangyur/Tengyur; reference excerpts only'};
  for(const file of files(`${tibbase}/translations`).filter(f=>f.endsWith('.xml'))){
    const raw=fs.readFileSync(file,'utf8'),rel=path.relative(tibbase,file).replaceAll('\\','/');
    const parsed=parseTei(raw);if(!parsed?.uid||!parsed.chunks.length){tibReport.skipped.push({path:rel,reason:'Not published status 1/1.a or no translation body/catalog ID'});continue;}
    const collection=rel.includes('/tengyur/')?'Tengyur':'Kangyur',docid=`84000:${parsed.uid}`;
    const previous=db.prepare('SELECT metadata FROM documents WHERE id=?').get(docid);
    if(previous){const previousEdition=JSON.parse(previous.metadata).edition||'';if(parsed.edition.localeCompare(previousEdition,undefined,{numeric:true})<=0){tibReport.skipped.push({path:rel,reason:'Duplicate catalog ID; retained newer or equal edition'});continue;}db.prepare('DELETE FROM passages WHERE document_id=?').run(docid);}
    const metadata={uid:parsed.uid,edition:parsed.edition,translator:parsed.translator,license:'CC BY-NC-ND 3.0',licenseStatement:'Published by 84000: Translating the Words of the Buddha. Local noncommercial reference use. Original TEI retained; no weight training or generated paraphrase from this source.',sourceUrl:`https://raw.githubusercontent.com/${tib.repo}/${tib.commit}/${rel}`,url:`https://84000.co/translation/${parsed.uid}`,commit:tib.commit,sha256:hash(raw),rootLanguage:'bo',genre:collection==='Tengyur'?'Treatise/commentary':'Canonical text',speaker:'Varies by passage; not automatically attributed to the Buddha',synthesisAllowed:false,rendering:'Paragraph/verse text; XML formatting and whitespace normalized, editorial notes omitted; consult original for complete context'};
    docInsert.run(docid,parsed.title,'Tibetan',collection,'84000',JSON.stringify(metadata));
    parsed.chunks.forEach((p,i)=>passageInsert.run(`${docid}:${i+1}`,docid,i,p.text,parsed.title,JSON.stringify([p.anchor,...p.segmentIds]),''));
    tibReport.files++;tibReport.passages+=parsed.chunks.length;
  }
  tibReport.files=db.prepare("SELECT count(*) n FROM documents WHERE source='84000'").get().n;
  tibReport.passages=db.prepare("SELECT count(*) n FROM passages p JOIN documents d ON d.id=p.document_id WHERE d.source='84000'").get().n;
  reports.push(tibReport);
  for(const kind of ['abhidhamma','khuddaka','parallels']){const legacyReport=importLegacy(db,kind);if(legacyReport)reports.push(legacyReport);}
  const stories=importStories(db);if(stories)reports.push(stories);
  inventoryTipitaka(db);
  indexCanonical(db);
  indexKnowledgeMap(db);
  for(const report of reports)db.prepare('INSERT INTO imports VALUES(?,?)').run(report.source,JSON.stringify(report));
  db.exec("INSERT INTO search(search) VALUES('rebuild'); COMMIT;");
  const stats=libraryStats(db);fs.writeFileSync('data/coverage.json',JSON.stringify(stats,null,2));console.log(JSON.stringify({...stats,imports:reports.map(({skipped,...r})=>({...r,skipped:skipped.length}))},null,2));
}catch(error){db.exec('ROLLBACK');throw error;}finally{db.close();}
