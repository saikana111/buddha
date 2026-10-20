import fs from 'node:fs';
import path from 'node:path';
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isDirectory()?files(path.join(dir,d.name)):[path.join(dir,d.name)]);}
const base='data/sources/data-tei-'+JSON.parse(fs.readFileSync('data/sources/tibetan-revision.json')).commit;
const counts={},dups=new Map();
for(const file of files(base+'/translations').filter(f=>f.endsWith('.xml'))){
 const raw=fs.readFileSync(file,'utf8'),status=raw.match(/<availability status="([^"]+)/)?.[1]; counts[status]=(counts[status]||0)+1;
 if(status==='1'){const uid=raw.match(/<bibl key="([^"]+)/)?.[1];dups.set(uid,[...(dups.get(uid)||[]),file]);}
}
console.log('TEI status counts',counts);console.log('Duplicate catalog IDs',[...dups].filter(([,f])=>f.length>1));
const report=JSON.parse(fs.readFileSync('data/coverage.json'));console.log('SC skips',report.imports[0].skipped.slice(0,10));
