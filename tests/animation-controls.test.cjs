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
  const defaults={total:20000,ratio:50,migration:0,'sample-size':40,loci:50,speed:12,'travel-speed':1.3,'shark-design':'hammer',...overrides};
  function element(id){
    if(!elements.has(id))elements.set(id,{value:String(defaults[id]??''),checked:false,disabled:false,hidden:false,style:{},options:[],textContent:'',attributes:{},
      setAttribute(name,value){this.attributes[name]=value;},addEventListener(){},
      getContext:()=>drawing,getBoundingClientRect:()=>({width:940,height:540})});
    return elements.get(id);
  }
  let time=1000,frame,scene,timerId=0,seed=100;const timers=new Map(),workers=[];
  const document={hidden:false,getElementById:element,createElement:()=>({getContext:()=>drawing}),addEventListener:(event,fn)=>{listeners[event]=fn;}};
  const world={Math,Number,document,crypto:{getRandomValues(value){value[0]=++seed;return value;}},setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id),Worker:class{constructor(){workers.push(this);}postMessage(data){this.request=data;if(data.type==='init')this.initialRequest=data;}terminate(){this.terminated=true;}},devicePixelRatio:1,matchMedia:()=>({matches:false}),performance:{now:()=>time},
    Path2D:class{constructor(){return drawing;}},ResizeObserver:class{observe(){}},requestAnimationFrame:fn=>{frame=fn;}};
  vm.createContext(world);
  for(const name of ['model.js','population-display.js','swim-motion.js','shark-character.js','ocean-scene.js','power-result.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../animation',name),'utf8'),world);
  const Scene=world.OceanScene;world.OceanScene=class extends Scene{constructor(...args){super(...args);scene=this;}};
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../animation/app.js'),'utf8'),world);
  const tick=(n=1)=>{for(let i=0;i<n;i++){time+=1000/60;frame(time);}};
  const click=id=>{assert(!element(id).disabled,`${id} should be enabled`);element(id).onclick();};
  const state=()=>({generation:element('generation').textContent,clock:scene.clock,migrationBudget:scene.migrationBudget,animals:JSON.stringify(scene.animals),fst:element('fst-chart').innerHTML});
  return {element,tick,click,state,scene,workers,runTimers(){for(const [id,fn]of [...timers]){timers.delete(id);fn();}},visibility(hidden){document.hidden=hidden;listeners.visibilitychange();}};
}

test('Pause freezes generations, shark motion, body waves and the ocean clock; Play resumes without a reset or time jump',()=>{
  const a=app({total:200});a.tick(10);const initial=a.state();
  a.tick(10);assert(a.state().clock>initial.clock,'The introductory sea should still swim');
  a.click('split');a.tick(60);
  assert.equal(a.element('play').textContent,'Pause');assert(Number(a.state().generation)>0);
  a.click('play');assert.equal(a.element('play').textContent,'Play');
  const paused=a.state();a.tick(600);
  assert.deepEqual(a.state(),paused,'Both simulation and decorative clocks must stay frozen');
  // Inspecting or sampling the paused scene must not restart it.
  a.click('meet-shark');a.click('take-sample');a.tick(10);assert.deepEqual(a.state(),paused);
  a.click('play');assert.deepEqual(a.state(),paused,'Resume must not reset any state');
  a.tick();assert(a.state().clock>paused.clock&&a.state().clock-paused.clock<.02,'Paused wall time must not be replayed');
  a.tick(60);assert(Number(a.state().generation)>Number(paused.generation));assert.notEqual(a.state().animals,paused.animals);
});

test('single-step stays paused, a hidden tab pauses both clocks, and Reset restores the introductory swimming scene',()=>{
  const a=app();a.tick();a.click('split');a.tick(60);
  a.click('step');const stepped=a.state();assert.equal(a.element('play').textContent,'Play');
  a.tick(60);assert.deepEqual(a.state(),stepped);
  a.click('step');assert.equal(Number(a.state().generation),Number(stepped.generation)+1);
  assert.equal(a.state().animals,stepped.animals);
  a.click('play');a.tick(10);a.visibility(true);a.tick(100);a.visibility(false);
  const hidden=a.state();a.tick(60);assert.deepEqual(a.state(),hidden);
  a.click('reset');a.tick();const reset=a.state();assert.equal(Number(reset.generation),0);
  a.tick(20);assert(a.state().clock>reset.clock);assert.notEqual(a.state().animals,reset.animals);
});


test('live power follows the clock, stays running after detection and reruns have fresh seeds',()=>{
  const a=app();assert.equal(a.workers.length,0);a.click('split');const w=a.workers[0],id=w.request.id;
  assert.equal(w.request.type,'init');assert.equal(typeof w.request.seed,'number');
  a.click('step');assert.equal(w.request.type,'advance');assert.equal(w.request.generation,1);
  w.onmessage({data:{id,max:1,points:[{t:0,power:.05,hits:4},{t:1,power:.6,hits:48}]}});
  assert.equal(a.element('power-time').textContent,'Still in the grey zone');
  w.onmessage({data:{id,max:2,points:[{t:0,power:.05,hits:4},{t:1,power:.6,hits:48},{t:2,power:.85,hits:68}]}});
  assert.equal(a.element('power-time').textContent,'80% detection reached');assert(!w.terminated);
  const seed=a.workers[0].initialRequest.seed;a.click('split');assert.notEqual(a.workers[1].request.seed,seed);
});
test('the result-panel pause controls the live simulation, stale batches cannot update a rerun',()=>{
  const a=app();a.click('split');const old=a.workers[0],id=old.request.id;a.click('calculate-power');
  assert.equal(a.element('calculate-power').textContent,'Continue simulation');const g=a.state().generation;a.tick(30);assert.equal(a.state().generation,g);
  a.click('calculate-power');assert.equal(a.element('calculate-power').textContent,'Pause simulation');
  a.click('split');old.onmessage({data:{id,max:1,points:[{t:0,power:.05},{t:1,power:1}]}});
  assert.notEqual(a.element('power-time').textContent,'80% detection reached');
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
  for(let i=0;i<1600;i++)a.click('step');
  a.element('show-markers').checked=true;a.tick();
  assert.match(a.element('sorting-status').textContent,/Fixed on both sides: 50\/50/);
  assert.equal(a.element('fst-value').textContent,'FST 1.0000');
  const cache=a.scene.markerCache;
  for(let dot=0;dot<10;dot++)for(const side of [0,1]){
    const sharks=a.scene.animals.filter(x=>x.side===side),expected=cache.data.get(sharks[0].id)[dot][0];
    for(const shark of sharks)assert(cache.data.get(shark.id)[dot].every(copy=>copy===expected));
  }
});
