import { mkdir,readFile,writeFile,access,rename,stat } from 'node:fs/promises';
import { createWriteStream, createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const update=process.argv.includes('--update');
await mkdir('data/sources',{recursive:true});
for(const [key,repo,branch,prefix] of [['bilara','suttacentral/bilara-data','published','bilara-data'],['tibetan','84000/data-tei','master','data-tei']]){
  const manifest=`data/sources/${key}-revision.json`;
  let revision;
  try{revision=JSON.parse(await readFile(manifest,'utf8'));}catch{}
  if(!revision&&!update)revision=JSON.parse(await readFile(`docs/source-locks/${key}-revision.json`,'utf8'));
  if(!revision||update){const r=await fetch(`https://api.github.com/repos/${repo}/commits/${branch}`);if(!r.ok)throw Error(`GitHub returned ${r.status}`);const j=await r.json();revision={repo,commit:j.sha,download:`https://codeload.github.com/${repo}/zip/${j.sha}`};}
  const destination=`data/sources/${prefix}-${revision.commit}`;
  let exists=false;try{await access(`${destination}/.import-complete`);exists=true;}catch{}
  if(!exists){
    const zip=`data/sources/${key}-${revision.commit}.zip`;
    console.log(`Downloading ${repo} at ${revision.commit}`);
    const r=await fetch(revision.download,{signal:AbortSignal.timeout(600000)});if(!r.ok)throw Error(`Archive download ${r.status}`);
    await pipeline(Readable.fromWeb(r.body),createWriteStream(zip+'.partial'));
    await rename(zip+'.partial',zip);
    const listing=spawnSync('tar',['-tf',zip],{encoding:'utf8',maxBuffer:40*1024*1024});
    if(listing.status!==0||listing.stdout.split(/\r?\n/).filter(Boolean).some(p=>p.includes('..')||p.startsWith('/')||p.includes(':')||!p.startsWith(`${prefix}-${revision.commit}/`)))throw Error('Unexpected archive paths');
    const result=spawnSync('tar',['-xf',zip,'-C','data/sources'],{stdio:'inherit'});if(result.status!==0)throw Error('Extraction failed');
    const digest=createHash('sha256');for await(const chunk of createReadStream(zip))digest.update(chunk);
    const actualHash=digest.digest('hex');
    if(revision.archiveSha256&&revision.archiveSha256!==actualHash)throw Error(`Archive checksum mismatch for ${repo}; import stopped`);
    revision.archiveSha256=actualHash;revision.archiveBytes=(await stat(zip)).size;
    await writeFile(`${destination}/.import-complete`,revision.commit);
  }
  await writeFile(manifest,JSON.stringify(revision,null,2));console.log(`Ready: ${destination}`);
}
const legacy=spawnSync(process.execPath,['scripts/fetch-abhidhamma.mjs',...(update?['--update']:[])],{stdio:'inherit'});
if(legacy.status!==0)throw Error('Abhidhamma download failed; keeping the current index');
const khuddaka=spawnSync(process.execPath,['scripts/fetch-khuddaka.mjs',...(update?['--update']:[])],{stdio:'inherit'});
if(khuddaka.status!==0)throw Error('Khuddaka download failed; keeping the current index');
const parallels=spawnSync(process.execPath,['scripts/fetch-parallels.mjs',...(update?['--update']:[])],{stdio:'inherit'});
if(parallels.status!==0)throw Error('Parallel translation download failed; keeping the current index');
const stories=spawnSync(process.execPath,['scripts/fetch-stories.mjs'],{stdio:'inherit'});
if(stories.status!==0)throw Error('Story download failed; keeping the current index');
const build=spawnSync(process.execPath,['scripts/build-library.mjs'],{stdio:'inherit'});process.exitCode=build.status||0;
