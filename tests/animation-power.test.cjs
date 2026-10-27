const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const context={Math};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../animation/power-result.js'),'utf8'),context);
const P=context.PowerResult;
test('only completed curves produce a time, null-calibration failures are flagged and probabilities are never extrapolated',()=>{
  const points=[{t:0,power:.05},{t:100,power:.5},{t:200,power:.8}];
  assert.equal(P.summary({points,complete:false}).status,'pending');assert.equal(P.summary({points,complete:true}).generation,200);
  assert.equal(P.summary({points:[{t:0,power:.05},{t:400,power:.79}],complete:true}).status,'not-reached');
  assert.equal(P.summary({points:[{t:0,power:.2},{t:400,power:.9}],complete:true}).status,'uncalibrated');
  assert.equal(P.at(points,150),.65);assert.equal(P.at(points,401),null);assert.equal(P.at([],100),null);
});
function search(seed,settings,{clock=()=>0,model}={}){
  const messages=[],world={Math,Number,performance:{now:clock},importScripts(){},postMessage(data){messages.push(JSON.parse(JSON.stringify(data)));}};
  vm.createContext(world);vm.runInContext(fs.readFileSync(path.join(__dirname,'../animation/model.js'),'utf8'),world);
  if(model)world.GreyModel=model;
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../animation/power-worker.js'),'utf8'),world);
  world.onmessage({data:{id:91,seed,settings}});return messages;
}
test('the real worker uses the supplied random seed: new batches differ, a recorded seed reproduces the same histories',()=>{
  const s={total:40,ratio:50,m:0,sample:10,loci:10};
  const runs=[123,456,789].map(seed=>search(seed,s).at(-1));
  assert(new Set(runs.map(x=>JSON.stringify(x.points))).size>1);
  assert.equal(JSON.stringify(search(123,s).at(-1).points),JSON.stringify(runs[0].points));
  for(const data of runs){assert.equal(data.id,91);assert.equal(data.reps,80);assert(data.complete);for(const p of data.points){assert(p.power>=0&&p.power<=1);assert.equal(p.power,p.hits/80);}}
});
test('time is searched automatically beyond the old 400-generation window',()=>{
  const model={rng:()=>()=>.5,initial:()=>({a:[.5],b:[.5],generation:0}),advance:p=>({...p,generation:p.generation+1}),sample:p=>({p:p.generation>=600?.001:.5})};
  const data=search(19,{m:0},{model}).at(-1);
  assert.equal(data.reason,'reached');assert.equal(data.max,600);assert.equal(P.summary(data).generation,600);
});
test('an internal computation stop does not manufacture an 80% crossing',()=>{
  let time=0;const model={rng:()=>()=>.5,initial:()=>({a:[.5],b:[.5],generation:0}),advance:p=>({...p,generation:p.generation+1}),sample:()=>({p:.5})};
  const data=search(19,{m:.1},{clock:()=>time+=1000,model}).at(-1);
  assert.equal(data.reason,'time-limit');assert(data.complete);assert.notEqual(P.summary(data).status,'reached');
});

test('a batch that becomes genetically fixed below 80% stops without claiming a crossing',()=>{
  const data=search(321,{total:20,ratio:50,m:0,sample:5,loci:1}).at(-1);
  assert.equal(data.reason,'fixed');assert.equal(P.summary(data).status,'not-reached');assert(data.max>0);
});
