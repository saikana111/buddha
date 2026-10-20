import {normalizeConcept} from './query-intent.mjs';
import {passageById} from './corpus.mjs';

export const isContinueRequest=q=>/^(?:please )?(?:continue|go on|continua|continuar)(?:,? por favor)?[.!?\s]*$/.test(normalizeConcept(q).trim());
export function wantsDepth(q){
  return /\b(deep|deeply|in depth|in detail|detailed|technical|precise|wording|original|recite|quote|poem|verses|profund\w*|detall\w*|tecnic\w*|precis\w*|recita\w*|poema|versos)\b/.test(normalizeConcept(q));
}
export function readingRequest(question,previous){
  if(isContinueRequest(question)&&previous?.nextOffset!==null&&previous?.nextOffset!==undefined &&
    /^(?:dn|mn|sn|an|ud|iti|snp|thag|thig)\d+(?:\.\d+){0,2}$/.test(previous.uid)&&
    Number.isSafeInteger(previous.nextOffset)&&previous.nextOffset>=0)return {uid:previous.uid,offset:previous.nextOffset};
  const q=normalizeConcept(question);
  if(!/\b(read|recite|quote|wording|full text|exact text|leer|lee|recita\w*|cita\w*|texto completo|texto exacto)\b/.test(q)||
    /\b(do not|don't|no leas|no recites|instead of)\b/.test(q))return null;
  const ref=q.match(/\b(dn|mn|sn|an|ud|iti|snp|thag|thig)\s*(\d+(?:\.\d+){0,2})\b/);
  return ref?{uid:ref[1]+ref[2],offset:0}:null;
}
export function canonicalReading(db,request){
  if(!request)return null;
  const rows=db.prepare('SELECT id FROM passages WHERE id LIKE ? ORDER BY ordinal').all(`sc:sujato:${request.uid}:%`);
  if(!rows.length)return null;
  const passages=rows.slice(request.offset,request.offset+2).map(r=>passageById(db,r.id));
  if(!passages.length||passages.some(p=>!p?.synthesisAllowed))return null;
  const next=request.offset+passages.length;
  return {paragraphs:[],passages,reading:{uid:request.uid,offset:request.offset,nextOffset:next<rows.length?next:null,complete:next>=rows.length,translator:passages[0].translator}};
}
