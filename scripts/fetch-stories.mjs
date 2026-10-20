import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base='https://ancient-buddhist-texts.net/English-Texts/Buddhist-Legends/';
const dir='data/sources/buddhist-legends';
await fs.mkdir(dir,{recursive:true});
async function acquire(name,url=base+name){
 const target=`${dir}/${name}`;
 try{return await fs.readFile(target,'utf8');}catch{}
 const response=await fetch(url,{signal:AbortSignal.timeout(45000)});
 if(!response.ok)throw Error(`${response.status} ${url}`);
 const raw=await response.text();await fs.writeFile(target+'.partial',raw);await fs.rename(target+'.partial',target);return raw;
}
const index=await acquire('index.htm');
await acquire('copyright.htm','https://ancient-buddhist-texts.net/Miscellaneous/Copyright-Notice.htm');
const names=[...new Set([...index.matchAll(/href="([^"#]+\.htm)"/g)].map(m=>m[1]).filter(x=>/^(?!00)\d\d-\d\d[^/]*\.htm$/.test(x)))];
let cursor=0;const files=[];
async function worker(){while(cursor<names.length){const name=names[cursor++],raw=await acquire(name);files.push({name,url:base+name,sha256:createHash('sha256').update(raw).digest('hex')});if(files.length%50===0)console.log(`${files.length}/${names.length} story pages`);}}
await Promise.all(Array.from({length:3},worker));
files.sort((a,b)=>a.name.localeCompare(b.name));
await fs.writeFile(`${dir}/manifest.json`,JSON.stringify({source:'Ancient Buddhist Texts',edition:'Burlingame, Buddhist Legends, digital edition 1.5 (2020); publisher links a newer revised edition',downloadedAt:new Date().toISOString(),indexUrl:base+'index.htm',rightsUrl:'https://ancient-buddhist-texts.net/Miscellaneous/Copyright-Notice.htm',files},null,2));
console.log(`Acquired ${files.length} Dhammapada commentary story pages.`);
