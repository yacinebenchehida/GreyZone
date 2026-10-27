// Match the main-page model version, including after a deployment or reload.
importScripts('model.js?v=live-grey-zone-2');
let batch=null;
onmessage=function(event){
  const message=event.data;
  if(message.type==='init'){
    const {settings:s,id,seed}=message,M=GreyModel,master=M.rng((Number(seed)>>>0)^0x49c1a72d);
    batch={s,id,seed,target:0,generation:0,index:0,hits:0,points:[],first:null,scheduled:false,
      histories:Array.from({length:80},()=>({pop:M.initial(s),evolve:M.rng(Math.floor(master()*4294967296)),observe:M.rng(Math.floor(master()*4294967296))}))};
    schedule();
  }else if(message.type==='advance'&&batch&&message.id===batch.id){
    batch.target=Math.max(batch.target,message.generation);if(batch.generation<=batch.target)schedule();
  }
};
function schedule(){if(!batch.scheduled){batch.scheduled=true;setTimeout(work,0);}}
function work(){
  const b=batch,M=GreyModel,start=performance.now();b.scheduled=false;
  while(true){
    const h=b.histories[b.index];
    while(h.pop.generation<b.generation){
      h.pop=M.advance(h.pop,b.s,h.evolve);
      if(performance.now()-start>12){schedule();return;}
    }
    if(M.sample(h.pop,b.s,h.observe).p<=.05)b.hits++;
    b.index++;
    if(b.index===80){
      const point={t:b.generation,power:b.hits/80,hits:b.hits};b.points.push(point);
      if(b.first===null&&point.t>0&&point.power>=.8)b.first=point.t;
      const nullRate=b.points[0].power;
      postMessage({id:b.id,seed:b.seed,reps:80,generation:b.generation,max:b.generation,
        points:b.points.map(p=>({...p})),first:b.first,nullRate,complete:false});
      b.index=0;b.hits=0;
      if(b.generation>=b.target){b.generation++;return;}
      b.generation++;
    }
    if(performance.now()-start>12){schedule();return;}
  }
}
