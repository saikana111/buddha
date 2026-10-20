import { createHash } from 'node:crypto';
import { passageById } from './corpus.mjs';

// Small, authored pilot. Links describe a particular source, not universal doctrine.
const seeds = [
  ['ignorance','conditions','choices','sc:sujato:sn12.2:1','Ignorance is a requirement for choices.'],
  ['choices','conditions','consciousness','sc:sujato:sn12.2:1','Choices are a requirement for consciousness.'],
  ['consciousness','conditions','name and form','sc:sujato:sn12.2:1','Consciousness is a requirement for name and form.'],
  ['name and form','conditions','six sense fields','sc:sujato:sn12.2:1','Name and form are requirements for the six sense fields.'],
  ['six sense fields','conditions','contact','sc:sujato:sn12.2:1','The six sense fields are requirements for contact.'],
  ['contact','conditions','feeling','sc:sujato:sn12.2:1','Contact is a requirement for feeling.'],
  ['feeling','conditions','craving','sc:sujato:sn12.2:1','Feeling is a requirement for craving.'],
  ['craving','conditions','grasping','sc:sujato:sn12.2:1','Craving is a requirement for grasping.'],
  ['grasping','conditions','continued existence','sc:sujato:sn12.2:1','Grasping is a requirement for continued existence.'],
  ['continued existence','conditions','rebirth','sc:sujato:sn12.2:1','Continued existence is a requirement for rebirth.'],
  ['rebirth','conditions','old age and death','sc:sujato:sn12.2:1','Rebirth is a requirement for old age and death, sorrow, lamentation, pain, sadness, and distress to come to be.'],
  ['craving','is identified as the origin of','suffering','sc:sujato:sn56.11:2','Now this is the noble truth of the origin of suffering. It’s the craving that leads to future lives, mixed up with relishing and greed, taking pleasure there wherever it alights.'],
  ['cessation of craving','is identified with','cessation of suffering','sc:sujato:sn56.11:2','Now this is the noble truth of the cessation of suffering. It’s the fading away and cessation of that very same craving no residue left behind; giving it away, letting it go, releasing it, and not clinging to it.'],
  ['eightfold path','leads toward','cessation of suffering','sc:sujato:sn56.11:2','Now this is the noble truth of the practice that leads to the cessation of suffering. It is simply this noble eightfold path'],
  ['right view','includes knowledge of','suffering','sc:sujato:sn45.8:1','Knowing about suffering, the origin of suffering, the cessation of suffering, and the practice that leads to the cessation of suffering.'],
  ['right speech','refrains from','false and harmful speech','sc:sujato:sn45.8:1','Refraining from speech that’s false, backbiting, harsh, or nonsensical.'],
  ['conditions','are described as','impermanent','sc:sujato:dhp277','All conditions are impermanent'],
  ['conditions','are described as','suffering','sc:sujato:dhp278','All conditions are suffering'],
  ['all things','are described as','not-self','sc:sujato:dhp279','All things are not-self'],
  ['hatred','is laid to rest by','love','sc:sujato:dhp5','it’s laid to rest by love'],
  ['Alara Kalama','is associated in this account with','dimension of nothingness','sc:sujato:mn26:7','When I said this, he declared the dimension of nothingness.','historical-context'],
  ['Uddaka son of Rama','reports Rama attaining','neither perception nor non-perception','sc:sujato:mn26:8','Uddaka son of Rāma declared the dimension of neither perception nor non-perception.','historical-context'],
  ['Purana Kassapa','is reported by Ajatasattu as teaching','inaction','sc:sujato:dn2:9','he answered with the doctrine of inaction.','historical-context'],
  ['Gosala','is reported by Ajatasattu as teaching','purification through transmigration','sc:sujato:dn2:11','he answered with the doctrine of purification through transmigration.','historical-context'],
  ['Ajita','is reported by Ajatasattu as teaching','annihilationism','sc:sujato:dn2:13','he answered with the doctrine of annihilationism.','historical-context']
];

export function buildKnowledgeMap(db, entries = seeds) {
  const nodes = new Set();
  const edges = entries.map(([from, relation, to, passageId, quote, layer = 'canonical-teaching'], i) => {
    const p = passageById(db, passageId);
    if (!p || !p.text.includes(quote)) throw new Error(`Missing or changed evidence: ${passageId}`);
    if (!p.synthesisAllowed) throw new Error(`Source not enabled for synthesis: ${passageId}`);
    nodes.add(from); nodes.add(to);
    return { id: `seed-${i+1}`, from, relation, to, layer,
      status: 'agent-authored-unreviewed', humanReviewed: false,
      evidence: { passageId, quote, passageSha256: createHash('sha256').update(p.text).digest('hex'),
        source: p.source, tradition: p.tradition, translator: p.translator, license: p.license,
        url: p.sourceUrl || p.url, segmentIds: p.segmentIds },
      scope: layer === 'historical-context' ? 'Buddhist textual account; not independent confirmation of another school or historical influence.' : 'Reading of this passage in this translation; not a claim about every Buddhist tradition.' };
  });
  return { version: 2, purpose: 'Evidence-linked retrieval hints; unreviewed interpretations are not independent doctrinal evidence or model training',
    nodes: [...nodes].map(id => ({ id })), edges };
}

const aliases={
 'craving':['tanha','taṇhā','cravings','ansia','ansias','sed de deseo'],
 'grasping':['clinging','attachment','upadana','upādāna','apego','aferramiento'],
 'feeling':['vedana','vedanā','sensacion','sensación'],
 'ignorance':['avijja','avijjā','ignorancia'],
 'choices':['volitional formations','sankhara','saṅkhāra','formaciones volitivas'],
 'consciousness':['vinnana','viññāṇa','conciencia'],
 'suffering':['dukkha','sufrimiento'],
 'cessation of suffering':['nibbana','nibbāna','nirvana','cesacion del sufrimiento','cesación del sufrimiento'],
 'eightfold path':['noble eightfold path','octuple sendero','óctuple sendero','sendero octuple','sendero óctuple'],
 'right view':['samma ditthi','visión correcta','vision correcta'],
 'right speech':['habla correcta','recta palabra'],
 'impermanent':['impermanence','anicca','impermanencia'],
 'not-self':['anatta','anattā','no yo','no-yo'],
 'hatred':['hate','anger','angry','odio','ira'],
 'love':['loving kindness','metta','mettā','benevolencia','bondad amorosa'],
 'contact':['phassa','contacto'],
 'rebirth':['renacimiento'],
};
const normalize=s=>' '+s.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()+' ';
export function initKnowledge(db){
 db.exec(`CREATE TABLE IF NOT EXISTS concept_nodes(id TEXT PRIMARY KEY,aliases TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS concept_edges(id TEXT PRIMARY KEY,from_id TEXT,to_id TEXT,layer TEXT,payload TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS concept_from ON concept_edges(from_id);
 CREATE INDEX IF NOT EXISTS concept_to ON concept_edges(to_id);`);
}
export function indexKnowledgeMap(db){
 const graph=buildKnowledgeMap(db);initKnowledge(db);db.exec('SAVEPOINT concept_index');
 try{
  db.exec('DELETE FROM concept_edges; DELETE FROM concept_nodes');
  const node=db.prepare('INSERT INTO concept_nodes VALUES(?,?)'),edge=db.prepare('INSERT INTO concept_edges VALUES(?,?,?,?,?)');
  for(const {id} of graph.nodes)node.run(id,JSON.stringify(aliases[id]||[]));
  for(const e of graph.edges)edge.run(e.id,e.from,e.to,e.layer,JSON.stringify(e));
  db.exec('RELEASE concept_index');return graph;
 }catch(e){db.exec('ROLLBACK TO concept_index; RELEASE concept_index');throw e;}
}
export function relatedTeachings(db,query,{hops=1,layer='canonical-teaching',tradition='all',limit=3}={}){
 if(!['canonical-teaching','historical-context'].includes(layer))throw Error('Unknown relationship layer');
 const q=normalize(query),concepts=db.prepare('SELECT * FROM concept_nodes').all()
  .filter(n=>[n.id,...JSON.parse(n.aliases)].some(a=>q.includes(normalize(a)))).slice(0,4).map(n=>n.id);
 if(!concepts.length)return {concepts:[],edges:[],passages:[]};
 const graph={edges:db.prepare('SELECT payload FROM concept_edges WHERE layer=?').all(layer).map(r=>JSON.parse(r.payload))};
 const found=new Map();for(const c of concepts)for(const e of linkedContext(graph,c,{hops,layer}))found.set(e.id,e);
 const passages=new Map(),edges=[];
 for(const e of found.values()){
  const p=passageById(db,e.evidence.passageId);
  if(!p||!p.synthesisAllowed||(tradition!=='all'&&p.tradition!==tradition)||!p.text.includes(e.evidence.quote)||createHash('sha256').update(p.text).digest('hex')!==e.evidence.passageSha256)continue;
  if(!passages.has(p.id)&&passages.size>=limit)continue;
  passages.set(p.id,p);edges.push(e);
 }
 return {concepts,edges,passages:[...passages.values()]};
}
export function passageConnections(db,id){
 const p=passageById(db,id);if(!p)return [];
 const hash=createHash('sha256').update(p.text).digest('hex');
 return db.prepare("SELECT payload FROM concept_edges WHERE json_extract(payload,'$.evidence.passageId')=?").all(id)
  .map(r=>JSON.parse(r.payload)).filter(e=>e.evidence.passageSha256===hash&&p.text.includes(e.evidence.quote));
}

// Bounded traversal returns evidence edges, never inferred shortcuts such as A causes C.
export function linkedContext(graph, concept, { hops = 2, layer = 'canonical-teaching' } = {}) {
  if (!Number.isInteger(hops) || hops < 1 || hops > 3) throw new Error('Use 1–3 hops');
  const seen = new Set([concept]), result = new Map();
  let frontier = new Set([concept]);
  for (let depth = 0; depth < hops; depth++) {
    const next = new Set();
    for (const edge of graph.edges) {
      if (edge.layer !== layer || (!frontier.has(edge.from) && !frontier.has(edge.to))) continue;
      result.set(edge.id, edge);
      for (const id of [edge.from,edge.to]) if (!seen.has(id)) { seen.add(id); next.add(id); }
    }
    frontier = next;
  }
  return [...result.values()];
}
