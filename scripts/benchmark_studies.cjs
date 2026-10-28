// Compare the unchanged reference calculation with the optional fast study sampler.
const M = require('../animation/model.js');
const fs = require('node:fs');
const path = require('node:path');
const samplerPath = path.join(__dirname, '../animation/study-sampler.js');
const S = fs.existsSync(samplerPath) ? require(samplerPath) : null;
const sample = Number(process.argv[2] || 40);
const repeats = Number(process.argv[3] || 3);
const baselineOnly = process.argv.includes('--baseline');
const base = {total:20000, ratio:50, m:0.005, sample, loci:5000};
let population = M.initial(base);
const evolution = M.rng(47219);
for (let generation=0; generation<100; generation++) population=M.advance(population,base,evolution);
for (let i=0; i<100; i++) M.sample(population,base,M.rng(100+i));
for (const loci of [1000,5000]) {
  const settings={...base,loci};
  const pair={a:population.a.slice(0,loci),b:population.b.slice(0,loci),generation:100};
  for (const method of S&&!baselineOnly ? ['reference','prepared'] : ['reference']) {
    const sampler=method==='prepared'?S.create(settings):null;
    const timings=[];
    for (let repeat=0; repeat<repeats; repeat++) {
      const sampling=M.rng(8172+repeat),estimates=[];
      const start=performance.now();
      if(sampler)sampler.prepare(pair);
      for(let study=0;study<1000;study++)estimates.push((sampler?sampler.sample(sampling):M.sample(pair,settings,sampling)).fst);
      estimates.sort((a,b)=>a-b);
      timings.push(performance.now()-start);
    }
    timings.sort((a,b)=>a-b);
    const median=timings[Math.floor(timings.length/2)];
    process.stdout.write(JSON.stringify({sample,loci,method,medianMs:+median.toFixed(2),rangeMs:timings.map(t=>+t.toFixed(2))})+'\n');
  }
}
