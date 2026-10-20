import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parseLegacy} from '../lib/legacy.mjs';
export function importLegacy(db, kind='abhidhamma'){
 const label=kind==='parallels'?'SuttaCentral Parallels':kind==='khuddaka'?'SuttaCentral Khuddaka':'SuttaCentral Abhidhamma';
 const prefix=kind==='parallels'?'html_text/en/':kind==='khuddaka'?'html_text/en/pli/sutta/kn/':'html_text/en/pli/abhidhamma/';
 if(!fs.existsSync(`data/sources/${kind}-revision.json`))return null;
 const manifest=JSON.parse(fs.readFileSync(`data/sources/${kind}-revision.json`));
 const report={source:label,commit:manifest.commit,files:0,passages:0,skipped:[],coverage:'Available English legacy translations with explicit recognized licenses; completeness audited separately'};
 const doc=db.prepare('INSERT OR REPLACE INTO documents VALUES(?,?,?,?,?,?)');
 const passage=db.prepare('INSERT OR REPLACE INTO passages(id,document_id,ordinal,text,title,segments,original) VALUES(?,?,?,?,?,?,?)');
 for(const sourcePath of manifest.files){
  const relative=sourcePath.replace(prefix,''),file=path.join(`data/sources/${kind}`,manifest.commit,relative);
  if(!fs.existsSync(file)){report.skipped.push({path:sourcePath,reason:'Not downloaded'});continue;}
  const raw=fs.readFileSync(file,'utf8'),parsed=parseLegacy(raw);
  // This publisher-level grant was checked against the named translator and work.
  if(parsed&&!parsed.license&&sourcePath.startsWith('html_text/en/san/sutta/arv/')&&/nandajoti/i.test(parsed.translator)){
   parsed.license='CC BY-SA 3.0';parsed.synthesisAllowed=false;
   parsed.footer+=' Publisher rights notice: https://ancient-buddhist-texts.net/Miscellaneous/Copyright-Notice.htm . Translations by Anandajoti, except listed third-party works, are CC BY-SA 3.0. Arthaviniscaya is not among the listed exceptions.';
  }
  if(!parsed?.license||!parsed.uid||!parsed.chunks.length){report.skipped.push({path:sourcePath,reason:!parsed?.license?'Explicit recognized license not found':'No article ID or translation text'});continue;}
  const hash=createHash('sha256').update(raw).digest('hex');
  const docid=`sc-legacy:${relative.replaceAll('/','-').replace('.html','')}`;
  const parts=relative.split('/');
  const language=kind==='parallels'?parts[0]:'pli';
  const tradition=language==='lzh'?'Chinese':language==='xct'?'Tibetan':language==='san'?'Indic parallels':'P\u0101li';
  const book=kind==='parallels'?parts[2].replace(/\.html$/,''):parts[0];
  const genre=kind==='parallels'&&parts[1]==='vinaya'?'Vinaya':kind==='abhidhamma'?'Abhidhamma':book==='ja'?'Jataka verses and commentary': ['ne','pe','ps'].includes(book)?'Exegetical treatise': ['tha-ap','thi-ap','thig','pv','vv'].includes(book)?'Canonical verses and narratives':'Canonical text';
  const metadata={uid:parsed.uid,translator:parsed.translator,license:parsed.license,licenseStatement:parsed.footer,sourceUrl:`https://raw.githubusercontent.com/${manifest.repo}/${manifest.commit}/${sourcePath}`,url:`https://suttacentral.net/${parsed.uid}`,commit:manifest.commit,sha256:hash,rootLanguage:language,genre,speaker:'Speaker varies; narrative and commentary must not be attributed automatically to the Buddha',synthesisAllowed:parsed.synthesisAllowed,rendering:'HTML body text in document order; whitespace normalized; reference anchors and publication footer separated from the teaching'};
  doc.run(docid,parsed.title,tradition,book,label,JSON.stringify(metadata));
  parsed.chunks.forEach((p,i)=>passage.run(`${docid}:${i+1}`,docid,i,p.text,parsed.title,JSON.stringify(p.segmentIds),''));
  report.files++;report.passages+=parsed.chunks.length;
 }
 console.log(label+' imported',report.files,report.passages,'skipped',report.skipped.length);return report;
}
