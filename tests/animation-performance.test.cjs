const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function fixture(width=940,dpr=2){
  let now=1000,paths=0,images=0,bodyDraws=0;const gradient={addColorStop(){}};
  const drawing=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,drawImage(){images++;}}, {get:(o,k)=>k in o?o[k]:(...args)=>{for(const x of args)if(typeof x==='number')assert(Number.isFinite(x));paths++;}});
  const world={Math,Number,Map,performance:{now:()=>now},devicePixelRatio:dpr,matchMedia:()=>({matches:false}),document:{createElement:()=>({getContext:()=>drawing})},Path2D:class{constructor(){return drawing;}}};vm.createContext(world);
  for(const name of ['model.js','population-display.js','swim-motion.js','shark-character.js','fish-character.js','marine-life.js','animal-cache.js','island-scene.js','ocean-scene.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../animation',name),'utf8'),world);
  const original=world.SeaLife.draw;world.SeaLife.draw=(...args)=>{bodyDraws++;return original(...args);};
  const canvas={getContext:()=>drawing,getBoundingClientRect:()=>({width,height:540}),addEventListener(){},style:{}};
  const scene=new world.OceanScene(canvas);scene.reset({total:20,ratio:50,loci:10,m:0});
  return {world,scene,drawing,setNow(t){now=t;},spend(ms){now+=ms;},stats(){return{paths,images,bodyDraws};}};
}
const state={split:false,paused:false,generation:0,m:0,generationRate:6,markers:false,p1:Array(10).fill(.5),p2:Array(10).fill(.5)};

test('swimming keeps wall-clock travel at 60, 10 and 5 FPS, including stable substeps',()=>{
  const results=[];
  for(const fps of [60,10,5]){
    const f=fixture(),s=f.scene,a=s.animals[0];s.animals=[a];a.x=.15;a.y=.5;a.heading=0;a.speed=.05;a.wanderTarget={x:.9*s.w,y:.5*s.h,until:999};s.last=1;
    const start=a.x;
    for(let frame=1;frame<=fps;frame++){f.setNow(1000+frame/fps*1000);s.draw(state);}
    results.push(a.x-start);assert(Math.abs(s.clock-1)<1e-12);assert.equal(s.detail,'full');
  }
  for(const distance of results)assert(Math.abs(distance-.0475)<1e-10,JSON.stringify(results));
});

test('fast rendering retains full detail and original pixel density; sustained draw cost activates cached bodies',()=>{
  const fast=fixture();fast.scene.last=1;
  for(let i=1;i<=30;i++){fast.setNow(1000+i*1000/60);fast.scene.draw(state);}
  assert.equal(fast.scene.detail,'full');assert.equal(fast.scene.dpr,2);assert.equal(fast.scene.poseCache.images.size,0);
  assert.equal(fast.stats().bodyDraws,30*20);
  const slow=fixture(),s=slow.scene,water=s.drawWater.bind(s);s.last=1;
  s.drawWater=()=>{water();slow.spend(25);};const before=JSON.stringify(s.settings),headcount=s.animals.length;
  for(let i=1;i<=9;i++){slow.setNow(1000+i*100);s.draw(state);}
  assert.equal(s.detail,'lite');assert.equal(s.dpr,1.25);assert(s.poseCache.images.size>0);assert.equal(s.animals.length,headcount);assert.equal(JSON.stringify(s.settings),before);
});

test('pose cache reuses the accepted renderer, stays bounded and overlays current individual SNPs independently',()=>{
  const f=fixture(),cache=new f.world.AnimalPoseCache(),a={x:100,y:80,heading:.5,scale:.3,stroke:.8,bend:.1,effort:.8};
  const options={variant:'hammer',snps:[[false,false],[true,false],[true,true]],snpPalettes:f.world.GreyDisplay.markerPalettes([[.5,.5,.5],[.5,.5,.5]],[0,1,2])};
  const markers=[],original=f.world.SharkCharacter.drawMarker;f.world.SharkCharacter.drawMarker=(c,x,y,r,pair,palette)=>{markers.push(JSON.stringify(pair));original(c,x,y,r,pair,palette);};
  const before=JSON.stringify([a,options]),count=f.stats().bodyDraws;
  cache.draw(f.drawing,a,0,options);const built=f.stats().bodyDraws;assert.equal(built,count+1);
  for(let i=0;i<100;i++)cache.draw(f.drawing,{...a,x:a.x+i,heading:i*.1},i,options);
  assert.equal(f.stats().bodyDraws,built);assert.equal(JSON.stringify([a,options]),before);
  options.snps[0]=[true,true];cache.draw(f.drawing,a,1,options);assert.equal(markers.at(-3),'[true,true]');assert.equal(f.stats().bodyDraws,built);
  for(let i=0;i<500;i++)cache.draw(f.drawing,{...a,stroke:i*.17,bend:Math.sin(i)*.72},i,{variant:'hammer'});
  assert(cache.images.size<=24*7);
  for(const variant of Object.keys(f.world.SeaLife.catalogue)){
    const previous=cache.kind;assert(cache.draw(f.drawing,a,0,{...options,variant}));assert.equal(cache.kind,variant);if(previous!==variant)assert.equal(cache.images.size,1);
  }
});

test('lite island caches subtle surf and palms while respecting emergence and pause',()=>{
  const f=fixture(370),s=f.scene;s.detail='lite';s.resize();s.clock=5;s.drawLand({m:0},1);
  const first=s.island.lightLayer.image,key=s.island.lightLayer.key,paths=f.stats().paths;
  s.clock=5.05;s.drawLand({m:0},1);assert.equal(s.island.lightLayer.image,first);assert.equal(s.island.lightLayer.key,key);assert.equal(f.stats().paths,paths);
  s.clock=5.2;s.drawLand({m:0},1);assert.notEqual(s.island.lightLayer.key,key);assert.equal(s.island.lightLayer.image,first);
});

test('low-FPS substeps retain basin containment and allow channel crossings',()=>{
  for(const fps of [5,10]){
    const f=fixture(370),s=f.scene;s.settings.m=.1;s.last=1;
    s.drawShark=()=>{};s.drawLand=()=>{};s.drawWater=()=>{};
    const flow={...state,split:true,m:.1};
    for(let frame=1;frame<=fps*30;frame++){
      f.setNow(1000+frame/fps*1000);s.draw(flow);
      if(frame<=fps*2)continue;
      for(const a of s.animals){
        assert(Number.isFinite(a.x+a.y+a.heading+a.stroke+a.bend));
        if(a.cross)continue;const [lo,hi]=s.waterBounds(a.y*s.h,a,true);
        assert(a.x*s.w>=lo-1e-8&&a.x*s.w<=hi+1e-8);
      }
    }
    assert(s.migrationStarts>0);
  }
});
