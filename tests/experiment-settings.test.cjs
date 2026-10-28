const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../animation/experiment-settings.js');
const M=require('../animation/model.js');
const S=require('../animation/study-sampler.js');
const settings={total:20000,ratio:50,m:.005,sample:40,loci:50};
const view={animal:'hammer',travelSpeed:.95,generationSpeed:6,showMarkers:false};

test('settings file and shared URL round-trip effective parameters, seed zero and display choices',()=>{
  for(const seed of [0,42,4294967295]){
    const data=E.create(settings,seed,view);
    assert.deepEqual(E.parse(JSON.stringify(data)),data);
    const url=E.link(data,'https://yacinebenchehida.github.io/GreyZone/?design=classic');
    assert.equal(new URL(url).searchParams.get('design'),'classic');
    assert.equal(new URL(url).hash,'#simulator');
    assert.deepEqual(E.fromUrl(url),data);
  }
  assert.equal(E.fromUrl('https://example.com'),null);
});

test('invalid seeds, unsupported versions and invalid sample sizes are rejected before applying settings',()=>{
  for(const seed of ['',-1,1.5,'1e3','NaN',4294967296])assert.throws(()=>E.seed(seed));
  const data=E.create(settings,42,view);
  for(const altered of [{...data,version:2},{...data,engine:'unknown'},{...data,settings:{...settings,loci:5000}},{...data,settings:{...settings,m:1}},{...data,settings:{...settings,total:10,sample:40}}])assert.throws(()=>E.validate(altered));
  assert.throws(()=>E.parse('['));assert.throws(()=>E.parse(' '.repeat(10001)));
  assert.throws(()=>E.fromUrl('https://example.com/?experiment=bad!'));
});

test('saved experiment reproduces the population and every study statistic at each generation',()=>{
  const original=E.create({...settings,total:200,sample:20,loci:20},187120,view);
  const restored=E.parse(JSON.stringify(original));
  function run(data){
    const s=data.settings,r=M.rng(data.seed^0x35ac17d9),observe=M.rng((data.seed^0x724ba719)^0x49c1a72d),sampler=S.create(s),result=[];
    let pop=M.initial(s);
    for(let generation=0;generation<=12;generation++){
      sampler.prepare(pop);let hits=0;const f=[];
      for(let study=0;study<1000;study++){const x=sampler.sample(observe);hits+=x.significant;f.push(x.fst);}
      f.sort((a,b)=>a-b);result.push({pop,hits,f});pop=M.advance(pop,s,r);
    }
    return result;
  }
  assert.deepEqual(run(original),run(restored));
  assert.notDeepEqual(run(original).map(x=>x.pop),run({...restored,seed:187121}).map(x=>x.pop));
});
