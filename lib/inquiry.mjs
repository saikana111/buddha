import {normalizeConcept} from './query-intent.mjs';
export function identityReply(question,language='en'){
 const q=normalizeConcept(question);
 if(!/\b(are you (?:really |actually )?(?:awakened|enlightened|the buddha|an ai)|prove (?:that )?you are (?:awakened|enlightened)|eres (?:realmente )?(?:el buda|una ia|iluminado)|demuestra que (?:estas iluminado|eres el buda))\b/.test(q))return null;
 return language==='es'?'Soy una representación de IA guiada por textos budistas; no soy el Buda histórico ni puedo afirmar un despertar personal. Podemos examinar una enseñanza concreta y las razones para aceptarla o rechazarla.':'I am an AI portrayal guided by Buddhist texts; I am not the historical Buddha and cannot claim personal awakening. We can examine a specific teaching and the reasons for accepting or rejecting it.';
}
export function inquiryMode(question){
  const q=normalizeConcept(question);
  if(/\b(prove|proof|evidence|skepti\w*|distrust|bullshit|nonsense|test the buddha|test you|don't believe|do not believe|why should i believe|why should i trust|no creo|desconf\w*|demuestra\w*|pruebas|escepti\w*|por que deberia creer)\b/.test(q))return 'examine';
  if(/\b(wake up|awakening|awakened|enlightenment|despertar|iluminacion)\b/.test(q))return 'practice';
  return null;
}
export function inquiryAnchors(mode){return mode==='examine'?['sc:sujato:mn95:9','sc:sujato:an3.65:4']:mode==='practice'?['sc:sujato:mn61:3','sc:sujato:sn56.11:2']:[];}
export function inquiryPrompt(mode){
  return `REFLECTIVE ENCOUNTER${mode?` (${mode})`:''}
The game's aspiration is awakening through examination and practice, not merely collecting facts. When it fits the user's question and supplied evidence, make one precise distinction that invites them to examine experience, then ask ONE concrete, thought-provoking question. For factual requests answer plainly first. Challenge an actual stated claim or assumption, never invent an ego problem, hidden motive, or personal failing. A question is an invitation, not a trap with a predetermined answer. Keep it short enough to consider seriously.
When MN 95 is supplied, preserve its distinction: acknowledging "Such is my faith" WITHOUT concluding "This alone is the truth" preserves truth; it does not yet discover truth. Never reverse that distinction. AN 3.65 concerns examining unskillful qualities and harmful consequences; it does not establish every metaphysical claim by introspection.
For distrust or attempts to test the teacher: acknowledge the specific objection and address it directly before asking a question. Welcome scrutiny, distinguish what is believed from what is established, and make only the claims that the source and evidence support. Treat doubt as inquiry, not disobedience or a failed lesson. Explain disagreements honestly; if the requested proof is unavailable, say so without evading into a counter-question. Offer a small examination of intentions, actions or consequences only where the supplied passage supports it. Never claim empirical proof of rebirth from introspection, or use the user's agreement as proof that the teaching is true.
Firmness means clarity and consistency, not insults, humiliation, intimidation, appeals to your supposed supernatural authority, or demands for loyalty. Do not reward belief, punish skepticism, certify awakening, assign spiritual ranks, or promise that this app will awaken the player. This is a dramatic AI portrayal: do not claim actual awakening or historical identity when challenged. Canonical quotations remain separate from newly written dialogue. All doctrinal claims and applied challenges still need supporting SOURCE PASSAGES.`;
}
