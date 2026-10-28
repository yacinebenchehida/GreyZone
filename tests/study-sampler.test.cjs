const test=require('node:test');
const assert=require('node:assert/strict');
const M=require('../animation/model.js');
const S=require('../animation/study-sampler.js');
const base={total:20000,ratio:50,m:0,sample:40,loci:1};

// Decode an allele count from a one-locus sample against a basin fixed for B.
function count(sample,g){return sample.df?Math.round(1+sample.fst*(g-1)):0;}
function probabilities(g,p){
  const logFactorial=[0];
  for(let k=1;k<=g;k++)logFactorial[k]=logFactorial[k-1]+Math.log(k);
  return Array.from({length:g+1},(_,k)=>p===0?Number(k===0):p===1?Number(k===g):Math.exp(logFactorial[g]-logFactorial[k]-logFactorial[g-k]+k*Math.log(p)+(g-k)*Math.log1p(-p)));
}

test('prepared draws reproduce the complete binomial probability mass, including rare alleles and sample-size extremes',()=>{
  for(const n of [1,10,40,150])for(const p of [0,1e-8,.01,.2,.5,.8,.99,1-1e-8,1])for(const side of [0,1]){
    const g=2*n,width=g+1,sampler=S.create({...base,sample:n});
    sampler.prepare({a:[side?0:p],b:[side?p:0]});
    const at=u=>count(sampler.sample(()=>u),g),mass=Array(width).fill(0);
    for(let bucket=0;bucket<width;bucket++){
      const start=bucket/width,end=(bucket+1)/width,epsilon=1e-10/width;
      let low=start+epsilon,high=end-epsilon;
      const first=at(low),last=at(high);
      if(first===last){mass[first]+=end-start;continue;}
      for(let i=0;i<50;i++){
        const middle=(low+high)/2;
        if(at(middle)===first)low=middle;else high=middle;
      }
      const boundary=(low+high)/2;
      mass[first]+=boundary-start;mass[last]+=end-boundary;
    }
    const expected=probabilities(g,p);
    for(let k=0;k<=g;k++)assert(Math.abs(mass[k]-expected[k])<1e-8,`n=${n}, p=${p}, side=${side}, count=${k}: ${mass[k]} vs ${expected[k]}`);
    assert(Math.abs(mass.reduce((a,b)=>a+b,0)-1)<1e-12);
  }
});

test('cached cutoffs give the same significance decisions as the existing p-value calculation',()=>{
  for(const df of [0,1,2,5,20,50,100,750,1000,5000]){
    const cutoff=S.critical(df);
    if(!df){assert.equal(cutoff,Infinity);continue;}
    assert(Math.abs(M.gammaQ(df/2,cutoff/2)-.05)<1e-11);
    for(const statistic of [0,df,.8*cutoff,cutoff-1e-7,cutoff,cutoff+1e-7,1.2*cutoff,4*cutoff])assert.equal(statistic>=cutoff,M.gammaQ(df/2,statistic/2)<=.05);
  }
});

test('direct accumulation matches the reference formulas on the same sampled allele counts',()=>{
  for(const n of [1,10,40,150]){
    const g=2*n,pop={a:[0,1,.001,.3,.8,1],b:[0,0,.7,.3,.99,1]},s={...base,sample:n,loci:6};
    const sampler=S.create(s);sampler.prepare(pop);
    const decoders=[pop.a,pop.b].map(frequencies=>frequencies.map(p=>{
      const d=S.create({...s,loci:1});d.prepare({a:[p],b:[0]});return d;
    }));
    const random=M.rng(571+n);
    for(let study=0;study<200;study++){
      const uniforms=Array.from({length:12},random);let used=0,chi=0,df=0,hw=0,hb=0;
      const result={...sampler.sample(()=>uniforms[used++])};
      used=0;
      for(let i=0;i<s.loci;i++){
        const values=[0,1].map(side=>{
          const p=(side?pop.b:pop.a)[i];
          return p===0?0:p===1?1:count(decoders[side][i].sample(()=>uniforms[used++]),g)/g;
        });
        const [x,y]=values,p=(x+y)/2;
        if(p>0&&p<1){chi+=(x-y)*(x-y)/(p*(1-p)*2/g);df++;}
        hw+=(x*(1-x)+y*(1-y))*g/(g-1);hb+=x+y-2*x*y;
      }
      assert.equal(result.df,df);assert(Math.abs(result.chi-chi)<1e-12);
      assert(Math.abs(result.fst-(hb?1-hw/hb:0))<1e-12);
      assert.equal(result.significant,df>0&&M.gammaQ(df/2,chi/2)<=.05);
    }
  }
});

test('prepared and reference studies agree in power and full sampled-FST distribution',()=>{
  const reps=10000,s={...base,loci:50};
  for(const delta of [0,.04,.12]){
    const a=Array.from({length:s.loci},(_,i)=>.2+.6*(i/(s.loci-1))),pop={a,b:a.map((p,i)=>p+(i%2?delta:-delta))};
    const sampler=S.create(s);sampler.prepare(pop);
    const reference=M.rng(1609),prepared=M.rng(8137),oldValues=[],newValues=[];
    let oldHits=0,newHits=0;
    for(let i=0;i<reps;i++){
      const old=M.sample(pop,s,reference),fresh=sampler.sample(prepared);
      oldValues.push(old.fst);newValues.push(fresh.fst);
      if(old.p<=.05)oldHits++;if(fresh.significant)newHits++;
    }
    const oldPower=oldHits/reps,newPower=newHits/reps;
    const se=Math.sqrt((oldPower*(1-oldPower)+newPower*(1-newPower))/reps);
    assert(Math.abs(oldPower-newPower)<6*se+.001,`Power mismatch at frequency difference ${delta}`);
    oldValues.sort((a,b)=>a-b);newValues.sort((a,b)=>a-b);
    let i=0,j=0,distance=0;
    while(i<reps||j<reps){
      const next=Math.min(oldValues[i]??Infinity,newValues[j]??Infinity);
      while(i<reps&&oldValues[i]<=next)i++;
      while(j<reps&&newValues[j]<=next)j++;
      distance=Math.max(distance,Math.abs(i-j)/reps);
    }
    assert(distance<.04,`Sampled-FST distribution mismatch at frequency difference ${delta}: ${distance}`);
  }
});
