// Study resampling of the exact live population pair; no demographic simulation.
importScripts('model.js?v=pause-clock-8');
let batch=null;
onmessage=function(event){
  const message=event.data;
  if(message.type==='init'){
    batch={s:message.settings,id:message.id,seed:message.seed,reps:500,
      observe:GreyModel.rng((Number(message.seed)>>>0)^0x49c1a72d),
      points:[],first:null,task:null,scheduled:false,paused:false,lastProgress:0};
    beginStudy(message.population,false);
  }else if(batch&&message.id===batch.id){
    if(message.type==='advance')beginStudy(message.population,Boolean(message.pauseAtTarget));
    else if(message.type==='pause')batch.paused=true;
    else if(message.type==='resume'){batch.paused=false;schedule();}
  }
};
function beginStudy(population,pauseAtTarget){
  const b=batch;
  if(!population||!Number.isInteger(population.generation)||population.generation<0||population.a?.length!==b.s.loci||population.b?.length!==b.s.loci)throw new Error('A complete live population is required for study resampling');
  if(population.generation<=(b.points.at(-1)?.t??-1))return;
  if(b.task)throw new Error('Finish the current generation before requesting another study');
  b.task={population:{a:Array.from(population.a),b:Array.from(population.b),generation:population.generation},index:0,hits:0,fstSum:0,pauseAtTarget};
  b.paused=false;reportProgress(true);schedule();
}
function reportProgress(force=false){
  const b=batch,t=b.task,now=performance.now();
  if(t&&(force||now-b.lastProgress>150)){b.lastProgress=now;postMessage({type:'progress',id:b.id,reps:b.reps,generation:t.population.generation,done:t.index});}
}
function schedule(){if(batch.task&&!batch.paused&&!batch.scheduled){batch.scheduled=true;setTimeout(work,0);}}
function work(){
  const b=batch,M=GreyModel,start=performance.now();b.scheduled=false;
  if(b.paused||!b.task)return;
  const t=b.task;
  while(t.index<b.reps){
    const sample=M.sample(t.population,b.s,b.observe);
    if(sample.p<=.05)t.hits++;
    t.fstSum+=sample.fst;t.index++;
    if(t.index<b.reps&&performance.now()-start>12){reportProgress();schedule();return;}
  }
  const generation=t.population.generation,point={t:generation,power:t.hits/b.reps,hits:t.hits,populationFst:M.fst(t.population.a,t.population.b),sampleFstMean:t.fstSum/b.reps};
  b.points.push(point);
  if(b.first===null&&generation>0&&point.power>=.8)b.first=generation;
  // Bound the display history while preserving the initial calibration and first crossing.
  if(b.points.length>2000)b.points=b.points.filter((p,i)=>i%2===0||p.t===b.first||i===b.points.length-1);
  b.task=null;if(t.pauseAtTarget)b.paused=true;
  postMessage({id:b.id,seed:b.seed,reps:b.reps,generation,max:generation,points:b.points.map(p=>({...p})),first:b.first,nullRate:b.points[0].power,complete:false});
}
