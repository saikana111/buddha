import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {parseStory} from '../lib/stories.mjs';
export function importStories(db){
 const dir='data/sources/buddhist-legends';if(!fs.existsSync(`${dir}/manifest.json`))return null;
 const manifest=JSON.parse(fs.readFileSync(`${dir}/manifest.json`));
 const report={source:'Buddhist Legends',files:0,passages:0,skipped:[],coverage:'Dhammapada commentary narratives, not an additional canonical book; historical English translation'};
 const doc=db.prepare('INSERT OR REPLACE INTO documents VALUES(?,?,?,?,?,?)');
 const passage=db.prepare('INSERT OR REPLACE INTO passages(id,document_id,ordinal,text,title,segments,original) VALUES(?,?,?,?,?,?,?)');
 for(const file of manifest.files){
  const raw=fs.readFileSync(`${dir}/${file.name}`,'utf8');if(createHash('sha256').update(raw).digest('hex')!==file.sha256)throw Error('Story source checksum mismatch');
  const parsed=parseStory(raw);if(!parsed.title||!parsed.chunks.length){report.skipped.push({path:file.name,reason:'Missing story title or paragraphs'});continue;}
  const id=`abt:dhp-commentary:${file.name.replace('.htm','')}`;
  const metadata={uid:id,relatedVerses:parsed.relatedVerses,translator:'Eugene Watson Burlingame; digital preparation by Ānandajoti Bhikkhu',license:'Public-domain original; CC BY-SA 3.0 editorial material',licenseStatement:'Burlingame, Buddhist Legends (1921), declared public domain by the publisher. Digital edition 1.5 (April 2020), prepared by Ānandajoti Bhikkhu. Editorial material is subject to the publisher’s CC BY-SA 3.0 notice. Local reference-only excerpts; formatting normalized and editorial tooltip notes omitted. '+manifest.rightsUrl,sourceUrl:file.url,url:file.url,sha256:file.sha256,commit:manifest.downloadedAt,edition:manifest.edition,rootLanguage:'pli',genre:'Dhammapada commentary narrative',speaker:'Later commentary narrators and characters; not automatically direct words or memories of the Buddha',synthesisAllowed:false,rendering:'Story paragraphs; page numbers, navigation, audio controls and tooltip notes omitted'};
  doc.run(id,parsed.title,'Pāli','dhp-commentary','Buddhist Legends',JSON.stringify(metadata));
  parsed.chunks.forEach((p,i)=>passage.run(`${id}:${i+1}`,id,i,p.text,parsed.title,JSON.stringify(p.segmentIds),''));report.files++;report.passages+=parsed.chunks.length;
 }
 console.log('Buddhist Legends imported',report.files,report.passages);return report;
}
