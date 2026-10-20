import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {openLibrary,libraryStats} from '../lib/corpus.mjs';
const base='corpus/cc0',manifest=JSON.parse(fs.readFileSync(`${base}/manifest.json`));
const db=openLibrary();
let documents=0,passages=0;
db.exec('BEGIN');
try{
 const doc=db.prepare('INSERT OR REPLACE INTO documents VALUES(?,?,?,?,?,?)');
 const passage=db.prepare('INSERT OR REPLACE INTO passages VALUES(?,?,?,?,?,?,?)');
 for(const file of manifest.files){
  if(!/^part-\d+\.jsonl$/.test(file.name))throw Error('Invalid bundle path');
  const raw=fs.readFileSync(`${base}/${file.name}`);
  if(createHash('sha256').update(raw).digest('hex')!==file.sha256)throw Error(`Checksum mismatch: ${file.name}`);
  for(const line of raw.toString('utf8').split('\n').filter(Boolean)){
   const {document:d,passages:rows}=JSON.parse(line);
   if(d.source!=='SuttaCentral'||JSON.parse(d.metadata).license!=='CC0')throw Error('Unexpected bundle rights');
   doc.run(d.id,d.title,d.tradition,d.collection,d.source,d.metadata);
   db.prepare('DELETE FROM passages WHERE document_id=?').run(d.id);
   for(const p of rows){
    if(p.document_id!==d.id)throw Error('Invalid document link');
    passage.run(p.id,p.document_id,p.ordinal,p.text,p.title,p.segments,p.original);
   }
   documents++;passages+=rows.length;
  }
 }
 if(documents!==manifest.documents||passages!==manifest.passages)throw Error('Bundle counts do not match');
 const report={source:'Bundled CC0',files:documents,passages,skipped:[],coverage:'CC0 Bilara subset; additional traditions require npm run import'};
 db.prepare('INSERT OR REPLACE INTO imports VALUES(?,?)').run(report.source,JSON.stringify(report));
 db.exec("INSERT INTO search(search) VALUES('rebuild'); COMMIT;");
 console.log(JSON.stringify(libraryStats(db),null,2));
}catch(error){db.exec('ROLLBACK');throw error;}finally{db.close();}
