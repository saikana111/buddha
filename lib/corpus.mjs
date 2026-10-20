import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { conceptHint } from './query-intent.mjs';

export function openLibrary(path = 'data/library.sqlite') {
  mkdirSync('data', { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS documents(id TEXT PRIMARY KEY, title TEXT, tradition TEXT, collection TEXT, source TEXT, metadata TEXT);
    CREATE TABLE IF NOT EXISTS passages(id TEXT PRIMARY KEY, document_id TEXT REFERENCES documents(id), ordinal INTEGER, text TEXT, title TEXT, segments TEXT, original TEXT);
    CREATE INDEX IF NOT EXISTS passage_document ON passages(document_id, ordinal);
    CREATE VIRTUAL TABLE IF NOT EXISTS search USING fts5(text,title,content='passages',content_rowid='rowid',tokenize='unicode61 remove_diacritics 2');
    CREATE TABLE IF NOT EXISTS imports(source TEXT PRIMARY KEY, report TEXT);`);
  return db;
}
export function hydrate(row) {
  if (!row) return null;
  const meta = JSON.parse(row.metadata);
  return { ...meta, id: row.id, documentId: row.document_id, title: row.title, tradition: row.tradition, collection: row.collection, source: row.source, text: row.text, segmentIds: JSON.parse(row.segments), original: row.original };
}
const join = 'SELECT p.*, d.tradition, d.collection, d.source, d.metadata FROM passages p JOIN documents d ON d.id=p.document_id';
export function passageById(db, id) { return hydrate(db.prepare(`${join} WHERE p.id=?`).get(id)); }
export function libraryStats(db) {
  return { documents: db.prepare('SELECT count(*) n FROM documents').get().n, passages: db.prepare('SELECT count(*) n FROM passages').get().n,
    traditions: db.prepare('SELECT tradition,count(*) documents FROM documents GROUP BY tradition').all(),
    dhammapadaVerses: db.prepare("SELECT count(*) n FROM passages WHERE document_id LIKE 'sc:sujato:dhp%'").get().n,
    imports: db.prepare('SELECT report FROM imports').all().map(r => JSON.parse(r.report)) };
}
const stop = new Set('a an the i me my you your we our us is am are was were be been being of to in on at for from and or but that this these those how what why when where who can could would should do does did have has had it its about please tell explain help want know more feel feeling really very with as not so some something buddhist buddhism buddha teach teaching teachings canon chinese tibetan pali kangyur tengyur tomorrow today says say tradition traditions'.split(' '));
const aliases = [
  [/impermanen|anicca|transien/i, 'impermanent impermanence changing conditioned arising ceasing'],
  [/ang(er|ry)|hate|hatred|resent|grudge|revenge/i, 'anger hatred hate love patience resentment hostility'],
  [/anxious|anxiety|worr|fear|stress/i, 'fear sorrow worry peaceful mind calm'],
  [/grief|death|dying|died|loss|mourn/i, 'death grief sorrow impermanent separation beloved'],
  [/meditat|breath|mindful/i, 'mindfulness breathing meditation concentration awareness'],
  [/suffer|dukkha|unhapp/i, 'suffering craving cessation path'],
  [/crav|desire|attach|addict/i, 'craving desire attachment grasping relinquish'],
  [/kind|compassion|metta|loving/i, 'love loving kindness compassion goodwill'],
  [/emptiness|sunyata|śūnyatā/i, 'emptiness empty phenomena inherent existence'],
  [/self|identity|ego/i, 'self identity aggregates form feeling perception consciousness'],
  [/ethic|moral|precept/i, 'ethics killing stealing lying misconduct intoxicants'],
  [/awaken|enlighten|nirvana|nibbana/i, 'awakening extinguishment nirvana nibbana liberation'],
  [/dhammapada/i, 'dhammapada sayings dhamma']
];
export function searchTerms(question) {
  const extra = aliases.filter(([re]) => re.test(question)).map(([, s]) => s).join(' ')+' '+(conceptHint(question)?.terms||'');
  return [...new Set((question + ' ' + extra).normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().match(/[a-z]{3,}/g) || [])].filter(w => !stop.has(w)).slice(0,40);
}
export function retrieve(db, question, { limit = 8, tradition = 'all', expanded = '' } = {}) {
  const normalized=question.normalize('NFKD').replace(/\p{M}/gu,'');
  const collections=[[/\bjataka\b/i,'ja'],[/\bmilinda|\bmilindapanha/i,'mil'],[/\btheriapadana|\bthi-ap\b/i,'thi-ap'],[/\btherapadana|\btha-ap\b/i,'tha-ap'],[/\bvimanavatthu\b/i,'vv'],[/\bpetavatthu\b/i,'pv'],[/\bpatisambhida/i,'ps'],[/\bnettippakarana|\bnetti\b/i,'ne'],[/\bpetakopadesa\b/i,'pe']];
  const collection=collections.find(([pattern])=>pattern.test(normalized))?.[1];
  const explicitDhp = /dhammapada|\bdhp\b/i.test(question);
  const verse = question.match(/(?:dhammapada|dhp)\s*(?:verse\s*)?(\d{1,3})\b/i);
  if(verse&&/story|stories|background|commentary/i.test(question)){
    return db.prepare(`${join} WHERE d.collection='dhp-commentary' AND EXISTS(SELECT 1 FROM json_each(d.metadata,'$.relatedVerses') WHERE value=?) ORDER BY d.id,p.ordinal LIMIT ?`).all(Number(verse[1]),limit).map(hydrate);
  }
  if (verse) {
    const p = passageById(db, `sc:sujato:dhp${Number(verse[1])}`);
    if (p) return [p];
  }
  const terms = searchTerms(question + ' ' + expanded);
  if (!terms.length) return [];
  const match = terms.map(w => `"${w}"`).join(' OR ');
  const filter = (tradition !== 'all' ? ' AND d.tradition=?' : '')+(collection?' AND d.collection=?':'');
  const sql = `${join} JOIN search ON search.rowid=p.rowid WHERE search MATCH ?${filter} ORDER BY bm25(search,1,2) LIMIT 100`;
  const params=[match,...(tradition!=='all'?[tradition]:[]),...(collection?[collection]:[])];
  const rows = db.prepare(sql).all(...params);
  const scoring = rows.map((r, index) => ({ r, score: (100-index) * (r.document_id.startsWith('sc:sujato:dhp') ? (explicitDhp ? 2.5 : 1.18) : 1) }));
  // Search Dhammapada independently so a huge corpus cannot bury all its relevant verses.
  if (!collection && (tradition === 'all' || tradition === 'Pāli')) {
    const dhp = db.prepare(`${join} JOIN search ON search.rowid=p.rowid WHERE search MATCH ? AND p.document_id LIKE 'sc:sujato:dhp%' ORDER BY bm25(search,1,2) LIMIT 3`).all(match);
    for (const r of dhp) if (!scoring.some(s => s.r.id === r.id)) scoring.push({ r, score: explicitDhp ? 150 : 85 });
  }
  scoring.sort((a,b) => b.score-a.score);
  // Prefer an explanatory definition over keyword-dense fragments for a named concept.
  if(!collection && (tradition==='all'||tradition==='Pāli')){
    for(const id of conceptHint(question)?.anchors||[]){
      const row=db.prepare(`${join} WHERE p.id=?`).get(id);
      if(row){const index=scoring.findIndex(s=>s.r.id===id);if(index>=0)scoring.splice(index,1);scoring.unshift({r:row,score:1000});}
    }
  }
  const seen = new Set(), docCounts = new Map(), result = [];
  for (const { r } of scoring) {
    const fingerprint = r.text.toLowerCase().replace(/\W/g,'');
    if (seen.has(fingerprint) || (docCounts.get(r.document_id)||0) >= 2) continue;
    seen.add(fingerprint); docCounts.set(r.document_id,(docCounts.get(r.document_id)||0)+1);
    result.push(hydrate(r)); if (result.length >= limit) break;
  }
  return result;
}
