importScripts('model.js');
onmessage=function(event){
  const {settings:s,id}=event.data,M=GreyModel,reps=80;
  const max=[400,2000,10000].includes(event.data.max)?event.data.max:400;
  const step=max===400?5:max===2000?20:100,hits=Array(max/step+1).fill(0);
  let lastReport=0;
  function report(done,t,complete=false){
    postMessage({id,done,reps,max,step,progress:complete?1:(done*max+t)/(reps*max),
      points:done?hits.map((k,i)=>({t:i*step,power:k/done})):[],complete});
    lastReport=performance.now();
  }
  report(0,0);
  for(let run=0;run<reps;run++){
    const evolve=M.rng(9301+run*721),observe=M.rng(73019+run*193),found=Array(hits.length).fill(0);
    let pop=M.initial(s);
    for(let t=0;t<=max;t++){
      if(t%step===0){
        if(M.sample(pop,s,observe).p<=.05)found[t/step]=1;
        if(performance.now()-lastReport>200)report(run,t);
      }
      if(t<max)pop=M.advance(pop,s,evolve);
    }
    for(let i=0;i<hits.length;i++)hits[i]+=found[i];
    report(run+1,0,run+1===reps);
  }
};
