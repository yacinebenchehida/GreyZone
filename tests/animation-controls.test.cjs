const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

// Run the real app, scene and model with a deterministic frame clock and a
// drawing-only canvas stub. Button handlers and both clocks are exercised.
function app(){
  const elements=new Map(),listeners={},gradient={addColorStop(){}};
  const drawing=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(o,k)=>o[k]||(()=>{})});
  const defaults={total:20000,ratio:50,migrants:0,'sample-size':40,loci:32,speed:12,'travel-speed':3,'shark-design':'hammer'};
  function element(id){
    if(!elements.has(id))elements.set(id,{value:String(defaults[id]??''),checked:false,disabled:false,hidden:false,style:{},options:[],textContent:'',attributes:{},
      setAttribute(name,value){this.attributes[name]=value;},addEventListener(){},
      getContext:()=>drawing,getBoundingClientRect:()=>({width:940,height:540})});
    return elements.get(id);
  }
  let time=1000,frame,scene;
  const document={hidden:false,getElementById:element,createElement:()=>({getContext:()=>drawing}),addEventListener:(event,fn)=>{listeners[event]=fn;}};
  const world={Math,Number,document,devicePixelRatio:1,matchMedia:()=>({matches:false}),performance:{now:()=>time},
    Path2D:class{constructor(){return drawing;}},ResizeObserver:class{observe(){}},requestAnimationFrame:fn=>{frame=fn;}};
  vm.createContext(world);
  for(const name of ['model.js','population-display.js','swim-motion.js','shark-character.js','ocean-scene.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../animation',name),'utf8'),world);
  const Scene=world.OceanScene;world.OceanScene=class extends Scene{constructor(...args){super(...args);scene=this;}};
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../animation/app.js'),'utf8'),world);
  const tick=(n=1)=>{for(let i=0;i<n;i++){time+=1000/60;frame(time);}};
  const click=id=>{assert(!element(id).disabled,`${id} should be enabled`);element(id).onclick();};
  const state=()=>({generation:element('generation').textContent,clock:scene.clock,migrationBudget:scene.migrationBudget,animals:JSON.stringify(scene.animals),fst:element('fst-chart').innerHTML});
  return {element,tick,click,state,scene,visibility(hidden){document.hidden=hidden;listeners.visibilitychange();}};
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
