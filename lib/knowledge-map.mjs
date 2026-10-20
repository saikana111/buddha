import { createHash } from 'node:crypto';
import { passageById } from './corpus.mjs';

// Small, authored pilot. Links describe a particular source, not universal doctrine.
const seeds = [
  ['feeling','conditions','craving','sc:sujato:sn12.2:1','Feeling is a requirement for craving.'],
  ['craving','conditions','grasping','sc:sujato:sn12.2:1','Craving is a requirement for grasping.'],
  ['grasping','conditions','continued existence','sc:sujato:sn12.2:1','Grasping is a requirement for continued existence.'],
  ['continued existence','conditions','rebirth','sc:sujato:sn12.2:1','Continued existence is a requirement for rebirth.'],
  ['eightfold path','leads toward','cessation of suffering','sc:sujato:sn56.11:2','Now this is the noble truth of the practice that leads to the cessation of suffering. It is simply this noble eightfold path'],
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
  return { version: 1, purpose: 'Offline evidence-linked pilot, not enabled in dialogue retrieval or weight training',
    nodes: [...nodes].map(id => ({ id })), edges };
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
