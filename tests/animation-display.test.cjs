const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const world={Math,Number,Map};vm.createContext(world);
for(const name of ['model.js','population-display.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../animation',name),'utf8'),world);
const M=world.GreyModel,D=world.GreyDisplay;

test('headcounts are exact up to 200, then increase gently while preserving the split ratio',()=>{
  for(let n=1;n<=200;n++)assert.equal(D.count(n),n);
  let previous=200;
  for(const total of [201,1000,5000,20000,100000,500000]){
    assert(D.count(total)>=previous&&D.count(total)<total);previous=D.count(total);
    for(const ratio of [10,30,50,90]){
      const d=D.summary({total,ratio});assert.equal(d.west+d.east,d.total);
      assert(Math.abs(d.west/d.total-ratio/100)<=.5/d.total+1e-12);
    }
  }
  assert(D.count(500000)<450,'The largest current setting must remain practical to draw');
});

test('each animal has one diploid dot per displayed SNP, capped at ten; fixed alleles and current frequencies are retained',()=>{
  for(const ratio of [10,50,90])for(const loci of [1,5,8,10,32,100]){
    const s={total:200,ratio,loci,migrants:0},sizes=M.sizes(s),d=D.summary(s),indices=D.markerIndices(loci);
    const animals=Array.from({length:d.total},(_,id)=>({id,side:id<d.west?0:1}));
    assert.equal(indices.length,Math.min(10,loci));assert.equal(new Set(indices).size,indices.length);
    let pop=M.initial(s),r=M.rng(703);
    for(let i=0;i<8;i++)pop=M.advance(pop,s,r);
    pop.a[0]=0;pop.b[0]=1;
    const data=D.markers(animals,[pop.a,pop.b],indices,pop.generation);
    for(const a of animals){assert.equal(data.get(a.id).length,Math.min(10,loci));for(const copies of data.get(a.id))assert.equal(copies.length,2);}
    for(const side of [0,1])for(let dot=0;dot<indices.length;dot++){
      const copies=animals.filter(a=>a.side===side).flatMap(a=>data.get(a.id)[dot]);
      assert.equal(copies.filter(Boolean).length,Math.round(2*sizes[side]*(side?pop.b:pop.a)[indices[dot]]));
    }
  }
});

test('compressed marker frequencies remain within one gene copy of the numerical population',()=>{
  const s={total:100000,ratio:30,loci:100,migrants:20},d=D.summary(s),indices=D.markerIndices(s.loci),pop=M.initial(s);
  const animals=Array.from({length:d.total},(_,id)=>({id,side:id<d.west?0:1})),data=D.markers(animals,[pop.a,pop.b],indices,0);
  for(const side of [0,1])for(let dot=0;dot<indices.length;dot++){
    const copies=animals.filter(a=>a.side===side).flatMap(a=>data.get(a.id)[dot]);
    assert(Math.abs(copies.filter(Boolean).length/copies.length-(side?pop.b:pop.a)[indices[dot]])<=.5/copies.length+1e-12);
  }
});

test('crossing rates respond to migration, population compression and generation playback; isolation and stopped time give no crossings',()=>{
  const s={total:20000,ratio:50,migrants:0};assert.equal(D.migrationRate(s,12),0);
  const rates=[1,5,20].map(migrants=>D.migrationRate({...s,migrants},12));assert(rates[0]<rates[1]&&rates[1]<rates[2]);
  assert.equal(D.migrationRate({...s,migrants:20},0),0);
  assert(D.migrationRate({...s,migrants:20},50)>rates[2]);
  assert(D.migrationRate({...s,total:200,migrants:20},12)>rates[2]);
  assert(D.migrationRate({...s,total:100000,migrants:20},12)<rates[2]);
});
