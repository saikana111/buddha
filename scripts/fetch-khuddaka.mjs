import fs from 'node:fs/promises';
import path from 'node:path';
const repo='suttacentral/sc-data';
async function json(url){const r=await fetch(url);if(!r.ok)throw Error(`${r.status} ${url}`);return r.json();}
await fs.mkdir('data/sources/khuddaka',{recursive:true});
const manifestPath='data/sources/khuddaka-revision.json';
let manifest;try{manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));}catch{}
if(!manifest&&!process.argv.includes('--update')){
 manifest=JSON.parse(await fs.readFile('docs/source-locks/khuddaka-revision.json','utf8'));
 await fs.writeFile(manifestPath,JSON.stringify(manifest,null,2));
}
if(!manifest||process.argv.includes('--update')){
 const {commit:sha}=JSON.parse(await fs.readFile('data/sources/abhidhamma-revision.json','utf8'));
 const dirs=await json(`https://api.github.com/repos/${repo}/contents/html_text/en/pli/sutta/kn?ref=${sha}`);
 const files=[];
 for(const dir of dirs){if(dir.type!=='dir')continue;const tree=await json(`https://api.github.com/repos/${repo}/git/trees/${dir.sha}?recursive=1`);if(tree.truncated)throw Error('Truncated source listing');for(const entry of tree.tree)if(entry.type==='blob'&&entry.path.endsWith('.html'))files.push(`${dir.path}/${entry.path}`);}
 manifest={repo,commit:sha,files};await fs.writeFile(manifestPath,JSON.stringify(manifest,null,2));
}
let cursor=0,complete=0;
async function worker(){while(cursor<manifest.files.length){const sourcePath=manifest.files[cursor++],relative=sourcePath.replace('html_text/en/pli/sutta/kn/',''),target=path.join('data/sources/khuddaka',manifest.commit,relative);try{await fs.access(target);complete++;continue;}catch{}
 await fs.mkdir(path.dirname(target),{recursive:true});
 let done=false;
 for(let attempt=0;attempt<3&&!done;attempt++){try{const r=await fetch(`https://raw.githubusercontent.com/${repo}/${manifest.commit}/${sourcePath}`,{signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error(`Download ${r.status}`);const raw=await r.text();await fs.writeFile(target+'.partial',raw);await fs.rename(target+'.partial',target);done=true;}catch(e){if(attempt===2)throw e;}}
 complete++;if(complete%50===0)console.log(`${complete}/${manifest.files.length} Khuddaka files`);
}}
await Promise.all(Array.from({length:4},worker));console.log(`Downloaded ${complete} English Khuddaka files; licensing will be checked before indexing.`);
