// Exhaustive: every line the game can speak, for every a,b and both genders.
//
// This mirrors the game's spoken strings by hand — it does NOT read them out
// of the source. When you change or add a line Morris says, change it here
// too, or this check will quietly go on validating the old wording.
// tools/voicetest.js is the ground-truth companion: it drives the real app.
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const VCLIPS=JSON.parse(html.match(/const VCLIPS=(\[.*?\]);/s)[1]);
const norm=s=>String(s||'').replace(/[֑-ׇ]/g,'').replace(/[^֐-׿0-9 ]/g,' ')
  .replace(/\s+/g,' ').trim();
const byText={}, byNum={};
VCLIPS.forEach(r=>{ (byText[r.t]=byText[r.t]||[]).push(r); if(r.n) byNum[r.n]=r });
const phrases=Object.keys(byText).sort((a,b)=>b.length-a.length);
function covered(text){
  let s=norm(text); if(!s) return true;
  let g=0;
  while(s && g++<80){
    let hit=null;
    for(const p of phrases) if(s===p||s.indexOf(p+' ')===0){ hit=p; break }
    if(hit){ s=s.slice(hit.length).trim(); continue }
    const m=s.match(/^(\d+)(\s|$)/);
    if(m && byNum[m[1]]){ s=s.slice(m[1].length).trim(); continue }
    return false;
  }
  return !s;
}
// curriculum data, mirrored from the game
const TIER_OF={1:0,2:0,10:1,5:2,4:3,8:4,3:5,6:6,9:7,7:8};
const BUILD={4:{from:[2,2],say:'כפול 2, ועוד פעם כפול 2'},
 8:{from:[4,4],say:'כפול 4, ועוד פעם כפול 4'},
 3:{from:[2,1],say:'כפול 2, ועוד קבוצה אחת'},
 6:{from:[5,1],say:'כפול 5, ועוד קבוצה אחת'},
 9:{from:[5,4],say:'כפול 5, ועוד כפול 4'},
 7:{from:[5,2],say:'כפול 5, ועוד כפול 2'}};
function splitFor(a,b){
  const hard=TIER_OF[a]>=TIER_OF[b]?a:b, other=hard===a?b:a, bd=BUILD[hard];
  return bd?{parts:bd.from, other, hard, say:bd.say}:null;
}
const TRAIT_REC=[...html.matchAll(/rec:'([^']*)'/g)].map(m=>m[1]);
const bad=new Map();
const check=(label,txt)=>{ if(!covered(txt)) {
  const k=label; if(!bad.has(k)) bad.set(k,[]); if(bad.get(k).length<3) bad.get(k).push(txt) } };

// --- fixed lines ---
[['pick-m','מי אתה בזירה? תבחר.'],['pick-f','מי את בזירה? תבחרי.'],
 ['hello','שלום. אני מוריס, ואני אסביר לך הכל לאט.'],
 ['marked','סימנתי לך איפה.'],
 ['wh-intro','אני מוריס. אימנתי פעם את האלוף.'],
 ['wh-help-m','תעזור לי לסדר את המחסן?'],['wh-help-f','תעזרי לי לסדר את המחסן?'],
 ['wh-tap-m','תלחץ על חתיכה כדי לשים אותה בארגז. ארבע חתיכות בכל ארגז.'],
 ['wh-tap-f','תלחצי על חתיכה כדי לשים אותה בארגז. ארבע חתיכות בכל ארגז.'],
 ['wh-full','ארגז מלא ארבע חתיכות עכשיו הבא'],
 ['wh-count','ספור איתי. ארבע, שמונה, שתים עשרה.'],
 ['wh-sum','3 כפול 4 זה 12.'],
 ['wh-name','לזה קוראים כפל. כותבים אותו ככה: שלוש כפול ארבע שווה שתים עשרה.'],
 ['st-1','לאלוף הזירה הייתה חגורה אחת'],
 ['st-2','לילה אחד היא נשברה לעשר חתיכות.'],
 ['st-3','עשרה לוחמים תפסו אותן. כל אחד שומר על חתיכה אחת.'],
 ['st-4-m','מהחתיכות בונים מגן. בלי מגן הם יפילו אותך.'],
 ['st-4-f','מהחתיכות בונים מגן. בלי מגן הם יפילו אותך.'],
 ['st-5-m','תחזיר את עשר החתיכות, ותהיה האלוף הבא.'],
 ['st-5-f','תחזירי את עשר החתיכות, ותהיי האלופה הבאה.'],
].forEach(([l,t])=>check(l,t));
TRAIT_REC.forEach((t,i)=>check('boss-intro',t));

// --- every fight line, for every a,b, both genders ---
for(let a=1;a<=10;a++) for(let b=1;b<=10;b++){
  const need=a*b, sp=splitFor(a,b);
  check('demoFirst',`תרגיל חדש. ${a} כפול ${b}. אני בונה אותו, ואפשר להסתכל.`);
  check('countBuild-plain',`${a} כפול ${b} שווה ${need}.`);
  check('objective-rung<2-m',`תבנה מגן של ${need} חתיכות. ${a} שורות של ${b}.`);
  check('objective-rung<2-f',`תבני מגן של ${need} חתיכות. ${a} שורות של ${b}.`);
  check('objective-rung2-m',`תבנה מגן של בדיוק ${need} חתיכות.`);
  check('objective-rung2-f',`תבני מגן של בדיוק ${need} חתיכות.`);
  check('recall-ask',`${a} כפול ${b} שווה`);
  check('recall-hit',`${a} כפול ${b} זה ${need}`);
  check('block-single',`${a} כפול ${b} זה ${need}.`);
  check('equivalent',`זה ${need} בדיוק. תבנה ${a} שורות של ${b}.`);
  check('missing',`תבנה מגן של ${need} חתיכות. שורות של ${b}.`);
  check('help-noSplit',`תבנה מגן של ${need} משבצות.`);
  check('teachAfterMiss',`${a} כפול ${b}. ` + (sp?sp.say:'נספור אותו יחד.'));
  if(sp){
    const [p,q]=sp.parts, other=sp.other;
    check('help-split',`תבנה ${other} כפול ${p}, ועוד ${other} כפול ${q}. ביחד זה ${need}.`);
  }
  // repair objectives: hole can be any sub-rectangle of a x b
  for(let hr=1;hr<=a;hr++) for(let hc=1;hc<=b;hc++){
    check('repair-half',`תבנה מגן של ${need} חתיכות. ועוד ${hr*hc} חתיכות.`);
    check('repair-plain',`תבנה מגן של ${need} חתיכות. בדיוק ${hr*hc} חתיכות.`);
  }
  // countBuild with a cut: cut x rows + (cols-cut) x rows
  for(let cut=1;cut<b;cut++)
    check('countBuild-cut',`${cut} כפול ${a}, ועוד ${b-cut} כפול ${a}. ביחד זה ${need}.`);
  // multi-piece block line: any set of piece areas summing to need
  for(let w=1;w<=b;w++){
    const p1=a*w, p2=a*(b-w);
    if(p2>0) check('block-split',`${p1} ועוד ${p2} זה ${need}. חסמת.`);
  }
  // a child counting single squares
  if(need<=12) check('block-ones', Array(need).fill('1').join(' ועוד ')+` זה ${need}. חסמת.`);
}
if(!bad.size) console.log('every line the game can speak is covered.');
else { console.log('LINES THAT FALL THROUGH TO THE DEVICE VOICE:\n');
  for(const [k,v] of bad){ console.log('  '+k); v.forEach(t=>console.log('      '+t)) } }
