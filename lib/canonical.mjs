import {hydrate,passageById} from './corpus.mjs';
export function initCanonical(db){
 db.exec(`CREATE TABLE IF NOT EXISTS canonical_texts(uid TEXT PRIMARY KEY,basket TEXT,book TEXT,title TEXT,source_url TEXT,commit_sha TEXT,sha256 TEXT);
 CREATE TABLE IF NOT EXISTS canonical_segments(id TEXT PRIMARY KEY,uid TEXT NOT NULL,ordinal INTEGER NOT NULL,text TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS canonical_order ON canonical_segments(uid,ordinal);
 CREATE TABLE IF NOT EXISTS canonical_links(segment_id TEXT,passage_id TEXT,PRIMARY KEY(segment_id,passage_id));
 CREATE INDEX IF NOT EXISTS canonical_passage ON canonical_links(passage_id);
 CREATE VIRTUAL TABLE IF NOT EXISTS canonical_search USING fts5(text,content='canonical_segments',content_rowid='rowid',tokenize='unicode61 remove_diacritics 2');`);
}
export function linkCanonicalTranslations(db){
 db.exec(`DELETE FROM canonical_links;
 INSERT OR IGNORE INTO canonical_links
 SELECT r.id,p.id FROM passages p JOIN documents d ON d.id=p.document_id,
 json_each(p.segments) j JOIN canonical_segments r ON r.id=j.value
 WHERE d.source='SuttaCentral';
 INSERT INTO canonical_search(canonical_search) VALUES('rebuild');`);
}
export function canonicalCoverage(db){
 return db.prepare(`SELECT t.basket,t.book,count(DISTINCT t.uid) texts,count(s.id) segments,
 sum(CASE WHEN EXISTS(SELECT 1 FROM canonical_links l WHERE l.segment_id=s.id) THEN 1 ELSE 0 END) alignedSegments
 FROM canonical_texts t LEFT JOIN canonical_segments s ON s.uid=t.uid GROUP BY t.basket,t.book ORDER BY t.basket,t.book`).all();
}
export function searchCanonical(db,query,{book,limit=20}={}){
 const words=[...new Set(query.normalize('NFKD').replace(/\p{M}/gu,'').match(/[\p{L}\p{N}]+/gu)||[])].slice(0,8);
 if(!words.length)return [];
 const match=words.map(w=>/^(anapanasati|anapanassati)$/i.test(w)?'("anapanasati"* OR "anapanassati"*)':`"${w}"*`).join(' AND ');
 return db.prepare(`SELECT s.id,s.uid,s.text,t.title,t.book,t.basket,t.source_url sourceUrl FROM canonical_search
 JOIN canonical_segments s ON s.rowid=canonical_search.rowid JOIN canonical_texts t ON t.uid=s.uid
 WHERE canonical_search MATCH ?${book?' AND t.book=?':''}
 ORDER BY bm25(canonical_search) LIMIT ?`).all(match,...(book?[book]:[]),Math.min(50,Math.max(1,limit)));
}
export function canonicalText(db,uid,{offset=0,limit=30}={}){
 const text=db.prepare('SELECT * FROM canonical_texts WHERE uid=?').get(uid);
 if(!text)return null;
 const segments=db.prepare('SELECT id,ordinal,text FROM canonical_segments WHERE uid=? ORDER BY ordinal LIMIT ? OFFSET ?').all(uid,Math.min(100,Math.max(1,limit)),Math.max(0,offset));
 const translations=db.prepare(`SELECT d.id,d.title,d.source,json_extract(d.metadata,'$.translator') translator,json_extract(d.metadata,'$.license') license
 FROM documents d WHERE json_extract(d.metadata,'$.uid')=? ORDER BY d.id`).all(uid);
 return {...text,language:'pli',total:db.prepare('SELECT count(*) n FROM canonical_segments WHERE uid=?').get(uid).n,segments,translations,
  note:'Pāli source text. Translation availability is not proof of complete segment coverage.'};
}
export function passageContext(db,id){
 const selected=passageById(db,id);if(!selected)return null;
 const ordinal=db.prepare('SELECT ordinal FROM passages WHERE id=?').get(id).ordinal;
 const passages=db.prepare(`SELECT p.*,d.tradition,d.collection,d.source,d.metadata FROM passages p JOIN documents d ON d.id=p.document_id
 WHERE p.document_id=? AND p.ordinal BETWEEN ? AND ? ORDER BY p.ordinal`).all(selected.documentId,ordinal-1,ordinal+1).map(hydrate);
 const original=db.prepare(`SELECT s.id,s.uid,s.text,s.ordinal,t.source_url sourceUrl FROM canonical_links l
 JOIN canonical_segments s ON s.id=l.segment_id JOIN canonical_texts t ON t.uid=s.uid
 WHERE l.passage_id=? ORDER BY s.ordinal`).all(id);
 return {selected:id,passages,original,alignment:'Original segments correspond to the selected translation passage as a whole, not individual English sentences.'};
}
