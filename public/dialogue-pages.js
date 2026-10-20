// Page without summarizing or dropping text. Prefer a sentence boundary near
// the limit, and preserve each block's citations and quotation status.
export function dialoguePages(blocks,limit=200){
  const pages=[];let page=[],count=0;
  const flush=()=>{if(page.length)pages.push(page);page=[];count=0;};
  for(const block of blocks){
    let words=block.text.match(/\S+\s*/gu)||[];
    while(words.length){
      if(count>=limit)flush();
      let take=Math.min(words.length,limit-count);
      if(take<words.length){
        for(let n=take;n>=Math.max(1,Math.ceil(take*.75));n--){
          if(/[.!?…]["'”’)]?\s*$/u.test(words[n-1])){take=n;break;}
        }
      }
      page.push({...block,text:words.slice(0,take).join('').trim()});count+=take;
      words=words.slice(take);
      if(words.length)flush();
    }
  }
  flush();return pages;
}
