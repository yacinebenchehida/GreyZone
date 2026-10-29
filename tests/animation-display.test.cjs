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
  for(const [total,shown]of [[1000,305],[10000,455],[100000,605],[500000,700]])assert.equal(D.count(total),shown);
  assert(D.count(500000)===700,'The largest current setting must remain practical to draw');
});

test('each animal has one diploid dot per displayed SNP, capped at ten; fixed alleles and current frequencies are retained',()=>{
  for(const ratio of [10,50,90])for(const loci of [1,5,8,10,32,100,500]){
    const s={total:200,ratio,loci,m:0},sizes=M.sizes(s),d=D.summary(s),indices=D.markerIndices(loci);
    const animals=Array.from({length:d.total},(_,id)=>({id,side:id<d.west?0:1}));
    assert.equal(indices.length,Math.min(10,loci));assert.equal(new Set(indices).size,indices.length);assert.deepEqual(Array.from(indices),Array.from({length:Math.min(10,loci)},(_,i)=>i));
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
  const s={total:100000,ratio:30,loci:100,m:.01},d=D.summary(s),indices=D.markerIndices(s.loci),pop=M.initial(s);
  const animals=Array.from({length:d.total},(_,id)=>({id,side:id<d.west?0:1})),data=D.markers(animals,[pop.a,pop.b],indices,0);
  for(const side of [0,1])for(let dot=0;dot<indices.length;dot++){
    const copies=animals.filter(a=>a.side===side).flatMap(a=>data.get(a.id)[dot]);
    assert(Math.abs(copies.filter(Boolean).length/copies.length-(side?pop.b:pop.a)[indices[dot]])<=.5/copies.length+1e-12);
  }
});

test('sparse crossing rates respond to m and playback, stay capped and are zero for isolation or stopped time',()=>{
  const s={total:20000,ratio:50,m:0};assert.equal(D.migrationRate(s,12),0);
  const rates=[.00001,.0001,.001].map(m=>D.migrationRate({...s,m},12));assert(rates[0]<rates[1]&&rates[1]<rates[2]);
  assert.equal(D.migrationRate({...s,m:.01},0),0);
  assert(D.migrationRate({...s,m:.0001},50)>rates[1]);
  assert(D.migrationRate({...s,total:200,m:.0001},12)<rates[1]);
  assert(D.migrationRate({...s,total:500000,m:.5},50)<=.65);
});

test('unchanged frequencies keep identical dots, fixation has no mixed colours, and FST=1 can include shared fixed alleles',()=>{
  const animals=Array.from({length:20},(_,id)=>({id,side:id<10?0:1})),indices=[0,1,2],frequencies=[[0,1,.5],[1,1,.5]];
  const first=D.markers(animals,frequencies,indices,123),later=D.markers(animals,frequencies.map(a=>a.slice()),indices,123);
  assert.equal(JSON.stringify([...first]),JSON.stringify([...later]));
  for(const a of animals){assert.deepEqual(Array.from(first.get(a.id)[0]),a.side?[true,true]:[false,false]);assert.deepEqual(Array.from(first.get(a.id)[1]),[true,true]);}
  const sorted=D.sorting([[0,1,0],[1,1,0]]);assert.equal(sorted.fixed,3);assert.equal(sorted.opposite,1);
  assert.equal(M.fst([0,1,0],[1,1,0]),1);
  const near=D.markers(animals,[[.95],[.05]],[0],123);assert.equal([...near.values()].flat(2).filter(Boolean).length,20);
});


test('fixed SNP colours align across loci in west, opposite fixation contrasts in east, and shared fixation is grey',()=>{
  const frequencies=[[0,1,0,1],[1,0,0,1]],reference=[],indices=[0,1,2,3];
  const styles=D.markerPalettes(frequencies,indices,reference);
  for(let i=0;i<2;i++){
    assert.equal(styles[i].colors[frequencies[0][i]],'#29d1be');
    assert.equal(styles[i].colors[frequencies[1][i]],'#f6a183');
  }
  for(let i=2;i<4;i++){assert(styles[i].sharedFixed);assert.equal(styles[i].colors[0],styles[i].colors[1]);assert.equal(styles[i].colors[0],'#aab0b2');}
  // Reintroduction returns the locus to the clearly different variable palette.
  const later=D.markerPalettes([[.1,.9,.1,.9],[.9,.1,.1,.9]],indices);
  for(const style of later){assert.equal(style.state,'segregating');assert.deepEqual(Array.from(style.colors),['#f4c98b','#f4c98b']);assert(!style.sharedFixed);}
  const oneSideVariable=D.markerPalettes([[0,1],[.1,.9]],[0,1]);
  for(const style of oneSideVariable)assert.equal(style.state,'segregating');
  assert.equal(M.fst(frequencies[0],frequencies[1]),1);
});


test('the SNP fill palette contains exactly the four agreed colours',()=>{
  const styles=D.markerPalettes([[.5,0,1,0],[.5,0,0,1]],[0,1,2,3]);
  const colours=new Set(styles.flatMap(s=>s.colors));assert.equal(colours.size,4);
  assert.deepEqual([...colours].sort(),['#f4c98b','#aab0b2','#29d1be','#f6a183'].sort());
});


test('genotype dosage counts allele A, with exact fixation kept distinct from almost-fixed frequencies',()=>{
  assert.equal(D.dosage([false,false]),0);assert.equal(D.dosage([true,false]),1);
  assert.equal(D.dosage([false,true]),1);assert.equal(D.dosage([true,true]),2);
  assert.equal(D.locusState(1,1),'shared-fixed');assert.equal(D.locusState(0,1),'opposite-fixed');
  assert.equal(D.locusState(.999999,1),'segregating');
  assert.equal(D.allelePercent(1),'100%');assert.equal(D.allelePercent(0),'0%');
  assert.equal(D.allelePercent(.999999),'>99.99%');assert.equal(D.allelePercent(.000001),'<0.01%');
  assert.equal(D.allelePercent(.5),'50%');assert.equal(D.allelePercent(.1234),'12.34%');
});

test('gold genotype markers are empty for B/B, half-filled for A/B, and filled for A/A',()=>{
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../animation/shark-character.js'),'utf8'),world);
  function marker(pair){
    const arcs=[],fills=[];let arc;
    const c={beginPath(){arc=null;},moveTo(){},closePath(){},arc(...args){arc=args;arcs.push(args);},fill(){fills.push(arc);},stroke(){}};
    world.SharkCharacter.drawMarker(c,0,0,4,pair,{state:'segregating',colors:['#f4c98b','#f4c98b']});
    return fills;
  }
  assert.equal(marker([false,false]).length,0);
  const half=marker([true,false]);assert.equal(half.length,1);assert.equal(half[0][4]-half[0][3],Math.PI);
  const full=marker([true,true]);assert.equal(full.length,1);assert.equal(full[0][4]-full[0][3],2*Math.PI);
});
