importScripts('model.js');
onmessage=function(event){
  const {settings:s,id,seed}=event.data,M=GreyModel,reps=80;
  // Limits are internal safeguards, never a requested biological input.
  const budgetMs=20000,maxGenerations=200000,start=performance.now();
  const master=M.rng((Number(seed)>>>0)^0x49c1a72d),points=[];
  const histories=Array.from({length:reps},()=>({pop:M.initial(s),evolve:M.rng(Math.floor(master()*4294967296)),observe:M.rng(Math.floor(master()*4294967296))}));
  let generation=0,last=0,lastReport=start;
  function report(done,complete=false,reason=null){
    postMessage({id,seed,reps,done,generation,max:points.at(-1)?.t||0,points:points.map(p=>({...p})),complete,reason,elapsedMs:performance.now()-start});
    lastReport=performance.now();
  }
  report(0);
  for(;;){
    let hits=0;
    for(let run=0;run<reps;run++){
      const h=histories[run];
      for(let t=last;t<generation;t++){
        h.pop=M.advance(h.pop,s,h.evolve);
        if((t-last)%100===0&&performance.now()-lastReport>200){
          report(run);
          if(performance.now()-start>=budgetMs){report(run,true,'time-limit');return;}
        }
      }
      if(M.sample(h.pop,s,h.observe).p<=.05)hits++;
      if(performance.now()-lastReport>200)report(run+1);
      if(performance.now()-start>=budgetMs){report(run+1,true,'time-limit');return;}
    }
    points.push({t:generation,power:hits/reps,hits});
    if(generation===0&&hits/reps>.12){report(reps,true,'uncalibrated');return;}
    if(hits/reps>=.8){report(reps,true,'reached');return;}
    if(generation>=maxGenerations){report(reps,true,'generation-limit');return;}
    const absorbed=histories.every(h=>h.pop.a.every((a,i)=>(a===0||a===1)&&(h.pop.b[i]===0||h.pop.b[i]===1)&&(s.m===0||a===h.pop.b[i])));
    if(absorbed){report(reps,true,'fixed');return;}
    if(performance.now()-lastReport>200)report(reps);
    last=generation;
    const step=generation<20?1:generation<200?5:generation<2000?20:generation<20000?100:500;
    generation=Math.min(maxGenerations,generation+step);
  }
};
