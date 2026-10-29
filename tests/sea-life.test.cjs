const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function drawing(){
  let depth=0,calls=0;const gradient={addColorStop(){}};
  function op(...args){for(const x of args)if(typeof x==='number')assert(Number.isFinite(x),'Every drawing coordinate must stay finite');calls++;}
  const ctx=new Proxy({globalAlpha:1,save(){depth++;},restore(){assert(depth>0,'Unbalanced restore');depth--;},createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(o,k)=>k in o?o[k]:op});
  return {ctx,get depth(){return depth;},get calls(){return calls;}};
}
const draw=drawing(),world={Math,Number,Map,performance:{now:()=>0},devicePixelRatio:1,matchMedia:()=>({matches:false}),document:{createElement:()=>({getContext:()=>draw.ctx})},Path2D:class{constructor(){return draw.ctx;}}};vm.createContext(world);
for(const name of ['model.js','population-display.js','swim-motion.js','shark-character.js','fish-character.js','cetacean-character.js','marine-life.js','animal-cache.js','island-scene.js','ocean-scene.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../animation',name),'utf8'),world);

test('all selectable animals render finite, balanced drawings with the same diploid marker input',()=>{
  const snps=[[false,false],[true,false],[true,true]],palettes=world.GreyDisplay.markerPalettes([[.5,.5,.5],[.4,.4,.4]],[0,1,2]);
  for(const kind of Object.keys(world.SeaLife.catalogue))for(const stroke of [0,1.3,4.8]){
    const before=draw.calls,animal={x:200,y:120,heading:.7,scale:.8,stroke,effort:.9,bend:.3,phase:.8};
    const a=JSON.stringify(animal),b=JSON.stringify(snps);world.SeaLife.draw(draw.ctx,animal,2,{variant:kind,snps,snpPalettes:palettes});
    assert(draw.calls>before);assert.equal(draw.depth,0);assert.equal(JSON.stringify(animal),a);assert.equal(JSON.stringify(snps),b);
  }
});

test('the shark choices delegate directly to the accepted renderer; the surgeonfish uses the original renderer',()=>{
  const shark=world.SharkCharacter.draw,fish=world.FishCharacter.draw,calls=[];
  world.SharkCharacter.draw=(...args)=>calls.push(['shark',...args]);world.FishCharacter.draw=(...args)=>calls.push(['fish',...args]);
  const actor={x:10,y:20,scale:.5},options={variant:'hammer'};
  world.SeaLife.draw(draw.ctx,actor,4,options);assert.equal(calls[0][0],'shark');assert.equal(calls[0][2],actor);assert.equal(calls[0][4],options);
  world.SeaLife.draw(draw.ctx,actor,4,{variant:'classic'});assert.equal(calls[1][0],'shark');
  world.SeaLife.draw(draw.ctx,actor,4,{variant:'surgeon'});assert.equal(calls[2][0],'fish');assert.equal(calls[2][4].species,'surgeon');
  world.SharkCharacter.draw=shark;world.FishCharacter.draw=fish;
});

test('land renders every emergence stage and caches settled terrain without changing the water boundaries',()=>{
  const canvas={getContext:()=>draw.ctx,getBoundingClientRect:()=>({width:940,height:540}),addEventListener(){},style:{}},scene=new world.OceanScene(canvas);scene.reset({total:20,ratio:50,loci:10,m:.01});
  const coast=JSON.stringify(scene.coast(200)),gap=JSON.stringify(scene.gap()),animals=JSON.stringify(scene.animals);
  for(const m of [0,.01])for(const progress of [0,.08,.2,.5,.75,1]){scene.drawLand({m},progress);assert.equal(draw.depth,0);}
  const cached=scene.island.layer.image;scene.clock=5;scene.drawLand({m:.01},1);assert.equal(scene.island.layer.image,cached);
  assert.equal(JSON.stringify(scene.coast(200)),coast);assert.equal(JSON.stringify(scene.gap()),gap);assert.equal(JSON.stringify(scene.animals),animals);
});

test('the requested display copy is absent and the hammerhead remains the default',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../animation/index.html'),'utf8').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');
  for(const phrase of ['Genetic evidence can lag behind life','INTERACTIVE DRAFT','A SMALL EXPERIMENT IN POPULATION GENETICS','A sea apart','Background:','Bailleul','Ben Chehida','Schleimer'])assert(!html.includes(phrase),phrase);
  const source=fs.readFileSync(path.join(__dirname,'../animation/index.html'),'utf8');assert.match(source,/<option value="hammer" selected>/);
});

test('fin whale detailed skin follows curved poses and replaces pre-load cached artwork',()=>{
  let image;world.Image=class{constructor(){image=this;this.complete=false;this.naturalWidth=0;}};
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../animation/cetacean-character.js'),'utf8'),world);
  const cache=new world.AnimalPoseCache(),animal={x:200,y:100,heading:.7,scale:.5,stroke:1.2,bend:.3,phase:0};
  cache.draw(draw.ctx,animal,.6,{variant:'whale'});assert.equal(cache.images.size,1);assert(!world.CetaceanCharacter.textured());
  image.complete=true;image.naturalWidth=2152;assert(world.CetaceanCharacter.textured());
  cache.draw(draw.ctx,animal,.6,{variant:'whale'});assert.equal(cache.images.size,2,'The loaded detailed skin needs its own pose key');
  for(const bend of [-.72,0,.72])for(const stroke of [0,2,5]){world.SeaLife.draw(draw.ctx,{...animal,bend,stroke},.6,{variant:'whale'});assert.equal(draw.depth,0);}
});
