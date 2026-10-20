import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const titles={dn:'Dīgha Nikāya',mn:'Majjhima Nikāya',sn:'Saṃyutta Nikāya',an:'Aṅguttara Nikāya',dhp:'Dhammapada',kp:'Khuddakapāṭha',ud:'Udāna',iti:'Itivuttaka',snp:'Suttanipāta',vv:'Vimānavatthu',pv:'Petavatthu',thag:'Theragāthā',thig:'Therīgāthā','tha-ap':'Therāpadāna','thi-ap':'Therīapadāna',bv:'Buddhavaṃsa',cp:'Cariyāpiṭaka',ja:'Jātaka',mnd:'Mahāniddesa',cnd:'Cūḷaniddesa',ps:'Paṭisambhidāmagga',ne:'Nettippakaraṇa',pe:'Peṭakopadesa',mil:'Milindapañha',ds:'Dhammasaṅgaṇī',vb:'Vibhaṅga',dt:'Dhātukathā',pp:'Puggalapaññatti',kv:'Kathāvatthu',ya:'Yamaka',patthana:'Paṭṭhāna','pli-tv-bi-pm':'Bhikkhunī Pātimokkha','pli-tv-bu-pm':'Bhikkhu Pātimokkha','pli-tv-bi-vb':'Bhikkhunī Vibhaṅga','pli-tv-bu-vb':'Bhikkhu Vibhaṅga','pli-tv-kd':'Khandhaka','pli-tv-pvr':'Parivāra'};
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isDirectory()?files(path.join(dir,d.name)):[path.join(dir,d.name)]);}
export function inventoryTipitaka(db){
 const revision=JSON.parse(fs.readFileSync('data/sources/bilara-revision.json'));
 const base=`data/sources/bilara-data-${revision.commit}/root/pli/ms`;
 db.exec('CREATE TABLE IF NOT EXISTS root_texts(uid TEXT PRIMARY KEY,basket TEXT,book TEXT,title TEXT,text TEXT,source_path TEXT,sha256 TEXT); DELETE FROM root_texts;');
 const insert=db.prepare('INSERT INTO root_texts VALUES(?,?,?,?,?,?,?)');
 const groups=new Map();
 const english=new Set(db.prepare("SELECT metadata FROM documents WHERE tradition='Pāli'").all().map(r=>JSON.parse(r.metadata).uid));
 for(const file of files(base).filter(f=>f.endsWith('.json'))){
  const rel=path.relative(base,file).replaceAll('\\','/'),parts=rel.split('/'),basket=parts[0];if(!['sutta','vinaya','abhidhamma'].includes(basket))continue;
  const book=(basket==='sutta'&&parts[1]==='kn'?parts[2]:parts[1]).split('_')[0];
  const uid=path.basename(file).split('_')[0],raw=fs.readFileSync(file,'utf8'),segments=JSON.parse(raw);
  const title=Object.entries(segments).filter(([id])=>/:0\./.test(id)).map(([,s])=>s).join(' ').trim()||uid;
  const text=Object.entries(segments).filter(([id])=>!/:0(?:\.|$)/.test(id)).map(([,s])=>s).join(' ').trim();
  insert.run(uid,basket,book,title,text,rel,createHash('sha256').update(raw).digest('hex'));
  const key=basket+'/'+book;const g=groups.get(key)||{basket,book,title:titles[book]||book,paliFiles:0,paliSegments:0,englishMatchedFiles:0,missingEnglish:[]};g.paliFiles++;g.paliSegments+=Object.keys(segments).length;
  if(english.has(uid))g.englishMatchedFiles++;else g.missingEnglish.push(uid);groups.set(key,g);
 }
 const books=[...groups.values()].map(g=>({...g,englishFileCoverage:Number((100*g.englishMatchedFiles/g.paliFiles).toFixed(1))}));
 const report={edition:'SuttaCentral Mahāsaṅgīti Pāli snapshot',commit:revision.commit,rootFiles:db.prepare('SELECT count(*) n FROM root_texts').get().n,baskets:['sutta','vinaya','abhidhamma'].map(basket=>({basket,books:books.filter(b=>b.basket===basket).length,paliFiles:books.filter(b=>b.basket===basket).reduce((n,b)=>n+b.paliFiles,0)})),books,notes:['File-ID matches are a coverage proxy, not proof that an English translation contains every segment.','Pāli texts are catalogued locally; they are not automatically machine-translated into authoritative English.','Canonical scope differs by recension: Netti, Peṭakopadesa and Milindapañha are included here as in the source edition; their status is not uniform across Theravāda traditions.','A comprehensive source inventory is not yet an independent collation against all editions of the Tipiṭaka.']};
 fs.writeFileSync('data/tipitaka-coverage.json',JSON.stringify(report,null,2));console.log('Pāli root inventory',report.rootFiles,'files across',books.length,'book/section groups');return report;
}
