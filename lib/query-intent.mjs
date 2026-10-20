export function normalizeConcept(text){return text.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase();}
export function conceptHint(question){
  const text=normalizeConcept(question);
  if(/\b(immersion|inmersion|samadhi|concentration|concentracion|jhana|absorption|absorcion)\b/.test(text))
    return {terms:'immersion concentration samadhi absorption collectedness',anchors:['sc:sujato:sn45.8:3']};
  return null;
}
export function isConceptPrompt(question){
  const text=normalizeConcept(question).trim();
  // A short word or phrase is an invitation to explore, not a failed request.
  const words=text.match(/[\p{L}\p{N}'-]+/gu)||[];
  return words.length>0 && words.length<=6 && text.length<=100 &&
    !/\b(code|debug|javascript|python|weather|forecast|buy|shopping|repair|codigo|programa|comprar|pronostico|reparar)\b/.test(text);
}
export function shouldSearch(question,plan){return plan.relevant!==false || isConceptPrompt(question);}
