import {createHash} from 'node:crypto';
import {passageById,searchTerms} from './corpus.mjs';
import {normalizeConcept} from './query-intent.mjs';
import {isContinueRequest} from './canonical-reading.mjs';

export const textHash=text=>createHash('sha256').update(text).digest('hex');

// Conservative form hints, not claims about authorship or completeness.
export function teachingForm(p){
  if(/commentary.*narrative|jataka/i.test(p.genre||''))return 'story';
  if(/\b(suppose|just as|simile|it['’]s like|as if)\b/i.test(p.text))return 'simile';
  if(/disciple verses/i.test(p.genre||'')||p.collection==='dhp')return 'verse';
  if((p.text.match(/\?/g)||[]).length>=2&&/“|”|said|replied|asked/i.test(p.text))return 'dialogue';
  return 'exposition';
}

function windowFor(db,anchor){
  const row=db.prepare('SELECT document_id,ordinal FROM passages WHERE id=?').get(anchor.id);
  if(!row)return [];
  // Same document, translation, and order. Whole chunks only.
  const rows=db.prepare('SELECT id FROM passages WHERE document_id=? AND ordinal BETWEEN ? AND ? ORDER BY ordinal')
    .all(row.document_id,Math.max(0,row.ordinal-1),row.ordinal+2);
  const window=rows.map(r=>passageById(db,r.id)).filter(p=>p?.synthesisAllowed);
  if(window.reduce((n,p)=>n+p.text.length,0)<=12000)return window;
  return anchor.text.length<=12000?[anchor]:[];
}

export function findTeachingScenes(db,question,{expanded='',tradition='all',limit=4}={}){
  const terms=searchTerms(question+' '+expanded).filter(w=>!['story','stories','simile','tell','explain','example','examples','poem','poetry','continue'].includes(w)).slice(0,18);
  if(!terms.length)return [];
  // Search the existing FTS index across the installed library, not a list of
  // preferred suttas. Demand both topical vocabulary and a narrative marker.
  const match=`(${terms.map(w=>`"${w}"`).join(' OR ')}) AND (suppose OR simile OR "just as" OR "once upon" OR replied)`;
  const rows=db.prepare(`SELECT p.id FROM passages p JOIN documents d ON d.id=p.document_id
    JOIN search ON search.rowid=p.rowid WHERE search MATCH ?
    AND json_extract(d.metadata,'$.synthesisAllowed')=1
    ${tradition==='all'?'':'AND d.tradition=?'}
    ORDER BY bm25(search,1,2) LIMIT ?`).all(match,...(tradition==='all'?[]:[tradition]),limit);
  return rows.map(r=>passageById(db,r.id));
}

const cues={
  simile:'Use the actual comparison found in the supplied passage. Present its concrete objects and ask one question about how they relate. Never substitute a newly invented metaphor.',
  story:'Retell only the episode actually present in these source chunks. Keep its genre and speaker attribution. Where this is later commentary, call it a traditional story, not a personal memory or a direct Buddha sermon.',
  dialogue:'Follow the reasoning in the supplied dialogue: identify one question, distinction, or response that advances understanding. Invite the listener to consider that distinction without impersonating a historical disciple.',
  verse:'Attend to one image or contrast in the supplied verse. Preserve its precise meaning and explain unfamiliar terms. Do not invent poetry and present it as canonical; exact wording belongs in the source quotation.',
  exposition:'Unfold one distinction or step in this technical teaching. Keep qualifications and terminology intact, define necessary terms, and ask one focused question about the distinction. Do not invent a story to decorate a passage that has none.'
};

export function chooseLibraryEncounter(db,question,candidates,previous,{
  replying=false,disabled=false,deep=false,tradition='all',expanded='',lesson=false
}={}){
  const q=normalizeConcept(question);
  if(disabled||/\b(just (?:define|the definition)|briefly|one sentence|no questions|sin preguntas|brevemente|solo (?:la )?definicion)\b/.test(q))return null;
  const continuing=isContinueRequest(question);
  let passages,anchor,mode,stage;
  if(previous?.key==='library'&&previous.stage==='invite'&&!replying&&q.length<240&&
    !/[?¿]/.test(q)&&!/weather|repair|computer|write code|clima|reparar|quiero aprender|want to learn/.test(q)){
    const uncertain=/^(?:i (?:do not|don't) know|not sure|yes|no|no se|si)[.! ]*$/.test(q.trim());
    const words=(q.match(/\p{L}{4,}/gu)||[]).filter(w=>!['that','this','they','them','with','from','have','does','would','could','there','these','think','because','about','when','what','more','less'].includes(w));
    const answerOpening=/^(?:it|the|they|because|i think|perhaps|maybe|el|la|porque|creo|quizas)\b/.test(q);
    const overlap=answerOpening&&Array.isArray(previous.ids)&&previous.ids.slice(0,4).some(id=>{
      const p=passageById(db,id);
      return p&&words.some(w=>normalizeConcept(p.text).includes(w));
    });
    replying=uncertain||overlap;
  }
  // Saved source IDs are re-read and hash-checked; labels never become evidence.
  if(previous?.key==='library'&&(replying||continuing)&&
    Array.isArray(previous.ids)&&previous.ids.length<=4&&previous.ids.length>0){
    const saved=previous.ids.map(id=>passageById(db,id));
    if(saved.every((p,i)=>p?.synthesisAllowed&&(tradition==='all'||p.tradition===tradition)&&
      textHash(p.text)===previous.hashes?.[i])&&saved.reduce((n,p)=>n+p.text.length,0)<=12000){
      passages=saved;anchor=saved.find(p=>p.id===previous.anchorId)||saved[0];
      mode=teachingForm(anchor);stage='apply';
      if(continuing&&previous.stage==='complete')stage='complete';
      if(continuing&&['apply','explain'].includes(previous.stage)){
        const last=db.prepare('SELECT document_id,ordinal FROM passages WHERE id=?').get(saved.at(-1).id);
        const next=db.prepare('SELECT id FROM passages WHERE document_id=? AND ordinal>? ORDER BY ordinal LIMIT 1').get(last.document_id,last.ordinal);
        const nextPassage=next&&passageById(db,next.id);
        if(nextPassage?.synthesisAllowed){
          const expandedWindow=windowFor(db,nextPassage);
          if(expandedWindow.length){anchor=nextPassage;passages=expandedWindow;mode=teachingForm(anchor);stage='explain';}
        }else stage='complete';
      }
    }
  }
  if(!passages){
    const eligible=candidates.filter(p=>p.synthesisAllowed&&(tradition==='all'||p.tradition===tradition));
    if(!eligible.length)return null;
    const explicitStory=/\b(story|stories|simile|parable|allegor\w*|cuento|historia|parabola|alegoria)\b/.test(q);
    const noStory=/\b(no stor(?:y|ies)|without (?:a )?stor(?:y|ies)|sin historias|sin cuentos)\b/.test(q);
    // Deep study and structured lessons keep their topical source selection.
    // Story requests can search all installed eligible sources automatically.
    const scenes=!lesson&&!deep&&!noStory?findTeachingScenes(db,question,{expanded,tradition}):[];
    const ranked=explicitStory?[...scenes,...eligible]:[...eligible.slice(0,2),...scenes,...eligible.slice(2)];
    anchor=(!deep&&!noStory&&!lesson?ranked.find(p=>teachingForm(p)!=='exposition'):null)||eligible[0];
    passages=windowFor(db,anchor);
    if(!passages.length)return null;
    mode=noStory?'exposition':teachingForm(anchor);
    stage=deep?'explain':'invite';
  }
  return {key:'library',mode,anchorId:anchor.id,ids:passages.map(p=>p.id),passages,stage,continuing,
    cue:cues[mode],
    boundary:'This is a bounded window from ONE source edition, not necessarily a whole episode. Do not invent missing events, an ending, speakers, or connections. If the excerpt does not support a complete story, explore the supported portion or its distinction instead. Preserve the source tradition and distinguish canonical verses from later commentary. Do not claim the entire canon agrees or that the listener has attained anything.'};
}

export function teachingMethodCoverage(db){
  const report={passages:0,synthesisAllowed:0,referenceOnly:0,forms:{},traditions:{}};
  for(const row of db.prepare('SELECT p.text,d.collection,d.tradition,d.metadata FROM passages p JOIN documents d ON d.id=p.document_id').iterate()){
    const meta=JSON.parse(row.metadata),form=teachingForm({...meta,...row});
    report.passages++;report.forms[form]=(report.forms[form]||0)+1;
    report.traditions[row.tradition]=(report.traditions[row.tradition]||0)+1;
    report[meta.synthesisAllowed?'synthesisAllowed':'referenceOnly']++;
  }
  return report;
}
