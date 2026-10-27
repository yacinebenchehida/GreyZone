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
// Single illustrative crossings. The rate is linear in m until a visual cap.
function migrationRate(settings,generationsPerSecond){
  if(settings.m<=0||generationsPerSecond<=0)return 0;
  return Math.min(.65,settings.m*count(settings.total)*generationsPerSecond*.25);
}
function sorting(frequencies){
  let fixed=0,opposite=0;
  for(let i=0;i<frequencies[0].length;i++){
    const a=frequencies[0][i],b=frequencies[1][i];
    if((a===0||a===1)&&(b===0||b===1)){fixed++;if(a!==b)opposite++;}
  }
  return {fixed,opposite,total:frequencies[0].length};
}
// Re-label the two alleles consistently across both basins at each locus.
// Once west fixes, retain that orientation until a later western fixation.
function markerPalettes(frequencies,indices,reference=[]){
  return indices.map(locus=>{
    const west=frequencies[0][locus],east=frequencies[1][locus];
    if(west===0||west===1)reference[locus]=Boolean(west);
    const westAllele=reference[locus]??true,sharedFixed=(west===0||west===1)&&west===east;
    return {westAllele,sharedFixed,colors:sharedFixed?['#81908c','#81908c']:westAllele?['#f6a183','#29d1be']:['#29d1be','#f6a183']};
  });
}
function markers(animals,frequencies,indices,seed=0){
  const result=new Map(animals.map(a=>[a.id,indices.map(()=>[false,false])]));
  for(const side of [0,1]){
    const group=animals.filter(a=>a.side===side),copies=group.length*2;
    if(!copies)continue;
    for(let marker=0;marker<indices.length;marker++){
      const locus=indices[marker],alleles=Math.round(copies*frequencies[side][locus]);
      // Stable per-copy ranks couple consecutive frequency displays. A change
      // in generation alone does not repaint the same displayed individual.
      const order=[];
      for(const a of group)for(let copy=0;copy<2;copy++){
        const r=GreyModel.rng((seed^Math.imul(a.id+1,73856093)^Math.imul(locus+1,19349663)^Math.imul(copy+1,83492791)^Math.imul(side+1,15485863))>>>0);
        order.push({id:a.id,copy,rank:r()});
      }
      order.sort((a,b)=>a.rank-b.rank||a.id-b.id||a.copy-b.copy);
      for(let i=0;i<alleles;i++){const item=order[i];result.get(item.id)[marker][item.copy]=true;}
    }
  }
  return result;
}
root.GreyDisplay={count,summary,markerIndices,migrationRate,markers,markerPalettes,sorting};
})(globalThis);
