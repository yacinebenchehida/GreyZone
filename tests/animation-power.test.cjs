const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const M=require('../animation/model.js'),settings={total:2000,ratio:50,m:0,sample:40,loci:50};
const context={Math};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../animation/power-result.js'),'utf8'),context);const P=context.PowerResult;
function studies(seed,s,population,{clock=()=>0,autoDrain=true}={}){
  const messages=[],tasks=[],world={Math,Number,performance:{now:clock},setTimeout(fn){tasks.push(fn);},importScripts(...urls){for(const url of urls){assert.match(url,/^(model|power-result)\.js\?v=[a-z0-9-]+$/);if(url.startsWith('power-result'))vm.runInContext(fs.readFileSync(path.join(__dirname,'../animation/power-result.js'),'utf8'),world);}},postMessage(data){messages.push(JSON.parse(JSON.stringify(data)));}};
  vm.createContext(world);vm.runInContext(fs.readFileSync(path.join(__dirname,'../animation/model.js'),'utf8'),world);
  // The sampling worker must never initialise or evolve its own population.
  world.GreyModel.initial=()=>{throw Error('Independent population initialisation is forbidden');};
  world.GreyModel.advance=()=>{throw Error('Independent population evolution is forbidden');};
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../animation/power-worker.js'),'utf8'),world);
  const drain=()=>{let guard=0;while(tasks.length){assert(guard++<10000);tasks.shift()();}};
  const send=message=>world.onmessage({data:{id:91,...message}});
  send({type:'init',settings:s,population,seed});if(autoDrain)drain();
  return {messages,send,drain,runOne(){tasks.shift()?.();},advance(pop,pauseAtTarget=false){send({type:'advance',population:pop,pauseAtTarget});drain();}};
}
test('five consecutive generations confirm the start, short spikes reset, equality counts and later dips retain the exit',()=>{
  const points=[{t:0,power:.05},{t:1,power:.85},{t:2,power:.65},{t:3,power:.9}];
  assert.equal(P.summary({points}).status,'confirming');assert.equal(P.summary({points}).count,1);
  for(let t=4;t<=6;t++)points.push({t,power:.8});
  assert.equal(P.summary({points}).status,'confirming');assert.equal(P.summary({points}).count,4);
  points.push({t:7,power:.79});assert.equal(P.summary({points}).status,'not-yet');
  for(let t=8;t<=12;t++)points.push({t,power:.8});
  assert.equal(P.summary({points}).generation,8);assert.equal(P.summary({points}).confirmedAt,12);
  points.push({t:13,power:.1});assert.equal(P.summary({points}).generation,8);
  assert.equal(P.at(points,2),.65);assert.equal(P.at(points,20),null);
  assert.equal(P.summary({points:[{t:0,power:.2}]}).status,'uncalibrated');
  assert.equal(P.summary({points:[{t:0,power:.05},...[1,3,5,7,9].map(t=>({t,power:1}))]}).status,'confirming');
  assert.equal(P.summary({points:[{t:0,power:.05},...[1,3,5,7,9].map(t=>({t,power:1}))]}).count,1);
});
test('full-generation tracker survives thinned charts and never counts generation zero or duplicate estimates',()=>{
  const state=P.tracker();P.record(state,{t:0,power:1});assert.equal(state.streak,0);
  P.record(state,{t:1,power:.9});P.record(state,{t:1,power:.9});assert.equal(state.streak,1);
  P.record(state,{t:2,power:.5});
  for(let t=3;t<=2004;t++)P.record(state,{t,power:t>=2001?.8:.5});
  const points=[{t:0,power:.05},{t:2004,power:.8}];
  assert.equal(P.summary({points,detection:state}).count,4);
  P.record(state,{t:2005,power:.8});points.push({t:2005,power:.8});
  assert.equal(P.summary({points,detection:state}).generation,2001);
  P.record(state,{t:2006,power:0});assert.equal(P.summary({points,detection:state}).generation,2001);
});
test('all 1000 studies use the supplied live frequencies; the worker never runs another population history',()=>{
  const s={...settings,loci:20},initial=M.initial(s),before=JSON.stringify(initial),run=studies(123,s,initial);
  let data=run.messages.at(-1);assert.equal(data.reps,1000);assert.equal(data.max,0);assert.equal(data.points[0].populationFst,0);assert.equal(JSON.stringify(initial),before);
  const separated={a:Array(20).fill(1),b:Array(20).fill(0),generation:1};run.advance(separated);
  data=run.messages.at(-1);assert.equal(data.points.at(-1).populationFst,1);assert.equal(data.points.at(-1).power,1);assert.equal(data.points.at(-1).sampleFstMean,1);assert.equal(data.points.at(-1).sampleFstLow,1);assert.equal(data.points.at(-1).sampleFstHigh,1);
  const identical={a:Array(20).fill(.5),b:Array(20).fill(.5),generation:2};run.advance(identical);
  data=run.messages.at(-1);assert.equal(data.points.at(-1).populationFst,0);assert(data.points.at(-1).power<.12);assert.equal(data.first,null);assert.equal(data.detection.streak,0);
  for(const p of data.points)assert.equal(p.power,p.hits/1000);
  const length=run.messages.length;run.advance(identical);assert.equal(run.messages.length,length);
});
test('fixed seed and live trajectory reproduce results; fresh study seeds change sampling outcomes',()=>{
  const p=M.initial(settings),a=studies(123,settings,p).messages.at(-1),b=studies(456,settings,p).messages.at(-1);
  assert.notEqual(JSON.stringify(a.points),JSON.stringify(b.points));
  assert.equal(JSON.stringify(a.points),JSON.stringify(studies(123,settings,p).messages.at(-1).points));
});
test('Pause preserves an unfinished 1000-study calculation and Resume reproduces uninterrupted results',()=>{
  let time=0;const p=M.initial(settings),run=studies(123,settings,p,{clock:()=>++time,autoDrain:false});
  run.runOne();run.send({type:'pause'});run.drain();assert(!run.messages.some(x=>x.points));
  run.send({type:'resume'});run.drain();const expected=studies(123,settings,p).messages.at(-1);
  assert.equal(JSON.stringify(run.messages.at(-1).points),JSON.stringify(expected.points));
  run.advance({...p,generation:1},true);assert.equal(run.messages.at(-1).max,1);
});
test('population input is copied and all selected SNPs are used even above the ten-dot display limit',()=>{
  const s={...settings,loci:50},p={a:Array(50).fill(.5),b:Array(50).fill(.5),generation:0};
  // The first 10 SNPs match; the remaining 40 are diagnostic.
  for(let i=10;i<50;i++){p.a[i]=1;p.b[i]=0;}
  const expected=M.fst(p.a,p.b),run=studies(91,s,p,{autoDrain:false});p.a.fill(0);p.b.fill(0);run.drain();
  const point=run.messages.at(-1).points[0];assert.equal(point.populationFst,expected);assert.equal(point.power,1);
});
test('generation-zero rejection remains near 5% across repeated study batches of identical populations',()=>{
  let hits=0;for(let seed=1;seed<=10;seed++)hits+=studies(seed,settings,M.initial(settings)).messages.at(-1).points[0].hits;
  assert(hits/10000>.03&&hits/10000<.07);
});


test('FST bounds are the 2.5th and 97.5th percentiles of the existing 1000 samples, preserving negative estimates',()=>{
  const seed=123,p=M.initial(settings),point=studies(seed,settings,p).messages.at(-1).points[0];
  const observe=M.rng((seed>>>0)^0x49c1a72d),values=Array.from({length:1000},()=>M.sample(p,settings,observe).fst).sort((a,b)=>a-b);
  const percentile=q=>{const i=999*q,lo=Math.floor(i);return values[lo]*(1-(i-lo))+values[Math.ceil(i)]*(i-lo);};
  assert(Math.abs(point.sampleFstLow-percentile(.025))<1e-14);
  assert(Math.abs(point.sampleFstHigh-percentile(.975))<1e-14);
  assert(point.sampleFstLow<0,'The negative sampling tail must remain visible');
  assert.equal(point.hits,values.length*point.power);
  const shared={a:Array(settings.loci).fill(0),b:Array(settings.loci).fill(0),generation:0};
  const fixed=studies(seed,settings,shared).messages.at(-1).points[0];
  assert.equal(fixed.sampleFstLow,0);assert.equal(fixed.sampleFstHigh,0);
});


test('worker confirms only the fifth consecutive estimate and preserves its start after later power falls',()=>{
  const s={...settings,loci:5},run=studies(123,s,M.initial(s));
  const split=generation=>({a:Array(5).fill(1),b:Array(5).fill(0),generation});
  const same=generation=>({a:Array(5).fill(0),b:Array(5).fill(0),generation});
  for(let t=1;t<=4;t++){run.advance(split(t));assert.equal(run.messages.at(-1).first,null);assert.equal(P.summary(run.messages.at(-1)).count,t);}
  run.advance(same(5));assert.equal(P.summary(run.messages.at(-1)).status,'not-yet');
  for(let t=6;t<=10;t++)run.advance(split(t));
  let data=run.messages.at(-1);assert.equal(data.first,6);assert.equal(data.detection.confirmedAt,10);assert.equal(P.summary(data).generation,6);
  run.advance(same(11));data=run.messages.at(-1);assert.equal(data.first,6);assert.equal(P.summary(data).generation,6);
});
