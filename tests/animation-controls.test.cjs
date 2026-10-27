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
  const defaults={total:20000,ratio:50,migrants:0,'sample-size':40,loci:50,speed:12,'travel-speed':1.75,'shark-design':'hammer','power-range':400,...overrides};
  function element(id){
    if(!elements.has(id))elements.set(id,{value:String(defaults[id]??''),checked:false,disabled:false,hidden:false,style:{},options:[],textContent:'',attributes:{},
      setAttribute(name,value){this.attributes[name]=value;},addEventListener(){},
      getContext:()=>drawing,getBoundingClientRect:()=>({width:940,height:540})});
    return elements.get(id);
  }
  let time=1000,frame,scene,timerId=0;const timers=new Map(),workers=[];
  const document={hidden:false,getElementById:element,createElement:()=>({getContext:()=>drawing}),addEventListener:(event,fn)=>{listeners[event]=fn;}};
  const world={Math,Number,document,setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id),Worker:class{constructor(){workers.push(this);}postMessage(data){this.request=data;}terminate(){this.terminated=true;}},devicePixelRatio:1,matchMedia:()=>({matches:false}),performance:{now:()=>time},
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
  const a=app();a.tick(10);const initial=a.state();
  a.tick(10);assert(a.state().clock>initial.clock,'The introductory sea should still swim');
  a.click('split');a.click('play');a.tick(120);
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
  const a=app();a.tick();a.click('split');a.click('play');a.tick(120);
  a.click('step');const stepped=a.state();assert.equal(a.element('play').textContent,'Play');
  a.tick(60);assert.deepEqual(a.state(),stepped);
  a.click('step');assert.equal(Number(a.state().generation),Number(stepped.generation)+1);
  assert.equal(a.state().animals,stepped.animals);
  a.click('play');a.tick(10);a.visibility(true);a.tick(100);a.visibility(false);
  const hidden=a.state();a.tick(60);assert.deepEqual(a.state(),hidden);
  a.click('reset');a.tick();const reset=a.state();assert.equal(Number(reset.generation),0);
  a.tick(20);assert(a.state().clock>reset.clock);assert.notEqual(a.state().animals,reset.animals);
});


test('power starts automatically, reports a final detection time, and does not use a provisional crossing',()=>{
  const a=app();assert.equal(a.workers.length,0);a.runTimers();assert.equal(a.workers.length,1);
  const worker=a.workers[0],id=worker.request.id;
  worker.onmessage({data:{id,done:8,reps:80,max:400,step:5,progress:.1,complete:false,points:[{t:0,power:.05},{t:200,power:.9},{t:400,power:1}]}});
  assert.equal(a.element('power-time').textContent,'Estimating…');assert.equal(a.element('power-meter').value,.1);
  worker.onmessage({data:{id,done:80,reps:80,max:400,step:5,progress:1,complete:true,points:[{t:0,power:.05},{t:200,power:.8},{t:400,power:1}]}});
  assert.equal(a.element('power-time').textContent,'~200 generations');assert.match(a.element('power-scene-time').textContent,/80% guide: ~200 generations/);assert.equal(a.element('power-meter').value,1);assert(worker.terminated);
  a.click('split');a.click('step');assert.match(a.element('power-now').textContent,/current generation 1/);
});

test('power can be stopped or restarted, stale results are ignored, and no crossing is stated beyond the computed range',()=>{
  const a=app();a.runTimers();const old=a.workers[0];a.click('calculate-power');assert(old.terminated);assert.equal(a.element('power-time').textContent,'Estimate stopped');
  a.click('calculate-power');const current=a.workers[1],id=current.request.id;
  old.onmessage({data:{id:old.request.id,complete:true,points:[{t:0,power:1}]}});assert.equal(a.element('power-time').textContent,'Estimating…');
  current.onmessage({data:{id,done:80,reps:80,max:400,step:5,progress:1,complete:true,points:[{t:0,power:.05},{t:400,power:.7}]}});
  assert.equal(a.element('power-time').textContent,'Not reached');assert.match(a.element('power-meaning').textContent,/400 generations/);
});

test('a ten-individual 10:90 split caps the sample at one without an invalid slider range',()=>{
  const a=app({total:10,ratio:10,'sample-size':40});
  assert.equal(a.scene.animals.length,10);assert.equal(a.scene.display.west,1);
  assert.equal(a.element('sample-size').min,1);assert.equal(a.element('sample-size').max,1);assert.equal(a.element('sample-size').value,1);
  a.click('split');a.click('take-sample');assert.match(a.element('sample-result').innerHTML,/sampled FST/);
});
