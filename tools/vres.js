// Offline clone of VOICE.resolve, so candidate phrasings can be checked
// against Morris's actual recordings without guessing.
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const m=html.match(/const VCLIPS=(\[.*?\]);/s);
const VCLIPS=JSON.parse(m[1]);
const norm=s=>String(s||'').replace(/[֑-ׇ]/g,'')
  .replace(/[^֐-׿0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const byText={}, byNum={};
VCLIPS.forEach(r=>{ (byText[r.t]=byText[r.t]||[]).push(r); if(r.n) byNum[r.n]=r });
const phrases=Object.keys(byText).sort((a,b)=>b.length-a.length);
function resolve(text){
  let s=norm(text); if(!s) return [];
  const out=[]; let guard=0;
  while(s && guard++<60){
    let hit=null;
    for(const p of phrases) if(s===p||s.indexOf(p+' ')===0){ hit=p; break }
    if(hit){ out.push(byText[hit][0].f); s=s.slice(hit.length).trim(); continue }
    const mm=s.match(/^(\d+)(\s|$)/);
    if(mm && byNum[mm[1]]){ out.push(byNum[mm[1]].f); s=s.slice(mm[1].length).trim(); continue }
    return {ok:false, stuckAt:s};
  }
  return s?{ok:false,stuckAt:s}:{ok:true, clips:out};
}
module.exports={resolve, VCLIPS, phrases, byNum};
if(require.main===module){
  const tests=process.argv.slice(2);
  tests.forEach(t=>{ const r=resolve(t);
    console.log(r.ok?'  OK  ':' MISS ', JSON.stringify(t),
                r.ok?'-> '+r.clips.length+' clips':'stuck at: "'+r.stuckAt+'"') });
}
