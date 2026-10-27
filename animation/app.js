(function(){
'use strict';
const M=GreyModel,$=id=>document.getElementById(id),canvas=$('scene'),ocean=new OceanScene(canvas),reduced=matchMedia('(prefers-reduced-motion: reduce)');
let s,pop,evolve,observe,split=false,running=false,paused=false,history=[],power=null,worker=null,job=0,sampleResults=[],lastSampleGen=-1,last=0,accumulator=0,powerStopped=false,hasRun=false,runSeed=0,seedCounter=0;
function settings(){return {total:+$('total').value,ratio:+$('ratio').value,m:+$('migration').value,sample:+$('sample-size').value,loci:+$('loci').value};}
function number(x){return x.toLocaleString('en-GB');}
function generationLimit(){return 200000;}
function freshSeed(){
  const value=new Uint32Array(1);if(globalThis.crypto?.getRandomValues)globalThis.crypto.getRandomValues(value);else value[0]=Math.floor(Math.random()*4294967296);
  return (value[0]^Math.imul(++seedCounter,2654435761))>>>0;
}
function stopWorker(){if(worker)worker.terminate();worker=null;job++;}
function prepareActors(){ocean.reset(s);ocean.travelPace=Number($('travel-speed').value);ocean.variant=$('shark-design').value;const d=ocean.display;$('shown-west').textContent=number(d.west)+' sharks shown';$('shown-east').textContent=number(d.east)+' sharks shown';$('display-scale').textContent=number(d.total)+' sharks shown · '+(d.exact?'1 shark = 1 individual':'1 shark ≈ '+number(Math.round(d.weight))+' individuals')+' · SNP display: '+Math.min(10,s.loci)+' of '+s.loci+' markers';}
function reset(){
  stopWorker();s=settings();runSeed=freshSeed();s.displaySeed=runSeed^0x6179a3bd;
  const [n1,n2]=M.sizes(s),cap=Math.min(150,n1,n2);
  $('sample-size').min=1;$('sample-size').step=1;$('sample-size').max=cap;
  if(s.sample>cap){$('sample-size').value=cap;s.sample=cap;}
  pop=M.initial(s);evolve=M.rng(runSeed^0x35ac17d9);observe=M.rng(runSeed^0x572109);
  split=false;running=false;paused=false;hasRun=false;accumulator=0;power=null;powerStopped=false;
  history=[{t:0,fst:0}];sampleResults=[];lastSampleGen=-1;prepareActors();
  $('total-out').textContent=number(s.total);$('ratio-out').textContent=s.ratio+'%';$('migration-out').textContent=s.m;$('sample-out').textContent=s.sample;
  $('n1').textContent=number(n1);$('n2').textContent=number(n2);
  $('migration-note').textContent=s.m?`${(s.m*100).toLocaleString('en-GB',{maximumFractionDigits:4})}% of each receiving population per generation. Expected contributions: west ${(s.m*n1).toLocaleString('en-GB',{maximumFractionDigits:3})}, east ${(s.m*n2).toLocaleString('en-GB',{maximumFractionDigits:3})} individuals.`:'m = 0: complete isolation after the split.';
  $('sample-description').textContent=`${s.sample} individuals per side · ${s.loci} independent ${s.loci===1?'SNP':'SNPs'}`;
  $('split').disabled=false;$('split').innerHTML='Run simulation <span>↗</span>';
  $('take-sample').disabled=true;$('take-sample').innerHTML='Take a genetic sample <span>→</span>';
  $('calculate-power').disabled=false;$('calculate-power').textContent='Run simulation';$('power-progress').textContent='READY';
  $('power-time').textContent='Ready to run';$('power-scene-time').textContent='Choose settings, then Run simulation';
  $('power-meaning').textContent='Choose Ne, m, sample size and SNP count. The app searches for the time to 80% power automatically.';
  $('power-note').textContent='80 fresh independent histories per run. Detection time is calculated automatically.';
  $('power-design').textContent=`West Ne ${number(n1)} · east Ne ${number(n2)} · m ${s.m} · ${s.sample} sampled per side · ${s.loci} ${s.loci===1?'SNP':'SNPs'}`;
  $('sample-generation').textContent='NOT SAMPLED';$('sample-result').className='sample-result';
  $('sample-result').innerHTML='<span class="sample-icon">?</span><strong>What would your study find?</strong><p>The barrier can be real even when the genetic test misses it.</p>';$('sample-history').textContent='';sync();
}
function startRun(){reset();hasRun=true;split=true;running=true;paused=false;$('split').textContent='Run again';$('take-sample').disabled=false;sync();calculatePower();}
function sync(){const g=pop.generation;$('generation').textContent=number(g);$('play').disabled=!split||g>=generationLimit();$('step').disabled=!split||g>=generationLimit();$('play').textContent=running?'Pause':'Play';$('phase').textContent=split?(s.m?'Two seas. A connecting channel.':'Two seas. Complete isolation.'):'One sea. One population.';$('barrier-label').hidden=!split;$('channel-label').hidden=!split||!s.m;$('fst-value').textContent='FST '+M.fst(pop.a,pop.b).toFixed(4);for(const [name,p] of [['west',pop.a[0]],['east',pop.b[0]]]){$(name+'-bead').style.width=100*p+'%';$(name+'-share').textContent=Math.round(100*p)+'%';}if(!split)$('story').textContent='Choose Ne, m and your study design, then press Run simulation.';else if(!g)$('story').textContent='The split has started. Both populations begin with identical allele frequencies.';else $('story').textContent=s.m?`Generation ${g}: drift pulls the populations apart; migrants reconnect their gene pools.`:`Generation ${g}: no individuals cross. A genetic study may still miss the separation.`;if(g>=generationLimit())$('story').textContent=`Paused at ${number(generationLimit())} generations. Sample this population, or Run again for a new history.`;const sorted=GreyDisplay.sorting([pop.a,pop.b]);$('sorting-status').textContent=`Fixed on both sides: ${sorted.fixed}/${sorted.total} SNPs · opposite fixed alleles: ${sorted.opposite}/${sorted.total}. Significance does not freeze allele frequencies.`;plotFst();plotPower();}
function step(){pop=M.advance(pop,s,evolve);history.push({t:pop.generation,fst:M.fst(pop.a,pop.b)});if(history.length>2000)history=history.filter((_,i)=>i%2===0||i===history.length-1);if(pop.generation>=generationLimit()){running=false;paused=true;}}
function baseChart(maxX,maxY,label,opts={}){const w=340,h=145,l=35,r=329,t=16,b=115,x=v=>l+v/maxX*(r-l),y=v=>b-v/maxY*(b-t);let svg=`<svg viewBox="0 0 ${w} ${h}" aria-hidden="true">`;if(opts.greyEnd!==undefined)svg+=`<rect x="${l}" y="${t}" width="${x(Math.min(maxX,opts.greyEnd))-l}" height="${b-t}" fill="#e8e7de"/><text x="${l+7}" y="${t+12}" font-size="8" fill="#8c8c7b">GREY ZONE · ESTIMATED</text>`;for(let i=0;i<3;i++){const v=maxY*i/2;svg+=`<line x1="${l}" x2="${r}" y1="${y(v)}" y2="${y(v)}" stroke="#dfe7df"/><text x="${l-5}" y="${y(v)+3}" text-anchor="end" fill="#80918b" font-size="8">${opts.percent?Math.round(100*v)+'%':v.toFixed(maxY<.1?3:2)}</text>`;}for(let i=0;i<3;i++){const v=maxX*i/2;svg+=`<text x="${x(v)}" y="${b+13}" text-anchor="middle" fill="#80918b" font-size="8">${Math.round(v)}</text>`;}svg+=`<text x="${l}" y="10" font-size="8" fill="#698381">${label}</text><text x="${(l+r)/2}" y="142" text-anchor="middle" font-size="8" fill="#80918b">Generations since split</text>`;return {svg,x,y,l,r,t,b};}
function plotFst(){const maxX=Math.max(100,Math.ceil(pop.generation/100)*100),maxY=Math.max(.02,...history.map(d=>d.fst))*1.15;let c=baseChart(maxX,maxY,'Hudson FST');c.svg+=`<polyline points="${history.map(d=>c.x(d.t)+','+c.y(d.fst)).join(' ')}" fill="none" stroke="#26938d" stroke-width="2.4"/><circle cx="${c.x(pop.generation)}" cy="${c.y(history.at(-1).fst)}" r="3" fill="#1c7877"/></svg>`;$('fst-chart').innerHTML=c.svg;$('fst-chart').setAttribute('aria-label',`True differentiation at generation ${pop.generation}: FST ${history.at(-1).fst.toFixed(4)}`);}
function plotPower(){
  const max=power?.points?.length?Math.max(5,Math.ceil(Math.max(1,power.max)*1.15/5)*5):100,points=power?.points||[],result=PowerResult.summary(power);
  const crossing=result.status==='reached'?result.generation:null;
  const c=baseChart(max,1,'Probability of detecting differentiation',{percent:true,...(power?.complete&&result.status!=='uncalibrated'?{greyEnd:crossing??max}:{})});
  c.svg+=`<line x1="${c.l}" x2="${c.r}" y1="${c.y(.8)}" y2="${c.y(.8)}" stroke="#b68a51" stroke-dasharray="4 4"/><text x="${c.r}" y="${c.y(.8)-4}" text-anchor="end" fill="#a08054">80% guide</text>`;
  if(points.length)c.svg+=`<polyline points="${points.map(d=>c.x(d.t)+','+c.y(d.power)).join(' ')}" fill="none" stroke="#436a80" stroke-width="2.1"/>`;
  if(crossing!==null)c.svg+=`<line x1="${c.x(crossing)}" x2="${c.x(crossing)}" y1="${c.t}" y2="${c.b}" stroke="#b68a51" stroke-dasharray="3 3"/>`;
  if(split&&pop.generation<=max){const x=c.x(pop.generation);c.svg+=`<line x1="${x}" x2="${x}" y1="${c.t}" y2="${c.b}" stroke="#2b857f" stroke-width="1.5"/><text x="${Math.max(c.l+2,Math.min(c.r-2,x))}" y="${c.t+11}" text-anchor="${x>(c.l+c.r)/2?'end':'start'}" fill="#216e68">Now: ${pop.generation}</text>`;}
  $('power-chart').innerHTML=c.svg+'</svg>';
  $('power-chart').setAttribute('aria-label',`Detection probability from generation 0 to ${max}. The amber line marks the 80% guide; the green line is the current generation.`);
  const current=power?.complete?PowerResult.at(points,pop.generation):null;
  const through=points.at(-1)?.t??0;
  $('power-now').textContent=!split?'Run simulation to follow your current generation on this curve.':power?.complete&&pop.generation>through?(result.status==='reached'?`Live generation ${number(pop.generation)} is past the estimated 80% guide (~${number(result.generation)} generations). Allele frequencies continue to evolve.`:`Live generation ${number(pop.generation)} is beyond the last fully checked time (${number(through)}). No later power is assumed.`):`Green line: current generation ${number(pop.generation)}.`+(current===null?' The automatic power search is still running.':` Estimated detection probability: ${Math.round(100*current)}%.`);

}
function showPowerResult(){
  const result=PowerResult.summary(power),complete=power?.complete;
  $('power-time').className='power-time'+(result.status==='reached'?'':' small');
  if(result.status==='reached'){
    $('power-time').textContent='~'+number(result.generation)+' generations';
    $('power-meaning').textContent='In this batch of 80 fresh histories, at least 80% of studies detect differentiation at this checked generation.';
  }else if(result.status==='not-reached'){
    $('power-time').textContent='Not reached';
    $('power-meaning').textContent=`80% power was not reached in the ${number(result.limit)} generations fully checked in this batch. ${power.reason==='fixed'?'These histories have reached fixed allele frequencies.':'The automatic search stopped at its computation limit; this does not establish that 80% can never be reached.'}`;
  }else if(result.status==='unavailable'){
    $('power-time').textContent='No estimate yet';$('power-meaning').textContent='The search stopped before a complete checkpoint could be evaluated. Run again to retry.';
  }else if(result.status==='uncalibrated'){
    $('power-time').textContent='Check study settings';
    $('power-meaning').textContent=`The test detected a difference in ${Math.round(result.nullRate*100)}% of generation-0 studies, when the populations were identical. This detection-time estimate is unreliable.`;
  }else{
    $('power-time').textContent=powerStopped?'Search stopped':hasRun?'Searching…':'Ready to run';
    $('power-meaning').textContent=powerStopped?'The search stopped before a result was found. Run again for a fresh batch.':hasRun?'Searching forward across 80 independent histories until the 80% guide is reached.':'Choose your parameters, then press Run simulation.';
  }
  $('power-scene-time').textContent=result.status==='reached'?`80% guide: ~${number(result.generation)} generations`:result.status==='not-reached'?`80% not reached within ${number(result.limit)} generations`:result.status==='uncalibrated'?'Power estimate: check study settings':powerStopped?'Detection-time search stopped':hasRun?'Searching for the 80% generation…':'Choose settings, then Run simulation';
  if(complete)$('power-note').textContent=`80 fresh independent histories · Monte Carlo SE ≤ 5.6 percentage points. `+(s.sample<10?'Very small samples use an approximate test; interpret cautiously.':'A simulated guide, not an exact biological boundary.');
}
function calculatePower(){
  stopWorker();power=null;powerStopped=false;const id=job;
  try{worker=new Worker('power-worker.js?v=fresh-m-1');}catch(err){$('power-progress').textContent='UNAVAILABLE';$('power-time').textContent='Search unavailable';$('power-scene-time').textContent='Detection-time search unavailable';$('power-meaning').textContent='Open the published page to run the search.';return;}
  $('calculate-power').disabled=false;$('calculate-power').textContent='Stop search';$('power-progress').textContent='Searching · 80 fresh histories';
  $('power-note').textContent='Checking 80 fresh histories at increasing generations. Stop search cancels the calculation.';showPowerResult();plotPower();
  worker.onmessage=event=>{
    if(event.data.id!==job)return;power=event.data;
    $('power-progress').textContent=power.complete?`SEARCH COMPLETE · 80 histories · through generation ${number(power.max)}`:`Checking generation ${number(power.generation)} · ${power.done} / 80 histories`;
    if(power.complete){$('calculate-power').textContent='Run again';worker.terminate();worker=null;}
    showPowerResult();plotPower();
  };
  worker.onerror=()=>{if(id!==job)return;stopWorker();$('power-progress').textContent='COULD NOT FINISH';$('power-time').textContent='Search unavailable';$('power-scene-time').textContent='Detection-time search unavailable';$('power-meaning').textContent='The calculation could not finish. Run again to retry.';$('calculate-power').textContent='Run again';};
  worker.postMessage({settings:s,id,seed:runSeed^0x724ba719});
}
function togglePower(){
  if(!worker){startRun();return;}
  stopWorker();powerStopped=true;$('power-progress').textContent='STOPPED';$('calculate-power').textContent='Run again';$('power-note').textContent='Search stopped. The live population continues independently.';showPowerResult();
}
function takeSample(){if(!split)return;const result=M.sample(pop,s,observe),detected=result.p<=.05;if(lastSampleGen!==pop.generation){sampleResults=[];lastSampleGen=pop.generation;}sampleResults.push(detected);$('sample-generation').textContent='GEN '+pop.generation;$('sample-result').className='sample-result '+(detected?'detected':'missed');$('sample-result').innerHTML=`<span class="sample-icon">${detected?'✓':'≈'}</span><strong>${detected?'Difference detected':'No difference detected'}</strong><p>p ${result.p<.0001?'< 0.0001':'= '+result.p.toFixed(4)} · sampled FST ${result.fst.toFixed(4)}<br>${detected?'This sample supports genetic differentiation.':s.m?'A non-significant test does not establish panmixia.':'The populations are isolated; this sample does not reveal it.'}</p>`;$('sample-history').textContent=`At generation ${pop.generation}: ${sampleResults.filter(Boolean).length} of ${sampleResults.length} samples detected a difference. This is one population history, not the power curve.`;$('take-sample').innerHTML='Sample again <span>→</span>';}
function resize(){ocean.resize();}
function drawScene(){ocean.draw({split,paused,generation:pop.generation,m:s.m,generationRate:running?Number($('speed').value):0,p1:pop.a,p2:pop.b,markers:$('show-markers').checked});$('meet-shark').setAttribute('aria-pressed',String(ocean.selected>=0));}
function frame(now){const dt=last?Math.min(.1,(now-last)/1000):0;last=now;if(!document.hidden){if(running){accumulator+=dt*(+$('speed').value);let changed=false;while(accumulator>=1&&running){accumulator--;step();changed=true;}if(changed)sync();}drawScene();}requestAnimationFrame(frame);}
$('shark-design').onchange=()=>{ocean.variant=$('shark-design').value;};$('travel-speed').onchange=()=>{ocean.travelPace=Number($('travel-speed').value);};$('meet-shark').onclick=()=>{ocean.selected=ocean.selected<0?1:-1;};$('split').onclick=startRun;$('play').onclick=()=>{running=!running;paused=!running;accumulator=0;sync();};$('step').onclick=()=>{running=false;paused=true;accumulator=0;step();sync();};$('reset').onclick=reset;$('take-sample').onclick=takeSample;$('calculate-power').onclick=togglePower;for(const id of ['total','ratio','migration','sample-size','loci'])$(id).addEventListener('change',reset);$('ratio').addEventListener('input',()=>$('ratio-out').textContent=$('ratio').value+'%');$('sample-size').addEventListener('input',()=>$('sample-out').textContent=$('sample-size').value);document.addEventListener('visibilitychange',()=>{if(document.hidden){running=false;paused=split;accumulator=0;sync();}});new ResizeObserver(resize).observe(canvas);reset();resize();requestAnimationFrame(frame);
})();
