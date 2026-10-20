// Export only explicitly CC0 SuttaCentral Bilara publications; never player tables.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {openLibrary} from '../lib/corpus.mjs';
const destination='corpus/cc0';
fs.mkdirSync(destination,{recursive:true});
const db=openLibrary();
const documents=db.prepare("SELECT * FROM documents WHERE source='SuttaCentral' AND json_extract(metadata,'$.license')='CC0' ORDER BY id").all();
let lines=[],bytes=0,number=0,passages=0;
const files=[];
function flush(){
 if(!lines.length)return;
 const text=lines.join(''),name=`part-${String(++number).padStart(3,'0')}.jsonl`;
 fs.writeFileSync(`${destination}/${name}`,text);
 files.push({name,bytes:Buffer.byteLength(text),sha256:createHash('sha256').update(text).digest('hex')});
 lines=[];bytes=0;
}
for(const document of documents){
 const rows=db.prepare('SELECT id,document_id,ordinal,text,title,segments,original FROM passages WHERE document_id=? ORDER BY ordinal').all(document.id);
 const line=JSON.stringify({document,passages:rows})+'\n';
 if(bytes+Buffer.byteLength(line)>8*1024*1024)flush();
 lines.push(line);bytes+=Buffer.byteLength(line);passages+=rows.length;
}
flush();db.close();
fs.writeFileSync(`${destination}/manifest.json`,JSON.stringify({format:1,license:'CC0-1.0',licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/',selection:'Bilara publications explicitly labeled CC0; normalized teaching text with source attribution, notices, revision and original-file checksum. No player data.',documents:documents.length,passages,files},null,2)+'\n');
console.log(`Bundled ${documents.length} documents / ${passages} passages in ${files.length} files.`);
