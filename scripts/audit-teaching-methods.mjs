import {writeFile} from 'node:fs/promises';
import {openLibrary} from '../lib/corpus.mjs';
import {teachingMethodCoverage} from '../lib/teaching-method.mjs';
const db=openLibrary();
try{
  const report={generated:new Date().toISOString(),...teachingMethodCoverage(db),
    note:'Form hints are heuristic, not scholarly genre attribution. Reference-only texts remain excluded from generated paraphrases. New imports are immediately eligible for runtime selection; no separate teaching index is required.'};
  await writeFile('data/teaching-method-coverage.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}finally{db.close();}
