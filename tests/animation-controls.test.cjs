const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

// Run the real app, scene and model with a deterministic frame clock and a
// drawing-only canvas stub. Button handlers and both clocks are exercised.
function app(overrides={}){
  const elements=new Map(),listeners={},gradient={addColorStop(){}};
  const drawing=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(o,k)=>o[k]||(()=>{})});
  const defaults={total:20000,ratio:50,migration:0,'sample-size':40,loci:50,speed:6,'travel-speed':.95,'shark-design':'hammer',...overrides};
  function textNode(value){return {nodeType:3,data:String(value)};}
  function element(id){
    if(!elements.has(id))elements.set(id,{value:String(defaults[id]??''),checked:false,disabled:false,hidden:false,style:{},options:[],childNodes:[],attributes:{},
      get firstChild(){return this.childNodes[0];},
      get textContent(){return this.childNodes.map(n=>n.data).join('');},
      set textContent(value){this.childNodes=[textNode(value)];},
      replaceChildren(...nodes){this.childNodes=nodes;},
      setAttribute(name,value){this.attributes[name]=value;},addEventListener(){},
      getContext:()=>drawing,getBoundingClientRect:()=>({width:940,height:540})});
    return elements.get(id);
  }
  let time=1000,scene,timerId=0,frameId=0,framesRun=0,seed=100;const timers=new Map(),frames=new Map(),workers=[];let intersection;
  const document={hidden:false,getElementById:element,createTextNode:textNode,createElement:()=>({getContext:()=>drawing}),addEventListener:(event,fn)=>{listeners[event]=fn;}};
  const world={Math,Number,document,crypto:{getRandomValues(value){value[0]=++seed;return value;}},setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id),Worker:class{
      constructor(){workers.push(this);this.points=[];}
      postMessage(data){
        this.request=data;if(data.type==='init'){this.initialRequest=data;this.points=[{t:data.population?.generation??0,power:.05,hits:50}];}
        if(data.type==='advance'){this.lastAdvance=data;this.points.push({t:data.generation,power:.05,hits:50});}
        if(overrides.autoPower!==false&&(data.type==='init'||data.type==='advance'))this.onmessage({data:{id:data.id,max:data.population?.generation??data.generation??0,reps:1000,points:this.points.map(p=>({...p}))}});
      }
      terminate(){this.terminated=true;}
    },devicePixelRatio:1,matchMedia:()=>({matches:false}),performance:{now:()=>time},
    Path2D:class{constructor(){return drawing;}},ResizeObserver:class{observe(){}},requestAnimationFrame:fn=>{frames.set(++frameId,fn);return frameId;},cancelAnimationFrame:id=>frames.delete(id)};
  if(overrides.intersection)world.IntersectionObserver=class{constructor(fn){intersection=fn;}observe(){}};
  vm.createContext(world);
  for(const name of ['model.js','population-display.js','swim-motion.js','shark-character.js','fish-character.js','marine-life.js','animal-cache.js','island-scene.js','ocean-scene.js','power-result.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../animation',name),'utf8'),world);
  const Scene=world.OceanScene;world.OceanScene=class extends Scene{constructor(...args){super(...args);scene=this;}};
  if(overrides.advanceOverride)world.GreyModel.advance=overrides.advanceOverride;
  if(overrides.startGeneration!==undefined){const initial=world.GreyModel.initial;world.GreyModel.initial=s=>({...initial(s),generation:overrides.startGeneration});}
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../animation/app.js'),'utf8'),world);
  const tick=(n=1,frameMs=1000/60)=>{for(let i=0;i<n;i++){time+=frameMs;for(const [id,fn]of [...frames]){frames.delete(id);framesRun++;fn(time);}}};
  const click=id=>{assert(!element(id).disabled,`${id} should be enabled`);element(id).onclick();};
  const state=()=>({generation:element('generation').textContent,clock:scene.clock,migrationBudget:scene.migrationBudget,animals:JSON.stringify(scene.animals),fst:element('fst-chart').innerHTML});
  return {element,tick,click,state,scene,workers,oceanVisibility(visible){intersection([{isIntersecting:visible}]);},pendingClocks:()=>({frames:frames.size,timers:timers.size,framesRun}),runTimers(){for(const [id,fn]of [...timers]){timers.delete(id);fn();}},visibility(hidden){document.hidden=hidden;listeners.visibilitychange();}};
}

test('Pause freezes generations, shark motion, body waves and the ocean clock; Play resumes without a reset or time jump',()=>{
  const a=app({total:200});a.tick(10);const initial=a.state();
  a.tick(10);assert(a.state().clock>initial.clock,'The introductory sea should still swim');
  a.click('split');a.tick(60);
  assert.equal(a.element('play').textContent,'Pause');assert(Number(a.state().generation)>0);
  a.click('play');assert.equal(a.element('play').textContent,'Resume');
  const paused=a.state(),clocks=a.pendingClocks();assert.equal(clocks.frames,0);assert.equal(clocks.timers,0);a.tick(600);assert.deepEqual(a.pendingClocks(),clocks,'No animation callback should run while paused');
  assert.deepEqual(a.state(),paused,'Both simulation and decorative clocks must stay frozen');
  // Inspecting or sampling the paused scene must not restart it.
  a.click('meet-shark');a.click('take-sample');a.tick(10);assert.deepEqual(a.state(),paused);
  a.click('play');assert.deepEqual(a.state(),paused,'Resume must not reset any state');
  a.tick();assert(a.state().clock>paused.clock&&a.state().clock-paused.clock<.02,'Paused wall time must not be replayed');
  a.tick(60);assert(Number(a.state().generation)>Number(paused.generation));assert.notEqual(a.state().animals,paused.animals);
});

test('single-step stays paused, changing tabs does not stop the run, and Reset restores the introductory sea',()=>{
  const a=app();a.tick();a.click('split');a.tick(60);
  a.click('step');const stepped=a.state();assert.equal(a.element('play').textContent,'Resume');
  a.tick(60);assert.deepEqual(a.state(),stepped);
  a.click('step');assert.equal(Number(a.state().generation),Number(stepped.generation)+1);
  assert.equal(a.state().animals,stepped.animals);
  a.click('play');a.tick(10);const beforeHidden=Number(a.state().generation);a.visibility(true);
  for(let i=0;i<10;i++){a.tick(30);a.runTimers();}
  assert(Number(a.state().generation)>beforeHidden);assert.equal(a.element('play').textContent,'Pause');
  a.visibility(false);const hiddenGeneration=Number(a.state().generation);a.tick(60);assert(Number(a.state().generation)>hiddenGeneration);
  a.click('reset');a.tick();const reset=a.state();assert.equal(Number(reset.generation),0);
  a.tick(20);assert(a.state().clock>reset.clock);assert.notEqual(a.state().animals,reset.animals);
});


test('live power follows the clock, stays running after detection and reruns have fresh seeds',()=>{
  const a=app({autoPower:false});assert.equal(a.workers.length,0);a.click('split');const w=a.workers[0],id=w.request.id;
  assert.equal(w.request.type,'init');assert.equal(typeof w.request.seed,'number');assert.equal(w.request.population.generation,0);
  w.onmessage({data:{id,max:0,reps:1000,points:[{t:0,power:.05,hits:50}]}});
  a.click('step');assert.equal(w.request.type,'advance');assert.equal(w.request.generation,1);assert.equal(w.request.population.generation,1);
  w.onmessage({data:{id,max:1,points:[{t:0,power:.05,hits:50},{t:1,power:.6,hits:600}]}});
  assert.equal(a.element('power-time').textContent,'Not reached yet');
  a.click('step');
  w.onmessage({data:{id,max:2,points:[{t:0,power:.05,hits:50},{t:1,power:.6,hits:600},{t:2,power:.85,hits:850}]}});
  assert.equal(a.element('power-time').textContent,'Confirming…');assert.equal(a.element('power-unit').hidden,true);
  const points=[{t:0,power:.05,hits:50},{t:1,power:.6,hits:600},{t:2,power:.85,hits:850}];
  for(let t=3;t<=6;t++){a.click('step');points.push({t,power:.85,hits:850});w.onmessage({data:{id,max:t,points:points.slice()}});}
  assert.equal(a.element('power-time').textContent,'2');assert.equal(a.element('power-unit').hidden,false);assert.match(a.element('power-scene-time').textContent,/2 generations/);assert(!w.terminated);
  assert.match(a.element('power-meaning').textContent,/generation 2 to 6/);
  const seed=a.workers[0].initialRequest.seed;a.click('split');assert.notEqual(a.workers[1].request.seed,seed);
});
test('the result-panel pause controls the live simulation, stale batches cannot update a rerun',()=>{
  const a=app();a.click('split');const old=a.workers[0],id=old.request.id;a.click('calculate-power');
  assert.equal(a.element('calculate-power').textContent,'Resume simulation');const g=a.state().generation;a.tick(30);assert.equal(a.state().generation,g);
  a.click('calculate-power');assert.equal(a.element('calculate-power').textContent,'Pause simulation');
  a.click('split');old.onmessage({data:{id,max:1,points:[{t:0,power:.05},{t:1,power:1}]}});
  assert.notEqual(a.element('power-time').textContent,'1');
});

test('a ten-individual 10:90 split caps the sample at one without an invalid slider range',()=>{
  const a=app({total:10,ratio:10,'sample-size':40});
  assert.equal(a.scene.animals.length,10);assert.equal(a.scene.display.west,1);
  assert.equal(a.element('sample-size').min,1);assert.equal(a.element('sample-size').max,1);assert.equal(a.element('sample-size').value,1);
  a.click('split');a.click('take-sample');assert.match(a.element('sample-result').innerHTML,/sampled FST/);
});

test('isolated 100-individual live history fixes the ten displayed SNPs and keeps genotype colours uniform',()=>{
  const a=app({total:100,loci:50,'sample-size':20});a.click('split');
  // Use the actual +1 handler to advance the real model without expensive decorative frames.
  const draw=a.scene.draw;a.scene.draw=()=>{};
  for(let i=0;i<1600&&!a.element('step').disabled;i++)a.click('step');
  a.scene.draw=draw;
  a.element('show-markers').checked=true;a.element('show-markers').onchange();a.tick();
  assert.match(a.element('sorting-status').textContent,/0\/50 segregating/);
  assert.equal(a.element('fst-value').textContent,'FST 1.0000');assert.equal(a.element('play').textContent,'Fixed');assert(a.element('play').disabled);
  const fixed=a.state();a.tick(60);assert.deepEqual(a.state(),fixed);
  const cache=a.scene.markerCache;
  for(let dot=0;dot<10;dot++)for(const side of [0,1]){
    const sharks=a.scene.animals.filter(x=>x.side===side),expected=cache.data.get(sharks[0].id)[dot][0];
    for(const shark of sharks)assert(cache.data.get(shark.id)[dot].every(copy=>copy===expected));
  }
});


test('Pause freezes queued confirmation and both charts; Resume applies the confirmed start',()=>{
  const a=app({total:100,autoPower:false});a.click('split');const w=a.workers[0],id=w.initialRequest.id,points=[{t:0,power:.05,hits:50}];
  w.onmessage({data:{id,max:0,points:points.slice()}});
  for(let t=1;t<=4;t++){a.click('step');points.push({t,power:.9,hits:900});w.onmessage({data:{id,max:t,points:points.slice()}});}
  assert.equal(a.element('power-time').textContent,'Confirming…');assert.match(a.element('power-scene-time').textContent,/4\/5/);
  a.click('play');a.tick(30);a.click('play');assert.equal(w.request.type,'pause');
  const before={title:a.element('power-time').textContent,curve:a.element('power-chart').innerHTML,now:a.element('power-now').textContent,fst:a.element('fst-chart').innerHTML};
  points.push({t:5,power:.9,hits:900});w.onmessage({data:{id,max:5,points:points.slice()}});a.tick(60);
  assert.deepEqual({title:a.element('power-time').textContent,curve:a.element('power-chart').innerHTML,now:a.element('power-now').textContent,fst:a.element('fst-chart').innerHTML},before);
  a.click('play');assert.equal(w.request.type,'resume');assert.equal(a.element('power-time').textContent,'1');
  a.tick(30);a.click('calculate-power');assert.equal(w.request.type,'pause');assert.equal(a.element('power-time').textContent,'1');assert.equal(a.element('power-unit').hidden,false);
  const paused=a.state();a.tick(60);assert.deepEqual(a.state(),paused);
});


test('generation playback waits for each 1000-study estimate while the sharks keep swimming',()=>{
  const a=app({total:20,autoPower:false});a.click('split');const w=a.workers[0],id=w.initialRequest.id;
  assert.equal(w.initialRequest.settings.studies,1000);
  a.tick(120);assert.equal(Number(a.state().generation),0);
  w.onmessage({data:{id,max:0,reps:1000,points:[{t:0,power:.05,hits:50}]}});
  a.tick(60);assert.equal(Number(a.state().generation),1);assert.equal(w.lastAdvance.generation,1);
  const before=a.state();a.tick(60);assert.equal(Number(a.state().generation),1);assert.notEqual(a.state().animals,before.animals);
  w.onmessage({data:{type:'progress',id,generation:1,done:500,reps:1000}});assert.match(a.element('power-progress').textContent,/RUNNING · generation 1 · 1,000 study samples/);
  assert(!a.element('step').disabled,'Step stays available while a generation is being sampled');
  w.onmessage({data:{id,max:1,reps:1000,points:[{t:0,power:.05,hits:50},{t:1,power:.1,hits:100}]}});
  a.tick();assert.equal(Number(a.state().generation),2);a.tick(60);assert.equal(Number(a.state().generation),2);
});


test('automatic completion checks every numerical SNP and continues after the detection guide',()=>{
  const a=app({total:20,loci:20,advanceOverride:(p,s)=>{
    const a=Array(s.loci).fill(0),b=Array(s.loci).fill(1);if(p.generation<2){a[1]=.5;b[1]=.5;}
    return {a,b,generation:p.generation+1};
  }});a.click('split');a.click('step');assert.match(a.element('sorting-status').textContent,/19\/20/);assert(!a.element('play').disabled);
  a.click('step');assert(!a.element('play').disabled);a.click('step');assert(a.element('play').disabled);assert.equal(a.element('play').textContent,'Fixed');assert.match(a.element('sorting-status').textContent,/20\/20/);
});
test('migration prevents a transient opposite fixation from ending the run',()=>{
  const a=app({total:20,loci:5,migration:.01,advanceOverride:(p,s)=>({a:Array(s.loci).fill(0),b:Array(s.loci).fill(p.generation===0?1:0),generation:p.generation+1})});
  a.click('split');a.click('step');assert(!a.element('play').disabled);a.click('step');assert(a.element('play').disabled);assert.equal(a.element('play').textContent,'Fixed');
});
test('a generation beyond the former 200000 limit remains runnable when SNPs still segregate',()=>{
  const a=app({total:20,loci:5,startGeneration:200000});a.click('split');a.click('step');
  assert.equal(Number(a.state().generation.replaceAll(',','')),200001);assert(!a.element('play').disabled);assert(!a.element('step').disabled);
});


test('pausing in a background tab cancels every timer and resumes with one clock',()=>{
  const a=app({total:20});a.click('split');a.visibility(true);
  assert.equal(a.pendingClocks().frames,0);assert.equal(a.pendingClocks().timers,1);
  a.click('calculate-power');assert.equal(a.pendingClocks().timers,0);
  const paused=a.state();a.tick(600);a.runTimers();assert.deepEqual(a.state(),paused);
  a.visibility(false);assert.equal(a.pendingClocks().frames,0);
  a.click('play');assert.equal(a.pendingClocks().frames,1);
  a.click('play');assert.equal(a.pendingClocks().frames,0);
  a.click('play');assert.equal(a.pendingClocks().frames,1);
  a.tick(60);assert(Number(a.state().generation)>Number(paused.generation));
});


test('FST sampling band uses only completed live generations, shows negative estimates and freezes with either Pause control',()=>{
  const a=app({total:20,autoPower:false});a.click('split');const w=a.workers[0],id=w.initialRequest.id;
  assert(!a.element('fst-chart').innerHTML.includes('fst-sampling-band'));
  const initial={t:0,power:.05,hits:50,sampleFstLow:-.03,sampleFstHigh:.08};
  w.onmessage({data:{id,max:0,points:[initial]}});a.tick(30);
  a.click('play');const frozen=a.element('fst-chart').innerHTML;
  assert(frozen.includes('fst-sampling-band'));assert(frozen.includes('-0.05'));
  const later={t:1,power:.2,hits:200,sampleFstLow:.01,sampleFstHigh:.2};
  w.onmessage({data:{id,max:1,points:[initial,later]}});
  assert.equal(a.element('fst-chart').innerHTML,frozen);
  assert.match(a.element('fst-interval').textContent,/generation 0: -0.0300 to 0.0800/);
  a.click('calculate-power');assert.match(a.element('fst-interval').textContent,/generation 1: 0.0100 to 0.2000/);
  a.click('calculate-power');const paused=a.element('fst-chart').innerHTML;a.tick(120);assert.equal(a.element('fst-chart').innerHTML,paused);
  assert(!paused.includes('NaN'));
});


test('all 500 SNPs have paired frequency bars, the first ten labelled as shown on animals, and an optional segregating-only filter',()=>{
  const a=app({total:100,loci:500,advanceOverride:(p,s)=>{
    const a=Array(s.loci).fill(1),b=Array(s.loci).fill(1);
    a[0]=0;b[0]=1;a[499]=.999999;b[499]=.5;
    return {a,b,generation:p.generation+1};
  }});
  assert.equal((a.element('snp-frequencies').innerHTML.match(/class="snp-card /g)||[]).length,500);
  assert.equal((a.element('snp-frequencies').innerHTML.match(/class="snp-dot-badge"/g)||[]).length,10);
  const cards=a.element('snp-frequencies').innerHTML.split('<article').slice(1);
  for(let i=0;i<cards.length;i++)assert.equal(cards[i].includes('On animal'),i<10);
  assert(!a.element('snp-frequencies').innerHTML.includes('dot 1'));
  a.click('split');a.click('step');const html=a.element('snp-frequencies').innerHTML;
  assert(html.includes('SNP 500'));assert(html.includes('>99.99%'));
  assert.equal((html.match(/role="meter"/g)||[]).length,1000);
  assert.match(a.element('sorting-status').textContent,/1\/500 segregating/);
  a.element('segregating-only').checked=true;a.element('segregating-only').onchange();
  const filtered=a.element('snp-frequencies').innerHTML;
  assert.equal((filtered.match(/class="snp-card /g)||[]).length,1);
  assert(filtered.includes('SNP 500'));assert(!filtered.includes('On animal'));assert(!filtered.includes('dot 10'));
  assert.match(a.element('snp-list-count').textContent,/1 of 500 SNPs shown/);
  a.element('segregating-only').checked=false;a.element('segregating-only').onchange();
  assert.equal((a.element('snp-frequencies').innerHTML.match(/class="snp-card /g)||[]).length,500);
});

test('a paused close-up uses SNP 1–10 labels and genotype dosages even when the overview markers are hidden',()=>{
  const a=app({total:20,loci:50});a.click('split');a.click('play');
  const labels=[];a.scene.c.fillText=(text)=>labels.push(text);
  assert.equal(a.element('show-markers').checked,false);const before=a.state();
  a.click('meet-shark');assert(a.scene.markerCache);
  assert(labels.includes('Genotype = 0, 1 or 2 copies of allele A'));
  assert(labels.includes('SNP 1')&&labels.includes('SNP 10'));assert(!labels.includes('SNP 11'));assert(!labels.some(x=>/^dot \d/.test(x)));assert(labels.includes('SNPs 1–5 left · 6–10 right · head → tail'));assert.deepEqual(Array.from(a.scene.markerCache.indices),[0,1,2,3,4,5,6,7,8,9]);
  assert(labels.some(x=>['0','1','2'].includes(x)));
  assert(labels.some(x=>['B/B','A/B','A/A'].includes(x)));
  a.tick(120);assert.deepEqual(a.state(),before);
});

test('animal selection preserves the live history, markers and pause state for every option',()=>{
  const a=app({total:20,loci:10});assert.equal(a.element('shark-design').value,'hammer');
  a.click('split');a.tick(20);a.click('play');a.click('meet-shark');
  const worker=a.workers[0],seed=worker.initialRequest.seed;
  for(const kind of ['turtle','surgeon','tuna','orca','seal','classic','hammer']){
    const before=a.state();a.element('shark-design').value=kind;a.element('shark-design').onchange();
    assert.equal(a.scene.variant,kind);assert.deepEqual(a.state(),before);assert.equal(a.workers.length,1);assert.equal(worker.initialRequest.seed,seed);
    assert.equal(a.pendingClocks().frames,0);assert.equal(a.element('play').textContent,'Resume');
    a.tick(20);assert.deepEqual(a.state(),before);
    a.click('calculate-power');a.tick(6);assert(a.state().clock>before.clock);
    a.click('play');const paused=a.state();a.tick(20);assert.deepEqual(a.state(),paused);
  }
});


test('live status labels retain their nodes and +1 does not blink during resampling',()=>{
  const a=app({total:100,autoPower:false});a.click('split');const w=a.workers[0],id=w.initialRequest.id;
  const initial={t:0,power:.05,hits:50};w.onmessage({data:{id,max:0,points:[initial]}});
  const progressNodes=a.element('power-progress').childNodes.slice(),resultNodes=a.element('power-now').childNodes.slice();
  a.tick(60);assert.equal(Number(a.state().generation),1);assert(!a.element('step').disabled);
  for(const done of [0,100,500,999]){
    w.onmessage({data:{type:'progress',id,generation:1,done,reps:1000}});
    assert.equal(a.element('power-progress').textContent,'RUNNING · generation 1 · 1,000 study samples');
    assert.equal(a.element('power-now').textContent,'Generation 0: 50 / 1,000 studies detect differentiation (5.0%).');
    assert(!a.element('step').disabled);
    a.element('power-progress').childNodes.forEach((node,i)=>assert.equal(node,progressNodes[i]));
    a.element('power-now').childNodes.forEach((node,i)=>assert.equal(node,resultNodes[i]));
  }
  w.onmessage({data:{id,max:1,points:[initial,{t:1,power:.996,hits:996}]}});
  assert.equal(a.element('power-now').textContent,'Generation 1: 996 / 1,000 studies detect differentiation (99.6%).');
  a.element('power-now').childNodes.forEach((node,i)=>assert.equal(node,resultNodes[i]));
  a.click('reset');assert.equal(a.element('power-progress').textContent,'READY');a.click('split');assert.match(a.element('power-progress').textContent,/RUNNING/);
});

test('+1 during an unfinished batch finishes it before advancing exactly once, and stays paused',()=>{
  const a=app({total:100,autoPower:false});a.click('split');const w=a.workers[0],id=w.initialRequest.id;
  const initial={t:0,power:.05,hits:50};w.onmessage({data:{id,max:0,points:[initial]}});a.tick(60);
  const before=a.state();assert.equal(Number(before.generation),1);a.click('step');
  assert.equal(a.state().generation,before.generation);assert(a.element('step').disabled);assert.equal(w.request.type,'resume');
  const second={t:1,power:.1,hits:100};w.onmessage({data:{id,max:1,points:[initial,second]}});
  assert.equal(Number(a.state().generation),2);assert.equal(w.lastAdvance.generation,2);assert(a.element('step').disabled);
  w.onmessage({data:{id,max:2,points:[initial,second,{t:2,power:.2,hits:200}]}});
  assert(!a.element('step').disabled);assert.equal(a.element('play').textContent,'Resume');
  const done=a.state();a.tick(120);assert.deepEqual(a.state(),done);assert.equal(a.pendingClocks().frames,0);
});

test('population bars name both alleles and show full state colours for fixed A or fixed B',()=>{
  const a=app({total:20,loci:5,advanceOverride:()=>({a:[0,1,0,1,.25],b:[0,1,1,0,.75],generation:1})});
  a.click('split');a.click('step');const html=a.element('snp-frequencies').innerHTML;
  const cards=html.split('<article').slice(1);
  for(let i=0;i<4;i++){
    assert.equal((cards[i].match(/snp-frequency-bar fixed/g)||[]).length,2);
    assert.equal((cards[i].match(/width:100%/g)||[]).length,2);
  }
  assert.match(cards[0],/B fixed · 100%/);assert.match(cards[1],/A fixed · 100%/);
  assert.match(cards[2],/B fixed · 100%/);assert.match(cards[2],/A fixed · 100%/);
  assert.match(cards[4],/A 25% · B 75%/);assert.match(cards[4],/A 75% · B 25%/);
  const source=fs.readFileSync(path.join(__dirname,'../animation/index.html'),'utf8');
  const panel=source.split('id="snp-panel"')[1].split('</article>')[0];
  assert(!panel.includes('genotype-key'));assert(!panel.includes('A/B'));assert(panel.includes('frequency-key'));
});


test('early stable fixation waits for a pending five-generation confirmation before stopping',()=>{
  const a=app({total:20,loci:5,autoPower:false,advanceOverride:(p,s)=>({a:Array(s.loci).fill(0),b:Array(s.loci).fill(1),generation:p.generation+1})});
  a.click('split');const w=a.workers[0],id=w.initialRequest.id,points=[{t:0,power:.05,hits:50}];
  w.onmessage({data:{id,max:0,points:points.slice()}});
  for(let t=1;t<=5;t++){
    a.click('step');points.push({t,power:1,hits:1000});w.onmessage({data:{id,max:t,points:points.slice()}});
    assert.equal(a.element('play').disabled,t===5);
    assert.equal(a.element('power-time').textContent,t===5?'1':'Confirming…');
  }
  assert.equal(a.element('play').textContent,'Fixed');assert.match(a.element('power-meaning').textContent,/generation 1 to 5/);
});


test('low frame rates retain elapsed generation time and produce the same population at the same generation',()=>{
  const slow=app(),stepped=app();slow.scene.draw=()=>{};stepped.scene.draw=()=>{};
  slow.click('split');stepped.click('split');slow.tick(20,200);
  for(let i=0;i<20;i++)stepped.click('step');
  assert.equal(Number(slow.state().generation),20);assert.equal(slow.state().generation,stepped.state().generation);
  assert.equal(JSON.stringify(slow.workers[0].lastAdvance.population),JSON.stringify(stepped.workers[0].lastAdvance.population));
  slow.click('play');const paused=slow.state();slow.tick(100,200);assert.deepEqual(slow.state(),paused);
});

test('scrolling the ocean out of view skips drawing while generations continue, with no jump on return',()=>{
  const a=app({total:20,loci:5,intersection:true});a.click('split');a.tick(10);
  let draws=0;const draw=a.scene.draw.bind(a.scene);a.scene.draw=state=>{draws++;draw(state);};
  const clock=a.scene.clock,generation=Number(a.state().generation),worker=a.workers[0];
  a.oceanVisibility(false);a.tick(120);
  assert.equal(draws,0);assert.equal(a.scene.clock,clock);assert(Number(a.state().generation)>generation);assert.equal(a.workers[0],worker);
  a.oceanVisibility(true);assert.equal(draws,1);assert.equal(a.scene.clock,clock);
  a.tick();assert(a.scene.clock>clock&&a.scene.clock-clock<.02);
  a.click('calculate-power');const paused=a.state();a.oceanVisibility(false);a.tick(60);a.oceanVisibility(true);assert.deepEqual(a.state(),paused);
});

test('both Pause controls freeze cached bodies, SNP overlays and generations after lightweight rendering activates',()=>{
  const a=app({total:20,loci:10});a.scene.detail='lite';a.scene.resize();a.element('show-markers').checked=true;
  a.click('split');a.tick(30);assert.equal(a.scene.detail,'lite');const worker=a.workers[0];
  for(const id of ['play','calculate-power']){
    a.click(id);const paused=a.state(),images=a.scene.poseCache.images.size;
    a.tick(120);assert.deepEqual(a.state(),paused);assert.equal(a.scene.poseCache.images.size,images);assert.equal(a.pendingClocks().frames,0);
    a.click(id);a.tick();assert(a.scene.clock>paused.clock&&a.scene.clock-paused.clock<.02);assert.equal(a.workers[0],worker);
  }
});
