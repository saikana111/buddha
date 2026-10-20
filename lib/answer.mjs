export function validateAnswer(answer,candidates){
  if(!Array.isArray(answer?.paragraphs)||answer.paragraphs.length>3)throw Error('Invalid response');
  const ids=new Set();
  for(const p of answer.paragraphs){
    if(typeof p.text!=='string'||!p.text.trim()||p.text.length>2400||!Array.isArray(p.ids)||!p.ids.length||p.ids.length>3)throw Error('Unsupported paragraph');
    for(const id of p.ids){if(!candidates.some(c=>c.id===id&&c.synthesisAllowed))throw Error('Unsupported source');ids.add(id);}
  }
  const paragraphs=answer.paragraphs.map(p=>{
    let text=p.text;
    for(const id of p.ids)text=text.replaceAll(`[${id}]`,'');
    return {...p,text:text.replace(/ +([.,!?;:])/g,'$1').replace(/ {2,}/g,' ').trim()};
  });
  return {paragraphs,passages:[...ids].map(id=>candidates.find(p=>p.id===id))};
}
