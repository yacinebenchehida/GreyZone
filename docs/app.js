(function(){
'use strict';
const M=GreyModel,$=id=>document.getElementById(id),canvas=$('scene'),ocean=new OceanScene(canvas);
let s,pop,evolve,observe,split=false,running=false,paused=false,history=[],power=null,pendingPower=null,progress=null,pendingProgress=null,completedThrough=-1,stepPowerTarget=null,worker=null,job=0,sampleResults=[],lastSampleGen=-1,last=0,accumulator=0,hasRun=false,runSeed=0,seedCounter=0,finished=false,backgroundTimer=null,animationFrame=null,snpDisplayPop=null,snpDisplayFilter=null;
function settings(){return {total:+$('total').value,ratio:+$('ratio').value,m:+$('migration').value,sample:+$('sample-size').value,loci:+$('loci').value,studies:1000};}
function number(x){return x.toLocaleString('en-GB');}
// Retain text nodes: unchanged labels must not be removed and repainted.
function setText(id,value){const el=$(id),text=String(value);if(el.textContent!==text){if(el.childNodes.length===1&&el.firstChild.nodeType===3)el.firstChild.data=text;else el.textContent=text;}}
const valueLines=new Map();
function valueLine(id,parts){
  const el=$(id),old=valueLines.get(id);
  if(!old||old.parts.length!==parts.length||parts.some((part,i)=>i%2===0&&old.parts[i]!==part)){
    const nodes=parts.map(part=>document.createTextNode(String(part)));el.replaceChildren(...nodes);valueLines.set(id,{parts:parts.slice(),nodes});return;
  }
  parts.forEach((part,i)=>{if(i%2&&old.nodes[i].data!==String(part))old.nodes[i].data=String(part);});
}
function isFixed(){const state=GreyDisplay.sorting([pop.a,pop.b]);return state.fixed===s.loci&&(s.m===0||state.opposite===0);}
function freshSeed(){
  const value=new Uint32Array(1);if(globalThis.crypto?.getRandomValues)globalThis.crypto.getRandomValues(value);else value[0]=Math.floor(Math.random()*4294967296);
  return (value[0]^Math.imul(++seedCounter,2654435761))>>>0;
}
function stopWorker(){if(worker)worker.terminate();worker=null;job++;}
function animalLabels(){
  const d=ocean.display,kind=SeaLife.info(ocean.variant);
  $('shown-west').textContent=number(d.west)+' '+kind.plural+' shown';$('shown-east').textContent=number(d.east)+' '+kind.plural+' shown';
  $('display-scale').textContent=number(d.total)+' '+kind.plural+' shown · '+(d.exact?'1 animal = 1 individual':'1 animal ≈ '+number(Math.round(d.weight))+' individuals')+' · SNP display: '+Math.min(10,s.loci)+' of '+s.loci+' markers';
  $('scene').setAttribute('aria-label',`An ocean seen from above, with ${kind.plural} swimming. A sandy landmass rises to separate the populations, with coconut palms on it.`);
}
function prepareActors(){ocean.reset(s);ocean.travelPace=Number($('travel-speed').value);ocean.variant=$('shark-design').value;animalLabels();}

function reset(){
  stopClocks();stopWorker();valueLines.clear();s=settings();runSeed=freshSeed();s.displaySeed=runSeed^0x6179a3bd;
  const [n1,n2]=M.sizes(s),cap=Math.min(150,n1,n2);
  $('sample-size').min=1;$('sample-size').step=1;$('sample-size').max=cap;
  if(s.sample>cap){$('sample-size').value=cap;s.sample=cap;}
  pop=M.initial(s);evolve=M.rng(runSeed^0x35ac17d9);observe=M.rng(runSeed^0x572109);
  split=false;running=false;paused=false;hasRun=false;finished=false;accumulator=0;last=performance.now();power=null;pendingPower=null;progress=null;pendingProgress=null;completedThrough=-1;stepPowerTarget=null;
  history=[{t:0,fst:0}];sampleResults=[];lastSampleGen=-1;prepareActors();
  $('total-out').textContent=number(s.total);$('ratio-out').textContent=s.ratio+'%';$('migration-out').textContent=s.m;$('sample-out').textContent=s.sample;
  $('n1').textContent=number(n1);$('n2').textContent=number(n2);
  $('migration-note').textContent=s.m?`${(s.m*100).toLocaleString('en-GB',{maximumFractionDigits:4})}% of each receiving population per generation. Expected contributions: west ${(s.m*n1).toLocaleString('en-GB',{maximumFractionDigits:3})}, east ${(s.m*n2).toLocaleString('en-GB',{maximumFractionDigits:3})} individuals.`:'m = 0: complete isolation after the split.';
  $('sample-description').textContent=`${s.sample} individuals per side · ${s.loci} independent ${s.loci===1?'SNP':'SNPs'}`;
  $('split').disabled=false;$('split').innerHTML='Run simulation <span>↗</span>';
  $('take-sample').disabled=true;$('take-sample').innerHTML='Take a genetic sample <span>→</span>';
  $('calculate-power').disabled=false;setText('calculate-power','Run simulation');$('power-progress').textContent='READY';
  setText('power-time','—');setText('power-scene-time','Choose settings, then Run simulation');
  setText('power-meaning','Choose Ne, m, sample size and SNP count. Watch the live run. Detection power is estimated at the same generations.');
  setText('power-note',`${number(s.studies)} study samples of this live population pair follow the live clock. Evolution continues after detection.`);
  $('power-design').textContent=`West Ne ${number(n1)} · east Ne ${number(n2)} · m ${s.m} · ${s.sample} sampled per side · ${s.loci} ${s.loci===1?'SNP':'SNPs'} · ${number(s.studies)} study samples`;
  $('sample-generation').textContent='NOT SAMPLED';$('sample-result').className='sample-result';
  $('sample-result').innerHTML='<span class="sample-icon">?</span><strong>What would your study find?</strong><p>The barrier can be real even when the genetic test misses it.</p>';$('sample-history').textContent='';sync();scheduleFrame();
}
function startRun(){reset();hasRun=true;split=true;running=true;paused=false;$('split').textContent='Run again';$('take-sample').disabled=false;sync();calculatePower();}
function sync(){const g=pop.generation;setText('generation',number(g));$('play').disabled=!split||finished;$('step').disabled=!split||finished||stepPowerTarget!==null;setText('play',finished?'Fixed':running?'Pause':'Resume');$('play').setAttribute('aria-pressed',String(paused));$('calculate-power').setAttribute('aria-pressed',String(paused));setText('phase',split?(s.m?'Two seas. A connecting channel.':'Two seas. Complete isolation.'):'One sea. One population.');$('barrier-label').hidden=!split;$('channel-label').hidden=!split||!s.m;setText('fst-value','FST '+M.fst(pop.a,pop.b).toFixed(4));if(!split)setText('story','Choose Ne, m and your study design, then press Run simulation.');else if(!g)setText('story','The split has started. Both populations begin with identical allele frequencies.');else setText('story',s.m?`Generation ${g}: drift pulls the populations apart; migrants reconnect their gene pools.`:`Generation ${g}: no individuals cross. A genetic study may still miss the separation.`);if(finished)setText('story',`All ${s.loci} SNPs are fixed at generation ${number(g)}. Run again for a new history.`);const sorted=GreyDisplay.sorting([pop.a,pop.b]);setText('sorting-status',`${sorted.total-sorted.fixed}/${sorted.total} segregating · ${sorted.fixed-sorted.opposite}/${sorted.total} fixed identically · ${sorted.opposite}/${sorted.total} fixed differently.`);renderSnps();plotFst();plotPower();}
function renderSnps(){
  const onlyVariable=$('segregating-only').checked;
  if(snpDisplayPop===pop&&snpDisplayFilter===onlyVariable)return;
  snpDisplayPop=pop;snpDisplayFilter=onlyVariable;
  const dots=new Map(GreyDisplay.markerIndices(s.loci).map((l,i)=>[l,i+1]));
  const labels={'segregating':'Segregating','shared-fixed':'Fixed identically','opposite-fixed':'Fixed differently'};
  let shown=0;const cards=[];
  for(let l=0;l<s.loci;l++){
    const a=pop.a[l],b=pop.b[l],state=GreyDisplay.locusState(a,b);
    if(onlyVariable&&state!=='segregating')continue;
    shown++;
    const bar=(side,p)=>{
      const fixed=state!=='segregating',a=GreyDisplay.allelePercent(p),b=GreyDisplay.allelePercent(1-p);
      const label=fixed?`${p===1?'A':'B'} fixed · 100%`:`A ${a} · B ${b}`;
      return `<div class="snp-frequency-row"><span>${side}</span><div class="snp-frequency-bar${fixed?' fixed':''}" role="meter" aria-label="SNP ${l+1}, ${side}, allele A frequency" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${100*p}" aria-valuetext="A ${a}, B ${b}"><i style="width:${fixed?100:100*p}%"></i></div><b title="Allele A: ${p}; allele B: ${1-p}">${label}</b></div>`;
    };
    cards.push(`<article class="snp-card ${state}" data-locus="${l+1}"><div class="snp-card-heading"><strong>SNP ${l+1}</strong>${dots.has(l)?`<span class="snp-dot-badge">dot ${dots.get(l)}</span>`:''}</div><p class="snp-state">${labels[state]}</p>${bar('West',a)}${bar('East',b)}</article>`);
  }
  $('snp-frequencies').innerHTML=cards.join('');
  $('snp-empty').hidden=shown>0;
  $('snp-list-count').textContent=`${number(shown)} of ${number(s.loci)} SNPs shown · allele frequencies`;
}

function step(){pop=M.advance(pop,s,evolve);history.push({t:pop.generation,fst:M.fst(pop.a,pop.b)});if(history.length>2000)history=history.filter((_,i)=>i%2===0||i===history.length-1);if(worker)worker.postMessage({type:'advance',id:job,generation:pop.generation,population:pop,pauseAtTarget:paused});}
function baseChart(maxX,maxY,label,opts={}){const w=340,h=145,l=35,r=329,t=16,b=115,minY=opts.minY??0,x=v=>l+v/maxX*(r-l),y=v=>b-(v-minY)/(maxY-minY)*(b-t);let svg=`<svg viewBox="0 0 ${w} ${h}" aria-hidden="true">`;if(opts.greyEnd!==undefined)svg+=`<rect x="${l}" y="${t}" width="${x(Math.min(maxX,opts.greyEnd))-l}" height="${b-t}" fill="#e8e7de"/>`;for(let i=0;i<3;i++){const v=minY+(maxY-minY)*i/2;svg+=`<line x1="${l}" x2="${r}" y1="${y(v)}" y2="${y(v)}" stroke="#dfe7df"/><text x="${l-5}" y="${y(v)+3}" text-anchor="end" fill="#80918b" font-size="8">${opts.percent?Math.round(100*v)+'%':v.toFixed(maxY<.1?3:2)}</text>`;}for(let i=0;i<3;i++){const v=maxX*i/2;svg+=`<text x="${x(v)}" y="${b+13}" text-anchor="middle" fill="#80918b" font-size="8">${Math.round(v)}</text>`;}svg+=`<text x="${l}" y="10" font-size="8" fill="#698381">${label}</text><text x="${(l+r)/2}" y="142" text-anchor="middle" font-size="8" fill="#80918b">Generations since split</text>`;return {svg,x,y,l,r,t,b};}
function plotFst(){
  const maxX=Math.max(10,Math.ceil(pop.generation/10)*10);
  const samples=(power?.points||[]).filter(p=>p.t<=pop.generation&&Number.isFinite(p.sampleFstLow)&&Number.isFinite(p.sampleFstHigh));
  // Sampled Hudson estimates may be negative; retain the lower tail in the plot.
  const lower=Math.min(0,...samples.map(p=>p.sampleFstLow)),minY=lower<0?Math.floor(lower*20)/20:0;
  const result=PowerResult.summary(power),c=baseChart(maxX,1,'Hudson FST',{minY,greyEnd:result.status==='reached'?result.generation:pop.generation});
  if(samples.length){
    const upper=samples.map(p=>c.x(p.t)+','+c.y(p.sampleFstHigh));
    const lower=[...samples].reverse().map(p=>c.x(p.t)+','+c.y(p.sampleFstLow));
    c.svg+=`<polygon class="fst-sampling-band" points="${[...upper,...lower].join(' ')}" fill="#26938d" fill-opacity=".2"/>`;
  }
  c.svg+=`<polyline points="${history.map(d=>c.x(d.t)+','+c.y(d.fst)).join(' ')}" fill="none" stroke="#26938d" stroke-width="2.4"/><circle cx="${c.x(pop.generation)}" cy="${c.y(history.at(-1).fst)}" r="3" fill="#1c7877"/></svg>`;
  $('fst-chart').innerHTML=c.svg;
  const latest=samples.at(-1),range=latest?`95% sampled FST range at generation ${latest.t}: ${latest.sampleFstLow.toFixed(4)} to ${latest.sampleFstHigh.toFixed(4)}`:`The 95% sampled FST range appears after the first ${number(s.studies)} study samples.`;
  $('fst-chart').setAttribute('aria-label',`True differentiation at generation ${pop.generation}: FST ${history.at(-1).fst.toFixed(4)}. ${range}`);
  $('fst-interval').textContent=range;
}
function plotPower(){
  const points=power?.points||[],result=PowerResult.summary(power),max=Math.max(10,Math.ceil(pop.generation/10)*10);
  const crossing=result.status==='reached'?result.generation:null;
  const c=baseChart(max,1,`Detection power · ${number(s.studies)} samples of the live pair`,{percent:true,...(hasRun?{greyEnd:crossing??pop.generation}:{})});
  c.svg+=`<line x1="${c.l}" x2="${c.r}" y1="${c.y(.8)}" y2="${c.y(.8)}" stroke="#b68a51" stroke-dasharray="4 4"/>`;
  const visible=points.filter(p=>p.t<=pop.generation);
  if(visible.length)c.svg+=`<polyline points="${visible.map(d=>c.x(d.t)+','+c.y(d.power)).join(' ')}" fill="none" stroke="#436a80" stroke-width="2.1"/>`;
  if(crossing!==null)c.svg+=`<line x1="${c.x(crossing)}" x2="${c.x(crossing)}" y1="${c.t}" y2="${c.b}" stroke="#b68a51" stroke-dasharray="3 3"/>`;
  $('power-chart').innerHTML=c.svg+'</svg>';
  $('power-chart').setAttribute('aria-label',`Live detection power through generation ${power?.max??0}; 80% guide.`);
  const checked=visible.at(-1);
  if(checked)valueLine('power-now',['Generation ',number(checked.t),': ',number(checked.hits),' / ',number(s.studies),' studies detect differentiation (',(checked.power*100).toFixed(1),'%).']);
  else valueLine('power-now',[!hasRun?'Press Run simulation to begin.':`Starting the ${number(s.studies)} study samples…`]);
  showPowerResult();
}
function showPowerResult(){
  const result=PowerResult.summary(power),checked=power?.points?.at(-1),reached=hasRun&&result.status==='reached';
  $('power-time').className='power-time'+(hasRun&&!reached?' small':'');
  $('power-unit').hidden=hasRun&&!reached;
  let title,meaning,short,status;
  if(!hasRun){title='—';meaning='Choose Ne, m and your study design, then press Run simulation.';short='Not calculated';status='Run simulation to calculate';}
  else if(result.status==='uncalibrated'){title='Check study settings';meaning='The generation-0 false-positive rate is too high in this batch. This test cannot give a reliable grey-zone estimate.';short='Study calibration needs checking';status='No reliable generation estimate';}
  else if(reached){
    title=number(result.generation);short=`${number(result.generation)} generations`;status='Grey zone overcome · 80% detection power reached';
    meaning=`First checked generation with at least 80% detection power. This number stays visible as the simulation continues beyond it.`;
  }else{
    title='Not reached yet';short='Not reached yet';status=`Live generation ${number(pop.generation)}`;
    meaning=finished?'All SNPs are fixed. This history did not reach 80% detection power.':checked?`No generation has reached 80% detection power yet. Latest estimate: ${Math.round(100*checked.power)}% at generation ${number(checked.t)}.`:`Drawing ${number(s.studies)} study samples from the current populations. The generation number will appear here when detection power first reaches 80%.`;
  }
  setText('power-time',title);setText('power-meaning',meaning);setText('power-scene-time',short);setText('power-status',status);
  if(!hasRun)valueLine('power-progress',['READY']);
  else valueLine('power-progress',['',finished?'FIXED':paused?(stepPowerTarget===null?'PAUSED':'STEPPING'):'RUNNING',' · generation ',number(pop.generation),' · ',number(s.studies),' study samples']);
  setText('power-note',`${number(s.studies)} study samples of this live population pair · Generation playback waits for each power estimate. FST and genetics continue after the first 80% crossing.`);
  setText('calculate-power',finished?'Run again':hasRun?(paused?'Resume simulation':'Pause simulation'):'Run simulation');
}
function acceptPower(data){power=data;completedThrough=Math.max(completedThrough,data.max);progress=null;if(isFixed()){finished=true;running=false;paused=true;accumulator=0;stopClocks();if(worker)worker.postMessage({type:'pause',id:job});}sync();}
function calculatePower(){
  stopWorker();power=null;pendingPower=null;progress=null;pendingProgress=null;completedThrough=-1;stepPowerTarget=null;const id=job;
  try{worker=new Worker('power-worker.js?v=steady-text-13');}catch(err){running=false;paused=true;sync();setText('power-time','Power unavailable');return;}
  worker.onmessage=event=>{
    const data=event.data;if(data.id!==job)return;
    if(data.type==='progress'){if(paused&&stepPowerTarget===null){pendingProgress=data;return;}progress=data;showPowerResult();return;}
    // Only results for the displayed generation can update the live story.
    if(data.max>pop.generation)return;
    // Queued worker messages must not repaint a paused result or its charts.
    if(paused&&stepPowerTarget===null){pendingPower=data;return;}
    if(stepPowerTarget!==null&&data.max>stepPowerTarget){pendingPower=data;return;}
    acceptPower(data);
    if(paused&&stepPowerTarget!==null){
      if(finished||data.max>=stepPowerTarget){stepPowerTarget=null;worker.postMessage({type:'pause',id:job});sync();}
      else if(completedThrough>=pop.generation){step();sync();drawScene();}
    }
  };
  worker.onerror=()=>{if(id!==job)return;setPlayback(false);stopWorker();setText('power-time','Power unavailable');setText('power-meaning','Reload the page to retry the live estimate.');};
  worker.postMessage({type:'init',settings:s,id,seed:runSeed^0x724ba719,population:pop});
}
function setPlayback(play){
  running=Boolean(play)&&split&&!finished;paused=split&&!running;accumulator=0;stepPowerTarget=null;
  stopClocks();
  if(worker)worker.postMessage({type:running?'resume':'pause',id:job});
  if(running&&pendingPower){const data=pendingPower;pendingPower=null;acceptPower(data);}
  if(running&&pendingProgress){progress=pendingProgress;pendingProgress=null;}
  sync();drawScene();scheduleFrame();ensureBackgroundClock();
}
function togglePlayback(){setPlayback(!running);}
function togglePower(){if(!hasRun||!worker||finished){startRun();return;}togglePlayback();}
function singleStep(){
  setPlayback(false);stepPowerTarget=pop.generation+1;
  if(pendingPower){acceptPower(pendingPower);pendingPower=null;}
  if(finished){stepPowerTarget=null;sync();return;}
  // A click during resampling first finishes that batch, then advances once.
  if(completedThrough>=pop.generation)step();
  else if(worker)worker.postMessage({type:'resume',id:job});
  sync();drawScene();
}
function takeSample(){if(!split)return;const result=M.sample(pop,s,observe),detected=result.p<=.05;if(lastSampleGen!==pop.generation){sampleResults=[];lastSampleGen=pop.generation;}sampleResults.push(detected);$('sample-generation').textContent='GEN '+pop.generation;$('sample-result').className='sample-result '+(detected?'detected':'missed');$('sample-result').innerHTML=`<span class="sample-icon">${detected?'✓':'≈'}</span><strong>${detected?'Difference detected':'No difference detected'}</strong><p>p ${result.p<.0001?'< 0.0001':'= '+result.p.toFixed(4)} · sampled FST ${result.fst.toFixed(4)}<br>${detected?'This sample supports genetic differentiation.':s.m?'A non-significant test does not establish panmixia.':'The populations are isolated; this sample does not reveal it.'}</p>`;$('sample-history').textContent=`At generation ${pop.generation}: ${sampleResults.filter(Boolean).length} of ${sampleResults.length} samples detected a difference. The power curve repeats this sampling ${number(s.studies)} times at each generation.`;$('take-sample').innerHTML='Sample again <span>→</span>';}
function resize(){ocean.resize();if(s)drawScene();}
function drawScene(){ocean.draw({split,paused,generation:pop.generation,m:s.m,generationRate:running?Number($('speed').value):0,p1:pop.a,p2:pop.b,markers:$('show-markers').checked});$('meet-shark').setAttribute('aria-pressed',String(ocean.selected>=0));}
function advanceClock(now){const dt=last?Math.min(.1,(now-last)/1000):0;last=now;if(running){accumulator=Math.min(1,accumulator+dt*(+$('speed').value));if(accumulator>=1&&worker&&completedThrough>=pop.generation){accumulator=0;step();sync();}}}
// Pause cancels the clocks themselves, rather than keeping a no-op frame loop alive.
function stopClocks(){
  if(animationFrame!==null){cancelAnimationFrame(animationFrame);animationFrame=null;}
  if(backgroundTimer!==null){clearTimeout(backgroundTimer);backgroundTimer=null;}
  last=performance.now();ocean.last=last/1000;
}
function scheduleFrame(){if(animationFrame===null&&!document.hidden&&!paused)animationFrame=requestAnimationFrame(frame);}
function frame(now){animationFrame=null;if(document.hidden||paused)return;advanceClock(now);drawScene();scheduleFrame();}
function backgroundTick(){backgroundTimer=null;if(document.hidden&&running){advanceClock(performance.now());ensureBackgroundClock();}}
function ensureBackgroundClock(){if(document.hidden&&running&&backgroundTimer===null)backgroundTimer=setTimeout(backgroundTick,100);}

$('shark-design').onchange=()=>{ocean.variant=$('shark-design').value;animalLabels();drawScene();};$('travel-speed').onchange=()=>{ocean.travelPace=Number($('travel-speed').value);};$('segregating-only').onchange=renderSnps;$('show-markers').onchange=drawScene;ocean.onInspect=()=>{if(paused)drawScene();};$('meet-shark').onclick=()=>{ocean.selected=ocean.selected<0?1:-1;drawScene();};$('split').onclick=startRun;$('play').onclick=togglePlayback;$('step').onclick=singleStep;$('reset').onclick=reset;$('take-sample').onclick=takeSample;$('calculate-power').onclick=togglePower;for(const id of ['total','ratio','migration','sample-size','loci'])$(id).addEventListener('change',reset);$('ratio').addEventListener('input',()=>$('ratio-out').textContent=$('ratio').value+'%');$('sample-size').addEventListener('input',()=>$('sample-out').textContent=$('sample-size').value);document.addEventListener('visibilitychange',()=>{stopClocks();scheduleFrame();ensureBackgroundClock();});new ResizeObserver(resize).observe(canvas);reset();resize();
})();
