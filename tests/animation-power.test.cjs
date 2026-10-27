const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const context={Math};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../animation/power-result.js'),'utf8'),context);const P=context.PowerResult;
function batch(seed,settings,target=0){
  const messages=[],tasks=[],world={Math,Number,performance:{now:()=>0},setTimeout(fn){tasks.push(fn);},importScripts(url){assert.equal(url,'model.js?v=duration-pause-3');},postMessage(data){messages.push(JSON.parse(JSON.stringify(data)));}};
  vm.createContext(world);for(const name of ['model.js','power-worker.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../animation',name),'utf8'),world);
  const drain=()=>{let guard=0;while(tasks.length){assert(guard++<10000);tasks.shift()();}};
  world.onmessage({data:{type:'init',id:91,seed,settings}});drain();
  const advance=g=>{world.onmessage({data:{type:'advance',id:91,generation:g}});drain();};
  if(target)advance(target);return {messages,advance,send(message){world.onmessage({data:{id:91,...message}});},drain};
}
test('status follows checked live points, remembers the first 80% crossing and does not extrapolate',()=>{
  assert.equal(P.summary(null).status,'pending');
  assert.equal(P.summary({points:[{t:0,power:.05},{t:1,power:.6}]}).status,'not-yet');
  const points=[{t:0,power:.05},{t:1,power:.85},{t:2,power:.75},{t:3,power:.9}];
  assert.equal(P.summary({points}).generation,1);assert.equal(P.at(points,2),.75);assert.equal(P.at(points,4),null);
  assert.equal(P.summary({points:[{t:0,power:.2}]}).status,'uncalibrated');
});
test('worker follows the requested clock only, continues after crossing, ignores stale requests, and new seeds vary the curves',()=>{
  const s={total:100,ratio:50,m:0,sample:20,loci:50},a=batch(123,s),b=batch(456,s,10);
  assert.equal(a.messages.at(-1).max,0);a.advance(10);assert.equal(a.messages.at(-1).max,10);
  assert(a.messages.at(-1).first>0&&a.messages.at(-1).first<10);
  const length=a.messages.length;a.advance(5);assert.equal(a.messages.length,length);
  assert.notEqual(JSON.stringify(a.messages.at(-1).points),JSON.stringify(b.messages.at(-1).points));
  assert.equal(JSON.stringify(batch(123,s,10).messages.at(-1).points),JSON.stringify(a.messages.at(-1).points));
});
test('100 individuals and no flow does not absorb at generation one; detection and FST continue normally',()=>{
  const s={total:100,ratio:50,m:0,sample:20,loci:50},run=batch(123,s,20),points=run.messages.at(-1).points;
  assert(points[1].power>0&&points[1].power<1);assert(points.at(-1).power>=.8);assert(points.length===21);
});


test('the worker stops pending calculation on Pause, resumes the same batch, and supports paused single steps',()=>{
  const s={total:100,ratio:50,m:0,sample:20,loci:50},a=batch(123,s);
  a.send({type:'advance',generation:5});a.send({type:'pause'});a.drain();assert.equal(a.messages.at(-1).max,0);
  a.send({type:'resume'});a.drain();assert.equal(a.messages.at(-1).max,5);
  assert.equal(JSON.stringify(a.messages.at(-1).points),JSON.stringify(batch(123,s,5).messages.at(-1).points));
  a.send({type:'pause'});a.send({type:'advance',generation:6,pauseAtTarget:true});a.drain();assert.equal(a.messages.at(-1).max,6);
  const count=a.messages.length;a.drain();assert.equal(a.messages.length,count);
});
