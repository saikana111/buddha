import fs from 'node:fs';
const base='http://127.0.0.1:3000';
const results=[];let history=[],previousIds=[];
for(const question of ['I am angry at someone who insulted me. How can I respond?','How can I practice that tomorrow?','Explain Dhammapada verse 5','What does the Chinese canon teach about impermanence?','What does the Tibetan canon teach about compassion?','How do I repair my bicycle?']){
 const start=Date.now();const r=await fetch(base+'/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question,history:question.startsWith('How can')?history:[],previousIds:question.startsWith('How can')?previousIds:[]})});const data=await r.json();
 const row={question,status:r.status,seconds:(Date.now()-start)/1000,paragraphs:data.paragraphs,ids:data.passages?.map(p=>p.id),notice:data.notice,error:data.error};results.push(row);console.log(JSON.stringify(row));
 if(question.startsWith('I am'))previousIds=data.passages?.map(p=>p.id)||[];
 if(question.startsWith('I am'))history=[{role:'user',content:question},{role:'assistant',content:data.paragraphs?.map(p=>p.text).join('\n')||''}];
}
fs.writeFileSync('data/dialogue-smoke.json',JSON.stringify(results,null,2));
if(results.some(r=>r.status!==200))process.exitCode=1;
