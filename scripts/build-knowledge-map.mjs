import fs from 'node:fs';
import { openLibrary } from '../lib/corpus.mjs';
import { buildKnowledgeMap, linkedContext } from '../lib/knowledge-map.mjs';

const db = openLibrary();
try {
  const graph = buildKnowledgeMap(db);
  fs.mkdirSync('data/knowledge', { recursive: true });
  fs.writeFileSync('data/knowledge/pilot.json', JSON.stringify(graph,null,2));
  fs.writeFileSync('data/knowledge/craving-example.json',JSON.stringify(linkedContext(graph,'craving'),null,2));
  console.log(`Evidence-linked pilot: ${graph.nodes.length} nodes, ${graph.edges.length} edges. Not activated in chat.`);
} finally { db.close(); }
