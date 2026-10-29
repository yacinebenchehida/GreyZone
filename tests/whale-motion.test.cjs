const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function fixture(width=940){
  const gradient={addColorStop(){}},ctx=new Proxy({globalAlpha:1,createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(o,k)=>k in o?o[k]:(()=>{})});
  const world={Math,Number,Map,performance:{now:()=>0},devicePixelRatio:1,matchMedia:()=>({matches:false}),document:{createElement:()=>({getContext:()=>ctx})}};vm.createContext(world);
  for(const name of ['model.js','population-display.js','swim-motion.js','shark-character.js','fish-character.js','cetacean-character.js','marine-life.js','animal-cache.js','island-scene.js','ocean-scene.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../animation',name),'utf8'),world);
  const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width,height:540}),addEventListener(){},style:{}},scene=new world.OceanScene(canvas);
  scene.reset({total:20,ratio:50,loci:10,m:.01});scene.variant='whale';scene.assignSides();return {world,scene};
}

test('whales glide with forward momentum after completing their vertical strokes',()=>{
  const {world}=fixture(),a={phase:0},C=world.CetaceanCharacter;let active=[],gliding=[];
  for(let frame=0;frame<10.4*60;frame++){
    const speed=C.propel(a,1/60,50,.95);assert(speed>30&&speed<55);
    if(frame>30&&frame<330)active.push(a.stroke);
    if(frame>400)gliding.push(a.stroke);
  }
  assert(active.at(-1)>active[0]);assert(gliding.every(x=>x===gliding[0]),'The tail rests throughout the glide');
  const slow={phase:0},fast={phase:0};for(let i=0;i<120;i++){C.propel(slow,1/60,30,.6);C.propel(fast,1/60,80,1.6);}
  assert(fast.whaleTime>slow.whaleTime,'Faster travel has a coordinated higher stroke cadence');
  for(const stroke of [0,2,5])assert.equal(C.field({stroke,bend:0},'whale').at(1,0).y,0,'Straight swimming has no fish-like lateral tail wag');
});

test('breathing remains intermittent and uses the paused ocean clock',()=>{
  const {world}=fixture(),C=world.CetaceanCharacter,a={phase:0};let blowing=0,quiet=0;
  for(let t=0;t<58;t+=.1){const v=C.appearance(a,t);if(v.breath>=0){assert(v.breath<=1);blowing++;}else quiet++;}
  assert(blowing>0&&quiet>blowing);assert(C.appearance(a,3).breath>=0);assert.equal(C.appearance(a,30).breath,-1);
  assert.equal(JSON.stringify(C.appearance(a,8.5)),JSON.stringify(C.appearance(a,8.5)));
});

for(const width of [370,940])test(`whales explore both basins with broad turns and migration (${width}px)`,()=>{
  const {scene:s}=fixture(width),visits=[new Set(),new Set()];let crossings=0,stuck=0,frames=0,maxTurn=0;
  for(let frame=0;frame<3600;frame++){
    const old=s.animals.map(a=>({x:a.x,y:a.y,side:a.side}));s.clock+=.05;s.update(.05,{split:true,m:.01,generationRate:6});
    for(let i=0;i<s.animals.length;i++){
      const a=s.animals[i];assert(Number.isFinite(a.x+a.y+a.heading+a.stroke+a.bend));maxTurn=Math.max(maxTurn,Math.abs(a.turnRate||0));
      if(a.side!==old[i].side)crossings++;
      if(frame<60||a.cross||a.settle)continue;
      frames++;if(Math.hypot(a.x-old[i].x,a.y-old[i].y)<1e-9)stuck++;
      const [lo,hi]=s.waterBounds(a.y*s.h,a,true),x=a.x*s.w;assert(x>=lo-1e-7&&x<=hi+1e-7);
      const col=Math.min(2,Math.max(0,Math.floor((x-lo)/(hi-lo)*3))),row=Math.min(3,Math.max(0,Math.floor((a.y*s.h-55)/(s.h-100)*4)));
      visits[a.side].add(col+','+row);
    }
  }
  assert(crossings>0,'Whales must complete channel crossings');assert(maxTurn<=1.35+1e-8);
  assert(stuck/frames<.01,`${stuck}/${frames} stationary frames`);
  assert.equal(visits[0].size,12);assert.equal(visits[1].size,12);
});

test('full and cached whales remain fully visible at the surface throughout breathing cycles',()=>{
  const {world}=fixture();world.Image=class{constructor(){this.complete=true;this.naturalWidth=2152;}};
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../animation/cetacean-character.js'),'utf8'),world);
  const stack=[],alphas=[],gradient={addColorStop(){}},ctx=new Proxy({globalAlpha:1,save(){stack.push(this.globalAlpha);},restore(){assert(stack.length);this.globalAlpha=stack.pop();},drawImage(){alphas.push(this.globalAlpha);},createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(o,k)=>k in o?o[k]:(()=>{})});
  const animal={x:100,y:100,heading:.3,scale:.7,phase:0,stroke:2,bend:.1},cache=new world.AnimalPoseCache();
  for(const time of [0,1.5,6,19,30,60,120]){
    alphas.length=0;world.CetaceanCharacter.draw(ctx,animal,time,{variant:'whale'});
    assert(alphas.length===36);assert(alphas.every(x=>x===1));assert.equal(stack.length,0);assert.equal(ctx.globalAlpha,1);
    alphas.length=0;cache.draw(ctx,animal,time,{variant:'whale'});
    assert(alphas.length===1);assert(alphas.every(x=>x===1));assert.equal(stack.length,0);assert.equal(ctx.globalAlpha,1);assert.equal(cache.images.size,1);
  }
});
