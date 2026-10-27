const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const context={Math};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../animation/power-result.js'),'utf8'),context);
const P=context.PowerResult;
test('only completed curves produce an 80% time, null-calibration failures are flagged, and live probabilities are never extrapolated',()=>{
  const points=[{t:0,power:.05},{t:100,power:.5},{t:200,power:.8},{t:400,power:.75}];
  assert.equal(P.summary({points,complete:false}).status,'pending');
  assert.equal(P.summary({points,complete:true}).generation,200);
  assert.equal(P.summary({points:[{t:0,power:.05},{t:400,power:.79}],complete:true}).status,'not-reached');
  assert.equal(P.summary({points:[{t:0,power:.2},{t:400,power:.9}],complete:true}).status,'uncalibrated');
  assert.equal(P.at(points,150),.65);assert.equal(P.at(points,401),null);assert.equal(P.at([],100),null);
});

test('the real worker finishes all histories with monotonic finite progress, valid probabilities and the requested horizon',()=>{
  for(const max of [400,2000,10000]){
    let time=0,lastProgress=0,final,reports=0;
    const world={Math,Number,performance:{now:()=>time+=50},importScripts(){},postMessage(data){
      reports++;assert(data.progress>=lastProgress&&data.progress<=1);lastProgress=data.progress;
      assert.equal(data.id,91);assert.equal(data.max,max);assert(data.done<=80);
      for(const p of data.points)assert(p.power>=0&&p.power<=1);
      if(data.complete)final=data;
    }};
    vm.createContext(world);
    for(const name of ['model.js','power-worker.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../animation',name),'utf8'),world);
    world.onmessage({data:{id:91,max,settings:{total:20,ratio:50,migrants:0,sample:5,loci:1}}});
    assert(reports>80,'Long histories should also report progress partway through a history');
    assert.equal(final.done,80);assert.equal(final.progress,1);assert.equal(final.points.at(-1).t,max);assert.equal(final.points.length,max/final.step+1);
  }
});
