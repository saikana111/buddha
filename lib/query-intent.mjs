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
export function isSocialPrompt(question){
  const text=normalizeConcept(question).replace(/[¿¡]/g,'').trim();
  return /^(?:(?:hi|hello|hey|hola|buenos dias|buenas tardes|buenas noches)[,!.?\s]*)?(?:how are you(?: doing| feeling)?(?: today| this morning)?|how are things(?: today)?|how (?:is|was) your day(?: going)?|how's (?:your day|it going)|what'?s up|como (?:estas|te va|va tu dia)(?: hoy)?|que tal)[!.,?\s]*$/.test(text) ||
    /^(?:hi|hello|hey|hola|good morning|good evening|buenos dias|buenas tardes|buenas noches|thanks|thank you|gracias)[!.,?\s]*$/.test(text);
}
export function shouldSearch(question,plan){return plan.relevant!==false || plan.conversational===true || isSocialPrompt(question) || isConceptPrompt(question);}
