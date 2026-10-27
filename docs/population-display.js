/* Mapping the numerical population to the animals and neutral-marker overlay.
   This changes the illustration only; GreyModel remains authoritative. */
(function(root){
'use strict';
function count(total){return total<=200?Math.max(1,Math.round(total)):Math.round(200+60*Math.log10(total/200));}
function summary(settings){
  const total=count(settings.total),west=Math.round(total*settings.ratio/100);
  return {total,west,east:total-west,weight:settings.total/total,exact:settings.total<=200};
}
function markerIndices(loci){const n=Math.min(10,loci);return Array.from({length:n},(_,i)=>n===1?0:Math.round(i*(loci-1)/(n-1)));}
// Start from expected visible exchanges per second, then compress that rate so
// fast playback does not send the entire school through the channel at once.
function migrationRate(settings,generationsPerSecond){
  if(settings.migrants<=0||generationsPerSecond<=0)return 0;
  const expected=settings.migrants*count(settings.total)/settings.total*generationsPerSecond;
  return .8*Math.log1p(expected);
}
function markers(animals,frequencies,indices,generation){
  const result=new Map(animals.map(a=>[a.id,indices.map(()=>[false,false])]));
  for(const side of [0,1]){
    const group=animals.filter(a=>a.side===side),copies=group.length*2;
    if(!copies)continue;
    for(let marker=0;marker<indices.length;marker++){
      const locus=indices[marker],alleles=Math.round(copies*frequencies[side][locus]);
      const order=Array.from({length:copies},(_,i)=>i),r=GreyModel.rng(9109+side*1789+locus*7919+generation*104729);
      for(let i=copies-1;i>0;i--){const j=Math.floor(r()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
      for(let i=0;i<alleles;i++){const copy=order[i];result.get(group[Math.floor(copy/2)].id)[marker][copy%2]=true;}
    }
  }
  return result;
}
root.GreyDisplay={count,summary,markerIndices,migrationRate,markers};
})(globalThis);
