const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

function scene(width=940,ratio=50,reduced=false){
  const gradient={addColorStop(){}};
  const ctx=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(o,k)=>o[k]||(()=>{})});
  const world={Math,Number,devicePixelRatio:1,document:{createElement:()=>({getContext:()=>ctx})},matchMedia:()=>({matches:reduced}),performance:{now:()=>0}};
  vm.createContext(world);
  for(const name of ['model.js','swim-motion.js','ocean-scene.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../animation',name),'utf8'),world);
  const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width,height:540}),addEventListener(){},style:{}};
  const s=new world.OceanScene(canvas);s.reset({ratio});s.assignSides();return s;
}

for(const [width,ratio,migrants]of [[940,50,0],[370,10,0],[370,90,20],[940,50,20]]){
  test(`free swimming uses both basins and respects the barrier (${width}px, ${ratio}% west, Nm=${migrants})`,()=>{
    const s=scene(width,ratio),state={split:true,migrants},visits=[new Set(),new Set()];let crossings=0;
    for(let frame=0;frame<7200;frame++){
      const previous=s.animals.map(a=>a.side);s.clock+=1/60;s.update(1/60,state);
      s.animals.forEach((a,i)=>{
        assert(Number.isFinite(a.x+a.y+a.heading+a.stroke));
        if(a.side!==previous[i])crossings++;
        if(frame<100||a.cross)return;
        const limits=s.bounds(a.y*s.h,a.side),px=a.x*s.w;
        assert(px>=limits[0]-1e-7&&px<=limits[1]+1e-7);
        const col=Math.min(2,Math.max(0,Math.floor((px-limits[0])/(limits[1]-limits[0])*3)));
        const row=Math.min(3,Math.max(0,Math.floor((a.y*s.h-55)/(s.h-100)*4)));
        visits[a.side].add(col+','+row);
      });
    }
    if(migrants)assert(crossings>0,'The open channel should permit crossings');else assert.equal(crossings,0);
    assert.equal(visits[0].size,12,'The western fish should visit all twelve water regions');
    assert.equal(visits[1].size,12,'The eastern fish should visit all twelve water regions');
  });
}

test('travel pace does not change body-wave cadence',()=>{
  const slow=scene(),fast=scene();slow.travelPace=1.75;fast.travelPace=4.5;
  for(let frame=0;frame<180;frame++)for(const s of [slow,fast]){s.clock+=1/60;s.update(1/60,{split:true,migrants:0});}
  for(let i=0;i<slow.animals.length;i++)assert.equal(slow.animals[i].stroke,fast.animals[i].stroke);
});

test('reduced motion places the split representatives in their basins without animation',()=>{
  const s=scene(370,10,true),positions=s.animals.map(a=>[a.x,a.y,a.stroke]);
  for(const a of s.animals){const limits=s.bounds(a.y*s.h,a.side);assert(a.x*s.w>=limits[0]&&a.x*s.w<=limits[1]);}
  for(let i=0;i<60;i++)s.update(1/60,{split:true,migrants:20});
  assert.deepEqual(s.animals.map(a=>[a.x,a.y,a.stroke]),positions);
});
