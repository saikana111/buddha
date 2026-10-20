import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {openLibrary} from '../lib/corpus.mjs';
import {cleanText} from '../lib/ingest.mjs';
import {initCanonical,linkCanonicalTranslations,canonicalCoverage} from '../lib/canonical.mjs';
export function indexCanonical(db){
 initCanonical(db);
 const revision=JSON.parse(fs.readFileSync('data/sources/bilara-revision.json','utf8'));
 const base=`data/sources/bilara-data-${revision.commit}`,root=`${base}/root/pli/ms`;
 const files=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isDirectory()?files(path.join(dir,d.name)):[path.join(dir,d.name)]);
 db.exec('SAVEPOINT canonical_index;');
 try{
  db.exec('DELETE FROM canonical_links; DELETE FROM canonical_segments; DELETE FROM canonical_texts;');
  const textInsert=db.prepare('INSERT INTO canonical_texts VALUES(?,?,?,?,?,?,?)'),segmentInsert=db.prepare('INSERT INTO canonical_segments VALUES(?,?,?,?)');
  for(const file of files(root).filter(f=>f.endsWith('.json'))){
   const rel=path.relative(root,file).replaceAll('\\','/'),parts=rel.split('/'),basket=parts[0];
   if(!['sutta','vinaya','abhidhamma'].includes(basket))continue;
   const book=(basket==='sutta'&&parts[1]==='kn'?parts[2]:parts[1]).split('_')[0],uid=path.basename(file).split('_')[0];
   const raw=fs.readFileSync(file,'utf8'),segments=Object.entries(JSON.parse(raw));
   const title=segments.filter(([id])=>/:0(?:\.|$)/.test(id)).map(([,s])=>cleanText(s)).join(' ')||uid;
   textInsert.run(uid,basket,book,title,`https://raw.githubusercontent.com/${revision.repo}/${revision.commit}/root/pli/ms/${rel}`,revision.commit,createHash('sha256').update(raw).digest('hex'));
   let ordinal=0;
   for(const [id,value] of segments){const text=cleanText(value);if(!text||/:0(?:\.|$)/.test(id))continue;segmentInsert.run(id,uid,ordinal++,text);}
  }
  linkCanonicalTranslations(db);db.exec('RELEASE canonical_index');
  return canonicalCoverage(db);
 }catch(error){db.exec('ROLLBACK TO canonical_index; RELEASE canonical_index');throw error;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const db=openLibrary();try{const books=indexCanonical(db);console.log(JSON.stringify({books,totals:books.reduce((a,b)=>({texts:a.texts+b.texts,segments:a.segments+b.segments,alignedSegments:a.alignedSegments+b.alignedSegments}),{texts:0,segments:0,alignedSegments:0})},null,2));}finally{db.close();}
}
