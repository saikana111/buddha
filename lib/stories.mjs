import {parse} from 'parse5';
const cls=n=>n.attrs?.find(a=>a.name==='class')?.value||'';
function content(n){
 if(n.nodeName==='#text')return n.value;
 if(['script','style','audio','footer','sup'].includes(n.tagName)||/\b(TT|number|NavBar\d)\b/.test(cls(n)))return '';
 return (n.childNodes||[]).map(content).join('')+(n.tagName==='br'?' ':'');
}
const clean=n=>content(n).replace(/\s+/g,' ').trim();
export function parseStory(raw){
 const tree=parse(raw),paragraphs=[];let title='';
 function walk(n){
  if(n.tagName==='p'){
   if(cls(n).includes('Heading3')&&!title)title=clean(n);
   else if(!/Heading|NavBar/.test(cls(n))){const text=clean(n);if(text)paragraphs.push(text);}
   return;
  }
  if(['footer','script','audio'].includes(n.tagName)||n.attrs?.some(a=>a.name==='id'&&a.value==='audio-player'))return;
  for(const child of n.childNodes||[])walk(child);
 }
 walk(tree);
 const chunks=[];let entries=[],size=0;
 function flush(){if(entries.length)chunks.push({text:entries.map(e=>e.text).join('\n\n'),segmentIds:entries.map(e=>e.id)});entries=[];size=0;}
 paragraphs.forEach((text,i)=>{if(size>=1200)flush();entries.push({id:`p${i+1}`,text});size+=text.length;});flush();
 const range=title.match(/\((\d+)(?:\s*[-–]\s*(\d+))?\)\s*$/);
 const relatedVerses=range?Array.from({length:Math.min(423,Number(range[2]||range[1]))-Number(range[1])+1},(_,i)=>Number(range[1])+i):[];
 return {title,chunks,relatedVerses};
}
