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
  function element(id){
    if(!elements.has(id))elements.set(id,{value:String(defaults[id]??''),checked:false,disabled:false,hidden:false,style:{},options:[],textContent:'',attributes:{},
      setAttribute(name,value){this.attributes[name]=value;},addEventListener(){},
      getContext:()=>drawing,getBoundingClientRect:()=>({width:940,height:540})});
    return elements.get(id);
  }
  let time=1000,scene,timerId=0,frameId=0,framesRun=0,seed=100;const timers=new Map(),frames=new Map(),workers=[];
  const document={hidden:false,getElementById:element,createElement:()=>({getContext:()=>drawing}),addEventListener:(event,fn)=>{listeners[event]=fn;}};
  const world={Math,Number,document,crypto:{getRandomValues(value){value[0]=++seed;return value;}},setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id),Worker:class{
      constructor(){workers.push(this);this.points=[];}
      postMessage(data){
        this.request=data;if(data.type==='init'){this.initialRequest=data;this.points=[{t:data.population?.generation??0,power:.05,hits:25}];}
        if(data.type==='advance'){this.lastAdvance=data;this.points.push({t:data.generation,power:.05,hits:25});}
        if(overrides.autoPower!==false&&(data.type==='init'||data.type==='advance'))this.onmessage({data:{id:data.id,max:data.population?.generation??data.generation??0,reps:500,points:this.points.map(p=>({...p}))}});
      }
      terminate(){this.terminated=true;}
    },devicePixelRatio:1,matchMedia:()=>({matches:false}),performance:{now:()=>time},
    Path2D:class{constructor(){return drawing;}},ResizeObserver:class{observe(){}},requestAnimationFrame:fn=>{frames.set(++frameId,fn);return frameId;},cancelAnimationFrame:id=>frames.delete(id)};
  vm.createContext(world);
  for(const name of ['model.js','population-display.js','swim-motion.js','shark-character.js','ocean-scene.js','power-result.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../animation',name),'utf8'),world);
  const Scene=world.OceanScene;world.OceanScene=class extends Scene{constructor(...args){super(...args);scene=this;}};
  if(overrides.advanceOverride)world.GreyModel.advance=overrides.advanceOverride;
  if(overrides.startGeneration!==undefined){const initial=world.GreyModel.initial;world.GreyModel.initial=s=>({...initial(s),generation:overrides.startGeneration});}
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../animation/app.js'),'utf8'),world);
  const tick=(n=1)=>{for(let i=0;i<n;i++){time+=1000/60;for(const [id,fn]of [...frames]){frames.delete(id);framesRun++;fn(time);}}};
  const click=id=>{assert(!element(id).disabled,`${id} should be enabled`);element(id).onclick();};
  const state=()=>({generation:element('generation').textContent,clock:scene.clock,migrationBudget:scene.migrationBudget,animals:JSON.stringify(scene.animals),fst:element('fst-chart').innerHTML});
  return {element,tick,click,state,scene,workers,pendingClocks:()=>({frames:frames.size,timers:timers.size,framesRun}),runTimers(){for(const [id,fn]of [...timers]){timers.delete(id);fn();}},visibility(hidden){document.hidden=hidden;listeners.visibilitychange();}};
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
  w.onmessage({data:{id,max:0,reps:500,points:[{t:0,power:.05,hits:25}]}});
  a.click('step');assert.equal(w.request.type,'advance');assert.equal(w.request.generation,1);assert.equal(w.request.population.generation,1);
  w.onmessage({data:{id,max:1,points:[{t:0,power:.05,hits:25},{t:1,power:.6,hits:300}]}});
  assert.equal(a.element('power-time').textContent,'Not reached yet');
  a.click('step');
  w.onmessage({data:{id,max:2,points:[{t:0,power:.05,hits:25},{t:1,power:.6,hits:300},{t:2,power:.85,hits:425}]}});
  assert.equal(a.element('power-time').textContent,'2');assert.equal(a.element('power-unit').hidden,false);assert.match(a.element('power-scene-time').textContent,/2 generations/);assert(!w.terminated);
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
  assert.match(a.element('sorting-status').textContent,/Fixed on both sides: 50\/50/);
  assert.equal(a.element('fst-value').textContent,'FST 1.0000');assert.equal(a.element('play').textContent,'Fixed');assert(a.element('play').disabled);
  const fixed=a.state();a.tick(60);assert.deepEqual(a.state(),fixed);
  const cache=a.scene.markerCache;
  for(let dot=0;dot<10;dot++)for(const side of [0,1]){
    const sharks=a.scene.animals.filter(x=>x.side===side),expected=cache.data.get(sharks[0].id)[dot][0];
    for(const shark of sharks)assert(cache.data.get(shark.id)[dot].every(copy=>copy===expected));
  }
});


test('Pause freezes queued power results and both charts; Resume applies them without changing the crossing number',()=>{
  const a=app({total:100,autoPower:false});a.click('split');const w=a.workers[0],id=w.initialRequest.id;
  w.onmessage({data:{id,max:0,reps:500,points:[{t:0,power:.05,hits:25}]}});
  a.tick(30);w.onmessage({data:{id,max:1,reps:500,points:[{t:0,power:.05,hits:25},{t:1,power:.65,hits:325}]}});
  a.tick(30);a.click('play');assert.equal(w.request.type,'pause');
  const before={title:a.element('power-time').textContent,curve:a.element('power-chart').innerHTML,now:a.element('power-now').textContent,fst:a.element('fst-chart').innerHTML};
  w.onmessage({data:{id,max:2,points:[{t:0,power:.05,hits:25},{t:1,power:.65,hits:325},{t:2,power:.9,hits:450}]}});
  a.tick(60);
  assert.deepEqual({title:a.element('power-time').textContent,curve:a.element('power-chart').innerHTML,now:a.element('power-now').textContent,fst:a.element('fst-chart').innerHTML},before);
  a.click('play');assert.equal(w.request.type,'resume');assert.equal(a.element('power-time').textContent,'2');
  a.tick(30);a.click('calculate-power');assert.equal(w.request.type,'pause');
  assert.equal(a.element('power-time').textContent,'2');assert.equal(a.element('power-unit').hidden,false);
  const paused=a.state();a.tick(60);assert.deepEqual(a.state(),paused);
});


test('generation playback waits for each 500-study estimate while the sharks keep swimming',()=>{
  const a=app({total:20,autoPower:false});a.click('split');const w=a.workers[0],id=w.initialRequest.id;
  assert.equal(w.initialRequest.settings.studies,500);
  a.tick(120);assert.equal(Number(a.state().generation),0);
  w.onmessage({data:{id,max:0,reps:500,points:[{t:0,power:.05,hits:25}]}});
  a.tick(60);assert.equal(Number(a.state().generation),1);assert.equal(w.lastAdvance.generation,1);
  const before=a.state();a.tick(60);assert.equal(Number(a.state().generation),1);assert.notEqual(a.state().animals,before.animals);
  w.onmessage({data:{type:'progress',id,generation:1,done:250,reps:500}});assert.match(a.element('power-progress').textContent,/250 \/ 500/);
  assert(a.element('step').disabled);
  w.onmessage({data:{id,max:1,reps:500,points:[{t:0,power:.05,hits:25},{t:1,power:.1,hits:50}]}});
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
