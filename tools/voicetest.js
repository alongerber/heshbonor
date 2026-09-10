// Morris's voice must not quietly become the phone's English voice.
// This plays a full campaign, captures every line the narrator is asked
// to say, and fails if too much of it has no recording behind it.
const {chromium}=require('playwright');
const MIN_COVERAGE = 92;            // % of utterances in Morris's own voice
(async()=>{
  const EXE=process.env.CHROMIUM_PATH;
  const b=await chromium.launch(EXE?{executablePath:EXE}:{});
  const p=await b.newPage({viewport:{width:390,height:844}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(process.env.GAME_URL||'http://127.0.0.1:8899/index.html');
  await p.waitForTimeout(900);
  const out = await p.evaluate(async()=>{
    let skew=0; const RealNow=Date.now.bind(Date);
    const RD=Date; window.Date=class extends RD{
      constructor(...a){ if(!a.length) super(RealNow()+skew); else super(...a) }
      static now(){ return RealNow()+skew } };
    const sleep=ms=>new Promise(r=>setTimeout(r,ms));
    S=blank(); S.name='דני'; S.onboard=1; S.tts=true; S.sound=false; save();
    const SAID=new Map(), ROBOT=[];
    window.sayOne=(text,token,done)=>{
      const txt=gx(String(text||'')).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
      if(txt){ let c=null; try{ c=VOICE.resolve(txt) }catch(e){}
        const ok=!!(c&&c.length);
        if(!ok) ROBOT.push(txt);
        const r=SAID.get(txt)||{n:0,covered:ok}; r.n++; SAID.set(txt,r) }
      NBUSY=false; setTimeout(()=>done&&done(),0);
    };
    /* ---- the opening, tapped through the way a child does ---- */
    const tap=async(fn)=>{ try{ fn() }catch(e){} await sleep(420) };
    await tap(()=>{ const b=document.querySelector('#title .btn,#title button'); b&&b.click() });
    await tap(()=>{ $('pkBoy').parentElement.click(); $('pkGo').click() });
    await tap(()=>{ $('fname').value='דני';
      const g=document.querySelector('#name button.primary'); g&&g.click() });
    for(let i=0;i<12;i++) await tap(()=>{
      const sh=document.querySelector('#whPile .shard:not(.gone)'); sh&&sh.click() });
    await sleep(1200);
    await tap(()=>{ const n=$('whNext'); n&&n.click() });
    for(let i=0;i<6;i++) await tap(()=>{ const n=$('stNext'); n&&n.click() });
    const introRobot=[...ROBOT];
    S.onboard=1; save();

    HOME_MODE='story';
    let fights=0;
    while(S.clues<FOES.length && fights<130){
      goHome();
      const open=(HOME_MODE==='story'&&storyOpen());
      const foe = open ? storyFoe() : trainFoe();
      startFight(foe, open?'story':'training');
      for(let g=0; g<900 && F && !F.over; g++){
        await sleep(5);
        if(!$('demoCtl').hidden){ $('gotItBtn').click(); continue }
        if(F.recall && !$('recallPane').hidden && !$('rcBuild').disabled){
          String(F.need).split('').forEach(d=>padKey(d));
          if(!$('rcGo').disabled) $('rcGo').click(); continue;
        }
        if(!$('readyBtn').hidden){ $('readyBtn').click(); continue }
        if(!F.cur || F.recall || !G || !G.el.children.length) continue;
        const [a,bb]=F.cur;
        if(F.mode==='repair'){
          const h=F.hole; if(!h){F.over=true;endFight();continue}
          if(F.have>=F.need) continue;
          for(let r=h.r0;r<h.r0+h.rows;r++) for(let c=h.c0;c<h.c0+h.cols;c++){
            const el=cellAt(r,c); if(el) el.classList.add('locked','pA') }
          F.pieces.push({r0:h.r0,r1:h.r0+h.rows-1,c0:h.c0,c1:h.c0+h.cols-1,h:h.rows,w:h.cols,area:h.area});
          F.have=F.need; finishBuild();
        } else if(F.mode==='missing'){
          if(F.have>0) continue;
          const w=Math.min(bb,COLS); if(a>ROWS){F.over=true;endFight();continue}
          for(let r=0;r<a;r++) for(let c=0;c<w;c++) cellAt(r,c).classList.add('locked','pA');
          F.pieces.push({r0:0,r1:a-1,c0:0,c1:w-1,h:a,w:w,area:a*w});
          F.have=a*w; finishBuild();
        } else {
          if(F.have>0) continue;
          if(a>ROWS||bb>COLS){F.over=true;endFight();continue}
          const two=F.traitDef&&F.traitDef.forceSplit&&bb>=2;
          if(two){ const cut=Math.max(1,Math.floor(bb/2));
            for(let r=0;r<a;r++) for(let c=0;c<cut;c++) cellAt(r,c).classList.add('locked','pA');
            F.pieces.push({r0:0,r1:a-1,c0:0,c1:cut-1,h:a,w:cut,area:a*cut});
            for(let r=0;r<a;r++) for(let c=cut;c<bb;c++) cellAt(r,c).classList.add('locked','pB');
            F.pieces.push({r0:0,r1:a-1,c0:cut,c1:bb-1,h:a,w:bb-cut,area:a*(bb-cut)});
          } else {
            for(let r=0;r<a;r++) for(let c=0;c<bb;c++) cellAt(r,c).classList.add('locked','pA');
            F.pieces.push({r0:0,r1:a-1,c0:0,c1:bb-1,h:a,w:bb,area:a*bb});
          }
          F.have=a*bb; finishBuild();
        }
      }
      if(F&&!F.over){F.over=true;endFight()}
      fights++; skew+=864e5;
    }
    const lines=[...SAID.entries()].map(([t,r])=>({t,n:r.n,covered:r.covered}));
    const spoken=lines.reduce((s,l)=>s+l.n,0);
    const covered=lines.filter(l=>l.covered).reduce((s,l)=>s+l.n,0);
    return {fights, clues:S.clues, spoken, covered, introRobot,
      pct: Math.round(100*covered/spoken),
      misses: lines.filter(l=>!l.covered).sort((x,y)=>y.n-x.n).slice(0,15)};
  });
  console.log(`campaign: ${out.fights} fights, ${out.clues}/10 clues`);
  console.log(`utterances: ${out.spoken} | in Morris's own voice: ${out.covered} (${out.pct}%)`);
  if(out.introRobot && out.introRobot.length)
    console.log('\nonboarding lines with no recording:',
      [...new Set(out.introRobot)].length);
  if(out.misses.length){
    console.log('\nstill falling through to the device voice:');
    out.misses.forEach(l=>console.log(String(l.n).padStart(4),'x ',l.t.slice(0,74)));
  } else console.log('\nevery spoken line has a recording.');
  const pass = out.pct>=MIN_COVERAGE && !errs.length;
  console.log('\n'+(pass?`PASS (>= ${MIN_COVERAGE}%)`:`FAIL (need >= ${MIN_COVERAGE}%)`));
  if(errs.length) console.log('page errors:', errs.join('; '));
  await b.close();
  process.exit(pass?0:1);
})();
