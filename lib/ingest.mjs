import { XMLParser } from 'fast-xml-parser';
export const cleanText = text => String(text).replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();
export function bilaraChunks(segments, { dhammapada = false } = {}) {
  const groups = [];
  let entries = [], size = 0;
  function flush() { if (entries.length) groups.push({ segmentIds: entries.map(([id])=>id), text: entries.map(([,t])=>cleanText(t)).join(' ').trim() }); entries=[];size=0; }
  let lastVerse;
  for (const [id, value] of Object.entries(segments)) {
    if (/:0(?:\.|$)/.test(id) || !cleanText(value)) continue;
    const verse = id.split(':')[0];
    if (dhammapada && lastVerse && verse !== lastVerse) flush();
    if (!dhammapada && size > 900 && entries.length && /^\d+\.1$/.test(id.split(':')[1])) flush();
    if (!dhammapada && size + value.length > 1800 && entries.length) flush();
    entries.push([id,value]); size += value.length; lastVerse=verse;
  }
  flush(); return groups;
}
const parser = new XMLParser({ ignoreAttributes:false, preserveOrder:true, trimValues:false, parseTagValue:false, processEntities:true });
function tag(node) { return Object.keys(node).find(k=>k!==':@' && !k.startsWith('?')); }
export function xmlText(nodes) {
  return nodes.map(n=>{const k=tag(n); if(k==='#text') return n[k]; if(['note','milestone','graphic'].includes(k)) return ''; if(k==='lb')return '\n'; return Array.isArray(n[k]) ? xmlText(n[k])+(['l','p','lg'].includes(k)?'\n':'') : '';}).join('');
}
function find(nodes, name, predicate=()=>true) {
  for(const n of nodes){const k=tag(n);if(k===name && predicate(n[':@']||{}))return n; if(Array.isArray(n[k])){const hit=find(n[k],name,predicate);if(hit)return hit;}}
}
export function parseTei(raw) {
  const tree=parser.parse(raw);
  const availability=find(tree,'availability');
  if(!['1','1.a'].includes(availability?.[':@']?.['@_status'])) return null;
  const body=find(tree,'div',a=>a['@_type']==='translation');
  if(!body) return null;
  const title=find(tree,'title',a=>a['@_type']==='mainTitle'&&a['@_xml:lang']==='en');
  const bibl=find(tree,'bibl',a=>a['@_key']?.startsWith('toh'));
  const author=find(tree,'author',a=>a['@_role']==='translatorMain');
  const chunks=[];let milestone='translation', serial=0;
  function walk(nodes){for(const n of nodes){const k=tag(n),a=n[':@']||{};
    if(k==='milestone'&&a['@_xml:id'])milestone=a['@_xml:id'];
    if(k==='p'||k==='lg'){const text=xmlText(n[k]).replace(/\s+/g,' ').trim();if(text.length>35)chunks.push({text,segmentIds:[a['@_xml:id']||`tid:${a['@_tid']||++serial}`],anchor:milestone});}
    else if(Array.isArray(n[k])&&!['note','head'].includes(k))walk(n[k]);
  }}
  walk(body.div);
  const edition=find(tree,'edition');
  return {title:title?cleanText(xmlText(title.title)):'Untitled',uid:bibl?.[':@']?.['@_key'],edition:edition?cleanText(xmlText(edition.edition)):'',translator:author?xmlText(author.author).replace(/\s+/g,' ').trim():'84000 translation team',chunks};
}
