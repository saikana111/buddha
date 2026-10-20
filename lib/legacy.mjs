import { parse } from 'parse5';
const attr=(node,name)=>node.attrs?.find(a=>a.name===name)?.value;
const text=node=>node.nodeName==='#text'?node.value:(node.childNodes||[]).filter(n=>!['script','style'].includes(n.tagName)).map(text).join('');
const clean=s=>s.replace(/\s+/g,' ').trim();
function all(node,predicate){return [...(predicate(node)?[node]:[]),...(node.childNodes||[]).flatMap(n=>all(n,predicate))];}
function bodyText(node){if(node.nodeName==='#text')return node.value;if(['script','style','footer','header','nav','aside'].includes(node.tagName)||/(^|\s)(ref|note|footnote|endnote)(\s|$)/.test(attr(node,'class')||''))return '';return (node.childNodes||[]).map(bodyText).join('')+(['p','li','h2','h3','h4','br'].includes(node.tagName)?'\n':'');}
export function parseLegacy(raw){
 const tree=parse(raw),footers=all(tree,n=>n.tagName==='footer');
 const footer=clean(footers.map(text).join(' '));
 const links=footers.flatMap(footer=>all(footer,n=>n.tagName==='a')).map(n=>attr(n,'href')||'');
 const licenseLink=links.find(s=>/creativecommons\.org\/(licenses|publicdomain)\//i.test(s));
 let license=null,synthesisAllowed=false;
 if(licenseLink){const match=licenseLink.match(/\/licenses\/(by(?:-[a-z]+)*)\/([\d.]+)/i);if(match){license=`CC ${match[1].toUpperCase()} ${match[2]}`;synthesisAllowed=['by','by-nc'].includes(match[1].toLowerCase());}else if(licenseLink.includes('/zero/')){license='CC0';synthesisAllowed=true;}}
 if(!license&&/Creative Commons Attribution.NonCommercial 3\.0|CC BY-NC 3\.0/i.test(footer)){license='CC BY-NC 3.0';synthesisAllowed=true;}
 if(!license&&/(?:These translations are|This text is) in the public domain\. You are free to do whatever you (?:like|wish) with (?:them|it)\./i.test(footer)){license='Public domain (source declaration)';synthesisAllowed=true;}
 if(!license&&/Creative Commons Attribution-ShareAlike 3\.0/i.test(footer)){license='CC BY-SA 3.0';synthesisAllowed=false;}
 if(!license&&/This translation is released by means of Creative Commons Zero/i.test(footer)){license='CC0';synthesisAllowed=true;}
 if(!license&&/This translation is in the Public Domain\./i.test(footer)){license='Public domain (source declaration)';synthesisAllowed=true;}
 if(!license&&/dedicated to the public domain (?:by way of|via) Creative Commons Zero/i.test(footer)){license='CC0';synthesisAllowed=true;}
 // Recognize the actual grant, not a generic mention of free availability.
 // Preserve the complete notice and keep custom grants in reference-only mode.
 if(!license&&/You may copy, reformat, reprint, republish, and redistribute this work in any medium whatsoever/i.test(footer)&&/available free of charge/i.test(footer)&&/include the full text of this license/i.test(footer)){
   license='Custom free-distribution license (full notice applies)';synthesisAllowed=false;
 }
 if(!license&&/For free distribution\. This work may be republished, reformatted, reprinted and redistributed in any medium/i.test(footer)&&/free and unrestricted basis/i.test(footer)&&/derivative works are to be clearly marked/i.test(footer)){
   license='BPS free-distribution license (full notice applies)';synthesisAllowed=false;
 }
 const article=all(tree,n=>n.tagName==='article')[0];
 if(!article)return null;
 const title=clean(all(article,n=>n.tagName==='h1').map(text).join(' '));
 const translator=attr(all(tree,n=>n.tagName==='meta'&&attr(n,'name')==='author')[0]||{},'content')||clean(all(tree,n=>(attr(n,'class')||'').split(' ').includes('author')).map(text).join('; '))||'Unknown translator';
 // Top-level semantic blocks preserve list and paragraph order without double-counting nested lists.
 const chunks=[];let entries=[],size=0,serial=0;
 function flush(){if(entries.length){chunks.push({text:entries.map(x=>x.text).join(' '),segmentIds:entries.map(x=>x.id)});entries=[];size=0;}}
 function walk(node){if(['footer','header','aside','nav'].includes(node.tagName))return;
  if(['p','li','h2','h3','h4'].includes(node.tagName)){
    const value=clean(bodyText(node));if(!value)return;
    if(size>1000&&entries.length)flush();entries.push({text:value,id:attr(node,'id')||`block-${++serial}`});size+=value.length;return;
  }
  for(const child of node.childNodes||[])walk(child);
 }
 walk(article);flush();return {uid:attr(article,'id'),title,translator,footer,license,licenseLink,synthesisAllowed,chunks};
}
